import { DialogButton, Field, Focusable, PanelSectionRow, findSP, showModal } from "@decky/ui";
import { useRef, useEffect, useCallback, RefObject } from "react";
import { FaFileAlt, FaInfoCircle } from "react-icons/fa";
import { ButtonItemIconContent } from "./shared";
import { useMenuContext } from "../context";
import { Action } from "../interfaces";
import { getIconPath } from "../utils";
import { ActionModal } from "./action-modal";
import { PdfViewerModal } from "./viewers/pdf-viewer";
import { DocumentListModal } from "./document-list-modal";

export const ActionsComponent = () => {
    const { displayedActions } = useMenuContext();

    if (displayedActions.length === 0) {
        return <div style={{ textAlign: 'center' }}>There are no actions available.</div>;
    }

    const uncategorizedActions = displayedActions.filter(action => !action.category);

    const categorizedActions = displayedActions
        .filter(action => !uncategorizedActions.some(a => a.name === action.name))
        .reduce((acc, action) => {
            const category = action.category;

            if (!category) {
                return acc;
            }

            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(action);
            return acc;
        }, {} as Record<string, Action[]>);


    const categoryEntries = Object.entries(categorizedActions);
    const firstCategoryIsFirst = uncategorizedActions.length === 0;

    return <div>
        {uncategorizedActions.map((action, index) => (
            <ActionComponent action={action} key={action.id} isFirst={index === 0} />
        ))}
        {categoryEntries.map(([category, actionsForCategory], index) => (
            <CategoryComponent category={category} actionsForCategory={actionsForCategory} key={category} isFirst={firstCategoryIsFirst && index === 0} />
        ))}
    </div>;
}

export const CategoryComponent = ({ category, actionsForCategory, isFirst }: { category: string, actionsForCategory: Action[], isFirst?: boolean }) => {
    const { openedCategory, setOpenedCategory, focusedElement, setFocusedElement } = useMenuContext();
    const { ref } = useFocusElement(focusedElement, `category:${category}`, isFirst);

    const onFocus = useCallback(() => setFocusedElement(`category:${category}`), [setFocusedElement, category]);

    return <div key={category} ref={ref}>
        <ActionButton
            onClick={() => {
                if (category === openedCategory) {
                    setOpenedCategory(null);
                } else {
                    setOpenedCategory(category);
                }
            }}
            onFocus={onFocus}
            icon={<img src={getIconPath(`RD-zoom-${openedCategory === category ? 'out' : 'in'}`)} width={24} height={24} />}
        >
            {category}
        </ActionButton>
        {openedCategory === category && <div style={{ marginLeft: '15px' }}>
            {actionsForCategory.map((action) => (
                <ActionComponent action={action} key={action.id} />
            ))}
        </div>}
    </div>;
}

