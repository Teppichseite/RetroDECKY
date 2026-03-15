

/*
 NOTE: This component is still quite messy and serves
 as a proof of concept for PDF viewing and controller
 navigation. It will be refined and cleaned up later.
*/

import { useEffect, useRef, useState, useMemo } from 'react';

import { SteamClient } from "@decky/ui/dist/globals/steam-client";
import { ControllerInputGamepadButton } from '@decky/ui/dist/globals/steam-client/Input';
import { PdfViewState } from '../interfaces';
import { getIconPath } from '../utils';
import { Field, Focusable, ModalRoot, ModalRootProps, Spinner, findSP, gamepadDialogClasses } from '@decky/ui';

import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs";
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc as string;

const BUTTON_LEFT = [ControllerInputGamepadButton.GAMEPAD_BUTTON_DPAD_LEFT, ControllerInputGamepadButton.GAMEPAD_LEFTSTICK_LEFT];
const BUTTON_RIGHT = [ControllerInputGamepadButton.GAMEPAD_BUTTON_DPAD_RIGHT, ControllerInputGamepadButton.GAMEPAD_LEFTSTICK_RIGHT];
const BUTTON_UP = [ControllerInputGamepadButton.GAMEPAD_BUTTON_DPAD_UP, ControllerInputGamepadButton.GAMEPAD_LEFTSTICK_UP];
const BUTTON_DOWN = [ControllerInputGamepadButton.GAMEPAD_BUTTON_DPAD_DOWN, ControllerInputGamepadButton.GAMEPAD_LEFTSTICK_DOWN];

const DEFAULT_ZOOM = 1;
const MAX_ZOOM = 3;
const MIN_ZOOM = 1;
const ZOOM_STEP = 0.3;

const OFFSET_STEP = 20;

declare var SteamClient: SteamClient;

const ControlGuideKey = ({ button }: { button: string }) => (
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

interface ControlsGuideProps {
    isZoomed: boolean;
    pageNumber: number;
    totalPages: number;
}

const ControlsGuide = ({ isZoomed, pageNumber, totalPages }: ControlsGuideProps) => (
    <div
        className={gamepadDialogClasses.GamepadDialogContent}
        style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            pointerEvents: "none",
            width: "auto",
            minWidth: 150,
            padding: "16px 20px",
            background: "#0e141b",
            color: "#dcdedf",
            border: "2px solid #23262e"
        }}
    >
        <div style={{
            display: "flex",
            alignItems: "center",
            columnGap: "12px",
            marginBottom: "12px",
        }}>
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                <img alt="RetroDECK" src={getIconPath("RD-retrodeck-compact")} width={32} height={32} />
            </div>
            <div style={{
                fontWeight: "bold",
                fontSize: "16px",
            }}>
                Controls
            </div>
        </div>
        <Field label="Zoom In" bottomSeparator="standard">
            <ControlGuideKey button="R1" />
        </Field>
        <Field label="Zoom Out" bottomSeparator="standard">
            <ControlGuideKey button="L1" />
        </Field>
        <Field label={isZoomed ? "Pan Left" : "Prev Page"} bottomSeparator="standard">
            <ControlGuideKey button="◀" />
        </Field>
        <Field label={isZoomed ? "Pan Right" : "Next Page"} bottomSeparator="standard">
            <ControlGuideKey button="▶" />
        </Field>
        <Field label="Pan Up" bottomSeparator="standard">
            <ControlGuideKey button="▲" />
        </Field>
        <Field label="Pan Down" bottomSeparator="standard">
            <ControlGuideKey button="▼" />
        </Field>
        <Field label="Page" bottomSeparator="none">
            <ControlGuideKey button={`${pageNumber} / ${totalPages}`} />
        </Field>
    </div>
);

export interface PdfViewerProps {
    pdfPath: string;
}

