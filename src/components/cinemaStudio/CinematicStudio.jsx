/**
 * ZeroLens — Cinema Studio
 * Gallery-background layout with floating chat input.
 * Engines: Veo 3.1 (Google) + Seedance 2.0 (Kie.ai)
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Video, Trash2, Camera, Film, Play, Loader2, X, Music,
  Clapperboard, Image as ImageIcon, Send, Download, ChevronDown,
  ChevronUp, Settings2, Maximize2, Clock, Ratio, Zap, Eye, Users,
  Pencil, Grid, Tv, Upload, Sliders
} from 'lucide-react';
import { useShorts } from '../../hooks/useShorts';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { getApiUrl, resolveUrl } from '../../config/apiConfig';
import { cn } from '../../lib/utils';
import { ReferencePanel } from './ReferencePanel';
import { SidePanel } from './SidePanel';
import { CAMERA_ANGLES, CAMERA_MODELS, ANGLE_NARRATIVES } from './constants';
import { InpaintEditor } from '../common/InpaintEditor';
import { compressImageToMax1024 } from '../../services/geminiService';
import { CinematicLightbox } from './CinematicLightbox';
import { StoryboardEditor } from './StoryboardEditor';
import { buildSeedanceContentArray, isVideo, isAudio } from './SeedanceEngine';
import { LazyVideo } from './LazyVideo';

/* ─── URL NORMALIZATION & DEDUPLICATION HELPERS ─────────────────── */
const getNormalizedPath = (url) => {
  if (!url || typeof url !== 'string') return '';
  let target = url;
  if (target.includes('/api/proxy-image')) {
    try {
      const u = new URL(target.startsWith('http') ? target : `http://localhost${target}`);
      const decoded = u.searchParams.get('url');
      if (decoded) {
        target = decoded;
      }
    } catch (_) {
      // Ignore URL parsing errors for proxy queries
    }
  }
  try {
    if (target.startsWith('http://') || target.startsWith('https://')) {
      return new URL(target).pathname;
    }
  } catch (_) {
    // Ignore URL parsing errors for absolute paths
  }
  if (target.startsWith('/')) {
    return target;
  }
  if (!target.includes(':') && !target.startsWith('data:') && !target.startsWith('blob:')) {
    return '/' + target;
  }
  return target;
};

const deduplicateGallery = (items) => {
  if (!Array.isArray(items)) return [];
  const seenPaths = new Set();
  const result = [];
  for (const item of items) {
    if (!item || !item.url) continue;
    const path = getNormalizedPath(item.url);
    if (!path) continue;
    if (seenPaths.has(path)) {
      const existingIdx = result.findIndex(r => getNormalizedPath(r.url) === path);
      if (existingIdx !== -1) {
        const existing = result[existingIdx];
        const isExistingTemp = typeof existing.id === 'number';
        const isCurrentTemp = typeof item.id === 'number';
        if (isExistingTemp && !isCurrentTemp) {
          result[existingIdx] = { ...existing, ...item };
        } else {
          result[existingIdx] = { ...item, ...existing };
        }
      }
      continue;
    }
    seenPaths.add(path);
    result.push(item);
  }
  return result;
};

/* ─── CONSTANTS ─────────────────────────────────────────────── */
const VARIATIONS_OPTIONS = [
  { value: 1, label: '1 Generation', desc: 'Single credit cost' },
  { value: 2, label: '2 Variations', desc: 'Double variation batch' },
  { value: 3, label: '3 Variations', desc: 'Triple variation batch' },
  { value: 4, label: '4 Variations', desc: 'Quadruple variation batch' },
];

const SUGGESTIONS = [
  { label: "Volcanic Chase", prompt: "A hyper-cinematic sweep over a boiling volcanic landscape, follow-shot behind a metallic sci-fi drone dodging eruptions, high-octane lens flares, slow motion, UE5 style." },
  { label: "Neon Alley Noir", prompt: "Golden hour turning into deep rain-soaked night in Neo Tokyo, slow camera pan along a dark neon-lit alleyway, reflection of neon signs in a puddle, moody cyberpunk noir." },
  { label: "Product Macro", prompt: "Extreme macro camera glide over a brushed titanium watch bezel, dark studio backdrop, soft mist floating, professional volumetric lighting, high-contrast luxury advertising." },
  { label: "Ocean Sunrise", prompt: "Aerial cinematic drone rising from crashing ocean waves at sunrise, golden light scattering through sea spray, slow dolly motion, IMAX quality, ultra-wide lens." },
  { label: "Sci-Fi Corridor", prompt: "First-person tracking shot through a massive sci-fi spaceship corridor, holographic displays on walls, steam vents, emergency red lighting, Blade Runner aesthetic." },
  { label: "Forest Spirit", prompt: "Ethereal tracking shot through an ancient enchanted forest, bioluminescent mushrooms, floating fireflies, mystical fog, Studio Ghibli meets reality, golden hour backlight." },
];

const LOADING_MESSAGES = [
  "🎬 Directing virtual actors...",
  "📐 Positioning camera dollies...",
  "🌇 Setting cinematic color grading...",
  "🔥 Volumetric smoke rendering...",
  "📸 Optimizing focal depth...",
  "⚡ Prime cinematic rendering active...",
  "🎥 Composing the perfect frame...",
  "🌟 Adding lens flare magic...",
];

function CyclingLoadingText() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % LOADING_MESSAGES.length);
        setVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <p style={{ transition: 'opacity 0.4s', opacity: visible ? 1 : 0 }}
       className="text-white/60 text-xs font-black uppercase tracking-widest text-center max-w-xs">
      {LOADING_MESSAGES[idx]}
    </p>
  );
}

const ENGINES = [
  { id: 'veo-3.1-generate-preview',      label: 'Veo 3.1 Standard', icon: '🎬', desc: 'Google Standard — 2.5⚡/s (4.5⚡/s audio)', cost: 2.5 },
  { id: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1 Fast',     icon: '⚡', desc: 'Google Fast — 1.5⚡/s (2.5⚡/s audio)',         cost: 1.5 },
  { id: 'veo-3.1-lite-generate-preview', label: 'Veo 3.1 Lite',     icon: '🍃', desc: 'Google Lite — 1⚡/s (1.5⚡/s audio)',           cost: 1 },
  { id: 'seedance-fast',                 label: 'Seedance Fast',    icon: '🚀', desc: 'ByteDance — 7⚡/s (480p) / 12⚡/s (720p)',          cost: 12 },
  { id: 'seedace',                       label: 'Seedance 2.0',     icon: '🎯', desc: 'ByteDance — 15⚡/s (720p) / 35⚡/s (1080p)',        cost: 15 },
  { id: 'seedance-mini',                 label: 'Seedance Mini',    icon: '🧊', desc: 'ByteDance — 5⚡/s (480p) / 7⚡/s (720p)',          cost: 7 },
  { id: 'kling/v3-turbo-image-to-video', label: 'Kling V3 Turbo',   icon: '🔥', desc: 'Kling — 9.8⚡/s (720p) / 12.3⚡/s (1080p) (V3 Turbo high fidelity)', cost: 9.8 },
  { id: 'omni-flash',                    label: 'Omni Flash',      icon: '✨', desc: 'Omni fast — 1.6⚡/s (2.75⚡/s audio)',           cost: 1.6 },
];

const IMAGE_ENGINES = [
  { id: 'nano-banana-2-lite', label: 'NB2 Lite', icon: '⚡', desc: 'Google ultra-fast lite engine — 0.5⚡ flat rate', cost: 0.5 },
  { id: 'nano-banana-2',   label: 'NB2',   icon: '🎨', desc: 'Google highest-fidelity photo gen — 1⚡ flat rate', cost: 1 },
  { id: 'nano-banana-pro', label: 'NB2 Pro', icon: '💎', desc: 'Google maximum fidelity image engine — 3⚡ flat rate', cost: 3 },
  { id: 'gpt-image-2',     label: 'GPT Image Pro',   icon: '🤖', desc: 'OpenAI layout & text design — 2⚡ flat rate',                 cost: 2 },
];

const STYLE_OPTIONS = [
  { value: 'cinematic',      label: 'Cinematic',      icon: '🎬', desc: 'Dramatic lighting, anamorphic flair' },
  { value: 'photorealistic', label: 'Photorealistic', icon: '📸', desc: 'Hyper-detailed camera shot, 8k' },
  { value: 'anime',          label: 'Anime / 2D',     icon: '🌸', desc: 'Japanese animation, vibrant colors' },
  { value: '3d-render',      label: '3D Render',      icon: '👾', desc: 'Unreal Engine 5 depth, Raytraced' },
];

const ASPECT_OPTIONS = [
  { value: '16:9', label: 'Widescreen',  desc: 'YouTube, cinematic', w: 28, h: 16 },
  { value: '9:16', label: 'Portrait',    desc: 'Reels, TikTok, Shorts', w: 16, h: 28 },
  { value: '1:1',  label: 'Square',      desc: 'Instagram, social',   w: 22, h: 22 },
];

const RESOLUTION_OPTIONS = [
  { value: '480p', label: '480p', desc: 'Standard definition — fastest generation' },
  { value: '720p', label: '720p', desc: 'Standard definition — faster generation' },
  { value: '1080p', label: '1080p', desc: 'Full HD — recommended quality' },
  { value: '4k', label: '4K', desc: 'Ultra HD — cinematic sharpness' }
];

const DURATION_OPTIONS = [
  { value: 5,  label: '5 Seconds',  desc: 'Quick burst — ideal for ads' },
  { value: 8,  label: '8 Seconds',  desc: 'Standard — cinematic shots' },
  { value: 10, label: '10 Seconds', desc: 'Extended — full scenes' },
];

const SEEDANCE_DURATION_OPTIONS = [
  { value: 3,  label: '3 Seconds',  desc: 'Ultra-fast micro clip' },
  { value: 4,  label: '4 Seconds',  desc: 'Quick burst — dynamic movement' },
  { value: 5,  label: '5 Seconds',  desc: 'Standard burst — ideal for ads' },
  { value: 6,  label: '6 Seconds',  desc: 'Extended burst — smooth scene' },
  { value: 10, label: '10 Seconds', desc: 'Narrative length — extended motion' },
  { value: 15, label: '15 Seconds', desc: 'Full scene — maximum duration' },
];

const OMNI_DURATION_OPTIONS = [
  { value: 4,  label: '4 Seconds',  desc: 'Quick cut — fast-paced narrative' },
  { value: 6,  label: '6 Seconds',  desc: 'Standard — balanced movement' },
  { value: 10, label: '10 Seconds', desc: 'Maximum duration — full cinematic action' },
];

const VEO_DURATION_OPTIONS = [
  { value: 4,  label: '4 Seconds',  desc: 'Quick cut — fast-paced narrative' },
  { value: 6,  label: '6 Seconds',  desc: 'Standard — balanced movement' },
  { value: 8,  label: '8 Seconds',  desc: 'Extended — maximum duration' },
];

const CAMERA_MOVEMENTS = [
  { value: 'none',        label: 'Static / None',  icon: '📷', desc: 'No active camera movement' },
  { value: 'zoom-in',     label: 'Zoom In',        icon: '🔍', desc: 'Slow camera push forward' },
  { value: 'zoom-out',    label: 'Zoom Out',       icon: '🔎', desc: 'Camera pull back' },
  { value: 'pan-left',    label: 'Pan Left',       icon: '⬅️', desc: 'Horizontal sweep left' },
  { value: 'pan-right',   label: 'Pan Right',      icon: '➡️', desc: 'Horizontal sweep right' },
  { value: 'tilt-up',     label: 'Tilt Up',        icon: '⬆️', desc: 'Vertical upward tilt' },
  { value: 'tilt-down',   label: 'Tilt Down',      icon: '⬇️', desc: 'Vertical downward tilt' },
  { value: 'orbit-left',  label: 'Orbit Left',     icon: '🔄', desc: 'Circular sweep around' },
  { value: 'crane-up',    label: 'Crane Up',       icon: '🚁', desc: 'Rising vertical shot' },
];

const LENS_MODELS = [
  { id: 'cooke', label: 'Cooke S4/i', desc: 'Warm, Soft, Organic, Beautiful skin tones', aesthetic: 'warm, soft, organic skin tones with gentle highlight roll-off and classic Cooke look' },
  { id: 'signature', label: 'ARRI Signature Prime', desc: 'Modern, Clean, Premium, Blockbuster look', aesthetic: 'modern, clean, ultra-premium cinematic blockbuster look with natural highlights' },
  { id: 'zeiss', label: 'Zeiss Master Prime', desc: 'Very sharp, High contrast, Clinical', aesthetic: 'clinical sharpness, extremely high contrast, and zero aberration' },
  { id: 'panavision', label: 'Panavision Primo', desc: 'Classic Hollywood look', aesthetic: 'classic Hollywood look with soft highlights and vintage Panavision character' },
  { id: 'atlas', label: 'Atlas Orion Anamorphic', desc: 'Blue lens flares, Widescreen feel', aesthetic: 'cinematic widescreen anamorphic lens flare style with streak blue flares' },
  { id: 'hawk', label: 'Hawk Anamorphic', desc: 'Epic blockbuster style', aesthetic: 'epic blockbuster anamorphic lens style with unique vertical oval bokeh' }
];

const CAMERA_OPTICS = {
  arri: [
    { label: '14mm Prime (Extreme Wide)', lens: '14mm', angle: 'extreme_wide' },
    { label: '21mm Prime (Wide Shot)', lens: '21mm', angle: 'wide' },
    { label: '35mm Prime (Medium Shot)', lens: '35mm', angle: 'medium' },
    { label: '50mm Prime (Cowboy Shot)', lens: '50mm', angle: 'cowboy' },
    { label: '85mm Portrait Prime (Close Up)', lens: '85mm', angle: 'closeup' },
    { label: '100mm Macro Prime (Extreme Close)', lens: '100mm', angle: 'extreme_closeup' },
    { label: '18mm Prime (Low Angle)', lens: '18mm', angle: 'low_angle' },
    { label: '35mm Prime (High Angle)', lens: '35mm', angle: 'high_angle' },
    { label: '12mm Drone Lens (Aerial View)', lens: '12mm', angle: 'drone' },
    { label: '18mm POV Lens (First-Person)', lens: '18mm', angle: 'pov' },
    { label: '35mm Dutch Tilt Lens (Tilted Shot)', lens: '35mm', angle: 'dutch' },
    { label: '50mm Over-Shoulder Lens (OTS)', lens: '50mm', angle: 'ots' },
    { label: '12mm Top-Down Lens (Eagle POV)', lens: '12mm', angle: 'eagle_pov' }
  ],
  sony: [
    { label: '16mm Anamorphic (Extreme Wide)', lens: '16mm Anamorphic', angle: 'extreme_wide' },
    { label: '28mm Anamorphic (Wide Shot)', lens: '28mm Anamorphic', angle: 'wide' },
    { label: '50mm Anamorphic (Medium Shot)', lens: '50mm Anamorphic', angle: 'medium' },
    { label: '75mm Anamorphic (Cowboy Shot)', lens: '75mm Anamorphic', angle: 'cowboy' },
    { label: '85mm Anamorphic (Close Up)', lens: '85mm Anamorphic', angle: 'closeup' },
    { label: '135mm Prime (Extreme Close)', lens: '135mm', angle: 'extreme_closeup' },
    { label: '24mm Prime (Low Angle)', lens: '24mm', angle: 'low_angle' },
    { label: '50mm Anamorphic (High Angle)', lens: '50mm Anamorphic', angle: 'high_angle' },
    { label: '16mm Anamorphic (Drone View)', lens: '16mm Anamorphic', angle: 'drone' },
    { label: '24mm POV Lens (First-Person)', lens: '24mm', angle: 'pov' },
    { label: '50mm Anamorphic (Dutch Tilt)', lens: '50mm Anamorphic', angle: 'dutch' },
    { label: '75mm Anamorphic (Over-Shoulder)', lens: '75mm Anamorphic', angle: 'ots' }
  ],
  red: [
    { label: '12mm Prime (Extreme Wide)', lens: '12mm', angle: 'extreme_wide' },
    { label: '18mm Prime (Wide Shot)', lens: '18mm', angle: 'wide' },
    { label: '50mm Prime (Medium Shot)', lens: '50mm', angle: 'medium' },
    { label: '85mm Prime (Cowboy Shot)', lens: '85mm', angle: 'cowboy' },
    { label: '85mm Prime (Close Up)', lens: '85mm', angle: 'closeup' },
    { label: '150mm Macro Prime (Extreme Close)', lens: '150mm Macro', angle: 'extreme_closeup' },
    { label: '24mm Prime (Low Angle)', lens: '24mm', angle: 'low_angle' },
    { label: '50mm Prime (High Angle)', lens: '50mm', angle: 'high_angle' },
    { label: '12mm Drone Lens (Aerial View)', lens: '12mm', angle: 'drone' },
    { label: '24mm POV Lens (First-Person)', lens: '24mm', angle: 'pov' },
    { label: '35mm Dutch Tilt Lens (Tilted Shot)', lens: '35mm', angle: 'dutch' },
    { label: '85mm Over-Shoulder Lens (OTS)', lens: '85mm', angle: 'ots' }
  ],
  imax: [
    { label: '15mm IMAX Lens (Extreme Wide)', lens: '15mm IMAX', angle: 'extreme_wide' },
    { label: '18mm IMAX Lens (Wide Shot)', lens: '18mm IMAX', angle: 'wide' },
    { label: '30mm IMAX Lens (Medium Shot)', lens: '30mm IMAX', angle: 'medium' },
    { label: '65mm IMAX Lens (Cowboy Shot)', lens: '65mm IMAX', angle: 'cowboy' },
    { label: '65mm IMAX Lens (Close Up)', lens: '65mm IMAX', angle: 'closeup' },
    { label: '65mm IMAX Lens (Extreme Close)', lens: '65mm IMAX', angle: 'extreme_closeup' },
    { label: '30mm IMAX Lens (Low Angle)', lens: '30mm IMAX', angle: 'low_angle' },
    { label: '30mm IMAX Lens (High Angle)', lens: '30mm IMAX', angle: 'high_angle' },
    { label: '65mm Over-Shoulder IMAX Lens (OTS)', lens: '65mm IMAX', angle: 'ots' }
  ],
  iphone: [
    { label: '13mm Ultra Wide (Extreme Wide)', lens: '13mm Ultra Wide', angle: 'extreme_wide' },
    { label: '24mm Main Lens (Wide Shot)', lens: '24mm Main', angle: 'wide' },
    { label: '24mm Main Lens (Medium Shot)', lens: '24mm Main', angle: 'medium' },
    { label: '77mm Telephoto (Cowboy Shot)', lens: '77mm Telephoto', angle: 'cowboy' },
    { label: '77mm Telephoto (Close Up)', lens: '77mm Telephoto', angle: 'closeup' },
    { label: '77mm Macro (Extreme Close)', lens: '77mm Macro', angle: 'extreme_closeup' },
    { label: '24mm Main Lens (Low Angle)', lens: '24mm Main', angle: 'low_angle' },
    { label: '24mm Main Lens (High Angle)', lens: '24mm Main', angle: 'high_angle' },
    { label: '24mm Main Lens (Drone View)', lens: '24mm Main', angle: 'drone' },
    { label: '13mm Ultra Wide (POV First-Person)', lens: '13mm Ultra Wide', angle: 'pov' },
    { label: '24mm Main Lens (Dutch Tilt)', lens: '24mm Main', angle: 'dutch' },
    { label: '24mm Main Lens (Over-Shoulder)', lens: '24mm Main', angle: 'ots' }
  ],
  gopro: [
    { label: '12mm SuperView (Extreme Wide)', lens: '12mm SuperView', angle: 'extreme_wide' },
    { label: '14mm Wide (Wide Shot)', lens: '14mm Wide', angle: 'wide' },
    { label: '14mm Wide (Medium Shot)', lens: '14mm Wide', angle: 'medium' },
    { label: '14mm Wide (Cowboy Shot)', lens: '14mm Wide', angle: 'cowboy' },
    { label: '14mm Wide (Low Angle)', lens: '14mm Wide', angle: 'low_angle' },
    { label: '14mm Wide (High Angle)', lens: '14mm Wide', angle: 'high_angle' },
    { label: '12mm SuperView (Drone View)', lens: '12mm SuperView', angle: 'drone' },
    { label: '12mm SuperView (POV First-Person)', lens: '12mm SuperView', angle: 'pov' },
    { label: '14mm Wide (Dutch Tilt)', lens: '14mm Wide', angle: 'dutch' },
    { label: '14mm Wide (Over-Shoulder)', lens: '14mm Wide', angle: 'ots' }
  ],
  vhs: [
    { label: 'Auto Zoom (Standard VHS)', lens: 'Auto Zoom', angle: 'medium' }
  ],
  dslr: [
    { label: '24mm Wide-Angle Prime (Wide)', lens: '24mm', angle: 'wide' },
    { label: '35mm Street Prime (Medium)', lens: '35mm', angle: 'medium' },
    { label: '50mm Portrait Prime (Cowboy)', lens: '50mm', angle: 'cowboy' },
    { label: '85mm Portrait Prime (Close Up)', lens: '85mm', angle: 'closeup' },
    { label: '70-200mm Zoom (Extreme Close)', lens: '70-200mm', angle: 'extreme_closeup' }
  ],
  blackmagic: [
    { label: '16mm Cinema Prime (Extreme Wide)', lens: '16mm', angle: 'extreme_wide' },
    { label: '24mm Cinema Prime (Wide)', lens: '24mm', angle: 'wide' },
    { label: '35mm Cinema Prime (Medium)', lens: '35mm', angle: 'medium' },
    { label: '85mm Cinema Prime (Cowboy)', lens: '85mm', angle: 'cowboy' },
    { label: '85mm Cinema Prime (Close Up)', lens: '85mm', angle: 'closeup' },
    { label: '100mm Macro Prime (Extreme Close)', lens: '100mm Macro', angle: 'extreme_closeup' },
    { label: '35mm Cinema Prime (Low Angle)', lens: '35mm', angle: 'low_angle' },
    { label: '50mm Cinema Prime (High Angle)', lens: '50mm', angle: 'high_angle' },
    { label: '16mm Cinema Prime (Drone View)', lens: '16mm', angle: 'drone' },
    { label: '24mm POV Lens (First-Person)', lens: '24mm', angle: 'pov' },
    { label: '35mm Dutch Tilt Lens (Tilted)', lens: '35mm', angle: 'dutch' },
    { label: '85mm Over-Shoulder Lens (OTS)', lens: '85mm', angle: 'ots' }
  ],
  hasselblad: [
    { label: '21mm XCD Prime (Extreme Wide)', lens: '21mm XCD', angle: 'extreme_wide' },
    { label: '30mm XCD Prime (Wide)', lens: '30mm XCD', angle: 'wide' },
    { label: '45mm XCD Prime (Medium)', lens: '45mm XCD', angle: 'medium' },
    { label: '90mm XCD Prime (Cowboy)', lens: '90mm XCD', angle: 'cowboy' },
    { label: '90mm XCD Prime (Close Up)', lens: '90mm XCD', angle: 'closeup' },
    { label: '120mm Macro XCD (Extreme Close)', lens: '120mm Macro XCD', angle: 'extreme_closeup' },
    { label: '45mm XCD Prime (Low Angle)', lens: '45mm XCD', angle: 'low_angle' },
    { label: '45mm XCD Prime (High Angle)', lens: '45mm XCD', angle: 'high_angle' },
    { label: '45mm XCD Prime (Dutch Tilt)', lens: '45mm XCD', angle: 'dutch' },
    { label: '90mm Over-Shoulder XCD Lens (OTS)', lens: '90mm XCD', angle: 'ots' }
  ],
  fujifilm: [
    { label: '18mm Film Prime (Wide)', lens: '18mm', angle: 'wide' },
    { label: '23mm Film Prime (Medium)', lens: '23mm', angle: 'medium' },
    { label: '35mm Film Prime (Cowboy)', lens: '35mm', angle: 'cowboy' },
    { label: '56mm Film Prime (Close Up)', lens: '56mm', angle: 'closeup' }
  ],
  disposable: [
    { label: 'Fixed 32mm Plastic Lens', lens: 'Fixed 32mm', angle: 'medium' }
  ]
};

/* ─── UPWARD DROPDOWN COMPONENT ─────────────────────────────── */
function UpwardDropdown({ children, icon, label, badge, accentColor = 'fuchsia' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ bottom: 0, left: 0 });
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  // Calculate position from trigger button
  const openDropdown = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({
        bottom: window.innerHeight - r.top + 8,
        left: r.left + r.width / 2,
      });
    }
    setOpen(v => !v);
  };

  // Close on outside click or window resize
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    
    const handleResize = () => {
      setOpen(false);
    };

    document.addEventListener('mousedown', handler);
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  const colorMap = {
    fuchsia: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/25', text: 'text-fuchsia-400', hoverBorder: 'hover:border-fuchsia-500/30', ring: 'shadow-fuchsia-500/10' },
    lime:    { bg: 'bg-[#c8f135]/10',    border: 'border-[#c8f135]/25',   text: 'text-[#c8f135]',   hoverBorder: 'hover:border-[#c8f135]/30', ring: 'shadow-[#c8f135]/10' },
    cyan:    { bg: 'bg-cyan-500/10',     border: 'border-cyan-500/25',    text: 'text-cyan-400',    hoverBorder: 'hover:border-cyan-500/30', ring: 'shadow-cyan-500/10' },
    violet:  { bg: 'bg-violet-500/10',   border: 'border-violet-500/25',  text: 'text-violet-400',  hoverBorder: 'hover:border-violet-500/30', ring: 'shadow-violet-500/10' },
  };
  const c = colorMap[accentColor] || colorMap.fuchsia;

  return (
    <>
      {/* Trigger pill */}
      <motion.button
        ref={triggerRef}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        onClick={openDropdown}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest border backdrop-blur-xl transition-colors shrink-0 origin-bottom",
          open
            ? `${c.bg} ${c.border} ${c.text}`
            : `bg-black/60 border-white/10 text-gray-500 hover:text-white ${c.hoverBorder}`
        )}
      >
        {icon}
        <span className="whitespace-nowrap">{label}</span>
        {badge && <span className={cn("text-[6px] px-1 py-0.5 rounded border ml-0.5", open ? `${c.border} ${c.text}` : "border-white/5 text-gray-600")}>{badge}</span>}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="ml-0.5"
        >
          <ChevronUp size={7} />
        </motion.span>
      </motion.button>

      {/* Fixed-position panel — escapes overflow:auto clipping by rendering in document.body via a portal */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                position: 'fixed',
                bottom: pos.bottom,
                left: pos.left,
                transform: 'translateX(-50%)',
                zIndex: 9999,
              }}
              className={cn(
                "min-w-[260px] max-w-[320px] max-h-[340px] overflow-y-auto custom-scrollbar",
                "bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl",
                `shadow-lg ${c.ring}`
              )}
            >
              {typeof children === 'function' ? children(() => setOpen(false)) : children}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

