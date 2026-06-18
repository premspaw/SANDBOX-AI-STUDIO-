// ─── SHOT BLUEPRINTS & SCENE SEQUENCES ────────────────────────────────────────
// Extracted from UGC.tsx — pure constants, no React dependency.
// Used by generateAllSceneVideos() and buildMultiCutPrompt().

export interface ShotBlueprint {
  characterBeat: string;
  productBeat: string;
  cameraMove: string;
}

/** Directorial blueprint for each shot archetype. */
export const SHOT_BLUEPRINTS: Record<string, ShotBlueprint> = {
  HOOK: {
    characterBeat:
      'Creator stares directly at camera, slight lean-in, hook expression, speaking first line.',
    productBeat:
      'Quick cut — creator holds product up to camera, points at it, speaking benefit.',
    cameraMove: 'Handheld close-up → snap cut to medium product shot.',
  },
  PAYOFF: {
    characterBeat:
      'Creator actively using or applying product, hands visible, focused expression.',
    productBeat:
      'Creator looks up at camera with satisfied expression, speaking result line.',
    cameraMove: 'Slow push-in during demo → cut to face reaction.',
  },
  PROOF: {
    characterBeat:
      'Creator showing result or evidence, excited/surprised expression, speaking proof line.',
    productBeat:
      'Product in real-use context, creator points at it, speaking credibility line.',
    cameraMove: 'Wide context shot → tight product close-up.',
  },
  CTA: {
    characterBeat:
      'Creator looks directly at camera, warm confident energy, speaking CTA line.',
    productBeat:
      'Final product hero — centered in frame, creator holds up deliberately.',
    cameraMove: 'Steady medium → slow hold on product for finish.',
  },
  PROBLEM: {
    characterBeat:
      'Creator shows frustration or struggle, relatable pain point face, speaking problem.',
    productBeat:
      'Creator picks up product with relief, speaking "then I found this".',
    cameraMove: 'Close-up problem face → wider reveal as product enters frame.',
  },
};

/**
 * Maps total script duration in seconds → ordered shot-type array.
 * Falls back to all-PAYOFF for unrecognised durations.
 */
export const SCENE_SEQUENCES: Record<number, string[]> = {
  8:  ['HOOK'],
  16: ['HOOK', 'CTA'],
  24: ['HOOK', 'PAYOFF', 'CTA'],
  32: ['HOOK', 'PROBLEM', 'PAYOFF', 'CTA'],
  36: ['HOOK', 'PROBLEM', 'PAYOFF', 'PROOF', 'CTA'],
  42: ['HOOK', 'PROBLEM', 'PAYOFF', 'PROOF', 'PAYOFF', 'CTA'],
};
