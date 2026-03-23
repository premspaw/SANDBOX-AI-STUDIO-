/**
 * ZEROLENS — Cinematic Landing Page
 * Final merged version with Subject Overlays and Smooth Transitions.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { LANDING_ASSETS as INITIAL_ASSETS } from '../../config/landingAssets';
import { getApiUrl } from '../../config/apiConfig';
import BrandLogo from '../common/BrandLogo';

// ─── DESIGN TOKENS ────────────────────────────────────────────
const T = {
  lime: '#c8f135',
  cyan: '#00ffe0',
  red: '#ff3a3a',
  bg: '#050505',
  bg2: '#0c0c0c',
  white: '#f0ede8',
  gray: '#2a2a2a',
  gray2: '#1a1a1a',
};

// ─── HERO SLIDES ──────────────────────────────────────────────
const SLIDES = [
  {
    line1: 'DROP A PRODUCT.',
    line2: 'GET A SHOOT.',
    accent: 'SHARP.',
    sub: 'The world\'s first AI director. Drop a product — get a full editorial shoot in 60 seconds. No crew. No budget. No waiting.',
  },
  {
    line1: 'WRITE A SCENE.',
    line2: 'DIRECT THE SHOT.',
    accent: 'CINEMA.',
    sub: 'Shoot cinematic previs without touching a camera. Set your lens, light, and scene — AI writes the script, frames every shot, renders the cut.',
  },
  {
    line1: 'PICK A FORMAT.',
    line2: 'DROP A PRODUCT.',
    accent: 'REEL.',
    sub: 'Social-ready content at infinite scale. One character, one product, every format — Reels, Stories, TikToks, all in a single session.',
  },
  {
    line1: 'SET THE BRIEF.',
    line2: 'UPLOAD THE BRAND.',
    accent: 'COMMERCIAL.',
    sub: 'From brief to broadcast in minutes. Upload your assets, pick a style, get a full commercial — Gemini + Imagen 4 + Veo 2 in one pipeline.',
  },
];

// ─── PIPELINE STEPS ───────────────────────────────────────────
const PIPE = [
  { n: '01', name: 'LOCK FACE', info: 'Anchor image\n→ face fingerprint', api: 'GEMINI VISION' },
  { n: '02', name: 'SCAN PRODUCT', info: 'Photo\n→ AI intelligence', api: 'GEMINI VISION' },
  { n: '03', name: 'WRITE SCRIPT', info: 'Category + duration\n→ screenplay', api: 'GEMINI 2.0' },
  { n: '04', name: 'FRAME SHOTS', info: 'Scene by scene\n→ storyboard', api: 'IMAGEN 4' },
  { n: '05', name: 'RENDER VIDEO', info: 'Frames\n→ cinematic video', api: 'VEO 2' },
  { n: '06', name: 'EXPORT ALL', info: 'Every format\nevery platform', api: 'SUPABASE' },
];

// ─── OUTPUT MODES ─────────────────────────────────────────────




// ═══════════════════════════════════════════════════════════════
//  TINY REUSABLE PIECES
// ═══════════════════════════════════════════════════════════════

function SectionEye({ children }) {
  return (
    <div style={{
      fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.4em',
      color: T.lime, textTransform: 'uppercase', display: 'flex', alignItems: 'center',
      gap: 10, marginBottom: 16
    }}>
      <span style={{ opacity: 0.4 }}>//</span>
      {children}
    </div>
  );
}

const resolveAsset = (url) => {
  return url; // Stream direct from Supabase CDN to fix buffer lags
};

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontFamily: "'Bebas Neue',sans-serif",
      fontSize: 'clamp(52px,7vw,96px)', letterSpacing: '0.02em', lineHeight: 0.88
    }}>
      {children}
    </h2>
  );
}

function Chip({ label, active }) {
  return (
    <span style={{
      fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: '0.2em',
      textTransform: 'uppercase', padding: '6px 12px',
      border: `1px solid ${active ? 'rgba(200,241,53,0.25)' : 'rgba(240,237,232,0.1)'}`,
      color: active ? 'rgba(200,241,53,0.7)' : 'rgba(240,237,232,0.25)',
      transition: 'all 0.25s',
    }}>
      {label}
    </span>
  );
}

function Reveal({ children, delay = 0, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  HERO TITLE CYCLER
// ═══════════════════════════════════════════════════════════════
function HeroTitle() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx(i => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const cur = SLIDES[idx];

  const slideVariants = {
    enter: { opacity: 0, scale: 0.98, filter: 'blur(10px)' },
    center: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, scale: 1.02, filter: 'blur(10px)', transition: { duration: 0.6, ease: [0.77, 0, 0.175, 1] } },
  };

  const fs = 'clamp(52px,8.5vw,130px)';

  return (
    <h1 style={{
      fontFamily: "'Bebas Neue',sans-serif",
      fontSize: fs, lineHeight: 0.9,
      letterSpacing: '-0.01em', marginBottom: 40,
      position: 'relative', zIndex: 10,
    }}>
      {/* LINE 1 — cycles */}
      <span style={{ display: 'block', overflow: 'hidden', height: '1.05em', position: 'relative' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={idx}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ display: 'block', lineHeight: '1.05', position: 'absolute', top: 0, left: 0, width: '100%' }}
          >
            {cur.line1}
          </motion.span>
        </AnimatePresence>
      </span>

      {/* LINE 2 — fades between */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`l2-${idx}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            display: 'block',
            WebkitTextStroke: '1px rgba(240,237,232,0.18)',
            color: 'transparent',
          }}
        >
          {cur.line2}
        </motion.span>
      </AnimatePresence>

      {/* LINE 3 — "GET AN ___" */}
      <span style={{ display: 'block' }}>
        GET AN&nbsp;
        <span style={{ display: 'inline-flex', overflow: 'hidden', verticalAlign: 'top', height: '0.87em', position: 'relative', width: '5.5em' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`acc-${idx}`}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              style={{ display: 'block', lineHeight: '0.87', color: T.lime, whiteSpace: 'nowrap', position: 'absolute', top: 0, left: 0 }}
            >
              {cur.accent}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    </h1>
  );
}

// ═══════════════════════════════════════════════════════════════
//  VIDEO PLACEHOLDER CELL
// ═══════════════════════════════════════════════════════════════
function VCell({ cell, style = {} }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        background: T.bg2, cursor: 'pointer',
        ...style,
      }}
    >
      {/* Placeholder bg or Real Video */}
      <div style={{
        width: '100%', aspectRatio: '1/1',
        background: 'linear-gradient(135deg,#0c0c0c,#111)',
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {cell.src ? (
          <video
            autoPlay muted loop playsInline
            src={resolveAsset(cell.src)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 1 }}
          />
        ) : (
          <>
            {/* grid lines */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `linear-gradient(rgba(200,241,53,0.04) 1px,transparent 1px),
                linear-gradient(90deg,rgba(200,241,53,0.04) 1px,transparent 1px)`,
              backgroundSize: '48px 48px',
              opacity: hovered ? 0.4 : 1, transition: 'opacity 0.4s'
            }} />
            {/* play icon placeholder */}
            <div style={{
              position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 14
            }}>
              <div style={{
                width: 72, height: 72,
                border: `1px solid rgba(200,241,53,${hovered ? 0.3 : 0.12})`,
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color 0.3s, box-shadow 0.3s',
                boxShadow: hovered ? `0 0 40px rgba(200,241,53,0.12)` : 'none'
              }}>
                <div style={{
                  width: 0, height: 0,
                  borderTop: '10px solid transparent', borderBottom: '10px solid transparent',
                  borderLeft: `16px solid rgba(200,241,53,${hovered ? 0.5 : 0.2})`,
                  marginLeft: 5, transition: 'border-left-color 0.3s'
                }} />
              </div>
              <span style={{
                fontFamily: "'DM Mono',monospace", fontSize: 10,
                letterSpacing: '0.3em', color: 'rgba(240,237,232,0.15)', textTransform: 'uppercase'
              }}>
                VIDEO SPACE
              </span>
            </div>
          </>
        )}
      </div>

      {/* Overlay: Removed gradient as per user request */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 28
      }}>
        <span style={{
          fontFamily: "'DM Mono',monospace", fontSize: 10,
          letterSpacing: '0.3em', color: T.lime, textTransform: 'uppercase',
          border: `1px solid rgba(200,241,53,0.25)`, display: 'inline-block',
          padding: '4px 10px', marginBottom: 10, width: 'fit-content'
        }}>
          {cell.tag}
        </span>
        <div style={{
          fontFamily: "'Bebas Neue',sans-serif", fontSize: 30,
          letterSpacing: '0.05em', color: T.white, lineHeight: 1
        }}>
          {cell.name}
        </div>
        <div style={{
          fontFamily: "'DM Mono',monospace", fontSize: 10,
          letterSpacing: '0.2em', color: 'rgba(240,237,232,0.3)',
          textTransform: 'uppercase', marginTop: 6
        }}>
          {cell.meta}
        </div>
      </div>

      {/* Hover play btn */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: hovered ? 1 : 0, opacity: hovered ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 60, height: 60, background: T.lime, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5
        }}
      >
        <div style={{
          width: 0, height: 0,
          borderTop: '9px solid transparent', borderBottom: '9px solid transparent',
          borderLeft: '15px solid #000', marginLeft: 3
        }} />
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  UGC CARD COMPONENT
// ═══════════════════════════════════════════════════════════════
function UGCCard({ card, assets, index }) {
  const [hovered, setHovered] = useState(false);
  const videoSrc = assets?.ugcGallery && assets.ugcGallery[index]?.src;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.bg,
        height: card.height,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        padding: 28,
      }}
    >
      {/* Media or Placeholder */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {videoSrc ? (
          <video
            autoPlay muted loop playsInline
            src={resolveAsset(videoSrc)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <>
            {/* Grid bg */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `linear-gradient(rgba(200,241,53,0.03) 1px,transparent 1px), linear-gradient(90deg,rgba(200,241,53,0.03) 1px,transparent 1px)`,
              backgroundSize: '40px 40px',
            }} />
            {/* Glow */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at center, rgba(200,241,53,0.04) 0%, transparent 70%)`,
            }} />
          </>
        )}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <span style={{
          fontFamily: "'DM Mono',monospace", fontSize: 9,
          letterSpacing: '0.3em', color: T.lime,
          border: `1px solid rgba(200,241,53,0.25)`,
          padding: '4px 10px', display: 'inline-block', marginBottom: 10
        }}>
          {card.tag}
        </span>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: '0.05em', color: T.white, lineHeight: 1 }}>
          {card.name}
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.2em', color: 'rgba(240,237,232,0.25)', textTransform: 'uppercase', marginTop: 6 }}>
          {card.meta}
        </div>
      </div>

      {/* Hover Play Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: hovered ? 1 : 0, opacity: hovered ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 54, height: 54, background: T.lime, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5
        }}
      >
        <div style={{
          width: 0, height: 0,
          borderTop: '8px solid transparent', borderBottom: '8px solid transparent',
          borderLeft: '13px solid #000', marginLeft: 3
        }} />
      </motion.div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
//  PIPELINE SECTION
// ═══════════════════════════════════════════════════════════════
function PipelineSection({ isMobile }) {
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    let i = 0;
    function step() {
      setActive(i);
      i = (i + 1) % PIPE.length;
      setTimeout(step, i === 0 ? 1400 : 900);
    }
    setTimeout(step, 500);
  }, [inView]);

  return (
    <section ref={ref} style={{
      padding: isMobile ? '80px 24px' : '120px 48px',
      background: T.bg2, borderTop: `1px solid ${T.gray}`, borderBottom: `1px solid ${T.gray}`
    }}>
      <Reveal>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 80 }}>
          <div>
            <SectionEye>HOW IT WORKS</SectionEye>
            <SectionTitle>{isMobile ? 'THE PIPELINE' : <>THE<br />PIPELINE</>}</SectionTitle>
          </div>
          <p style={{
            fontFamily: "'Syne',sans-serif", fontSize: 13, lineHeight: 1.7,
            color: 'rgba(240,237,232,0.3)', maxWidth: 260, textAlign: 'right'
          }}>
            Six autonomous AI steps. Raw inputs to broadcast-ready output.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(6,1fr)',
          gap: isMobile ? 40 : 2,
          position: 'relative', marginTop: 0
        }}>
          {/* connector line */}
          {!isMobile && (
            <div style={{
              position: 'absolute', top: 26, left: '8%', right: '8%',
              height: 1, background: T.gray
            }} />
          )}

          {PIPE.map((p, i) => (
            <div key={p.n} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', textAlign: 'center', padding: '0 10px'
            }}>
              <motion.div
                animate={active === i ? {
                  background: T.lime, color: '#000',
                  borderColor: T.lime,
                  boxShadow: `0 0 40px rgba(200,241,53,0.35)`,
                } : {
                  background: T.bg, color: 'rgba(240,237,232,0.25)',
                  borderColor: T.gray, boxShadow: 'none',
                }}
                transition={{ duration: 0.35 }}
                style={{
                  width: 54, height: 54, borderRadius: '50%',
                  border: `1px solid ${T.gray}`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'DM Mono',monospace", fontSize: 10,
                  marginBottom: 28, position: 'relative', zIndex: 1
                }}
              >
                {p.n}
              </motion.div>
              <div style={{
                fontFamily: "'Bebas Neue',sans-serif", fontSize: 18,
                letterSpacing: '0.04em', color: T.white, marginBottom: 8
              }}>
                {p.name}
              </div>
              <div style={{
                fontFamily: "'DM Mono',monospace", fontSize: 10,
                letterSpacing: '0.15em', color: 'rgba(240,237,232,0.2)',
                textTransform: 'uppercase', lineHeight: 1.6, whiteSpace: 'pre-line'
              }}>
                {p.info}
              </div>
              <div style={{
                marginTop: 10, fontFamily: "'DM Mono',monospace", fontSize: 10,
                letterSpacing: '0.2em', color: T.lime, textTransform: 'uppercase'
              }}>
                {p.api}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MARQUEE
// ═══════════════════════════════════════════════════════════════
const MQ_ITEMS = ['UGC ADS', 'PREVIS', 'REELS', 'STORYBOARDS', 'COMMERCIALS', 'FASHION FILMS'];

function Marquee({ reverse }) {
  const items = [...MQ_ITEMS, ...MQ_ITEMS, ...MQ_ITEMS, ...MQ_ITEMS];
  return (
    <div style={{ overflow: 'hidden', padding: '24px 0' }}>
      <motion.div
        animate={{ x: reverse ? ['0%', '-50%'] : ['-50%', '0%'] }}
        transition={{ duration: 22, ease: 'linear', repeat: Infinity }}
        style={{ display: 'flex', whiteSpace: 'nowrap', willChange: 'transform' }}
      >
        {items.map((item, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={{
              fontFamily: "'Bebas Neue',sans-serif", fontSize: 76,
              padding: '0 32px', lineHeight: 1,
              ...(i % 2 === 0
                ? { WebkitTextStroke: '1px rgba(240,237,232,0.1)', color: 'transparent' }
                : { color: T.white }),
            }}>
              {item}
            </span>
            <span style={{
              width: 12, height: 12, background: T.lime,
              borderRadius: '50%', flexShrink: 0
            }} />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ANIMATED STATS
// ═══════════════════════════════════════════════════════════════
function AnimatedCounter({ start = 0, end, prefix = '', suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(start);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const startTime = performance.now();
    const range = end - start;
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + eased * range));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, start, end, duration]);

  return (
    <span ref={ref}>
      {prefix}{count}{suffix}
    </span>
  );
}

function AnimatedTimeStat({ duration = 2500 }) {
  const [value, setValue] = useState(5);
  const [unit, setUnit] = useState('hr');
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const startTime = performance.now();

    // Phase 1 (0–40%): 5hr → 1hr countdown
    // Phase 2 (40–55%): switch unit hr → min, jump to 60
    // Phase 3 (55–100%): 60min → 5min countdown
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      if (progress < 0.4) {
        // Phase 1: 5hr → 1hr
        const p = progress / 0.4;
        setValue(Math.round(5 - p * 4));
        setUnit('hr');
      } else if (progress < 0.55) {
        // Phase 2: switch to min
        const p = (progress - 0.4) / 0.15;
        setValue(Math.round(60 - p * 10));
        setUnit('min');
      } else {
        // Phase 3: 50min → 5min
        const p = (progress - 0.55) / 0.45;
        const eased3 = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(50 - eased3 * 45));
        setUnit('min');
      }

      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, duration]);

  return (
    <span ref={ref}>
      {value} {unit}
    </span>
  );
}

