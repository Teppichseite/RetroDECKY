import { SteamClient } from "@decky/ui/dist/globals/steam-client";
import { debounce } from "lodash";
import { getSettingBe } from "./backend";
import { EUIMode, sleep } from "@decky/ui";

declare var SteamClient: SteamClient;

interface AppOverview {
  m_gameid: string;
  display_name: string;
}

declare var appStore: {
  allApps: AppOverview[];
};

const RETRODECK_APP_NAME = 'RetroDECK';

async function waitForAppStore(timeoutMs = 10000, intervalMs = 500): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (appStore?.allApps?.length > 0) {
      return true;
    }
    await sleep(intervalMs);
  }
  return false;
}

export async function findRetroDECKApp(): Promise<AppOverview | undefined> {
  const ready = await waitForAppStore();
  if (!ready) {
    console.warn("RetroDECKY: appStore not ready after timeout");
    return undefined;
  }
  return appStore.allApps.find(
    (app) => app.display_name.trim() === RETRODECK_APP_NAME.trim()
  );
}

export async function startRetroDECK() {
  const app = await findRetroDECKApp();
  if (!app) {
    console.warn("RetroDECKY: Could not find RetroDECK app in Steam library");
    return;
  }
  SteamClient.Apps.RunGame(app.m_gameid, "", -1, 100);
}

const startRetroDECKDebounced = debounce(startRetroDECK, 1500);

export function startRetroDECKOnStartup() {
  const uiModeSubscription = SteamClient.UI.RegisterForUIModeChanged((mode) => {
    if (mode !== EUIMode.GamePad) return;

    if(sessionStorage.getItem("RetroDECKY_startup_finished")) {
      return;
    }

    sessionStorage.setItem("RetroDECKY_startup_finished", "true");

    getSettingBe("autoStartEnabled").then((enabled) => {
      if (!enabled){
        return;
      };
      
      startRetroDECKDebounced();
    });
  });

  return uiModeSubscription;
}
