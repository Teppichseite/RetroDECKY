from dataclasses import dataclass

@dataclass
class GameMetadata:
    desc: str | None
    rating: str | None
    releasedate: str | None
    developer: str | None
    publisher: str | None
    genre: str | None
    players: str | None

@dataclass
class SystemMetadata:
    name: str | None
    description: str | None
    manufacturer: str | None
    release_year: str | None
    release_date: str | None
    release_date_formatted: str | None
    hardware_type: str | None
    cover_size: str | None
    cover_size_type: str | None
    color: str | None
    color_palette_1: str | None
    color_palette_2: str | None
    color_palette_3: str | None
    color_palette_4: str | None
    cart_size: str | None

@dataclass
class ComponentMetadata:
    name: str | None
    description: str | None
    url_rdwiki: str | None
    url_webpage: str | None
    url_donation_purchase: str | list[str] | None
    url_source: str | None
    system: str | list[str] | None
    component_type: str | None
    system_friendly_name: str | list[str] | None

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
    game_metadata: GameMetadata
    system_metadata: SystemMetadata | None
    component: str | None
    component_metadata: ComponentMetadata | None
    retro_achievements_available: bool

@dataclass
class Paths:
    esDeUserFolder: str
    esDeConfigFolder: str
    esDeDownloadedMediaFolder: str
    esDeDefaultEsSystemsFile: str
    systemMetadataFolder: str
    componentsFolder: str
    romsFolder: str
    actionsFile: str
    customDocumentsFolder: str
    retrodeckHomePath: str