function AnimatedStats({ isMobile }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <Reveal>
      <div ref={ref} style={{
        background: T.bg2, borderTop: `1px solid ${T.gray}`,
        borderBottom: `1px solid ${T.gray}`,
        display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)'
      }}>
        {/* $100 → $5 */}
        <div style={{
          padding: isMobile ? '32px 24px' : '44px 48px',
          borderRight: `1px solid ${T.gray}`,
          borderBottom: isMobile ? `1px solid ${T.gray}` : 'none',
          display: 'flex', flexDirection: 'column', gap: 10
        }}>
          <div style={{
            fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 42 : 56,
            letterSpacing: '0.02em', color: T.lime, lineHeight: 1
          }}>
            <AnimatedCounter start={100} end={5} prefix="$" duration={2200} />
          </div>
          <div style={{
            fontFamily: "'DM Mono',monospace", fontSize: 9,
            letterSpacing: '0.3em', color: 'rgba(240,237,232,0.25)', textTransform: 'uppercase'
          }}>
            Full ad video cost
          </div>
        </div>

        {/* 5hr → 5min */}
        <div style={{
          padding: isMobile ? '32px 24px' : '44px 48px',
          borderRight: isMobile ? 'none' : `1px solid ${T.gray}`,
          borderBottom: isMobile ? `1px solid ${T.gray}` : 'none',
          display: 'flex', flexDirection: 'column', gap: 10
        }}>
          <div style={{
            fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 42 : 56,
            letterSpacing: '0.02em', color: T.lime, lineHeight: 1
          }}>
            <AnimatedTimeStat duration={2500} />
          </div>
          <div style={{
            fontFamily: "'DM Mono',monospace", fontSize: 9,
            letterSpacing: '0.3em', color: 'rgba(240,237,232,0.25)', textTransform: 'uppercase'
          }}>
            Average generation time
          </div>
        </div>

        {/* 0 → 6 */}
        <div style={{
          padding: isMobile ? '32px 24px' : '44px 48px',
          borderRight: `1px solid ${T.gray}`,
          display: 'flex', flexDirection: 'column', gap: 10
        }}>
          <div style={{
            fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 42 : 56,
            letterSpacing: '0.02em', color: T.lime, lineHeight: 1
          }}>
            <AnimatedCounter start={0} end={6} duration={2000} />
          </div>
          <div style={{
            fontFamily: "'DM Mono',monospace", fontSize: 9,
            letterSpacing: '0.3em', color: 'rgba(240,237,232,0.25)', textTransform: 'uppercase'
          }}>
            Output formats per session
          </div>
        </div>

        {/* ∞ pulsing */}
        <div style={{
          padding: isMobile ? '32px 24px' : '44px 48px',
          display: 'flex', flexDirection: 'column', gap: 10
        }}>
          <div style={{
            fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 42 : 56,
            letterSpacing: '0.02em', color: T.lime, lineHeight: 1
          }}>
            <motion.span
              animate={inView ? {
                scale: [1, 1.15, 1],
                opacity: [0.7, 1, 0.7],
                textShadow: [
                  '0 0 0px rgba(200,241,53,0)',
                  '0 0 30px rgba(200,241,53,0.6)',
                  '0 0 0px rgba(200,241,53,0)',
                ]
              } : {}}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ display: 'inline-block' }}
            >
              ∞
            </motion.span>
          </div>
          <div style={{
            fontFamily: "'DM Mono',monospace", fontSize: 9,
            letterSpacing: '0.3em', color: 'rgba(240,237,232,0.25)', textTransform: 'uppercase'
          }}>
            Creative variations possible
          </div>
        </div>
      </div>
    </Reveal>
  );
}


