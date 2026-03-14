import { useState } from "react";
import { ButtonItemIconContent } from "./shared";
import { ButtonItem } from "@decky/ui";
import { getIconPath } from "../utils";
import { useMenuContext } from "../context";

const isDoneIcon = (isDone: boolean | undefined) => isDone ? "✅" : "❌";

const githubUrl = "https://github.com/Teppichseite/RetroDECKY";

export const SetupGuide = () => {
    const [showGuide, setShowGuide] = useState(false);

    const { setupState } = useMenuContext();

    const isSetup = setupState?.isRetrodeckFlatpakInstalled && setupState?.areEsDeEventScriptsCreated;

    return <div>
        <ButtonItem
            layout="below"
            onClick={() => {
                setShowGuide(!showGuide)
            }}
        >
            <ButtonItemIconContent icon={<img src={getIconPath(`RD-zoom-${showGuide ? 'out' : 'in'}`)} width={24} height={24} />}>Setup Guide</ButtonItemIconContent>
        </ButtonItem>
        {
            showGuide && <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                {!isSetup ? <RetroDECKNotInstalled /> : <RetroDECKEventScriptsEnableGuide />}
                <div
                    style={{ overflowWrap: 'break-word', marginTop: '30px' }}
                >Please visit <strong>{githubUrl}</strong> if you encounter any issues.</div>
            </div>
        }
    </div>;
};

export const RetroDECKNotInstalled = () => {

    const { setupState } = useMenuContext();

    return <div>
        <h4>RetroDECK is not fully installed on your system</h4>
        <ol style={{ paddingInlineStart: '25px' }}>
            <li>
                {isDoneIcon(setupState?.isRetrodeckFlatpakInstalled)} RetroDECK Flatpak is installed
            </li>
            <li>
                {isDoneIcon(setupState?.areEsDeEventScriptsCreated)} ES-DE event scripts got created
            </li>
        </ol>
        <div>
            To reload this page go to <strong>Decky Settings {">"} Plugins {">"} RetroDECKY {">"} Reload</strong>
        </div>
    </div>;
};

export const RetroDECKEventScriptsEnableGuide = () => {
    return <div>
        <h4>Please follow the steps to fully setup the plugin</h4>
        <ol style={{ paddingInlineStart: '25px' }}>
            <li>
                Open RetroDECK and open the <strong>regular Menu</strong>
            </li>
            <li>
                Navigate to <strong>ES-DE Configurations {">"} Other Settings</strong>
            </li>
            <li>
                Enable <strong>Custom Event Scripts</strong>
            </li>
            <li>
                <strong>Restart</strong> RetroDECK
            </li>
        </ol>
    </div>;
};