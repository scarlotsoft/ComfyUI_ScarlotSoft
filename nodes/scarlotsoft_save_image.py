import os
import re
import datetime
import json
import numpy as np
import torch
from PIL import Image
import folder_paths

class ScarlotSoft_SaveImage:
    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "image": ("IMAGE",),
                "file_name_prefix": ("STRING", {"default": "ScarlotSoft/%date%/%checkpoint%/%seed%"}),
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("IMAGE",)
    FUNCTION = "save_images"
    CATEGORY = "ScarlotSoft/Save/Image"
    OUTPUT_NODE = True 

    def save_images(self, image, file_name_prefix="", prompt=None, extra_pnginfo=None):
        metadata = {
            "checkpoint": "unknown_checkpoint",
            "seed": "0",
            "steps": "20",
            "cfg": "7.0",
            "sampler": "euler",
            "scheduler": "normal",
            "date": datetime.datetime.now().strftime("%m-%d-%Y") 
        }

        if prompt is not None:
            def resolve_graph_value(node_inputs, key, visited=None):
                if visited is None: visited = set()
                if key not in node_inputs: return None
                
                v = node_inputs[key]
                if isinstance(v, list) and len(v) == 2:
                    src_id = str(v[0])
                    slot = v[1]
                    
                    visit_hash = f"{src_id}_{slot}"
                    if visit_hash in visited: return None
                    visited.add(visit_hash)
                    
                    if src_id in prompt:
                        src_node = prompt[src_id]
                        src_inputs = src_node.get("inputs", {})
                        
                        if src_node.get("class_type") == "ScarlotSoft_KSamplerConfig":
                            slot_mapping = {
                                0: "steps",
                                1: "refiner_steps",
                                2: "cfg",
                                3: "sampler",
                                4: "ks_scheduler",
                                5: "fd_scheduler"
                            }
                            target_key = slot_mapping.get(slot)
                            if target_key:
                                return resolve_graph_value(src_inputs, target_key, visited)
                        
                        if key in src_inputs:
                            return resolve_graph_value(src_inputs, key, visited)
                        for alt in ["sampler_name", "sampler", "scheduler", "ks_scheduler", "steps", "cfg", "seed", "ckpt_name"]:
                            if alt in src_inputs:
                                return resolve_graph_value(src_inputs, alt, visited)
                return v

            for node_id, node in prompt.items():
                inputs = node.get("inputs", {})
                class_type = node.get("class_type", "")

                # ¡AQUÍ ESTÁ LA MAGIA REPARADA!
                # Ahora detecta nodos que se llamen Checkpoint, Loader o que simplemente tengan ckpt_name (Como tu nuevo nodo)
                if "Checkpoint" in class_type or "Loader" in class_type or "ckpt_name" in inputs:
                    ckpt = resolve_graph_value(inputs, "ckpt_name")
                    if ckpt and isinstance(ckpt, str):
                        metadata["checkpoint"] = os.path.splitext(ckpt)[0]

                if "KSampler" in class_type or "Config" in class_type:
                    seed = resolve_graph_value(inputs, "seed") or resolve_graph_value(inputs, "noise_seed")
                    steps = resolve_graph_value(inputs, "steps")
                    cfg = resolve_graph_value(inputs, "cfg")
                    sampler = resolve_graph_value(inputs, "sampler_name") or resolve_graph_value(inputs, "sampler")
                    scheduler = resolve_graph_value(inputs, "scheduler") or resolve_graph_value(inputs, "ks_scheduler")

                    if seed is not None: metadata["seed"] = str(seed)
                    if steps is not None: metadata["steps"] = str(steps)
                    if cfg is not None: metadata["cfg"] = str(cfg)
                    if sampler is not None: metadata["sampler"] = str(sampler)
                    if scheduler is not None: metadata["scheduler"] = str(scheduler)

        pattern = file_name_prefix
        for key, val in metadata.items():
            val_sanitized = re.sub(r'[\\:*?"<>|]', '_', val)
            pattern = re.sub(f"%{key}%", val_sanitized, pattern, flags=re.IGNORECASE)

        results = []
        for img_tensor in image:
            i = 255. * img_tensor.cpu().numpy()
            img_np = np.clip(i, 0, 255).astype(np.uint8)
            pil_img = Image.fromarray(img_np)

            full_path_prefix = os.path.join(self.output_dir, pattern)
            dir_name = os.path.dirname(full_path_prefix)
            base_name = os.path.basename(full_path_prefix)

            if not base_name:
                base_name = "scarlot_img"

            if not os.path.exists(dir_name):
                os.makedirs(dir_name, exist_ok=True)

            counter = 1
            while True:
                filename = f"{base_name}_{counter:06d}.png"
                final_path = os.path.join(dir_name, filename)
                if not os.path.exists(final_path):
                    break
                counter += 1

            pil_img.save(final_path, pnginfo=None)
            print(f"[ScarlotSoft] Imagen guardada con éxito en: {final_path}")
            
            results.append({
                "filename": filename,
                "subfolder": os.path.relpath(dir_name, self.output_dir),
                "type": "output"
            })

        return {"ui": {"images": results}, "result": (image,)}

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_SaveImage": ScarlotSoft_SaveImage
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_SaveImage": "ScarlotSoft Save Image"
}