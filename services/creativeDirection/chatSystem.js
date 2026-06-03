// ═══════════════════════════════════════════════════════════════════════════════
// HERMES AGENT — Full autonomous creative director with memory and tool calling
// Acts like a chatbot agent, not just a form collector
// ═══════════════════════════════════════════════════════════════════════════════

import { CreativeDirectionEngine } from './index.js';

// In-memory storage (use localStorage/Supabase in production)
const hermesMemory = new Map();

export class HermesAgent {
  constructor(userId, brandId = null) {
    this.userId = userId;
    this.brandId = brandId;
    this.engine = new CreativeDirectionEngine(userId, brandId);
    this.memoryKey = `hermes_${userId}_${brandId || 'default'}`;
    
    // Load or initialize memory
    this.memory = this.loadMemory();
    
    // Conversation state
    this.conversation = [];
    this.collectedData = {};
    this.state = 'idle'; // idle | exploring | gathering | proposing | ready | generating
    this.confidence = 0;
    this.maxTurns = 0;
    
    // Tool registry
    this.tools = {
      detectTopic: this.toolDetectTopic.bind(this),
      detectArtDirection: this.toolDetectArtDirection.bind(this),
      detectEmotion: this.toolDetectEmotion.bind(this),
      detectBrand: this.toolDetectBrand.bind(this),
      detectAudience: this.toolDetectAudience.bind(this),
      suggestArtDirection: this.toolSuggestArtDirection.bind(this),
      compareToPastBriefs: this.toolCompareToPastBriefs.bind(this),
      buildCreativeBrief: this.toolBuildCreativeBrief.bind(this),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MEMORY SYSTEM — Persistent storage
  // ═══════════════════════════════════════════════════════════════════════════════

  loadMemory() {
    if (hermesMemory.has(this.memoryKey)) {
      return hermesMemory.get(this.memoryKey);
    }
    return {
      userId: this.userId,
      brandId: this.brandId,
      brandIdentities: [],
      pastBriefs: [],
      visualPreferences: null,
      emotionalPatterns: [],
      conversationHistory: [],
      createdAt: Date.now(),
    };
  }

  saveMemory() {
    hermesMemory.set(this.memoryKey, this.memory);
    // In production: also save to localStorage or Supabase
    console.log(`[Hermes] Memory saved for ${this.memoryKey}`);
  }

  rememberBrand(brandData) {
    const existing = this.memory.brandIdentities.find(b => b.name === brandData.name);
    if (!existing) {
      this.memory.brandIdentities.push({
        ...brandData,
        firstSeen: Date.now(),
      });
    } else {
      existing.lastSeen = Date.now();
      existing.seenCount = (existing.seenCount || 1) + 1;
    }
    this.saveMemory();
  }

  rememberBrief(brief) {
    this.memory.pastBriefs.push({
      brief,
      timestamp: Date.now(),
    });
    // Keep last 20
    if (this.memory.pastBriefs.length > 20) {
      this.memory.pastBriefs = this.memory.pastBriefs.slice(-20);
    }
    this.saveMemory();
  }

  getSimilarBriefs(topic, limit = 3) {
    const topicLower = topic.toLowerCase();
    return this.memory.pastBriefs
      .filter(b => b.brief.topic.toLowerCase().includes(topicLower) ||
                   topicLower.includes(b.brief.topic.toLowerCase()))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HERMES PERSONALITY — Chat behavior
  // ═══════════════════════════════════════════════════════════════════════════════

  getPersonality() {
    const memory = this.memory;
    const briefCount = memory.pastBriefs.length;
    
    return {
      tone: briefCount > 5 ? 'familiar' : 'welcoming',
      references: memory.pastBriefs.length > 0,
      knowsUser: memory.brandIdentities.length > 0,
      style: memory.visualPreferences?.tone || 'creative-director',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SYSTEM PROMPT — Agent with memory awareness
  // ═══════════════════════════════════════════════════════════════════════════════

  getSystemPrompt() {
    const personality = this.getPersonality();
    const lastBrief = this.memory.pastBriefs[this.memory.pastBriefs.length - 1];
    const knownBrands = this.memory.brandIdentities.slice(0, 3).map(b => b.name).join(', ');
    
    return `You are Hermes — an AI Creative Director for Instagram carousels.

CONTEXT:
- User has created ${this.memory.pastBriefs.length} carousels with you
${knownBrands ? `- Known brands: ${knownBrands}` : ''}
${lastBrief ? `- Last carousel: "${lastBrief.brief.topic}" (${lastBrief.brief.artDirection})` : ''}

BEHAVIOR (Act like an agent, not a form):
- Be conversational and warm. Use phrases like "I was thinking...", "What if we..."
- If you recognize the brand/topic from memory, reference it naturally
- Don't ask obvious questions if you can infer from context
- Proactively suggest art directions and approaches
- Share your reasoning — "Since this is about AI, I'm thinking cinematic futuristic..."
- When confident, take initiative: "I'll set the art direction to X — feel free to change it"

INTELLIGENT DATA GATHERING:
- Topic: Essential. If not clear, ask naturally.
- Brand: Check memory first. If mentioned, confirm quickly.
- Audience: Often infer from topic. Ask only if unclear.
- Emotional Goal: Suggest based on topic. "This feels like it should be inspiring..."
- Art Direction: PROACTIVELY suggest based on topic analysis

MEMORY REFERENCES (use naturally, don't be robotic):
- "Last time you did a cinematic carousel, it performed great. Want that energy again?"
- "I see you've worked with ZeroLens before — should I use that brand voice?"
- "Based on your past briefs, luxury aesthetic seems to fit your style"

AGENT ACTIONS:
When you have enough confidence (>70%), output a creative brief action:

{
  "action": "generateBrief",
  "creativeBrief": {
    "topic": "...",
    "brandName": "...",
    "audience": "...",
    "emotionalGoal": "...",
    "artDirection": "...",
    "cta": "..."
  },
  "reasoning": "I chose X because Y..."
}

When uncertain, ask a focused question:
{
  "action": "askQuestion",
  "question": "What specific insight about AI filmmaking?",
  "reasoning": "Need more context to nail the angle"
}

You are a creative partner, not a survey. Be proactive, opinionated, and helpful.`;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // AGENT PROCESSING — Think, Act, Respond
  // ═══════════════════════════════════════════════════════════════════════════════

  async processMessage(userMessage) {
    this.maxTurns++;
    
    // 1. Store in memory
    this.conversation.push({ role: 'user', content: userMessage, timestamp: Date.now() });
    this.memory.conversationHistory.push({ role: 'user', content: userMessage, timestamp: Date.now() });
    
    // 2. THINK: Analyze what we know
    const context = this.analyzeContext(userMessage);
    
    // 3. ACT: Run tools based on analysis
    const toolResults = await this.runTools(context);
    
    // 4. DECIDE: What should Hermes do?
    const decision = this.makeDecision(context, toolResults);
    
    // 5. RESPOND: Generate agent response
    return this.generateAgentResponse(decision, context, toolResults);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // AGENT ANALYSIS — Understand the current state
  // ═══════════════════════════════════════════════════════════════════════════════

  analyzeContext(message) {
    const lowerMsg = message.toLowerCase();
    const detectedTopic = this.tools.detectTopic(message);
    const detectedBrand = this.tools.detectBrand(message);
    
    return {
      message,
      hasTopic: !!this.collectedData.topic || !!detectedTopic,
      hasBrand: !!this.collectedData.brandName || !!detectedBrand,
      hasAudience: !!this.collectedData.audience || !!this.tools.detectAudience(message),
      hasEmotion: !!this.collectedData.emotionalGoal || !!this.tools.detectEmotion(message),
      hasArtDirection: !!this.collectedData.artDirection || !!this.tools.detectArtDirection(message),
      detectedTopic,
      detectedBrand,
      similarBriefs: detectedTopic ? this.getSimilarBriefs(detectedTopic) : [],
      isConfirmation: lowerMsg.includes('yes') || lowerMsg.includes('sure') || lowerMsg.includes('go'),
      isCorrection: lowerMsg.includes('no') || lowerMsg.includes('actually') || lowerMsg.includes('instead'),
      isVague: message.length < 10,
      confidence: this.calculateConfidence(),
    };
  }

  calculateConfidence() {
    let score = 0;
    if (this.collectedData.topic) score += 30;
    if (this.collectedData.brandName || this.memory.brandIdentities.length > 0) score += 20;
    if (this.collectedData.audience) score += 20;
    if (this.collectedData.emotionalGoal) score += 20;
    if (this.collectedData.artDirection) score += 10;
    return score;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TOOL RUNNER — Execute agent tools
  // ═══════════════════════════════════════════════════════════════════════════════

  async runTools(context) {
    const results = {};
    
    // Only run tools if we don't already have the data
    if (!this.collectedData.topic && context.detectedTopic) {
      results.topicDetected = context.detectedTopic;
      this.collectedData.topic = context.detectedTopic;
    }
    
    if (!this.collectedData.brandName && context.detectedBrand) {
      results.brandDetected = context.detectedBrand;
      // Check if brand exists in memory
      const knownBrand = this.memory.brandIdentities.find(b => 
        b.name.toLowerCase() === context.detectedBrand.toLowerCase()
      );
      if (knownBrand) {
        results.knownBrand = knownBrand;
      }
      this.collectedData.brandName = context.detectedBrand;
    }
    
    if (!this.collectedData.audience && context.detectedTopic) {
      results.audienceSuggestion = this.tools.detectAudience(context.detectedTopic);
      this.collectedData.audience = results.audienceSuggestion;
    }
    
    // Only suggest art direction if user hasn't EXPLICITLY stated one
    // context.hasArtDirection is true when user mentions art direction in their message
    if (!this.collectedData.artDirection && !context.hasArtDirection && context.detectedTopic) {
      results.artDirectionSuggestion = this.tools.suggestArtDirection(context.detectedTopic);
      this.collectedData.artDirection = results.artDirectionSuggestion.direction;
    }
    
    if (!this.collectedData.emotionalGoal && context.detectedTopic) {
      results.emotionSuggestion = this.tools.detectEmotion(context.detectedTopic);
      this.collectedData.emotionalGoal = results.emotionSuggestion;
    }
    
    if (context.similarBriefs.length > 0) {
      results.pastBriefs = context.similarBriefs;
    }
    
    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // AGENT DECISION — Decide what to do next
  // ═══════════════════════════════════════════════════════════════════════════════

  makeDecision(context, toolResults) {
    const confidence = this.calculateConfidence();
    
    // High confidence + user confirmation = generate
    if (confidence >= 70 && context.isConfirmation) {
      return { action: 'generateBrief', confidence };
    }
    
    // High confidence, no objections = propose brief
    if (confidence >= 70 && this.maxTurns >= 2) {
      return { action: 'proposeBrief', confidence };
    }
    
    // User correcting us = acknowledge and adjust
    if (context.isCorrection) {
      return { action: 'acknowledgeCorrection', confidence };
    }
    
    // Missing critical data = ask naturally
    if (!context.hasTopic) {
      return { action: 'askTopic', confidence };
    }
    
    if (!context.hasAudience && this.maxTurns >= 1) {
      return { action: 'askAudience', confidence };
    }
    
    // Default: gather more info conversationally
    return { action: 'explore', confidence };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // AGENT RESPONSE GENERATOR — Natural chatbot responses
  // ═══════════════════════════════════════════════════════════════════════════════

  generateAgentResponse(decision, context, toolResults) {
    const personality = this.getPersonality();
    const responses = {
      generateBrief: () => this.doGenerateBrief(decision.confidence),
      proposeBrief: () => this.doProposeBrief(decision.confidence, toolResults),
      acknowledgeCorrection: () => this.doAcknowledgeCorrection(context),
      askTopic: () => this.doAskTopic(),
      askAudience: () => this.doAskAudience(),
      explore: () => this.doExplore(context, toolResults),
    };
    
    return responses[decision.action]?.() || this.doExplore(context, toolResults);
  }

  doGenerateBrief(confidence) {
    return this.generateCreativeBrief();
  }

  doProposeBrief(confidence, toolResults) {
    const brief = {
      topic: this.collectedData.topic,
      brandName: this.collectedData.brandName,
      audience: this.collectedData.audience,
      emotionalGoal: this.collectedData.emotionalGoal,
      artDirection: this.collectedData.artDirection,
      cta: this.collectedData.cta || 'DM for more info',
    };
    
    // Reference past work if relevant
    let memoryRef = '';
    if (toolResults.pastBriefs?.length > 0) {
      const past = toolResults.pastBriefs[0];
      memoryRef = `\n\n(I remember you did "${past.brief.topic}" before — similar energy?)`;
    }
    
    // Reference known brand
    let brandRef = '';
    if (toolResults.knownBrand) {
      brandRef = `\n\n(Using ${toolResults.knownBrand.name} from your brand memory ✓)`;
    }
    
    const content = `I think I've got it! Here's what I'm envisioning:

**${brief.topic}** — ${brief.artDirection} aesthetic for ${brief.audience}.

The vibe: **${brief.emotionalGoal}** with ${brief.artDirection} visual direction.${memoryRef}${brandRef}

Sound right? Just say **"yes"** and I'll build the carousel, or tell me what to adjust.`;
    
    return {
      type: 'proposal',
      content,
      brief,
      confidence,
    };
  }

  doAcknowledgeCorrection(context) {
    const corrections = [
      "Got it, let me adjust...",
      "My bad! Updating that now...",
      "Thanks for the correction — fixing it...",
    ];
    
    // Clear the incorrect data to re-detect
    if (context.message.includes('brand')) {
      this.collectedData.brandName = null;
    }
    if (context.message.includes('topic')) {
      this.collectedData.topic = null;
    }
    
    return {
      type: 'acknowledgment',
      content: corrections[Math.floor(Math.random() * corrections.length)],
    };
  }

  doAskTopic() {
    const openers = [
      "What story or insight are you sharing?",
      "What's the carousel about?",
      "What topic should this cover?",
      "What do you want people to learn?",
    ];
    
    return {
      type: 'question',
      content: openers[Math.floor(Math.random() * openers.length)],
    };
  }

  doAskAudience() {
    const questions = [
      `Who's this for? What do they care about?`,
      `Who's your ideal viewer for "${this.collectedData.topic}"?`,
      `What audience needs to see this?`,
    ];
    
    return {
      type: 'question',
      content: questions[Math.floor(Math.random() * questions.length)],
    };
  }

  doExplore(context, toolResults) {
    // If we detected a topic, share our thinking
    if (context.detectedTopic && !context.hasTopic) {
      return {
        type: 'thinking',
        content: `I'm hearing something about **${context.detectedTopic}** — is that right? And what specific angle or insight are you sharing?`,
      };
    }
    
    // If we have a topic, share art direction suggestion
    if (context.hasTopic && toolResults.artDirectionSuggestion) {
      const { direction, reason } = toolResults.artDirectionSuggestion;
      return {
        type: 'suggestion',
        content: `For "${this.collectedData.topic}", I'm thinking **${direction}** visual direction — ${reason}\n\nDoes that feel right? Or do you want to try something different?`,
      };
    }
    
    // Default exploration
    return {
      type: 'explore',
      content: "Tell me more — what's the core insight or story you're sharing?",
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // GENERATE CREATIVE BRIEF
  // ═══════════════════════════════════════════════════════════════════════════════

  async generateCreativeBrief() {
    this.state = 'generating';

    // Auto-detect art direction if not provided
    if (!this.collectedData.artDirection) {
      const detected = this.engine.briefEngine.inferArtDirection(this.collectedData.topic);
      this.collectedData.artDirection = detected;
    }

    // Generate creative direction
    const creativeDirection = await this.engine.createCreativeDirection({
      topic: this.collectedData.topic,
      brandName: this.collectedData.brandName,
      audience: this.collectedData.audience,
      emotionalGoal: this.collectedData.emotionalGoal,
      artDirection: this.collectedData.artDirection,
      carouselType: 'authority',
      brandColor: this.collectedData.brandColor,
    });

    // Build response
    return {
      type: 'brief',
      content: this.formatBriefResponse(creativeDirection),
      creativeDirection,
      brief: {
        topic: this.collectedData.topic,
        brandName: this.collectedData.brandName,
        audience: this.collectedData.audience,
        emotionalGoal: this.collectedData.emotionalGoal,
        artDirection: this.collectedData.artDirection,
        cta: this.collectedData.cta,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // FORMAT BRIEF FOR DISPLAY
  // ═══════════════════════════════════════════════════════════════════════════════

  formatBriefResponse(direction) {
    const { brief, slides, creativeDNA } = direction;
    
    let response = `✨ **Creative Brief Generated!**

**${brief.brandName || 'Your Brand'}** — ${brief.topic}

**Visual Direction:** ${brief.artDirection} (${brief.visualMood.atmosphere})
**Emotional Goal:** ${brief.emotionalGoal}
**Typography Energy:** ${creativeDNA.typographyEnergy}

---

**Slide Narrative:**
`;

    slides.forEach((slide, i) => {
      response += `${i + 1}. **${slide.purpose}** — ${slide.emotion}\n`;
    });

    response += `
---

Ready to generate ${slides.length} cinematic slides. Each will be crafted with:
- ${brief.visualMood.lighting}
- ${creativeDNA.whitespaceStyle} whitespace
- ${creativeDNA.pacingStyle} pacing

**Click Generate to create your carousel!**`;

    return response;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TOOL IMPLEMENTATIONS — Agent capabilities
  // ═══════════════════════════════════════════════════════════════════════════════

  toolDetectTopic(message) {
    const lower = message.toLowerCase().trim();
    
    // 1. Check for explicit patterns first
    const patterns = [
      /about\s+(.{3,100})/i,
      /on\s+(.{3,100})/i,
      /create\s+(?:a|an)?\s+carousel\s+(?:about|on)?\s*(.{3,100})/i,
      /make\s+(?:a|an)?\s+carousel\s+(?:about|on)?\s*(.{3,100})/i,
      /topic[:\s]+(.{3,100})/i,
      /(?:for|on|about)\s+the\s+topic\s+(?:of\s+)?(.{3,100})/i,
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim().replace(/[.!?]$/, '');
      }
    }
    
    // 2. Check if message IS a topic (short, substantive phrase)
    // Ignore greetings, questions, confirmations
    const ignoreWords = ['yes', 'no', 'sure', 'ok', 'hello', 'hi', 'hey', 'thanks', 'thank you'];
    const isQuestion = /\?$/.test(message) || /^(what|how|why|where|when|who|can|could|would|will|is|are|do|does)/i.test(lower);
    
    if (!isQuestion && !ignoreWords.includes(lower) && message.length >= 5 && message.length <= 100) {
      // Check it has substance (not just filler words)
      const fillerWords = ['the', 'a', 'an', 'this', 'that', 'it', 'is', 'are', 'was', 'be'];
      const words = lower.split(/\s+/).filter(w => w.length > 2 && !fillerWords.includes(w));
      if (words.length >= 2) {
        return message.trim().replace(/[.!?]$/, '');
      }
    }
    
    return null;
  }

  toolDetectBrand(message) {
    // Look for brand name mentions
    const patterns = [
      /for\s+([A-Z][a-zA-Z0-9\s]{2,30})(?:\.|,|\s+about|\s+–)/,
      /brand[:\s]+([A-Z][a-zA-Z0-9\s]{2,30})/i,
      /company[:\s]+([A-Z][a-zA-Z0-9\s]{2,30})/i,
      /my\s+(?:brand|company)\s+([A-Z][a-zA-Z0-9\s]{2,30})/i,
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  toolDetectAudience(message) {
    const lower = message.toLowerCase();
    
    // Infer from keywords
    const audiences = {
      'founders': ['startup', 'founders', 'entrepreneurs', 'ceo'],
      'creators': ['creator', 'youtuber', 'tiktok', 'instagram'],
      'marketers': ['marketing', 'growth', 'acquisition'],
      'developers': ['developer', 'engineer', 'coding', 'tech'],
      'designers': ['designer', 'ui', 'ux', 'creative'],
      'investors': ['investor', 'vc', 'angel', 'fund'],
      'general': [],
    };
    
    for (const [audience, keywords] of Object.entries(audiences)) {
      if (keywords.some(k => lower.includes(k))) {
        return audience;
      }
    }
    
    return 'professionals';
  }

  toolDetectEmotion(message) {
    const lower = message.toLowerCase();
    
    const emotions = [
      { word: 'revolutionary', emotion: 'revolutionary' },
      { word: 'inspiring', emotion: 'inspired' },
      { word: 'inspired', emotion: 'inspired' },
      { word: 'bold', emotion: 'bold' },
      { word: 'urgent', emotion: 'urgent' },
      { word: 'calm', emotion: 'calm' },
      { word: 'premium', emotion: 'aspirational' },
      { word: 'confident', emotion: 'confident' },
      { word: 'exciting', emotion: 'excited' },
      { word: 'creative', emotion: 'creative' },
    ];
    
    for (const { word, emotion } of emotions) {
      if (lower.includes(word)) return emotion;
    }
    
    // Default based on topic keywords
    if (lower.includes('ai') || lower.includes('tech')) return 'revolutionary';
    if (lower.includes('finance') || lower.includes('business')) return 'confident';
    if (lower.includes('art') || lower.includes('design')) return 'creative';
    
    return 'engaging';
  }

  toolDetectArtDirection(message) {
    const lower = message.toLowerCase();
    
    const directions = {
      cinematic: ['cinematic', 'film', 'a24', 'dramatic', 'movie'],
      luxury: ['luxury', 'premium', 'gold', 'elegant', 'rolex'],
      apple: ['apple', 'clean', 'minimal', 'keynote', 'simple'],
      streetwear: ['streetwear', 'bold', 'urban', 'supreme', 'raw'],
      tech: ['tech', 'saas', 'linear', 'notion', 'modern'],
      futuristic: ['futuristic', 'cyber', 'blade runner', 'ai', 'neon'],
      editorial: ['editorial', 'magazine', 'nyt', 'monocle'],
      minimal: ['minimal', 'brutalist', 'swiss', 'dieter rams'],
    };
    
    for (const [direction, keywords] of Object.entries(directions)) {
      if (keywords.some(k => lower.includes(k))) {
        return direction;
      }
    }
    
    return null;
  }

  toolSuggestArtDirection(topic) {
    const lower = topic.toLowerCase();
    
    const suggestions = {
      'ai': { direction: 'futuristic', reason: 'AI feels futuristic and revolutionary' },
      'tech': { direction: 'tech', reason: 'Clean SaaS aesthetic fits tech products' },
      'startup': { direction: 'apple', reason: 'Keynote-style clarity for pitches' },
      'finance': { direction: 'luxury', reason: 'Premium trust-building aesthetic' },
      'fashion': { direction: 'editorial', reason: 'Magazine-worthy visual storytelling' },
      'film': { direction: 'cinematic', reason: 'A24-inspired cinematic quality' },
      'fitness': { direction: 'streetwear', reason: 'Raw energy and bold attitude' },
      'design': { direction: 'minimal', reason: 'Dieter Rams precision and clarity' },
    };
    
    for (const [keyword, suggestion] of Object.entries(suggestions)) {
      if (lower.includes(keyword)) {
        return suggestion;
      }
    }
    
    return { direction: 'cinematic', reason: 'Versatile and emotionally powerful' };
  }

  toolCompareToPastBriefs(topic) {
    return this.getSimilarBriefs(topic);
  }

  toolBuildCreativeBrief(data) {
    return {
      topic: data.topic,
      brandName: data.brandName,
      audience: data.audience,
      emotionalGoal: data.emotionalGoal,
      artDirection: data.artDirection,
      cta: data.cta || 'DM for more info',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════════════════

  reset() {
    this.conversation = [];
    this.collectedData = {};
    this.state = 'idle';
    this.confidence = 0;
    this.maxTurns = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // GET STATE
  // ═══════════════════════════════════════════════════════════════════════════════

  getState() {
    return {
      state: this.state,
      collected: this.collectedData,
      conversationLength: this.conversation.length,
      memory: {
        brands: this.memory.brandIdentities.length,
        pastBriefs: this.memory.pastBriefs.length,
      },
      confidence: this.calculateConfidence(),
      isReady: this.calculateConfidence() >= 70,
    };
  }
}

// Export both old name (for compatibility) and new name
export { HermesAgent as CreativeDirectionChat };
export default HermesAgent;
