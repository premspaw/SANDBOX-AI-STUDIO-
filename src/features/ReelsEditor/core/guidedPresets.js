/**
 * Guided Reel Creator Studio Presets.
 * Mirrors the exact visual cards and 6-step workflow from the reference photo.
 */

export const STEPS = [
  { id: 'start', label: 'Start', stepNumber: 0 },
  { id: 'colours', label: '1 Colours', stepNumber: 1, title: 'Pick your colours', description: 'They are applied across your text, cards, spotlights and accents.' },
  { id: 'fonts', label: '2 Fonts', stepNumber: 2, title: 'Pick your fonts', description: 'They are used for your hook, captions, cards and motion.' },
  { id: 'hook', label: '3 Hook', stepNumber: 3, title: 'Choose your opening hook', description: 'This stops the scroll in the first 3 seconds.' },
  { id: 'captions', label: '4 Captions', stepNumber: 4, title: 'Pick your caption style', description: 'Dynamic subtitles keep viewers engaged without sound.' },
  { id: 'extras', label: '5 Extras', stepNumber: 5, title: 'Enhance with cinematic extras', description: 'Polished details that boost retention.' },
  { id: 'watch', label: '6 Watch', stepNumber: 6, title: 'Watch your Reel & Export', description: 'Review the finished video or make AI tweaks.' },
];

export const COLOUR_PALETTES = [
  {
    id: 'midnight-neon',
    name: 'Midnight Neon',
    vibe: 'High energy, tech, punchy',
    background: '#0a0a0a',
    surface: '#18181b',
    text: '#ffffff',
    accent: '#c8f135', // Electric Lime
    secondary: '#9c89ff', // Radiant Purple
  },
  {
    id: 'editorial-paper',
    name: 'Editorial Paper',
    vibe: 'Editorial, calm, luxury',
    background: '#18181b',
    surface: '#27272a',
    text: '#f6f4ee', // Warm Cream
    accent: '#e05638', // Terracotta
    secondary: '#d97706', // Warm Amber
  },
  {
    id: 'ocean-cyan',
    name: 'Ocean Cyan',
    vibe: 'SaaS, crisp, modern',
    background: '#0b132b',
    surface: '#1c2541',
    text: '#ffffff',
    accent: '#06b6d4', // Hyper Cyan
    secondary: '#38bdf8', // Neon Ice
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    vibe: 'Warm, viral, storytelling',
    background: '#1c1917',
    surface: '#292524',
    text: '#fff7ed',
    accent: '#f97316', // Vibrant Orange
    secondary: '#ec4899', // Hot Pink
  },
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    vibe: 'Executive, finance, wealth',
    background: '#09090b',
    surface: '#18181b',
    text: '#fef08a',
    accent: '#d4af37', // Champagne Gold
    secondary: '#eab308', // Radiant Gold
  },
  {
    id: 'monochrome-slate',
    name: 'Monochrome Slate',
    vibe: 'Minimalist, clean, stealth',
    background: '#121214',
    surface: '#27272a',
    text: '#ffffff',
    accent: '#e4e4e7', // Pure White Accent
    secondary: '#71717a', // Cool Silver
  },
];

