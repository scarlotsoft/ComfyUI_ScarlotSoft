import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.CLIPModularUI",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_CLIPTextEncodeModular") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;

            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

                // --- SISTEMA DE BLOQUEO DINÁMICO ---
                this.checkLockState = function() {
                    const builderSlot = this.inputs?.findIndex(i => i.name === "builder_prompt");
                    const isLocked = builderSlot !== -1 && !!this.inputs[builderSlot].link;
                    
                    const styleW = this.widgets.find(w => w.name === "style");
                    const subjW = this.widgets.find(w => w.name === "subject");
                    const posW = this.widgets.find(w => w.name === "Add_Positive_Prompt_Tags");
                    const negW = this.widgets.find(w => w.name === "Add_Negative_Prompt_Tags");

                    if (styleW && styleW.inputEl) {
                        styleW.inputEl.disabled = isLocked;
                        styleW.inputEl.style.opacity = isLocked ? "0.3" : "1.0";
                    }
                    if (subjW && subjW.inputEl) {
                        subjW.inputEl.disabled = isLocked;
                        subjW.inputEl.style.opacity = isLocked ? "0.3" : "1.0";
                    }
                    
                    if (posW) posW.isLocked = isLocked;
                    if (negW) negW.isLocked = isLocked;
                    
                    app.graph.setDirtyCanvas(true, true);
                };

                // --- FUNCIÓN GENÉRICA PARA DIBUJAR LOS SWITCHES SCARLOTSOFT ---
                const setupSwitch = (widgetName, displayLabel) => {
                    const toggleWidget = this.widgets.find(w => w.name === widgetName);
                    if (toggleWidget) {
                        
                        // 1. DIBUJO VISUAL (Igual que antes)
                        toggleWidget.draw = function(ctx, node, widget_width, y, widget_height) {
                            const locked = this.isLocked;
                            
                            ctx.fillStyle = "#222222";
                            ctx.fillRect(15, y, widget_width - 30, widget_height);

                            ctx.fillStyle = locked ? "#777777" : "#ffffff";
                            ctx.textAlign = "left";
                            ctx.font = "14px Arial";
                            let label = displayLabel;
                            if (locked) label += " (Overridden)";
                            ctx.fillText(label, 25, y + widget_height * 0.7);

                            const is_on = this.value;
                            const switch_width = 30;
                            const switch_height = 14;
                            const switch_x = widget_width - switch_width - 25;
                            const switch_y = y + (widget_height / 2) - (switch_height / 2);

                            let bgColor = "#555555";
                            let circleColor = locked ? "#555555" : "#ffffff";
                            let circleOffset = 7;

                            if (is_on && !locked) {
                                bgColor = "#e7161c"; 
                                circleOffset = switch_width - 7;
                            } else if (is_on && locked) {
                                bgColor = "#4a1819"; 
                                circleOffset = switch_width - 7;
                            }

                            ctx.fillStyle = bgColor;
                            ctx.beginPath();
                            ctx.roundRect(switch_x, switch_y, switch_width, switch_height, 7);
                            ctx.fill();

                            ctx.fillStyle = circleColor;
                            ctx.beginPath();
                            ctx.arc(switch_x + circleOffset, switch_y + (switch_height / 2), 5, 0, Math.PI * 2);
                            ctx.fill();
                        };

                        // 2. CALLBACK NATIVO (Soluciona el bug de hit-box)
                        const origCallback = toggleWidget.callback;
                        toggleWidget.callback = function(value, graphCanvas, node, pos, event) {
                            // Si está bloqueado, revertimos el cambio inmediatamente
                            if (this.isLocked) {
                                this.value = !value; 
                                return;
                            }
                            
                            // EXCLUSIÓN MUTUA PERFECTA
                            if (this.value === true) {
                                const otherName = this.name === "Add_Positive_Prompt_Tags" 
                                    ? "Add_Negative_Prompt_Tags" 
                                    : "Add_Positive_Prompt_Tags";
                                    
                                const otherWidget = node.widgets.find(w => w.name === otherName);
                                // Si el otro está encendido, lo apagamos
                                if (otherWidget && otherWidget.value === true) {
                                    otherWidget.value = false;
                                }
                            }
                            
                            if (origCallback) origCallback.apply(this, arguments);
                            app.graph.setDirtyCanvas(true, true);
                        };
                    }
                };

                // Inicializamos ambos switches
                setupSwitch("Add_Positive_Prompt_Tags", "Add Positive Prompt Tags");
                setupSwitch("Add_Negative_Prompt_Tags", "Add Negative Prompt Tags");

                // --- CONTADOR DE TOKENS ---
                const counterWidget = this.addWidget("text", "Tokens", "0", "text");
                counterWidget.computeSize = () => [0, 26];
                counterWidget.draw = function(ctx, node, widget_width, y, widget_height) {
                    ctx.fillStyle = "#161616"; 
                    ctx.fillRect(15, y, widget_width - 30, widget_height);
                    
                    const locked = node.widgets.find(w => w.name === "Add_Positive_Prompt_Tags")?.isLocked;
                    ctx.fillStyle = locked ? "#333333" : "#00ff44"; 
                    
                    ctx.textAlign = "right";
                    ctx.font = "12px Arial";
                    let text = locked ? "Tokens Overridden" : "Approx Words: " + this.value;
                    ctx.fillText(text, widget_width - 25, y + widget_height * 0.7);
                };

                const updateTokens = () => {
                    const subj = this.widgets.find(w => w.name === "subject")?.value || "";
                    const styl = this.widgets.find(w => w.name === "style")?.value || "";
                    const count = (subj + " " + styl).split(/[\s,]+/).filter(w => w.length > 0).length;
                    counterWidget.value = count.toString() + " / 75";
                };

                const subjectWidget = this.widgets.find(w => w.name === "subject");
                const styleWidget = this.widgets.find(w => w.name === "style");

                if (subjectWidget) {
                    const orig = subjectWidget.callback;
                    subjectWidget.callback = function() { updateTokens(); if(orig) orig.apply(this, arguments); };
                }
                if (styleWidget) {
                    const orig = styleWidget.callback;
                    styleWidget.callback = function() { updateTokens(); if(orig) orig.apply(this, arguments); };
                }

                setTimeout(() => this.checkLockState(), 100);
                return r;
            };

            const onConnectionsChange = nodeType.prototype.onConnectionsChange;
            nodeType.prototype.onConnectionsChange = function (slotType, slot, isChangeConnect, link_info, output) {
                if (onConnectionsChange) onConnectionsChange.apply(this, arguments);
                if (slotType === LiteGraph.INPUT) {
                    this.checkLockState();
                }
            };
        }
    }
});