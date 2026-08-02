import { callable } from "@decky/api";
import {
  Action,
  GameEvent,
  RaClearResult,
  RaGameResult,
  RaSaveResult,
  RaStatus,
  SettingsKey,
  SetupState,
} from "./interfaces";

export const sendRawGameEventBe = callable<[string], void>("send_raw_game_event");

export const getActionsBe = callable<[], Action[]>("get_actions");
export const getGameEventBe = callable<[], GameEvent | null>("get_game_event");

export const getStateBe = callable<[string], string>("get_state");
export const setStateBe = callable<[string, string], void>("set_state");

export const checkSetupStateBe = callable<[], [boolean, boolean]>("check_setup_state");

export const getSettingBe = callable<[SettingsKey], any>("get_setting");
export const setSettingBe = callable<[SettingsKey, any], void>("set_setting");

export const getRetroAchievementsStatusBe = callable<[], RaStatus>(
  "get_retroachievements_status"
);
export const saveRetroAchievementsCredentialsBe = callable<
  [string, string],
  RaSaveResult
>("save_retroachievements_credentials");
export const clearRetroAchievementsCredentialsBe = callable<
  [],
  RaClearResult
>("clear_retroachievements_credentials");
export const getRetroAchievementsForGameBe = callable<
  [string, string, string],
  RaGameResult
>("get_retroachievements_for_game");

export const listCustomDocumentsBe = callable<[string, string], string[]>(
  "list_custom_documents"
);
export const copyFileToCustomDocumentsBe = callable<
  [string, string, string, string],
  string
>("copy_file_to_custom_documents");

export const mapBeSetupStateToSetupState = (
  beSetupState: [boolean, boolean]
): SetupState => {
  const [isRetrodeckFlatpakInstalled, areEsDeEventScriptsCreated] = beSetupState;
  return {
    isRetrodeckFlatpakInstalled,
    areEsDeEventScriptsCreated,
  };
};
