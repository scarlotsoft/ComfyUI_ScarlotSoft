import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.ImageMaskPreviewUI",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_ImageMaskPreview") {
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";
                this._bg_start_y = 110; 

                const toggleWidget = this.widgets.find(w => w.name === "pass_through");
                
                if (toggleWidget) {
                    toggleWidget.draw = function(ctx, node, widget_width, y, widget_height) {
                        // LA MAGIA: Guardamos la coordenada Y exacta donde termina el switch
                        node._bg_start_y = y + widget_height + 3;

                        ctx.fillStyle = "#222222";
                        ctx.fillRect(15, y, widget_width - 30, widget_height);

                        ctx.fillStyle = "#ffffff";
                        ctx.textAlign = "left";
                        ctx.font = "14px Arial";
                        ctx.fillText("Pass Through Original", 25, y + widget_height * 0.7);

                        const is_on = this.value;
                        const switch_width = 30;
                        const switch_height = 14;
                        const switch_x = widget_width - switch_width - 25; 
                        const switch_y = y + (widget_height / 2) - (switch_height / 2);

                        let bgColor = "#555555";
                        let circleColor = "#ffffff";
                        let circleOffset = 7;

                        if (is_on) {
                            bgColor = "#e7161c"; 
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
                }
            };

            const onDrawBackground = nodeType.prototype.onDrawBackground;
            nodeType.prototype.onDrawBackground = function (ctx) {
                if (onDrawBackground) onDrawBackground.apply(this, arguments);
                
                if (!this.flags?.collapsed) {
                    // Usamos la coordenada inyectada por el switch
                    const imgY = this._bg_start_y || 110;
                    const W = this.size[0];
                    const H = this.size[1];
                    
                    if (H > imgY) {
                        ctx.save();
                        const hasImg = this.imgs && this.imgs.length > 0;
                        
                        ctx.fillStyle = hasImg ? "#111111" : "#171718"; 
                        
                        ctx.beginPath();
                        if (ctx.roundRect) {
                            ctx.roundRect(0, imgY, W, H - imgY, [0, 0, 6, 6]); 
                        } else {
                            ctx.fillRect(0, imgY, W, H - imgY);
                        }
                        ctx.fill();

                        if (!hasImg) {
                            ctx.fillStyle = "#555555";
                            ctx.font = "12px Arial";
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.fillText("Connect image/mask to preview", W / 2, imgY + (H - imgY) / 2);
                        }
                        
                        ctx.restore();
                    }
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