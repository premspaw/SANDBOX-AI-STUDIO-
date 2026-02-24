---
name: gemini-image-generation
description: Help generate, edit, and understand images and videos using Gemini media models via the Gemini API (JS/REST), including Nano Banana image generation, Veo video generation, and multimodal image/video understanding (captioning, VQA, classification, object detection, segmentation, video summarization). Use when the user mentions image generation, Nano Banana, gemini-2.5-flash-image, gemini-3-pro-image-preview, Veo, veo-3.1-generate-preview, video understanding, or asks to analyze or create images/videos with the Gemini API.
---

# Gemini media (images & video): generation and understanding

This skill helps the agent use Gemini's native **image** and **video**
generation and understanding capabilities based on the official guides:

- [Nano Banana image generation docs](https://ai.google.dev/gemini-api/docs/image-generation)
- [Image understanding docs](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Veo 3.1 video generation docs](https://ai.google.dev/gemini-api/docs/video?example=dialogue)
- [Video understanding docs](https://ai.google.dev/gemini-api/docs/video-understanding)

Focus on:
- Selecting the right media model
- Designing effective prompts
- Producing concise code snippets (JavaScript/Node first, REST as a fallback)
- Handling:
  - Text-to-image, image editing, and multi-image composition
  - Text/image-to-video with Veo (clips, aspect ratio, resolution)
  - Image & video understanding (captioning, Q&A, summarization, detection)

Keep answers **practical and short** unless the user explicitly asks for deep detail.

## When to use this skill

Use this skill when:
- The user wants to **generate images** from text or text+image using Gemini.
- The user wants to **understand, caption, classify, or compare images**, or ask visual questions (VQA).
- The user wants **object detection** (bounding boxes) or **segmentation masks** from images.
- The user wants to **generate videos** from text or text+image using **Veo 3.x** (Gemini API).
- The user wants to **analyze or summarize videos** (e.g. “summarize this mp4”, “quiz from this lecture recording”).
- The user mentions **Nano Banana**, **Nano Banana Pro**, **gemini-2.5-flash-image**, or **gemini-3-pro-image-preview**.
- The user mentions **Veo**, **veo-3.1-generate-preview**, **veo-3.1-fast-generate-preview**, or talks about “text to video”.
- The user asks about **image editing**, **style transfer**, **inpainting**, or **combining multiple reference images** with Gemini.
- The user needs **code examples** (especially JavaScript/Node or REST) for Gemini image/video generation or media understanding.

## Models at a glance

- **gemini-2.5-flash-image** (Nano Banana)
  - Optimized for **speed and volume**.
  - Resolution: ~1024×1024 (1K equivalent).
  - Best for: fast previews, simple assets, stickers, icons, iterative drafts.
  - Up to ~3 input images recommended.

- **gemini-3-pro-image-preview** (Nano Banana Pro)
  - Optimized for **quality and professional assets**.
  - Resolutions: **1K**, **2K**, **4K** via `imageSize: "1K" | "2K" | "4K"`.
  - Better **text rendering**, layouts, diagrams, logos, and marketing assets.
  - Supports **up to 14 reference images** (multiple objects + humans).
  - Can use **Google Search grounding** and a **thinking process** for complex prompts.

**Model choice heuristic:**
- Prefer `gemini-2.5-flash-image` for quick, low-latency, 1K images.
- Prefer `gemini-3-pro-image-preview` for:
  - Anything with **important text** in the image,
  - **Hi-res (2K/4K)** outputs,
  - **Multi-reference** or **grounded** images (e.g. weather charts, sports scores).

For **image understanding** tasks (captioning, VQA, classification, detection, segmentation),
use a recent **multimodal text model** such as:

- `gemini-3-flash-preview` (used throughout the image-understanding docs)
- Or the latest project-standard multimodal text model if already chosen elsewhere

Do **not** use the `*-image` models for pure text responses; they are specialized for image generation.

For **video understanding** (summaries, Q&A, quizzes, timestamp-based questions),
use the same multimodal text model family (for example `gemini-3-flash-preview`)
and follow the [video understanding docs](https://ai.google.dev/gemini-api/docs/video-understanding).

## Quickstart – JavaScript (Node, @google/genai)

Always start with the official SDK when possible.
Assume the user has `@google/genai` installed and `GOOGLE_API_KEY` set.

### Text-to-image (simple)

```js
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({});

async function generateImage() {
  const prompt =
    "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, "base64");
      fs.writeFileSync("gemini-native-image.png", buffer);
    }
  }
}

generateImage().catch(console.error);
```

### Text + image editing (JS)

```js
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({});

async function editImage() {
  const imagePath = "cat.png";
  const base64Image = fs.readFileSync(imagePath).toString("base64");

  const prompt = [
    {
      text:
        "Create a picture of my cat eating a nano-banana in a fancy restaurant " +
        "under the Gemini constellation",
    },
    {
      inlineData: {
        mimeType: "image/png",
        data: base64Image,
      },
    },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, "base64");
      fs.writeFileSync("cat_nano_banana.png", buffer);
    }
  }
}

editImage().catch(console.error);
```

## Quickstart – REST (minimal)

Use REST when the user is not using an official SDK.

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [
        {"text": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"}
      ]
    }]
  }'
```

For image **editing**, include a `parts.inline_data` object with base64 image data (see the docs if the user needs full syntax).

## Configuring aspect ratio and size

Use `imageConfig` in `generationConfig`/`config`:

- **Aspect ratios** (shared): `"1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"`.
- **Sizes**:
  - `gemini-2.5-flash-image`: fixed 1K-ish resolution; specify **aspect ratio** only.
  - `gemini-3-pro-image-preview`: `imageSize: "1K" | "2K" | "4K"` (uppercase `K` required).

### Example (JS, Gemini 3 Pro Image)

```js
const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: prompt,
  config: {
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: {
      aspectRatio: "16:9",
      imageSize: "2K",
    },
  },
});
```

If the user only wants images, set `responseModalities: ["IMAGE"]`.

## Video generation with Veo (text / image / video)

Use the **Veo** guide when the user wants to **generate videos**, not just images:
[Generate videos with Veo 3.1](https://ai.google.dev/gemini-api/docs/video?example=dialogue).

Core ideas:
- Veo is accessed via `generateVideos` (not `generateContent`).
- Calls are **long-running operations**; you must **poll** until `operation.done` is true.
- Models:
  - `veo-3.1-generate-preview` (default high quality, with audio)
  - `veo-3.1-fast-generate-preview` (faster, good for bulk / A/B tests)
- Key params:
  - `aspectRatio`: `"16:9"` (default) or `"9:16"`
  - `resolution`: `"720p"`, `"1080p"`, `"4k"` (see docs for constraints)
  - `image`: start frame (image-to-video)
  - `video`: Veo video to extend (video-to-video)
  - `referenceImages`: up to 3 reference images for subject/style consistency

### Basic text-to-video (JavaScript)

```js
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function generateVideo() {
  const prompt =
    "A close up of two people staring at a cryptic drawing on a wall, torchlight flickering.";

  let op = await ai.models.generateVideos({
    model: "veo-3.1-generate-preview",
    prompt,
    // Optional:
    // config: { aspectRatio: "16:9", resolution: "720p" },
  });

  while (!op.done) {
    console.log("Waiting for video generation to complete...");
    await new Promise((r) => setTimeout(r, 10000));
    op = await ai.operations.getVideosOperation({ operation: op });
  }

  await ai.files.download({
    file: op.response.generatedVideos[0].video,
    downloadPath: "example.mp4",
  });
}

