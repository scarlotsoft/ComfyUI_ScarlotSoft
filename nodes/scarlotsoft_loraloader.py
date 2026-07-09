import comfy.sd
import comfy.utils
import folder_paths
import json
import os
from server import PromptServer
from aiohttp import web

# --- API DE SCARLOTSOFT PARA LEER METADATOS SAFETENSORS ---
@PromptServer.instance.routes.get("/scarlotsoft/lora_info")
async def get_lora_info(request):
    name = request.query.get("name", "")
    if not name:
        return web.json_response({"error": "Nombre no proporcionado."})
    
    lora_path = folder_paths.get_full_path("loras", name)
    if not lora_path or not os.path.exists(lora_path):
        return web.json_response({"error": "Archivo Lora no encontrado."})
    
    try:
        # Extraemos solo la cabecera (Header) del safetensors donde viven los metadatos
        with open(lora_path, 'rb') as f:
            header_size_bytes = f.read(8)
            if len(header_size_bytes) < 8:
                return web.json_response({"info": "El archivo no es un safetensors válido."})
            
            header_size = int.from_bytes(header_size_bytes, 'little', signed=False)
            if header_size <= 0 or header_size > 100000000: # Protección contra archivos corruptos
                return web.json_response({"info": "El archivo no es un safetensors válido."})
            
            header = f.read(header_size)
            metadata = json.loads(header).get("__metadata__", {})
            
            if not metadata:
                return web.json_response({"info": "Este Lora no contiene metadatos guardados por su creador."})

            # Búsqueda de Triggers y Etiquetas comunes en Kohya-ss o formatos estándar
            tags = "No se encontraron etiquetas (triggers) en los metadatos."
            if "ss_tag_frequency" in metadata:
                freq = json.loads(metadata["ss_tag_frequency"])
                tag_list = []
                for k, v in freq.items():
                    tag_list.extend(list(v.keys()))
                if tag_list:
                    tags = ", ".join(list(set(tag_list)))
            elif "modelspec.tags" in metadata:
                tags = metadata["modelspec.tags"]

            info = f"Nombre: {name}\n\n🏷️ Etiquetas / Triggers:\n{tags}\n"
            
            if "ss_sd_model_name" in metadata:
                info += f"\n⚙️ Modelo Base: {metadata['ss_sd_model_name']}"
            if "ss_resolution" in metadata:
                info += f"\n📐 Resolución de Entrenamiento: {metadata['ss_resolution']}"
                
            return web.json_response({"info": info})
    except Exception as e:
        return web.json_response({"error": f"Error leyendo metadatos: {str(e)}"})

# --- NODO PRINCIPAL ---
class ScarlotSoft_LoraLoader:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "model": ("MODEL",),
                "clip": ("CLIP",),
                "available_loras": (folder_paths.get_filename_list("loras"), ),
                "lora_data": ("STRING", {"default": "[]", "multiline": True}),
            }
        }

    RETURN_TYPES = ("MODEL", "CLIP")
    FUNCTION = "execute"
    CATEGORY = "ScarlotSoft/Lora/Loader"

    def execute(self, model, clip, available_loras, lora_data="[]", **kwargs):
        current_model = model
        current_clip = clip

        try:
            loras = json.loads(lora_data)
        except:
            loras = []

        for l in loras:
            if not l.get("on", True):
                continue

            lora_name = l.get("name")
            strength = float(l.get("strength", 1.0))

            if not lora_name:
                continue

            lora_path = folder_paths.get_full_path("loras", lora_name)
            if not lora_path:
                print(f"[ScarlotSoft] Advertencia: Lora no encontrado -> {lora_name}")
                continue

            try:
                lora_model = comfy.utils.load_torch_file(lora_path, safe_load=True)
                current_model, current_clip = comfy.sd.load_lora_for_models(
                    current_model, current_clip, lora_model, strength, strength
                )
            except Exception as e:
                print(f"[ScarlotSoft] Error aplicando Lora {lora_name}: {e}")

        return (current_model, current_clip)

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_LoraLoader": ScarlotSoft_LoraLoader
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_LoraLoader": "ScarlotSoft Lora Loader"
}