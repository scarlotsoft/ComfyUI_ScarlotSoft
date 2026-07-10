import comfy.sd
import comfy.utils
import folder_paths
import json
import re
import os

class ScarlotSoft_PromptBuilderAutoLoaderPro:
    def __init__(self):
        self.auto_counters = {}

    MAX_FILES = 20 # El límite máximo de salidas dinámicas que soportará el nodo

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "model": ("MODEL",),
                "clip": ("CLIP",),
                "string_a": ("STRING", {"multiline": True, "default": ""}),
                "string_b": ("STRING", {"multiline": True, "default": ""}),
                "file_data": ("STRING", {"default": "[]", "multiline": True}),
            }
        }

    # Definimos los 4 fijos + 20 opcionales para los archivos
    RETURN_TYPES = ("MODEL", "CLIP", "STRING", "STRING") + ("STRING",) * MAX_FILES
    RETURN_NAMES = ("MODEL", "CLIP", "GLOBAL PROMPT", "LOADED LORAS") + tuple([f"File {i+1}" for i in range(MAX_FILES)])
    
    FUNCTION = "execute"
    CATEGORY = "ScarlotSoft/Prompt/Lora/Text"

    @classmethod
    def IS_CHANGED(s, file_data="[]", **kwargs):
        try:
            files = json.loads(file_data)
            for f in files:
                if f.get("mode", "Auto") == "Auto" and f.get("on", True):
                    return float("NaN") 
        except:
            pass
        return file_data

    def execute(self, model, clip, string_a, string_b, file_data="[]", **kwargs):
        try:
            files = json.loads(file_data)
        except:
            files = []

        input_dir = folder_paths.get_input_directory()
        
        # Guardaremos el texto puro de CADA archivo por separado para las salidas dinámicas
        file_texts_raw = []
        # Guardaremos todo mezclado SOLO para buscar y extraer los LoRAs
        all_text_for_loras = [string_a.strip(), string_b.strip()]

        for f in files:
            if not f.get("on", True):
                file_texts_raw.append("") # Mantenemos el índice alineado aunque esté apagado
                continue

            path = f.get("path", "")
            mode = f.get("mode", "Auto")
            idx = int(f.get("index", 0))

            if not path:
                file_texts_raw.append("")
                continue

            full_path = path if os.path.isabs(path) else os.path.join(input_dir, path)
            line_found = ""

            if os.path.exists(full_path) and os.path.isfile(full_path):
                try:
                    with open(full_path, "r", encoding="utf-8") as file:
                        lines = [l.strip() for l in file.readlines() if l.strip()]
                        if lines:
                            if mode == "Auto":
                                current_idx = self.auto_counters.get(full_path, 0)
                                line_found = lines[current_idx % len(lines)]
                                self.auto_counters[full_path] = current_idx + 1
                            else:
                                line_found = lines[idx % len(lines)]
                except Exception as e:
                    print(f"[ScarlotSoft] Error leyendo el archivo {full_path}: {e}")

            file_texts_raw.append(line_found)
            all_text_for_loras.append(line_found)

        # Unimos todo SOLO para extraer los embeddings y loras globalmente
        full_prompt = "\n\n".join([p for p in all_text_for_loras if p])

        loaded_items_list = []
        
        # --- 1. PROCESAR EMBEDDINGS ---
        emb_regex = r"embedding:([^\s,:]+)"
        emb_matches = re.findall(emb_regex, full_prompt, re.IGNORECASE)
        available_embs = folder_paths.get_filename_list("embeddings") if "embeddings" in folder_paths.folder_names_and_paths else []
        
        for emb_name in set(emb_matches): 
            found = any(e == emb_name or e.startswith(f"{emb_name}.") for e in available_embs)
            if found:
                loaded_items_list.append(f"🧬 {emb_name} (Embedding validado)")
            else:
                loaded_items_list.append(f"❌ {emb_name} (No encontrado)")

        # --- 2. PROCESAR LORAS ---
        lora_regex = r"<(?:lora|lyco|hypernet):([^:]+)(?::([^>]+))?>"
        lora_matches = re.findall(lora_regex, full_prompt, re.IGNORECASE)

        current_model = model
        current_clip = clip
        available_loras = folder_paths.get_filename_list("loras")

        def find_lora_file(target_name):
            for l in available_loras:
                if l == target_name: return l
                for ext in [".safetensors", ".pt", ".ckpt", ""]:
                    if l.endswith(f"/{target_name}{ext}") or l.endswith(f"\\{target_name}{ext}") or l == f"{target_name}{ext}":
                        return l
            return None

        for match in lora_matches:
            lora_name = match[0].strip()
            strength_str = match[1].strip() if match[1] else "1.0"
            try: strength = float(strength_str)
            except: strength = 1.0

            lora_filename = find_lora_file(lora_name)
            if lora_filename:
                lora_path = folder_paths.get_full_path("loras", lora_filename)
                if lora_path:
                    try:
                        lora_model = comfy.utils.load_torch_file(lora_path, safe_load=True)
                        current_model, current_clip = comfy.sd.load_lora_for_models(
                            current_model, current_clip, lora_model, strength, strength
                        )
                        loaded_items_list.append(f"✅ {lora_filename} (Strength: {strength})")
                    except Exception as e:
                        print(f"[ScarlotSoft] Error aplicando LoRA {lora_filename}: {e}")
            else:
                loaded_items_list.append(f"❌ {lora_name} (No encontrado)")

        # Función mágica para limpiar los tags de LoRA de un texto
        def clean_tags(text):
            c = re.sub(r"<(?:lora|lyco|hypernet):[^>]+>", "", text, flags=re.IGNORECASE).strip()
            return re.sub(r"\n{3,}", "\n\n", c)

        # 3. PREPARAR LAS SALIDAS DINÁMICAS
        # El Global Prompt ahora solo tiene el texto de las cajas superiores (ideal para fondos)
        global_prompt = clean_tags("\n\n".join([p for p in [string_a.strip(), string_b.strip()] if p]))
        loaded_str = "\n".join(loaded_items_list) if loaded_items_list else "Ningún LoRA/Embedding autocargado."

        # Limpiamos cada archivo por separado
        final_file_outputs = [clean_tags(t) for t in file_texts_raw]
        
        # Rellenamos con texto vacío hasta llegar al límite de MAX_FILES
        while len(final_file_outputs) < self.MAX_FILES:
            final_file_outputs.append("")

        # Retornamos la tupla gigante. ¡JavaScript se encargará de ocultar los que no usamos!
        return (current_model, current_clip, global_prompt, loaded_str, *final_file_outputs)

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_PromptBuilderAutoLoaderPro": ScarlotSoft_PromptBuilderAutoLoaderPro
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_PromptBuilderAutoLoaderPro": "ScarlotSoft Prompt Builder Pro"
}