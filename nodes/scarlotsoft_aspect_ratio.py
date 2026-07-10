# HACK MAESTRO: Comodín Universal
class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

ANY = AnyType("*")

class ScarlotSoft_AspectRatio:
    @classmethod
    def INPUT_TYPES(s):
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
        return {
            "required": {
                "aspect_ratio": (aspects, {"default": "1:1 (Perfect Square)"}),
            }
        }

    # Un solo output, limpio y universal
    RETURN_TYPES = (ANY,)
    RETURN_NAMES = ("aspect_ratio",)
    FUNCTION = "get_ratio"
    CATEGORY = "ScarlotSoft/Utils"

    def get_ratio(self, aspect_ratio):
        return (aspect_ratio,)

NODE_CLASS_MAPPINGS = { "ScarlotSoft_AspectRatio": ScarlotSoft_AspectRatio }
NODE_DISPLAY_NAME_MAPPINGS = { "ScarlotSoft_AspectRatio": "ScarlotSoft Aspect Ratio" }