// ═══════════════════════════════════════════════════════════════════════════════
// CTA SLIDE TEMPLATE — Climactic finale, isolated focal point
// ═══════════════════════════════════════════════════════════════════════════════

import { TOKENS, css } from '../design/tokens.js';
import { typography, position, styleToString, effects } from '../design/styles.js';
import { generateBackgroundStack } from '../design/backgrounds.js';
import { analyzeLayout } from '../design/hierarchy.js';
import { smartBreak } from '../design/semantic.js';
import { buildSlideWrapper, ctaButton, clampChars } from './utils.js';

export function renderCTASlide({ brand, palette, total, ctaText, artDirection = 'cinematic', intensity = 'aggressive', isLight = false }) {
  const { BRAND_PRIMARY } = palette;
  const safe = TOKENS.safe;
  const handle = brand.handle ? brand.handle.replace(/^@/, '') : brand.name.toLowerCase().replace(/\s+/g, '');
  
  // CTA always uses maximum intensity for impact
  const ctaIntensity = 'aggressive';
  
  // Analyze content hierarchy
  const content = {
    brand: brand.name,
    headline: brand.ctaHeadline || 'Ready to begin?',
    body: brand.ctaBody,
    ctaButton: true,
  };
  
  const hierarchy = analyzeLayout(content, 'cta', palette, isLight);
  const positions = hierarchy.positions;
  
  // Break headline (allow larger for CTA)
  const headlineBreak = smartBreak(brand.ctaHeadline || 'Ready to begin?', { maxLength: 40, maxLines: 3, preferPunchWords: true });
  
  // Generate styles — CTA uses larger typography
  const headlineStyle = {
    ...typography.headline('lg', 'center', hierarchy.readability.recommendedTextColor),
    fontSize: css.px(brand.ctaHeadline?.length < 30 ? 38 : 32),
  };
  const bodyStyle = typography.body(hierarchy.readability.elements.body?.color, true);
  
  // Build content HTML
  const contentHTML = `
    <!-- TOP: brand line -->
    <div style="${styleToString({
      ...position.safeZone('center', { bottom: undefined }),
      borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
      paddingBottom: css.px(TOKENS.spacing[3]),
      textAlign: 'center',
    })}">
      <span style="${styleToString({
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        color: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)',
        fontFamily: 'var(--font-body)',
      })}">${brand.name}</span>
      <span style="${styleToString({
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        color: isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.35)',
        fontFamily: 'var(--font-body)',
        float: 'right',
      })}">@${handle}</span>
    </div>
    
    <!-- CENTER: headline (larger, isolated) -->
    <h2 style="${styleToString({
      ...headlineStyle,
      ...position.absolute({ 
        left: safe.left, 
        right: safe.right,
        top: positions.headline?.top || 140 
      }),
      textAlign: 'center',
      margin: '0 auto',
    })}">${headlineBreak.text.replace(/\n/g, '<br/>')}</h2>
    
    <!-- BOTTOM: body + CTA button -->
    <div style="${styleToString({
      ...position.absolute({ 
        left: safe.left, 
        right: safe.right,
        top: positions.body?.top || 320 
      }),
      textAlign: 'center',
    })}">
      <p style="${styleToString({
        ...bodyStyle,
        maxWidth: '280px',
        margin: `0 auto ${css.px(TOKENS.spacing[4])} auto`,
        textAlign: 'center',
      })}">${clampChars(brand.ctaBody || '', 120)}</p>
      <div style="${styleToString({
        display: 'flex',
        justifyContent: 'center',
      })}">
        ${ctaButton(ctaText || 'Get Started', palette, isLight, 'lg')}
      </div>
    </div>
  `;
  
  // Generate background — CTA always uses dramatic FX
  const bgLayers = generateBackgroundStack(palette, { 
    intensity: ctaIntensity, 
    isLight, 
    useOrbs: true, 
    useMesh: true,
    useGradient: true,
    useVignette: true,
  });
  
  return buildSlideWrapper({
    index: total - 1,
    total,
    artDirection,
    isLight,
    bgLayers,
    content: contentHTML,
    palette,
    slideId: 'cta',
  });
}
