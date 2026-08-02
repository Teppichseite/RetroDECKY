import { useEffect, useState } from "react";
import {
  DialogButton,
  Focusable,
  ModalRoot,
  ModalRootProps,
  TextField,
} from "@decky/ui";
import {
  clearRetroAchievementsCredentialsBe,
  getRetroAchievementsStatusBe,
  saveRetroAchievementsCredentialsBe,
} from "../../backend";
import { getIconPath } from "../../utils";

export interface RaSettingsModalProps extends ModalRootProps {
  onClose?: () => void;
  onSaved?: () => void;
}

export const RaSettingsModal = (props: RaSettingsModalProps) => {
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    getRetroAchievementsStatusBe().then((status) => {
      setConfigured(status.configured);
      if (status.username) {
        setUsername(status.username);
        setSavedUsername(status.username);
      }
    });
  }, []);

  const handleClose = () => {
    props.closeModal?.();
    props.onClose?.();
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const result = await saveRetroAchievementsCredentialsBe(username, apiKey);
      if (!result.saved) {
        setError(result.error ?? "Failed to save credentials.");
        return;
      }

      props.onSaved?.();
      handleClose();
    } catch {
      setError("Failed to save credentials.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setError(null);

    try {
      await clearRetroAchievementsCredentialsBe();
      setUsername("");
      setSavedUsername("");
      setApiKey("");
      setConfigured(false);
      props.onSaved?.();
    } catch {
      setError("Failed to log out.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <ModalRoot onCancel={handleClose}>
      <div style={{ padding: "16px", minWidth: "420px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "24px",
            columnGap: "10px",
          }}
        >
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
            <img
              alt="RetroAchievements"
              src={getIconPath("RD-emblem-favorite")}
              width={42}
              height={42}
            />
          </div>
          <div
            style={{
              fontWeight: "bold",
              fontSize: "20px",
              whiteSpace: "normal",
              wordBreak: "break-word",
            }}
          >
            RetroAchievements
          </div>
        </div>

        <Focusable noFocusRing className="FocusRegion" onActivate={() => {}}>
          <div
            style={{
              color: "#b8bcbf",
              lineHeight: 1.5,
              marginBottom: "16px",
            }}
          >
            {configured && savedUsername && (
              <div style={{ marginBottom: "12px", fontWeight: "bold" }}>
                You are logged in as {savedUsername}.
              </div>
            )}
            <div>
              Enter your RetroAchievements username and API Key below. You can find your API
              key if you go to your RetroAchievements Profile &gt; Applications &gt; Web API
              Key.
            </div>
            <div style={{ marginTop: "12px" }}>
              You still have to activate RetroAchievements in the RetroDECK Configurator if not
              yet happened.
            </div>
          </div>
        </Focusable>

        <TextField
          label="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          focusOnMount
        />

        <TextField
          label="API Key"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          bIsPassword
        />

        {error && (
          <div style={{ color: "#ff6b6b", marginTop: "12px", marginBottom: "8px" }}>
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          <DialogButton onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </DialogButton>
          <DialogButton onClick={handleClose} className="DialogButton Secondary">
            Cancel
          </DialogButton>
          {configured && (
            <DialogButton
              onClick={handleLogout}
              disabled={loggingOut}
              className="DialogButton Secondary"
              style={{ color: "#ff6b6b" }}
            >
              {loggingOut ? "Logging out..." : "Log Out"}
            </DialogButton>
          )}
        </div>
      </div>
    </ModalRoot>
  );
};
