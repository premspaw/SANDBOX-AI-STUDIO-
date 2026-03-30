---
name: Veo 3 Advanced Prompting
description: Expert guide for Veo 3 specific features: Colors, Atmospheres, Temporal elements, Audio, and Negative prompting.
---

# Veo 3 Advanced Prompting Guide

This guide covers the specialized prompting parameters and techniques for the Veo 3 model family in SANDBOX-AI-STUDIO.

## 1. Emotional & Atmospheric Tone

### Tone or Mood
Describe the overall feeling of the video:
- **Happy/Joyful**: Bright, vibrant, cheerful, uplifting, whimsical.
- **Sad/Melancholy**: Somber, muted colors, slow pace, poignant, wistful.
- **Suspenseful/Tense**: Dark, shadowy, quick cuts, sense of unease.
- **Peaceful/Serene**: Calm, tranquil, soft, gentle, meditative.
- **Epic/Grandiose**: Sweeping, majestic, dramatic, awe-inspiring.
- **Futuristic/Sci-fi**: Sleek, metallic, neon, technological, dystopian/utopian.
- **Vintage/Retro**: Sepia tone, grainy film, specific era aesthetics (e.g., "1950s Americana").
- **Romantic**: Soft focus, warm colors, intimate.
- **Horror**: Dark, unsettling, eerie, gory.

## 2. Visual Aesthetics

### Color Palettes
Use these to define the overall color grade and mood:
- "monochromatic black and white"
- "vibrant and saturated tropical colors"
- "muted earthy tones"
- "cool blue and silver futuristic palette"
- "warm autumnal oranges and browns"

### Atmospheric Effects
Enhance the environment with these keywords:
- "thick fog rolling across a moor"
- "swirling desert sands"
- "gentle falling snow creating a soft blanket"
- "heat haze shimmering above asphalt"
- "magical glowing particles in the air"
- "subsurface scattering on a translucent object"

### Pro Lighting
- **Natural Light**: "soft morning sunlight streaming through a window," "overcast daylight", "moonlight"
- **Artificial Light**: "warm glow of a fireplace", "flickering candlelight," "harsh fluorescent office lighting", "pulsating neon signs"
- **Cinematic Lighting**: "rembrandt lighting on a portrait", "film noir style with deep shadows and stark highlights", "high-key lighting", "low-key lighting"
- **Specific Effects**: "volumetric lighting", "backlighting silhouette", "golden hour glow", "dramatic side lighting"

### Textural Qualities
Define how surfaces interact with light:
- "rough-hewn stone walls"
- "smooth, polished chrome surfaces"
- "soft, velvety fabric"
- "dewdrops clinging to a spiderweb"

### Lens & Optics
- **Wide-angle lens**: Captures a broader field of view, exaggerates perspective.
- **Telephoto lens**: Narrows FOV, compresses perspective, creates shallow depth of field.
- **Shallow depth of field**: Narrow plane of focus with beautiful 'bokeh'.
- **Deep depth of field**: Keeps everything from foreground to background sharp.
- **Lens flare**: Dramatic streaks or circles of light when striking the lens.
- **Rack focus**: Shifting focus from one subject to another in a continuous shot.
- **Fisheye lens**: Extreme barrel distortion for wide panoramic views.
- **Vertigo effect (dolly zoom)**: Disorienting effect where background zooms while subject stays same size.

## 3. Temporal Elements
Control the flow of time and rhythm:
- **Pacing**: "slow-motion", "fast-paced action", "time-lapse"
- **Evolution**: "a flower bud slowly unfurling", "dawn breaking, the sky gradually lightening"
- **Rhythm**: "pulsating light", "rhythmic movement"

## 3. Audio Direction
Guide the auditory experience (Supported by `veo-3.0-generate-001` in Preview):
- **Sound Effects**: "the sound of a phone ringing", "water splashing", "soft house sounds"
- **Ambient Noise**: "sounds of city traffic", "waves crashing", "quiet hum of an office"
- **Dialogue**: `"the man says: Where is the rabbit?"`, `"two people discuss a movie"`

## 4. Cinematic & Editing
- **Terms**: "match cut", "jump cut", "establishing shot sequence", "montage", "split diopter effect"
- **Technique Example (Jump Cut)**: "A person sitting in the same position but wearing different outfits, with sharp jump cuts between each outfit change."

## 5. Negative Prompting
Specify what NOT to include. Describe the objects/concepts directly rather than using "no" or "don't".
- **Recommended**: "urban background, man-made structures, dark, stormy, or threatening atmosphere"
- **Effect**: Removes unwanted elements from the scene without confusing the model's spatial logic.
