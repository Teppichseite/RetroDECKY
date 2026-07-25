import { useRef } from "react";
import {
  Field,
  Focusable,
  ModalRoot,
  ModalRootProps,
  GamepadButton,
} from "@decky/ui";
import { GameEvent } from "../interfaces";
import { getIconPath } from "../utils";
import { useDialogContentStyling } from "../hooks";

export interface GameInfoModalProps extends ModalRootProps {
  gameEvent: GameEvent;
  onClose?: () => void;
}

const METADATA_GAP = "16px";
const DESCRIPTION_MAX_HEIGHT = "250px";
const DESCRIPTION_SCROLL_STEP = 80;

const formatRating = (rating: string | null): string | null => {
  if (!rating) {
    return null;
  }

  const parsed = Number.parseFloat(rating);
  if (Number.isNaN(parsed)) {
    return rating;
  }

  return `${(parsed * 10).toFixed(1)} / 10`;
};

const formatReleaseDate = (releasedate: string | null): string | null => {
  if (!releasedate || releasedate.length < 8) {
    return releasedate;
  }

  const year = releasedate.slice(0, 4);
  const month = releasedate.slice(4, 6);
  const day = releasedate.slice(6, 8);

  return `${year}-${month}-${day}`;
};

const displayValue = (value: string | null | undefined): string => {
  if (!value || value.trim() === "") {
    return "-";
  }

  return value;
};

const formatListOrString = (
  value: string | string[] | null | undefined
): string | null => {
  if (value == null) {
    return null;
  }

  if (Array.isArray(value)) {
    const joined = value.filter(Boolean).join(", ");
    return joined || null;
  }

  return value.trim() === "" ? null : value;
};

interface MetadataField {
  label: string;
  value: string | null;
}

const MetadataFieldRows = ({ fields }: { fields: MetadataField[] }) => {
  const metadataRows: MetadataField[][] = [];
  for (let i = 0; i < fields.length; i += 2) {
    metadataRows.push(fields.slice(i, i + 2));
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: METADATA_GAP,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {metadataRows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: "flex",
            gap: METADATA_GAP,
            alignItems: "flex-start",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {row.map((field, fieldIndex) => (
            <div
              key={field.label}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <Field
                label={field.label}
                bottomSeparator={
                  rowIndex < metadataRows.length - 1 ||
                  fieldIndex < row.length - 1
                    ? "standard"
                    : "none"
                }
              >
                <Focusable noFocusRing className="FocusRegion" onActivate={() => {}}>
                  <span
                    style={{
                      color: "#dcdedf",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {displayValue(field.value)}
                  </span>
                </Focusable>
              </Field>
            </div>
          ))}
          {row.length === 1 && <div style={{ flex: "1 1 0", minWidth: 0 }} />}
        </div>
      ))}
    </div>
  );
};

interface GameInfoMetadataProps {
  gameEvent: GameEvent;
}

const GameInfoMetadata = ({ gameEvent }: GameInfoMetadataProps) => {
  const metadataFields: MetadataField[] = [
    { label: "System", value: gameEvent.system_full_name || gameEvent.system_name },
    {
      label: "Component",
      value: gameEvent.emulator_name?.filter(Boolean).join(" - ") || null,
    },
    { label: "Rating", value: formatRating(gameEvent.game_metadata.rating) },
    { label: "Release Date", value: formatReleaseDate(gameEvent.game_metadata.releasedate) },
    { label: "Developer", value: gameEvent.game_metadata.developer },
    { label: "Publisher", value: gameEvent.game_metadata.publisher },
    { label: "Genre", value: gameEvent.game_metadata.genre },
    { label: "Players", value: gameEvent.game_metadata.players },
  ];

  return <MetadataFieldRows fields={metadataFields} />;
};

const SystemInfoMetadata = ({ gameEvent }: GameInfoMetadataProps) => {
  const systemMetadata = gameEvent.system_metadata;
  if (!systemMetadata) {
    return null;
  }

  const metadataFields: MetadataField[] = [
    { label: "System Name", value: systemMetadata.name },
    { label: "Manufacturer", value: systemMetadata.manufacturer },
    {
      label: "System Release Date",
      value: systemMetadata.release_date_formatted || systemMetadata.release_date,
    },
    { label: "Hardware Type", value: systemMetadata.hardware_type },
    { label: "System Description", value: systemMetadata.description },
  ];

  return (
    <div style={{ marginTop: METADATA_GAP }}>
      <MetadataFieldRows fields={metadataFields} />
    </div>
  );
};

