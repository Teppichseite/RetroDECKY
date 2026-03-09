import { ButtonItem, PanelSectionRow } from "@decky/ui";
import { useRef, useEffect, useState } from "react";
import { ButtonItemIconContent } from "./shared";
import { useMenuContext } from "../context";
import { Action } from "../interfaces";
import { getIconPath } from "../utils";
import { getSettingBe } from "../backend";

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
    const buttonRef = useRef<HTMLDivElement>(null);
    
    const isFocused = focusedElement === `category:${category}`;
    
    useEffect(() => {
        if (isFocused && buttonRef.current) {
            buttonRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            const buttonItem = buttonRef.current.querySelector("button");
            buttonItem?.focus();
        }
    }, [isFocused]);
    
    return <div key={category} ref={buttonRef}>
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
    const { handleAction, heldActions, gameEvent, focusedElement, setFocusedElement } = useMenuContext();
    const buttonRef = useRef<HTMLDivElement>(null);
    
    const isFocused = focusedElement === `action:${action.id}`;
    
    useEffect(() => {
        if (isFocused && buttonRef.current) {
            buttonRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            const buttonItem = buttonRef.current.querySelector("button");
            buttonItem?.focus();
        }
    }, [isFocused]);

    if (!gameEvent) {
        return <div />;
    }

    const icon = action.icon.type === 'path'
        ? <img alt={action.name} src={getIconPath(action.icon.value)} width={24} height={24} />
        : 'v';

    const isHoldAction = action.action.type === 'hotkey' && action.action.operation === 'hold';

    const isHeld = heldActions.includes(action.id);

    const textAddition = `${isHoldAction ? isHeld ? ' - Release' : ' - Hold' : ''}`;

    const isManualViewAction = action.action.type === 'builtin' && action.action.operation === 'view_manual';

    return <div ref={buttonRef}>
        <ActionButton
            onClick={() => handleAction(action)}
            onFocus={() => setFocusedElement(`action:${action.id}`)}
            icon={icon}
            disabled={isManualViewAction && !gameEvent.manual_path}
        >
            {action.name}{textAddition}
        </ActionButton>
    </div>;
}

interface ActionButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
    disabled?: boolean;
    onFocus?: () => void;
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
        
        const handleFocus = () => {
            props.onFocus?.();
        };
        
        button.addEventListener('focus', handleFocus);
        
        return () => {
            button.removeEventListener('focus', handleFocus);
        };
    }, [props.onFocus]);
    
    return <div ref={containerRef}>
        <PanelSectionRow>
            <ButtonItem
                layout="below"
                onClick={props.onClick}
                disabled={props.disabled}
            >
                <ButtonItemIconContent icon={props.icon} >
                    {props.children}
                </ButtonItemIconContent>
            </ButtonItem>
        </PanelSectionRow>
    </div>;
}