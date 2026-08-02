import { useEffect, useRef, useState } from "react";
import { Field, Focusable, ModalRoot, ModalRootProps } from "@decky/ui";
import { GameEvent, RaGameResult } from "../../interfaces";
import { getRetroAchievementsForGameBe } from "../../backend";
import { useDialogContentStyling } from "../../hooks";
import { getIconPath } from "../../utils";
import { RetrodeckSpinner } from "../viewers/viewers-shared";
import { RaAchievementRow, RaStatusMessage } from "./ra-shared";

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
      gameEvent.name
    ).then((payload) => {
      if (!cancelled) {
        setResult(payload);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [gameEvent.system_name, gameEvent.system_full_name, gameEvent.name]);

  const handleClose = () => {
    props.closeModal?.();
    props.onClose?.();
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
              alt="Achievements"
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
            Achievements
          </div>
        </div>

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <RetrodeckSpinner />
          </div>
        )}

        {!loading && result && result.status !== "ok" && result.message && (
          <RaStatusMessage message={result.message} />
        )}

        {!loading && result?.status === "ok" && result.game && result.summary && (
          <Focusable noFocusRing className="FocusRegion" flow-children="grid">
            <Field childrenLayout="below" bottomSeparator="standard">
              <Focusable noFocusRing className="FocusRegion" onActivate={() => {}}>
                <div
                  style={{
                    color: "#dcdedf",
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                    {result.game.title}
                    {result.game.console_name ? ` (${result.game.console_name})` : ""}
                  </div>
                  <div>
                    {result.summary.earned_count} / {result.summary.total_count} achievements
                    {" · "}
                    {result.summary.earned_points} / {result.summary.total_points} points
                    {" · "}
                    {result.summary.completion} complete
                  </div>
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
              />
            ))}
          </Focusable>
        )}
      </div>
    </ModalRoot>
  );
};
