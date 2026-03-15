

/*
 NOTE: This component is still quite messy and serves
 as a proof of concept for PDF viewing and controller
 navigation. It will be refined and cleaned up later.
*/

import { useEffect, useRef, useState, useMemo } from 'react';

import { PdfViewState } from '../interfaces';
import { getIconPath } from '../utils';
import { Field, Focusable, ModalRoot, ModalRootProps, findSP, GamepadButton } from '@decky/ui';
import retrodeckLogo from "../../assets/logo/icon-RetroDECKY.svg";

import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs";
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc as string;

const DEFAULT_ZOOM = 1;
const MAX_ZOOM = 3;
const MIN_ZOOM = 1;
const ZOOM_STEP = 0.3;

const OFFSET_STEP = 20;

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

interface PdfInfoProps {
    pageNumber: number;
    totalPages: number;
    title: string;
    zoom: number;
}

const PdfInfo = ({ pageNumber, totalPages, title, zoom }: PdfInfoProps) => (
    <div
        style={{
            position: "absolute",
            left: 0,
            top: 0,
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
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "12px",
        }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", marginTop: "8px" }}>
                <img alt="RetroDECK" src={getIconPath("RD-preferences-desktop-display")} width={32} height={32} />
            </div>
            <div style={{
                fontWeight: "bold",
                fontSize: "16px",
                textAlign: "center",
                marginBottom: "8px",
            }}>
                Manual Viewer
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
        <Field label="Zoom" bottomSeparator="standard">
            <ControlGuideKey button={`${Math.round(zoom * 100)}%`} />
        </Field>
        <Field label="Page" bottomSeparator="none">
            <ControlGuideKey button={`${pageNumber} / ${totalPages}`} />
        </Field>
    </div>
);

export interface PdfViewerProps {
    pdfPath: string;
    title: string;
}

export const PdfViewer = ({ pdfPath, title }: PdfViewerProps) => {

    const [viewState, setViewState] = useState<PdfViewState>({
        pageNumber: 1,
        zoom: 1,
        totalPages: 1,
        position: { x: 0, y: 0 }
    });


    const pageHeight = useMemo(() => Math.floor(findSP().innerHeight * 0.80), []);
    const pageWidth = useMemo(() => Math.floor(findSP().innerWidth * 0.80), []);

    const [documentLoaded, setDocumentLoaded] = useState(false);
    const [pageRendered, setPageRendered] = useState(false);

    // Reset state when PDF path changes
    useEffect(() => {
        setDocumentLoaded(false);
        setPageRendered(false);
        setViewState({
            pageNumber: 1,
            zoom: 1,
            totalPages: 1,
            position: { x: 0, y: 0 }
        });
    }, [pdfPath]);

    useEffect(() => {
        setPageRendered(false);
    }, [viewState.pageNumber]);

    const handleButtonDown = (evt: { detail: { button: number } }) => {
        const button = evt.detail.button;
        const moveOffset = viewState.zoom * OFFSET_STEP;

        if (button === GamepadButton.BUMPER_LEFT) {
            zoomOut();
            return;
        }

        if (button === GamepadButton.BUMPER_RIGHT) {
            zoomIn();
            return;
        }

        if (button === GamepadButton.DIR_LEFT) {
            if (viewState.zoom <= DEFAULT_ZOOM) {
                goToPreviousPage();
            } else {
                moveX(moveOffset);
            }
            return;
        }

        if (button === GamepadButton.DIR_RIGHT) {
            if (viewState.zoom <= DEFAULT_ZOOM) {
                goToNextPage();
            } else {
                moveX(-moveOffset);
            }
            return;
        }

        if (button === GamepadButton.DIR_UP) {
            moveY(moveOffset);
            return;
        }

        if (button === GamepadButton.DIR_DOWN) {
            moveY(-moveOffset);
            return;
        }
    };

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
        setViewState((prev) => {
            if (prev.pageNumber >= prev.totalPages) {
                // If on last page, go to first page
                return {
                    ...prev,
                    pageNumber: 1
                };
            }
            return {
                ...prev,
                pageNumber: prev.pageNumber + 1
            };
        });
    }

    const goToPreviousPage = () => {
        setViewState((prev) => {
            if (prev.pageNumber <= 1) {
                // If on first page, go to last page
                return {
                    ...prev,
                    pageNumber: prev.totalPages
                };
            }
            return {
                ...prev,
                pageNumber: prev.pageNumber - 1
            };
        });
    }

    const clampPosition = (position: { x: number; y: number }) => {
        const maxPanX = pageWidth / 2;
        const maxPanY = pageHeight / 2;
        return {
            x: Math.max(-maxPanX, Math.min(maxPanX, position.x)),
            y: Math.max(-maxPanY, Math.min(maxPanY, position.y))
        };
    }

    const zoomIn = () => {
        if (viewState.zoom >= MAX_ZOOM) return;
        setViewState((prev) => {
            const newZoom = prev.zoom + ZOOM_STEP;
            const newPosition = newZoom <= DEFAULT_ZOOM ? { x: 0, y: 0 } : prev.position;
            return {
                ...prev,
                position: clampPosition(newPosition),
                zoom: newZoom
            }
        });
    }

    const zoomOut = () => {
        if (viewState.zoom <= MIN_ZOOM) return;
        setViewState((prev) => {
            const newZoom = prev.zoom - ZOOM_STEP;
            const newPosition = newZoom <= DEFAULT_ZOOM ? { x: 0, y: 0 } : prev.position;
            return {
                ...prev,
                position: clampPosition(newPosition),
                zoom: newZoom
            }
        });
    }

    const moveX = (x: number) => {
        setViewState((prev) => {
            const newPosition = { x: prev.position.x + x, y: prev.position.y };
            return {
                ...prev,
                position: clampPosition(newPosition)
            };
        });
    }

    const moveY = (y: number) => {
        if (viewState.zoom <= MIN_ZOOM) return;
        setViewState((prev) => {
            const newPosition = { x: prev.position.x, y: prev.position.y + y };
            return {
                ...prev,
                position: clampPosition(newPosition)
            };
        });
    }


    const isZoomed = viewState.zoom > DEFAULT_ZOOM;

    const actionDescriptionMap = isZoomed
        ? {
            [GamepadButton.BUMPER_LEFT]: "Zoom Out",
            [GamepadButton.BUMPER_RIGHT]: "Zoom In",
            [GamepadButton.DIR_LEFT]: "Pan Left",
            [GamepadButton.DIR_RIGHT]: "Pan Right",
            [GamepadButton.DIR_UP]: "Pan Up",
            [GamepadButton.DIR_DOWN]: "Pan Down",
        }
        : {
            [GamepadButton.BUMPER_LEFT]: "Zoom Out",
            [GamepadButton.BUMPER_RIGHT]: "Zoom In",
            [GamepadButton.DIR_LEFT]: "Previous Page",
            [GamepadButton.DIR_RIGHT]: "Next Page",
        };

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
            <style>{`
                .react-pdf__Page {
                    background: transparent !important;
                    background-color: transparent !important;
                }
            `}</style>
            <PdfInfo
                pageNumber={viewState.pageNumber}
                totalPages={viewState.totalPages}
                title={title}
                zoom={viewState.zoom}
            />

            {
                !(documentLoaded && pageRendered) &&
                <div style={{
                    position: "absolute", 
                    top: 0, 
                    left: 0, 
                    width: "100%", 
                    height: "100%", 
                    display: "flex", 
                    justifyContent: "center", 
                    alignItems: "center"
                }}
                ><RetrodeckSpinner /></div>
            }


            <Focusable
                noFocusRing
                onActivate={() => { }}
                actionDescriptionMap={actionDescriptionMap}
                onButtonDown={handleButtonDown}
            >
                <div style={{
                    transform: `translate(${viewState.position.x}px, ${viewState.position.y}px) scale(${viewState.zoom})`,
                    transformOrigin: "center center",
                    height: pageHeight,
                }}>
                    <Document
                        key={`document-${pdfPath}`}
                        file={fileSource}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={(error) => console.error("PDF load error:", error)}
                        error={<div>Failed to load PDF. Check console for details.</div>}
                        loading={<></>}
                    >
                        <Page
                            pageNumber={viewState.pageNumber}
                            height={pageHeight}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            onRenderSuccess={() => setPageRendered(true)}
                            canvasBackground="transparent"
                            loading={<></>}
                        />
                    </Document>
                </div>
            </Focusable>
        </div>
    );
};

export interface PdfViewerModalProps extends ModalRootProps {
    pdfPath: string;
    title: string;
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
                parent.style.width = "95vw";
                parent.style.maxWidth = "95vw";
                parent.style.padding = "12px";
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
                    height: "100%",
                }}
            >
                <PdfViewer pdfPath={props.pdfPath} title={props.title} />
            </div>
            
        </ModalRoot>
    );
};

const RetrodeckSpinner = ({ size = 64 }: { size?: number }) => (
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
