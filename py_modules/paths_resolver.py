import json
import os
from logging import Logger

from models import Paths


class PathsResolver:
    RETRODECK_JSON_RELATIVE_PATH = os.path.join(
        ".var", "app", "net.retrodeck.retrodeck", "config", "retrodeck", "retrodeck.json"
    )

    def __init__(self, user_home: str, plugin_dir: str, logger: Logger):
        self.user_home = user_home
        self.plugin_dir = plugin_dir
        self.logger = logger

    def _read_retrodeck_json(self) -> dict | None:
        retrodeck_json_path = os.path.join(self.user_home, self.RETRODECK_JSON_RELATIVE_PATH)

        if not os.path.isfile(retrodeck_json_path):
            self.logger.error(f"retrodeck.json not found at {retrodeck_json_path}")
            return None

        try:
            with open(retrodeck_json_path, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            self.logger.error(f"Failed to read retrodeck.json: {e}")
            return None

    def resolve(self) -> Paths | None:
        retrodeck_config = self._read_retrodeck_json()
        if retrodeck_config is None:
            return None

        rd_paths = retrodeck_config.get("paths")
        if rd_paths is None:
            self.logger.error("retrodeck.json does not contain a 'paths' key")
            return None

        rd_home_path = rd_paths.get("rd_home_path")
        roms_path = rd_paths.get("roms_path")
        downloaded_media_path = rd_paths.get("downloaded_media_path")

        if not all([rd_home_path, roms_path, downloaded_media_path]):
            self.logger.error(
                f"retrodeck.json is missing required path(s): "
                f"rd_home_path={rd_home_path}, roms_path={roms_path}, "
                f"downloaded_media_path={downloaded_media_path}"
            )
            return None

        custom_documents_folder = os.path.join(rd_home_path, "retrodecky", "custom_documents")

        return Paths(
            esDeUserFolder=os.path.join(rd_home_path, "ES-DE"),
            esDeConfigFolder=os.path.join(
                self.user_home, ".var", "app", "net.retrodeck.retrodeck", "config", "ES-DE"
            ),
            esDeDownloadedMediaFolder=downloaded_media_path,
            esDeDefaultEsSystemsFile=os.path.join(self.plugin_dir, "presets", "es_systems.xml"),
            actionsFile=os.path.join(self.plugin_dir, "presets", "actions.json"),
            romsFolder=roms_path,
            customDocumentsFolder=custom_documents_folder,
            retrodeckHomePath=rd_home_path,
        )
