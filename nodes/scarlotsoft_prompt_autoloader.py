import comfy.sd
import comfy.utils
import folder_paths
import json
import re
import os

class ScarlotSoft_PromptBuilderAutoLoader:
    def __init__(self):
        self.auto_counters = {}

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

    RETURN_TYPES = ("MODEL", "CLIP", "STRING", "STRING")
    RETURN_NAMES = ("MODEL", "CLIP", "PROMPT", "LOADED LORAS")
    FUNCTION = "execute"
    CATEGORY = "ScarlotSoft/Prompt/Lora/Text"

    @classmethod
    def IS_CHANGED(s, file_data="[]", **kwargs):
        try:
            files = json.loads(file_data)
            for f in files:
                # Solo rompemos el caché si está en Auto Y el archivo está activado
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

        file_lines = []
        input_dir = folder_paths.get_input_directory()

        for f in files:
            # Si el switch está desactivado, saltamos este archivo por completo
            if not f.get("on", True):
                continue

            path = f.get("path", "")
            mode = f.get("mode", "Auto")
            idx = int(f.get("index", 0))

            if not path:
                continue

            if not os.path.isabs(path):
                full_path = os.path.join(input_dir, path)
            else:
                full_path = path

            if os.path.exists(full_path) and os.path.isfile(full_path):
                try:
                    with open(full_path, "r", encoding="utf-8") as file:
                        lines = [l.strip() for l in file.readlines() if l.strip()]
                        if lines:
                            if mode == "Auto":
                                current_idx = self.auto_counters.get(full_path, 0)
                                file_lines.append(lines[current_idx % len(lines)])
                                self.auto_counters[full_path] = current_idx + 1
                            else:
                                file_lines.append(lines[idx % len(lines)])
                except Exception as e:
                    print(f"[ScarlotSoft] Error leyendo el archivo {full_path}: {e}")

        # Ensamblar Prompt
        prompt_parts = [string_a.strip(), string_b.strip()] + file_lines
        full_prompt = "\n\n".join([p for p in prompt_parts if p])

        loaded_items_list = []
        
        # --- 1. PROCESAR EMBEDDINGS ---
        emb_regex = r"embedding:([^\s,:]+)"
        emb_matches = re.findall(emb_regex, full_prompt, re.IGNORECASE)
        available_embs = folder_paths.get_filename_list("embeddings") if "embeddings" in folder_paths.folder_names_and_paths else []
        
        for emb_name in set(emb_matches): 
            found = False
            for e in available_embs:
                if e == emb_name or e.startswith(f"{emb_name}."):
                    found = True
                    break
            
            if found:
                loaded_items_list.append(f"🧬 {emb_name} (Embedding validado)")
            else:
                loaded_items_list.append(f"❌ {emb_name} (Embedding no encontrado)")

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
            try:
                strength = float(strength_str)
            except:
                strength = 1.0

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
                loaded_items_list.append(f"❌ {lora_name} (LoRA no encontrado)")

        clean_prompt = re.sub(r"<(?:lora|lyco|hypernet):[^>]+>", "", full_prompt, flags=re.IGNORECASE).strip()
        clean_prompt = re.sub(r"\n{3,}", "\n\n", clean_prompt)

        loaded_str = "\n".join(loaded_items_list) if loaded_items_list else "Ningún LoRA/Embedding autocargado."
        return (current_model, current_clip, clean_prompt, loaded_str)

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_PromptBuilderAutoLoader": ScarlotSoft_PromptBuilderAutoLoader
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_PromptBuilderAutoLoader": "ScarlotSoft Prompt Builder + AutoLoader"
}