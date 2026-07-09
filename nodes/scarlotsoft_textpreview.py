class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

ANY = AnyType("*")

class ScarlotSoft_TextPreview:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "source": (ANY, ),
            },
            "optional": {
                "string_a": ("STRING", {"multiline": True, "default": ""}),
            }
        }

    RETURN_TYPES = ()
    FUNCTION = "execute"
    CATEGORY = "ScarlotSoft/Text"
    
    # Activa el botón Play de ComfyUI
    OUTPUT_NODE = True 

    def execute(self, source, string_a=""):
        text_result = str(source)
        return {"ui": {"text": [text_result]}}

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_TextPreview": ScarlotSoft_TextPreview
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_TextPreview": "ScarlotSoft Text Preview"
}