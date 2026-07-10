import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.GroundedSAMUI",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_GroundedSAM") {
            
            // 1. Motor dinámico de dimensiones para preservar el cuadro de texto multilínea
            const computeSize = nodeType.prototype.computeSize;
            nodeType.prototype.computeSize = function(out) {
                let size = computeSize ? computeSize.apply(this, arguments) : [350, 200];
                size[0] = Math.max(size[0], 350);
                
                let minHeight = 40;
                if (this.widgets) {
                    this.widgets.forEach(w => {
                        minHeight += w.type === "customtext" ? 80 : 24; 
                    });
                }
                size[1] = Math.max(size[1], minHeight);
                return size;
            };

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                // Estilo ScarlotSoft
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";

                // --- 2. APARIENCIA UNIFICADA DEL INTERRUPTOR ---
                const toggleWidget = this.widgets.find(w => w.name === "invert_mask");
                
                if (toggleWidget) {
                    toggleWidget.draw = function(ctx, node, widget_width, y, widget_height) {
                        
                        // Dibujo del contenedor del control
                        ctx.fillStyle = "#222222";
                        ctx.fillRect(15, y, widget_width - 30, widget_height);

                        // Texto formateado elegantemente
                        ctx.fillStyle = "#ffffff";
                        ctx.textAlign = "left";
                        ctx.font = "14px Arial";
                        ctx.fillText("Invert Mask", 25, y + widget_height * 0.7);

                        // Lógica física de tu Switch Pro
                        const is_on = this.value;
                        const switch_width = 30;
                        const switch_height = 14;
                        
                        const switch_x = widget_width - switch_width - 25; 
                        const switch_y = y + (widget_height / 2) - (switch_height / 2);

                        let bgColor = "#555555";
                        let circleColor = "#ffffff";
                        let circleOffset = 7;

                        if (is_on) {
                            bgColor = "#e7161c"; // Tu rojo corporativo
                            circleOffset = switch_width - 7;
                        }

                        // Renderizado de cápsula redondeada
                        ctx.fillStyle = bgColor;
                        ctx.beginPath();
                        ctx.roundRect(switch_x, switch_y, switch_width, switch_height, 7);
                        ctx.fill();

                        // Renderizado de deslizador interno
                        ctx.fillStyle = circleColor;
                        ctx.beginPath();
                        ctx.arc(switch_x + circleOffset, switch_y + (switch_height / 2), 5, 0, Math.PI * 2);
                        ctx.fill();
                    };
                }
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