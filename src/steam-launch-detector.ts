import { SteamClient } from "@decky/ui/dist/globals/steam-client";
import {
    AppDetails,
    ELaunchSource,
} from "@decky/ui/dist/globals/steam-client/App";
import { sendRawGameEventBe } from "./backend";

declare var SteamClient: SteamClient;

interface AppOverview {
    appid: number;
    m_gameid?: string;
}

declare var appStore: {
    allApps: AppOverview[];
    GetAppOverviewByAppID: (appId: number) => AppOverview | null;
};

declare var appDetailsStore: {
    GetAppDetails: (appId: number) => AppDetails | null;
};

export interface SteamDirectLaunchEvent {
    gameId: string;
    appId: number;
    displayName: string;
    launchArguments: string;
    gamePath: string | null;
    launchSource: ELaunchSource;
}


function tokenizeLaunchCommand(command: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let quote: '"' | "'" | null = null;

    for (let i = 0; i < command.length; i++) {
        const char = command[i];

        if (quote) {
            if (char === quote) {
                quote = null;
            } else {
                current += char;
            }
            continue;
        }

        if (char === '"' || char === "'") {
            quote = char;
            continue;
        }

        if (/\s/.test(char)) {
            if (current.length > 0) {
                tokens.push(current);
                current = "";
            }
            continue;
        }

        current += char;
    }

    if (current.length > 0) {
        tokens.push(current);
    }

    return tokens;
}

function parseRetrodeckLaunchOptions(launchOptions: string): {
    romPath: string;
    systemName: string | null;
} | null {
    const tokens = tokenizeLaunchCommand(launchOptions);

    if (
        tokens.length < 3 ||
        tokens[0] !== "run" ||
        tokens[1] !== "net.retrodeck.retrodeck"
    ) {
        return null;
    }

    let systemName: string | null = null;
    let romPath: string | null = null;

    for (let i = 2; i < tokens.length; i++) {
        const token = tokens[i];

        if (token === "-s" || token === "-e") {
            // -s <system> / -e <emulator> — consume the next value
            i += 1;
            if (token === "-s" && i < tokens.length) {
                systemName = tokens[i];
            }
            continue;
        }

        if (token === "-m" || token.startsWith("-")) {
            // -m (manual) or other flags without a positional game path
            continue;
        }

        // First non-option token is the game path
        romPath = token;
        break;
    }

    if (!romPath) {
        return null;
    }

    // Fall back to the roms/<system>/... folder when -s was omitted
    if (!systemName) {
        const romsMatch = romPath.match(/(?:^|\/)roms\/([^/]+)\//);
        if (romsMatch) {
            systemName = romsMatch[1];
        }
    }

    if (!systemName) {
        return null;
    }

    return { romPath, systemName };
}

function getRawGameEvent(gameId: string): string | null {
    const foundApp = appStore?.allApps?.find(
        (app) => app.m_gameid === gameId
    );

    if (!foundApp) {
        return null;
    }

    const appDetails = appDetailsStore?.GetAppDetails?.(foundApp.appid);
    const launchOptions = appDetails?.strShortcutLaunchOptions.trim();

    if (!launchOptions?.startsWith("run net.retrodeck.retrodeck")) {
        return null;
    }

    const parsed = parseRetrodeckLaunchOptions(launchOptions);
    if (!parsed) {
        return null;
    }

    const { romPath, systemName } = parsed;

    return `game_start;${romPath};${appDetails?.strDisplayName};${systemName};empty`;
}

export function startSteamLaunchDetector(): () => void {
    const trackedGameActions = new Map<number, { gameId: string }>();

    const startSubscription = SteamClient.Apps.RegisterForGameActionStart(
        (gameActionId, gameId, action, launchSource) => {
            if (action !== "LaunchApp") {
                return;
            }

            console.log("Game action started", gameActionId, gameId, action, launchSource);

            const rawGameEvent = getRawGameEvent(gameId);

            if(!rawGameEvent) {
                return;
            }

            console.log("Raw game event", rawGameEvent);

            sendRawGameEventBe(rawGameEvent);

            trackedGameActions.set(gameActionId, { gameId });
        }
    );

    const endSubscription = SteamClient.Apps.RegisterForGameActionEnd(
        (gameActionId) => {
            const trackedLaunch = trackedGameActions.get(gameActionId);
            if (!trackedLaunch) {
                return;
            }

            console.log("Game action ended", gameActionId);

            //sendRawGameEventBe("game_end;;;");

            trackedGameActions.delete(gameActionId);
        }
    );

    return () => {
        startSubscription.unregister();
        endSubscription.unregister();
        trackedGameActions.clear();
    };
}
