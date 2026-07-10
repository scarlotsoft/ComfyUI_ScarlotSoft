class ScarlotSoft_CLIPTextEncodeModular:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "clip": ("CLIP", ),
                "style": ("STRING", {"multiline": True, "default": ""}),
                "subject": ("STRING", {"multiline": True, "default": ""}),
                "Add_Positive_Prompt_Tags": ("BOOLEAN", {"default": True}),
                "Add_Negative_Prompt_Tags": ("BOOLEAN", {"default": False}),
            },
            "optional": {
                "builder_prompt": ("STRING", {"forceInput": True}),
            }
        }

    RETURN_TYPES = ("CONDITIONING", "STRING")
    RETURN_NAMES = ("CONDITIONING", "FULL_PROMPT")
    FUNCTION = "encode_modular"
    CATEGORY = "ScarlotSoft/Conditioning"

    def encode_modular(self, clip, style, subject, Add_Positive_Prompt_Tags, Add_Negative_Prompt_Tags, builder_prompt=""):
        
        # --- MODO 1: OVERRIDE DEL BUILDER ---
        if builder_prompt and builder_prompt.strip() != "":
            full_text = builder_prompt.strip()
            
        # --- MODO 2: CONSTRUCTOR MODULAR ---
        else:
            parts = []
            is_pos_on = str(Add_Positive_Prompt_Tags).lower() in ["true", "1", "t", "y", "yes"]
            is_neg_on = str(Add_Negative_Prompt_Tags).lower() in ["true", "1", "t", "y", "yes"]
            
            # Blindaje doble: Garantiza que nunca se mezclen
            if is_pos_on and not is_neg_on:
                parts.append("masterpiece, best quality, ultra detailed, 8k resolution, highly detailed")
            elif is_neg_on and not is_pos_on:
                parts.append("worst quality, low quality, normal quality, blurry, mutated, ugly, deformed, watermark, text")
                
            if style and style.strip() != "":
                parts.append(style.strip())
            if subject and subject.strip() != "":
                parts.append(subject.strip())
                
            raw_text = ", ".join(parts)
            
            # Filtro anti-duplicados ScarlotSoft
            tags = [tag.strip() for tag in raw_text.split(",") if tag.strip()]
            unique_tags = list(dict.fromkeys(tags))
            full_text = ", ".join(unique_tags)
            
        # Codificación final
        tokens = clip.tokenize(full_text)
        cond, pooled = clip.encode_from_tokens(tokens, return_pooled=True)
        final_conditioning = [[cond, {"pooled_output": pooled}]]
        
        return (final_conditioning, full_text)

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_CLIPTextEncodeModular": ScarlotSoft_CLIPTextEncodeModular
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_CLIPTextEncodeModular": "ScarlotSoft Modular CLIP Encode"
}