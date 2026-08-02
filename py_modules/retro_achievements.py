import asyncio
import json
import os
import re
import ssl
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from logging import Logger

API_BASE = "https://retroachievements.org/API"
BADGE_BASE = "https://media.retroachievements.org/Badge"

GAME_LIST_CACHE_TTL = 7 * 24 * 60 * 60
REQUEST_TIMEOUT = 10

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


def normalize_title(title: str) -> str:
    """Normalize a game title for fuzzy matching. Isolated for later iteration."""
    if not title:
        return ""

    normalized = title.strip()
    normalized = os.path.splitext(normalized)[0]
    normalized = re.sub(r"\([^)]*\)", "", normalized)
    normalized = re.sub(r"\[[^\]]*\]", "", normalized)
    normalized = re.sub(r"[^\w\s]", " ", normalized, flags=re.UNICODE)
    normalized = re.sub(r"\s+", " ", normalized).strip().lower()

    for article in ("the ", "a ", "an "):
        if normalized.startswith(article):
            normalized = normalized[len(article) :]
            break

    return normalized


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


def _fetch_url_with_curl(url: str, timeout: int) -> str:
    result = subprocess.run(
        [
            "curl",
            "-fsS",
            "--max-time",
            str(timeout),
            "-A",
            "RetroDECKY/1.0",
            url,
        ],
        capture_output=True,
        text=True,
        env={**os.environ, "LD_LIBRARY_PATH": ""},
    )

    if result.returncode != 0:
        stderr = result.stderr.strip()
        raise urllib.error.URLError(stderr or "curl request failed")

    return result.stdout


class RetroAchievements:
    def __init__(self, logger: Logger, cache_dir: str, settings):
        self.logger = logger
        self.cache_dir = os.path.join(cache_dir, "retroachievements")
        self.settings = settings
        os.makedirs(self.cache_dir, exist_ok=True)

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

    def _cache_path(self, name: str) -> str:
        safe_name = re.sub(r"[^\w.-]", "_", name)
        return os.path.join(self.cache_dir, f"{safe_name}.json")

    def _read_cache(self, name: str, ttl: int) -> list | dict | None:
        path = self._cache_path(name)
        if not os.path.isfile(path):
            return None

        try:
            with open(path, "r", encoding="utf-8") as f:
                payload = json.load(f)
        except (OSError, json.JSONDecodeError) as e:
            self.logger.warning(f"Failed to read RA cache {name}: {e}")
            return None

        fetched_at = payload.get("fetched_at", 0)
        if time.time() - fetched_at > ttl:
            return None

        return payload.get("data")

    def _read_cache_stale(self, name: str) -> list | dict | None:
        path = self._cache_path(name)
        if not os.path.isfile(path):
            return None

        try:
            with open(path, "r", encoding="utf-8") as f:
                payload = json.load(f)
            return payload.get("data")
        except (OSError, json.JSONDecodeError):
            return None

    def _write_cache(self, name: str, data: list | dict) -> None:
        path = self._cache_path(name)
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump({"fetched_at": time.time(), "data": data}, f)
        except OSError as e:
            self.logger.warning(f"Failed to write RA cache {name}: {e}")

    def _fetch_json_sync(self, endpoint: str, params: dict[str, str]) -> list | dict:
        query = urllib.parse.urlencode(params)
        url = f"{API_BASE}/{endpoint}?{query}"
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "RetroDECKY/1.0"},
        )

        try:
            with urllib.request.urlopen(
                request,
                timeout=REQUEST_TIMEOUT,
                context=_build_ssl_context(),
            ) as response:
                body = response.read().decode("utf-8")
        except urllib.error.URLError as e:
            reason = str(getattr(e, "reason", e))
            if "certificate" not in reason.lower() and "ssl" not in reason.lower():
                raise

            self.logger.warning(
                f"RA HTTPS request failed via urllib ({reason}), falling back to curl"
            )
            body = _fetch_url_with_curl(url, REQUEST_TIMEOUT)

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
        cache_name = f"games_{console_id}"
        cached = self._read_cache(cache_name, GAME_LIST_CACHE_TTL)
        if cached is not None:
            return cached

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
                self._write_cache(cache_name, result)
                return result
        except Exception as e:
            self.logger.error(f"Failed to fetch RA game list for console {console_id}: {e}")

        stale = self._read_cache_stale(cache_name)
        if stale is not None:
            return stale

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

    def _find_game(self, games: list[dict], game_name: str) -> dict | None:
        target = normalize_title(game_name)
        if not target:
            return None

        exact_matches = []
        prefix_matches = []

        for game in games:
            title = game.get("Title") or game.get("title") or ""
            normalized = normalize_title(title)
            if not normalized:
                continue
            if normalized == target:
                exact_matches.append(game)
            elif normalized.startswith(target) or target.startswith(normalized):
                prefix_matches.append(game)

        if exact_matches:
            return exact_matches[0]
        if prefix_matches:
            return prefix_matches[0]
        return None

    def _badge_urls(self, badge_name: str | None) -> tuple[str | None, str | None]:
        if not badge_name:
            return None, None
        badge_url = f"{BADGE_BASE}/{badge_name}.png"
        badge_locked_url = f"{BADGE_BASE}/{badge_name}_lock.png"
        return badge_url, badge_locked_url

    def _format_date(self, value: str | None) -> str | None:
        if not value:
            return None
        return value.split(" ")[0]

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
                    "date_earned": self._format_date(
                        achievement.get("DateEarned") or achievement.get("dateEarned")
                    ),
                    "display_order": display_order,
                }
            )

        achievements.sort(
            key=lambda item: (0 if item["earned"] else 1, item["display_order"], item["title"])
        )

        earned_count = sum(1 for item in achievements if item["earned"])
        total_count = len(achievements)
        earned_points = sum(item["points"] for item in achievements if item["earned"])
        total_points = sum(item["points"] for item in achievements)
        completion = (
            f"{round((earned_count / total_count) * 100)}%"
            if total_count > 0
            else "0%"
        )

        summary = {
            "earned_count": earned_count,
            "total_count": total_count,
            "earned_points": earned_points,
            "total_points": total_points,
            "completion": completion,
        }

        game = {
            "id": int(progress.get("ID") or progress.get("id") or 0),
            "title": progress.get("Title") or progress.get("title") or "",
            "console_name": progress.get("ConsoleName") or progress.get("consoleName") or "",
            "image_icon": progress.get("ImageIcon") or progress.get("imageIcon"),
            "user_completion": progress.get("UserCompletion")
            or progress.get("userCompletion")
            or completion,
        }

        return achievements, summary, game

    async def get_achievements_for_game(
        self, system_name: str, system_full_name: str, game_name: str
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

            games = await self._get_game_list(console_id, api_key)
            matched_game = self._find_game(games, game_name)
            if matched_game is None:
                return {
                    "status": "not_found",
                    "message": "No RetroAchievements found for this game.",
                    "game": None,
                    "summary": None,
                    "achievements": [],
                }

            game_id = int(matched_game.get("ID") or matched_game.get("id"))
            progress = await self._get_game_progress(game_id, username, api_key)
            achievements, summary, game = self._build_achievements_payload(progress)

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
