from logging import Logger
import os
import xmltodict
from models import Paths

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
        rom_path_no_ext = os.path.splitext(rom_path)[0].replace("\\", "")

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

    def resolve_emulator_name(self, system_name: str) -> list[str]:
        if system_name not in self.es_systems:
            return []

        commands = self.es_systems[system_name]['command']

        first_command = commands

        if isinstance(commands, list):
            first_command = commands[0]

        if(first_command['#text'].strip().startswith("%EMULATOR_RETROARCH%")):
            return ["RetroArch", first_command['@label'].strip()]

        return [first_command['@label'].strip()]

    def create_es_de_event_scripts(self, apiBaseUrl: str):
        scripts = [
            ["game-start", "game_start_decky.sh", "game_start"],
            ["game-end", "game_end_decky.sh", "game_end"],
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

    def __init__(self, logger: Logger, paths: Paths):
        self.logger = logger
        self.paths = paths


    