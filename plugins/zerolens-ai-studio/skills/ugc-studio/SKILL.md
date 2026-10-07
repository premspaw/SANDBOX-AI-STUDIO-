---
name: ugc-studio
description: Plan, script, and generate User-Generated Content (UGC) video advertisements, product demonstrations, customer review scripts, and creative hooks using ZeroLens AI Studio.
---

# UGC (User Generated Content) Studio Workflow

This skill equips the assistant with ZeroLens's performance UGC video ad creation framework for e-commerce, direct-to-consumer brands, and social media channels.

---

## 1. Proven UGC Ad Framework (15s – 60s)

Every effective UGC video ad follows this 5-stage architecture:

```
[0s - 3s: Engaging Hook] → [3s - 7s: Problem/Agitation] → [7s - 15s: Solution & Demo] → [15s - 25s: Social Proof] → [End: Clear CTA]
```

1. **The Hook (0–3s)**:
   - Visual pattern-interrupt: Fast motion, surprising demonstration, unboxing reveal, or expressive reaction.
   - Verbal hook: *"Stop scrolling if your skin does this..."*, *"I tested this {product} so you don't have to..."*
2. **The Problem / Pain Point (3–7s)**:
   - Identify the user's struggle in relatable, everyday language.
3. **The Solution & Product Reveal (7–15s)**:
   - Hero shot of the product in hands or in real-world application.
   - Highlight 1-2 core benefits, not just features.
4. **Social Proof & Results (15–20s)**:
   - Texture shot, before-and-after, or authentic customer reaction.
5. **Call To Action (CTA)**:
   - Clear direction: *"Tap the link below to get 20% off before it sells out!"*

---

## 2. UGC Creation Tools & Workflows

### A. Creative Hook Generator (`ugc_generate_hook_variations`)
- Generates 5 distinct angles for any product:
  1. *Curiosity Hook* (*"Nobody is talking about this simple routine..."*)
  2. *Relatable Struggle Hook* (*"If you also find it hard to maintain..."*)
  3. *Direct Demonstration Hook* (*"Watch what happens when I put this to the test..."*)
  4. *Customer Experience Hook* (*"Here is why everyone has been talking about this..."*)
  5. *Warning Hook* (*"Don't make this mistake before trying..."*)

### B. Performance Scriptwriting (`ugc_generate_ad_script`)
- Automatically outputs line-by-line spoken dialogue + on-screen visual directives for each timestamp.

### C. Video Synthesis (Omni 1.1 Flash / Seedance 2.5 / Seedance 2 Fast)
When moving from script to video generation:
- **Default Aspect Ratio**: `9:16` (Vertical Fullscreen).
- **Engine Recommendation**:
  - `omni-flash-1.1` (5 Shorts/sec) for natural movements and speech effects.
  - `seedance-2.5` (8-10 Shorts/sec) for product close-up fidelity and realistic materials.
  - `seedance-fast` (5 Shorts/sec) for rapid storyboard mockups.

---

## 3. Mandatory UGC Pre-Generation Confirmation

Before generating any UGC scene video, ask:
1. **Engine to Use**: Omni 1.1 Flash, Seedance 2.5, or Seedance Fast.
2. **Duration**: 5s, 8s, or 10s per clip.
3. **Aspect Ratio**: 9:16 (default for vertical mobile video).
4. **Shorts Cost**: Duration × Rate.
Confirm with the user before calling the generation tool.
