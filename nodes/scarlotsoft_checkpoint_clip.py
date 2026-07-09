import comfy.sd
import folder_paths

class ScarlotSoft_CheckpointClipSkip:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                # Lista desplegable automática con todos tus Checkpoints
                "ckpt_name": (folder_paths.get_filename_list("checkpoints"), ),
                # Control nativo del CLIP Skip (Normalmente de -1 a -2)
                "stop_at_clip_layer": ("INT", {"default": -1, "min": -24, "max": -1, "step": 1}),
            }
        }

    RETURN_TYPES = ("MODEL", "CLIP", "VAE")
    RETURN_NAMES = ("MODEL", "CLIP", "VAE")
    FUNCTION = "load_checkpoint"
    CATEGORY = "ScarlotSoft/Loaders"

    def load_checkpoint(self, ckpt_name, stop_at_clip_layer):
        # 1. Obtener la ruta exacta del modelo
        ckpt_path = folder_paths.get_full_path("checkpoints", ckpt_name)
        
        # 2. Usar el motor de carga optimizado nativo de ComfyUI
        out = comfy.sd.load_checkpoint_guess_config(
            ckpt_path, 
            output_vae=True, 
            output_clip=True, 
            embedding_directory=folder_paths.get_folder_paths("embeddings")
        )
        
        model = out[0]
        clip = out[1]
        vae = out[2]

        # 3. Aplicar el CLIP Skip internamente antes de entregar el resultado
        clip = clip.clone()
        clip.clip_layer(stop_at_clip_layer)

        return (model, clip, vae)

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_CheckpointClipSkip": ScarlotSoft_CheckpointClipSkip
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_CheckpointClipSkip": "ScarlotSoft Checkpoint + CLIP Skip"
}