# OpenAI GPT Image and Vision API Reference Guide

This comprehensive reference document contains detailed specifications, endpoints, model names, size limits, and code patterns for the **OpenAI GPT Image** (including `gpt-image-2`) and **Vision** APIs.

---

## 1. Overview

The OpenAI API allows you to generate and edit images from text prompts using GPT Image models, including our latest, `gpt-image-2`. You can access image generation capabilities through two primary APIs:

### Image API
Starting with `gpt-image-1` and later models, the [Image API](https://developers.openai.com/api/docs/api-reference/images) provides two endpoints:
* **Generations**: [Generate images](#2-generate-images) from scratch based on a text prompt.
* **Edits**: [Modify existing images](#3-edit-images) using a new prompt, either partially or entirely.

### Responses API
The [Responses API](https://developers.openai.com/api/docs/api-reference/responses/create#responses-create-tools) allows you to generate images as part of conversations or multi-step flows. It supports image generation as a [built-in tool](https://developers.openai.com/api/docs/guides/tools?api-mode=responses) and accepts image inputs and outputs within context.
* **Multi-turn editing**: Iteratively make high fidelity edits to images with prompting.
* **Flexible inputs**: Accept image [File](https://developers.openai.com/api/docs/api-reference/files) IDs as input images, not just bytes.

---

## 2. Generate Images

### Image API Generation Example
Use the `images.generate` endpoint to create a new image.

```javascript
import OpenAI from "openai";
import fs from "fs";
const openai = new OpenAI();

const prompt = `
A children's book drawing of a veterinarian using a stethoscope to 
listen to the heartbeat of a baby otter.
`;

const result = await openai.images.generate({
    model: "gpt-image-2",
    prompt,
});

// Save the image to a file
const image_base64 = result.data[0].b64_json;
const image_bytes = Buffer.from(image_base64, "base64");
fs.writeFileSync("otter.png", image_bytes);
```

```bash
curl -X POST "https://api.openai.com/v1/images/generations" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-type: application/json" \
    -d '{
        "model": "gpt-image-2",
        "prompt": "A childrens book drawing of a veterinarian using a stethoscope to listen to the heartbeat of a baby otter."
    }' | jq -r '.data[0].b64_json' | base64 --decode > otter.png
```

---

## 3. Edit Images (Inpainting & Reference)

The [image edits](https://developers.openai.com/api/docs/api-reference/images/createEdit) endpoint lets you:
* Edit existing images.
* Generate new images using other images as a reference.
* Edit parts of an image by uploading an image and a mask that identifies the areas to replace.

### Masking with the Image API (Inpainting)
Provide a base image and a mask (containing an alpha channel) to indicatively replace the masked area.

```javascript
import fs from "fs";
import OpenAI, { toFile } from "openai";

const client = new OpenAI();

const rsp = await client.images.edit({
    model: "gpt-image-2",
    image: await toFile(fs.createReadStream("sunlit_lounge.png"), null, {
        type: "image/png",
    }),
    mask: await toFile(fs.createReadStream("mask.png"), null, {
        type: "image/png",
    }),
    prompt: "A sunlit indoor lounge area with a pool containing a flamingo",
});

// Save the image to a file
const image_base64 = rsp.data[0].b64_json;
const image_bytes = Buffer.from(image_base64, "base64");
fs.writeFileSync("lounge.png", image_bytes);
```

### Mask Programmatic Alpha Insertion (Python)
The mask image must contain an alpha channel. If it is standard black and white, you can prepare the alpha channel programmatically:

```python
from PIL import Image
from io import BytesIO

# 1. Load your black & white mask as a grayscale image
mask = Image.open(img_path_mask).convert("L")

# 2. Convert it to RGBA so it has space for an alpha channel
mask_rgba = mask.convert("RGBA")

# 3. Then use the mask itself to fill that alpha channel
mask_rgba.putalpha(mask)

# 4. Convert the mask into bytes
buf = BytesIO()
mask_rgba.save(buf, format="PNG")
mask_bytes = buf.getvalue()

# 5. Save the resulting file
img_path_mask_alpha = "mask_alpha.png"
with open(img_path_mask_alpha, "wb") as f:
    f.write(mask_bytes)
```

---

## 4. Customize Image Output

You can configure the following output options:
* **Size**: Image dimensions (e.g. `1024x1024`, `1536x1024`)
* **Quality**: Rendering quality (`low`, `medium`, `high`, `auto`)
* **Format**: File output format (`png`, `jpeg`, `webp`)
* **Compression**: `output_compression` (0-100%) for JPEG and WebP formats.
* **Background**: `opaque` or `auto`.

### Size Constraints for `gpt-image-2`
`gpt-image-2` supports custom sizes satisfying these constraints:
* **Maximum edge length**: `3840px` or less.
* **Multiples**: Both edges must be multiples of `16px`.
* **Aspect ratio**: Long-to-short edge ratio must not exceed `3:1`.
* **Total pixels**: Minimum `655,360` pixels; maximum `8,294,400` pixels.

### Standard Presets
* **Square**: `1024x1024`
* **Landscape**: `1536x1024`
* **Portrait**: `1024x1536`
* **2K Square**: `2048x2048`
* **2K Landscape**: `2048x1152`
* **4K Landscape**: `3840x2160`
* **4K Portrait**: `2160x3840`

---

## 5. Token Costs & Pricing

### Output Tokens per Quality Preset
The number of output tokens scales with quality and size constraints:

| Quality | Square (1024×1024) | Portrait (1024×1536) | Landscape (1536×1024) |
| ------- | ------------------ | -------------------- | --------------------- |
| **Low**     | 272 tokens         | 408 tokens           | 400 tokens            |
| **Medium**  | 1056 tokens        | 1584 tokens          | 1568 tokens           |
| **High**    | 4160 tokens        | 6240 tokens          | 6208 tokens           |

### Estimated Costs Table

| Model | Quality | 1024 x 1024 | 1024 x 1536 | 1536 x 1024 |
| ----- | ------- | ----------- | ----------- | ----------- |
| **GPT Image 2** | Low | $0.006 | $0.005 | $0.005 |
| | Medium | $0.053 | $0.041 | $0.041 |
| | High | $0.211 | $0.165 | $0.165 |
| **GPT Image 1.5** | Low | $0.009 | $0.013 | $0.013 |
| | Medium | $0.034 | $0.050 | $0.050 |
| | High | $0.133 | $0.200 | $0.200 |

---

## 6. Vision Modality

Vision allows mainline models to analyze image context, shapes, colors, or textures from an image URL, base64 data, or a File ID.

### Analyze Image Example (Responses API)

```javascript
import OpenAI from "openai";
const openai = new OpenAI();

const response = await openai.responses.create({
    model: "gpt-5",
    input: [{
        role: "user",
        content: [
            { type: "input_text", text: "what's in this image?" },
            {
                type: "input_image",
                image_url: "https://api.nga.gov/iiif/a2e6da57-3cd1-4235-b20e-95dcaefed6c8/full/!800,800/0/default.jpg",
            },
        ],
    }],
});

console.log(response.output_text);
```
