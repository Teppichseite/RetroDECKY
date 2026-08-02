import { Field, Focusable } from "@decky/ui";
import { RaAchievement } from "../../interfaces";

export const RaStatusMessage = ({ message }: { message: string }) => (
  <div
    style={{
      textAlign: "center",
      color: "#dcdedf",
      padding: "48px 24px",
      lineHeight: 1.5,
      whiteSpace: "normal",
      wordBreak: "break-word",
    }}
  >
    {message}
  </div>
);

export interface RaAchievementRowProps {
  achievement: RaAchievement;
  bottomSeparator?: "standard" | "none";
}

export const RaAchievementRow = ({
  achievement,
  bottomSeparator = "standard",
}: RaAchievementRowProps) => {
  const badgeSrc = achievement.earned
    ? achievement.badge_url
    : achievement.badge_locked_url ?? achievement.badge_url;

  return (
    <Field childrenLayout="below" bottomSeparator={bottomSeparator}>
      <Focusable noFocusRing className="FocusRegion" onActivate={() => {}}>
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "flex-start",
            opacity: achievement.earned ? 1 : 0.55,
          }}
        >
          {badgeSrc && (
            <img
              src={badgeSrc}
              alt={achievement.title}
              width={64}
              height={64}
              style={{ flexShrink: 0, borderRadius: "4px" }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: "bold",
                color: achievement.earned ? "#dcdedf" : "#9aa0a6",
                marginBottom: "4px",
                wordBreak: "break-word",
              }}
            >
              {achievement.title}
              <span style={{ marginLeft: "8px", color: "#1a9fff", fontWeight: "normal" }}>
                {achievement.points} pts
              </span>
            </div>
            <div
              style={{
                color: "#b8bcbf",
                fontSize: "13px",
                lineHeight: 1.4,
                wordBreak: "break-word",
              }}
            >
              {achievement.description}
            </div>
            {achievement.earned && achievement.date_earned && (
              <div style={{ color: "#7a8288", fontSize: "12px", marginTop: "6px" }}>
                Earned: {achievement.date_earned}
                {achievement.earned_hardcore ? " (Hardcore)" : ""}
              </div>
            )}
          </div>
        </div>
      </Focusable>
    </Field>
  );
};
