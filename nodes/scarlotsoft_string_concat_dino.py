class ScarlotSoft_StringConcatDINO:
    @classmethod
    def INPUT_TYPES(s):
        inputs = {f"input_{i}": ("STRING", {"default": "", "forceInput": True}) for i in range(20)}
        return {
            "required": {},
            "optional": inputs
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("DINO_PROMPT",)
    FUNCTION = "concat_dino"
    CATEGORY = "ScarlotSoft/Utils"

    def concat_dino(self, **kwargs):
        sorted_keys = sorted(kwargs.keys(), key=lambda x: int(x.split('_')[1]))
        cleaned_strings = []
        
        for k in sorted_keys:
            val = kwargs.get(k)
            if val and isinstance(val, str):
                # Limpiamos espacios en blanco y quitamos los puntos que el usuario
                # haya puesto por error para evitar cosas como "1girl.. 1boy."
                clean_val = val.strip().rstrip(".")
                if clean_val:
                    cleaned_strings.append(clean_val)
        
        # Ensamblamos todo con el separador oficial de DINO
        result = ". ".join(cleaned_strings)
        
        # DINO es muy estricto: la cadena final SIEMPRE debe terminar en punto
        if result:
            result += "."
            
        return (result,)

NODE_CLASS_MAPPINGS = {"ScarlotSoft_StringConcatDINO": ScarlotSoft_StringConcatDINO}
NODE_DISPLAY_NAME_MAPPINGS = {"ScarlotSoft_StringConcatDINO": "ScarlotSoft String Concat DINO"}