// ═══════════════════════════════════════════════════════════════
//  MAIN LANDING PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function LandingPage({ onEnter, onPricing }) {
  const [assets, setAssets] = useState(INITIAL_ASSETS);
  const [isMuted, setIsMuted] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef(null);
  
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const response = await fetch(getApiUrl('/api/get-landing-assets'));
        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          setAssets(data);
        }
      } catch (err) {
        console.warn("[LandingPage] Failed to fetch dynamic assets, using initial config.");
      }
    };
    fetchAssets();
  }, []);

  const VCELLS = (assets.gallery && assets.gallery.length > 0) ? assets.gallery : (INITIAL_ASSETS.gallery || []);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !isMuted;
    video.muted = next;   // true = muted, false = unmuted
    if (!next) video.volume = 1;
    setIsMuted(next);
  };

  useEffect(() => {
    const id = 'ag-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&family=Syne:wght@400;700;800&display=swap';
    document.head.appendChild(link);
  }, []);

   const s = {
    page: {
      background: T.bg, color: T.white,
      fontFamily: "'Syne',sans-serif",
      overflowX: 'hidden', overflowY: 'auto', height: '100%',
      zoom: isMobile ? '100%' : '80%',
      scrollbarWidth: 'none', msOverflowStyle: 'none',
    },
  };


  return (
    <div style={s.page} className="landing-page-container">
      <style>{`.landing-page-container::-webkit-scrollbar { display: none; }`}</style>
      {/* Audio Toggle Badge */}
      <motion.button
        onClick={toggleMute}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed', bottom: isMobile ? 30 : 40, right: isMobile ? 24 : 40, zIndex: 1000,
          background: isMuted ? 'rgba(5,5,5,0.8)' : T.lime,
          border: `1px solid ${isMuted ? 'rgba(240,237,232,0.1)' : 'transparent'}`,
          borderRadius: 4, padding: isMobile ? '8px 12px' : '10px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer', backdropFilter: 'blur(10px)',
          color: isMuted ? 'rgba(240,237,232,0.5)' : '#000',
          fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 8 : 10, letterSpacing: '0.2em',
          textTransform: 'uppercase',
          boxShadow: isMuted ? 'none' : `0 0 20px ${T.lime}33`
        }}
      >
        <div style={{
          width: isMobile ? 6 : 8, height: isMobile ? 6 : 8, borderRadius: '50%',
          background: isMuted ? 'rgba(240,237,232,0.2)' : '#000',
          position: 'relative'
        }}>
          {!isMuted && (
            <motion.div
              animate={{ scale: [1, 2], opacity: [0.5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{ position: 'absolute', inset: 0, background: '#000', borderRadius: '50%' }}
            />
          )}
        </div>
        {isMuted ? 'AUDIO OFF' : 'AUDIO ON'}
      </motion.button>

      {/* ══════ HERO ══════ */}
      <section style={{
        minHeight: isMobile ? '90vh' : '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end', padding: isMobile ? '0 24px 32px' : '0 48px 24px',
        position: 'relative', overflow: 'hidden'
      }}>

        {/* ── LAYER 1: BG VIDEO ── */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', background: '#050505' }}>
          {assets.heroBackground && (
            <video
              ref={videoRef}
              autoPlay muted loop playsInline preload="auto"
              src={resolveAsset(assets.heroBackground)}
              style={{
                position: 'absolute', top: '44%', 
                left: '50%',
                transform: `translate(-50%, -50%) ${isMobile ? 'scale(1.35)' : 'scale(1)'}`,
                minWidth: '100%', minHeight: '100%',
                objectFit: 'cover', opacity: 1
              }}
            />
          )}
          {/* Overlays and Vignettes removed for maximum clarity */}
        </div>

        {/* Ambient lime glow top-left */}
        <motion.div animate={{ x: [0, 24], y: [0, -20] }}
          transition={{ duration: 9, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          style={{
            position: 'absolute', width: 700, height: 700, borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(200,241,53,0.06) 0%,transparent 65%)',
            top: -200, left: -150, pointerEvents: 'none', zIndex: 1
          }} />

        {/* Cinematic blend filter to bridge dividing edge transparently */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          background: 'linear-gradient(to right, rgba(5,5,5,0.92) 0%, rgba(5,5,5,0.4) 50%, rgba(5,5,5,0.0) 80%)',
          pointerEvents: 'none'
        }} />

        {/* ── LAYER 3: FOREGROUND SUBJECT ── */}
        {assets.foregroundSubject && (
          <div style={{
            position: 'absolute',
            right: isMobile ? '20%' : '2%',
            bottom: isMobile ? '-2%' : '4%',
            zIndex: 4,
            height: isMobile ? '65%' : '92%',
            pointerEvents: 'none',
            display: 'flex', alignItems: 'flex-end',
          }}>
            <video autoPlay muted loop playsInline preload="auto"
              src={resolveAsset(assets.foregroundSubject)}
              style={{
                height: '100%', width: 'auto', objectFit: 'contain',
                objectPosition: 'bottom',
                mixBlendMode: 'screen',
                opacity: 1,
              }}
            />
            {/* Fade removed for maximum clarity */}
          </div>
        )}

        {/* Right-side lime edge glow behind subject */}
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%', zIndex: 3,
          background: 'radial-gradient(ellipse at right center, rgba(200,241,53,0.04) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: '0.4em',
            color: T.lime, textTransform: 'uppercase', marginBottom: 20, position: 'relative', zIndex: 10
          }}
        >
          <BrandLogo size={20} className="opacity-80" />
          ZEROLENS
        </motion.div>

        {/* CYCLING TITLE */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', zIndex: 2, maxWidth: isMobile ? '100%' : '58%' }}
        >
          <HeroTitle />
        </motion.div>

        {/* Bottom row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: 'flex', flexDirection: 'column',
            gap: 20, position: 'relative', zIndex: 2, marginBottom: 24
          }}
        >
          {/* Sub copy — cycles with title */}
          <div style={{ position: 'relative', minHeight: isMobile ? '6em' : '5em', maxWidth: isMobile ? '100%' : 800 }}>
            <SubCopy isMobile={isMobile} />
          </div>

          <div style={{ display: 'flex', gap: 14 }}>
            <BtnPrimary onClick={onEnter}>START CREATING →</BtnPrimary>
            <BtnGhost onClick={onPricing}>VIEW PRICING</BtnGhost>
          </div>
        </motion.div>

        {/* Ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            borderTop: `1px solid ${T.gray}`, paddingTop: 24,
            overflow: 'hidden', position: 'relative', zIndex: 2
          }}
        >
          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 28, ease: 'linear', repeat: Infinity }}
            style={{
              display: 'flex', gap: 60, whiteSpace: 'nowrap',
              fontFamily: "'DM Mono',monospace", fontSize: 10,
              letterSpacing: '0.35em', color: 'rgba(240,237,232,0.18)', textTransform: 'uppercase'
            }}
          >
            {[...Array(2)].map((_, ri) => (
              <span key={ri} style={{ display: 'inline-flex', gap: 60, flexShrink: 0 }}>
                {['CHARACTER LOCKING', 'UGC ADS', 'CINEMA PREVIS', 'BRAND CONTENT',
                  'SOCIAL REELS', 'PRODUCT FILMS', 'STORYBOARDS', 'GEMINI 2.0', 'VEO 2'].map((t, i) => (
                    <span key={i}>
                      {t}&nbsp;
                      <span style={{ color: T.lime }}>//</span>
                      &nbsp;
                    </span>
                  ))}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ══════ STATS (Animated) ══════ */}
      <AnimatedStats isMobile={isMobile} />

      {/* ══════ SCROLL STACK ══════ */}
      <StackSection assets={assets} isMobile={isMobile} />


      {/* ══════ FEATURES ══════ */}
      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 2, background: T.gray
      }}>
        {[
          {
            n: '01 // IDENTITY_LOCK', ico: '⬡', title: 'CHARACTER ENGINE',
            desc: 'Upload 3 anchor photos. The system extracts a complete physical fingerprint — locking your character\'s face across every generation. No celebrity bleed. No drift.',
            tag: 'CHARACTER CONSISTENCY'
          },
          {
            n: '02 // PRODUCT_SCAN', ico: '◈', title: 'PRODUCT INTELLIGENCE',
            desc: 'Drop any product photo. AI analyzes shape, color, texture, brand tone, and exactly how a person naturally interacts with it — then locks that into every scene.',
            tag: 'BRAND INTEGRITY'
          },
          {
            n: '03 // DIRECTOR_CORE', ico: '◎', title: 'AI DIRECTOR MODE',
            desc: 'Set your lens, lighting, angle, and ratio from the director panel. The system writes a full shot-by-shot script, storyboards the scenes, and renders the final cinematic cut.',
            tag: 'PRODUCTION CORE'
          },
          {
            n: '04 // OUTPUT_MATRIX', ico: '▣', title: 'ALL FORMAT OUTPUT',
            desc: 'One session outputs everything — Instagram Reels, YouTube pre-roll, Stories, LinkedIn banners, storyboard PDFs, and raw frames. Every ratio, every platform, simultaneously.',
            tag: 'INSTANT EXPORT'
          },
        ].map((f, i) => (
          <Reveal key={f.n} delay={i * 0.05}>
            <FeatureCard f={f} isMobile={isMobile} />
          </Reveal>
        ))}
      </div>

      {/* ══════ SCRLLING HIGHLIGHTS ══════ */}
      <div style={{
        borderTop: `1px solid ${T.gray}`,
        borderBottom: `1px solid ${T.gray}`, background: T.bg2, overflow: 'hidden'
      }}>
        <Marquee />
        <div style={{ borderTop: `1px solid ${T.gray2}` }}>
          <Marquee reverse />
        </div>
      </div>

      {/* ══════ VIDEO GRID ══════ */}
      <section style={{
        height: isMobile ? 'auto' : '140vh', 
        padding: isMobile ? '80px 24px' : '120px 48px',
        overflow: 'hidden', display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center', gap: isMobile ? 40 : 64,
        background: T.bg
      }}>
        <div style={{ flex: 1, maxWidth: isMobile ? '100%' : '40%' }}>
          <Reveal>
            <div style={{ marginBottom: 32 }}>
              <SectionEye>OUTPUT GALLERY</SectionEye>
              <SectionTitle>{isMobile ? 'GENERATED IN STUDIO' : <>GENERATED<br />IN STUDIO</>}</SectionTitle>
            </div>
            <p style={{
              fontFamily: "'Syne',sans-serif", fontSize: 16, lineHeight: 1.6,
              color: 'rgba(240,237,232,0.5)', maxWidth: 400
            }}>
              Every frame below was produced entirely by the ZEROLENS pipeline. No human director. No crew.
            </p>
          </Reveal>
        </div>

        <div style={{
          flex: 1.5, height: isMobile ? 'auto' : '130vh',
          overflow: 'hidden', display: 'flex', alignItems: 'center',
          position: 'relative'
        }}>
          {/* Internal CSS for the rolling effect */}
          <style>{`
            @keyframes roll-gallery {
              0% { transform: translateY(0); }
              100% { transform: translateY(-50%); }
            }
            .rolling-grid {
              animation: roll-gallery 60s linear infinite;
            }
            .rolling-grid:hover {
              animation-play-state: paused;
            }
          `}</style>

          <Reveal delay={0.2} style={{ height: '100%', width: '100%' }}>
            <div className="rolling-grid" style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)',
              gap: 8,
              width: '100%'
            }}>
              {/* Duplicate assets for seamless loop */}
              {([...VCELLS, ...VCELLS, ...VCELLS, ...VCELLS, ...VCELLS, ...VCELLS, ...VCELLS, ...VCELLS])
                .slice(0, 48).map((cell, i) => (
                  <VCell key={i} cell={cell} />
                ))}
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════ CTA ══════ */}
      <section style={{
        padding: isMobile ? '100px 24px' : '160px 48px', textAlign: 'center',
        background: T.bg2, borderTop: `1px solid ${T.gray}`,
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Ghost BG text */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 120 : 500, lineHeight: 1,
          WebkitTextStroke: '1px rgba(200,241,53,0.03)', color: 'transparent',
          pointerEvents: 'none', whiteSpace: 'nowrap', letterSpacing: '-0.05em',
          userSelect: 'none'
        }}>
          AG
        </div>
        <Reveal>
          <h2 style={{
            fontFamily: "'Bebas Neue',sans-serif",
            fontSize: isMobile ? 56 : 'clamp(64px,10vw,140px)', lineHeight: 0.9,
            letterSpacing: '-0.01em', marginBottom: 40, position: 'relative', zIndex: 1
          }}>
            ZERO CREW. ZERO STUDIO.<br />
            ZERO LIMITS. <span style={{ color: T.lime }}>ZERO LENS.</span><br />
            <span style={{ color: T.lime }}>INFINITE CREATIVITY</span>
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, position: 'relative', zIndex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <BtnPrimary onClick={onEnter} isMobile={isMobile}>OPEN THE STUDIO →</BtnPrimary>
            <BtnGhost onClick={onPricing} isMobile={isMobile}>VIEW PRICING</BtnGhost>
          </div>
        </Reveal>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer style={{
        padding: isMobile ? '60px 24px' : '44px 48px', borderTop: `1px solid ${T.gray}`,
        display: 'flex', flexDirection: isMobile ? 'column' : 'row', 
        justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? 40 : 20,
        fontFamily: "'DM Mono',monospace", fontSize: 9,
        letterSpacing: '0.25em', color: 'rgba(240,237,232,0.18)', textTransform: 'uppercase'
      }}>
        <div style={{
          fontFamily: "'Bebas Neue',sans-serif", fontSize: 20,
          letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: 8
        }}>
          <motion.div animate={{ opacity: [1, 0.3, 1], scale: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 8, height: 8, background: T.lime, borderRadius: '50%' }} />
          A Synthcore product
        </div>
        <div style={{ display: 'flex', gap: isMobile ? 12 : 32, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
          {['PIPELINE', 'PRICING', 'DOCS', 'LEGAL'].map(l => (
            <a key={l} href="#" style={{ color: 'inherit', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = T.lime}
              onMouseLeave={e => e.target.style.color = 'inherit'}>{l}</a>
          ))}
        </div>
        <span style={{ fontSize: 8 }}>© 2026 ZEROLENS. ALL RIGHTS RESERVED.</span>
      </footer>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

function SubCopy({ isMobile }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ position: 'relative', minHeight: isMobile ? '6em' : '4.5em' }}>
      <AnimatePresence initial={false}>
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(240,237,232,0.4)', position: 'absolute', top: 0, left: 0, width: '100%' }}
        >
          {SLIDES[idx].sub}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function FeatureCard({ f, isMobile }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={{ background: hovered ? '#0e0e0e' : T.bg }}
      style={{
        padding: isMobile ? '48px 32px' : '64px 56px', position: 'relative',
        overflow: 'hidden', cursor: 'pointer'
      }}
    >
      <motion.div
        animate={{ scaleX: hovered ? 1 : 0 }}
        initial={{ scaleX: 0 }}
        transition={{ duration: 0.5, ease: [0.77, 0, 0.175, 1] }}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: T.lime, transformOrigin: 'left'
        }}
      />
      <span style={{
        fontFamily: "'DM Mono',monospace", fontSize: 9,
        letterSpacing: '0.3em', color: 'rgba(240,237,232,0.18)',
        marginBottom: 32, display: 'block', textTransform: 'uppercase'
      }}>
        {f.n}
      </span>
      <span style={{ fontSize: isMobile ? 28 : 36, marginBottom: 24, display: 'block' }}>{f.ico}</span>
      <h3 style={{
        fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 36 : 44,
        letterSpacing: '0.03em', color: T.white, lineHeight: 0.95, marginBottom: 18
      }}>
        {f.title}
      </h3>
      <p style={{ fontSize: 14, lineHeight: 1.8, color: 'rgba(240,237,232,0.38)', maxWidth: 380 }}>
        {f.desc}
      </p>
      <span style={{
        display: 'inline-block', marginTop: 32,
        fontFamily: "'DM Mono',monospace", fontSize: 9,
        letterSpacing: '0.25em', textTransform: 'uppercase',
        color: T.lime, border: '1px solid rgba(200,241,53,0.2)', padding: '6px 14px'
      }}>
        {f.tag}
      </span>
    </motion.div>
  );
}

