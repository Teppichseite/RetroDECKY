from dataclasses import dataclass

@dataclass
class GameEvent:
    type: str
    path: str
    name: str
    system_name: str
    system_full_name: str
    emulator_name: list[str] | None
    image_path: str | None
    manual_path: str | None
    desc: str | None
    rating: str | None
    releasedate: str | None
    developer: str | None
    publisher: str | None
    genre: str | None
    players: str | None

@dataclass
class Paths:
    esDeUserFolder: str
    esDeConfigFolder: str
    esDeDownloadedMediaFolder: str
    esDeDefaultEsSystemsFile: str
    romsFolder: str
    actionsFile: str
    customDocumentsFolder: str
    retrodeckHomePath: str