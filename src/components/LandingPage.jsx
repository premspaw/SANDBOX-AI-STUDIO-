/**
 * ANTI-GRAVITY STUDIOS — Cinematic Landing Page
 * Final merged version with Subject Overlays and Smooth Transitions.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { LANDING_ASSETS } from '../config/landingAssets';

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
    line1: 'DROP A FACE.',
    line2: 'DROP A PRODUCT.',
    accent: 'AD.',
    sub: 'The world\'s first AI director. Drop a face and a product — get a full UGC ad video in 60 seconds. No crew. No budget. No waiting.',
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
const MODES = [
  {
    num: 'MODE 01', title: 'UGC\nFACTORY',
    desc: 'Turn any product into a scroll-stopping UGC ad in 60 seconds. Authentic talking-head style, real reactions, perfect for paid social.',
    chips: ['9:16 REEL', 'TALKING HEAD', '15 — 60s', 'TIKTOK READY'],
    glow: T.lime,
  },
  {
    num: 'MODE 02', title: 'CINEMA\nPREVIS',
    desc: 'Full shot-by-shot previs for directors and agencies. Set your lens, light, and scene — complete storyboard before you touch a camera.',
    chips: ['16:9 CINEMATIC', 'STORYBOARD PDF', 'SHOT LIST', 'DIRECTOR NOTES'],
    glow: T.cyan,
  },
  {
    num: 'MODE 03', title: 'BRAND\nCONTENT',
    desc: 'Full-spectrum brand content from one upload. Fashion editorials, product launches, seasonal campaigns — consistent character, unlimited variations.',
    chips: ['ALL RATIOS', 'MULTI-FORMAT', 'BRAND LOCKED', 'BATCH EXPORT'],
    glow: T.red,
  },
];

const VCELLS = LANDING_ASSETS.gallery;

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
        <span style={{ display: 'inline-flex', overflow: 'hidden', verticalAlign: 'top', height: '0.87em', position: 'relative', width: '2.5em' }}>
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
        width: '100%', height: '100%', minHeight: cell.big ? 640 : 320,
        background: 'linear-gradient(135deg,#0c0c0c,#111)',
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {cell.src ? (
          <video
            autoPlay muted loop playsInline
            src={cell.src}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
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

      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top,rgba(5,5,5,0.92) 0%,transparent 55%)',
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
//  PIPELINE SECTION
// ═══════════════════════════════════════════════════════════════
function PipelineSection() {
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
      padding: '120px 48px',
      background: T.bg2, borderTop: `1px solid ${T.gray}`, borderBottom: `1px solid ${T.gray}`
    }}>
      <Reveal>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 80 }}>
          <div>
            <SectionEye>HOW IT WORKS</SectionEye>
            <SectionTitle>THE<br />PIPELINE</SectionTitle>
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
          display: 'grid', gridTemplateColumns: 'repeat(6,1fr)',
          position: 'relative', marginTop: 0
        }}>
          {/* connector line */}
          <div style={{
            position: 'absolute', top: 26, left: '8%', right: '8%',
            height: 1, background: T.gray
          }} />

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
  const doubled = [...MQ_ITEMS, ...MQ_ITEMS];
  return (
    <div style={{ overflow: 'hidden', padding: '24px 0' }}>
      <motion.div
        animate={{ x: reverse ? ['0%', '-50%'] : ['-50%', '0%'] }}
        transition={{ duration: 22, ease: 'linear', repeat: Infinity }}
        style={{ display: 'flex', whiteSpace: 'nowrap', willChange: 'transform' }}
      >
        {doubled.map((item, i) => (
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
//  MAIN LANDING PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function LandingPage({ onEnter }) {
  const [hoveredMode, setHoveredMode] = useState(null);

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
    },
  };

  return (
    <div style={s.page}>

      {/* ══════ HERO ══════ */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end', padding: '0 48px 60px',
        position: 'relative', overflow: 'hidden'
      }}>

        {/* ── LAYER 1: BG VIDEO ── */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', background: '#050505' }}>
          {LANDING_ASSETS.heroBackground && (
            <video
              autoPlay muted loop playsInline
              src={LANDING_ASSETS.heroBackground}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                opacity: 0.7, filter: 'saturate(0.8) brightness(0.9)'
              }}
            />
          )}
          {/* Strong vignette */}
          <div style={{
            position: 'absolute', inset: 0, background:
              'linear-gradient(to right, rgba(5,5,5,0.85) 0%, rgba(5,5,5,0.4) 45%, rgba(5,5,5,0.1) 100%),' +
              'linear-gradient(to bottom, rgba(5,5,5,0.4) 0%, rgba(5,5,5,0.0) 35%, rgba(5,5,5,0.8) 75%, rgba(5,5,5,1) 100%)',
            zIndex: 1
          }} />
          {/* Scanlines */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)',
            pointerEvents: 'none'
          }} />
        </div>

        {/* Ambient lime glow top-left */}
        <motion.div animate={{ x: [0, 24], y: [0, -20] }}
          transition={{ duration: 9, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          style={{
            position: 'absolute', width: 700, height: 700, borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(200,241,53,0.06) 0%,transparent 65%)',
            top: -200, left: -150, pointerEvents: 'none', zIndex: 1
          }} />

        {/* ── LAYER 3: FOREGROUND SUBJECT ── */}
        {LANDING_ASSETS.foregroundSubject && (
          <div style={{
            position: 'absolute',
            right: '2%',
            bottom: 0,
            zIndex: 4,
            height: '92%',
            pointerEvents: 'none',
            display: 'flex', alignItems: 'flex-end',
          }}>
            <video autoPlay muted loop playsInline
              src={LANDING_ASSETS.foregroundSubject}
              style={{
                height: '100%', width: 'auto', objectFit: 'contain',
                objectPosition: 'bottom',
                mixBlendMode: 'screen',
                opacity: 0.7,
                filter: 'saturate(0.5) contrast(1.1)',
              }}
            />
            {/* Fade feet into page bottom */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%',
              background: 'linear-gradient(to top, rgba(5,5,5,1) 0%, transparent 100%)',
              pointerEvents: 'none', zIndex: 5
            }} />
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
            display: 'inline-flex', alignItems: 'center', gap: 10, paddingTop: 60,
            fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: '0.4em',
            color: T.lime, textTransform: 'uppercase', marginBottom: 40, position: 'relative', zIndex: 10
          }}
        >
          <motion.div
            animate={{ opacity: [1, 0.15, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 6, height: 6, background: T.red, borderRadius: '50%' }}
          />
          Neural Engine Active &nbsp;·&nbsp; Gemini 2.0 + Imagen 4 + Veo 2
        </motion.div>

        {/* CYCLING TITLE */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', zIndex: 2, maxWidth: '58%' }}
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
            gap: 32, position: 'relative', zIndex: 2, marginBottom: 56
          }}
        >
          {/* Sub copy — cycles with title */}
          <div style={{ position: 'relative', minHeight: '5em', maxWidth: 800 }}>
            <SubCopy />
          </div>

          <div style={{ display: 'flex', gap: 14 }}>
            <BtnPrimary onClick={onEnter}>START CREATING →</BtnPrimary>
            <BtnGhost>WATCH DEMO</BtnGhost>
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

      {/* ══════ STATS ══════ */}
      <Reveal>
        <div style={{
          background: T.bg2, borderTop: `1px solid ${T.gray}`,
          borderBottom: `1px solid ${T.gray}`,
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)'
        }}>
          {[
            { n: '10¢', l: 'Full ad video cost' },
            { n: '60s', l: 'Average generation time' },
            { n: '6', l: 'Output formats per session' },
            { n: '∞', l: 'Creative variations possible' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '44px 48px',
              borderRight: i < 3 ? `1px solid ${T.gray}` : 'none',
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{
                fontFamily: "'Bebas Neue',sans-serif", fontSize: 56,
                letterSpacing: '0.02em', color: T.lime, lineHeight: 1
              }}>
                {s.n}
              </div>
              <div style={{
                fontFamily: "'DM Mono',monospace", fontSize: 10,
                letterSpacing: '0.3em', color: 'rgba(240,237,232,0.25)', textTransform: 'uppercase'
              }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ══════ VIDEO FEATURE STRIP ══════ */}
      <Reveal>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 2, background: T.gray
        }}>
          {/* Left copy */}
          <div style={{
            background: T.bg, padding: '80px 64px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center'
          }}>
            <SectionEye>WATCH IT WORK</SectionEye>
            <SectionTitle>TWO IMAGES.<br />ONE PIPELINE.<br />
              <span style={{ color: T.lime }}>FULL VIDEO.</span>
            </SectionTitle>
            <p style={{
              fontSize: 15, lineHeight: 1.8,
              color: 'rgba(240,237,232,0.38)', maxWidth: 380, marginBottom: 40
            }}>
              Watch the Anti-Gravity pipeline in real time. A character anchor photo and a product scan go in — a broadcast-ready ad comes out. Gemini writes it. Imagen 4 frames it. Veo 2 renders it.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {['GEMINI 2.0', 'IMAGEN 4', 'VEO 2'].map((label, i) => (
                <span key={label} style={{
                  fontFamily: "'DM Mono',monospace", fontSize: 10,
                  letterSpacing: '0.25em', textTransform: 'uppercase',
                  padding: '8px 16px',
                  border: `1px solid ${i === 0 ? 'rgba(200,241,53,0.25)' : 'rgba(240,237,232,0.1)'}`,
                  color: i === 0 ? T.lime : 'rgba(240,237,232,0.3)'
                }}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right video panel */}
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: T.bg2, minHeight: 560
          }}>
            <div style={{
              width: '100%', height: '100%', minHeight: 560,
              background: 'linear-gradient(135deg,#0c0c0c,#111)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `linear-gradient(rgba(200,241,53,0.04) 1px,transparent 1px),
                  linear-gradient(90deg,rgba(200,241,53,0.04) 1px,transparent 1px)`,
                backgroundSize: '44px 44px'
              }} />
              <div style={{
                position: 'relative', zIndex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16
              }}>
                <motion.div
                  animate={{
                    boxShadow: [
                      '0 0 0 0 rgba(200,241,53,0)',
                      '0 0 0 24px rgba(200,241,53,0.04)',
                      '0 0 0 0 rgba(200,241,53,0)',
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 88, height: 88,
                    border: '1px solid rgba(200,241,53,0.2)', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <div style={{
                    width: 0, height: 0,
                    borderTop: '12px solid transparent', borderBottom: '12px solid transparent',
                    borderLeft: '20px solid rgba(200,241,53,0.3)', marginLeft: 5
                  }} />
                </motion.div>
                <span style={{
                  fontFamily: "'DM Mono',monospace", fontSize: 10,
                  letterSpacing: '0.3em', color: 'rgba(240,237,232,0.15)', textTransform: 'uppercase'
                }}>
                  {LANDING_ASSETS.pipelineDemo ? 'PIPELINE DEMO ACTIVE' : 'DEMO VIDEO · SWAP SRC WHEN READY'}
                </span>
              </div>
            </div>
            {/* Bottom badge */}
            <div style={{ position: 'absolute', bottom: 32, left: 32, zIndex: 2 }}>
              <span style={{
                fontFamily: "'DM Mono',monospace", fontSize: 9,
                letterSpacing: '0.3em', textTransform: 'uppercase',
                color: T.lime, border: '1px solid rgba(200,241,53,0.3)',
                padding: '6px 14px', background: 'rgba(5,5,5,0.7)',
                backdropFilter: 'blur(8px)', display: 'inline-block'
              }}>
                ⬡ PIPELINE DEMO · 60s · LIVE RENDER
              </span>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ══════ FEATURES ══════ */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 2, background: T.gray
      }}>
        {[
          {
            n: '01 // IDENTITY_LOCK', ico: '⬡', title: 'CHARACTER ENGINE',
            desc: 'Upload 3 anchor photos. Gemini Vision extracts a complete physical fingerprint — locking your character\'s face across every generation. No celebrity bleed. No drift.',
            tag: 'GEMINI VISION + IMAGEN 4'
          },
          {
            n: '02 // PRODUCT_SCAN', ico: '◈', title: 'PRODUCT INTELLIGENCE',
            desc: 'Drop any product photo. AI analyzes shape, color, texture, brand tone, and exactly how a person naturally interacts with it — then locks that into every scene.',
            tag: 'VISION ANALYSIS API'
          },
          {
            n: '03 // DIRECTOR_CORE', ico: '◎', title: 'AI DIRECTOR MODE',
            desc: 'Set your lens, lighting, angle, and ratio from the director panel. The system writes a full shot-by-shot script, storyboards with Imagen 4, cuts the final with Veo 2.',
            tag: 'VEO 2 VIDEO ENGINE'
          },
          {
            n: '04 // OUTPUT_MATRIX', ico: '▣', title: 'ALL FORMAT OUTPUT',
            desc: 'One session outputs everything — Instagram Reels, YouTube pre-roll, Stories, LinkedIn banners, storyboard PDFs, and raw frames. Every ratio, every platform, simultaneously.',
            tag: 'MULTI-FORMAT EXPORT'
          },
        ].map((f, i) => (
          <Reveal key={f.n} delay={i * 0.05}>
            <FeatureCard f={f} />
          </Reveal>
        ))}
      </div>

      {/* ══════ VIDEO GRID ══════ */}
      <section style={{ padding: '120px 48px' }}>
        <Reveal>
          <div style={{
            display: 'flex', alignItems: 'flex-end',
            justifyContent: 'space-between', marginBottom: 64
          }}>
            <div>
              <SectionEye>OUTPUT GALLERY</SectionEye>
              <SectionTitle>GENERATED<br />IN STUDIO</SectionTitle>
            </div>
            <p style={{
              fontFamily: "'Syne',sans-serif", fontSize: 13, lineHeight: 1.7,
              color: 'rgba(240,237,232,0.3)', maxWidth: 260, textAlign: 'right'
            }}>
              Every frame below was produced entirely by the Anti-Gravity pipeline. No human director. No crew.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr',
            gridTemplateRows: '340px 300px',
            gap: 2
          }}>
            {VCELLS.map((cell, i) => (
              <VCell key={i} cell={cell}
                style={cell.big ? { gridRow: 'span 2' } : {}} />
            ))}
          </div>
        </Reveal>
      </section>

      {/* ══════ MARQUEE ══════ */}
      <div style={{
        borderTop: `1px solid ${T.gray}`,
        borderBottom: `1px solid ${T.gray}`, background: T.bg2, overflow: 'hidden'
      }}>
        <Marquee />
        <div style={{ borderTop: `1px solid ${T.gray2}` }}>
          <Marquee reverse />
        </div>
      </div>

      {/* ══════ PIPELINE ══════ */}
      <PipelineSection />

      {/* ══════ OUTPUT MODES ══════ */}
      <section style={{ padding: '120px 48px' }}>
        <Reveal>
          <div style={{
            display: 'flex', alignItems: 'flex-end',
            justifyContent: 'space-between', marginBottom: 80
          }}>
            <div>
              <SectionEye>USE CASES</SectionEye>
              <SectionTitle>WHAT<br />YOU BUILD</SectionTitle>
            </div>
            <p style={{
              fontFamily: "'Syne',sans-serif", fontSize: 13, lineHeight: 1.7,
              color: 'rgba(240,237,232,0.3)', maxWidth: 260, textAlign: 'right'
            }}>
              Three creation modes for every brief.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
            gap: 2, background: T.gray
          }}>
            {MODES.map((m, i) => (
              <motion.div
                key={m.num}
                onHoverStart={() => setHoveredMode(i)}
                onHoverEnd={() => setHoveredMode(null)}
                style={{
                  background: T.bg, padding: '52px 44px',
                  cursor: 'pointer', position: 'relative', overflow: 'hidden'
                }}
                animate={{ background: hoveredMode === i ? '#0d0d0d' : T.bg }}
                transition={{ duration: 0.3 }}
              >
                {/* corner glow */}
                <motion.div
                  animate={{ opacity: hoveredMode === i ? 1 : 0 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    position: 'absolute', top: -80, right: -80,
                    width: 240, height: 240, borderRadius: '50%',
                    background: `radial-gradient(circle,${m.glow}11 0%,transparent 70%)`,
                    pointerEvents: 'none'
                  }}
                />
                <div style={{
                  fontFamily: "'DM Mono',monospace", fontSize: 10,
                  letterSpacing: '0.35em', textTransform: 'uppercase',
                  color: 'rgba(240,237,232,0.2)', marginBottom: 28,
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <span style={{ width: 20, height: 1, background: 'currentColor', display: 'inline-block' }} />
                  {m.num}
                </div>
                <h3 style={{
                  fontFamily: "'Bebas Neue',sans-serif", fontSize: 50,
                  letterSpacing: '0.02em', lineHeight: 0.9, marginBottom: 20,
                  whiteSpace: 'pre-line'
                }}>
                  {m.title}
                </h3>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: 'rgba(240,237,232,0.32)' }}>
                  {m.desc}
                </p>
                <div style={{ marginTop: 36, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {m.chips.map(c => <Chip key={c} label={c} active={hoveredMode === i} />)}
                </div>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ══════ CTA ══════ */}
      <section style={{
        padding: '160px 48px', textAlign: 'center',
        background: T.bg2, borderTop: `1px solid ${T.gray}`,
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Ghost BG text */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          fontFamily: "'Bebas Neue',sans-serif", fontSize: 500, lineHeight: 1,
          WebkitTextStroke: '1px rgba(200,241,53,0.03)', color: 'transparent',
          pointerEvents: 'none', whiteSpace: 'nowrap', letterSpacing: '-0.05em',
          userSelect: 'none'
        }}>
          AG
        </div>
        <Reveal>
          <h2 style={{
            fontFamily: "'Bebas Neue',sans-serif",
            fontSize: 'clamp(64px,11vw,168px)', lineHeight: 0.87,
            letterSpacing: '-0.01em', marginBottom: 40, position: 'relative', zIndex: 1
          }}>
            ZERO CREW.<br />
            <span style={{ color: T.lime }}>ZERO LIMITS.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={{
            fontFamily: "'DM Mono',monospace", fontSize: 12,
            letterSpacing: '0.25em', color: 'rgba(240,237,232,0.3)',
            textTransform: 'uppercase', marginBottom: 56, position: 'relative', zIndex: 1
          }}>
            Your character. Your product. Our pipeline. One click.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div style={{ display: 'inline-flex', gap: 16, position: 'relative', zIndex: 1 }}>
            <BtnPrimary onClick={onEnter}>OPEN THE STUDIO →</BtnPrimary>
            <BtnGhost>READ THE DOCS</BtnGhost>
          </div>
        </Reveal>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer style={{
        padding: '44px 48px', borderTop: `1px solid ${T.gray}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: "'DM Mono',monospace", fontSize: 10,
        letterSpacing: '0.25em', color: 'rgba(240,237,232,0.18)', textTransform: 'uppercase'
      }}>
        <div style={{
          fontFamily: "'Bebas Neue',sans-serif", fontSize: 20,
          letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: 8
        }}>
          <motion.div animate={{ opacity: [1, 0.3, 1], scale: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 8, height: 8, background: T.lime, borderRadius: '50%' }} />
          ANTI&#8209;GRAVITY STUDIOS
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          {['PIPELINE', 'PRICING', 'DOCS', 'LEGAL'].map(l => (
            <a key={l} href="#" style={{ color: 'inherit', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = T.lime}
              onMouseLeave={e => e.target.style.color = 'inherit'}>{l}</a>
          ))}
        </div>
        <span>© 2026 ANTI-GRAVITY STUDIOS. ALL RIGHTS RESERVED.</span>
      </footer>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

function SubCopy() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ position: 'relative', minHeight: '4.5em' }}>
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