const DEFAULT_CINEMA_ASSETS = [];

const cleanErrorMessage = (msg) => {
  if (!msg || typeof msg !== 'string') return '';
  let cleaned = msg;
  if (cleaned.toLowerCase().includes('pixel count') || cleaned.includes('409600')) {
    return "Reference Video Resolution Too Low: ByteDance Seedance 2.0 requires reference videos to have a total resolution of at least 409,600 pixels (e.g. at least 640x640, 854x480, or 1280x720). Please upload a higher resolution reference video.";
  }
  if (cleaned.toLowerCase().includes('real person') || cleaned.toLowerCase().includes('realperson')) {
    return "Real-Person Policy Flagged: Volcano/BytePlus Ark safety filters restrict generating video from reference images that resemble real people. Recommendations: 1) Switch to Veo 3.1 or 2) Use a more stylized or cartoonish/drawn reference image.";
  }
  if (cleaned.includes('SAFETY_REFUSAL') || cleaned.toLowerCase().includes('safety filter')) {
    return "Safety Filter Blocked: The prompt or input image triggered the model's safety filters. Please refine your prompt text or try a different reference image.";
  }
  return cleaned;
};

// Fully uncontrolled FastPromptInput — zero React re-renders during typing.
// Uses defaultValue + DOM ref for instant native browser input, debounces
// parent state sync, and runs auto-resize via rAF to never block paint.
const FastPromptInput = React.memo(({
  textareaRef,
  promptText,
  handleTextChange,
  canGenerate,
  handleGenerate,
  activeTab,
  isBusy
}) => {
  const debounceTimerRef = React.useRef(null);
  const lastSyncedRef = React.useRef(promptText || '');

  // Auto-resize: runs off the critical paint path via rAF
  const scheduleResize = React.useCallback(() => {
    requestAnimationFrame(() => {
      const tx = textareaRef?.current;
      if (!tx) return;
      tx.style.height = 'auto';
      tx.style.height = `${Math.min(tx.scrollHeight, 180)}px`;
    });
  }, [textareaRef]);

  // Sync from parent ONLY when it genuinely changes externally
  // (e.g. pill click, recipe insert, clear button) — never during typing
  React.useEffect(() => {
    const tx = textareaRef?.current;
    if (!tx) return;
    if (promptText !== undefined && promptText !== lastSyncedRef.current) {
      lastSyncedRef.current = promptText;
      tx.value = promptText;  // Direct DOM write — no React re-render
      scheduleResize();
    }
  }, [promptText, textareaRef, scheduleResize]);

  const handleChange = React.useCallback((e) => {
    const value = e.target.value;
    const selectionStart = e.target.selectionStart;
    lastSyncedRef.current = value;

    // Resize off the paint path
    scheduleResize();

    // Debounce heavy parent update (mention detection, setPromptText, etc.)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      React.startTransition(() => {
        handleTextChange({ target: { value, selectionStart } });
      });
    }, 300);
  }, [handleTextChange, scheduleResize]);

  const handleKeyDown = React.useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const val = textareaRef?.current?.value ?? lastSyncedRef.current;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      // Flush prompt immediately on Enter before generating
      handleTextChange({ target: { value: val, selectionStart: val.length } });
      if (canGenerate) handleGenerate(val);
    }
  }, [handleTextChange, handleGenerate, canGenerate, textareaRef]);

  return (
    <textarea
      ref={textareaRef}
      defaultValue={promptText || ''}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={activeTab === 'image'
        ? "Describe your premium image masterwork - subject, lighting, style preset... Type @ to tag reference elements."
        : "Describe your cinematic video scenario - camera movements, lighting, mood... Type @ to tag reference elements."
      }
      rows={1}
      disabled={isBusy}
      className="w-full bg-transparent text-xs text-white placeholder-white/20 outline-none resize-none font-medium leading-relaxed custom-scrollbar py-2 min-h-[36px]"
    />
  );
});

