#!/usr/bin/env python3
"""
Script to generate actions.json from RetroDECK documentation.

Downloads the HTML page, extracts table data for hotkey mappings,
and converts them to JSON action format.

Note: This file was mostly AI generated.
"""

import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup


# Define action groups with ordering and category assignment
# Format: category -> list of action_ids in order
# Prefix action_id with ! to hide it
ACTION_GROUPS = {
    "quick": [
        "display-view-pdf",
        "quick-load-state",
        "quick-save-state",
        "quick-pause-resume",
        "quick-restart-reset",
        "!quick-fullscreen-toggle",
        "quick-swap-screens",
        "display-change-dual-screens-layout",
        "!quick-take-screenshot",
        "quick-escape",
        "quick-open-menu",
        "quick-quit-component",
    ],
    "general": [
        "general-pause-resume",
        "general-restart-reset",
        "general-change-disc-next-disc",
        "general-open-menu",
        "general-cheats-onoff",
        "general-turbo-onoff",
        "general-take-screenshot",
        "general-video-recording-onoff",
    ],
    "state": [
        "state-load-state",
        "state-previous-state",
        "state-next-state",
        "state-save-state",
        "state-undo-load-state",
        "state-undo-save-state",
    ],
    "display": [
        "display-change-widescreen-aspect-ratio",
        "display-swap-screens",
        "display-decrease-resolution-upscale",
        "display-increase-resolution-upscale",
        "display-fullscreen-toggle",
    ],
    "speed": [
        "speed-decrease-emulation-speed",
        "speed-increase-emulation-speed",
        "speed-reset-emulation-speed",
        "speed-frame-limit-onoff",
        "speed-disable-emulation-speed-limit",
        "speed-fast-forward",
        "speed-rewind",
    ],
    "azahar": [
        "azahar-load-amiibo",
        "azahar-remove-amiibo",
    ],
    "dolphin": [
        "dolphin-freelook-mode-onoff",
        "dolphin-freelook-mode-reset",
        "dolphin-golf-mode-onoff",
        "dolphin-wii-sync-button",
        "dolphin-wiimote-sideways",
        "dolphin-wiimote-upright",
        "dolphin-wiimote-sync-player-1",
        "dolphin-wiimote-sync-player-2",
        "dolphin-wiimote-sync-player-3",
        "dolphin-wiimote-sync-player-4",
    ],
    "melonds": [
        "melonds-closeopen-lid",
        "melonds-sunlight",
        "melonds-play-microphone",
    ],
    "mame": [
        "mame-service-mode",
        "mame-service-button-1",
        "mame-service-button-2",
        "mame-service-button-3",
        "mame-service-button-4",
        "mame-insert-bill-note",
        "mame-tilt",
        "mame-tilt-player-1",
        "mame-tilt-player-2",
        "mame-tilt-player-3",
        "mame-tilt-player-4",
    ],
    "retroarch": [
        "retroarch-cheats-onoff",
        "retroarch-previous-cheat",
        "retroarch-next-cheat",
        "retroarch-ai-service-onoff",
        "retroarch-netplay-host-onoff",
    ],
    "steam": [
        "steam-escape",
        "steam-enter",
        "steam-space",
        "steam-tab",
        "steam-control",
        "steam-alt",
        "steam-shift",
        "steam-alt-f4",
        "steam-f1",
        "steam-f4",
        "steam-f5",
        "steam-f8",
        "steam-f10",
        "steam-slash",
    ],
    "scummvm": [
        "scummvm-close",
        "scummvm-open",
        "scummvm-give",
        "scummvm-pick-up",
        "scummvm-use",
        "scummvm-look-at",
        "scummvm-move",
        "scummvm-push-shove",
        "scummvm-pull-yank",
        "scummvm-fight",
    ]
}

# Define the order of categories in the output
# Categories in this list will appear in this order
# Categories not in this list will appear at the end in alphabetical order
CATEGORY_ORDER = [
    "Quick",
    "General",
    "State",
    "Display",
    "Speed",
    "Azahar",
    "Dolphin",
    "Melonds",
    "Mame",
    "Retroarch",
    "Steam",
    "Scummvm"
]


