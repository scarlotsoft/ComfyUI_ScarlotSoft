import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.SaveImage",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_SaveImage") {
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                // Aplicamos tu paleta de colores ScarlotSoft Premium
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";
                
                // Cambiamos el label visual del string nativo para mayor claridad
                if (this.widgets) {
                    const prefixW = this.widgets.find(w => w.name === "file_name_prefix");
                    if (prefixW) prefixW.label = "File Name Prefix";
                }
            };
        }
    }
});