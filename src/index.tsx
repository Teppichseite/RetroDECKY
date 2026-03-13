import {
  staticClasses
} from "@decky/ui";
import {
  definePlugin,
  routerHook,
} from "@decky/api"
import { FaGamepad } from "react-icons/fa";
import { MenuContextProvider } from "./context";
import { PdfViewer } from "./components/pdf-viewer";
import { Menu } from "./components/menu";
import { getSettingBe } from "./backend";
import { SteamClient } from "@decky/ui/dist/globals/steam-client";
import { EUIMode } from "@decky/ui/dist/globals/steam-client/shared";
import { startRetroDeckOnStartup } from "./app-utils";

declare var SteamClient: SteamClient;

function Content() {
  return <MenuContextProvider>
    <Menu />
  </MenuContextProvider>;
}

export default definePlugin(() => {
  console.log("RetroDecky plugin initializing");

  const uiModeSubscription = SteamClient.UI.RegisterForUIModeChanged((mode) => {
    if (mode !== EUIMode.GamePad) return;

    getSettingBe("autoStartEnabled").then((enabled) => {
      if (!enabled) return;
      startRetroDeckOnStartup();
    });
  });

  routerHook.addRoute("/retrodeck-menu/pdf-viewer", () => {
    return <MenuContextProvider>
      <PdfViewer />
    </MenuContextProvider>;
  });

  return {
    name: "RetroDecky",
    titleView: <div className={staticClasses.Title}>RetroDecky</div>,
    content: <Content />,
    icon: <FaGamepad />,
    onDismount() {
      console.log("Unloading");
      uiModeSubscription?.unregister();
      routerHook.removeRoute("/retrodeck-menu/pdf-viewer")
    }
  };
});