EMULATOR_EXPANDS: Dict[str, List[str]] = {
    "Azahar": ["Azahar (Standalone)"],
    "Cemu (Standalone)": ["Cemu (Standalone)"],
    "Dolphin (Standalone)": ["Dolphin (Standalone)"],
    "Duckstation (Legacy)": ["Duckstation (Legacy) (Standalone)"],
    "GZDoom": ["GZDoom (Standalone)"],
    "IkemanGO": ["IkemanGO (Standalone)"],
    "MAME (Standalone)": ["MAME (Standalone)"],
    "MelonDS (Standalone)": ["MelonDS (Standalone)"],
    "OpenBOR": ["OpenBOR (Standalone)"],
    "PC-Systems": ["PC-Systems"],
    "PCSX2 (Standalone)": ["PCSX2 (Standalone)"],
    "PPSSPP (Standalone)": ["PPSSPP (Standalone)"],
    "PrimeHack (Standalone)": ["PrimeHack (Standalone)"],
    "Primehack (Standalone)": ["Primehack (Standalone)"],
    "RPCS3": [
        "RPCS3 (Standalone)", 
        "RPCS3 Shortcut (Standalone)", 
        "RPCS3 Game Serial (Standalone)", 
        "RPCS3 Directory (Standalone)"
    ],
    "RetroArch": ["RetroArch"],
    "Ruffle": ["Ruffle (Standalone)"],
    "ScummVM": ["ScummVM"],
    "Solarus": ["Solarus (Standalone)"],
}

# Optional per-emulator system expansions.
# If an action's systems is '*' and any of its emulators are present here
# with a non-empty list, systems will be replaced with the union.
EMULATOR_SYSTEM_EXPANDS: Dict[str, List[str]] = {
    "PC-Systems": ["PC"],
    "ScummVM": ["scummvm"]
}

# Actions whose hotkey operation should be "hold" instead of the default "press".
HOTKEY_HOLD_ACTIONS = [
    "speed-rewind",
    "speed-fast-forward",
]

# Controller-specific hotkey labels for actions.
# Format: action_id -> (steam_deck/xbox, nintendo, sony)
# Steam Deck and Xbox share the same button layout, so both use the first value.
# The Keyboard label is added automatically from the scraped keyboard shortcut.
# Keys are split by " + " to produce a list (e.g. "HKB + L1" -> ["HKB", "L1"]).
HOTKEY_LABELS: Dict[str, tuple] = {
    "quick-pause-resume": ("HKB + A", "HKB + B", "HKB + Cross"),
    "general-pause-resume": ("HKB + A", "HKB + B", "HKB + Cross"),
    "quick-load-state": ("HKB + L1", "HKB + L1", "HKB + L1"),
    "state-load-state": ("HKB + L1", "HKB + L1", "HKB + L1"),
    "quick-save-state": ("HKB + R1", "HKB + R1", "HKB + R1"),
    "state-save-state": ("HKB + R1", "HKB + R1", "HKB + R1"),
    "quick-open-menu": ("HKB + Y", "HKB + X", "HKB + Triangle"),
    "general-open-menu": ("HKB + Y", "HKB + X", "HKB + Triangle"),
    "quick-take-screenshot": ("HKB + B", "HKB + A", "HKB + Circle"),
    "general-take-screenshot": ("HKB + B", "HKB + A", "HKB + Circle"),
    "quick-fullscreen-toggle": ("HKB + X", "HKB + Y", "HKB + Square"),
    "display-fullscreen-toggle": ("HKB + X", "HKB + Y", "HKB + Square"),
    "quick-quit-component": ("HKB + Start", "HKB + Start", "HKB + Start"),
    "state-previous-state": ("HKB + D-Pad Left", "HKB + D-Pad Left", "HKB + D-Pad Left"),
    "state-next-state": ("HKB + D-Pad Right", "HKB + D-Pad Right", "HKB + D-Pad Right"),
    "speed-decrease-emulation-speed": ("HKB + D-Pad Down", "HKB + D-Pad Down", "HKB + D-Pad Down"),
    "speed-increase-emulation-speed": ("HKB + D-Pad Up", "HKB + D-Pad Up", "HKB + D-Pad Up"),
    "speed-fast-forward": ("HKB + R2", "HKB + R2", "HKB + R2"),
    "speed-rewind": ("HKB + L2", "HKB + L2", "HKB + L2")
}

