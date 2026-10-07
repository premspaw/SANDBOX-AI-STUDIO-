---
name: cinema-studio
description: Direct and craft cinematic movie scenes, camera movements, dramatic lighting, and multi-shot director sequences using Seedance 2.5, Seedance 2.0, and Omni 1.1 Flash.
---

# Cinema Studio Workflow

This skill guides the assistant in authoring cinematic film prompts, camera choreographies, and director sequences for film directors, VFX creators, and video artists.

---

## 1. Cinematic Camera Motion Dictionary

When crafting prompts for `cinema_generate_video` or `generate_video`, always specify intentional camera movement:

- **FPV Drone / Aerial Sweep**: *"Fast-moving dynamic FPV drone dive soaring through mountain fog, low-altitude flyover."*
- **Dolly Zoom (Vertigo Effect)**: *"Camera dollies backwards while lens zooms in, warping background perspective around the actor's face."*
- **360° Orbit / Arc Shot**: *"Smooth 360-degree orbital camera circling the hero subject standing amidst sparks."*
- **Tracking / Follow Shot**: *"Low-angle steadicam tracking shot following the footsteps of a warrior across rain-slicked neon asphalt."*
- **Push-in / Slow Zoom**: *"Slow, intense push-in camera toward the character's eyes, revealing subtle facial tension."*
- **Crane / Jib Shot**: *"High-angle crane shot rising gracefully from a street-level puddle to reveal an illuminated cyberpunk skyline."*

---

## 2. Cinematic Lighting & Visual Atmosphere Presets

1. **Anamorphic Sci-Fi / Cyberpunk**:
   - 2.39:1 widescreen scope, horizontal blue streak anamorphic lens flares, cyan and magenta neon reflections on wet streets.
2. **Golden Hour / Warm Naturalism**:
   - Soft 35mm film grain, warm 3200K rim lighting, gentle sun flare leaking into the lens edge, shallow depth of field (f/1.4).
3. **Rembrandt / Dramatic Chiaroscuro**:
   - High-contrast directional key light, characteristic triangle of light on the shadow cheek, deep shadows, moody noir tension.
4. **Volumetric Fog / Atmospheric Depth**:
   - God rays cutting through heavy smoke, particulate dust floating in light beams, atmospheric haze separating foreground from background.

---

## 3. Recommended Cinematic Aspect Ratios

- **`16:9` (1.78:1 Standard Cinema)**: Best all-around for film festivals, video showcases, and widescreen displays.
- **`9:16` (Vertical Mobile Cinema)**: Ideal for mobile narratives and vertical video formats.
- **`1:1` (Square)**: Stylized arthouse compositions.

---

## 4. Pre-Generation Confirmation Protocol

Before rendering cinematic video clips:
1. Outline the visual scene, lighting style, and camera trajectory.
2. Suggest the optimal engine:
   - **Seedance 2.5**: Industry-leading cinematic coherence & realistic textures (8-10 Shorts/sec).
   - **Seedance 2.0**: Expressive character drama and action (7 Shorts/sec).
   - **Omni 1.1 Flash**: Physical dynamics and synchronized ambient audio (5-6 Shorts/sec).
3. Confirm duration (e.g. 5s, 8s, 10s), ratio, and calculate the total Shorts cost.
4. Obtain user confirmation before calling the generation tool.
