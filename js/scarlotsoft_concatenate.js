import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.Concatenate",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_Concatenate") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";

                const w = this.widgets?.find(w => w.name === "bool_on_off");
                if (w) {
                    w.draw = function(ctx, node, width, y, H) {
                        const isActive = this.value;

                        ctx.fillStyle = "#ffffff";
                        ctx.font = "12px Arial";
                        ctx.textAlign = "left";
                        ctx.fillText("Blank Line", 15, y + H * 0.7);

                        const switch_width = 30;
                        const switch_height = 14;
                        const switch_x = width - switch_width - 45; 
                        const switch_y = y + (H / 2) - (switch_height / 2);

                        const bgColor = isActive ? "#e7161c" : "#555555";
                        const circleOffset = isActive ? switch_width - 7 : 7;

                        ctx.fillStyle = bgColor;
                        ctx.beginPath();
                        ctx.roundRect(switch_x, switch_y, switch_width, switch_height, 7);
                        ctx.fill();

                        ctx.fillStyle = "#ffffff";
                        ctx.beginPath();
                        ctx.arc(switch_x + circleOffset, switch_y + (switch_height / 2), 5, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.textAlign = "right";
                        ctx.fillText(isActive ? "On" : "Off", width - 15, y + H * 0.7);
                    };
                }
            };
        }
    }
});