// ═══════════════════════════════════════════════════════════════════════════════
// HERMES MEMORY SYSTEM — Persistent conversational memory for creative direction
// Remembers brand identity, visual preferences, and emotional patterns
// ═══════════════════════════════════════════════════════════════════════════════

export class HermesMemory {
  constructor(userId, brandId = null) {
    this.userId = userId;
    this.brandId = brandId;
    this.memory = this.load();
  }

  // Initialize or load existing memory
  load() {
    // In production, this would load from Supabase/localStorage
    // For now, return default structure
    return {
      brandIdentity: null,
      visualPreferences: null,
      emotionalPatterns: [],
      artDirectionHistory: [],
      successfulBriefs: [],
      creativeDNA: null,
      lastSession: null,
    };
  }

  // Save memory (placeholder for persistence)
  save() {
    // In production: save to Supabase
    console.log('[Hermes] Memory saved for user:', this.userId);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BRAND IDENTITY MEMORY
  // ═══════════════════════════════════════════════════════════════════════════════

  rememberBrandIdentity(brandData) {
    this.memory.brandIdentity = {
      name: brandData.name,
      whatTheyDo: brandData.whatTheyDo,
      color: brandData.color,
      handle: brandData.handle,
      voice: brandData.voice || 'professional',
      audience: brandData.audience,
      values: brandData.values || [],
      visualCharacter: brandData.visualCharacter,
      timestamp: Date.now(),
    };
    this.save();
  }

  getBrandIdentity() {
    return this.memory.brandIdentity;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // VISUAL PREFERENCES MEMORY
  // ═══════════════════════════════════════════════════════════════════════════════

  rememberVisualPreferences(prefs) {
    this.memory.visualPreferences = {
      preferredArtDirection: prefs.artDirection,
      typographyEnergy: prefs.typographyEnergy,
      cinematicIntensity: prefs.cinematicIntensity,
      whitespaceStyle: prefs.whitespaceStyle,
      colorApproach: prefs.colorApproach,
      iconStyle: prefs.iconStyle,
      successfulLayouts: prefs.successfulLayouts || [],
      timestamp: Date.now(),
    };
    this.save();
  }

  getVisualPreferences() {
    return this.memory.visualPreferences;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // EMOTIONAL PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════════

  rememberEmotionalPattern(pattern) {
    this.memory.emotionalPatterns.push({
      topic: pattern.topic,
      emotionalGoal: pattern.emotionalGoal,
      successful: pattern.successful,
      engagement: pattern.engagement,
      timestamp: Date.now(),
    });
    
    // Keep only last 20 patterns
    if (this.memory.emotionalPatterns.length > 20) {
      this.memory.emotionalPatterns = this.memory.emotionalPatterns.slice(-20);
    }
    this.save();
  }

  getEmotionalPatterns(topic = null) {
    if (!topic) return this.memory.emotionalPatterns;
    
    return this.memory.emotionalPatterns.filter(
      p => p.topic.toLowerCase().includes(topic.toLowerCase())
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATIVE DNA BUILDER
  // ═══════════════════════════════════════════════════════════════════════════════

  buildCreativeDNA(creativeBrief) {
    const brand = this.memory.brandIdentity;
    const visual = this.memory.visualPreferences;
    const patterns = this.getEmotionalPatterns(creativeBrief.topic);

    const dna = {
      // Brand essence
      brandMood: brand?.visualCharacter || 'professional',
      brandVoice: brand?.voice || 'confident',
      
      // Visual energy
      typographyEnergy: visual?.typographyEnergy || 'bold',
      cinematicIntensity: visual?.cinematicIntensity || 'balanced',
      whitespaceStyle: visual?.whitespaceStyle || 'editorial',
      
      // Emotional intelligence
      emotionalTone: creativeBrief.emotionalGoal || 'engaging',
      pacingStyle: this.inferPacingStyle(patterns, creativeBrief.topic),
      
      // Art direction
      preferredArtDirection: visual?.preferredArtDirection || 
                             this.inferArtDirection(creativeBrief.topic),
      
      // Learned preferences
      visualIntensity: visual?.cinematicIntensity || 'balanced',
      
      // Storytelling style based on patterns
      storytellingStyle: this.inferStorytellingStyle(patterns),
      
      // CTA style from brand memory
      ctaStyle: brand?.ctaStyle || 'direct',
      
      // Timestamp
      generatedAt: Date.now(),
    };

    this.memory.creativeDNA = dna;
    this.save();
    
    return dna;
  }

  getCreativeDNA() {
    return this.memory.creativeDNA;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // INTELLIGENT INFERENCE
  // ═══════════════════════════════════════════════════════════════════════════════

  inferPacingStyle(patterns, topic) {
    if (patterns.length === 0) return 'rising';
    
    // Find most successful pattern for this topic
    const successful = patterns.filter(p => p.successful);
    if (successful.length === 0) return 'rising';
    
    // Return most common emotional goal from successful patterns
    const goals = successful.map(p => p.emotionalGoal);
    return this.mode(goals) || 'rising';
  }

  inferArtDirection(topic) {
    const topicLower = (topic || '').toLowerCase();
    
    const mappings = {
      finance: 'luxury',
      ai: 'futuristic',
      tech: 'tech',
      startup: 'apple',
      film: 'cinematic',
      fashion: 'editorial',
      fitness: 'streetwear',
      wellness: 'minimal',
    };
    
    for (const [key, value] of Object.entries(mappings)) {
      if (topicLower.includes(key)) return value;
    }
    
    return 'cinematic';
  }

  inferStorytellingStyle(patterns) {
    if (patterns.length < 3) return 'standard';
    
    // Analyze emotional arc patterns
    const arcs = patterns.map(p => p.emotionalGoal);
    const uniqueArcs = [...new Set(arcs)];
    
    if (uniqueArcs.length > 5) return 'dynamic';
    if (patterns.filter(p => p.engagement > 0.8).length > 5) return 'viral';
    
    return 'standard';
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════════════════════════════════════════

  mode(arr) {
    if (arr.length === 0) return null;
    
    const counts = {};
    let maxCount = 0;
    let maxItem = null;
    
    for (const item of arr) {
      counts[item] = (counts[item] || 0) + 1;
      if (counts[item] > maxCount) {
        maxCount = counts[item];
        maxItem = item;
      }
    }
    
    return maxItem;
  }

  // Remember a successful creative brief
  rememberSuccessfulBrief(brief, metrics = {}) {
    this.memory.successfulBriefs.push({
      brief,
      metrics,
      timestamp: Date.now(),
    });
    
    // Keep only last 10
    if (this.memory.successfulBriefs.length > 10) {
      this.memory.successfulBriefs = this.memory.successfulBriefs.slice(-10);
    }
    
    this.save();
  }

  // Get similar successful briefs
  getSimilarBriefs(topic, limit = 3) {
    return this.memory.successfulBriefs
      .filter(b => b.brief.topic.toLowerCase().includes(topic.toLowerCase()))
      .slice(0, limit);
  }

  // Update last session
  updateLastSession(data) {
    this.memory.lastSession = {
      timestamp: Date.now(),
      ...data,
    };
    this.save();
  }
}

// Singleton instance for current session
let currentHermes = null;

export function getHermes(userId, brandId) {
  if (!currentHermes || currentHermes.userId !== userId) {
    currentHermes = new HermesMemory(userId, brandId);
  }
  return currentHermes;
}

export default HermesMemory;
