// ─── SCRIPT TONES ─────────────────────────────────────────────────────────────
// Human-first UGC tones — written to produce natural spoken dialogue,
// not marketing copy. Every prompt instructs the AI to write AS a person
// speaking on camera, not about a technique.

export interface ScriptTone {
  name: string;
  icon: string;
  description: string;
  prompt: string;
  category: string;
}

export const SCRIPT_TONES: Record<string, ScriptTone> = {

  // ── MARKETING ──────────────────────────────────────────────────────────────
  viral_marketing: {
    category: 'Marketing',
    name: 'Viral Hook',
    icon: '🔥',
    description: 'Stops the scroll in 2 seconds',
    prompt:
      `Write exactly how someone talks when they're genuinely excited and can't wait to tell their friend something. 
      Start mid-thought — drop the viewer into the middle of the energy. 
      Short, punchy lines. Real pauses ("okay wait—", "no seriously—", "I'm not joking"). 
      Never say "attention-grabbing" or "scroll-stopper" — just BE that. 
      Sounds like it was filmed spontaneously, not scripted.`,
  },

  luxury_sales: {
    category: 'Marketing',
    name: 'Soft Luxury',
    icon: '💎',
    description: 'Quiet confidence, premium feel',
    prompt:
      `Write like someone who genuinely has taste and isn't trying to sell you anything — they're just sharing what they love. 
      Slow, deliberate sentences. No hype words. 
      Describe the feeling of using it, not the features. 
      "The texture is just—" / "I didn't expect to love it this much" / "it's one of those things you just keep reaching for." 
      Sounds like a whisper, not a shout.`,
  },

  direct_response: {
    category: 'Marketing',
    name: 'Problem → Fix',
    icon: '🎯',
    description: 'Names the pain, gives the answer',
    prompt:
      `Write like someone who had a real problem and found the thing that actually fixed it. 
      Start by naming the exact frustration — be specific, not vague. 
      Then the pivot: "and then I found this" / "okay so I tried this and—". 
      End with what changed. No fake urgency. No "limited time offer" language. 
      Real person. Real problem. Real result.`,
  },

  social_proof: {
    category: 'Marketing',
    name: 'Everyone\'s Using It',
    icon: '⭐',
    description: 'Feels like a recommendation from a friend',
    prompt:
      `Write like you're texting a friend to tell them about something you discovered. 
      Casual, a little breathless, slightly gossipy. 
      "Okay so I've been seeing this everywhere and I finally tried it—" 
      Use "literally", "honestly", "I was not expecting this". 
      Sounds like you found a secret and you're letting them in on it.`,
  },

  // ── STORYTELLING ───────────────────────────────────────────────────────────
  emotional_story: {
    category: 'Storytelling',
    name: 'Real Talk',
    icon: '❤️',
    description: 'Vulnerable, honest, human',
    prompt:
      `Write like someone opening up about something they went through. 
      Start with the low point — the actual feeling, not a generic problem. 
      Don't rush to the product. Let the story breathe. 
      "I remember thinking—" / "there was this one day where—". 
      The product appears naturally as part of what helped, not as the hero. 
      Sounds like they're talking to a camera at 11pm, not a film set.`,
  },

  hero_journey: {
    category: 'Storytelling',
    name: 'Glow-Up Arc',
    icon: '🦸',
    description: 'Before → struggle → transformation',
    prompt:
      `Write like someone telling their transformation story with real detail — not a highlight reel. 
      Include the messy middle: "I tried like three other things first." 
      Make the turning point feel earned. 
      "And then something actually shifted" / "week three was when I noticed—". 
      End with where they are now, in their own words. Grounded, not motivational-poster.`,
  },

  // ── EDUCATIONAL ────────────────────────────────────────────────────────────
  educational: {
    category: 'Educational',
    name: 'Let Me Show You',
    icon: '📚',
    description: 'Helpful, clear, step-by-step',
    prompt:
      `Write like a knowledgeable friend explaining something while they do it. 
      Conversational but clear. "So first you just—" / "the key thing here is—" / "and this is the part most people skip". 
      One idea per sentence. No jargon unless you explain it immediately. 
      Sounds like a voice note, not a manual.`,
  },

  expert_tips: {
    category: 'Educational',
    name: 'Insider Intel',
    icon: '💡',
    description: 'Sounds like they actually know their stuff',
    prompt:
      `Write like someone who genuinely knows this topic deeply and is sharing the things they wish they'd known earlier. 
      Specific details, not general advice. 
      "Most people do X — but actually Y is why it works." 
      No "pro tip" labels — just drop the knowledge naturally. 
      Confident but not arrogant. They've earned it.`,
  },

  myth_busting: {
    category: 'Educational',
    name: 'That\'s Actually Wrong',
    icon: '🔬',
    description: 'Calls out the misinformation',
    prompt:
      `Write like someone who just learned something that changed their mind and they can't believe they didn't know sooner. 
      Start with the wrong belief stated plainly — "okay so everyone says X". 
      Then the reframe: "but here's what's actually happening—". 
      Sounds a little indignant, a little excited. Like they're correcting a record.`,
  },

  // ── LIFESTYLE ──────────────────────────────────────────────────────────────
  casual_vlog: {
    category: 'Lifestyle',
    name: 'Just Talking',
    icon: '📹',
    description: 'Zero effort energy, maximum relatability',
    prompt:
      `Write exactly like someone filming a casual vlog — stream of consciousness, natural rhythm. 
      Incomplete sentences are fine. Filler words are fine ("like", "you know", "honestly"). 
      Small digressions are fine. 
      "Okay so I was just — wait let me back up." 
      No polish. No structure. Just a person talking.`,
  },

  day_in_life: {
    category: 'Lifestyle',
    name: 'Day In My Life',
    icon: '🌅',
    description: 'Grounded, routine, real',
    prompt:
      `Write like someone narrating their morning or afternoon as it happens. 
      Present tense. Specific small details ("made my third coffee", "couldn't find my keys again"). 
      The product fits into the routine naturally — not a big reveal, just part of the day. 
      Feels like you're watching a real person's real life, not a curated aesthetic.`,
  },

  lifestyle_aspirational: {
    category: 'Lifestyle',
    name: 'Soft Life',
    icon: '✨',
    description: 'Elevated, intentional, peaceful',
    prompt:
      `Write like someone who has figured out their version of a good life and is quietly sharing it. 
      Slow sentences. Sensory language ("the smell of it", "the way the light hits"). 
      Not bragging — just appreciating. 
      "This is the kind of thing that makes a Tuesday feel different." 
      Calm, warm, unhurried.`,
  },

  // ── ENTERTAINMENT ──────────────────────────────────────────────────────────
  comedy_skit: {
    category: 'Entertainment',
    name: 'Funny Take',
    icon: '😂',
    description: 'Timing, timing, timing',
    prompt:
      `Write like a comedian setting up a bit. 
      The setup is relatable (everyone's been there). The punchline is unexpected but instantly makes sense. 
      Short sentences for punch. Longer sentence for buildup. 
      "You know when you—" / "and then — nothing. just. nothing." 
      The product is part of the joke, not a break from it. Dry or absurd, not forced.`,
  },

  reaction_commentary: {
    category: 'Entertainment',
    name: 'Hot Take',
    icon: '🗣️',
    description: 'Opinionated, direct, no filter',
    prompt:
      `Write like someone who has a strong opinion and zero hesitation about sharing it. 
      Punchy, declarative sentences. A little provocative. 
      "I'm just going to say what everyone's thinking." 
      They might be wrong. They don't care. 
      The energy is confident, maybe slightly unhinged. Entertaining first, informative if it fits.`,
  },

  // ── NICHE ──────────────────────────────────────────────────────────────────
  unboxing_review: {
    category: 'Niche',
    name: 'Unboxing Review',
    icon: '📦',
    description: 'Genuine first impressions, unfiltered',
    prompt:
      `Write like someone experiencing the product for the first time on camera. 
      Real-time reactions. Genuine surprises. 
      "Oh — okay, that's actually—" / "wait this is nicer than I thought". 
      Include one thing that wasn't expected. One thing that could be better. 
      Honest, not hyped. The enthusiasm is real because the product earns it.`,
  },

  comparison: {
    category: 'Niche',
    name: 'I Tried Both',
    icon: '⚖️',
    description: 'First-hand comparison, clear verdict',
    prompt:
      `Write like someone who actually used both options for a real amount of time and has a real opinion. 
      No corporate hedging. Give the verdict clearly. 
      "Look, X is fine if you — but if you actually want —, you want Y." 
      Acknowledge what the other option does well. Then say why this one wins for them specifically.`,
  },

  before_after: {
    category: 'Niche',
    name: 'This Changed It',
    icon: '🔄',
    description: 'Specific results, believable timeline',
    prompt:
      `Write like someone showing their actual results — not the best case, just their real case. 
      Be specific about time ("by day 4", "after about two weeks"). 
      Describe what they noticed first. Then what changed more gradually. 
      "I didn't even realize until someone pointed it out" type of moment. 
      Real, not exaggerated. The specificity is what makes it believable.`,
  },

  // ── URGENCY ────────────────────────────────────────────────────────────────
  trending_now: {
    category: 'Urgency',
    name: 'Caught On Late',
    icon: '🌊',
    description: 'FOMO without sounding desperate',
    prompt:
      `Write like someone who resisted a trend for a while and then finally caved — and now gets why everyone was obsessed. 
      Self-aware about being late. 
      "I was literally the last person to try this." / "I kept seeing it and I was like — okay fine." 
      Now they're a convert. The FOMO is real because they felt it themselves.`,
  },

  limited_time: {
    category: 'Urgency',
    name: 'Don\'t Sleep On This',
    icon: '⏰',
    description: 'Genuine urgency, not manufactured',
    prompt:
      `Write like a friend who just found out about something good and is texting you immediately. 
      The urgency comes from caring, not from a countdown timer. 
      "I don't know how long this is going to be available but—". 
      Short. Direct. Sounds like they filmed this in 30 seconds because they didn't want you to miss it.`,
  },

  // ── TRUST ──────────────────────────────────────────────────────────────────
  honest_review: {
    category: 'Trust',
    name: 'No BS Review',
    icon: '💯',
    description: 'Says the quiet part out loud',
    prompt:
      `Write like someone who is going to tell you the real thing, not the nice thing. 
      They'll say what they don't love. They'll admit what surprised them. 
      "I'm not going to pretend this is perfect—" / "here's the thing nobody tells you—". 
      Trust is built by being willing to point out the flaw. 
      The positives land harder because the negatives were real.`,
  },

  personal_recommendation: {
    category: 'Trust',
    name: 'Just Telling You',
    icon: '🤝',
    description: 'One friend to another',
    prompt:
      `Write like someone texting their best friend about something they think they'd actually love. 
      Warm, specific, low-pressure. 
      "I'm not saying you have to — but like, I genuinely think you'd love this." 
      References something specific about the person they're talking to ("you always say you struggle with—"). 
      Feels like a personal recommendation, not a review.`,
  },

};
