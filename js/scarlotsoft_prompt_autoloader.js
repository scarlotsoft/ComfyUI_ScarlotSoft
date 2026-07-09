import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.PromptAutoLoader",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_PromptBuilderAutoLoader") {

            const getCustomY = (node) => {
                let y = 0;
                const string_b = node.widgets?.find(w => w.name === "string_b");
                
                if (string_b && string_b.last_y !== undefined) {
                    y = string_b.last_y + 60 + 4; 
                } else {
                    let in_h = node.inputs ? node.inputs.length * 20 : 0;
                    let out_h = node.outputs ? node.outputs.length * 20 : 0;
                    y = 30 + Math.max(in_h, out_h) + (64 * 2);
                }
                return y + 10; 
            };

            const getCustomHeight = (node) => {
                let y = getCustomY(node);
                if (node.scarlotFiles && node.scarlotFiles.length > 0) {
                    y += node.scarlotFiles.length * 24; 
                }
                y += 38; 
                let min_out_h = 30 + (node.outputs ? node.outputs.length * 20 : 0) + 10;
                return [480, Math.max(y, min_out_h)]; 
            };

            const syncData = (node) => {
                const dataW = node.widgets.find(w => w.name === "file_data");
                if (dataW) dataW.value = JSON.stringify(node.scarlotFiles);
                node.size = getCustomHeight(node);
                app.graph.setDirtyCanvas(true, true);
            };

            const configureWidgets = (node) => {
                if (!node.widgets) return;
                node.widgets.forEach(w => {
                    if (w.name === "string_a" || w.name === "string_b") {
                        w.label = w.name === "string_a" ? "Quality Prompt" : "Styles Loras";
                        w.computeSize = (width) => [width, 60]; 
                        
                        if (w.element) {
                            w.element.style.height = "60px";
                            w.element.style.minHeight = "60px";
                            w.element.style.maxHeight = "60px";
                        }
                        if (w.inputEl) {
                            w.inputEl.style.height = "100%";
                            w.inputEl.style.minHeight = "100%";
                            w.inputEl.style.maxHeight = "100%";
                        }
                    }
                    if (w.name === "file_data") {
                        w.type = "converted-widget"; 
                        w.hidden = true;
                        w.computeSize = () => [0, 0];
                        w.draw = () => {};
                        if (w.element) {
                            w.element.style.display = "none";
                            w.element.style.pointerEvents = "none";
                            w.element.style.position = "absolute";
                            w.element.style.top = "-9999px"; 
                        }
                    }
                });
            };

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";
                
                this.scarlotFiles = [];
                this.ui_zones = [];
                this.clicked_zone = null;
                this.dragging_idx = null;

                configureWidgets(this);
                this.computeSize = () => getCustomHeight(this);
                this.size = this.computeSize();
            };

            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function () {
                if (onConfigure) onConfigure.apply(this, arguments);
                configureWidgets(this);
                this.computeSize = () => getCustomHeight(this);
                
                const dataW = this.widgets.find(w => w.name === "file_data");
                try {
                    this.scarlotFiles = dataW && dataW.value ? JSON.parse(dataW.value) : [];
                } catch { this.scarlotFiles = []; }
                this.size = this.computeSize();
            };

            const onMouseMove = nodeType.prototype.onMouseMove;
            nodeType.prototype.onMouseMove = function(e, local_pos, canvas) {
                if (onMouseMove) onMouseMove.apply(this, arguments);
                if (this.flags && this.flags.collapsed) return;
                
                if (this.dragging_idx !== null && this.dragging_idx !== undefined) {
                    
                    let list_start_y = getCustomY(this); 

                    let row_idx = Math.floor((local_pos[1] - list_start_y) / 24);
                    row_idx = Math.max(0, Math.min(row_idx, this.scarlotFiles.length - 1));
                    
                    if (row_idx !== this.dragging_idx) {
                        const item = this.scarlotFiles.splice(this.dragging_idx, 1)[0];
                        this.scarlotFiles.splice(row_idx, 0, item);
                        this.dragging_idx = row_idx; 
                    }
                }
                app.graph.setDirtyCanvas(true, true); 
            };

            const onMouseUp = nodeType.prototype.onMouseUp;
            nodeType.prototype.onMouseUp = function(e, local_pos, canvas) {
                if (onMouseUp) onMouseUp.apply(this, arguments);
                if (this.flags && this.flags.collapsed) return;
                
                let needsSync = false;
                if (this.dragging_idx !== null && this.dragging_idx !== undefined) {
                    this.dragging_idx = null;
                    needsSync = true;
                }
                if (this.clicked_zone) {
                    this.clicked_zone = null;
                    needsSync = true;
                }
                if (needsSync) syncData(this);
            };

            const onDrawForeground = nodeType.prototype.onDrawForeground;
            nodeType.prototype.onDrawForeground = function (ctx, canvas) {
                if (onDrawForeground) onDrawForeground.apply(this, arguments);
                if (this.flags && this.flags.collapsed) return;
                
                configureWidgets(this);

                const targetSize = getCustomHeight(this);
                this.size[1] = targetSize[1];
                if (this.size[0] < 480) this.size[0] = 480; 

                this.ui_zones = []; 
                const W = this.size[0];
                let y = getCustomY(this);

                let cx = -100, cy = -100;
                if (canvas && canvas.graph_mouse) {
                    cx = canvas.graph_mouse[0] - this.pos[0];
                    cy = canvas.graph_mouse[1] - this.pos[1];
                }

                const checkHover = (z) => (cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h);
                const checkClick = (type, idx = null) => {
                    return this.clicked_zone && this.clicked_zone.type === type && this.clicked_zone.idx === idx;
                };

                for (let i = 0; i < this.scarlotFiles.length; i++) {
                    const f = this.scarlotFiles[i];
                    
                    // Asignar estado "on" por defecto si es un archivo viejo
                    if (f.on === undefined) f.on = true; 

                    if (this.dragging_idx === i) ctx.fillStyle = "rgba(231, 22, 28, 0.15)"; 
                    else ctx.fillStyle = (i % 2 === 0) ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0)";
                    ctx.fillRect(5, y, W - 10, 22);

                    // 1. Switch de Activación
                    ctx.fillStyle = f.on ? "#e7161c" : "#444444";
                    ctx.beginPath(); ctx.roundRect(10, y + 5, 24, 12, 6); ctx.fill();
                    ctx.fillStyle = "#ffffff";
                    ctx.beginPath(); ctx.arc(f.on ? 28 : 16, y + 11, 4, 0, Math.PI * 2); ctx.fill();
                    this.ui_zones.push({ type: "toggle", idx: i, x: 5, y: y, w: 34, h: 22 });

                    // 2. Textbox Path (Movido a la derecha)
                    let pathZone = { type: "path", idx: i, x: 45, y: y, w: W - 255, h: 22 };
                    this.ui_zones.push(pathZone);
                    
                    // Si el switch está apagado, el texto se vuelve gris oscuro
                    ctx.fillStyle = checkHover(pathZone) ? "#e7161c" : (f.path ? (f.on ? "#eeeeee" : "#666666") : "#888888");
                    ctx.font = checkHover(pathZone) ? "bold 12px Arial" : "12px Arial";
                    
                    let displayPath = f.path ? f.path.split(/[/\\]/).pop() : "Click to select file...";
                    if (ctx.measureText(displayPath).width > pathZone.w) {
                        while (ctx.measureText(displayPath + "...").width > pathZone.w && displayPath.length > 0) {
                            displayPath = displayPath.slice(0, -1);
                        }
                        displayPath += "...";
                    }
                    ctx.fillText(displayPath, pathZone.x, y + 16);

                    // 3. Mode Auto/Index
                    let modeZone = { type: "mode", idx: i, x: W - 200, y: y, w: 50, h: 22 };
                    this.ui_zones.push(modeZone);
                    const isModeHover = checkHover(modeZone);
                    ctx.fillStyle = isModeHover ? "#e7161c" : (f.on ? "#333333" : "#222222"); // Más oscuro si está apagado
                    ctx.beginPath(); ctx.roundRect(modeZone.x, y + 3, modeZone.w, 16, 4); ctx.fill();
                    ctx.fillStyle = f.on ? "#ffffff" : "#666666";
                    ctx.font = "11px Arial"; ctx.textAlign = "center";
                    ctx.fillText(f.mode, modeZone.x + modeZone.w/2, y + 15);
                    ctx.textAlign = "left"; 

                    // 4. Controles de Index
                    let idxArea_X = W - 140;
                    if (f.mode === "Index") {
                        let downZone = { type: "down_idx", idx: i, x: idxArea_X, y: y, w: 15, h: 22 };
                        let idxZone = { type: "index", idx: i, x: idxArea_X + 20, y: y, w: 20, h: 22 };
                        let upZone = { type: "up_idx", idx: i, x: idxArea_X + 45, y: y, w: 15, h: 22 };
                        this.ui_zones.push(downZone, idxZone, upZone);

                        ctx.fillStyle = checkHover(downZone) ? "#e7161c" : (f.on ? "#aaaaaa" : "#444444");
                        ctx.fillText("◄", downZone.x, y + 16);
                        
                        ctx.fillStyle = checkHover(idxZone) ? "#e7161c" : (f.on ? "#ffffff" : "#666666");
                        ctx.textAlign = "center";
                        ctx.fillText(f.index.toString(), idxZone.x + 10, y + 16);
                        ctx.textAlign = "left";

                        ctx.fillStyle = checkHover(upZone) ? "#e7161c" : (f.on ? "#aaaaaa" : "#444444");
                        ctx.fillText("►", upZone.x, y + 16);
                    } else {
                        ctx.fillStyle = f.on ? "#555555" : "#333333";
                        ctx.textAlign = "center";
                        ctx.fillText("- Auto -", idxArea_X + 30, y + 16);
                        ctx.textAlign = "left";
                    }

                    // 5. Icono Agarrar (Drag) 
                    let dragZone = { type: "drag", idx: i, x: W - 60, y: y, w: 16, h: 22 };
                    this.ui_zones.push(dragZone);
                    const isDragHover = checkHover(dragZone) || this.dragging_idx === i;
                    ctx.fillStyle = isDragHover ? "#e7161c" : (f.on ? "#666666" : "#444444");
                    let dx = W - 58; let dy = y + 7;
                    ctx.fillRect(dx, dy, 8, 1.5);
                    ctx.fillRect(dx, dy + 3.5, 8, 1.5);
                    ctx.fillRect(dx, dy + 7, 8, 1.5);

                    // 6. Icono Zafacón [x]
                    let trashZone = { type: "trash", idx: i, x: W - 35, y: y, w: 20, h: 22 };
                    this.ui_zones.push(trashZone);
                    const isTrashHover = checkHover(trashZone);
                    const isTrashClick = checkClick("trash", i);
                    const tx = W - 25; 
                    const ty = y + 5;
                    ctx.strokeStyle = isTrashClick ? "#ffffff" : (isTrashHover ? "#e7161c" : (f.on ? "#aaaaaa" : "#555555"));
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(tx-4, ty+2); ctx.lineTo(tx+6, ty+2); 
                    ctx.moveTo(tx-1, ty+2); ctx.lineTo(tx-1, ty); ctx.lineTo(tx+3, ty); ctx.lineTo(tx+3, ty+2); 
                    ctx.moveTo(tx-3, ty+2); ctx.lineTo(tx-2, ty+10); ctx.lineTo(tx+4, ty+10); ctx.lineTo(tx+5, ty+2); 
                    ctx.stroke();

                    y += 24;
                }

                // DIBUJAR BOTÓN "+ Add File"
                y += 5;
                const btn_w = W - 20;
                const btn_h = 28;
                let btnZone = { type: "add_btn", x: 10, y: y, w: btn_w, h: btn_h };
                this.ui_zones.push(btnZone);

                const isAddHover = checkHover(btnZone);
                const isAddClick = checkClick("add_btn");

                ctx.fillStyle = isAddClick ? "#e7161c" : "#242424";
                ctx.beginPath(); ctx.roundRect(10, y, btn_w, btn_h, 4); ctx.fill();

                ctx.strokeStyle = isAddClick ? "#e7161c" : (isAddHover ? "#e7161c" : "#333333");
                ctx.lineWidth = 1; ctx.stroke();

                ctx.fillStyle = isAddClick ? "#ffffff" : "#e7161c"; 
                ctx.font = "bold 18px Arial"; ctx.textAlign = "right";
                ctx.fillText("+", W / 2 - 35, y + 20);

                ctx.fillStyle = isAddClick ? "#ffffff" : (isAddHover ? "#ffffff" : "#aaaaaa");
                ctx.font = "13px Arial"; ctx.textAlign = "left";
                ctx.fillText("Add File", W / 2 - 27, y + 19);
            };

            // --- MANEJADOR DE CLICS ---
            const onMouseDown = nodeType.prototype.onMouseDown;
            nodeType.prototype.onMouseDown = function (e, local_pos, canvas) {
                if (onMouseDown && onMouseDown.apply(this, arguments)) return true;
                if (this.flags && this.flags.collapsed) return;

                const [cx, cy] = local_pos;

                for (let z of this.ui_zones) {
                    if (cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h) {
                        
                        if (z.type === "drag") {
                            this.dragging_idx = z.idx;
                            return true; 
                        }

                        this.clicked_zone = z;
                        app.graph.setDirtyCanvas(true, true);

                        if (z.type === "add_btn") {
                            // Ahora el botón añade los archivos con el "on" en true por defecto
                            this.scarlotFiles.push({ path: "", mode: "Auto", index: 0, on: true });
                            syncData(this);
                            return true;
                        }
                        
                        // Acción del Toggle Switch
                        if (z.type === "toggle") {
                            this.scarlotFiles[z.idx].on = !this.scarlotFiles[z.idx].on;
                            syncData(this); return true;
                        }
                        
                        if (z.type === "path") {
                            canvas.prompt("Filename (in ComfyUI/input) or Absolute path:", this.scarlotFiles[z.idx].path, function(v) {
                                this.scarlotFiles[z.idx].path = v;
                                syncData(this);
                            }.bind(this), e);
                            return true;
                        }
                        if (z.type === "mode") {
                            this.scarlotFiles[z.idx].mode = this.scarlotFiles[z.idx].mode === "Auto" ? "Index" : "Auto";
                            syncData(this); return true;
                        }
                        if (z.type === "index") {
                            canvas.prompt("Line Index:", this.scarlotFiles[z.idx].index, function(v) {
                                const num = parseInt(v);
                                if (!isNaN(num)) {
                                    this.scarlotFiles[z.idx].index = Math.max(0, num);
                                    syncData(this);
                                }
                            }.bind(this), e);
                            return true;
                        }
                        if (z.type === "down_idx") {
                            this.scarlotFiles[z.idx].index = Math.max(0, this.scarlotFiles[z.idx].index - 1);
                            syncData(this); return true;
                        }
                        if (z.type === "up_idx") {
                            this.scarlotFiles[z.idx].index += 1;
                            syncData(this); return true;
                        }
                        if (z.type === "trash") {
                            this.scarlotFiles.splice(z.idx, 1);
                            syncData(this); return true;
                        }
                    }
                }
                return false;
            };
        }
    }
});