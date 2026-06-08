// ─── SCRIPT TONES ─────────────────────────────────────────────────────────────
// Extracted from UGC.tsx — pure constant, no React dependency.

export interface ScriptTone {
  name: string;
  icon: string;
  description: string;
  prompt: string;
  category: string;
}

export const SCRIPT_TONES: Record<string, ScriptTone> = {
  // MARKETING TONES
  viral_marketing: {
    category: 'Marketing',
    name: 'Viral Marketing',
    icon: '🔥',
    description: 'High-energy hooks, fast-paced',
    prompt:
      "Write in a high-energy viral marketing style with attention-grabbing hooks, FOMO triggers, power words, short punchy sentences, and strong CTAs. Use pattern interrupts and scroll-stoppers.",
  },
  luxury_sales: {
    category: 'Marketing',
    name: 'Luxury & Premium',
    icon: '💎',
    description: 'Sophisticated, aspirational',
    prompt:
      'Write in an elegant, sophisticated tone emphasizing exclusivity, premium quality, and aspirational lifestyle. Use refined language, create desire through scarcity, focus on craftsmanship and prestige.',
  },
  direct_response: {
    category: 'Marketing',
    name: 'Direct Response',
    icon: '🎯',
    description: 'Problem-solution, urgent',
    prompt:
      "Write in a direct response style: identify pain point, present solution, emphasize benefits over features, create urgency, clear CTA. Use 'you' language and address objections.",
  },
  social_proof: {
    category: 'Marketing',
    name: 'Social Proof',
    icon: '⭐',
    description: 'Trust-building, relatable',
    prompt:
      "Write as if sharing a personal discovery or recommendation to a friend. Include relatable problems, emphasize results and transformations, use social proof language like 'everyone's talking about' and 'you need to try this'.",
  },
  // STORYTELLING TONES
  emotional_story: {
    category: 'Storytelling',
    name: 'Emotional Story',
    icon: '❤️',
    description: 'Personal, heartfelt',
    prompt:
      'Write a compelling emotional narrative with a personal journey arc. Start with vulnerability or challenge, show transformation, end with hope or triumph. Use vivid sensory details and emotional language.',
  },
  hero_journey: {
    category: 'Storytelling',
    name: "Hero's Journey",
    icon: '🦸',
    description: 'Transformation arc',
    prompt:
      "Structure as a hero's journey: ordinary world → challenge/obstacle → struggle → breakthrough → transformation. Make the viewer the hero, product/service as the mentor/tool.",
  },
  // EDUCATIONAL TONES
  educational: {
    category: 'Educational',
    name: 'Tutorial',
    icon: '📚',
    description: 'Informative, clear',
    prompt:
      "Write in a clear, educational tone breaking down information into digestible steps. Use 'here's how', 'let me show you', numbered steps. Encourage learning with accessible language.",
  },
  expert_tips: {
    category: 'Educational',
    name: 'Expert Tips',
    icon: '💡',
    description: 'Insider knowledge',
    prompt:
      "Write as an expert sharing insider tips and life hacks. Use phrases like 'pro tip', 'here's what most people don't know', 'the secret is'. Make viewer feel they're getting exclusive knowledge.",
  },
  myth_busting: {
    category: 'Educational',
    name: 'Myth-Busting',
    icon: '🔬',
    description: 'Correcting misconceptions',
    prompt:
      "Start by calling out a common myth or misconception. Use 'stop believing', 'the truth is', 'here's what they don't tell you'. Build credibility by revealing insider information.",
  },
  // LIFESTYLE TONES
  casual_vlog: {
    category: 'Lifestyle',
    name: 'Casual Vlog',
    icon: '📹',
    description: 'Friendly, authentic',
    prompt:
      "Write in a casual, friend-to-friend conversational tone. Use contractions, filler words like 'so', 'like', casual language. Make it feel spontaneous and authentic, like talking to the camera.",
  },
  day_in_life: {
    category: 'Lifestyle',
    name: 'Day in Life',
    icon: '🌅',
    description: 'Personal narrative',
    prompt:
      'Write as a personal diary entry or day-in-the-life narrative. Use present tense, include time markers, show authentic moments. Balance routine with interesting details.',
  },
  lifestyle_aspirational: {
    category: 'Lifestyle',
    name: 'Aspirational',
    icon: '✨',
    description: 'Aesthetic, curated',
    prompt:
      'Write in an aspirational lifestyle tone emphasizing aesthetics, intentional living, elevated everyday moments. Use poetic language, focus on feelings and ambiance, create desire for the lifestyle.',
  },
  // ENTERTAINMENT
  comedy_skit: {
    category: 'Entertainment',
    name: 'Comedy Skit',
    icon: '😂',
    description: 'Funny, exaggerated',
    prompt:
      'Write with comedic timing using exaggeration, unexpected twists, relatable humor, and playful language. Include setup and punchline structure. Make it entertaining first, informative second.',
  },
  reaction_commentary: {
    category: 'Entertainment',
    name: 'Reaction',
    icon: '🗣️',
    description: 'Opinionated, engaging',
    prompt:
      'Write as live reaction or commentary. Use expressive language, exclamations, rhetorical questions. Share opinions boldly while keeping it entertaining. React authentically to surprises.',
  },
  // NICHE
  unboxing_review: {
    category: 'Niche',
    name: 'Unboxing',
    icon: '📦',
    description: 'First impressions',
    prompt:
      "Write as real-time unboxing experience. Build anticipation, share first impressions, cover features systematically, give honest pros/cons. Use 'wow', 'okay so', 'let's see' naturally.",
  },
  comparison: {
    category: 'Niche',
    name: 'Comparison',
    icon: '⚖️',
    description: 'Analytical, balanced',
    prompt:
      "Structure as balanced comparison: introduce both options, compare key features side-by-side, highlight strengths/weaknesses, give clear verdict. Use 'versus', 'on the other hand', 'the winner is'.",
  },
  before_after: {
    category: 'Niche',
    name: 'Before/After',
    icon: '🔄',
    description: 'Results-driven',
    prompt:
      "Emphasize dramatic transformation. Start with 'before' pain point or problem state, build anticipation, reveal 'after' results. Use time markers and quantifiable results. Make the change feel achievable.",
  },
  // URGENCY
  trending_now: {
    category: 'Urgency',
    name: 'Trending Now',
    icon: '🌊',
    description: 'Timely, relevant',
    prompt:
      "Reference current trend or viral moment. Use 'everyone's talking about', 'if you haven't seen', 'this is blowing up'. Create FOMO around being in the know. Strike while relevant.",
  },
  limited_time: {
    category: 'Urgency',
    name: 'Limited Time',
    icon: '⏰',
    description: 'Scarcity-driven',
    prompt:
      "Create strong urgency with time/quantity scarcity. Use 'only', 'last chance', 'don't miss out', countdown language. Make inaction feel like a loss. Clear deadline and strong CTA.",
  },
  // TRUST
  honest_review: {
    category: 'Trust',
    name: 'Brutally Honest',
    icon: '💯',
    description: 'Transparent, no-BS',
    prompt:
      "Write with radical honesty and transparency. Call out both pros AND cons, admit sponsorships or biases, use 'let me be real', 'not gonna lie'. Build trust through authenticity over perfection.",
  },
  personal_recommendation: {
    category: 'Trust',
    name: 'Personal Rec',
    icon: '🤝',
    description: 'Genuine, helpful',
    prompt:
      "Write as sincere recommendation to a friend. Use 'I genuinely', 'you have to try', personal anecdotes. Show you use/love it yourself. Make viewer feel you care about helping them.",
  },
};
