import os
import importlib
import glob

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

# Localiza la subcarpeta 'nodes'
nodes_dir = os.path.join(os.path.dirname(__file__), "nodes")
py_files = glob.glob(os.path.join(nodes_dir, "*.py"))

for py_file in py_files:
    module_name = os.path.basename(py_file)[:-3]
    if module_name == "__init__":
        continue
    
    try:
        module = importlib.import_module(f".nodes.{module_name}", package=__name__)
        if hasattr(module, "NODE_CLASS_MAPPINGS"):
            NODE_CLASS_MAPPINGS.update(module.NODE_CLASS_MAPPINGS)
        if hasattr(module, "NODE_DISPLAY_NAME_MAPPINGS"):
            NODE_DISPLAY_NAME_MAPPINGS.update(module.NODE_DISPLAY_NAME_MAPPINGS)
            
    except Exception as e:
        print(f"[ScarlotSoft] Error al cargar el módulo '{module_name}': {e}")

# --- Le dice a ComfyUI dónde buscar los archivos visuales ---
WEB_DIRECTORY = "./js"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']