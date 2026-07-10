import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.YoloUI",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_YOLOSegmenter") {
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";
                
                // Más alto para acomodar los 5 widgets (YOLO, conf, iou, SAM, hint)
                this.size = [330, 180]; 
            };

            const computeSize = nodeType.prototype.computeSize;
            nodeType.prototype.computeSize = function(out) {
                let size = computeSize ? computeSize.apply(this, arguments) : [330, 180];
                size[0] = Math.max(size[0], 330);
                
                // Altura dinámica: 40px base + 24px por cada widget
                let minHeight = 40 + (this.widgets ? this.widgets.length * 24 : 0);
                size[1] = Math.max(size[1], minHeight);
                return size;
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