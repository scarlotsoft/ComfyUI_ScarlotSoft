import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.HiResFixUI",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_UpscalerHiResFix") {
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";
                this.setSize([315, 380]); // Buen tamaño inicial

                setTimeout(() => {
                    if (this.widgets) {
                        for (let w of this.widgets) {
                            // Interceptamos tus divisores personalizados
                            if (w.type === "SCARLOT_DIVIDER") {
                                w.type = "converted-widget"; // Ocultamos el campo de texto nativo
                                w.computeSize = () => [0, 26];
                                
                                // Pintamos nuestra propia interfaz premium
                                w.draw = function(ctx, node, widget_width, y, widget_height) {
                                    
                                    // 1. Línea roja súper delgada atravesando el nodo
                                    ctx.fillStyle = "rgba(231, 22, 28, 0.5)"; 
                                    ctx.fillRect(10, y + widget_height / 2, widget_width - 20, 1);
                                    
                                    let text = this.value;
                                    ctx.font = "bold 11px Arial";
                                    let tw = ctx.measureText(text).width;
                                    
                                    // 2. Borramos un pedacito de la línea en el centro para que el texto "respire"
                                    ctx.fillStyle = "#2a2a2a"; 
                                    ctx.fillRect(widget_width / 2 - tw / 2 - 8, y + widget_height / 2 - 6, tw + 16, 12);
                                    
                                    // 3. Escribimos el título en rojo brillante
                                    ctx.fillStyle = "#e7161c";
                                    ctx.textAlign = "center";
                                    ctx.textBaseline = "middle";
                                    ctx.fillText(text, widget_width / 2, y + widget_height / 2);
                                };
                            }
                        }
                    }
                }, 100);
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