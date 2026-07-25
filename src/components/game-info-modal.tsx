import { useLayoutEffect, useRef, useState } from "react";
import {
  Field,
  Focusable,
  ModalRoot,
  ModalRootProps,
  GamepadButton,
  Navigation,
} from "@decky/ui";
import { GameEvent } from "../interfaces";
import { getIconPath } from "../utils";
import { useDialogContentStyling } from "../hooks";

export interface GameInfoModalProps extends ModalRootProps {
  gameEvent: GameEvent;
  onClose?: () => void;
}

const METADATA_GAP = "16px";
const SECTION_GAP = "48px";
const DESCRIPTION_MAX_HEIGHT = "250px";
const SECTION_DESCRIPTION_MAX_HEIGHT = "150px";
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

const isValidHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const resolveFirstValidUrl = (
  value: string | string[] | null | undefined
): string | null => {
  if (value == null) {
    return null;
  }

  const candidates = Array.isArray(value) ? value : [value];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && isValidHttpUrl(trimmed)) {
      return trimmed;
    }
  }

  return null;
};

interface MetadataField {
  label: string;
  value: string | null;
  isLink?: boolean;
}

const SectionHeader = ({ title }: { title: string }) => (
  <div
    style={{
      fontWeight: "bold",
      fontSize: "16px",
      marginBottom: "16px",
      color: "#dcdedf",
    }}
  >
    {title}
  </div>
);

const DESCRIPTION_ACTION_MAP = {
  [GamepadButton.BUMPER_LEFT]: "Scroll Up",
  [GamepadButton.BUMPER_RIGHT]: "Scroll Down",
};

interface DescriptionFieldProps {
  value: string | null | undefined;
  maxHeight?: string;
}

const DescriptionField = ({
  value,
  maxHeight = DESCRIPTION_MAX_HEIGHT,
}: DescriptionFieldProps) => {
  const descriptionScrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Field label="Description" childrenLayout="below" bottomSeparator="none">
        <Focusable
          noFocusRing
          className="FocusRegion"
          onActivate={() => {}}
          onButtonDown={handleDescriptionButtonDown}
          actionDescriptionMap={DESCRIPTION_ACTION_MAP}
        >
          <div
            ref={descriptionScrollRef}
            style={{
              maxHeight,
              overflowY: "auto",
              whiteSpace: "normal",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              lineHeight: 1.45,
              color: "#dcdedf",
              width: "100%",
            }}
          >
            {displayValue(value)}
          </div>
        </Focusable>
      </Field>
    </div>
  );
};

const MetadataFieldRows = ({
  fields,
  onOpenLink,
}: {
  fields: MetadataField[];
  onOpenLink?: (url: string) => void;
}) => {
  const metadataRows: MetadataField[][] = [];
  for (let i = 0; i < fields.length; i += 2) {
    metadataRows.push(fields.slice(i, i + 2));
  }

  return (
    <Focusable
      noFocusRing
      className="FocusRegion"
      flow-children="grid"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: METADATA_GAP,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {metadataRows.map((row, rowIndex) => (
        <MetadataFieldRow
          key={rowIndex}
          row={row}
          rowIndex={rowIndex}
          rowCount={metadataRows.length}
          onOpenLink={onOpenLink}
        />
      ))}
    </Focusable>
  );
};

