import os
import torch
import numpy as np
from PIL import Image, ImageOps, ImageSequence
import folder_paths

class ScarlotSoft_LoadImage:
    @classmethod
    def INPUT_TYPES(s):
        # Escaneamos la carpeta "input" estándar de ComfyUI
        input_dir = folder_paths.get_input_directory()
        files = [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f))]
        
        return {
            "required": {
                # El flag "image_upload": True es vital para que el frontend active el Drag & Drop
                "image": (sorted(files), {"image_upload": True})
            }
        }

    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("image", "mask")
    FUNCTION = "load_image"
    CATEGORY = "ScarlotSoft/Image"

    def load_image(self, image):
        # Obtenemos la ruta absoluta de la imagen subida
        image_path = folder_paths.get_annotated_filepath(image)
        img = Image.open(image_path)
        
        output_images = []
        output_masks = []
        
        # Iterador seguro para soportar múltiples frames (ej. GIFs)
        for i in ImageSequence.Iterator(img):
            i = ImageOps.exif_transpose(i)
            
            if i.mode == 'I':
                i = i.point(lambda i: i * (1 / 255))
                
            # Conversión del espacio de color y pase a Tensor
            image_rgb = i.convert("RGB")
            image_tensor = np.array(image_rgb).astype(np.float32) / 255.0
            image_tensor = torch.from_numpy(image_tensor)[None,]
            
            # Extracción del canal Alpha (Transparencia) como máscara
            if 'A' in i.getbands():
                mask = np.array(i.getchannel('A')).astype(np.float32) / 255.0
                mask = 1. - mask # Invertir la máscara a la polaridad que usa ComfyUI
                mask = torch.from_numpy(mask)[None,]
            else:
                mask = torch.zeros((1, 64, 64), dtype=torch.float32, device="cpu")
                
            output_images.append(image_tensor)
            output_masks.append(mask)

        # Empaquetado del lote (Batch)
        if len(output_images) > 1:
            output_image = torch.cat(output_images, dim=0)
            output_mask = torch.cat(output_masks, dim=0)
        else:
            output_image = output_images[0]
            output_mask = output_masks[0]

        return (output_image, output_mask)

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_LoadImage": ScarlotSoft_LoadImage
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_LoadImage": "ScarlotSoft Load Image"
}