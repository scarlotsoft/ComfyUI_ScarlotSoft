class ScarlotSoft_Concatenate:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "string_a": ("STRING", {"multiline": True, "default": ""}),
                "string_b": ("STRING", {"multiline": True, "default": ""}),
                "bool_on_off": ("BOOLEAN", {"default": False}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("STRING",)
    FUNCTION = "execute"
    CATEGORY = "ScarlotSoft/Text"

    def execute(self, string_a, string_b, bool_on_off):
        # On = doble salto de línea | Off = espacio simple
        delimiter = "\n\n" if bool_on_off else " "
        result = f"{string_a}{delimiter}{string_b}"
        return (result,)

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_Concatenate": ScarlotSoft_Concatenate
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_Concatenate": "ScarlotSoft Concatenate"
}