function BtnPrimary({ children, onClick, isMobile }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      style={{
        fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 11 : 12,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        background: T.lime, color: hovered ? T.lime : '#000',
        border: 'none', padding: isMobile ? '16px 28px' : '18px 36px', cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
        width: isMobile ? '100%' : 'auto'
      }}
    >
      <motion.div
        animate={{ x: hovered ? '0%' : '-101%' }}
        transition={{ duration: 0.4, ease: [0.77, 0, 0.175, 1] }}
        style={{ position: 'absolute', inset: 0, background: '#000' }}
      />
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </motion.button>
  );
}

function BtnGhost({ children, onClick, isMobile }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      animate={{
        borderColor: hovered ? T.lime : 'rgba(240,237,232,0.18)',
        color: hovered ? T.lime : T.white,
      }}
      style={{
        fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 11 : 12,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        background: 'transparent', border: '1px solid rgba(240,237,232,0.18)',
        padding: isMobile ? '16px 28px' : '18px 36px', cursor: 'pointer', color: T.white,
        width: isMobile ? '100%' : 'auto'
      }}
    >
      {children}
    </motion.button>
  );
}

// ─── INDIVIDUAL VIDEO FOR STACK SECTIONS ─────────────────────
function StackVideo({ src, objectFit = 'cover', objectPosition = 'center' }) {
  const [isMuted, setIsMuted] = useState(true);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      <video
        autoPlay
        muted={isMuted}
        loop
        playsInline
        src={src}
        style={{ width: '100%', height: '100%', objectFit, objectPosition }}
      />
      <motion.button
        onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          position: 'absolute', top: 20, right: 20, zIndex: 30,
          background: isMuted ? 'rgba(0,0,0,0.6)' : T.lime,
          color: isMuted ? T.white : '#000',
          border: `1px solid ${isMuted ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
          borderRadius: '50%', width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', backdropFilter: 'blur(12px)',
          boxShadow: isMuted ? 'none' : `0 0 25px ${T.lime}88`
        }}
      >
        {isMuted ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  STACK SECTION (SCROLL STACK EFFECT)
// ═══════════════════════════════════════════════════════════════
function StackSection({ assets, isMobile }) {
  const containerRef = useRef(null);
  const card1Ref = useRef(null);
  const card2Ref = useRef(null);

  useEffect(() => {
    const page = document.querySelector('.landing-page-container');
    if (!page) return;

    const onScroll = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scrolled = -rect.top;
      const vh = window.innerHeight;

      // Card 1 shrinks as card 2 comes up
      if (card1Ref.current) {
        const progress = Math.min(Math.max((scrolled - vh * 1.4) / (vh * 0.4), 0), 1);
        const scale = 1 - progress * 0.06;
        const brightness = 1 - progress * 0.3;
        card1Ref.current.style.transform = `scale(${scale})`;
        card1Ref.current.style.filter = `brightness(${brightness})`;
        card1Ref.current.style.transformOrigin = 'top center';
      }

      // Card 2 shrinks as card 3 comes up
      if (card2Ref.current) {
        const progress = Math.min(Math.max((scrolled - vh * 3.2) / (vh * 0.4), 0), 1);
        const scale = 1 - progress * 0.06;
        const brightness = 1 - progress * 0.3;
        card2Ref.current.style.transform = `scale(${scale})`;
        card2Ref.current.style.filter = `brightness(${brightness})`;
        card2Ref.current.style.transformOrigin = 'top center';
      }
    };

    page.addEventListener('scroll', onScroll);
    return () => page.removeEventListener('scroll', onScroll);
  }, []);

  // Use section-specific assets from the config
  const ugcVideos = assets?.ugcAssets || [];
  const productVideos = assets?.productAssets || [];
  const cinemaVideo = assets?.cinemaAssets?.[0];

  return (
    <div ref={containerRef} style={{ position: 'relative', height: '490vh' }}>

      {/* ── CARD 1: UGC ── */}
      <div
        ref={card1Ref}
        style={{
          position: 'sticky', top: 0, zIndex: 10,
          height: '130vh', overflow: 'hidden',
          background: T.bg,
          borderTop: `1px solid ${T.gray}`,
          transition: 'transform 0.1s linear, filter 0.1s linear',
          display: 'flex', flexDirection: 'column',
          padding: isMobile ? '30px 24px' : '40px 48px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 40, flexShrink: 0 }}>
          <div style={{ marginBottom: 20 }}>
            <SectionEye>UGC FACTORY</SectionEye>
            <div style={{
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: isMobile ? 48 : 84,
              lineHeight: 1, letterSpacing: '0.02em',
              display: 'flex', gap: isMobile ? 12 : 24, flexWrap: 'wrap'
            }}>
              <span>5 CLICKS.</span>
              <span style={{ color: T.lime }}>60 SECONDS.</span>
              <span>FULL AD.</span>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row', 
            gap: isMobile ? 12 : 32, 
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: 16
          }}>
            {[
              'Upload your character photo',
              'Drop the product',
              'Choose format & duration',
              'AI writes the script',
              'Render & export instantly',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontFamily: "'DM Mono',monospace", fontSize: 8,
                  letterSpacing: '0.2em', color: T.lime,
                  background: `rgba(200,241,53,0.08)`,
                  padding: '4px 8px', borderRadius: 2, flexShrink: 0
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{
                  fontFamily: "'DM Mono',monospace", fontSize: 9,
                  letterSpacing: '0.1em', color: 'rgba(240,237,232,0.45)',
                  textTransform: 'uppercase', whiteSpace: 'nowrap'
                }}>
                  {step}
                </span>
                {i < 4 && !isMobile && (
                  <div style={{ width: 12, height: 1, background: 'rgba(255,255,255,0.1)', marginLeft: 8 }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 4 Vertical Videos */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
          gap: 3, flex: 1, minHeight: 0,
        }}>
          {[
            { tag: 'TALKING HEAD', name: 'PRODUCT DROP', meta: '9:16 · TIKTOK', offset: 0 },
            { tag: 'LIFESTYLE', name: 'BRAND STORY', meta: '9:16 · REELS', offset: 0 },
            { tag: 'UNBOXING', name: 'REVEAL FORMAT', meta: '9:16 · STORIES', offset: 0 },
            { tag: 'TESTIMONIAL', name: 'SOCIAL PROOF', meta: '9:16 · YOUTUBE', offset: 0 },
          ].map((card, i) => (
            <div
              key={i}
              style={{
                marginTop: isMobile ? 0 : card.offset,
                background: T.bg2,
                position: 'relative', overflow: 'hidden',
                borderRadius: 4, flex: 1,
              }}
            >
              {ugcVideos[i]?.src ? (
                <StackVideo 
                  src={ugcVideos[i].src} 
                  objectFit="cover" 
                  objectPosition="center top" 
                />
              ) : (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `linear-gradient(rgba(200,241,53,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(200,241,53,0.04) 1px,transparent 1px)`,
                  backgroundSize: '32px 32px',
                }}>
                  {/* Placeholder vertical phone shape */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-60%)',
                    width: 40, height: 68,
                    border: `1px solid rgba(200,241,53,0.2)`,
                    borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: 0, height: 0,
                      borderTop: '5px solid transparent',
                      borderBottom: '5px solid transparent',
                      borderLeft: `8px solid rgba(200,241,53,0.3)`,
                      marginLeft: 2,
                    }} />
                  </div>
                </div>
              )}
              {/* Gradient overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(5,5,5,0.9) 0%, transparent 50%)',
                pointerEvents: 'none'
              }} />
              {/* Labels */}
              <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 1, pointerEvents: 'none' }}>
                <span style={{
                  fontFamily: "'DM Mono',monospace", fontSize: 7,
                  letterSpacing: '0.3em', color: T.lime,
                  border: `1px solid rgba(200,241,53,0.25)`,
                  padding: '2px 6px', display: 'inline-block', marginBottom: 6
                }}>
                  {card.tag}
                </span>
                <div style={{
                  fontFamily: "'Bebas Neue',sans-serif", fontSize: 18,
                  color: T.white, lineHeight: 1
                }}>
                  {card.name}
                </div>
                <div style={{
                  fontFamily: "'DM Mono',monospace", fontSize: 7,
                  color: 'rgba(240,237,232,0.3)', textTransform: 'uppercase',
                  letterSpacing: '0.2em', marginTop: 4
                }}>
                  {card.meta}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: '50vh' }} />

      {/* ── CARD 2: PRODUCT SHOOT ── */}
      <div
        ref={card2Ref}
        style={{
          position: 'sticky', top: 0, zIndex: 20,
          height: '130vh', overflow: 'hidden',
          background: T.bg2,
          borderTop: `1px solid ${T.gray}`,
          transition: 'transform 0.1s linear, filter 0.1s linear',
          display: 'flex', flexDirection: 'column',
          padding: isMobile ? '40px 24px' : '60px 48px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexShrink: 0 }}>
          <div>
            <SectionEye>PRODUCT STUDIO</SectionEye>
            <div style={{
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: isMobile ? 48 : 72,
              lineHeight: 0.9, letterSpacing: '0.02em'
            }}>
              DROP A PRODUCT. <span style={{ color: T.lime }}>GET A SHOOT.</span>
            </div>
          </div>
          <p style={{
            fontFamily: "'Syne',sans-serif", fontSize: 14,
            lineHeight: 1.8, color: 'rgba(240,237,232,0.3)',
            maxWidth: 300, textAlign: 'right'
          }}>
            One product photo generates a complete editorial shoot — every angle, every lighting setup, every format. No studio. No photographer.
          </p>
        </div>

        {/* 3 Product Videos - mix of portrait + landscape */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1.4fr 1fr',
          gap: 3, flex: 1, minHeight: 0,
        }}>
          {[
            { tag: 'MACRO DETAIL', name: 'TEXTURE SHOT', meta: '1:1 · CLOSE-UP' },
            { tag: 'HERO SHOT', name: 'FULL EDITORIAL', meta: '4:5 · CAMPAIGN' },
            { tag: 'LIFESTYLE', name: 'IN-USE SCENE', meta: '9:16 · SOCIAL' },
          ].map((card, i) => (
            <div
              key={i}
              style={{
                background: T.bg,
                position: 'relative', overflow: 'hidden',
                borderRadius: 4,
              }}
            >
              {productVideos[i]?.src ? (
                <StackVideo 
                  src={productVideos[i].src} 
                  objectFit="cover" 
                />
              ) : (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `linear-gradient(rgba(200,241,53,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(200,241,53,0.03) 1px,transparent 1px)`,
                  backgroundSize: '40px 40px',
                }}>
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: i === 1 ? 60 : 48, height: i === 1 ? 60 : 48,
                    border: `1px solid rgba(200,241,53,0.15)`,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: 0, height: 0,
                      borderTop: '6px solid transparent',
                      borderBottom: '6px solid transparent',
                      borderLeft: `10px solid rgba(200,241,53,0.25)`,
                      marginLeft: 2,
                    }} />
                  </div>
                </div>
              )}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(5,5,5,0.85) 0%, transparent 55%)',
                pointerEvents: 'none'
              }} />
              <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, zIndex: 1, pointerEvents: 'none' }}>
                <span style={{
                  fontFamily: "'DM Mono',monospace", fontSize: 7,
                  letterSpacing: '0.3em', color: T.lime,
                  border: `1px solid rgba(200,241,53,0.25)`,
                  padding: '2px 6px', display: 'inline-block', marginBottom: 8
                }}>
                  {card.tag}
                </span>
                <div style={{
                  fontFamily: "'Bebas Neue',sans-serif", fontSize: 22,
                  color: T.white, lineHeight: 1
                }}>
                  {card.name}
                </div>
                <div style={{
                  fontFamily: "'DM Mono',monospace", fontSize: 7,
                  color: 'rgba(240,237,232,0.3)', textTransform: 'uppercase',
                  letterSpacing: '0.2em', marginTop: 4
                }}>
                  {card.meta}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: '50vh' }} />

      {/* ── CARD 3: CINEMA ── */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 30,
          height: '130vh', overflow: 'hidden',
          background: '#0a0807',
          borderTop: `1px solid ${T.gray}`,
          display: 'flex', flexDirection: 'column',
          padding: isMobile ? '40px 24px' : '60px 48px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexShrink: 0 }}>
          <div>
            <SectionEye>CINEMA DIRECTOR</SectionEye>
            <div style={{
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: isMobile ? 48 : 72,
              lineHeight: 0.9, letterSpacing: '0.02em'
            }}>
              SET THE SCENE.<br />
              <span style={{ color: T.lime }}>ROLL CAMERA.</span>
            </div>
          </div>
          <p style={{
            fontFamily: "'Syne',sans-serif", fontSize: 14,
            lineHeight: 1.8, color: 'rgba(240,237,232,0.3)',
            maxWidth: 300, textAlign: 'right'
          }}>
            Full cinematic previs in widescreen. Set your lens, angle, and lighting. AI frames every shot like a Vogue film director.
          </p>
        </div>

        {/* 1 Big Cinema Video - 16:9 */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative', borderRadius: 4, overflow: 'hidden' }}>
          {cinemaVideo?.src ? (
            <StackVideo src={cinemaVideo.src} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              backgroundImage: `linear-gradient(rgba(200,241,53,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(200,241,53,0.03) 1px,transparent 1px)`,
              backgroundSize: '60px 60px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              {/* Cinescope letterbox lines */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '12%', background: '#050505' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '12%', background: '#050505' }} />
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16
              }}>
                <div style={{
                  width: 80, height: 80,
                  border: `1px solid rgba(200,241,53,0.2)`,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 0, height: 0,
                    borderTop: '12px solid transparent',
                    borderBottom: '12px solid transparent',
                    borderLeft: `20px solid rgba(200,241,53,0.3)`,
                    marginLeft: 4,
                  }} />
                </div>
                <span style={{
                  fontFamily: "'DM Mono',monospace", fontSize: 10,
                  letterSpacing: '0.4em', color: 'rgba(240,237,232,0.15)',
                  textTransform: 'uppercase'
                }}>
                  CINEMATIC VIDEO SPACE
                </span>
              </div>
            </div>
          )}

          {/* Letterbox overlay */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10%', background: 'rgba(5,5,5,0.7)', zIndex: 1 }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '10%', background: 'rgba(5,5,5,0.7)', zIndex: 1 }} />

          {/* Film info overlay */}
          <div style={{
            position: 'absolute', bottom: '12%', left: 32, right: 32,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            zIndex: 2,
          }}>
            <div>
              <span style={{
                fontFamily: "'DM Mono',monospace", fontSize: 8,
                letterSpacing: '0.3em', color: T.lime,
                border: `1px solid rgba(200,241,53,0.25)`,
                padding: '3px 8px', display: 'inline-block', marginBottom: 8
              }}>
                CINEMA PREVIS
              </span>
              <div style={{
                fontFamily: "'Bebas Neue',sans-serif", fontSize: 32,
                color: T.white, lineHeight: 1
              }}>
                DIRECTOR'S CUT
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              {['16:9 WIDESCREEN', '24FPS', 'DOLBY VISION'].map((spec, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: "'DM Mono',monospace", fontSize: 8,
                    letterSpacing: '0.25em', color: 'rgba(240,237,232,0.4)',
                    textTransform: 'uppercase'
                  }}>
                    {spec}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}