export const FONT_PAIRINGS = [
  {
    id: 'montserrat-caveat',
    name: 'Montserrat + Caveat',
    vibe: 'Bold + handwritten',
    titleFont: 'Montserrat',
    scriptFont: 'Caveat',
    sampleTitle: 'Quit your job?',
    sampleSubtitle: 'the part nobody says',
    sampleScript: 'this was the dream',
    fontKey: 'montserrat-caveat',
  },
  {
    id: 'playfair-inter',
    name: 'Playfair + Inter',
    vibe: 'Editorial, calm',
    titleFont: 'Playfair Display',
    scriptFont: 'Inter',
    sampleTitle: 'Quit your job?',
    sampleSubtitle: 'the part nobody says',
    sampleScript: 'this was the dream',
    fontKey: 'playfair-inter',
  },
  {
    id: 'anton-inter',
    name: 'Anton + Inter',
    vibe: 'Tall, loud caps',
    titleFont: 'Anton',
    scriptFont: 'Inter',
    sampleTitle: 'QUIT YOUR JOB?',
    sampleSubtitle: 'THE PART NOBODY SAYS',
    sampleScript: 'THIS WAS THE DREAM',
    fontKey: 'anton-inter',
  },
  {
    id: 'poppins-gochi',
    name: 'Poppins + Gochi Hand',
    vibe: 'Friendly + marker',
    titleFont: 'Poppins',
    scriptFont: 'Gochi Hand',
    sampleTitle: 'Quit your job?',
    sampleSubtitle: 'the part nobody says',
    sampleScript: 'this was the dream',
    fontKey: 'poppins-gochi',
  },
  {
    id: 'syne-outfit',
    name: 'Syne + Outfit',
    vibe: 'Modern, tech punch',
    titleFont: 'Syne',
    scriptFont: 'Outfit',
    sampleTitle: 'Quit your job?',
    sampleSubtitle: 'the part nobody says',
    sampleScript: 'this was the dream',
    fontKey: 'syne-outfit',
  },
  {
    id: 'noto-kannada',
    name: 'Noto Sans Kannada + Poppins',
    vibe: 'Multilingual / Global',
    titleFont: 'Noto Sans Kannada',
    scriptFont: 'Poppins',
    sampleTitle: 'ಕೆಲಸ ಬಿಡಬೇಕಾ?',
    sampleSubtitle: 'ಯಾರೂ ಹೇಳದ ಸತ್ಯ',
    sampleScript: 'ಇದು ನಿಮ್ಮ ಕನಸು',
    fontKey: 'noto-kannada',
  },
];

export const HOOK_STYLES = [
  {
    id: 'viral-question',
    name: 'Viral Question',
    vibe: 'Bold question with keyword highlight',
    defaultText: 'Quit your job?\nThe part nobody says\nthis was the dream',
    style: {
      x: 0.5,
      y: 0.28,
      fontSize: 84,
      boxOpacity: 0.82,
    },
    animation: { in: 'slide-up', durationFrames: 10 },
  },
  {
    id: 'curiosity-gap',
    name: 'Curiosity Gap',
    vibe: 'Unlocks the secret in 3 seconds',
    defaultText: 'THE 1 THING\nNobody Tells You About\nBuilding In Public',
    style: {
      x: 0.5,
      y: 0.30,
      fontSize: 82,
      boxOpacity: 0.88,
    },
    animation: { in: 'fade', durationFrames: 8 },
  },
  {
    id: 'contrarian-truth',
    name: 'Contrarian Truth',
    vibe: 'Why everyone else is wrong',
    defaultText: 'WHY EVERYTHING\nYou know about reels\nis completely wrong ❌',
    style: {
      x: 0.5,
      y: 0.26,
      fontSize: 80,
      boxOpacity: 0.85,
    },
    animation: { in: 'slide-up', durationFrames: 9 },
  },
  {
    id: 'transformation',
    name: 'Transformation',
    vibe: 'Before & after outcome',
    defaultText: 'HOW I WENT\nFrom 0 to 100k views\nin 30 days ✨',
    style: {
      x: 0.5,
      y: 0.32,
      fontSize: 82,
      boxOpacity: 0.84,
    },
    animation: { in: 'slide-up', durationFrames: 12 },
  },
  {
    id: 'direct-challenge',
    name: 'Direct Challenge',
    vibe: 'Stop the scroll immediately',
    defaultText: 'STOP SCROLLING 🛑\nWatch this before you post',
    style: {
      x: 0.5,
      y: 0.25,
      fontSize: 88,
      boxOpacity: 0.90,
    },
    animation: { in: 'slide-up', durationFrames: 8 },
  },
  {
    id: 'story-opener',
    name: 'Story Opener',
    vibe: 'Intriguing personal narrative',
    defaultText: '3 MONTHS AGO\nI made the biggest gamble\nof my life...',
    style: {
      x: 0.5,
      y: 0.30,
      fontSize: 78,
      boxOpacity: 0.80,
    },
    animation: { in: 'fade', durationFrames: 10 },
  },
];

