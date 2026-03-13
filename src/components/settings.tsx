import { useState, useEffect } from "react";
import { ButtonItem, ToggleField } from "@decky/ui";
import { ButtonItemIconContent } from "./shared";
import { getIconPath } from "../utils";
import { getSettingBe, setSettingBe } from "../backend";
import { SettingsKey } from "../interfaces";

const useSettingToggle = (key: SettingsKey, defaultValue: boolean = false): [boolean, (value: boolean) => void] => {
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        getSettingBe(key).then((storedValue) => {
            if (storedValue !== null && storedValue !== undefined) {
                setValue(storedValue);
            }
        });
    }, []);

    const setAndPersist = (newValue: boolean) => {
        setValue(newValue);
        setSettingBe(key, newValue);
    };

    return [value, setAndPersist];
};

export const Settings = () => {
    const [showSettings, setShowSettings] = useState(false);

    const [autoStartEnabled, setAutoStartEnabled] = useSettingToggle("autoStartEnabled", false);
    const [showManualButton, setShowManualButton] = useSettingToggle("showManualButton", false);

    return <div>
        <ButtonItem
            layout="below"
            onClick={() => {
                setShowSettings(!showSettings);
            }}
        >
            <ButtonItemIconContent icon={<img src={getIconPath(`RD-zoom-${showSettings ? 'out' : 'in'}`)} width={24} height={24} />}>Settings</ButtonItemIconContent>
        </ButtonItem>
        {
            showSettings && <div style={{ marginTop: '10px' }}>
                <ToggleField
                    label="Auto Start RetroDECK"
                    description={`Automatically launch RetroDECK when Steam starts in Game Mode. RetroDECK must exist as Steam Game with the name "RetroDECK".`}
                    checked={autoStartEnabled}
                    onChange={setAutoStartEnabled}
                />
                <ToggleField
                    label={`"View Manual" Button`}
                    description={`Show the "View Manual" button in the actions menu (experimental)`}
                    checked={showManualButton}
                    onChange={setShowManualButton}
                />
            </div>
        }
    </div>;
};

