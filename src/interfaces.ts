export interface GameEvent {
  type: "game_start" | "game_end";
  path: string;
  name: string;
  system_name: string;
  system_full_name: string;
  image_path: string | null;
  manual_path: string | null;
  emulator_name: string[];
  desc: string | null;
  rating: string | null;
  releasedate: string | null;
  developer: string | null;
  publisher: string | null;
  genre: string | null;
  players: string | null;
}

export interface HotkeyLabel {
  name: "string";
  keys: string[];
}

export interface Action {
  id: string;
  name: string;
  category?: string;
  disabled?: boolean;
  icon: {
    type: "path";
    value: string;
  };
  action:
    | {
        type: "hotkey";
        operation: "hold" | "press";
        keys: string[];
      }
    | {
        type: "builtin";
        operation: "view_manual" | "view_game_info" | "exit";
      };
  systems: "*" | string[];
  emulators: "*" | (string | string[])[];
  hotkeyLabels: HotkeyLabel[];
}

export interface PersistedPdfViewState {
  pageNumber: number;
  zoom: number;
  position: {
    x: number;
    y: number;
  };
}

export interface PdfViewState extends PersistedPdfViewState {
  totalPages: number;
}

export interface TextViewState {
  fontSize: number;
  scrollTop: number;
}

export interface SetupState {
  isRetrodeckFlatpakInstalled: boolean;
  areEsDeEventScriptsCreated: boolean;
}

export type SettingsKey = string;
