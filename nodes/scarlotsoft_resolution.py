import torch
import numpy as np
import math
from PIL import Image, ImageDraw, ImageFont

class ScarlotSoft_Resolution:
    @classmethod
    def INPUT_TYPES(s):
        # Genera la lista de megapíxeles de 0.1 a 2.5
        megapixels = [f"{x/10.0:.1f}" for x in range(1, 26)]
        
        aspects = [
            "1:1 (Perfect Square)", "2:3 (Classic Portrait)", "3:4 (Golden Ratio)", 
            "3:5 (Elegant Vertical)", "4:5 (Artistic Frame)", "5:7 (Balanced Portrait)", 
            "5:8 (Tall Portrait)", "7:9 (Modern Portrait)", "9:16 (Slim Vertical)", 
            "9:19 (Tall Slim)", "9:21 (Ultra Tall)", "9:32 (Skyline)", 
            "3:2 (Golden Landscape)", "4:3 (Classic Landscape)", "5:3 (Wide Horizon)", 
            "5:4 (Balanced Frame)", "7:5 (Elegant Landscape)", "8:5 (Cinematic View)", 
            "9:7 (Artful Horizon)", "16:9 (Panorama)", "19:9 (Cinematic Ultrawide)", 
            "21:9 (Epic Ultrawide)", "32:9 (Extreme Ultrawide)"
        ]
        
        divisibles = ["8", "16", "32", "64"]
        
        return {
            "required": {
                "megapixel": (megapixels, {"default": "1.0"}),
                "aspect_ratio": (aspects, {"default": "1:1 (Perfect Square)"}),
                "divisible_by": (divisibles, {"default": "64"}),
                "batch_size": ("INT", {"default": 1, "min": 1, "max": 64, "step": 1}),
            }
        }

    # Ahora escupimos enteros de dimensión, la imagen preview y el objeto LATENT nativo
    RETURN_TYPES = ("INT", "INT", "IMAGE", "LATENT")
    RETURN_NAMES = ("width", "height", "preview", "latent")
    FUNCTION = "execute"
    CATEGORY = "ScarlotSoft/Utils"

    def execute(self, megapixel, aspect_ratio, divisible_by, batch_size):
        mp = float(megapixel)
        div = int(divisible_by)
        
        # Extraer ratio matemático (ej. "16:9")
        ratio_str = aspect_ratio.split(" ")[0]
        w_r, h_r = map(float, ratio_str.split(":"))
        ratio = w_r / h_r
        
        # 1. Cálculo de resolución basado en Área de Megapíxeles
        total_pixels = mp * 1000000
        height = math.sqrt(total_pixels / ratio)
        width = height * ratio
        
        # Aplicar divisibilidad dinámica
        width = int(round(width / div) * div)
        height = int(round(height / div) * div)
        
        # 2. GENERACIÓN DEL LATENT ESPACIAL (Funcionalidad Completa de Empty Latent Image)
        # ComfyUI necesita la estructura de diccionario de tensores reducida a factor de 8
        latent_tensor = torch.zeros([batch_size, 4, height // 8, width // 8])
        latent_dict = {"samples": latent_tensor}
        
        # 3. Dibujar la imagen de Preview en el backend
        img = Image.new('RGB', (width, height), color=(0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Margen del recuadro rojo
        pad_x = int(width * 0.05)
        pad_y = int(height * 0.05)
        draw.rectangle([pad_x, pad_y, width - pad_x, height - pad_y], outline=(231, 22, 28), width=8)
        
        try:
            font_main = ImageFont.truetype("arial.ttf", max(30, int(height * 0.06)))
            font_sub = ImageFont.truetype("arial.ttf", max(20, int(height * 0.04)))
        except:
            font_main = ImageFont.load_default()
            font_sub = font_main

        text_main = f"{width}x{height}"
        text_sub = f"({ratio_str}) x{batch_size}"
        
        center_x = width // 2
        center_y = height // 2
        
        try:
            bbox_m = draw.textbbox((0, 0), text_main, font=font_main)
            tw_m, th_m = bbox_m[2] - bbox_m[0], bbox_m[3] - bbox_m[1]
            bbox_s = draw.textbbox((0, 0), text_sub, font=font_sub)
            tw_s, th_s = bbox_s[2] - bbox_s[0], bbox_s[3] - bbox_s[1]
        except:
            tw_m, th_m = 100, 20
            tw_s, th_s = 50, 15

        draw.text((center_x - tw_m // 2, center_y - th_m), text_main, fill=(231, 22, 28), font=font_main)
        draw.text((center_x - tw_s // 2, center_y + int(th_m * 0.3)), text_sub, fill=(231, 22, 28), font=font_sub)
        
        image_tensor = torch.from_numpy(np.array(img).astype(np.float32) / 255.0).unsqueeze(0)
        
        return (width, height, image_tensor, latent_dict)

NODE_CLASS_MAPPINGS = { "ScarlotSoft_Resolution": ScarlotSoft_Resolution }
NODE_DISPLAY_NAME_MAPPINGS = { "ScarlotSoft_Resolution": "ScarlotSoft Resolution" }