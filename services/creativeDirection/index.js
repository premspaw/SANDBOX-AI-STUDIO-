// ═══════════════════════════════════════════════════════════════════════════════
// CREATIVE DIRECTION ENGINE — Main orchestrator for AI Creative Direction
// Transforms user intent into cinematic carousel experiences
// ═══════════════════════════════════════════════════════════════════════════════

import { HermesMemory, getHermes } from './hermesMemory.js';
import { CreativeBriefEngine } from './creativeBriefEngine.js';
import { PromptCompiler } from './promptCompiler.js';
import { SlideNarrativeEngine } from './slideNarrative.js';
import { buildDNAFromBrief, detectArtDirection } from './designDNA.js';

export class CreativeDirectionEngine {
  constructor(userId, brandId = null) {
    this.hermes = getHermes(userId, brandId);
    this.briefEngine = new CreativeBriefEngine(this.hermes);
    this.promptCompiler = new PromptCompiler();
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN ENTRY: Generate complete creative direction for a carousel
  // ═══════════════════════════════════════════════════════════════════════════════

  async createCreativeDirection(input) {
    // Step 1: Generate creative brief
    const brief = this.briefEngine.generateBrief(input);
    
    // Step 2: Initialize narrative engine
    const narrativeEngine = new SlideNarrativeEngine(brief);
    
    // Step 3: Compile prompts for all slides
    const slides = [];
    
    for (let i = 0; i < brief.slideCount; i++) {
      // Get slide context with continuity
      const context = narrativeEngine.getSlideContext(i);
      
      // Compile optimized prompt
      const slideBrief = { ...brief, slideIndex: i, context };
      const prompt = this.promptCompiler.compile(slideBrief, i);
      
      // Add continuity injection for GPT Image
      const continuity = narrativeEngine.getContinuityText(i);
      const finalPrompt = `${prompt} ${continuity}`;
      
      slides.push({
        index: i,
        purpose: context.purpose,
        emotion: context.emotion,
        prompt: finalPrompt,
        context,
      });
    }

    // Step 4: Build creative direction package
    const creativeDirection = {
      // Metadata
      id: `cd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      
      // Core brief
      brief,
      
      // Creative DNA
      creativeDNA: brief.creativeDNA,
      designDNA: brief.designDNA,
      
      // Slide-level direction
      slides,
      
      // Narrative summary
      narrative: {
        emotionalArc: narrativeEngine.getEmotionalArcDescription(),
        visualRhythm: narrativeEngine.getVisualRhythmPattern(),
        totalIntensity: slides.reduce((sum, s) => sum + s.context.emotionalIntensity, 0) / slides.length,
      },
      
      // Continuity markers
      continuity: {
        lighting: narrativeEngine.getLightingContinuity(),
        typography: narrativeEngine.getTypographyContinuity(),
        color: narrativeEngine.getColorContinuity(),
      },
      
      // System references
      systems: {
        hermes: this.hermes.getCreativeDNA(),
        artDirection: brief.artDirection,
        visualMood: brief.visualMood,
      },
    };

    // Remember this brief in Hermes memory
    this.hermes.rememberSuccessfulBrief(brief);
    
    return creativeDirection;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // QUICK GENERATE: For streamlined workflow
  // ═══════════════════════════════════════════════════════════════════════════════

  async quickGenerate({
    topic,
    brandName,
    audience,
    emotionalGoal = 'engaging',
    artDirection = null,
    carouselType = 'authority',
    brandColor = null,
  }) {
    const creativeDirection = await this.createCreativeDirection({
      topic,
      brandName,
      audience,
      emotionalGoal,
      artDirection,
      carouselType,
      brandColor,
    });

    // Return simplified output
    return {
      brief: {
        topic: creativeDirection.brief.topic,
        brandName: creativeDirection.brief.brandName,
        artDirection: creativeDirection.brief.artDirection,
        emotionalGoal: creativeDirection.brief.emotionalGoal,
        visualMood: creativeDirection.brief.visualMood,
      },
      prompts: creativeDirection.slides.map(s => ({
        slide: s.index + 1,
        purpose: s.purpose,
        emotion: s.emotion,
        prompt: s.prompt,
      })),
      dna: creativeDirection.creativeDNA,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MEMORY INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════════

  rememberBrand(brandData) {
    this.hermes.rememberBrandIdentity(brandData);
  }

  rememberVisualPreferences(prefs) {
    this.hermes.rememberVisualPreferences(prefs);
  }

  getCreativeDNA() {
    return this.hermes.getCreativeDNA();
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SYSTEM STATUS
  // ═══════════════════════════════════════════════════════════════════════════════

  getStatus() {
    return {
      hermesActive: !!this.hermes,
      brandMemory: !!this.hermes.getBrandIdentity(),
      visualMemory: !!this.hermes.getVisualPreferences(),
      creativeDNA: this.hermes.getCreativeDNA(),
    };
  }
}

// Factory function
export function createCreativeDirector(userId, brandId) {
  return new CreativeDirectionEngine(userId, brandId);
}

// Import and re-export HermesAgent (chat system)
import { HermesAgent } from './chatSystem.js';

// Export all subsystems
export {
  HermesMemory,
  getHermes,
  CreativeBriefEngine,
  PromptCompiler,
  SlideNarrativeEngine,
  buildDNAFromBrief,
  detectArtDirection,
  HermesAgent,
};

export default CreativeDirectionEngine;
