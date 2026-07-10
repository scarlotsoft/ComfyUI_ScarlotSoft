import torch
import numpy as np
import os
import folder_paths
import torch.nn.functional as F
import comfy.model_management as mm

# Autoinstalador YOLO
try:
    from ultralytics import YOLO
except ImportError:
    import sys
    import subprocess
    print("[ScarlotSoft] Installing ultralytics library...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'ultralytics'])
    from ultralytics import YOLO

# Autoinstalador SAM
try:
    from segment_anything import sam_model_registry, SamPredictor
except ImportError:
    import sys
    import subprocess
    print("[ScarlotSoft] Installing segment_anything library...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'segment-anything'])
    from segment_anything import sam_model_registry, SamPredictor

# --- CONFIGURACIÓN DE CARPETAS ---
scarlotsoft_path = os.path.join(folder_paths.models_dir, "scarlotsoft")
yolo_path = os.path.join(scarlotsoft_path, "yolo")
if not os.path.exists(yolo_path): os.makedirs(yolo_path)
if "scarlotsoft_yolo" not in folder_paths.folder_names_and_paths:
    folder_paths.folder_names_and_paths["scarlotsoft_yolo"] = ([yolo_path], folder_paths.supported_pt_extensions)

sams_path = os.path.join(folder_paths.models_dir, "sams")
if not os.path.exists(sams_path): os.makedirs(sams_path)
if "sams" not in folder_paths.folder_names_and_paths:
    folder_paths.folder_names_and_paths["sams"] = ([sams_path], folder_paths.supported_pt_extensions)


class ScarlotSoft_YOLOSegmenter:
    @classmethod
    def INPUT_TYPES(s):
        yolo_models = folder_paths.get_filename_list("scarlotsoft_yolo")
        if not yolo_models: yolo_models = ["Put .pt in models/scarlotsoft/yolo"]
        
        sam_models = ["None (Fast YOLO Masks)"] + folder_paths.get_filename_list("sams")
        
        # La lista completa y exacta de Impact Pack
        hints = [
            "center-1", "horizontal-2", "vertical-2", "rect-4", "diamond-4", 
            "mask-area", "mask-points", "mask-point-bbox", "none"
        ]
            
        return {
            "required": {
                "image": ("IMAGE",),
                "yolo_model": (yolo_models,),
                "confidence": ("FLOAT", {"default": 0.30, "min": 0.0, "max": 1.0, "step": 0.05}),
                "iou_threshold": ("FLOAT", {"default": 0.45, "min": 0.0, "max": 1.0, "step": 0.05}),
                "sam_model": (sam_models,),
                "detection_hint": (hints, {"default": "center-1"}),
            }
        }

    RETURN_TYPES = ("MASK",)
    RETURN_NAMES = ("batch_masks",)
    FUNCTION = "execute"
    CATEGORY = "ScarlotSoft/Detectors"

    def execute(self, image, yolo_model, confidence, iou_threshold, sam_model, detection_hint):
        yolo_model_path = folder_paths.get_full_path("scarlotsoft_yolo", yolo_model)
        if not yolo_model_path: raise Exception(f"[ScarlotSoft] YOLO not found: {yolo_model}")
        yolo = YOLO(yolo_model_path)

        predictor = None
        if sam_model != "None (Fast YOLO Masks)":
            sam_model_path = folder_paths.get_full_path("sams", sam_model)
            if not sam_model_path: raise Exception(f"[ScarlotSoft] SAM not found: {sam_model}")
            
            if "vit_h" in sam_model: model_type = "vit_h"
            elif "vit_l" in sam_model: model_type = "vit_l"
            else: model_type = "vit_b"
            
            print(f"[ScarlotSoft] Loading SAM ({model_type})...")
            sam = sam_model_registry[model_type](checkpoint=sam_model_path)
            device = mm.get_torch_device()
            sam.to(device=device)
            predictor = SamPredictor(sam)

        masks_list = []

        for img in image:
            img_np = (img.cpu().numpy() * 255).astype(np.uint8)
            h_orig, w_orig = img_np.shape[:2]
            
            results = yolo(img_np, conf=confidence, iou=iou_threshold)
            
            for result in results:
                if predictor is None:
                    # MODO RÁPIDO (YOLO)
                    if result.masks is not None:
                        mask_tensor = result.masks.data.cpu()
                        mask_tensor = F.interpolate(mask_tensor.unsqueeze(1), size=(h_orig, w_orig), mode='bilinear', align_corners=False).squeeze(1)
                        for m in mask_tensor:
                            masks_list.append(m)
                else:
                    # MODO PRECISIÓN QUIRÚRGICA (SAM)
                    if result.boxes is not None and len(result.boxes) > 0:
                        boxes = result.boxes.xyxy.cpu().numpy()
                        
                        # Si usamos "mask-*", extraemos la máscara de YOLO para guiar a SAM
                        yolo_masks = None
                        if "mask" in detection_hint and result.masks is not None:
                            mt = result.masks.data.cpu()
                            # Nearest evita interpolaciones grises para encontrar los puntos puros
                            yolo_masks = F.interpolate(mt.unsqueeze(1), size=(h_orig, w_orig), mode='nearest').squeeze(1)

                        predictor.set_image(img_np)
                        
                        for i, box in enumerate(boxes):
                            x1, y1, x2, y2 = box
                            cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
                            w, h = x2 - x1, y2 - y1

                            input_points = []
                            input_labels = []

                            # Generación geométrica
                            if detection_hint == "center-1":
                                input_points = [[cx, cy]]; input_labels = [1]
                            elif detection_hint == "horizontal-2":
                                input_points = [[cx - w*0.25, cy], [cx + w*0.25, cy]]; input_labels = [1, 1]
                            elif detection_hint == "vertical-2":
                                input_points = [[cx, cy - h*0.25], [cx, cy + h*0.25]]; input_labels = [1, 1]
                            elif detection_hint == "rect-4":
                                input_points = [
                                    [cx - w*0.25, cy - h*0.25], [cx + w*0.25, cy - h*0.25],
                                    [cx - w*0.25, cy + h*0.25], [cx + w*0.25, cy + h*0.25]
                                ]; input_labels = [1, 1, 1, 1]
                            elif detection_hint == "diamond-4":
                                input_points = [
                                    [cx, cy - h*0.25], [cx, cy + h*0.25],
                                    [cx - w*0.25, cy], [cx + w*0.25, cy]
                                ]; input_labels = [1, 1, 1, 1]
                            
                            # Generación orgánica (Leyendo los píxeles de YOLO)
                            elif "mask" in detection_hint:
                                if yolo_masks is not None:
                                    # Encontrar todos los píxeles donde YOLO sabe que hay personaje
                                    y_coords, x_coords = torch.where(yolo_masks[i] > 0.5)
                                    if len(y_coords) > 0:
                                        num_pts = 5
                                        if detection_hint == "mask-points": num_pts = 10
                                        elif detection_hint == "mask-area": num_pts = 20
                                        
                                        # Seleccionar N puntos aleatorios del cuerpo
                                        num_pts = min(num_pts, len(y_coords))
                                        indices = torch.randperm(len(y_coords))[:num_pts]
                                        input_points = [[float(x_coords[idx]), float(y_coords[idx])] for idx in indices]
                                        input_labels = [1] * len(input_points)
                                    else:
                                        input_points = [[cx, cy]]; input_labels = [1] # Fallback
                                else:
                                    input_points = [[cx, cy]]; input_labels = [1] # Fallback si el modelo no tiene seg

                            # Predecir con o sin puntos extra (si es "none", pasa vacío y usa solo la caja)
                            if len(input_points) > 0:
                                pts = np.array(input_points)
                                lbls = np.array(input_labels)
                                sam_masks, _, _ = predictor.predict(box=box, point_coords=pts, point_labels=lbls, multimask_output=False)
                            else:
                                sam_masks, _, _ = predictor.predict(box=box, multimask_output=False)
                            
                            m_tensor = torch.from_numpy(sam_masks[0]).float()
                            masks_list.append(m_tensor)

        if len(masks_list) == 0:
            print("[ScarlotSoft] No objects detected. Returning empty mask.")
            h, w = image.shape[1], image.shape[2]
            return (torch.zeros((1, h, w), dtype=torch.float32),)

        final_masks = torch.stack(masks_list)
        print(f"[ScarlotSoft] Processed {len(final_masks)} perfect mask(s) using hint: {detection_hint}")
        
        if predictor is not None:
            del sam
            del predictor
            mm.soft_empty_cache()

        return (final_masks,)

NODE_CLASS_MAPPINGS = { "ScarlotSoft_YOLOSegmenter": ScarlotSoft_YOLOSegmenter }
NODE_DISPLAY_NAME_MAPPINGS = { "ScarlotSoft_YOLOSegmenter": "ScarlotSoft YOLO Segmenter" }