function FeatureCard({ f }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={{ background: hovered ? '#0e0e0e' : T.bg }}
      style={{
        padding: '64px 56px', position: 'relative',
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
        fontFamily: "'DM Mono',monospace", fontSize: 10,
        letterSpacing: '0.3em', color: 'rgba(240,237,232,0.18)',
        marginBottom: 44, display: 'block', textTransform: 'uppercase'
      }}>
        {f.n}
      </span>
      <span style={{ fontSize: 36, marginBottom: 28, display: 'block' }}>{f.ico}</span>
      <h3 style={{
        fontFamily: "'Bebas Neue',sans-serif", fontSize: 44,
        letterSpacing: '0.03em', color: T.white, lineHeight: 0.95, marginBottom: 18
      }}>
        {f.title}
      </h3>
      <p style={{ fontSize: 15, lineHeight: 1.8, color: 'rgba(240,237,232,0.38)', maxWidth: 380 }}>
        {f.desc}
      </p>
      <span style={{
        display: 'inline-block', marginTop: 32,
        fontFamily: "'DM Mono',monospace", fontSize: 10,
        letterSpacing: '0.25em', textTransform: 'uppercase',
        color: T.lime, border: '1px solid rgba(200,241,53,0.2)', padding: '6px 14px'
      }}>
        {f.tag}
      </span>
    </motion.div>
  );
}

function BtnPrimary({ children, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      style={{
        fontFamily: "'DM Mono',monospace", fontSize: 12,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        background: T.lime, color: hovered ? T.lime : '#000',
        border: 'none', padding: '18px 36px', cursor: 'pointer',
        position: 'relative', overflow: 'hidden'
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

function BtnGhost({ children, onClick }) {
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
        fontFamily: "'DM Mono',monospace", fontSize: 12,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        background: 'transparent', border: '1px solid rgba(240,237,232,0.18)',
        padding: '18px 36px', cursor: 'pointer', color: T.white
      }}
    >
      {children}
    </motion.button>
  );
}