import os
import subprocess

from es_de_helper import EsDeHelper
from models import GameEvent, Paths
from paths_resolver import PathsResolver
from server import Server
from custom_documents import CustomDocuments

import asyncio
from dataclasses import asdict
import json

import decky
from settings import SettingsManager

class Plugin:
    actions: list[dict] = None

    paths: Paths = None

    server: Server = None

    es_de_helper: EsDeHelper = None

    custom_documents: CustomDocuments = None

    game_event: GameEvent = None

    settings: SettingsManager = None

    states: dict[str, str] = dict()

    is_retrodeck_flatpak_installed: bool = False
    are_es_de_event_scripts_created: bool = False

    def _resolve_media_path(self, relative_media_path: str | None) -> str | None:
        if relative_media_path is None:
            return None

        return os.path.join(self.server.get_es_de_media_url(), relative_media_path)


    def _build_game_event(self, raw_data: str) -> GameEvent:
        parts = raw_data.strip().split(";")
        if len(parts) != 5:
            decky.logger.error(f"Invalid game event data: {raw_data}")
            return None

        rom_path = parts[1]
        system_name = parts[3]

        miximage_path = self.es_de_helper.resolve_relative_media_path(rom_path, system_name, "miximages")
        cover_path = self.es_de_helper.resolve_relative_media_path(rom_path, system_name, "covers")

        image_path = miximage_path or cover_path

        manual_path = self.es_de_helper.resolve_relative_media_path(rom_path, system_name, "manuals")

        emulator_name = self.es_de_helper.resolve_emulator_name(system_name)

        return GameEvent(
            type=parts[0],
            path=rom_path,
            name=parts[2],
            system_name=system_name,
            system_full_name=parts[4],
            emulator_name=emulator_name or parts[4],
            image_path=self._resolve_media_path(image_path),
            manual_path=self._resolve_media_path(manual_path),
        )

    def _on_game_event(self, game_event_raw: str):

        decky.logger.info(f"Raw game event received: {game_event_raw}")
        try:
            game_event = self._build_game_event(game_event_raw)
            self.game_event = game_event
            self.loop.call_soon_threadsafe(
                asyncio.create_task, 
                decky.emit("game_event", json.dumps(asdict(game_event)))
            )
            decky.logger.info(f"Emitted game event: {game_event}")
        except Exception as e:
            decky.logger.error(f"Error emitting game event: {e}")
            return


    def _load_actions(self):
        with open(self.paths.actionsFile, "r") as f:
            self.actions = json.load(f)

        decky.logger.info(f"Loaded {len(self.actions)} actions")

    async def get_actions(self) -> list[dict]:
        return self.actions
    
    async def get_game_event(self) -> dict | None:
        if not self.game_event:
            return None
        return asdict(self.game_event)

    async def get_state(self, key: str) -> str:
        return self.states.get(key, None)

    async def set_state(self, key: str, value: str):
        self.states[key] = value

    def _check_es_de_event_scripts(self) -> bool:
        try:
            self.are_es_de_event_scripts_created = self.es_de_helper.create_es_de_event_scripts(self.server.get_api_url())
        except Exception as e:
            self.are_es_de_event_scripts_created = False
            decky.logger.error(f"Error creating es-de event scripts: {e}")
            return

    def _check_retrodeck_flatpak(self) -> bool:
        output = subprocess.run(
            ['flatpak', 'info', 'net.retrodeck.retrodeck'],
            capture_output=True,
            env={ "LD_LIBRARY_PATH": "" }
        )

        if output.returncode != 0:
            self.is_retrodeck_flatpak_installed = False
            decky.logger.error(f"Failed to check RetroDECK flatpak installation: {output.stderr.decode()}")
            return False

        self.is_retrodeck_flatpak_installed = True
        return True

    async def check_setup_state(self) -> [bool, bool]:
        return self.is_retrodeck_flatpak_installed, self.are_es_de_event_scripts_created

    async def get_setting(self, key: str):
        return self.settings.getSetting(key)

    async def set_setting(self, key: str, value):
        self.settings.setSetting(key, value)
        self.settings.commit()

    async def list_custom_documents(self, system_name: str, game_path: str) -> list[str]:
        """List all PDF and TXT files in the custom_documents directory for a given game, returns server URLs"""
        return await self.custom_documents.list_custom_documents(system_name, game_path)

    async def copy_file_to_custom_documents(
        self, source_path: str, system_name: str, game_path: str, document_name: str
    ) -> str:
        """Copy a file to the custom_documents directory for a given game"""
        return await self.custom_documents.copy_file_to_custom_documents(source_path, system_name, game_path, document_name)

    async def _main(self):
        self.loop = asyncio.get_event_loop()

        self.settings = SettingsManager(name="settings", settings_directory=decky.DECKY_PLUGIN_SETTINGS_DIR)
        self.settings.read()

        self._check_retrodeck_flatpak()
        if not self.is_retrodeck_flatpak_installed:
            decky.logger.error("RetroDECK flatpak is not installed")
            return

        self.paths = PathsResolver(decky.DECKY_USER_HOME, decky.DECKY_PLUGIN_DIR, decky.logger).resolve()
        if self.paths is None:
            decky.logger.error("Failed to resolve paths")
            return

        decky.logger.info(f"Initialized plugin with paths: {self.paths}")

        self.server = Server(decky.logger, self.paths, self._on_game_event)
        self.server.start_server()

        self.es_de_helper = EsDeHelper(decky.logger, self.paths)
        self.es_de_helper.load_es_systems()

        self.custom_documents = CustomDocuments(
            decky.logger,
            self.paths,
            self.server.get_custom_documents_url
        )

        self._check_es_de_event_scripts()

        self._load_actions()

        decky.logger.info("Loaded RetroDECKY plugin")

    async def _unload(self):
        decky.logger.info("Unloaded RetroDECKY plugin")
        pass

    async def _uninstall(self):
        try:
            self.es_de_helper.remove_es_de_event_scripts()
        except Exception as e:
            decky.logger.error(f"Error removing es-de event scripts: {e}")
        decky.logger.info("Uninstalled RetroDECKY plugin")
        pass

    async def _migration(self):
        decky.logger.info("Migrating RetroDECKY plugin")