const ComponentInfoMetadata = ({ gameEvent }: GameInfoMetadataProps) => {
  const componentMetadata = gameEvent.component_metadata;
  if (!componentMetadata) {
    return null;
  }

  const metadataFields: MetadataField[] = [
    { label: "Component Name", value: componentMetadata.name },
    { label: "Component Type", value: componentMetadata.component_type },
    {
      label: "Component Systems",
      value: formatListOrString(
        componentMetadata.system_friendly_name || componentMetadata.system
      ),
    },
    { label: "Component Description", value: componentMetadata.description },
    { label: "Wiki", value: componentMetadata.url_rdwiki },
    { label: "Website", value: componentMetadata.url_webpage },
    { label: "Source", value: componentMetadata.url_source },
    {
      label: "Donation",
      value: formatListOrString(componentMetadata.url_donation_purchase),
    },
  ];

  return (
    <div style={{ marginTop: METADATA_GAP }}>
      <MetadataFieldRows fields={metadataFields} />
    </div>
  );
};

export const GameInfoModal = (props: GameInfoModalProps) => {
  const { gameEvent } = props;
  const contentRef = useRef<HTMLDivElement>(null);
  const descriptionScrollRef = useRef<HTMLDivElement>(null);
  useDialogContentStyling(contentRef, "65vw");

  const handleClose = () => {
    props.closeModal?.();
    props.onClose?.();
  };

  const scrollDescription = (delta: number) => {
    descriptionScrollRef.current?.scrollBy({ top: delta, behavior: "smooth" });
  };

  const handleDescriptionButtonDown = (evt: { detail: { button: number } }) => {
    const button = evt.detail.button;

    if (button === GamepadButton.BUMPER_LEFT) {
      scrollDescription(-DESCRIPTION_SCROLL_STEP);
      return;
    }

    if (button === GamepadButton.BUMPER_RIGHT) {
      scrollDescription(DESCRIPTION_SCROLL_STEP);
      return;
    }
  };

  const descriptionActionDescriptionMap = {
    [GamepadButton.BUMPER_LEFT]: "Scroll Up",
    [GamepadButton.BUMPER_RIGHT]: "Scroll Down",
  };

  const imageSrc = gameEvent.image_path?.replace(/\\/g, "") ?? null;

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
              alt="Game Info"
              src={getIconPath("RD-edit-find")}
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
            {gameEvent.name}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: METADATA_GAP,
            alignItems: "center",
            marginBottom: METADATA_GAP,
            paddingTop: "12px",
            paddingBottom: "12px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {imageSrc && (
            <div
              style={{
                flex: "1 1 0",
                minWidth: 0,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={imageSrc}
                alt={gameEvent.name}
                style={{
                  width: "80%",
                  height: "auto",
                  display: "block",
                  borderRadius: "4px",
                }}
              />
            </div>
          )}

          <div
            style={{
              flex: "1 1 0",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <Field label="Description" childrenLayout="below" bottomSeparator="none">
              <Focusable
                noFocusRing
                className="FocusRegion"
                onActivate={() => {}}
                onButtonDown={handleDescriptionButtonDown}
                actionDescriptionMap={descriptionActionDescriptionMap}
              >
                <div
                  ref={descriptionScrollRef}
                  style={{
                    maxHeight: DESCRIPTION_MAX_HEIGHT,
                    overflowY: "auto",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    lineHeight: 1.45,
                    color: "#dcdedf",
                    width: "100%",
                  }}
                >
                  {displayValue(gameEvent.game_metadata.desc)}
                </div>
              </Focusable>
            </Field>
          </div>
        </div>

        <GameInfoMetadata gameEvent={gameEvent} />
        <SystemInfoMetadata gameEvent={gameEvent} />
        <ComponentInfoMetadata gameEvent={gameEvent} />
      </div>
    </ModalRoot>
  );
};
