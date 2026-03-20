import { ButtonItem, Navigation, PanelSection } from "@decky/ui";
import retrodeckLogo from "../../assets/logo/icon-RetroDECKY.svg";
import { ButtonItemIconContent } from "./shared";
import { SetupGuide } from "./setup-guide";
import { Settings } from "./settings";
import { getIconPath } from "../utils";

const WIKI_URL = "https://retrodeck.readthedocs.io/en/latest/";
const GITHUB_URL = "https://github.com/Teppichseite/RetroDecky";

export const NoGame = () => {
    return <div>
        <PanelSection>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '20px',
                marginBottom: '20px'
            }}>
                <img src={retrodeckLogo} width={90} height={90} />
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '20px' }}>
                <strong>No game is currently running.</strong>
            </div>
            <SetupGuide />
            <Settings />
            <ButtonItem
                layout="below"
                onClick={() => Navigation.NavigateToExternalWeb(WIKI_URL)}
            >
                <ButtonItemIconContent icon={<img src={getIconPath("RD-text-x-generic")} width={24} height={24} alt="" />}>RetroDECK Wiki</ButtonItemIconContent>
            </ButtonItem>
            <ButtonItem
                layout="below"
                onClick={() => Navigation.NavigateToExternalWeb(GITHUB_URL)}
            >
                <ButtonItemIconContent icon={<img src={getIconPath("RD-utilities-terminal")} width={24} height={24} alt="" />}>GitHub Page</ButtonItemIconContent>
            </ButtonItem>
        </PanelSection>
    </div>;
};