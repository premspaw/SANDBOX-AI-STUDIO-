# Gemini API Mastery Cookbook 📘 (Gemini 3.1 & Veo 3.1 Era)

This document serves as the "Master Lock" for Google Gemini, Imagen 3, and Veo 3.1 API features, patterns, and production implementations. Use this as the definitive reference for all generative AI orchestration, multimodal video reasoning, and visual generation in the project.

---

## 1. Multimodal Core & Generation 🌈

Gemini models are natively multimodal. They process text, high-resolution images, audio streams, and continuous video files within a single unified context window.

### 📸 Multimodal Image Reasoning (I2T)
Send multiple images together to check stylistic consistency, compare design elements, or analyze character likeness.
```javascript
// Pattern: Multi-Image Reference & Analysis
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash',
  contents: [
    "Analyze these two reference boards. Identify if the character outfit, hair color, and background lighting continuity match perfectly:",
    { inlineData: { data: base64Frame1, mimeType: 'image/png' } },
    { inlineData: { data: base64Frame2, mimeType: 'image/png' } }
  ]
});
console.log(response.text);
```

### 🎬 Video & Continuity Reasoning (V2T)
*   **Context Window:** Up to 2 million tokens (equivalent to ~1 hour of high-definition video or whole codebases).
*   **Strategy:** Pass the video uri from the File API for deep temporal/cinematographic analysis.
```javascript
const response = await ai.models.generateContent({
  model: 'gemini-3.1-pro',
  contents: [
    { fileData: { fileUri: uploadedVideoUri, mimeType: 'video/mp4' } },
    "Analyze the motion vector of this shot. Write a matching camera prompt that dollys out at the same velocity."
  ]
});
```

---

## 2. Advanced Orchestration 🏗️

### 👑 System Instructions (Persona Locking)
Always define the AI agent's role and rules in the `systemInstruction` configuration parameters, rather than mixing it within the user prompt.
```javascript
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash',
  config: {
    systemInstruction: "You are the project's Master Cinematographer. All scene descriptions must incorporate lens selections (e.g. 35mm, anamorphic), exact lighting setups (e.g. warm key, cool rim), and speed ramp metrics."
  },
  contents: "Write a high-end shot prompt for a neon cyberpunk street chase."
});
```

### ⚡ Context Caching (Cost & Latency Optimization)
Use for static, large datasets (e.g., a "Character Likeness Profile", "Universe Art Style Bible", or "UGC Script templates").
*   **Min Requirement:** 32,768 tokens.
*   **TTL:** Standard 1 hour (auto-renewable).
```javascript
// Build a context cache for rapid, cheap sub-second prompts
const cache = await ai.caches.create({
  model: 'gemini-3.1-flash',
  config: {
    displayName: 'Universe_Art_Style_Bible',
    ttl: '3600s', // 1 hour
    contents: [
      { role: 'user', parts: [{ text: LORE_AND_STYLE_BIBLE_STRING }] }
    ]
  }
});
```

---

## 3. High-Quality Visual Engines 🎨

The visual pipeline leverages Google's latest production models for image and video generation.

### 🖼️ Image Generation (Imagen 3)
*   **Model ID:** `gemini-3.1-flash-image-preview`
*   **Features:** Photorealistic detailing, superior prompt adherence, advanced text rendering inside panels, and native multi-aspect ratio composition support.
```javascript
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash-image-preview',
  contents: [
    "A professional editorial reference sheet titled 'SHOT BOARD'. Sequential 12-shot storyboard layout. Cinematic color grading."
  ],
  config: {
    responseModalities: ["IMAGE"],
    imageConfig: {
      aspectRatio: "16:9" // Options: '1:1', '16:9', '9:16'
    }
  }
});
```

