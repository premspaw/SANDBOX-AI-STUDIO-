---
name: zerolens-argon-video-editor
description: Autonomous short-form reel editing engine powered by Gemini 4 Argon (gemini-4-argon). Transforms raw talking-head videos into split-screen animated reels with frame-accurate jump cuts, purple-pill karaoke captions, procedural Web Audio SFX, and an appended visual summary finale.
---

# ZeroLens Argon 4 Autonomous Video Editor Skill

When asked to analyze a raw video, generate an edit timeline, or build/update the ZeroLens Edit Panel, strictly follow these rules:

## 1. Frame-Locked EDL & Jump-Cut Math Rules
- **1:1 Duration Invariant:** For every video segment where `layout !== "APPENDED_FULL_ANIMATION"`, the edited duration MUST strictly equal the raw duration:
  `(editEnd - editStart) === (rawEnd - rawStart)`
- **Contiguous Edit Timeline:** `segment[i].editStart` MUST equal `segment[i-1].editEnd` with zero gaps or overlaps.
- **Aggressive Stumble & Silence Trimming:** Inspect the raw audio and visual stream to cut out:
  - Initial throat clearing / settling before the hook (`0.0s` to first spoken word).
  - False starts, repeated words, stutters, and `"um" / "uh" / "okay"` filler pauses.
- **Appended Finale Segment:** Always append a `5.0s` to `6.0s` final segment with `layout: "APPENDED_FULL_ANIMATION"` where `rawStart === rawEnd` (video paused) to display a full-screen motion graphic cheat-sheet of the video's core takeaway.

## 2. Layout & Visual Pacing Rules (1080x1920 Vertical Canvas)
Alternate layouts across segments to maximize viewer retention:
- `TOP_BOTTOM_50`: Speaker centered in top `1080x960` (`dy` offset `+60px` for headroom), emerald divider (`#10b981`) at `y=956`, motion graphics in bottom `1080x960`.
- `SIDE_BY_SIDE_50`: Speaker in left `540x1920` for analogy/comparison segments, cyan divider (`#38bdf8`) at `x=536`, vertical card animation in right `540x1920`.
- `APPENDED_FULL_ANIMATION`: Full `1080x1920` dark cosmic canvas (`#020b07`) with radial horizon glow, rising particle bubbles, and bold summary typography.

## 3. Procedural Animation Templates (`scenes`)
Map each EDL segment to one of these 6 parametric templates:
1. `CONCEPT_HOOK`: Pop-in sun/icon badge + rounded white title card (`easeOutBack` spring).
2. `ANALOGY_CARD`: Side-by-side vertical glass card with oscillating center icon and pill badge.
3. `WHEEL_LIST`: Vertical scrolling 3-item kinetic list with active arrow indicator (`→`) and color-coded highlights.
4. `ORBIT_ENGINE`: Central process box with two counter-orbiting element nodes (`Math.cos(angle)`) and bottom status ticker.
5. `DUAL_CARDS`: Staggered left/right pop-in output cards (`p1` at `0.0s`, `p2` at `+3.0s`).
6. `COSMIC_FINALE`: Full-screen radial glow, rising particle loop, monospace tag, hero title, formula line, and serif result line.

## 4. Karaoke Caption Rules (`captions`)
- Group spoken words into 3 to 6 words per phrase (`2.0s`–`3.5s` per phrase).
- Render at `y=960` for `TOP_BOTTOM_50`, `y=1680` for `SIDE_BY_SIDE_50`, and `y=1420` for `APPENDED_FULL_ANIMATION`.
- Style: Dark translucent backing pill (`rgba(0,0,0,0.65)`), active word highlighted with a `#8b2cf5` purple pill, `52px Inter/Arial Black`, `12px` black stroke + white fill.

## 5. Procedural Web Audio API Sound Effects (`sfxEvents`)
Never rely on external MP3 URLs that can fail CORS. Trigger synthesized Web Audio SFX at every cut and animation pop:
- `WHOOSH`: Bandpass-filtered white noise sweep on every layout change or segment cut.
- `POP`: Short sine pitch-drop (`520Hz -> 140Hz` over `0.09s`) when cards or badges pop in with `easeOutBack`.
- `DING`: High harmonic bell (`1046.5Hz + 2093Hz` exponential decay) when each list item in `WHEEL_LIST` activates or output card appears.
- `RISER`: Upward frequency sweep (`180Hz -> 880Hz`) `0.6s` before entering `APPENDED_FULL_ANIMATION`.
- `SUCCESS_CHORD`: Warm C-major-9 synth triad (`261.6Hz, 329.6Hz, 392.0Hz, 587.3Hz`) at the start of `APPENDED_FULL_ANIMATION`.

## 6. Background Music Auto-Ducking
- Procedural or ambient Lo-Fi background audio automatically dips by -12dB (`gain = 0.25`) during spoken voice segments and swells to full volume (`gain = 0.85`) during the 6-second finale.
