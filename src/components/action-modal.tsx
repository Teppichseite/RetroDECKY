import { Field, Focusable, ModalRoot, ModalRootProps } from "@decky/ui";
import { Action, HotkeyLabel } from "../interfaces";
import { getIconPath } from "../utils";

const HKB_REPLACEMENTS: Record<string, string> = {
    "Steam Deck": "L4/R4/Select",
    "Xbox": "Select",
    "Nintendo": "Minus",
    "PlayStation": "Select",
};

const resolveHotkeyKeys = (label: HotkeyLabel): string[] => {
    return label.keys.map((key) =>
        key === "HKB" ? (HKB_REPLACEMENTS[label.name] ?? key) : key
    );
};

export interface ActionModalProps extends ModalRootProps {
    action: Action;
    onClose: () => void;
}

export const ActionModal = (props: ActionModalProps) => {
    const { action } = props;

    const icon = action.icon.type === "path"
        ? <img alt={action.name} src={getIconPath(action.icon.value)} width={42} height={42} />
        : null;

    return (
        <ModalRoot
            
            onCancel={() => {
                props.closeModal?.();
                props.onClose();
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    columnGap: "12px",
                    marginBottom: "20px",
                }}
            >
                {icon && (
                    <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                        {icon}
                    </div>
                )}
                <div
                    style={{
                        fontWeight: "bold",
                        fontSize: "20px",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                    }}
                >
                    {action.name}{" "}Hotkeys
                </div>
            </div>

            <div>Controller hotkeys will only work if an official <strong>RetroDECK Controller profile</strong> is being used.</div>

            {action.hotkeyLabels && action.hotkeyLabels.length > 0 && (
                <div style={{ marginBottom: "16px", marginTop: "16px" }}>
                    {action.hotkeyLabels.map((label, index) => (
                        <Field
                            key={index}
                            label={label.name}
                            bottomSeparator={index < action.hotkeyLabels.length - 1 ? "standard" : "none"}
                        >
                            <Focusable noFocusRing className="FocusRegion" onActivate={() => { }}>
                                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "monospace", fontSize: "14px" }}>
                                    {resolveHotkeyKeys(label).map((key, keyIndex) => (
                                        <span key={keyIndex} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            {keyIndex > 0 && <span>+</span>}
                                            <span
                                                style={{
                                                    background: "rgba(255, 255, 255, 0.1)",
                                                    padding: "8px 12px",
                                                    borderRadius: "4px",
                                                    color: "#dcdedf"
                                                }}
                                            >
                                                {key}
                                            </span>
                                        </span>
                                    ))}
                                </span>
                            </Focusable>
                        </Field>
                    ))}
                </div>
            )}
        </ModalRoot>
    );
};

