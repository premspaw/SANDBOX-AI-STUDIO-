// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT COMPILER — Compresses cinematic briefs into optimized AI prompts
// Priority: emotion > art direction > topic > composition > branding > typography > technical
// ═══════════════════════════════════════════════════════════════════════════════

export class PromptCompiler {
  constructor() {
    this.maxLength = 1500; // Target prompt length
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN COMPILE FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════════

  compile(brief, slideIndex = 0) {
    const parts = [];
    const priority = this.calculatePriority(brief, slideIndex);

    // 1. EMOTION (Highest priority)
    parts.push(this.compileEmotion(brief, priority));

    // 2. ART DIRECTION
    parts.push(this.compileArtDirection(brief));

    // 3. TOPIC & PURPOSE
    parts.push(this.compileTopic(brief, slideIndex));

    // 4. COMPOSITION INTENT
    parts.push(this.compileComposition(brief, slideIndex));

    // 5. BRANDING
    parts.push(this.compileBranding(brief));

    // 6. TYPOGRAPHY HINTS (Low priority)
    if (priority >= 5) {
      parts.push(this.compileTypography(brief));
    }

    // 7. TECHNICAL (Lowest priority, minimal)
    if (priority >= 6) {
      parts.push(this.compileTechnical());
    }

    // Join and clean
    let prompt = parts.filter(Boolean).join(' ');
    
    // Post-process
    prompt = this.deduplicate(prompt);
    prompt = this.compress(prompt);
    prompt = this.trimToLength(prompt, this.maxLength);

    return prompt;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIORITY CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════════

  calculatePriority(brief, slideIndex) {
    // Higher priority for hero and CTA slides
    if (slideIndex === 0) return 7; // Hero needs full detail
    if (slideIndex === brief.slideCount - 1) return 6; // CTA important
    if (slideIndex === Math.floor(brief.slideCount / 2)) return 5; // Midpoint
    return 4; // Standard slides get compressed
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPILE: EMOTION (Priority 1)
  // ═══════════════════════════════════════════════════════════════════════════════

  compileEmotion(brief, priority) {
    const { emotionalGoal, visualMood } = brief;
    const narrative = brief.slideNarrative[brief.slideIndex || 0];
    
    // Core emotional instruction
    let emotion = `Create a ${emotionalGoal} Instagram carousel slide.`;
    
    // Add mood description for high priority
    if (priority >= 5) {
      emotion += ` ${visualMood.emotion}.`;
    }
    
    // Add slide-specific emotion
    if (narrative) {
      emotion += ` This slide should evoke ${narrative.emotion}.`;
    }

    return emotion;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPILE: ART DIRECTION (Priority 2)
  // ═══════════════════════════════════════════════════════════════════════════════

  compileArtDirection(brief) {
    const { artDirection, visualMood } = brief;
    
    const directions = {
      cinematic: `${visualMood.atmosphere}. ${visualMood.lighting}. A24-inspired cinematic quality.`,
      luxury: `${visualMood.atmosphere}. ${visualMood.lighting}. Premium brand aesthetic.`,
      apple: `${visualMood.atmosphere}. ${visualMood.lighting}. Keynote presentation precision.`,
      streetwear: `${visualMood.atmosphere}. ${visualMood.lighting}. Raw urban energy.`,
      tech: `${visualMood.atmosphere}. ${visualMood.lighting}. SaaS product excellence.`,
      futuristic: `${visualMood.atmosphere}. ${visualMood.lighting}. Forward-thinking aesthetic.`,
      editorial: `${visualMood.atmosphere}. ${visualMood.lighting}. Magazine-quality layout.`,
      minimal: `${visualMood.atmosphere}. ${visualMood.lighting}. Essential purity.`,
    };

    return directions[artDirection] || directions.cinematic;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPILE: TOPIC (Priority 3)
  // ═══════════════════════════════════════════════════════════════════════════════

  compileTopic(brief, slideIndex) {
    const { topic, brandName, slideNarrative } = brief;
    const narrative = slideNarrative[slideIndex];
    
    let topicStr = `Topic: "${topic}"`;
    
    if (brandName) {
      topicStr += ` for ${brandName}.`;
    }
    
    if (narrative) {
      topicStr += ` Slide ${slideIndex + 1}: ${narrative.purpose} — ${narrative.beat}.`;
    }

    return topicStr;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPILE: COMPOSITION (Priority 4)
  // ═══════════════════════════════════════════════════════════════════════════════

  compileComposition(brief, slideIndex) {
    const { designDNA, whitespaceStyle, visualMood } = brief;
    const isHero = slideIndex === 0;
    const isCTA = slideIndex === brief.slideCount - 1;
    
    let composition = '';
    
    if (isHero) {
      composition = 'Hero slide: bold headline with dramatic negative space. Single focal point. Maximum visual impact.';
    } else if (isCTA) {
      composition = 'CTA slide: clear call-to-action isolated on spacious layout. Decisive, urgent energy.';
    } else {
      composition = `${whitespaceStyle} whitespace composition. ${visualMood.whitespace || 'balanced'} layout.`;
    }

    return composition;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPILE: BRANDING (Priority 5)
  // ═══════════════════════════════════════════════════════════════════════════════

  compileBranding(brief) {
    const { brandColor, instagramHandle, brandVoice } = brief;
    
    let branding = '';
    
    if (brandColor) {
      branding += `Brand color: ${brandColor}. `;
    }
    
    if (instagramHandle) {
      branding += `Handle: ${instagramHandle}. `;
    }
    
    if (brandVoice) {
      branding += `Voice: ${brandVoice}.`;
    }

    return branding.trim();
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPILE: TYPOGRAPHY (Priority 6 - only for high priority slides)
  // ═══════════════════════════════════════════════════════════════════════════════

  compileTypography(brief) {
    const { designDNA, creativeDNA } = brief;
    
    const energy = creativeDNA?.typographyEnergy || 'bold';
    
    const typographyHints = {
      whisper: 'Light, delicate typography. Elegant, refined text treatment.',
      speak: 'Clear, readable typography. Professional text hierarchy.',
      shout: 'Bold, confident typography. Strong headline presence.',
      scream: 'Heavy, dominant typography. Maximum text impact.',
    };

    return typographyHints[energy] || typographyHints.shout;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPILE: TECHNICAL (Priority 7 - minimal, only when needed)
  // ═══════════════════════════════════════════════════════════════════════════════

  compileTechnical() {
    // Minimal technical guidance - AI should figure out the rest
    return '1080×1350px. Instagram-native. Keep text 60px from edges.';
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // POST-PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════════

  deduplicate(prompt) {
    // Remove duplicate phrases
    const phrases = prompt.split(/[.!?]+/).filter(Boolean);
    const seen = new Set();
    const unique = [];
    
    for (const phrase of phrases) {
      const normalized = phrase.trim().toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(phrase.trim());
      }
    }
    
    return unique.join('. ') + '.';
  }

  compress(prompt) {
    // Remove fluff words and redundant phrases
    const fluff = [
      /\bvery\b/gi,
      /\breally\b/gi,
      /\bjust\b/gi,
      /\bmake sure\b/gi,
      /\bensure that\b/gi,
      /\btry to\b/gi,
      /\bshould be\b/gi,
      /\bneeds to be\b/gi,
    ];
    
    let compressed = prompt;
    for (const pattern of fluff) {
      compressed = compressed.replace(pattern, '');
    }
    
    // Clean up double spaces
    compressed = compressed.replace(/\s+/g, ' ').trim();
    
    return compressed;
  }

  trimToLength(prompt, maxLength) {
    if (prompt.length <= maxLength) return prompt;
    
    // Smart truncation - try to end at a sentence
    let trimmed = prompt.substring(0, maxLength);
    const lastSentence = trimmed.lastIndexOf('.');
    
    if (lastSentence > maxLength * 0.8) {
      trimmed = trimmed.substring(0, lastSentence + 1);
    }
    
    return trimmed;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BATCH COMPILE FOR ALL SLIDES
  // ═══════════════════════════════════════════════════════════════════════════════

  compileAll(brief) {
    const prompts = [];
    
    for (let i = 0; i < brief.slideCount; i++) {
      // Create slide-specific brief
      const slideBrief = {
        ...brief,
        slideIndex: i,
      };
      
      prompts.push({
        slideIndex: i,
        slidePurpose: brief.slideNarrative[i]?.purpose || 'Content',
        prompt: this.compile(slideBrief, i),
      });
    }
    
    return prompts;
  }
}

export default PromptCompiler;
