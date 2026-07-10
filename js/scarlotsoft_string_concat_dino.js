import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.StringConcatDINO.UI",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_StringConcatDINO") {

            nodeType.prototype.computeSize = function() {
                const rows = Math.max(this.inputs ? this.inputs.length : 1, 1);
                return [230, LiteGraph.NODE_TITLE_HEIGHT + (rows * LiteGraph.NODE_SLOT_HEIGHT) - 5];
            };

            const syncInputs = (node) => {
                if (!node.inputs) return;
                
                while (node.inputs.length > 1 && !node.inputs[node.inputs.length - 1].link) {
                    node.removeInput(node.inputs.length - 1);
                }
                
                const last = node.inputs[node.inputs.length - 1];
                if (last && last.link) {
                    node.addInput("input_" + node.inputs.length, "STRING");
                }

                for (let i = 0; i < node.inputs.length; i++) {
                    node.inputs[i].name = "input_" + i;
                    // Cambiamos "string" por "subject" para que tenga más sentido con DINO
                    node.inputs[i].label = node.inputs[i].link ? "subject " + i : "(empty)";
                }
                node.size = node.computeSize();
            };

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";

                if (!this.inputs || this.inputs.length === 0) {
                    this.addInput("input_0", "STRING");
                    this.inputs[0].label = "(empty)";
                }
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
        }
    }
});