const MetadataFieldRow = ({
  row,
  rowIndex,
  rowCount,
  onOpenLink,
}: {
  row: MetadataField[];
  rowIndex: number;
  rowCount: number;
  onOpenLink?: (url: string) => void;
}) => {
  const valueRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [sharedValueHeight, setSharedValueHeight] = useState<number | undefined>();

  useLayoutEffect(() => {
    valueRefs.current = valueRefs.current.slice(0, row.length);

    const maxHeight = Math.max(
      ...valueRefs.current.map((el) => el?.offsetHeight ?? 0),
      0
    );

    setSharedValueHeight((prev) => {
      const next = maxHeight > 0 ? maxHeight : undefined;
      return prev === next ? prev : next;
    });
  });

  return (
    <Focusable
      noFocusRing
      className="FocusRegion"
      flow-children="row"
      style={{
        display: "flex",
        gap: METADATA_GAP,
        alignItems: "stretch",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {row.map((field, fieldIndex) => {
        const linkUrl = field.isLink ? field.value : null;
        const canOpenLink = Boolean(linkUrl);

        return (
          <div
            key={field.label}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Field
              label={field.label}
              bottomSeparator={
                rowIndex < rowCount - 1 || fieldIndex < row.length - 1
                  ? "standard"
                  : "none"
              }
            >
              <Focusable
                noFocusRing
                className="FocusRegion"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  minHeight: sharedValueHeight,
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onActivate={() => {
                  if (linkUrl) {
                    onOpenLink?.(linkUrl);
                  }
                }}
              >
                <span
                  ref={(el) => {
                    valueRefs.current[fieldIndex] = el;
                  }}
                  style={{
                    color: canOpenLink ? "#1a9fff" : "#dcdedf",
                    textDecoration: canOpenLink ? "underline" : "none",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    textAlign: "right",
                  }}
                >
                  {field.isLink
                    ? canOpenLink
                      ? "Open Link"
                      : "-"
                    : displayValue(field.value)}
                </span>
              </Focusable>
            </Field>
          </div>
        );
      })}
      {row.length === 1 && <div style={{ flex: "1 1 0", minWidth: 0 }} />}
    </Focusable>
  );
};

interface GameInfoMetadataProps {
  gameEvent: GameEvent;
  onOpenLink?: (url: string) => void;
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

  return (
    <div style={{ marginBottom: SECTION_GAP }}>
      <MetadataFieldRows fields={metadataFields} />
    </div>
  );
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
  ];

  return (
    <div style={{ marginBottom: SECTION_GAP }}>
      <SectionHeader title="System Info" />
      <DescriptionField
        value={systemMetadata.description}
        maxHeight={SECTION_DESCRIPTION_MAX_HEIGHT}
      />
      <div style={{ marginTop: METADATA_GAP }}>
        <MetadataFieldRows fields={metadataFields} />
      </div>
    </div>
  );
};

const ComponentInfoMetadata = ({
  gameEvent,
  onOpenLink,
}: GameInfoMetadataProps) => {
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
    {
      label: "Wiki",
      value: resolveFirstValidUrl(componentMetadata.url_rdwiki),
      isLink: true,
    },
    {
      label: "Website",
      value: resolveFirstValidUrl(componentMetadata.url_webpage),
      isLink: true,
    },
    {
      label: "Source",
      value: resolveFirstValidUrl(componentMetadata.url_source),
      isLink: true,
    },
    {
      label: "Donation",
      value: resolveFirstValidUrl(componentMetadata.url_donation_purchase),
      isLink: true,
    },
  ];

  return (
    <div>
      <SectionHeader title="Component Info" />
      <DescriptionField
        value={componentMetadata.description}
        maxHeight={SECTION_DESCRIPTION_MAX_HEIGHT}
      />
      <div style={{ marginTop: METADATA_GAP }}>
        <MetadataFieldRows fields={metadataFields} onOpenLink={onOpenLink} />
      </div>
    </div>
  );
};

export const GameInfoModal = (props: GameInfoModalProps) => {
  const { gameEvent } = props;
  const contentRef = useRef<HTMLDivElement>(null);
  useDialogContentStyling(contentRef, "75vw");

  const handleClose = () => {
    props.closeModal?.();
    props.onClose?.();
  };

  const handleOpenLink = (url: string) => {
    handleClose();
    Navigation.NavigateToExternalWeb(url);
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
            <DescriptionField value={gameEvent.game_metadata.desc} />
          </div>
        </div>

        <GameInfoMetadata gameEvent={gameEvent} />
        <SystemInfoMetadata gameEvent={gameEvent} />
        <ComponentInfoMetadata gameEvent={gameEvent} onOpenLink={handleOpenLink} />
      </div>
    </ModalRoot>
  );
};
