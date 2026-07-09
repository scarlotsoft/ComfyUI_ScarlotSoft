class ScarlotSoft_StringToText:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "string": ("STRING", {"multiline": False, "default": ""}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("STRING",)
    FUNCTION = "execute"
    CATEGORY = "ScarlotSoft/Text"

    def execute(self, string):
        return (string,)

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_StringToText": ScarlotSoft_StringToText
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_StringToText": "ScarlotSoft String to Text"
}