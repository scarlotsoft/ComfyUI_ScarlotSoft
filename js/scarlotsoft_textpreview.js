import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.TextPreview",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_TextPreview") {
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";

                const slotIndex = this.findInputSlot("string_a");
                if (slotIndex > -1) {
                    this.removeInput(slotIndex);
                }
            };

            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function(message) {
                if (onExecuted) onExecuted.apply(this, arguments);
                
                if (message && message.text) {
                    const w = this.widgets?.find(w => w.name === "string_a");
                    if (w) {
                        w.value = message.text[0]; 
                        this.onResize?.(this.size); 
                        app.graph.setDirtyCanvas(true, true);
                    }
                }
            };
        }
    }
});