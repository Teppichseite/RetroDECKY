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
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    # Remove leading/trailing hyphens
    return text.strip('-')


def get_category_prefix(category: str) -> str:
    """Extract a short prefix from category name for ID generation."""
    if not category:
        return "uncategorized"
    
    # Use first word of category (split by spaces or slashes)
    words = re.split(r'[\s/]+', category.lower())
    return words[0] if words else "uncategorized"


def parse_keyboard_shortcut(shortcut: str) -> Optional[List[str]]:
    """
    Parse a keyboard shortcut like "Ctrl + Enter" or "Alt + W + 1"
    into a list of KEY_* format keys.
    Returns None if the shortcut is not a valid keyboard shortcut (e.g., cheat codes).
    """
    # Remove <code> tags if present
    shortcut = re.sub(r'<code>|</code>', '', shortcut).strip()
    
    # Skip non-keyboard shortcuts (cheat codes, etc.)
    # Cheat codes are typically 4+ uppercase letters (like IDFA, IDKFA)
    # Allow valid single keys like ESC, F1, etc. (2-3 chars are usually valid keys)
    if re.match(r'^[A-Z]{4,}$', shortcut) and '+' not in shortcut:
        return None
    
    # Handle "none" or empty shortcuts
    if shortcut.lower() in ['none', '']:
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
    
    src = img_tag.get('src', '')
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
    ul = cell.find('ul')
    if ul:
        for li in ul.find_all('li'):
            text = li.get_text(strip=True)
            if text:
                emulators.append(text)
    else:
        # Try to get text directly
        text = cell.get_text(strip=True)
        if text:
            # Split by comma or newline
            emulators = [e.strip() for e in re.split(r'[,;\n]', text) if e.strip()]
    
    return emulators


def find_category_for_table(table) -> Optional[str]:
    """Find the category header (h2 or h3) that precedes a table."""
    # Look backwards through siblings
    current = table.previous_sibling
    while current:
        if hasattr(current, 'name'):
            if current.name in ['h2', 'h3']:
                # Extract text, removing anchor links
                text = current.get_text(strip=True)
                # Remove "Menu" suffix if present
                text = re.sub(r'\s+Menu\s*$', '', text)
                return text
        current = current.previous_sibling
    
    # If not found in previous siblings, check parent's previous siblings
    parent = table.parent
    if parent:
        current = parent.previous_sibling
        while current:
            if hasattr(current, 'name'):
                if current.name in ['h2', 'h3']:
                    text = current.get_text(strip=True)
                    text = re.sub(r'\s+Menu\s*$', '', text)
                    return text
            elif hasattr(current, 'find'):
                # It might be a tag, try finding h2/h3 inside
                header = current.find(['h2', 'h3'])
                if header:
                    text = header.get_text(strip=True)
                    text = re.sub(r'\s+Menu\s*$', '', text)
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
    soup = BeautifulSoup(html, 'html.parser')
    actions = []
    
    # Find all tables
    tables = soup.find_all('table')
    
    for table in tables:
        # Find category for this table
        category = find_category_for_table(table)
        if not category:
            # Try to find category from table caption or nearby text
            caption = table.find('caption')
            if caption:
                category = caption.get_text(strip=True)
                category = re.sub(r'\s+Menu\s*$', '', category)
        
        # Find table headers to understand column structure
        headers = table.find_all('th')
        if not headers:
            # Skip tables without headers (might be layout tables)
            continue
        
        # Find all data rows
        rows = table.find_all('tr')
        
        for row in rows:
            cells = row.find_all('td')
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
                code_tag = keyboard_cell.find('code')
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
                img_tag = cells[3].find('img')
                icon_filename = extract_icon_filename(img_tag)
            
            # Generate ID from category and name
            category_prefix = get_category_prefix(category) if category else "uncategorized"
            name_slug = slugify(name)
            action_id = f"{category_prefix}-{name_slug}"
            
            # Create action object
            action = {
                "id": action_id,
                "name": name,
                "category": category or "Uncategorized",
                "icon": {
                    "type": "path",
                    "value": icon_filename or "RD-emblem-generic"
                },
                "action": {
                    "type": "hotkey",
                    "operation": "press",
                    "keys": keys
                },
                "systems": "*",
                "emulators": emulators if emulators else "*"
            }
            
            actions.append(action)
    
    return actions

def modify_actions(actions: List[Dict]) -> List[Dict]:
    """Modify actions to fit the needs of the user."""
    # For category "Switch", always use ["Ryubing (Standalone)"] as emulators
    for action in actions:
        category = action.get("category", "")
        if category == "Switch":
            action["emulators"] = ["Ryubing (Standalone)"]

    for action in actions:
        if action.get("name", "").lower() == "quit component":
            actions.remove(action)
    
    # Define View Manual action (first in Quick Menu)
    view_manual_action = {
        "id": "quick-view-pdf",
        "name": "View Manual",
        "category": "Quick",
        "icon": {
            "type": "path",
            "value": "RD-preferences-desktop-display"
        },
        "action": {
            "type": "builtin",
            "operation": "view_manual"
        },
        "systems": "*",
        "emulators": "*"
    }
    
    # Define Quit action (last in Quick Menu)
    quit_action = {
        "id": "quick-quit-component",
        "name": "Quit",
        "category": "Quick",
        "icon": {
            "type": "path",
            "value": "RD-process-stop"
        },
        "action": {
            "type": "builtin",
            "operation": "exit"
        },
        "systems": "*",
        "emulators": "*"
    }
    
    actions.insert(0, view_manual_action)
    actions.append(quit_action)
    
    return actions



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
        help="URL to download HTML from"
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Path to output JSON file (default: actions.json in presets directory)"
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
    
    print(f"Extracted {len(actions)} actions")
    
    # Write JSON file
    print(f"Writing actions to: {output_path}")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(actions, f, indent=2, ensure_ascii=False)
    
    print(f"Successfully generated {len(actions)} actions to {output_path}")


if __name__ == "__main__":
    main()

