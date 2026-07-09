import comfy.samplers

# HACK MAESTRO: Creamos una clase que engaña al sistema de validación de ComfyUI.
# Al devolver siempre "False" en la desigualdad, obliga al motor a aceptar la conexión.
class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

# Declaramos nuestro Comodín Universal
ANY = AnyType("*")

class ScarlotSoft_KSamplerConfig:
    @classmethod
    def INPUT_TYPES(s):
        # Extraemos las listas originales del núcleo de ComfyUI siempre actualizadas
        base_samplers = comfy.samplers.KSampler.SAMPLERS
        base_schedulers = comfy.samplers.KSampler.SCHEDULERS
        
        # Inyectamos los Schedulers personalizados para el FaceDetailer
        fd_custom_schedulers = base_schedulers + [
            "AYS SDXL", "AYS SD1", "AYS SVD", 
            "GITS[coeff=1.2]", "LTXV[default]", 
            "OSS FLUX", "OSS Wan", "OSS Chroma"
        ]
        
        return {
            "required": {
                "steps": ("INT", {"default": 20, "min": 1, "max": 10000}),
                "refiner_steps": ("INT", {"default": 5, "min": 0, "max": 10000}),
                "cfg": ("FLOAT", {"default": 8.0, "min": 0.0, "max": 100.0, "step": 0.5, "round": 0.1}),
                "sampler": (base_samplers, ),
                "ks_scheduler": (base_schedulers, ),
                "fd_scheduler": (fd_custom_schedulers, ),
            }
        }

    # REEMPLAZO CLAVE: Usamos 'ANY' en lugar de nombres de texto fijos
    RETURN_TYPES = ("INT", "INT", "FLOAT", ANY, ANY, ANY)
    RETURN_NAMES = ("STEPS", "REFINER_STEPS", "CFG", "SAMPLER", "SCHEDULER_KSAMPLER", "SCHEDULER_FACEDETAILER")
    FUNCTION = "execute"
    CATEGORY = "ScarlotSoft/KSampler"

    def execute(self, steps, refiner_steps, cfg, sampler, ks_scheduler, fd_scheduler):
        # El nodo simplemente funciona como un puente enrutador
        return (steps, refiner_steps, cfg, sampler, ks_scheduler, fd_scheduler)

NODE_CLASS_MAPPINGS = {
    "ScarlotSoft_KSamplerConfig": ScarlotSoft_KSamplerConfig
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ScarlotSoft_KSamplerConfig": "ScarlotSoft KSampler Config"
}