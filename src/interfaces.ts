export interface GameEvent {
    type: "game_start" | "game_end";
    path: string;
    name: string;
    system_name: string;
    system_full_name: string;
    image_path: string | null;
    manual_path: string | null;
    emulator_name: string[];
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
    action: {
        type: "hotkey";
        operation: "hold" | "press";
        keys: string[];
    } | {
        type: "builtin";
        operation: "view_manual" | "exit";
    };
    systems: "*" | string[];
    emulators: "*" | (string | string[])[] ;
}

export interface PdfViewState {
    pageNumber: number;
    zoom: number;
    totalPages: number;
    position: {
        x: number;
        y: number;
    }
}

export interface SetupState {
    isRetrodeckFlatpakInstalled: boolean;
    areEsDeEventScriptsCreated: boolean;
}