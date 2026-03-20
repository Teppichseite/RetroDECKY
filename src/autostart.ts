import { SteamClient } from "@decky/ui/dist/globals/steam-client";
import { getSettingBe } from "./backend";
import { EUIMode, findModuleChild, findSP, sleep } from "@decky/ui";

declare var SteamClient: SteamClient;

interface AppOverview {
  m_gameid: string;
  display_name: string;
}

declare var appStore: {
  allApps: AppOverview[];
};

const RETRODECK_APP_NAME = 'RetroDECK';

async function waitForAppStore(timeoutMs = 10000, intervalMs = 250): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (appStore?.allApps?.length > 0) {
      return true;
    }
    await sleep(intervalMs);
  }
  return false;
}

async function waitForSP(timeoutMs = 10000, intervalMs = 250): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const sp = findSP();
    if (sp?.document?.getElementById("GamepadUI_Full_Root")) {
      return true;
    }
    await sleep(intervalMs);
  }
  return false;
}

export async function findRetroDECKApp(): Promise<AppOverview | undefined> {
  const [appStoreReady, spReady] = await Promise.all([
    waitForAppStore(),
    waitForSP()
  ]);

  if (!appStoreReady || !spReady) {
    console.warn("RetroDECKY: Could not find RetroDECK app in Steam library");
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

  await sleep(1000);
  SteamClient.Apps.RunGame(app.m_gameid, "", -1, 100);
}

let wasStarted = false;

const wasRetroDECKStarted = () => {
  return sessionStorage.getItem("RetroDECKY_startup_finished") === "true" || wasStarted;
}

const setRetroDECKStarted = () => {
  wasStarted = true;
  sessionStorage.setItem("RetroDECKY_startup_finished", "true");
}

export function startRetroDECKOnStartup() {
  try {
    const historyExport = findModuleChild((m) => {
      if (typeof m !== "object") return undefined;
      for (let prop in m) {
        if (m[prop]?.m_history) return m[prop].m_history
      }
    })

    if (!historyExport) {
      console.warn("RetroDECKY: Could not find history module");
      return () => { };
    }

    const unlisten = historyExport.listen(async (info: any) => {

      if (info.pathname !== "/library/home") {
        return;
      }

      if (wasRetroDECKStarted()) {
        return;
      }

      setRetroDECKStarted();

      getSettingBe("autoStartEnabled").then(async (enabled) => {
        if (!enabled) {
          return;
        }

        if ((await SteamClient.UI.GetUIMode()) !== EUIMode.GamePad) {
          return;
        }

        await startRetroDECK();
      });

    });

    return unlisten;
  } catch (error) {
    console.error("RetroDECKY: Error starting RetroDECK on startup", error);
    return () => { };
  }
}
