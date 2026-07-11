import torch
import numpy as np
import folder_paths
import os
import random
import string
from PIL import Image

class ScarlotSoft_ImageMaskPreview:
    def __init__(self):
        self.output_dir = folder_paths.get_temp_directory()
        self.type = "temp"

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "mask_opacity": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.05}),
                "mask_color": ("STRING", {"default": "231, 22, 28"}),
                "pass_through": ("BOOLEAN", {"default": False}),
            },
            # Al moverlos a 'optional', ComfyUI ya no te gritará si falta un cable
            "optional": {
                "image": ("IMAGE",),
                "mask": ("MASK",),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("IMAGE",)
    FUNCTION = "execute"
    OUTPUT_NODE = True 
    CATEGORY = "ScarlotSoft/Preview"

    def execute(self, mask_opacity, mask_color, pass_through, image=None, mask=None):
        # 1. Blindaje: Si el usuario no conecta nada, devolvemos un cuadro negro pequeño
        if image is None and mask is None:
            dummy = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return {"ui": {"images": []}, "result": (dummy,)}

        try:
            r, g, b = [int(c.strip()) for c in mask_color.split(",")]
        except:
            r, g, b = (231, 22, 28) 

        # 2. Calcular dimensiones basadas en lo que esté conectado
        batch_size = image.shape[0] if image is not None else mask.shape[0]
        h = image.shape[1] if image is not None else mask.shape[1]
        w = image.shape[2] if image is not None else mask.shape[2]

        if mask is not None:
            if len(mask.shape) == 2: mask = mask.unsqueeze(0)
            if mask.shape[0] != batch_size and mask.shape[0] == 1:
                mask = mask.repeat(batch_size, 1, 1)

        out_images = []
        out_tensors = []

        # 3. Procesamiento seguro de combinaciones
        for i in range(batch_size):
            # Preparar Imagen Base
            if image is not None:
                img_np = (image[i].cpu().numpy() * 255).astype(np.uint8)
                img_pil = Image.fromarray(img_np).convert("RGBA")
            else:
                img_pil = Image.new("RGBA", (w, h), (0, 0, 0, 255)) # Fondo negro si solo hay máscara

            # Preparar Máscara
            if mask is not None:
                m_idx = min(i, mask.shape[0]-1)
                m_np = (mask[m_idx].cpu().numpy() * 255).astype(np.uint8)
                m_pil = Image.fromarray(m_np).convert("L")
                if m_pil.size != img_pil.size:
                    m_pil = m_pil.resize(img_pil.size, Image.LANCZOS)
            else:
                m_pil = Image.new("L", img_pil.size, 0) # Sin máscara si solo hay imagen

            # Fusión visual
            color_layer = Image.new("RGBA", img_pil.size, (r, g, b, int(255 * mask_opacity)))
            overlay = Image.new("RGBA", img_pil.size, (0, 0, 0, 0))
            overlay.paste(color_layer, (0, 0), m_pil)
            
            composite = Image.alpha_composite(img_pil, overlay).convert("RGB")
            out_images.append(composite)
            out_tensors.append(torch.from_numpy(np.array(composite).astype(np.float32) / 255.0))

        # 4. Guardar para la interfaz gráfica
        results = list()
        for img in out_images:
            filename = ''.join(random.choices(string.ascii_letters + string.digits, k=16)) + ".png"
            filepath = os.path.join(self.output_dir, filename)
            img.save(filepath, compress_level=1)
            results.append({"filename": filename, "subfolder": "", "type": self.type})
        
        # 5. La lógica del Pass-Through
        if pass_through and image is not None:
            final_tensor = image
        elif pass_through and mask is not None and image is None:
            # Si quiere pass-through pero solo conectó una máscara, la convertimos a formato imagen de 3 canales
            final_tensor = mask.unsqueeze(-1).repeat(1, 1, 1, 3)
        else:
            final_tensor = torch.stack(out_tensors)

        return {"ui": {"images": results}, "result": (final_tensor,)}

NODE_CLASS_MAPPINGS = { "ScarlotSoft_ImageMaskPreview": ScarlotSoft_ImageMaskPreview }
NODE_DISPLAY_NAME_MAPPINGS = { "ScarlotSoft_ImageMaskPreview": "ScarlotSoft Image/Mask Preview" }