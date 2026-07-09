import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.KSamplerConfig",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_KSamplerConfig") {
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                // Aplicamos tu identidad de marca (Colores ScarlotSoft)
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";
            };

            // Opcional: Podemos asegurarnos de que el texto de los conectores
            // sea blanco al renderizar, igual que en el resto de tu UI.
            const onDrawForeground = nodeType.prototype.onDrawForeground;
            nodeType.prototype.onDrawForeground = function (ctx) {
                if (onDrawForeground) onDrawForeground.apply(this, arguments);
            };
        }
    }
});