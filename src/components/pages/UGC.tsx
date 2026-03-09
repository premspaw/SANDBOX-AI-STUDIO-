import React, { useState, useEffect } from 'react';
import { Upload, User, Box, FileText, Camera, Play, Pause, Wand2, Loader2, Volume2, Sparkles, Video, X, Scissors, Plus, Trash2, Save, ChevronRight, ChevronLeft, ChevronDown, Layout, AlertCircle, HelpCircle, Settings, SidebarClose, SidebarOpen, Download, ZoomIn, ZoomOut, GripVertical, Check, CheckCircle, BrainCircuit, Zap, ShieldCheck, Shield, MessageSquare, Clock, Activity, Maximize } from 'lucide-react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { supabase } from '../../lib/supabase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';

import * as pdfjsLib from 'pdfjs-dist';

// Use the worker file we copied to the public/ directory
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// ─── BRAND DESIGN TOKENS ──────────────────────────────────────
const T = {
  // Primary colors
  lime: '#c8f135',           // Main accent - CTAs, highlights
  limeGlow: '#9ef01a',       // Softer glow effects
  limeDim: 'rgba(200, 241, 53, 0.1)',  // Subtle backgrounds

  // Secondary
  cyan: '#00ffe0',           // Admin/secondary features
  cyanDim: 'rgba(0, 255, 224, 0.1)',

  // Status
  red: '#ff3a3a',

  // Base
  bg: '#050505',
  bg2: '#0c0c0c',
  bg3: '#111111',            // Add - Mid-level cards
  white: '#f0ede8',
  gray: 'rgba(255, 255, 255, 0.1)',
  grayText: '#999999',       // Add - Secondary text

  // Utilities
  glassBg: 'bg-gray-900/40 backdrop-blur-xl border-white/10',
  glassBorder: 'border-white/10',

  // Shadows for depth
  limeShadow: '0 0 20px rgba(200, 241, 53, 0.3)',
  cyanShadow: '0 0 20px rgba(0, 255, 224, 0.3)',
};

interface KnowledgeBaseEntry {
  id: string;
  name: string;
  content: string;
}

interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt?: string;
}

interface TimelineItem {
  id: string;
  url: string;
  start: number;
  end: number;
  duration: number;
  type: 'video' | 'audio';
  track: 1 | 2; // Track 1 for Audio, Track 2 for Video
}

interface Scene {
  id: string;
  text?: string;
  prompt: string;
  montagePrompts?: string[];
  montageImages?: string[];
  isApproved: boolean;
  visualCue?: string;
  timestamp?: string;
  label?: string;
}

