import asyncio
import json
import os
import re
import ssl
import stat
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from logging import Logger

API_BASE = "https://retroachievements.org/API"
BADGE_BASE = "https://media.retroachievements.org/Badge"

GAME_LIST_CACHE_TTL = 24 * 60 * 60
REQUEST_TIMEOUT = 30
RAHASHER_TIMEOUT = 60

SETTINGS_USERNAME_KEY = "retroAchievementsUsername"
SETTINGS_API_KEY = "retroAchievementsApiKey"

# Maps ES-DE system names (from es_systems.xml) to RetroAchievements console IDs
# (from API_GetConsoleIDs.php). Built from RA's active game-system console list,
# so only systems with a corresponding RA console are present here.
SYSTEM_NAME_TO_RA_CONSOLE_ID: dict[str, int] = {
    "3do": 43,
    "amstradcpc": 37,
    "apple2": 38,
    "arcade": 27,
    "arcadia": 73,
    "arduboy": 71,
    "atari2600": 25,
    "atari7800": 51,
    "atarijaguar": 17,
    "atarijaguarcd": 77,
    "atarilynx": 13,
    "channelf": 57,
    "colecovision": 44,
    "consolearcade": 27,
    "daphne": 27,
    "dreamcast": 40,
    "famicom": 7,
    "fbneo": 27,
    "fds": 81,
    "gamegear": 15,
    "gb": 4,
    "gba": 5,
    "gbc": 6,
    "gc": 16,
    "genesis": 1,
    "intellivision": 45,
    "mame": 27,
    "mastersystem": 11,
    "megadrive": 1,
    "megaduck": 69,
    "msx": 29,
    "msx1": 29,
    "msx2": 29,
    "msxturbor": 29,
    "n64": 2,
    "n64dd": 2,
    "naomi": 27,
    "nds": 18,
    "neogeocd": 56,
    "neogeocdjp": 56,
    "nes": 7,
    "ngp": 14,
    "ngpc": 14,
    "odyssey2": 23,
    "pcengine": 8,
    "pcenginecd": 76,
    "pcfx": 49,
    "ps2": 21,
    "psp": 41,
    "psx": 12,
    "saturn": 39,
    "saturnjp": 39,
    "sega32x": 10,
    "sega32xjp": 10,
    "sega32xna": 10,
    "segacd": 9,
    "sg-1000": 33,
    "sgb": 4,
    "snes": 3,
    "supervision": 63,
    "uzebox": 80,
    "vectrex": 46,
    "virtualboy": 28,
    "wasm4": 72,
    "wii": 19,
    "wonderswan": 53,
    "wonderswancolor": 53,
}


def is_ra_available_for_system(system_name: str) -> bool:
    if not system_name:
        return False
    return system_name.lower() in SYSTEM_NAME_TO_RA_CONSOLE_ID


def _build_ssl_context() -> ssl.SSLContext:
    ca_candidates = [
        os.environ.get("SSL_CERT_FILE"),
        os.environ.get("REQUESTS_CA_BUNDLE"),
        "/etc/ssl/certs/ca-certificates.crt",
        "/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem",
        "/etc/pki/tls/certs/ca-bundle.crt",
        "/etc/ssl/ca-bundle.pem",
    ]

    for ca_file in ca_candidates:
        if ca_file and os.path.isfile(ca_file):
            try:
                return ssl.create_default_context(cafile=ca_file)
            except ssl.SSLError:
                continue

    return ssl.create_default_context()