# Mapping from human-readable keyboard shortcuts to uinput KEY_* format
# Only includes keys that exist in hotkey.ts, using lowercase keys
KEY_MAPPING = {
    # Letters (lowercase)
    **{chr(i): f"KEY_{chr(i).upper()}" for i in range(ord("a"), ord("z") + 1)},
    # Numbers
    **{str(i): f"KEY_{i}" for i in range(10)},
    # Controls / whitespace
    "enter": "KEY_ENTER",
    "return": "KEY_ENTER",
    "esc": "KEY_ESC",
    "escape": "KEY_ESC",
    "backspace": "KEY_BACKSPACE",
    "tab": "KEY_TAB",
    "space": "KEY_SPACE",
    " ": "KEY_SPACE",
    # Symbols
    "+": "KEY_KPPLUS",
    "-": "KEY_KPMINUS",
    "=": "KEY_EQUAL",
    "[": "KEY_LEFTBRACE",
    "]": "KEY_RIGHTBRACE",
    "\\": "KEY_BACKSLASH",
    ";": "KEY_SEMICOLON",
    "'": "KEY_APOSTROPHE",
    "`": "KEY_GRAVE",
    ",": "KEY_COMMA",
    ".": "KEY_DOT",
    "/": "KEY_SLASH",
    # Function keys
    "capslock": "KEY_CAPSLOCK",
    **{f"f{i}": f"KEY_F{i}" for i in range(1, 13)},
    # Navigation
    "sysrq": "KEY_SYSRQ",
    "scrolllock": "KEY_SCROLLLOCK",
    "pause": "KEY_PAUSE",
    "insert": "KEY_INSERT",
    "home": "KEY_HOME",
    "pageup": "KEY_PAGEUP",
    "delete": "KEY_DELETE",
    "end": "KEY_END",
    "pagedown": "KEY_PAGEDOWN",
    "right": "KEY_RIGHT",
    "left": "KEY_LEFT",
    "down": "KEY_DOWN",
    "up": "KEY_UP",
    "numlock": "KEY_NUMLOCK",
    # Keypad
    "kp/": "KEY_KPSLASH",
    "kp*": "KEY_KPASTERISK",
    "kp-": "KEY_KPMINUS",
    "kp+": "KEY_KPPLUS",
    "kpenter": "KEY_KPENTER",
    "kp.": "KEY_KPDOT",
    **{f"kp{i}": f"KEY_KP{i}" for i in range(10)},
    # Modifiers
    "ctrl": "KEY_LEFTCTRL",
    "control": "KEY_LEFTCTRL",
    "alt": "KEY_LEFTALT",
    "shift": "KEY_LEFTSHIFT",
    "meta": "KEY_LEFTMETA",
    "win": "KEY_LEFTMETA",
    # Media
    "volumeup": "KEY_VOLUMEUP",
    "volumedown": "KEY_VOLUMEDOWN",
    "mute": "KEY_MUTE",
    "playpause": "KEY_PLAYPAUSE",
    "stopcd": "KEY_STOPCD",
    "nextsong": "KEY_NEXTSONG",
    "previoussong": "KEY_PREVIOUSSONG",
}


def slugify(text: str) -> str:
    """Convert text to a slug (lowercase, hyphenated)."""
    # Convert to lowercase
    text = text.lower()
    # Replace spaces and special chars with hyphens
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    # Remove leading/trailing hyphens
    return text.strip("-")