/* ─── MAIN COMPONENT ────────────────────────────────────────── */
export default function CinematicStudio() {
  const userProfile = useAppStore(state => state.userProfile);
  const userShorts = useAppStore(state => state.userShorts);
  const userCredits = userShorts ?? 0;
  const userId = userProfile?.id || 'anon';

  const { refresh: refreshShorts } = useShorts() || { refresh: () => {} };
  const spendShorts = useAppStore(state => state.spendShorts);
  const refundShorts = useAppStore(state => state.refundShorts);
  const projects = useAppStore(state => state.projects || [{ id: 'default', name: 'Default Project' }]);
  const setProjects = useAppStore(state => state.setProjects);
  const activeProjectId = useAppStore(state => state.activeProjectId || 'default');
  const setActiveProjectId = useAppStore(state => state.setActiveProjectId);

  // Core Inputs for Veo 3.1
  const [promptText, setPromptText] = useState('');
  const [firstFrameImage, setFirstFrameImage] = useState('');
  const [firstFramePreview, setFirstFramePreview] = useState('');
  const [lastFrameImage, setLastFrameImage] = useState('');
  const [lastFramePreview, setLastFramePreview] = useState('');

  // Core Inputs for Omni Flash (Up to 5 Reference Image Slots)
  const [omniRefImages, setOmniRefImages] = useState(['', '', '', '', '']);
  const [omniRefPreviews, setOmniRefPreviews] = useState(['', '', '', '', '']);
  const [omniPromptText, setOmniPromptText] = useState('');
  const [omniFirstFrameImage, setOmniFirstFrameImage] = useState('');
  const [omniFirstFramePreview, setOmniFirstFramePreview] = useState('');
  const [omniLastFrameImage, setOmniLastFrameImage] = useState('');
  const [omniLastFramePreview, setOmniLastFramePreview] = useState('');
  const [omniRefVideoPreview, setOmniRefVideoPreview] = useState('');
  const [omniRefVideoDuration, setOmniRefVideoDuration] = useState(0);

  const [uploadTarget, setUploadTargetState] = useState('first'); // 'first' | 'last'
  const uploadTargetRef = useRef('first');
  const setUploadTarget = useCallback((t) => {
    uploadTargetRef.current = t;
    setUploadTargetState(t);
  }, []);
  const [isUploading, setIsUploading] = useState(false);

  // Settings
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('cs_activeTab') || 'image'); // 'video' | 'image'
  const [imageStyle, setImageStyle] = useState(() => localStorage.getItem('cs_imageStyle') || 'cinematic');
  const [activeEngine, setActiveEngine] = useState(() => {
    const savedEngine = localStorage.getItem('cs_activeEngine');
    if (savedEngine) return savedEngine;
    const tab = localStorage.getItem('cs_activeTab') || 'image';
    return tab === 'image' ? 'nano-banana-2' : 'veo-3.1-lite-generate-preview';
  });
  const [aspectRatio, setAspectRatio] = useState(() => localStorage.getItem('cs_aspectRatio') || '16:9');
  const [resolution, setResolution] = useState(() => localStorage.getItem('cs_resolution') || '1080p');
  const [variationCount, setVariationCount] = useState(() => Number(localStorage.getItem('cs_variationCount')) || 1);
  const [duration, setDuration] = useState(() => Number(localStorage.getItem('cs_duration')) || 5);
  const [camera, setCamera] = useState(() => localStorage.getItem('cs_camera') || 'arri');
  const [lens, setLens] = useState(() => localStorage.getItem('cs_lens') || '21mm');
  const [angle, setAngle] = useState(() => localStorage.getItem('cs_angle') || 'wide');
  const [lensModel, setLensModel] = useState(() => localStorage.getItem('cs_lensModel') || 'cooke');
  const [cameraMovement, setCameraMovement] = useState(() => localStorage.getItem('cs_cameraMovement') || 'none');
  const isConsumerCam = ['iphone', 'gopro', 'vhs', 'disposable'].includes(camera);
  const [showAnglesModal, setShowAnglesModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [generateAudio, setGenerateAudio] = useState(() => localStorage.getItem('cs_generateAudio') === 'true');
  const [useCameraSettings, setUseCameraSettings] = useState(() => localStorage.getItem('cs_useCameraSettings') !== 'false');
  const [omniTask, setOmniTask] = useState(() => localStorage.getItem('cs_omniTask') || 'auto');
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [panelTab, setPanelTab] = useState('veo'); // 'veo' | 'omni'

  const isSeed = useMemo(() => activeEngine === 'seedance-fast' || activeEngine === 'seedace' || activeEngine === 'seedance-mini', [activeEngine]);
  const isOmni = useMemo(() => activeEngine === 'omni' || activeEngine === 'omni-flash', [activeEngine]);
  const isExtendedRefBoard = useMemo(() => isSeed || isOmni, [isSeed, isOmni]);

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem('cs_activeTab', activeTab);
    localStorage.setItem('cs_imageStyle', imageStyle);
    localStorage.setItem('cs_activeEngine', activeEngine);
    localStorage.setItem('cs_aspectRatio', aspectRatio);
    localStorage.setItem('cs_resolution', resolution);
    localStorage.setItem('cs_variationCount', String(variationCount));
    localStorage.setItem('cs_duration', String(duration));
    localStorage.setItem('cs_camera', camera);
    localStorage.setItem('cs_omniTask', omniTask);
    localStorage.setItem('cs_useCameraSettings', useCameraSettings);
    localStorage.setItem('cs_lens', lens);
    localStorage.setItem('cs_angle', angle);
    localStorage.setItem('cs_lensModel', lensModel);
    localStorage.setItem('cs_cameraMovement', cameraMovement);
    localStorage.setItem('cs_generateAudio', String(generateAudio));

    // Remember last selected engine per tab
    if (activeTab === 'image') {
      localStorage.setItem('cs_lastImageEngine', activeEngine);
    } else if (activeTab === 'video') {
      localStorage.setItem('cs_lastVideoEngine', activeEngine);
    }
  }, [
    activeTab, imageStyle, activeEngine, aspectRatio, resolution,
    variationCount, duration, camera, omniTask, lens, angle, lensModel, cameraMovement, generateAudio, useCameraSettings
  ]);

  // Automatically take default lens for selected Camera + Angle (framing & perspective)
  useEffect(() => {
    const cam = CAMERA_MODELS.find(c => c.id === camera) || CAMERA_MODELS[0];
    const mapping = cam.lensMap?.[angle] || cam.lensMap?.['*'];
    const defaultLens = mapping?.default || mapping?.lenses?.[0] || 'Auto';
    setLens(defaultLens);
  }, [camera, angle]);

  // Reset omniTask to auto if firstFrameImage is cleared
  useEffect(() => {
    if (omniTask === 'image_to_video' && !firstFrameImage) {
      setOmniTask('auto');
    }
  }, [firstFrameImage, omniTask]);

  // Adjust resolution & duration options dynamically for Seedance, Veo 3.1 & Omni engines
  useEffect(() => {
    const isSeed = activeEngine === 'seedance-fast' || activeEngine === 'seedace' || activeEngine === 'seedance-mini';
    const isOmniEngine = activeEngine === 'omni' || activeEngine === 'omni-flash';
    const isVeo3 = activeEngine.startsWith('veo-3.1');
    
    if (isOmniEngine) {
      if (![4, 6, 8, 10].includes(duration)) {
        if (duration < 5) setDuration(4);
        else if (duration < 7) setDuration(6);
        else if (duration < 9) setDuration(8);
        else setDuration(10);
      }
      if (activeEngine === 'omni-flash' && resolution === '4k') {
        setResolution('1080p');
      }
    } else if (isVeo3) {
      if (![4, 6, 8].includes(duration)) {
        if (duration < 5) setDuration(4);
        else if (duration < 8) setDuration(6);
        else setDuration(8);
      }
    } else if (isSeed) {
      if (activeEngine === 'seedace') {
        if (resolution !== '720p' && resolution !== '1080p') {
          setResolution('720p');
        }
      } else if (activeEngine === 'seedance-fast' || activeEngine === 'seedance-mini') {
        if (resolution !== '480p' && resolution !== '720p') {
          setResolution('720p');
        }
      }
      if (![3, 4, 5, 6, 10, 15].includes(duration)) {
        if (duration <= 3) setDuration(3);
        else if (duration <= 4) setDuration(4);
        else if (duration <= 5) setDuration(5);
        else if (duration <= 7) setDuration(6);
        else if (duration <= 12) setDuration(10);
        else setDuration(15);
      }
    } else {
      if (![5, 8, 10].includes(duration)) {
        if (duration <= 6) setDuration(5);
        else if (duration <= 9) setDuration(8);
        else setDuration(10);
      }
    }
  }, [activeEngine, resolution, duration]);


  const handleCameraChange = (camId) => {
    const cam = CAMERA_MODELS.find(c => c.id === camId) || CAMERA_MODELS[0];
    // If the currently selected angle is invalid on this camera, fallback to a valid one
    if (cam.invalidAngles?.includes(angle)) {
      const validAngle = CAMERA_ANGLES.find(a => !cam.invalidAngles?.includes(a.id));
      if (validAngle) {
        setAngle(validAngle.id);
      }
    }
    setCamera(camId);
  };

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Lifecycle
  const [status, setStatus] = useState('idle');
  const [pollMsg, setPollMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Gallery (all generated items)
  // Key is per-user so admin-generated assets never bleed into other users' galleries.
  const galleryLSKey = userId && userId !== 'anon'
    ? `cinematic_studio_gallery_${userId}`
    : null;

  const [gallery, setGallery] = useState(() => {
    // If we don't know the user yet, start empty — server fetch will populate.
    if (!galleryLSKey) return [];
    try {
      const cached = localStorage.getItem(galleryLSKey);
      const parsed = cached ? JSON.parse(cached) : [];
      const filtered = parsed.filter(item => {
        if (!item) return false;
        const itemId = String(item.id || '');
        const itemUrl = String(item.url || '');
        // Exclude only by type flag or by being in an /uploads/ or /reference/ folder path
        if (item.type === 'reference_upload') return false;
        const isRefFolder = itemUrl.includes('/uploads/') || itemUrl.includes('/reference/');
        return !itemId.startsWith('default_') && !itemUrl.includes('landing-assets') && !isRefFolder;
      });
      const deduped = deduplicateGallery(filtered);
      if (deduped.length !== parsed.length) {
        try {
          localStorage.setItem(galleryLSKey, JSON.stringify(deduped));
        } catch (e) {
          // ignore quota
        }
      }
      return deduped;
    } catch {
      return [];
    }
  });

  const filteredGallery = useMemo(() => {
    return gallery.filter(item => {
      const itemProj = item.projectId || 'default';
      return itemProj === activeProjectId;
    });
  }, [gallery, activeProjectId]);

  // Fetch previously generated assets from server on mount
  useEffect(() => {
    let active = true;
    const fetchAssets = async () => {
      if (!userId || userId === 'anon') return;
      try {
        const resp = await fetch(getApiUrl(`/api/ugc/assets/${userId}`));
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.assets && Array.isArray(data.assets) && active) {
          // Format server assets to match our gallery item structure, filtering out reference uploads
          const loadedAssets = data.assets
            .filter(asset => {
              // Exclude reference_upload type and assets stored in /uploads/ or /reference/ folders
              if (asset.type === 'reference_upload') return false;
              const url = asset.url || '';
              const isRefFolder = url.includes('/uploads/') || url.includes('/reference/');
              return !isRefFolder;
            })
            .map(asset => {
              let aspectVal = asset.aspect || '16:9';
              let isGridVal = false;
              let projIdVal = 'default';
              if (asset.metadata) {
                try {
                  const meta = typeof asset.metadata === 'string' ? JSON.parse(asset.metadata) : asset.metadata;
                  aspectVal = meta.aspect || meta.aspectRatio || meta.aspect_ratio || aspectVal;
                  isGridVal = !!meta.isGrid;
                  if (meta.projectId) {
                    projIdVal = meta.projectId;
                  }
                } catch (_) { /* ignore malformed metadata JSON */ }
              }
              const cleanPrompt = asset.prompt || '';
              const cleanEngine = asset.engine || (asset.type === 'video' ? 'Veo 3.1' : 'Nano Banana 2');
              const finalIsGrid = isGridVal || 
                                  cleanPrompt.toLowerCase().includes('grid') || 
                                  cleanPrompt.toLowerCase().includes('contact sheet') || 
                                  cleanPrompt.toLowerCase().includes('9-frame') || 
                                  cleanPrompt.toLowerCase().includes('3x3') || 
                                  cleanEngine.toLowerCase().includes('grid');
              return {
                id: asset.id,
                type: asset.type === 'video' ? 'video' : 'image',
                url: asset.url,
                prompt: cleanPrompt,
                engine: cleanEngine,
                aspect: aspectVal,
                ts: asset.created_at ? new Date(asset.created_at).getTime() : Date.now(),
                isGrid: finalIsGrid,
                projectId: projIdVal
              };
            });
          
          if (loadedAssets.length > 0) {
            setGallery(prev => {
              // Filter out local-only temp items (still generating) that aren't on the server yet
              const defaultsFilter = (item) => String(item.id).startsWith('default_') || (typeof item.id === 'number' && item.id < 10);
              const localTempItems = prev.filter(item => 
                !defaultsFilter(item) && (
                  item.url?.startsWith('blob:') ||
                  item.url?.startsWith('data:') ||
                  item.loading
                )
              );
              
              // Server is the source of truth — start from server data, then add any local temp items not yet on server
              const serverPaths = new Set(loadedAssets.map(a => getNormalizedPath(a.url)));
              const unsynced = localTempItems.filter(item => !serverPaths.has(getNormalizedPath(item.url)));
              
              const combined = deduplicateGallery([...loadedAssets, ...unsynced]);
              return combined.length > 0 ? combined : prev;
            });
          } else {
            // Server returned no assets — clear the gallery (don't keep stale localStorage data)
            setGallery(prev => prev.filter(item => item.loading || item.url?.startsWith('blob:') || item.url?.startsWith('data:')));
          }
        }
      } catch (err) {
        console.error("Failed to fetch assets for gallery:", err);
      }
    };
    fetchAssets();
    return () => {
      active = false;
    };
  }, [userId]);

  // Lightbox
  // Lightbox
  const [lightboxItem, setLightboxItem] = useState(null);
  const [showInpaint, setShowInpaint] = useState(false);
  const [showStoryboard, setShowStoryboard] = useState(false);
  const [upscalingItems, setUpscalingItems] = useState({});



  const handleInpaintDone = (newUrl) => {
    const newItem = {
      id: Date.now(),
      type: 'image',
      url: newUrl,
      prompt: lightboxItem ? `${lightboxItem.prompt} (Brush Edited)` : "Brush Edited Image",
      engine: lightboxItem ? `${lightboxItem.engine} + Edit` : "Inpainted",
      aspect: lightboxItem ? lightboxItem.aspect : "16:9",
      ts: Date.now(),
      projectId: activeProjectId
    };
    
    setGallery(prev => [newItem, ...prev]);
    setLightboxItem(newItem);
    
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("Brush Edit Applied! Saved to gallery.", "success");
  };

  const handleUpscale = async (item, e) => {
    if (e) e.stopPropagation();
    
    const showToast = useAppStore.getState().showToast;
    
    if (item.type !== 'image') {
      if (showToast) showToast("Only images can be upscaled.", "error");
      return;
    }

    setUpscalingItems(prev => ({ ...prev, [item.id]: true }));
    
    try {
      const spendResult = await spendShorts(userId, 2, 'image_upscale_4k');
      if (!spendResult.success) {
        if (spendResult.reason === 'unauthenticated') {
          useAppStore.getState().setShowingAuthModal(true);
        } else if (spendResult.reason === 'insufficient_funds' || userCredits < 2) {
          if (showToast) showToast("Insufficient Shorts! Redirecting to pricing...", "info");
          useAppStore.getState().setActiveTab('pricing');
        } else {
          throw new Error(spendResult.reason || 'Failed to authorize credit deduction.');
        }
        setUpscalingItems(prev => ({ ...prev, [item.id]: false }));
        return;
      }

      if (showToast) showToast("Initiating 2K refinement using Nano Banana...", "info");

      const prompt = `REFINE TO 2K: Upscale this image to high resolution. 
STRICT RULE: Maintain 100% pixel-perfect fidelity to the original subject, lighting, and composition. 
DO NOT add new objects or change the scene. Enhance only.
[Semantic Context: ${item.prompt || 'Cinematic portrait'}]`;

      const payload = {
        model: 'gemini-3.1-flash-image', // GA model name (preview name retired)
        prompt,
        aspect_ratio: item.aspect || '16:9',
        quality: '2k',
        imageSize: '2K',
        resolution: '2K',
        referenceImages: [item.url], // Pass URL directly — let backend download to escape browser CORS limitations!
        userId,
        creditReason: 'image_upscale_4k'
      };

      const resp = await fetch(getApiUrl('/api/generate-image'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Upscale request failed.');

      if (data.url) {
        const newItem = {
          id: Date.now(),
          type: 'image',
          url: data.url,
          prompt: `${item.prompt} (Upscaled)`,
          engine: `${item.engine} (2K)`,
          aspect: item.aspect || "16:9",
          ts: Date.now(),
          projectId: activeProjectId
        };

        // Add the new 2K upscaled image to the top of the gallery, preserving the original image
        setGallery(prev => [newItem, ...prev]);

        // Automatically focus the Lightbox Modal on the newly generated 2K upscaled image
        setLightboxItem(newItem);

        if (showToast) showToast("Image successfully upscaled to 2K!", "success");
      } else {
        throw new Error("Upscale API returned no URL.");
      }
    } catch (err) {
      console.error("[Upscale Error]:", err);
      if (showToast) showToast(`Upscale failed: ${err.message}`, "error");
    } finally {
      setUpscalingItems(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const handleGenerateAnglesGrid = async (item) => {
    const showToast = useAppStore.getState().showToast;
    setLightboxItem(null); // Close lightbox
    
    setStatus('generating');
    setPollMsg('Drafting 9-Angle Grid...');
    setErrorMsg('');

    try {
      const spendResult = await spendShorts(userId, 5, 'image_grid_multishot');
      if (!spendResult.success) {
        if (spendResult.reason === 'unauthenticated') {
          useAppStore.getState().setShowingAuthModal(true);
        } else if (spendResult.reason === 'insufficient_funds' || userCredits < 5) {
          if (showToast) showToast("Insufficient Shorts for 9-Angle Grid! Redirecting to pricing...", "info");
          useAppStore.getState().setActiveTab('pricing');
        } else {
          throw new Error(spendResult.reason || 'Failed to authorize credit deduction.');
        }
        setStatus('idle');
        return;
      }

      if (showToast) showToast("Drafting 3x3 multi-angle grid using Nano Banana...", "info");

      const anglesPrompt = `### 9-FRAME CINEMATIC GRID DIRECTIVE
Create a tight 3x3 contact sheet containing 9 high-end cinematic photographs. 
STRICT RULE: The grid must be a single composite image with no margins, borders, lines, overlays, watermark, text, or labels. Do not print any text, numbers, or labels (such as "PORTRAIT", "WIDE", "FRAME", etc.) on any of the images.

### SUBJECT & ENVIRONMENT CONSISTENCY:
- CHARACTER IDENTITY: The exact same character (same face, features, expression style, and clothing/wardrobe) must be featured in all frames where the character is visible.
- LOCATION & LIGHTING: All 9 frames must represent the exact same location and environmental scene setup, with consistent ambient color grading and lighting matching the provided reference image.

### THE 9 UNIQUE CAMERA SETUPS (VARIED PERSPECTIVES IN THE SAME SCENE):
- Frame 1: A close-up portrait focusing on the subject's face. Macro lens with soft background bokeh.
- Frame 2: A wide-angle shot showing the subject within the full scale of the environment.
- Frame 3: A macro details shot focusing on a texture or fabric of the outfit (no face visible).
- Frame 4: A low-angle dramatic shot looking slightly up at the subject.
- Frame 5: An overhead high-angle drone-style shot looking down at the subject.
- Frame 6: A medium shot from the waist up with natural lighting.
- Frame 7: A dramatic rim-lit near-silhouette shot highlighting the subject's edge profile.
- Frame 8: A first-person POV shot where the subject's hands or perspective is visible.
- Frame 9: A full-body shot showing the subject from head to toe.

### STYLING & NEGATIVE INSTRUCTIONS:
STRICTLY NO labels, text, banners, subtitles, grids, borders, lines, or watermark overlays on the generated image. All 9 panels must merge seamlessly into a single clean borderless grid composite.`;

      const resp = await fetch(getApiUrl('/api/generate-image'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.1-flash-image',
          prompt: anglesPrompt,
          negativePrompt: "text, watermark, logo, labels, words, overlays, numbers, subtitles, letters, borders, frames, gridlines, grid lines, dividers, lines, caption, name tags, stamps, text banners, signatures",
          aspectRatio: item.aspect || '16:9',
          size: item.aspect === '9:16' ? '1024x1792' : item.aspect === '1:1' ? '1024x1024' : '1792x1024',
          userId,
          referenceImages: [item.url],
          creditReason: 'image_grid_multishot',
          isGrid: true
        })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Angles grid generation failed.');

      if (data.url) {
        const newItem = {
          id: Date.now(),
          type: 'image',
          url: data.url,
          prompt: `Multi-Angle 3x3 Grid: ${item.prompt ? item.prompt.split('.')[0] : 'Subject'}`,
          engine: `${item.engine} (Grid)`,
          aspect: item.aspect || "16:9",
          ts: Date.now(),
          isGrid: true,
          projectId: activeProjectId
        };

        setGallery(prev => [newItem, ...prev]);
        setLightboxItem(newItem); // Open lightbox on the new grid
        if (showToast) showToast("3x3 multi-angle grid generated successfully!", "success");
      } else {
        throw new Error("Grid API returned no URL.");
      }
    } catch (err) {
      console.error("[Angles Grid Error]:", err);
      if (showToast) showToast(`Angles generation failed: ${err.message}`, "error");
    } finally {
      setStatus('idle');
      setPollMsg('');
      refreshShorts();
    }
  };

  const handleDownload = async (url, type, id) => {
    try {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast("Downloading asset directly to PC...", "info");
      
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `cinema_${id || Date.now()}.${type === 'image' ? 'png' : 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      
      if (showToast) showToast("Download complete!", "success");
    } catch (err) {
      console.error("Direct download failed, falling back to window open:", err);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = `cinema_${id || Date.now()}.${type === 'image' ? 'png' : 'mp4'}`;
      a.click();
    }
  };

  const handleDeleteItem = (itemId, e) => {
    if (e) e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this generation?")) {
      setGallery(prev => prev.filter(item => item.id !== itemId));
      if (lightboxItem && lightboxItem.id === itemId) {
        setLightboxItem(null);
      }
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast("Item deleted from gallery.", "info");
    }
  };

  // ── REFERENCE BOARD STATE & PERSISTENCE ────────────────────────────────────
  const defaultRefBoard = { characters: [], locations: [], wardrobes: [], props: [], moods: [], ref_images: [], ref_videos: [], ref_audios: [] };
  const loadRefBoard = (m) => {
    try {
      const saved = localStorage.getItem(`refBoard_${m}`)
      return saved ? { ...defaultRefBoard, ...JSON.parse(saved) } : { ...defaultRefBoard }
    } catch (e) {
      console.error(`Failed to load refBoard for ${m}:`, e)
      return { ...defaultRefBoard }
    }
  }

  const [videoRefBoard, setVideoRefBoard] = useState(() => loadRefBoard('video'))
  const [stagedRefBoard, setStagedRefBoard] = useState({ ...defaultRefBoard })

  // Active board based on mode
  const refBoard = videoRefBoard
  const setRefBoard = setVideoRefBoard

  const [showRefBoard, setShowRefBoard] = useState(false)

  // Auto-close template/reference board when Studio side panel opens, and vice-versa
  useEffect(() => {
    if (showSidePanel) {
      setShowRefBoard(false);
    }
  }, [showSidePanel]);

  useEffect(() => {
    if (showRefBoard) {
      setShowSidePanel(false);
    }
  }, [showRefBoard]);
  const [showLibPicker, setShowLibPicker] = useState(false)
  const [libPickerTarget, setLibPickerTarget] = useState(null)
  const refUploadInputRef = useRef(null)
  const [activeRefUploadCategory, setActiveRefUploadCategory] = useState(null)
  const [pendingRefUpload, setPendingRefUpload] = useState(null);
  const [isUploadingRef, setIsUploadingRef] = useState(false)

  // Autocomplete mentions query states
  const [mentionSearch, setMentionSearch] = useState(null)
  const [mentionField, setMentionField] = useState('promptText')
  const [mentionCursorPos, setMentionCursorPos] = useState(0)

  // Sync stagedRefBoard to videoRefBoard when it loads
  useEffect(() => {
    setStagedRefBoard(videoRefBoard);
  }, [videoRefBoard]);

  // Flat list of all refBoard items for @mention autocomplete (memoized to avoid re-running Map loops on every keystroke)
  const allRefItems = useMemo(() => {
    const IdMap = window.Map;
    const mergedBoard = {
      characters: [...new IdMap([...(refBoard.characters || []), ...(stagedRefBoard.characters || [])].map(i => [i.id, i])).values()],
      locations:  [...new IdMap([...(refBoard.locations || []),  ...(stagedRefBoard.locations || []) ].map(i => [i.id, i])).values()],
      wardrobes:  [...new IdMap([...(refBoard.wardrobes || []),  ...(stagedRefBoard.wardrobes || []) ].map(i => [i.id, i])).values()],
      props:      [...new IdMap([...(refBoard.props || []),      ...(stagedRefBoard.props || [])     ].map(i => [i.id, i])).values()],
      moods:      [...new IdMap([...(refBoard.moods || []),      ...(stagedRefBoard.moods || [])     ].map(i => [i.id, i])).values()],
      ref_images: [...new IdMap([...(refBoard.ref_images || []), ...(stagedRefBoard.ref_images || [])].map(i => [i.id, i])).values()],
      ref_videos: [...new IdMap([...(refBoard.ref_videos || []), ...(stagedRefBoard.ref_videos || [])].map(i => [i.id, i])).values()],
      ref_audios: [...new IdMap([...(refBoard.ref_audios || []), ...(stagedRefBoard.ref_audios || [])].map(i => [i.id, i])).values()],
    };
    return [
      ...mergedBoard.characters.map(i => ({ ...i, category: 'character', prefix: 'char' })),
      ...mergedBoard.locations.map(i => ({ ...i, category: 'location', prefix: 'loc' })),
      ...mergedBoard.wardrobes.map(i => ({ ...i, category: 'wardrobe', prefix: 'ward' })),
      ...mergedBoard.props.map(i => ({ ...i, category: 'prop', prefix: 'prop' })),
      ...mergedBoard.moods.map(i => ({ ...i, category: 'mood', prefix: 'mood' })),
      ...(mergedBoard.ref_images || []).map((i, idx) => ({ ...i, name: i.name || `img${idx + 1}`, category: 'ref_images', prefix: 'img' })),
      ...(mergedBoard.ref_videos || []).map((i, idx) => ({ ...i, name: i.name || `vid${idx + 1}`, category: 'ref_videos', prefix: 'vid' })),
      ...(mergedBoard.ref_audios || []).map((i, idx) => ({ ...i, name: i.name || `aud${idx + 1}`, category: 'ref_audios', prefix: 'aud' })),
    ];
  }, [refBoard, stagedRefBoard]);

  // Seedance-specific reference media (separate from @mention system)
  const seedanceRefs = useMemo(() => {
    const images = (refBoard.ref_images || []).concat(stagedRefBoard.ref_images || []);
    const videos = (refBoard.ref_videos || []).concat(stagedRefBoard.ref_videos || []);
    const audios = (refBoard.ref_audios || []).concat(stagedRefBoard.ref_audios || []);
    return {
      ref_images: images,
      ref_videos: videos,
      ref_audios: audios,
    };
  }, [refBoard, stagedRefBoard]);

  const addRefItem = (item) => {
    const categoryKey = item.category.endsWith('s') ? item.category : item.category + 's'
    const singleAllowed = ['locations', 'wardrobes', 'moods']
    const updater = (prev) => {
      const currentList = prev[categoryKey] || []
      if (singleAllowed.includes(categoryKey)) {
        return { ...prev, [categoryKey]: [item] }
      }
      return { ...prev, [categoryKey]: [...currentList, item] }
    }
    setStagedRefBoard(updater)
    setRefBoard(prev => {
      const updated = updater(prev)
      localStorage.setItem(`refBoard_video`, JSON.stringify(updated))
      return updated
    })
  }

  const removeRefItem = (id) => {
    setStagedRefBoard(prev => {
      const updated = {}
      for (const [key, arr] of Object.entries(prev)) { updated[key] = arr.filter(i => i.id !== id) }
      return updated
    })
  }

  const handleSaveRefBoard = () => {
    setRefBoard(stagedRefBoard)
    localStorage.setItem(`refBoard_video`, JSON.stringify(stagedRefBoard))
    setShowRefBoard(false)
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast("Reference Board Saved", "success");
  }

  const handleCancelRefBoard = () => {
    setShowRefBoard(false)
  }

  const getTaggedRefItems = (text) => {
    const mentions = ((text || '').match(/@(\w+)/g) || []).map(m => m.slice(1).toLowerCase())
    return allRefItems.filter(item => mentions.some(m => item.name?.toLowerCase().replace(/\s+/g, '') === m || item.name?.toLowerCase().includes(m)))
  }

  const handleRemoveTag = (item) => {
    const mentionName = item.name.replace(/\s+/g, '')
    const regex = new RegExp(`@${mentionName}\\s*`, 'gi')
    setPromptText(prev => prev.replace(regex, ''))
  }

  const handleTextChange = useCallback((e) => {
    const val = e.target.value
    setPromptText(val)
    if (activeEngine === 'kling/v3-turbo-image-to-video') {
      setMentionSearch(null)
      return
    }
    const cursor = e.target.selectionStart || 0
    const match = val.slice(0, cursor).match(/@(\w*)$/)
    if (match) {
      setMentionSearch(match[1].toLowerCase())
      setMentionCursorPos(cursor)
      setMentionField('promptText')
    } else {
      setMentionSearch(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEngine])

  const selectMention = (item) => {
    const text = promptText || ''
    const before = text.slice(0, mentionCursorPos).replace(/@\w*$/, '')
    const after = text.slice(mentionCursorPos)
    const mentionName = item.name.replace(/\s+/g, '')
    const newText = `${before}@${mentionName} ${after}`
    setPromptText(newText)
    setMentionSearch(null)
    if (textareaRef.current) textareaRef.current.focus()
  }

  const compressImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to jpeg data URL (resizing and compressing)
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => {
          // Fallback to original reader result on error
          resolve(event.target.result);
        };
      };
      reader.onerror = () => {
        resolve('');
      };
    });
  };

  const handleRefUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeRefUploadCategory) return;
    setPendingRefUpload({
      file,
      type: 'board',
      defaultCategory: activeRefUploadCategory,
      previewUrl: URL.createObjectURL(file)
    });
    e.target.value = '';
  };

  const processPendingRefUpload = async (name, category) => {
    if (!pendingRefUpload) return;
    const { file, type } = pendingRefUpload;
    setPendingRefUpload(null);

    setIsUploadingRef(true);
    
    try {
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const isImage = file.type.startsWith('image/');
      const assetType = isVideo ? 'video' : isAudio ? 'audio' : 'image';
      const ext = isVideo ? 'mp4' : isAudio ? 'mp3' : 'png';
      
      let base64;
      if (isImage) {
        base64 = await compressImage(file);
      } else {
        base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      }

      const resp = await fetch(getApiUrl('/api/save-asset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageData: base64, 
          type: assetType,
          fileName: `ref_${Date.now()}.${ext}`,
          userId: userId
        })
      });
      if (!resp.ok) {
        let errData = {};
        try { errData = await resp.json(); } catch(e) { /* ignore JSON parsing error */ }
        throw new Error(errData.message || errData.error || `HTTP ${resp.status} - ${resp.statusText}`);
      }
      const data = await resp.json();
      const url = data.url || data.path || base64;
      
      const finalName = (name.trim() || `Ref_${Date.now().toString().slice(-4)}`).replace(/\s+/g, '');
      
      const newItem = {
        id: crypto.randomUUID(),
        name: finalName,
        category: category,
        imageUrl: url
      };
      
      if (type === 'board') {
        addRefItem(newItem);
      } else {
        const singleAllowed = ['locations', 'wardrobes', 'moods'];
        const updater = (prev) => {
          const currentList = prev[category] || [];
          if (singleAllowed.includes(category)) {
            return { ...prev, [category]: [newItem] };
          }
          return { ...prev, [category]: [...currentList, newItem] };
        };
        setStagedRefBoard(updater);
        setRefBoard(prev => {
          const updated = updater(prev);
          localStorage.setItem(`refBoard_video`, JSON.stringify(updated));
          return updated;
        });
        const showToast = useAppStore.getState().showToast;
        if (showToast) showToast(`Added @${finalName} to Library!`, "success");
      }
    } catch (err) {
      console.error("Ref upload failed:", err);
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast("Upload failed: " + err.message, "error");
    } finally {
      setIsUploadingRef(false);
    }
  };

  // ── SEEDANCE REFERENCE UPLOAD & REMOVE ────────────────────────────
  const handleSeedanceRefUpload = async (fileOrUrl, categoryId, isUrl = false) => {
    if (!fileOrUrl) return;

    // If a URL was passed directly (e.g. from Library picker), skip upload
    if (isUrl) {
      const name = `IMG_${Date.now().toString().slice(-4)}`;
      const newItem = { id: crypto.randomUUID(), name, url: fileOrUrl, imageUrl: fileOrUrl };

      const updater = (prev) => {
        const currentList = prev[categoryId] || [];
        return { ...prev, [categoryId]: [...currentList, newItem] };
      };

      setStagedRefBoard(updater);
      setRefBoard(prev => {
        const updated = updater(prev);
        localStorage.setItem('refBoard_video', JSON.stringify(updated));
        return updated;
      });

      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast('Reference image added from library', 'success');
      return;
    }

    const file = fileOrUrl;
    setIsUploadingRef(true);
    try {
      const isVideoFile = file.type.startsWith('video/');
      const isAudioFile = file.type.startsWith('audio/');
      const isImageFile = file.type.startsWith('image/');
      const assetType = isVideoFile ? 'video' : isAudioFile ? 'audio' : 'image';
      const ext = isVideoFile ? 'mp4' : isAudioFile ? 'mp3' : 'png';

      if (isVideoFile) {
        const videoDims = await new Promise((resolve) => {
          const v = document.createElement('video');
          v.preload = 'metadata';
          v.onloadedmetadata = () => {
            window.URL.revokeObjectURL(v.src);
            resolve({ width: v.videoWidth, height: v.videoHeight });
          };
          v.onerror = () => resolve(null);
          v.src = URL.createObjectURL(file);
        });
        if (videoDims && (videoDims.width * videoDims.height < 409600)) {
          const totalPx = videoDims.width * videoDims.height;
          throw new Error(`Video resolution is too low (${videoDims.width}x${videoDims.height} = ${totalPx.toLocaleString()} pixels). Seedance 2.0 requires reference videos to be at least 409,600 total pixels (e.g. 640x640 or 854x480).`);
        }
      }

      let base64;
      if (isImageFile) {
        base64 = await compressImage(file);
      } else {
        base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      }

      const resp = await fetch(getApiUrl('/api/save-asset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: base64,
          type: assetType,
          fileName: `seedref_${Date.now()}.${ext}`,
          userId: userId
        })
      });

      if (!resp.ok) {
        let errData = {};
        try { errData = await resp.json(); } catch (_) { /* noop */ }
        throw new Error(errData.message || errData.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const url = data.url || data.path || base64;
      const label = isVideoFile ? 'VID' : isAudioFile ? 'AUD' : 'IMG';
      const name = `${label}_${Date.now().toString().slice(-4)}`;

      const newItem = { id: crypto.randomUUID(), name, url, imageUrl: url };

      const updater = (prev) => {
        const currentList = prev[categoryId] || [];
        return { ...prev, [categoryId]: [...currentList, newItem] };
      };

      setStagedRefBoard(updater);
      setRefBoard(prev => {
        const updated = updater(prev);
        localStorage.setItem('refBoard_video', JSON.stringify(updated));
        return updated;
      });

      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast(`Seedance reference added (${label})`, 'success');
    } catch (err) {
      console.error('[Seedance Ref Upload] Failed:', err);
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast('Upload failed: ' + err.message, 'error');
    } finally {
      setIsUploadingRef(false);
    }
  };

  const handleRemoveSeedanceRef = (itemId, categoryId) => {
    const updater = (prev) => ({
      ...prev,
      [categoryId]: (prev[categoryId] || []).filter(i => i.id !== itemId)
    });
    setStagedRefBoard(updater);
    setRefBoard(prev => {
      const updated = updater(prev);
      localStorage.setItem('refBoard_video', JSON.stringify(updated));
      return updated;
    });
  };

  // Debounced gallery persistence — avoids blocking the main thread on every gallery update
  useEffect(() => {
    if (!galleryLSKey) return;
    const timer = setTimeout(() => {
      try {
        // Only persist non-loading, non-blob items to keep localStorage lean
        const persistable = gallery.filter(item => !item.loading && item.url && !item.url.startsWith('blob:'));
        localStorage.setItem(galleryLSKey, JSON.stringify(persistable));
      } catch (_) { /* ignore localStorage quota issues */ }
    }, 800);
    return () => clearTimeout(timer);
  }, [gallery, galleryLSKey]);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const getRequiredCredits = (engineId) => {
    if (activeTab === 'image') {
      return IMAGE_ENGINES.find(e => e.id === engineId)?.cost || 1;
    }
    if (engineId.startsWith('veo-3.1') || engineId === 'veo3') {
      let costPerSec = 5;
      const modelId = engineId === 'veo3' ? 'veo-3.1-generate-preview' : engineId;
      if (modelId === 'veo-3.1-generate-preview') {
        if (resolution === '4k') {
          costPerSec = generateAudio ? 40 : 27; // halved from 80 : 54
        } else {
          costPerSec = generateAudio ? 27 : 15; // halved from 54 : 30
        }
      } else if (modelId === 'veo-3.1-fast-generate-preview') {
        if (resolution === '4k') {
          costPerSec = generateAudio ? 19 : 15; // halved from 38 : 31
        } else if (resolution === '1080p') {
          costPerSec = generateAudio ? 8 : 6; // halved from 15 : 12
        } else { // 720p
          costPerSec = generateAudio ? 6 : 5; // halved from 12 : 10
        }
      } else if (modelId === 'veo-3.1-lite-generate-preview') {
        if (resolution === '4k' || resolution === '1080p') {
          costPerSec = generateAudio ? 5 : 3; // halved from 10 : 6
        } else { // 720p
          costPerSec = generateAudio ? 3 : 2; // halved from 6 : 4
        }
      }
      return costPerSec * duration;
    }
    if (engineId === 'seedance-fast') {
      return (resolution === '480p' ? 7 : 12) * duration; // halved from 15 : 25
    }
    if (engineId === 'seedace') {
      const costPerSec = resolution === '1080p' ? 35 : 15;
      return costPerSec * duration;
    }
    if (engineId === 'seedance-mini') {
      return (resolution === '480p' ? 5 : 7) * duration; // halved from 10 : 15
    }
    if (engineId === 'omni-flash') {
      let costPerSec = 6;
      if (resolution === '4k') {
        costPerSec = generateAudio ? 19 : 15; // halved from 38 : 31
      } else if (resolution === '1080p') {
        costPerSec = generateAudio ? 8 : 6; // halved from 15 : 12
      } else { // 720p
        costPerSec = generateAudio ? 6 : 5; // halved from 12 : 10
      }
      return Math.ceil(costPerSec * 1.1 * duration);
    }
    if (engineId === 'kling/v3-turbo-image-to-video') {
      const costPerSec = (resolution === '1080p') ? (0.1125 * 1.30 * 84) : (0.09 * 1.30 * 84); // 12.285 or 9.828 credits/sec
      return Math.round(costPerSec * duration);
    }
    return (ENGINES.find(e => e.id === engineId)?.cost || 2) * duration;
  };

  const isBusy = isSubmitting;
  const requiredCredits = getRequiredCredits(activeEngine) * variationCount;

  const handleTextChange = useCallback((e) => {
    const val = e.target?.value ?? '';
    const isOmniEngine = panelTab === 'omni' || activeEngine === 'omni' || activeEngine === 'omni-flash';
    if (isOmniEngine) {
      setOmniPromptText(val);
    } else {
      setPromptText(val);
    }
  }, [panelTab, activeEngine]);

  // Evaluate active prompt and inputs across all video engines (Seedance 2.0, Seedance Fast, Veo 3.1, Omni)
  const activePromptText = (promptText || omniPromptText || '').trim();
  const activeFirstFramePreview = omniFirstFramePreview || firstFramePreview || (omniRefPreviews && omniRefPreviews.find(Boolean));

  // Memoize so getTaggedRefItems regex only runs when activePromptText actually changes
  const taggedItems = useMemo(() => getTaggedRefItems(activePromptText), [activePromptText, allRefItems]); // eslint-disable-line react-hooks/exhaustive-deps
  const taggedItemsCount = taggedItems.length;
  const hasRefBoardMedia = Boolean(
    seedanceRefs?.ref_images?.length > 0 || 
    seedanceRefs?.ref_videos?.length > 0 || 
    seedanceRefs?.ref_audios?.length > 0 ||
    omniRefVideoPreview ||
    (omniRefPreviews && omniRefPreviews.some(Boolean))
  );

  const hasInput = Boolean(activePromptText || activeFirstFramePreview || taggedItemsCount > 0 || hasRefBoardMedia);
  const canGenerate = hasInput && userCredits >= requiredCredits && !isBusy;

  const triggerRefund = async (reason) => {
    try {
      await refundShorts(userId, requiredCredits, reason);
      refreshShorts();
    } catch (refundErr) {
      console.error("Refund failed:", refundErr);
    }
  };

  // Note: textarea auto-resize is handled inside FastPromptInput — no duplicate effect needed here

  /* ─── UPLOAD ─────────────────────────────────────────────── */
  const handleClearRef = (target) => {
    if (typeof target === 'number') {
      setOmniRefImages(prev => { const n = [...prev]; n[target] = ''; return n; });
      setOmniRefPreviews(prev => { const n = [...prev]; n[target] = ''; return n; });
      if (target === 0) { setOmniFirstFrameImage(''); setOmniFirstFramePreview(''); }
      if (target === 1) { setOmniLastFrameImage(''); setOmniLastFramePreview(''); }
      return;
    }
    if (panelTab === 'omni' || isOmni) {
      if (target === 'first') {
        setOmniFirstFrameImage('');
        setOmniFirstFramePreview('');
        setOmniRefImages(prev => { const n = [...prev]; n[0] = ''; return n; });
        setOmniRefPreviews(prev => { const n = [...prev]; n[0] = ''; return n; });
      } else if (target === 'last') {
        setOmniLastFrameImage('');
        setOmniLastFramePreview('');
        setOmniRefImages(prev => { const n = [...prev]; n[1] = ''; return n; });
        setOmniRefPreviews(prev => { const n = [...prev]; n[1] = ''; return n; });
      } else if (target === 'third') {
        setOmniRefImages(prev => { const n = [...prev]; n[2] = ''; return n; });
        setOmniRefPreviews(prev => { const n = [...prev]; n[2] = ''; return n; });
      }
    } else {
      if (target === 'first') {
        setFirstFrameImage('');
        setFirstFramePreview('');
      } else if (target === 'last') {
        setLastFrameImage('');
        setLastFramePreview('');
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const curTarget = uploadTargetRef.current || uploadTarget;

    if (curTarget === 'ref_images') {
      // Direct pass to reference board upload for Slot 3 image
      await handleSeedanceRefUpload(file, 'ref_images');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setErrorMsg('');

    try {
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const isImage = file.type.startsWith('image/');
      const assetType = isVideo ? 'video' : isAudio ? 'audio' : 'image';
      const ext = isVideo ? 'mp4' : isAudio ? 'mp3' : 'png';

      // Create instant lightweight Object URL (0ms latency preview!)
      const instantPreview = URL.createObjectURL(file);

      if (panelTab === 'omni' || (typeof curTarget === 'string' && curTarget.startsWith('omni_ref_'))) {
        if (typeof curTarget === 'string' && curTarget.startsWith('omni_ref_')) {
          const idx = parseInt(curTarget.split('_')[2], 10);
          if (!isNaN(idx) && idx >= 0 && idx < 5) {
            setOmniRefPreviews(prev => { const n = [...prev]; n[idx] = instantPreview; return n; });
            if (idx === 0) setOmniFirstFramePreview(instantPreview);
            if (idx === 1) setOmniLastFramePreview(instantPreview);
          }
        } else if (curTarget === 'first') {
          setOmniFirstFramePreview(instantPreview);
          setOmniRefPreviews(prev => { const n = [...prev]; n[0] = instantPreview; return n; });
        } else {
          setOmniLastFramePreview(instantPreview);
          setOmniRefPreviews(prev => { const n = [...prev]; n[1] = instantPreview; return n; });
        }
      } else {
        if (curTarget === 'first' || activeTab === 'image') {
          setFirstFramePreview(instantPreview);
        } else {
          setLastFramePreview(instantPreview);
        }
      }

      // Async compress/read for storage persistence without blocking instant UI preview
      let uploadPayload;
      if (isImage) {
        uploadPayload = await compressImage(file);
      } else {
        uploadPayload = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.readAsDataURL(file);
        });
      }

      const resp = await fetch(getApiUrl('/api/save-asset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageData: uploadPayload, 
          type: 'reference_upload',
          fileName: `ref_frame_${Date.now()}.${ext}`,
          userId: userId,
          folder: 'reference'
        })
      });
      
      if (!resp.ok) throw new Error('Failed to save asset via API');
      
      const data = await resp.json();
      const publicUrl = data.url || data.path || uploadPayload;

      if (panelTab === 'omni' || (typeof curTarget === 'string' && curTarget.startsWith('omni_ref_'))) {
        if (typeof curTarget === 'string' && curTarget.startsWith('omni_ref_')) {
          const idx = parseInt(curTarget.split('_')[2], 10);
          if (!isNaN(idx) && idx >= 0 && idx < 5) {
            setOmniRefImages(prev => { const n = [...prev]; n[idx] = publicUrl; return n; });
            if (idx === 0) setOmniFirstFrameImage(publicUrl);
            if (idx === 1) setOmniLastFrameImage(publicUrl);
          }
        } else if (curTarget === 'first') {
          setOmniFirstFrameImage(publicUrl);
          setOmniRefImages(prev => { const n = [...prev]; n[0] = publicUrl; return n; });
        } else {
          setOmniLastFrameImage(publicUrl);
          setOmniRefImages(prev => { const n = [...prev]; n[1] = publicUrl; return n; });
        }
      } else {
        if (curTarget === 'first' || activeTab === 'image') {
          setFirstFrameImage(publicUrl);
        } else {
          setLastFrameImage(publicUrl);
        }
      }
    } catch (err) {
      console.error('[Cinema Upload]:', err);
      setErrorMsg(`Upload failed: ${err.message}`);
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast(`Upload failed: ${err.message}`, "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  /* ─── SEEDANCE POLL ──────────────────────────────────────── */
  const pollSeedanceTask = async (taskId, activePrompt, activeRatio, engine, tempId = null) => {
    setStatus('polling');
    const engineLabel = engine.includes('fast') ? 'Seedance Fast' : engine.includes('mini') ? 'Seedance Mini' : 'Seedance 2.0';

    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 6000));
      const elapsed = (i + 1) * 6;
      setPollMsg(`Rendering video... (${elapsed}s)`);

      try {
        const res = await fetch(getApiUrl(`/api/seedance/status/${taskId}?userId=${userId}&aspectRatio=${activeRatio}&engine=${engine}&projectId=${activeProjectId}`));
        const json = await res.json();
        const st = json.status;

        if (st === 'completed') {
          const url = json.url || json.videoUrl || json.video_url || json.resultUrl || json.data?.url;
          if (url) {
            const finishedItem = {
              id: Date.now(),
              type: 'video',
              url: url,
              prompt: activePrompt,
              engine: engineLabel,
              aspect: activeRatio,
              ts: Date.now(),
              projectId: activeProjectId
            };

            setGallery(prev => {
              if (tempId && prev.some(item => item.id === tempId)) {
                return prev.map(item => item.id === tempId ? finishedItem : item);
              }
              return [finishedItem, ...prev];
            });

            setStatus('idle');
            setPollMsg('');
            refreshShorts();
            return;
          } else {
            if (tempId) {
              setGallery(prev => prev.filter(item => item.id !== tempId));
            }
            setStatus('error');
            setErrorMsg(`${engineLabel} compilation completed but video URL was empty.`);
            setPollMsg('');
            return;
          }
        }

        if (st === 'failed' || st === 'error') {
          if (tempId) {
            setGallery(prev => prev.filter(item => item.id !== tempId));
          }
          setStatus('error');
          const cleanErr = cleanErrorMessage(json.error || json.message || `${engineLabel} generation failed.`);
          setErrorMsg(cleanErr);
          setPollMsg('');
          const showToast = useAppStore.getState().showToast;
          if (showToast) showToast(cleanErr, "error");
          await triggerRefund('cinematic_video_generation');
          return;
        }
      } catch (pollErr) {
        console.warn('[Seedance Poll Error]:', pollErr.message);
        continue;
      }
    }
    if (tempId) {
      setGallery(prev => prev.filter(item => item.id !== tempId));
    }
    setStatus('error');
    const timeoutMsg = `${engineLabel} compilation timed out.`;
    setErrorMsg(timeoutMsg);
    setPollMsg('');
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast(timeoutMsg, "error");
    await triggerRefund('cinematic_video_generation');
  };

  const pollKlingTask = async (taskId, activePrompt, activeRatio, engine, tempId = null) => {
    setStatus('polling');
    const engineLabel = 'Kling V3 Turbo';

    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 6000));
      const elapsed = (i + 1) * 6;
      setPollMsg(`Rendering video... (${elapsed}s)`);

      try {
        const res = await fetch(getApiUrl(`/api/kling/status/${taskId}?userId=${userId}&aspectRatio=${activeRatio}`));
        const json = await res.json();
        const st = json.status;

        if (st === 'completed') {
          const url = json.url || json.videoUrl;
          if (url) {
            const finishedItem = {
              id: Date.now(),
              type: 'video',
              url: url,
              prompt: activePrompt,
              engine: engineLabel,
              aspect: activeRatio,
              ts: Date.now(),
              projectId: activeProjectId
            };

            setGallery(prev => {
              if (tempId && prev.some(item => item.id === tempId)) {
                return prev.map(item => item.id === tempId ? finishedItem : item);
              }
              return [finishedItem, ...prev];
            });

            setStatus('idle');
            setPollMsg('');
            refreshShorts();
            return;
          } else {
            if (tempId) {
              setGallery(prev => prev.filter(item => item.id !== tempId));
            }
            setStatus('error');
            setErrorMsg(`${engineLabel} compilation completed but video URL was empty.`);
            setPollMsg('');
            return;
          }
        }

        if (st === 'failed' || st === 'error') {
          if (tempId) {
            setGallery(prev => prev.filter(item => item.id !== tempId));
          }
          setStatus('error');
          const cleanErr = cleanErrorMessage(json.error || json.message || `${engineLabel} generation failed.`);
          setErrorMsg(cleanErr);
          setPollMsg('');
          const showToast = useAppStore.getState().showToast;
          if (showToast) showToast(cleanErr, "error");
          await triggerRefund('cinematic_video_generation');
          return;
        }
      } catch (pollErr) {
        console.warn('[Kling Poll Error]:', pollErr.message);
        continue;
      }
    }
    if (tempId) {
      setGallery(prev => prev.filter(item => item.id !== tempId));
    }
    setStatus('error');
    const timeoutMsg = `${engineLabel} compilation timed out.`;
    setErrorMsg(timeoutMsg);
    setPollMsg('');
    const showToast = useAppStore.getState().showToast;
    if (showToast) showToast(timeoutMsg, "error");
    await triggerRefund('cinematic_video_generation');
  };

  const getCompiledPrompt = () => {
    const isOmniEngine = activeEngine === 'omni' || activeEngine === 'omni-flash';
    let basePrompt = isOmniEngine ? omniPromptText.trim() : promptText.trim();
    const firstPreview = isOmniEngine ? omniFirstFramePreview : firstFramePreview;
    
    if (!useCameraSettings) {
      return basePrompt;
    }

    if (!basePrompt && firstPreview) {
      const selectedAngle = CAMERA_ANGLES.find(a => a.id === angle);
      const angleLabel = selectedAngle ? selectedAngle.label : 'selected';
      basePrompt = `Change the reference image to ${angleLabel} camera angle, only angle need to change, rest all the same.`;
    }
    if (!basePrompt) return '';

    // Identify all active reference tags using getTaggedRefItems
    const taggedItems = getTaggedRefItems(basePrompt);
    let compiledPrompt = basePrompt;
    
    // Append Selected Camera Movement naturally to the main video generation prompt (only for video)
    if (activeTab === 'video' && cameraMovement && cameraMovement !== 'none') {
      const selectedMove = CAMERA_MOVEMENTS.find(m => m.value === cameraMovement);
      if (selectedMove) {
        compiledPrompt = `${compiledPrompt}. Camera Movement: ${selectedMove.label} (${selectedMove.desc}).`;
      }
    }

    // Append selected Perspective/Angle
    const selectedAngle = CAMERA_ANGLES.find(a => a.id === angle);
    if (selectedAngle) {
      if (activeTab === 'image') {
        compiledPrompt = `${compiledPrompt}. Perspective: ${selectedAngle.label} framing.`;
      } else {
        const spatialDirective = ANGLE_NARRATIVES[angle] || '';
        compiledPrompt = `${compiledPrompt}. Perspective: ${selectedAngle.label} framing${spatialDirective ? ', ' + spatialDirective : ''}.`;
      }
    }

    // Append Camera System & Lens Glass Model / Custom Consumer Prompts
    const selectedCam = CAMERA_MODELS.find(c => c.id === camera);
    const selectedGlass = LENS_MODELS.find(l => l.id === lensModel) || LENS_MODELS[0];
    if (selectedCam) {
      if (isConsumerCam) {
        let consumerPrompt = '';
        if (camera === 'iphone') {
          if (activeTab === 'image' && imageStyle === 'photorealistic') {
            consumerPrompt = 'raw shot on iPhone, 100% natural mobile camera photography, everyday natural lighting, ultra-realistic details with natural skin texture, visible open pores and fine skin details, raw ultra realistic, normal camera photography style, no cinematic lighting, no cinematic effects';
          } else {
            consumerPrompt = 'raw shot on iPhone, raw candid mobile photography, captured on iPhone 15 Pro, ultra-realistic details, everyday natural lighting, mobile camera look, raw ultra realistic';
          }
        } else if (camera === 'gopro') {
          consumerPrompt = 'GoPro footage, raw wide-angle GoPro action camera footage, high distortion fisheye view, action-cam POV aesthetic, raw ultra realistic';
        } else if (camera === 'vhs') {
          consumerPrompt = 'vintage VHS camcorder footage, raw lo-fi magnetic tape VHS home video, retro camcorder aesthetic, nostalgic scanlines, chromatic aberration, raw ultra realistic retro footage';
        } else if (camera === 'disposable') {
          consumerPrompt = 'raw shot on disposable camera, vintage flash snapshot look, plastic lens distortion, chromatic aberration, high noise, raw ultra realistic snapshot';
        }
        compiledPrompt = `${compiledPrompt}. Captured on ${selectedCam.label}. Aesthetic: ${consumerPrompt}.`;
      } else {
        const glassDesc = selectedGlass ? `, equipped with ${selectedGlass.label} glass optics (${selectedGlass.aesthetic})` : '';
        if (activeTab === 'image') {
          compiledPrompt = `${compiledPrompt}. Captured on ${selectedCam.label}${glassDesc} using a ${lens} focal length for maximum photographic fidelity.`;
        } else {
          let lensDesc = `using a ${lens} focal length`;
          compiledPrompt = `${compiledPrompt}. Captured on ${selectedCam.label}${glassDesc} ${lensDesc} for maximum photographic fidelity.`;
        }
      }
    }

    // Append starting and ending frame guidance instructions naturally (for video)
    if (activeTab === 'video') {
      const primaryImg = isOmniEngine ? omniFirstFrameImage : firstFrameImage;
      const secondaryImg = isOmniEngine ? omniLastFrameImage : lastFrameImage;
      if (primaryImg && secondaryImg) {
        compiledPrompt = `${compiledPrompt}. Animation Flow: Interpolate seamlessly, starting exactly from the visual composition of the first frame image and morphing naturally to terminate precisely on the last frame image composition.`;
      } else if (primaryImg) {
        compiledPrompt = `${compiledPrompt}. Animation Flow: Begin the shot starting from the visual layout and details of the first frame image, animating it forward dynamically with realistic movement.`;
      } else if (secondaryImg) {
        compiledPrompt = `${compiledPrompt}. Animation Flow: Animate the camera and scene naturally to terminate exactly on the composition and framing of the last frame image.`;
      }
    }

    // Append Style Preset (for image)
    if (activeTab === 'image') {
      const stylePreset = STYLE_OPTIONS.find(s => s.value === imageStyle);
      if (stylePreset) {
        if (imageStyle === 'photorealistic' && camera === 'iphone') {
          compiledPrompt = `${compiledPrompt}. Style: Photorealistic (Hyper-detailed normal camera mobile shot, 100% natural, everyday lighting, no cinematic effects, ultra-realistic skin texture with open pores, 8k).`;
        } else {
          compiledPrompt = `${compiledPrompt}. Style: ${stylePreset.label} (${stylePreset.desc}).`;
        }
      }
    }

    // Reference alignment directives at the very end
    if (taggedItems.length > 0) {
      const directives = taggedItems.map(item => `Reference: @${item.name} (${item.category.toUpperCase()}) - ${item.imageUrl}`).join('\n');
      compiledPrompt = `${compiledPrompt}\n\n[REFERENCE ALIGNMENT DIRECTIVES]\n${directives}`;
      
      const hasCharacter = taggedItems.some(item => item.category === 'character');
      if (hasCharacter) {
        if (activeTab === 'image' && imageStyle === 'photorealistic' && camera === 'iphone') {
          compiledPrompt = `${compiledPrompt}\n\n[FACE SYMMETRY DIRECTIVE]\nMake the face 100% symmetrical, matching the exact facial structure and features of the attached character reference image, ensuring 100% natural look with realistic skin pores and textures, no artificial cinematic smoothing or airbrushing.`;
        } else {
          compiledPrompt = `${compiledPrompt}\n\n[FACE SYMMETRY DIRECTIVE]\nMake the face 100% symmetrical, matching the exact facial structure and features of the attached character reference image.`;
        }
      }
    }

    // [DISABLED] Auto-include Mood/Style reference alignment directive if present and not already tagged
    // Users complained it forces mood references when they only want character references.
    /*
    const moodRef = mergedBoard.moods?.[0];
    if (moodRef?.imageUrl) {
      const isAlreadyTagged = taggedItems.some(item => item.id === moodRef.id);
      if (!isAlreadyTagged) {
        if (activeTab === 'image' && imageStyle === 'photorealistic' && camera === 'iphone') {
          compiledPrompt = `${compiledPrompt}\n\n[STYLE REFERENCE DIRECTIVE]\nMatch the overall aesthetic, color grading, lighting, composition style, and mood of the attached style reference image, ensuring it looks like a normal camera snapshot without cinematic enhancements.`;
        } else {
          compiledPrompt = `${compiledPrompt}\n\n[STYLE REFERENCE DIRECTIVE]\nMatch the overall aesthetic, color grading, lighting, composition style, and mood of the attached style reference image.`;
        }
      }
    }
    */

    return compiledPrompt;
  };

  const getCompiledPayload = () => {
    const basePrompt = promptText.trim();
    const activeRatio = aspectRatio;
    const taggedItems = getTaggedRefItems(basePrompt);
    const compiled = getCompiledPrompt();
    const resVal = resolution === '480p' ? 'SD' : resolution === '720p' ? '1K' : resolution === '1080p' ? '2K' : '4K';

    if (activeTab === 'image') {
      let finalSize = '1024x1024';
      if (activeRatio === '16:9') finalSize = '1792x1024';
      else if (activeRatio === '9:16') finalSize = '1024x1792';

      const reqRefImages = [];
      if (firstFrameImage) {
        reqRefImages.push(firstFrameImage);
      }
      // [DISABLED] Auto-include staged/saved Mood/Style reference image from the Reference Board if present
      /*
      const moodItem = mergedBoard.moods?.[0];
      if (moodItem?.imageUrl && !reqRefImages.includes(moodItem.imageUrl)) {
        reqRefImages.push(moodItem.imageUrl);
      }
      */
      taggedItems.forEach(item => {
        if (item.imageUrl && !reqRefImages.includes(item.imageUrl)) {
          reqRefImages.push(item.imageUrl);
        }
      });

      return {
        model: activeEngine,
        prompt: compiled,
        size: finalSize,
        aspectRatio: activeRatio,
        imageSize: '1K',
        resolution: '1K',
        userId,
        referenceImages: reqRefImages
      };
    } else {
      let targetModel = activeEngine;
      if (activeEngine === 'omni') targetModel = 'gemini-omni-preview';
      else if (activeEngine === 'omni-flash') targetModel = 'gemini-omni-flash-preview';

      const identity_images = taggedItems.map(item => item.imageUrl).filter(Boolean);
      const identity_gcs_uris = taggedItems.map(item => ({ name: item.name, uri: item.imageUrl }));

      if (activeEngine === 'seedance-fast' || activeEngine === 'seedace') {
        const seedanceContentArray = buildSeedanceContentArray(compiled, taggedItems, firstFrameImage, lastFrameImage, seedanceRefs);
        return {
          engine: activeEngine,
          model: activeEngine === 'seedance-fast' ? 'dreamina-seedance-2-0-fast-260128' : 'dreamina-seedance-2-0-260128',
          seedanceContentArray,
          duration,
          aspectRatio: activeRatio,
          resolution,
          userId,
          generateAudio
        };
      }

      if (activeEngine === 'seedance-mini') {
        const seedanceContentArray = buildSeedanceContentArray(compiled, taggedItems, firstFrameImage, lastFrameImage, seedanceRefs);
        return {
          engine: activeEngine,
          model: 'bytedance/seedance-2-mini',
          seedanceContentArray,
          duration,
          aspectRatio: activeRatio,
          resolution,
          userId,
          generateAudio
        };
      }

      return {
        image: firstFrameImage || undefined,
        firstFrameImage: firstFrameImage || undefined,
        lastFrameImage: lastFrameImage || undefined,
        imageEnd: lastFrameImage || undefined,
        motionPrompt: compiled,
        duration,
        aspectRatio: activeRatio,
        model: targetModel,
        identity_images,
        identity_gcs_uris,
        referenceImages: identity_images,
        ref_images: taggedItems.map(item => ({ url: item.imageUrl || item.url || item.data || item })),
        ref_videos: [
          ...(omniRefVideoPreview ? [{ url: omniRefVideoPreview, duration: omniRefVideoDuration }] : []),
          ...taggedItems.filter(item => isVideo(item)).map(item => ({ url: item.imageUrl || item.url || item.data || item }))
        ],
        refVideo: omniRefVideoPreview || undefined,
        ref_audios: taggedItems.filter(item => isAudio(item)).map(item => ({ url: item.imageUrl || item.url || item.data || item })),
        task: omniTask,
        generateAudio
      };
    }
  };

  const handleCopyText = (text, type) => {
    navigator.clipboard.writeText(text);
    const showToast = useAppStore.getState().showToast;
    if (type === 'prompt') {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
      if (showToast) showToast("Compiled prompt copied to clipboard!", "success");
    } else {
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
      if (showToast) showToast("Full API payload JSON copied!", "success");
    }
  };

  /* ─── GENERATE ───────────────────────────────────────────── */
  const handleGenerate = async (overridePrompt, overrideEngine) => {
    if (isBusy) return;
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 5000);

    // Use override engine if provided (avoids React batching race from SidePanel)
    const resolvedEngine = overrideEngine || activeEngine;

    if (!hasInput && !overridePrompt) {
      const showToast = useAppStore.getState().showToast;
      if (showToast) showToast("Please type prompt text, upload a frame, or tag reference elements before generating.", "error");
      return;
    }

    if (userCredits < requiredCredits) {
      const errText = `Insufficient Shorts credits: Requires ${requiredCredits}⚡, but you currently have ${userCredits}⚡.`;
      setErrorMsg(errText);
      const showToast = useAppStore.getState().showToast;
      if (showToast) {
        showToast(errText, "error", {
          label: "⚡ Top Up Credits",
          onClick: () => {
            const setTab = useAppStore.getState().setActiveTab;
            if (setTab) setTab('pricing');
          }
        });
      }
      return;
    }

    setStatus('generating');
    setErrorMsg('');
    setPollMsg('');

    // Use overridePrompt from SidePanel if provided to bypass stale state reads
    const basePrompt = overridePrompt
      ? overridePrompt.trim()
      : (resolvedEngine === 'omni' || resolvedEngine === 'omni-flash') ? omniPromptText.trim() : promptText.trim();
    const activeRatio = aspectRatio;

    // Identify all active reference tags using getTaggedRefItems
    const taggedItems = getTaggedRefItems(basePrompt);
    const compiledPrompt = getCompiledPrompt();

    const identity_images = taggedItems.map(item => item.imageUrl).filter(Boolean);
    const identity_gcs_uris = taggedItems.map(item => ({ name: item.name, uri: item.imageUrl }));

    // Deduct credits for each variation separately to prevent double-charging and match backend verification
    try {
      const singleCost = getRequiredCredits(activeEngine);
      const spendPromises = Array.from({ length: variationCount }).map(() =>
        spendShorts(userId, singleCost, activeTab === 'image' ? 'cinematic_image_generation' : 'cinematic_video_generation')
      );
      const spendResults = await Promise.all(spendPromises);
      if (spendResults.some(r => !r.success)) {
        throw new Error('Failed to authorize credit deduction.');
      }
    } catch (err) {
      setStatus('error');
      const errText = err.message || 'Insufficient credit balance.';
      setErrorMsg(errText);
      const showToast = useAppStore.getState().showToast;
      if (showToast) {
        showToast(errText, "error", {
          label: "⚡ Top Up Credits",
          onClick: () => {
            const setTab = useAppStore.getState().setActiveTab;
            if (setTab) setTab('pricing');
          }
        });
      }
      return;
    }

    // Retain the prompt in the text box so the user can easily tweak and re-generate!

    if (activeTab === 'image') {
      try {
        let finalSize = '1024x1024';
        if (activeRatio === '16:9') finalSize = '1792x1024';
        else if (activeRatio === '9:16') finalSize = '1024x1792';

        const finalPrompt = compiledPrompt;

        const reqRefImages = [];
        if (firstFrameImage) {
          reqRefImages.push(firstFrameImage);
        }
        // [DISABLED] Auto-include staged/saved Mood/Style reference image from the Reference Board if present
        /*
        const moodItem = mergedBoard.moods?.[0];
        if (moodItem?.imageUrl && !reqRefImages.includes(moodItem.imageUrl)) {
          reqRefImages.push(moodItem.imageUrl);
        }
        */
        identity_images.forEach(img => {
          if (!reqRefImages.includes(img)) reqRefImages.push(img);
        });

        const engineLabel = IMAGE_ENGINES.find(e => e.id === activeEngine)?.label || 'Nano Banana 2';

        // Pre-populate gallery with placeholder loading items
        const tempItems = Array.from({ length: variationCount }).map((_, idx) => ({
          id: `temp-image-${Date.now()}-${idx}`,
          type: 'image',
          loading: true,
          prompt: finalPrompt,
          aspect: activeRatio,
          ts: Date.now() + (variationCount - idx),
          projectId: activeProjectId
        }));
        setGallery(prev => [...tempItems, ...prev]);

        if (variationCount > 1) {
          setPollMsg(`Developing ${variationCount} variations...`);
        }

        console.log(`[CinematicStudio] Generating ${variationCount} image variations...`);

        // Execute generations in parallel
        const promises = Array.from({ length: variationCount }).map(async (_, idx) => {
          const tempId = tempItems[idx].id;
          const seedVal = Math.floor(Math.random() * 1000000);
          const tweakedPrompt = `${finalPrompt} [seed: ${seedVal}]`;

          const resVal = resolution === '480p' ? 'SD' : resolution === '720p' ? '1K' : resolution === '1080p' ? '2K' : '4K';
          const _adminTrialOn = localStorage.getItem('useAdminTrialApiKey') === 'true';
          const _adminKey = localStorage.getItem('adminTrialApiKey') || '';
          const _imgHeaders = { 'Content-Type': 'application/json' };
          if (_adminTrialOn && _adminKey) _imgHeaders['x-admin-trial-key'] = _adminKey;

          try {
            const resp = await fetch(getApiUrl('/api/generate-image'), {
              method: 'POST',
              headers: _imgHeaders,
              body: JSON.stringify({
                model: activeEngine,
                prompt: tweakedPrompt,
                size: finalSize,
                aspectRatio: activeRatio,
                imageSize: resVal,
                resolution: resVal,
                userId,
                projectId: activeProjectId,
                referenceImages: reqRefImages,
                creditReason: 'cinematic_image_generation'
              })
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || `Image variation ${idx + 1} failed.`);
            if (!data.url) throw new Error(`Variation ${idx + 1} returned no URL.`);

            // Replace placeholder in gallery immediately
            const finishedItem = {
              id: Date.now() + idx + Math.random(),
              type: 'image',
              url: data.url,
              prompt: finalPrompt,
              engine: engineLabel,
              aspect: activeRatio,
              ts: Date.now(),
              projectId: activeProjectId
            };
            setGallery(prev => prev.map(item => item.id === tempId ? finishedItem : item));
            return data.url;
          } catch (err) {
            // Remove the placeholder if this variation failed
            setGallery(prev => prev.filter(item => item.id !== tempId));
            throw err;
          }
        });

        await Promise.all(promises);
        
        setStatus('idle');
        setPollMsg('');
        refreshShorts();
      } catch (err) {
        setStatus('error');
        setPollMsg('');
        const label = IMAGE_ENGINES.find(e => e.id === activeEngine)?.label || 'Nano Banana 2';
        const cleanErr = cleanErrorMessage(err.message || `${label} engine failed.`);
        setErrorMsg(cleanErr);
        const showToast = useAppStore.getState().showToast;
        if (showToast) showToast(cleanErr, "error");
        await triggerRefund('cinematic_image_generation');
      }
      return;
    }

    if (activeEngine !== 'seedace' && activeEngine !== 'seedance-fast' && activeEngine !== 'seedance-mini' && activeEngine !== 'kling/v3-turbo-image-to-video') {
      try {
        let targetModel = activeEngine;
        let engineLabel = ENGINES.find(e => e.id === activeEngine)?.label || 'Veo 3.1';
        
        if (activeEngine === 'omni') {
          targetModel = 'gemini-omni-preview';
        } else if (activeEngine === 'omni-flash') {
          targetModel = 'gemini-omni-flash-preview';
        }

        // Pre-populate gallery with placeholder loading items
        const tempItems = Array.from({ length: variationCount }).map((_, idx) => ({
          id: `temp-video-${Date.now()}-${idx}`,
          type: 'video',
          loading: true,
          prompt: compiledPrompt,
          aspect: activeRatio,
          ts: Date.now() + (variationCount - idx),
          projectId: activeProjectId
        }));
        setGallery(prev => [...tempItems, ...prev]);

        if (variationCount > 1) {
          setPollMsg(`Rendering ${variationCount} video variations...`);
        }

        console.log(`[CinematicStudio] Generating ${variationCount} video variations...`);

        // Execute generations in parallel
        const promises = Array.from({ length: variationCount }).map(async (_, idx) => {
          const tempId = tempItems[idx].id;
          const seedVal = Math.floor(Math.random() * 1000000);
          const tweakedPrompt = `${compiledPrompt} [seed: ${seedVal}]`;

          const _veoAdminOn = localStorage.getItem('useAdminTrialApiKey') === 'true';
          const _veoAdminKey = localStorage.getItem('adminTrialApiKey') || '';
          const _veoHeaders = { 'Content-Type': 'application/json' };
          if (_veoAdminOn && _veoAdminKey) _veoHeaders['x-admin-trial-key'] = _veoAdminKey;

          try {
            const isOmniEngine = activeEngine === 'omni' || activeEngine === 'omni-flash';
            const endpointUrl = isOmniEngine ? '/api/omni-i2v' : '/api/veo-i2v';
            const primaryImg = isOmniEngine ? omniFirstFrameImage : firstFrameImage;
            const secondaryImg = isOmniEngine ? omniLastFrameImage : lastFrameImage;
            const resp = await fetch(getApiUrl(endpointUrl), {
              method: 'POST',
              headers: _veoHeaders,
              body: JSON.stringify({
                image: primaryImg || undefined,
                firstFrameImage: primaryImg || undefined,
                lastFrameImage: secondaryImg || undefined,
                imageEnd: secondaryImg || undefined,
                motionPrompt: tweakedPrompt,
                duration,
                aspectRatio: activeRatio,
                resolution,
                model: targetModel,
                identity_images: isOmniEngine ? [...omniRefImages.filter(Boolean), ...identity_images] : identity_images,
                identity_gcs_uris,
                referenceImages: isOmniEngine ? [...omniRefImages.filter(Boolean), ...identity_images] : identity_images,
                ref_images: [
                  ...(isOmniEngine ? omniRefImages.filter(Boolean).map(url => ({ url })) : []),
                  ...taggedItems.map(item => ({ url: item.imageUrl || item.url || item.data || item }))
                ],
                ref_videos: [
                  ...(omniRefVideoPreview ? [{ url: omniRefVideoPreview, duration: omniRefVideoDuration }] : []),
                  ...taggedItems.filter(item => isVideo(item)).map(item => ({ url: item.imageUrl || item.url || item.data || item }))
                ],
                refVideo: omniRefVideoPreview || undefined,
                ref_audios: taggedItems.filter(item => isAudio(item)).map(item => ({ url: item.imageUrl || item.url || item.data || item })),
                task: omniTask,
                userId,
                projectId: activeProjectId,
                generateAudio,
                creditReason: 'cinematic_video_generation'
              })
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || `Video variation ${idx + 1} failed.`);
            if (!data.videoUrl) throw new Error(`Variation ${idx + 1} returned no videoUrl.`);

            // Replace placeholder in gallery immediately
            const finishedItem = {
              id: Date.now() + idx + Math.random(),
              type: 'video',
              url: data.videoUrl,
              prompt: compiledPrompt,
              engine: engineLabel,
              aspect: activeRatio,
              ts: Date.now(),
              projectId: activeProjectId
            };
            setGallery(prev => prev.map(item => item.id === tempId ? finishedItem : item));
            return data.videoUrl;
          } catch (err) {
            // Remove the placeholder if this variation failed
            setGallery(prev => prev.filter(item => item.id !== tempId));
            throw err;
          }
        });

        await Promise.all(promises);

        setStatus('idle');
        setPollMsg('');
        refreshShorts();
      } catch (err) {
        setStatus('error');
        setPollMsg('');
        const label = ENGINES.find(e => e.id === activeEngine)?.label || 'Veo 3.1';
        let cleanErr = err.message || `${label} engine failed.`;
        if (cleanErr.includes('Responsible AI') || cleanErr.includes('violates Google')) {
          cleanErr = "⚠️ Content Safety Filter: Google's Responsible AI policy blocked this prompt or reference media. Your credits have been automatically refunded.";
        }
        setErrorMsg(cleanErr);
        const showToast = useAppStore.getState().showToast;
        if (showToast) showToast(cleanErr, "error");
        await triggerRefund('cinematic_video_generation');
      }
    } else if (activeEngine === 'seedance-fast' || activeEngine === 'seedace' || activeEngine === 'seedance-mini') {
      const tempId = `temp-seedance-${Date.now()}`;
      try {
        if (variationCount > 1) {
          const showToast = useAppStore.getState().showToast;
          if (showToast) showToast("Seedance currently supports 1 variation per request natively. Processing 1.", "info");
        }

        const modelParam = activeEngine === 'seedance-fast'
          ? 'dreamina-seedance-2-0-fast-260128'
          : activeEngine === 'seedance-mini'
          ? 'bytedance/seedance-2-mini'
          : 'dreamina-seedance-2-0-260128';

        const seedanceContentArray = buildSeedanceContentArray(compiledPrompt, taggedItems, firstFrameImage, lastFrameImage, seedanceRefs);

        // Pre-populate gallery with placeholder loading item
        const tempItem = {
          id: tempId,
          type: 'video',
          loading: true,
          prompt: compiledPrompt,
          aspect: activeRatio,
          ts: Date.now(),
          projectId: activeProjectId
        };
        setGallery(prev => [tempItem, ...prev]);

        const resp = await fetch(getApiUrl('/api/seedance/generate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engine: activeEngine,
            model: modelParam,
            seedanceContentArray,
            duration,
            aspectRatio: activeRatio,
            resolution,
            userId,
            projectId: activeProjectId,
            generateAudio,
            creditReason: 'cinematic_video_generation'
          })
        });

        const json = await resp.json();
        if (!resp.ok) throw new Error(json.error || 'Seedance task initialization failed.');

        const taskId = json.requestId;
        if (!taskId) throw new Error('No task ID returned from backend.');

        await pollSeedanceTask(taskId, basePrompt, activeRatio, json.engine || activeEngine, tempId);
      } catch (err) {
        // Remove the placeholder on failure
        setGallery(prev => prev.filter(item => item.id !== tempId));
        setStatus('error');
        const label = ENGINES.find(e => e.id === activeEngine)?.label || 'Seedance';
        const cleanErr = cleanErrorMessage(err.message || `${label} engine failed.`);
        setErrorMsg(cleanErr);
        const showToast = useAppStore.getState().showToast;
        if (showToast) showToast(cleanErr, "error");
        await triggerRefund('cinematic_video_generation');
      } finally {
        setStatus(prev => (prev === 'generating' || prev === 'polling' ? 'idle' : prev));
        setPollMsg('');
      }
    } else if (activeEngine === 'kling/v3-turbo-image-to-video') {
      const tempId = `temp-kling-${Date.now()}`;
      try {
        if (variationCount > 1) {
          const showToast = useAppStore.getState().showToast;
          if (showToast) showToast("Kling currently supports 1 variation per request. Processing 1.", "info");
        }

        // Pre-populate gallery with placeholder loading item
        const tempItem = {
          id: tempId,
          type: 'video',
          loading: true,
          prompt: compiledPrompt,
          aspect: activeRatio,
          ts: Date.now()
        };
        setGallery(prev => [tempItem, ...prev]);

        const resp = await fetch(getApiUrl('/api/kling/generate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'kling/v3-turbo-image-to-video',
            prompt: compiledPrompt,
            firstFrame: firstFrameImage || undefined,
            lastFrame: lastFrameImage || undefined,
            duration,
            resolution,
            userId,
            creditReason: 'cinematic_video_generation'
          })
        });

        const json = await resp.json();
        if (!resp.ok) throw new Error(json.error || 'Kling task initialization failed.');

        const taskId = json.requestId;
        if (!taskId) throw new Error('No task ID returned from backend.');

        await pollKlingTask(taskId, compiledPrompt, activeRatio, activeEngine, tempId);
      } catch (err) {
        setGallery(prev => prev.filter(item => item.id !== tempId));
        setStatus('error');
        const cleanErr = cleanErrorMessage(err.message || 'Kling engine failed.');
        setErrorMsg(cleanErr);
        const showToast = useAppStore.getState().showToast;
        if (showToast) showToast(cleanErr, "error");
        await triggerRefund('cinematic_video_generation');
      } finally {
        setStatus(prev => (prev === 'generating' || prev === 'polling' ? 'idle' : prev));
        setPollMsg('');
      }
    }
  };

  const handleClearGallery = () => {
    if (window.confirm('Clear entire cinema gallery?')) setGallery([]);
  };

  // Distribute gallery items into 5 columns for responsive masonry Grid flow
  const columnsData = useMemo(() => {
    const renderItems = [];
    const hasLoadingItems = filteredGallery.some(item => item.loading);
    if (isBusy && !hasLoadingItems) {
      renderItems.push({ isLoader: true });
    }
    renderItems.push(...filteredGallery);

    const cols = [[], [], [], [], []];
    renderItems.forEach((item, index) => {
      cols[index % 5].push(item);
    });
    return cols;
  }, [filteredGallery, isBusy]);

  /* ─── RENDER ─────────────────────────────────────────────── */
  return (
    <div className="h-full flex flex-col bg-[#020202] text-white overflow-hidden relative font-sans">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
        disabled={isUploading}
      />



      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-1 border-b border-white/5 bg-black/50 backdrop-blur-xl flex-shrink-0 z-30">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-5 h-5 bg-fuchsia-500/10 border border-fuchsia-500/25 rounded-lg flex items-center justify-center">
            <Clapperboard size={11} className="text-fuchsia-400" />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.18em] leading-none">Cinema Studio</p>
          </div>
        </div>

        <div className="w-px h-4 bg-white/10 flex-shrink-0" />

        {/* Credit Badge */}
        <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[#c8f135]/15 border border-[#c8f135]/40 rounded-lg">
          <Sparkles size={9} className="text-[#c8f135]" />
          <span className="text-[9px] font-black text-[#c8f135]">{userCredits}</span>
          <span className="text-[7px] font-mono text-gray-400 uppercase tracking-widest">Shorts</span>
        </div>

        {/* Premium Project Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProjectDropdown(prev => !prev)}
            className="flex items-center gap-1.5 bg-[#0f0f15]/95 border border-white/10 rounded-xl px-3 py-1.5 shadow-lg shadow-black/40 hover:bg-white/[0.03] active:scale-95 transition-all text-white text-[8px] font-black uppercase tracking-wider cursor-pointer select-none"
          >
            <Clapperboard size={10} className="text-fuchsia-400" />
            <span>{projects.find(p => p.id === activeProjectId)?.name || 'Default Project'}</span>
            <ChevronDown size={10} className={cn("text-gray-400 transition-transform duration-200", showProjectDropdown && "rotate-180")} />
          </button>

          {showProjectDropdown && (
            <>
              {/* Overlay blocker to close dropdown when clicking outside */}
              <div className="fixed inset-0 z-40" onClick={() => setShowProjectDropdown(false)} />
              <div className="absolute left-0 mt-1.5 w-48 bg-[#0b0b0e] border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.85)] py-1 z-50 overflow-hidden">
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                  {projects.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setActiveProjectId(p.id);
                        setShowProjectDropdown(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[8.5px] font-black uppercase tracking-wider transition-colors",
                        p.id === activeProjectId
                          ? "text-[#c8f135] bg-[#c8f135]/5"
                          : "text-white/60 hover:text-white hover:bg-white/[0.02]"
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <div className="border-t border-white/5 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProjectDropdown(false);
                      setNewProjectName('');
                      setShowNewProjectModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-[8.5px] font-black uppercase tracking-wider text-[#c8f135] hover:bg-[#c8f135]/10 transition-colors flex items-center gap-1"
                  >
                    <span>+ New Project...</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>


        {/* Gallery count + clear */}
        <div className="ml-auto flex items-center gap-2">
          {filteredGallery.length > 0 && (
            <>
              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">
                {filteredGallery.length} clip{filteredGallery.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleClearGallery}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest text-gray-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
              >
                <Trash2 size={9} /> Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── MAIN BODY ──────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Wrap in a stable fixed-position div so Framer Motion doesn't clobber -translate-y-1/2 centering */}
        <div
          className="fixed top-1/2 -translate-y-1/2 z-[130]"
          style={{ right: showSidePanel ? '36rem' : '0rem', transition: 'right 0.35s cubic-bezier(0.32,0.72,0,1)' }}
        >
          <motion.button
            type="button"
            onClick={() => setShowSidePanel(prev => !prev)}
            whileHover={{ scale: 1.05, x: -3 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className={cn(
              "py-6 px-2 rounded-l-2xl border-l border-y shadow-2xl flex flex-col items-center gap-2 cursor-pointer transition-colors backdrop-blur-2xl",
              showSidePanel
                ? "bg-[#c8f135] text-black border-[#c8f135] shadow-[0_0_20px_rgba(200,241,53,0.85)]"
                : "bg-[#0b0b12]/95 border-violet-500/40 text-violet-300 hover:bg-violet-600/30 hover:text-white"
            )}
            title="Toggle Studio Side Panel"
          >
            <Sliders size={14} className={showSidePanel ? "text-black" : "text-violet-400"} />
            <span
              style={{ writingMode: 'vertical-lr' }}
              className={cn("text-[9px] font-black uppercase tracking-widest select-none", showSidePanel ? "text-black" : "text-violet-200")}
            >
              Studio
            </span>
          </motion.button>
        </div>


        {/* GALLERY BACKGROUND — occupies the full viewport behind everything */}
        <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 pb-52">
          {filteredGallery.length === 0 && !isBusy ? (
            /* ── EMPTY STATE — Gorgeous Premium Glassmorphism Box ── */
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 space-y-6 w-full col-span-full py-12">
              <div className="relative">
                <div className="absolute inset-0 bg-fuchsia-500/20 rounded-full blur-2xl animate-pulse" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center shadow-xl border border-white/10 relative z-10">
                  <Film className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="space-y-2 max-w-sm relative z-10">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Your Studio Canvas is Ready</h3>
                <p className="text-white/40 text-xs leading-relaxed">
                  Type a prompt below to start compiling premium AI-generated cinematic clips, or upload reference images to guide the character style.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 relative z-10 max-w-lg">
                {SUGGESTIONS.slice(0, 3).map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPromptText(s.prompt)}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5 text-[9px] font-medium text-white/50 hover:text-white transition-all text-left max-w-[200px] truncate"
                    title={s.prompt}
                  >
                    💡 {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── VIDEO GALLERY GRID ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-start">
              {columnsData.map((colItems, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-3">
                  {colItems.map((item, itemIdx) => {
                    if (item.isLoader || item.loading) {
                      const isImageLoader = item.type === 'image' || (item.isLoader && activeTab === 'image');
                      return (
                        <div key={item.id || "loader"} className="rounded-2xl border border-fuchsia-500/15 bg-black/60 backdrop-blur-lg overflow-hidden">
                          <div className={cn(
                            "flex flex-col items-center justify-center p-6 space-y-4",
                            item.aspect === '9:16' ? 'aspect-[9/16]' : item.aspect === '1:1' ? 'aspect-square' : 'aspect-video'
                          )}>
                            <div className="relative w-14 h-14">
                              <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                              <div className="absolute inset-0 rounded-full border-2 border-t-fuchsia-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                              {isImageLoader ? (
                                <ImageIcon className="absolute inset-0 m-auto w-5 h-5 text-fuchsia-400" />
                              ) : (
                                <Film className="absolute inset-0 m-auto w-5 h-5 text-fuchsia-400" />
                              )}
                            </div>
                            <div className="text-center space-y-1.5">
                              <span className="text-[8px] font-black uppercase text-fuchsia-400/80 tracking-[0.2em] block">
                                {item.loading ? (item.type === 'image' ? 'Developing canvas' : 'Compiling frames') : (pollMsg || (activeTab === 'image' ? 'Developing canvas' : 'Compiling frames'))}
                              </span>
                              {isImageLoader ? (
                                <p className="text-white/60 text-xs font-black uppercase tracking-widest text-center max-w-xs animate-pulse">
                                  🎨 Sketching fine details...
                                </p>
                              ) : (
                                <CyclingLoadingText />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden group cursor-pointer hover:border-fuchsia-500/20 transition-all gallery-item-appear"
                        onClick={() => setLightboxItem(item)}
                      >
                        {/* Media Content */}
                        <div className={cn(
                          "relative overflow-hidden bg-black",
                          item.aspect === '9:16' ? 'aspect-[9/16]' : item.aspect === '1:1' ? 'aspect-square' : 'aspect-video'
                        )}>
                          {item.type === 'image' ? (
                            <>
                              <img
                                src={resolveUrl(item.url)}
                                alt={item.prompt}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              {upscalingItems[item.id] && (
                                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-30 flex flex-col items-center justify-center space-y-2">
                                  <Loader2 size={16} className="text-fuchsia-400 animate-spin" />
                                  <span className="text-[7px] font-black uppercase tracking-[0.2em] text-fuchsia-400">Refining 2K...</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <LazyVideo src={item.url} aspect={item.aspect} />
                          )}
                          {/* Play or view overlay */}
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                              {item.type === 'image' ? (
                                <Maximize2 size={16} className="text-white" />
                              ) : (
                                <Play size={16} className="text-white ml-0.5" fill="white" />
                              )}
                            </div>
                          </div>
                          {/* Top Right Controls Group */}
                          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
                            <div className="px-1.5 py-0.5 rounded-md text-[7px] font-mono bg-black/70 backdrop-blur-md border border-white/10 text-white/50">
                              {item.aspect}
                            </div>
                            <button
                              onClick={(e) => handleDeleteItem(item.id, e)}
                              className="w-5 h-5 rounded-md bg-red-500/80 hover:bg-red-600 border border-red-500/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
                              title="Delete generation"
                            >
                              <Trash2 size={8} className="text-white" />
                            </button>
                          </div>
                        </div>

                        {/* Meta */}
                        <div className="p-3 space-y-1.5">
                          <p className="text-[9px] text-white/50 leading-relaxed line-clamp-1 font-medium" title={item.prompt}>
                            {item.prompt}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[7px] font-mono text-gray-600">
                                {new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {item.type === 'image' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFirstFrameImage(item.url);
                                    setFirstFramePreview(item.url);
                                    const showToast = useAppStore.getState().showToast;
                                    if (showToast) showToast("Set as Reference Style Guided Image!", "success");
                                  }}
                                  className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-fuchsia-500/15 border border-fuchsia-500/25 text-[8px] font-black uppercase tracking-wider text-fuchsia-400 hover:bg-fuchsia-500/25 transition-all active:scale-95 shrink-0"
                                  title="Set as Style Reference guided image"
                                >
                                  <ImageIcon size={8} className="text-fuchsia-400" /> Ref
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {item.type === 'image' && (
                                <>
                                  <button
                                    onClick={(e) => handleUpscale(item, e)}
                                    disabled={upscalingItems[item.id]}
                                    className={cn(
                                      "flex items-center gap-0.5 text-[7px] font-black uppercase tracking-wider transition-colors",
                                      upscalingItems[item.id]
                                        ? "text-fuchsia-400 animate-pulse"
                                        : "text-gray-500 hover:text-fuchsia-400"
                                    )}
                                    title="Upscale image to 2K (2 Credits)"
                                  >
                                    {upscalingItems[item.id] ? (
                                      <>
                                        <Loader2 size={7} className="animate-spin text-fuchsia-400" />
                                        <span>2K...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Zap size={7} className="text-current" />
                                        <span>2K</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFirstFrameImage(item.url);
                                      setFirstFramePreview(item.url);
                                      const showToast = useAppStore.getState().showToast;
                                      if (showToast) showToast("Set as First Frame (FF)!", "success");
                                    }}
                                    className="flex items-center gap-0.5 text-[7px] font-black uppercase tracking-wider text-gray-500 hover:text-[#c8f135] transition-colors"
                                    title="Set as First Frame (FF) of video"
                                  >
                                    <Video size={7} className="text-current" /> FF
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLastFrameImage(item.url);
                                      setLastFramePreview(item.url);
                                      const showToast = useAppStore.getState().showToast;
                                      if (showToast) showToast("Set as Last Frame (LF)!", "success");
                                    }}
                                    className="flex items-center gap-0.5 text-[7px] font-black uppercase tracking-wider text-gray-500 hover:text-fuchsia-400 transition-colors"
                                    title="Set as Last Frame (LF) of video"
                                  >
                                    <Video size={7} className="text-current" /> LF
                                  </button>
                                </>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(item.url, item.type, item.id);
                                }}
                                className="flex items-center gap-1 text-[7px] font-black uppercase tracking-widest text-gray-600 hover:text-[#c8f135] transition-colors"
                              >
                                <Download size={8} /> Save
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

        {/* ── ERROR BANNER ── */}
        {errorMsg && (
          <div className="absolute top-0 left-0 right-0 z-40 px-6 py-2 bg-red-950/80 backdrop-blur-xl border-b border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-2">
            <span>⚠ {errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="p-0.5 rounded-full hover:bg-red-500/25">
              <X size={10} />
            </button>
          </div>
        )}

        {/* ── FLOATING INPUT DOCK ── */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 z-30 p-3 pb-2 pointer-events-none transition-all duration-300 ease-in-out",
          showSidePanel ? "pr-0 lg:pr-[37rem]" : "pr-0"
        )}>
          <div className="max-w-4xl mx-auto pointer-events-auto">
            
            {/* Horizontal Flex Wrapper for Mode Switcher & Input Box */}
            <div className="flex flex-col sm:flex-row items-stretch gap-1.5 sm:gap-2.5 w-full">
              
              {/* Mode Switcher Tab (Equal 50-50 split vertical dual-toggle) */}
              <div className="bg-[#08080c]/95 border border-white/15 rounded-2xl p-1.5 flex flex-row sm:flex-col gap-1.5 shadow-xl shrink-0 select-none backdrop-blur-3xl self-stretch justify-between sm:w-14">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('image');
                    const lastImg = localStorage.getItem('cs_lastImageEngine') || 'nano-banana-2';
                    setActiveEngine(lastImg);
                  }}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-1 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all py-2 sm:py-0",
                    activeTab === 'image'
                      ? "bg-[#c8f135] text-black shadow-md shadow-[#c8f135]/25"
                      : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
                  )}
                  title="Switch to Image Generation"
                >
                  <ImageIcon size={15} className="shrink-0" />
                  <span className="font-extrabold leading-none">Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('video');
                    const lastVid = localStorage.getItem('cs_lastVideoEngine') || 'veo-3.1-lite-generate-preview';
                    setActiveEngine(lastVid);
                  }}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-1 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all py-2 sm:py-0",
                    activeTab === 'video'
                      ? "bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/25"
                      : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
                  )}
                  title="Switch to Video Generation"
                >
                  <Video size={15} className="shrink-0" />
                  <span className="font-extrabold leading-none">Video</span>
                </button>
              </div>

              {/* ── Main Floating Input Bar (Vertical premium studio layout) ── */}
              <div className="relative rounded-2xl border border-white/15 bg-[#08080c]/95 backdrop-blur-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col p-2.5 sm:p-3 gap-2 sm:gap-2 flex-1 min-w-0 hover:border-white/20 transition-all duration-300">
                
                {/* ── TOP ATTACHED CONTROL BAR (Refs, Camera Movement, Angle, Lens, Style) ── */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none w-full pb-1 mb-0.5 border-b border-white/[0.06]" style={{ scrollbarWidth: 'none' }}>
                  {/* Refs Button Pill (Centralized Reference Board control) */}
                  {activeEngine !== 'kling/v3-turbo-image-to-video' && (
                    <>
                      <motion.button
                        onClick={() => { setStagedRefBoard({ ...refBoard }); setShowRefBoard(true); }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[7.5px] font-black uppercase tracking-widest border bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/25 hover:border-fuchsia-500/40 transition-all shrink-0 origin-bottom"
                        title="Open Reference Board to stage Characters, Locations, Wardrobes, Props, and Moods"
                      >
                        {allRefItems.length > 0 && allRefItems[0].imageUrl ? (
                          <img 
                            src={resolveUrl(allRefItems[0].imageUrl)} 
                            alt="Ref Preview" 
                            className="w-3.5 h-3.5 rounded-full object-cover border border-white/20 shrink-0" 
                          />
                        ) : (
                          <Users size={9} className="text-fuchsia-400" />
                        )}
                        <span>Refs</span>
                        {allRefItems.length > 0 && (
                          <span className="w-3.5 h-3.5 rounded-full bg-fuchsia-500 text-white text-[6.5px] font-black flex items-center justify-center shrink-0 ml-0.5">
                            {allRefItems.length}
                          </span>
                        )}
                      </motion.button>
                      {/* Vertical divider line */}
                      <div className="w-px h-3.5 bg-white/10 shrink-0 self-center" />
                    </>
                  )}

                  {/* CAMERA DROPDOWN (Image mode only) */}
                  {activeTab === 'image' && (
                    <UpwardDropdown
                      icon={<Video size={8} />}
                      label={isConsumerCam ? (CAMERA_MODELS.find(c => c.id === camera)?.label || 'Camera') : `${CAMERA_MODELS.find(c => c.id === camera)?.label?.split(' ')[0] || 'Arri'} · ${lens}`}
                      accentColor="lime"
                    >
                      {(close) => (
                        <div className="space-y-0.5">
                          {CAMERA_MODELS.map((c, i) => (
                            <motion.button
                              key={c.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03, type: 'spring', stiffness: 400, damping: 25 }}
                              onClick={() => { handleCameraChange(c.id); close(); }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all",
                                camera === c.id
                                  ? "bg-lime-500/10 border border-lime-500/25"
                                  : "border border-transparent hover:bg-white/[0.04] hover:border-white/5"
                              )}
                            >
                              <div className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 transition-all",
                                camera === c.id ? "bg-lime-500/20 text-[#c8f135]" : "bg-white/5 text-gray-500"
                              )}>
                                <Video size={10} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-[10px] font-black uppercase tracking-wider truncate",
                                  camera === c.id ? "text-[#c8f135]" : "text-white/70"
                                )}>
                                  {c.label}
                                </p>
                                <p className="text-[7.5px] text-gray-600 font-medium truncate">{c.desc}</p>
                              </div>
                              {camera === c.id && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-[#c8f135] flex items-center justify-center shrink-0">
                                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </motion.div>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </UpwardDropdown>
                  )}

                  {/* LENS MODEL DROPDOWN (Image mode only) */}
                  {activeTab === 'image' && !isConsumerCam && (
                    <UpwardDropdown
                      icon={<Camera size={8} />}
                      label={`Lens: ${LENS_MODELS.find(l => l.id === lensModel)?.label || 'Lens'}`}
                      accentColor="violet"
                    >
                      {(close) => (
                        <div className="space-y-0.5">
                          {LENS_MODELS.map((opt, i) => (
                            <motion.button
                              key={opt.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04, type: 'spring', stiffness: 350, damping: 22 }}
                              onClick={() => { setLensModel(opt.id); close(); }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                                lensModel === opt.id
                                  ? "bg-violet-500/10 border border-violet-500/25"
                                  : "border border-transparent hover:bg-white/[0.04] hover:border-white/5"
                              )}
                            >
                              <div className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shrink-0 transition-all",
                                lensModel === opt.id ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-gray-500"
                              )}>
                                <Sparkles size={10} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-[10px] font-black uppercase tracking-wider truncate",
                                  lensModel === opt.id ? "text-violet-400" : "text-white/70"
                                )}>
                                  {opt.label}
                                </p>
                                <p className="text-[7.5px] text-gray-600 truncate font-semibold">{opt.desc}</p>
                              </div>
                              {lensModel === opt.id && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-violet-400 flex items-center justify-center shrink-0">
                                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </motion.div>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </UpwardDropdown>
                  )}

                  {/* PERSPECTIVE & FRAMING PILL (Image mode only) */}
                  {activeTab === 'image' && (
                    <motion.button
                      onClick={() => setShowAnglesModal(true)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest bg-black/60 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors shrink-0"
                    >
                      <Camera size={8} />
                      <span className="whitespace-nowrap">{CAMERA_ANGLES.find(a => a.id === angle)?.label || 'Angle'}</span>
                      <ChevronDown size={7} className="text-gray-600" />
                    </motion.button>
                  )}

                  {/* STYLE PRESET DROPDOWN (Image only) */}
                  {activeTab === 'image' && (
                    <UpwardDropdown
                      icon={<Film size={9} />}
                      label={STYLE_OPTIONS.find(s => s.value === imageStyle)?.label || 'Style'}
                      accentColor="violet"
                    >
                      {(close) => (
                        <div className="space-y-0.5">
                          {STYLE_OPTIONS.map((opt, i) => (
                            <motion.button
                              key={opt.value}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04, type: 'spring', stiffness: 350, damping: 22 }}
                              onClick={() => { setImageStyle(opt.value); close(); }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                                imageStyle === opt.value
                                  ? "bg-violet-500/10 border border-violet-500/25"
                                  : "border border-transparent hover:bg-white/[0.04] hover:border-white/5"
                              )}
                            >
                              <div className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shrink-0 transition-all",
                                imageStyle === opt.value
                                  ? "bg-violet-500/20 text-violet-400"
                                  : "bg-white/5 text-gray-500"
                              )}>
                                {opt.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-[10px] font-black uppercase tracking-wider truncate",
                                  imageStyle === opt.value ? "text-violet-400" : "text-white/70"
                                )}>{opt.label}</p>
                                <p className="text-[7.5px] text-gray-600 truncate">{opt.desc}</p>
                              </div>
                              {imageStyle === opt.value && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-violet-400 flex items-center justify-center shrink-0">
                                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </motion.div>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </UpwardDropdown>
                  )}

                  {/* CAMERA MOVEMENT DROPDOWN (Video only) */}
                  {activeTab === 'video' && (
                    <UpwardDropdown
                      icon={<Camera size={9} />}
                      label={CAMERA_MOVEMENTS.find(m => m.value === cameraMovement)?.label || 'Camera'}
                      accentColor="violet"
                    >
                      {(close) => (
                        <div className="space-y-0.5">
                          {CAMERA_MOVEMENTS.map((opt, i) => (
                            <motion.button
                              key={opt.value}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04, type: 'spring', stiffness: 350, damping: 22 }}
                              onClick={() => { setCameraMovement(opt.value); close(); }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                                cameraMovement === opt.value
                                  ? "bg-violet-500/10 border border-violet-500/25"
                                  : "border border-transparent hover:bg-white/[0.04] hover:border-white/5"
                              )}
                            >
                              <div className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shrink-0 transition-all",
                                cameraMovement === opt.value
                                  ? "bg-violet-500/20 text-violet-400"
                                  : "bg-white/5 text-gray-500"
                              )}>
                                {opt.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-[10px] font-black uppercase tracking-wider truncate",
                                  cameraMovement === opt.value ? "text-violet-400" : "text-white/70"
                                )}>{opt.label}</p>
                                <p className="text-[7.5px] text-gray-600 truncate">{opt.desc}</p>
                              </div>
                              {cameraMovement === opt.value && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-violet-400 flex items-center justify-center shrink-0">
                                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </motion.div>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </UpwardDropdown>
                  )}

                  {/* OMNI TASK DROPDOWN (Video only, Omni engine only) */}
                  {activeTab === 'video' && isOmni && (
                    <UpwardDropdown
                      icon={<Sparkles size={9} />}
                      label={(() => {
                        const taskLabels = {
                          auto: 'Multimodal',
                          image_to_video: 'First Frame to Video'
                        };
                        return taskLabels[omniTask] || 'Task';
                      })()}
                      accentColor="violet"
                    >
                      {(close) => (
                        <div className="space-y-0.5">
                          {[
                            { id: 'auto', label: 'Multimodal', icon: '✨', desc: 'Default multimodal generation' },
                            { id: 'image_to_video', label: 'First Frame to Video', icon: '🖼️', desc: 'Animate a starting frame image', disabled: !firstFrameImage },
                          ].map((opt, i) => (
                            <motion.button
                              key={opt.id}
                              disabled={opt.disabled}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04, type: 'spring', stiffness: 350, damping: 22 }}
                              onClick={() => { if (!opt.disabled) { setOmniTask(opt.id); close(); } }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                                opt.disabled
                                  ? "opacity-30 cursor-not-allowed"
                                  : omniTask === opt.id
                                  ? "bg-violet-500/10 border border-violet-500/25"
                                  : "border border-transparent hover:bg-white/[0.04] hover:border-white/5"
                              )}
                            >
                              <div className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shrink-0 transition-all",
                                opt.disabled
                                  ? "bg-white/5 text-gray-700"
                                  : omniTask === opt.id
                                  ? "bg-violet-500/20 text-violet-400"
                                  : "bg-white/5 text-gray-500"
                              )}>
                                <span className="text-[10px]">{opt.icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-[10px] font-black uppercase tracking-wider truncate",
                                  opt.disabled
                                    ? "text-white/30"
                                    : omniTask === opt.id ? "text-violet-400" : "text-white/70"
                                )}>{opt.label}</p>
                                <p className="text-[7.5px] text-gray-600 truncate">{opt.desc}</p>
                              </div>
                              {!opt.disabled && omniTask === opt.id && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-violet-400 flex items-center justify-center shrink-0">
                                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </motion.div>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </UpwardDropdown>
                  )}
                </div>
                
                {/* Autocomplete mention popover */}
                {mentionSearch !== null && mentionField === 'promptText' && (
                  <div className="absolute bottom-full mb-3.5 left-4 w-80 z-[500] bg-[#050505] border-2 border-[#D4FF00] rounded-2xl shadow-[0_-15px_60px_rgba(212,255,0,0.4)] overflow-hidden flex flex-col max-h-[260px] pointer-events-auto">
                    <div className="p-3 border-b border-white/10 bg-[#D4FF00]/10 flex items-center justify-between">
                      <span className="text-[10px] font-black text-[#D4FF00] uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" /> Tag Reference Element
                      </span>
                      <button type="button" onClick={() => setMentionSearch(null)} className="text-[#D4FF00]/40 hover:text-[#D4FF00] p-1"><X size={14} /></button>
                    </div>
                    <div className="overflow-y-auto custom-scrollbar bg-black/90 backdrop-blur-2xl flex-1">
                      {allRefItems
                        .filter(item => item.name.toLowerCase().includes(mentionSearch.toLowerCase()))
                        .length > 0 ? (
                        allRefItems
                          .filter(item => item.name.toLowerCase().includes(mentionSearch.toLowerCase()))
                          .map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => selectMention(item)}
                              className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[#D4FF00]/20 transition-colors group border-b border-white/[0.05] last:border-0 text-left text-white"
                            >
                              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                                {item.category === 'ref_videos' ? (
                                  <Video className="w-3.5 h-3.5 text-rose-400" />
                                ) : item.category === 'ref_audios' ? (
                                  <Music className="w-3.5 h-3.5 text-amber-400" />
                                ) : (item.imageUrl || item.url) ? (
                                  <img src={resolveUrl(item.imageUrl || item.url)} className="w-full h-full object-cover" alt={item.name} />
                                ) : (
                                  <Users className="w-3.5 h-3.5 text-[#D4FF00]" />
                                )}
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <p className="text-xs font-black text-white group-hover:text-[#D4FF00] transition-colors truncate">@{item.name?.replace(/\s+/g, '')}</p>
                                <p className="text-[8px] text-white/40 uppercase tracking-widest mt-0.5 font-bold">{item.category.replace('_', ' ')}</p>
                              </div>
                            </button>
                          ))
                      ) : (
                        <div className="p-6 text-center bg-black/95">
                          <p className="text-[10px] text-white/50 mb-3 font-bold uppercase tracking-wider">No matching reference elements</p>
                          <button
                            type="button"
                            onClick={() => { setShowRefBoard(true); setMentionSearch(null); }}
                            className="w-full px-4 py-2.5 bg-[#D4FF00] text-black text-[9px] rounded-xl font-black transition-all hover:bg-white uppercase tracking-widest shadow-xl flex items-center justify-center gap-1.5 animate-pulse"
                          >
                            Load from Elements
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Tagged Reference Pills (Full-width row at the very top of the input container) */}
                {taggedItems.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 px-1 border-b border-white/5 pb-2">
                    {taggedItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-1 px-2.5 py-1 bg-black/60 border border-[#c8f135]/40 rounded-lg shadow-md text-[9px] font-black uppercase text-[#D4FF00] tracking-wider shrink-0">
                        {item.category === 'ref_videos' ? (
                          <Video size={12} className="text-rose-400" />
                        ) : item.category === 'ref_audios' ? (
                          <Music size={12} className="text-amber-400" />
                        ) : (item.imageUrl || item.url) ? (
                          <img src={resolveUrl(item.imageUrl || item.url)} className="w-4 h-4 rounded object-cover border border-white/20" alt={item.name} />
                        ) : (
                          <Users size={12} className="text-[#D4FF00]" />
                        )}
                        <span>@{item.name?.replace(/\s+/g, '')}</span>
                        <button type="button" onClick={() => handleRemoveTag(item)} className="p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors ml-0.5">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              {/* TOP ROW: Textarea, Upload Slots (Vertically Stacked Up and Down on the Right) */}
              <div className="flex items-start gap-3 w-full">

                {/* Textarea (takes up full remaining width in the middle) */}
                <div className="flex-1 min-w-0">
                  <FastPromptInput
                    textareaRef={textareaRef}
                    promptText={promptText}
                    handleTextChange={handleTextChange}
                    canGenerate={canGenerate}
                    handleGenerate={handleGenerate}
                    activeTab={activeTab}
                    isBusy={isBusy}
                  />
                </div>

                {/* Vertical divider line before frame slots */}
                <div className="w-px self-stretch bg-white/10 shrink-0" />

                {/* First and Last Frame Image Placeholders (STACKED VERTICALLY UP AND DOWN ON THE RIGHT) */}
                <div className="shrink-0 select-none">
                  {activeTab === 'image' ? (
                    /* ── IMAGE MODE: SINGLE STYLE REF SLOT ── */
                    <div className="flex flex-col items-center gap-1 p-1 bg-white/[0.02] border border-white/5 rounded-xl relative group">
                      {firstFramePreview ? (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-zinc-900 group/slot shadow-lg">
                          <img src={resolveUrl(firstFramePreview)} alt="Style Reference" className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleClearRef('first')}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover/slot:opacity-100 flex items-center justify-center transition-opacity text-red-400"
                            title="Clear Style Reference"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setUploadTarget('first'); setTimeout(() => fileInputRef.current?.click(), 50); }}
                          disabled={isUploading}
                          className="w-10 h-10 rounded-lg border-2 border-dashed border-white/10 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5 flex flex-col items-center justify-center gap-0.5 text-white/30 hover:text-fuchsia-400 transition-all active:scale-95"
                          title="Upload Style Reference"
                        >
                          {isUploading ? (
                            <Loader2 size={11} className="animate-spin text-fuchsia-400" />
                          ) : (
                            <>
                              <ImageIcon size={11} />
                              <span className="text-[5px] font-black uppercase tracking-wider">Style Ref</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (!isOmni || omniTask === 'image_to_video') ? (
                    /* ── VIDEO MODE: DUAL SLOTS (STACKED VERTICALLY UP AND DOWN) ── */
                    <div className="flex flex-col items-center justify-center gap-1 p-1 bg-black/40 border border-white/10 rounded-xl relative group shrink-0">
                      {/* First Frame Slot (Top) */}
                      {firstFramePreview ? (
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-white/15 bg-zinc-950 group/slot shadow-md">
                          <img src={resolveUrl(firstFramePreview)} alt="Start Frame" className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleClearRef('first')}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover/slot:opacity-100 flex items-center justify-center transition-opacity text-red-400"
                            title="Clear Start Frame"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setUploadTarget('first'); setTimeout(() => fileInputRef.current?.click(), 50); }}
                          disabled={isUploading && uploadTarget === 'first'}
                          className="w-9 h-9 rounded-lg border border-dashed border-white/15 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10 flex flex-col items-center justify-center gap-0 text-white/40 hover:text-fuchsia-400 transition-all active:scale-95 bg-white/[0.02]"
                          title="Upload Start Frame"
                        >
                          {isUploading && uploadTarget === 'first' ? (
                            <Loader2 size={10} className="animate-spin text-fuchsia-400" />
                          ) : (
                            <>
                              <ImageIcon size={10} />
                              <span className="text-[5.5px] font-black uppercase tracking-wider">Start</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Small Down Arrow Divider */}
                      <div className="text-[7px] font-black text-fuchsia-400/50 select-none leading-none">↓</div>

                      {/* Last Frame Slot (Bottom) */}
                      {lastFramePreview ? (
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-white/15 bg-zinc-950 group/slot shadow-md">
                          <img src={resolveUrl(lastFramePreview)} alt="End Frame" className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleClearRef('last')}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover/slot:opacity-100 flex items-center justify-center transition-opacity text-red-400"
                            title="Clear End Frame"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setUploadTarget('last'); setTimeout(() => fileInputRef.current?.click(), 50); }}
                          disabled={isUploading && uploadTarget === 'last'}
                          className="w-9 h-9 rounded-lg border border-dashed border-white/15 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10 flex flex-col items-center justify-center gap-0 text-white/40 hover:text-fuchsia-400 transition-all active:scale-95 bg-white/[0.02]"
                          title="Upload End Frame"
                        >
                          {isUploading && uploadTarget === 'last' ? (
                            <Loader2 size={10} className="animate-spin text-fuchsia-400" />
                          ) : (
                            <>
                              <ImageIcon size={10} />
                              <span className="text-[5.5px] font-black uppercase tracking-wider">End</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* BOTTOM ROW: ALL PILLS & GENERATE BUTTON (Unified in one bottom toolbar) */}
              <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-2 mt-0.5 w-full">
                
                {/* Scrollable Pills List */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none flex-1 py-0.5" style={{ scrollbarWidth: 'none' }}>
                  
                  {/* PROMPT HELPER DROPDOWN */}
                  <UpwardDropdown
                    icon={<Sparkles size={9} />}
                    label="Guide"
                    accentColor="lime"
                  >
                    {(close) => (
                      <div className="space-y-4 w-80 max-h-[85vh] overflow-y-auto p-3 custom-scrollbar bg-[#09090b]/98 border border-white/5 rounded-2xl shadow-2xl">
                        <div className="pb-2 border-b border-white/5">
                          <p className="text-[9px] font-black text-white uppercase tracking-widest">Prompt Architect</p>
                          <p className="text-[7.5px] text-gray-500 font-medium mt-0.5 leading-relaxed">
                            Structure high-fidelity visual prompts using professional templates and style rules.
                          </p>
                        </div>

                        {/* Leera Creator Templates */}
                        <div className="space-y-2">
                          <p className="text-[8px] font-black text-amber-400 uppercase tracking-[0.15em] flex items-center gap-1.5">
                            <span>🎭</span> Character & Location Sheets
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const userInput = window.prompt("Enter character details (e.g. 'young man, athletic build, short black hair' or 'cybernetic explorer'):");
                                if (userInput !== null && userInput.trim() !== "") {
                                  setPromptText(`${userInput.trim()} — Character reference sheet of a single consistent character, presented on a pure clean deep neutral grey (#3a3a3c) seamless studio background, clean editorial layout arranged in three vertical sections, horizontal landscape composition read left to right, identical character identity, lighting and color grading across every panel for perfect consistency:\n\n— COLUMN 1 (largest, leftmost): chest-up portrait, front view, head and upper chest in frame, sharp focus on the eyes, soft catchlights in both eyes.\n\n— COLUMN 2: full-body front view, standing relaxed neutral A-pose, arms slightly away from the body, weight evenly distributed, full figure head-to-toe inside the frame with even margins.\n\n— COLUMN 3 (rightmost): full-body back view, same standing pose mirrored, showing hair fall, back posture, garment fit and shoes.\n\nLIGHTING & RENDER: clean soft even studio lighting, large diffused key light with gentle fill, soft natural shadows, no harsh highlights, true-to-life skin tones, neutral white balance, minimal high-fashion editorial presentation, polished modern professional model sheet aesthetic, shot on full-frame camera with an 85mm lens look, shallow yet controlled depth of field, crisp tack-sharp detail, high dynamic range, ultra-realistic photography, highly detailed skin texture with visible open pores, zero makeup, natural raw skin, no plastic or airbrushed textures, complete natural presentation, 8k.`);
                                }
                                close();
                              }}
                              className="text-left p-2.5 rounded-xl bg-white/[0.01] hover:bg-amber-500/10 text-white/80 hover:text-amber-400 text-[9px] border border-white/5 hover:border-amber-500/20 transition-all font-semibold flex flex-col gap-1"
                            >
                              <span className="text-[10px]">👩‍🎤</span>
                              <span>Character Sheet</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const userInput = window.prompt("Enter location details (e.g., 'A modern beach house at sunset'):");
                                if (userInput !== null && userInput.trim() !== "") {
                                  setPromptText(`${userInput.trim()}, cinematic location photography, shot on 35mm lens, realistic textures, motivated lighting with soft falloff, no crushed shadows, depth-of-field control, crisp detail, 8k.`);
                                }
                                close();
                              }}
                              className="text-left p-2.5 rounded-xl bg-white/[0.01] hover:bg-amber-500/10 text-white/80 hover:text-amber-400 text-[9px] border border-white/5 hover:border-amber-500/20 transition-all font-semibold flex flex-col gap-1"
                            >
                              <span className="text-[10px]">🏖️</span>
                              <span>Location Sheet</span>
                            </button>
                          </div>
                        </div>

                        <div className="h-px bg-white/5" />

                        {/* Image Editing / Ref Board Hacks (At the very top!) */}
                        <div className="space-y-2">
                          <p className="text-[8px] font-black text-rose-400 uppercase tracking-[0.15em] flex items-center gap-1.5">
                            <span>✂️</span> Edit & Remix (Image-to-Image)
                          </p>
                          <div className="grid grid-cols-1 gap-1.5">
                            {[
                              { label: 'Change the character', value: 'Change the character: keep style, setting, and composition, but swap the subject to [new subject]' },
                              { label: 'Adjust the composition', value: 'Adjust the composition: change camera angle or framing to [new framing]', resetCamera: true },
                              { label: 'Alter the action', value: 'Alter the action: modify what the character is doing to [new action]' },
                              { label: 'Swap the setting', value: 'Swap the setting: change environment/background to [new background]' },
                              { label: 'Rethink the style', value: 'Rethink the style: change visual medium/color grade to [new style]', resetCamera: true }
                            ].map(edit => (
                              <button
                                key={edit.label}
                                type="button"
                                onClick={() => {
                                  setPromptText(prev => prev ? `${prev}, ${edit.value}` : edit.value);
                                  if (edit.resetCamera && firstFramePreview) {
                                    setCameraMovement('none');
                                    setAngle('wide');
                                    setCamera('arri');
                                  }
                                  close();
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl bg-white/[0.01] hover:bg-rose-500/10 text-white/80 hover:text-rose-400 text-[9px] border border-white/5 hover:border-rose-500/20 transition-all flex items-center justify-between font-medium"
                              >
                                <span>{edit.label}</span>
                                {edit.resetCamera && firstFramePreview ? (
                                  <span className="text-[6.5px] text-rose-400/60 font-bold uppercase tracking-wider bg-rose-500/5 px-1.5 py-0.5 rounded border border-rose-500/10">Reset Cam</span>
                                ) : (
                                  <span className="text-[6.5px] text-gray-600 uppercase tracking-widest font-bold">Remix</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="h-px bg-white/5" />

                        {/* Standard Recipe */}
                        <div className="space-y-2">
                          <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.15em] flex items-center gap-1.5">
                            <span>✨</span> Prompt Builder Recipe
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setPromptText(prev => prev ? `${prev}, [Style] of [Subject] in [Setting] doing [Action], [Composition]` : "A [Style] of [Subject] in [Setting] doing [Action], [Composition]");
                              close();
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-[#c8f135]/10 text-white hover:text-[#c8f135] text-[9px] transition-all font-semibold border border-white/5 hover:border-[#c8f135]/20 flex items-center justify-between"
                          >
                            <span>Insert Structural Template</span>
                            <span className="text-[7px] text-gray-500 font-mono font-medium">[Style] of [Subject]...</span>
                          </button>
                        </div>

                        <div className="h-px bg-white/5" />

                        {/* Styles */}
                        <div className="space-y-2">
                          <p className="text-[8px] font-black text-[#c8f135] uppercase tracking-[0.15em] flex items-center gap-1.5">
                            <span>🎨</span> Styles & Mediums
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { label: 'Cinematic Photo', value: 'a realistic eye-level cinematic photograph, dramatic lighting' },
                              { label: 'Illustration', value: 'a modern graphical illustration, vibrant color palette' },
                              { label: 'Watercolor', value: 'a delicate watercolor painting, soft textures, dreamy aesthetic' },
                              { label: 'Retro-Futuristic', value: 'retro-futuristic cyberpunk aesthetic, synthwave colors' },
                              { label: '3D Render', value: 'unreal engine 5 photorealistic 3d render, raytraced shadows' },
                              { label: 'Abstract', value: 'an abstract conceptual design, vibrant color gradients' }
                            ].map(style => (
                              <button
                                key={style.label}
                                type="button"
                                onClick={() => {
                                  setPromptText(prev => prev ? `${prev}, ${style.value}` : style.value);
                                  close();
                                }}
                                className="text-left px-2.5 py-2 rounded-xl bg-white/[0.01] hover:bg-[#c8f135]/10 text-white/80 hover:text-[#c8f135] text-[9px] truncate border border-white/5 hover:border-[#c8f135]/20 transition-all font-medium"
                              >
                                {style.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="h-px bg-white/5" />

                        {/* Cinematic Lighting */}
                        <div className="space-y-2">
                          <p className="text-[8px] font-black text-fuchsia-400 uppercase tracking-[0.15em] flex items-center gap-1.5">
                            <span>🎬</span> Cinematic Lighting & Atmosphere
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { label: '🩸 Horror Night', value: 'horror movie lighting — single flickering overhead fluorescent, deep shadow pools, sickly green-yellow cast, 35mm film grain, blood-red practical lamp glow' },
                              { label: '🔫 80s Action', value: '1980s action blockbuster lighting — high-contrast backlighting, hazy smoke machine fill, warm tungsten glow, strong blue-orange split lighting, 80s anamorphic lens flares' },
                              { label: '🕵️ Neo-Noir', value: 'neo-noir cinematography — venetian blind shadow stripes slicing across the subject, cold blue moonlight fill, warm amber practicals, rain-slicked street reflections' },
                              { label: '🌌 Sci-Fi Cold', value: 'sci-fi cold sterile environment lighting — ice blue LED panel lights, OLED screen glow, hard rim lighting against pure black, clinical white highlights' },
                              { label: '☀️ Western', value: 'spaghetti western cinematography — harsh midday desert sunlight, extreme low-angle sun, deep eye-socket shadows, dust haze diffusion, bleached warm palette' },
                              { label: '🌫️ Thriller', value: 'psychological thriller lighting — oppressive overcast flat light, motivated practical lamp in darkness, shallow depth-of-field shallow focus, uncomfortable green-white fluorescent cast' },
                              { label: '🏙️ Gritty Crime', value: '90s crime drama cinematography — gritty available light, sodium vapor street lamps, blown-out background highlights, hand-held shaky low-light exposure' },
                              { label: '⚔️ Epic Fantasy', value: 'epic fantasy cinematography — golden hour Hero lighting, dramatic torch flame practicals, god-rays piercing through overcast storm sky, desaturated shadow tones' },
                              { label: '🌊 Muted War', value: 'war film cinematography — desaturated muted palette, oppressive overcast sky, wet mud reflections, smoke and debris haze, backlit silhouettes' },
                              { label: '🩷 Romantic', value: 'romantic drama cinematography — warm window light key, silky soft bokeh candle practicals, golden hour magic hour glow, dreamy lens diffusion filter' }
                            ].map(light => (
                              <button
                                key={light.label}
                                type="button"
                                onClick={() => {
                                  setPromptText(prev => prev ? `${prev}, ${light.value}` : light.value);
                                  close();
                                }}
                                className="text-left px-2.5 py-2 rounded-xl bg-white/[0.01] hover:bg-fuchsia-500/10 text-white/80 hover:text-fuchsia-400 text-[9px] border border-white/5 hover:border-fuchsia-500/20 transition-all font-medium"
                              >
                                {light.label}
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}
                  </UpwardDropdown>

                  {/* ENGINE DROPDOWN */}
                  <UpwardDropdown
                    icon={<Zap size={9} />}
                    label={(activeTab === 'image' ? IMAGE_ENGINES : ENGINES).find(e => e.id === activeEngine)?.label || 'Engine'}
                    badge={`${getRequiredCredits(activeEngine)} ⚡`}
                    accentColor="fuchsia"
                  >
                    {(close) => (
                      <div className="space-y-0.5">
                        {(activeTab === 'image' ? IMAGE_ENGINES : ENGINES).map((eng, i) => (
                          <motion.button
                            key={eng.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03, type: 'spring', stiffness: 400, damping: 25 }}
                            onClick={() => { setActiveEngine(eng.id); close(); }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group/eng",
                              activeEngine === eng.id
                                ? "bg-fuchsia-500/10 border border-fuchsia-500/25"
                                : "border border-transparent hover:bg-white/[0.04] hover:border-white/5"
                            )}
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 transition-all",
                              activeEngine === eng.id
                                ? "bg-fuchsia-500/20 text-fuchsia-400"
                                : "bg-white/5 text-gray-600 group-hover/eng:text-white/60"
                            )}>
                              {eng.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-[10px] font-black uppercase tracking-wider truncate",
                                activeEngine === eng.id ? "text-fuchsia-400" : "text-white/70"
                              )}>
                                {eng.label}
                              </p>
                              <p className="text-[7.5px] text-gray-600 font-medium truncate">
                                {eng.id === 'veo-3.1-generate-preview'
                                  ? `Google Standard — ${resolution === '4k' ? (generateAudio ? '80⚡/s' : '54⚡/s') : (generateAudio ? '54⚡/s' : '30⚡/s')}`
                                  : eng.id === 'veo-3.1-fast-generate-preview'
                                  ? `Google Fast — ${resolution === '4k' ? (generateAudio ? '38⚡/s' : '31⚡/s') : resolution === '1080p' ? (generateAudio ? '15⚡/s' : '12⚡/s') : (generateAudio ? '12⚡/s' : '10⚡/s')}`
                                  : eng.id === 'veo-3.1-lite-generate-preview'
                                  ? `Google Lite — ${resolution === '4k' || resolution === '1080p' ? (generateAudio ? '10⚡/s' : '6⚡/s') : (generateAudio ? '6⚡/s' : '4⚡/s')}`
                                  : eng.id === 'seedance-fast'
                                  ? `ByteDance — ${resolution === '480p' ? '15⚡/s' : '25⚡/s'} (${resolution === '480p' ? '480p' : '720p'})`
                                  : eng.id === 'seedace'
                                  ? `ByteDance — ${resolution === '4k' ? '140⚡/s' : resolution === '1080p' ? '70⚡/s' : resolution === '480p' ? '15⚡/s' : '30⚡/s'} (${resolution})`
                                  : eng.id === 'seedance-mini'
                                  ? `ByteDance — ${resolution === '480p' ? '10⚡/s' : '15⚡/s'} (${resolution === '480p' ? '480p' : '720p'})`
                                  : eng.desc}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={cn(
                                "text-[7px] font-black px-1.5 py-0.5 rounded-md border",
                                activeEngine === eng.id
                                  ? "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400"
                                  : "bg-white/5 border-white/5 text-gray-600"
                              )}>
                                {getRequiredCredits(eng.id)} ⚡
                              </span>
                              {activeEngine === eng.id && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-4 h-4 rounded-full bg-fuchsia-500 flex items-center justify-center"
                                >
                                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </motion.div>
                              )}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </UpwardDropdown>

                  {/* ASPECT RATIO DROPDOWN */}
                  <UpwardDropdown
                    icon={<Ratio size={9} />}
                    label={aspectRatio}
                    accentColor="lime"
                  >
                    {(close) => (
                      <div className="space-y-0.5">
                        {ASPECT_OPTIONS.map((opt, i) => (
                          <motion.button
                            key={opt.value}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 25 }}
                            onClick={() => { setAspectRatio(opt.value); close(); }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                              aspectRatio === opt.value
                                ? "bg-[#c8f135]/10 border border-[#c8f135]/25"
                                : "border border-transparent hover:bg-white/[0.04] hover:border-white/5"
                            )}
                          >
                            {/* Aspect visual */}
                            <div className={cn(
                              "rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                              aspectRatio === opt.value ? "border-[#c8f135]" : "border-gray-700"
                            )}
                              style={{ width: opt.w, height: opt.h }}
                            >
                              <span className={cn(
                                "text-[6px] font-black",
                                aspectRatio === opt.value ? "text-[#c8f135]" : "text-gray-700"
                              )}>{opt.value}</span>
                            </div>
                            <div className="flex-1">
                              <p className={cn(
                                "text-[10px] font-black uppercase tracking-wider",
                                aspectRatio === opt.value ? "text-[#c8f135]" : "text-white/70"
                              )}>{opt.label}</p>
                              <p className="text-[7.5px] text-gray-600">{opt.desc}</p>
                            </div>
                            {aspectRatio === opt.value && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-[#c8f135] flex items-center justify-center shrink-0">
                                <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </motion.div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </UpwardDropdown>

                  {/* RESOLUTION DROPDOWN */}
                  <UpwardDropdown
                    icon={<Tv size={9} />}
                    label={activeTab === 'video' ? (resolution === '480p' ? '480p' : resolution === '720p' ? '720p' : resolution === '1080p' ? '1080p' : resolution === '4k' ? '4K' : resolution) : (resolution === '480p' ? 'SD' : resolution === '720p' ? '1K' : resolution === '1080p' ? '2K' : resolution === '4k' ? '4K' : resolution)}
                    accentColor="lime"
                  >
                    {(close) => (
                      <div className="space-y-0.5 w-48">
                        {RESOLUTION_OPTIONS.filter(opt => {
                          const isSeedance = activeEngine === 'seedance-fast' || activeEngine === 'seedace' || activeEngine === 'seedance-mini';
                          const no4k = activeEngine === 'seedance-fast' || activeEngine === 'seedance-mini' || activeEngine === 'omni-flash' || activeEngine === 'kling/v3-turbo-image-to-video';
                          if (opt.value === '480p' && !isSeedance) return false;
                          if (no4k && opt.value === '4k') return false;
                          return true;
                        }).map((opt, i) => {
                          const displayLabel = activeTab === 'video'
                            ? (opt.value === '480p' ? '480p SD' : opt.value === '720p' ? '720p HD' : opt.value === '1080p' ? '1080p Full HD' : '4K Ultra HD')
                            : (opt.value === '480p' ? 'SD' : opt.value === '720p' ? '1K' : opt.value === '1080p' ? '2K' : opt.value === '4k' ? '4K' : opt.label);
                          const displayDesc = activeTab === 'video'
                            ? (opt.value === '480p' ? 'Standard definition (480p)' : opt.value === '720p' ? 'High definition video (720p)' : opt.value === '1080p' ? 'Full HD video (1080p)' : 'Ultra HD video (4K)')
                            : (opt.value === '480p' ? 'Standard definition' : opt.value === '720p' ? 'Standard resolution (1K)' : opt.value === '1080p' ? 'High resolution (2K)' : 'Ultra-high definition (4K)');

                          return (
                            <motion.button
                              key={opt.value}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 25 }}
                              onClick={() => { setResolution(opt.value); close(); }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                                resolution === opt.value
                                  ? "bg-[#c8f135]/10 border border-[#c8f135]/25"
                                  : "border border-transparent hover:bg-white/[0.04] hover:border-white/5"
                              )}
                            >
                              <div className="flex-1">
                                <p className={cn(
                                  "text-[10px] font-black uppercase tracking-wider",
                                  resolution === opt.value ? "text-[#c8f135]" : "text-white/70"
                                )}>{displayLabel}</p>
                                <p className="text-[7.5px] text-gray-600">{displayDesc}</p>
                              </div>
                              {resolution === opt.value && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-[#c8f135] flex items-center justify-center shrink-0">
                                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </motion.div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </UpwardDropdown>

                  {/* VARIATIONS DROPDOWN */}
                  <UpwardDropdown
                    icon={<ImageIcon size={9} />}
                    label={`${variationCount} Var`}
                    accentColor="lime"
                  >
                    {(close) => (
                      <div className="space-y-0.5">
                        {VARIATIONS_OPTIONS.map((opt, i) => (
                          <motion.button
                            key={opt.value}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 25 }}
                            onClick={() => { setVariationCount(opt.value); close(); }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                              variationCount === opt.value
                                ? "bg-[#c8f135]/10 border border-[#c8f135]/25"
                                : "border border-transparent hover:bg-white/[0.04] hover:border-white/5"
                            )}
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 transition-all border",
                              variationCount === opt.value ? "border-[#c8f135] text-[#c8f135]" : "border-gray-700 text-gray-400"
                            )}>
                              {opt.value}
                            </div>
                            <div className="flex-1">
                              <p className={cn(
                                "text-[10px] font-black uppercase tracking-wider",
                                variationCount === opt.value ? "text-[#c8f135]" : "text-white/70"
                              )}>{opt.label}</p>
                              <p className="text-[7.5px] text-gray-600">{opt.desc}</p>
                            </div>
                            {variationCount === opt.value && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-[#c8f135] flex items-center justify-center shrink-0">
                                <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </motion.div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </UpwardDropdown>

                  {/* DURATION DROPDOWN (Video only) */}
                  {activeTab === 'video' && (
                    <UpwardDropdown
                      icon={<Clock size={9} />}
                      label={`${duration}s`}
                      accentColor="cyan"
                    >
                      {(close) => (
                        <div className="space-y-0.5">
                          {(() => {
                            const isOmniEngine = activeEngine === 'omni' || activeEngine === 'omni-flash';
                            const isVeo3 = activeEngine.startsWith('veo-3.1');
                            const isSeedance = activeEngine === 'seedance-fast' || activeEngine === 'seedace' || activeEngine === 'seedance-mini';
                            const currentDurationOptions = isOmniEngine
                              ? OMNI_DURATION_OPTIONS
                              : (isVeo3 ? VEO_DURATION_OPTIONS : (isSeedance ? SEEDANCE_DURATION_OPTIONS : DURATION_OPTIONS));
                            const maxOptValue = Math.max(...currentDurationOptions.map(o => o.value));

                            return currentDurationOptions.map((opt, i) => (
                              <motion.button
                                key={opt.value}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05, type: 'spring', stiffness: 350, damping: 22 }}
                                onClick={() => { setDuration(opt.value); close(); }}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                                  duration === opt.value
                                    ? "bg-cyan-500/10 border border-cyan-500/25"
                                    : "border border-transparent hover:bg-white/[0.04] hover:border-white/5"
                                )}
                              >
                                {/* Duration bar visual */}
                                <div className="w-10 h-2 bg-white/5 rounded-full overflow-hidden shrink-0">
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: duration === opt.value ? '#22d3ee' : '#333' }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(opt.value / maxOptValue) * 100}%` }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 20, delay: i * 0.05 }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <p className={cn(
                                    "text-[10px] font-black uppercase tracking-wider",
                                    duration === opt.value ? "text-cyan-400" : "text-white/70"
                                  )}>{opt.label}</p>
                                  <p className="text-[7.5px] text-gray-600">{opt.desc}</p>
                                </div>
                                {duration === opt.value && (
                                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center shrink-0">
                                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </motion.div>
                                )}
                              </motion.button>
                            ));
                          })()}
                        </div>
                      )}
                    </UpwardDropdown>
                  )}

                  {/* AUDIO TOGGLE (Video only, Seedance & Veo 3.1 engines) */}
                  {activeTab === 'video' && (activeEngine === 'seedance-fast' || activeEngine === 'seedace' || activeEngine === 'seedance-mini' || activeEngine.startsWith('veo-3.1') || activeEngine === 'omni' || activeEngine === 'omni-flash') && (
                    <button
                      type="button"
                      onClick={() => setGenerateAudio(!generateAudio)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest border transition-all shrink-0 select-none",
                        generateAudio
                          ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                          : "bg-black/60 border-white/10 text-gray-500 hover:text-white"
                      )}
                      title={activeEngine.startsWith('veo-3.1') ? "Generate synchronized audio with Google Veo 3.1" : (activeEngine.startsWith('omni') ? "Generate synchronized audio with Gemini Omni" : "Generate synchronized audio with Seedance 2.0")}
                    >
                      <span className="text-[10px]">{generateAudio ? '🔊' : '🔇'}</span>
                    </button>
                  )}

                  {/* BYPASS CAMERA TOGGLE */}
                  <button
                    type="button"
                    onClick={() => setUseCameraSettings(!useCameraSettings)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest border transition-all shrink-0 select-none",
                      useCameraSettings
                        ? "bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-400"
                        : "bg-black/60 border-white/10 text-gray-500 hover:text-white"
                    )}
                    title={useCameraSettings ? "Adding Camera Instructions to Prompt" : "Bypassing Camera Instructions"}
                  >
                    <span className="text-[10px]">{useCameraSettings ? '🎥 ON' : '🎥 OFF'}</span>
                  </button>
                  





                </div>

                {/* Preview Payload Button (Image mode only) */}
                {activeTab === 'image' && (
                  <motion.button
                    type="button"
                    onClick={() => setShowPayloadModal(true)}
                    disabled={!(promptText.trim() || firstFramePreview)}
                    whileHover={(promptText.trim() || firstFramePreview) ? { scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.08)' } : {}}
                    whileTap={(promptText.trim() || firstFramePreview) ? { scale: 0.95 } : {}}
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center border transition-all shrink-0",
                      (promptText.trim() || firstFramePreview)
                        ? "border-white/10 text-white/60 hover:text-white cursor-pointer bg-white/[0.02]"
                        : "border-white/5 text-white/10 cursor-not-allowed bg-transparent"
                    )}
                    title="Preview exact API Payload & Compiled Prompt"
                  >
                    <Eye size={13} />
                  </motion.button>
                )}

                {/* Generate Button — CSS pulse replaces framer-motion infinite loop (GPU-friendly) */}
                <motion.button
                  onClick={() => handleGenerate()}
                  disabled={isBusy}
                  whileHover={canGenerate ? { scale: 1.02, backgroundColor: '#d5fb3b' } : {}}
                  whileTap={canGenerate ? { scale: 0.97 } : {}}
                  className={cn(
                    "px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0 text-[10px] font-black uppercase tracking-widest shadow-lg",
                    canGenerate
                      ? "bg-[#c8f135] text-black cursor-pointer generate-btn-pulse"
                      : "bg-zinc-900 border border-white/5 text-white/15 cursor-not-allowed"
                  )}
                  title={
                    isBusy 
                      ? "Video generation in progress..." 
                      : userCredits < requiredCredits 
                      ? `Insufficient Shorts credits: Requires ${requiredCredits}⚡ (Balance: ${userCredits}⚡)` 
                      : (!activePromptText.trim() && !activeFirstFramePreview && !hasRefBoardMedia) 
                      ? "Enter prompt text or tag reference items to generate" 
                      : `Generate (${requiredCredits} credits)`
                  }
                >
                  {isBusy ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 size={11} className="animate-spin" />
                      <span>Generating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={11} className="fill-current" />
                      <span>Generate</span>
                      <span className="opacity-40">|</span>
                      <span className="font-mono text-[9px]">{requiredCredits}⚡</span>
                    </div>
                  )}
                </motion.button>
              </div>

            </div>

          </div>
        </div>
      </div>


      {/* ── IMMERSIVE STUDIO LIGHTBOX MODAL ── */}
      <AnimatePresence>
        {lightboxItem && (
          <CinematicLightbox
            lightboxItem={lightboxItem}
            setLightboxItem={setLightboxItem}
            setGallery={setGallery}
            handleUpscale={handleUpscale}
            handleGenerateAnglesGrid={handleGenerateAnglesGrid}
            handleDownload={handleDownload}
            handleDeleteItem={handleDeleteItem}
            setShowInpaint={setShowInpaint}
            setShowStoryboard={setShowStoryboard}
            upscalingItems={upscalingItems}
            setUpscalingItems={setUpscalingItems}
            setFirstFrameImage={setFirstFrameImage}
            setFirstFramePreview={setFirstFramePreview}
            setLastFrameImage={setLastFrameImage}
            setLastFramePreview={setLastFramePreview}
            userId={userId}
          />
        )}
      </AnimatePresence>

      {/* REFERENCE PANEL MODAL */}
      <ReferencePanel
        showRefBoard={showRefBoard}
        setShowRefBoard={setShowRefBoard}
        stagedRefBoard={stagedRefBoard}
        setStagedRefBoard={setStagedRefBoard}
        removeRefItem={removeRefItem}
        handleSaveRefBoard={handleSaveRefBoard}
        handleCancelRefBoard={handleCancelRefBoard}
        refUploadInputRef={refUploadInputRef}
        handleRefUpload={handleRefUpload}
        showLibPicker={showLibPicker}
        setShowLibPicker={setShowLibPicker}
        libPickerTarget={libPickerTarget}
        setLibPickerTarget={setLibPickerTarget}
        addRefItem={addRefItem}
        setActiveRefUploadCategory={setActiveRefUploadCategory}
        isSeedance={isExtendedRefBoard}
        isOmni={isOmni}
        seedanceRefs={seedanceRefs}
        onSeedanceRefUpload={handleSeedanceRefUpload}
        onRemoveSeedanceRef={handleRemoveSeedanceRef}
      />

      {/* VERTEX & OMNI STUDIO SIDE PANEL */}
      <SidePanel
        isOpen={showSidePanel}
        onClose={() => setShowSidePanel(false)}
        activeEngine={activeEngine}
        setActiveEngine={setActiveEngine}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        panelTab={panelTab}
        setPanelTab={setPanelTab}
        firstFrameImage={firstFrameImage}
        firstFramePreview={firstFramePreview}
        lastFrameImage={lastFrameImage}
        lastFramePreview={lastFramePreview}
        setFirstFrameImage={setFirstFrameImage}
        setFirstFramePreview={setFirstFramePreview}
        setLastFrameImage={setLastFrameImage}
        setLastFramePreview={setLastFramePreview}
        omniFirstFrameImage={omniFirstFrameImage}
        omniFirstFramePreview={omniFirstFramePreview}
        omniLastFrameImage={omniLastFrameImage}
        omniLastFramePreview={omniLastFramePreview}
        omniRefImages={omniRefImages}
        omniRefPreviews={omniRefPreviews}
        setOmniRefImages={setOmniRefImages}
        setOmniRefPreviews={setOmniRefPreviews}
        setOmniFirstFrameImage={setOmniFirstFrameImage}
        setOmniFirstFramePreview={setOmniFirstFramePreview}
        setOmniLastFrameImage={setOmniLastFrameImage}
        setOmniLastFramePreview={setOmniLastFramePreview}
        omniRefVideoPreview={omniRefVideoPreview}
        setOmniRefVideoPreview={setOmniRefVideoPreview}
        omniRefVideoDuration={omniRefVideoDuration}
        setOmniRefVideoDuration={setOmniRefVideoDuration}
        handleFileUpload={handleFileUpload}
        setUploadTarget={setUploadTarget}
        handleClearRef={handleClearRef}
        fileInputRef={fileInputRef}
        duration={duration}
        setDuration={setDuration}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        resolution={resolution}
        setResolution={setResolution}
        generateAudio={generateAudio}
        setGenerateAudio={setGenerateAudio}
        omniTask={omniTask}
        setOmniTask={setOmniTask}
        showRefBoard={showRefBoard}
        setShowRefBoard={setShowRefBoard}
        promptText={panelTab === 'omni' ? omniPromptText : promptText}
        setPromptText={panelTab === 'omni' ? setOmniPromptText : setPromptText}
        omniPromptText={omniPromptText}
        setOmniPromptText={setOmniPromptText}
        handleGenerate={handleGenerate}
        isBusy={isBusy}
        userCredits={userCredits}
        requiredCredits={requiredCredits}
        canGenerate={canGenerate}
        allRefItems={allRefItems}
      />

      {/* PERSPECTIVE & FRAMING VISUAL MODAL */}
      {showAnglesModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div onClick={() => setShowAnglesModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="relative w-full max-w-3xl bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h3 className="text-[11px] font-black text-white flex items-center gap-1.5 uppercase tracking-widest"><Camera className="w-3 h-3 text-[#c8f135]" /> Perspective & Framing</h3>
              <button onClick={() => setShowAnglesModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={13} className="text-gray-400" /></button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 p-3 gap-2 overflow-y-auto max-h-[55vh] custom-scrollbar">
              {CAMERA_ANGLES.map(opt => (
                <div key={opt.id}
                  className={cn("group relative flex flex-col bg-white/5 border rounded-xl overflow-hidden transition-all hover:border-[#c8f135]/40 hover:bg-white/10",
                    angle === opt.id ? "border-[#c8f135] bg-white/10 shadow-[0_0_12px_rgba(200,241,53,0.12)]" : "border-white/5")}
                >
                  <button onClick={() => { setAngle(opt.id); setShowAnglesModal(false); }} className="w-full aspect-video bg-black/40 flex items-center justify-center relative overflow-hidden">
                    {(opt.image_url || opt.img) ? <img src={opt.image_url || opt.img} loading="lazy" className={cn("w-full h-full object-cover transition-transform duration-700", angle === opt.id ? "scale-110" : "group-hover:scale-105")} alt={opt.label} /> : <Camera className="w-4 h-4 text-white/10" />}
                    {angle === opt.id && <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-[#c8f135] flex items-center justify-center"><Zap className="w-1.5 h-1.5 text-black" /></div>}
                  </button>
                  <div className="px-1.5 py-1"><div className="text-[7.5px] font-black text-white uppercase tracking-wider truncate">{opt.label}</div><div className="text-[6px] text-white/25 truncate uppercase mt-0.5">{opt.description || opt.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INPAINT CANVAS EDITOR */}
      {showInpaint && lightboxItem && (
        <InpaintEditor
          imageUrl={lightboxItem.url}
          userId={userId}
          onClose={() => setShowInpaint(false)}
          onDone={handleInpaintDone}
        />
      )}

      {/* STORYBOARD EDITOR */}
      {showStoryboard && lightboxItem && (
        <StoryboardEditor
          lightboxItem={lightboxItem}
          userId={userId}
          onClose={() => setShowStoryboard(false)}
          setGallery={setGallery}
          setLightboxItem={setLightboxItem}
        />
      )}

      {/* PAYLOAD PREVIEW MODAL */}
      {showPayloadModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div onClick={() => setShowPayloadModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="relative w-full max-w-2xl bg-[#0a0a0a]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-[130]">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <h3 className="text-[10px] font-black text-white flex items-center gap-1.5 uppercase tracking-widest">
                <Eye className="w-3.5 h-3.5 text-[#c8f135]" /> API Payload & Prompt Developer Console
              </h3>
              <button onClick={() => setShowPayloadModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X size={14} className="text-gray-400" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar space-y-4 flex-1">
              {/* Note */}
              <div className="p-2.5 bg-[#c8f135]/5 border border-[#c8f135]/15 rounded-xl text-[9px] leading-relaxed text-white/70">
                <span className="font-black text-[#c8f135] uppercase tracking-wider block mb-0.5">ℹ Prompt Architecture</span>
                This panel displays the compiled, multi-layered prompt generated dynamically by combining your core scenario description with advanced lens optics, cinematic compositions, animation curves, and tagged visual library elements.
              </div>

              {/* SECTION 1: Compiled prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Compiled Prompt</h4>
                  <button
                    onClick={() => handleCopyText(getCompiledPrompt(), 'prompt')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#c8f135]/15 border border-[#c8f135]/25 text-[8px] font-black uppercase text-[#c8f135] hover:bg-[#c8f135]/25 transition-all"
                  >
                    {copiedPrompt ? "Copied!" : "Copy Prompt"}
                  </button>
                </div>
                <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-[10px] text-white/80 font-mono whitespace-pre-wrap leading-relaxed select-all">
                  {getCompiledPrompt() || <span className="text-white/20 italic">No prompt entered yet...</span>}
                </div>
              </div>

              {/* SECTION 2: Full JSON Payload */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Raw API Request Payload</h4>
                  <button
                    onClick={() => handleCopyText(JSON.stringify(getCompiledPayload(), null, 2), 'payload')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-fuchsia-500/15 border border-fuchsia-500/25 text-[8px] font-black uppercase text-fuchsia-400 hover:bg-fuchsia-500/25 transition-all"
                  >
                    {copiedPayload ? "Copied!" : "Copy JSON Payload"}
                  </button>
                </div>
                <pre className="p-3 bg-black/70 border border-white/5 rounded-xl text-[9px] font-mono text-fuchsia-400/90 overflow-x-auto leading-relaxed custom-scrollbar max-h-[30vh]">
                  {JSON.stringify(getCompiledPayload(), null, 2)}
                </pre>
              </div>
            </div>

            <div className="px-4 py-3 bg-white/[0.01] border-t border-white/5 flex justify-end">
              <button
                onClick={() => setShowPayloadModal(false)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all text-white"
              >
                Close Developer Console
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PENDING REF UPLOAD MODAL */}
      {pendingRefUpload && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div onClick={() => setPendingRefUpload(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-[160] flex flex-col p-5">
            <h3 className="text-[12px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#c8f135]" /> Configure Reference
            </h3>
            
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-center bg-black/50 border border-white/5 rounded-2xl h-40 overflow-hidden relative shadow-inner">
                <img src={pendingRefUpload.previewUrl} className="h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-2 left-3 text-[8px] font-black uppercase text-white/50 tracking-widest">Preview</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[#c8f135] uppercase tracking-widest block pl-1">Reference Name (e.g. riya)</label>
                <input 
                  type="text" 
                  id="pendingRefName"
                  placeholder="Enter a unique name..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-[11px] font-bold outline-none focus:border-[#c8f135] focus:bg-white/[0.05] transition-all"
                  autoFocus
                />
              </div>



              <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-white/5">
                <button 
                  onClick={() => setPendingRefUpload(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const nameInput = document.getElementById('pendingRefName');
                    const catInput = document.getElementById('pendingRefCategory');
                    const name = nameInput ? nameInput.value : '';
                    const cat = catInput ? catInput.value : pendingRefUpload.defaultCategory;
                    processPendingRefUpload(name, cat);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#c8f135] text-black font-black text-[10px] uppercase tracking-widest hover:bg-[#bce628] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#c8f135]/20 flex items-center gap-1.5"
                >
                  <Upload size={12} /> Confirm Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW PROJECT CREATION MODAL */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4">
          <div onClick={() => setShowNewProjectModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="relative w-full max-w-sm bg-[#08080c]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col z-[50001]">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-white flex items-center gap-1.5 uppercase tracking-widest">
                <Clapperboard className="w-3.5 h-3.5 text-[#c8f135]" /> Create New Project
              </h3>
              <button onClick={() => setShowNewProjectModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X size={14} className="text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Neon Tokyo Runner..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-[11px] font-bold outline-none focus:border-[#c8f135] focus:bg-white/[0.05] transition-all"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newProjectName.trim()) {
                      const name = newProjectName.trim();
                      const newProj = { id: 'proj_' + Date.now(), name };
                      setProjects(prev => [...prev, newProj]);
                      setActiveProjectId(newProj.id);
                      setShowNewProjectModal(false);
                    }
                  }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newProjectName.trim()}
                  onClick={() => {
                    if (newProjectName.trim()) {
                      const name = newProjectName.trim();
                      const newProj = { id: 'proj_' + Date.now(), name };
                      setProjects(prev => [...prev, newProj]);
                      setActiveProjectId(newProj.id);
                      setShowNewProjectModal(false);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-[#c8f135] disabled:bg-zinc-800 disabled:text-white/20 text-black font-black text-[9px] uppercase tracking-widest hover:bg-[#bce628] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#c8f135]/20 flex items-center gap-1"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

