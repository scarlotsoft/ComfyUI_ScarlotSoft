import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.CheckpointClipSkip",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_CheckpointClipSkip") {
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                // Mantenemos la paleta premium de ScarlotSoft
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";
            };
        }
    }
});