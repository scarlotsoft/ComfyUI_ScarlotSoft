import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.LoadImageUI",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_LoadImage") {
            
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";

                this._uploadHover = false;
                this._uploadClicked = false;
                this._uploadBtnRect = null; 
                this._bg_start_y = 85; // Valor por defecto seguro

                setTimeout(() => {
                    const uploadBtn = this.widgets.find(w => w.name === "choose file to upload" || w.type === "button");
                    if (uploadBtn) {
                        uploadBtn.draw = function(ctx, node, widget_width, y, widget_height) {
                            const margin = 10;
                            const w = widget_width - margin * 2;
                            
                            node._uploadBtnRect = { x: margin, y: y, w: w, h: widget_height };
                            
                            // LA MAGIA: Guardamos la coordenada Y exacta donde termina el botón
                            node._bg_start_y = y + widget_height + 3; 

                            const isHover = node._uploadHover;
                            const isClicked = node._uploadClicked;

                            ctx.fillStyle = isClicked ? "#e7161c" : "#242424"; 
                            ctx.beginPath();
                            ctx.roundRect(margin, y, w, widget_height, 4);
                            ctx.fill();

                            ctx.strokeStyle = isClicked ? "#e7161c" : (isHover ? "#e7161c" : "#333333");
                            ctx.lineWidth = 1;
                            ctx.stroke();

                            ctx.fillStyle = isClicked ? "#ffffff" : (isHover ? "#eeeeee" : "#aaaaaa");
                            ctx.font = "bold 12px Arial";
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.fillText("Upload Image", margin + w / 2, y + widget_height / 2 + 1);
                        };
                    }
                }, 100);
            };

            const _origMove = nodeType.prototype.onMouseMove;
            nodeType.prototype.onMouseMove = function(e, pos) {
                let handled = false;
                if (this._uploadBtnRect) {
                    const r = this._uploadBtnRect;
                    const isHover = pos[0] >= r.x && pos[0] <= r.x + r.w && pos[1] >= r.y && pos[1] <= r.y + r.h;
                    
                    if (this._uploadHover !== isHover) {
                        this._uploadHover = isHover;
                        handled = true;
                    }
                }
                if (handled) app.graph.setDirtyCanvas(true, true);
                if (_origMove) return _origMove.call(this, e, pos) || handled;
                return handled;
            };

            const _origDown = nodeType.prototype.onMouseDown;
            nodeType.prototype.onMouseDown = function(e, pos) {
                if (this._uploadBtnRect) {
                    const r = this._uploadBtnRect;
                    if (pos[0] >= r.x && pos[0] <= r.x + r.w && pos[1] >= r.y && pos[1] <= r.y + r.h) {
                        this._uploadClicked = true;
                        app.graph.setDirtyCanvas(true, true);
                        
                        setTimeout(() => {
                            if (this._uploadClicked) {
                                this._uploadClicked = false;
                                app.graph.setDirtyCanvas(true, true);
                            }
                        }, 150);
                    }
                }
                if (_origDown) return _origDown.call(this, e, pos);
                return false;
            };

            const _origLeave = nodeType.prototype.onMouseLeave;
            nodeType.prototype.onMouseLeave = function(e) {
                let handled = false;
                if (this._uploadHover) {
                    this._uploadHover = false;
                    handled = true;
                }
                if (this._uploadClicked) {
                    this._uploadClicked = false;
                    handled = true;
                }
                if (handled) app.graph.setDirtyCanvas(true, true);
                if (_origLeave) return _origLeave.call(this, e);
            };

            const onDrawForeground = nodeType.prototype.onDrawForeground;
            nodeType.prototype.onDrawForeground = function (ctx) {
                const origFillText = ctx.fillText;
                ctx.fillText = function(text, x, y) {
                    if (typeof text === 'string' && text.match(/^\d+\s*[x×]\s*\d+$/i)) {
                        return; 
                    }
                    origFillText.apply(this, arguments);
                };

                if (onDrawForeground) onDrawForeground.apply(this, arguments);
                
                ctx.fillText = origFillText;

                if (this.flags?.collapsed) return;

                if (this.imgs && this.imgs.length > 0) {
                    const img = this.imgs[0];
                    if (img && img.naturalWidth && img.naturalHeight) {
                        const text = `${img.naturalWidth} x ${img.naturalHeight}`;
                        
                        ctx.save();
                        ctx.font = "bold 11px Arial";
                        
                        const text_w = ctx.measureText(text).width + 12;
                        const text_h = 18;
                        const badge_x = 10;
                        const badge_y = 10; 

                        ctx.fillStyle = "rgba(17, 17, 17, 0.95)";
                        ctx.beginPath();
                        ctx.roundRect(badge_x, badge_y, text_w, text_h, 4);
                        ctx.fill();

                        ctx.strokeStyle = "#e7161c";
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        ctx.fillStyle = "#ffffff";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(text, badge_x + text_w / 2, badge_y + text_h / 2 + 1);
                        ctx.restore();
                    }
                }
            };

            const onDrawBackground = nodeType.prototype.onDrawBackground;
            nodeType.prototype.onDrawBackground = function (ctx) {
                const origFillText = ctx.fillText;
                ctx.fillText = function(text, x, y) {
                    if (typeof text === 'string' && text.match(/^\d+\s*[x×]\s*\d+$/i)) {
                        return; 
                    }
                    origFillText.apply(this, arguments);
                };
                
                if (onDrawBackground) onDrawBackground.apply(this, arguments);
                
                ctx.fillText = origFillText;

                if (!this.flags?.collapsed) {
                    // Usamos la coordenada inyectada por el botón
                    const imgY = this._bg_start_y || 85; 
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
                            ctx.fillText("Upload an image to preview", W / 2, imgY + (H - imgY) / 2);
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