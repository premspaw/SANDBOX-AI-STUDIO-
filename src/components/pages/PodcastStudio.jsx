/**
 * ZeroLens — Podcast Studio v2
 * Clean rebuild. No overflow. No cramped cards.
 * Drop-in replacement for PodcastStudio.jsx
 */

import React, { useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Upload, User, Mic, Play, Pause, Video, Camera,
  Download, Loader2, Sparkles, X, Check, CheckCircle,
  Volume2, VolumeX, Plus, Trash2, ChevronDown, Radio,
  Headphones, Film, Zap, Globe, Users, MessageSquare,
  Monitor, AlertCircle, RotateCcw, PlayCircle, Lock,
  ArrowUp, ArrowDown, Wand2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import { useShorts } from '../../hooks/useShorts';
import { getApiUrl } from '../../config/apiConfig';

// ─── CONSTANTS ────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'ta', label: 'Tamil',     flag: '🇮🇳', voice: 'Kore'   },
  { code: 'te', label: 'Telugu',    flag: '🇮🇳', voice: 'Puck'   },
  { code: 'kn', label: 'Kannada',   flag: '🇮🇳', voice: 'Fenrir' },
  { code: 'ml', label: 'Malayalam', flag: '🇮🇳', voice: 'Charon' },
  { code: 'hi', label: 'Hindi',     flag: '🇮🇳', voice: 'Zephyr' },
  { code: 'en', label: 'English',   flag: '🌐',  voice: 'Kore'   },
];

const VOICES = ['Kore', 'Puck', 'Fenrir', 'Charon', 'Zephyr'];

const THEMES = [
  { id: 'studio',   icon: '🎙️', label: 'Pro Studio',    prompt: 'professional podcast recording studio, acoustic panels, large condenser microphones, warm neon lighting, cinematic' },
  { id: 'office',   icon: '🏢', label: 'Modern Office',  prompt: 'sleek modern office, glass walls, city skyline background, wireless microphones, cool daylight' },
  { id: 'cafe',     icon: '☕', label: 'Cozy Café',      prompt: 'cozy café, warm amber lighting, small table mic, bokeh background, relaxed authentic vibe' },
  { id: 'rooftop',  icon: '🌆', label: 'Rooftop',        prompt: 'rooftop terrace, golden hour cityscape, outdoor directional mics, natural sunlight' },
  { id: 'home',     icon: '🏠', label: 'Home Studio',    prompt: 'home studio setup, ring lights, bookshelf background, USB mic, warm creator aesthetic' },
];

const SEG_TYPES = ['Intro', 'Discussion', 'Q&A', 'Story', 'Outro'];

const HOST_COLORS = ['#c8f135', '#00ffe0'];
const HOST_BG     = ['rgba(200,241,53,0.08)', 'rgba(0,255,224,0.08)'];
const HOST_BORDER = ['rgba(200,241,53,0.25)', 'rgba(0,255,224,0.25)'];

// ─── UTILS ────────────────────────────────────────────────────
const fileToBase64 = f => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(',')[1]);
  r.onerror = rej;
  r.readAsDataURL(f);
});

const resizeImageBlob = (blob, maxDim = 1024) => new Promise((res, rej) => {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    let w = img.width, h = img.height;
    if (w > h) { if (w > maxDim) { h = h * maxDim / w; w = maxDim; } }
    else        { if (h > maxDim) { w = w * maxDim / h; h = maxDim; } }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    res(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
  };
  img.onerror = rej;
  img.src = url;
});

const createWavUrl = b64 => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const f32 = new Float32Array(bytes.length / 2);
  const dv = new DataView(bytes.buffer);
  for (let i = 0; i < f32.length; i++) f32[i] = dv.getInt16(i * 2, true) / 32768;
  const buf = new ArrayBuffer(44 + f32.length * 2);
  const v = new DataView(buf);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0,'RIFF'); v.setUint32(4, 36 + f32.length * 2, true);
  ws(8,'WAVE'); ws(12,'fmt '); v.setUint32(16,16,true);
  v.setUint16(20,1,true); v.setUint16(22,1,true);
  v.setUint32(24,24000,true); v.setUint32(28,48000,true);
  v.setUint16(32,2,true); v.setUint16(34,16,true);
  ws(36,'data'); v.setUint32(40, f32.length * 2, true);
  let o = 44;
  for (let i = 0; i < f32.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return URL.createObjectURL(new Blob([v], { type: 'audio/wav' }));
};

const uid = () => Math.random().toString(36).slice(2, 9);

