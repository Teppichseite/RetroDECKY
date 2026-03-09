import { PanelSection } from "@decky/ui";
import retrodeckLogo from "../../assets/retrodeck-logo.png";
import { SetupGuide } from "./setup-guide";
import { Settings } from "./settings";

export const NoGame = () => {
    return <div>
        <PanelSection>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '20px',
                marginBottom: '20px'
            }}>
                <img src={retrodeckLogo} width={80} height={80} />
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '20px' }}>
                <strong>No game is currently running.</strong>
            </div>
            <SetupGuide />
            <Settings />
        </PanelSection>
    </div>;
};