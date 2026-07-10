class ScarlotSoft_ConditioningCombine:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "conditioning_1": ("CONDITIONING", ),
                "conditioning_2": ("CONDITIONING", ),
            }
        }

    RETURN_TYPES = ("CONDITIONING",)
    RETURN_NAMES = ("CONDITIONING",)
    FUNCTION = "combine"
    CATEGORY = "ScarlotSoft/Conditioning"

    def combine(self, conditioning_1, conditioning_2):
        # En ComfyUI, sumar dos objetos CONDITIONING los combina perfectamente
        combined = conditioning_1 + conditioning_2
        return (combined, )

# Mapeo para el autoloader
NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_ConditioningCombine": ScarlotSoft_ConditioningCombine
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_ConditioningCombine": "ScarlotSoft Combine Conditioning"
}