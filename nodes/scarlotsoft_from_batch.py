import torch

class ScarlotSoft_FromBatch:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "start_index": ("INT", {"default": 0, "min": 0, "max": 99999, "step": 1}),
                "num_frames": ("INT", {"default": 1, "min": 1, "max": 99999, "step": 1}),
            },
            "optional": {
                "images": ("IMAGE",),
                "masks": ("MASK",),
            }
        }

    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("IMAGE", "MASK")
    FUNCTION = "execute"
    CATEGORY = "ScarlotSoft/Utils"

    def execute(self, start_index, num_frames, images=None, masks=None):
        out_image = None
        out_mask = None

        # Procesar Imágenes (Formato: [Batch, Height, Width, Channels])
        if images is not None:
            end_index = start_index + num_frames
            out_image = images[start_index:end_index]
            
            # Protección contra errores: Si el índice está fuera de rango, 
            # devolvemos el último frame disponible para que el flujo no colapse.
            if out_image.shape[0] == 0:
                print(f"[ScarlotSoft] Advertencia: start_index {start_index} fuera de rango para IMAGE. Devolviendo último frame.")
                out_image = images[-1:]

        # Procesar Máscaras (Formato: [Batch, Height, Width])
        if masks is not None:
            end_index = start_index + num_frames
            out_mask = masks[start_index:end_index]
            
            # Protección contra errores
            if out_mask.shape[0] == 0:
                print(f"[ScarlotSoft] Advertencia: start_index {start_index} fuera de rango para MASK. Devolviendo última máscara.")
                out_mask = masks[-1:]

        return (out_image, out_mask)

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_FromBatch": ScarlotSoft_FromBatch
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_FromBatch": "ScarlotSoft Image/Mask From Batch"
}