def get_category_prefix(category: str) -> str:
    """Extract a short prefix from category name for ID generation."""
    if not category:
        return "uncategorized"

    # Use first word of category (split by spaces or slashes)
    words = re.split(r"[\s/]+", category.lower())
    return words[0] if words else "uncategorized"


def parse_keyboard_shortcut(shortcut: str) -> Optional[List[str]]:
    """
    Parse a keyboard shortcut like "Ctrl + Enter" or "Alt + W + 1"
    into a list of KEY_* format keys.
    Returns None if the shortcut is not a valid keyboard shortcut (e.g., cheat codes).
    """
    # Remove <code> tags if present
    shortcut = re.sub(r"<code>|</code>", "", shortcut).strip()

    # Skip non-keyboard shortcuts (cheat codes, etc.)
    # Cheat codes are typically 4+ uppercase letters (like IDFA, IDKFA)
    # Allow valid single keys like ESC, F1, etc. (2-3 chars are usually valid keys)
    if re.match(r"^[A-Z]{4,}$", shortcut) and "+" not in shortcut:
        return None

    # Handle "none" or empty shortcuts
    if shortcut.lower() in ["none", ""]:
        return None

    # Split by spaces - keys are at even indexes, "+" separators at odd indexes
    parts = shortcut.split()
    key_parts = [parts[i] for i in range(0, len(parts), 2)]

    keys = []
    for part in key_parts:
        # Try lowercase first, then uppercase
        part_lower = part.lower()
        if part_lower in KEY_MAPPING:
            keys.append(KEY_MAPPING[part_lower])
        elif part.upper() in KEY_MAPPING:
            keys.append(KEY_MAPPING[part.upper()])
        # Fallback: construct KEY_* format
        else:
            keys.append(f"KEY_{part.upper()}")

    return keys if keys else None


def extract_icon_filename(img_tag) -> Optional[str]:
    """Extract icon filename from an <img> tag."""
    if not img_tag:
        return None

    src = img_tag.get("src", "")
    if not src:
        return None

    # Extract filename from URL
    # e.g., "https://retrodeck.readthedocs.io/.../RD-zoom-fit-best.png" -> "RD-zoom-fit-best"
    filename = Path(urlparse(src).path).stem
    return filename if filename else None


def extract_emulators(cell) -> List[str]:
    """Extract emulator names from a table cell (may contain <ul><li> lists)."""
    if not cell:
        return []

    emulators = []

    # Check for <ul><li> structure
    ul = cell.find("ul")
    if ul:
        for li in ul.find_all("li"):
            text = li.get_text(strip=True)
            if text:
                emulators.append(text)
    else:
        # Try to get text directly
        text = cell.get_text(strip=True)
        if text:
            # Split by comma or newline
            emulators = [e.strip() for e in re.split(r"[,;\n]", text) if e.strip()]

    return emulators


def find_category_for_table(table) -> Optional[str]:
    """Find the category header (h2 or h3) that precedes a table."""
    # Look backwards through siblings
    current = table.previous_sibling
    while current:
        if hasattr(current, "name"):
            if current.name in ["h2", "h3"]:
                # Extract text, removing anchor links
                text = current.get_text(strip=True)
                # Remove "Menu" suffix if present
                text = re.sub(r"\s+Menu\s*$", "", text)
                return text
        current = current.previous_sibling

    # If not found in previous siblings, check parent's previous siblings
    parent = table.parent
    if parent:
        current = parent.previous_sibling
        while current:
            if hasattr(current, "name"):
                if current.name in ["h2", "h3"]:
                    text = current.get_text(strip=True)
                    text = re.sub(r"\s+Menu\s*$", "", text)
                    return text
            elif hasattr(current, "find"):
                # It might be a tag, try finding h2/h3 inside
                header = current.find(["h2", "h3"])
                if header:
                    text = header.get_text(strip=True)
                    text = re.sub(r"\s+Menu\s*$", "", text)
                    return text
            current = current.previous_sibling

    return None


