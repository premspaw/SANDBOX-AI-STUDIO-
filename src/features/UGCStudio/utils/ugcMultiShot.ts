/**
 * Re-exports from their canonical locations within UGCStudio.
 * UGC.tsx imports from here — all real logic lives in:
 *   constants/shotBlueprints.ts  →  SHOT_BLUEPRINTS, SCENE_SEQUENCES
 *   utils/promptBuilder.ts       →  buildMultiCutPrompt
 */
export type { ShotBlueprint } from '../constants/shotBlueprints';
export type { BuildMultiCutPromptOptions } from './promptBuilder';
export { SHOT_BLUEPRINTS, SCENE_SEQUENCES } from '../constants/shotBlueprints';
export { buildMultiCutPrompt } from './promptBuilder';
