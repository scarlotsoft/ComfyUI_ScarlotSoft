import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.SwitchPro.Definitive", 
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_Switch_Pro") {
            
            // MARGEN INFERIOR DINÁMICO REDUCIDO AL MÁXIMO (-5 px)
            nodeType.prototype.computeSize = function() {
                const rows = Math.max(this.inputs ? this.inputs.length : 0, this.outputs ? this.outputs.length : 0);
                return [230, LiteGraph.NODE_TITLE_HEIGHT + (rows * LiteGraph.NODE_SLOT_HEIGHT) - 5];
            };

            const hideWidget = (node) => {
                if (!node.widgets) return;
                const w = node.widgets.find(w => w.name === "active_index");
                if (w) {
                    w.type = "hidden";      
                    w.hidden = true;        
                    w.computeSize = () => [0, -4]; 
                    w.draw = () => {};      
                }
            };

            const syncInputs = (node) => {
                if (!node.inputs) return;
                
                while (node.inputs.length > 1 && !node.inputs[node.inputs.length - 1].link) {
                    node.removeInput(node.inputs.length - 1);
                }
                
                const last = node.inputs[node.inputs.length - 1];
                if (last && last.link) {
                    node.addInput("input_" + node.inputs.length, "*");
                }

                for (let i = 0; i < node.inputs.length; i++) {
                    node.inputs[i].name = "input_" + i; 
                    if (node.inputs[i].link) {
                        const link = app.graph.links[node.inputs[i].link];
                        if (link) {
                            const origin_node = app.graph.getNodeById(link.origin_id);
                            if (origin_node && origin_node.outputs[link.origin_slot]) {
                                node.inputs[i].label = origin_node.outputs[link.origin_slot].type;
                            }
                        }
                    } else {
                        node.inputs[i].label = "(empty)";
                    }
                }
                node.size = node.computeSize();
            };

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                this.color = "#1d1d1d"; 
                this.bgcolor = "#2a2a2a"; 
                this.title_text_color = "#ffffff";

                hideWidget(this);

                if (!this.inputs || this.inputs.length === 0) {
                    this.addInput("input_0", "*");
                    this.inputs[0].label = "(empty)";
                }
                syncInputs(this);
            };

            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function () {
                if (onConfigure) onConfigure.apply(this, arguments);
                hideWidget(this);
                syncInputs(this);
            };

            const onConnectionsChange = nodeType.prototype.onConnectionsChange;
            nodeType.prototype.onConnectionsChange = function (slotType, slot, isChangeConnect, link_info, output) {
                if (onConnectionsChange) onConnectionsChange.apply(this, arguments);
                if (slotType === LiteGraph.INPUT) {
                    syncInputs(this);
                    app.graph.setDirtyCanvas(true, true);
                }
            };

            const onDrawForeground = nodeType.prototype.onDrawForeground;
            nodeType.prototype.onDrawForeground = function (ctx) {
                const rows = Math.max(this.inputs ? this.inputs.length : 0, this.outputs ? this.outputs.length : 0);
                // Forzamos la altura recortada en cada frame
                this.size[1] = LiteGraph.NODE_TITLE_HEIGHT + (rows * LiteGraph.NODE_SLOT_HEIGHT) - 5;
                hideWidget(this); 

                if (onDrawForeground) onDrawForeground.apply(this, arguments);
                if (!this.inputs) return;

                const idxWidget = this.widgets?.find(w => w.name === "active_index");
                const activeIndex = idxWidget ? parseInt(idxWidget.value, 10) : 0;

                for (let i = 0; i < this.inputs.length; i++) {
                    const pos = this.getConnectionPos(true, i);
                    if (!pos) continue;

                    const switch_width = 30;
                    const switch_height = 14;
                    const local_y = pos[1] - this.pos[1];
                    const x = this.size[0] - switch_width - 85; 
                    const y = local_y - (switch_height / 2);

                    const isConnected = !!this.inputs[i].link;
                    const isActive = (activeIndex === i);

                    let bgColor = "#333333"; 
                    let circleColor = "#666666"; 
                    let circleOffset = 7;

                    if (isConnected) {
                        if (isActive) {
                            bgColor = "#e7161c"; 
                            circleColor = "#ffffff";
                            circleOffset = switch_width - 7;
                        } else {
                            bgColor = "#555555"; 
                            circleColor = "#ffffff";
                            circleOffset = 7;
                        }
                    }

                    ctx.fillStyle = bgColor;
                    ctx.beginPath();
                    ctx.roundRect(x, y, switch_width, switch_height, 7);
                    ctx.fill();

                    ctx.fillStyle = circleColor;
                    ctx.beginPath();
                    ctx.arc(x + circleOffset, y + (switch_height / 2), 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            };

            const onMouseDown = nodeType.prototype.onMouseDown;
            nodeType.prototype.onMouseDown = function (e, local_pos, canvas) {
                if (onMouseDown && onMouseDown.apply(this, arguments)) return true;
                if (!this.inputs) return false;
                const [click_x, click_y] = local_pos;

                for (let i = 0; i < this.inputs.length; i++) {
                    if (!this.inputs[i].link) continue;

                    const pos = this.getConnectionPos(true, i);
                    if (!pos) continue;

                    const switch_width = 30;
                    const switch_height = 14;
                    const local_y = pos[1] - this.pos[1];
                    const x = this.size[0] - switch_width - 85;
                    const y = local_y - (switch_height / 2);

                    if (click_x >= x - 5 && click_x <= x + switch_width + 5 && click_y >= y - 5 && click_y <= y + switch_height + 5) {
                        const idxWidget = this.widgets?.find(w => w.name === "active_index");
                        if (idxWidget) {
                            idxWidget.value = i; 
                            app.graph.setDirtyCanvas(true, true); 
                        }
                        return true; 
                    }
                }
                return false;
            };
        }
    }
});