def download_html(url: str) -> str:
    """Download HTML content from URL."""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        print(f"Error downloading HTML from {url}: {e}", file=sys.stderr)
        sys.exit(1)


def parse_html(html: str) -> List[Dict]:
    """Parse HTML and extract actions from tables."""
    soup = BeautifulSoup(html, "html.parser")
    actions = []

    # Find all tables
    tables = soup.find_all("table")

    for table in tables:
        # Find category for this table
        category = find_category_for_table(table)
        if not category:
            # Try to find category from table caption or nearby text
            caption = table.find("caption")
            if caption:
                category = caption.get_text(strip=True)
                category = re.sub(r"\s+Menu\s*$", "", category)

        # Find table headers to understand column structure
        headers = table.find_all("th")
        if not headers:
            # Skip tables without headers (might be layout tables)
            continue

        # Find all data rows
        rows = table.find_all("tr")

        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 2:  # Need at least name and keyboard command
                continue

            # Extract data from cells
            # Column 1: Radial Button name
            name_cell = cells[0]
            name = name_cell.get_text(strip=True)
            if not name:
                continue

            # Column 2: Keyboard Command
            keyboard_cell = cells[1]
            keyboard_text = keyboard_cell.get_text(strip=True)
            if not keyboard_text:
                # Try to find <code> tag
                code_tag = keyboard_cell.find("code")
                if code_tag:
                    keyboard_text = code_tag.get_text(strip=True)

            if not keyboard_text:
                continue

            # Parse keyboard shortcut
            keys = parse_keyboard_shortcut(keyboard_text)
            if not keys:
                # Skip non-keyboard shortcuts (cheat codes, etc.)
                continue

            # Column 3: System Support / Emulators
            emulators = []
            if len(cells) > 2:
                emulators = extract_emulators(cells[2])

            # Column 4: Icon
            icon_filename = None
            if len(cells) > 3:
                img_tag = cells[3].find("img")
                icon_filename = extract_icon_filename(img_tag)

            # Generate ID from category and name
            category_prefix = (
                get_category_prefix(category) if category else "uncategorized"
            )
            name_slug = slugify(name)
            action_id = f"{category_prefix}-{name_slug}"

            # Create action object
            operation = "hold" if action_id in HOTKEY_HOLD_ACTIONS else "press"
            action = {
                "id": action_id,
                "name": name,
                "category": category or "Uncategorized",
                "icon": {"type": "path", "value": icon_filename or "RD-emblem-generic"},
                "action": {"type": "hotkey", "operation": operation, "keys": keys},
                "systems": "*",
                "emulators": emulators if emulators else "*",
                "_keyboard_text": keyboard_text,
            }

            actions.append(action)

    return actions


def modify_actions(actions: List[Dict]) -> List[Dict]:
    """Modify actions to fit the needs of the user."""

    # Filter out Switch category actions - use list comprehension to avoid iteration issues
    actions = [action for action in actions if action.get("category", "").lower() != "switch"]

    # Remove Ryubing (Standalone) from emulator lists
    for action in actions:
        emulators = action.get("emulators", [])
        if isinstance(emulators, list):
            # Create new list without Ryubing (Standalone)
            action["emulators"] = [e for e in emulators if e != "Ryubing (Standalone)"]

    # Filter out "quit component" actions - use list comprehension
    actions = [action for action in actions if action.get("name", "").lower() != "quit component"]

    # Define View Manual action (first in Quick Menu)
    view_manual_action = {
        "id": "display-view-pdf",
        "name": "View Manual",
        "category": "Quick",
        "icon": {"type": "path", "value": "RD-preferences-desktop-display"},
        "action": {"type": "builtin", "operation": "view_manual"},
        "systems": "*",
        "emulators": "*",
    }

    # Define Quit action (last in Quick Menu)
    quit_action = {
        "id": "quick-quit-component",
        "name": "Quit",
        "category": "Quick",
        "icon": {"type": "path", "value": "RD-process-stop"},
        "action": {"type": "builtin", "operation": "exit"},
        "systems": "*",
        "emulators": "*",
    }

    actions.insert(0, view_manual_action)
    actions.append(quit_action)

    # Add Azahar to load and save state actions
    for action in actions:
        if action.get("id", "") in ("quick-load-state", "state-load-state", "quick-save-state", "state-save-state"):
            emus = action.get("emulators", [])
            if isinstance(emus, list) and "Azahar" not in emus:
                emus.append("Azahar")

    return actions


