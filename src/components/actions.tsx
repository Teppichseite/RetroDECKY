import { DialogButton, Field, Focusable, PanelSectionRow, findSP, showModal } from "@decky/ui";
import { useRef, useEffect, useState, RefObject } from "react";
import { FaInfoCircle } from "react-icons/fa";
import { ButtonItemIconContent } from "./shared";
import { useMenuContext } from "../context";
import { Action } from "../interfaces";
import { getIconPath } from "../utils";
import { getSettingBe } from "../backend";
import { ActionModal } from "./action-modal";

const useFocusElement = (focusedElement: string | null, elementId: string): { ref: RefObject<HTMLDivElement | null>, isFocused: boolean } => {
    const ref = useRef<HTMLDivElement>(null);
    const isFocused = focusedElement === elementId;

    useEffect(() => {
        if (isFocused && ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            const button = ref.current.querySelector("button");
            button?.focus();
        }
    }, [isFocused]);

    return { ref, isFocused };
};

export const ActionsComponent = () => {
    const { displayedActions } = useMenuContext();
    const [showManualButton, setShowManualButton] = useState(false);

    useEffect(() => {
        getSettingBe("showManualButton").then((value) => {
            setShowManualButton(!!value);
        });
    }, []);

    const actions = showManualButton
        ? displayedActions
        : displayedActions.filter(
            (action) => !(action.action.type === 'builtin' && action.action.operation === 'view_manual')
        );

    if (actions.length === 0) {
        return <div style={{ textAlign: 'center' }}>There are no actions available.</div>;
    }

    const uncategorizedActions = actions.filter(action => !action.category);

    const categorizedActions = actions
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


    return <div>
        {uncategorizedActions.map((action) => (
            <ActionComponent action={action} key={action.id} />
        ))}
        {Object.entries(categorizedActions).map(([category, actionsForCategory]) => (
            <CategoryComponent category={category} actionsForCategory={actionsForCategory} key={category} />
        ))}
    </div>;
}

export const CategoryComponent = ({ category, actionsForCategory }: { category: string, actionsForCategory: Action[] }) => {
    const { openedCategory, setOpenedCategory, focusedElement, setFocusedElement } = useMenuContext();
    const { ref } = useFocusElement(focusedElement, `category:${category}`);

    return <div key={category} ref={ref}>
        <ActionButton
            onClick={() => {
                if (category === openedCategory) {
                    setOpenedCategory(null);
                } else {
                    setOpenedCategory(category);
                }
            }}
            onFocus={() => setFocusedElement(`category:${category}`)}
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

export const ActionComponent = ({ action }: { action: Action }) => {
    const { handleAction, gameEvent, focusedElement, setFocusedElement } = useMenuContext();
    const { ref, isFocused } = useFocusElement(focusedElement, `action:${action.id}`);

    if (!gameEvent) {
        return <div />;
    }

    const icon = action.icon.type === 'path'
        ? <img alt={action.name} src={getIconPath(action.icon.value)} width={24} height={24} />
        : 'v';


    const onOpenModal = () => {
        setFocusedElement(null);
        showModal(<ActionModal action={action} onClose={() => setFocusedElement(`action:${action.id}`)} />, findSP());
    };

    const showInfoButton = isFocused && action.action.type !== 'builtin';

    const isManualViewAction = action.action.type === 'builtin' && action.action.operation === 'view_manual';
    const isDisabled = (isManualViewAction && !gameEvent.manual_path) 
        || (action.action.type === 'hotkey' && action.action.operation === 'hold')
        || action.disabled;

    return <div ref={ref}>
        <ActionButton
            onClick={() => handleAction(action)}
            onFocus={() => setFocusedElement(`action:${action.id}`)}
            icon={icon}
            disabled={isDisabled}
            showInfoButton={showInfoButton}
            onInfoClick={onOpenModal}
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
                                <FaInfoCircle />
                            </div>
                        </DialogButton>
                    )}
                </Focusable>
            </Field>
        </PanelSectionRow>
    </div>;
}