### 📹 Video Generation (Veo 3.1)
*   **Models:** `veo-3.1-generate-preview` (high fidelity) and `veo-3.1-fast-generate-preview` (instant preview).
*   **Features:** First/Last frame conditioning (Image-to-Video), dynamic camera curves, and high-fidelity physics simulator.
```javascript
const operation = await ai.models.generateVideos({
  model: 'veo-3.1-generate-preview',
  prompt: 'A sweeping cinematic slow motion pan across a futuristic cityscape',
  config: {
    numberOfVideos: 1,
    resolution: '1080p',
    aspectRatio: '16:9',
    durationSeconds: 5,
    // Provide first frame buffer for Likeness Continuity (I2V)
    firstFrame: { imageBytes: base64Frame, mimeType: 'image/jpeg' }
  }
});
```

---

## 4. Tool Use & Connected Agents 🛠️

### 🔍 Search Grounding (Live Google Search)
Connect your prompts directly to live Google Search indices to ground generation in modern trends, active names, or real-time topics.
```javascript
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash',
  config: {
    // Enable live Google search grounding
    tools: [{ googleSearch: {} }]
  },
  contents: "What are the trending cyberpunk streetwear colors and jacket styles for this season?"
});

// Access search metadata sources & citations
console.log(response.candidates[0].groundingMetadata);
```

### 💻 Dynamic Code Execution (Python Sandbox)
Let Gemini write and run local Python code internally to calculate precise geometry, perform advanced data formatting, or calculate camera vector curves before returning a response.
```javascript
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash',
  config: {
    tools: [{ codeExecution: {} }]
  },
  contents: "Generate a timeline list of 24 frames at 24fps with camera keyframes moving along a bezier curve."
});
```

---

## 5. Controlled Formatting & Safety 🔒

### 📋 Strict Structured JSON Output
Enforce strict schema validation on AI outputs. This prevents parsing errors during UI flow updates.
```javascript
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash',
  config: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: {
        headline: { type: "STRING" },
        subtext: { type: "STRING" },
        cta: { type: "STRING" },
        brandPaletteColors: {
          type: "ARRAY",
          items: { type: "STRING" }
        }
      },
      required: ["headline", "subtext", "cta", "brandPaletteColors"]
    }
  },
  contents: "Write poster copy for a new retro sports watch."
});

const result = JSON.parse(response.text);
```

### 🛡️ Safety Configurations
Fine-tune threshold levels to ensure complex creative prompts (like cinematic battle staging or dramatic action shots) are never blocked by false positives.
```javascript
const safetySettings = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
];
```

---

## 6. Current Model Reference (Gemini 3.1 Era) 🤖

### 💬 Text, Vision & Reasoning
| Model ID | Context Limit | Target Use Case |
|---|---|---|
| `gemini-3.1-pro` | 2,000,000 | Architect-level reasoning, long video analysis, continuity audits. |
| `gemini-3.1-flash` | 1,000,000 | Blazing fast default, structured JSON generator, live grounding. |
| `gemini-3.0-flash` | 1,000,000 | Legacy flash engine. |

### 🎨 Visual & Motion Generation
| Model ID | Modality | Best Use Case |
|---|---|---|
| `gemini-3.1-flash-image-preview` | Image | High-fidelity multi-panel storyboards, reference boards, characters. |
| `veo-3.1-generate-preview` | Video | High-end cinematic Image-to-Video previews (5s to 10s). |
| `veo-3.1-fast-generate-preview` | Video | Fast-draft video simulations. |

### ⚠️ Deprecated Models (Avoid in Production)
*   ~~`gemini-1.5-pro`~~ $\rightarrow$ Upgrade to `gemini-3.1-pro`
*   ~~`gemini-1.5-flash`~~ $\rightarrow$ Upgrade to `gemini-3.1-flash`
*   ~~`gemini-2.5-flash-image`~~ $\rightarrow$ Upgrade to `gemini-3.1-flash-image-preview`

---

## 7. Implementation Checklist
* [x] Enforce persona configurations using **System Instructions**.
* [x] Set `responseMimeType: "application/json"` with strict `responseSchema` for structural UI nodes.
* [x] Ground trend-based visual generation using **Google Search Grounding**.
* [x] Harness **Context Caching** for static assets over 32k tokens to reduce billing costs by up to 80%.
* [x] Use `gemini-3.1-flash-image-preview` for high-quality standard image generations.

*Last Updated: May 2026 — Gemini 3.1 & Veo 3.1 Production Specs*