const uploadToGCS = async (data, type, prompt = '') => {
  try {
    const API_BASE = window.API_URL || 'http://localhost:3002';
    let base64 = data;
    if (!data.startsWith('data:')) {
      const res = await fetch(data);
      const blob = await res.blob();
      base64 = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }
    const res = await fetch(`${API_BASE}/api/upload-asset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: base64, type, prompt })
    });
    if (!res.ok) throw new Error(res.statusText);
    const { url } = await res.json();
    console.log('[PODCAST→GCS] Saved:', url);
    return url;
  } catch (err) {
    console.warn('[PODCAST→GCS] Upload failed (non-blocking):', err.message);
    return data;
  }
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────

// Simple toast
const Toast = ({ toast, onClose }) => {
  if (!toast) return null;
  const cls = {
    success: 'bg-[#c8f135]/10 border-[#c8f135]/30 text-[#c8f135]',
    error:   'bg-red-500/10 border-red-500/30 text-red-400',
    info:    'bg-blue-500/10 border-blue-500/30 text-blue-400',
  }[toast.type] || '';
  return (
    <div className={`fixed top-14 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl animate-in slide-in-from-top-3 ${cls}`}>
      <span className="text-[11px] font-bold tracking-wide max-w-xs">{toast.msg}</span>
      <button onClick={onClose}><X size={13} /></button>
    </div>
  );
};

// Pill button row (language / duration / ratio)
const PillRow = ({ options, value, onChange, color = '#c8f135' }) => (
  <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
    {options.map(opt => {
      const active = (opt.code || opt.id || opt) === (value?.code || value?.id || value);
      return (
        <button
          key={opt.code || opt.id || opt}
          onClick={() => onChange(opt)}
          className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
          style={active
            ? { background: color, color: '#000' }
            : { color: '#666' }
          }
        >
          {opt.flag ? `${opt.flag} ${opt.label}` : (opt.label || opt)}
        </button>
      );
    })}
  </div>
);

// Dropdown
const Dropdown = ({ label, value, options, onChange, icon: Icon }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      {label && <p className="text-[8px] font-black uppercase tracking-[0.18em] text-gray-500 mb-1.5 pl-0.5">{label}</p>}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full h-9 flex items-center justify-between bg-black/40 border border-white/10 rounded-lg px-3 text-[9px] font-mono uppercase tracking-widest text-white hover:border-white/25 transition-all"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={11} className="text-[#c8f135]" />}
          <span className="truncate">{value}</span>
        </div>
        <ChevronDown size={11} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 w-full bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            {options.map(o => (
              <button key={o} onClick={() => { onChange(o); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-[9px] font-mono uppercase tracking-widest hover:bg-[#c8f135]/10 hover:text-[#c8f135] transition-all ${value === o ? 'text-[#c8f135] bg-[#c8f135]/5' : 'text-gray-400'}`}>
                {o}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Host upload card — compact horizontal layout
const HostCard = ({ host, idx, onChange, onGenerateImg, isGenerating }) => {
  const fileRef = useRef(null);
  const color  = HOST_COLORS[idx];
  const bg     = HOST_BG[idx];
  const border = HOST_BORDER[idx];

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ background: bg, borderColor: border }}>
      {/* Top: avatar + name row */}
      <div className="flex items-center gap-3 p-3 border-b" style={{ borderColor: border }}>
        {/* Avatar */}
        <div
          className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border-2"
          style={{ borderColor: color }}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
            const f = e.target.files?.[0];
            if (f) onChange({ imgUrl: URL.createObjectURL(f), imgFile: f, generatedImg: null });
          }} />
          {host.generatedImg || host.imgUrl ? (
            <img src={host.generatedImg || host.imgUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-0.5" style={{ background: `${color}15` }}>
              <Upload size={14} style={{ color }} />
              <span className="text-[6px] font-black uppercase" style={{ color }}>Photo</span>
            </div>
          )}
          {isGenerating && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-[#c8f135]" />
            </div>
          )}
          {/* REC dot */}
          <div className="absolute top-1 left-1 w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
        </div>

        {/* Name + role badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest" style={{ background: `${color}20`, color }}>
              Host {idx + 1}
            </div>
          </div>
          <input
            type="text"
            value={host.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder={`Host ${idx + 1} name`}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white focus:outline-none focus:border-[#c8f135] transition-colors"
          />
        </div>
      </div>

      {/* Bottom: voice + generate */}
      <div className="flex items-center gap-2 p-3">
        <Dropdown
          label=""
          value={host.voice}
          options={VOICES}
          onChange={v => onChange({ voice: v })}
          icon={Mic}
        />
        <button
          onClick={() => onGenerateImg(idx)}
          disabled={!host.imgFile || isGenerating}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border disabled:opacity-30 disabled:cursor-not-allowed"
          style={host.imgFile && !isGenerating
            ? { background: `${color}15`, borderColor: `${color}40`, color }
            : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)', color: '#555' }
          }
        >
          {isGenerating ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
          {isGenerating ? 'Gen...' : 'AI Photo'}
        </button>
      </div>
    </div>
  );
};

