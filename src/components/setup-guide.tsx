import { useState } from "react";
import { ButtonItemIconContent } from "./shared";
import { ButtonItem } from "@decky/ui";
import { getIconPath } from "../utils";
import { useMenuContext } from "../context";
import { t, tx } from "../i18n";

const isDoneIcon = (isDone: boolean | undefined) => (isDone ? "✅" : "❌");

const githubUrl = "https://github.com/Teppichseite/RetroDECKY";

export const SetupGuide = () => {
  const [showGuide, setShowGuide] = useState(false);

  const { setupState } = useMenuContext();

  const isSetup =
    setupState?.isRetrodeckFlatpakInstalled && setupState?.areEsDeEventScriptsCreated;

  return (
    <div>
      <ButtonItem
        layout="below"
        onClick={() => {
          setShowGuide(!showGuide);
        }}
      >
        <ButtonItemIconContent
          icon={
            <img
              src={getIconPath(`RD-zoom-${showGuide ? "out" : "in"}`)}
              width={24}
              height={24}
            />
          }
        >
          {t("setupGuide.title")}
        </ButtonItemIconContent>
      </ButtonItem>
      {showGuide && (
        <div style={{ marginTop: "20px", marginBottom: "20px" }}>
          {!isSetup ? <RetroDECKNotInstalled /> : <RetroDECKEventScriptsEnableGuide />}
          <div style={{ overflowWrap: "break-word", marginTop: "30px" }}>
            {tx("setupGuide.issues", { url: <strong>{githubUrl}</strong> })}
          </div>
        </div>
      )}
    </div>
  );
};

export const RetroDECKNotInstalled = () => {
  const { setupState } = useMenuContext();

  return (
    <div>
      <h4>{t("setupGuide.notInstalled.title")}</h4>
      <ol style={{ paddingInlineStart: "25px" }}>
        <li>
          {isDoneIcon(setupState?.isRetrodeckFlatpakInstalled)}{" "}
          {t("setupGuide.notInstalled.flatpak")}
        </li>
        <li>
          {isDoneIcon(setupState?.areEsDeEventScriptsCreated)}{" "}
          {t("setupGuide.notInstalled.eventScripts")}
        </li>
      </ol>
      <div>
        {tx("setupGuide.notInstalled.reload", {
          path: <strong>{t("setupGuide.notInstalled.reloadPath")}</strong>,
        })}
      </div>
    </div>
  );
};

export const RetroDECKEventScriptsEnableGuide = () => {
  return (
    <div>
      <h4>{t("setupGuide.enableScripts.title")}</h4>
      <ol style={{ paddingInlineStart: "25px" }}>
        <li>
          {tx("setupGuide.enableScripts.openMenu", {
            menu: <strong>{t("setupGuide.enableScripts.regularMenu")}</strong>,
          })}
        </li>
        <li>
          {tx("setupGuide.enableScripts.navigate", {
            path: <strong>ES-DE Configurations {">"} Other Settings</strong>,
          })}
        </li>
        <li>
          {tx("setupGuide.enableScripts.enable", {
            option: <strong>Custom Event Scripts</strong>,
          })}
        </li>
        <li>
          {tx("setupGuide.enableScripts.restart", {
            restart: <strong>{t("setupGuide.enableScripts.restartLabel")}</strong>,
          })}
        </li>
      </ol>
    </div>
  );
};
