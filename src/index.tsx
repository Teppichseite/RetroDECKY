import { staticClasses } from "@decky/ui";
import { definePlugin } from "@decky/api";
import { FaGamepad } from "react-icons/fa";
import { MenuContextProvider } from "./context";
import { Menu } from "./components/menu";
import { startRetroDECKOnStartup } from "./autostart";
import { startSteamLaunchDetector } from "./steam-launch-detector";

function Content() {
  return (
    <MenuContextProvider>
      <Menu />
    </MenuContextProvider>
  );
}

export default definePlugin(() => {
  const unregisterStartupSubscription = startRetroDECKOnStartup();

  const unregisterSteamLaunchDetector = startSteamLaunchDetector();

  return {
    name: "RetroDECKY",
    titleView: <div className={staticClasses.Title}>RetroDECKY</div>,
    content: <Content />,
    icon: <FaGamepad />,
    onDismount() {
      unregisterStartupSubscription();
      unregisterSteamLaunchDetector();
      console.log("RetroDECKY plugin unloaded");
    },
  };
});
