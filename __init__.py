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

# ======================================================================
# --- MENSAJE DE ARRANQUE EN CONSOLA (SCARLOTSOFT BOOT MESSAGE) ---
# ======================================================================

# Códigos de color ANSI para contraste selectivo
C_RED = "\033[91m"
C_GREEN = "\033[92m"
C_BOLD = "\033[1m"
C_RESET = "\033[0m"

# Contar cuántos nodos hay registrados en el diccionario
total_nodes = len(NODE_CLASS_MAPPINGS)

# Borde superior continuo
print(f"{C_RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{C_RESET}")

# Título y contador de nodos
print(f"{C_BOLD}{C_RED}ScarlotSoft{C_RESET} v1.0.0  |  {C_GREEN}{total_nodes} nodes{C_RESET} Loaded")

# Enlaces en texto plano con URLs en negrita
print(f"ComfyUI Tutorials & Streams: {C_BOLD}https://youtube.com/@scarlotsoft{C_RESET}")
#print(f"Twitch Channel: {C_BOLD}https://twitch.tv/scarlotsoft{C_RESET}")

# Mensajes de aviso intercalando mi color corporativo
print(f"This is a notice, not an error. All {C_RED}ScarlotSoft{C_RESET} nodes work in Classic mode.")
print(f"If something looks off right after switching the Node UI mode, hard-refresh the page (Ctrl+Shift+R).")

# Borde inferior continuo
print(f"{C_RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{C_RESET}")