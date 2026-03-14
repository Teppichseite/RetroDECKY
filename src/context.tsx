import { createContext, useCallback, useContext, ReactNode, useEffect, useState } from "react";
import { Action, GameEvent, PdfViewState, SetupState } from "./interfaces";
import {
    addEventListener,
    removeEventListener,
} from "@decky/api"
import { adjustCategories, filterActions } from "./utils";
import { useJsContextState } from "./hooks";
import { checkSetupStateBe, getActionsBe, getGameEventBe, mapBeSetupStateToSetupState } from "./backend";
import { Router } from "@decky/ui";
import { SteamClient } from "@decky/ui/dist/globals/steam-client";
import { FocusChangeEvent } from "@decky/ui/dist/globals/steam-client/system/UI";
import { pressHotkeys } from "./hotkey";

declare var SteamClient: SteamClient;

let lastFocusedChangedEvent: FocusChangeEvent | null = null;

export interface MenuContextValue {
    actions: Action[];
    gameEvent: GameEvent | null;
    displayedActions: Action[];
    pdfViewState: PdfViewState;
    setupState: SetupState | null;
    focusedElement: string | null;
    openedCategory: string | null;
    setPdfViewState: (pdfViewState: PdfViewState) => void;
    setGameEvent: (gameEvent: GameEvent | null) => void,
    handleAction: (action: Action) => void,
    setFocusedElement: (element: string | null) => void,
    setOpenedCategory: (category: string | null) => void,
}

const defaultPdfViewState: PdfViewState = {
    pageNumber: 1,
    zoom: 1.5,
    totalPages: 1,
    position: { x: 0, y: 0 }
}

export const MenuContext = createContext<MenuContextValue>({
    actions: [],
    gameEvent: null,
    displayedActions: [],
    pdfViewState: defaultPdfViewState,
    setupState: null,
    focusedElement: null,
    openedCategory: null,
    setPdfViewState: () => { },
    setGameEvent: () => { },
    handleAction: () => { },
    setFocusedElement: () => { },
    setOpenedCategory: () => { },
});

export interface MenuContextProviderProps {
    children: ReactNode;
}

export const MenuContextProvider = (props: MenuContextProviderProps) => {

    const [actions, setActions] = useState<Action[]>([]);
    const [displayedActions, setDisplayedActions] = useState<Action[]>([]);
    const [gameEvent, setGameEvent] = useState<GameEvent | null>(null);
    
    const [pdfViewState, setPdfViewState] = useJsContextState<PdfViewState>("pdf_view_state", defaultPdfViewState);

    const [setupState, setSetupState] = useState<SetupState | null>(null);

    const [focusedElement, setFocusedElement] = useJsContextState<string | null>("focused_action", null);
    const [openedCategory, setOpenedCategory] = useJsContextState<string | null>("focused_category", null);

    const handleGameEvent = useCallback((incomingEvent: GameEvent | null) => {
        if (!incomingEvent) {
            setFocusedElement(null);
            setOpenedCategory(null);
            setGameEvent(null);
            return;
        }

        if (incomingEvent.type === 'game_start') {
            setGameEvent(incomingEvent);
            return;
        }

        if (incomingEvent.type === 'game_end') {
            setFocusedElement(null);
            setOpenedCategory(null);
            setGameEvent(null);
            return;
        }
    }, [setGameEvent, setFocusedElement, setOpenedCategory]);

    useEffect(() => {
        getActionsBe().then((actions) => { 
            setActions(actions);
        });

        getGameEventBe().then((gameEvent) => {
            handleGameEvent(gameEvent);
        });
    }, [setActions, handleGameEvent]);

    useEffect(() => {

        checkSetupStateBe().then((setupState) => {
            setSetupState(mapBeSetupStateToSetupState(setupState));
        });

        const listener = addEventListener<any>("game_event", (event) => {
            const parsedEvent: GameEvent = JSON.parse(event);
            handleGameEvent(parsedEvent);
        });

        return () => {
            removeEventListener("game_event", listener);
        };
    }, [handleGameEvent]);

    useEffect(() => {
        if (!gameEvent) {
            //setPdfViewState(defaultPdfViewState);
            setDisplayedActions([]);
            return;
        }
        const filteredActions = filterActions(actions, gameEvent);
        const adjustedActions = adjustCategories(filteredActions);
        setDisplayedActions(adjustedActions);
    }, [gameEvent, actions]);

    useEffect(() => {
        if(gameEvent) {
            const unregisterable = SteamClient.System.UI.RegisterForFocusChangeEvents((event) => {
                lastFocusedChangedEvent = event;
            });

            return () => {
                unregisterable.unregister();
            };
        }

        return () => {};
    }, [gameEvent]);

    const handleHotkeyAction = (action: Action) => {
        if (action.action.type !== 'hotkey') {
            return;
        }

        const keys = action.action.keys;
        const type = action.action.operation;

        if(type !== 'press') {
            return;
        }

        Router.CloseSideMenus();
        setTimeout(() => {
            pressHotkeys(keys);
        }, 200);
    }

    const handleAction = (action: Action) => {
        if (action.action.type === 'hotkey') {
            handleHotkeyAction(action);
            return;
        }

        if (action.action.type === 'builtin') {

            if (action.action.operation === 'view_manual') {
                Router.CloseSideMenus();
                Router.Navigate("/retrodeck-menu/pdf-viewer");
                return;
            }

            if (action.action.operation === 'exit') {

                if (!lastFocusedChangedEvent) {
                    return;
                }

                const esDeApp = lastFocusedChangedEvent.rgFocusable.find((app) => app.strExeName === "es-de");
                
                if(!esDeApp) {
                    return;
                }

                const emulatorApp = lastFocusedChangedEvent.rgFocusable.find((app) => app.appid === esDeApp.appid);

                if(!emulatorApp) {
                    return;
                }

                SteamClient.System.UI.CloseGameWindow(emulatorApp.appid, emulatorApp.windowid);

                Router.CloseSideMenus();

                return;
            }
        }
    }

    const menuContextValue: MenuContextValue = {
        actions,
        gameEvent,
        displayedActions,
        pdfViewState,
        setupState,
        focusedElement,
        openedCategory,
        setPdfViewState,
        handleAction,
        setGameEvent,
        setFocusedElement,
        setOpenedCategory,
    };

    return <MenuContext.Provider value={menuContextValue}>
        {props.children}
    </MenuContext.Provider>;
}

export const useMenuContext = () => {
    return useContext(MenuContext);
}