export const PdfViewer = ({ pdfPath }: PdfViewerProps) => {

    const [viewState, setViewState] = useState<PdfViewState>({
        pageNumber: 1,
        zoom: 1,
        totalPages: 1,
        position: { x: 0, y: 0 }
    });

    const focusableRef = useRef<HTMLDivElement>(null);

    const pageHeight = useMemo(() => Math.floor(findSP().innerHeight * 0.85), []);

    const [documentLoaded, setDocumentLoaded] = useState(false);
    const [pageRendered, setPageRendered] = useState(false);

    useEffect(() => {
        setPageRendered(false);
    }, [viewState.pageNumber]);

    const fileSource = useMemo(() => {
        const cleaned = pdfPath.replace(/\\/g, "");
        return {
            url: encodeURI(cleaned),
            useSystemFonts: true,
            disableFontFace: true,
            verbosity: pdfjs.VerbosityLevel.INFOS,
            wasmUrl: "/plugins/RetroDECKY/dist/pdfjs-dist/wasm/",
            enableHWA: true,
        };
    }, [pdfPath]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setDocumentLoaded(true);
        setViewState((prev) => ({
            ...prev,
            totalPages: numPages
        }));
    };

    const goToNextPage = () => {
        if (viewState.pageNumber >= viewState.totalPages) return;
        setViewState((prev) => ({
            ...prev,
            pageNumber: prev.pageNumber + 1
        }));
    }

    const goToPreviousPage = () => {
        if (viewState.pageNumber <= 1) return;
        setViewState((prev) => ({
            ...prev,
            pageNumber: prev.pageNumber - 1
        }));
    }

    const zoomIn = () => {
        if (viewState.zoom >= MAX_ZOOM) return;
        setViewState((prev) => {
            const newZoom = prev.zoom + ZOOM_STEP;
            return {
                ...prev,
                position: newZoom <= DEFAULT_ZOOM ? { x: 0, y: 0 } : prev.position,
                zoom: newZoom
            }
        });
    }

    const zoomOut = () => {
        if (viewState.zoom <= MIN_ZOOM) return;
        setViewState((prev) => {
            const newZoom = prev.zoom - ZOOM_STEP;
            return {
                ...prev,
                position: newZoom <= DEFAULT_ZOOM ? { x: 0, y: 0 } : prev.position,
                zoom: newZoom
            }
        });
    }

    const moveX = (x: number) => {
        setViewState((prev) => ({
            ...prev,
            position: { x: prev.position.x + x, y: prev.position.y }
        }));
    }

    const moveY = (y: number) => {
        setViewState((prev) => ({
            ...prev,
            position: { x: prev.position.x, y: prev.position.y + y }
        }));
    }

    useEffect(() => {

        focusableRef.current?.focus();

        const unregisterable = SteamClient.Input.RegisterForControllerInputMessages((_, button, isPressed) => {

            console.log(button, isPressed);

            const takeFocus = () => {
                focusableRef.current?.focus();
            }

            if (!isPressed) {
                return;
            }

            if (button === ControllerInputGamepadButton.GAMEPAD_BUTTON_LSHOULDER) {
                zoomOut();
                takeFocus();
                return;
            }

            if (button === ControllerInputGamepadButton.GAMEPAD_BUTTON_RSHOULDER) {
                zoomIn();
                takeFocus();
                return;
            }

            const isDirectionPressed = (buttons: ControllerInputGamepadButton[]) => {
                return buttons.includes(button);
            };

            const moveOffset = viewState.zoom * OFFSET_STEP;

            if (isDirectionPressed(BUTTON_LEFT)) {
                if (viewState.zoom <= DEFAULT_ZOOM) {
                    goToPreviousPage();
                } else {
                    moveX(moveOffset);
                }
                takeFocus();
                return;
            }

            if (isDirectionPressed(BUTTON_RIGHT)) {
                if (viewState.zoom <= DEFAULT_ZOOM) {
                    goToNextPage();
                } else {
                    moveX(-moveOffset);
                }
                takeFocus();
                return;
            }

            if (isDirectionPressed(BUTTON_UP)) {
                moveY(moveOffset);
                takeFocus();
                return;
            }

            if (isDirectionPressed(BUTTON_DOWN)) {
                moveY(-moveOffset);
                takeFocus();
                return;
            }
        });

        return () => {
            unregisterable.unregister();
        };
    }, [viewState, setViewState, pdfPath]);

    const isZoomed = viewState.zoom > DEFAULT_ZOOM;

    return (
        <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            position: "relative",
        }}>
            <ControlsGuide
                isZoomed={isZoomed}
                pageNumber={viewState.pageNumber}
                totalPages={viewState.totalPages}
            />

            <Focusable
                noFocusRing
                ref={focusableRef}
                onActivate={() => { }}
            >
                {!(documentLoaded && pageRendered) && <div>Loading...</div>}
                <div style={{
                    transform: `translate(${viewState.position.x}px, ${viewState.position.y}px) scale(${viewState.zoom})`,
                    transformOrigin: "center center",
                    visibility: documentLoaded && pageRendered ? "visible" : "hidden",
                }}>
                    <Document
                        file={fileSource}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={(error) => console.error("PDF load error:", error)}
                        error={<div>Failed to load PDF. Check console for details.</div>}
                    >
                        <Page
                            pageNumber={viewState.pageNumber}
                            height={pageHeight}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            onRenderSuccess={() => setPageRendered(true)}
                        />
                    </Document>
                </div>
            </Focusable>
        </div>
    );
};

export interface PdfViewerModalProps extends ModalRootProps {
    pdfPath: string;
    onClose?: () => void;
}

export const PdfViewerModal = (props: PdfViewerModalProps) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;

        let parent: HTMLElement | null = el.parentElement;
        while (parent) {
            if (parent.classList.contains("DialogContent")) {
                parent.style.width = "90vw";
                parent.style.maxWidth = "90vw";
                break;
            }
            parent = parent.parentElement;
        }
    }, []);

    return (
        <ModalRoot
            onCancel={() => {
                props.closeModal?.();
                props.onClose?.();
            }}
        >
            <div
                ref={contentRef}
                style={{
                    width: "100%",
                    height: "80vh",
                }}
            >
                <PdfViewer pdfPath={props.pdfPath} />
            </div>
        </ModalRoot>
    );
};
