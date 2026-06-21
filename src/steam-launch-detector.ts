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

function getRawGameEvent(gameId: string): string | null {
    const foundApp = appStore?.allApps?.find(
        (app) => app.m_gameid === gameId
    );

    if (!foundApp) {
        return null;
    }

    const appDetails = appDetailsStore?.GetAppDetails?.(foundApp.appid);

    if(!appDetails?.strShortcutLaunchOptions.startsWith("run net.retrodeck.retrodeck")) {
        return null;
    }

    const launchCommandParts = `${appDetails?.strShortcutLaunchOptions}`.split(" ").reverse();

    const romPath = launchCommandParts[0];
    const systemName = launchCommandParts[1];

    return `game_start;${romPath};Test Game;${systemName};Test System`;
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
