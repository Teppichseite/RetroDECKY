import { SteamClient } from "@decky/ui/dist/globals/steam-client";
import { debounce } from "lodash";

declare var SteamClient: SteamClient;

interface AppOverview {
  m_gameid: string;
  display_name: string;
}

declare var appStore: {
  allApps: AppOverview[];
};

const RETRODECK_APP_NAME = 'RetroDECK';

export function findRetroDeckApp(): AppOverview | undefined {
  return appStore.allApps.find(
    (app) => app.display_name.toLowerCase() === RETRODECK_APP_NAME.toLowerCase()
  );
}

export function startRetrodeck() {
  const app = findRetroDeckApp();
  if (!app) {
    console.warn("RetroDecky: Could not find RetroDeck app in Steam library");
    return;
  }
  SteamClient.Apps.RunGame(app.m_gameid, "", -1, 100);
}

export const startRetroDeckOnStartup = debounce(startRetrodeck, 200);

