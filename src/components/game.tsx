import { Field, Focusable, PanelSection, staticClasses } from "@decky/ui";
import { ActionsComponent } from "./actions";
import { useMenuContext } from "../context";

export function Game() {

    const { gameEvent } = useMenuContext();

    if (!gameEvent) {
        return <div />;
    }

    return <div>
        <PanelSection>
            <Field className="FocusRegion" >
                <Focusable onActivate={() => { }}>
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        width: "100%",
                    }}>
                        {gameEvent.image_path && <img
                            src={gameEvent.image_path.replace(/\\/g, "")}
                            alt={gameEvent.name}
                            style={{ width: "60%", marginTop: '10px' }}
                        />}
                        <div className={staticClasses.PanelSectionTitle} style={{ marginTop: '20px', textAlign: 'center' }}>
                            {gameEvent.name}
                        </div>
                        <div style={{ marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
                            {gameEvent.system_full_name}
                        </div>
                    </div>
                </Focusable>
            </Field>
            <ActionsComponent />
        </PanelSection>
    </div>;
};