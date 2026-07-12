// ─── MULTI-SHOT PROMPT BUILDER ────────────────────────────────────────────────
// Pure function — no React, no side-effects.
// Builds an 8-second UGC multi-cut prompt for one shot within a longer ad.

import { SHOT_BLUEPRINTS } from '../constants/shotBlueprints';

export interface BuildMultiCutPromptOptions {
  dialog: string;
  shotType: string;
  shotIndex: number;
  totalShots: number;
  imageStyle?: string;
  productName?: string;
  productDetails?: string;
  hasCharacterRef?: boolean;
  hasProductRef?: boolean;
}

/**
 * Splits dialog at ~45% and generates a structured two-beat prompt:
 *   [0:00–0:03] CHARACTER BEAT   →   [0:03–0:08] PRODUCT BEAT
 */
export const buildMultiCutPrompt = ({
  dialog,
  shotType,
  shotIndex,
  totalShots,
  imageStyle = 'ultra-realistic',
  productName,
  productDetails,
  hasCharacterRef = false,
  hasProductRef = false,
}: BuildMultiCutPromptOptions): string => {
  const bp = SHOT_BLUEPRINTS[shotType] ?? SHOT_BLUEPRINTS.HOOK;

  const words = dialog.trim().split(/\s+/);
  const mid = Math.ceil(words.length * 0.45);
  const d1 = words.slice(0, mid).join(' ');
  const d2 = words.slice(mid).join(' ');

  const styleNote =
    imageStyle === 'ultra-realistic'
      ? 'Shot on iPhone, natural light, authentic UGC, slight grain, no studio'
      : imageStyle === 'cinematic'
      ? 'Cinematic lighting, moody grade, professional but authentic'
      : 'Authentic phone video, natural light, real home environment';

  const refNote =
    hasCharacterRef && hasProductRef
      ? 'REFS PROVIDED: Match character face exactly. Match product exactly.'
      : hasCharacterRef
      ? 'CHARACTER REF: Match face and appearance exactly.'
      : hasProductRef
      ? 'PRODUCT REF: Match product appearance exactly.'
      : 'No refs — use relatable UGC creator aesthetic.';

  const pos =
    shotIndex === 0
      ? 'OPENING shot — hook energy, grab attention immediately.'
      : shotIndex === totalShots - 1
      ? 'CLOSING shot — confident finish, clear sign-off.'
      : `Shot ${shotIndex + 1} of ${totalShots} — maintain consistent character and environment.`;

  const product = productName ?? (productDetails?.substring(0, 60) ?? 'product');
  const [camA, camB] = bp.cameraMove.split('→').map((s) => s.trim());

  return `8-second UGC video. Part of ${totalShots * 8}s total ad.

SHOT: ${shotType} · ${pos}
PRODUCT: ${product}
DIALOGUE: "${dialog}"

[0:00-0:03] CHARACTER BEAT
${bp.characterBeat}
Speaking: "${d1}"
Camera: ${camA}

[0:03-0:08] PRODUCT BEAT
${bp.productBeat}
Speaking: "${d2}"
Camera: ${camB ?? camA}

STYLE: ${styleNote}
${refNote}
RULES: Simulate hard cut at 0:03. Lip sync ONLY during CHARACTER BEAT (0:00-0:03); dialogue during PRODUCT BEAT (0:03-0:08) must be off-camera voice-over narration with no mouth/lip movement. No 85mm bokeh. Same room throughout.`.trim();
};
