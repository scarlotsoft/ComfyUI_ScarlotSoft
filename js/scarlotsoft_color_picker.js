import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ScarlotSoft.MaskFromColor",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ScarlotSoft_MaskFromColor") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                // Buscamos el campo de texto del Hexadecimal
                const colorWidget = this.widgets.find(w => w.name === "color_hex");
                
                if (colorWidget) {
                    // Creamos un selector de color HTML nativo (limpio, sin botones extra)
                    const colorInput = document.createElement("input");
                    colorInput.type = "color";
                    colorInput.value = colorWidget.value;
                    
                    // Le damos estilo para que se integre perfectamente en el nodo
                    Object.assign(colorInput.style, {
                        width: "100%",
                        height: "30px",
                        border: "none",
                        padding: "0",
                        cursor: "pointer",
                        background: "transparent"
                    });

                    // Añadimos el nuevo widget visual al nodo
                    const domWidget = this.addDOMWidget("color_picker", "color", colorInput, {
                        getValue: () => colorInput.value,
                        setValue: (v) => { 
                            colorInput.value = v; 
                            colorWidget.value = v; 
                        },
                    });
                    
                    // Hacemos que cuando elijas un color, actualice el texto oculto
                    colorInput.addEventListener("input", (e) => {
                        colorWidget.value = e.target.value;
                    });
                    
                    // Ocultamos el viejo campo de texto para mantener la interfaz impecable
                    colorWidget.type = "hidden";
                    colorWidget.computeSize = () => [0, -4];
                }
                return r;
            };
        }
    }
});