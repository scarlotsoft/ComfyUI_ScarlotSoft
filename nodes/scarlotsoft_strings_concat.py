class ScarlotSoft_StringConcat:
    @classmethod
    def INPUT_TYPES(s):
        # Creamos 20 slots opcionales
        inputs = {f"input_{i}": ("STRING", {"default": "", "forceInput": True}) for i in range(20)}
        return {
            "required": {},
            "optional": inputs
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("STRING",)
    FUNCTION = "apply"
    CATEGORY = "ScarlotSoft/Utils"

    def apply(self, **kwargs):
        # Filtramos los inputs conectados, ordenamos por índice, y unimos con espacio
        sorted_keys = sorted(kwargs.keys(), key=lambda x: int(x.split('_')[1]))
        strings = [kwargs[k] for k in sorted_keys if kwargs.get(k) and isinstance(kwargs[k], str)]
        result = " ".join(strings)
        return (result,)

NODE_CLASS_MAPPINGS = {"ScarlotSoft_StringConcat": ScarlotSoft_StringConcat}
NODE_DISPLAY_NAME_MAPPINGS = {"ScarlotSoft_StringConcat": "ScarlotSoft String Concat"}