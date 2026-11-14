import { useEffect, useRef, useState } from "react";
import { Field, Focusable, ModalRoot, ModalRootProps, Navigation } from "@decky/ui";
import { GameEvent, RaGameResult, RaProgressSummary } from "../../interfaces";
import { getRetroAchievementsForGameBe } from "../../backend";
import { useDialogContentStyling } from "../../hooks";
import { getIconPath } from "../../utils";
import { RetrodeckSpinner } from "../viewers/viewers-shared";
import { RaAchievementRow, RaStatusMessage } from "./ra-shared";
import { t } from "../../i18n";

// The backend message is English; known statuses are translated on the frontend.
const getStatusMessage = (result: RaGameResult, gameEvent: GameEvent): string => {
  switch (result.status) {
    case "not_configured":
      return t("ra.status.not_configured");
    case "no_console":
      return t("ra.status.no_console", {
        system: gameEvent.system_full_name || gameEvent.system_name,
      });
    case "not_found":
      return t("ra.status.not_found");
    case "error":
      return t("ra.status.error");
    default:
      return result.message ?? "";
  }
};

const formatSummary = (mode: string, summary: RaProgressSummary): string =>
  t("ra.summary", {
    mode,
    earned: summary.earned_count,
    total: summary.total_count,
    earnedPoints: summary.earned_points,
    totalPoints: summary.total_points,
    completion: summary.completion,
  });

export interface RaAchievementsModalProps extends ModalRootProps {
  gameEvent: GameEvent;
  onClose?: () => void;
}

export const RaAchievementsModal = (props: RaAchievementsModalProps) => {
  const { gameEvent } = props;
  const contentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<RaGameResult | null>(null);

  useDialogContentStyling(contentRef, "75vw");

  useEffect(() => {
    let cancelled = false;

    getRetroAchievementsForGameBe(
      gameEvent.system_name,
      gameEvent.system_full_name,
      gameEvent.name,
      gameEvent.path
    ).then((payload) => {
      if (!cancelled) {
        setResult(payload);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [gameEvent.system_name, gameEvent.system_full_name, gameEvent.name, gameEvent.path]);

  const handleClose = () => {
    props.closeModal?.();
    props.onClose?.();
  };

  const handleOpenLink = (url: string) => {
    handleClose();
    Navigation.NavigateToExternalWeb(url);
  };

  return (
    <ModalRoot onCancel={handleClose}>
      <div
        ref={contentRef}
        style={{
          width: "100%",
          padding: "16px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
            columnGap: "10px",
          }}
        >
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
            <img
              alt={t("ra.title")}
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
            {t("ra.title")}
          </div>
        </div>

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <RetrodeckSpinner />
          </div>
        )}

        {!loading && result && result.status !== "ok" && result.message && (
          <RaStatusMessage message={getStatusMessage(result, gameEvent)} />
        )}

        {!loading && result?.status === "ok" && result.game && result.summary && (
          <Focusable noFocusRing className="FocusRegion" flow-children="grid">
            <Field childrenLayout="below" bottomSeparator="standard">
              <Focusable
                noFocusRing
                className="FocusRegion"
                onActivate={() =>
                  handleOpenLink(`https://retroachievements.org/game/${result.game!.id}`)
                }
              >
                <div
                  style={{
                    color: "#dcdedf",
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                    {result.game.title}
                    {result.game.console_name ? ` - ${result.game.console_name}` : ""}
                    {result.game.matched_by === "name"
                      ? ` (${t("ra.matchedByName")})`
                      : ""}
                  </div>
                  <div>{formatSummary("Softcore", result.summary.softcore)}</div>
                  <div>{formatSummary("Hardcore", result.summary.hardcore)}</div>
                </div>
              </Focusable>
            </Field>

            {result.achievements.map((achievement, index) => (
              <RaAchievementRow
                key={achievement.id}
                achievement={achievement}
                bottomSeparator={
                  index < result.achievements.length - 1 ? "standard" : "none"
                }
                onActivate={() =>
                  handleOpenLink(
                    `https://retroachievements.org/achievement/${achievement.id}`
                  )
                }
              />
            ))}
          </Focusable>
        )}
      </div>
    </ModalRoot>
  );
};
