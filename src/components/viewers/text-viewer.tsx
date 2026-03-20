import { useEffect, useRef, useState, useMemo } from 'react';

import { Focusable, ModalRoot, ModalRootProps, findSP, GamepadButton } from '@decky/ui';
import { ViewerInfo, RetrodeckSpinner, useDialogContentStyling } from './viewers-shared';

const SCROLL_STEP = 50;
const PAGE_SCROLL_STEP = 500;
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 24;
const FONT_SIZE_DEFAULT = 12;
const FONT_SIZE_STEP = 2;

export interface TextViewerProps {
    txtPath: string;
    title: string;
}

export const TextViewer = ({ txtPath, title }: TextViewerProps) => {
    const [textContent, setTextContent] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const containerHeight = useMemo(() => Math.floor(findSP().innerHeight * 0.70), []);
    const containerWidth = useMemo(() => Math.floor(findSP().innerWidth * 0.70), []);

    // Load text file
    useEffect(() => {
        setIsLoading(true);
        setError(null);
        setTextContent("");

        const loadText = async () => {
            try {
                // txtPath should already be a server URL from the backend
                const cleanedPath = txtPath.replace(/\\/g, "");
                // If it's already a URL (starts with http), use it directly, otherwise encode
                const url = cleanedPath.startsWith('http') ? cleanedPath : encodeURI(cleanedPath);
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`Failed to load text file: ${response.statusText}`);
                }

                const text = await response.text();
                setTextContent(text);
            } catch (err) {
                console.error("Error loading text file:", err);
                setError(err instanceof Error ? err.message : "Failed to load text file");
            } finally {
                setIsLoading(false);
            }
        };

        loadText();
    }, [txtPath]);

    const scrollUp = (amount: number) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = Math.max(0, scrollContainerRef.current.scrollTop - amount);
        }
    };

    const scrollDown = (amount: number) => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            container.scrollTop = Math.min(
                container.scrollHeight - container.clientHeight,
                container.scrollTop + amount
            );
        }
    };

    const increaseFontSize = () => {
        setFontSize(prev => Math.min(FONT_SIZE_MAX, prev + FONT_SIZE_STEP));
    };

    const decreaseFontSize = () => {
        setFontSize(prev => Math.max(FONT_SIZE_MIN, prev - FONT_SIZE_STEP));
    };

    const handleButtonDown = (evt: { detail: { button: number } }) => {
        const button = evt.detail.button;

        if (button === GamepadButton.BUMPER_LEFT) {
            decreaseFontSize();
            return;
        }

        if (button === GamepadButton.BUMPER_RIGHT) {
            increaseFontSize();
            return;
        }

        if (button === GamepadButton.DIR_UP) {
            scrollUp(SCROLL_STEP);
            return;
        }

        if (button === GamepadButton.DIR_DOWN) {
            scrollDown(SCROLL_STEP);
            return;
        }

        if (button === GamepadButton.DIR_LEFT) {
            scrollUp(PAGE_SCROLL_STEP);
            return;
        }

        if (button === GamepadButton.DIR_RIGHT) {
            scrollDown(PAGE_SCROLL_STEP);
            return;
        }
    };

    const getScrollInfo = () => {
        if (!scrollContainerRef.current) {
            return { position: 0, totalHeight: 0 };
        }
        const container = scrollContainerRef.current;
        return {
            position: container.scrollTop,
            totalHeight: container.scrollHeight - container.clientHeight
        };
    };

    const [scrollInfo, setScrollInfo] = useState({ position: 0, totalHeight: 0 });

    useEffect(() => {
        const updateScrollInfo = () => {
            setScrollInfo(getScrollInfo());
        };

        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', updateScrollInfo);
            updateScrollInfo();
        }

        return () => {
            if (container) {
                container.removeEventListener('scroll', updateScrollInfo);
            }
        };
    }, [textContent]);

    const actionDescriptionMap = {
        [GamepadButton.BUMPER_LEFT]: "Smaller Text",
        [GamepadButton.BUMPER_RIGHT]: "Larger Text",
        [GamepadButton.DIR_UP]: "Scroll Up",
        [GamepadButton.DIR_DOWN]: "Scroll Down",
        [GamepadButton.DIR_LEFT]: "Page Up",
        [GamepadButton.DIR_RIGHT]: "Page Down",
    };

    return (
        <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "row",
            overflow: "hidden",
            position: "relative",
        }}>
            <ViewerInfo
                title={title}
                viewerTitle="Text Viewer"
                fields={[
                    {
                        label: "Text Size",
                        value: `${Math.round((fontSize / FONT_SIZE_MIN) * 100)}%`
                    },
                    {
                        label: "Position",
                        value: `${scrollInfo.totalHeight > 0 ? Math.round((scrollInfo.position / scrollInfo.totalHeight) * 100) : 0}%`
                    }
                ]}
            />

            <div style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
            }}>
                {isLoading && (
                    <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center"
                    }}>
                        <RetrodeckSpinner />
                    </div>
                )}

                {error && (
                    <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        color: "#dcdedf",
                        fontSize: "18px",
                        textAlign: "center",
                        padding: "20px"
                    }}>
                        {error}
                    </div>
                )}

                {!isLoading && !error && (
                    <Focusable
                        noFocusRing
                        onActivate={() => { }}
                        actionDescriptionMap={actionDescriptionMap}
                        onButtonDown={handleButtonDown}
                    >
                        <div
                            ref={scrollContainerRef}
                            style={{
                                width: containerWidth,
                                height: containerHeight,
                                overflow: "auto",
                                padding: "20px",
                                backgroundColor: "rgba(0, 0, 0, 0.3)",
                                borderRadius: "8px",
                                color: "#dcdedf",
                                fontSize: `${fontSize}px`,
                                lineHeight: "1.6",
                                fontFamily: "monospace",
                                whiteSpace: "pre-wrap",
                                wordWrap: "break-word",
                            }}
                        >
                            {textContent}
                        </div>
                    </Focusable>
                )}
            </div>
        </div>
    );
};

export interface TextViewerModalProps extends ModalRootProps {
    txtPath: string;
    title: string;
    onClose?: () => void;
}

export const TextViewerModal = (props: TextViewerModalProps) => {
    const contentRef = useRef<HTMLDivElement>(null);
    useDialogContentStyling(contentRef);

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
                <TextViewer txtPath={props.txtPath} title={props.title} />
            </div>
        </ModalRoot>
    );
};