generateVideo().catch(console.error);
```

For **portrait** videos use `config: { aspectRatio: "9:16" }`.
For **higher resolution** use `resolution: "1080p"` or `"4k"` (8s only, see docs).

### Image-to-video (Veo + Nano Banana)

Pattern when the user wants to:
1. Generate a still with Nano Banana, then
2. Animate it with Veo.

At a high level:
- First call `gemini-2.5-flash-image` (`generateContent`) to get an image.
- Then pass that image as `image` in `generateVideos` with Veo.

Follow the docs example to map the image output into `imageBytes`/`mimeType`
for `generateVideos`.

## Image understanding quickstart (captioning, VQA, comparison)

Use the **image understanding** guide when the user wants to analyze images
rather than generate them: captioning, Q&A about an image, classification,
comparing two images, etc. See:
[Image understanding docs](https://ai.google.dev/gemini-api/docs/image-understanding).

### Inline image data (JavaScript, local file)

Use inline base64 image data for small files (request < 20MB total).

```js
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({});

async function captionImage() {
  const base64Image = fs.readFileSync("path/to/small-sample.jpg", {
    encoding: "base64",
  });

  const contents = [
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image,
      },
    },
    { text: "Caption this image." },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
  });

  console.log(response.text);
}

captionImage().catch(console.error);
```

### URL image (JavaScript)

```js
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function captionFromUrl() {
  const imageUrl = "https://goo.gle/instrument-img";
  const res = await fetch(imageUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const base64Image = buffer.toString("base64");

  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      },
      { text: "Caption this image." },
    ],
  });

  console.log(result.text);
}

