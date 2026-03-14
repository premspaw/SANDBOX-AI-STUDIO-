# Veo 3.1 Prompting Guide
> Source: https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1

## Core Formula

```
[Cinematography] + [Subject] + [Action] + [Context] + [Style & Ambiance]
```

**Example:**
> Medium shot, a tired corporate worker, rubbing his temples in exhaustion, in front of a bulky 1980s computer in a cluttered office late at night. The scene is lit by harsh fluorescent overhead lights and the green glow of a monochrome monitor. Retro aesthetic, shot as if on 1980s color film, slightly grainy.

---

## Model Capabilities

| Feature | Details |
|---|---|
| Resolution | 720p or 1080p |
| Aspect ratio | 16:9 or 9:16 |
| Clip length | 4, 6, or 8 seconds |
| Audio | Dialogue, SFX, ambient noise (all generated) |
| I2V | Animate a source image with prompt adherence |
| First & Last Frame | Generate transitions between 2 provided images |
| Ingredients to Video | Multi-character consistency with reference images |

---

## Camera & Cinematography

**Movement (Selection → Narrative):**
| UI Label | Narrative Output |
|---|---|
| Static Shot | `static, locked-off framing` |
| Pan Left/Right | `Camera rotates to the left/right` |
| Dolly In/Out | `Camera moves toward/away from subject` |
| 180° Arc Left | `The camera performs a smooth 180-degree arc shot to the left` |
| 180° Arc Right | `The camera performs a smooth 180-degree arc shot to the right` |
| Handheld | `Organic, subtle shake` |
| Drone Rise/Fall | `Camera ascends/descends vertically` |

**Composition:**
- Wide shot, close-up, extreme close-up, low angle, two-shot

**Lens & Focus:**
- Shallow depth of field, wide-angle lens, soft focus, macro lens, deep focus

---

## Audio Direction

```
Dialogue: A woman says, "We have to leave now."
SFX: Thunder cracks in the distance.
Ambient noise: The quiet hum of a starship bridge.
Music: A swelling, gentle orchestral score.
```

---

## Speed / Pacing (Speed Ramp → Narrative)

| UI Value | Veo Narrative |
|---|---|
| Cinematic | `with a smooth, cinematic tempo` |
| Slow Motion | `in dramatic slow motion` |
| Fast Cut | `with intense fast-cut pacing` |
| Time Lapse | `as a sweeping time-lapse` |
| Hyperlapse | `as a dynamic hyperlapse` |
| Ramp Up | `starting slow then ramping to full speed` |
| Ramp Down | `starting at speed then gracefully decelerating` |

---

## Emotion Tag

```
Emotion: Wonder and reverence.
```
> Only include if non-neutral. Veo 3.1 responds to this tag natively.

---

## Timestamp Multi-Shot Prompting

For multi-shot sequences within a single generation:

```
[00:00-00:02] Medium shot from behind a young explorer as she pushes aside a jungle vine.
[00:02-00:04] Reverse shot of her face filled with awe, ancient ruins in the background. SFX: The rustle of dense leaves.
[00:04-00:06] Tracking shot as she runs her hand over carvings on a crumbling stone wall. Emotion: Wonder.
[00:06-00:08] Wide crane shot revealing the vast temple complex half-swallowed by jungle. SFX: Swelling orchestral score.
```

---

## buildVideoPrompt() Implementation

Located in `src/components/panels/PromptGenerator.jsx`.

**Assembly order:**
1. `cameraClause` — movement + shot angle
2. `subject` + `actionClause` + `contextClause`
3. `styleNarrative` + `lightingNarrative` + `speedNarrative`
4. Camera flavor (e.g., `Recorded on ARRI ALEXA...`)
5. `emotion` (skipped if Neutral)
6. `audioLines[]` — dialogue, SFX, ambient, music
7. `frameClause` — first frame / last frame references
8. `timestampBlock` — multi-shot `[00:00-00:02]` notation

**Negative prompts:**
> Describe what to exclude descriptively: `"a desolate landscape with no buildings or roads"` instead of `"no man-made structures"`.

---

## The 3 Types of Veo 3.1 Generations

### 1. Image-to-Video (I2V)
Animate a single source image using a text prompt.
*   **Input:** `selections.firstFrame || selections.referenceImage`
*   **REST Location:** `instances[0].image` (as `inlineData` object)

### 2. Reference Images (Subject Consistency)
Preserve a person, character, or product's appearance using up to 3 reference images.
*   **Input:** `selections.identity_images` (sliced to 3)
*   **REST Location:** `instances[0].referenceImages[]` with `referenceType: "asset"`

### 3. First & Last Frame (Interpolation / Transitions)
Create seamless transitions between two specific images.
*   **Input:** `selections.firstFrame` (Start) and `selections.lastFrame` (End)
*   **REST Location:** 
    *   **Start Frame:** `instances[0].image`
    *   **End Frame:** `instances[0].lastFrame` (sibling to Start Frame)

---

## Technical Assembly Rules (server.js)
1.  **Format:** Use **camelCase** for `lastFrame` and `referenceImages`.
2.  **Container:** All images go in the **`instances`** block, not `parameters`.
3.  **Data Type:** All images must use the **`inlineData`** structure:
    ```json
    { "inlineData": { "mimeType": "image/png", "data": "BASE64..." } }
    ```
4.  **Duration & Ratio:** Stored in the `parameters` block.

---

## capturing Frames in UI
- In the **Video Tab**, use the **▷ First** and **▷ Last** buttons on any generated asset to pin it to the Start/End slots. 
- The system automatically detects these slots and switches to **Interpolation Mode**.

*Last Updated for Gemini 2.0 / Veo 3.1 Integration — 2026-03-11*