const getAI = () => {
  const env = (import.meta as any).env || {};

  // Prioritize the injected API_KEY from the selection dialog
  const apiKey = (typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined) ||
    (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined) ||
    env.VITE_GOOGLE_API_KEY ||
    env.VITE_GEMINI_API_KEY ||
    (typeof window !== 'undefined' && (window as any).process?.env?.GEMINI_API_KEY);

  return new GoogleGenAI({ apiKey: apiKey || "" });
};

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const createWavUrl = (base64Data: string) => {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const float32Data = new Float32Array(bytes.length / 2);
  const dataView = new DataView(bytes.buffer);
  for (let i = 0; i < float32Data.length; i++) {
    float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0;
  }

  const buffer = new ArrayBuffer(44 + float32Data.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + float32Data.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true);
  view.setUint32(28, 24000 * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, float32Data.length * 2, true);

  let offset = 44;
  for (let i = 0; i < float32Data.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Data[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  const blob = new Blob([view], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

const playPcm = async (base64Data: string) => {
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const float32Data = new Float32Array(bytes.length / 2);
    const dataView = new DataView(bytes.buffer);
    for (let i = 0; i < float32Data.length; i++) {
      float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0;
    }

    const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
    buffer.getChannelData(0).set(float32Data);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
  } catch (err) {
    console.error("Failed to play audio", err);
  }
};

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

const Button = ({ children, onClick, disabled, loading, variant = 'primary', className = '' }: ButtonProps) => {
  const baseStyle = "relative font-sans text-[10px] font-black uppercase tracking-widest py-2.5 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden cursor-pointer active:scale-95 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#c8f135] text-black hover:brightness-110 shadow-[0_0_20px_rgba(200,241,53,0.3)] hover:shadow-[0_0_30px_rgba(200,241,53,0.5)] disabled:bg-[#222] disabled:text-[#555] disabled:shadow-none",
    secondary: "bg-transparent border border-white/20 text-white hover:bg-white/5 hover:border-[#c8f135] hover:text-[#c8f135] shadow-lg disabled:border-[#222] disabled:text-[#555]",
    ghost: "bg-transparent text-[#999] hover:text-white hover:bg-white/10"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : children}
    </button>
  );
};

interface DropdownProps {
  label?: string;
  value: string;
  options: string[];
  onChange: (val: any) => void;
  icon?: any;
  className?: string;
  direction?: 'up' | 'down';
}

const Dropdown = ({ label, value, options, onChange, icon: Icon, className = "", direction = "down" }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-gray-500 font-mono text-[8.5px] font-bold uppercase tracking-[0.2em] pl-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-10 flex items-center justify-between bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-lg px-4 text-white font-mono text-[9px] uppercase tracking-widest hover:border-white/30 hover:bg-gray-800/60 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            {Icon && <Icon size={13} className="text-[#c8f135]" />}
            <span className="truncate font-medium">{value}</span>
          </div>
          <ChevronDown size={13} className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className={`absolute ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-full bg-black/90 border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden backdrop-blur-2xl ring-1 ring-white/5`}>
              <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                {options.map((opt: string) => (
                  <button
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-[9px] font-mono uppercase tracking-widest transition-all rounded-md hover:bg-[#c8f135]/10 hover:text-[#c8f135] cursor-pointer ${value === opt ? 'bg-[#c8f135]/5 text-[#c8f135] font-bold' : 'text-gray-400'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const UGCProcessingOverlay = ({ type, message }: { type: 'image' | 'video', message?: string }) => {
  const [step, setStep] = useState(0);
  const steps = type === 'image'
    ? ["Setting up Studio Lights...", "Calibrating Creator Camera...", "Analyzing Product DNA...", "Synthesizing Natural Expressions...", "Capturing Cinematic Frame..."]
    : ["Analyzing Script Hooks...", "Synthesizing Motion Dynamics...", "Calibrating Lip-Sync Precision...", "Rendering Cinematic Frames...", "Finalizing UGC Aesthetic..."];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s: number) => (s + 1) % steps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl overflow-hidden">
      {/* Scanlines Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,255,160,0.06),rgba(0,255,224,0.02),rgba(200,241,53,0.06))] bg-[length:100%_2px,3px_100%]" />

      <div className="relative w-40 h-40 mb-10 flex items-center justify-center">
        <div className="absolute inset-0 border-2 border-[#c8f135]/5 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
        <div className="absolute inset-4 border border-[#00ffe0]/20 rounded-full animate-pulse" />
        <div className="absolute inset-0 border-t-2 border-b-2 border-[#c8f135] rounded-full animate-spin-slow" />
        <div className="absolute inset-2 border-l-2 border-r-2 border-[#00ffe0] rounded-full animate-spin" style={{ animationDuration: '3s' }} />

        <div className="relative z-10 p-6 bg-black/40 backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl">
          {type === 'image' ? (
            <Camera className="text-[#c8f135] w-10 h-10 drop-shadow-[0_0_10px_rgba(200,241,53,0.5)]" />
          ) : (
            <Video className="text-[#c8f135] w-10 h-10 drop-shadow-[0_0_10px_rgba(200,241,53,0.5)]" />
          )}
          <div className="absolute-top-1-right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(255,58,58,0.8)] border-2 border-black" />
        </div>
      </div>

      <div className="text-center space-y-6 max-w-xs px-6 relative z-10">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-3">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(255,58,58,0.6)]" />
            <p className="text-[#c8f135] font-black italic text-sm uppercase tracking-[0.25em] drop-shadow-[0_0_8px_rgba(200,241,53,0.4)]">
              {message || steps[step]}
            </p>
          </div>
          <p className="text-gray-500 font-mono text-[9px] uppercase tracking-[0.3em] font-medium">
            {type === 'image' ? 'Neural Frame Synthesis' : 'Temporal Motion Engine'}
          </p>
        </div>

        <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-[#00ffe0] to-[#c8f135] transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(200,241,53,0.6)]"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 pt-4">
          {["4K", "RAW", "LOG", "UGC", "REC"].map(tag => (
            <span key={tag} className={`text-[8px] font-bold font-mono border px-2 py-1 rounded transition-all tracking-widest ${tag === 'REC' ? 'text-red-500 border-red-500/40 bg-red-500/10 shadow-[0_0_10px_rgba(255,58,58,0.2)]' : 'text-white/30 border-white/10 bg-white/5'}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

interface CardProps {
  title: string;
  icon?: any;
  action?: React.ReactNode;
  tooltip?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

const Card = ({ title, icon: Icon, action, tooltip, children, className = '', contentClassName = 'p-4 gap-4' }: CardProps) => (
  <div className={`bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 hover:border-white/20 hover:bg-gray-800/60 group/card ${className}`}>
    <div className={`flex items-center flex-wrap gap-2 ${!title ? 'px-1 py-2' : 'px-2.5 py-3'} border-b border-white/5 bg-gradient-to-r from-white/[0.04] to-transparent ${!title ? '' : 'justify-between'}`} style={!title ? { display: 'grid', gridTemplateColumns: '1fr auto 1fr' } : undefined}>
      {title ? (
        <div className="flex items-center gap-3 text-white font-sans font-black text-[10.5px] uppercase tracking-[0.15em]">
          {Icon && <Icon size={17} className="text-[#c8f135] drop-shadow-[0_0_5px_rgba(200,241,53,0.3)]" />}
          <span className="flex items-center gap-2.5">
            {title}
            {tooltip && (
              <div className="group relative flex items-center">
                <HelpCircle size={15} className="text-[#555] group-hover:text-[#c8f135] transition-colors cursor-help" />
                <div className="absolute left-7 top-1/2-translate-y-1/2 w-64 p-3 bg-black/95 backdrop-blur-xl border border-white/15 text-gray-300 text-[11px] font-medium leading-relaxed normal-case tracking-normal rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-2xl pointer-events-none ring-1 ring-white/10">
                  {tooltip}
                </div>
              </div>
            )}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-start">
          {Icon && <Icon size={17} className="text-[#c8f135] drop-shadow-[0_0_5px_rgba(200,241,53,0.3)]" />}
        </div>
      )}
      {action && <div className="flex items-center justify-center">{action}</div>}
      {!title && <div />}
    </div>
    <div className={`flex-1 flex flex-col ${contentClassName}`}>
      {children}
    </div>
  </div>
);

const ImageUploadBox = ({ image, onUpload, label }: any) => { return null; }; // Replaced in-line


const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Malayalam', 'Kannada'];
const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

const SCENE_TEMPLATES = [
  { id: 1, title: 'Park Walk', sceneContext: 'A lush park', prompt: 'A casual vlog-style video of a creator walking through a bright, lush park. The camera bobs slightly to simulate walking. Natural sunlight illuminating the face, a gentle breeze in the air.', img: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=150' },
  { id: 2, title: 'Kitchen Review', sceneContext: 'A modern kitchen', prompt: 'Creator standing in a brightly lit modern kitchen with marble countertops. They are holding a product up to the camera with an excited expression. Warm indoor lighting.', img: 'https://images.unsplash.com/photo-1556910103-1c02745ae239?auto=format&fit=crop&q=80&w=150' },
  { id: 3, title: 'Car Vlog', sceneContext: 'Inside a moving car', prompt: 'Close-up shot of a creator sitting in the driver seat of a car, talking directly into the camera attached to the dashboard. Natural light coming through the windshield, soft background blur.', img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=150' },
  { id: 4, title: 'Bedroom Chat', sceneContext: 'A cozy bedroom', prompt: 'Creator sitting cross-legged on a bed in a cozy bedroom with warm string lights. They are casually chatting with the camera. Intimate, relaxed vibe.', img: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f1425?auto=format&fit=crop&q=80&w=150' },
  { id: 5, title: 'Street Style', sceneContext: 'A bustling street', prompt: 'Dynamic tracking shot of a creator walking down a bustling city street at golden hour. Trendy outfit, confident walk, talking directly to the viewer.', img: 'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?auto=format&fit=crop&q=80&w=150' },
  { id: 6, title: 'Makeup Session', sceneContext: 'A vanity mirror', prompt: 'Close-up of a creator sitting at a vanity mirror, applying makeup while giving tips to the camera. Soft ring light reflects in their eyes. High-detail skin textures.', img: 'https://images.unsplash.com/photo-1522335719551-bb2f15e3850d?auto=format&fit=crop&q=80&w=150' },
  { id: 7, title: 'Quiet Study', sceneContext: 'A library/study', prompt: 'Creator sitting at a wooden desk in a quiet library surrounded by books. They are whispering into the camera about their favorite reads. Moody, academic aesthetic.', img: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=150' }
];

const uploadToSupabase = async (blob: Blob, type: 'image' | 'video', promptText: string) => {
  if (!supabase) return null;

  try {
    const ext = type === 'image' ? 'png' : 'mp4';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('ugc_assets')
      .upload(fileName, blob, {
        contentType: type === 'image' ? 'image/png' : 'video/mp4'
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase
      .storage
      .from('ugc_assets')
      .getPublicUrl(fileName);

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from('generated_assets')
        .insert({
          user_id: user.id,
          asset_type: type,
          storage_path: fileName,
          public_url: publicUrlData.publicUrl,
          prompt: promptText
        });
    }
    console.log("Uploaded successfully to Supabase:", publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Supabase upload/DB error:", error);
    return null;
  }
};

interface SortableTimelineItemProps {
  item: TimelineItem;
  index: number;
  isSelected: boolean;
  zoomLevel: number;
  onSelect: (id: string) => void;
  onTrimStart: (id: string, start: number) => void;
  onTrimEnd: (id: string, end: number) => void;
  onRemove: (id: string) => void;
}

const SortableTimelineItem = ({ item, index, isSelected, zoomLevel, onSelect, onTrimStart, onTrimEnd, onRemove }: SortableTimelineItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: Math.max(60, (item.end - item.start) * zoomLevel) + 'px',
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handleTrimStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialStart = item.start;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = (moveEvent.clientX - startX) / zoomLevel;
      const newStart = Math.max(0, Math.min(initialStart + delta, item.end - 0.5));
      onTrimStart(item.id, newStart);
      if (videoRef.current) {
        videoRef.current.currentTime = newStart;
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleTrimEnd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialEnd = item.end;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = (moveEvent.clientX - startX) / zoomLevel;
      const newEnd = Math.min(item.duration, Math.max(initialEnd + delta, item.start + 0.5));
      onTrimEnd(item.id, newEnd);
      if (videoRef.current) {
        videoRef.current.currentTime = newEnd;
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(item.id)}
      className={`relative h-full flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all group ${isSelected ? 'border-[#c8f135] shadow-[0_0_20px_rgba(212,255,0,0.4)]' : 'border-[#222] hover:border-white/20'}`}
    >
      {/* Drag Handle */}
      <div {...attributes} {...listeners} className="absolute top-1 left-1/2-translate-x-1/2 z-40 p-1.5 bg-black/80 rounded-full cursor-grab active:cursor-grabbing text-[#c8f135] border border-[#c8f135]/30 shadow-lg group-hover:scale-110 transition-transform">
        <GripVertical size={12} />
      </div>

      {/* Trimming Handles */}
      <div
        onMouseDown={handleTrimStart}
        className="absolute left-0 inset-y-0 w-4 bg-[#c8f135]/10 hover:bg-[#c8f135]/40 z-50 cursor-ew-resize transition-all flex items-center justify-center group/handle"
      >
        <div className="w-1 h-8 bg-[#c8f135] rounded-full shadow-[0_0_10px_rgba(212,255,0,0.5)] group-hover/handle:scale-y-110 transition-transform" />
      </div>
      <div
        onMouseDown={handleTrimEnd}
        className="absolute right-0 inset-y-0 w-4 bg-[#c8f135]/10 hover:bg-[#c8f135]/40 z-50 cursor-ew-resize transition-all flex items-center justify-center group/handle"
      >
        <div className="w-1 h-8 bg-[#c8f135] rounded-full shadow-[0_0_10px_rgba(212,255,0,0.5)] group-hover/handle:scale-y-110 transition-transform" />
      </div>

      {/* Remove Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        className="absolute top-1.5 left-1.5 z-50 p-1.5 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-red-500/30 backdrop-blur-md"
      >
        <Trash2 size={10} />
      </button>

      {item.type === 'video' ? (
        <video ref={videoRef} src={item.url} className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#c8f135]/5">
          <Volume2 size={32} className="text-[#c8f135] opacity-20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-0.5 items-center h-8">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-[#c8f135]/40 rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 60}%`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent h-1/2" />

      <div className="absolute bottom-1.5 left-3 text-white font-mono text-[8px] font-bold drop-shadow-md flex items-center gap-1.5">
        {item.type === 'audio' ? <Volume2 size={10} className="text-[#c8f135]" /> : <Video size={10} className="text-gray-400" />}
        {index + 1}
      </div>

      <div className="absolute top-1.5 right-3 text-[#c8f135] font-mono text-[8px] bg-black/60 px-1.5 py-0.5 rounded border border-white/10">
        {(item.end - item.start).toFixed(1)}s
      </div>

      {isSelected && (
        <div className="absolute inset-0 border border-[#c8f135]/40 pointer-events-none animate-pulse" />
      )}
    </div>
  );
};

const SCRIPT_TONES: Record<string, { name: string; icon: string; description: string; prompt: string; category: string }> = {
  // MARKETING TONES
  viral_marketing: {
    category: "Marketing",
    name: "Viral Marketing",
    icon: "🔥",
    description: "High-energy hooks, fast-paced",
    prompt: "Write in a high-energy viral marketing style with attention-grabbing hooks, FOMO triggers, power words, short punchy sentences, and strong CTAs. Use pattern interrupts and scroll-stoppers."
  },
  luxury_sales: {
    category: "Marketing",
    name: "Luxury & Premium",
    icon: "💎",
    description: "Sophisticated, aspirational",
    prompt: "Write in an elegant, sophisticated tone emphasizing exclusivity, premium quality, and aspirational lifestyle. Use refined language, create desire through scarcity, focus on craftsmanship and prestige."
  },
  direct_response: {
    category: "Marketing",
    name: "Direct Response",
    icon: "🎯",
    description: "Problem-solution, urgent",
    prompt: "Write in a direct response style: identify pain point, present solution, emphasize benefits over features, create urgency, clear CTA. Use 'you' language and address objections."
  },
  social_proof: {
    category: "Marketing",
    name: "Social Proof",
    icon: "⭐",
    description: "Trust-building, relatable",
    prompt: "Write as if sharing a personal discovery or recommendation to a friend. Include relatable problems, emphasize results and transformations, use social proof language like 'everyone's talking about' and 'you need to try this'."
  },
  // STORYTELLING TONES
  emotional_story: {
    category: "Storytelling",
    name: "Emotional Story",
    icon: "❤️",
    description: "Personal, heartfelt",
    prompt: "Write a compelling emotional narrative with a personal journey arc. Start with vulnerability or challenge, show transformation, end with hope or triumph. Use vivid sensory details and emotional language."
  },
  hero_journey: {
    category: "Storytelling",
    name: "Hero's Journey",
    icon: "🦸",
    description: "Transformation arc",
    prompt: "Structure as a hero's journey: ordinary world → challenge/obstacle → struggle → breakthrough → transformation. Make the viewer the hero, product/service as the mentor/tool."
  },
  // EDUCATIONAL TONES
  educational: {
    category: "Educational",
    name: "Tutorial",
    icon: "📚",
    description: "Informative, clear",
    prompt: "Write in a clear, educational tone breaking down information into digestible steps. Use 'here's how', 'let me show you', numbered steps. Encourage learning with accessible language."
  },
  expert_tips: {
    category: "Educational",
    name: "Expert Tips",
    icon: "💡",
    description: "Insider knowledge",
    prompt: "Write as an expert sharing insider tips and life hacks. Use phrases like 'pro tip', 'here's what most people don't know', 'the secret is'. Make viewer feel they're getting exclusive knowledge."
  },
  myth_busting: {
    category: "Educational",
    name: "Myth-Busting",
    icon: "🔬",
    description: "Correcting misconceptions",
    prompt: "Start by calling out a common myth or misconception. Use 'stop believing', 'the truth is', 'here's what they don't tell you'. Build credibility by revealing insider information."
  },
  // LIFESTYLE TONES
  casual_vlog: {
    category: "Lifestyle",
    name: "Casual Vlog",
    icon: "📹",
    description: "Friendly, authentic",
    prompt: "Write in a casual, friend-to-friend conversational tone. Use contractions, filler words like 'so', 'like', casual language. Make it feel spontaneous and authentic, like talking to the camera."
  },
  day_in_life: {
    category: "Lifestyle",
    name: "Day in Life",
    icon: "🌅",
    description: "Personal narrative",
    prompt: "Write as a personal diary entry or day-in-the-life narrative. Use present tense, include time markers, show authentic moments. Balance routine with interesting details."
  },
  lifestyle_aspirational: {
    category: "Lifestyle",
    name: "Aspirational",
    icon: "✨",
    description: "Aesthetic, curated",
    prompt: "Write in an aspirational lifestyle tone emphasizing aesthetics, intentional living, elevated everyday moments. Use poetic language, focus on feelings and ambiance, create desire for the lifestyle."
  },
  // ENTERTAINMENT
  comedy_skit: {
    category: "Entertainment",
    name: "Comedy Skit",
    icon: "😂",
    description: "Funny, exaggerated",
    prompt: "Write with comedic timing using exaggeration, unexpected twists, relatable humor, and playful language. Include setup and punchline structure. Make it entertaining first, informative second."
  },
  reaction_commentary: {
    category: "Entertainment",
    name: "Reaction",
    icon: "🗣️",
    description: "Opinionated, engaging",
    prompt: "Write as live reaction or commentary. Use expressive language, exclamations, rhetorical questions. Share opinions boldly while keeping it entertaining. React authentically to surprises."
  },
  // NICHE
  unboxing_review: {
    category: "Niche",
    name: "Unboxing",
    icon: "📦",
    description: "First impressions",
    prompt: "Write as real-time unboxing experience. Build anticipation, share first impressions, cover features systematically, give honest pros/cons. Use 'wow', 'okay so', 'let's see' naturally."
  },
  comparison: {
    category: "Niche",
    name: "Comparison",
    icon: "⚖️",
    description: "Analytical, balanced",
    prompt: "Structure as balanced comparison: introduce both options, compare key features side-by-side, highlight strengths/weaknesses, give clear verdict. Use 'versus', 'on the other hand', 'the winner is'."
  },
  before_after: {
    category: "Niche",
    name: "Before/After",
    icon: "🔄",
    description: "Results-driven",
    prompt: "Emphasize dramatic transformation. Start with 'before' pain point or problem state, build anticipation, reveal 'after' results. Use time markers and quantifiable results. Make the change feel achievable."
  },
  // URGENCY
  trending_now: {
    category: "Urgency",
    name: "Trending Now",
    icon: "🌊",
    description: "Timely, relevant",
    prompt: "Reference current trend or viral moment. Use 'everyone's talking about', 'if you haven't seen', 'this is blowing up'. Create FOMO around being in the know. Strike while relevant."
  },
  limited_time: {
    category: "Urgency",
    name: "Limited Time",
    icon: "⏰",
    description: "Scarcity-driven",
    prompt: "Create strong urgency with time/quantity scarcity. Use 'only', 'last chance', 'don't miss out', countdown language. Make inaction feel like a loss. Clear deadline and strong CTA."
  },
  // TRUST
  honest_review: {
    category: "Trust",
    name: "Brutally Honest",
    icon: "💯",
    description: "Transparent, no-BS",
    prompt: "Write with radical honesty and transparency. Call out both pros AND cons, admit sponsorships or biases, use 'let me be real', 'not gonna lie'. Build trust through authenticity over perfection."
  },
  personal_recommendation: {
    category: "Trust",
    name: "Personal Rec",
    icon: "🤝",
    description: "Genuine, helpful",
    prompt: "Write as sincere recommendation to a friend. Use 'I genuinely', 'you have to try', personal anecdotes. Show you use/love it yourself. Make viewer feel you care about helping them."
  }
};

const VIDEO_STYLES: Record<string, { name: string; icon: string; description: string; modifier: string }> = {
  calm: {
    name: "Calm & Natural",
    icon: "😌",
    description: "Gentle, conversational",
    modifier: "calm and natural delivery, subtle hand gestures, gentle pacing, conversational tone, minimal dramatic movements, soft eye contact"
  },
  energetic: {
    name: "Energetic",
    icon: "⚡",
    description: "Fast-paced, expressive",
    modifier: "energetic and dynamic performance, fast-paced delivery, expressive hand gestures, animated facial expressions, vibrant energy"
  },
  action: {
    name: "Action-Packed",
    icon: "🎬",
    description: "Dramatic, intense",
    modifier: "action-oriented performance, dramatic movements, intense expressions, powerful gestures, high energy, cinematic delivery"
  },
  professional: {
    name: "Professional",
    icon: "💼",
    description: "Corporate, confident",
    modifier: "professional and polished delivery, confident posture, measured gestures, corporate aesthetic, business-appropriate tone"
  },
  casual: {
    name: "Casual & Fun",
    icon: "😄",
    description: "Relaxed, friendly",
    modifier: "casual and fun atmosphere, relaxed demeanor, spontaneous gestures, friendly smile, approachable vibe"
  },
  storytelling: {
    name: "Storytelling",
    icon: "📖",
    description: "Narrative-driven",
    modifier: "narrative storytelling style, expressive delivery with emotional range, thoughtful pauses, varied pacing, engaging eye contact"
  }
};

const MONTAGE_CAMERA_STYLES = [
  "Fast Pace / Hyper-edited",
  "Extreme Close-up (Macro)",
  "Cinematic Pan / Reveal",
  "POV (Point of View)",
  "Handheld / Shaky (UGC Style)",
  "Slow Motion",
  "Drone Shot / Aerial",
  "Low Angle (Hero Shot)"
];

export default function UGC() {
  const [characterImg, setCharacterImg] = useState<{ url: string, file: File } | null>(null);
  const [productImg, setProductImg] = useState<{ url: string, file: File } | null>(null);

  const [productTags, setProductTags] = useState<string[]>([]);
  const [productDetails, setProductDetails] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [script, setScript] = useState('');
  const [scriptDuration, setScriptDuration] = useState('16 seconds');
  const [selectedScriptTone, setSelectedScriptTone] = useState('viral_marketing');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([
    { id: '1', prompt: '', isApproved: false }
  ]);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [audioData, setAudioData] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('English');
  const [voice, setVoice] = useState('Kore');
  const [imageStyle, setImageStyle] = useState<'studio' | 'ultra-realistic' | 'iphone' | 'short' | 'normal' | 'cinematic'>('ultra-realistic');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [durationSeconds, setDurationSeconds] = useState<'4' | '6' | '8'>('6');
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('720p');
  const [selectedVideoStyle, setSelectedVideoStyle] = useState<'calm' | 'energetic' | 'action' | 'professional' | 'casual' | 'storytelling'>('calm');

  const [renderMode, setRenderMode] = useState<'image' | 'video'>('image');
  const [generatedImg, setGeneratedImg] = useState('');
  const [imageEditPrompt, setImageEditPrompt] = useState('');
  const [imageSuggestions, setImageSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [isRefinementOpen, setIsRefinementOpen] = useState(false);
  const [isExpandModalOpen, setIsExpandModalOpen] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState('');
  const [sourceVideo, setSourceVideo] = useState<{ url: string, file: File } | null>(null);
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState(false);
  const [timeline, setTimeline] = useState<TimelineItem[]>(() => {
    const saved = localStorage.getItem('ugc_timeline_cache');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  const [zoomLevel, setZoomLevel] = useState(40); // pixels per second
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessingTimeline, setIsProcessingTimeline] = useState(false);

  const totalTimelineDuration = Math.max(
    timeline.filter(t => t.track === 1).reduce((acc: number, t: TimelineItem) => acc + (t.end - t.start), 0),
    timeline.filter(t => t.track === 2).reduce((acc: number, t: TimelineItem) => acc + (t.end - t.start), 0)
  );

  const getCurrentClip = (time: number, track: 1 | 2 = 2) => {
    let accumulatedTime = 0;
    const trackTimeline = timeline.filter(t => t.track === track);
    for (const item of trackTimeline) {
      const itemDuration = item.end - item.start;
      if (time >= accumulatedTime && time < accumulatedTime + itemDuration) {
        return { item, localTime: item.start + (time - accumulatedTime) };
      }
      accumulatedTime += itemDuration;
    }
    return null;
  };

  const activeVideoClip = getCurrentClip(currentTime, 2);
  const activeAudioClip = getCurrentClip(currentTime, 1);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(x / zoomLevel, totalTimelineDuration));
    setCurrentTime(newTime);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTimeline((items: TimelineItem[]) => {
        const oldIndex = items.findIndex((item: TimelineItem) => item.id === active.id);
        const newIndex = items.findIndex((item: TimelineItem) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev: number) => {
          if (prev >= totalTimelineDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.05;
        });
      }, 50);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isPlaying, totalTimelineDuration]);

  useEffect(() => {
    localStorage.setItem('ugc_timeline_cache', JSON.stringify(timeline));
  }, [timeline]);

  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [trainedStrategy, setTrainedStrategy] = useState<string>(() => {
    return localStorage.getItem('ugc_trained_strategy') || '';
  });
  const [isTraining, setIsTraining] = useState(false);

  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseEntry[]>(() => {
    const saved = localStorage.getItem('ugc_knowledge_base');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('ugc_knowledge_base', JSON.stringify(knowledgeBase));
  }, [knowledgeBase]);

  useEffect(() => {
    localStorage.setItem('ugc_trained_strategy', trainedStrategy);
  }, [trainedStrategy]);

  const handleAdminLogin = () => {
    if (adminPassword === 'admin123') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
    } else {
      window.toast('Invalid password');
    }
  };

  const trainAgent = async () => {
    if (knowledgeBase.length === 0) return;

    setIsTraining(true);
    try {
      const ai = getAI();
      const allContent = knowledgeBase.map((kb: KnowledgeBaseEntry) => kb.content).join('\n\n---\n\n');

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Analyze the following viral UGC scripts and documents. 
        Extract a "Viral Strategy" that includes:
        1. Common Hook Patterns
        2. Pacing and Timing Secrets
        3. Emotional Triggers used
        4. Call to Action (CTA) variations that convert.
        
        SCRIPTS TO ANALYZE:
        ${allContent}
        
        Return a concise, high-impact "Viral Strategy" that can be used to guide future script generation.`,
      });

      const strategy = response.text || '';
      setTrainedStrategy(strategy);
    } catch (error) {
      console.error('Training failed:', error);
    } finally {
      setIsTraining(false);
    }
  };

  const [sceneContext, setSceneContext] = useState('Studio (Default)');
  const [isGeneratingMagicPrompt, setIsGeneratingMagicPrompt] = useState(false);
  const [montageUserInput, setMontageUserInput] = useState('');
  const [montageCameraStyle, setMontageCameraStyle] = useState('Fast Pace / Hyper-edited');
  const [showMontageOptions, setShowMontageOptions] = useState(false);
  const [generatingMontageIdx, setGeneratingMontageIdx] = useState<number | null>(null);

  const [isUploadingKB, setIsUploadingKB] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);


  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const resetSidebarTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowTemplates(false);
    }, 10000);
  };

  useEffect(() => {
    if (showTemplates) {
      resetSidebarTimer();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [showTemplates]);

  const handleKBUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingKB(true);
    const newEntries: { id: string, name: string, content: string }[] = [];
    let hasError = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        let text = '';
        if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';
          for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            fullText += content.items.map((item: any) => (item as any).str).join(' ') + '\n';
          }
          text = fullText;
        } else {
          text = await file.text();
        }

        if (text.trim()) {
          newEntries.push({
            id: Math.random().toString(36).substring(7),
            name: file.name,
            content: text
          });
        }
      } catch (err) {
        hasError = true;
        console.error(`Failed to parse ${file.name}`, err);
        window.toast(`Failed to parse ${file.name}. Please check console for details.`);
      }
    }

    if (newEntries.length > 0) {
      setKnowledgeBase((prev: KnowledgeBaseEntry[]) => [...prev, ...newEntries]);
      if (!hasError) window.toast(`${newEntries.length} document(s) loaded successfully into Viral DNA!`);
    }

    setIsUploadingKB(false);
    e.target.value = '';
  };

  const removeKBEntry = (id: string) => {
    setKnowledgeBase((prev: KnowledgeBaseEntry[]) => prev.filter((e: KnowledgeBaseEntry) => e.id !== id));
  };

  const ffmpegRef = React.useRef(new FFmpeg());

  useEffect(() => {
    // Fetch previous generations from Supabase
    const fetchAssets = async () => {
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('generated_assets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const historyGallery: GalleryItem[] = data.map(item => ({
          id: item.id,
          type: item.asset_type as 'image' | 'video',
          url: item.public_url,
          prompt: item.prompt
        }));

        // Use functional state update to avoid overwriting session-generated assets
        setGallery((prev: GalleryItem[]) => {
          const newItems = historyGallery.filter((hist: GalleryItem) => !prev.some((p: GalleryItem) => p.url === hist.url));
          return [...prev, ...newItems];
        });
      }
    };

    fetchAssets();
  }, []);



  const addToTimeline = (item: any) => {
    if (item.type !== 'video' && item.type !== 'audio') return;

    // Use the current duration setting or the item's duration if it's audio
    const duration = item.type === 'audio' ? (item.duration || 10) : parseInt(durationSeconds);

    const newEntry: TimelineItem = {
      id: Date.now().toString(),
      url: item.url,
      start: 0,
      end: duration,
      duration: duration,
      type: item.type as 'video' | 'audio',
      track: item.type === 'audio' ? 1 : 2
    };
    setTimeline([...timeline, newEntry]);
  };

  const removeFromTimeline = (id: string) => {
    setTimeline(timeline.filter((t: TimelineItem) => t.id !== id));
    if (selectedTimelineId === id) setSelectedTimelineId(null);
  };

  const updateTimelineItem = (id: string, updates: Partial<TimelineItem>) => {
    setTimeline(timeline.map((t: TimelineItem) => t.id === id ? { ...t, ...updates } : t));
  };

  const moveTimelineItem = (index: number, direction: 'left' | 'right') => {
    const newTimeline = [...timeline];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= timeline.length) return;

    [newTimeline[index], newTimeline[targetIndex]] = [newTimeline[targetIndex], newTimeline[index]];
    setTimeline(newTimeline);
  };

  const processTimeline = async () => {
    if (timeline.length === 0) return;
    setIsProcessingTimeline(true);
    try {
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg.loaded) {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
      }

      const inputFiles = [];
      for (let i = 0; i < timeline.length; i++) {
        const item = timeline[i];
        const inputName = item.type === 'video' ? `input${i}.mp4` : `input${i}.wav`;
        const outputName = `output${i}.mp4`;
        await ffmpeg.writeFile(inputName, await fetchFile(item.url));

        if (item.type === 'video') {
          // Trim video
          await ffmpeg.exec([
            '-ss', item.start.toString(),
            '-to', item.end.toString(),
            '-i', inputName,
            '-c:v', 'copy',
            '-c:a', 'copy',
            outputName
          ]);
        } else {
          // Convert audio to video with black background
          const duration = item.end - item.start;
          const res = videoResolution === '1080p' ? '1920x1080' : '1280x720';
          await ffmpeg.exec([
            '-ss', item.start.toString(),
            '-to', item.end.toString(),
            '-f', 'lavfi',
            '-i', `color=c=black:s=${res}:r=30`,
            '-i', inputName,
            '-t', duration.toString(),
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-pix_fmt', 'yuv420p',
            '-shortest',
            outputName
          ]);
        }
        inputFiles.push(outputName);
      }

      // Merge command
      const listContent = inputFiles.map((f: string) => `file ${f}`).join('\n');
      await ffmpeg.writeFile('list.txt', listContent);

      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'list.txt',
        '-c', 'copy',
        'final.mp4'
      ]);

      const data = await ffmpeg.readFile('final.mp4');
      const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: 'video/mp4' }));

      setGeneratedVideo(url);
      setGallery((prev: GalleryItem[]) => [{ id: Date.now().toString(), type: 'video', url }, ...prev]);
      setRenderMode('video');
    } catch (e) {
      console.error("Timeline processing failed", e);
      window.toast("Video processing failed. This might be due to browser security restrictions or file format issues.");
    }
    setIsProcessingTimeline(false);
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isAnalyzingScenes, setIsAnalyzingScenes] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgressMsg, setVideoProgressMsg] = useState('');
  const [videoError, setVideoError] = useState('');

  const [hasPaidKey, setHasPaidKey] = useState(!!(typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_API_KEY) || !!(typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_PROJECT_ID));

  useEffect(() => {
    const checkKey = async () => {
      if ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_API_KEY) || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_PROJECT_ID)) {
        setHasPaidKey(true);
        return;
      }
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasPaidKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      // Assume success as per guidelines to mitigate race conditions
      setHasPaidKey(true);
      setVideoError('');
    }
  };

  const handleResetKey = async () => {
    setHasPaidKey(false);
    setVideoError('');
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasPaidKey(true);
    }
  };

  const toggleAudio = () => {
    if (!audioUrl) return;

    if (currentAudio) {
      if (isAudioPlaying) {
        currentAudio.pause();
        setIsAudioPlaying(false);
      } else {
        currentAudio.play().catch((err: any) => console.error("Playback failed", err));
        setIsAudioPlaying(true);
      }
    } else {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsAudioPlaying(false);
      audio.play().catch((err: any) => console.error("Playback failed", err));
      setCurrentAudio(audio);
      setIsAudioPlaying(true);
    }
  };

  useEffect(() => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsAudioPlaying(false);
    }
  }, [audioUrl]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'character' | 'product' | 'generated') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'character') setCharacterImg({ url, file });
    else if (type === 'product') setProductImg({ url, file });
    else {
      setGeneratedImg(url);
      setGallery((prev: GalleryItem[]) => [...prev, { id: Date.now().toString(), type: 'image', url }]);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSourceVideo({ url, file });
  };

  const analyzeVideo = async () => {
    if (!sourceVideo) return;
    setIsAnalyzingVideo(true);
    try {
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg.loaded) {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
      }

      const videoData = await fetchFile(sourceVideo.file);
      await ffmpeg.writeFile('input.mp4', videoData);

      // Extract frame at 1s
      await ffmpeg.exec(['-i', 'input.mp4', '-ss', '00:00:01', '-frames:v', '1', 'frame.jpg']);
      const frameData = await ffmpeg.readFile('frame.jpg');
      const frameBase64 = btoa(
        new Uint8Array((frameData as Uint8Array).buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Extract audio (first 10s)
      await ffmpeg.exec(['-i', 'input.mp4', '-t', '10', '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', 'audio.wav']);
      const audioData = await ffmpeg.readFile('audio.wav');
      const audioBase64 = btoa(
        new Uint8Array((audioData as Uint8Array).buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { inlineData: { mimeType: 'image/jpeg', data: frameBase64 } },
          { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
          { text: 'Analyze this video reference. Extract the visual style, the creator\'s tone, and the script being said. Provide a "creativeDirection", a "script", and a "visualPrompt" for a new UGC ad based on this reference.' }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              creativeDirection: { type: Type.STRING },
              script: { type: Type.STRING },
              visualPrompt: { type: Type.STRING }
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      if (result.creativeDirection) setUserPrompt(result.creativeDirection);
      if (result.script) setScript(result.script);
      if (result.visualPrompt) setVideoPrompt(result.visualPrompt);

    } catch (e) {
      console.error("Video analysis failed", e);
      window.toast("Video analysis failed. Please try again.");
    }
    setIsAnalyzingVideo(false);
  };

  const analyzeProduct = async () => {
    if (!productImg) return;
    setIsAnalyzing(true);
    try {
      const ai = getAI();
      const imagePart = await fileToGenerativePart(productImg.file);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          imagePart,
          { text: 'Analyze this product for a UGC ad.' }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "4-6 short descriptive keywords (e.g., 'Lipstick', 'Matte Finish', 'Gold Casing')"
              },
              description: {
                type: Type.STRING,
                description: "A punchy 2-sentence description of the product's visual appeal and vibe."
              }
            },
            required: ["tags", "description"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      if (data.tags) setProductTags(data.tags);
      if (data.description) setProductDetails(data.description);
    } catch (e) {
      console.error(e);
    }
    setIsAnalyzing(false);
  };

  const splitScriptIntoScenes = (text: string) => {
    if (!text) return [];

    const targetWordsPerScene = 25;
    const maxWordsPerScene = 29;
    const newScenes: Scene[] = [];

    // First, split by existing brackets if they exist to respect the logical structure
    const segments = text.split(/\[\d+:\d+\s*-\s*\d+:\d+\]\s*/).filter(s => s.trim().length > 0);
    const headers = text.match(/\[\d+:\d+\s*-\s*\d+:\d+\]\s*([A-Z0-9\s]+)/gi) || [];

    // If no structure at all, treat the whole block as one segment
    const blocksToProcess = segments.length > 0 ? segments : [text];

    blocksToProcess.forEach((segmentText, segIdx) => {
      // Extract label if possible
      let label = 'SCENE';
      if (headers[segIdx]) {
        const labelMatch = headers[segIdx].match(/\]\s*(.*)/i);
        label = labelMatch ? labelMatch[1].trim() : 'SCENE';
      }

      const words = segmentText.split(/\s+/).filter(w => w.length > 0);

      // If the segment is small enough, keep it together
      if (words.length <= maxWordsPerScene) {
        const startTime = newScenes.length * 8;
        newScenes.push({
          id: (newScenes.length + 1).toString(),
          text: segmentText.trim(),
          prompt: '',
          isApproved: false,
          visualCue: '',
          timestamp: `[${Math.floor(startTime / 60)}:${(startTime % 60).toString().padStart(2, '0')} - ${Math.floor((startTime + 8) / 60)}:${((startTime + 8) % 60).toString().padStart(2, '0')}]`,
          label: label
        });
      } else {
        // Sub-split into targetWordsPerScene chunks
        for (let i = 0; i < words.length; i += targetWordsPerScene) {
          const chunk = words.slice(i, i + targetWordsPerScene).join(' ');
          const startTime = newScenes.length * 8;
          newScenes.push({
            id: (newScenes.length + 1).toString(),
            text: chunk,
            prompt: '',
            isApproved: false,
            visualCue: '',
            timestamp: `[${Math.floor(startTime / 60)}:${(startTime % 60).toString().padStart(2, '0')} - ${Math.floor((startTime + 8) / 60)}:${((startTime + 8) % 60).toString().padStart(2, '0')}]`,
            label: label
          });
        }
      }
    });

    return newScenes;
  };

  const analyzeScenes = () => {
    if (!script) return;
    const newScenes = splitScriptIntoScenes(script);
    setScenes(newScenes);
    if (newScenes.length > 0) setActiveSceneIndex(0);
  };

  const getRelevantTraining = (duration: string) => {
    // Map duration to training file names
    const trainingMap: { [key: string]: string } = {
      '8 seconds': '8-Second',
      '16 seconds': '16Second',
      '24 seconds': '24Second',
      '36 seconds': '34Second'
    };

    const durationKey = trainingMap[duration] || '24Second';

    // Find matching training documents from knowledge base
    const relevantTraining = knowledgeBase.filter(kb =>
      kb.name.includes(durationKey) || kb.name.includes('Universal')
    );

    // Combine their content
    return relevantTraining.map(kb => kb.content).join('\n\n');
  };

  const generateScript = async () => {
    setIsGeneratingScript(true);
    setScript('');
    setVideoPrompt('');
    try {
      const ai = getAI();

      // GET RELEVANT TRAINING EXAMPLES
      const trainingContent = getRelevantTraining(scriptDuration);

      const strategyContext = trainedStrategy
        ? `\n\nTRAINED VIRAL STRATEGY (APPLY THESE PATTERNS):\n${trainedStrategy}\n\nINSTRUCTION: Use the patterns, hooks, and pacing identified in the strategy above to craft this new script.`
        : '';

      const durationInt = parseInt(scriptDuration);
      const sceneCount = Math.ceil(durationInt / 8);

      const durationLogic = {
        8: "1 HOOK scene",
        16: "1 HOOK scene (8s) and 1 PAYOFF/CTA scene (8s)",
        24: "1 HOOK (8s), 1 PAYOFF (8s), and 1 CTA (8s)",
        36: "1 HOOK (8s), 2 PERSUASIVE/PAYOFF scenes (8s each), and 1 CTA (8s)"
      }[durationInt as 8 | 16 | 24 | 36] || "multiple 8-second scenes";

      const prompt = `CRITICAL INSTRUCTION: You have been trained on proven viral script templates. 
      Review the training examples below BEFORE writing the script. 
      Follow the exact patterns, word counts, and structures shown in the examples.

═══════════════════════════════════════════════════════════════════
TRAINING EXAMPLES FOR ${scriptDuration.toUpperCase()}
═══════════════════════════════════════════════════════════════════

${trainingContent || 'No specific templates found. Follow general viral best practices.'}

═══════════════════════════════════════════════════════════════════
END OF TRAINING EXAMPLES
═══════════════════════════════════════════════════════════════════

NOW, using the patterns and principles shown above, generate a NEW script for:

PRODUCT: ${productDetails}
TONE: ${SCRIPT_TONES[selectedScriptTone]?.prompt || SCRIPT_TONES.viral_marketing.prompt}
DURATION: ${scriptDuration} (${durationLogic})
${userPrompt ? `USER INSTRUCTIONS: ${userPrompt}` : ''}
LANGUAGE: ${language}

MANDATORY REQUIREMENTS:
1. WORD COUNT: Strictly ${durationInt === 8 ? '20-30 words' : '20-30 words PER 8-second scene'}. (Total words for ${scriptDuration}: ${sceneCount * 25} approx).
2. STRUCTURE: Maintain the exactly ${sceneCount} scene structure (${durationLogic}).
3. PAYOFF FOCUS: For durations > 8s, significantly expand the PAYOFF/VALUE blocks to fill the extra time.
4. FORMATTING: Use the exact formatting: [0:00 - 0:08] HOOK, etc.
5. QUALITY: High-energy, scroll-stopping dialogue. No word repetition.
6. CONTENT: 20-30 words total per scene.
7. LANGUAGE: ${language}
8. TONE: ${SCRIPT_TONES[selectedScriptTone]?.prompt || SCRIPT_TONES.viral_marketing.prompt}

Return ONLY a valid JSON object with the following structure:
{
  "script": "The clean dialogue-only script with timestamps and labels",
  "scenes": [
    {
      "id": "1",
      "timestamp": "0:00 - 0:08",
      "label": "HOOK",
      "dialogue": "Spoken text for scene 1",
      "visualCue": "Detailed visual action/logic for Veo 3.1 expansion"
    }
  ]
}`;

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              script: { type: Type.STRING },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    timestamp: { type: Type.STRING },
                    label: { type: Type.STRING },
                    dialogue: { type: Type.STRING },
                    visualCue: { type: Type.STRING }
                  },
                  required: ["id", "timestamp", "label", "dialogue", "visualCue"]
                }
              }
            },
            required: ["script", "scenes"]
          }
        }
      });

      let fullText = '';
      for await (const chunk of responseStream) {
        fullText += chunk.text;

        // Try to extract the script part from partial JSON
        // Look for "script": "..."
        const scriptMatch = fullText.match(/"script":\s*"((?:[^"\\]|\\.)*)"/);
        if (scriptMatch && scriptMatch[1]) {
          // Unescape basic characters if needed, but for preview raw is fine
          setScript(scriptMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'));
        }
      }

      // Final parse to get the structured data
      try {
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        const data = JSON.parse(jsonMatch ? jsonMatch[0] : fullText);

        if (data.script) {
          setScript(data.script);
        }

        if (data.scenes && Array.isArray(data.scenes)) {
          const structuredScenes: Scene[] = data.scenes.map((s: any) => ({
            id: s.id || Math.random().toString(36).substring(7),
            text: s.dialogue || '',
            prompt: '',
            isApproved: false,
            visualCue: s.visualCue || '',
            timestamp: s.timestamp || '',
            label: s.label || ''
          }));
          setScenes(structuredScenes);
          if (structuredScenes.length > 0) setActiveSceneIndex(0);
        } else {
          // Fallback if scenes array is missing
          const automaticallySplitScenes = splitScriptIntoScenes(data.script || fullText);
          setScenes(automaticallySplitScenes);
          if (automaticallySplitScenes.length > 0) setActiveSceneIndex(0);
        }
      } catch (e) {
        console.error("Final JSON parse failed", e, fullText);
        const fallbackScenes = splitScriptIntoScenes(fullText);
        setScenes(fallbackScenes);
        if (fallbackScenes.length > 0) setActiveSceneIndex(0);
      }
    } catch (e) {
      console.error(e);
    }
    setIsGeneratingScript(false);
  };

  const [isRegeneratingPart, setIsRegeneratingPart] = useState(false);

  const regenerateScriptPart = async (idx: number, label: string) => {
    if (!script || scenes.length <= idx) return;
    setIsRegeneratingPart(true);
    try {
      const ai = getAI();
      const prompt = `You are an expert UGC video editor refining a viral script. 
      CURRENT FULL SCRIPT:
      ${script}
      
      TASK: Provide a COMPLETELY DIFFERENT and MORE COMPELLING version of the ${label} for Scene ${idx + 1}.
      The new version MUST flow seamlessly with the rest of the script but offer a fresh hook, different phrasing, or a new value proposition.
      WORD COUNT: Strictly 20-30 words for this 8-second segment.
      
      Return ONLY a valid JSON object:
      {
        "newDialogue": "The new spoken text for this ${label}",
        "newVisualCue": "A new visual action description for Veo 3.1"
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              newDialogue: { type: Type.STRING },
              newVisualCue: { type: Type.STRING }
            },
            required: ["newDialogue", "newVisualCue"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      if (data.newDialogue) {
        setScenes(prev => {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            text: data.newDialogue,
            visualCue: data.newVisualCue || updated[idx].visualCue
          };

          // Rebuild full script text to keep it in sync
          const newScript = updated.map(s => `[${s.timestamp}] ${s.label || 'SCENE'}\n${s.text}`).join('\n\n');
          setScript(newScript);
          return updated;
        });
      }
    } catch (e) {
      console.error("Regeneration failed", e);
    }
    setIsRegeneratingPart(false);
  };

  const generateMagicPrompt = async (index: number = activeSceneIndex) => {
    setIsGeneratingMagicPrompt(true);

    const updateScenePrompt = (val: string) => {
      setScenes((prev: Scene[]) => prev.map((s: Scene, i: number) => i === index ? { ...s, prompt: val } : s));
      if (index === activeSceneIndex) setVideoPrompt(val);
    };

    updateScenePrompt("Generating AI suggestion...");

    try {
      const ai = getAI();
      const contents = [];
      if (characterImg) {
        contents.push(await fileToGenerativePart(characterImg.file));
      }

      let basePrompt = `You are an expert AI video prompt engineer for Veo 3.1. 
      Your goal is to write a high-density, 60-word cinematic prompt for Scene ${index + 1}.

      CRITICAL PERFORMANCE REQUIREMENTS:
      - LIPSYNC: Mouth movements must be perfectly synchronized with the spoken dialogue: "${scenes[index]?.text || ""}".
      - FACIAL EXPRESSIONS: Naturally blinking eyes, micro-expressions (eyebrow raises, smiles), and head tilts that match the tone.
      - CAMERA ANGLE: Describe a professional cinematic shot (e.g., POV, Handheld UGC, Close-up, or 45-degree profile) that fits the narrative.
      - ACTION: Describe one smooth, continuous 8-second performance. No cuts.
      - VISUAL DETAIL: Focus on realistic skin textures, lighting reflections, and a shallow depth of field (bokeh).`;

      if (characterImg) {
        basePrompt += ` The subject is the specific person from the provided image. Keep their appearance consistent.`;
      }

      if (productDetails) {
        basePrompt += ` They are showcasing/interacting with: ${productDetails}.`;
      }

      if (scenes[index]?.visualCue) {
        basePrompt += `\n\nDIRECTION: ${scenes[index].visualCue}.`;
      }

      // Add video style modifier
      if (selectedVideoStyle && VIDEO_STYLES[selectedVideoStyle]) {
        basePrompt += `\n\nPERFORMANCE VIBE: ${VIDEO_STYLES[selectedVideoStyle].modifier}.`;
      }

      contents.push({ text: basePrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
      });

      const generatedText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      updateScenePrompt(generatedText.replace(/`/g, '').trim());
    } catch (e) {
      console.error(e);
      updateScenePrompt("Error generating prompt. Please try again.");
    }

    setIsGeneratingMagicPrompt(false);
  };

  const generateMontagePrompts = async (index: number = activeSceneIndex) => {
    setIsGeneratingMagicPrompt(true);

    const updateMontagePrompts = (prompts: string[]) => {
      setScenes((prev: Scene[]) => prev.map((s: Scene, i: number) => i === index ? { ...s, montagePrompts: prompts } : s));
    };

    updateMontagePrompts(["Generating Montage Options..."]);

    try {
      const ai = getAI();
      const contents = [];
      if (characterImg) {
        contents.push(await fileToGenerativePart(characterImg.file));
      }

      let basePrompt = `You are an expert AI video prompt engineer. Produce 3 highly distinct, dynamic "Montage Clip" concepts for Scene ${index + 1}.

      REQUIREMENTS:
      1. Camera Style: Highlight ${montageCameraStyle} techniques.
      2. If a product is mentioned (${productDetails || "the main subject"}), show dynamic interaction.
      3. User specific request/focus: ${montageUserInput || "Focus purely on professional cinematic b-roll."}
      4. Do NOT include dialogue or lip-sync requirements.
      
      Output exactly 3 bullet points, each containing a dense 30-word prompt ready for Veo 3.1 video generation. Do not include titles or extra text.`;

      contents.push({ text: basePrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
      });

      const generatedText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanText = generatedText.replace(/`/g, '').trim();

      // Split into array by looking for bullets (- or *) or numbers (1., 2.)
      const parsedPrompts = cleanText
        .split(/\n+/)
        .map(line => line.replace(/^[\s\-\*\d\.]+/g, '').trim())
        .filter(line => line.length > 10)
        .slice(0, 3);

      if (parsedPrompts.length > 0) {
        updateMontagePrompts(parsedPrompts);
      } else {
        updateMontagePrompts(["Failed to parse montage prompts. Please try again."]);
      }
    } catch (e) {
      console.error(e);
      updateMontagePrompts(["Error generating montage options. Please try again."]);
    }

    setIsGeneratingMagicPrompt(false);
  };


  const analyzeAllScenes = async () => {
    if (scenes.length === 0) return;
    for (let i = 0; i < scenes.length; i++) {
      await generateMagicPrompt(i);
    }
  };

  const toggleSceneApproval = (index: number) => {
    const sceneToApprove = scenes[index];
    if (!sceneToApprove) return;

    const isNowApproved = !sceneToApprove.isApproved;

    setScenes((prev: Scene[]) => {
      const newScenes = prev.map((s: Scene, i: number) => i === index ? { ...s, isApproved: isNowApproved } : s);

      // If we just approved the last scene and it's not scene 3, add a new one
      if (isNowApproved && index === newScenes.length - 1 && newScenes.length < 3) {
        newScenes.push({ id: (newScenes.length + 1).toString(), prompt: '', isApproved: false });
      }

      return newScenes;
    });

    // Automatically trigger video generation if approved
    if (isNowApproved) {
      generateVideo(sceneToApprove.prompt);
    }
  };

  const generateVoice = async () => {
    if (!script) return;
    setIsGeneratingAudio(true);
    try {
      const ai = getAI();
      const spokenText = script.replace(/\[.*?\]/g, '').trim();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: spokenText }] }],
        config: {
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        setAudioData(base64Audio);
        const url = createWavUrl(base64Audio);
        setAudioUrl(url);

        // Calculate duration and update scenes
        const tempAudio = new Audio(url);
        tempAudio.onloadedmetadata = () => {
          const duration = tempAudio.duration;

          // Automatically add to timeline (Track 1)
          const audioEntry: TimelineItem = {
            id: 'audio-' + Date.now(),
            url: url,
            start: 0,
            end: duration,
            duration: duration,
            type: 'audio',
            track: 1
          };
          setTimeline((prev: TimelineItem[]) => {
            // Remove existing audio from track 1 if any, to avoid duplicates
            const filtered = prev.filter((t: TimelineItem) => t.track !== 1);
            return [audioEntry, ...filtered];
          });

          // We want 8 second clips max.
          const sceneCount = Math.ceil(duration / 8);

          setScenes((prev: Scene[]) => {
            const newScenes = [...prev];
            // Ensure we have at least sceneCount scenes
            if (sceneCount > newScenes.length) {
              for (let i = newScenes.length; i < sceneCount; i++) {
                newScenes.push({ id: (i + 1).toString(), prompt: '', isApproved: false });
              }
            }
            return newScenes;
          });
        };
      }
    } catch (e) {
      console.error(e);
    }
    setIsGeneratingAudio(false);
  };

  const transcribeAudio = async (file: File) => {
    setIsGeneratingScript(true);
    try {
      const ai = getAI();

      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { inlineData: { mimeType: file.type, data: base64Audio } },
          { text: `Transcribe this audio exactly.Return ONLY the transcription text.` }
        ]
      });

      if (response.text) {
        setScript(response.text.trim());
      }
    } catch (e) {
      console.error("Transcription failed", e);
      window.toast("Failed to transcribe audio.");
    }
    setIsGeneratingScript(false);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedAudioFile(file);
    transcribeAudio(file);

    try {
      const buffer = await file.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(buffer).reduce(
          (data: string, byte: number) => data + String.fromCharCode(byte),
          ''
        )
      );
      setAudioData(base64Audio);
      setAudioUrl(URL.createObjectURL(file));
    } catch (e) {
      console.error("Audio preview setup failed", e);
    }
  };

  const generateImageSuggestions = async (imageUrl: string) => {
    if (!imageUrl) return;
    setIsGeneratingSuggestions(true);
    setImageSuggestions([]);
    try {
      const ai = getAI();

      let base64Data = '';
      let mimeType = 'image/png';

      if (imageUrl.startsWith('data:')) {
        base64Data = imageUrl.split(',')[1];
        mimeType = imageUrl.split(';')[0].split(':')[1];
      } else {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        mimeType = blob.type;
        base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          { text: "Analyze this image and provide 5 short, creative suggestions for how to change or refine this scene for a UGC (User Generated Content) ad. The suggestions should be concise (max 10 words each) and focus on different angles, actions, or environmental changes. For example, if holding a product, suggest 'Close up of the texture', 'POV of using it', 'Opening the packaging', etc. Format the output as a simple JSON array of strings." }
        ],
        config: {
          responseMimeType: "application/json",
        }
      });

      const suggestions = JSON.parse(response.text || '[]');
      setImageSuggestions(Array.isArray(suggestions) ? suggestions : []);
    } catch (err) {
      console.error("Failed to generate suggestions", err);
    }
    setIsGeneratingSuggestions(false);
  };

  const generateImage = async (overridePrompt?: string | React.MouseEvent | any): Promise<string> => {
    setIsGeneratingImage(true);
    let generatedUrl = '';
    try {
      const ai = getAI();
      let contents: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];

      let stylePrompt = '';
      if (imageStyle === 'ultra-realistic') {
        stylePrompt = 'Ultra-realistic portrait photograph shot on iPhone 15 Pro in natural daylight, RAW unfiltered image, zero makeup, authentic skin texture with visible pores and fine lines, natural skin imperfections, real human features, soft window lighting from the side, shallow depth of field, bokeh background, candid expression, direct eye contact with camera, natural skin tones, no retouching, no airbrushing, photojournalistic style, genuine human appearance, 8K resolution, professional portrait photography';
      } else if (imageStyle === 'iphone') {
        stylePrompt = 'POV selfie shot on iPhone 15 front-facing camera. The person is visibly holding the phone with one extended hand, showing their arm reaching towards the camera lens. Casual, spontaneous social media aesthetic, slightly imperfect natural lighting, authentic unedited vlog style, slight lens distortion typical of a front-facing smartphone camera, relatable and genuine.';
      } else if (imageStyle === 'short') {
        stylePrompt = 'Quick snapshot style, candid, slightly blurry background, fast shutter speed, everyday lighting, highly relatable and casual, like a quick photo taken for a friend.';
      } else if (imageStyle === 'normal') {
        stylePrompt = 'Standard digital photography, clear and well-lit, balanced colors, realistic but flattering, typical high-quality social media post, no extreme filters.';
      } else {
        stylePrompt = 'Ultra-realistic studio lighting, high contrast, moody, cinematic, shot on 35mm lens, polished commercial look, authentic skin textures, professional UGC aesthetic, 8K resolution, highly detailed.';
      }

      // If overridePrompt is a string, wrap it. Otherwise use the default.
      const isStringOverride = typeof overridePrompt === 'string' && overridePrompt.trim().length > 0;
      const promptText = isStringOverride
        ? `A professional UGC photo capturing this specific scene: ${overridePrompt}. Artistic Style: ${stylePrompt}`
        : `A UGC style photo of a creator holding and showcasing this product: ${productDetails}. 
      The creator looks directly at the camera, engaging the viewer. 
      Style instructions: ${stylePrompt} `;

      // Assemble content parts to shape the final image
      if (characterImg) {
        contents.push(await fileToGenerativePart(characterImg.file));
      }

      if (productImg) {
        contents.push(await fileToGenerativePart(productImg.file));
      }

      contents.push({
        text: `Use this person as the creator(if provided). Show them holding and interacting with this product(if provided) in the following scene: ${promptText} `
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: contents,
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: '1K'
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const url = `data:image/png;base64,${part.inlineData.data}`;
          generatedUrl = url;
          // Convert base64 to Blob and upload to Supabase
          try {
            const byteCharacters = atob(part.inlineData.data || '');
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });

            // Ensure we use the public URL so timeline cache never breaks
            const publicUrl = await uploadToSupabase(blob, 'image', promptText);

            const finalUrl = publicUrl || url;
            generatedUrl = finalUrl;
            setGeneratedImg(finalUrl);
            setGeneratedVideo('');
            setGallery((prev: GalleryItem[]) => [...prev, { id: Date.now().toString(), type: 'image', url: finalUrl }]);
            generateImageSuggestions(finalUrl);
          } catch (uploadErr) {
            console.error(uploadErr);
            setGeneratedImg(url);
            setGeneratedVideo('');
            setGallery((prev: GalleryItem[]) => [...prev, { id: Date.now().toString(), type: 'image', url }]);
            generateImageSuggestions(url);
          }

          break;
        }
      }
    } catch (e) {
      console.error(e);
    }
    setIsGeneratingImage(false);
    return generatedUrl;
  };

  const regenerateImage = async () => {
    if (!generatedImg || !imageEditPrompt) return;
    setIsRegeneratingImage(true);
    try {
      const ai = getAI();

      // Convert current base64 image to part
      let base64Data = '';
      let mimeType = 'image/png';

      if (generatedImg.startsWith('data:')) {
        base64Data = generatedImg.split(',')[1].trim();
        mimeType = generatedImg.split(';')[0].split(':')[1].trim();
      } else {
        // If it's a URL, fetch it and convert to base64
        const res = await fetch(generatedImg);
        const blob = await res.blob();
        mimeType = blob.type;
        base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });
      }

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: [
          imagePart,
          { text: `Edit this image based on this request: ${imageEditPrompt}. Maintain the same person and product if they are present.` }
        ],
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: '1K'
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const url = `data:image/png;base64,${part.inlineData.data}`;

          // Convert base64 to Blob and upload to Supabase
          try {
            const byteCharacters = atob(part.inlineData.data || '');
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });

            const publicUrl = await uploadToSupabase(blob, 'image', imageEditPrompt);
            if (publicUrl) {
              setGeneratedImg(publicUrl);
              setGallery((prev: GalleryItem[]) => [...prev, { id: Date.now().toString(), type: 'image', url: publicUrl }]);
              generateImageSuggestions(publicUrl);
            } else {
              setGeneratedImg(url);
              generateImageSuggestions(url);
            }
          } catch (err) {
            console.error("Supabase upload failed for regenerated image", err);
            setGeneratedImg(url);
            generateImageSuggestions(url);
          }
        }
      }
      setImageEditPrompt(''); // Clear prompt after success
    } catch (e) {
      console.error("Regeneration failed", e);
      window.toast("Failed to regenerate image.");
    }
    setIsRegeneratingImage(false);
  };

  const generateVideo = async (overridePrompt?: string) => {
    if (!hasPaidKey) {
      handleSelectKey();
      return;
    }
    setIsGeneratingVideo(true);
    setVideoError('');
    setVideoProgressMsg('Initializing Veo Engine...');
    try {
      const ai = getAI();

      const promptText = overridePrompt || (scenes[activeSceneIndex]?.isApproved
        ? scenes[activeSceneIndex].prompt
        : (videoPrompt || `A creator showcasing a product: ${productDetails}. Cinematic lighting, high quality, 35mm lens.`));

      let imagePayload: { imageBytes: string; mimeType: string } | undefined = undefined;
      if (generatedImg) {
        let base64 = '';
        let mimeType = 'image/png';
        if (generatedImg.startsWith('http')) {
          const res = await fetch(generatedImg);
          const blob = await res.blob();
          mimeType = blob.type;
          base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
          });
        } else {
          base64 = generatedImg.split(',')[1].trim();
          mimeType = generatedImg.split(';')[0].split(':')[1].trim();
        }
        imagePayload = { imageBytes: base64, mimeType };
      } else if (characterImg) {
        let base64 = '';
        let mimeType = characterImg.file.type || 'image/png';
        if (characterImg.url && characterImg.url.startsWith('http')) {
          const res = await fetch(characterImg.url);
          const blob = await res.blob();
          mimeType = blob.type;
          base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
          });
        } else {
          base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(characterImg.file);
          });
        }
        imagePayload = { imageBytes: base64, mimeType };
      }

      setVideoProgressMsg('Submitting to Veo-3...');

      const videoRequest: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt: promptText,
        config: {
          numberOfVideos: 1,
          resolution: videoResolution as any,
          aspectRatio: aspectRatio as any
        }
      };

      if (imagePayload) {
        videoRequest.image = imagePayload;
      }

      let operation = await ai.models.generateVideos(videoRequest);

      let pollCount = 0;
      const messages = [
        'Generating Video Frames...',
        'Refining Cinematic Details...',
        'Processing Motion Dynamics...',
        'Applying High-Res Textures...',
        'Finalizing Render...'
      ];

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        setVideoProgressMsg(messages[Math.min(pollCount, messages.length - 1)]);
        pollCount++;
        operation = await ai.operations.getVideosOperation({ operation });
      }

      setVideoProgressMsg('Downloading Render...');
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        // Get the current API key for the download request
        const currentApiKey = (typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined) ||
          (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined) ||
          (import.meta as any).env?.VITE_GOOGLE_API_KEY ||
          (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: { 'x-goog-api-key': currentApiKey },
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Download failed: ${response.status} - ${errText} `);
        }
        const blob = await response.blob();
        setVideoProgressMsg('Cloud Archiving...');
        const publicUrl = await uploadToSupabase(blob, 'video', promptText);

        const finalUrl = publicUrl || URL.createObjectURL(blob);
        setGeneratedVideo(finalUrl);
        setGallery((prev: GalleryItem[]) => [...prev, { id: Date.now().toString(), type: 'video', url: finalUrl }]);
        addToTimeline({ type: 'video', url: finalUrl });
      }
    } catch (e: any) {
      console.error(e);
      const errMsg = e.message || JSON.stringify(e);
      if (errMsg.includes("Requested entity was not found")) {
        setVideoError("Session expired or invalid key. Please try re-selecting your API key.");
      } else if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED")) {
        setVideoError(`Permission Denied: Your API key doesn't have access to Veo-3.1 in project '569815811058'. Please ensure:
    1. "Generative AI Video API" is ENABLED in Google Cloud Console.
2. Billing is ACTIVE for this project.
3. Your API key belongs to this project.`);
      } else {
        setVideoError(`Error: ${errMsg} `);
      }
    }
    setIsGeneratingVideo(false);
    setVideoProgressMsg('');
  };

  return (
    <div className="h-full flex flex-col bg-[#020202] text-white selection:bg-[#c8f135] selection:text-black">

      <div className="flex-1 flex overflow-hidden relative">
        {/* Visible trigger handle on the far right edge */}
        <div
          className="absolute right-0 top-1/2-translate-y-1/2 w-8 h-20 bg-black border border-[#222] border-r-0 rounded-l-xl z-40 flex items-center justify-center cursor-pointer shadow-2xl hover:bg-[#111] hover:border-[#c8f135]/50 group transition-all"
          onClick={() => setShowTemplates(true)}
        >
          <div className="w-1 h-8 rounded-full bg-[#333] group-hover:bg-[#c8f135] transition-colors" />
        </div>

        {/* ── Sidebar (Scene Templates) ─────────────────────────────── */}
        <aside
          onMouseMove={resetSidebarTimer}
          onClick={resetSidebarTimer}
          className={`absolute right-0 top-0 bottom-0 w-full sm:w-80 overflow-y-auto custom-scrollbar flex flex-col bg-black/95 backdrop-blur-3xl border-l border-[#222] z-50 transition-transform duration-500 shadow-2xl ${showTemplates ? 'translate-x-0' : 'translate-x-full'} `}
        >
          <div className="p-4 border-b border-[#222] space-y-4 flex items-center justify-between">
            <h2 className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase px-1">Scene Templates</h2>
            <button onClick={() => setShowTemplates(false)} className="text-[#555] hover:text-[#fff] bg-[#111] p-1 rounded transition-colors">
              <SidebarClose size={14} />
            </button>
          </div>

          <div className="flex-1 p-5 space-y-3 content-start">
            {SCENE_TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => {
                  setSceneContext(template.sceneContext);
                  setVideoPrompt(template.prompt);
                  setShowTemplates(false); // Automatically hide after picking a template
                }}
                className={`w-full aspect-[16/9] rounded-xl border overflow-hidden transition-all group relative bg-white/5 ${sceneContext === template.sceneContext
                  ? 'border-[#c8f135] shadow-[0_0_15px_rgba(212,255,0,0.3)]'
                  : 'border-white/10 hover:border-white/30'
                  } `}
                title={template.title}
              >
                <img src={template.img} alt="" className={`w-full h-full object-cover transition-all duration-300 ${sceneContext === template.sceneContext ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'} `} />

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3 text-left">
                  <span className="text-[#c8f135] font-mono text-[9px] font-bold tracking-widest uppercase">{template.title}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Main Workspace ─────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto custom-scrollbar px-2 pt-2 lg:px-3 lg:pt-2 xl:px-4 xl:pt-2 pb-20 w-full">
          <div className="w-full h-full max-w-[1600px] mx-auto" style={{ zoom: '80%' }}>
            {/* ── Master Production Dashboard ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

              {/* Column 1: Asset Ingestion (Left | 3 cols) */}
              <div className="lg:col-span-3 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-4 lg:pb-0 custom-scrollbar order-2 lg:order-1 lg:space-y-2">
                <Card title="Creator" icon={User} tooltip="Upload a photo of the actor or creator." className="min-w-[180px] lg:min-w-0 flex-shrink-0" contentClassName="p-0">
                  <div className="relative group w-full h-28 lg:h-auto lg:aspect-[4/3] bg-[#050505] flex flex-col items-center justify-center cursor-pointer overflow-hidden border-b border-white/5">
                    <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'character')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {characterImg ? (
                      <>
                        <img src={characterImg.url} alt="Creator" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                          <span className="bg-black/80 backdrop-blur-md text-[#c8f135] font-sans text-[10px] font-bold tracking-wide px-3 py-1.5 rounded-md border border-[#c8f135]/30 shadow-lg flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#c8f135] animate-pulse" />
                            Photo Uploaded
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-[#555] group-hover:text-[#c8f135] transition-colors">
                        <Upload size={24} />
                        <span className="font-sans text-[11px] font-bold tracking-wide text-[#999]">Upload Photo</span>
                      </div>
                    )}
                  </div>
                </Card>

                <Card
                  title=""
                  icon={Box}
                  className="min-w-[180px] lg:min-w-0 flex-shrink-0"
                  contentClassName="p-0"
                  action={
                    <Button
                      onClick={analyzeProduct}
                      disabled={!productImg || isAnalyzing}
                      loading={isAnalyzing}
                      variant={productDetails ? 'ghost' : 'primary'}
                      className="h-10 px-6 text-[11px] min-w-[130px] tracking-widest font-black"
                    >
                      {productDetails ? 'Re-Scan' : 'Scan'}
                    </Button>
                  }
                >
                  <div className="flex flex-col h-full">
                    <div className="relative group w-full h-28 lg:h-auto lg:aspect-[16/9] bg-[#050505] flex flex-col items-center justify-center cursor-pointer overflow-hidden border-b border-white/5">
                      <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'product')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      {productImg ? (
                        <>
                          <img src={productImg.url} alt="Product" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                            <span className="bg-black/80 backdrop-blur-md text-[#c8f135] font-sans text-[10px] font-bold tracking-wide px-3 py-1.5 rounded-md border border-[#c8f135]/30 shadow-lg flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#c8f135] animate-pulse" />
                              Product Uploaded
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-[#555] group-hover:text-[#c8f135] transition-colors">
                          <Upload size={24} />
                          <span className="font-sans text-[11px] font-bold tracking-wide text-[#999]">Upload Product to Scan</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                <Card title="Video" icon={Video} tooltip="Upload a reference video to extract style, audio, and script." className="min-w-[180px] lg:min-w-0 flex-shrink-0" contentClassName="p-0">
                  <div className="flex flex-col h-full">
                    <div className="relative group w-full h-28 lg:h-auto lg:aspect-square bg-[#050505] flex flex-col items-center justify-center cursor-pointer overflow-hidden border-b border-white/5 lg:max-h-none">
                      <input type="file" accept="video/*" onChange={handleVideoUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      {sourceVideo ? (
                        <>
                          <video src={sourceVideo.url} className="w-full h-full object-cover opacity-60" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play size={32} className="text-white opacity-50 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                            <span className="bg-black/80 backdrop-blur-md text-[#c8f135] font-sans text-[10px] font-bold tracking-wide px-3 py-1.5 rounded-md border border-[#c8f135]/30 shadow-lg flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#c8f135] animate-pulse" />
                              Video Uploaded
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-[#555] group-hover:text-[#c8f135] transition-colors">
                          <Upload size={24} />
                          <span className="font-sans text-[11px] font-bold tracking-wide text-[#999]">Upload Reference Video</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-black/20">
                      <Button onClick={analyzeVideo} disabled={!sourceVideo || isAnalyzingVideo} loading={isAnalyzingVideo} variant={sourceVideo ? 'primary' : 'ghost'} className="w-full h-8 text-[9px]">
                        Analyze
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Admin-only Viral Knowledge Base */}
                {isAdmin && (
                  <Card title="Viral Knowledge Base (Admin)" icon={Sparkles} tooltip="Upload viral scripts or documents to train the AI on specific high-conversion styles." contentClassName="p-4 gap-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <BrainCircuit size={14} className="text-[#00ffe0]" />
                          <span className="text-[10px] font-bold text-[#00ffe0] uppercase tracking-wider">Training Agent</span>
                        </div>
                        <button
                          onClick={trainAgent}
                          disabled={isTraining || knowledgeBase.length === 0}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${isTraining ? 'bg-white/5 border-white/10 text-gray-500' : 'bg-[#00ffe0]/10 border-[#00ffe0]/30 text-[#00ffe0] hover:bg-[#00ffe0] hover:text-black shadow-[0_0_15px_rgba(0,255,224,0.2)]'
                            } `}
                        >
                          {isTraining ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <Zap size={10} />
                          )}
                          <span className="text-[9px] font-bold uppercase tracking-tighter">
                            {isTraining ? 'Training...' : 'Train Agent'}
                          </span>
                        </button>
                      </div>

                      {trainedStrategy && (
                        <div className="p-3 bg-[#00ffe0]/5 border border-[#00ffe0]/20 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00ffe0] animate-pulse shadow-[0_0_8px_rgba(0,255,224,0.6)]" />
                            <span className="text-[9px] font-bold text-[#00ffe0] uppercase tracking-widest font-mono">Status:Neural Trained</span>
                          </div>
                          <p className="text-[9.5px] text-gray-400 italic leading-relaxed line-clamp-3">
                            "{trainedStrategy}"
                          </p>
                        </div>
                      )}

                      <div className="relative group w-full py-8 bg-black/40 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-[#00ffe0]/50 hover:bg-[#00ffe0]/5 transition-all duration-300">
                        <input
                          type="file"
                          multiple
                          accept=".txt,.md,.pdf"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleKBUpload(e)}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        {isUploadingKB ? (
                          <Loader2 size={24} className="text-[#00ffe0] animate-spin" />
                        ) : (
                          <>
                            <div className="p-3 bg-white/5 rounded-full mb-3 group-hover:bg-[#00ffe0]/10 transition-colors">
                              <Plus size={20} className="text-[#555] group-hover:text-[#00ffe0] transition-colors" />
                            </div>
                            <span className="text-[10px] font-black text-[#999] group-hover:text-white uppercase tracking-[0.2em] transition-colors">Load Viral DNA</span>
                            <span className="text-[8px] text-gray-600 mt-1 uppercase tracking-[0.2em] font-mono">PDF • TXT • MD</span>
                          </>
                        )}
                      </div>

                      {knowledgeBase.length > 0 && (
                        <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                          {knowledgeBase.map((kb) => (
                            <div key={kb.id} className="group flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:border-[#00ffe0]/30 hover:bg-[#00ffe0]/5 transition-all">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <FileText size={14} className="text-[#00ffe0] flex-shrink-0" />
                                <span className="text-[9.5px] text-gray-300 truncate font-bold uppercase tracking-widest">{kb.name}</span>
                              </div>
                              <button
                                onClick={() => setKnowledgeBase((prev: KnowledgeBaseEntry[]) => prev.filter((item: KnowledgeBaseEntry) => item.id !== kb.id))}
                                className="p-1.5 text-gray-600 hover:text-[#ff3a3a] hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {knowledgeBase.length > 0 && (
                        <div className="pt-2 border-t border-white/5">
                          <p className="text-[8px] text-gray-500 italic leading-relaxed">
                            Admin: AI is now trained on {knowledgeBase.length} viral document{knowledgeBase.length > 1 ? 's' : ''}.
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>

              {/* Column 2: Cognitive Engine / Narrative (Center | 5 cols) */}
              <div className="lg:col-span-5 space-y-4 order-3 lg:order-2">
                <Card title="Vision Output" icon={Wand2} contentClassName="p-0">
                  <div className={`bg-black/40 border-t border-white/5 p-4 font-mono text-[9px] text-gray-400 leading-relaxed italic overflow-y-auto ${productTags.length > 0 ? 'max-h-[80px]' : 'h-[50px] flex items-center text-[#555]'}`}>
                    {productDetails || "Awaiting product scan..."}
                  </div>
                </Card>

                <Card title="Concept & Narrative" icon={FileText} tooltip="Define the core scene parameters, voiceover script, and visual prompt for the generative AI models." contentClassName="p-5 gap-3">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[#999] font-sans font-bold text-[10px] tracking-wide mb-1.5 block uppercase">Creative Direction/Direct instructions</label>
                      <input
                        type="text"
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        placeholder="e.g., Energetic demo with a focus on product durability..."
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 font-sans text-[11px] text-white focus:outline-none focus:border-[#c8f135] transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Dropdown
                        label="Voice Language"
                        value={language}
                        options={LANGUAGES}
                        onChange={setLanguage}
                        icon={Box}
                      />
                      <Dropdown
                        label="Synthetic Voice"
                        value={voice}
                        options={VOICES}
                        onChange={setVoice}
                        icon={Volume2}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Dropdown
                        label="Script Duration"
                        value={scriptDuration}
                        options={['8 seconds', '16 seconds', '24 seconds', '36 seconds']}
                        onChange={setScriptDuration}
                        icon={Clock}
                      />
                      <Dropdown
                        label="Viral Script"
                        value={SCRIPT_TONES[selectedScriptTone]?.name}
                        options={Object.values(SCRIPT_TONES).map(t => t.name)}
                        onChange={(name) => {
                          const key = Object.keys(SCRIPT_TONES).find(k => SCRIPT_TONES[k].name === name);
                          if (key) setSelectedScriptTone(key);
                        }}
                        icon={Sparkles}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[#999] font-sans font-bold text-[10px] tracking-wide block uppercase">Script Protocol</label>
                        <div className="flex gap-2 items-center">
                          <button onClick={generateScript} disabled={isGeneratingScript} className="text-[10px] font-sans font-bold tracking-wider px-3 py-1.5 rounded-lg bg-[#c8f135]/10 border border-[#c8f135]/20 text-[#c8f135] hover:bg-[#c8f135] hover:text-black transition-all">
                            {isGeneratingScript ? 'Writing...' : 'Generate Script'}
                          </button>
                          {script && scenes.length > 0 && (
                            <div className="flex gap-1.5 border-l border-white/10 pl-2 ml-1">
                              {scenes.map((scene, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => regenerateScriptPart(idx, scene.label || 'SCENE')}
                                  disabled={isRegeneratingPart}
                                  className="text-[8px] font-bold tracking-widest px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-400 hover:text-[#c8f135] hover:border-[#c8f135]/30 transition-all uppercase whitespace-nowrap"
                                  title={`Regenerate ${scene.label || 'Scene'} `}
                                >
                                  {isRegeneratingPart ? '...' : `${scene.label || 'SCENE'} 🔄`}
                                </button>
                              ))}
                            </div>
                          )}
                          <button onClick={analyzeScenes} disabled={!script} className="text-[10px] font-sans font-bold tracking-wider px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-30">
                            Split Scenes
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        {isGeneratingScript && (
                          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <div key={i} className="w-1.5 h-1.5 bg-[#c8f135] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2} s` }} />
                              ))}
                            </div>
                            <p className="text-[10px] font-mono text-[#c8f135] uppercase tracking-widest animate-pulse">Drafting UGC Script...</p>
                          </div>
                        )}
                        <textarea
                          value={script}
                          onChange={(e) => setScript(e.target.value)}
                          className="w-full h-48 bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-sans text-sm text-white focus:outline-none focus:border-[#c8f135] resize-none leading-relaxed"
                          placeholder="AI will formulate script here..."
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2 custom-scrollbar">
                        {scenes.map((scene, idx) => (
                          <button
                            key={scene.id}
                            onClick={() => {
                              setActiveSceneIndex(idx);
                              setVideoPrompt(scene.prompt);
                            }}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all ${activeSceneIndex === idx ? 'bg-[#c8f135] text-black font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10'} `}
                          >
                            Scene {idx + 1}
                            {scene.isApproved && <Check size={10} className={activeSceneIndex === idx ? 'text-black' : 'text-[#c8f135]'} />}
                          </button>
                        ))}
                      </div>

                      {/* VIDEO STYLE SELECTOR */}
                      <div className="space-y-2 mb-4 p-3 bg-black/20 rounded-xl border border-white/5">
                        <label className="text-[#999] font-sans font-bold text-[9px] tracking-wide block uppercase">
                          Video Performance Style
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.entries(VIDEO_STYLES).map(([key, style]) => (
                            <button
                              key={key}
                              onClick={() => setSelectedVideoStyle(key as any)}
                              className={`p-2.5 rounded-lg border transition-all text-left ${selectedVideoStyle === key
                                ? 'bg-[#c8f135]/10 border-[#c8f135] shadow-[0_0_10px_rgba(200,241,53,0.2)]'
                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                } `}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-lg flex-shrink-0">{style.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[9px] font-bold tracking-wider uppercase ${selectedVideoStyle === key ? 'text-[#c8f135]' : 'text-gray-300'
                                    } `}>
                                    {style.name}
                                  </div>
                                  <div className="text-[7px] text-gray-500 mt-0.5 leading-tight">
                                    {style.description}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center mb-1.5 gap-2">
                        <label className="text-[#999] font-sans font-bold text-[10px] tracking-wide block uppercase truncate">Visual Prompt/Scene {activeSceneIndex + 1} Logic</label>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => generateMagicPrompt(activeSceneIndex)}
                            disabled={isGeneratingMagicPrompt || !scenes[activeSceneIndex]}
                            className="text-[9px] font-sans font-bold tracking-wider px-2 py-1.5 rounded-lg bg-[#c8f135]/10 border border-[#c8f135]/20 text-[#c8f135] hover:bg-[#c8f135] hover:text-black transition-all"
                          >
                            <Sparkles size={11} className={isGeneratingMagicPrompt ? 'animate-spin' : ''} />
                            Analyze
                          </button>
                          <button
                            onClick={analyzeAllScenes}
                            disabled={isGeneratingMagicPrompt || scenes.length === 0}
                            className={`text-[9px] font-sans font-bold tracking-wider px-2 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${isGeneratingMagicPrompt ? 'opacity-50' : 'bg-white/5 text-gray-400 hover:bg-white/10 border-white/10'}`}
                          >
                            <Sparkles size={11} className="text-[#c8f135]" />
                            Analyze All
                          </button>
                          <button
                            onClick={() => setShowMontageOptions(!showMontageOptions)}
                            disabled={isGeneratingMagicPrompt || !scenes[activeSceneIndex]}
                            className="text-[9px] font-sans font-bold tracking-wider px-2 py-1.5 rounded-lg bg-[#00ffe0]/10 border border-[#00ffe0]/20 text-[#00ffe0] hover:bg-[#00ffe0] hover:text-black transition-all flex items-center gap-1.5"
                          >
                            <Video size={11} />
                            Montage Clips
                          </button>
                          <button
                            onClick={() => toggleSceneApproval(activeSceneIndex)}
                            className={`text-[9px] font-sans font-bold tracking-wider px-2 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${scenes[activeSceneIndex].isApproved ? 'bg-[#c8f135] text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'}`}
                          >
                            {scenes[activeSceneIndex].isApproved ? <CheckCircle size={11} /> : <Check size={11} />}
                            {scenes[activeSceneIndex].isApproved ? 'Approved' : 'Approve'}
                          </button>
                        </div>
                      </div>

                      {showMontageOptions && (
                        <div className="p-3 bg-[#00ffe0]/5 border border-[#00ffe0]/30 rounded-xl mb-3 flex flex-col gap-3">
                          <div className="flex gap-2 items-center justify-between">
                            <span className="text-[#00ffe0] font-mono text-[9px] uppercase tracking-widest font-bold">Montage Settings</span>
                            <button onClick={() => setShowMontageOptions(false)} className="text-gray-500 hover:text-white"><X size={12} /></button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-400 uppercase font-sans tracking-wider">Action / Focus</label>
                              <input
                                type="text"
                                value={montageUserInput}
                                onChange={(e) => setMontageUserInput(e.target.value)}
                                placeholder="e.g. riding bike, swiping lipstick"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00ffe0]/50"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-400 uppercase font-sans tracking-wider">Camera Style</label>
                              <select
                                value={montageCameraStyle}
                                onChange={(e) => setMontageCameraStyle(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#00ffe0]/50"
                              >
                                {MONTAGE_CAMERA_STYLES.map((style) => (
                                  <option key={style} value={style}>{style}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              generateMontagePrompts(activeSceneIndex);
                              setShowMontageOptions(false);
                            }}
                            disabled={isGeneratingMagicPrompt || !scenes[activeSceneIndex]}
                            className={`mt-1 w-full text-[10px] font-sans font-bold tracking-wider px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${isGeneratingMagicPrompt ? 'opacity-50 cursor-not-allowed bg-[#00ffe0]/30 text-white' : 'bg-[#00ffe0] text-black hover:bg-[#00ffe0]/80'
                              }`}
                          >
                            {isGeneratingMagicPrompt ? <Sparkles size={12} className="animate-spin" /> : <Video size={12} />}
                            {isGeneratingMagicPrompt ? 'Generating...' : 'Generate 3 Montage Ideas'}
                          </button>
                        </div>
                      )}

                      <div className="flex flex-col gap-3">
                        <div className="p-3 bg-black/60 rounded-xl border border-white/10 min-h-[80px] overflow-y-auto mb-1">
                          <div className="text-[10px] font-mono text-[#c8f135] uppercase tracking-widest mb-2 border-b border-[#c8f135]/10 pb-1 flex justify-between">
                            <span>Script Dialogue</span>
                            <span>{scenes[activeSceneIndex]?.timestamp}</span>
                          </div>
                          <p className="text-sm font-sans text-[#c8f135] leading-relaxed italic font-bold">
                            "{scenes[activeSceneIndex]?.text || "No dialogue available."}"
                          </p>
                        </div>

                        <div className="relative">
                          {isGeneratingMagicPrompt && (
                            <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3">
                              <div className="flex gap-1">
                                {[0, 1, 2].map(i => (
                                  <div key={i} className="w-1.5 h-1.5 bg-[#c8f135] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                                ))}
                              </div>
                              <p className="text-[10px] font-mono text-[#c8f135] uppercase tracking-widest animate-pulse">Analyzing Scene Data...</p>
                            </div>
                          )}
                          {scenes[activeSceneIndex]?.montagePrompts && scenes[activeSceneIndex].montagePrompts!.length > 0 ? (
                            <div className="flex flex-col gap-3">
                              {scenes[activeSceneIndex].montagePrompts!.map((montagePrompt, idx) => (
                                <div key={idx} className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative">
                                  <div className="flex justify-between items-center bg-[#00ffe0]/5 px-2 py-1 rounded">
                                    <span className="text-[10px] font-mono text-[#00ffe0] uppercase tracking-widest font-bold">Montage Var {idx + 1}</span>
                                    <button
                                      onClick={async () => {
                                        setGeneratingMontageIdx(idx);
                                        const url = await generateImage(montagePrompt);
                                        if (url) {
                                          setScenes((prev: Scene[]) => prev.map((s: Scene, i: number) => {
                                            if (i === activeSceneIndex) {
                                              const newImages = [...(s.montageImages || [])];
                                              newImages[idx] = url;
                                              return { ...s, montageImages: newImages };
                                            }
                                            return s;
                                          }));
                                        }
                                        setGeneratingMontageIdx(null);
                                      }}
                                      disabled={isGeneratingImage || !productDetails}
                                      className="text-[9px] bg-black hover:bg-[#00ffe0]/20 text-[#00ffe0] border border-[#00ffe0]/30 px-2 py-1 flex items-center gap-1 transition-colors uppercase font-bold tracking-wider rounded disabled:opacity-50 disabled:cursor-not-allowed z-20"
                                    >
                                      {isGeneratingImage && generatingMontageIdx === idx ? <Loader2 size={10} className="animate-spin" /> : <Camera size={10} />}
                                      {isGeneratingImage && generatingMontageIdx === idx ? 'Wait...' : 'Gen Ref Image'}
                                    </button>
                                  </div>
                                  <div className="flex gap-3">
                                    {scenes[activeSceneIndex].montageImages?.[idx] && (
                                      <div className="w-24 h-24 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 relative group">
                                        <img src={scenes[activeSceneIndex].montageImages![idx]} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <button
                                            onClick={() => setGeneratedImg(scenes[activeSceneIndex].montageImages![idx])}
                                            className="p-1 bg-white/20 rounded hover:bg-white/40 text-white"
                                            title="View Full Size"
                                          >
                                            <Maximize size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                    <textarea
                                      value={montagePrompt}
                                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                        const newPrompts = [...scenes[activeSceneIndex].montagePrompts!];
                                        newPrompts[idx] = e.target.value;
                                        setScenes((prev: Scene[]) => prev.map((s: Scene, i: number) => i === activeSceneIndex ? { ...s, montagePrompts: newPrompts } : s));
                                      }}
                                      className={`flex-1 ${scenes[activeSceneIndex].montageImages?.[idx] ? 'h-24' : 'h-20'} bg-transparent font-sans text-[12px] text-gray-300 focus:outline-none resize-none leading-relaxed z-10 relative`}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <textarea
                              value={videoPrompt}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                setVideoPrompt(e.target.value);
                                setScenes((prev: Scene[]) => prev.map((s: Scene, i: number) => i === activeSceneIndex ? { ...s, prompt: e.target.value } : s));
                              }}
                              className="w-full h-32 bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-sans text-[13px] text-gray-300 focus:outline-none focus:border-[#c8f135] resize-none leading-relaxed"
                              placeholder="Cinematic video prompt will be refined here..."
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <div className="flex-1 relative group">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <Button variant="secondary" className="w-full py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                          <Upload size={12} /> Upload Voice
                        </Button>
                      </div>
                      <Button onClick={generateVoice} disabled={!script || isGeneratingAudio} loading={isGeneratingAudio} variant="secondary" className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest">
                        Synthesize Audio
                      </Button>
                      <Button onClick={() => generateImage()} disabled={isGeneratingImage || !productDetails} loading={isGeneratingImage && generatingMontageIdx === null} variant="secondary" className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest">
                        Gen Reference
                      </Button>
                    </div>

                    {audioData && (
                      <div className="p-3 bg-[#c8f135]/5 border border-[#c8f135]/20 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[#c8f135] font-black italic text-[9px] uppercase tracking-widest">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#c8f135] animate-ping" /><span>Audio Ready</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const tempAudio = new Audio(audioUrl);
                              tempAudio.onloadedmetadata = () => {
                                addToTimeline({ type: 'audio', url: audioUrl, duration: tempAudio.duration });
                              };
                            }}
                            className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest px-3"
                          >
                            <Plus size={12} /> Add to Timeline
                          </button>
                          <button onClick={toggleAudio} className="p-2 bg-[#c8f135] text-black rounded-lg hover:scale-105 transition-transform">
                            {isAudioPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Column 3: Studio Monitor (Right | 4 cols) */}
              <div className="lg:col-span-4 lg:sticky lg:top-1 order-1 lg:order-3">
                <Card
                  title="Studio Monitor"
                  icon={Video}
                  contentClassName="p-0"
                  className="lg:h-[calc(100vh-10px)] lg:min-h-[570px] h-[570px]"
                  action={
                    (renderMode === 'image' && generatedImg) ? (
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 bg-white/5 border border-white/10 text-white font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-white/10 hover:border-[#c8f135]/40 transition-all flex items-center gap-2 cursor-pointer group/upload">
                          <Upload size={11} className="group-hover:text-[#c8f135] transition-colors" />
                          <span>Push Frame</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, 'generated')}
                          />
                        </label>
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(generatedImg);
                              const blob = await response.blob();
                              const downloadUrl = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = downloadUrl;
                              a.download = `studio_frame_${Date.now()}.png`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(downloadUrl);
                            } catch (err) {
                              console.error("Error downloading file", err);
                            }
                          }}
                          className="px-3 py-1.5 bg-white/5 border border-white/10 text-white font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-white/10 hover:border-[#c8f135]/40 transition-all flex items-center gap-2 group/download"
                        >
                          <Download size={11} className="group-hover:text-[#c8f135] transition-colors" />
                          <span>PNG</span>
                        </button>
                        <button
                          onClick={() => setIsExpandModalOpen(true)}
                          className="px-3 py-1.5 bg-white/5 border border-white/10 text-white font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-white/10 hover:border-[#c8f135]/40 transition-all flex items-center gap-2 group/expand"
                        >
                          <Maximize size={11} className="group-hover:text-[#c8f135] transition-colors" />
                          <span>Focus</span>
                        </button>
                      </div>
                    ) : (renderMode === 'video' && generatedVideo) ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(generatedVideo);
                              const blob = await response.blob();
                              const downloadUrl = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = downloadUrl;
                              a.download = `studio_video_${Date.now()}.mp4`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(downloadUrl);
                            } catch (err) {
                              console.error("Error downloading file", err);
                            }
                          }}
                          className="px-3 py-1.5 bg-white/5 border border-white/10 text-white font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-white/10 hover:border-[#c8f135]/40 transition-all flex items-center gap-2 group/download"
                        >
                          <Download size={11} className="group-hover:text-[#c8f135] transition-colors" />
                          <span>MP4</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full animate-pulse shadow-[0_0_15px_rgba(255,58,58,0.2)]">
                        <div className="w-2 h-2 rounded-full bg-[#ff3a3a] shadow-[0_0_8px_rgba(255,58,58,0.8)]" />
                        <span className="text-[#ff3a3a] font-mono text-[9px] font-black uppercase tracking-[0.2em]">REC • ACTIVE</span>
                      </div>
                    )
                  }
                >
                  <div className="w-full h-full relative group">
                    {renderMode === 'image' ? (
                      <>
                        {/* Full Background Preview */}
                        <div className="absolute inset-0">
                          {isGeneratingImage && <UGCProcessingOverlay type="image" />}
                          {isRegeneratingImage && <UGCProcessingOverlay type="image" />}
                          {generatedImg ? (
                            <>
                              <img src={generatedImg} className="w-full h-full object-cover transition-transform duration-700" alt="Generated" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                            </>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 opacity-60">
                              <div className="relative group">
                                <div className="absolute inset-0 bg-[#c8f135]/10 rounded-full blur-xl animate-pulse"></div>
                                <div className="w-16 h-16 rounded-full border border-white/5 bg-black/50 backdrop-blur-lg flex items-center justify-center relative z-10">
                                  <Camera size={24} className="text-[#c8f135] opacity-50" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => handleImageUpload(e, 'generated')}
                                  />
                                </div>
                              </div>
                              <div className="text-center space-y-2">
                                <p className="font-black text-white text-[10px] uppercase tracking-[0.2em]">Lens Offline</p>
                                <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest leading-relaxed max-w-[200px]">Define parameters to capture synthetic frame.</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Controls Overlay */}
                        <div className="absolute bottom-0 inset-x-0 px-5 pb-1.5 pt-20 bg-gradient-to-t from-[#020202] via-[#020202]/90 to-transparent flex flex-col space-y-4 z-10">
                          <div className="flex bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/5">
                            {(['image', 'video'] as const).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setRenderMode(mode)}
                                className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${renderMode === mode ? 'bg-[#c8f135] text-black shadow-lg shadow-[#c8f135]/10' : 'text-gray-500 hover:text-white'} `}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Dropdown
                              label="Aesthetic Style"
                              value={imageStyle}
                              options={['ultra-realistic', 'studio', 'iphone', 'short', 'normal', 'cinematic']}
                              onChange={setImageStyle}
                              direction="up"
                              icon={Sparkles}
                            />
                            <Dropdown
                              label="Aspect Ratio"
                              value={aspectRatio}
                              options={['9:16', '16:9', '1:1']}
                              onChange={setAspectRatio}
                              direction="up"
                              icon={Layout}
                            />
                          </div>

                          <Button onClick={generateImage} disabled={isGeneratingImage || !productDetails} loading={isGeneratingImage} className="w-full py-4">Execute Frame Gen</Button>


                        </div>
                      </>
                    ) : (
                      <>
                        {/* Full Background Preview */}
                        <div className="absolute inset-0 bg-[#050505]">
                          {videoError && (
                            <div className="absolute inset-x-0 top-10 p-4 text-center z-20 bg-black/80 backdrop-blur-sm"><AlertCircle size={24} className="text-red-500 mb-2 mx-auto" /><p className="text-[8px] text-red-400 font-mono uppercase tracking-widest leading-relaxed">{videoError}</p></div>
                          )}
                          {generatedVideo ? (
                            <div className="relative w-full h-full">
                              <video src={generatedVideo} controls className="w-full h-full object-cover" />
                              <div className="absolute inset-x-0 bottom-[140px] p-4 flex justify-center z-20 pointer-events-none">
                                <button onClick={() => addToTimeline({ id: Date.now().toString(), type: 'video', url: generatedVideo })} className="px-6 py-2 bg-[#c8f135] text-black font-black text-[9px] uppercase tracking-widest rounded-lg hover:scale-105 transition-all shadow-[0_0_20px_rgba(212,255,0,0.3)] pointer-events-auto">Deploy to Timeline</button>
                              </div>
                            </div>
                          ) : isGeneratingVideo ? (
                            <UGCProcessingOverlay type="video" message={videoProgressMsg} />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 opacity-60">
                              {generatedImg && (
                                <img src={generatedImg} className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none" alt="" />
                              )}
                              <div className="relative group">
                                <div className="absolute inset-0 border border-[#c8f135] rounded-full animate-ping opacity-20"></div>
                                <div className="absolute inset-0 bg-[#c8f135]/10 rounded-full blur-xl animate-pulse"></div>
                                <div className="w-16 h-16 rounded-full border border-white/5 bg-black/50 backdrop-blur-lg flex items-center justify-center relative z-10 overflow-hidden">
                                  <div className="absolute inset-0 border-t border-[#c8f135] rounded-full animate-spin opacity-30" style={{ animationDuration: '3s' }}></div>
                                  <Video size={24} className="text-[#c8f135] opacity-80" />
                                </div>
                              </div>
                              <div className="text-center space-y-2">
                                <p className="font-black text-white text-[10px] uppercase tracking-[0.2em] relative inline-block">
                                  <span className="absolute-left-3 top-1/2-translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#c8f135] animate-pulse"></span>
                                  Engine Idle
                                </p>
                                <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest leading-relaxed max-w-[220px]">
                                  Prepare creator reference and scene script to synthesize UGC ad.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Controls Overlay */}
                        <div className="absolute bottom-0 inset-x-0 px-5 pb-1.5 pt-32 bg-gradient-to-t from-[#020202] via-[#020202]/95 to-transparent flex flex-col space-y-4 z-10 pointer-events-none">
                          <div className="flex bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/5 pointer-events-auto">
                            {(['image', 'video'] as const).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setRenderMode(mode)}
                                className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${renderMode === mode ? 'bg-[#c8f135] text-black shadow-lg shadow-[#c8f135]/10' : 'text-gray-500 hover:text-white'} `}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>

                          {!hasPaidKey ? (
                            <div className="p-4 border border-[#c8f135]/20 bg-[#c8f135]/10 backdrop-blur-md rounded-xl flex flex-col gap-3 pointer-events-auto">
                              <div className="flex items-center gap-2 text-[#c8f135] font-black italic text-[9px] uppercase tracking-widest"><Sparkles size={14} /><span>Veo-3 Required</span></div>
                              <Button onClick={handleSelectKey} className="w-full py-2.5 text-[9px]">Authorize Vertex Key</Button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pointer-events-auto">
                              <button
                                onClick={handleResetKey}
                                className="flex flex-col gap-1.5 group"
                              >
                                <span className="text-gray-500 font-mono text-[8px] uppercase tracking-widest pl-1 text-left">Engine</span>
                                <div className="w-full h-[31px] border border-white/10 bg-black/40 backdrop-blur-md rounded-lg text-gray-400 font-mono text-[8px] uppercase tracking-widest hover:text-white hover:border-white/30 transition-colors flex justify-center items-center gap-1.5 px-2">
                                  <Sparkles size={10} className="text-[#c8f135]" />
                                  <span className="truncate">Vertex</span>
                                </div>
                              </button>
                              <Dropdown
                                label="Duration"
                                value={`${durationSeconds} s`}
                                options={['4s', '6s', '8s']}
                                onChange={(val: string) => setDurationSeconds(val.replace('s', '') as any)}
                                direction="up"
                              />
                              <Dropdown
                                label="Ratio"
                                value={aspectRatio}
                                options={['9:16', '16:9', '1:1']}
                                onChange={setAspectRatio}
                                direction="up"
                                icon={Layout}
                              />
                              <Dropdown
                                label="Res"
                                value={videoResolution}
                                options={['720p', '1080p']}
                                onChange={setVideoResolution}
                                direction="up"
                                icon={Zap}
                              />
                            </div>
                          )}

                          <Button
                            onClick={() => generateVideo()}
                            disabled={isGeneratingVideo || !scenes[activeSceneIndex]?.isApproved}
                            loading={isGeneratingVideo}
                            className="w-full py-4 pointer-events-auto"
                          >
                            {scenes[activeSceneIndex]?.isApproved ? 'Produce Video' : 'Approve Scene to Produce'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {/* ── Assets & Editor Section ─────────────────────────────────── */}
            <div className="space-y-12">
              {/* Gallery Queue */}
              {gallery.length > 0 && (
                <div className="max-w-7xl mx-auto mt-10 border-t border-white/5 pt-8">
                  <h2 className="text-[#c8f135] font-mono text-[10.5px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-3 drop-shadow-[0_0_8px_rgba(200,241,53,0.3)]">
                    <Sparkles size={16} />
                    Asset Forge / Generation Queue
                  </h2>
                  <div className="flex gap-5 overflow-x-auto pb-6 custom-scrollbar px-1">
                    {gallery.map((item: any) => (
                      <div
                        key={item.id}
                        className="relative w-36 h-44 flex-shrink-0 bg-gray-900/40 backdrop-blur-md rounded-xl overflow-hidden group border-2 border-white/5 hover:border-[#c8f135]/50 hover:shadow-[0_0_20px_rgba(200,241,53,0.15)] transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                      >
                        {item.type === 'image' ? (
                          <img src={item.url} className="w-full h-full object-cover" />
                        ) : (
                          <video src={item.url} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute top-2 right-2 bg-black/80 p-1.5 rounded border border-[#333]">
                          {item.type === 'image' ? <Camera size={12} className="text-[#c8f135]" /> : <Video size={12} className="text-[#c8f135]" />}
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                          <button
                            onClick={async () => {
                              if (item.type === 'image') {
                                setRenderMode('image');
                                setGeneratedImg(item.url);

                                // Treat the selected gallery image as the new character reference for video generation
                                try {
                                  const res = await fetch(item.url);
                                  const blob = await res.blob();
                                  const file = new File([blob], "gallery_ref.jpg", { type: blob.type });
                                  setCharacterImg({ url: item.url, file });
                                } catch (e) {
                                  console.error("Failed to convert gallery image to file", e);
                                }
                              } else {
                                setRenderMode('video');
                                setGeneratedVideo(item.url);
                              }
                            }}
                            className="w-full font-mono text-[9px] uppercase tracking-widest text-white bg-white/10 hover:bg-white/20 py-1.5 rounded border border-white/20 transition-all flex items-center justify-center gap-2"
                          >
                            <Play size={10} /> View
                          </button>

                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const response = await fetch(item.url);
                                const blob = await response.blob();
                                const downloadUrl = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = downloadUrl;
                                a.download = `lunar_flare_asset_${Date.now()}.${item.type === 'video' ? 'mp4' : 'png'} `;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                window.URL.revokeObjectURL(downloadUrl);
                              } catch (err) {
                                console.error("Error downloading file", err);
                              }
                            }}
                            className="w-full font-mono text-[9px] uppercase tracking-widest text-white bg-white/10 hover:bg-white/20 py-1.5 rounded border border-white/20 transition-all flex items-center justify-center gap-2"
                          >
                            <Download size={10} /> Save
                          </button>

                          {item.type === 'video' && (
                            <button
                              onClick={() => addToTimeline(item)}
                              className="w-full font-mono text-[9px] uppercase tracking-widest text-black bg-[#c8f135] hover:bg-[#c8f135] py-1.5 rounded font-bold transition-all flex items-center justify-center gap-2"
                            >
                              <Plus size={10} /> Timeline
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline Editor */}
              <div className="max-w-7xl mx-auto mt-8 border-t border-[#222] pt-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-[#c8f135] font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
                      <Scissors size={14} />
                      Professional Editor / Timeline
                    </h2>
                    <p className="text-[#555] text-[9px] font-sans uppercase tracking-tighter">Trim, Arrange, and Master your UGC content</p>
                  </div>
                  {timeline.length > 0 && (
                    <div className="flex gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => { setTimeline([]); setSelectedTimelineId(null); setCurrentTime(0); }}
                        className="px-4 text-red-500 hover:bg-red-500/10"
                      >
                        Clear All
                      </Button>
                      <Button
                        onClick={processTimeline}
                        disabled={isProcessingTimeline}
                        loading={isProcessingTimeline}
                        className="px-8 shadow-[0_0_30px_rgba(212,255,0,0.2)]"
                      >
                        <Download size={16} /> Export Final Master
                      </Button>
                    </div>
                  )}
                </div>

                {timeline.length === 0 ? (
                  <div className="bg-[#0a0a0a] border border-dashed border-[#222] rounded-2xl p-16 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[#111] flex items-center justify-center text-[#333] border border-[#222]">
                      <Plus size={32} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[#a3a3a3] font-sans text-lg font-medium">Timeline is empty</p>
                      <p className="text-[#555] font-mono text-[10px] uppercase tracking-widest max-w-xs">Add clips from the gallery to start building your viral masterpiece</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">

                    {/* Global Sequence Preview */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      <div className="lg:col-span-8 bg-black rounded-2xl border border-[#1a1a1a] overflow-hidden aspect-video relative group shadow-2xl">
                        {activeVideoClip ? (
                          <video
                            key={activeVideoClip.item.id}
                            src={activeVideoClip.item.url}
                            className="w-full h-full object-contain"
                            ref={(el) => {
                              if (el) {
                                el.currentTime = activeVideoClip.localTime;
                                if (isPlaying) el.play().catch(() => { });
                                else el.pause();
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#050505]">
                            <p className="text-[#333] font-mono text-[10px] uppercase tracking-widest">
                              {activeAudioClip ? 'Audio Only Playing...' : 'End of Sequence'}
                            </p>
                          </div>
                        )}

                        {activeAudioClip && (
                          <audio
                            key={activeAudioClip.item.id}
                            src={activeAudioClip.item.url}
                            ref={(el) => {
                              if (el) {
                                el.currentTime = activeAudioClip.localTime;
                                if (isPlaying) el.play().catch(() => { });
                                else el.pause();
                              }
                            }}
                          />
                        )}

                        <div className="absolute bottom-6 left-6 flex items-center gap-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                          <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="text-[#c8f135] hover:scale-110 transition-transform"
                          >
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                          </button>
                          <div className="h-4 w-px bg-white/10" />
                          <span className="text-white font-mono text-xs font-bold tabular-nums">
                            {currentTime.toFixed(2)}s / {totalTimelineDuration.toFixed(2)}s
                          </span>
                        </div>
                      </div>

                      <div className="lg:col-span-4 space-y-4">
                        <div className="bg-[#080808] border border-[#1a1a1a] rounded-2xl p-6 shadow-2xl h-full">
                          <h3 className="text-white font-mono text-[11px] uppercase tracking-widest flex items-center gap-2 mb-4">
                            <Activity size={16} className="text-[#c8f135]" />
                            Sequence Info
                          </h3>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                              <span className="text-[#555] text-[10px] uppercase font-mono">Total Clips</span>
                              <span className="text-white font-bold">{timeline.length}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                              <span className="text-[#555] text-[10px] uppercase font-mono">Resolution</span>
                              <span className="text-white font-bold">{videoResolution}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                              <span className="text-[#555] text-[10px] uppercase font-mono">Aspect Ratio</span>
                              <span className="text-white font-bold">{aspectRatio}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* The Track */}
                    <div className="bg-[#080808] border border-[#1a1a1a] rounded-2xl p-6 overflow-hidden shadow-2xl relative">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full border border-white/5">
                            <span className="text-[#555] font-mono text-[9px] uppercase tracking-widest">Sequence 01</span>
                            <div className="w-1 h-1 rounded-full bg-[#c8f135]" />
                            <span className="text-white font-mono text-[11px] font-bold">
                              {totalTimelineDuration.toFixed(1)}s
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3 bg-black/60 px-4 py-2 rounded-full border border-white/5">
                            <ZoomOut size={14} className="text-gray-600" />
                            <input
                              type="range"
                              min="10"
                              max="200"
                              value={zoomLevel}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setZoomLevel(parseInt(e.target.value))}
                              className="w-32 accent-[#c8f135] h-1 bg-[#222] rounded-full appearance-none cursor-pointer"
                            />
                            <ZoomIn size={14} className="text-gray-600" />
                          </div>
                        </div>
                      </div>

                      <div className="relative">
                        {/* Ruler */}
                        <div
                          className="h-8 border-b border-[#1a1a1a] mb-2 relative cursor-crosshair group/ruler"
                          onClick={handleTimelineClick}
                        >
                          {[...Array(Math.ceil(totalTimelineDuration + 5))].map((_: any, i: number) => (
                            <div
                              key={i}
                              className="absolute top-0 h-full border-l border-[#222] flex flex-col justify-end pb-1"
                              style={{ left: `${i * zoomLevel}px` }}
                            >
                              <span className="text-[8px] font-mono text-[#444] ml-1">{i}s</span>
                            </div>
                          ))}
                        </div>

                        {/* Playhead */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-40 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-all duration-75"
                          style={{ left: `${currentTime * zoomLevel}px` }}
                        >
                          <div className="absolute top-0 left-1/2-translate-x-1/2-translate-y-1/2 w-3 h-3 bg-red-500 rotate-45" />
                        </div>

                        <div className="space-y-4 min-w-full">
                          {/* Track 1: Audio */}
                          <div className="flex items-center gap-4">
                            <div className="w-20 flex flex-col items-center justify-center gap-1 opacity-50">
                              <Volume2 size={14} className="text-[#c8f135]" />
                              <span className="text-[8px] font-black uppercase tracking-widest text-[#c8f135]">Audio</span>
                            </div>
                            <div className="flex-1 h-20 bg-black/40 border border-[#1a1a1a] rounded-xl overflow-x-auto custom-scrollbar p-2 gap-0 relative items-center">
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                                modifiers={[restrictToHorizontalAxis]}
                              >
                                <SortableContext
                                  items={timeline.filter(t => t.track === 1).map((t: TimelineItem) => t.id)}
                                  strategy={horizontalListSortingStrategy}
                                >
                                  {timeline.filter(t => t.track === 1).map((item: TimelineItem, index: number) => (
                                    <SortableTimelineItem
                                      key={item.id}
                                      item={item}
                                      index={index}
                                      isSelected={selectedTimelineId === item.id}
                                      zoomLevel={zoomLevel}
                                      onSelect={setSelectedTimelineId}
                                      onTrimStart={(id: string, start: number) => updateTimelineItem(id, { start })}
                                      onTrimEnd={(id: string, end: number) => updateTimelineItem(id, { end })}
                                      onRemove={removeFromTimeline}
                                    />
                                  ))}
                                </SortableContext>
                              </DndContext>
                            </div>
                          </div>

                          {/* Track 2: Video */}
                          <div className="flex items-center gap-4">
                            <div className="w-20 flex flex-col items-center justify-center gap-1 opacity-50">
                              <Video size={14} className="text-[#00ffe0]" />
                              <span className="text-[8px] font-black uppercase tracking-widest text-[#00ffe0]">Video</span>
                            </div>
                            <div className="flex-1 h-24 bg-black/40 border border-[#1a1a1a] rounded-xl overflow-x-auto custom-scrollbar p-2 gap-0 relative items-center">
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                                modifiers={[restrictToHorizontalAxis]}
                              >
                                <SortableContext
                                  items={timeline.filter(t => t.track === 2).map((t: TimelineItem) => t.id)}
                                  strategy={horizontalListSortingStrategy}
                                >
                                  {timeline.filter(t => t.track === 2).map((item: TimelineItem, index: number) => (
                                    <SortableTimelineItem
                                      key={item.id}
                                      item={item}
                                      index={index}
                                      isSelected={selectedTimelineId === item.id}
                                      zoomLevel={zoomLevel}
                                      onSelect={setSelectedTimelineId}
                                      onTrimStart={(id: string, start: number) => updateTimelineItem(id, { start })}
                                      onTrimEnd={(id: string, end: number) => updateTimelineItem(id, { end })}
                                      onRemove={removeFromTimeline}
                                    />
                                  ))}
                                </SortableContext>
                              </DndContext>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* The Inspector */}
                    {selectedTimelineId && timeline.find(t => t.id === selectedTimelineId) ? (
                      (() => {
                        const item = timeline.find(t => t.id === selectedTimelineId)!;
                        const index = timeline.findIndex(t => t.id === selectedTimelineId);
                        return (
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-[#080808] border border-[#1a1a1a] rounded-2xl p-6 shadow-2xl">
                            {/* Preview */}
                            <div className="lg:col-span-5 space-y-4">
                              <div className="border border-[#1a1a1a] rounded-xl overflow-hidden bg-black aspect-video relative group shadow-2xl">
                                {item.type === 'video' ? (
                                  <video
                                    id={`timeline - video - ${item.id} `}
                                    src={item.url}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#050505] gap-4">
                                    <div className="relative">
                                      <div className="absolute inset-0 bg-[#c8f135]/10 rounded-full blur-2xl animate-pulse" />
                                      <Volume2 size={64} className="text-[#c8f135] relative z-10 opacity-40" />
                                    </div>
                                    <audio
                                      id={`timeline - audio - ${item.id} `}
                                      src={item.url}
                                      className="w-full px-8"
                                      controls
                                    />
                                  </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                                  <Play size={48} className="text-white/20" />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => {
                                  const media = document.getElementById(`timeline - ${item.type} -${item.id} `) as HTMLMediaElement;
                                  if (media) {
                                    media.currentTime = item.start;
                                    media.play();
                                    const checkEnd = () => {
                                      if (media.currentTime >= item.end) {
                                        media.pause();
                                        media.removeEventListener('timeupdate', checkEnd);
                                      }
                                    };
                                    media.addEventListener('timeupdate', checkEnd);
                                  }
                                }}
                                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-all border border-white/10 font-mono text-[10px] uppercase tracking-widest"
                                >
                                  <Play size={14} fill="currentColor" /> Preview Trim
                                </button>
                                {item.type === 'video' && (
                                  <button onClick={() => {
                                    const video = document.getElementById(`timeline - video - ${item.id} `) as HTMLVideoElement;
                                    if (video && video.videoWidth > 0) {
                                      const canvas = document.createElement('canvas');
                                      canvas.width = video.videoWidth;
                                      canvas.height = video.videoHeight;
                                      const ctx = canvas.getContext('2d');
                                      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                                      canvas.toBlob((blob) => {
                                        if (blob) {
                                          const url = URL.createObjectURL(blob);
                                          const file = new File([blob], "timeline_extension_frame.jpg", { type: "image/jpeg" });
                                          setCharacterImg({ url, file });
                                          setRenderMode('video');
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                      }, 'image/jpeg', 0.95);
                                    }
                                  }}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#c8f135]/10 text-[#c8f135] hover:bg-[#c8f135] hover:text-black transition-all border border-[#c8f135]/20 font-mono text-[10px] uppercase tracking-widest"
                                  >
                                    <Camera size={14} /> Extend Scene
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Controls */}
                            <div className="lg:col-span-7 flex flex-col space-y-8">
                              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <div className="flex flex-col">
                                  <h3 className="text-white font-mono text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Settings size={16} className="text-[#c8f135] drop-shadow-[0_0_8px_rgba(200,241,53,0.3)]" />
                                    Master Clip Inspector
                                  </h3>
                                  <span className="text-gray-500 text-[9px] font-mono uppercase tracking-widest mt-1">Index:{index + 1}/ID:{item.id.slice(0, 8)}</span>
                                </div>
                                <div className="flex gap-3">
                                  <button onClick={() => moveTimelineItem(index, 'left')} disabled={index === 0} className="p-3 rounded-xl bg-white/5 text-gray-500 hover:text-[#c8f135] hover:bg-white/10 disabled:opacity-20 border border-white/5 transition-all active:scale-95 cursor-pointer">
                                    <ChevronLeft size={18} />
                                  </button>
                                  <button onClick={() => moveTimelineItem(index, 'right')} disabled={index === timeline.length - 1} className="p-3 rounded-xl bg-white/5 text-gray-500 hover:text-[#c8f135] hover:bg-white/10 disabled:opacity-20 border border-white/5 transition-all active:scale-95 cursor-pointer">
                                    <ChevronRight size={18} />
                                  </button>
                                  <button onClick={() => { removeFromTimeline(item.id); setSelectedTimelineId(null); }} className="p-3 rounded-xl bg-[#ff3a3a]/10 text-[#ff3a3a] hover:bg-[#ff3a3a] hover:text-black transition-all border border-[#ff3a3a]/30 active:scale-95 cursor-pointer">
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-5">
                                  <div className="flex justify-between items-center px-1">
                                    <label className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">Trim Start</label>
                                    <div className="flex items-center gap-2 bg-black border border-white/10 rounded-xl px-4 py-2 shadow-inner">
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max={item.end - 0.5}
                                        value={item.start.toFixed(1)}
                                        onChange={(e) => updateTimelineItem(item.id, { start: Math.max(0, Math.min(parseFloat(e.target.value) || 0, item.end - 0.5)) })}
                                        className="bg-transparent text-[#c8f135] font-mono text-[11px] font-bold w-12 text-center focus:outline-none"
                                      />
                                      <span className="text-gray-600 text-[9px] font-black font-mono">SEC</span>
                                    </div>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max={item.duration}
                                    step="0.1"
                                    value={item.start}
                                    onChange={(e) => updateTimelineItem(item.id, { start: Math.min(parseFloat(e.target.value), item.end - 0.5) })}
                                    className="w-full accent-[#c8f135] h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                                  />
                                </div>

                                <div className="space-y-5">
                                  <div className="flex justify-between items-center px-1">
                                    <label className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">Trim End</label>
                                    <div className="flex items-center gap-2 bg-black border border-white/10 rounded-xl px-4 py-2 shadow-inner">
                                      <input
                                        type="number"
                                        step="0.1"
                                        min={item.start + 0.5}
                                        max={item.duration}
                                        value={item.end.toFixed(1)}
                                        onChange={(e) => updateTimelineItem(item.id, { end: Math.min(item.duration, Math.max(parseFloat(e.target.value) || item.duration, item.start + 0.5)) })}
                                        className="bg-transparent text-[#c8f135] font-mono text-[11px] font-bold w-12 text-center focus:outline-none"
                                      />
                                      <span className="text-gray-600 text-[9px] font-black font-mono">SEC</span>
                                    </div>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max={item.duration}
                                    step="0.1"
                                    value={item.end}
                                    onChange={(e) => updateTimelineItem(item.id, { end: Math.max(parseFloat(e.target.value), item.start + 0.5) })}
                                    className="w-full accent-[#c8f135] h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                                  />
                                </div>
                              </div>

                              <div className="pt-6 border-t border-white/5">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                  <Dropdown
                                    label="Spatial Composition"
                                    value="9:16 (Vertical)"
                                    options={['9:16 (Vertical)', '1:1 (Square)', '16:9 (Landscape)']}
                                    onChange={() => { }}
                                    className="w-full md:w-64"
                                    direction="up"
                                    icon={Layout}
                                  />
                                  <div className="flex-1 w-full bg-[#111] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3">
                                    <div className="p-3 bg-white/5 rounded-full">
                                      <Layout size={20} className="text-gray-600" />
                                    </div>
                                    <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.15em]">Auto-Spatial Centering</p>
                                    <p className="text-gray-600 text-[9px] font-sans leading-relaxed">The Neural Engine automatically maintains subject focus<br />across all mastered aspect ratios</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="bg-[#080808]/40 border border-white/5 rounded-3xl p-16 flex flex-col items-center justify-center text-center backdrop-blur-md">
                        <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-gray-500 mb-6 border border-white/10 shadow-xl">
                          <Settings size={28} className="animate-[spin_10s_linear_infinite]" />
                        </div>
                        <p className="text-gray-400 font-black text-[11px] uppercase tracking-[0.2em] mb-2">Mastering Engine Idle</p>
                        <p className="text-gray-600 text-[10px] uppercase tracking-widest max-w-[280px]">Select a neural burst on the timeline to unlock professional mastering controls</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Overlays & Modals ────────────────────────────────────────── */}

      {/* Focus Modal */}
      {
        isExpandModalOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black/98 backdrop-blur-3xl p-4 lg:p-10 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8 max-w-[1600px] mx-auto w-full">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#c8f135]/10 rounded-2xl border border-[#c8f135]/30 shadow-[0_0_20px_rgba(200,241,53,0.1)]">
                  <Maximize className="w-6 h-6 text-[#c8f135]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">Studio Focus</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#c8f135] animate-pulse" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#c8f135]">Neural Upscaling Active</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setIsExpandModalOpen(false); setIsRefinementOpen(false); }}
                className="p-4 bg-white/5 hover:bg-[#ff3a3a] hover:text-black rounded-2xl border border-white/10 transition-all group cursor-pointer shadow-xl active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-10 min-h-0 max-w-[1600px] mx-auto w-full">
              <div className="flex-1 bg-black rounded-3xl border border-white/5 overflow-hidden relative group shadow-[0_0_50px_rgba(0,0,0,0.5)] min-h-[300px]">
                {renderMode === 'image' ? (
                  <img src={generatedImg || ''} className="w-full h-full object-contain" alt="Focus" />
                ) : (
                  <video src={generatedVideo || ''} className="w-full h-full object-contain" controls autoPlay />
                )}
              </div>

              {/* Sidebar Refinement */}
              {isRefinementOpen ? (
                <div className="w-full lg:w-96 flex flex-col gap-6 p-6 lg:p-8 bg-gray-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl animate-in slide-in-from-right-10 duration-500 shadow-2xl">
                  <div className="flex items-center justify-between pb-4 border-b border-white/5">
                    <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Neural Refinement</span>
                    <button onClick={() => setIsRefinementOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Modifier Prompt</label>
                      <textarea
                        value={imageEditPrompt}
                        onChange={(e) => setImageEditPrompt(e.target.value)}
                        placeholder="Describe changes (e.g., Change lighting to dramatic sunset...)"
                        className="w-full h-32 lg:h-40 bg-black/60 border border-white/10 rounded-2xl p-5 text-sm font-sans focus:outline-none focus:border-[#c8f135] transition-all resize-none shadow-inner"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={regenerateImage}
                    disabled={isRegeneratingImage || !imageEditPrompt}
                    loading={isRegeneratingImage}
                    className="w-full py-4 lg:py-5 text-[11px]"
                  >
                    Apply Neural Update
                  </Button>
                </div>
              ) : (
                <div className="w-full lg:w-24 flex lg:flex-col gap-6 lg:gap-8 items-center justify-center lg:pt-10 pb-6 lg:pb-0">
                  <button
                    onClick={() => setIsRefinementOpen(true)}
                    className="group flex flex-col items-center gap-3"
                  >
                    <div className="w-14 h-14 lg:w-16 lg:h-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-[#c8f135] hover:text-black transition-all duration-500 cursor-pointer shadow-xl group-hover:-translate-y-1">
                      <MessageSquare size={24} className="lg:size-[28px]" />
                    </div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Refine</span>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const url = renderMode === 'image' ? generatedImg : generatedVideo;
                        if (!url) return;
                        const response = await fetch(url);
                        const blob = await response.blob();
                        const dUrl = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = dUrl;
                        a.download = `lunar_studio_${Date.now()}.${renderMode === 'image' ? 'png' : 'mp4'} `;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(dUrl);
                      } catch (err) { console.error(err); }
                    }}
                    className="group flex flex-col items-center gap-3"
                  >
                    <div className="w-14 h-14 lg:w-16 lg:h-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-[#c8f135] hover:text-black transition-all duration-500 cursor-pointer shadow-xl group-hover:-translate-y-1">
                      <Download size={24} className="lg:size-[28px]" />
                    </div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Save</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* Admin Security Portal */}
      {
        showAdminLogin && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in zoom-in-95 duration-300">
            <div className="w-full max-w-sm bg-gray-900/80 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl ring-1 ring-white/10 backdrop-blur-3xl">
              <div className="flex items-center gap-5 mb-10">
                <div className="p-4 bg-[#00ffe0]/10 rounded-2xl border border-[#00ffe0]/30 shadow-[0_0_20px_rgba(0,255,224,0.1)]">
                  <ShieldCheck className="w-8 h-8 text-[#00ffe0]" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">Neural Secure</h2>
                  <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-gray-500">Protocol:Admin Auth</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-black ml-1">Universal Key</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-5 text-sm font-mono tracking-[0.5em] focus:outline-none focus:border-[#00ffe0]/50 transition-all text-[#00ffe0] shadow-inner"
                    placeholder="••••••••"
                    autoFocus
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowAdminLogin(false)}
                    className="flex-1 px-4 py-4 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Exit
                  </button>
                  <button
                    onClick={handleAdminLogin}
                    className="flex-1 px-4 py-4 rounded-2xl bg-[#c8f135] text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer shadow-[#c8f135]/20"
                  >
                    Authorize
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Admin Control Point */}
      <div className="fixed bottom-8 right-8 z-[90]">
        <button
          onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminLogin(true)}
          className={`w-14 h-14 rounded-2xl border transition-all flex items-center justify-center cursor-pointer shadow-2xl group relative overflow-hidden ${isAdmin ? 'bg-[#c8f135] text-black border-[#c8f135] shadow-[0_0_30px_rgba(200,241,53,0.3)]' : 'bg-black/60 text-gray-500 border-white/10 hover:border-[#00ffe0]/50 hover:text-[#00ffe0] backdrop-blur-xl'} `}
          title={isAdmin ? "Terminate Admin Session" : "Secure Auth"}
        >
          {isAdmin ? <ShieldCheck className="w-6 h-6" /> : <Shield className="w-5 h-5 group-hover:scale-110 transition-transform" />}
          {isAdmin && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />}
        </button>
      </div>
    </div >
  );
}
