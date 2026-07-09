import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js"; 

app.registerExtension({
    name: "ScarlotSoft.WD14Tagger",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_WD14Tagger") {
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                // Aplicamos la paleta premium de ScarlotSoft
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";

                if (this.widgets) {
                    const excludeW = this.widgets.find(w => w.name === "exclude_tags");
                    if (excludeW) excludeW.label = "Exclude Tags";
                }
            };

            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                if (onExecuted) onExecuted.apply(this, arguments);
                
                if (message && message.tags) {
                    let resultWidget = this.widgets.find(w => w.name === "scarlot_results");
                    
                    if (!resultWidget) {
                        resultWidget = ComfyWidgets["STRING"](this, "scarlot_results", ["STRING", { multiline: true }], app).widget;
                        
                        // Diseño limpio y nativo, sin bordes intrusivos
                        if (resultWidget.inputEl) {
                            resultWidget.inputEl.readOnly = true;
                            resultWidget.inputEl.style.border = "1px solid #222222"; 
                            resultWidget.inputEl.style.backgroundColor = "rgba(0, 0, 0, 0.3)"; 
                            resultWidget.inputEl.style.color = "#cccccc";
                            resultWidget.inputEl.style.outline = "none";
                            resultWidget.inputEl.style.boxShadow = "none";
                        }
                    }
                    
                    resultWidget.value = message.tags[0];
                    
                    // Mantenemos el ancho que el usuario haya arrastrado, 
                    // pero dejamos que LiteGraph calcule la altura perfecta de forma nativa
                    this.setSize([this.size[0], this.computeSize()[1]]);
                    app.graph.setDirtyCanvas(true, true);
                }
            };
        }
    }
});