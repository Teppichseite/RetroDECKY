#!/usr/bin/env python3
"""
Script to generate a summary of actions.json.

Creates a summary file listing:
- All emulators used for hotkeys
- All categories with their actions and hotkeys

Note: This file was mostly AI generated.
"""

import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set, Tuple


def format_keys(keys: List[str]) -> str:
    """Format a list of keys into a readable string."""
    return " + ".join(keys)


def format_action(action: Dict) -> str:
    """Format an action object into a readable string."""
    action_obj = action.get("action", {})
    action_type = action_obj.get("type", "")
    operation = action_obj.get("operation", "")
    
    if action_type == "builtin":
        return f"[{operation}]"
    elif action_type == "hotkey":
        keys = action_obj.get("keys", [])
        op_str = f" ({operation})" if operation else ""
        return f"{format_keys(keys)}{op_str}"
    return ""


def load_actions(file_path: Path) -> List[Dict]:
    """Load actions from JSON file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {file_path}: {e}", file=sys.stderr)
        sys.exit(1)


def collect_emulators(actions: List[Dict]) -> Set[str]:
    """Collect all unique emulators from actions."""
    emulators = set()
    for action in actions:
        emulators_list = action.get("emulators", [])
        if isinstance(emulators_list, list):
            emulators.update(emulators_list)
        elif emulators_list == "*":
            emulators.add("*")
    return emulators


def group_by_category(actions: List[Dict]) -> Tuple[Dict[str, List[Dict]], List[str]]:
    """Group actions by category and preserve order from JSON."""
    categories = defaultdict(list)
    category_order = []
    seen_categories = set()
    
    for action in actions:
        category = action.get("category", "Uncategorized")
        categories[category].append(action)
        # Track category order (first occurrence)
        if category not in seen_categories:
            category_order.append(category)
            seen_categories.add(category)
    
    return dict(categories), category_order


def generate_summary(actions: List[Dict], output_path: Path):
    """Generate summary markdown file."""
    emulators = collect_emulators(actions)
    categories, category_order = group_by_category(actions)
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("# Actions Summary\n\n")
        f.write("This file provides an overview of all actions defined in actions.json.\n\n")
        
        # Section 1: Emulators (sorted)
        f.write("## Emulators Used for Hotkeys\n\n")
        sorted_emulators = sorted(emulators)
        for emulator in sorted_emulators:
            f.write(f"- {emulator}\n")
        f.write(f"\n**Total: {len(emulators)} emulator(s)**\n\n")
        
        # Section 2: Categories and Actions (preserve order from JSON)
        f.write("## Categories and Actions\n\n")
        
        for category in category_order:
            category_actions = categories[category]
            f.write(f"### {category}\n\n")
            f.write(f"*{len(category_actions)} action(s)*\n\n")
            
            # Preserve action order from JSON (no sorting)
            for action in category_actions:
                name = action.get("name", "Unknown")
                action_id = action.get("id", "")
                action_str = format_action(action)
                emulators_list = action.get("emulators", [])
                action_type = action.get("action", {}).get("type", "")
                
                # Format emulators
                if isinstance(emulators_list, list):
                    emulators_str = ", ".join(emulators_list) if emulators_list else "*"
                else:
                    emulators_str = str(emulators_list)
                
                f.write(f"- **{name}** (`{action_id}`)\n")
                # Use appropriate label based on action type
                if action_type == "builtin":
                    f.write(f"  - Action: `{action_str}`\n")
                else:
                    f.write(f"  - Hotkey: `{action_str}`\n")
                f.write(f"  - Emulators: {emulators_str}\n")
                f.write("\n")
            
            f.write("\n")
        
        # Section 3: Statistics
        f.write("## Statistics\n\n")
        total_actions = len(actions)
        hotkey_actions = sum(1 for a in actions if a.get("action", {}).get("type") == "hotkey")
        builtin_actions = sum(1 for a in actions if a.get("action", {}).get("type") == "builtin")
        
        f.write(f"- **Total Actions**: {total_actions}\n")
        f.write(f"- **Hotkey Actions**: {hotkey_actions}\n")
        f.write(f"- **Builtin Actions**: {builtin_actions}\n")
        f.write(f"- **Categories**: {len(categories)}\n")
        f.write(f"- **Emulators**: {len(emulators)}\n")


def main():
    """Main function to generate summary."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate summary of actions.json")
    parser.add_argument(
        "--input",
        type=str,
        help="Path to actions JSON file (default: actions.json)"
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Path to output summary file (default: actions_summary.md)"
    )
    
    args = parser.parse_args()
    
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    presets_dir = project_root / "defaults" / "presets"
    
    # Determine input file
    if args.input:
        input_file = Path(args.input)
        if not input_file.is_absolute():
            input_file = presets_dir / input_file
    else:
        # Use actions.json as default
        input_file = presets_dir / "actions.json"
        if not input_file.exists():
            print(f"Error: {input_file} not found", file=sys.stderr)
            sys.exit(1)
    
    # Determine output file
    if args.output:
        output_path = Path(args.output)
        if not output_path.is_absolute():
            output_path = presets_dir / output_path
    else:
        output_path = presets_dir / "actions_summary.md"
    
    print(f"Loading actions from: {input_file}")
    
    actions = load_actions(input_file)
    print(f"Loaded {len(actions)} actions")
    
    # Generate summary
    print(f"Generating summary to: {output_path}")
    generate_summary(actions, output_path)
    
    print(f"Successfully generated summary to {output_path}")


if __name__ == "__main__":
    main()

