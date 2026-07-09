import folder_paths
import comfy.samplers
import nodes
import comfy_extras.nodes_upscale_model as upscale_nodes

class ScarlotSoft_UpscalerHiResFix:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                # --- Conectores externos ---
                "model": ("MODEL",),
                "positive": ("CONDITIONING",),
                "negative": ("CONDITIONING",),
                "image": ("IMAGE",),
                "vae": ("VAE",),
                
                # --- DIVISOR 1 ---
                "divisor_1": ("SCARLOT_DIVIDER", {"default": "---------------- Upscaler ----------------"}),
                
                # --- Controles internos (Widgets) ---
                "upscale_model": (folder_paths.get_filename_list("upscale_models"),),
                "upscale_method": (["nearest-exact", "bilinear", "area", "bicubic", "lanczos"],),
                "scale_by": ("FLOAT", {"default": 0.5, "min": 0.01, "max": 8.0, "step": 0.01}),
                
                # --- DIVISOR 2 ---
                "divisor_2": ("SCARLOT_DIVIDER", {"default": "---------------- HiRes Fix Sampler ----------------"}),
                
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
                "steps": ("INT", {"default": 15, "min": 1, "max": 10000}),
                "cfg": ("FLOAT", {"default": 5.0, "min": 0.0, "max": 100.0, "step": 0.1}),
                "sampler_name": (comfy.samplers.KSampler.SAMPLERS, ),
                "scheduler": (comfy.samplers.KSampler.SCHEDULERS, ),
                "denoise": ("FLOAT", {"default": 0.3, "min": 0.0, "max": 1.0, "step": 0.01}),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "process"
    CATEGORY = "ScarlotSoft/Upscaler/HiRes Fix"

    # El **kwargs al final es vital. Se tragará "divisor_1" y "divisor_2" para que la función no falle.
    def process(self, model, positive, negative, image, vae, upscale_model, upscale_method, scale_by, seed, steps, cfg, sampler_name, scheduler, denoise, **kwargs):
        
        # 1. Load Upscale Model
        loader = upscale_nodes.UpscaleModelLoader()
        loaded_upscale_model = loader.load_model(upscale_model)[0]

        # 2. Upscale Image (using Model)
        upscaler = upscale_nodes.ImageUpscaleWithModel()
        upscaled_image = upscaler.upscale(loaded_upscale_model, image)[0]

        # 3. Upscale Image By
        scaler_by = nodes.ImageScaleBy()
        scaled_image = scaler_by.upscale(upscaled_image, upscale_method, scale_by)[0]

        # 4. VAE Encode
        encoder = nodes.VAEEncode()
        latents = encoder.encode(vae, scaled_image)[0]

        # 5. KSampler
        sampler = nodes.KSampler()
        sampled_latents = sampler.sample(model, seed, steps, cfg, sampler_name, scheduler, positive, negative, latents, denoise)[0]

        # 6. VAE Decode
        decoder = nodes.VAEDecode()
        final_image = decoder.decode(vae, sampled_latents)[0]

        return (final_image,)

# --- Mappings individuales ---
NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_UpscalerHiResFix": ScarlotSoft_UpscalerHiResFix
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_UpscalerHiResFix": "ScarlotSoft Upscaler HiRes Fix"
}