def apply_category_overrides(actions: List[Dict]) -> List[Dict]:
    """Apply category overrides based on ACTION_GROUPS and filter hidden actions."""
    # Build a set of hidden action IDs and a mapping for visible actions
    hidden_actions = set()
    action_to_group = {}

    for group_name, action_ids in ACTION_GROUPS.items():
        for action_id in action_ids:
            # Check if action is marked as hidden with !
            if action_id.startswith("!"):
                actual_id = action_id[1:]  # Remove the ! prefix
                hidden_actions.add(actual_id)
            else:
                action_to_group[action_id] = group_name.capitalize()

    # Filter out hidden actions and apply category overrides
    filtered_actions = []
    for action in actions:
        action_id = action.get("id", "")

        # Skip hidden actions
        if action_id in hidden_actions:
            continue

        # Apply category if in a group
        if action_id in action_to_group:
            action["category"] = action_to_group[action_id]

        filtered_actions.append(action)

    return filtered_actions

def expand_emulators(actions: List[Dict]) -> List[Dict]:
    """Replace values in the emulators field using EMULATOR_EXPANDS mapping.

    - If emulators is '*', leave unchanged.
    - If emulators is a string, expand if it matches a key; otherwise keep as-is.
    - If emulators is a list, replace any matching entries with their mapped lists,
      flatten, and de-duplicate while preserving order.
    """
    for action in actions:
        emus = action.get("emulators")
        if emus == "*":
            continue
        if isinstance(emus, str):
            if emus in EMULATOR_EXPANDS:
                action["emulators"] = list(EMULATOR_EXPANDS[emus])
            else:
                action["emulators"] = [emus]
        elif isinstance(emus, list):
            out: List[str] = []
            for e in emus:
                if e in EMULATOR_EXPANDS:
                    out.extend(EMULATOR_EXPANDS[e])
                else:
                    out.append(e)
            seen = set()
            action["emulators"] = [v for v in out if not (v in seen or seen.add(v))]
    return actions


def apply_system_expands_from_emulators(actions: List[Dict]) -> List[Dict]:
    """If systems is '*', replace it using EMULATOR_SYSTEM_EXPANDS by emulator.

    - Only acts when systems is exactly '*'.
    - Collects expansions for all matching emulators (string or list),
      flattens, deduplicates, and replaces systems if the result is non-empty.
    """
    for action in actions:
        if action.get("systems") != "*":
            continue
        emus = action.get("emulators")
        if not emus or emus == "*":
            continue
        emu_list: List[str]
        if isinstance(emus, str):
            emu_list = [emus]
        elif isinstance(emus, list):
            emu_list = emus
        else:
            continue
        collected: List[str] = []
        for e in emu_list:
            if e in EMULATOR_SYSTEM_EXPANDS and EMULATOR_SYSTEM_EXPANDS[e]:
                collected.extend(EMULATOR_SYSTEM_EXPANDS[e])
        if collected:
            seen = set()
            action["systems"] = [v for v in collected if not (v in seen or seen.add(v))]
    return actions


