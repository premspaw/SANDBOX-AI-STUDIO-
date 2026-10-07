---
name: image-generation
description: Generate high-fidelity studio images, character portraits, marketing assets, and product photography using Nano Banana 2, Nano Banana Pro, and Studio Image Pro with confirmation protocols.
---

# Image Generation Workflow

This skill guides the assistant when generating images, character boards, and product photography in ZeroLens AI Studio.

---

## 1. Supported Image Engines & Credit Costs

| Model Key | Engine Name | Strengths & Use Cases | Shorts Cost |
| :--- | :--- | :--- | :--- |
| `nano-banana-2-lite` | **Nano Banana 2 Lite** | Rapid ideation, budget-friendly concepts | **0.5 Shorts** |
| `nano-banana-2` | **Nano Banana 2** | Standard studio quality, product shots, balanced fidelity | **1 Short** |
| `gpt-image-2.5-flare` | **Studio Image Flare** | Sharp digital illustrations, vibrant stylized graphics | **1.5 Shorts** |
| `gpt-image-2.5-sunburst` | **Studio Image Sunburst** | Deep typographic accuracy, intricate graphic design | **2.5 Shorts** |
| `nano-banana-pro` | **Nano Banana Pro** | Maximum photographic realism, skin texture, studio lighting | **3 Shorts** |

---

## 2. Aspect Ratios & Compositions

- **`1:1` (Square)**: Social media feed posts, avatars, product catalog tiles.
- **`9:16` (Vertical)**: Fullscreen mobile wallpapers, mobile stories, vertical background plates.
- **`16:9` (Landscape)**: Hero banners, widescreen thumbnails, desktop presentations.
- **`4:5` / `3:4` (Portrait)**: Portrait social feeds, character posters, editorial photography.

---

## 3. Visual Style Presets

- `photorealistic`: 85mm lens, f/1.8 shallow depth of field, natural studio key light, clean bokeh.
- `cinematic`: High-contrast anamorphic scope, moody color grading, dramatic rim highlights.
- `minimalist`: Clean negative space, muted pastel or monochrome palette, elegant typography.
- `3d-render`: High-end 3D render style, ray-traced materials, metallic reflections, subsurface scattering.
- `digital-art`: Crisp linework, vibrant cel-shading, dynamic illustrative composition.

---

## 4. MANDATORY PRE-GENERATION CONFIRMATION (IMAGES)

> [!IMPORTANT]
> **RULE: Before invoking `generate_image` or `cinema_generate_image`, always confirm the proposed design and cost.**

### Pre-Generation Checklist:
1. **Style & Theme**: Summarize the proposed visual subject, atmosphere, and lighting.
2. **Aspect Ratio**: Confirm ratio (e.g., 1:1, 9:16, 16:9).
3. **Model & Cost**: State the model (default: Nano Banana 2) and credit cost (e.g. 1 Short).
4. **Ask Confirmation**:
   *"Proposed image: {Brief description} in {aspect_ratio} ({model}, {cost} Shorts). Shall I generate this image now? (Yes/No)"*

### Post-Generation Display:
When the tool completes:
- Render the image directly in markdown: `![ZeroLens Studio Image](IMAGE_URL)`
- Provide direct download link: `[📥 Download High-Res Image](IMAGE_URL)`
