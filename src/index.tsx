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
import { startRetroDECKOnStartup } from "./autostart";

function Content() {
  return <MenuContextProvider>
    <Menu />
  </MenuContextProvider>;
}

export default definePlugin(() => {
  console.log("RetroDECKY plugin initializing");

  const startupSubscription = startRetroDECKOnStartup();

  routerHook.addRoute("/retrodeck-menu/pdf-viewer", () => {
    return <MenuContextProvider>
      <PdfViewer />
    </MenuContextProvider>;
  });

  return {
    name: "RetroDECKY",
    titleView: <div className={staticClasses.Title}>RetroDECKY</div>,
    content: <Content />,
    icon: <FaGamepad />,
    onDismount() {
      startupSubscription.unregister();
      routerHook.removeRoute("/retrodeck-menu/pdf-viewer");
      console.log("RetroDECKY plugin unloaded");
    }
  };
});
