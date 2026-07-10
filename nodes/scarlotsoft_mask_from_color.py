import torch

class ScarlotSoft_MaskFromColor:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "image": ("IMAGE",),
                "color_hex": ("STRING", {"default": "#FF0000"}), # Nuestro JS convertirá esto en un Color Picker
                "tolerance": ("INT", {"default": 10, "min": 0, "max": 255, "step": 1}),
            }
        }

    RETURN_TYPES = ("MASK",)
    RETURN_NAMES = ("MASK",)
    FUNCTION = "generate_mask"
    CATEGORY = "ScarlotSoft/Masking"

    def generate_mask(self, image, color_hex, tolerance):
        # Limpiamos el string hexadecimal y lo convertimos a RGB
        color_hex = color_hex.lstrip('#')
        r, g, b = tuple(int(color_hex[i:i+2], 16) for i in (0, 2, 4))
        
        target_color = torch.tensor([r, g, b], dtype=image.dtype, device=image.device)
        
        if image.max() <= 1.0:
            target_color = target_color / 255.0
            tolerance = tolerance / 255.0
            
        image_rgb = image[..., :3]
        diff = torch.abs(image_rgb - target_color)
        
        mask = (diff <= tolerance).all(dim=-1).float()
        
        return (mask,)

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_MaskFromColor": ScarlotSoft_MaskFromColor
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_MaskFromColor": "ScarlotSoft Mask From Color"
}