import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

app.registerExtension({
    name: "ScarlotSoft.ImageCompareUI",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_ImageCompare") {

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";
                this.setSize([512, 600]); 

                this._cmpMode = 0; // 0 = LR, 1 = RL
                this._cmpShowWhich = 0; // 0 = Split, 1 = Show 1, 2 = Show 2
                
                this._cmpSplitX = 0; 
                this._cmpImg1 = null;
                this._cmpImg2 = null;
                
                this._cmpHoverBtn = null; 
                this._flashBtn = null; // Para la animación de "Saved!"
                this.ui_zones = [];

                this.hideOutputImages = true;
            };

            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function(message) {
                if (onExecuted) onExecuted.apply(this, arguments);
                this.imgs = null; 
                if (message && message.images && message.images.length >= 2) {
                    const loadImg = (imgData) => {
                        return new Promise((resolve) => {
                            const img = new Image();
                            img.onload = () => resolve(img);
                            img.src = api.apiURL(`/view?filename=${imgData.filename}&type=${imgData.type}&subfolder=${imgData.subfolder}${app.getPreviewFormatParam()}`);
                        });
                    };
                    Promise.all([loadImg(message.images[0]), loadImg(message.images[1])]).then(imgs => {
                        this._cmpImg1 = imgs[0];
                        this._cmpImg2 = imgs[1];
                        app.graph.setDirtyCanvas(true, true);
                    });
                }
            };

            // --- FUNCIONES DE GUARDADO ---
            const saveToDisk = (img, filename) => {
                const a = document.createElement("a");
                a.href = img.src;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };

            const saveToOutput = async (img, filename) => {
                try {
                    const response = await fetch(img.src);
                    const blob = await response.blob();
                    const formData = new FormData();
                    formData.append("image", blob, filename);
                    formData.append("type", "output"); 
                    await api.fetchApi("/upload/image", { method: "POST", body: formData });
                } catch (e) {
                    console.error("[ScarlotSoft] Error saving to output:", e);
                }
            };

            const triggerFlash = (node, btn_id) => {
                node._flashBtn = btn_id;
                app.graph.setDirtyCanvas(true, true);
                setTimeout(() => {
                    if (node._flashBtn === btn_id) {
                        node._flashBtn = null;
                        app.graph.setDirtyCanvas(true, true);
                    }
                }, 800);
            };

            // --- MOTOR DE DIBUJO ---
            nodeType.prototype.onDrawBackground = function(ctx) {
                if (this.flags?.collapsed) return;
                if (this.imgs) this.imgs = null;

                const W = this.size[0];
                const H = this.size[1];
                
                const ROW1_Y = 10;
                const ROW2_Y = 35;
                const IMG_Y = 65; // Bajamos un poco la imagen para hacer espacio a las dos filas
                const imgH = H - IMG_Y;

                this.ui_zones = []; // Reseteamos las zonas de colisión
                
                const drawBtn = (id, label, x, y, w, h, isActive, isFlash) => {
                    const isHover = this._cmpHoverBtn === id;
                    
                    ctx.fillStyle = isFlash ? "#ffffff" : (isActive ? "#e7161c" : "#242424");
                    ctx.beginPath(); ctx.roundRect(x, y, w, h, 3); ctx.fill();
                    
                    ctx.strokeStyle = isFlash ? "#ffffff" : (isActive ? "#e7161c" : (isHover ? "#e7161c" : "#333333"));
                    ctx.lineWidth = 1; ctx.stroke();
                    
                    ctx.fillStyle = isFlash ? "#e7161c" : (isActive ? "#ffffff" : (isHover ? "#eeeeee" : "#aaaaaa"));
                    ctx.font = "bold 12px Arial"; // Texto más grande y prominente
                    ctx.textAlign = "center"; ctx.textBaseline = "middle";
                    ctx.fillText(isFlash ? "Saved!" : label, x + w / 2, y + h / 2 + 1);
                    
                    this.ui_zones.push({ id, x, y, w, h });
                };

                // 1. DIBUJAR FILA SUPERIOR (Controles de Vista)
                const SHOW_LBL = this._cmpShowWhich === 0 ? "Show 1" : `Show ${this._cmpShowWhich}`;
                drawBtn("show", SHOW_LBL, 80, ROW1_Y, 65, 20, this._cmpShowWhich !== 0, false);
                drawBtn("lr", "Left Right", 150, ROW1_Y, 75, 20, this._cmpShowWhich === 0 && this._cmpMode === 0, false);
                drawBtn("rl", "Right Left", 230, ROW1_Y, 75, 20, this._cmpShowWhich === 0 && this._cmpMode === 1, false);

                ctx.fillStyle = "#888888"; ctx.font = "11px Arial"; ctx.textAlign = "left";
                ctx.fillText("↔ Hover image to slide", 315, ROW1_Y + 10.5);

                // 2. DIBUJAR FILA INFERIOR (TAMAÑOS Y GUARDADO)
                if (this._cmpImg1 || this._cmpImg2) {
                    const has1 = !!this._cmpImg1;
                    const has2 = !!this._cmpImg2;
                    const isDiff = has1 && has2 && (this._cmpImg1.naturalWidth !== this._cmpImg2.naturalWidth || this._cmpImg1.naturalHeight !== this._cmpImg2.naturalHeight);
                    const textColor = isDiff ? "#e7161c" : "#aaaaaa";

                    ctx.save();
                    ctx.textBaseline = "middle";

                    if (has1) {
                        ctx.fillStyle = "#e7161c";
                        ctx.beginPath(); ctx.arc(88, ROW2_Y + 10, 7, 0, Math.PI*2); ctx.fill();
                        ctx.fillStyle = "#ffffff"; ctx.font = "bold 9px Arial"; ctx.textAlign = "center"; 
                        ctx.fillText("1", 88, ROW2_Y + 10.5);
                        
                        ctx.fillStyle = textColor; ctx.font = "bold 11px Arial"; ctx.textAlign = "left"; 
                        ctx.fillText(`${this._cmpImg1.naturalWidth} x ${this._cmpImg1.naturalHeight}`, 100, ROW2_Y + 10.5);
                    }
                    
                    if (has2) {
                        ctx.fillStyle = "#e7161c";
                        ctx.beginPath(); ctx.arc(W - 18, ROW2_Y + 10, 7, 0, Math.PI*2); ctx.fill();
                        ctx.fillStyle = "#ffffff"; ctx.font = "bold 9px Arial"; ctx.textAlign = "center"; 
                        ctx.fillText("2", W - 18, ROW2_Y + 10.5);
                        
                        ctx.fillStyle = textColor; ctx.font = "bold 11px Arial"; ctx.textAlign = "right"; 
                        ctx.fillText(`${this._cmpImg2.naturalWidth} x ${this._cmpImg2.naturalHeight}`, W - 30, ROW2_Y + 10.5);
                    }
                    ctx.restore();

                    // Dibujar botones Save solo si estamos en modo Show
                    if (this._cmpShowWhich !== 0) {
                        const n = this._cmpShowWhich;
                        const centerX = W / 2;
                        drawBtn("save_d", `Save D${n}`, centerX - 75, ROW2_Y, 70, 20, false, this._flashBtn === "save_d");
                        drawBtn("save_o", `Save O${n}`, centerX + 5, ROW2_Y, 70, 20, false, this._flashBtn === "save_o");
                    }
                }

                // 3. DIBUJAR LA IMAGEN Y EL FONDO BORDERLESS
                if (!this._cmpImg1 && !this._cmpImg2) {
                    ctx.save();
                    ctx.fillStyle = "#171718";
                    ctx.fillRect(0, IMG_Y, W, imgH);
                    ctx.fillStyle = "#555555";
                    ctx.font = "12px Arial";
                    ctx.textAlign = "center";
                    ctx.fillText("Connect images & run to compare", W / 2, IMG_Y + imgH / 2);
                    ctx.restore();
                    return;
                }

                const fit = (img) => {
                    if (!img) return { x: 0, y: IMG_Y, w: W, h: imgH };
                    const a = img.naturalWidth / img.naturalHeight;
                    const fh = W / a;
                    if (fh <= imgH) return { x: 0, y: IMG_Y + (imgH - fh) / 2, w: W, h: fh };
                    const fw = imgH * a;
                    return { x: (W - fw) / 2, y: IMG_Y, w: fw, h: imgH };
                };

                const fr1 = fit(this._cmpImg1);
                const fr2 = fit(this._cmpImg2);

                ctx.save();
                ctx.beginPath();
                ctx.rect(0, IMG_Y, W, imgH);
                ctx.clip();
                ctx.fillStyle = "#111111";
                ctx.fillRect(0, IMG_Y, W, imgH);

                // --- LÓGICA DE VISUALIZACIÓN ---
                if (this._cmpShowWhich === 1 && this._cmpImg1) {
                    ctx.drawImage(this._cmpImg1, fr1.x, fr1.y, fr1.w, fr1.h);
                } 
                else if (this._cmpShowWhich === 2 && this._cmpImg2) {
                    ctx.drawImage(this._cmpImg2, fr2.x, fr2.y, fr2.w, fr2.h);
                } 
                else {
                    // Modo Split Normal
                    const m = this._cmpMode;
                    const imgL = m === 0 ? this._cmpImg2 : this._cmpImg1; 
                    const imgR = m === 0 ? this._cmpImg1 : this._cmpImg2;
                    const frL = m === 0 ? fr2 : fr1;
                    const frR = m === 0 ? fr1 : fr2;
                    
                    const sx = W * this._cmpSplitX;

                    if (imgR) {
                        ctx.save(); ctx.beginPath(); ctx.rect(sx, IMG_Y, W - sx, imgH); ctx.clip();
                        ctx.drawImage(imgR, frR.x, frR.y, frR.w, frR.h); ctx.restore();
                    }
                    if (imgL) {
                        ctx.save(); ctx.beginPath(); ctx.rect(0, IMG_Y, sx, imgH); ctx.clip();
                        ctx.drawImage(imgL, frL.x, frL.y, frL.w, frL.h); ctx.restore();
                    }

                    if (this._cmpSplitX > 0.001 && this._cmpSplitX < 0.999) {
                        ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1.5;
                        ctx.beginPath(); ctx.moveTo(sx, IMG_Y); ctx.lineTo(sx, IMG_Y + imgH); ctx.stroke();
                        ctx.beginPath(); ctx.arc(sx, IMG_Y + imgH / 2, 3.5, 0, Math.PI * 2);
                        ctx.fillStyle = "#e7161c"; ctx.fill();
                    }
                }
                ctx.restore();
            };

            // --- SISTEMA DE EVENTOS DINÁMICO ---
            const _origDown = nodeType.prototype.onMouseDown;
            nodeType.prototype.onMouseDown = function(e, pos) {
                for (let z of this.ui_zones) {
                    if (pos[0] >= z.x && pos[0] <= z.x + z.w && pos[1] >= z.y && pos[1] <= z.y + z.h) {
                        
                        if (z.id === "show") {
                            this._cmpShowWhich = this._cmpShowWhich === 1 ? 2 : 1;
                        } 
                        else if (z.id === "lr") {
                            this._cmpShowWhich = 0;
                            this._cmpMode = 0;
                        } 
                        else if (z.id === "rl") {
                            this._cmpShowWhich = 0;
                            this._cmpMode = 1;
                        }
                        else if (z.id === "save_d") {
                            const img = this._cmpShowWhich === 1 ? this._cmpImg1 : this._cmpImg2;
                            if (img) {
                                triggerFlash(this, "save_d");
                                saveToDisk(img, `ScarlotSoft_Compare_${Date.now()}.png`);
                            }
                        }
                        else if (z.id === "save_o") {
                            const img = this._cmpShowWhich === 1 ? this._cmpImg1 : this._cmpImg2;
                            if (img) {
                                triggerFlash(this, "save_o");
                                saveToOutput(img, `ScarlotSoft_Compare_${Date.now()}.png`);
                            }
                        }
                        
                        app.graph.setDirtyCanvas(true, true);
                        return true;
                    }
                }
                if (_origDown) return _origDown.call(this, e, pos);
                return false;
            };

            const _origMove = nodeType.prototype.onMouseMove;
            nodeType.prototype.onMouseMove = function(e, pos) {
                let handled = false;
                
                // 1. HOVER DINÁMICO DE BOTONES
                let newHoverBtn = null;
                for (let z of this.ui_zones) {
                    if (pos[0] >= z.x && pos[0] <= z.x + z.w && pos[1] >= z.y && pos[1] <= z.y + z.h) {
                        newHoverBtn = z.id;
                        break;
                    }
                }

                if (this._cmpHoverBtn !== newHoverBtn) {
                    this._cmpHoverBtn = newHoverBtn;
                    handled = true;
                }

                // 2. LÓGICA DEL DESLIZADOR (Solo si estamos en modo Split)
                if (this._cmpShowWhich === 0 && (this._cmpImg1 || this._cmpImg2)) {
                    const IMG_Y = 65; 
                    if (pos[1] >= IMG_Y && pos[1] <= this.size[1] && pos[0] >= 0 && pos[0] <= this.size[0]) {
                        this._cmpSplitX = Math.max(0, Math.min(1, pos[0] / this.size[0]));
                        handled = true;
                    } 
                    else if (this._cmpSplitX !== 0) {
                        this._cmpSplitX = 0;
                        handled = true;
                    }
                }
                
                if (handled) app.graph.setDirtyCanvas(true, true);
                if (_origMove) return _origMove.call(this, e, pos) || handled;
                return handled;
            };

            const _origLeave = nodeType.prototype.onMouseLeave;
            nodeType.prototype.onMouseLeave = function(e) {
                if (_origLeave) _origLeave.call(this, e);
                let handled = false;

                if (this._cmpHoverBtn !== null) {
                    this._cmpHoverBtn = null;
                    handled = true;
                }
                if (this._cmpSplitX !== 0) {
                    this._cmpSplitX = 0; 
                    handled = true;
                }
                if (handled) app.graph.setDirtyCanvas(true, true);
            };

            const _origResize = nodeType.prototype.onResize;
            nodeType.prototype.onResize = function (e) {
                if (_origResize) _origResize.call(this, e);
                this.size[0] = Math.max(this.size[0], 300);
                this.size[1] = Math.max(this.size[1], 300);
            };
        }
    }
});