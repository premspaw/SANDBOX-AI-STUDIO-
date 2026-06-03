// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE NARRATIVE ENGINE — Maintains continuity and emotional progression
// Tracks emotional escalation, typography rhythm, and cinematic sequencing
// ═══════════════════════════════════════════════════════════════════════════════

export class SlideNarrativeEngine {
  constructor(brief) {
    this.brief = brief;
    this.slideCount = brief.slideCount;
    this.narrative = brief.slideNarrative;
    this.currentSlide = 0;
    
    // Track narrative state
    this.state = {
      emotionalIntensity: 0.3, // Starts low
      visualDensity: 0.4,
      typographyScale: 1.0,
      whitespace: 0.5,
      colorIntensity: 0.6,
    };
    
    // History for continuity
    this.history = [];
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // GET SLIDE CONTEXT — Returns full context for a specific slide
  // ═══════════════════════════════════════════════════════════════════════════════

  getSlideContext(slideIndex) {
    this.currentSlide = slideIndex;
    const narrative = this.narrative[slideIndex];
    
    // Calculate progression
    const progress = slideIndex / (this.slideCount - 1);
    const isHero = slideIndex === 0;
    const isCTA = slideIndex === this.slideCount - 1;
    const isMidpoint = slideIndex === Math.floor(this.slideCount / 2);
    
    // Update state based on narrative arc
    this.updateState(progress, narrative);
    
    // Build continuity context
    const context = {
      slideIndex,
      slideNumber: slideIndex + 1,
      totalSlides: this.slideCount,
      
      // Narrative
      purpose: narrative?.purpose || 'Content',
      emotion: narrative?.emotion || 'neutral',
      beat: narrative?.beat || 'information',
      
      // Positioning
      isHero,
      isCTA,
      isMidpoint,
      progress,
      
      // Current visual state
      emotionalIntensity: this.state.emotionalIntensity,
      visualDensity: this.state.visualDensity,
      typographyScale: this.state.typographyScale,
      whitespace: this.state.whitespace,
      colorIntensity: this.state.colorIntensity,
      
      // Continuity references
      previousSlide: this.getPreviousSlide(slideIndex),
      nextSlide: this.getNextSlide(slideIndex),
      
      // Pacing cue
      pacing: this.calculatePacing(slideIndex),
      
      // Visual continuity
      lighting: this.getLightingContinuity(),
      typographyEnergy: this.getTypographyContinuity(),
      colorBalance: this.getColorContinuity(),
    };
    
    // Add to history
    this.history.push({ slideIndex, context });
    
    return context;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPDATE STATE — Evolves visual/emotional state based on narrative position
  // ═══════════════════════════════════════════════════════════════════════════════

  updateState(progress, narrative) {
    const pacingCurve = this.brief.designDNA?.pacingCurve || 'rising';
    
    // Calculate base intensity from pacing curve
    const curves = {
      flat: 0.5,
      rising: Math.pow(progress, 1.5),
      wave: 0.5 + 0.5 * Math.sin(progress * Math.PI * 2),
      hook: progress < 0.15 ? 0.9 : 0.3 + progress * 0.7,
      reveal: 0.2 + progress * 0.8,
    };
    
    const baseIntensity = curves[pacingCurve] || curves.rising;
    
    // Adjust for slide-specific emotion
    const emotionModifiers = {
      curiosity: 0.6,
      empathy: 0.4,
      tension: 0.8,
      hope: 0.7,
      trust: 0.5,
      capability: 0.6,
      urgency: 1.0,
      triumph: 0.9,
      relief: 0.5,
      satisfaction: 0.6,
      inspiration: 0.8,
    };
    
    const emotionMod = emotionModifiers[narrative?.emotion] || 0.6;
    
    // Update state
    this.state.emotionalIntensity = Math.min(1, baseIntensity * emotionMod);
    this.state.visualDensity = 0.3 + (this.state.emotionalIntensity * 0.5);
    this.state.typographyScale = 0.8 + (this.state.emotionalIntensity * 0.6);
    this.state.whitespace = 1 - (this.state.emotionalIntensity * 0.5);
    this.state.colorIntensity = 0.5 + (this.state.emotionalIntensity * 0.5);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONTINUITY HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  getPreviousSlide(currentIndex) {
    if (currentIndex === 0) return null;
    return this.history.find(h => h.slideIndex === currentIndex - 1)?.context || null;
  }

  getNextSlide(currentIndex) {
    if (currentIndex >= this.slideCount - 1) return null;
    return this.narrative[currentIndex + 1] || null;
  }

  calculatePacing(slideIndex) {
    const progress = slideIndex / (this.slideCount - 1);
    
    if (progress < 0.2) return 'opening';
    if (progress < 0.4) return 'building';
    if (progress < 0.6) return 'rising';
    if (progress < 0.8) return 'climaxing';
    return 'resolving';
  }

  getLightingContinuity() {
    // Return consistent lighting description based on art direction
    const { artDirection, visualMood } = this.brief;
    
    const lightingMap = {
      cinematic: 'consistent dramatic lighting with subtle film grain',
      luxury: 'soft gold accent lighting throughout',
      apple: 'clean even lighting with subtle depth',
      streetwear: 'harsh urban contrast lighting',
      tech: 'cyan glow accents on dark canvas',
      futuristic: 'neon-noir atmospheric lighting',
      editorial: 'natural daylight editorial lighting',
      minimal: 'clean minimal lighting no shadows',
    };
    
    return lightingMap[artDirection] || visualMood?.lighting || 'consistent lighting';
  }

  getTypographyContinuity() {
    const { creativeDNA } = this.brief;
    
    const energy = creativeDNA?.typographyEnergy || 'bold';
    
    return `${energy} typography energy. Consistent type hierarchy across all slides.`;
  }

  getColorContinuity() {
    const { brandColor, artDirection } = this.brief;
    
    if (!brandColor) return 'neutral palette';
    
    return `consistent ${brandColor} accent throughout. ${artDirection} color treatment.`;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // NARRATIVE CONTINUITY TEXT — For prompt injection
  // ═══════════════════════════════════════════════════════════════════════════════

  getContinuityText(slideIndex) {
    const context = this.getSlideContext(slideIndex);
    const prev = context.previousSlide;
    
    let continuity = `Continuity: ${context.lighting}. ${context.typographyEnergy}. ${context.colorBalance}.`;
    
    if (prev) {
      continuity += ` Follows ${prev.purpose} slide (intensity: ${Math.round(prev.emotionalIntensity * 100)}%).`;
    }
    
    continuity += ` Current pacing: ${context.pacing} (intensity: ${Math.round(context.emotionalIntensity * 100)}%).`;
    
    return continuity;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // EMOTIONAL ARC DESCRIPTION
  // ═══════════════════════════════════════════════════════════════════════════════

  getEmotionalArcDescription() {
    const emotions = this.narrative.map((n, i) => ({
      slide: i + 1,
      purpose: n.purpose,
      emotion: n.emotion,
      intensity: Math.round((0.3 + (i / this.narrative.length) * 0.7) * 100),
    }));
    
    return `Emotional Arc: ${emotions.map(e => `${e.slide}.${e.emotion}`).join(' → ')}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // VISUAL RHYTHM PATTERN
  // ═══════════════════════════════════════════════════════════════════════════════

  getVisualRhythmPattern() {
    const pattern = this.narrative.map((n, i) => {
      const isPeak = i === 0 || i === this.narrative.length - 1 || i === Math.floor(this.narrative.length / 2);
      const density = isPeak ? 'high' : 'medium';
      const whitespace = isPeak ? 'generous' : 'standard';
      
      return { slide: i + 1, density, whitespace };
    });
    
    return `Visual Rhythm: ${pattern.map(p => `Slide ${p.slide} (${p.density}, ${p.whitespace})`).join(' → ')}`;
  }
}

export default SlideNarrativeEngine;