captionFromUrl().catch(console.error);
```

### Multiple images in one prompt (JS)

Use this when the user asks to compare or find differences between images.

```js
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({});

async function compareImages() {
  // First image via Files API (good for reuse / large files)
  const uploaded = await ai.files.upload({
    file: "path/to/image1.jpg",
    config: { mimeType: "image/jpeg" },
  });

  // Second image inline
  const base64Image2 = fs.readFileSync("path/to/image2.png", {
    encoding: "base64",
  });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: createUserContent([
      "What is different between these two images?",
      createPartFromUri(uploaded.uri, uploaded.mimeType),
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Image2,
        },
      },
    ]),
  });

  console.log(response.text);
}

compareImages().catch(console.error);
```

Use **inline data** for small, one-off images and the **Files API** for larger
or frequently reused images.

## Video understanding quickstart (summarization, quizzes, QA)

Use the **video understanding** guide when the user wants to analyze videos:
summaries, quizzes, timestamp-based questions, etc. See
[Video understanding docs](https://ai.google.dev/gemini-api/docs/video-understanding).

General rules:
- Prefer the **Files API** for videos (especially >100MB or reused).
- Use a multimodal text model such as `gemini-3-flash-preview`.
- Put the **video part first**, then the **text question**.

### Summarize a video file (JavaScript + Files API)

```js
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

const ai = new GoogleGenAI({});

async function summarizeVideo() {
  const myfile = await ai.files.upload({
    file: "path/to/sample.mp4",
    config: { mimeType: "video/mp4" },
  });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: createUserContent([
      createPartFromUri(myfile.uri, myfile.mimeType),
      "Summarize this video, then create a short quiz with answers.",
    ]),
  });

  console.log(response.text);
}

