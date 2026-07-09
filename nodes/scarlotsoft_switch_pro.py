class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

ANY = AnyType("*")

class ScarlotSoft_Switch_Pro:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                # Lo dejamos aquí para que ComfyUI lo procese, 
                # pero el JS se encargará de ocultarlo totalmente.
                "active_index": ("INT", {"default": 0, "min": 0, "max": 100}),
            },
            "optional": {
                "input_0": ("*", ),
            }
        }

    RETURN_TYPES = (ANY,)
    RETURN_NAMES = ("OUTPUT",)
    FUNCTION = "execute"
    CATEGORY = "ScarlotSoft/Logic"

    def execute(self, active_index, **kwargs):
        selected_key = f"input_{active_index}"
        
        if selected_key in kwargs:
            return (kwargs[selected_key],)
        
        return (None,)

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_Switch_Pro": ScarlotSoft_Switch_Pro
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_Switch_Pro": "ScarlotSoft Switch Pro"
}