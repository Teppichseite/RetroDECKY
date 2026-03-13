import { callable } from "@decky/api";
import { Action, GameEvent, SettingsKey, SetupState } from "./interfaces";

export const getActionsBe = callable<[], Action[]>("get_actions");
export const getGameEventBe = callable<[], GameEvent | null>("get_game_event");

export const getStateBe = callable<[string], string>("get_state");
export const setStateBe = callable<[string, string], void>("set_state");

export const checkSetupStateBe = callable<[], [boolean, boolean]>("check_setup_state");

export const getSettingBe = callable<[SettingsKey], any>("get_setting");
export const setSettingBe = callable<[SettingsKey, any], void>("set_setting");

export const mapBeSetupStateToSetupState = (beSetupState: [boolean, boolean]): SetupState => {
    const [isRetrodeckFlatpakInstalled, areEsDeEventScriptsCreated] = beSetupState;
    return {
        isRetrodeckFlatpakInstalled,
        areEsDeEventScriptsCreated
    };
};