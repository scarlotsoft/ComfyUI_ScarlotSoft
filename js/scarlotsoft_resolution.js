import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.ResolutionUI",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_Resolution") {
            
            // --- 1. BLINDAJE DINÁMICO DEL TAMAÑO PARA 4 WIDGETS ---
            const computeSize = nodeType.prototype.computeSize;
            nodeType.prototype.computeSize = function(out) {
                let size = computeSize ? computeSize.apply(this, arguments) : [330, 150];
                
                size[0] = Math.max(size[0], 330);
                
                // Calculamos altura basándonos en la cantidad de widgets reales más el colchón inferior
                let minHeight = 40 + (this.widgets ? this.widgets.length * 24 : 0);
                size[1] = Math.max(size[1] + 20, minHeight + 55); 
                
                return size;
            };

            // --- 2. FORZAR TAMAÑO SEGURO AL CREAR ---
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                this.color = "#1d1d1d";
                this.bgcolor = "#2a2a2a";
                this.title_text_color = "#ffffff";
                
                setTimeout(() => {
                    let sz = this.computeSize();
                    sz[1] += 15; // Colchón de seguridad inamovible
                    this.setSize(sz);
                    app.graph.setDirtyCanvas(true, true);
                }, 100);
            };

            // --- 3. DIBUJO DEL TEXTO INFERIOR ---
            const onDrawForeground = nodeType.prototype.onDrawForeground;
            nodeType.prototype.onDrawForeground = function (ctx, canvas) {
                if (onDrawForeground) onDrawForeground.apply(this, arguments);
                if (this.flags && this.flags.collapsed) return;
                
                const mpWidget = this.widgets?.find(w => w.name === "megapixel");
                const arWidget = this.widgets?.find(w => w.name === "aspect_ratio");
                const divWidget = this.widgets?.find(w => w.name === "divisible_by");
                const batchWidget = this.widgets?.find(w => w.name === "batch_size");
                
                if (!mpWidget || !arWidget || !divWidget || !batchWidget) return;

                const mp = parseFloat(mpWidget.value) || 1.0;
                const ar = arWidget.value || "1:1";
                const div = parseInt(divWidget.value, 10) || 64;
                const batch = parseInt(batchWidget.value, 10) || 1;
                
                const ratio_str = ar.split(" ")[0];
                const parts = ratio_str.split(":");
                let ratio = 1;
                if(parts.length === 2) {
                    ratio = parseFloat(parts[0]) / parseFloat(parts[1]);
                }

                const total_pixels = mp * 1000000;
                let h = Math.sqrt(total_pixels / ratio);
                let w = h * ratio;
                
                w = Math.round(w / div) * div;
                h = Math.round(h / div) * div;

                ctx.fillStyle = "#aaaaaa"; 
                ctx.font = "14px Arial"; 
                ctx.textAlign = "center";
                
                // Mostramos resolución exacta y el conteo de batch entre paréntesis a un lado
                ctx.fillText(`${w} x ${h} (x${batch})`, this.size[0] / 2, this.size[1] - 16); 
            };
            
            // --- 4. FORZAR AL CARGAR WORKFLOW ---
            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function () {
                if (onConfigure) onConfigure.apply(this, arguments);
                
                setTimeout(() => {
                    let sz = this.computeSize();
                    sz[1] += 15;
                    this.setSize(sz);
                    app.graph.setDirtyCanvas(true, true);
                }, 100);

                if (this.widgets) {
                    this.widgets.forEach(w => {
                        const origCallback = w.callback;
                        w.callback = function() {
                            if (origCallback) origCallback.apply(this, arguments);
                            app.graph.setDirtyCanvas(true, true);
                        };
                    });
                }
            };
        }
    }
});