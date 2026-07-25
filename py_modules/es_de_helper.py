from logging import Logger
import json
import os
import xmltodict
from models import ComponentMetadata, Paths, SystemMetadata

class EsDeHelper:

    es_systems: dict = None

    def _preprocess_xml_for_comments(self, xml_content: str) -> str:
        result = []
        i = 0
        in_comment = False
        
        while i < len(xml_content):
            if not in_comment:
                if xml_content[i] == '<' and i + 3 < len(xml_content):
                    if xml_content[i:i+4] == '<!--':
                        in_comment = True
                        i += 4
                        continue
                result.append(xml_content[i])
                i += 1
            else:
                if xml_content[i] == '-' and i + 2 < len(xml_content):
                    if xml_content[i:i+3] == '-->':
                        in_comment = False
                        i += 3
                        continue
                i += 1
        
        return ''.join(result)

    def resolve_relative_media_path(self, rom_path: str, system_name: str, media_type: str) -> str:
        
        rom_path = rom_path.replace("\\", "")

        rom_path_no_ext = ""
                
        if os.path.isdir(rom_path):
            rom_path_no_ext = rom_path
        else:
            rom_path_no_ext = os.path.splitext(rom_path)[0]

        roms_folder_normalized = os.path.normpath(self.paths.romsFolder)
        rom_path_normalized = os.path.normpath(rom_path_no_ext)

        rom_system_folder = os.path.join(roms_folder_normalized, system_name)

        rom_path_after_system_folder = os.path.relpath(rom_path_normalized, rom_system_folder)

        rel_media_path = os.path.join(system_name, media_type, rom_path_after_system_folder)

        media_path = os.path.join(self.paths.esDeDownloadedMediaFolder, system_name, media_type, rom_path_after_system_folder)

        extensions = [".png", ".jpg", ".jpeg", ".PNG", ".JPG", ".JPEG"]

        if media_type == "manuals":
            extensions = [".pdf", ".PDF"]
    
        for extension in extensions:
            resolved_path = f"{media_path}{extension}"
            if not os.path.exists(resolved_path):
                continue
            

            return f"{rel_media_path}{extension}"
        
        return None

    def load_es_systems(self):
        es_systems = []
        es_systems_path = self.paths.esDeDefaultEsSystemsFile
        with open(es_systems_path, "r") as f: 
            xml_content = f.read()
            xml_content = self._preprocess_xml_for_comments(xml_content)
            es_systems = xmltodict.parse(xml_content)

        # TODO: Load custom es systems

        self.es_systems = {}
        for system in es_systems['systemList']['system']:
            self.es_systems[system['name']] = system

        self.logger.info(f"Loaded {len(self.es_systems)} es-de systems") 

    def resolve_system_fullname(self, system_name: str) -> str | None:
        if not self.es_systems or system_name not in self.es_systems:
            return None

        return self.es_systems[system_name].get("fullname")

    def _xml_text(self, value) -> str | None:
        if value is None:
            return None

        if isinstance(value, dict):
            text = value.get("#text")
            if isinstance(text, str):
                text = text.strip()
                return text or None
            return None

        if isinstance(value, str):
            text = value.strip()
            return text or None

        return str(value)

    def _parse_system_metadata_variables(self, variables: dict | None) -> SystemMetadata | None:
        if not variables or not isinstance(variables, dict):
            return None

        return SystemMetadata(
            name=self._xml_text(variables.get("systemName")),
            description=self._xml_text(variables.get("systemDescription")),
            manufacturer=self._xml_text(variables.get("systemManufacturer")),
            release_year=self._xml_text(variables.get("systemReleaseYear")),
            release_date=self._xml_text(variables.get("systemReleaseDate")),
            release_date_formatted=self._xml_text(variables.get("systemReleaseDateFormated")),
            hardware_type=self._xml_text(variables.get("systemHardwareType")),
            cover_size=self._xml_text(variables.get("systemCoverSize")),
            cover_size_type=self._xml_text(variables.get("systemCoverSizeType")),
            color=self._xml_text(variables.get("systemColor")),
            color_palette_1=self._xml_text(variables.get("systemColorPalette1")),
            color_palette_2=self._xml_text(variables.get("systemColorPalette2")),
            color_palette_3=self._xml_text(variables.get("systemColorPalette3")),
            color_palette_4=self._xml_text(variables.get("systemColorPalette4")),
            cart_size=self._xml_text(variables.get("systemCartSize")),
        )

    def resolve_system_metadata(self, system_name: str) -> SystemMetadata | None:
        metadata_folder = self.paths.systemMetadataFolder
        candidates = [
            os.path.join(metadata_folder, f"{system_name}.xml"),
            os.path.join(metadata_folder, "_default.xml"),
        ]

        for metadata_path in candidates:
            if not os.path.isfile(metadata_path):
                continue

            try:
                with open(metadata_path, "r") as f:
                    parsed = xmltodict.parse(f.read())
                variables = parsed.get("theme", {}).get("variables")
                metadata = self._parse_system_metadata_variables(variables)
                if metadata is not None:
                    return metadata
            except Exception as e:
                self.logger.error(
                    f"Failed to load system metadata for {system_name} at {metadata_path}: {e}"
                )

        return None

    def resolve_component_name(self, emulator_name: list[str] | None) -> str | None:
        if not emulator_name:
            return None

        first = emulator_name[0]
        if not isinstance(first, str):
            return None

        parts = first.strip().lower().split()
        if not parts:
            return None

        return parts[0]

    def _parse_component_metadata(self, data: dict | None) -> ComponentMetadata | None:
        if not data or not isinstance(data, dict):
            return None

        return ComponentMetadata(
            name=data.get("name"),
            description=data.get("description"),
            url_rdwiki=data.get("url_rdwiki"),
            url_webpage=data.get("url_webpage"),
            url_donation_purchase=data.get("url_donation_purchase"),
            url_source=data.get("url_source"),
            system=data.get("system"),
            component_type=data.get("component_type"),
            system_friendly_name=data.get("system_friendly_name"),
        )

    def resolve_component_metadata(self, component_name: str | None) -> ComponentMetadata | None:
        if not component_name:
            return None

        manifest_path = os.path.join(
            self.paths.componentsFolder,
            component_name,
            "component_manifest.json",
        )

        if not os.path.isfile(manifest_path):
            self.logger.error(f"Component manifest not found at {manifest_path}")
            return None

        try:
            with open(manifest_path, "r") as f:
                parsed = json.load(f)

            if not isinstance(parsed, dict):
                return None

            entry = parsed.get(component_name)
            if entry is None and len(parsed) == 1:
                entry = next(iter(parsed.values()))

            return self._parse_component_metadata(entry)
        except Exception as e:
            self.logger.error(
                f"Failed to load component metadata for {component_name} at {manifest_path}: {e}"
            )
            return None

    def _preprocess_gamelist_xml(self, xml_string: str) -> dict:
        xml_string = xml_string.lstrip()
        if xml_string.startswith("<?xml"):
            end = xml_string.find("?>")
            if end != -1:
                xml_string = xml_string[end + 2:].lstrip()

        wrapped_xml = f"<wrapperRoot>{xml_string}</wrapperRoot>"

        return wrapped_xml

    def _load_gamelist(self, system_name: str) -> dict | None:
        gamelist_path = os.path.join(self.paths.esDeUserFolder, "gamelists", system_name, "gamelist.xml")
        try:
            with open(gamelist_path, "r") as f: 
                xml_content = self._preprocess_gamelist_xml(f.read())
                return xmltodict.parse(xml_content)['wrapperRoot']
        except:
            self.logger.error(f"Failed to load gamelist for system {system_name} at path {gamelist_path}")
            return None

    def _normalize_rom_path_for_gamelist(self, rom_path: str, system_name: str) -> str:
        rom_path = rom_path.replace("\\", "")
        rom_path_normalized = os.path.normpath(rom_path)
        rom_system_folder = os.path.normpath(os.path.join(self.paths.romsFolder, system_name))
        return os.path.normpath(os.path.relpath(rom_path_normalized, rom_system_folder))

    def _load_gamelist_alternative_emulator(self, system_name: str):
        gamelist = self._load_gamelist(system_name)
        if gamelist is None:
            return None

        if "alternativeEmulator" in gamelist:
            return gamelist['alternativeEmulator']['label']
        
        return None

    def load_game_data(self, system_name: str, rom_path: str) -> dict | None:
        gamelist = self._load_gamelist(system_name)
        if gamelist is None or "gameList" not in gamelist:
            return None

        games = gamelist['gameList']['game']
        if not isinstance(games, list):
            games = [games]

        normalized_rom_path = self._normalize_rom_path_for_gamelist(rom_path, system_name)

        for game in games:
            if game.get('path') is None:
                continue

            gamelist_path = os.path.normpath(game['path'].strip().removeprefix('./'))
            if gamelist_path != normalized_rom_path:
                continue

            return game

        return None

    def _load_gamelist_game_alternative_emulator(self, system_name: str, rom_path: str):
        game = self.load_game_data(system_name, rom_path)
        if game is None:
            return None

        if "altemulator" in game:
            return game['altemulator']

        return None
        
    def _resolve_emulator_by_command(self, command: dict) -> bool:
        if(command['#text'].strip().startswith("%EMULATOR_RETROARCH%")):
            return ["RetroArch", command['@label'].strip()]

        return [command['@label'].strip()]

    def resolve_emulator_name(self, system_name: str, rom_path: str) -> list[str]:
        if system_name not in self.es_systems:
            return []

        commands = self.es_systems[system_name]['command']

        command_list = commands if isinstance(commands, list) else [commands]

        alt_emulator = self._load_gamelist_game_alternative_emulator(system_name, rom_path)
        if alt_emulator is None:
            alt_emulator = self._load_gamelist_alternative_emulator(system_name)

        if alt_emulator is not None:

            for command in command_list:
                if command['@label'].strip() == alt_emulator.strip():
                    return self._resolve_emulator_by_command(command)

        return self._resolve_emulator_by_command(command_list[0])

    def create_es_de_event_scripts(self, apiBaseUrl: str):
        scripts = [
            ["game-start", "game_start_RetroDECKY_v1.sh", "game_start"],
            ["game-end", "game_end_RetroDECKY_v1.sh", "game_end"],
        ]

        for script_name, script_file, event_type in scripts:

            api_url = os.path.join(apiBaseUrl, "game-event")

            script_content = f"""
            curl -X POST -d "{event_type};$1;$2;$3;$4" {api_url} &
            """.strip()
            
            target_folder = os.path.join(self.paths.esDeConfigFolder, "scripts", script_name)
            target = os.path.join(target_folder, script_file)

            os.makedirs(target_folder, exist_ok=True)

            with open(target, "w") as f:
                f.write(script_content)
            os.chmod(target, 0o755)

            if not os.path.exists(target):
                return False

            self.logger.info(f"Created es-de event script: {target}")

        return True

    def remove_es_de_event_scripts(self) -> bool:
        scripts = [
            ["game-start", "game_start_decky.sh"],
            ["game-end", "game_end_decky.sh"],
        ]

        for script_name, script_file in scripts:
            target_folder = os.path.join(self.paths.esDeConfigFolder, "scripts", script_name)
            target = os.path.join(target_folder, script_file)

            if os.path.exists(target):
                os.remove(target)
                if os.path.exists(target):
                    return False
                self.logger.info(f"Removed es-de event script: {target}")

        return True

    def __init__(self, logger: Logger, paths: Paths):
        self.logger = logger
        self.paths = paths


    