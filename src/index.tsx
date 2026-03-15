import {
  staticClasses
} from "@decky/ui";
import {
  definePlugin,
} from "@decky/api"
import { FaGamepad } from "react-icons/fa";
import { MenuContextProvider } from "./context";
import { Menu } from "./components/menu";
import { startRetroDECKOnStartup } from "./autostart";

function Content() {
  return <MenuContextProvider>
    <Menu />
  </MenuContextProvider>;
}

export default definePlugin(() => {
  console.log("RetroDECKY plugin initializing");

  const unregisterStartupSubscription = startRetroDECKOnStartup();

  return {
    name: "RetroDECKY",
    titleView: <div className={staticClasses.Title}>RetroDECKY</div>,
    content: <Content />,
    icon: <FaGamepad />,
    onDismount() {
      unregisterStartupSubscription();
      console.log("RetroDECKY plugin unloaded");
    }
  };
});
