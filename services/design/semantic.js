// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC BREAKING ENGINE — Intelligent text line breaking
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Breaking Strategies ──────────────────────────────────────────────────────────
const STRATEGIES = {
  // Strategy 1: Isolate punch words at line end for impact
  punchWord: (text) => {
    const punchWords = ['now', 'today', 'free', 'proven', 'secret', 'guaranteed', 'instantly', 'finally', 'discover'];
    const words = text.split(' ');
    const lastWord = words[words.length - 1].toLowerCase().replace(/[.,!?;:]$/, '');
    
    if (punchWords.includes(lastWord) && words.length > 3) {
      // Break before punch word if possible
      return words.slice(0, -1).join(' ') + '\n' + words[words.length - 1];
    }
    return null;
  },
  
  // Strategy 2: Split at natural punctuation
  punctuation: (text) => {
    const breakPoints = ['. ', '? ', '! ', ' — ', ': ', '; '];
    for (const bp of breakPoints) {
      const idx = text.indexOf(bp);
      if (idx > 20 && idx < text.length - 10) {
        return text.slice(0, idx + 1) + '\n' + text.slice(idx + 2);
      }
    }
    return null;
  },
  
  // Strategy 3: Phrase boundary detection
  phraseBoundary: (text) => {
    const phraseStarters = ['and', 'but', 'or', 'yet', 'so', 'for', 'nor', 'because', 'when', 'while', 'if', 'unless'];
    const words = text.split(' ');
    
    for (let i = Math.floor(words.length / 2); i < words.length - 2; i++) {
      if (phraseStarters.includes(words[i].toLowerCase())) {
        return words.slice(0, i).join(' ') + '\n' + words.slice(i).join(' ');
      }
    }
    return null;
  },
  
  // Strategy 4: Balanced midpoint (fallback)
  balancedMidpoint: (text, targetLines = 2) => {
    const words = text.split(' ');
    if (words.length < 4) return text;
    
    const targetWordsPerLine = Math.floor(words.length / targetLines);
    const lines = [];
    
    for (let i = 0; i < targetLines; i++) {
      const start = i * targetWordsPerLine;
      const end = i === targetLines - 1 ? words.length : (i + 1) * targetWordsPerLine;
      lines.push(words.slice(start, end).join(' '));
    }
    
    return lines.join('\n');
  },
  
  // Strategy 5: Natural pause points (commas, conjunctions)
  naturalPause: (text) => {
    const pauses = [', and ', ', but ', ', or ', ', while ', ', when '];
    const midPoint = Math.floor(text.length / 2);
    
    let bestBreak = -1;
    let bestDistance = Infinity;
    
    for (const pause of pauses) {
      let idx = text.indexOf(pause);
      while (idx !== -1) {
        const distance = Math.abs(idx - midPoint);
        if (distance < bestDistance && idx > 15) {
          bestDistance = distance;
          bestBreak = idx;
        }
        idx = text.indexOf(pause, idx + 1);
      }
    }
    
    if (bestBreak > 0) {
      return text.slice(0, bestBreak + 1) + '\n' + text.slice(bestBreak + 2);
    }
    return null;
  },
};

// ─── Smart Break Engine ───────────────────────────────────────────────────────────
export const smartBreak = (text, options = {}) => {
  const {
    maxLength = 55,
    maxLines = 2,
    preferPunchWords = true,
    minLineLength = 15,
  } = options;
  
  if (!text || text.length <= maxLength) {
    return { text, broken: false, lines: 1, strategy: 'none' };
  }
  
  // Try strategies in order of preference
  const strategies = [
    preferPunchWords && STRATEGIES.punchWord,
    STRATEGIES.punctuation,
    STRATEGIES.naturalPause,
    STRATEGIES.phraseBoundary,
    STRATEGIES.balancedMidpoint,
  ].filter(Boolean);
  
  for (const strategy of strategies) {
    const result = strategy(text);
    if (result) {
      const lines = result.split('\n');
      const valid = lines.every(line => 
        line.length >= minLineLength && 
        line.length <= maxLength
      );
      
      if (valid && lines.length <= maxLines) {
        return {
          text: result,
          broken: true,
          lines: lines.length,
          strategy: strategy.name,
          lineLengths: lines.map(l => l.length),
        };
      }
    }
  }
  
  // Fallback: hard truncate with ellipsis
  const truncated = text.slice(0, maxLength - 3).trim();
  const lastSpace = truncated.lastIndexOf(' ');
  const clean = lastSpace > minLineLength 
    ? truncated.slice(0, lastSpace) + '...'
    : truncated + '...';
    
  return {
    text: clean,
    broken: true,
    lines: 1,
    strategy: 'truncate',
    truncated: true,
  };
};

