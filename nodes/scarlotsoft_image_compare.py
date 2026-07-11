import torch
import numpy as np
import folder_paths
import os
import random
import string
from PIL import Image

class ScarlotSoft_ImageCompare:
    def __init__(self):
        self.output_dir = folder_paths.get_temp_directory()
        self.type = "temp"

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "image1": ("IMAGE",),
                "image2": ("IMAGE",),
            }
        }

    RETURN_TYPES = ()
    FUNCTION = "execute"
    OUTPUT_NODE = True
    CATEGORY = "ScarlotSoft/Preview"

    def execute(self, image1, image2):
        # Tomamos la primera imagen del lote
        img1_np = (image1[0].cpu().numpy() * 255).astype(np.uint8)
        img2_np = (image2[0].cpu().numpy() * 255).astype(np.uint8)

        img1_pil = Image.fromarray(img1_np).convert("RGB")
        img2_pil = Image.fromarray(img2_np).convert("RGB")

        # ¡HEMOS ELIMINADO EL REDIMENSIONADO FORZADO!
        # Ahora el nodo guarda y envía las imágenes con su resolución real intacta.

        results = []
        for img in [img1_pil, img2_pil]:
            filename = f"scarlot_comp_{''.join(random.choices(string.ascii_letters + string.digits, k=10))}.png"
            filepath = os.path.join(self.output_dir, filename)
            img.save(filepath, compress_level=1)
            results.append({"filename": filename, "subfolder": "", "type": self.type})

        return {"ui": {"images": results}}

NODE_CLASS_MAPPINGS = { "ScarlotSoft_ImageCompare": ScarlotSoft_ImageCompare }
NODE_DISPLAY_NAME_MAPPINGS = { "ScarlotSoft_ImageCompare": "ScarlotSoft Image Compare" }