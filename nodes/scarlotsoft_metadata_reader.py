import os
import json
import torch
import numpy as np
from PIL import Image, ImageOps
import folder_paths

class ScarlotSoft_MetadataReader:
    @classmethod
    def INPUT_TYPES(s):
        input_dir = folder_paths.get_input_directory()
        try:
            files = [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f))]
        except:
            files = []
            
        return {
            "required": {
                # Input interno puro (carga desde el disco)
                "image": (sorted(files), {"image_upload": True}),
            }
        }

    # ¡NUEVO! Ahora el nodo escupe el texto Y la imagen en formato Tensor
    RETURN_TYPES = ("STRING", "IMAGE")
    RETURN_NAMES = ("METADATA", "IMAGE")
    FUNCTION = "read_metadata"
    CATEGORY = "ScarlotSoft/Text/Metadata"

    def read_metadata(self, image):
        metadata_none = "Metadata: NONE"
        
        # Ruta absoluta de la imagen seleccionada en el disco
        image_path = folder_paths.get_annotated_filepath(image)
        
        # Generar un tensor vacío de emergencia por si la imagen no existe
        empty_tensor = torch.zeros((1, 64, 64, 3), dtype=torch.float32, device="cpu")
        
        if not os.path.exists(image_path):
            return (metadata_none, empty_tensor)
            
        try:
            img = Image.open(image_path)
            
            # --- MOTOR DE CONVERSIÓN A TENSOR PARA COMFYUI ---
            # Corregimos la orientación EXIF por si es una foto de celular y la convertimos a RGB puro
            img_rgb = ImageOps.exif_transpose(img).convert("RGB")
            # Convertimos los píxeles a un array matemático de Numpy y luego a un Tensor de Torch (0.0 a 1.0)
            image_tensor = torch.from_numpy(np.array(img_rgb).astype(np.float32) / 255.0).unsqueeze(0)
            
            # --- LECTURA DE METADATOS ---
            if "prompt" in img.info:
                prompt_data = json.loads(img.info["prompt"])
                
                ckpt = "NONE"
                seed = "NONE"
                steps = "NONE"
                cfg = "NONE"
                sampler = "NONE"
                scheduler = "NONE"
                prompt_text = ""
                loras = []
                lycos = []
                hypers = []
                
                for node_id, node in prompt_data.items():
                    class_type = node.get("class_type", "")
                    inputs = node.get("inputs", {})
                    
                    if "CheckpointLoader" in class_type or "Loader" in class_type:
                        if "ckpt_name" in inputs: ckpt = str(inputs["ckpt_name"])
                    
                    if "KSampler" in class_type or "Config" in class_type:
                        if "seed" in inputs: seed = str(inputs["seed"])
                        elif "noise_seed" in inputs: seed = str(inputs["noise_seed"])
                        if "steps" in inputs: steps = str(inputs["steps"])
                        if "cfg" in inputs: cfg = str(inputs["cfg"])
                        if "sampler_name" in inputs: sampler = str(inputs["sampler_name"])
                        if "scheduler" in inputs: scheduler = str(inputs["scheduler"])
                        
                    if "LoraLoader" in class_type or "ScarlotSoft" in class_type:
                        if "lora_name" in inputs:
                            name = str(inputs["lora_name"])
                            if "lyco" in name.lower(): lycos.append(name)
                            else: loras.append(name)
                                
                    if "HypernetworkLoader" in class_type:
                        if "hypernetwork_name" in inputs: hypers.append(str(inputs["hypernetwork_name"]))
                            
                    if "CLIPTextEncode" in class_type:
                        if "text" in inputs and isinstance(inputs["text"], str):
                            if prompt_text == "": prompt_text = inputs["text"]
                            else: prompt_text += " | " + inputs["text"]

                loras_str = ", ".join(loras) if loras else "NONE"
                lycos_str = ", ".join(lycos) if lycos else "NONE"
                hypers_str = ", ".join(hypers) if hypers else "NONE"
                final_prompt = prompt_text if prompt_text else "NONE"
                
                metadata_result = (
                    "Metadata:\n"
                    f"Checkpoint: {ckpt}\n"
                    f"LoRAS: {loras_str}\n"
                    f"LyCOS: {lycos_str}\n"
                    f"Hypers: {hypers_str}\n"
                    f"Seed: {seed}\n"
                    f"Steps: {steps}\n"
                    f"CFG: {cfg}\n"
                    f"Sampler: {sampler}\n"
                    f"Scheduler: {scheduler}\n"
                    f"Prompt: {final_prompt}"
                )
                
                return (metadata_result, image_tensor)
                
            elif "parameters" in img.info:
                params = img.info["parameters"]
                return (f"Metadata (A1111):\n{params}", image_tensor)
                
            else:
                return (metadata_none, image_tensor)
                
        except Exception as e:
            print(f"[ScarlotSoft] Fallo de lectura de Metadatos o Conversión: {e}")
            return (metadata_none, empty_tensor)

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_MetadataReader": ScarlotSoft_MetadataReader
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_MetadataReader": "ScarlotSoft Metadata Reader"
}