import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.FromBatchUI",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_FromBatch") {
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                // Aplicar colores de la suite
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";
                
                // Tamaño inicial limpio
                this.size = [300, 100];
            };

            // Blindaje de tamaño mínimo
            const computeSize = nodeType.prototype.computeSize;
            nodeType.prototype.computeSize = function(out) {
                let size = computeSize ? computeSize.apply(this, arguments) : [300, 100];
                size[0] = Math.max(size[0], 300);
                return size;
            };

            // Mantener estilo al cargar workflows guardados
            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function () {
                if (onConfigure) onConfigure.apply(this, arguments);
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
            };
        }
    }
});