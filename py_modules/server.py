from logging import Logger
import threading
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import unquote
from models import Paths

# Port kept stable across restarts to avoid stale caches on the frontend.
# Falls back to a random free port if something else is already bound to it.
PREFERRED_PORT = 47842

class ServerHandler(SimpleHTTPRequestHandler):
    def _get_path_mappings(self):
        paths = self.server.config["paths"]
        return {
            "/es-de-media/": paths.esDeDownloadedMediaFolder,
            "/custom-documents/": paths.customDocumentsFolder,
        }

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")

    def end_headers(self):
        self._set_cors_headers()
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        path_mappings = self._get_path_mappings()
        for url_prefix, directory_path in path_mappings.items():
            if self.path.startswith(url_prefix):
                self._serving_directory = os.path.abspath(directory_path)
                self.path = self.path[len(url_prefix):]
                return super().do_GET()

        self.send_response(404)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"Not Found")

    def do_POST(self):
        if self.path == "/api/game-event":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")

            self.server.config["on_game_event_callback"](body)

            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
        else:
            self.send_response(404)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Not Found")

    def translate_path(self, path):
        if hasattr(self, '_serving_directory'):
            target_directory = self._serving_directory
            delattr(self, '_serving_directory')
            decoded_path = unquote(path)
            clean_path = decoded_path.lstrip('/')
            return os.path.join(target_directory, clean_path)
        
        return super().translate_path(path)


class Server:
    def _create_httpd(self) -> HTTPServer:
        try:
            return HTTPServer(("localhost", PREFERRED_PORT), ServerHandler)
        except OSError as e:
            self.logger.warning(
                f"Preferred port {PREFERRED_PORT} unavailable ({e}), falling back to a random free port"
            )
            return HTTPServer(("localhost", 0), ServerHandler)

    def get_port(self):
        return self.port

    def get_es_de_media_url(self):
        return f"http://localhost:{self.port}/es-de-media/"

    def get_custom_documents_url(self):
        return f"http://localhost:{self.port}/custom-documents/"

    def get_api_url(self):
        return f"http://localhost:{self.port}/api/"
        
    def start_server(self):
        self.httpd = self._create_httpd()

        self.httpd.config = {
            "paths": self.paths,
            "on_game_event_callback": self.on_game_event_callback
        }

        self.port = self.httpd.server_address[1]

        self.server_thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.server_thread.start()

        self.logger.info(f"Server started on port {self.port}")

        self.logger.info(f"ES-DE media URL: {self.get_es_de_media_url()}")
        self.logger.info(f"Custom documents URL: {self.get_custom_documents_url()}")
        self.logger.info(f"API URL: {self.get_api_url()}")

    def stop_server(self):
        if self.server_thread is None:
            return
        if self.httpd is not None:
            self.httpd.shutdown()
            self.httpd.server_close()
            self.httpd = None
        self.server_thread.join(timeout=5)
        self.server_thread = None
        self.logger.info("Server stopped")

    def __init__(self, logger: Logger, paths: Paths, on_game_event_callback: callable):
        self.logger = logger
        self.paths = paths
        self.on_game_event_callback = on_game_event_callback
        self.httpd = None
        self.server_thread = None