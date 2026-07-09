import { app } from "../../scripts/app.js";

// --- TEMA BASE DE SCARLOTSOFT ---
app.registerExtension({
    name: "ScarlotSoft.Theme",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        
        if (nodeData.name && nodeData.name.startsWith("ScarlotSoft")) {
            
            // Colores por defecto para cuando se seleccione "No Color"
            nodeType.color = "#1d1d1d";
            nodeType.bgcolor = "#2a2a2a";
            
            // CORRECCIÓN: La propiedad correcta para la fuente es title_text_color
            nodeType.title_text_color = "#ffffff"; 

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                // Aplicamos los colores al nacer el nodo
                this.color = "#1d1d1d"; 
                this.bgcolor = "#2a2a2a"; 
                this.title_text_color = "#ffffff"; 
            };
        }
    }
});

// --- SCARLOTSOFT SWITCH (Normal - Interruptor Maestro desplazado a la derecha) ---
app.registerExtension({
    name: "ScarlotSoft.SwitchNormal",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_Switch") {
            
            nodeType.prototype.computeSize = function() {
                return [230, LiteGraph.NODE_TITLE_HEIGHT + (2 * LiteGraph.NODE_SLOT_HEIGHT) - 5]; 
            };

            const hideWidget = (node) => {
                if (!node.widgets) return;
                const w = node.widgets.find(w => w.name === "boolean_state" || w.type === "scarlot_hidden");
                if (w) {
                    w.type = "scarlot_hidden";      
                    w.hidden = true;        
                    w.computeSize = () => [0, -4]; 
                    w.draw = () => {};      
                }
            };

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                hideWidget(this);
                this.size = this.computeSize();
            };

            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function () {
                if (onConfigure) onConfigure.apply(this, arguments);
                hideWidget(this);
                this.size = this.computeSize();
            };

            const onDrawForeground = function (ctx) {
                this.size[1] = LiteGraph.NODE_TITLE_HEIGHT + (2 * LiteGraph.NODE_SLOT_HEIGHT) - 5;
                hideWidget(this); 
                
                const stateWidget = this.widgets?.find(w => w.name === "boolean_state" || w.type === "scarlot_hidden");
                const state = stateWidget ? (stateWidget.value === true || stateWidget.value === "true") : true;

                const posOff = this.getConnectionPos(true, 1);
                if (!posOff) return;

                const switch_width = 30;
                const switch_height = 14;
                const local_y = posOff[1] - this.pos[1];
                
                // --- AJUSTE DE DESPLAZAMIENTO ---
                // Incrementé a 25 para moverlo más a la derecha y que quede bajo OUTPUT
                const x = this.size[0] - switch_width - 25; 
                const y = local_y - (switch_height / 2);

                const bgColor = state ? "#e7161c" : "#555555"; 
                const circleOffset = state ? switch_width - 7 : 7;

                ctx.fillStyle = bgColor;
                ctx.beginPath();
                ctx.roundRect(x, y, switch_width, switch_height, 7);
                ctx.fill();

                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(x + circleOffset, y + (switch_height / 2), 5, 0, Math.PI * 2);
                ctx.fill();
            };
            nodeType.prototype.onDrawForeground = onDrawForeground;

            const onMouseDown = function (e, local_pos, canvas) {
                const [click_x, click_y] = local_pos;

                const posOff = this.getConnectionPos(true, 1);
                if (!posOff) return false;

                const switch_width = 30;
                const switch_height = 14;
                const local_y = posOff[1] - this.pos[1];
                
                const x = this.size[0] - switch_width - 25;
                const y = local_y - (switch_height / 2);

                if (click_x >= x - 5 && click_x <= x + switch_width + 5 && click_y >= y - 5 && click_y <= y + switch_height + 5) {
                    const stateWidget = this.widgets?.find(w => w.name === "boolean_state" || w.type === "scarlot_hidden");
                    if (stateWidget) {
                        const currentState = (stateWidget.value === true || stateWidget.value === "true");
                        stateWidget.value = !currentState;
                        app.graph.setDirtyCanvas(true, true);
                    }
                    return true;
                }
                return false;
            };
            nodeType.prototype.onMouseDown = onMouseDown;
        }
    }
});

// --- DIVISORES DE TEXTO SCARLOTSOFT ---
app.registerExtension({
    name: "ScarlotSoft.Dividers",
    getCustomWidgets(app) {
        return {
            SCARLOT_DIVIDER(node, inputName, inputData, app) {
                // Creamos el widget ocultando la lógica estándar
                const widget = node.addWidget("text", inputName, inputData[1]?.default || "", () => {}, {});
                
                // Evita que ComfyUI guarde este texto inútil en el archivo de salida
                widget.serializeValue = false; 

                // --- DIBUJO LÁSER DEL TEXTO ---
                widget.draw = function(ctx, node, width, y, height) {
                    ctx.save();
                    
                    ctx.fillStyle = "#555555"; // El rojo estricto de ScarlotSoft
                    ctx.font = "bold 13px Arial";
                    ctx.textAlign = "center";
                    
                    // Imprimimos el texto exactamente en el centro de este espacio
                    ctx.fillText(this.value, width / 2, y + height - 6);
                    
                    ctx.restore();
                };
                
                // Le damos 24 píxeles de altura física para que separe bien los bloques
                widget.computeSize = function(width) {
                    return [width, 24]; 
                };
                
                return { widget: widget };
            }
        };
    }
});