summarizeVideo().catch(console.error);
```

For **short (<20MB)** clips you can inline the video as base64 `inlineData`
instead of uploading with Files API.

## Prompt patterns

When helping the user, **rewrite and tighten** their prompt using patterns from the docs.
Keep prompts **descriptive sentences**, not loose keyword lists.

- **Photorealistic scene**
  - Template:
    > A photorealistic [shot type] of [subject], [action], set in [environment].  
    > Lit by [lighting] for a [mood] atmosphere, shot on [camera/lens], emphasizing [textures/details].

- **Sticker / icon**
  - Template:
    > A [style] sticker/icon of [subject], with [key traits], [line style] and [shading style].  
    > Background must be [white/transparent].

- **Text-heavy asset (logos, menus, infographics)**
  - Use `gemini-3-pro-image-preview`.
  - Template:
    > Create a [asset type] for [brand/concept] with the text "[exact text]".  
    > Use a [font description] style and [color scheme]. Layout should [layout constraints].

Adapt these to the user's domain (products, UIs, diagrams, etc.) and call the API with the refined prompt.

## Editing & multi-image workflows

Key patterns to remember:

- **Add/modify element in an image**
  - Include original image + text describing the change:
  - Example instruction:
    > Using the provided image of my cat, add a small knitted wizard hat on its head.  
    > Match the original lighting and make it look naturally placed.

- **Inpainting / semantic masking**
  - Ask to change only a specific region/object, keeping the rest unchanged:
    > Change only the blue sofa to a vintage brown leather chesterfield, keep everything else identical.

- **Style transfer**
  - Describe new style while preserving composition:
    > Transform this city-at-night photo into the style of a swirling oil painting with deep blues and bright yellows.

- **Multi-image composition**
  - Pass multiple images and a clear instruction:
    > Take the dress from the first image and put it on the person in the second image for an e-commerce photo.

When the user is unsure how to structure `contents`, default to:
- Single prompt string for **pure text-to-image**.
- Array of `{ text: ... }` and `{ inlineData: ... }` parts for **text+image**.

For **image understanding**:
- Put the **image parts first**, then the **text question** (this pattern is used throughout the docs).
- Use concise, direct questions like:
  - "Caption this image."
  - "List all objects you can see."
  - "What is different between these two images?"

## Grounding with Google Search (Gemini 3 Pro Image)

Use for images that must reflect **real-time facts** (weather, sports, markets, etc.).

JS pattern:

```js
const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents:
    "Visualize the current 5-day weather forecast for San Francisco as a clean, modern chart.",
  config: {
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: { aspectRatio: "16:9", imageSize: "2K" },
    tools: [{ googleSearch: {} }],
  },
});
```

If the user needs to inspect grounding metadata, mention `groundingMetadata.searchEntryPoint` and `groundingChunks` but avoid dumping large JSON by default.

## Object detection and segmentation (high level)

When the user asks for **bounding boxes** or **segmentation masks**:

- Use a multimodal text model such as `gemini-3-flash-preview`.
- Ask the model to output **JSON** with the structure you need.
- For bounding boxes, follow the docs:
  - Model returns `box_2d: [ymin, xmin, ymax, xmax]` normalized to \[0, 1000\].
  - Convert to absolute pixel coordinates using the original image width/height.
- For segmentation:
  - Ask for `box_2d`, `label`, and a base64 PNG `mask` cropped to the box.
  - Resize the mask to match the box and threshold (e.g. > 127) to get a binary mask.

Keep the prompt explicit, for example:

> Detect all prominent objects in this image and return JSON with fields  
> `label` and `box_2d = [ymin, xmin, ymax, xmax]` normalized to 0–1000.

Or for segmentation:

> Return a JSON list of segmentation masks with keys `label`, `box_2d`, and `mask`  
> where `mask` is a base64 PNG probability map inside the box.

## Agent workflow when this skill triggers

When the user asks for image generation or editing with Gemini:

1. **Clarify goal (briefly)**:
   - What is the **subject**, **style** (photo, illustration, 3D, etc.), and **aspect ratio / size**?
2. **Pick a model**:
   - Simple/fast → `gemini-2.5-flash-image`.
   - Text-heavy / hi-res / grounded / many references → `gemini-3-pro-image-preview`.
3. **Refine the prompt** using the patterns above; keep it one or two paragraphs.
4. **Provide code**:
   - Prefer JavaScript (@google/genai).
   - Offer REST or another language only if the user asks or repo context demands it.
5. **Mention constraints briefly**:
   - All outputs are watermarked with SynthID.
   - User must have the rights to any input images.
6. **Iterate**:
   - If the user wants changes, **keep previous prompt and code** structure, just adjust the text and any relevant config (aspect ratio, resolution, model).

When the user asks for **image understanding** with Gemini:

1. Identify the intent:
   - Captioning, classification, VQA, comparison, detection, segmentation.
2. Choose a multimodal text model such as `gemini-3-flash-preview`.
3. Decide input method:
   - Small, one-off → inline base64 (`inlineData`).
   - Large or reused → Files API (`files.upload` + `file_data` / URI part).
4. Structure `contents`:
   - Images first, then a concise text question or instruction.
5. For structured outputs (boxes, masks, labels), ask for **JSON** and keep the expected schema simple.

Keep answers focused on: refined prompt/question, minimal working code snippet, and any crucial config flags or model choices.
