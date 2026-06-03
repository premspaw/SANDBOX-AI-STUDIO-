// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN SCORING ENGINE — Evaluates and scores carousel designs
// Auto-fixes weak slides before export
// ═══════════════════════════════════════════════════════════════════════════════

export class DesignScoringEngine {
  constructor() {
    this.thresholds = {
      readability: 0.7,
      hierarchy: 0.7,
      whitespace: 0.6,
      attention: 0.7,
      balance: 0.6,
      emotional: 0.6,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SCORE SLIDE — Full evaluation
  // ═══════════════════════════════════════════════════════════════════════════════

  scoreSlide(slideData, brief, slideIndex) {
    const scores = {
      readability: this.scoreReadability(slideData),
      hierarchy: this.scoreHierarchy(slideData),
      whitespace: this.scoreWhitespace(slideData, brief, slideIndex),
      attention: this.scoreAttentionFlow(slideData),
      balance: this.scoreVisualBalance(slideData),
      emotional: this.scoreEmotionalConsistency(slideData, brief, slideIndex),
    };

    // Calculate overall score
    const weights = {
      readability: 0.2,
      hierarchy: 0.2,
      whitespace: 0.15,
      attention: 0.15,
      balance: 0.15,
      emotional: 0.15,
    };

    const overall = Object.entries(scores).reduce((sum, [key, score]) => {
      return sum + (score * weights[key]);
    }, 0);

    // Determine grade
    const grade = this.calculateGrade(overall);

    // Identify issues
    const issues = this.identifyIssues(scores);

    // Generate fixes
    const fixes = this.generateFixes(issues, slideData, brief);

    return {
      scores,
      overall: Math.round(overall * 100),
      grade,
      issues,
      fixes,
      passed: overall >= 0.7,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // INDIVIDUAL SCORING FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  scoreReadability(slideData) {
    const { headline, body } = slideData;
    let score = 1.0;

    // Check headline length
    if (headline) {
      const hLen = headline.length;
      const hWords = headline.split(/\s+/).length;
      
      if (hLen > 60) score -= 0.2; // Too long
      if (hLen > 80) score -= 0.3; // Way too long
      if (hWords > 12) score -= 0.2; // Too many words
    }

    // Check body length
    if (body) {
      const bLen = body.length;
      if (bLen > 120) score -= 0.15;
      if (bLen > 150) score -= 0.25;
    }

    // Check for all caps (harder to read)
    if (headline && headline === headline.toUpperCase()) {
      score -= 0.1;
    }

    return Math.max(0, score);
  }

  scoreHierarchy(slideData) {
    const { headline, body, hasVisual } = slideData;
    let score = 0.8;

    // Check headline dominance
    if (headline && body) {
      const hLen = headline.length;
      const bLen = body.length;
      
      // Headline should be shorter than body
      if (hLen < bLen * 0.5) {
        score += 0.1;
      }
      
      // Headline shouldn't be too close to body length
      if (hLen > bLen * 0.8) {
        score -= 0.2;
      }
    }

    // Visual elements should support, not compete
    if (hasVisual) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  scoreWhitespace(slideData, brief, slideIndex) {
    const { textDensity } = slideData;
    let score = 0.7;

    // Get expected whitespace from brief
    const expectedWhitespace = brief.designDNA?.whitespaceRatio || 'balanced';
    
    const targets = {
      dense: 0.7,
      balanced: 0.45,
      editorial: 0.3,
      minimal: 0.2,
    };

    const target = targets[expectedWhitespace] || 0.45;
    const actual = textDensity || 0.5;

    // Calculate deviation
    const deviation = Math.abs(actual - target);
    score -= deviation;

    // Hero and CTA should have more whitespace
    if (slideIndex === 0 || slideIndex === brief.slideCount - 1) {
      if (actual > 0.4) {
        score -= 0.2; // Too dense for hero/CTA
      }
    }

    return Math.max(0, score);
  }

  scoreAttentionFlow(slideData) {
    const { focalPoint, visualElements } = slideData;
    let score = 0.7;

    // Should have clear focal point
    if (focalPoint) {
      score += 0.2;
    }

    // Shouldn't have too many competing elements
    if (visualElements) {
      if (visualElements <= 2) score += 0.1;
      if (visualElements > 4) score -= 0.2;
      if (visualElements > 6) score -= 0.3;
    }

    return Math.max(0, Math.min(1, score));
  }

  scoreVisualBalance(slideData) {
    const { composition, visualWeight } = slideData;
    let score = 0.7;

    // Prefer asymmetrical but balanced compositions
    if (composition === 'asymmetrical') {
      score += 0.15;
    }

    // Check visual weight distribution
    if (visualWeight) {
      const maxWeight = Math.max(...Object.values(visualWeight));
      if (maxWeight > 0.6) {
        score -= 0.1; // Too heavy on one element
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  scoreEmotionalConsistency(slideData, brief, slideIndex) {
    const { emotionalTone } = slideData;
    const expectedEmotion = brief.slideNarrative[slideIndex]?.emotion;
    let score = 0.8;

    // Check if slide matches expected emotional beat
    if (emotionalTone && expectedEmotion) {
      if (emotionalTone === expectedEmotion) {
        score += 0.2;
      } else {
        // Check if it's at least compatible
        const compatiblePairs = [
          ['curiosity', 'intrigue'],
          ['tension', 'urgency'],
          ['hope', 'inspiration'],
          ['trust', 'satisfaction'],
        ];
        
        const isCompatible = compatiblePairs.some(
          pair => pair.includes(emotionalTone) && pair.includes(expectedEmotion)
        );
        
        if (isCompatible) {
          score += 0.1;
        } else {
          score -= 0.2;
        }
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // GRADE CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════════

  calculateGrade(overall) {
    if (overall >= 0.9) return 'A+';
    if (overall >= 0.85) return 'A';
    if (overall >= 0.8) return 'A-';
    if (overall >= 0.75) return 'B+';
    if (overall >= 0.7) return 'B';
    if (overall >= 0.65) return 'B-';
    if (overall >= 0.6) return 'C+';
    if (overall >= 0.55) return 'C';
    if (overall >= 0.5) return 'C-';
    return 'D';
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ISSUE IDENTIFICATION
  // ═══════════════════════════════════════════════════════════════════════════════

  identifyIssues(scores) {
    const issues = [];

    if (scores.readability < this.thresholds.readability) {
      issues.push({ type: 'readability', severity: 'medium', message: 'Text may be too long or hard to read' });
    }

    if (scores.hierarchy < this.thresholds.hierarchy) {
      issues.push({ type: 'hierarchy', severity: 'high', message: 'Visual hierarchy unclear' });
    }

    if (scores.whitespace < this.thresholds.whitespace) {
      issues.push({ type: 'whitespace', severity: 'medium', message: 'Whitespace balance could be improved' });
    }

    if (scores.attention < this.thresholds.attention) {
      issues.push({ type: 'attention', severity: 'high', message: 'Attention flow not optimized' });
    }

    if (scores.balance < this.thresholds.balance) {
      issues.push({ type: 'balance', severity: 'low', message: 'Visual balance could be improved' });
    }

    if (scores.emotional < this.thresholds.emotional) {
      issues.push({ type: 'emotional', severity: 'medium', message: 'Emotional tone may not match narrative' });
    }

    return issues;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // AUTO-FIX GENERATION
  // ═══════════════════════════════════════════════════════════════════════════════

  generateFixes(issues, slideData, brief) {
    return issues.map(issue => {
      const fix = this.suggestFix(issue, slideData, brief);
      return {
        ...issue,
        fix,
      };
    });
  }

  suggestFix(issue, slideData, brief) {
    const fixes = {
      readability: () => {
        if (slideData.headline?.length > 60) {
          return 'Shorten headline to under 60 characters';
        }
        if (slideData.body?.length > 120) {
          return 'Trim body text to under 120 characters';
        }
        return 'Check text contrast and font size';
      },

      hierarchy: () => {
        return 'Increase headline size or reduce competing elements';
      },

      whitespace: () => {
        return 'Add more breathing room around key elements';
      },

      attention: () => {
        return 'Simplify to one dominant focal point';
      },

      balance: () => {
        return 'Adjust element weights for better visual equilibrium';
      },

      emotional: () => {
        return `Adjust tone to match ${brief.slideNarrative?.[0]?.emotion} emotion`;
      },
    };

    return fixes[issue.type]?.() || 'Review and adjust manually';
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BATCH SCORING
  // ═══════════════════════════════════════════════════════════════════════════════

  scoreCarousel(slides, brief) {
    const results = slides.map((slide, index) => ({
      slideIndex: index,
      ...this.scoreSlide(slide, brief, index),
    }));

    // Calculate carousel-wide score
    const averageScore = results.reduce((sum, r) => sum + r.overall, 0) / results.length;
    const allPassed = results.every(r => r.passed);
    const lowestSlide = results.reduce((min, r) => r.overall < min.overall ? r : min, results[0]);

    return {
      slides: results,
      average: Math.round(averageScore),
      allPassed,
      lowestSlide,
      recommendations: this.generateCarouselRecommendations(results),
    };
  }

  generateCarouselRecommendations(results) {
    const recs = [];

    // Check for patterns
    const lowReadability = results.filter(r => r.scores.readability < 0.7);
    if (lowReadability.length > results.length * 0.5) {
      recs.push('Consider shorter text across all slides');
    }

    const lowEmotional = results.filter(r => r.scores.emotional < 0.6);
    if (lowEmotional.length > 0) {
      recs.push('Emotional consistency needs attention in some slides');
    }

    const failingSlides = results.filter(r => !r.passed);
    if (failingSlides.length > 0) {
      recs.push(`${failingSlides.length} slide(s) need improvement before export`);
    }

    return recs;
  }
}

export default DesignScoringEngine;
