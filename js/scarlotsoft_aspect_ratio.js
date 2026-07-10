import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.AspectRatioUI",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_AspectRatio") {
            
            // Fórmula compacta restaurada
            const computeSize = nodeType.prototype.computeSize;
            nodeType.prototype.computeSize = function(out) {
                let size = computeSize ? computeSize.apply(this, arguments) : [300, 58];
                size[0] = Math.max(size[0], 300);
                
                // Altura justa para el título y el widget
                let minHeight = LiteGraph.NODE_TITLE_HEIGHT + (this.widgets ? this.widgets.length * LiteGraph.NODE_SLOT_HEIGHT : 0);
                size[1] = Math.max(size[1], minHeight);
                return size;
            };

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                // Colores oficiales de la suite
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";
            };

            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function () {
                if (onConfigure) onConfigure.apply(this, arguments);
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
            };
        }
    }
});