export const ActionComponent = ({ action, isFirst }: { action: Action, isFirst?: boolean }) => {
    const { handleAction, gameEvent, focusedElement, setFocusedElement } = useMenuContext();
    const { ref, isFocused } = useFocusElement(focusedElement, `action:${action.id}`, isFirst);

    const onFocus = useCallback(() => setFocusedElement(`action:${action.id}`), [setFocusedElement, action.id]);

    if (!gameEvent) {
        return <div />;
    }

    const icon = action.icon.type === 'path'
        ? <img alt={action.name} src={getIconPath(action.icon.value)} width={24} height={24} />
        : 'v';


    const openManualListModal = () => {
        setFocusedElement(null);
        showModal(
            <DocumentListModal 
                gameEvent={gameEvent} 
                onClose={() => setFocusedElement(`action:${action.id}`)} 
            />,
            findSP()
        );
    };

    const onOpenModal = () => {
        if (isManualViewAction) {
            openManualListModal();
        } else {
            setFocusedElement(null);
            showModal(<ActionModal action={action} onClose={() => setFocusedElement(`action:${action.id}`)} />, findSP());
        }
    };

    const isManualViewAction = action.action.type === 'builtin' && action.action.operation === 'view_manual';
    const showInfoButton = isFocused && (action.action.type !== 'builtin' || isManualViewAction);
    const isDisabled = (action.action.type === 'hotkey' && action.action.operation === 'hold')
        || action.disabled
        || (isManualViewAction && !gameEvent.manual_path);

    const onHandleAction = () => {
        if (isManualViewAction) {
            if (gameEvent.manual_path) {
                setFocusedElement(null);
                showModal(
                    <PdfViewerModal
                        pdfPath={gameEvent.manual_path}
                        title={gameEvent.name}
                        onClose={() => setFocusedElement(`action:${action.id}`)}
                    />,
                    findSP()
                );
            }
            return;
        }

        handleAction(action);
    };

    return <div ref={ref}>
        <ActionButton
            onClick={onHandleAction}
            onFocus={onFocus}
            icon={icon}
            disabled={isDisabled}
            showInfoButton={showInfoButton}
            onInfoClick={onOpenModal}
            infoIcon={isManualViewAction ? <FaFileAlt /> : <FaInfoCircle />}
        >
            {action.name}
        </ActionButton>
    </div>;
}

interface ActionButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
    disabled?: boolean;
    onFocus?: () => void;
    showInfoButton?: boolean;
    onInfoClick?: () => void;
    infoIcon?: React.ReactNode;
}

const ActionButton = (props: ActionButtonProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !props.onFocus) {
            return;
        }

        const button = container.querySelector("button");
        if (!button) {
            return;
        }

        const observer = new MutationObserver(() => {
            if (button.classList.contains("gpfocus")) {
                props.onFocus?.();
            }
        });

        observer.observe(button, { attributes: true, attributeFilter: ["class"] });

        return () => {
            observer.disconnect();
        };
    }, [props.onFocus]);

    return <div ref={containerRef}>
        <PanelSectionRow>
            <Field childrenLayout="below" childrenContainerWidth="max">
                <Focusable className="FocusRegion" style={{ display: "flex", gap: "10px" }}>
                    <DialogButton
                        style={{ flex: 1, minWidth: "0" }}
                        onClick={props.onClick}
                        disabled={props.disabled}
                    >
                        <ButtonItemIconContent icon={props.icon}>
                            {props.children}
                        </ButtonItemIconContent>
                    </DialogButton>
                    {props.showInfoButton && (
                        <DialogButton
                            style={{ minWidth: "0", width: "auto", paddingLeft: "12px", paddingRight: "12px" }}
                            onClick={props.onInfoClick}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {props.infoIcon ?? <FaInfoCircle />}
                            </div>
                        </DialogButton>
                    )}
                </Focusable>
            </Field>
        </PanelSectionRow>
    </div>;
}

const getScrollParent = (element: HTMLElement): HTMLElement | null => {
    let parent = element.parentElement;
    while (parent) {
        const { overflow, overflowY } = getComputedStyle(parent);
        if (['auto', 'scroll'].includes(overflow) || ['auto', 'scroll'].includes(overflowY)) {
            return parent;
        }
        parent = parent.parentElement;
    }
    return null;
};

const useFocusElement = (focusedElement: string | null, elementId: string, scrollToTop?: boolean): { ref: RefObject<HTMLDivElement | null>, isFocused: boolean } => {
    const ref = useRef<HTMLDivElement>(null);
    const isFocused = focusedElement === elementId;

    useEffect(() => {
        if (isFocused && ref.current) {
            if (scrollToTop) {
                const scrollParent = getScrollParent(ref.current);
                scrollParent?.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            const button = ref.current.querySelector("button");
            
            const sp = findSP();
            if (button && sp?.document.activeElement !== button) {
                button.focus();
            }
        }
    }, [isFocused]);

    return { ref, isFocused };
};