// ─── Multi-Line Optimizer ───────────────────────────────────────────────────────
export const optimizeLines = (text, maxWidth, lineHeight, maxLines = 3) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  // Simple greedy line breaking
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = testLine.length * 0.6; // rough char width estimate
    
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      
      if (lines.length >= maxLines - 1) {
        // Last line gets remainder
        currentLine = words.slice(words.indexOf(word)).join(' ');
        break;
      }
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  // Balance the lines for visual harmony
  if (lines.length > 1) {
    const avgLength = lines.reduce((a, b) => a + b.length, 0) / lines.length;
    const variance = lines.reduce((acc, line) => acc + Math.pow(line.length - avgLength, 2), 0) / lines.length;
    
    return {
      text: lines.join('\n'),
      lines: lines.length,
      balanced: variance < 100,
      lineLengths: lines.map(l => l.length),
    };
  }
  
  return {
    text: lines.join('\n'),
    lines: lines.length,
    balanced: true,
    lineLengths: lines.map(l => l.length),
  };
};

// ─── Content Density Analyzer ─────────────────────────────────────────────────────
export const analyzeContentDensity = (headline, body, features = []) => {
  const headlineChars = headline?.length || 0;
  const bodyChars = body?.length || 0;
  const featureCount = features?.length || 0;
  
  const totalChars = headlineChars + bodyChars;
  const totalElements = (headline ? 1 : 0) + (body ? 1 : 0) + featureCount;
  
  // Density score (0-100)
  const charDensity = Math.min(100, (totalChars / 200) * 100);
  const elementDensity = Math.min(100, (totalElements / 5) * 100);
  const densityScore = (charDensity * 0.6) + (elementDensity * 0.4);
  
  let classification = 'sparse';
  if (densityScore > 70) classification = 'dense';
  else if (densityScore > 40) classification = 'balanced';
  
  return {
    score: Math.round(densityScore),
    classification,
    headlineChars,
    bodyChars,
    featureCount,
    recommendations: generateDensityRecommendations(densityScore, totalElements),
  };
};

const generateDensityRecommendations = (score, elements) => {
  const recs = [];
  
  if (score > 80) {
    recs.push('Content density is very high — consider removing 1-2 elements');
    recs.push('Text may be difficult to read at glance speed');
  } else if (score > 60) {
    recs.push('Good information density — ensure visual hierarchy is clear');
  } else if (score < 20) {
    recs.push('Very sparse — consider adding supporting details');
  }
  
  if (elements > 6) {
    recs.push('Too many distinct elements — merge or remove for clarity');
  }
  
  return recs;
};

// ─── Typography Scale Calculator ──────────────────────────────────────────────────
export const calculateOptimalTypography = (text, availableSpace, type = 'headline') => {
  const len = text?.length || 0;
  const { width, height } = availableSpace;
  
  // Base size calculation
  let baseSize;
  if (type === 'headline') {
    if (len < 20) baseSize = 42;
    else if (len < 35) baseSize = 36;
    else if (len < 50) baseSize = 30;
    else baseSize = 28;
  } else {
    baseSize = 14;
  }
  
  // Width constraint adjustment
  const estimatedWidth = len * (baseSize * 0.6);
  if (estimatedWidth > width) {
    const scaleFactor = width / estimatedWidth;
    baseSize = Math.floor(baseSize * scaleFactor * 0.95);
  }
  
  // Height constraint for multi-line
  const estimatedLines = Math.ceil(estimatedWidth / width);
  const lineHeight = type === 'headline' ? 1.1 : 1.5;
  const estimatedHeight = estimatedLines * baseSize * lineHeight;
  
  if (estimatedHeight > height) {
    const heightScale = height / estimatedHeight;
    baseSize = Math.floor(baseSize * heightScale * 0.9);
  }
  
  // Minimums
  baseSize = Math.max(type === 'headline' ? 24 : 12, baseSize);
  
  return {
    fontSize: baseSize,
    lineHeight: type === 'headline' ? 1.1 : 1.5,
    letterSpacing: type === 'headline' ? (len > 40 ? '-0.01em' : '-0.02em') : '0',
    estimatedLines,
    fits: estimatedHeight <= height && estimatedWidth <= width * estimatedLines,
  };
};
