import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.LoraLoader",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_LoraLoader") {

            // 1. CÁLCULO ABSOLUTO (Fijo a 75px, a prueba de balas)
            const getCustomHeight = (node) => {
                let h = 75; // Empezamos exactamente debajo de los 2 conectores
                if (node.scarlotLoras && node.scarlotLoras.length > 0) {
                    h += 24; // Fila Toggle All
                    h += node.scarlotLoras.length * 24; // Filas de cada Lora
                }
                h += 38; // Espacio del botón Add Lora y el margen inferior
                
                // DEVOLVEMOS 340 FIJO: Esto permite estirar y encoger el nodo libremente
                return [340, h]; 
            };

            const syncData = (node) => {
                const dataW = node.widgets.find(w => w.name === "lora_data");
                if (dataW) dataW.value = JSON.stringify(node.scarlotLoras);
                node.size = getCustomHeight(node);
                app.graph.setDirtyCanvas(true, true);
            };

            // Destrucción total de los widgets nativos
            const configureWidgets = (node) => {
                if (!node.widgets) return;
                node.widgets.forEach(w => {
                    if (w.name === "available_loras" || w.name === "lora_data") {
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
                
                this.scarlotLoras = [];
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
                
                const dataW = this.widgets.find(w => w.name === "lora_data");
                try {
                    this.scarlotLoras = dataW && dataW.value ? JSON.parse(dataW.value) : [];
                } catch { this.scarlotLoras = []; }
                this.size = this.computeSize();
            };

            // --- MOTOR DE ARRASTRE ---
            const onMouseMove = nodeType.prototype.onMouseMove;
            nodeType.prototype.onMouseMove = function(e, local_pos, canvas) {
                if (onMouseMove) onMouseMove.apply(this, arguments);
                
                // 2. ESCUDO PROTECTOR (No hace nada si el nodo está minimizado)
                if (this.flags && this.flags.collapsed) return; 
                
                if (this.dragging_idx !== null && this.dragging_idx !== undefined) {
                    
                    let list_start_y = 75 + 24; // 75px base + 24px de la fila Toggle All

                    let row_idx = Math.floor((local_pos[1] - list_start_y) / 24);
                    row_idx = Math.max(0, Math.min(row_idx, this.scarlotLoras.length - 1));
                    
                    if (row_idx !== this.dragging_idx) {
                        const item = this.scarlotLoras.splice(this.dragging_idx, 1)[0];
                        this.scarlotLoras.splice(row_idx, 0, item);
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

            // --- MOTOR DE DIBUJO ---
            const onDrawForeground = nodeType.prototype.onDrawForeground;
            nodeType.prototype.onDrawForeground = function (ctx, canvas) {
                if (onDrawForeground) onDrawForeground.apply(this, arguments);
                
                // 2. ESCUDO PROTECTOR (Evita dibujos flotantes si se minimiza)
                if (this.flags && this.flags.collapsed) return; 
                
                configureWidgets(this);

                const targetSize = getCustomHeight(this);
                this.size[1] = targetSize[1];
                if (this.size[0] < 340) this.size[0] = 340; 

                this.ui_zones = []; 
                const W = this.size[0];
                
                // 3. POSICIÓN Y ABSOLUTA (Aniquila el margen extra de raíz)
                let y = 75; 

                let cx = -100, cy = -100;
                if (canvas && canvas.graph_mouse) {
                    cx = canvas.graph_mouse[0] - this.pos[0];
                    cy = canvas.graph_mouse[1] - this.pos[1];
                }

                const checkHover = (z) => (cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h);
                const checkClick = (type, idx = null) => {
                    return this.clicked_zone && this.clicked_zone.type === type && this.clicked_zone.idx === idx;
                };

                // DIBUJAR HEADER (Toggle All)
                if (this.scarlotLoras.length > 0) {
                    const allOn = this.scarlotLoras.every(l => l.on);
                    
                    ctx.fillStyle = allOn ? "#e7161c" : "#444444"; 
                    ctx.beginPath(); ctx.roundRect(15, y + 4, 24, 12, 6); ctx.fill();
                    ctx.fillStyle = "#ffffff";
                    ctx.beginPath(); ctx.arc(allOn ? 33 : 21, y + 10, 4, 0, Math.PI * 2); ctx.fill();

                    ctx.fillStyle = "#888888"; ctx.font = "12px Arial"; ctx.textAlign = "left";
                    ctx.fillText("Toggle All", 45, y + 14);
                    ctx.textAlign = "right"; ctx.fillText("Strength", W - 15, y + 14);

                    this.ui_zones.push({ type: "toggle_all", x: 10, y: y, w: 90, h: 20 });
                    y += 24;
                }

                // DIBUJAR FILAS DE LORAS
                for (let i = 0; i < this.scarlotLoras.length; i++) {
                    const lora = this.scarlotLoras[i];
                    
                    if (this.dragging_idx === i) {
                        ctx.fillStyle = "rgba(231, 22, 28, 0.15)"; 
                    } else {
                        ctx.fillStyle = (i % 2 === 0) ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0)";
                    }
                    ctx.fillRect(5, y, W - 10, 22);

                    // Switch
                    ctx.fillStyle = lora.on ? "#e7161c" : "#444444";
                    ctx.beginPath(); ctx.roundRect(15, y + 5, 24, 12, 6); ctx.fill();
                    ctx.fillStyle = "#ffffff";
                    ctx.beginPath(); ctx.arc(lora.on ? 33 : 21, y + 11, 4, 0, Math.PI * 2); ctx.fill();
                    this.ui_zones.push({ type: "toggle", idx: i, x: 10, y: y, w: 34, h: 22 });

                    // Nombre del Lora
                    let displayName = lora.name.replace(".safetensors", "").replace(".pt", "");
                    let nameZone = { type: "name", idx: i, x: 45, y: y, w: W - 195, h: 22 };
                    const isNameHover = checkHover(nameZone);
                    this.ui_zones.push(nameZone);

                    ctx.fillStyle = lora.on ? (isNameHover ? "#e7161c" : "#eeeeee") : "#666666";
                    ctx.font = isNameHover ? "bold 12px Arial" : "12px Arial";
                    ctx.textAlign = "left";
                    
                    if (ctx.measureText(displayName).width > nameZone.w) {
                        while (ctx.measureText(displayName + "...").width > nameZone.w && displayName.length > 0) {
                            displayName = displayName.slice(0, -1);
                        }
                        displayName += "...";
                    }
                    ctx.fillText(displayName, 45, y + 16);

                    // 1. Icono de AGARRAR (Drag Handle)
                    let dragZone = { type: "drag", idx: i, x: W - 150, y: y, w: 16, h: 22 };
                    this.ui_zones.push(dragZone);
                    const isDragHover = checkHover(dragZone) || this.dragging_idx === i;
                    ctx.fillStyle = isDragHover ? "#e7161c" : "#666666";
                    let dx = W - 148;
                    let dy = y + 7;
                    ctx.fillRect(dx, dy, 8, 1.5);
                    ctx.fillRect(dx, dy + 3.5, 8, 1.5);
                    ctx.fillRect(dx, dy + 7, 8, 1.5);

                    // 2. Icono de INFO [i]
                    let infoZone = { type: "info", idx: i, x: W - 128, y: y, w: 14, h: 22 };
                    this.ui_zones.push(infoZone);
                    const isInfoHover = checkHover(infoZone);
                    const isInfoClick = checkClick("info", i);
                    ctx.fillStyle = isInfoClick ? "#e7161c" : (isInfoHover ? "#555" : "#444");
                    ctx.beginPath(); ctx.roundRect(infoZone.x, y + 4, 14, 14, 2); ctx.fill();
                    ctx.fillStyle = isInfoClick ? "#fff" : (isInfoHover ? "#e7161c" : "#fff");
                    ctx.textAlign = "center"; ctx.fillText("i", infoZone.x + 7, y + 15);

                    // 3. Icono ZAFACÓN
                    let trashZone = { type: "trash", idx: i, x: W - 108, y: y, w: 20, h: 22 };
                    this.ui_zones.push(trashZone);
                    const isTrashHover = checkHover(trashZone);
                    const isTrashClick = checkClick("trash", i);
                    const tx = W - 98; 
                    const ty = y + 5;
                    ctx.strokeStyle = isTrashClick ? "#ffffff" : (isTrashHover ? "#e7161c" : "#aaaaaa");
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(tx-4, ty+2); ctx.lineTo(tx+6, ty+2); 
                    ctx.moveTo(tx-1, ty+2); ctx.lineTo(tx-1, ty); ctx.lineTo(tx+3, ty); ctx.lineTo(tx+3, ty+2); 
                    ctx.moveTo(tx-3, ty+2); ctx.lineTo(tx-2, ty+10); ctx.lineTo(tx+4, ty+10); ctx.lineTo(tx+5, ty+2); 
                    ctx.stroke();
                    
                    // 4. Controles de Fuerza (Strength)
                    let downZone = { type: "down", idx: i, x: W - 85, y: y, w: 15, h: 22 };
                    let strZone = { type: "strength", idx: i, x: W - 65, y: y, w: 40, h: 22 };
                    let upZone = { type: "up", idx: i, x: W - 25, y: y, w: 15, h: 22 };
                    this.ui_zones.push(downZone, strZone, upZone);

                    ctx.fillStyle = checkHover(downZone) ? "#e7161c" : "#aaaaaa";
                    ctx.fillText("◄", W - 75, y + 16);
                    ctx.fillStyle = checkHover(strZone) ? "#e7161c" : "#ffffff";
                    ctx.fillText(lora.strength.toFixed(2), W - 45, y + 16);
                    ctx.fillStyle = checkHover(upZone) ? "#e7161c" : "#aaaaaa";
                    ctx.fillText("►", W - 15, y + 16);
                    ctx.textAlign = "left"; 

                    y += 24;
                }

                // DIBUJAR BOTÓN "+ Add Lora"
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
                ctx.fillText("+", W / 2 - 30, y + 20);

                ctx.fillStyle = isAddClick ? "#ffffff" : (isAddHover ? "#ffffff" : "#aaaaaa");
                ctx.font = "13px Arial"; ctx.textAlign = "left";
                ctx.fillText("Add Lora", W / 2 - 22, y + 19);
            };

            // --- INYECTOR DE MENÚ CON BUSCADOR ---
            const openSearchableMenu = (e, node, callback) => {
                const loraListWidget = node.widgets.find(w => w.name === "available_loras");
                const options = loraListWidget && loraListWidget.options ? loraListWidget.options.values : ["None"];
                
                const menu = new LiteGraph.ContextMenu(options, { event: e, callback: callback });

                if (menu && menu.root) {
                    const searchWrapper = document.createElement("div");
                    searchWrapper.style.padding = "4px";
                    searchWrapper.style.background = "#1d1d1d";
                    searchWrapper.style.borderBottom = "1px solid #444";
                    
                    const searchInput = document.createElement("input");
                    searchInput.type = "text";
                    searchInput.placeholder = "Filter list...";
                    searchInput.style.width = "100%";
                    searchInput.style.boxSizing = "border-box";
                    searchInput.style.padding = "4px";
                    searchInput.style.background = "#2a2a2a";
                    searchInput.style.color = "#ffffff";
                    searchInput.style.border = "1px solid #e7161c"; 
                    searchInput.style.outline = "none";
                    
                    const title = document.createElement("div");
                    title.innerText = "Choose a lora";
                    title.style.color = "#aaaaaa"; title.style.fontSize = "12px";
                    title.style.marginTop = "6px"; title.style.marginBottom = "2px";

                    searchWrapper.appendChild(searchInput);
                    searchWrapper.appendChild(title);
                    
                    menu.root.insertBefore(searchWrapper, menu.root.firstChild);
                    setTimeout(() => searchInput.focus(), 20);
                    
                    searchInput.addEventListener("keydown", (ev) => ev.stopPropagation()); 
                    searchInput.addEventListener("click", (ev) => ev.stopPropagation());
                    
                    searchInput.addEventListener("input", (ev) => {
                        const term = ev.target.value.toLowerCase();
                        const items = menu.root.querySelectorAll(".litemenu-entry");
                        items.forEach(item => {
                            if (item.textContent.toLowerCase().includes(term)) item.style.display = "";
                            else item.style.display = "none";
                        });
                    });
                }
            };

            // --- MANEJADOR DE CLICS ---
            const onMouseDown = nodeType.prototype.onMouseDown;
            nodeType.prototype.onMouseDown = function (e, local_pos, canvas) {
                if (onMouseDown && onMouseDown.apply(this, arguments)) return true;
                if (this.flags && this.flags.collapsed) return; // ESCUDO PROTECTOR

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
                            openSearchableMenu(e, this, (selected_lora) => {
                                this.scarlotLoras.push({ name: selected_lora, strength: 1.0, on: true });
                                syncData(this);
                            });
                            return true;
                        }
                        if (z.type === "name") {
                            openSearchableMenu(e, this, (selected_lora) => {
                                this.scarlotLoras[z.idx].name = selected_lora; 
                                syncData(this);
                            });
                            return true;
                        }
                        if (z.type === "strength") {
                            canvas.prompt("Strength:", this.scarlotLoras[z.idx].strength, function(v) {
                                const num = parseFloat(v);
                                if (!isNaN(num)) {
                                    this.scarlotLoras[z.idx].strength = num;
                                    syncData(this);
                                }
                            }.bind(this), e);
                            return true;
                        }
                        if (z.type === "toggle_all") {
                            const allOn = this.scarlotLoras.every(l => l.on);
                            this.scarlotLoras.forEach(l => l.on = !allOn);
                            syncData(this); return true;
                        }
                        if (z.type === "toggle") {
                            this.scarlotLoras[z.idx].on = !this.scarlotLoras[z.idx].on;
                            syncData(this); return true;
                        }
                        if (z.type === "down") {
                            this.scarlotLoras[z.idx].strength -= 0.05;
                            syncData(this); return true;
                        }
                        if (z.type === "up") {
                            this.scarlotLoras[z.idx].strength += 0.05;
                            syncData(this); return true;
                        }
                        if (z.type === "trash") {
                            this.scarlotLoras.splice(z.idx, 1);
                            syncData(this); return true;
                        }
                        if (z.type === "info") {
                            const loraName = this.scarlotLoras[z.idx].name;
                            fetch("/scarlotsoft/lora_info?name=" + encodeURIComponent(loraName))
                                .then(response => response.json())
                                .then(data => {
                                    if(data.info) alert(data.info);
                                    else if(data.error) alert("Error: " + data.error);
                                })
                                .catch(err => alert("Fallo al conectar con el servidor: " + err));
                            return true;
                        }
                    }
                }
                return false;
            };
        }
    }
});