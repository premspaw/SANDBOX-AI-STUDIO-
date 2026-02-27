# 🚀 Google API Implementation Guide (Pinned Reference)

This file contains the **Technical Blueprint** for integrating advanced Google Gemini 1.5 features into the **Lunar Flare** web application. Use this for building, debugging, and extending AI nodes.

---

## 1. Video Generation Implementation (Veo / I2V)
**Goal:** Convert scene descriptions and keyframes into high-end cinematic 9:16 video.

### 🛑 Implementation Rules:
*   **Polling Strategy:** Always use a `while` loop with a exponential backoff (2s -> 4s -> 8s) to check operation status.
*   **Prompt Mapping:** Append high-end camera logic (`ARRI Alexa`, `Shot on iPhone 15 Pro Max`) to every user segment for realism.
*   **Aspect Ratio:** Default to `9:16` for mobile-first UGC apps.

```javascript
// Backend (server.js) Implementation
const op = await ai.models.generateContent({
  model: "veo-1.1", // or latest stable
  contents: [{ role: 'user', parts: [{ text: "Director Prompt" }, { inlineData: image_data }] }]
});

// Front-end UI (VideoNode.jsx)
// Use <video autoPlay muted loop playsInline /> for max performance.
```

---

## 2. Multi-Modal Consistency (I2I/I2T)
**Goal:** Maintain character and product likeness across different scenes.

### 🛑 Implementation Rules:
*   **Reference Limit:** Never send more than 3 reference images (Anchor Identity, Product, Wardrobe).
*   **Compression:** Resize images to **1024px** max before sending to save bandwidth and stay within token limits.
*   **Identity Locking:** Use a hidden "Universe Bible" context injected into the system instruction.

```javascript
const systemInstruction = "Maintain strict facial and color consistency with the provided reference images.";
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction });
```

---

## 3. Context Caching (The Universe Bible)
**Goal:** Zero-latency access to world-building rules and character backgrounds.

### 🛑 Implementation Rules:
*   **Min Size:** 32,768 tokens (if your Bible is smaller, pad it with style guides).
*   **Lifecycle:** Re-cache every 1 hour if the user is active.
*   **Usage:** Link the `cachedContent` ID to every `generateContent` call to reduce cost by **10x**.

---

## 4. Controlled JSON Output (The State Engine)
**Goal:** Directly update the React Flow canvas state without parsing errors.

### 🛑 Implementation Rules:
*   **Schema Enforcement:** Use `response_mime_type: "application/json"`.
*   **Retry Logic:** If JSON parsing fails once, immediately retry with a "Fix this JSON" prompt.

```javascript
const generationConfig = {
  responseMimeType: "application/json",
  responseSchema: {
    type: "OBJECT",
    properties: {
      nodesToAdd: { type: "ARRAY", items: { type: "STRING" } },
      suggestedEdges: { type: "ARRAY" }
    }
  }
};
```

---

## 5. Deployment / Security (Supabase & Cloud)
**Goal:** Securely save and serve generated AI assets.

### 🛑 Implementation Rules:
*   **Naming:** Use `gen_timestamp_random.mp4` for unique bucket identities.
*   **Auto-Cleanup:** Ensure `server.js` maintains the 15-day retention policy for unpinned assets.
*   **Public URLs:** Use the GCS Public URL via the `storageService.js` for fast CDN delivery to the canvas.

---

### ✅ Developer Checklist for New Features:
1. [ ] Wrap every API call in a `try/catch`.
2. [ ] Map the `broadcastProgress` WebSocket task ID for UI loaders.
3. [ ] Use **Gemini-1.5-Flash** for UI/Logic and **Gemini-1.5-Pro** for Creative Writing.
4. [ ] Verify `allow_multiple` defaults in file edits for node data safety.

*Pinned Reference Version 1.1 - ${new Date().toLocaleDateString()}*