export const CAPTION_STYLES = [
  {
    id: 'hormozi-kinetic',
    name: 'Hormozi Kinetic',
    vibe: 'Yellow word pop, bold shadow, centered',
    templateId: 'hormozi-caption',
    sampleText: 'THIS ONE HABIT\nCHANGED EVERYTHING',
    fontSize: 92,
    color: '#FFE600',
    boxColor: '#000000',
    boxOpacity: 0.92,
    y: 0.50,
  },
  {
    id: 'clean-minimal',
    name: 'Clean Minimal',
    vibe: 'Editorial clean sans, soft blurred backdrop',
    templateId: 'viral-hook',
    sampleText: 'Start with what you have.\nImprove as you go.',
    fontSize: 76,
    color: '#FFFFFF',
    boxColor: '#18181B',
    boxOpacity: 0.70,
    y: 0.55,
  },
  {
    id: 'neon-spotlight',
    name: 'Neon Spotlight Glow',
    vibe: 'Electric lime outline, pulsing contrast',
    templateId: 'spotlight-callout',
    sampleText: '⚡ THE SECRET TRICK\nDouble your engagement',
    fontSize: 78,
    color: '#C8F135',
    boxColor: '#000000',
    boxOpacity: 0.88,
    y: 0.65,
  },
  {
    id: 'lower-third-safe',
    name: 'Lower-Third Safe Area',
    vibe: 'Positioned above TikTok / Shorts UI buttons',
    templateId: 'creator-handle',
    sampleText: 'Watch till the end for the formula',
    fontSize: 60,
    color: '#E4E4E7',
    boxColor: '#0A0A0A',
    boxOpacity: 0.75,
    y: 0.78,
  },
  {
    id: 'word-karaoke',
    name: 'Word Karaoke Pop',
    vibe: 'Word-by-word active rhythm tracker',
    templateId: 'hormozi-caption',
    sampleText: 'EVERY SINGLE DAY\nConsistency beats talent',
    fontSize: 86,
    color: '#38BDF8',
    boxColor: '#090D16',
    boxOpacity: 0.90,
    y: 0.52,
  },
  {
    id: 'cyberpunk-box',
    name: 'Cyberpunk Box',
    vibe: 'High contrast angled tech aesthetic',
    templateId: 'point-list-3',
    sampleText: 'SYSTEM UPGRADE:\nAI Automation in 2026',
    fontSize: 80,
    color: '#F43F5E',
    boxColor: '#000000',
    boxOpacity: 0.94,
    y: 0.48,
  },
];

export const EXTRAS_PRESETS = [
  {
    id: 'silence-autocut',
    name: '✂️ Acoustic Silence Auto-Cut',
    vibe: 'Removes dead gaps and pauses for ultra-tight pacing',
    type: 'silence',
    defaultEnabled: true,
  },
  {
    id: 'audio-master',
    name: '🎧 Audio Studio (Denoise & -14 LUFS)',
    vibe: 'Removes background room hum & normalizes voice to broadcast standard',
    type: 'audio',
    defaultEnabled: true,
  },
  {
    id: 'spotlight-callout',
    name: '⚡ Spotlight Pro Callout',
    vibe: 'Animates a neon pro-tip card at the key takeaway moment',
    type: 'template',
    templateId: 'spotlight-callout',
    defaultEnabled: false,
  },
  {
    id: 'point-list-3',
    name: '📊 3-Point Value List',
    vibe: 'Full-screen animated 3-point list to structure your teaching',
    type: 'template',
    templateId: 'point-list-3',
    defaultEnabled: false,
  },
  {
    id: 'before-after-split',
    name: '🔀 Before & After Split',
    vibe: 'Visual split card highlighting transformation or contrast',
    type: 'template',
    templateId: 'before-after-split',
    defaultEnabled: false,
  },
  {
    id: 'creator-handle',
    name: '🏷️ Creator Social Watermark',
    vibe: 'Safe-zone lower-third with @handle for social attribution',
    type: 'template',
    templateId: 'creator-handle',
    defaultEnabled: true,
  },
];
