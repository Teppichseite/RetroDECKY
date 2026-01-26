import { Action, GameEvent } from "./interfaces";

export const filterActions = (actions: Action[], gameEvent: GameEvent): Action[] => {
    return actions
        .filter((action) => {
            if (action.systems === '*') {
                return true;
            }
            return action.systems.includes(gameEvent.system_name);
        })
        .filter((action) => {
            if (action.emulators === '*') {
                return true;
            }

            return action.emulators.some((emulator) => {
                const emulatorRequirement = typeof emulator === 'string' ? [emulator] : emulator;

                return emulatorRequirement.every((e, i) => {
                    return e === gameEvent.emulator_name[i];
                });
            });
        });
}

export const adjustCategories = (actions: Action[]): Action[] => {
    return actions
        .map<Action>(({ category, ...action }) => {
            if (category === 'Quick Menu') {
                return action;
            }
            return {
                ...action,
                category
            };
        }).sort((a, b) => {
            if (!a.category && !b.category) {
                return 0;
            }

            if (!a.category && b.category) {
                return -1;
            }

            if (a.category && !b.category) {
                return 1;
            }

            return 0;
        });
}

export const getIconPath = (iconName: string) => {
    return `http://127.0.0.1:1337/plugins/RetroDeck%20Menu/dist/retrodeck-icons/${iconName}.png`;
}