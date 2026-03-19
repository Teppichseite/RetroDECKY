import { useEffect, RefObject } from 'react';
import { Field } from '@decky/ui';
import { getIconPath } from '../../utils';
import retrodeckLogo from "../../../assets/logo/icon-RetroDECKY.svg";

export const ControlGuideKey = ({ button }: { button: string }) => (
    <span style={{
        background: "rgba(255, 255, 255, 0.1)",
        padding: "8px 12px",
        borderRadius: "4px",
        color: "#dcdedf",
        fontFamily: "monospace",
        fontSize: "14px",
    }}>
        {button}
    </span>
);

export interface ViewerInfoField {
    label: string;
    value: string;
}

export interface ViewerInfoProps {
    title: string;
    viewerTitle: string;
    fields: ViewerInfoField[];
}

export const ViewerInfo = ({ title, viewerTitle, fields }: ViewerInfoProps) => {
    return (
        <div
            style={{
                flexShrink: 0,
                width: '15vw',
                padding: "16px 20px",
                background: "#0e141b",
                color: "#dcdedf",
                borderRight: "2px solid #23262e",
                zIndex: 10,
                position: "relative"
            }}
        >
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: "30px",
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", marginTop: "8px" }}>
                    <img alt="RetroDECK" src={getIconPath("RD-preferences-desktop-display")} width={32} height={32} />
                </div>
                <div style={{
                    fontWeight: "bold",
                    fontSize: "16px",
                    textAlign: "center",
                    marginBottom: "8px",
                }}>
                    {viewerTitle}
                </div>
                <div style={{
                    fontSize: "14px",
                    textAlign: "center",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                }}>
                    {title}
                </div>
            </div>
            {fields.map((field, index) => (
                <Field 
                    key={index}
                    label={field.label} 
                    bottomSeparator={index === fields.length - 1 ? "none" : "standard"}
                >
                    <ControlGuideKey button={field.value} />
                </Field>
            ))}
        </div>
    );
};

export const RetrodeckSpinner = ({ size = 64 }: { size?: number }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <style>{`
            @keyframes retrodeck-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `}</style>
        <img
            alt="Loading"
            src={retrodeckLogo}
            width={size}
            height={size}
            style={{ animation: "retrodeck-spin 1.2s linear infinite" }}
        />
    </div>
);

export const useDialogContentStyling = (contentRef: RefObject<HTMLDivElement | null>) => {
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;

        let parent: HTMLElement | null = el.parentElement;
        while (parent) {
            if (parent.classList.contains("DialogContent")) {
                parent.style.width = "95vw";
                parent.style.maxWidth = "95vw";
                parent.style.padding = "12px";
                break;
            }
            parent = parent.parentElement;
        }
    }, [contentRef]);
};