def apply_hotkey_labels(actions: List[Dict]) -> List[Dict]:
    """Apply hotkeyLabels to actions.

    - Controller labels (Steam Deck, Xbox, Sony, Nintendo) are added from
      HOTKEY_LABELS for actions that have an entry.
    - The Keyboard label is added automatically for every action that has a
      scraped keyboard shortcut (stored in ``_keyboard_text`` during parsing).
    - The temporary ``_keyboard_text`` field is removed after processing.
    """
    for action in actions:
        action_id = action.get("id", "")
        labels: List[Dict] = []

        # Add controller labels if specified
        if action_id in HOTKEY_LABELS:
            steam_deck_xbox, nintendo, sony = HOTKEY_LABELS[action_id]
            labels.extend([
                {"name": "Steam Deck", "keys": steam_deck_xbox.split(" + ")},
                {"name": "Xbox", "keys": steam_deck_xbox.split(" + ")},
                {"name": "PlayStation", "keys": sony.split(" + ")},
                {"name": "Nintendo", "keys": nintendo.split(" + ")},
            ])

        # Auto-add Keyboard label from the scraped keyboard shortcut
        keyboard_text = action.pop("_keyboard_text", None)
        if keyboard_text:
            labels.append(
                {"name": "Keyboard", "keys": [k.upper() for k in keyboard_text.split(" + ")]}
            )

        action["hotkeyLabels"] = labels
    return actions


def sort_actions(actions: List[Dict]) -> List[Dict]:
    """Sort actions according to ACTION_GROUPS ordering and CATEGORY_ORDER."""
    # Build a priority map from ACTION_GROUPS, handling ! prefix
    priority_map = {}
    group_priority = 0

    for group_name, action_ids in ACTION_GROUPS.items():
        for action_priority, action_id in enumerate(action_ids):
            # Remove ! prefix if present to get actual action ID
            actual_id = action_id[1:] if action_id.startswith("!") else action_id
            # Composite key: (group_priority, position_in_group)
            priority_map[actual_id] = (group_priority, action_priority)
        group_priority += 1

    # Build category priority map
    category_priority = {}
    for idx, category in enumerate(CATEGORY_ORDER):
        category_priority[category] = idx

    def get_sort_key(action: Dict) -> tuple:
        action_id = action.get("id", "")
        category = action.get("category", "Uncategorized")

        # Get category order priority (default to high value if not in list)
        cat_priority = category_priority.get(category, 999)

        # Return composite key: (category_priority, group_priority, position_in_group)
        if action_id in priority_map:
            group_prio, action_prio = priority_map[action_id]
            return (cat_priority, group_prio, action_prio)

        # Actions not in any group go to the end
        return (cat_priority, 999, 0)

    return sorted(actions, key=get_sort_key)


def main():
    """Main function to generate actions from documentation."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate actions.json from RetroDECK documentation"
    )
    parser.add_argument(
        "--url",
        type=str,
        default="https://retrodeck.readthedocs.io/en/latest/wiki_rd_controls/radial-steamdeck-full/#is-there-a-quick-way-to-go-back-to-the-top-of-the-radial-menu-system",
        help="URL to download HTML from",
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Path to output JSON file (default: actions.json in presets directory)",
    )

    args = parser.parse_args()

    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    presets_dir = project_root / "defaults" / "presets"

    # Determine output file
    if args.output:
        output_path = Path(args.output)
        if not output_path.is_absolute():
            output_path = presets_dir / output_path
    else:
        output_path = presets_dir / "actions.json"

    print(f"Downloading HTML from: {args.url}")
    html = download_html(args.url)

    print("Parsing HTML and extracting actions...")
    actions = parse_html(html)

    actions = modify_actions(actions)

    # Apply category overrides
    actions = apply_category_overrides(actions)

    # If systems is '*', expand it from emulator-specific mappings
    actions = apply_system_expands_from_emulators(actions)

    # Expand emulators using EMULATOR_EXPANDS mapping
    actions = expand_emulators(actions)

    # Apply hotkey labels for controller-specific bindings
    actions = apply_hotkey_labels(actions)

    # Sort actions by defined ordering
    actions = sort_actions(actions)

    print(f"Extracted {len(actions)} actions")

    # Write JSON file
    print(f"Writing actions to: {output_path}")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(actions, f, indent=2, ensure_ascii=False)

    print(f"Successfully generated {len(actions)} actions to {output_path}")


if __name__ == "__main__":
    main()
