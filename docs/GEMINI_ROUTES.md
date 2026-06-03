# Google Gemini API & Server Routes Documentation

This reference guide maps out all backend server routes in **SANDBOX-AI-STUDIO** that are powered by the **Google Gemini API** (Google Generative AI/Vertex AI integration). Use this guide to prevent confusion, understand the request parameters, and quickly identify where visual generation and speech synthesis occur.

---

## 🚀 Overview of Gemini Server Models
The system uses the following Google Gemini models dynamically depending on the task:
*   🖼️ **`gemini-3.1-flash-image-preview`**: Premium Imagen 3 visual engine for multimodal storyboard layouts, carousel panels, and native brush mask inpainting.
*   🔊 **`gemini-3.1-flash-tts-preview`** / **`gemini-2.5-flash-preview-tts`**: Audio modality models for expressive high-fidelity speech synthesis.
*   🧠 **`gemini-2.0-flash`** / **`gemini-2.5-flash`**: Blazing fast language and multimodal analysis models for transcription, script writing, hook generations, and narrative design.

---

## 📂 Gemini Route Map

### 1. 🎨 Avatar Studio Boards
*   **Path**: `POST /api/avatar/generate-board`
*   **Code Location**: [server/routes/avatar.js](file:///c:/Users/TEJAL%20CHAVAN/Desktop/ai%20studio/SANDBOX-AI-STUDIO--main%20%281%29/SANDBOX-AI-STUDIO--main/server/routes/avatar.js)
*   **Credit Cost**: **2 credits** (when `model === 'banana'`)
*   **Google Engine**: `gemini-3.1-flash-image-preview` (Imagen 3)
*   **Request Schema**:
    ```json
    {
      "boardType": "CHARACTER | POSE | SHOT | LOCATION | OBJECT | CREATURE",
      "refImageUrl": "https://url.to/character-likeness.png",
      "wardrobeRefUrl": "https://url.to/outfit.png",
      "propRefUrl": "https://url.to/accessory.png",
      "additionalContext": "Optional lore guidelines",
      "userId": "uuid-string-here",
      "model": "banana",
      "aspectRatio": "9:16 | 16:9 | 1:1",
      "boardMeta": {
        "name": "Zara",
        "outfit": "Futuristic streetwear",
        "style": "Realistic | Ultra Realistic 3D | Anime"
      }
    }
    ```
*   **Visual Synthesis & Style Ingestion**: 
    All active reference images are fetched in parallel, base64-encoded, and unshifted as distinct `inlineData` parts in the multimodal `contents` array. Structured visual anchoring instructions are prepended to ensure perfect character, outfit, and prop styling continuity.
    
    Additionally, the selected **Render Style** dropdown (`Realistic`, `Ultra Realistic 3D`, `Anime`) is compiled in the prompt generator to dynamically swap out the standard style block with specialized rendering directives (e.g., cell-shaded Makoto Shinkai vectors for Anime, Unreal Engine 5 octane lighting for 3D, and natural cinematic photographic grain for Realistic).

---

### 2. 🖌️ Interactive Brush Inpainting / Edit
*   **Path**: `POST /api/edit-image`
*   **Code Location**: [server/routes/imageRoutes.js](file:///c:/Users/TEJAL%20CHAVAN/Desktop/ai%20studio/SANDBOX-AI-STUDIO--main%20%281%29/SANDBOX-AI-STUDIO--main/server/routes/imageRoutes.js)
*   **Credit Cost**: **2 credits** (when `model === 'gemini'`)
*   **Google Engine**: `gemini-3.1-flash-image-preview`
*   **Request Schema**:
    ```json
    {
      "imageBase64": "data:image/png;base64,...",
      "maskBase64": "data:image/png;base64,...",
      "prompt": "change background to neon cyberpunk street",
      "referenceImage": "https://url.to/style-reference.png",
      "userId": "uuid-string-here",
      "model": "gemini"
    }
    ```
*   **Visual Synthesis Behavior**:
    Submits three distinct `inlineData` parts (Base Image, Inpaint Mask, and Style Reference Image) in a single request. Gemini uses the mask to perform seamless, edge-blended generative infilling matching the style reference aesthetic.

---

### 3. 🎞️ Carousel Frame Sequencer
*   **Path**: `POST /api/carousel/generate`
*   **Code Location**: [server/routes/carouselRoutes.js](file:///c:/Users/TEJAL%20CHAVAN/Desktop/ai%20studio/SANDBOX-AI-STUDIO--main%20%281%29/SANDBOX-AI-STUDIO--main/server/routes/carouselRoutes.js)
*   **Credit Cost**: **2 credits** (uses Gemini by default)
*   **Google Engine**: `gemini-3.1-flash-image-preview`
*   **Request Schema**:
    ```json
    {
      "prompt": "A sequential timeline breaking down a historic battle",
      "aspectRatio": "16:9 | 9:16 | 1:1"
    }
    ```

---

### 4. 🧠 Creative Forge (AI Co-Writer)
*   **Code Location**: [server/routes/forgeRoutes.js](file:///c:/Users/TEJAL%20CHAVAN/Desktop/ai%20studio/SANDBOX-AI-STUDIO--main%20%281%29/SANDBOX-AI-STUDIO--main/server/routes/forgeRoutes.js)
*   **Key Endpoints**:
    *   `POST /api/forge/refine-narrative`: Refines user prompt overlays using Gemini (`gemini-1.5-flash-latest`).
    *   `POST /api/forge/suggest-dialogue`: Generates dynamic narrative script dialogue overlays (`gemini-1.5-flash-latest`).
    *   `POST /api/forge/research-context`: Performs contextual production analysis (`geminiService.researchProductionContext`).
    *   `POST /api/forge/thinker-sequence`: Generates creative storyboard scripts from raw ideas (`geminiService.generateThinkerSequence`).

---

### 5. 🛍️ User Generated Content (UGC) Studio
*   **Code Location**: [server/routes/ugcRoutes.js](file:///c:/Users/TEJAL%20CHAVAN/Desktop/ai%20studio/SANDBOX-AI-STUDIO--main%20%281%29/SANDBOX-AI-STUDIO--main/server/routes/ugcRoutes.js)
*   **Key Endpoints**:
    *   `POST /api/ugc/analyze`: Evaluates product-actor image synergy (`geminiService.analyzeUGCContext`).
    *   `POST /api/ugc/script`: Compiles premium ad-copy video scripts (`geminiService.generateUGCScript`).
    *   `POST /api/ugc/voice`: Synthesizes expressive ad voice-over scripts using audio modality text-to-speech (`gemini-3.1-flash-tts-preview`).
    *   `POST /api/ugc/transcribe`: Transcribes actor spoken dialogue into structured captions (`gemini-2.5-flash`).

---

## 🛠️ Global API Configuration Reference
The API endpoints utilize the unified helper configuration inside:
👉 [src/config/apiConfig.js](file:///c:/Users/TEJAL%20CHAVAN/Desktop/ai%20studio/SANDBOX-AI-STUDIO--main%20%281%29/SANDBOX-AI-STUDIO--main/src/config/apiConfig.js)

When adding or expanding React hooks, always wrap your endpoint resolution in the `getApiUrl()` wrapper:
```javascript
import { getApiUrl } from '../config/apiConfig';

const resp = await fetch(getApiUrl('/api/avatar/generate-board'), { ... });
```
This guarantees absolute compatibility regardless of whether the studio is running in local sandbox testing or deployed in a staging/production environment!
