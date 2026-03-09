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

## 5. Token Management 📊
*   **Gemini 1.5 Pro:** 2M tokens (Architecture-scale reasoning).
*   **Gemini 1.5 Flash:** 1M tokens (High-speed orchestration).
*   **Flash 8B:** Ultra-fast, low-cost for simple extraction tasks.

---

## 6. Implementation Checklist
1. [ ] Use **System Instructions** for deterministic roles.
2. [ ] Use **JSON Mode** for all data-driven nodes.
3. [ ] Implement **Context Caching** for the Universe Bible.
4. [ ] Utilize **Multimodal** inputs for visual consistency checks.
5. [ ] Define **Safety Thresholds** to avoid unintended generation blocks.

*Last Updated: ${new Date().toISOString()}*
