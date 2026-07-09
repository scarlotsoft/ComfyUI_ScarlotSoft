import os
import folder_paths

class ScarlotSoft_EasyLineFromFile:
    auto_indexes = {}

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                # 2. Path vacío por defecto
                "file_path": ("STRING", {"default": ""}),
                "bool_mode": ("BOOLEAN", {"default": True}), 
                "index": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("Line",)
    FUNCTION = "execute"
    CATEGORY = "ScarlotSoft/Text/File"

    @classmethod
    def IS_CHANGED(s, file_path, bool_mode, index, unique_id):
        if bool_mode:
            return float("NaN")
        return hash((file_path, bool_mode, index))

    def execute(self, file_path, bool_mode, index, unique_id=None):
        if not file_path:
            return ("",)
        
        # 3. Lógica inteligente de rutas (Relativa en 'input' o Absoluta)
        if not os.path.isabs(file_path):
            full_path = os.path.join(folder_paths.get_input_directory(), file_path)
        else:
            full_path = file_path

        if not os.path.exists(full_path):
            print(f"[ScarlotSoft] Error: No se encontró el archivo en {full_path}")
            return ("",)
        
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                lines = [line.strip() for line in f.readlines() if line.strip()]
        except Exception as e:
            print(f"[ScarlotSoft] Error leyendo el archivo: {e}")
            return ("",)

        if not lines:
            return ("",)

        if bool_mode:
            if unique_id not in ScarlotSoft_EasyLineFromFile.auto_indexes:
                ScarlotSoft_EasyLineFromFile.auto_indexes[unique_id] = 0
            
            current_idx = ScarlotSoft_EasyLineFromFile.auto_indexes[unique_id]
            line_to_return = lines[current_idx % len(lines)]
            ScarlotSoft_EasyLineFromFile.auto_indexes[unique_id] = current_idx + 1
            
            return (line_to_return,)
        else:
            line_to_return = lines[index % len(lines)]
            return (line_to_return,)

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_EasyLineFromFile": ScarlotSoft_EasyLineFromFile
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_EasyLineFromFile": "ScarlotSoft Easy Line From File"
}