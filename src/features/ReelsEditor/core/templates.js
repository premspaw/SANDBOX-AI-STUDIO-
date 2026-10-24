/**
 * Cinematic Reel Templates for ZeroLens Reels Studio.
 * Inspired by viral TikTok / Instagram Reels / YouTube Shorts creators
 * and HyperFrames motion graphics design standards.
 */

export const REEL_TEMPLATES = [
  {
    id: 'viral-hook',
    name: 'Viral Hook Headline',
    category: 'Hook & Intro',
    tag: 'High Retention',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    description: 'High-impact bold title with dark contrast pill and slide-up entrance to stop the scroll in the first 3 seconds.',
    defaultText: 'STOP SCROLLING 🛑\nWatch This First',
    suggestedDurationSec: 3.0,
    style: {
      x: 0.5,
      y: 0.22,
      fontSize: 88,
      color: '#FFFFFF',
      boxColor: '#000000',
      boxOpacity: 0.82,
      font: 'poppins',
    },
    animation: {
      in: 'slide-up',
      durationFrames: 9,
    },
  },
  {
    id: 'hormozi-caption',
    name: 'Hormozi Kinetic Caption',
    category: 'Captions & Speech',
    tag: 'Viral Standard',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Ultra-punchy electric yellow text inside a solid black pill. Maximizes viewer focus and keeps retention above 80%.',
    defaultText: "THIS ONE HABIT\nCHANGED EVERYTHING",
    suggestedDurationSec: 2.5,
    style: {
      x: 0.5,
      y: 0.50,
      fontSize: 94,
      color: '#FFE600',
      boxColor: '#000000',
      boxOpacity: 0.92,
      font: 'poppins',
    },
    animation: {
      in: 'none',
      durationFrames: 0,
    },
  },
  {
    id: 'point-list-3',
    name: '3-Point Key Takeaways',
    category: 'List & Value',
    tag: 'Educational',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Clean structured bullet cards (01, 02, 03) designed for tutorials, growth hacks, and value-packed videos.',
    defaultText: '01 • HOOK ATTENTION\n02 • DELIVER PROMISE\n03 • STRONG CTA',
    suggestedDurationSec: 4.0,
    style: {
      x: 0.5,
      y: 0.38,
      fontSize: 72,
      color: '#F8FAFC',
      boxColor: '#090D16',
      boxOpacity: 0.88,
      font: 'poppins',
    },
    animation: {
      in: 'slide-up',
      durationFrames: 12,
    },
  },
  {
    id: 'spotlight-callout',
    name: 'Spotlight Pro Callout',
    category: 'Callouts & Accents',
    tag: 'Pro Tip',
    badgeColor: 'bg-[#c8f135]/20 text-[#c8f135] border-[#c8f135]/30',
    description: 'Vibrant neon green accent card for highlighting insider tips, technical settings, or killer product features.',
    defaultText: '⚡ PRO TIP:\nShoot at 60fps for slow-mo',
    suggestedDurationSec: 3.2,
    style: {
      x: 0.5,
      y: 0.72,
      fontSize: 66,
      color: '#C8F135',
      boxColor: '#000000',
      boxOpacity: 0.85,
      font: 'poppins',
    },
    animation: {
      in: 'slide-up',
      durationFrames: 8,
    },
  },
  {
    id: 'before-after-split',
    name: 'Before & After Split',
    category: 'Comparison',
    tag: 'Transformation',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    description: 'High-contrast split banner for makeover, color grade, camera lens, or prompt result comparisons.',
    defaultText: 'BEFORE: Flat & Dull ❌\nAFTER: 4K Cinematic ✨',
    suggestedDurationSec: 3.5,
    style: {
      x: 0.5,
      y: 0.20,
      fontSize: 76,
      color: '#FFFFFF',
      boxColor: '#0C0A09',
      boxOpacity: 0.90,
      font: 'poppins',
    },
    animation: {
      in: 'fade',
      durationFrames: 10,
    },
  },
  {
    id: 'creator-handle',
    name: 'Creator Lower-Third',
    category: 'Branding',
    tag: 'Identity',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    description: 'Minimalist social handle positioned safely above TikTok/Shorts UI elements.',
    defaultText: '@zerolens.ai • Save for later',
    suggestedDurationSec: 4.0,
    style: {
      x: 0.5,
      y: 0.82,
      fontSize: 52,
      color: '#E4E4E7',
      boxColor: '#18181B',
      boxOpacity: 0.70,
      font: 'poppins',
    },
    animation: {
      in: 'fade',
      durationFrames: 12,
    },
  },
];

export const TEMPLATE_CATEGORIES = [
  'All',
  'Hook & Intro',
  'Captions & Speech',
  'List & Value',
  'Callouts & Accents',
  'Comparison',
  'Branding',
];

/**
 * Returns a template by its ID, or null if not found.
 */
export function getTemplateById(templateId) {
  return REEL_TEMPLATES.find((t) => t.id === templateId) || null;
}

/**
 * Creates an overlay object from a template preset at a given timeline frame.
 */
export function instantiateTemplate(template, frame, fps = 30, textOverride = null) {
  const durationFrames = Math.max(1, Math.round((template.suggestedDurationSec || 3.0) * fps));
  return {
    kind: 'text',
    text: textOverride || template.defaultText,
    startFrame: Math.max(0, frame),
    durationFrames,
    anchorMode: 'output',
    anchor: null,
    needsReview: false,
    style: { ...template.style },
    animation: { ...template.animation },
    templateId: template.id,
    templateVersion: '1.0.0',
  };
}
