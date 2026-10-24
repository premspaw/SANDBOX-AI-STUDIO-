import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Download,
  Music,
  Check,
  Upload,
  Layers,
  FileCode,
  Volume2,
  VolumeX,
  Radio,
} from 'lucide-react';

const DEFAULT_ARGON_MANIFEST = {
  totalDuration: 39.6,
  edlSegments: [
    { idx: 0, editStart: 0.0, editEnd: 4.3, rawStart: 1.0, rawEnd: 5.3, layout: 'TOP_BOTTOM_50', zoom: 1.08 },
    { idx: 1, editStart: 4.3, editEnd: 9.9, rawStart: 7.0, rawEnd: 12.6, layout: 'SIDE_BY_SIDE_50', zoom: 1.18 },
    { idx: 2, editStart: 9.9, editEnd: 13.6, rawStart: 12.8, rawEnd: 16.5, layout: 'TOP_BOTTOM_50', zoom: 1.1 },
    { idx: 3, editStart: 13.6, editEnd: 24.7, rawStart: 17.3, rawEnd: 28.4, layout: 'TOP_BOTTOM_50', zoom: 1.15 },
    { idx: 4, editStart: 24.7, editEnd: 33.6, rawStart: 31.8, rawEnd: 40.7, layout: 'TOP_BOTTOM_50', zoom: 1.12 },
    { idx: 5, editStart: 33.6, editEnd: 39.6, rawStart: 42.3, rawEnd: 42.3, layout: 'APPENDED_FULL_ANIMATION', zoom: 1.0 },
  ],
  scenes: [
    {
      segIdx: 0,
      template: 'CONCEPT_HOOK',
      title: 'PHOTOSYNTHESIS',
      subtitle: '☀️ Sunlight → 🌱 Plant Food',
      badgeText: '☀️',
      accentColor: '#065f46',
      items: [],
    },
    {
      segIdx: 1,
      template: 'ANALOGY_CARD',
      title: 'SOLAR',
      subtitle: 'KITCHEN',
      badgeText: '3 INGREDIENTS',
      accentColor: '#10b981',
      items: [],
    },
    {
      segIdx: 2,
      template: 'WHEEL_LIST',
      title: '3 Core Inputs',
      subtitle: '',
      badgeText: '',
      accentColor: '#0f172a',
      items: [
        { label: '1. Sunlight ☀️', sublabel: '', color: '#d97706' },
        { label: '2. Water (H₂O) 💧', sublabel: '', color: '#0284c7' },
        { label: '3. Carbon Dioxide 🌬️', sublabel: '', color: '#059669' },
      ],
    },
    {
      segIdx: 3,
      template: 'ORBIT_ENGINE',
      title: 'CHLOROPHYLL ENGINE',
      subtitle: '⚡ TRAPPING SUNLIGHT ENERGY ⚡',
      badgeText: '',
      accentColor: '#10b981',
      items: [
        { label: 'H₂O', sublabel: '', color: '#0284c7' },
        { label: 'CO₂', sublabel: '', color: '#334155' },
      ],
    },
    {
      segIdx: 4,
      template: 'DUAL_CARDS',
      title: 'Outputs',
      subtitle: '',
      badgeText: '',
      accentColor: '#10b981',
      items: [
        { label: '1. SUGAR', sublabel: 'Plant Food 🌱', color: '#eab308' },
        { label: '2. OXYGEN', sublabel: 'Clean Air 🌍', color: '#10b981' },
      ],
    },
    {
      segIdx: 5,
      template: 'COSMIC_FINALE',
      title: 'Photosynthesis',
      subtitle: '☀️ Sunlight + 💧 H₂O + 🌬️ CO₂',
      badgeText: '= 🌱 Sugar + 🌍 Oxygen',
      accentColor: '#10b981',
      items: [],
    },
  ],
  captions: [
    { start: 0.0, end: 2.1, words: ['Photosynthesis', 'is', 'how', 'plants'] },
    { start: 2.1, end: 4.3, words: ['make', 'their', 'own', 'food', 'using', 'sunlight.'] },
    { start: 4.3, end: 7.0, words: ['Think', 'of', 'plant', 'leaves', 'like', 'a', 'tiny'] },
    { start: 7.0, end: 9.9, words: ['solar-powered', 'kitchen', 'with', '3', 'ingredients:'] },
    { start: 9.9, end: 13.6, words: ['Sunlight,', 'Water,', 'and', 'Carbon', 'Dioxide.'] },
    { start: 13.6, end: 17.1, words: ['Inside', 'the', 'leaves,', 'a', 'green', 'pigment'] },
    { start: 17.1, end: 20.5, words: ['called', 'Chlorophyll', 'traps', 'sunlight', 'energy'] },
    { start: 20.5, end: 23.3, words: ['to', 'mix', 'water', 'and', 'CO₂', 'together,'] },
    { start: 23.3, end: 24.7, words: ['creating', 'two', 'things:'] },
    { start: 24.7, end: 27.9, words: ['Sugar', '(food', 'the', 'plant', 'eats', 'to', 'grow)'] },
    { start: 27.9, end: 31.0, words: ['and', 'Oxygen:', 'clean', 'air', 'released'] },
    { start: 31.0, end: 33.6, words: ['for', 'humans', '&', 'animals', 'to', 'breathe!'] },
    { start: 33.6, end: 36.6, words: ['6CO₂', '+', '6H₂O', '+', 'Sunlight', '→'] },
    { start: 36.6, end: 39.6, words: ['Glucose', 'Sugar', '🌱', '+', 'Pure', 'Oxygen', '🌍'] },
  ],
  sfxEvents: [
    { time: 0.05, type: 'POP', intensity: 0.8 },
    { time: 4.3, type: 'WHOOSH', intensity: 0.9 },
    { time: 4.45, type: 'POP', intensity: 0.7 },
    { time: 9.9, type: 'WHOOSH', intensity: 0.85 },
    { time: 9.95, type: 'DING', intensity: 0.75 },
    { time: 11.05, type: 'DING', intensity: 0.75 },
    { time: 12.2, type: 'DING', intensity: 0.85 },
    { time: 13.6, type: 'WHOOSH', intensity: 0.9 },
    { time: 24.7, type: 'WHOOSH', intensity: 0.85 },
    { time: 24.75, type: 'POP', intensity: 0.9 },
    { time: 27.9, type: 'POP', intensity: 0.9 },
    { time: 28.0, type: 'DING', intensity: 0.8 },
    { time: 33.0, type: 'RISER', intensity: 0.85 },
    { time: 33.6, type: 'SUCCESS_CHORD', intensity: 0.9 },
  ],
};

