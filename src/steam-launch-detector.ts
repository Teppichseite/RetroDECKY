import { SteamClient } from "@decky/ui/dist/globals/steam-client";
import {
    AppDetails,
    ELaunchSource,
} from "@decky/ui/dist/globals/steam-client/App";
import { getSettingBe, sendRawGameEventBe } from "./backend";

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

/** Matches: run net.retrodeck.retrodeck -s <system> <path> */
const RETRODECK_LAUNCH_OPTIONS_RE =
    /^run\s+net\.retrodeck\.retrodeck\s+-s\s+\S+\s+(?:"[^"]+"|'[^']+'|\S+)/;

function parseRetrodeckLaunchOptions(launchOptions: string): {
    romPath: string;
    systemName: string;
} | null {
    if (!RETRODECK_LAUNCH_OPTIONS_RE.test(launchOptions)) {
        return null;
    }

    const tokens = tokenizeLaunchCommand(launchOptions);

    if (
        tokens.length < 5 ||
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

    if (!romPath || !systemName) {
        return null;
    }

    return { romPath, systemName };
}

function getRawGameStartEvent(gameId: string): { appId: number; rawEvent: string } | null {
    const foundApp = appStore?.allApps?.find(
        (app) => app.m_gameid === gameId
    );

    if (!foundApp) {
        return null;
    }

    const appDetails = appDetailsStore?.GetAppDetails?.(foundApp.appid);
    const launchOptions = appDetails?.strShortcutLaunchOptions.trim();

    if (!launchOptions) {
        return null;
    }

    const parsed = parseRetrodeckLaunchOptions(launchOptions);
    if (!parsed) {
        return null;
    }

    const { romPath, systemName } = parsed;

    return {
        appId: foundApp.appid,
        rawEvent: `game_start;${romPath};${appDetails?.strDisplayName};${systemName};empty`,
    };
}

export function startSteamLaunchDetector(): () => void {
    const trackedApps = new Map<number, { gameId: string }>();

    const startSubscription = SteamClient.Apps.RegisterForGameActionStart(
        async (gameActionId, gameId, action, launchSource) => {
            if (action !== "LaunchApp") {
                return;
            }

            const disabled = await getSettingBe("steamLaunchDetectionDisabled");
            if (disabled) {
                return;
            }

            const gameStart = getRawGameStartEvent(gameId);

            if (!gameStart) {
                return;
            }

            sendRawGameEventBe(gameStart.rawEvent);

            trackedApps.set(gameStart.appId, { gameId });
        }
    );

    const lifetimeSubscription =
        SteamClient.GameSessions.RegisterForAppLifetimeNotifications(
            (notification) => {
                if (notification.bRunning) {
                    return;
                }

                const trackedLaunch = trackedApps.get(notification.unAppID);
                if (!trackedLaunch) {
                    return;
                }

                sendRawGameEventBe("game_end;;;");

                trackedApps.delete(notification.unAppID);
            }
        );

    return () => {
        startSubscription.unregister();
        lifetimeSubscription.unregister();
        trackedApps.clear();
    };
}
