very detail is now locked in. I have finalized the UI refinements to ensure a smooth, professional production experience.

✅ Final Implementation Summary:
Integrated Interaction: The Image and Video controls are now seamlessly integrated. The @ Refs button is positioned right next to your prompt labels for instant access.
Upward Selection Menu: The character selection menu now opens upward precisely above the input area. This ensures it never overlaps with the "Generate" button or gets cut off by the screen edges.
Shadow & Glow Depth: The floating character menu features a high-contrast lime border and deep shadows, making it stand out as a premium overlay.
Rock-Solid Layout: I have eliminated all "jumping" issues. The overall studio layout remains perfectly static while the selection menu floats above it.
Context-Aware Alignment: In Video Mode, the tagger automatically shifts horizontally to align with the Subject, Action, or Context box you are currently typing in.
The tagging system is now high-speed, stable, and "locked" as per your request. Ready for production!

TIP

Use @ anytime in the Subject, Action, or Context boxes to pull up your reference board characters instantly.

javascript
// Stabilized UI State
"shrink-0 surface-glass ... transition-shadow" 
"overflow-y-visible" // Popup stays on top
"bottom-full mb-3" // Always open
---

## 🚀 1. Core Vision: The AI Creator Ecosystem
The web app is designed as an end-to-end cinematic workshop. It moves from **Identity Synthesis** (creating consistent characters) to **Asset Orchestration** (managing media) to **Director's Execution** (visual node-based production).

---

## 🧬 2. Component Blueprint

### 💎 A. Influencer Studio (Identity Protocol)
*   **Purpose**: This is where you create the "Soul" of your production.
*   **The Identity Kit**: Instead of generating random faces, the studio generates a consistent "Identity Kit" (Anchor, Profile, Macro, Expression, Half-Body, Full-Body).
*   **Storage Flow**: Images are proxied through the server, uploaded to Supabase Storage, and indexed in the `characters` database table for persistence.
*   **Visual Consistency**: Uses Gemini and Replicate (Flux/LoRA) to ensure that the character remains the same across different scenes.

### 🏛️ B. Creative Vault (Assets Library)
*   **Purpose**: Secure, neural asset management.
*   **Optimization**: Uses a high-performance database indexing system. Instead of scanning folders (slow), it reads a dedicated `assets` table for instant loading.
*   **Functionality**:
    *   **Neural Anchors**: You can select any asset and set it as an "Anchor" for a new character.
    *   **Organization**: Categorizes characters, generated images, and uploaded videos into a unified high-tech interface.
    *   **Synchronization**: Designed to support real-time Cloud/Drive syncing.

### 🎨 C. Director's Cut (The Canvas Studio)
*   **Purpose**: A Node-Based visual orchestration tool for building scenes.
*   **How it Works**: Uses **React Flow** to handle logic as nodes.
    *   **Identity Nodes**: Bring in your character from the library.
    *   **Dialogue Nodes**: Map scripts to character voices.
    *   **Visual Nodes**: Define aspect ratios (16:9, 9:16), styles (Cinematic, Anime, Realistic), and lighting.
*   **The "Brain"**: Connecting nodes creates a dependency graph. If you change a character at the root, all connected scenes update their identity anchor automatically.

---

## 🛠️ 3. Technical Data Flow

1.  **Creation Phase**: User uploads/generates a character in `InfluencerStudio.jsx`.
2.  **Persistence Phase**: The `server.js` proxies the image into Supabase. It strips heavy base64 data to keep the database lean.
3.  **Retrieval Phase**: `AssetsLibrary.jsx` fetches the character list from the database. It uses a "Paranoid Mapper" to find images even if they were moved between metadata and columns.
4.  **Production Phase**: User enters `PlaygroundCanvas.jsx` (Director's Cut). They drag their character into the flow. The app uses **Zustand** for global state management to share the character data across all production nodes.

---

## 🔒 4. Future Roadmap
*   **UGC Video Pipeline**: Seamlessly converting static character portraits into talking-head UGC videos using AI Lip-sync.
*   **Multi-Track Audio**: Synchronizing dialogue, SFX, and ambient music directly on the Director's Canvas.
*   **Cloud Sync 2.0**: Deeper integration with Google Drive for enterprise-grade asset safety.
