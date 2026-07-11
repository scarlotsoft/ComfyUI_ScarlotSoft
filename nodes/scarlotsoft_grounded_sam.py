import torch
import numpy as np
import os
import folder_paths
import torch.nn.functional as F
import comfy.model_management as mm
from PIL import Image

# Autoinstalador de dependencias esenciales en el sistema
try:
    from segment_anything import sam_model_registry, SamPredictor
except ImportError:
    import sys
    import subprocess
    print("[ScarlotSoft] Instalando segment-anything...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'segment-anything'])
    from segment_anything import sam_model_registry, SamPredictor

try:
    from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
except ImportError:
    import sys
    import subprocess
    print("[ScarlotSoft] Instalando transformers...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'transformers'])
    from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection

# Asegurar que la carpeta de modelos SAM exista en la estructura de ComfyUI
sams_path = os.path.join(folder_paths.models_dir, "sams")
if not os.path.exists(sams_path): 
    os.makedirs(sams_path)
if "sams" not in folder_paths.folder_names_and_paths:
    folder_paths.folder_names_and_paths["sams"] = ([sams_path], folder_paths.supported_pt_extensions)


class ScarlotSoft_GroundedSAM:
    @classmethod
    def INPUT_TYPES(s):
        sam_models = folder_paths.get_filename_list("sams")
        if not sam_models: 
            sam_models = ["¡Pon tu sam_vit_b.pth en models/sams!"]
            
        return {
            "required": {
                "image": ("IMAGE",),
                "prompt": ("STRING", {"multiline": True, "default": "1girl. 1boy."}),
                "box_threshold": ("FLOAT", {"default": 0.30, "min": 0.0, "max": 1.0, "step": 0.01}),
                "text_threshold": ("FLOAT", {"default": 0.25, "min": 0.0, "max": 1.0, "step": 0.01}),
                "invert_mask": ("BOOLEAN", {"default": False}),
                "sam_model": (sam_models,),
            }
        }

    RETURN_TYPES = ("MASK",)
    RETURN_NAMES = ("batch_masks",)
    FUNCTION = "execute"
    CATEGORY = "ScarlotSoft/Detectors"

    def execute(self, image, prompt, box_threshold, text_threshold, invert_mask, sam_model):
        device = mm.get_torch_device()

        # 1. Cargar Grounding DINO de forma segura
        print("[ScarlotSoft] Iniciando Grounding DINO...")
        model_id = "IDEA-Research/grounding-dino-base"
        processor = AutoProcessor.from_pretrained(model_id)
        dino_model = AutoModelForZeroShotObjectDetection.from_pretrained(model_id).to(device)

        # 2. Cargar modelo SAM seleccionado
        sam_model_path = folder_paths.get_full_path("sams", sam_model)
        if not sam_model_path or not os.path.exists(sam_model_path):
            raise Exception(f"[ScarlotSoft] Archivo de modelo SAM no encontrado en: {sam_model_path}")
        
        model_type = "vit_h" if "vit_h" in sam_model else ("vit_l" if "vit_l" in sam_model else "vit_b")
        print(f"[ScarlotSoft] Cargando arquitectura SAM: {model_type}")
        sam = sam_model_registry[model_type](checkpoint=sam_model_path).to(device)
        sam_predictor = SamPredictor(sam)

        # 3. Limpieza y blindaje contra crash de Tokens (límite estricto de DINO a 256)
        clean_prompt = prompt.lower()
        words = clean_prompt.split()
        if len(words) > 150:
            print(f"[ScarlotSoft] ADVERTENCIA: Prompt demasiado largo ({len(words)} palabras). Truncando para evitar colapso de tokens en DINO.")
            clean_prompt = " ".join(words[:150])
            
        if not clean_prompt.endswith("."): 
            clean_prompt += "."

        masks_list = []

        # 4. Procesamiento de imágenes por lote (Batch)
        for img in image:
            # Forzar conversión a RGB puro (3 canales) para eliminar canales Alpha corruptos
            img_np_raw = (img.cpu().numpy() * 255).astype(np.uint8)
            img_pil = Image.fromarray(img_np_raw).convert("RGB")
            img_np = np.array(img_pil)
            
            # Pasar la imagen por el extractor de DINO
            inputs = processor(images=img_pil, text=clean_prompt, return_tensors="pt").to(device)
            with torch.no_grad():
                outputs = dino_model(**inputs)
            
            # Post-procesamiento básico de cajas (versión-agnóstico para evitar errores de API de Transformers)
            results = processor.post_process_grounded_object_detection(
                outputs,
                inputs.input_ids,
                target_sizes=[img_pil.size[::-1]]
            )[0]
            
            boxes = results["boxes"].cpu().numpy()
            scores = results["scores"].cpu().numpy()
            
            # Filtrado manual usando el umbral seleccionado por el usuario
            keep_indices = scores >= box_threshold
            boxes = boxes[keep_indices]
            
            if len(boxes) == 0: 
                continue

            # Configurar imagen en el predictor de SAM
            sam_predictor.set_image(img_np)
            
            # Generar cortes precisos para cada caja detectada
            for box in boxes:
                x_min, y_min, x_max, y_max = box
                
                # Clamping estricto para evitar desbordamiento de dimensiones por 1 píxel
                x_min = max(0, int(x_min))
                y_min = max(0, int(y_min))
                x_max = min(img_np.shape[1], int(x_max))
                y_max = min(img_np.shape[0], int(y_max))
                
                sam_masks, _, _ = sam_predictor.predict(
                    box=np.array([x_min, y_min, x_max, y_max]), 
                    multimask_output=False
                )
                
                m_tensor = torch.from_numpy(sam_masks[0]).float()
                
                # Aplicar inversión de máscara si el switch está activo
                if invert_mask:
                    m_tensor = 1.0 - m_tensor
                    
                masks_list.append(m_tensor)

        # 5. Liberar memoria VRAM de forma agresiva para evitar OutOfMemory
        del dino_model, sam, sam_predictor
        mm.soft_empty_cache()

        # Retorno de seguridad si no se aisló ningún elemento en el lienzo
        if len(masks_list) == 0:
            h, w = image.shape[1], image.shape[2]
            return (torch.zeros((1, h, w), dtype=torch.float32),)

        return (torch.stack(masks_list),)

NODE_CLASS_MAPPINGS = { "ScarlotSoft_GroundedSAM": ScarlotSoft_GroundedSAM }
NODE_DISPLAY_NAME_MAPPINGS = { "ScarlotSoft_GroundedSAM": "ScarlotSoft Grounded-SAM" }