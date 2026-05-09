# Gemini API Mastery Cookbook 📘

This document serves as the "Master Lock" for Google Gemini API features, patterns, and implementations based on the official Gemini Cookbook. Use this as a reference for all AI orchestration in the Lunar Flare project.

---

## 1. Multimodal Core 🌈
Gemini is natively multimodal. Never treat inputs as separate entities.

### Image Understanding (I2T)
```javascript
// Pattern: Multi-Image Reference
const result = await model.generateContent([
  "Analyze these two frames for stylistic consistency:",
  { inlineData: { data: base64_1, mimeType: 'image/png' } },
  { inlineData: { data: base64_2, mimeType: 'image/png' } }
]);
```

### Video Reasoning (V2T)
*   **Capacity:** Up to 1 hour of video or 1M+ tokens.
*   **Strategy:** Provide the video file and ask for temporal reasoning (timestamps).
```javascript
const prompt = "Find the exact moment the product appears and describe the lighting.";
// Pass fileUri from File API
```

---

## 2. Advanced Orchestration 🏗️

### System Instructions (Persona Locking)
Always define the persona in the `systemInstruction` field, not the user prompt.
```javascript
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
  systemInstruction: "You are an expert UGC Cinematographer. Your outputs must include camera metadata (lens, lighting, ISO)."
});
```

### Context Caching (Cost & Latency Optimization)
Use for static, large datasets (e.g., the "Universe Bible").
*   **Min Requirement:** 32,768 tokens.
*   **TTL:** Default 1 hour (adjustable).
```javascript
// Create cache via REST/SDK
const cache = await googleAI.caching.create({
  model: "models/gemini-1.5-pro-002",
  ttlSeconds: 3600,
  contents: [{ role: 'user', parts: [{ text: LARGE_CONTEXT_BIBLE }] }]
});
```

---

## 3. Tool Use & Agents 🛠️

### Function Calling
Allow Gemini to interact with your local systems (e.g., Supabase, File System).
```javascript
const tools = [{
  functionDeclarations: [{
    name: "queryVault",
    description: "Search the local Supabase asset library for video clips",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "string" },
        tags: { type: "array", items: { type: "string" } }
      }
    }
  }]
}];
```

### Code Execution
Gemini can generate and execute Python code internally to solve math or process data.
```javascript
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
  tools: [{ codeExecution: {} }]
});
```

---

## 4. Safety & Formatting 🔒

### Controlled Output (JSON Mode)
Strictly enforce JSON responses for node updates.
```javascript
const generationConfig = {
  responseMimeType: "application/json",
  responseSchema: {
    type: "OBJECT",
    properties: {
      scene_description: { type: "string" },
      camera_angle: { type: "string" }
    }
  }
};
```

### Safety Settings
Adjust thresholds for creative freedom in cinematography.
```javascript
const safetySettings = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" }
];
```

---

## 5. Current Model Reference (2025/2026) 🤖

### Text / Multimodal (generateContent)
| Model ID | Use Case |
|---|---|
| `gemini-2.5-pro` | Best reasoning, complex tasks, 1M ctx |
| `gemini-2.5-flash` | Fast + smart, best cost/perf balance |
| `gemini-2.0-flash` | Stable, fast, multimodal default |
| `gemini-2.0-flash-lite` | Cheapest, simple tasks |

### Image Generation (generateContent with image output)
| Model ID | Use Case |
|---|---|
| `gemini-2.0-flash-exp-image-generation` | Image gen via generateContent |
| `imagen-3.0-generate-002` | Best image quality (Vertex AI only) |

### Video Generation (Veo)
| Model ID | Use Case |
|---|---|
| `veo-2.0-generate-001` | Text/image to video (Vertex AI) |
| `veo-3.0-generate-preview` | Latest Veo 3 preview |

### ⚠️ Deprecated — Do NOT use
- ~~`gemini-1.5-pro`~~ → use `gemini-2.5-pro`
- ~~`gemini-1.5-flash`~~ → use `gemini-2.5-flash`
- ~~`gemini-2.0-flash-exp`~~ → use `gemini-2.0-flash`
- ~~`gemini-1.5-flash-latest`~~ → use `gemini-2.0-flash`

## 6. Token Management 📊
*   **Gemini 2.5 Pro:** 1M tokens (Architecture-scale reasoning).
*   **Gemini 2.5 Flash:** 1M tokens (High-speed orchestration).
*   **Gemini 2.0 Flash Lite:** Ultra-fast, low-cost for simple extraction tasks.

---

## 7. Implementation Checklist
1. [ ] Use **System Instructions** for deterministic roles.
2. [ ] Use **JSON Mode** for all data-driven nodes.
3. [ ] Implement **Context Caching** for the Universe Bible.
4. [ ] Utilize **Multimodal** inputs for visual consistency checks.
5. [ ] Define **Safety Thresholds** to avoid unintended generation blocks.

*Last Updated: May 2026 — Gemini 2.5 era*
