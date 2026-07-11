import os
import torch
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
import folder_paths
import comfy.samplers
import nodes
import comfy_extras.nodes_upscale_model as upscale_nodes

try:
    from ultralytics import YOLO
    HAS_YOLO = True
except ImportError:
    HAS_YOLO = False

class ScarlotSoft_AutoDetailer:
    @classmethod
    def INPUT_TYPES(s):
        yolo_dir = os.path.join(folder_paths.models_dir, "ultralytics")
        models = []
        if os.path.exists(yolo_dir):
            for root, dirs, files in os.walk(yolo_dir):
                for f in files:
                    if f.endswith(".pt") or f.endswith(".pth"):
                        rel_path = os.path.relpath(os.path.join(root, f), yolo_dir)
                        models.append(rel_path.replace("\\", "/"))
        
        if not models:
            models = ["No YOLO models found"]

        # Escaneamos los modelos de Upscale disponibles en ComfyUI
        upscale_models = ["None"] + folder_paths.get_filename_list("upscale_models")

        return {
            "required": {
                "image": ("IMAGE",),
                "model": ("MODEL",),
                "clip": ("CLIP",),
                "vae": ("VAE",),
                "positive": ("CONDITIONING",),
                "negative": ("CONDITIONING",),
                
                "detector_model": (models,),
                "upscale_model": (upscale_models,), # NUEVO INPUT
                "confidence": ("FLOAT", {"default": 0.5, "min": 0.1, "max": 1.0, "step": 0.05}),
                "mask_expansion": ("INT", {"default": 35, "min": 0, "max": 200}), # Aumentado a 35 para dar contexto
                "mask_feather": ("INT", {"default": 20, "min": 0, "max": 100}),
                "guide_size": ("INT", {"default": 512, "min": 256, "max": 1024, "step": 64}),
                
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
                "steps": ("INT", {"default": 20, "min": 1, "max": 100}),
                "cfg": ("FLOAT", {"default": 6.0, "min": 1.0, "max": 20.0, "step": 0.1}),
                "sampler_name": (comfy.samplers.KSampler.SAMPLERS, ),
                "scheduler": (comfy.samplers.KSampler.SCHEDULERS, ),
                "denoise": ("FLOAT", {"default": 0.40, "min": 0.0, "max": 1.0, "step": 0.01}), # Ajustado a 0.40
            }
        }
    
    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    FUNCTION = "execute"
    CATEGORY = "ScarlotSoft/Detailer"

    def execute(self, image, model, clip, vae, positive, negative, detector_model, upscale_model, confidence, mask_expansion, mask_feather, guide_size, seed, steps, cfg, sampler_name, scheduler, denoise, **kwargs):
        if not HAS_YOLO:
            print("[ScarlotSoft] Error: El paquete 'ultralytics' no está instalado.")
            return (image,)
        if detector_model == "No YOLO models found":
            return (image,)

        model_path = os.path.join(folder_paths.models_dir, "ultralytics", detector_model)
        yolo = YOLO(model_path)
        
        # --- CARGA DEL MODELO DE UPSCALE ---
        loaded_upscaler = None
        upscale_node = None
        if upscale_model != "None":
            loader = upscale_nodes.UpscaleModelLoader()
            loaded_upscaler = loader.load_model(upscale_model)[0]
            upscale_node = upscale_nodes.ImageUpscaleWithModel()

        encoder = nodes.VAEEncode()
        sampler = nodes.KSampler()
        decoder = nodes.VAEDecode()

        batch_results = []

        for img_tensor in image:
            img_np = (img_tensor.cpu().numpy() * 255).astype(np.uint8)
            img_pil = Image.fromarray(img_np).convert("RGB")
            orig_w, orig_h = img_pil.size

            results = yolo(img_pil, conf=confidence, verbose=False)
            boxes = results[0].boxes.xyxy.cpu().numpy() if len(results[0].boxes) > 0 else []

            final_img_pil = img_pil.copy()

            for box in boxes:
                x1, y1, x2, y2 = box
                
                x1 = max(0, x1 - mask_expansion)
                y1 = max(0, y1 - mask_expansion)
                x2 = min(orig_w, x2 + mask_expansion)
                y2 = min(orig_h, y2 + mask_expansion)
                
                box_w = int(x2 - x1)
                box_h = int(y2 - y1)
                
                if box_w < 16 or box_h < 16:
                    continue

                crop_pil = img_pil.crop((x1, y1, x2, y2))
                
                # --- MAGIA PRO: UPSCALE POR IA ANTES DEL KSAMPLER ---
                if upscale_node is not None:
                    # Pasamos el recorte a Tensor, lo reescalamos con IA, y lo devolvemos a PIL
                    crop_t = torch.from_numpy(np.array(crop_pil).astype(np.float32) / 255.0).unsqueeze(0)
                    crop_t = upscale_node.upscale(loaded_upscaler, crop_t)[0]
                    crop_pil = Image.fromarray((crop_t[0].cpu().numpy() * 255).astype(np.uint8)).convert("RGB")
                
                # Ahora sí, ajustamos al guide_size exacto
                box_w_current, box_h_current = crop_pil.size
                scale = guide_size / max(box_w_current, box_h_current)
                new_w = max(64, (int(box_w_current * scale) // 64) * 64)
                new_h = max(64, (int(box_h_current * scale) // 64) * 64)
                crop_resized = crop_pil.resize((new_w, new_h), Image.LANCZOS)
                
                mask_pil = Image.new("L", (new_w, new_h), 0)
                draw = ImageDraw.Draw(mask_pil)
                f = mask_feather
                if f * 2 >= new_w or f * 2 >= new_h:
                    f = min(new_w, new_h) // 3
                
                draw.rounded_rectangle((f, f, new_w - f, new_h - f), radius=f, fill=255)
                if f > 0:
                    mask_pil = mask_pil.filter(ImageFilter.GaussianBlur(f / 2))
                
                crop_tensor = torch.from_numpy(np.array(crop_resized).astype(np.float32) / 255.0).unsqueeze(0)
                mask_tensor = torch.from_numpy(np.array(mask_pil).astype(np.float32) / 255.0).unsqueeze(0)

                latent_dict = encoder.encode(vae=vae, pixels=crop_tensor)[0]
                latent_dict["noise_mask"] = mask_tensor
                
                sampled_latent = sampler.sample(
                    model=model, 
                    seed=seed, 
                    steps=steps, 
                    cfg=cfg, 
                    sampler_name=sampler_name, 
                    scheduler=scheduler, 
                    positive=positive, 
                    negative=negative, 
                    latent_image=latent_dict, 
                    denoise=denoise
                )[0]
                
                decoded_tensor = decoder.decode(vae=vae, samples=sampled_latent)[0]
                
                decoded_np = (decoded_tensor[0].cpu().numpy() * 255).astype(np.uint8)
                decoded_pil = Image.fromarray(decoded_np).convert("RGB")
                
                decoded_resized = decoded_pil.resize((box_w, box_h), Image.LANCZOS)
                mask_resized = mask_pil.resize((box_w, box_h), Image.LANCZOS)
                
                final_img_pil.paste(decoded_resized, (int(x1), int(y1)), mask_resized)

            out_tensor = torch.from_numpy(np.array(final_img_pil).astype(np.float32) / 255.0).unsqueeze(0)
            batch_results.append(out_tensor)

        final_batch = torch.cat(batch_results, dim=0)
        return (final_batch,)

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_AutoDetailer": ScarlotSoft_AutoDetailer
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_AutoDetailer": "ScarlotSoft AutoDetailer"
}