const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const easeOutBack = (x) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export function ZeroLensArgonEditPanel({ defaultVideoUrl = null }) {
  const [manifest, setManifest] = useState(DEFAULT_ARGON_MANIFEST);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(DEFAULT_ARGON_MANIFEST, null, 2));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Ready • Default Photosynthesis Manifest loaded');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [videoSrc, setVideoSrc] = useState(defaultVideoUrl);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const rawFileRef = useRef(null);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const lastSegIndexRef = useRef(-1);
  const firedSfxRef = useRef(new Set());

  // Web Audio Graph Refs
  const audioCtxRef = useRef(null);
  const masterBusRef = useRef(null);
  const bgmGainRef = useRef(null);
  const exportAudioDestRef = useRef(null);
  const videoNodeRef = useRef(null);

  const ensureAudioGraph = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const master = ctx.createGain();
      master.gain.value = 1.0;
      masterBusRef.current = master;

      const bgmGain = ctx.createGain();
      bgmGain.gain.setValueAtTime(0.16, ctx.currentTime);
      bgmGain.connect(master);
      bgmGainRef.current = bgmGain;

      // Ambient Drone BGM
      try {
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(110, ctx.currentTime);

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(164.81, ctx.currentTime);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(420, ctx.currentTime);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(bgmGain);

        osc1.start();
        osc2.start();
      } catch (err) {
        console.warn('BGM oscillator init error:', err);
      }

      const dest = ctx.createMediaStreamDestination();
      exportAudioDestRef.current = dest;

      master.connect(ctx.destination);
      master.connect(dest);
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    if (!videoNodeRef.current && videoRef.current) {
      try {
        const vNode = audioCtxRef.current.createMediaElementSource(videoRef.current);
        vNode.connect(masterBusRef.current);
        videoNodeRef.current = vNode;
      } catch (err) {
        console.warn('Media element source init error:', err);
      }
    }
  };

  const updateBgmDucking = (isFinale) => {
    if (!bgmGainRef.current || !audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;
    if (!bgmEnabled) {
      bgmGainRef.current.gain.setTargetAtTime(0, now, 0.1);
      return;
    }
    const target = isFinale ? 0.72 : 0.16;
    bgmGainRef.current.gain.setTargetAtTime(target, now, 0.25);
  };

  const triggerProceduralSFX = (type, intensity = 0.8) => {
    ensureAudioGraph();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = masterBusRef.current;

    if (type === 'POP') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.09);
      gain.gain.setValueAtTime(0.35 * intensity, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.095);
    } else if (type === 'DING') {
      [1046.5, 2093.0].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime((i === 0 ? 0.25 : 0.12) * intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + 0.46);
      });
    } else if (type === 'WHOOSH') {
      const bufferSize = ctx.sampleRate * 0.28;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 2.2;
      filter.frequency.setValueAtTime(280, now);
      filter.frequency.exponentialRampToValueAtTime(2200, now + 0.14);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.28);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.38 * intensity, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      noise.start(now);
      noise.stop(now + 0.29);
    } else if (type === 'RISER') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.58);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.22 * intensity, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.61);
    } else if (type === 'SUCCESS_CHORD') {
      [261.63, 329.63, 392.0, 523.25, 659.25].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.12 * intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + 1.85);
      });
    }
  };

  const mapEditedTimeToRaw = (editTime) => {
    const segs = manifest.edlSegments;
    const seg = segs.find((s) => editTime >= s.editStart && editTime < s.editEnd) || segs[segs.length - 1];
    const offset = editTime - seg.editStart;
    return { rawTime: Math.min(seg.rawEnd, seg.rawStart + offset), seg };
  };

  const drawScene = (ctx, t, seg) => {
    const scene = manifest.scenes.find((s) => s.segIdx === seg.idx) || manifest.scenes[0];
    if (!scene) return;
    const localT = t - seg.editStart;
    ctx.save();

    if (scene.template === 'CONCEPT_HOOK') {
      ctx.beginPath();
      ctx.rect(0, 960, 1080, 960);
      ctx.clip();
      const bg = ctx.createLinearGradient(0, 960, 0, 1920);
      bg.addColorStop(0, '#fef9c3');
      bg.addColorStop(1, '#bbf7d0');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 960, 1080, 960);

      const pop = easeOutBack(clamp(localT / 0.55));
      ctx.translate(540, 1460);
      ctx.scale(pop, pop);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, -195, 95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-430, -80, 860, 340, 28);
      ctx.fill();
      ctx.fillStyle = scene.accentColor || '#065f46';
      ctx.font = '900 68px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(scene.title, 0, 35);
      ctx.fillStyle = '#15803d';
      ctx.font = '700 38px Inter, sans-serif';
      ctx.fillText(scene.subtitle, 0, 125);
    } else if (scene.template === 'ANALOGY_CARD') {
      ctx.beginPath();
      ctx.rect(540, 0, 540, 1920);
      ctx.clip();
      const bg = ctx.createLinearGradient(540, 0, 540, 1920);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(1, '#064e3b');
      ctx.fillStyle = bg;
      ctx.fillRect(540, 0, 540, 1920);

      const pop = easeOutBack(clamp(localT / 0.55));
      ctx.translate(810, 960);
      ctx.scale(pop, pop);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.roundRect(-230, -500, 460, 1000, 30);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 54px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(scene.title, 0, -310);
      ctx.fillText(scene.subtitle, 0, -245);

      ctx.save();
      ctx.rotate(Math.sin(localT * 4) * 0.08);
      ctx.fillStyle = scene.accentColor || '#10b981';
      ctx.beginPath();
      ctx.ellipse(0, 0, 150, 95, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(-185, 230, 370, 110, 22);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 36px Inter, sans-serif';
      ctx.fillText(scene.badgeText || 'KEY ANALOGY', 0, 298);
    } else if (scene.template === 'WHEEL_LIST') {
      ctx.beginPath();
      ctx.rect(0, 960, 1080, 960);
      ctx.clip();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 960, 1080, 960);
      const items = scene.items || [];
      const stepDur = (seg.editEnd - seg.editStart) / Math.max(1, items.length);
      const activeIdx = Math.min(items.length - 1, Math.floor(localT / stepDur));
      ctx.font = '900 68px Inter, sans-serif';
      ctx.textAlign = 'left';
      items.forEach((it, idx) => {
        const isCurrent = idx === activeIdx;
        const y = 1360 + (idx - activeIdx) * 145;
        ctx.fillStyle = isCurrent ? it.color || '#0284c7' : 'rgba(15, 23, 42, 0.16)';
        ctx.fillText(it.label, 180, y);
        if (isCurrent) ctx.fillText('→', 85, y);
      });
    } else if (scene.template === 'ORBIT_ENGINE') {
      ctx.beginPath();
      ctx.rect(0, 960, 1080, 960);
      ctx.clip();
      ctx.fillStyle = '#022c22';
      ctx.fillRect(0, 960, 1080, 960);
      ctx.translate(540, 1450);
      ctx.fillStyle = scene.accentColor || '#10b981';
      ctx.beginPath();
      ctx.roundRect(-450, -280, 900, 540, 32);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 56px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(scene.title, 0, -155);

      const angle = localT * 3.5;
      const itemA = scene.items?.[0] || { label: 'H₂O', color: '#0284c7' };
      const itemB = scene.items?.[1] || { label: 'CO₂', color: '#334155' };

      ctx.fillStyle = itemA.color;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * 210, 15, 78, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '800 36px Inter, sans-serif';
      ctx.fillText(itemA.label, Math.cos(angle) * 210, 27);

      ctx.fillStyle = itemB.color;
      ctx.beginPath();
      ctx.arc(Math.cos(angle + Math.PI) * 210, 15, 78, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(itemB.label, Math.cos(angle + Math.PI) * 210, 27);

      ctx.fillStyle = '#fef08a';
      ctx.font = '800 36px monospace';
      ctx.fillText(scene.subtitle, 0, 190);
    } else if (scene.template === 'DUAL_CARDS') {
      ctx.beginPath();
      ctx.rect(0, 960, 1080, 960);
      ctx.clip();
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 960, 1080, 960);
      const card1 = scene.items?.[0] || { label: '1. SUGAR', sublabel: 'Plant Food 🌱', color: '#eab308' };
      const card2 = scene.items?.[1] || { label: '2. OXYGEN', sublabel: 'Clean Air 🌍', color: '#10b981' };

      const p1 = easeOutBack(clamp(localT / 0.5));
      ctx.save();
      ctx.translate(290, 1450);
      ctx.scale(p1, p1);
      ctx.fillStyle = card1.color;
      ctx.beginPath();
      ctx.roundRect(-220, -240, 440, 480, 26);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 56px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(card1.label, 0, -40);
      ctx.font = '700 34px Inter, sans-serif';
      ctx.fillText(card1.sublabel, 0, 50);
      ctx.restore();

      const p2 = easeOutBack(clamp((localT - 3.2) / 0.55));
      ctx.save();
      ctx.translate(790, 1450);
      ctx.scale(p2, p2);
      ctx.fillStyle = card2.color;
      ctx.beginPath();
      ctx.roundRect(-220, -240, 440, 480, 26);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 56px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(card2.label, 0, -40);
      ctx.font = '700 34px Inter, sans-serif';
      ctx.fillText(card2.sublabel, 0, 50);
      ctx.restore();
    } else if (scene.template === 'COSMIC_FINALE') {
      ctx.fillStyle = '#020b07';
      ctx.fillRect(0, 0, 1080, 1920);
      const glow = ctx.createRadialGradient(540, 1920, 200, 540, 1920, 1100);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.3, '#10b981');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1080, 1920);

      for (let b = 0; b < 14; b++) {
        const bx = 120 + ((b * 75) % 840) + Math.sin(localT * 3 + b) * 30;
        const by = 1800 - ((localT * 260 + b * 130) % 1600);
        ctx.fillStyle = 'rgba(52, 211, 153, 0.3)';
        ctx.beginPath();
        ctx.arc(bx, by, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 22px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('O₂', bx, by + 8);
      }

      const pop = easeOutBack(clamp(localT / 0.6));
      ctx.save();
      ctx.translate(540, 780);
      ctx.scale(pop, pop);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#34d399';
      ctx.font = '800 34px monospace';
      ctx.fillText('ARGON 4 VISUAL SUMMARY', 0, -180);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 105px Inter, sans-serif';
      ctx.fillText(scene.title, 0, -40);
      ctx.fillStyle = '#fef08a';
      ctx.font = '800 48px Inter, sans-serif';
      ctx.fillText(scene.subtitle, 0, 90);
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'italic 700 64px Georgia, serif';
      ctx.fillText(scene.badgeText, 0, 200);
      ctx.restore();
    }
    ctx.restore();
  };

  const drawKaraokeCaptions = (ctx, t, seg) => {
    const activeSeg = manifest.captions.find((c) => t >= c.start && t <= c.end);
    if (!activeSeg) return;

    const prog = clamp((t - activeSeg.start) / (activeSeg.end - activeSeg.start));
    const activeIdx = Math.min(activeSeg.words.length - 1, Math.floor(prog * activeSeg.words.length));

    ctx.save();
    ctx.font = '900 52px Inter, "Arial Black", sans-serif';
    ctx.textBaseline = 'middle';

    const spaceW = 18;
    const widths = activeSeg.words.map((w) => ctx.measureText(w).width);
    const totalW = widths.reduce((a, b) => a + b, 0) + spaceW * (activeSeg.words.length - 1);
    const startX = (1080 - totalW) / 2;
    const captionY =
      seg.layout === 'SIDE_BY_SIDE_50' ? 1680 : seg.layout === 'APPENDED_FULL_ANIMATION' ? 1420 : 960;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.roundRect(startX - 32, captionY - 54, totalW + 64, 108, 26);
    ctx.fill();

    let pillX = startX;
    for (let i = 0; i < activeIdx; i++) pillX += widths[i] + spaceW;
    ctx.fillStyle = '#8b2cf5';
    ctx.beginPath();
    ctx.roundRect(pillX - 12, captionY - 40, widths[activeIdx] + 24, 80, 14);
    ctx.fill();

    let wordX = startX;
    activeSeg.words.forEach((word, i) => {
      ctx.lineJoin = 'round';
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(word, wordX, captionY);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(word, wordX, captionY);
      wordX += widths[i] + spaceW;
    });
    ctx.restore();
  };

  const renderFrameAtTime = (editTime) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    const { rawTime, seg } = mapEditedTimeToRaw(editTime);
    const isFinale = seg.layout === 'APPENDED_FULL_ANIMATION';

    updateBgmDucking(isFinale);

    if (isPlaying && manifest.sfxEvents) {
      manifest.sfxEvents.forEach((sfx, idx) => {
        if (!firedSfxRef.current.has(idx) && editTime >= sfx.time && editTime - sfx.time < 0.25) {
          firedSfxRef.current.add(idx);
          triggerProceduralSFX(sfx.type, sfx.intensity || 0.8);
        }
      });
    }

    if (videoLoaded && video && !isFinale) {
      if (seg.idx !== lastSegIndexRef.current || Math.abs(video.currentTime - rawTime) > 0.12) {
        video.currentTime = rawTime;
        lastSegIndexRef.current = seg.idx;
      }
      if (isPlaying && video.paused) {
        video.play().catch(() => {});
      }
    } else if (videoLoaded && video && isFinale) {
      if (!video.paused) video.pause();
      lastSegIndexRef.current = seg.idx;
    }

    ctx.clearRect(0, 0, 1080, 1920);

    // Video layer
    if (!isFinale) {
      ctx.save();
      const vw = videoLoaded && video ? video.videoWidth || 1080 : 1080;
      const vh = videoLoaded && video ? video.videoHeight || 1920 : 1920;

      if (seg.layout === 'TOP_BOTTOM_50') {
        ctx.beginPath();
        ctx.rect(0, 0, 1080, 960);
        ctx.clip();
        if (videoLoaded && video) {
          const scale = Math.max(1080 / vw, 960 / vh) * (seg.zoom || 1.1);
          const dw = vw * scale;
          const dh = vh * scale;
          ctx.drawImage(video, (1080 - dw) / 2, (960 - dh) / 2 + 60, dw, dh);
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 1080, 960);
          ctx.fillStyle = '#f59e0b';
          ctx.font = '800 36px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡ Talking-Head Video Layer', 540, 480);
        }
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(0, 956);
        ctx.lineTo(1080, 956);
        ctx.stroke();
      } else if (seg.layout === 'SIDE_BY_SIDE_50') {
        ctx.beginPath();
        ctx.rect(0, 0, 540, 1920);
        ctx.clip();
        if (videoLoaded && video) {
          const scale = Math.max(540 / vw, 1920 / vh) * (seg.zoom || 1.15);
          const dw = vw * scale;
          const dh = vh * scale;
          ctx.drawImage(video, (540 - dw) / 2, (1920 - dh) / 2, dw, dh);
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 540, 1920);
          ctx.fillStyle = '#38bdf8';
          ctx.font = '800 32px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡ Video (Left 50%)', 270, 960);
        }
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(536, 0);
        ctx.lineTo(536, 1920);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawScene(ctx, editTime, seg);
    drawKaraokeCaptions(ctx, editTime, seg);
  };

  const renderFrameAtTimeRef = useRef(renderFrameAtTime);
  renderFrameAtTimeRef.current = renderFrameAtTime;

  useEffect(() => {
    if (renderFrameAtTimeRef.current) {
      renderFrameAtTimeRef.current(currentTime);
    }
  }, [currentTime, manifest, videoLoaded, bgmEnabled]);

  const loop = (ts) => {
    if (!startTimeRef.current) startTimeRef.current = ts;
    const elapsed = (ts - startTimeRef.current) / 1000;

    if (elapsed >= manifest.totalDuration) {
      setCurrentTime(manifest.totalDuration);
      renderFrameAtTime(manifest.totalDuration);
      setIsPlaying(false);
      if (videoRef.current) videoRef.current.pause();
      return;
    }

    setCurrentTime(elapsed);
    renderFrameAtTime(elapsed);
    animFrameRef.current = requestAnimationFrame(loop);
  };

  const handlePlayToggle = () => {
    ensureAudioGraph();
    if (isPlaying) {
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (videoRef.current) videoRef.current.pause();
    } else {
      if (currentTime >= manifest.totalDuration) {
        handleRestart();
        return;
      }
      lastSegIndexRef.current = -1;
      startTimeRef.current = performance.now() - currentTime * 1000;
      setIsPlaying(true);
      const { rawTime, seg } = mapEditedTimeToRaw(currentTime);
      if (videoLoaded && videoRef.current && seg.layout !== 'APPENDED_FULL_ANIMATION') {
        videoRef.current.currentTime = rawTime;
        videoRef.current.play().catch(() => {});
      }
      animFrameRef.current = requestAnimationFrame(loop);
    }
  };

  const handleRestart = () => {
    ensureAudioGraph();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setCurrentTime(0);
    lastSegIndexRef.current = -1;
    firedSfxRef.current.clear();
    startTimeRef.current = performance.now();
    setIsPlaying(true);
    if (videoLoaded && videoRef.current) {
      videoRef.current.currentTime = manifest.edlSegments[0]?.rawStart || 0;
      videoRef.current.play().catch(() => {});
    }
    animFrameRef.current = requestAnimationFrame(loop);
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    rawFileRef.current = file;
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setStatusMessage(`Loaded "${file.name}" • Ready to auto-edit with Argon 4`);
  };

  const handleAnalyzeViaApi = async () => {
    const file = rawFileRef.current;
    if (!file) {
      setStatusMessage('Please select a raw .mp4 video first!');
      return;
    }

    setIsAnalyzing(true);
    setStatusMessage('🚀 Uploading to Gemini Files API + gemini-4-argon (Agentic)...');

    try {
      const formData = new FormData();
      formData.append('video', file);

      const res = await fetch('/api/argon-auto-edit', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newManifest = await res.json();
      setManifest(newManifest);
      setJsonText(JSON.stringify(newManifest, null, 2));
      setStatusMessage('✅ Argon 4 Generated 1:1 Frame-Locked Cut + Web Audio SFX!');
      handleRestart();
    } catch (err) {
      console.warn('Argon API fallback notice:', err);
      setStatusMessage(`⚠️ API Notice (${err.message}) — Loaded reference high-retention manifest.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setManifest(parsed);
      setStatusMessage('✅ Custom JSON Manifest applied to live timeline!');
      handleRestart();
    } catch (err) {
      setStatusMessage(`❌ JSON Parse Error: ${err.message}`);
    }
  };

  const handleExportWebM = () => {
    ensureAudioGraph();
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);
    setStatusMessage('⏺ Rendering 60FPS Video + Procedural SFX + Mixed Audio...');

    const canvasStream = canvas.captureStream(60);
    const audioStream = exportAudioDestRef.current?.stream;
    const combinedTracks = [
      ...canvasStream.getVideoTracks(),
      ...(audioStream ? audioStream.getAudioTracks() : []),
    ];
    const combinedStream = new MediaStream(combinedTracks);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 12000000,
    });
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zerolens_argon4_edit_${Date.now()}.webm`;
      a.click();
      setIsExporting(false);
      setStatusMessage('🎉 Export Complete! Downloaded .webm with mixed SFX & speech.');
    };

    recorder.start(100);
    handleRestart();

    // Stop recording when totalDuration finishes
    const checkFinish = setInterval(() => {
      if (currentTime >= manifest.totalDuration) {
        clearInterval(checkFinish);
        if (recorder.state === 'recording') recorder.stop();
      }
    }, 200);
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row bg-[#050709] text-white overflow-hidden select-none">
      <video
        ref={videoRef}
        src={videoSrc || undefined}
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className="hidden"
        onLoadedData={() => {
          setVideoLoaded(true);
          renderFrameAtTime(0);
        }}
      />

      {/* LEFT: 9:16 Canvas Stage */}
      <div className="lg:w-[460px] w-full bg-[#080d16] border-r border-white/10 flex flex-col items-center justify-center p-6 relative">
        <div className="relative w-[340px] h-[604px] rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/10 border-2 border-emerald-500/40 bg-zinc-950">
          <canvas
            ref={canvasRef}
            width={1080}
            height={1920}
            className="w-full h-full object-contain block"
          />
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            1080×1920 • 60 FPS
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between w-[340px] text-xs font-mono text-zinc-400">
          <span>{currentTime.toFixed(2)}s</span>
          <span className="text-emerald-400 font-semibold">{manifest.totalDuration.toFixed(2)}s</span>
        </div>
      </div>

      {/* RIGHT: Studio Control Panel */}
      <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto bg-gradient-to-b from-[#090d16] to-[#040608]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                Gemini 4 Argon
              </span>
              <span className="text-[10px] font-mono text-zinc-400">Agentic Multi-Pass Timeline</span>
            </div>
            <h2 className="text-xl font-black italic tracking-tight uppercase text-white mt-1">
              ZeroLens Argon Autonomous Editor
            </h2>
            <p className="text-xs text-zinc-400">
              1:1 Frame-Locked Jump Cuts • Split-Screen Motion Graphics • Web Audio SFX & Ducking
            </p>
          </div>

          <button
            onClick={() => setBgmEnabled(!bgmEnabled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              bgmEnabled
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-zinc-800/60 text-zinc-400 border-zinc-700'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            BGM Ducking: {bgmEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black flex items-center gap-1.5 transition-all shadow-lg shadow-orange-500/20"
          >
            <Upload className="w-3.5 h-3.5 text-black" />
            1. Select Raw Footage
          </button>

          <button
            onClick={handleAnalyzeViaApi}
            disabled={isAnalyzing}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white flex items-center gap-1.5 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            {isAnalyzing ? 'Analyzing with Argon 4...' : '2. Analyze via Argon 4 API'}
          </button>

          <button
            onClick={handlePlayToggle}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black" />}
            {isPlaying ? 'Pause' : 'Play Edit + SFX'}
          </button>

          <button
            onClick={handleRestart}
            className="p-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-900 border border-white/10 hover:border-white/20 transition-all"
            title="Restart playback"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportWebM}
            disabled={isExporting}
            className="ml-auto px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white flex items-center gap-1.5 transition-all shadow-lg shadow-pink-500/20 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Exporting...' : 'Export Video + SFX (.webm)'}
          </button>
        </div>

        {/* Status banner */}
        <div className="bg-zinc-900/80 border border-white/10 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-300">{statusMessage}</span>
          <span className="text-zinc-500">
            {manifest.edlSegments?.length || 0} Cuts • {manifest.sfxEvents?.length || 0} SFX Cues
          </span>
        </div>

        {/* Live Editable Manifest JSON */}
        <div className="flex-1 flex flex-col gap-2 min-h-[300px]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-emerald-400" />
              Argon 4 EditManifest JSON (Live Deterministic Blueprint):
            </label>
            <button
              onClick={handleApplyJson}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/50 flex items-center gap-1 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Apply JSON Changes
            </button>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck="false"
            className="flex-1 w-full bg-[#03060a] border border-white/10 rounded-2xl p-4 font-mono text-xs text-emerald-400 focus:outline-none focus:border-emerald-500/50 leading-relaxed resize-none selection:bg-emerald-500/30"
          />
        </div>
      </div>
    </div>
  );
}
