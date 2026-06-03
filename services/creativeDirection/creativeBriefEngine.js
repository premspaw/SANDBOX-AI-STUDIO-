// ═══════════════════════════════════════════════════════════════════════════════
// CREATIVE BRIEF ENGINE — Generates structured creative briefs instead of raw prompts
// Transforms user intent into cinematic direction
// ═══════════════════════════════════════════════════════════════════════════════

import { detectArtDirection, buildDNAFromBrief } from './designDNA.js';

export class CreativeBriefEngine {
  constructor(hermesMemory) {
    this.hermes = hermesMemory;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN ENTRY: Generate creative brief from user input
  // ═══════════════════════════════════════════════════════════════════════════════

  generateBrief({
    topic,
    brandName,
    audience,
    emotionalGoal,
    carouselType = 'authority',
    artDirection = null,
    brandColor = null,
    instagramHandle = null,
  }) {
    // Auto-detect art direction if not provided
    const detected = detectArtDirection(topic);
    const selectedArtDirection = artDirection || detected.artDirection;
    
    // Build creative DNA
    const creativeDNA = this.hermes.buildCreativeDNA({
      topic,
      emotionalGoal,
      artDirection: selectedArtDirection,
    });

    // Construct the brief
    const brief = {
      // Core identity
      topic,
      brandName,
      audience: audience || 'general',
      
      // Emotional architecture
      emotionalGoal: emotionalGoal || detected.emotionalTone || 'engaging',
      emotionalTone: creativeDNA.emotionalTone,
      
      // Visual direction
      artDirection: selectedArtDirection,
      visualMood: this.describeVisualMood(selectedArtDirection, creativeDNA),
      
      // Brand integration
      brandVoice: this.inferBrandVoice(brandName, topic),
      brandColor: brandColor || '#D4AF37',
      instagramHandle,
      
      // Carousel structure
      carouselType,
      slideCount: this.inferSlideCount(carouselType),
      
      // Narrative design
      pacing: creativeDNA.pacingStyle,
      visualIntensity: creativeDNA.visualIntensity,
      whitespaceStyle: creativeDNA.whitespaceStyle,
      
      // Story arc
      slideNarrative: this.buildSlideNarrative(carouselType, emotionalGoal),
      
      // Design DNA
      designDNA: buildDNAFromBrief({
        topic,
        artDirection: selectedArtDirection,
        emotionalIntensity: creativeDNA.cinematicIntensity,
        whitespaceRatio: creativeDNA.whitespaceStyle,
        typographyEnergy: creativeDNA.typographyEnergy,
      }),
      
      // Creative DNA reference
      creativeDNA,
      
      // Generation metadata
      generatedAt: Date.now(),
      version: '2.0-cinematic',
    };

    return brief;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // VISUAL MOOD DESCRIPTION
  // ═══════════════════════════════════════════════════════════════════════════════

  describeVisualMood(artDirection, creativeDNA) {
    const moodMap = {
      cinematic: {
        atmosphere: 'A24 film poster × Behance editorial',
        lighting: 'dramatic chiaroscuro with subtle film grain',
        emotion: 'emotionally resonant, visually poetic',
        reference: 'A24, Criterion Collection, Mubi',
      },
      luxury: {
        atmosphere: 'Rolex campaign × Vanity Fair cover',
        lighting: 'soft gold accent lighting, elegant shadows',
        emotion: 'aspirational, premium, timeless',
        reference: 'Gucci, Rolex, Vanity Fair',
      },
      apple: {
        atmosphere: 'Apple keynote × Dieter Rams precision',
        lighting: 'pristine whites, subtle depth shadows',
        emotion: 'confident, clear, revolutionary',
        reference: 'Apple, Braun, Vitsoe',
      },
      streetwear: {
        atmosphere: 'Supreme drop × Highsnobiety editorial',
        lighting: 'harsh urban lighting, gritty contrast',
        emotion: 'raw, bold, unapologetic',
        reference: 'Supreme, Off-White, Stüssy',
      },
      tech: {
        atmosphere: 'Linear.app × Notion rebrand',
        lighting: 'cyan glow, dark mode aesthetic',
        emotion: 'precise, futuristic, capable',
        reference: 'Linear, Notion, Vercel',
      },
      futuristic: {
        atmosphere: 'Blade Runner 2049 × Cyberpunk 2077',
        lighting: 'neon-noir, holographic depth',
        emotion: 'revolutionary, tech-forward, mysterious',
        reference: 'Blade Runner 2049, Cyberpunk 2077',
      },
      editorial: {
        atmosphere: 'NYT Magazine × Monocle × FT Weekend',
        lighting: 'natural daylight, editorial studio',
        emotion: 'authoritative, refined, journalistic',
        reference: 'NYT Magazine, Monocle, FT Weekend',
      },
      minimal: {
        atmosphere: 'Dieter Rams × Muji × Brutalist Swiss',
        lighting: 'clean even lighting, no shadows',
        emotion: 'pure, focused, essential',
        reference: 'Dieter Rams, Muji, Vitsœ',
      },
    };

    const base = moodMap[artDirection] || moodMap.cinematic;
    
    return {
      ...base,
      intensity: creativeDNA.visualIntensity,
      whitespace: creativeDNA.whitespaceStyle,
      typography: creativeDNA.typographyEnergy,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BRAND VOICE INFERENCE
  // ═══════════════════════════════════════════════════════════════════════════════

  inferBrandVoice(brandName, topic) {
    const topicLower = (topic || '').toLowerCase();
    
    if (topicLower.includes('ai') || topicLower.includes('tech')) {
      return 'revolutionary confident';
    }
    if (topicLower.includes('finance') || topicLower.includes('business')) {
      return 'authoritative trustworthy';
    }
    if (topicLower.includes('creative') || topicLower.includes('art')) {
      return 'expressive artistic';
    }
    if (topicLower.includes('fitness') || topicLower.includes('health')) {
      return 'energetic motivating';
    }
    
    return 'professional approachable';
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SLIDE COUNT INFERENCE
  // ═══════════════════════════════════════════════════════════════════════════════

  inferSlideCount(carouselType) {
    const counts = {
      authority: 7,
      story: 7,
      myth: 5,
      comparison: 5,
      authority2: 7,
      listicle: 7,
      doDont: 6,
      secrets: 5,
      tutorial: 5,
      caseStudy: 6,
    };
    
    return counts[carouselType] || 7;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SLIDE NARRATIVE ARCHITECTURE
  // ═══════════════════════════════════════════════════════════════════════════════

  buildSlideNarrative(carouselType, emotionalGoal) {
    const narratives = {
      authority: [
        { slide: 1, purpose: 'Hook', emotion: 'curiosity', beat: 'stop-the-scroll claim' },
        { slide: 2, purpose: 'Problem', emotion: 'empathy', beat: 'pain recognition' },
        { slide: 3, purpose: 'Agitation', emotion: 'tension', beat: 'cost of inaction' },
        { slide: 4, purpose: 'Solution', emotion: 'hope', beat: 'transformation promise' },
        { slide: 5, purpose: 'Proof', emotion: 'trust', beat: 'evidence & results' },
        { slide: 6, purpose: 'Mechanism', emotion: 'capability', beat: 'how it works' },
        { slide: 7, purpose: 'CTA', emotion: 'urgency', beat: 'action now' },
      ],
      story: [
        { slide: 1, purpose: 'Setup', emotion: 'intrigue', beat: 'world building' },
        { slide: 2, purpose: 'Inciting', emotion: 'curiosity', beat: 'what changed' },
        { slide: 3, purpose: 'Rising', emotion: 'tension', beat: 'obstacles emerge' },
        { slide: 4, purpose: 'Climax', emotion: 'triumph', beat: 'breakthrough moment' },
        { slide: 5, purpose: 'Falling', emotion: 'relief', beat: 'transformation' },
        { slide: 6, purpose: 'Resolution', emotion: 'satisfaction', beat: 'new reality' },
        { slide: 7, purpose: 'CTA', emotion: 'inspiration', beat: 'their turn' },
      ],
      myth: [
        { slide: 1, purpose: 'Hook', emotion: 'intrigue', beat: 'myth stated' },
        { slide: 2, purpose: 'Reality 1', emotion: 'surprise', beat: 'why it is wrong' },
        { slide: 3, purpose: 'Reality 2', emotion: 'clarity', beat: 'what actually works' },
        { slide: 4, purpose: 'Proof', emotion: 'trust', beat: 'evidence' },
        { slide: 5, purpose: 'CTA', emotion: 'empowerment', beat: 'take action' },
      ],
    };
    
    return narratives[carouselType] || narratives.authority;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BRIEF TO NATURAL LANGUAGE
  // ═══════════════════════════════════════════════════════════════════════════════

  briefToDescription(brief, slideIndex = 0) {
    const narrative = brief.slideNarrative[slideIndex];
    const mood = brief.visualMood;
    
    return `Create a ${brief.artDirection} Instagram carousel slide for ${brief.brandName || 'a brand'}.

${mood.atmosphere} aesthetic. ${mood.lighting}.

This is slide ${slideIndex + 1} of ${brief.slideCount}: ${narrative?.purpose || 'Content'} — ${narrative?.beat || 'key message'}.

Topic: "${brief.topic}"
Emotional goal: ${brief.emotionalGoal}
${narrative ? `Slide purpose: ${narrative.purpose} (${narrative.emotion})` : ''}

${brief.brandColor ? `Brand color: ${brief.brandColor}` : ''}
${brief.instagramHandle ? `Instagram: ${brief.instagramHandle}` : ''}

${mood.reference} inspired. Premium Instagram-worthy composition with ${brief.whitespaceStyle} whitespace.`;
  }
}

export default CreativeBriefEngine;
