---
name: video-generation
description: Generate cinematic videos, commercial video advertisements, and short-form video reels using Omni 1.1 Flash, Seedance 2.0, Seedance 2.5, and Seedance 2 Fast with strict Shorts credit budgeting and user confirmation.
---

# ZeroLens Video Generation Workflow

This skill governs all generative video creation workflows using the ZeroLens AI Studio engine suite.

---

## 1. Supported Video Engines

| Engine Key | Model Name | Primary Use Case | Resolution | Shorts Rate |
| :--- | :--- | :--- | :--- | :--- |
| `omni-flash-1.1` | **Omni 1.1 Flash** | Dynamic motion, physics simulation, sound effects / audio | 720p | **5 Shorts/sec** (6 Shorts/sec with audio) |
| `seedance-2.5` | **Seedance 2.5** | High-end cinematic fidelity, camera trajectories, multi-ref | 480p – 1080p | **8 Shorts/sec** (480p) / **10 Shorts/sec** (720p) |
| `seedance-2.0` | **Seedance 2.0** | Expressive characters, product commercial motion | 720p | **7 Shorts/sec** |
| `seedance-fast` | **Seedance 2 Fast** | Rapid generation, budget-friendly 720p | 720p | **5 Shorts/sec** |

---

## 2. Supported Aspect Ratios

- **`9:16` (Vertical)**: Short-form vertical feeds, stories, and mobile fullscreen ads.
- **`16:9` (Widescreen)**: Cinematic films, widescreen video platforms, website banners, and video commercials.
- **`1:1` (Square)**: Square feed posts and square display ads.

---

## 3. STRICT PRE-GENERATION CONFIRMATION PROTOCOL

> [!IMPORTANT]
> **RULE: NEVER invoke the video generation tool on your first response or without explicit user confirmation.**
> Whenever a user requests a video, ad, or cinematic scene, you **MUST FIRST conduct this pre-generation confirmation interview**.

### Step 1: Clarify and Gather Required Parameters
Check if the user has specified all 4 required parameters:
1. **Model Selection**: Recommend the best model for their use case:
   - For fast action, sound effects, or rapid turnaround: Recommend **Omni 1.1 Flash** or **Seedance 2 Fast**.
   - For cinematic scenes, dramatic lighting, and deep detail: Recommend **Seedance 2.5** or **Seedance 2.0**.
2. **Duration (in seconds)**:
   - Standard: `5s`, `8s`, or `10s` (default is 10s if unspecified).
3. **Aspect Ratio**:
   - `9:16` for mobile vertical, `16:9` for widescreen cinema, or `1:1` for square.
4. **Shorts Credits Cost Calculation**:
   - Compute total Shorts required:
     $$\text{Total Shorts} = \text{Duration (seconds)} \times \text{Rate per second}$$
   - Example 1: 10s on Seedance 2.5 (720p) = $10 \times 10 = 100\text{ Shorts}$.
   - Example 2: 10s on Omni 1.1 Flash = $10 \times 5 = 50\text{ Shorts}$ (or 60 with audio).
   - Example 3: 5s on Seedance 2 Fast = $5 \times 5 = 25\text{ Shorts}$.

### Step 2: Present the Confirmation Summary
Present a clear, structured preview to the user:
```markdown
🎬 **Proposed Video Generation Plan**:
- **Prompt**: "{Expanded cinematic prompt with lighting and camera motion}"
- **Engine**: {Selected Model, e.g., Seedance 2.5}
- **Aspect Ratio**: {Selected Ratio, e.g., 9:16 (Vertical)}
- **Duration**: {Duration in seconds, e.g., 10 seconds}
- **Resolution**: {e.g., 720p}
- **Cost**: **{Total Shorts} Shorts** ({Rate} Shorts/sec × {Duration}s)

👉 **Shall I generate this video for you now? (Yes/No)**
```

### Step 3: Wait for Explicit Confirmation
- **ONLY** call the `generate_video` or `cinema_generate_video` tool after the user explicitly replies **"Yes"**, **"Go ahead"**, or provides clear confirmation.
- If the user asks to change the model, duration, or ratio, recalculate the Shorts cost and present the updated confirmation prompt.

---

## 4. Post-Generation Display
When the video generation returns a completed URL:
1. Provide the direct video URL or embed the player:
   `[▶️ Watch & Download Video](VIDEO_URL)`
2. Report the generation status, request ID, and actual duration.
3. Suggest next iterations (e.g., extending duration, switching camera angle, or generating a matching marketing script).
