import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.StringToText",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_StringToText") {
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                // Aplicar paleta ScarlotSoft
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";

                // Cambiar la etiqueta visual del widget
                const w = this.widgets?.find(w => w.name === "string");
                if (w) {
                    w.label = "String";
                }
            };
        }
    }
});