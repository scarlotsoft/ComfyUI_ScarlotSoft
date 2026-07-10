import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.TextPreview",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_TextPreview") {
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                // Tu estilo original
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";

                // Ocultar el punto de conexión de entrada
                const slotIndex = this.findInputSlot("string_a");
                if (slotIndex > -1) {
                    this.removeInput(slotIndex);
                }

                // --- NUEVO: CONTADOR DE TOKENS (Diseño ScarlotSoft) ---
                const counterWidget = this.addWidget("text", "Tokens", "0", "text");
                counterWidget.computeSize = () => [0, 26];
                
                counterWidget.draw = function(ctx, node, widget_width, y, widget_height) {
                    ctx.fillStyle = "#161616"; // Fondo súper oscuro
                    ctx.fillRect(15, y, widget_width - 30, widget_height);
                    
                    ctx.fillStyle = "#00ff44"; // Verde neón
                    ctx.textAlign = "right";
                    ctx.font = "12px Arial";
                    ctx.fillText("Approx Words: " + this.value, widget_width - 25, y + widget_height * 0.7);
                };

                // Función que busca el texto de 'string_a' y lo cuenta
                this.updatePreviewTokens = function() {
                    const w = this.widgets?.find(w => w.name === "string_a");
                    if (w && w.value) {
                        // Separa por espacios o comas y cuenta las palabras reales
                        const count = w.value.toString().split(/[\s,]+/).filter(word => word.length > 0).length;
                        counterWidget.value = count.toString();
                    } else {
                        counterWidget.value = "0";
                    }
                };

                // Cuenta inicial por si ya había texto guardado al abrir el workflow
                setTimeout(() => this.updatePreviewTokens(), 100);
            };

            // Aquí es donde el nodo recibe el texto final desde Python
            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function(message) {
                if (onExecuted) onExecuted.apply(this, arguments);
                
                if (message && message.text) {
                    const w = this.widgets?.find(w => w.name === "string_a");
                    if (w) {
                        w.value = message.text[0]; 
                        this.onResize?.(this.size); 
                        
                        // --- NUEVO: Actualizamos el contador justo después de inyectar el nuevo texto ---
                        if (this.updatePreviewTokens) {
                            this.updatePreviewTokens();
                        }
                        
                        app.graph.setDirtyCanvas(true, true);
                    }
                }
            };
        }
    }
});