// Single dialogue line
const DialogueLine = React.forwardRef(({ line, idx, hosts, total, onUpdate, onRemove, onMoveUp, onMoveDown, isActive, onActivate, isGenAudio, isGenVideo, videoMsg, onGenAudio, onGenVideo }, ref) => {
  const color = HOST_COLORS[line.hostId] ?? '#c8f135';
  const host  = hosts[line.hostId];

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      onClick={onActivate}
      className={`rounded-xl border transition-all cursor-pointer ${isActive ? 'ring-1' : ''}`}
      style={{
        background: isActive ? `${color}08` : 'rgba(255,255,255,0.02)',
        borderColor: isActive ? `${color}40` : 'rgba(255,255,255,0.07)',
        ...(isActive ? { '--tw-ring-color': `${color}40` } : {}),
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        {/* Host avatar circle */}
        <div className="w-7 h-7 rounded-full overflow-hidden border-2 flex-shrink-0" style={{ borderColor: color }}>
          {host?.generatedImg || host?.imgUrl ? (
            <img src={host.generatedImg || host.imgUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[9px] font-black" style={{ background: `${color}20`, color }}>
              {(idx % 2 === 0) ? 'H1' : 'H2'}
            </div>
          )}
        </div>

        {/* Host picker */}
        <select
          value={line.hostId}
          onChange={e => { e.stopPropagation(); onUpdate({ hostId: +e.target.value }); }}
          onClick={e => e.stopPropagation()}
          className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest focus:outline-none"
          style={{ color }}
        >
          <option value={0}>{hosts[0]?.name || 'Host 1'}</option>
          <option value={1}>{hosts[1]?.name || 'Host 2'}</option>
        </select>

        {/* Segment type */}
        <select
          value={line.type}
          onChange={e => { e.stopPropagation(); onUpdate({ type: e.target.value }); }}
          onClick={e => e.stopPropagation()}
          className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-mono text-gray-400 focus:outline-none"
        >
          {SEG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Status badges */}
        <div className="flex items-center gap-1 ml-auto">
          {line.audioUrl && (
            <button
              onClick={e => { e.stopPropagation(); new Audio(line.audioUrl).play(); }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase"
              style={{ background: '#c8f13520', color: '#c8f135', border: '1px solid #c8f13540' }}
            >
              <Play size={7} fill="currentColor" /> Audio
            </button>
          )}
          {line.videoUrl && (
            <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase" style={{ background: '#00ffe020', color: '#00ffe0', border: '1px solid #00ffe040' }}>
              ✓ Clip
            </span>
          )}
        </div>

        {/* Reorder & delete */}
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          <button onClick={onMoveUp} disabled={idx === 0} className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-white transition-all disabled:opacity-20"><ArrowUp size={10} /></button>
          <button onClick={onMoveDown} disabled={idx === total - 1} className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-white transition-all disabled:opacity-20"><ArrowDown size={10} /></button>
          <button onClick={onRemove} className="p-1 rounded hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all"><X size={10} /></button>
        </div>
      </div>

      {/* Text area */}
      <div className="px-3 pb-3">
        <textarea
          value={line.text}
          onChange={e => onUpdate({ text: e.target.value })}
          onClick={e => e.stopPropagation()}
          rows={2}
          placeholder={`${host?.name || `Host ${line.hostId + 1}`} speaks here…`}
          className="w-full bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-[11px] text-white resize-none focus:outline-none leading-relaxed placeholder-gray-600"
          style={{ '--focus-border': color }}
          onFocus={e => e.target.style.borderColor = `${color}60`}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
        />
      </div>

      {/* Action row — only when active */}
      {isActive && (
        <div className="flex items-center gap-2 px-3 pb-3">
          <button
            onClick={e => { e.stopPropagation(); onGenAudio(); }}
            disabled={!line.text.trim() || isGenAudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)', color: '#aaa' }}
          >
            {isGenAudio ? <Loader2 size={10} className="animate-spin" /> : <Mic size={10} />}
            {isGenAudio ? 'Generating…' : 'Voice'}
          </button>

          <button
            onClick={e => { e.stopPropagation(); onGenVideo(); }}
            disabled={!line.text.trim() || isGenVideo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all disabled:opacity-30"
            style={{ background: '#c8f13510', borderColor: '#c8f13530', color: '#c8f135' }}
          >
            {isGenVideo ? <Loader2 size={10} className="animate-spin" /> : <Video size={10} />}
            {isGenVideo ? (videoMsg || 'Generating…') : 'Produce Clip (93 Shorts)'}
          </button>

          {line.videoUrl && (
            <button
              onClick={e => { e.stopPropagation(); window._podcastSetPreview?.(line.videoUrl); }}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all"
              style={{ background: '#00ffe010', borderColor: '#00ffe030', color: '#00ffe0' }}
            >
              <Play size={10} fill="currentColor" /> Preview
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
});

// Processing spinner overlay
const Spinner = ({ msg }) => (
  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
    <div className="relative w-24 h-24 mb-6">
      <div className="absolute inset-0 border-2 border-t-[#c8f135] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      <div className="absolute inset-3 border-2 border-t-transparent border-r-[#00ffe0] border-b-transparent border-l-transparent rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
      <div className="absolute inset-6 flex items-center justify-center">
        <Radio size={20} className="text-[#c8f135]" />
      </div>
      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-black" />
    </div>
    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#c8f135] animate-pulse">{msg || 'Processing…'}</p>
  </div>
);

// ─── MAIN ─────────────────────────────────────────────────────
export default function PodcastStudio() {
  const { spend, refund } = useShorts();
  const userProfile = useAppStore(s => s.userProfile);

  // hosts
  const [hosts, setHosts] = useState([
    { name: 'Host 1', voice: 'Kore',   imgUrl: null, imgFile: null, generatedImg: null },
    { name: 'Host 2', voice: 'Puck',   imgUrl: null, imgFile: null, generatedImg: null },
  ]);
  const updateHost = (i, u) => setHosts(p => p.map((h, idx) => idx === i ? { ...h, ...u } : h));

  // config
  const [lang,      setLang]     = useState(LANGUAGES[0]);
  const [theme,     setTheme]    = useState(THEMES[0]);
  const [aspect,    setAspect]   = useState('9:16');
  const [duration,  setDuration] = useState('8');
  const [title,     setTitle]    = useState('');
  const [topic,     setTopic]    = useState('');

  // podcast setup
  const [podcastLocation, setPodcastLocation] = useState('');

  // image engine
  const [imgEngine,   setImgEngine]   = useState('nb2'); // 'nb2' | 'gpt2'
  const [gpt2Quality, setGpt2Quality] = useState('low'); // 'low' | 'medium' | 'high'

  // gallery
  const [gallery, setGallery] = useState([]);
  const addToGallery = (item) => setGallery(prev => [item, ...prev].slice(0, 60));

  // dialogue
  const [lines, setLines] = useState([
    { id: uid(), hostId: 0, text: '', type: 'Intro',      audioUrl: null, videoUrl: null },
    { id: uid(), hostId: 1, text: '', type: 'Discussion',  audioUrl: null, videoUrl: null },
  ]);
  const [activeLine, setActiveLine] = useState(0);

  const updateLine = (i, u) => setLines(p => p.map((l, idx) => idx === i ? { ...l, ...u } : l));
  const removeLine = i => { setLines(p => p.filter((_, idx) => idx !== i)); setActiveLine(a => Math.max(0, a - (i <= a ? 1 : 0))); };
  const moveLine   = (i, d) => setLines(p => { const n = [...p]; [n[i], n[i+d]] = [n[i+d], n[i]]; return n; });
  const addLine    = h => setLines(p => [...p, { id: uid(), hostId: h, text: '', type: 'Discussion', audioUrl: null, videoUrl: null }]);

  // generation state
  const [genScript,    setGenScript]    = useState(false);
  const [genH0Img,     setGenH0Img]     = useState(false);
  const [genH1Img,     setGenH1Img]     = useState(false);
  const [genAudioIdx,  setGenAudioIdx]  = useState(null);
  const [genVideoIdx,  setGenVideoIdx]  = useState(null);
  const [videoMsg,     setVideoMsg]     = useState('');

  // monitor
  const [previewVideo, setPreviewVideo] = useState(null);
  const [monitorMode,  setMonitorMode]  = useState('hosts'); // 'hosts' | 'video'
  const videoRef = useRef(null);

  // expose preview setter for dialogue lines
  window._podcastSetPreview = url => { setPreviewVideo(url); setMonitorMode('video'); };

  // toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'info') => { setToast({ msg, type }); setTimeout(() => setToast(null), 5000); };
  const handleErr = (e, ctx) => { console.error(ctx, e); showToast(`${ctx}: ${e?.message || e}`, 'error'); };

  // ── Generate Script ──────────────────────────────────────────
  const generateScript = async () => {
    if (!topic.trim()) return showToast('Enter a topic first', 'error');
    setGenScript(true);
    try {
      const prompt = `Write a natural ${lang.label} podcast conversation about: "${topic}".
Podcast: "${title || 'Untitled'}"
Host 1: ${hosts[0].name}
Host 2: ${hosts[1].name}
Rules:
- Write in ${lang.label} (use native script if not English)
- 6–8 exchanges, alternating hosts, 20–30 words each
- Mix: 1 intro, 4+ discussion, 1 outro exchange
- Sound authentic, conversational, not scripted
Return ONLY valid JSON: { "lines": [{ "hostId": 0, "text": "...", "type": "Intro" }, ...] }`;

      const res = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts: [{ text: prompt }], model: 'gemini-1.5-flash-latest', generationConfig: { responseMimeType: 'application/json' } })
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      let parsed;
      try { parsed = JSON.parse(data.text || '{}'); } catch { parsed = {}; }
      if (parsed.lines?.length) {
        setLines(parsed.lines.map(l => ({ id: uid(), hostId: l.hostId ?? 0, text: l.text || '', type: l.type || 'Discussion', audioUrl: null, videoUrl: null })));
        setActiveLine(0);
        showToast(`Script ready in ${lang.label}!`, 'success');
      } else {
        showToast('Script generation returned empty — try rephrasing topic', 'error');
      }
    } catch (e) { handleErr(e, 'Script generation'); }
    setGenScript(false);
  };

  // ── Generate Host AI Image ───────────────────────────────────
  const generateHostImg = async i => {
    const host = hosts[i];
    if (!host.imgFile) return showToast('Upload a photo first', 'error');
    if (i === 0) setGenH0Img(true); else setGenH1Img(true);
    try {
      const locationDesc = podcastLocation.trim()
        ? `Location/Setup: ${podcastLocation.trim()}.`
        : '';
      const combinedScene = `${theme.prompt}${locationDesc ? ' ' + locationDesc : ''}`;
      const basePrompt = `This is the reference photo of "${host.name}". Generate a professional wide-angle portrait of this EXACT person sitting in a podcast setup. Setting: ${combinedScene}. The host should be at a desk with a professional condenser microphone, looking natural and authentic. Style: cinematic photography, ultra-realistic, 8k, perfect lighting, depth of field. Match the person's face and features from the reference photo with 100% consistency. No extra text, no watermarks.`;

      if (imgEngine === 'gpt2') {
        const b64DataUrl = await new Promise(res => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.readAsDataURL(host.imgFile);
        });
        const gptRes = await fetch(getApiUrl('/api/generate-image'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-image-2',
            prompt: basePrompt,
            quality: gpt2Quality,
            size: aspect === '16:9' ? '1536x1024' : aspect === '1:1' ? '1024x1024' : '1024x1536',
            image: b64DataUrl,
          }),
        });
        if (!gptRes.ok) throw new Error(await gptRes.text());
        const gptData = await gptRes.json();
        const url = gptData.url || gptData.imageUrl;
        if (url) {
          updateHost(i, { generatedImg: url });
          addToGallery({ id: Date.now().toString(), type: 'image', url, prompt: basePrompt });
          showToast(`Host ${i + 1} AI portrait ready! (GPT Image 2)`, 'success');
        } else {
          updateHost(i, { generatedImg: host.imgUrl });
          showToast('Using original photo as reference', 'info');
        }
      } else {
        const b64 = await fileToBase64(host.imgFile);
        const res = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parts: [
              { inlineData: { mimeType: host.imgFile.type, data: b64 } },
              { text: basePrompt }
            ],
            model: 'nano-banana-pro',
            generationConfig: { imageConfig: { aspectRatio: aspect === '9:16' ? '9:16' : aspect === '16:9' ? '16:9' : '1:1' } }
          })
        });
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        if (data.imageData) {
          const imgDataUrl = `data:image/png;base64,${data.imageData}`;
          updateHost(i, { generatedImg: imgDataUrl });
          addToGallery({ id: Date.now().toString(), type: 'image', url: imgDataUrl, prompt: basePrompt });
          showToast(`Host ${i + 1} AI portrait ready!`, 'success');
          uploadToGCS(imgDataUrl, 'image', `Podcast host ${i + 1} portrait`);
        } else {
          updateHost(i, { generatedImg: host.imgUrl });
          showToast('Using original photo as reference', 'info');
        }
      }
    } catch (e) { handleErr(e, `Host ${i+1} image`); }
    if (i === 0) setGenH0Img(false); else setGenH1Img(false);
  };

  // ── Generate Voice ───────────────────────────────────────────
  const generateAudio = async lineIdx => {
    const line = lines[lineIdx];
    if (!line?.text?.trim()) return;
    setGenAudioIdx(lineIdx);
    try {
      const host = hosts[line.hostId];
      const res = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: line.text }] }],
          model: 'gemini-2.5-flash-preview-tts',
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: host.voice || 'Kore' } } }
          }
        })
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      if (data.audio) {
        updateLine(lineIdx, { audioUrl: createWavUrl(data.audio) });
        showToast(`Voice generated for line ${lineIdx + 1}`, 'success');
      }
    } catch (e) { handleErr(e, 'Voice generation'); }
    setGenAudioIdx(null);
  };

  const generateAllAudio = async () => {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].text?.trim()) {
        await generateAudio(i);
        await new Promise(r => setTimeout(r, 400));
      }
    }
  };

  // ── Generate Video ───────────────────────────────────────────
  const generateVideo = async lineIdx => {
    const line = lines[lineIdx];
    if (!line?.text?.trim()) return;
    const host  = hosts[line.hostId];
    const refImg = host.generatedImg || host.imgUrl;
    if (!refImg) return showToast(`Upload/generate Host ${line.hostId + 1} photo first`, 'error');

    const cost = 93;
    const store = useAppStore.getState();
    if (store.userShorts < cost && store.userProfile?.role !== 'admin') {
      showToast(`Need ${cost} Shorts`, 'error');
      store.setActiveTab('pricing');
      return;
    }
    const spendRes = await spend('veo_fast', cost);
    if (!spendRes?.success) { showToast('Insufficient Shorts!', 'error'); useAppStore.getState().setActiveTab('pricing'); return; }

    setGenVideoIdx(lineIdx);
    setVideoMsg('Initializing Veo 3.1…');
    try {
      const res = await fetch(refImg.startsWith('data:') ? refImg : refImg);
      const blob = await res.blob();
      const imageBase64 = await resizeImageBlob(blob);

      const prompt = `${host.name} — ${hosts[line.hostId].voice} voice — podcast presenter speaking directly to camera. ${theme.prompt}. The host is saying: "${line.text}". Natural lip-sync, authentic expression, ${lang.label} podcast style, UGC authentic look.`.substring(0, 900);

      const veoRes = await fetch(getApiUrl('/api/veo/generate'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          image: { imageBytes: imageBase64, mimeType: 'image/jpeg' },
          config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspect === '1:1' ? '9:16' : aspect, durationSeconds: +duration, includeAudio: false }
        })
      });
      if (!veoRes.ok) throw new Error(await veoRes.text());
      const veoData = await veoRes.json();

      const pollMsgs = ['Generating Frames…', 'Animating Host…', 'Lip-Sync Processing…', 'Rendering…', 'Finalizing…'];
      let done = veoData.done || false;
      let opName = veoData.operationName || veoData.name;
      let videoUri = veoData.videoUri || null;
      let pc = 0;

      while (!done) {
        await new Promise(r => setTimeout(r, 10000));
        setVideoMsg(pollMsgs[Math.min(pc++, pollMsgs.length - 1)]);
        try {
          const pRes = await fetch(getApiUrl(`/api/veo/status?operation=${encodeURIComponent(opName)}`));
          if (pRes.ok) { const pd = await pRes.json(); done = pd.done; if (done) videoUri = pd.videoUri || pd.uri; }
          else done = true;
        } catch { done = true; }
      }

      if (videoUri) {
        setVideoMsg('Downloading…');
        const dlRes = await fetch(videoUri);
        const dlBlob = await dlRes.blob();
        const url = URL.createObjectURL(dlBlob);
        updateLine(lineIdx, { videoUrl: url });
        setPreviewVideo(url);
        setMonitorMode('video');
        showToast(`Clip ready for line ${lineIdx + 1}!`, 'success');
        uploadToGCS(url, 'video', lines[lineIdx]?.text || 'Podcast clip');
      } else {
        showToast('No video returned — try rephrasing', 'error');
        refund('veo_fast', cost);
      }
    } catch (e) { refund('veo_fast', cost); handleErr(e, 'Video generation'); }
    setGenVideoIdx(null);
    setVideoMsg('');
  };

  // ── computed ──────────────────────────────────────────────────
  const voiced  = lines.filter(l => l.audioUrl).length;
  const clipped = lines.filter(l => l.videoUrl).length;
  const progress = lines.length > 0 ? (clipped / lines.length) * 100 : 0;

  return (
    <div className="h-full flex flex-col bg-[#020202] text-white overflow-hidden">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ── HEADER ───────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-white/5 bg-black/50 backdrop-blur-xl flex-shrink-0 flex-wrap gap-y-2">
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 bg-[#c8f135]/10 border border-[#c8f135]/25 rounded-xl flex items-center justify-center">
            <Radio size={16} className="text-[#c8f135]" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] leading-none">Podcast Studio</p>
            <p className="text-[7px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">AI Multi-Host Video</p>
          </div>
        </div>

        <div className="w-px h-5 bg-white/10 flex-shrink-0" />


        {/* REC badge */}
        <div className="ml-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[8px] font-black uppercase tracking-widest text-red-400">Live Studio</span>
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex gap-0">

        {/* LEFT SIDEBAR — Hosts + Settings */}
        <div className="w-72 flex-shrink-0 border-r border-white/5 flex flex-col overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#222 transparent' }}>
          <div className="p-4 space-y-4">

            {/* Hosts */}
            <section>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2.5 flex items-center gap-2">
                <Users size={10} className="text-[#c8f135]" /> Cast
              </p>
              <div className="space-y-2.5">
                <HostCard host={hosts[0]} idx={0} onChange={u => updateHost(0,u)} onGenerateImg={generateHostImg} isGenerating={genH0Img} />
                <HostCard host={hosts[1]} idx={1} onChange={u => updateHost(1,u)} onGenerateImg={generateHostImg} isGenerating={genH1Img} />
              </div>
            </section>

            {/* Podcast Setup — Location */}
            <section>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2.5 flex items-center gap-2">
                <Globe size={10} className="text-[#c8f135]" /> Podcast Setup
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-[8px] text-gray-600 uppercase tracking-widest mb-1">Location / Setting</p>
                  <input
                    type="text"
                    value={podcastLocation}
                    onChange={e => setPodcastLocation(e.target.value)}
                    placeholder="e.g. near garden, rooftop café, home studio…"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-2 text-[10px] text-white focus:outline-none focus:border-[#c8f135] transition-colors placeholder-gray-600"
                  />
                </div>
                {/* Image Engine selector */}
                <div>
                  <p className="text-[8px] text-gray-600 uppercase tracking-widest mb-1">Image Engine</p>
                  <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
                    <button
                      onClick={() => setImgEngine('nb2')}
                      className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                      style={imgEngine === 'nb2' ? { background: '#c8f135', color: '#000' } : { color: '#555' }}
                    >NB2 (Google)</button>
                    <button
                      onClick={() => setImgEngine('gpt2')}
                      className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                      style={imgEngine === 'gpt2' ? { background: '#00ffe0', color: '#000' } : { color: '#555' }}
                    >GT2 (OpenAI)</button>
                  </div>
                </div>
                {imgEngine === 'gpt2' && (
                  <div>
                    <p className="text-[8px] text-gray-600 uppercase tracking-widest mb-1">GPT Quality</p>
                    <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
                      {['low','medium','high'].map(q => (
                        <button key={q} onClick={() => setGpt2Quality(q)}
                          className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                          style={gpt2Quality === q ? { background: '#00ffe0', color: '#000' } : { color: '#555' }}
                        >{q}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Studio Theme */}
            <section>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2.5 flex items-center gap-2">
                <Film size={10} className="text-[#c8f135]" /> Studio Scene
              </p>
              <div className="space-y-1">
                {THEMES.map(t => (
                  <button key={t.id} onClick={() => setTheme(t)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border transition-all text-left"
                    style={theme.id === t.id
                      ? { background: '#c8f13510', borderColor: '#c8f13535' }
                      : { background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }
                    }
                  >
                    <span className="text-base leading-none">{t.icon}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: theme.id === t.id ? '#c8f135' : '#888' }}>{t.label}</span>
                    {theme.id === t.id && <Check size={10} className="ml-auto text-[#c8f135]" />}
                  </button>
                ))}
              </div>
            </section>

            {/* Output settings */}
            <section>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2.5 flex items-center gap-2">
                <Video size={10} className="text-[#c8f135]" /> Output
              </p>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[8px] text-gray-600 uppercase tracking-widest mb-1">Duration</p>
                  <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
                    {['4','6','8'].map(s => (
                      <button key={s} onClick={() => setDuration(s)}
                        className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        style={duration === s ? { background: '#c8f135', color: '#000' } : { color: '#555' }}
                      >{s}s</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[8px] text-gray-600 uppercase tracking-widest mb-1">Aspect Ratio</p>
                  <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
                    {['9:16','16:9','1:1'].map(r => (
                      <button key={r} onClick={() => setAspect(r)}
                        className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        style={aspect === r ? { background: '#c8f135', color: '#000' } : { color: '#555' }}
                      >{r}</button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* CENTER — Script */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-white/5">

          {/* Script header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20 flex-shrink-0 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-[#c8f135]" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em]">Podcast Script</span>
              
              <div className="w-32">
                <Dropdown 
                  value={`${lang.flag} ${lang.label}`}
                  options={LANGUAGES.map(l => `${l.flag} ${l.label}`)}
                  onChange={(val) => {
                    const selected = LANGUAGES.find(l => `${l.flag} ${l.label}` === val);
                    if (selected) setLang(selected);
                  }}
                  icon={Globe}
                />
              </div>

              <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[7px] font-mono text-gray-500">{lines.length} lines</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={generateAllAudio}
                disabled={genAudioIdx !== null || lines.every(l => !l.text.trim())}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)', color: '#aaa' }}
              >
                <Headphones size={11} />
                All Voices
              </button>
            </div>
          </div>

          {/* Topic + title inputs */}
          <div className="px-4 pt-3 pb-3 border-b border-white/5 flex-shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[8px] text-gray-600 uppercase tracking-widest mb-1">Podcast Title</p>
                <input
                  value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Two Minds on AI"
                  className="w-full bg-black/40 border border-white/8 rounded-lg px-3 py-2 text-[11px] text-white focus:outline-none focus:border-[#c8f135] transition-colors"
                />
              </div>
              <div>
                <p className="text-[8px] text-gray-600 uppercase tracking-widest mb-1">Episode Topic</p>
                <input
                  value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder={`e.g. AI in ${lang.label} cinema`}
                  className="w-full bg-black/40 border border-white/8 rounded-lg px-3 py-2 text-[11px] text-white focus:outline-none focus:border-[#c8f135] transition-colors"
                />
              </div>
            </div>
            <button
              onClick={generateScript}
              disabled={!topic.trim() || genScript}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border disabled:opacity-30"
              style={topic.trim() && !genScript
                ? { background: '#c8f135', color: '#000', borderColor: '#c8f135' }
                : { background: 'rgba(255,255,255,0.04)', color: '#555', borderColor: 'rgba(255,255,255,0.08)' }
              }
            >
              {genScript ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {genScript ? 'Generating Script…' : `Generate Script in ${lang.label}`}
            </button>
          </div>

          {/* Dialogue lines */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1a1a1a transparent' }}>
            <AnimatePresence mode="popLayout">
              {lines.map((line, i) => (
                <DialogueLine
                  key={line.id}
                  line={line}
                  idx={i}
                  hosts={hosts}
                  total={lines.length}
                  onUpdate={u => updateLine(i, u)}
                  onRemove={() => removeLine(i)}
                  onMoveUp={() => moveLine(i, -1)}
                  onMoveDown={() => moveLine(i, 1)}
                  isActive={activeLine === i}
                  onActivate={() => setActiveLine(i)}
                  isGenAudio={genAudioIdx === i}
                  isGenVideo={genVideoIdx === i}
                  videoMsg={videoMsg}
                  onGenAudio={() => generateAudio(i)}
                  onGenVideo={() => generateVideo(i)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Add line row */}
          <div className="px-4 py-3 border-t border-white/5 flex gap-2 flex-shrink-0 bg-black/20">
            <button onClick={() => addLine(0)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all"
              style={{ background: '#c8f13508', borderColor: '#c8f13525', color: '#c8f135' }}
            >
              <Plus size={10} /> {hosts[0].name || 'Host 1'}
            </button>
            <button onClick={() => addLine(1)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all"
              style={{ background: '#00ffe008', borderColor: '#00ffe025', color: '#00ffe0' }}
            >
              <Plus size={10} /> {hosts[1].name || 'Host 2'}
            </button>
          </div>
        </div>

        {/* RIGHT — Studio Monitor */}
        <div className="w-80 flex-shrink-0 flex flex-col">

          {/* Monitor header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Monitor size={13} className="text-[#c8f135]" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em]">Studio Monitor</span>
            </div>
            {previewVideo && (
              <button
                onClick={async () => {
                  const r = await fetch(previewVideo);
                  const b = await r.blob();
                  const u = URL.createObjectURL(b);
                  const a = document.createElement('a'); a.href = u;
                  a.download = `podcast_clip_${Date.now()}.mp4`;
                  a.click(); URL.revokeObjectURL(u);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: '#aaa' }}
              >
                <Download size={10} /> MP4
              </button>
            )}
          </div>

          {/* Monitor display */}
          <div className="flex-1 relative overflow-hidden bg-[#050505]">

            {/* HOSTS VIEW */}
            {monitorMode === 'hosts' && (
              <div className="absolute inset-0 flex flex-col">
                {/* Dual host frame */}
                <div className="flex-1 flex relative overflow-hidden">
                  {hosts.map((host, i) => (
                    <div key={i} className={`flex-1 relative ${i === 0 ? 'border-r border-white/5' : ''}`}>
                      {host.generatedImg || host.imgUrl ? (
                        <img src={host.generatedImg || host.imgUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ background: HOST_BG[i] }}>
                          <div className="w-14 h-14 rounded-full border-2 flex items-center justify-center" style={{ borderColor: HOST_BORDER[i] }}>
                            <User size={22} style={{ color: HOST_COLORS[i], opacity: 0.4 }} />
                          </div>
                          <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: HOST_COLORS[i], opacity: 0.4 }}>
                            {host.name || `Host ${i+1}`}
                          </p>
                        </div>
                      )}
                      {/* Name badge */}
                      <div className="absolute bottom-2 left-2 right-2 flex">
                        <div className="px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest backdrop-blur-md border"
                          style={{ background: `${HOST_COLORS[i]}12`, borderColor: `${HOST_COLORS[i]}30`, color: HOST_COLORS[i] }}
                        >
                          {host.name || `Host ${i+1}`}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Podcast overlay */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-black/70 rounded-full border border-white/10 backdrop-blur-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[7px] font-black uppercase tracking-widest text-white">REC</span>
                    </div>
                    <div className="px-2 py-1 bg-black/70 rounded-full border border-white/10 backdrop-blur-md">
                      <span className="text-[7px] font-mono text-[#c8f135]">{lang.flag} {lang.label}</span>
                    </div>
                  </div>
                </div>

                {/* Title card */}
                {(title || topic) && (
                  <div className="p-3 bg-black/60 border-t border-white/5 flex-shrink-0">
                    <p className="text-[9px] font-black text-white uppercase tracking-widest truncate">{title || 'Untitled Podcast'}</p>
                    {topic && <p className="text-[8px] text-gray-500 font-mono mt-0.5 truncate">{topic}</p>}
                  </div>
                )}
              </div>
            )}

            {/* VIDEO VIEW */}
            {monitorMode === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                {genVideoIdx !== null ? (
                  <Spinner msg={videoMsg} />
                ) : previewVideo ? (
                  <div className="relative w-full h-full flex items-center justify-center p-4">
                    <div className="relative h-full max-h-full bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                      style={{ aspectRatio: aspect === '9:16' ? '9/16' : aspect === '16:9' ? '16/9' : '1/1', maxWidth: '100%' }}
                    >
                      <video ref={videoRef} src={previewVideo} className="w-full h-full object-cover" loop autoPlay />
                      <button
                        onClick={() => videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause()}
                        className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity"
                      >
                        <div className="w-12 h-12 bg-[#c8f135]/90 rounded-full flex items-center justify-center">
                          <Play size={18} fill="black" className="ml-1" />
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 opacity-40">
                    <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
                      <Video size={24} className="text-[#c8f135]" />
                    </div>
                    <p className="text-[8px] font-mono uppercase tracking-widest text-gray-500 text-center px-6">
                      Produce a clip to preview here
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gallery */}
          {gallery.length > 0 && (
            <div className="border-t border-white/5 flex-shrink-0">
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-gray-500 flex items-center gap-1.5">
                  <Camera size={10} className="text-[#c8f135]" /> Generated ({gallery.length})
                </span>
                <button onClick={() => setGallery([])} className="text-[7px] text-gray-600 hover:text-red-400 transition-colors uppercase tracking-widest">Clear</button>
              </div>
              <div className="px-3 pb-3 grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#222 transparent' }}>
                {gallery.map(item => (
                  <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group cursor-pointer"
                    onClick={() => { if (item.url) { const a = document.createElement('a'); a.href = item.url; a.download = `podcast_img_${item.id}.png`; a.click(); } }}
                  >
                    <img src={item.url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Download size={14} className="text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats footer */}
          <div className="border-t border-white/5 p-4 flex-shrink-0 space-y-3 bg-black/20">
            {/* Progress */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Production</span>
                <span className="text-[8px] font-mono text-[#c8f135]">{clipped}/{lines.length} clips</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#00ffe0] to-[#c8f135] transition-all duration-700 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* 3 stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Lines',  val: lines.length, color: '#fff'     },
                { label: 'Voiced', val: voiced,        color: '#c8f135' },
                { label: 'Clips',  val: clipped,       color: '#00ffe0' },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-white/3 border border-white/5 rounded-xl p-2 text-center">
                  <div className="text-xl font-black" style={{ color }}>{val}</div>
                  <div className="text-[7px] font-mono text-gray-600 uppercase tracking-widest mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Active line info */}
            {lines[activeLine] && (
              <div className="p-2.5 rounded-xl border" style={{
                background: `${HOST_COLORS[lines[activeLine].hostId]}06`,
                borderColor: `${HOST_COLORS[lines[activeLine].hostId]}20`,
              }}>
                <p className="text-[7px] font-black uppercase tracking-widest mb-1" style={{ color: HOST_COLORS[lines[activeLine].hostId] }}>
                  {hosts[lines[activeLine].hostId]?.name || `Host ${lines[activeLine].hostId + 1}`} · Line {activeLine + 1}
                </p>
                {lines[activeLine].text && (
                  <p className="text-[9px] text-gray-500 italic leading-relaxed line-clamp-2">"{lines[activeLine].text}"</p>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
