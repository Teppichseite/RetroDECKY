from logging import Logger
import os
import shutil
from models import Paths

class CustomDocuments:
    def __init__(self, logger: Logger, paths: Paths, get_custom_documents_url_func):
        """
        Initialize CustomDocuments helper
        
        Args:
            logger: Logger instance
            paths: Paths dataclass instance
            get_custom_documents_url_func: Function that returns the custom documents base URL
        """
        self.logger = logger
        self.paths = paths
        self.get_custom_documents_url = get_custom_documents_url_func

    def _get_relative_game_path(self, game_path: str, system_name: str) -> str:
        """Extract relative game path from system folder, similar to resolve_relative_media_path"""
        game_path = game_path.replace("\\", "")
        
        rom_path_no_ext = ""
        if os.path.isdir(game_path):
            rom_path_no_ext = game_path
        else:
            rom_path_no_ext = os.path.splitext(game_path)[0]
        
        roms_folder_normalized = os.path.normpath(self.paths.romsFolder)
        rom_path_normalized = os.path.normpath(rom_path_no_ext)
        
        rom_system_folder = os.path.join(roms_folder_normalized, system_name)
        
        rom_path_after_system_folder = os.path.relpath(rom_path_normalized, rom_system_folder)
        
        return rom_path_after_system_folder

    def _resolve_custom_document_path(self, full_path: str) -> str:
        """Convert a full custom document path to a server URL"""
        custom_docs_base = self.paths.customDocumentsFolder
        # Get relative path from custom_documents folder
        relative_path = os.path.relpath(full_path, custom_docs_base)
        # Normalize path separators for URL
        relative_path = relative_path.replace("\\", "/")
        return f"{self.get_custom_documents_url()}{relative_path}"

    async def list_custom_documents(self, system_name: str, game_path: str) -> list[str]:
        """List all PDF and TXT files in the custom_documents directory for a given game, returns server URLs"""
        try:
            relative_game_path = self._get_relative_game_path(game_path, system_name)
            custom_docs_dir = os.path.join(
                self.paths.customDocumentsFolder, system_name, relative_game_path
            )
            
            if not os.path.exists(custom_docs_dir):
                return []
            
            document_files = []
            for file in os.listdir(custom_docs_dir):
                if file.lower().endswith(('.pdf', '.txt', '.md', '.markdown')):
                    full_path = os.path.join(custom_docs_dir, file)
                    if os.path.isfile(full_path):
                        # Convert to server URL
                        server_url = self._resolve_custom_document_path(full_path)
                        document_files.append(server_url)
            
            return sorted(document_files)
        except Exception as e:
            self.logger.error(f"Error listing custom documents: {e}")
            return []

    async def copy_file_to_custom_documents(
        self, source_path: str, system_name: str, game_path: str, document_name: str
    ) -> str:
        """Copy a file to the custom_documents directory for a given game"""
        try:
            if not os.path.exists(source_path):
                raise ValueError(f"Source file does not exist: {source_path}")
            
            relative_game_path = self._get_relative_game_path(game_path, system_name)
            custom_docs_dir = os.path.join(
                self.paths.customDocumentsFolder, system_name, relative_game_path
            )
            
            os.makedirs(custom_docs_dir, exist_ok=True)
            
            # Preserve original file extension if document_name doesn't have one
            source_ext = os.path.splitext(source_path)[1]
            if not os.path.splitext(document_name)[1]:
                document_name = document_name + source_ext
            
            target_path = os.path.join(custom_docs_dir, document_name)
            
            shutil.copy2(source_path, target_path)
            
            self.logger.info(f"Copied file from {source_path} to {target_path}")
            return target_path
        except Exception as e:
            self.logger.error(f"Error copying file to custom documents: {e}")
            raise

