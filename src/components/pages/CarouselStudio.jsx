// CarouselStudio.jsx — Dual engine: HTML Render OR GPT Image 2

import React, { useState, useRef, useEffect } from 'react';
import {
    LayoutGrid, Send, Download, RefreshCw, Bot,
    Loader2, ChevronLeft, ChevronRight, Sparkles, ArrowRight,
    Edit3, Maximize2, X, Check, Settings2, Palette, Type, Image,
    Film, Diamond, Apple, Flame, Layers, Zap, Box, CircleDot,
    Monitor, Smartphone, Globe, Feather, Hexagon, Square,
    Triangle, Star, Crown, Gem, Focus, Aperture, Sun, Moon,
    Target, ListOrdered, BarChart3, Bomb, Hash, CheckCircle2, EyeOff,
    Utensils, Building, Users, Stethoscope
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getApiUrl } from '../../config/apiConfig';
import { useAppStore } from '../../store';

// ─── Image Engines ──────────────────────────────────────────────────────────

const IMAGE_MODELS = [
    { id: 'nano-banana-2', label: 'Nano Banana 2', desc: 'Gemini 3.1 Flash · ~15s',     icon: Zap },
    { id: 'gpt-image',   label: 'GPT Image 2',   desc: 'AI visuals · ~45s',           icon: Sparkles },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM ART DIRECTION SYSTEM — GPT Image 2
// Cinematic composition · Fixed design tokens · Visual density control
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. DESIGN SYSTEM TOKENS (fixed palettes) ─────────────────────────────────
const DESIGN_SYSTEMS = {
  cinematic: {
    bg: '#050505',
    primary: '#A855F7',
    accent: '#EC4899',
    glow: 'soft-purple-pink',
    lighting: 'dramatic rim light, volumetric fog',
    texture: 'subtle film grain, 35mm aesthetic',
    mood: 'Dark cinematic UI. Premium entertainment industry quality.',
  },
  luxury: {
    bg: '#0A0A0A',
    primary: '#D4AF37',
    accent: '#F5D76E',
    glow: 'warm-gold',
    lighting: 'soft gold accent lighting, elegant shadows',
    texture: 'matte black surfaces, metallic gold accents',
    mood: 'Ultra-premium luxury brand aesthetic. Rolex/Gucci level polish.',
  },
  apple: {
    bg: '#F5F5F7',
    primary: '#0071E3',
    accent: '#34C759',
    glow: 'none',
    lighting: 'soft diffused studio lighting, pristine whites',
    texture: 'clean aluminum, frosted glass, precision machining',
    mood: 'Apple keynote presentation. Minimal perfection. Swiss precision.',
  },
  streetwear: {
    bg: '#0D0D0D',
    primary: '#FF3B30',
    accent: '#00D4AA',
    glow: 'neon-edge',
    lighting: 'harsh urban lighting, gritty contrast',
    texture: 'distressed textures, bold halftone patterns',
    mood: 'Supreme/Off-White energy. Bold, raw, unapologetic.',
  },
  tech: {
    bg: '#02040A',
    primary: '#00D4AA',
    accent: '#00A8E8',
    glow: 'cyan-teal-matrix',
    lighting: 'terminal glow, data stream aesthetic',
    texture: 'subtle circuit patterns, hex grid overlays',
    mood: 'Futuristic SaaS. Linear/Notion product aesthetic.',
  },
  futuristic: {
    bg: '#000208',
    primary: '#6366F1',
    accent: '#A855F7',
    glow: 'deep-space-nebula',
    lighting: 'ethereal blue-purple gradient lighting',
    texture: 'holographic shimmer, glassmorphism depth',
    mood: 'Cyberpunk 2077 meets Apple. Neon-noir sophistication.',
  },
  editorial: {
    bg: '#FAFAFA',
    primary: '#1A1A1A',
    accent: '#DC2626',
    glow: 'none',
    lighting: 'natural daylight, editorial studio',
    texture: 'premium paper stock, letterpress quality',
    mood: 'New York Times Magazine. Monocle. FT Weekend. High editorial.',
  },
  minimal: {
    bg: '#FFFFFF',
    primary: '#000000',
    accent: '#666666',
    glow: 'none',
    lighting: 'flat even lighting, zero shadows',
    texture: 'pure solid colors, sharp geometry',
    mood: 'Brutalist Swiss design. Dieter Rams perfection. Less but better.',
  },
};

// ─── 2. LAYOUT TEMPLATES (composition control) ──────────────────────────────────
const LAYOUT_TEMPLATES = {
  hero: {
    structure: 'Asymmetrical power composition',
    titlePosition: 'upper-third, left-aligned',
    focalPoint: 'dominant headline, 60% text width',
    whitespace: 'generous top and bottom breathing room',
    visualHierarchy: 'headline → subhook → brand mark',
  },
  problem: {
    structure: 'Confrontational split-weight',
    titlePosition: 'upper-left, high contrast',
    painVisual: 'abstract tension texture or void space',
    whitespace: 'compressed, intentional discomfort',
    visualHierarchy: 'pain headline → body → supporting visual',
  },
  solution: {
    structure: 'Transformation reveal',
    titlePosition: 'center-top, elevated energy',
    focalPoint: 'hero product/moment, golden ratio placement',
    whitespace: 'balanced, optimistic openness',
    visualHierarchy: 'solution headline → visual proof → CTA',
  },
  features: {
    structure: 'Triad grid system',
    layout: '3-column or stacked cards',
    titlePosition: 'top banner, contained width',
    whitespace: 'consistent 24px rhythm between elements',
    visualHierarchy: 'section title → 3 feature cards → proof',
  },
  comparison: {
    structure: '50/50 split screen',
    divider: 'strong vertical or diagonal separator',
    beforePosition: 'left, desaturated or muted',
    afterPosition: 'right, vibrant and enhanced',
    whitespace: 'symmetrical balance, clear contrast',
  },
  steps: {
    structure: 'Vertical rhythm stack',
    numbering: 'large 01, 02, 03 — oversized graphic elements',
    titlePosition: 'left-aligned with number',
    whitespace: 'generous between steps, compressed within',
    visualHierarchy: 'number → title → micro-description',
  },
  data: {
    structure: 'Information hierarchy grid',
    statsPosition: 'dominant, oversized numerals',
    contextPosition: 'supporting, smaller text block',
    whitespace: 'stat breathing room, tight context',
    visualHierarchy: 'big number → label → context line',
  },
  cta: {
    structure: 'Single focal climax',
    titlePosition: 'centered or slightly upper-third',
    buttonVisual: 'prominent, high-contrast treatment',
    whitespace: 'maximum, isolating the CTA',
    visualHierarchy: 'urgency headline → button → trust signal',
  },
};

// ─── 3. TYPOGRAPHY SYSTEMS (detailed font descriptions) ──────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY SYSTEMS — Internal creative direction only
// NO SIZING SPECS — pixel values never appear in final prompts
// ═══════════════════════════════════════════════════════════════════════════════

const TYPOGRAPHY_SYSTEMS = {
  cinematic: {
    heading: 'Extra-bold condensed sans-serif, dramatic scale contrast, cinematic title case treatment',
    body: 'Clean geometric sans, refined spacing',
    accent: 'Thin weight italic, elegant contrast to bold headings',
    energy: 'Bold emotional typography with strong cinematic contrast',
  },
  luxury: {
    heading: 'High-contrast modern serif, elegant ligatures, refined letterforms, substantial weight',
    body: 'Clean humanist sans, warm and readable, sophisticated spacing',
    accent: 'Script or elegant italic, gold or metallic treatment',
    energy: 'Premium editorial typography with elegant refinement',
  },
  apple: {
    heading: 'SF Pro Display, medium weight, pristine anti-aliasing, precision spacing',
    body: 'SF Pro Text, regular weight, optimized for screen reading',
    accent: 'SF Mono or SF Pro Thin, technical precision',
    energy: 'Clean Swiss precision typography with mathematical clarity',
  },
  streetwear: {
    heading: 'Extra-bold condensed, aggressive tracking, all-caps or heavy title case, raw energy',
    body: 'Bold sans, slightly distressed or industrial feel',
    accent: 'Stencil, barcode, or glitch textures for edge accents',
    energy: 'Raw aggressive typography with unapologetic boldness',
  },
  tech: {
    heading: 'Monospace or tech sans, precise alignment, code-inspired aesthetics',
    body: 'Inter or similar, highly legible, clean spacing',
    accent: 'Terminal-inspired, bracketed or code-block styling',
    energy: 'Technical precise typography with startup clarity',
  },
  futuristic: {
    heading: 'Geometric sans, wide letter-spacing, cyber-aesthetic, glowing edges potential',
    body: 'Clean sans with subtle tech influence',
    accent: 'Holographic, gradient text, or circuit-pattern fills',
    energy: 'Futuristic cyber typography with neon-edge potential',
  },
  editorial: {
    heading: 'Prestigious serif display, newspaper quality, authoritative presence',
    body: 'Classic serif text, book-quality spacing and readability',
    accent: 'Italic serif for quotes, proper em-dashes, editorial refinement',
    energy: 'Authoritative editorial typography with journalistic weight',
  },
  minimal: {
    heading: 'Neutral grotesque, single weight, mathematical spacing, absolute clarity',
    body: 'Same family, regular weight, generous line-height',
    accent: 'None — pure typographic hierarchy through size only',
    energy: 'Pure mathematical typography with Dieter Rams clarity',
  },
};

// ─── 4. ART DIRECTION MODES ───────────────────────────────────────────────────
const ART_DIRECTIONS = [
  { id: 'cinematic',   label: 'Cinematic',   icon: Film, desc: 'Dramatic lighting, film grain, entertainment industry polish' },
  { id: 'luxury',      label: 'Luxury',      icon: Diamond, desc: 'Gold accents, premium textures, Rolex-level refinement' },
  { id: 'apple',       label: 'Apple',       icon: Apple, desc: 'Swiss precision, pristine whites, keynote presentation' },
  { id: 'streetwear',  label: 'Streetwear',  icon: Flame, desc: 'Bold, raw, Supreme energy, unapologetic contrast' },
  { id: 'tech',        label: 'Tech/SaaS',   icon: Zap, desc: 'Linear/Notion aesthetic, cyan glow, data streams' },
  { id: 'futuristic',  label: 'Futuristic',  icon: Globe, desc: 'Cyberpunk sophistication, neon-noir, holographic depth' },
  { id: 'editorial',   label: 'Editorial',   icon: Type, desc: 'NYT Magazine, Monocle, FT Weekend, high journalism' },
  { id: 'minimal',     label: 'Minimal',     icon: Square, desc: 'Brutalist Swiss, Dieter Rams, less but better' },
];

// ─── 4b. DESIGN INTENSITY LEVELS ──────────────────────────────────────────────
const DESIGN_INTENSITY = {
  minimal: {
    glow: 'none',
    texture: 'none',
    gradient: 'none',
    decoration: 'zero',
    complexity: 'single element only',
  },
  balanced: {
    glow: 'subtle',
    texture: 'light',
    gradient: 'soft',
    decoration: 'minimal',
    complexity: '2-3 elements balanced',
  },
  aggressive: {
    glow: 'strong',
    texture: 'heavy',
    gradient: 'dramatic',
    decoration: 'prominent',
    complexity: 'high impact, layered depth',
  },
};

// ─── 4c. ICON STYLE SYSTEM ──────────────────────────────────────────────────
const ICON_STYLES = {
  minimal:     'ultra-thin 1px line icons, geometric precision, no fill',
  outline:     '2px stroke outlines, rounded caps, modern app aesthetic',
  neon:        'glowing neon outlines, electric edge illumination',
  chrome:      '3D chrome metallic icons, reflective surfaces, depth',
  filled:      'solid filled icons, bold shapes, high contrast',
  duotone:     'two-tone layered icons, depth through color variation',
  glass:       'glassmorphism icons, frosted blur, subtle transparency',
  pixel:       '8-bit pixel art icons, retro gaming aesthetic',
};

// ─── 4d. TREND MODES (Named Creator Styles) ───────────────────────────────────
const TREND_MODES = [
  { id: 'hormozi',     label: 'Alex Hormozi', icon: Zap, desc: 'Bold claims, high contrast, direct response energy', style: 'streetwear' },
  { id: 'apple',       label: 'Apple',        icon: Apple, desc: 'Keynote precision, whitespace worship, premium tech', style: 'apple' },
  { id: 'ai-cinema',   label: 'AI Cinematic', icon: Layers, desc: 'Futuristic AI aesthetic, holographic, data streams', style: 'futuristic' },
  { id: 'luxury',      label: 'Luxury Startup', icon: Crown, desc: 'High-ticket coaching, gold accents, authority', style: 'luxury' },
  { id: 'minimal',     label: 'Minimal Founder', icon: Square, desc: 'Clean aesthetic, focus, no distraction', style: 'minimal' },
  { id: 'cyberpunk',   label: 'Cyberpunk',    icon: Globe, desc: 'Neon-noir, dystopian edge, tech rebellion', style: 'futuristic' },
  { id: 'docu',        label: 'Documentary',  icon: Film, desc: 'A24 aesthetic, film grain, authentic raw', style: 'cinematic' },
  { id: 'street',      label: 'Streetwear',   icon: Flame, desc: 'Hypebeast culture, drop energy, bold', style: 'streetwear' },
];

// ─── 5. VISUAL DENSITY CONTROL ────────────────────────────────────────────────
function optimizeTextDensity(headline, body, maxHeadlineChars = 55, maxBodyChars = 120) {
  let optimizedHeadline = headline;
  let optimizedBody = body;

  // Auto-compress headline if too long
  if (headline && headline.length > maxHeadlineChars) {
    // Try to find a good break point (period, question mark, or natural phrase end)
    const breakChars = ['. ', '? ', '! ', ' — ', ': '];
    let bestBreak = -1;
    for (const bc of breakChars) {
      const idx = headline.lastIndexOf(bc, maxHeadlineChars - 5);
      if (idx > 20) { bestBreak = idx; break; }
    }
    if (bestBreak > 0) {
      optimizedHeadline = headline.slice(0, bestBreak + 1).trim();
    } else {
      // Hard truncate with ellipsis at word boundary
      const trunc = headline.slice(0, maxHeadlineChars - 3).trim();
      optimizedHeadline = trunc.replace(/\s+\S*$/, '') + '...';
    }
  }

  // Auto-compress body if too long
  if (body && body.length > maxBodyChars) {
    const trunc = body.slice(0, maxBodyChars - 3).trim();
    optimizedBody = trunc.replace(/\s+\S*$/, '') + '...';
  }

  return { headline: optimizedHeadline, body: optimizedBody };
}

// ─── 6. COMPACT CINEMATIC PROMPT ENGINE ───────────────────────────────────────
// Compressed ~40% — flowing language over structured lists for GPT Image 2 clarity

const VISUAL_ANCHORS = {
  cinematic:   'A24 film poster × Behance featured editorial.',
  luxury:      'Rolex campaign × Vanity Fair cover.',
  apple:       'Apple keynote × Dieter Rams precision.',
  streetwear:  'Supreme drop × Highsnobiety editorial.',
  tech:        'Linear.app × Notion rebrand × SaaS unicorn.',
  futuristic:  'Blade Runner 2049 UI × Cyberpunk 2077 holograms.',
  editorial:   'NYT Magazine × Monocle × FT Weekend.',
  minimal:     'Dieter Rams × Muji × Brutalist Swiss.',
};

const CTA_SPECIAL = {
  structure:   'climactic single-focus finale',
  typography:  'massive display typography, 3x normal scale',
  whitespace:  'isolated on vast negative space',
  button:      'prominent high-contrast CTA, glowing edge potential',
  mood:        'final scene energy — decisive, urgent, inevitable',
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTOMATIC QUALITY CHECKER — Validates design before generation (Bug 2: Hoisted above compileCreativeBrief)
// ═══════════════════════════════════════════════════════════════════════════════

const QUALITY_CHECKER = {
  checks: {
    // Text density: max 40% coverage
    textDensity: (headline, body) => {
      const totalChars = (headline?.length || 0) + (body?.length || 0);
      const maxChars = 200; // Rough estimate for 40% of 1080x1350
      return {
        pass: totalChars <= maxChars,
        score: Math.max(0, 1 - (totalChars / maxChars)),
        issue: totalChars > maxChars ? 'Text may overcrowd slide' : null,
      };
    },

    // Contrast: minimum ratio for readability
    contrast: (bg, text) => {
      // Defensive: ensure strings
      const bgStr = String(bg || '');
      const textStr = String(text || '');
      // Simplified luminance check
      const isLightBg = bgStr.includes('F') || bgStr.includes('f') || bgStr.includes('fff');
      const isDarkText = textStr.includes('0') || textStr.includes('1') || textStr.includes('rgba(0');
      const contrastGood = (isLightBg && isDarkText) || (!isLightBg && !isDarkText);
      return {
        pass: contrastGood,
        score: contrastGood ? 1 : 0.3,
        issue: contrastGood ? null : 'Low contrast — text may be unreadable',
      };
    },

    // Safe zones: text shouldn't be too close to edges
    safeZones: (layout) => {
      const hasPadding = layout?.titlePosition?.includes('aligned') || layout?.titlePosition?.includes('third');
      return {
        pass: hasPadding,
        score: hasPadding ? 1 : 0.5,
        issue: hasPadding ? null : 'Text may be too close to edges',
      };
    },

    // Focal clarity: one dominant element
    focalClarity: (slideId, visualWeight) => {
      const maxWeight = Math.max(...Object.values(visualWeight || {}));
      const hasDominant = maxWeight >= 8;
      return {
        pass: hasDominant,
        score: hasDominant ? 1 : 0.6,
        issue: hasDominant ? null : 'No clear focal point — visual hierarchy weak',
      };
    },

    // Typography scale: headline 2-3x body
    typeScale: (headline, body) => {
      const hLen = headline?.length || 0;
      const bLen = body?.length || 0;
      const ratio = hLen > 0 && bLen > 0 ? hLen / bLen : 0.5;
      const goodRatio = ratio >= 0.3 && ratio <= 0.8;
      return {
        pass: goodRatio,
        score: goodRatio ? 1 : 0.7,
        issue: goodRatio ? null : 'Typography scale may lack contrast',
      };
    },
  },

  // Run all checks and return report
  // INTERNAL USE ONLY — scores never appear in final prompts
  validate: (slideData) => {
    const { headline, body, density } = slideData;
    const results = {};
    let totalScore = 0;
    let issues = [];

    // Core quality checks
    results.textDensity = QUALITY_CHECKER.checks.textDensity(headline, body);
    results.typeScale = QUALITY_CHECKER.checks.typeScale(headline, body);
    
    // Focal clarity from density weights (internal only)
    if (density) {
      const maxWeight = Math.max(...Object.values(density));
      results.focalClarity = {
        pass: maxWeight >= 8,
        score: maxWeight >= 8 ? 1 : 0.6,
      };
    }

    Object.values(results).forEach(r => {
      totalScore += r.score;
      if (r.issue) issues.push(r.issue);
    });

    const checkCount = Object.keys(results).length;
    const avgScore = totalScore / checkCount;
    
    // Return internal score — NEVER added to prompt
    return {
      score: Math.round(avgScore * 100),
      grade: avgScore >= 0.9 ? 'A' : avgScore >= 0.8 ? 'B' : avgScore >= 0.6 ? 'C' : 'D',
      issues,
      approved: avgScore >= 0.7,
    };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CREATIVE DIRECTION BRIEF COMPILER — Mood-first, no micro layout control
// Transforms technical specs into cinematic creative direction
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compiles a creative direction brief from internal systems
 * INTERNAL systems (hierarchy, scoring, density) guide compilation but NEVER appear in final prompt
 */
function compileCreativeBrief({
  carouselType,
  slideId,
  brand,
  slideContent,
  artDirection = 'cinematic',
  designIntensity = 'balanced',
  iconStyle = 'outline',
  typography: typographyId = 'cinematic',
  previousSlideContext = null,
  isLastSlide = false,
  storyPacing = null,
  engine = 'gpt-image', // Bug 5: Engine-aware prompt length
}) {
  const bName    = brand?.name  || '';
  const bColor   = brand?.color || '';
  const bWhat    = brand?.whatTheyDo || '';
  const headline = slideContent?.headline || slideContent?.hook || '';
  const body     = slideContent?.body || slideContent?.subhook || '';
  const slideIdx = slideContent?._index ?? 0;

  const isCTA = slideId === 'cta' || isLastSlide;
  const design = DESIGN_SYSTEMS[artDirection] || DESIGN_SYSTEMS.cinematic;
  const typography = TYPOGRAPHY_SYSTEMS[typographyId] || TYPOGRAPHY_SYSTEMS.cinematic;
  const intensity = DESIGN_INTENSITY[designIntensity] || DESIGN_INTENSITY.balanced;
  const anchor = VISUAL_ANCHORS[artDirection] || VISUAL_ANCHORS.cinematic;

  // ═════════════════════════════════════════════════════════════════════════════
  // INTERNAL VALIDATION (never exposed in prompt)
  // ═════════════════════════════════════════════════════════════════════════════
  
  // Defensive: ensure all objects exist
  const safeDesign = design || DESIGN_SYSTEMS.cinematic;
  const safeTypography = typography || TYPOGRAPHY_SYSTEMS.cinematic;
  const safeIntensity = intensity || DESIGN_INTENSITY.balanced;
  const safeAnchor = anchor || VISUAL_ANCHORS.cinematic;
  
  // Check text density internally
  const optimized = optimizeTextDensity(headline, body) || { headline: '', body: '' };
  
  // Calculate visual weights internally (for system guidance only)
  const visualWeights = isCTA 
    ? { headline: 10, cta: 10, visual: 6 }
    : slideId === 'hero' 
    ? { headline: 10, visual: 7 }
    : { headline: 8, visual: 6 };
  
  // Validate internally — no scoring in final prompt
  const qualityGate = QUALITY_CHECKER?.validate ? QUALITY_CHECKER.validate({
    headline: optimized.headline,
    body: optimized.body,
    density: visualWeights,
  }) : { score: 100 };
  
  // ═════════════════════════════════════════════════════════════════════════════
  // CREATIVE BRIEF COMPILATION
  // Priority: emotion > atmosphere > visual anchor > art direction > content > brand
  // NO: measurements, CSS rules, pixel values, hierarchy scores, spacing instructions
  // ═════════════════════════════════════════════════════════════════════════════
  
  const sections = [];
  
  // 0. CAROUSEL TYPE CONTEXT (Instagram format + user selection)
  const carouselTypeLabel = carouselType?.label || 'Instagram carousel';
  const carouselTypeId = carouselType?.id || 'carousel';
  sections.push(`Instagram ${carouselTypeLabel}. 4:5 vertical format.`);
  
  // 1. VISUAL ANCHOR (highest priority — sets the aesthetic universe)
  sections.push(`${safeAnchor}`);
  
  // 2. ATMOSPHERE & MOOD (cinematic direction)
  const moodParts = [];
  if (safeDesign.lighting) moodParts.push(safeDesign.lighting);
  if (safeIntensity.texture !== 'none' && safeDesign.texture) {
    moodParts.push(safeIntensity.texture === 'light' ? safeDesign.texture : `${safeDesign.texture} texture`);
  }
  if (safeIntensity.glow !== 'none' && safeDesign.glow) {
    moodParts.push(`${safeDesign.glow} glow`);
  }
  
  const atmosphere = moodParts.join(', ');
  const bg = safeDesign.bg || 'Dark';
  const complexity = safeIntensity.complexity || 'balanced';
  if (atmosphere) {
    sections.push(`${bg} atmosphere with ${atmosphere}. Cinematic ${complexity} intensity.`);
  } else {
    sections.push(`${bg} cinematic atmosphere.`);
  }
  
  // 3. TYPOGRAPHY ENERGY (emotional direction, not sizing)
  // Use the energy field for mood-first description
  const typeEnergy = safeTypography.energy || 'Bold emotional typography with strong contrast';
  sections.push(`${typeEnergy}.`);
  
  // 4. SLIDE PURPOSE & EMOTIONAL GOAL
  let purposeText = '';
  if (isCTA) {
    purposeText = 'Climactic finale — decisive, urgent, inevitable. Prominent CTA with glowing potential.';
  } else if (storyPacing) {
    purposeText = `${storyPacing.emotionalGoal}. ${storyPacing.phase} energy.`;
  } else if (slideId === 'hero') {
    purposeText = 'Opening impact — attention-commanding, scroll-stopping entrance.';
  } else if (slideId === 'problem') {
    purposeText = 'Tension building — confrontational, unsettling, dramatic friction.';
  } else if (slideId === 'solution') {
    purposeText = 'Release and clarity — optimistic resolution, open and breathable.';
  } else if (slideId === 'features') {
    purposeText = 'Value demonstration — confident, capable, feature-forward.';
  }
  if (purposeText) sections.push(purposeText);
  
  // 5. HEADLINE & SUPPORTING TEXT (the story)
  if (optimized.headline) {
    sections.push(`Headline: "${optimized.headline}"`);
  }
  if (optimized.body) {
    sections.push(`Supporting: "${optimized.body}"`);
  }
  
  // 6. BRAND IDENTITY
  if (bName) {
    const brandLine = bWhat 
      ? `${bName} — ${bWhat}. Premium brand presence.`
      : `${bName}. Premium brand presence.`;
    sections.push(brandLine);
  }
  
  // 7. PALETTE
  const primary = bColor || safeDesign.primary || 'Electric';
  const accent = safeDesign.accent || 'Vibrant';
  sections.push(`${primary} and ${accent} color world.`);
  
  // 8. CONTINUITY (if not first slide)
  if (slideIdx > 0 && previousSlideContext) {
    const direction = artDirection || 'cinematic';
    sections.push(`Visual continuity: same lighting atmosphere, consistent typographic voice, cohesive ${direction} world.`);
  }
  
  // 9. EMOTIONAL HOOK (final quality anchor)
  const emotionalGoal = storyPacing?.emotionalGoal || 
    (isCTA ? 'decisive action' : 'inspired engagement');
  sections.push(`Emotional goal: ${emotionalGoal}. Instagram-native cinematic storytelling.`);
  
  // ═════════════════════════════════════════════════════════════════════════════
  // COMPRESSION & OPTIMIZATION — Engine-aware (Bug 5)
  // GPT Image 2: 450-700 chars, max 900
  // Nano Banana 2: ~350 chars max (shorter prompts work better)
  // ═════════════════════════════════════════════════════════════════════════════
  
  const isNanoBanana = engine === 'nano-banana-2';
  const MAX_LENGTH = isNanoBanana ? 350 : 900;
  const TARGET_LENGTH = isNanoBanana ? 300 : 650;
  
  // Filter out any undefined/null sections and ensure all are strings
  let cleanSections = sections.filter(s => s && typeof s === 'string');
  
  // For Nano Banana: strip mood prose, keep only essentials
  if (isNanoBanana) {
    // Keep only: carousel type + visual anchor + headline + brand + negative prompts
    cleanSections = cleanSections.filter((s, i) => {
      // Keep first (carousel type), second (visual anchor), and last (brand/negative)
      return i < 2 || i > cleanSections.length - 3 || s.includes('no text');
    });
  }
  
  let brief = cleanSections.join(' ') || 'Cinematic Instagram carousel. Premium visual storytelling.';
  
  // Deduplicate adjectives
  brief = brief
    .replace(/\b(dramatic)\b/gi, 'dramatic')
    .replace(/\b(cinematic)\b/gi, 'cinematic')
    .replace(/\b(premium)\b/gi, 'premium')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Trim if exceeds limit (keep beginning and end, compress middle)
  if (brief.length > MAX_LENGTH) {
    const keepStart = isNanoBanana ? 150 : 300;
    const keepEnd = isNanoBanana ? 150 : 500;
    const start = brief.slice(0, keepStart);
    const end = brief.slice(-keepEnd);
    brief = `${start} ${end}`;
  }
  
  // Final quality gate log (internal only)
  const qScore = qualityGate?.score || 100;
  console.log('[Creative Brief]', bName || 'No brand', '| Length:', brief.length, '| Quality:', qScore, '| Engine:', engine);
  
  return brief;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API — Prompt generation functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main entry point: compiles creative direction brief
 * All internal systems feed into this, but only mood/atmosphere/emotion appears in output
 */
function buildCinematicPrompt(props) {
  return compileCreativeBrief({
    ...props,
    artDirection: props.artDirection || 'cinematic',
  });
}

/**
 * Legacy wrapper — now uses creative brief compiler
 * @deprecated Use compileCreativeBrief directly or buildCinematicPrompt
 */
function buildVisualPrompt(props) {
  return buildCinematicPrompt(props);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL STORY PACING ENGINE — Sequence rhythm and emotional progression
// ═══════════════════════════════════════════════════════════════════════════════

const STORY_PACING = {
  // Rhythm patterns: how visual density flows across the sequence
  rhythms: {
    cinematic: ['sparse', 'dense', 'cinematic', 'balanced', 'sparse', 'emotional', 'climax'],
    educational: ['hook', 'dense', 'balanced', 'dense', 'balanced', 'howto', 'cta'],
    hype: ['dense', 'dense', 'cinematic', 'dense', 'cinematic', 'emotional', 'explosive'],
    minimal: ['sparse', 'sparse', 'balanced', 'sparse', 'balanced', 'sparse', 'climax'],
    data: ['dense', 'dense', 'balanced', 'dense', 'dense', 'howto', 'cta'],
  },

  // Emotional arc progression
  emotionalArc: [
    'curiosity',      // Hero: Hook attention
    'empathy',        // Problem: Feel the pain
    'hope',           // Solution: See possibility
    'proof',          // Features: Trust building
    'authority',      // Details: Credibility
    'capability',     // How-to: Empowerment
    'urgency',        // CTA: Action now
  ],

  // Visual escalation: intensity builds toward CTA
  getIntensityForIndex: (index, total, rhythm = 'cinematic') => {
    const pattern = STORY_PACING.rhythms[rhythm] || STORY_PACING.rhythms.cinematic;
    const phase = pattern[index] || 'balanced';
    const isNearEnd = index >= total - 2;

    const intensityMap = {
      sparse: { glow: 'minimal', texture: 'none', complexity: 'single', whitespace: 'maximum' },
      dense: { glow: 'subtle', texture: 'light', complexity: 'layered', whitespace: 'minimal' },
      balanced: { glow: 'subtle', texture: 'light', complexity: '2-3 elements', whitespace: 'generous' },
      cinematic: { glow: 'strong', texture: 'film grain', complexity: 'depth layers', whitespace: 'dramatic' },
      emotional: { glow: 'warm', texture: 'soft', complexity: 'focused', whitespace: 'breathing' },
      howto: { glow: 'minimal', texture: 'none', complexity: 'numbered steps', whitespace: 'clear' },
      climax: { glow: 'maximum', texture: 'dramatic', complexity: 'single focal', whitespace: 'isolated' },
      explosive: { glow: 'maximum', texture: 'heavy', complexity: 'high impact', whitespace: 'compressed' },
      hook: { glow: 'subtle', texture: 'none', complexity: 'mystery', whitespace: 'intriguing' },
    };

    return {
      ...intensityMap[phase],
      phase,
      emotionalGoal: STORY_PACING.emotionalArc[index] || 'engagement',
      escalation: isNearEnd ? 'building_to_climax' : 'progression',
    };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Categories & Presets ─────────────────────────────────────────────────────

const CAROUSEL_CATEGORIES = [
    { id: 'all', label: 'All', icon: Sparkles, color: 'text-pink-400' },
    { id: 'food', label: 'Food & Beverage', icon: Utensils, color: 'text-orange-400' },
    { id: 'realestate', label: 'Real Estate', icon: Building, color: 'text-blue-400' },
    { id: 'influencer', label: 'Influencer / Brand', icon: Users, color: 'text-purple-400' },
    { id: 'medical', label: 'Medical / Spa', icon: Stethoscope, color: 'text-teal-400' },
    { id: 'tutorial', label: 'Tutorial / How-To', icon: ListOrdered, color: 'text-lime-400' }
];

const CATEGORY_PRESETS = {
    food: [
        { id: 'food_p1', name: 'Gourmet Recipe Walkthrough', desc: 'Step-by-step cooking guide & secrets', prompt: 'Perfect authentic claypot chicken biryani recipe walkthrough', type: 'step-by-step', color: 'from-orange-500 to-red-500', imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80' },
        { id: 'food_p2', name: '3 Hacks to Scale Your Cafe', desc: 'Marketing secrets that fill restaurant tables', prompt: '3 marketing hacks that filled our tables overnight', type: 'mini-case-study', color: 'from-amber-500 to-orange-500', imageUrl: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600&auto=format&fit=crop&q=80' }
    ],
    realestate: [
        { id: 're_p1', name: 'Luxury Villa Tour Plan', desc: 'Staging & architectural tour sequence', prompt: 'Inside a $10M ultra-modern smart villa in Malibu', type: 'before-after', color: 'from-blue-500 to-cyan-500', imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&auto=format&fit=crop&q=80' },
        { id: 're_p2', name: 'Buying vs. Renting in 2026', desc: 'High-converting comparison guide', prompt: 'Why buying a home makes absolute financial sense today', type: 'do-dont', color: 'from-teal-500 to-emerald-500', imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80' }
    ],
    influencer: [
        { id: 'inf_p1', name: 'Personal Branding Secrets', desc: 'Grow your digital presence in 30 days', prompt: 'How I gained 10k engaged followers without ad spend', type: 'swipe-secrets', color: 'from-pink-500 to-purple-500', imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80' },
        { id: 'inf_p2', name: '3 Traps New Creators Face', desc: 'Avoid critical algorithms and grow', prompt: 'Why your Instagram reels get stuck at 200 views', type: 'do-dont', color: 'from-red-500 to-rose-500', imageUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80' }
    ],
    medical: [
        { id: 'med_p1', name: 'Carbon Peel Transformation', desc: 'Clinical treatments & skin results', prompt: 'Full carbon laser peel treatment skin journey before/after', type: 'before-after', color: 'from-teal-500 to-cyan-500', imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=80' },
        { id: 'med_p2', name: 'Doctor Habits for Energy', desc: 'Clinical health & daily routine habits', prompt: '5 daily wellness habits for constant peak brain function', type: 'listicle', color: 'from-emerald-500 to-teal-500', imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&auto=format&fit=crop&q=80' }
    ],
    tutorial: [
        { id: 'tut_p1', name: 'UI/UX Layout Masterclass', desc: 'Auto Layout designs in Figma guide', prompt: 'Mastering Auto Layout in Figma in 5 easy steps', type: 'step-by-step', color: 'from-blue-500 to-violet-500', imageUrl: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=600&auto=format&fit=crop&q=80' },
        { id: 'tut_p2', name: 'Ultimate Off-Page SEO Checklist', desc: 'Rank #1 on Google step-by-step', prompt: 'SEO checklist for scaling local search rank', type: 'listicle', color: 'from-lime-500 to-green-500', imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80' }
    ]
};

// ─── Types ────────────────────────────────────────────────────────────────────

const CAROUSEL_TYPES = [
    { id: 'classic-hook-cta', label: 'Classic Hook → CTA', icon: Target, desc: 'The proven 7-slide formula',    color: 'from-pink-500 to-rose-500'     },
    { id: 'step-by-step',     label: 'Step by Step',       icon: ListOrdered, desc: 'Numbered tutorial / how-to',    color: 'from-blue-500 to-cyan-500'     },
    { id: 'before-after',     label: 'Before & After',     icon: Sparkles, desc: 'Transformation reveal',          color: 'from-orange-500 to-red-500'    },
    { id: 'mini-case-study',  label: 'Mini Case Study',    icon: BarChart3, desc: 'Client story / real results',   color: 'from-emerald-500 to-teal-500'  },
    { id: 'myth-busting',     label: 'Myth Busting',       icon: Bomb, desc: 'Debunk misconceptions',          color: 'from-violet-500 to-indigo-500' },
    { id: 'listicle',         label: 'Listicle',           icon: Hash, desc: 'Top N things / ranked list',    color: 'from-teal-500 to-green-500'    },
    { id: 'do-dont',          label: "Do's & Don'ts",      icon: CheckCircle2, desc: 'Mistakes vs. right way',         color: 'from-red-500 to-pink-500'      },
    { id: 'swipe-secrets',    label: 'Swipe Secrets',      icon: EyeOff, desc: 'Hidden tips that hook & reward', color: 'from-purple-500 to-pink-500'   },
];

// ─── Claude system prompt ─────────────────────────────────────────────────────
// Collects 6 answers → outputs carouselData JSON → backend builds HTML slides

function buildSystemPrompt(typeId, brandVoice, artDirection, typography) {
    const type = CAROUSEL_TYPES.find(t => t.id === typeId) || CAROUSEL_TYPES[0];
    const selectedStyle = DESIGN_SYSTEMS[artDirection] || DESIGN_SYSTEMS.cinematic;
    const selectedTypography = typography || 'cinematic';

    const brandBlock = brandVoice?.brandName ? `
## PRE-LOADED BRAND DATA — skip asking these, use them directly
- Brand Name: ${brandVoice.brandName}
${brandVoice.tagline ? `- Tagline: ${brandVoice.tagline}` : ''}
${brandVoice.founderName ? `- Founder Name: ${brandVoice.founderName}` : ''}
${brandVoice.phoneNumber ? `- Phone Number: ${brandVoice.phoneNumber}` : ''}
${brandVoice.whatTheyDo ? `- What They Do: ${brandVoice.whatTheyDo}` : ''}
${brandVoice.address ? `- Location: ${brandVoice.address}` : ''}
${brandVoice.brandColor ? `- Brand Color: ${brandVoice.brandColor} (use this exact hex in the brand.color field)` : ''}
${brandVoice.instagramHandle ? `- Instagram: ${brandVoice.instagramHandle}` : ''}
${brandVoice.website ? `- Website: ${brandVoice.website}` : ''}
` : '';

    return `You are ZeroLens AI — a world-class Instagram carousel strategist and copywriter.

You are building a "${type.label}" carousel. Your copy feeds a professional HTML design system that renders pixel-perfect 1080×1350px Instagram slides. Every word you write appears on a real slide seen by thousands — write like a senior agency copywriter.
${brandBlock}
## CONVERSATION RULES
- Ask ONLY ONE question per message. Never combine two.
- Keep questions short and direct — like a sharp creative director.
- If brand data is pre-loaded above, SKIP those questions entirely and use the data.
- Once you have all 6 answers → output the JSON immediately. No intro, no explanation, no markdown fences. Start directly with {

## QUESTIONS TO COLLECT (only what's missing)
1. Topic — what insight, story, or offer is this carousel about?
2. Brand name — (skip if pre-loaded)
3. Instagram handle — e.g. @yourbrand
4. Brand color — hex code OR describe it (e.g. "deep gold", "electric teal", "cobalt blue")
5. CTA — what action drives the last slide? (e.g. "DM us", "Book a call", "Shop now", "Follow for more")

## PRE-SELECTED ART DIRECTION (from UI Settings — DO NOT ask user)
Style: ${artDirection || 'cinematic'}
Visual Character: ${selectedStyle.mood}
Typography: ${TYPOGRAPHY_SYSTEMS[selectedTypography]?.heading || TYPOGRAPHY_SYSTEMS.cinematic.heading}

NOTE: Font style/art direction and typography are ALREADY SELECTED in the UI. Do NOT ask about them.

## COPY QUALITY RULES — CRITICAL
- brand.hook: Stop-the-scroll. Bold claim, surprising stat, or provocative question. MAX 8 WORDS. Zero fluff.
- brand.subhook: One sentence that earns the swipe. MAX 120 CHARS. Specific, not generic.
- brand.tag: 2-3 word pill label. E.g. "NEW DROP", "PRO TIP", "CASE STUDY", "MUST READ"
- Problem slide.headline: MAX 12 WORDS, MAX 55 CHARS. Name the real pain. Language your audience uses internally.
- Problem slide.body: MAX 120 CHARS.
- Solution slide.headline: MAX 12 WORDS, MAX 55 CHARS. Make transformation feel inevitable.
- Solution slide.quote: MAX 100 CHARS. Something a senior expert would say.
- Solution slide.body: MAX 120 CHARS.
- Features: Only 3 items max. Title = benefit, MAX 30 CHARS. Desc = proof, MAX 50 CHARS.
- Details: Only 4 points max. Each point MAX 55 CHARS. Real, specific. Never buzzwords.
- How-to: Only 3 steps max. Title = action verb, MAX 28 CHARS. Desc = outcome, MAX 50 CHARS.
- brand.ctaHeadline: Create urgency or curiosity. MAX 12 WORDS, MAX 55 CHARS. Never "Get started today."
- brand.ctaBody: MAX 120 CHARS.
- ctaText: 2-4 words max.
- If user gives a color name (not hex), convert it yourself: "warm gold"→#D4AF37, "cobalt blue"→#0047AB, "electric teal"→#00CED1, "deep navy"→#0A1628, etc.

## VISUAL RULES — FOR GPT IMAGE GENERATION
Your copy shapes the visual output. Every text input becomes a design element:
- Hero slide: 40% text maximum — massive whitespace around headline
- Problem slide: Compressed tension — visual should feel uncomfortable, confronting
- Solution slide: Release and clarity — open, optimistic composition
- Features slide: Triad balance — three equal visual weights
- Details slide: Stacked rhythm — consistent spacing, clear separation
- How-to slide: Numbered dominance — oversized 01, 02, 03 as graphic elements
- CTA slide: Single focal point — headline and button isolated on maximum whitespace

## EMOTIONAL ARCHITECTURE
Each slide has a psychological job:
- Hook: Curiosity gap — "I need to know this"
- Problem: Empathy trigger — "They understand my pain"
- Solution: Hope injection — "This could work for me"
- Features: Proof stacking — "Others trust this"
- Details: Authority building — "These people know their stuff"
- How-to: Capability transfer — "I could actually do this"
- CTA: Action compulsion — "I should do this now"

## COMPOSITION RULES
- Never center-aligned headlines (left or asymmetrical only)
- Body text never exceeds 40% slide width
- One dominant element per slide — no visual competition
- Strong contrast hierarchy — headline 3x body weight
- Intentional negative space — elements breathe
- Visual rhythm: dense → sparse → dense → sparse across the sequence

## JSON OUTPUT — exact structure, raw, no wrapping
{
  "type": "carousel",
  "brand": {
    "name": "",
    "handle": "",
    "tag": "",
    "hook": "",
    "subhook": "",
    "ctaHeadline": "",
    "ctaBody": "",
    "color": "#hex",
    "fontStyle": "modern"
  },
  "slides": [
    { "id": "hero",     "headline": "", "body": "" },
    { "id": "problem",  "headline": "", "body": "", "points": ["", "", ""] },
    { "id": "solution", "headline": "", "body": "", "quote": "" },
    { "id": "features", "headline": "", "features": [{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""}] },
    { "id": "details",  "headline": "", "points": ["", "", "", ""] },
    { "id": "howto",    "headline": "", "steps": [{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""}] }
  ],
  "ctaText": ""
}

CRITICAL: After the closing } write absolutely nothing. No sign-off. No follow-up. Silence.`;
}

// ─── Session cache (survives tab switches) ────────────────────────────────────

const _s = {
    selectedType:  null,
    imageEngine:   'gpt-image',
    messages:      [],
    carouselData:  null,
    slideImages:   [],
    activeSlide:   0,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CarouselStudio({ userId }) {
    const userProfile = useAppStore(s => s.userProfile);
    const brandVoice  = userProfile?.brand_voice || userProfile?.metadata?.brand_voice || null;

    // Session state (per-instance, not module-level)
    const sessionRef = useRef({
        selectedType: null,
        imageEngine: 'gpt-image',
        messages: [],
        carouselData: null,
        slideImages: [],
        activeSlide: 0,
    });
    
    const [selectedType,  setSelectedType]  = useState(sessionRef.current.selectedType);
    const [imageEngine,   setImageEngine]   = useState(sessionRef.current.imageEngine);
    const [messages,      setMessages]      = useState(sessionRef.current.messages);
    const [input,         setInput]         = useState('');
    const [isThinking,    setIsThinking]    = useState(false);
    const [carouselData,  setCarouselData]  = useState(sessionRef.current.carouselData);
    const [slideImages,   setSlideImages]   = useState(sessionRef.current.slideImages);
    const [brandName,     setBrandName]     = useState(''); // Bug 4: Added missing state
    const [activeCategory, setActiveCategory] = useState('all');
    const [isGenerating,  setIsGenerating]  = useState(false);
    const [genStatus,     setGenStatus]     = useState('');
    const [activeSlide,   setActiveSlide]   = useState(sessionRef.current.activeSlide);
    const [gptQueue,      setGptQueue]      = useState([]);
    const [gptPending,    setGptPending]    = useState(null);
    const [editingPrompt, setEditingPrompt] = useState('');
    const [showPromptEditor, setShowPromptEditor] = useState(false);
    const [showSlideEditor, setShowSlideEditor] = useState(false);
    // Art direction with persistence - load from localStorage or default
    const [artDirection, setArtDirection]       = useState(() => {
        const saved = localStorage.getItem('carousel_artDirection');
        return saved || 'cinematic';
    });
    const [hasManualArtDirection, setHasManualArtDirection] = useState(false); // Track if user clicked art direction
    
    // Save art direction to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('carousel_artDirection', artDirection);
    }, [artDirection]);
    // Settings with localStorage persistence
    const [designIntensity, setDesignIntensity] = useState(() => {
        const saved = localStorage.getItem('carousel_designIntensity');
        return saved || 'balanced';
    });
    const [trendMode, setTrendMode]           = useState(null); // null = custom, or 'hormozi', 'apple', etc.
    const [iconStyle, setIconStyle]           = useState(() => {
        const saved = localStorage.getItem('carousel_iconStyle');
        return saved || 'outline';
    });
    const [typography, setTypography]         = useState(() => {
        const saved = localStorage.getItem('carousel_typography');
        return saved || 'cinematic';
    });
    
    // Persist all settings to localStorage
    useEffect(() => {
        localStorage.setItem('carousel_designIntensity', designIntensity);
    }, [designIntensity]);
    
    useEffect(() => {
        localStorage.setItem('carousel_iconStyle', iconStyle);
    }, [iconStyle]);
    
    useEffect(() => {
        localStorage.setItem('carousel_typography', typography);
    }, [typography]);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [useBrandVoice, setUseBrandVoice]   = useState(!!brandVoice?.brandName);
    const [genFailedAt, setGenFailedAt]       = useState(null); // { prompts, index, existingSlides, data } for retry

    const bottomRef = useRef(null);
    const abortRef  = useRef(null);

    // Map brandVoice flat keys → carousel brand object keys
    const normalizeBrand = (bv, fallback = {}) => ({
        ...fallback,
        name: bv?.brandName || fallback.name,
        color: bv?.brandColor || fallback.color,
        whatTheyDo: bv?.whatTheyDo || fallback.whatTheyDo,
        instagramHandle: bv?.instagramHandle,
        website: bv?.website,
        tagline: bv?.tagline || fallback.tagline,
        founderName: bv?.founderName || fallback.founderName,
        phoneNumber: bv?.phoneNumber || fallback.phoneNumber,
    });

    // Sync session cache (Bug 6: useRef instead of module-level _s)
    useEffect(() => { sessionRef.current.selectedType = selectedType; }, [selectedType]);
    useEffect(() => { sessionRef.current.imageEngine  = imageEngine;  }, [imageEngine]);
    useEffect(() => { sessionRef.current.messages     = messages;     }, [messages]);
    useEffect(() => { sessionRef.current.carouselData = carouselData; }, [carouselData]);
    useEffect(() => { sessionRef.current.slideImages  = slideImages;  }, [slideImages]);
    useEffect(() => { sessionRef.current.activeSlide  = activeSlide;  }, [activeSlide]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    // ── Select carousel type ──────────────────────────────────────────────────

    const handleSelectType = (type) => {
        setSelectedType(type.id);
        setCarouselData(null);
        setSlideImages([]);
        setHasManualArtDirection(false); // Reset so Hermes can suggest art direction for new carousel
        setActiveSlide(0);
        setInput('');
        const bv = useBrandVoice ? brandVoice : null;
        const greeting = bv?.brandName
            ? `Building a **${type.label}** carousel for **${bv.brandName}**! Brand loaded. What topic should this carousel cover?`
            : `**${type.label}** — great choice! What's the topic or core message for this carousel?`;
        setMessages([{ role: 'assistant', text: greeting }]);
    };

    const handleSelectPreset = async (preset) => {
        const type = CAROUSEL_TYPES.find(t => t.id === preset.type) || CAROUSEL_TYPES[0];
        setSelectedType(type.id);
        setCarouselData(null);
        setSlideImages([]);
        setHasManualArtDirection(false);
        setActiveSlide(0);
        setInput('');
        
        // Setup initial messages
        const greeting = `Building a **${type.label}** carousel for **Your Brand** under **${activeCategory.toUpperCase()}** category! Let's start with your topic: "${preset.prompt}"`;
        const userMsg = { role: 'user', text: preset.prompt };
        setMessages([
            { role: 'assistant', text: greeting },
            userMsg
        ]);
        setIsThinking(true);

        try {
            const fullCarouselType = type;
            const resp = await fetch(getApiUrl('/api/hermes/chat'), {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    message: preset.prompt,
                    userId: userId || 'anon',
                    sessionId: type.id,
                    carouselType: fullCarouselType,
                    artDirection: artDirection,
                    typography: typography,
                    designIntensity: designIntensity,
                    hasManualArtDirection: false,
                    brandName: brandName || 'Your Brand',
                })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.error || `Server error ${resp.status}`);

            if (data.type === 'brief' && data.creativeDirection) {
                const { creativeDirection, brief } = data;
                if (brief.brandName) setBrandName(brief.brandName);
                
                const carouselPayload = {
                    type: 'carousel',
                    carouselType: fullCarouselType,
                    brand: {
                        name: brief.brandName || 'Your Brand',
                        tagline: brief.topic,
                    },
                    slides: creativeDirection.slides.map((s, i) => ({
                        id: `slide-${i}`,
                        headline: s.headline,
                        body: s.body,
                        layout: i === 0 ? 'centered' : i === creativeDirection.slides.length - 1 ? 'cta' : 'split',
                    })),
                    visualDirection: {
                        artDirection: brief.artDirection,
                        emotionalGoal: brief.emotionalGoal,
                    },
                    cta: brief.cta,
                };

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: `✨ **Creative Brief Ready!**\n\n**${brief.topic}** — ${brief.artDirection} aesthetic.\n\nGenerating slides now...`,
                }]);

                setTimeout(() => {
                    setCarouselData(carouselPayload);
                    setSlideImages([]);
                    setActiveSlide(0);
                    generateCarousel(carouselPayload);
                }, 500);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', text: data.content }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${err.message}` }]);
        } finally {
            setIsThinking(false);
        }
    };

    // ── Chat with Hermes Agent ───────────────────────────────────────────────

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isThinking || !selectedType || isGenerating) return;
        setInput('');

        const userMsg     = { role: 'user', text };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setIsThinking(true);

        try {
            // Use Hermes Agent API for full agent experience
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
            
            // Bug 1: Pass full context to Hermes backend
            const fullCarouselType = CAROUSEL_TYPES.find(t => t.id === selectedType);
            const resp = await fetch(getApiUrl('/api/hermes/chat'), {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    message: text,
                    userId: userId || 'anon',
                    sessionId: selectedType,
                    // Pass creative direction context for better brief generation
                    carouselType: fullCarouselType,
                    artDirection: artDirection,
                    typography: typography,
                    designIntensity: designIntensity,
                    hasManualArtDirection: hasManualArtDirection,
                    brandName: brandName,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.error || `Server error ${resp.status}`);

            // Handle different agent response types
            if (data.type === 'brief' && data.creativeDirection) {
                // Agent generated a full creative brief - auto-populate and generate
                const { creativeDirection, brief } = data;
                
                // Update brand name from brief
                if (brief.brandName) {
                    setBrandName(brief.brandName);
                }
                
                // Update art direction if suggested AND user hasn't manually selected one
                if (brief.artDirection && ART_DIRECTIONS.some(a => a.id === brief.artDirection)) {
                    // Only use Hermes suggestion if user hasn't manually clicked an art direction button
                    if (!hasManualArtDirection && !trendMode) {
                        setArtDirection(brief.artDirection);
                        console.log('[Hermes] Auto-set art direction to:', brief.artDirection);
                    } else {
                        console.log('[Hermes] Preserving user art direction:', artDirection, '(ignoring suggestion:', brief.artDirection + ')');
                    }
                }
                
                // Build carousel data from creative direction
                // Include the selected carousel type so prompts reflect user's choice
                const currentCarouselType = CAROUSEL_TYPES.find(t => t.id === selectedType) || 
                    { id: 'classic-hook-cta', label: 'Classic Hook → CTA', emoji: '🎯' };
                
                const carouselPayload = {
                    type: 'carousel',
                    carouselType: currentCarouselType,
                    brand: {
                        name: brief.brandName || 'Your Brand',
                        tagline: brief.topic,
                    },
                    slides: creativeDirection.slides.map((s, i) => ({
                        id: `slide-${i}`,
                        headline: s.headline,
                        body: s.body,
                        layout: i === 0 ? 'centered' : i === creativeDirection.slides.length - 1 ? 'cta' : 'split',
                    })),
                    visualDirection: {
                        artDirection: brief.artDirection,
                        emotionalGoal: brief.emotionalGoal,
                    },
                    cta: brief.cta,
                };

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: `✨ **Creative Brief Ready!**\n\n**${brief.topic}** — ${brief.artDirection} aesthetic for ${brief.audience}.\n\nGenerating ${carouselPayload.slides.length} slides now...`,
                }]);

                // Auto-generate the carousel
                setTimeout(() => {
                    setCarouselData(carouselPayload);
                    setSlideImages([]);
                    setActiveSlide(0);
                    generateCarousel(carouselPayload);
                }, 500);
                
            } else if (data.type === 'proposal') {
                // Agent is proposing a brief, waiting for confirmation
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: data.content,
                    brief: data.brief, // Store brief for later
                }]);
                
            } else {
                // Regular conversation response
                setMessages(prev => [...prev, { role: 'assistant', text: data.content, promptRecommendation: data.promptRecommendation }]);
            }
        } catch (err) {
            let errorMessage = err.message;
            if (err.name === 'AbortError') {
                errorMessage = 'Request timed out. The agent took too long to respond. Please try again.';
            }
            setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${errorMessage}` }]);
        } finally {
            setIsThinking(false);
        }
    };

    // ── GPT Image: generate ONE slide, then wait for user approval ──────────

    const generateOneGptSlide = async (prompts, index, existingSlides, data) => {
        if (index >= prompts.length) {
            setGptQueue([]);
            setGptPending(null);
            setIsGenerating(false);
            setGenStatus('');
            setGenFailedAt(null);
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: `🎉 All ${existingSlides.length} AI slides approved — download and post!`,
            }]);
            return;
        }
        setIsGenerating(true);
        setGenFailedAt(null);
        setGenStatus(`Generating slide ${index + 1} of ${prompts.length}…`);
        console.log(`%c[GPT Image] Slide ${index + 1}/${prompts.length} — slideId: ${prompts[index]?.slideId}`, 'color:#f472b6;font-weight:bold;font-size:13px');
        console.log('%cPROMPT:', 'color:#fb923c;font-weight:bold', '\n' + prompts[index]?.prompt);

        // Setup abort controller with 240s timeout (4 min)
        const controller = new AbortController();
        abortRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort('timeout'), 240000);

        try {
            const resp = await fetch(getApiUrl('/api/carousel/generate-images'), {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ prompts: [prompts[index]], userId, brand: data.brand, model: imageEngine }),
                signal:  controller.signal,
            });
            clearTimeout(timeoutId);
            const result = await resp.json();
            if (!resp.ok) throw new Error(result?.error || `Server error ${resp.status}`);
            const newSlide = { ...result.slides[0], index };
            setGptPending({ slide: newSlide, index, prompts, data });
            setSlideImages(prev => {
                const updated = [...prev];
                updated[index] = newSlide;
                return updated;
            });
            setActiveSlide(index);
            
            // Show fallback message if GPT Image 2 was used instead of Nano Banana
            if (newSlide.fallback) {
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    text: `⚡ Slide ${index + 1} used GPT Image 2 fallback (Nano Banana timed out)` 
                }]);
            }
        } catch (err) {
            clearTimeout(timeoutId);
            const isAbort = err.name === 'AbortError' || controller.signal.aborted;
            const isTimeout = controller.signal.reason === 'timeout';
            const errMsg = isTimeout
                ? `Slide ${index + 1} timed out after 2 min — try again`
                : isAbort
                    ? `Slide ${index + 1} cancelled`
                    : `Slide ${index + 1} failed: ${err.message}`;
            setMessages(prev => [...prev, { role: 'assistant', text: errMsg }]);
            // Save failed state for retry (unless user-cancelled)
            if (!isAbort || isTimeout) {
                setGenFailedAt({ prompts, index, existingSlides, data });
            }
        } finally {
            clearTimeout(timeoutId);
            abortRef.current = null;
            setIsGenerating(false);
            setGenStatus('');
        }
    };

    const cancelGeneration = () => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        setIsGenerating(false);
        setGenStatus('');
        setGenFailedAt(null);
    };

    const retryGeneration = () => {
        if (!genFailedAt) return;
        const { prompts, index, existingSlides, data } = genFailedAt;
        setGenFailedAt(null);
        generateOneGptSlide(prompts, index, existingSlides, data);
    };

    const approveSlide = () => {
        if (!gptPending) return;
        const { index, prompts, data } = gptPending;
        setGptPending(null);
        generateOneGptSlide(prompts, index + 1, slideImages, data);
    };

    const regenSlide = () => {
        if (!gptPending) return;
        const { index, prompts, data } = gptPending;
        setGptPending(null);
        generateOneGptSlide(prompts, index, slideImages, data);
    };

    const regenerateWithEditedPrompt = async () => {
        if (!editingPrompt.trim() || !carouselData) return;
        const slideIdx = activeSlide;
        const slide = carouselData.slides[slideIdx] || { id: 'cta', headline: carouselData.brand?.ctaHeadline };
        const promptObj = { slideId: slide.id, headline: slide.headline || '', prompt: editingPrompt.trim() };
        setShowPromptEditor(false);
        setGptPending(null);
        setIsGenerating(true);
        setGenStatus(`Regenerating slide ${slideIdx + 1} with edited prompt…`);
        try {
            const resp = await fetch(getApiUrl('/api/carousel/generate-images'), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompts: [promptObj], userId, brand: carouselData.brand }),
            });
            const result = await resp.json();
            if (!resp.ok) throw new Error(result?.error || `Server error ${resp.status}`);
            const newSlide = { ...result.slides[0], index: slideIdx };
            setSlideImages(prev => { const u = [...prev]; u[slideIdx] = newSlide; return u; });
            setMessages(prev => [...prev, { role: 'assistant', text: `✅ Slide ${slideIdx + 1} regenerated.` }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: `Regen failed: ${err.message}` }]);
        } finally { setIsGenerating(false); setGenStatus(''); }
    };

    // ── Edit slide content (headline/body) ─────────────────────────────────
    const [editingSlideHeadline, setEditingSlideHeadline] = useState('');
    const [editingSlideBody, setEditingSlideBody] = useState('');

    const openSlideEditor = () => {
        const slideData = carouselData.slides[activeSlide];
        const isCTA = activeSlide === slideImages.length - 1;
        if (isCTA) {
            setEditingSlideHeadline(carouselData.brand?.ctaHeadline || '');
            setEditingSlideBody(carouselData.brand?.ctaBody || '');
        } else if (slideData) {
            setEditingSlideHeadline(slideData.headline || '');
            setEditingSlideBody(slideData.body || '');
        }
        setShowSlideEditor(true);
    };

    const saveSlideEdits = () => {
        const isCTA = activeSlide === slideImages.length - 1;
        if (isCTA) {
            setCarouselData(prev => ({
                ...prev,
                brand: { ...prev.brand, ctaHeadline: editingSlideHeadline, ctaBody: editingSlideBody }
            }));
        } else {
            setCarouselData(prev => {
                const newSlides = [...prev.slides];
                newSlides[activeSlide] = {
                    ...newSlides[activeSlide],
                    headline: editingSlideHeadline,
                    body: editingSlideBody
                };
                return { ...prev, slides: newSlides };
            });
        }
        setShowSlideEditor(false);
    };

    // ── Generate — branches on imageEngine ─────────────────────────────────

    const generateCarousel = async (dataOverride) => {
        const data = dataOverride || carouselData;
        if (!data?.brand || !data?.slides) return;

        setIsGenerating(true);
        setSlideImages([]);
        setGptPending(null);

        try {
            // ── AI Image Generation (GPT Image 2 or Nano Banana 2) ─────────────────
            const allSlides = [
                ...data.slides,
                { id: 'cta', headline: data.brand.ctaHeadline || 'Ready?' },
            ];
            const design = DESIGN_SYSTEMS[artDirection];
            const totalSlides = allSlides.length;
            const pacing = STORY_PACING.getIntensityForIndex(0, totalSlides, 'cinematic');

            const prompts = allSlides.map((slide, i) => {
                const isLast = i === totalSlides - 1;
                const slidePacing = STORY_PACING.getIntensityForIndex(i, totalSlides, 'cinematic');
                const prevContext = i > 0 ? {
                    lighting: design.lighting,
                    artDirection: artDirection,
                    phase: slidePacing.phase,
                    emotionalGoal: slidePacing.emotionalGoal,
                } : null;

                // Run quality check on slide content
                const isBgLight = design.bg?.includes('F') || design.bg?.includes('fff');
                const quality = QUALITY_CHECKER.validate({
                    headline: slide.headline,
                    body: slide.body,
                    bg: design.bg,
                    text: isBgLight ? '#111111' : '#ffffff',
                    layout: LAYOUT_TEMPLATES[slide.id] || LAYOUT_TEMPLATES.hero,
                }, { headline: 10, visual: 6, body: 5 });

                const brandForPrompt = normalizeBrand(useBrandVoice ? brandVoice : null, data.brand);
                console.log('[GPT2 Debug] useBrandVoice:', useBrandVoice, 'brandVoice:', brandVoice, 'brandForPrompt:', brandForPrompt);
                
                // Get carousel type: from data (Hermes) or from selectedType (manual)
                // data.carouselType is full object, selectedType is just ID string
                const fullCarouselType = data.carouselType || 
                    CAROUSEL_TYPES.find(t => t.id === selectedType) || 
                    { id: 'classic-hook-cta', label: 'Classic Hook → CTA', emoji: '🎯' };
                
                console.log('[Prompt] Carousel type:', fullCarouselType.label, '| ID:', fullCarouselType.id);
                
                return {
                    slideId:  slide.id,
                    headline: slide.headline || '',
                    quality:  quality,
                    prompt:   buildVisualPrompt({
                        carouselType: fullCarouselType,
                        slideId:      slide.id,
                        artDirection: artDirection,
                        designIntensity: designIntensity,
                        iconStyle:    iconStyle,
                        typography:   typography,
                        brand:        brandForPrompt,
                        slideContent: { ...slide, _index: i },
                        previousSlideContext: prevContext,
                        isLastSlide: isLast,
                        storyPacing: slidePacing,
                    }),
                };
            });
            setGptQueue(prompts);
            setIsGenerating(false);
            // Start with slide 0 only
            generateOneGptSlide(prompts, 0, [], data);
            return;
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: `Generation failed: ${err.message}`,
            }]);
        } finally {
            setIsGenerating(false);
            setGenStatus('');
        }
    };

    // ── Download ──────────────────────────────────────────────────────────────

    const downloadSlide = (url, idx) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(carouselData?.brand?.name || 'carousel').replace(/\s/g, '-')}-slide-${idx + 1}.png`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const downloadAll = async () => {
        for (const slide of slideImages) {
            await downloadSlide(slide.url, slide.index);
            await new Promise(r => setTimeout(r, 300));
        }
    };

    // ── Trend Mode handler — auto-sets art direction and related settings ──────
    const handleTrendModeSelect = (modeId) => {
        if (!modeId) {
            setTrendMode(null);
            return;
        }
        const mode = TREND_MODES.find(m => m.id === modeId);
        if (mode) {
            setTrendMode(modeId);
            setArtDirection(mode.style);
            setHasManualArtDirection(true); // Mark as manual so Hermes won't override
            // Auto-set intensity based on trend
            if (mode.id === 'hormozi' || mode.id === 'street') {
                setDesignIntensity('aggressive');
            } else if (mode.id === 'apple' || mode.id === 'minimal') {
                setDesignIntensity('minimal');
            } else {
                setDesignIntensity('balanced');
            }
            // Auto-set icon style
            if (mode.id === 'cyberpunk' || mode.id === 'ai-cinema') {
                setIconStyle('neon');
            } else if (mode.id === 'luxury') {
                setIconStyle('chrome');
            } else if (mode.id === 'apple' || mode.id === 'minimal') {
                setIconStyle('minimal');
            } else {
                setIconStyle('outline');
            }
        }
    };

    // ── Reset ─────────────────────────────────────────────────────────────────

    const reset = () => {
        setSelectedType(null);
        setCarouselData(null);
        setSlideImages([]);
        setActiveSlide(0);
        setMessages([]);
        setHasManualArtDirection(false);
        // Note: artDirection and other settings are preserved as user preferences
    };
    
    // ── Reset ALL settings to defaults (including persisted settings) ─────────
    const resetAllSettings = () => {
        localStorage.removeItem('carousel_artDirection');
        localStorage.removeItem('carousel_designIntensity');
        localStorage.removeItem('carousel_iconStyle');
        localStorage.removeItem('carousel_typography');
        setArtDirection('cinematic');
        setDesignIntensity('balanced');
        setIconStyle('outline');
        setTypography('cinematic');
        setHasManualArtDirection(false);
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    const hasImages = slideImages.length > 0;
    const activeImg = slideImages.find(s => s.index === activeSlide)?.url || null;

    return (
        <div className="h-full w-full flex flex-col bg-[#0a0a0a] text-white overflow-hidden relative font-sans">
            {/* Header */}
            <div className="flex-none py-2 px-4 border-b border-white/10 flex items-center gap-3 z-10 bg-black/40 backdrop-blur-md">
                <div className="flex items-baseline gap-2 flex-shrink-0">
                    <h1 className="text-base font-black italic uppercase tracking-tighter bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent whitespace-nowrap">
                        Carousel Studio
                    </h1>
                </div>
                <div className="w-px h-5 bg-white/10 flex-shrink-0" />
                {/* Category Filter Tabs */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
                    {CAROUSEL_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => {
                                setActiveCategory(cat.id);
                                if (selectedType) {
                                    reset();
                                }
                            }}
                          className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-[10px] font-black uppercase tracking-wider transition-all flex-shrink-0",
                              activeCategory === cat.id
                                  ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                                  : "text-white/40 hover:text-white/80 hover:bg-white/5 border border-white/10"
                          )}
                        >
                            <cat.icon className={cn("w-2.5 h-2.5", activeCategory === cat.id ? "text-black" : cat.color)} />
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">

            {/* ════ LEFT: Chat ════ */}
            <div className="w-[360px] flex-shrink-0 flex flex-col border-r border-white/10 bg-black/30">

                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/20 shrink-0">
                    <LayoutGrid className="w-4 h-4 text-pink-400" />
                    {selectedType ? (() => {
                        const t = CAROUSEL_TYPES.find(x => x.id === selectedType);
                        const IconComponent = t?.icon;
                        return (
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                {IconComponent && <IconComponent className="w-4 h-4 text-pink-400" />}
                                <span className="text-[10px] font-black uppercase tracking-wider text-white/60 truncate">{t?.label}</span>
                                <button
                                    onClick={reset}
                                    className="ml-1 text-[9px] text-white/25 hover:text-white/60 border border-white/10 rounded-full px-1.5 py-0.5 transition-colors shrink-0">
                                    change
                                </button>
                            </div>
                        );
                    })() : (
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 flex-1">ZeroLens AI</span>
                    )}
                    {/* Engine dropdown */}
                    <div className="flex items-center gap-1 shrink-0 relative">
                        <select
                            value={imageEngine}
                            onChange={(e) => setImageEngine(e.target.value)}
                            className={cn(
                                'text-[9px] font-black px-2 py-0.5 rounded-lg border transition-all appearance-none cursor-pointer pr-6',
                                'bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.06]',
                                'focus:outline-none focus:border-pink-500/40'
                            )}
                            title="Select image generation engine"
                        >
                            {IMAGE_MODELS.map(m => {
                                const Icon = m.icon;
                                return (
                                    <option key={m.id} value={m.id} className="bg-[#1a1a2e] text-white flex items-center gap-2">
                                        {m.label} ({m.desc.split('·')[1]?.trim()})
                                    </option>
                                );
                            })}
                        </select>
                        <svg 
                            className="w-3 h-3 text-white/40 absolute right-1.5 pointer-events-none" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>

                    {/* Settings Toggle Button — Prominent & Professional */}
                    {(imageEngine === 'gpt-image' || imageEngine === 'nano-banana-2') && (
                        <button
                            onClick={() => setShowAdvancedSettings(v => !v)}
                            className={cn(
                                'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all shrink-0 ml-3',
                                'text-xs font-semibold tracking-wide',
                                showAdvancedSettings
                                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                                    : 'bg-gradient-to-r from-slate-800/80 to-slate-700/80 border-slate-600/50 text-slate-300 hover:text-white hover:border-slate-500'
                            )}>
                            <Settings2 className="w-4 h-4" />
                            <span>Settings</span>
                            {showAdvancedSettings && <X className="w-3 h-3 ml-1" />}
                        </button>
                    )}
                </div>

                {/* Professional Settings Panel */}
                {(imageEngine === 'gpt-image' || imageEngine === 'nano-banana-2') && showAdvancedSettings && (
                    <div className="px-4 py-4 border-b border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-xl space-y-4">
                        
                        {/* Section: Art Direction */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                <Palette className="w-4 h-4 text-purple-400" />
                                <span>Art Direction</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {ART_DIRECTIONS.map(dir => {
                                    const Icon = dir.icon;
                                    return (
                                        <button
                                            key={dir.id}
                                            onClick={() => { setArtDirection(dir.id); setHasManualArtDirection(true); setTrendMode(null); }}
                                            title={dir.desc}
                                            className={cn(
                                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all',
                                                'text-xs font-medium',
                                                artDirection === dir.id
                                                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                                                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                                            )}>
                                            <Icon className="w-3.5 h-3.5" />
                                            <span>{dir.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Section: Design Intensity */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                <Layers className="w-4 h-4 text-cyan-400" />
                                <span>Design Intensity</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {[
                                    { id: 'minimal', icon: CircleDot, label: 'Minimal' },
                                    { id: 'balanced', icon: Layers, label: 'Balanced' },
                                    { id: 'aggressive', icon: Zap, label: 'Bold' },
                                ].map(int => {
                                    const Icon = int.icon;
                                    return (
                                <button
                                    key={int.id}
                                    onClick={() => setDesignIntensity(int.id)}
                                    title={int.label}
                                    className={cn(
                                        'flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border transition-all',
                                        designIntensity === int.id
                                            ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                                            : 'bg-white/[0.03] border-white/10 text-white/30 hover:text-white/60'
                                    )}>
                                    <Icon className="w-3 h-3" />
                                    <span>{int.label}</span>
                                </button>
                            );
                            })}
                        </div>
                    </div>

                        {/* Icon Style */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] text-white/40 font-black uppercase tracking-wider">Icons</span>
                            {[
                                { id: 'minimal', label: 'Thin' },
                                { id: 'outline', label: 'Line' },
                                { id: 'filled', label: 'Solid' },
                                { id: 'neon', label: 'Neon' },
                                { id: 'chrome', label: 'Chrome' },
                                { id: 'glass', label: 'Glass' },
                            ].map(icon => (
                                <button
                                    key={icon.id}
                                    onClick={() => setIconStyle(icon.id)}
                                    className={cn(
                                        'text-[9px] font-black px-2 py-0.5 rounded-full border transition-all',
                                        iconStyle === icon.id
                                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                            : 'bg-white/[0.03] border-white/10 text-white/30 hover:text-white/60'
                                    )}>
                                    {icon.label}
                                </button>
                            ))}
                        </div>

                        {/* Typography */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] text-white/40 font-black uppercase tracking-wider">Type</span>
                            {[
                                { id: 'cinematic', icon: Film, label: 'Cinematic' },
                                { id: 'luxury', icon: Diamond, label: 'Luxury' },
                                { id: 'apple', icon: Apple, label: 'Apple' },
                                { id: 'streetwear', icon: Flame, label: 'Bold' },
                                { id: 'tech', icon: Zap, label: 'Tech' },
                                { id: 'editorial', icon: Type, label: 'Editorial' },
                                { id: 'minimal', icon: Square, label: 'Minimal' },
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setTypography(type.id)}
                                    title={TYPOGRAPHY_SYSTEMS[type.id]?.heading?.slice(0, 50)}
                                    className={cn(
                                        'flex items-center gap-1 px-2 py-1 rounded-full border transition-all text-[9px] font-black',
                                        typography === type.id
                                            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                                            : 'bg-white/[0.03] border-white/10 text-white/30 hover:text-white/60'
                                    )}>
                                    <type.icon className="w-3 h-3" />
                                    <span>{type.label}</span>
                                </button>
                            ))}
                        </div>
                        
                        {/* Reset Settings Button */}
                        <button
                            onClick={resetAllSettings}
                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400/80 text-xs font-semibold tracking-wide hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50 transition-all"
                            title="Reset all settings to defaults"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reset All Settings
                        </button>
                    </div>
                )}

                {/* Brand Voice Toggle */}
                {brandVoice?.brandName && (
                    <div className="px-4 py-2 border-b border-white/8 bg-black/20 shrink-0">
                        <button
                            onClick={() => setUseBrandVoice(v => !v)}
                            className={cn(
                                'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all',
                                useBrandVoice ? 'border-[#D4FF00]/40 bg-[#D4FF00]/5' : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                            )}>
                            <div className={cn(
                                'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                                useBrandVoice ? 'border-[#D4FF00] bg-[#D4FF00]' : 'border-white/30'
                            )}>
                                {useBrandVoice && <span className="text-black text-[9px] font-black">✓</span>}
                            </div>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {brandVoice.logoUrl && (
                                    <img src={brandVoice.logoUrl} className="w-5 h-5 rounded object-contain bg-white/10" alt="logo" />
                                )}
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-white/70 truncate">{brandVoice.brandName}</p>
                                    <p className="text-[9px] text-white/30 truncate">{brandVoice.tagline || brandVoice.whatTheyDo || 'Brand Voice Active'}</p>
                                </div>
                            </div>
                            <span className={cn('text-[9px] font-black uppercase tracking-wider shrink-0', useBrandVoice ? 'text-[#D4FF00]' : 'text-white/20')}>
                                {useBrandVoice ? 'ON' : 'OFF'}
                            </span>
                        </button>
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {!selectedType && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
                            <Palette className="w-12 h-12 text-pink-400" />
                            <p className="text-white/50 font-black text-sm uppercase tracking-wider">ZeroLens Carousel</p>
                            <p className="text-white/20 text-xs max-w-[200px] leading-relaxed">Pick a carousel type to start.</p>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                            {m.role === 'assistant' && (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                                    <Bot className="w-3 h-3 text-white" />
                                </div>
                            )}
                            <div className={cn(
                                'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words',
                                m.role === 'user'
                                    ? 'bg-white/10 text-white rounded-tr-sm'
                                    : 'bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 text-white/80 rounded-tl-sm'
                            )}>
                                {m.text}
                                {m.promptRecommendation && (
                                    <div className="mt-3 p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl space-y-2 select-text">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black text-pink-400 uppercase tracking-widest flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-pink-400" /> Hermes Recommendation
                                            </span>
                                            <span className="text-[8px] bg-white/5 border border-white/10 text-white/50 px-1.5 py-0.5 rounded uppercase font-bold font-mono">
                                                {m.promptRecommendation.suggestedModel}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Recommended Prompt:</p>
                                        <div className="text-[11px] text-white bg-black/40 p-2 rounded-lg border border-white/5 font-mono select-all whitespace-pre-wrap leading-normal font-bold">
                                            {m.promptRecommendation.expertPrompt}
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                            <button
                                                onClick={() => {
                                                    setInput(m.promptRecommendation.expertPrompt);
                                                }}
                                                className="px-2 py-1 bg-pink-500 hover:bg-pink-600 active:scale-95 text-white text-[9px] font-black rounded uppercase tracking-wider transition-all flex items-center gap-1"
                                            >
                                                Use Prompt
                                            </button>
                                            {m.promptRecommendation.parameters && (
                                                <div className="text-[8px] text-white/30 font-mono">
                                                    {Object.entries(m.promptRecommendation.parameters).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex gap-2 justify-start">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                                <Bot className="w-3 h-3 text-white" />
                            </div>
                            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                                {[0, 1, 2].map(i => (
                                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-pink-400/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Generation progress bar */}
                {isGenerating && (
                    <div className="px-4 py-2.5 border-t border-white/8 bg-black/30 shrink-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Loader2 className="w-3 h-3 text-pink-400 animate-spin shrink-0" />
                            <span className="text-[10px] text-white/40">{genStatus}</span>
                        </div>
                        <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-pink-500 to-orange-500 rounded-full animate-pulse w-2/3" />
                        </div>
                    </div>
                )}

                {/* Input */}
                <div className="p-3 border-t border-white/10 flex gap-2 items-end shrink-0">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder={selectedType ? 'Reply here… (Enter to send)' : 'Pick a carousel type first →'}
                        rows={1}
                        disabled={!selectedType || isGenerating}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-pink-500/40 resize-none transition-colors disabled:opacity-40"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isThinking || !selectedType || isGenerating}
                        className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shrink-0">
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* ════ RIGHT: Preview ════ */}
            <div className="flex-1 flex flex-col bg-[#050507] overflow-hidden">

                {/* ── Has slides ── */}
                {hasImages && carouselData ? (
                    <>
                        {/* Toolbar */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/30 shrink-0 flex-wrap gap-y-2">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: carouselData.brand?.color || '#fff' }} />
                                <span className="text-[11px] font-black uppercase tracking-widest text-white/60">{carouselData.brand?.name}</span>
                                <span className="text-[10px] text-white/25">{slideImages.length} slides · 1080×1350</span>
                            </div>
                            <div className="ml-auto flex gap-2">
                                {/* Cancel button while generating */}
                                {isGenerating && !gptPending && (imageEngine === 'gpt-image' || imageEngine === 'nano-banana-2') && (
                                    <>
                                        <span className="flex items-center text-[10px] text-amber-400/70 font-black uppercase tracking-wider gap-1.5">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            {genStatus || 'Generating…'}
                                        </span>
                                        <button
                                            onClick={cancelGeneration}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-wider hover:bg-red-500/25 transition-all">
                                            ✕ Cancel
                                        </button>
                                    </>
                                )}
                                {/* Retry button after failure */}
                                {!isGenerating && genFailedAt && (
                                    <>
                                        <span className="flex items-center text-[10px] text-red-400/70 font-black uppercase tracking-wider">
                                            Slide {genFailedAt.index + 1} failed
                                        </span>
                                        <button
                                            onClick={retryGeneration}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider hover:bg-amber-500/25 transition-all">
                                            <RefreshCw className="w-3 h-3" /> Retry
                                        </button>
                                        <button
                                            onClick={() => setGenFailedAt(null)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white/60 text-[10px] font-black uppercase tracking-wider hover:text-white hover:bg-white/10 transition-all">
                                            ✕ Dismiss
                                        </button>
                                    </>
                                )}
                                {/* GPT Image approval buttons */}
                                {gptPending && (imageEngine === 'gpt-image' || imageEngine === 'nano-banana-2') && (
                                    <>
                                        <span className="flex items-center text-[10px] text-white/40 font-black uppercase tracking-wider">
                                            Slide {gptPending.index + 1}/{gptQueue.length} — approve?
                                        </span>
                                        {/* Quality Grade Badge */}
                                        {gptQueue[gptPending.index]?.quality && (
                                            <span className={cn(
                                                "flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider",
                                                gptQueue[gptPending.index].quality.grade === 'A' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                gptQueue[gptPending.index].quality.grade === 'B' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                gptQueue[gptPending.index].quality.grade === 'C' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                'bg-red-500/20 text-red-400 border border-red-500/30'
                                            )} title={gptQueue[gptPending.index].quality.issues.join('\n') || 'Quality check passed'}>
                                                {gptQueue[gptPending.index].quality.grade} · {gptQueue[gptPending.index].quality.score}%
                                            </span>
                                        )}
                                        <button
                                            onClick={regenSlide}
                                            disabled={isGenerating}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white/60 text-[10px] font-black uppercase tracking-wider hover:text-white hover:bg-white/10 transition-all disabled:opacity-40">
                                            <RefreshCw className="w-3 h-3" /> Redo
                                        </button>
                                        <button
                                            onClick={approveSlide}
                                            disabled={isGenerating}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/30">
                                            ✓ Approve &amp; Next
                                        </button>
                                    </>
                                )}
                                {!gptPending && (
                                <button
                                    onClick={() => generateCarousel()}
                                    disabled={isGenerating}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-pink-900/30">
                                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    {isGenerating ? 'Generating…' : 'Regenerate'}
                                </button>
                                )}
                                <button
                                    onClick={downloadAll}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white/60 text-[10px] font-black uppercase tracking-wider hover:text-white hover:bg-white/10 transition-all">
                                    <Download className="w-3 h-3" /> Download All
                                </button>
                                <button
                                    onClick={reset}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-wider hover:text-white hover:bg-white/10 transition-all">
                                    <RefreshCw className="w-3 h-3" /> New
                                </button>
                            </div>
                        </div>

                        {/* Thumbnail strip */}
                        <div className="flex gap-2 px-4 py-3 border-b border-white/8 overflow-x-auto no-scrollbar shrink-0">
                            {slideImages.map((slide) => (
                                <button
                                    key={slide.index}
                                    onClick={() => setActiveSlide(slide.index)}
                                    className={cn(
                                        'shrink-0 rounded-xl overflow-hidden border-2 transition-all hover:scale-105',
                                        activeSlide === slide.index
                                            ? 'border-pink-500 shadow-lg shadow-pink-900/40'
                                            : 'border-white/10 opacity-60 hover:opacity-100'
                                    )}>
                                    <div style={{ width: 64, aspectRatio: '4/5' }}>
                                        <img src={slide.url} className="w-full h-full object-contain bg-black" alt={`Slide ${slide.index + 1}`} />
                                    </div>
                                </button>
                            ))}
                            
                            {/* Generating placeholders */}
                            {isGenerating && gptQueue.length > 0 && (
                                <>
                                    {/* Show placeholder for current generating slide */}
                                    {gptPending === null && (
                                        <div className="shrink-0 rounded-xl overflow-hidden border-2 border-amber-500/50 bg-amber-500/10 flex items-center justify-center" style={{ width: 64, aspectRatio: '4/5' }}>
                                            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                                        </div>
                                    )}
                                    {/* Show pending placeholders for remaining slides */}
                                    {Array.from({ length: Math.max(0, gptQueue.length - slideImages.length - (gptPending ? 1 : 0)) }).map((_, i) => (
                                        <div key={`pending-${i}`} className="shrink-0 rounded-xl overflow-hidden border-2 border-white/5 bg-white/5 flex items-center justify-center" style={{ width: 64, aspectRatio: '4/5' }}>
                                            <span className="text-white/20 text-[10px]">...</span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>

                        {/* Active slide */}
                        <div className="flex-1 overflow-y-auto flex items-start justify-center p-6 custom-scrollbar">
                            <div className="flex gap-8 items-start max-w-3xl w-full">

                                {/* Phone frame */}
                                <div className="shrink-0" style={{ width: 320 }}>
                                    <div
                                        className="rounded-[28px] overflow-hidden border-2 border-white/15 shadow-2xl shadow-black/80 bg-black"
                                        style={{ aspectRatio: '4/5' }}>
                                        {activeImg
                                            ? <img src={activeImg} className="w-full h-full object-contain" alt={`Slide ${activeSlide + 1}`} />
                                            : isGenerating && gptQueue.length > 0
                                                ? <div className="w-full h-full bg-gradient-to-br from-[#1a0a2e] to-[#0a0a1e] flex flex-col items-center justify-center gap-4">
                                                    <div className="relative">
                                                        <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="text-[10px] font-black text-white/60">{slideImages.length + 1}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-black text-white/80">Generating…</p>
                                                        <p className="text-xs text-white/40 mt-1">
                                                            Slide {slideImages.length + 1} of {gptQueue.length}
                                                        </p>
                                                        <p className="text-[10px] text-white/30 mt-2 uppercase tracking-wider">
                                                            {imageEngine === 'gpt-image' ? 'GPT Image 2' : imageEngine === 'nano-banana-2' ? 'Nano Banana 2' : 'HTML Render'}
                                                        </p>
                                                    </div>
                                                    {/* Progress bar */}
                                                    <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-pink-500 to-orange-500 transition-all duration-300"
                                                            style={{ width: `${((slideImages.length) / gptQueue.length) * 100}%` }}
                                                        />
                                                    </div>
                                                  </div>
                                                : <div className="w-full h-full bg-gradient-to-br from-[#1a0a2e] to-[#0a0a1e] flex items-center justify-center">
                                                    <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
                                                  </div>
                                        }
                                    </div>
                                    {/* Prev / dot nav / Next */}
                                    <div className="flex justify-between items-center mt-3">
                                        <button
                                            onClick={() => setActiveSlide(p => Math.max(0, p - 1))}
                                            disabled={activeSlide === 0}
                                            className="p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white disabled:opacity-20 transition-all">
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <div className="flex gap-1 items-center">
                                            {slideImages.map((_, pi) => (
                                                <button
                                                    key={pi}
                                                    onClick={() => setActiveSlide(pi)}
                                                    className={cn('rounded-full transition-all',
                                                        pi === activeSlide ? 'w-5 h-1.5 bg-pink-400' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
                                                    )} />
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setActiveSlide(p => Math.min(slideImages.length - 1, p + 1))}
                                            disabled={activeSlide === slideImages.length - 1}
                                            className="p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white disabled:opacity-20 transition-all">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Slide info panel */}
                                <div className="flex-1 space-y-4 pt-2 min-w-0">
                                    {(() => {
                                        // Find the slide data by index
                                        const slideData = carouselData.slides[activeSlide] || carouselData.slides[0];
                                        const isCTA     = activeSlide === slideImages.length - 1;
                                        return (
                                            <>
                                                <div>
                                                    <p className="text-[9px] text-pink-400/60 font-black uppercase tracking-[0.3em] mb-1">
                                                        Slide {activeSlide + 1} of {slideImages.length}
                                                        {isCTA ? ' · CTA' : ` · ${slideData?.id || ''}`}
                                                    </p>
                                                    <p className="text-white font-black text-lg leading-tight">
                                                        {isCTA
                                                            ? carouselData.brand?.ctaHeadline
                                                            : (slideData?.headline || carouselData.brand?.hook)}
                                                    </p>
                                                    <p className="text-white/40 text-xs mt-1">
                                                        {isCTA
                                                            ? carouselData.brand?.ctaBody
                                                            : slideData?.body}
                                                    </p>
                                                </div>

                                                {/* GPT Prompt */}
{(imageEngine === 'gpt-image' || imageEngine === 'nano-banana-2') && (
<div className="bg-[#0a0a1a] border border-pink-500/20 rounded-xl p-3 space-y-2">
    <div className="flex items-center justify-between">
        <p className="text-[9px] text-pink-400/70 font-black uppercase tracking-[0.2em]">GPT Prompt</p>
        <button onClick={() => { const p = gptQueue?.[activeSlide]?.prompt || ''; setEditingPrompt(p); setShowPromptEditor(!showPromptEditor); }}
            className="p-1 rounded text-white/25 hover:text-pink-400 hover:bg-white/5 transition-all"><Edit3 className="w-3 h-3" /></button>
    </div>
    {showPromptEditor && (
        <div className="space-y-2">
            <textarea value={editingPrompt} onChange={e => setEditingPrompt(e.target.value)} rows={5}
                className="w-full bg-black/50 border border-pink-500/30 rounded-lg px-3 py-2 text-[11px] text-white/80 font-mono resize-y outline-none focus:border-pink-500/60"
                placeholder="Edit prompt…" />
            <button onClick={regenerateWithEditedPrompt} disabled={isGenerating || !editingPrompt.trim()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider hover:scale-105 transition-all disabled:opacity-40">
                <Sparkles className="w-3 h-3" /> Regenerate
            </button>
        </div>
    )}
    {!showPromptEditor && (
        <p className="text-white/40 text-[10px] leading-relaxed font-mono line-clamp-3">
            {gptQueue?.[activeSlide]?.prompt || 'No prompt'}
        </p>
    )}
</div>
)}

{/* Brand system info */}
                                                <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3 space-y-2">
                                                    <p className="text-[9px] text-white/25 font-black uppercase tracking-[0.2em]">Brand System</p>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="w-4 h-4 rounded-full border border-white/10 shrink-0" style={{ background: carouselData.brand?.color }} />
                                                        <span className="text-white/40 text-[11px]">{carouselData.brand?.color}</span>
                                                        <span className="text-white/20 text-[11px]">·</span>
                                                        <span className="text-white/40 text-[11px] capitalize">{carouselData.brand?.fontStyle || 'modern'}</span>
                                                        <span className="text-white/20 text-[11px]">·</span>
                                                        <span className="text-white/40 text-[11px]">@{carouselData.brand?.handle}</span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 flex-wrap">
                                                    <button
                                                        onClick={() => activeImg && downloadSlide(activeImg, activeSlide)}
                                                        disabled={!activeImg}
                                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all disabled:opacity-30 shadow-md shadow-pink-900/30">
                                                        <Download className="w-3 h-3" /> Save PNG
                                                    </button>
                                                    <button
                                                        onClick={openSlideEditor}
                                                        disabled={!activeImg}
                                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-[10px] font-black uppercase tracking-wider hover:bg-white/15 active:scale-95 transition-all disabled:opacity-30">
                                                        <Edit3 className="w-3 h-3" /> Edit Post
                                                    </button>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Slide Content Editor Modal */}
                        {showSlideEditor && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                                <div className="bg-[#0f0f1a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-white font-black text-sm uppercase tracking-wider">Edit Slide Content</p>
                                        <button onClick={() => setShowSlideEditor(false)} className="p-1 rounded text-white/40 hover:text-white hover:bg-white/5">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1.5 block">Headline</label>
                                            <textarea
                                                value={editingSlideHeadline}
                                                onChange={e => setEditingSlideHeadline(e.target.value)}
                                                rows={2}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none outline-none focus:border-pink-500/50"
                                                placeholder="Enter headline..."
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1.5 block">Body Text</label>
                                            <textarea
                                                value={editingSlideBody}
                                                onChange={e => setEditingSlideBody(e.target.value)}
                                                rows={3}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none outline-none focus:border-pink-500/50"
                                                placeholder="Enter body text..."
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={saveSlideEdits}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider hover:scale-105 transition-all">
                                                <Check className="w-3 h-3" /> Save Changes
                                            </button>
                                            <button
                                                onClick={() => setShowSlideEditor(false)}
                                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 transition-all">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>

                ) : isThinking ? (
                    /* ── Thinking / Brief drafting state ── */
                    <div className="flex-1 flex flex-col items-center justify-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-950/55 animate-pulse">
                            <Bot className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-black text-sm uppercase tracking-wider mb-2">AI Creative Director Thinking</p>
                            <p className="text-white/30 text-xs max-w-[280px] leading-relaxed">Analyzing your brand, brainstorming visual hooks, and scripting high-converting headlines…</p>
                        </div>
                        <div className="flex gap-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="rounded-lg bg-white/5 border border-white/8 animate-pulse" style={{ width: 45, height: 45, animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                    </div>

                ) : isGenerating ? (
                    /* ── Generating state ── */
                    <div className="flex-1 flex flex-col items-center justify-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-xl shadow-pink-900/40">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-black text-sm uppercase tracking-wider mb-2">Building Your Carousel</p>
                            <p className="text-white/30 text-xs max-w-[240px] leading-relaxed">{genStatus || 'Rendering 1080×1350px slides…'}</p>
                        </div>
                        <div className="flex gap-2">
                            {[...Array(7)].map((_, i) => (
                                <div key={i} className="rounded-lg bg-white/5 border border-white/8 animate-pulse" style={{ width: 40, height: 50, animationDelay: `${i * 0.1}s` }} />
                            ))}
                        </div>
                    </div>

                ) : selectedType ? (
                    /* ── Type selected, waiting for chat ── */
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="max-w-lg mx-auto">
                            {(() => {
                                const t = CAROUSEL_TYPES.find(x => x.id === selectedType);
                                return (
                                    <>
                                        <div className={cn('rounded-2xl bg-gradient-to-br p-px mb-6', t.color)}>
                                            <div className="rounded-2xl bg-[#080810] p-5 flex items-center gap-3">
                                                {(() => { const Icon = t.icon; return <Icon className="w-8 h-8 text-pink-400" />; })()}
                                                <div>
                                                    <p className="text-white font-black text-lg tracking-tight">{t.label}</p>
                                                    <p className="text-white/40 text-xs">{t.desc}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-3">Pipeline Status</p>
                                        <div className="space-y-2.5">
                                            {[
                                                { n: '01', title: 'Chat with AI',          desc: 'Awaiting your brand topic in the chat…', active: true },
                                                { n: '02', title: 'Color System Built',    desc: '6-token palette derived from your brand color', upcoming: true },
                                                { n: '03', title: 'Typography Set',        desc: 'Google Fonts pairing matched to your style', upcoming: true },
                                                { n: '04', title: 'Playwright Renders',    desc: 'Each slide captured at 1080×1350px', upcoming: true },
                                                { n: '05', title: 'Download & Post',       desc: 'Instagram-ready PNGs in seconds', upcoming: true },
                                            ].map(item => (
                                                <div 
                                                    key={item.n} 
                                                    className={cn(
                                                        "flex items-start gap-3 rounded-2xl px-4 py-3.5 border transition-all duration-300",
                                                        item.active 
                                                            ? "bg-pink-500/[0.04] border-pink-500/35 shadow-[0_0_15px_rgba(244,114,182,0.05)] animate-pulse" 
                                                            : "bg-white/[0.02] border-white/5 opacity-45"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "text-[10px] font-black min-w-[24px] flex items-center gap-1",
                                                        item.active ? "text-pink-400" : "text-white/30"
                                                    )}>
                                                        {item.active && <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping shrink-0" />}
                                                        {item.n}
                                                    </span>
                                                    <div>
                                                        <p className={cn(
                                                            "text-[11px] font-black tracking-wide uppercase",
                                                            item.active ? "text-pink-300" : "text-white/60"
                                                        )}>{item.title}</p>
                                                        <p className="text-white/30 text-[10px] mt-1 font-medium">{item.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-white/15 text-center mt-6">← Answer the questions in the chat</p>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                ) : (
                    /* ── Type picker ── */
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#050507]">
                        <div className="max-w-4xl mx-auto space-y-10">
                            {activeCategory === 'all' ? (
                                <>
                                    {/* Main Intro */}
                                    <div className="mb-6 space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2.5 py-1 rounded-md">
                                            Dual-Engine Creation
                                        </span>
                                        <h2 className="text-white font-black text-3xl tracking-tight mt-2">
                                            What kind of carousel?
                                        </h2>
                                        <p className="text-white/40 text-sm max-w-xl font-medium">
                                            Choose an empty format framework to craft your storyline from scratch, or browse the industry presets below for instant high-converting copywriting.
                                        </p>
                                    </div>
                                    
                                    {/* Carousel Types Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {CAROUSEL_TYPES.map(type => {
                                            const Icon = type.icon;
                                            return (
                                                <button
                                                    key={type.id}
                                                    onClick={() => handleSelectType(type)}
                                                    className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left hover:border-white/25 hover:bg-white/[0.05] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] overflow-hidden flex flex-col justify-between h-[150px] shadow-md hover:shadow-lg shadow-black/20"
                                                >
                                                    <div className="flex items-start justify-between w-full">
                                                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center group-hover:bg-pink-500/10 group-hover:border-pink-500/30 transition-all duration-300">
                                                            <Icon className="w-5 h-5 text-pink-400" />
                                                        </div>
                                                        <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all mt-0.5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-black text-sm tracking-tight group-hover:text-pink-400 transition-colors">{type.label}</p>
                                                        <p className="text-white/35 text-[10px] mt-1 leading-snug line-clamp-2">{type.desc}</p>
                                                    </div>
                                                    <div className={cn('absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-all duration-300', type.color)} />
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Featured industry presets section */}
                                    <div className="space-y-4 pt-6">
                                        <div className="flex items-baseline justify-between border-b border-white/5 pb-3">
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-400">Featured Templates</span>
                                                <h3 className="text-white font-black text-xl mt-1">Pre-configured industry presets</h3>
                                            </div>
                                            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Scroll for more industry tabs ↑</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {Object.keys(CATEGORY_PRESETS).flatMap(catId => 
                                                CATEGORY_PRESETS[catId].map(preset => ({ ...preset, categoryId: catId }))
                                            ).slice(0, 3).map(preset => {
                                                return (
                                                    <button
                                                        key={preset.id}
                                                        onClick={() => handleSelectPreset(preset)}
                                                        className="group relative rounded-2xl border border-white/10 bg-black/40 hover:border-pink-500/50 hover:bg-[#111115] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden flex flex-col h-full shadow-lg"
                                                    >
                                                        {/* Image Container */}
                                                        <div className="w-full aspect-[16/10] relative overflow-hidden bg-black/40 border-b border-white/5">
                                                            <img 
                                                                src={preset.imageUrl} 
                                                                alt={preset.name} 
                                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1" 
                                                            />
                                                            {/* Gradient Overlay */}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                            
                                                            {/* Layout Type Badge */}
                                                            <span className="absolute top-3 left-3 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/60 border border-white/10 text-white shadow-sm">
                                                                {preset.type.replace(/-/g, ' ')}
                                                            </span>
                                                            
                                                            {/* Category Label */}
                                                            <span className="absolute top-3 right-3 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-pink-500/20 border border-pink-500/30 text-pink-300 shadow-sm">
                                                                {preset.categoryId}
                                                            </span>
                                                            
                                                            {/* Sparkles Icon */}
                                                            <div className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                                                                <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Info Content */}
                                                        <div className="p-4 flex-1 flex flex-col justify-between space-y-1">
                                                            <div>
                                                                <h4 className="text-white font-black text-sm tracking-tight group-hover:text-pink-400 transition-colors">
                                                                    {preset.name}
                                                                </h4>
                                                                <p className="text-white/40 text-[10px] mt-1 font-medium leading-relaxed">
                                                                    {preset.desc}
                                                                </p>
                                                            </div>
                                                            <div className="pt-3 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-pink-500 group-hover:text-pink-400 transition-colors">
                                                                <span>Launch Preset</span>
                                                                <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Colored Bottom Bar */}
                                                        <div className={cn('absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-all duration-300', preset.color)} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Category Specific Presets View */}
                                    <div className="mb-6 space-y-2 border-b border-white/5 pb-4 flex justify-between items-end">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2.5 py-1 rounded-md">
                                                {CAROUSEL_CATEGORIES.find(c => c.id === activeCategory)?.label} Presets
                                            </span>
                                            <h2 className="text-white font-black text-3xl tracking-tight mt-3">
                                                Select a premium template
                                            </h2>
                                            <p className="text-white/40 text-xs mt-1 font-medium">
                                                Instant high-converting copywriting brief combined with professional art-direction styling.
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => setActiveCategory('all')}
                                            className="text-[10px] text-white/40 hover:text-white border border-white/10 rounded-lg px-2.5 py-1 transition-colors font-bold uppercase"
                                        >
                                            ← Back to formats
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {(CATEGORY_PRESETS[activeCategory] || []).map(preset => {
                                            return (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => handleSelectPreset(preset)}
                                                    className="group relative rounded-2xl border border-white/10 bg-black/40 hover:border-pink-500/50 hover:bg-[#111115] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden flex flex-col h-full shadow-lg"
                                                >
                                                    {/* Image Container */}
                                                    <div className="w-full aspect-[16/10] relative overflow-hidden bg-black/40 border-b border-white/5">
                                                        <img 
                                                            src={preset.imageUrl} 
                                                            alt={preset.name} 
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1" 
                                                        />
                                                        {/* Gradient Overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                        
                                                        {/* Layout Type Badge */}
                                                        <span className="absolute top-3 left-3 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/60 border border-white/10 text-white shadow-sm">
                                                            {preset.type.replace(/-/g, ' ')}
                                                        </span>
                                                        
                                                        {/* Sparkles Icon */}
                                                        <div className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                                                            <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Info Content */}
                                                    <div className="p-4 flex-1 flex flex-col justify-between space-y-1">
                                                        <div>
                                                            <h4 className="text-white font-black text-sm tracking-tight group-hover:text-pink-400 transition-colors">
                                                                {preset.name}
                                                            </h4>
                                                            <p className="text-white/40 text-[10px] mt-1 font-medium leading-relaxed">
                                                                {preset.desc}
                                                            </p>
                                                        </div>
                                                        <div className="pt-3 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-pink-500 group-hover:text-pink-400 transition-colors">
                                                            <span>Launch Preset</span>
                                                            <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Colored Bottom Bar */}
                                                    <div className={cn('absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-all duration-300', preset.color)} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
}
