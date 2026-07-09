import os
import urllib.request
import numpy as np
import csv
import torch
from PIL import Image
import folder_paths
import comfy.utils

try:
    import onnxruntime as ort
except ImportError:
    os.system("pip install onnxruntime")
    import onnxruntime as ort

class ScarlotSoft_WD14Tagger:
    def __init__(self):
        self.model_dir = os.path.join(folder_paths.models_dir, "scarlotsoft", "wd14")
        os.makedirs(self.model_dir, exist_ok=True)

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "image": ("IMAGE",),
                "model": ([
                    "wd-eva02-large-tagger-v3",
                    "wd-vit-tagger-v3",
                    "wd-swinv2-tagger-v3",
                    "wd-convnext-tagger-v3",
                    "wd-v1-4-moat-tagger-v2",
                    "wd-v1-4-convnextv2-tagger-v2",
                    "wd-v1-4-convnext-tagger-v2",
                    "wd-v1-4-swinv2-tagger-v2",
                    "wd-v1-4-vit-tagger-v2"
                ], {"default": "wd-eva02-large-tagger-v3"}),
                "threshold": ("FLOAT", {"default": 0.35, "min": 0.0, "max": 1.0, "step": 0.05}),
                "character_threshold": ("FLOAT", {"default": 0.85, "min": 0.0, "max": 1.0, "step": 0.05}),
                "exclude_tags": ("STRING", {"default": "blur, blurry, text, watermark"}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("TAGS",)
    FUNCTION = "tag_image"
    CATEGORY = "ScarlotSoft/Image/Analysis"
    OUTPUT_NODE = True 

    def download_file(self, url, file_path):
        if not os.path.exists(file_path):
            filename = os.path.basename(file_path)
            print(f"[ScarlotSoft] Descargando archivo esencial desde HuggingFace: {filename}...")
            
            pbar = comfy.utils.ProgressBar(100)
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            
            try:
                with urllib.request.urlopen(req) as response:
                    file_size = int(response.getheader('Content-Length', 0))
                    bytes_downloaded = 0
                    chunk_size = 1024 * 1024 
                    
                    with open(file_path, 'wb') as f:
                        while True:
                            chunk = response.read(chunk_size)
                            if not chunk:
                                break
                            f.write(chunk)
                            bytes_downloaded += len(chunk)
                            
                            if file_size > 0:
                                percent = int((bytes_downloaded / file_size) * 100)
                                pbar.update_absolute(percent, 100)
                                
            except Exception as e:
                if os.path.exists(file_path):
                    os.remove(file_path)
                raise RuntimeError(f"[ScarlotSoft] Falló la descarga del modelo {filename}: {e}")

    def tag_image(self, image, model, threshold, character_threshold, exclude_tags):
        repo_urls = {
            "wd-eva02-large-tagger-v3": "https://huggingface.co/SmilingWolf/wd-eva02-large-tagger-v3/resolve/main/",
            "wd-vit-tagger-v3": "https://huggingface.co/SmilingWolf/wd-vit-tagger-v3/resolve/main/",
            "wd-swinv2-tagger-v3": "https://huggingface.co/SmilingWolf/wd-swinv2-tagger-v3/resolve/main/",
            "wd-convnext-tagger-v3": "https://huggingface.co/SmilingWolf/wd-convnext-tagger-v3/resolve/main/",
            "wd-v1-4-moat-tagger-v2": "https://huggingface.co/SmilingWolf/wd-v1-4-moat-tagger-v2/resolve/main/",
            "wd-v1-4-convnextv2-tagger-v2": "https://huggingface.co/SmilingWolf/wd-v1-4-convnextv2-tagger-v2/resolve/main/",
            "wd-v1-4-convnext-tagger-v2": "https://huggingface.co/SmilingWolf/wd-v1-4-convnext-tagger-v2/resolve/main/",
            "wd-v1-4-swinv2-tagger-v2": "https://huggingface.co/SmilingWolf/wd-v1-4-swinv2-tagger-v2/resolve/main/",
            "wd-v1-4-vit-tagger-v2": "https://huggingface.co/SmilingWolf/wd-v1-4-vit-tagger-v2/resolve/main/"
        }

        base_url = repo_urls[model]
        onnx_path = os.path.join(self.model_dir, f"{model}.onnx")
        csv_path = os.path.join(self.model_dir, f"{model}.csv")

        self.download_file(f"{base_url}model.onnx", onnx_path)
        self.download_file(f"{base_url}selected_tags.csv", csv_path)

        tags_general = []
        tags_character = []
        
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            next(reader) 
            
            for idx, row in enumerate(reader):
                category = int(row[2])
                tag_data = {"idx": idx, "name": row[1].replace("_", " "), "category": category}
                
                if category == 4:
                    tags_character.append(tag_data)
                elif category == 0: 
                    tags_general.append(tag_data)

        img_np = 255. * image[0].cpu().numpy()
        img_np = np.clip(img_np, 0, 255).astype(np.uint8)
        pil_img = Image.fromarray(img_np).convert("RGB")
        
        pil_img = pil_img.resize((448, 448), Image.BILINEAR)
        
        input_data = np.array(pil_img, dtype=np.float32)
        input_data = input_data[:, :, ::-1] 
        input_data = np.expand_dims(input_data, axis=0) 

        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"] if torch.cuda.is_available() else ["CPUExecutionProvider"]
        session = ort.InferenceSession(onnx_path, providers=providers)
        
        input_name = session.get_inputs()[0].name
        outputs = session.run(None, {input_name: input_data})
        probs = outputs[0][0] 

        result_tags = []
        
        for t in tags_character:
            if probs[t["idx"]] >= character_threshold:
                result_tags.append(t["name"])
                
        for t in tags_general:
            if probs[t["idx"]] >= threshold:
                result_tags.append(t["name"])

        excludes = [x.strip().lower() for x in exclude_tags.split(",") if x.strip()]
        final_tags = [t for t in result_tags if t.lower() not in excludes]
        
        final_tags_str = ", ".join(final_tags)

        return {"ui": {"tags": [final_tags_str]}, "result": (final_tags_str,)}

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_WD14Tagger": ScarlotSoft_WD14Tagger
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_WD14Tagger": "ScarlotSoft WD14 Tagger"
}