class RetroAchievements:
    def __init__(self, logger: Logger, settings, plugin_dir: str, runtime_dir: str):
        self.logger = logger
        self.settings = settings
        self.plugin_dir = plugin_dir
        self.runtime_dir = runtime_dir
        self.rahasher_zip_path = os.path.join(plugin_dir, "bin", "RAHasher.zip")
        self.rahasher_dir = os.path.join(runtime_dir, "RAHasher")
        self.rahasher_path = os.path.join(self.rahasher_dir, "bin64", "RAHasher")
        self._rahasher_unzipped = False
        self._cached_match_key: tuple[int, str] | None = None
        self._cached_match: tuple[int, str] | None = None  # game_id, "hash" | "name"
        self._game_list_cache: dict[int, tuple[float, list[dict]]] = {}

    def _get_credentials(self) -> tuple[str | None, str | None]:
        username = self.settings.getSetting(SETTINGS_USERNAME_KEY)
        api_key = self.settings.getSetting(SETTINGS_API_KEY)
        if not username or not api_key:
            return None, None
        return str(username).strip(), str(api_key).strip()

    def _persist_credentials(self, username: str, api_key: str) -> None:
        self.settings.setSetting(SETTINGS_USERNAME_KEY, username)
        self.settings.setSetting(SETTINGS_API_KEY, api_key)
        self.settings.commit()

    def _fetch_json_sync(self, endpoint: str, params: dict[str, str]) -> list | dict:
        query = urllib.parse.urlencode(params)
        url = f"{API_BASE}/{endpoint}?{query}"
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "RetroDECKY/1.0"},
        )

        with urllib.request.urlopen(
            request,
            timeout=REQUEST_TIMEOUT,
            context=_build_ssl_context(),
        ) as response:
            body = response.read().decode("utf-8")

        return json.loads(body)

    async def _get_json(self, endpoint: str, params: dict[str, str]) -> list | dict:
        return await asyncio.to_thread(self._fetch_json_sync, endpoint, params)

    async def _validate_profile(self, username: str, api_key: str) -> tuple[bool, str | None, str | None]:
        try:
            result = await self._get_json(
                "API_GetUserProfile.php",
                {"u": username, "y": api_key},
            )
        except urllib.error.HTTPError as e:
            return False, None, f"HTTP error {e.code}"
        except urllib.error.URLError as e:
            return False, None, f"Network error: {e.reason}"
        except Exception as e:
            self.logger.error(f"RA profile validation failed: {e}")
            return False, None, "Failed to validate credentials"

        if isinstance(result, dict):
            if result.get("Error"):
                return False, None, str(result["Error"])
            user = result.get("User") or result.get("user")
            if user:
                return True, str(user), None

        return False, None, "Invalid API response"

    async def get_status(self) -> dict:
        username, api_key = self._get_credentials()
        return {
            "configured": bool(username and api_key),
            "username": username,
        }

    async def save_credentials(self, username: str, api_key: str) -> dict:
        username = username.strip()
        api_key = api_key.strip()

        if not username or not api_key:
            return {
                "saved": False,
                "user": None,
                "error": "Username and API key are required.",
            }

        valid, user, error = await self._validate_profile(username, api_key)
        if not valid:
            return {"saved": False, "user": None, "error": error or "Invalid credentials."}

        self._persist_credentials(username, api_key)
        return {"saved": True, "user": user, "error": None}

    async def clear_credentials(self) -> dict:
        self._persist_credentials("", "")
        return {"cleared": True}

    async def _get_game_list(self, console_id: int, api_key: str) -> list[dict]:
        cached = self._game_list_cache.get(console_id)
        if cached is not None:
            fetched_at, data = cached
            if time.time() - fetched_at <= GAME_LIST_CACHE_TTL:
                return data

        try:
            result = await self._get_json(
                "API_GetGameList.php",
                {
                    "y": api_key,
                    "i": str(console_id),
                    "f": "1",
                    "h": "1",
                },
            )
            if isinstance(result, list):
                self._game_list_cache[console_id] = (time.time(), result)
                return result
        except Exception as e:
            self.logger.error(f"Failed to fetch RA game list for console {console_id}: {e}")

        if cached is not None:
            return cached[1]

        raise RuntimeError(f"Failed to load RetroAchievements game list for console {console_id}")

    async def _get_game_progress(
        self, game_id: int, username: str, api_key: str
    ) -> dict:
        result = await self._get_json(
            "API_GetGameInfoAndUserProgress.php",
            {"g": str(game_id), "u": username, "y": api_key, "a": "1"},
        )
        if not isinstance(result, dict):
            raise RuntimeError("Invalid game progress response")
        if result.get("Error"):
            raise RuntimeError(str(result["Error"]))
        return result

    def _resolve_console_id(self, system_name: str) -> int | None:
        return SYSTEM_NAME_TO_RA_CONSOLE_ID.get(system_name.lower())

    def _normalize_rom_path(self, game_path: str) -> str:
        return os.path.normpath(game_path.replace("\\", ""))

    def _match_cache_key(self, console_id: int, game_path: str) -> tuple[int, str]:
        return console_id, self._normalize_rom_path(game_path)

    def _get_cached_match(self, console_id: int, game_path: str) -> tuple[int, str] | None:
        cache_key = self._match_cache_key(console_id, game_path)
        if self._cached_match_key == cache_key:
            return self._cached_match
        return None

    def _set_cached_match(
        self, console_id: int, game_path: str, game_id: int, matched_by: str
    ) -> None:
        self._cached_match_key = self._match_cache_key(console_id, game_path)
        self._cached_match = (game_id, matched_by)

    def _resolve_hash_path(self, game_path: str) -> str | None:
        game_path = self._normalize_rom_path(game_path) if game_path else game_path

        if not game_path or not os.path.exists(game_path):
            self.logger.error(f"Game file not found for hashing: {game_path}")
            return None

        if not game_path.lower().endswith(".m3u"):
            return game_path

        try:
            with open(game_path, "r", encoding="utf-8", errors="replace") as f:
                first_line = f.readline().strip()
        except OSError as e:
            self.logger.error(f"Failed to read m3u playlist {game_path}: {e}")
            return None

        if not first_line:
            self.logger.error(f"m3u playlist is empty: {game_path}")
            return None

        first_line = first_line.replace("\\", "")
        entry_path = first_line if os.path.isabs(first_line) else os.path.join(
            os.path.dirname(game_path), first_line
        )
        entry_path = os.path.normpath(entry_path)

        if not os.path.exists(entry_path):
            self.logger.error(
                f"m3u entry not found for hashing: {entry_path} (from {game_path})"
            )
            return None

        return entry_path

    def _ensure_rahasher(self) -> bool:
        if self._rahasher_unzipped and os.path.isfile(self.rahasher_path):
            return True

        if not os.path.isfile(self.rahasher_zip_path):
            self.logger.error(f"RAHasher zip not found at {self.rahasher_zip_path}")
            return False

        try:
            os.makedirs(self.rahasher_dir, exist_ok=True)
            with zipfile.ZipFile(self.rahasher_zip_path, "r") as archive:
                archive.extractall(self.rahasher_dir)

            if not os.path.isfile(self.rahasher_path):
                self.logger.error(
                    f"RAHasher binary missing after unzip at {self.rahasher_path}"
                )
                return False

            os.chmod(
                self.rahasher_path,
                os.stat(self.rahasher_path).st_mode
                | stat.S_IXUSR
                | stat.S_IXGRP
                | stat.S_IXOTH,
            )
            self._rahasher_unzipped = True
            self.logger.info(f"Unzipped RAHasher to {self.rahasher_path}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to unzip RAHasher: {e}")
            return False

    def _hash_game_file_sync(self, console_id: int, game_path: str) -> str | None:
        if not self._ensure_rahasher():
            return None

        hash_path = self._resolve_hash_path(game_path)
        if not hash_path:
            return None

        try:
            result = subprocess.run(
                [self.rahasher_path, str(console_id), hash_path],
                capture_output=True,
                text=True,
                timeout=RAHASHER_TIMEOUT,
                env={**os.environ, "LD_LIBRARY_PATH": ""},
            )
        except subprocess.TimeoutExpired:
            self.logger.warning(
                f"RAHasher timed out after {RAHASHER_TIMEOUT}s for {hash_path} "
                f"(console {console_id})"
            )
            return None

        if result.returncode != 0:
            stderr = (result.stderr or "").strip()
            stdout = (result.stdout or "").strip()
            self.logger.warning(
                f"RAHasher failed for {hash_path} (console {console_id}): "
                f"{stderr or stdout or f'exit {result.returncode}'}"
            )
            return None

        for line in reversed((result.stdout or "").strip().splitlines()):
            candidate = line.strip()
            if re.fullmatch(r"[0-9a-fA-F]{32}", candidate):
                return candidate.lower()

        self.logger.warning(f"RAHasher produced no hash for {hash_path}")
        return None

    async def _hash_game_file(self, console_id: int, game_path: str) -> str | None:
        return await asyncio.to_thread(self._hash_game_file_sync, console_id, game_path)

    def _find_game_by_hash(self, games: list[dict], game_hash: str) -> dict | None:
        target = game_hash.lower().strip()
        if not target:
            return None

        for game in games:
            hashes = game.get("Hashes") or game.get("hashes") or []
            for entry in hashes:
                if str(entry).lower() == target:
                    return game
        return None

    def _normalize_game_title(self, title: str) -> str:
        # Strip region/revision tags: "Game 1 (USA) [Rev1]" -> "Game 1"
        normalized = re.sub(r"\([^)]*\)", "", title)
        normalized = re.sub(r"\[[^\]]*\]", "", normalized)
        # Keep letters and digits only (drops whitespace and symbols)
        normalized = re.sub(r"[^0-9A-Za-z]", "", normalized)
        return normalized.lower()

    def _find_game_by_title(self, games: list[dict], game_name: str) -> dict | None:
        target = self._normalize_game_title(game_name)
        if not target:
            return None

        for game in games:
            title = game.get("Title") or game.get("title") or ""
            if self._normalize_game_title(str(title)) == target:
                return game
        return None

    def _badge_urls(self, badge_name: str | None) -> tuple[str | None, str | None]:
        if not badge_name:
            return None, None
        badge_url = f"{BADGE_BASE}/{badge_name}.png"
        badge_locked_url = f"{BADGE_BASE}/{badge_name}_lock.png"
        return badge_url, badge_locked_url

    def _build_achievements_payload(self, progress: dict) -> tuple[list[dict], dict, dict]:
        achievements_map = progress.get("Achievements") or progress.get("achievements") or {}
        achievements: list[dict] = []

        for achievement in achievements_map.values():
            if not isinstance(achievement, dict):
                continue

            badge_name = achievement.get("BadgeName") or achievement.get("badgeName")
            badge_url, badge_locked_url = self._badge_urls(badge_name)
            earned = bool(
                achievement.get("DateEarned")
                or achievement.get("dateEarned")
            )
            earned_hardcore = bool(
                achievement.get("DateEarnedHardcore")
                or achievement.get("dateEarnedHardcore")
            )
            points = int(achievement.get("Points") or achievement.get("points") or 0)
            display_order = int(
                achievement.get("DisplayOrder") or achievement.get("displayOrder") or 0
            )

            achievements.append(
                {
                    "id": int(achievement.get("ID") or achievement.get("id") or 0),
                    "title": achievement.get("Title") or achievement.get("title") or "",
                    "description": achievement.get("Description")
                    or achievement.get("description")
                    or "",
                    "points": points,
                    "badge_url": badge_url,
                    "badge_locked_url": badge_locked_url,
                    "earned": earned,
                    "earned_hardcore": earned_hardcore,
                    "display_order": display_order,
                }
            )

        achievements.sort(
            key=lambda item: (0 if item["earned"] else 1, item["display_order"], item["title"])
        )

        total_count = len(achievements)
        total_points = sum(item["points"] for item in achievements)

        softcore_earned_count = sum(1 for item in achievements if item["earned"])
        softcore_earned_points = sum(
            item["points"] for item in achievements if item["earned"]
        )
        softcore_completion = (
            f"{round((softcore_earned_count / total_count) * 100)}%"
            if total_count > 0
            else "0%"
        )

        hardcore_earned_count = sum(1 for item in achievements if item["earned_hardcore"])
        hardcore_earned_points = sum(
            item["points"] for item in achievements if item["earned_hardcore"]
        )
        hardcore_completion = (
            f"{round((hardcore_earned_count / total_count) * 100)}%"
            if total_count > 0
            else "0%"
        )

        summary = {
            "softcore": {
                "earned_count": softcore_earned_count,
                "total_count": total_count,
                "earned_points": softcore_earned_points,
                "total_points": total_points,
                "completion": softcore_completion,
            },
            "hardcore": {
                "earned_count": hardcore_earned_count,
                "total_count": total_count,
                "earned_points": hardcore_earned_points,
                "total_points": total_points,
                "completion": hardcore_completion,
            },
        }

        game = {
            "id": int(progress.get("ID") or progress.get("id") or 0),
            "title": progress.get("Title") or progress.get("title") or "",
            "console_name": progress.get("ConsoleName") or progress.get("consoleName") or "",
            "image_icon": progress.get("ImageIcon") or progress.get("imageIcon"),
            "user_completion": progress.get("UserCompletion")
            or progress.get("userCompletion")
            or softcore_completion,
        }

        return achievements, summary, game

    async def get_achievements_for_game(
        self,
        system_name: str,
        system_full_name: str,
        game_name: str,
        game_path: str,
    ) -> dict:
        username, api_key = self._get_credentials()
        if not username or not api_key:
            return {
                "status": "not_configured",
                "message": "RetroAchievements is not configured. Add your username and API key in Settings.",
                "game": None,
                "summary": None,
                "achievements": [],
            }

        try:
            console_id = self._resolve_console_id(system_name)
            if console_id is None:
                return {
                    "status": "no_console",
                    "message": f"No matching RetroAchievements console found for {system_full_name or system_name}.",
                    "game": None,
                    "summary": None,
                    "achievements": [],
                }

            cached_match = self._get_cached_match(console_id, game_path)
            if cached_match is not None:
                game_id, matched_by = cached_match
            else:
                games = await self._get_game_list(console_id, api_key)

                matched_game = None
                matched_by = None
                game_hash = await self._hash_game_file(console_id, game_path)
                if game_hash:
                    matched_game = self._find_game_by_hash(games, game_hash)
                    if matched_game is not None:
                        matched_by = "hash"

                if matched_game is None:
                    matched_game = self._find_game_by_title(games, game_name)
                    if matched_game is not None:
                        matched_by = "name"

                if matched_game is None:
                    return {
                        "status": "not_found",
                        "message": "Game was not found.",
                        "game": None,
                        "summary": None,
                        "achievements": [],
                    }

                game_id = int(matched_game.get("ID") or matched_game.get("id"))
                self._set_cached_match(console_id, game_path, game_id, matched_by)

            progress = await self._get_game_progress(game_id, username, api_key)
            achievements, summary, game = self._build_achievements_payload(progress)
            game["matched_by"] = matched_by

            return {
                "status": "ok",
                "message": None,
                "game": game,
                "summary": summary,
                "achievements": achievements,
            }
        except Exception as e:
            self.logger.error(f"Failed to load RetroAchievements for {game_name}: {e}")
            return {
                "status": "error",
                "message": "Failed to load RetroAchievements. Please try again later.",
                "game": None,
                "summary": None,
                "achievements": [],
            }
