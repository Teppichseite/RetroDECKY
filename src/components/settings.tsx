import { useState, useEffect } from "react";
import { ButtonItem, ToggleField, findSP, showModal } from "@decky/ui";
import { ButtonItemIconContent } from "./shared";
import { getIconPath } from "../utils";
import { getSettingBe, setSettingBe, getRetroAchievementsStatusBe } from "../backend";
import { SettingsKey } from "../interfaces";
import { RaSettingsModal } from "./retro-achievements";

const useSettingToggle = (
  key: SettingsKey,
  defaultValue: boolean = false
): [boolean, (value: boolean) => void] => {
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
  const [raStatusDescription, setRaStatusDescription] = useState("Not configured");

  const [autoStartEnabled, setAutoStartEnabled] = useSettingToggle(
    "autoStartEnabled",
    false
  );

  const refreshRaStatus = () => {
    getRetroAchievementsStatusBe().then((status) => {
      setRaStatusDescription(
        status.configured && status.username
          ? `Signed in as ${status.username}`
          : "Not configured"
      );
    });
  };

  useEffect(() => {
    refreshRaStatus();
  }, []);

  const openRaSettings = () => {
    showModal(
      <RaSettingsModal onSaved={refreshRaStatus} />,
      findSP()
    );
  };

  return (
    <div>
      <ButtonItem
        layout="below"
        onClick={() => {
          setShowSettings(!showSettings);
        }}
      >
        <ButtonItemIconContent
          icon={
            <img
              src={getIconPath(`RD-zoom-${showSettings ? "out" : "in"}`)}
              width={24}
              height={24}
            />
          }
        >
          Settings
        </ButtonItemIconContent>
      </ButtonItem>
      {showSettings && (
        <div style={{ marginTop: "10px" }}>
          <ToggleField
            label="Auto Start RetroDECK"
            description={`Automatically launch RetroDECK when Steam starts in Gaming Mode. This launches any steam game which is called "RetroDECK" in your library. (experimental)`}
            checked={autoStartEnabled}
            onChange={setAutoStartEnabled}
          />
          <ButtonItem layout="below" onClick={openRaSettings}>
            <ButtonItemIconContent
              icon={
                <img
                  src={getIconPath("RD-emblem-favorite")}
                  width={24}
                  height={24}
                />
              }
            >
              <div>
                <div>RetroAchievements</div>
                <div style={{ fontSize: "12px", opacity: 0.8 }}>{raStatusDescription}</div>
              </div>
            </ButtonItemIconContent>
          </ButtonItem>
        </div>
      )}
    </div>
  );
};
