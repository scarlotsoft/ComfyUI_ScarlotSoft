# Un pequeño truco para que el nodo acepte cualquier tipo de conexión (Imágenes, Modelos, Textos, etc.)
class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

ANY = AnyType("*")

class ScarlotSoft_Switch:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                # Esta es la variable interna que controlará nuestro switch de JavaScript
                "boolean_state": ("BOOLEAN", {"default": True}),
            },
            "optional": {
                # Las entradas con los nombres "On" y "Off" pueden aceptar cualquier tipo de conexión gracias a nuestro truco con la clase AnyType
                "On": (ANY, ),
                "Off": (ANY, ),
            }
        }

    # Salida única genérica
    RETURN_TYPES = (ANY,)
    RETURN_NAMES = ("OUTPUT",)
    FUNCTION = "execute"
    CATEGORY = "ScarlotSoft/Logic"

    def execute(self, boolean_state, On=None, Off=None):
        # Si el switch está encendido (True), deja pasar lo que esté conectado en "On"
        if boolean_state:
            return (On,)
        # Si está apagado (False), deja pasar lo que esté en "Off"
        else:
            return (Off,)

# Mappings para el cargador automático
NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_Switch": ScarlotSoft_Switch
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_Switch": "ScarlotSoft Switch"
}