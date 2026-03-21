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
                    return e?.toLowerCase() === gameEvent.emulator_name[i]?.toLowerCase();
                });
            });
        });
}

export const adjustCategories = (actions: Action[]): Action[] => {
    return actions
        .map<Action>(({ category, ...action }) => {
            if (['Quick Menu', 'Quick'].includes(category ?? '')) {
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

export const getDistPath = () => {
    return `http://127.0.0.1:1337/plugins/RetroDECKY/dist/`;
}

export const getIconPath = (iconName: string) => {
    return `${getDistPath()}retrodeck-icons/${iconName}.png`;
}