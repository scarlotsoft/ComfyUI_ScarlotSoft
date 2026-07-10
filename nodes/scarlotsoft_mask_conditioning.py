import torch

class ScarlotSoft_EasyMaskConditioning:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "conditioning": ("CONDITIONING", ),
                "mask": ("MASK", ),
                "strength": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 10.0, "step": 0.01}),
                "set_cond_area": (["default", "mask bounds"],),
                # Aquí inyectamos las propiedades para tu switch personalizado
                "Invert_Mask": ("BOOLEAN", {"default": False}),
            }
        }

    RETURN_TYPES = ("CONDITIONING",)
    RETURN_NAMES = ("CONDITIONING",)
    FUNCTION = "apply_scarlot_mask"
    CATEGORY = "ScarlotSoft/Conditioning"

    # Asegúrate de actualizar también el nombre de la variable aquí para que coincida
    def apply_scarlot_mask(self, conditioning, mask, set_cond_area, strength, Invert_Mask):
        c = []
        set_area_to_bounds = False
        
        if set_cond_area != "default":
            set_area_to_bounds = True
            
        if len(mask.shape) < 3:
            mask = mask.unsqueeze(0)
            
        # Utilizamos la nueva variable Invert_Mask
        if Invert_Mask:
            mask = 1.0 - mask
            
        for t in conditioning:
            n = [t[0], t[1].copy()]
            _, h, w = mask.shape
            n[1]['mask'] = mask
            n[1]['set_area_to_bounds'] = set_area_to_bounds
            n[1]['mask_strength'] = strength
            c.append(n)
            
        return (c, )

# Mapeo para el autoloader
NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_EasyMaskConditioning": ScarlotSoft_EasyMaskConditioning
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_EasyMaskConditioning": "ScarlotSoft Easy Mask Conditioning"
}