# 🌌 ComfyUI ScarlotSoft Suite

A personalized, highly efficient suite of custom nodes for ComfyUI, designed to streamline complex workflows, improve image quality, and provide a cleaner user experience.

![ScarlotSoft Banner](link_a_una_imagen_de_banner_si_tienes.png) <!-- Reemplaza con una imagen real o borra esta línea -->

## 🚀 Features & Nodes

This suite includes a variety of specialized nodes built from the ground up for better control and performance in your AI generation workflows:

*   **ScarlotSoft Save Image:** A reliable file-saving node configured with a strict `MM-DD-YYYY` date format. This specific formatting prevents the system from accidentally creating unintended directory structures and keeps your output folder perfectly organized.
*   **ScarlotSoft LoRA Detailer:** A specialized node (not a standard ADetailer) focused specifically on utilizing LoRAs to dramatically enhance and refine image details during the generation process.
*   **ScarlotSoft WD14 Tagger:** A fully integrated custom WD14 Tagger built specifically for this suite, allowing you to extract accurate tags directly within your workflow without relying on external dependencies.
*   **ScarlotSoft Metadata Reader:** A streamlined node to extract and read generation metadata cleanly and efficiently.
*   **ScarlotSoft Checkpoint + CLIP:** An all-in-one loader for a faster setup.
*   **Prompt Autoloader & Text Utilities:** Advanced string and text preview nodes to manage your complex prompts easily.
*   **Custom UI Theme:** Includes custom JavaScript and CSS (`scarlotsoft_theme`) to give your nodes a unique and professional look on the canvas.

## 📦 Installation

### Method 1: ComfyUI Manager (Recommended)
1. Open ComfyUI and click on **Manager**.
2. Click on **Install Custom Nodes**.
3. Search for `ScarlotSoft`.
4. Click **Install** and restart ComfyUI.

### Method 2: Manual Installation
1. Open your terminal/command prompt.
2. Navigate to your ComfyUI `custom_nodes` folder:
   ```bash
   cd ComfyUI/custom_nodes/
