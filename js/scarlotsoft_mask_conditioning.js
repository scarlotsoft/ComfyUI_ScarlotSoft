import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.MaskConditioningUI",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_EasyMaskConditioning") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                // Buscamos el widget generado por Python
                const toggleWidget = this.widgets.find(w => w.name === "Invert_Mask");
                
                if (toggleWidget) {
                    // ❌ ELIMINADA: toggleWidget.name = "Invert Mask"; 
                    // NUNCA renombramos la variable para no romper Python.
                    
                    // 2. Sobrescribimos su función de dibujo con el estilo de ScarlotSoft
                    toggleWidget.draw = function(ctx, node, widget_width, y, widget_height) {
                        // Dibujar el fondo oscuro del widget
                        ctx.fillStyle = "#222222";
                        ctx.fillRect(15, y, widget_width - 30, widget_height);

                        // Dibujar el texto
                        ctx.fillStyle = "#ffffff";
                        ctx.textAlign = "left";
                        ctx.font = "14px Arial";
                        
                        // ✅ SOLUCIÓN: Dibujamos el texto "Invert Mask" directamente (o usamos this.name.replace("_", " "))
                        // Así se ve bien para ti, pero el sistema lo sigue procesando como "Invert_Mask"
                        ctx.fillText("Invert Mask", 25, y + widget_height * 0.7);

                        // --- LA MAGIA DE TU SWITCH PRO ---
                        const is_on = this.value;
                        const switch_width = 30;
                        const switch_height = 14;
                        
                        // Calculamos la posición a la derecha del widget
                        const switch_x = widget_width - switch_width - 25; 
                        const switch_y = y + (widget_height / 2) - (switch_height / 2);

                        let bgColor = "#555555";
                        let circleColor = "#ffffff";
                        let circleOffset = 7;

                        // Si el valor es True, aplicamos tu estilo activo
                        if (is_on) {
                            bgColor = "#e7161c"; // Tu rojo característico
                            circleOffset = switch_width - 7;
                        }

                        // Dibujar el rectángulo redondeado
                        ctx.fillStyle = bgColor;
                        ctx.beginPath();
                        ctx.roundRect(switch_x, switch_y, switch_width, switch_height, 7);
                        ctx.fill();

                        // Dibujar el círculo (interruptor)
                        ctx.fillStyle = circleColor;
                        ctx.beginPath();
                        ctx.arc(switch_x + circleOffset, switch_y + (switch_height / 2), 5, 0, Math.PI * 2);
                        ctx.fill();
                    };
                }
                return r;
            };
        }
    }
});