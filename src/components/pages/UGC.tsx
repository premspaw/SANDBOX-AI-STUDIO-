import React, { useState, useEffect } from 'react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { motion, AnimatePresence } from 'motion/react';
import { Upload, User, Box, FileText, Camera, Play, Pause, Wand2, Loader2, Volume2, VolumeX, Sparkles, Video, X, Scissors, Plus, Trash2, Save, ChevronRight, ChevronLeft, ChevronDown, Layout, AlertCircle, HelpCircle, Settings, SidebarClose, SidebarOpen, Download, ZoomIn, ZoomOut, GripVertical, Check, CheckCircle, BrainCircuit, Zap, ShieldCheck, Shield, Clock, Activity, Maximize, Layers, Monitor, Search, Package, Droplets, Wind, Fingerprint, Lock, PlayCircle, RotateCcw, Film, MapPin, Pencil } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import { useShorts } from '../../hooks/useShorts';
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
import { getApiUrl } from '../../config/apiConfig';


import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenAI } from "@google/genai";

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
  originalFile?: File;
}

interface Scene {
  id: string;
  text?: string;
  prompt: string;
  isApproved: boolean;
  visualCue?: string;
  timestamp?: string;
  label?: string;
  image?: string;
}

// ─── UTILS ──────────────────────────────────────────────────
const uint8ArrayToBase64 = (uint8Array: Uint8Array): string => {
  const CHUNK_SIZE = 0x8000; // 32KB chunks
  let index = 0;
  const length = uint8Array.length;
  let result = '';
  while (index < length) {
    const chunk = uint8Array.slice(index, Math.min(index + CHUNK_SIZE, length));
    result += String.fromCharCode.apply(null, chunk as any);
    index += CHUNK_SIZE;
  }
  return btoa(result);
};

const ensureDataUri = (str: string | null | undefined): string => {
  if (!str) return '';
  if (str.startsWith('http') || str.startsWith('data:') || str.startsWith('blob:') || str.length < 50) return str;
  return `data:image/jpeg;base64,${str}`;
};

const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const resizeImage = (file: File | Blob, maxDim = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const withTimeout = <T extends unknown>(promise: Promise<T>, timeoutMs: number, errorMessage = "Operation timed out"): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
};

const safeJsonParse = (text: string | undefined) => {
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try to extract JSON from markdown if present
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        console.error("Failed to parse extracted JSON", e2);
      }
    }
    console.error("JSON parse failed", e, text);
    return {};
  }
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

const getVirtualCreatorPrompt = (details: string, tags: string[]) => {
  const lowerDetails = details.toLowerCase();
  const allTags = tags.join(' ').toLowerCase();
  
  if (lowerDetails.includes('beauty') || lowerDetails.includes('skin') || allTags.includes('skincare') || allTags.includes('makeup')) {
    return "A young, charismatic female beauty influencer with flawless skin, natural makeup, and a friendly smile. She is relatable and authentic.";
  } else if (lowerDetails.includes('tech') || lowerDetails.includes('gadget') || allTags.includes('tech') || allTags.includes('electronics')) {
    return "A tech-savvy, energetic young adult creator with a modern, clean look. They are enthusiastic and knowledgeable about gadgets.";
  } else if (lowerDetails.includes('fitness') || lowerDetails.includes('gym') || allTags.includes('fitness') || allTags.includes('sport')) {
    return "A fit, athletic creator in high-quality activewear. They look healthy, motivated, and are in a bright, modern gym or home workout space.";
  } else if (lowerDetails.includes('fashion') || lowerDetails.includes('clothing') || allTags.includes('fashion') || allTags.includes('style')) {
    return "A stylish, trendy fashion creator with a great sense of personal style. They look confident and are in a chic, well-lit urban or indoor setting.";
  } else if (lowerDetails.includes('food') || lowerDetails.includes('kitchen') || allTags.includes('cooking') || allTags.includes('drink')) {
    return "A warm, approachable home cook or foodie creator in a clean, modern kitchen. They look passionate about food and have a welcoming vibe.";
  }
  
  // Default
  return "A relatable, charismatic young adult UGC creator with a natural, authentic look. They are friendly, energetic, and talk directly to the camera.";
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
  id?: string;
}

const Button = ({ children, onClick, disabled, loading, variant = 'primary', className = '', id }: ButtonProps) => {
  const baseStyle = "relative font-sans text-[10px] font-black uppercase tracking-widest py-2.5 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden cursor-pointer active:scale-95 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#c8f135] text-black hover:brightness-110 shadow-[0_0_20px_rgba(200,241,53,0.3)] hover:shadow-[0_0_30px_rgba(200,241,53,0.5)] disabled:bg-[#222] disabled:text-[#555] disabled:shadow-none",
    secondary: "bg-transparent border border-white/20 text-white hover:bg-white/5 hover:border-[#c8f135] hover:text-[#c8f135] shadow-lg disabled:border-[#222] disabled:text-[#555]",
    ghost: "bg-transparent text-[#999] hover:text-white hover:bg-white/10"
  };

  return (
    <button
      id={id}
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
                {options.map((opt: string, optIdx: number) => (
                  <button
                    key={optIdx}
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
    ? ["Setting up Studio Lights...", "Calibrating Creator Camera...", "Analyzing Product DNA...", "Synthesizing Natural Expressions...", "Capturing Realistic Frame..."]
    : ["Analyzing Script Hooks...", "Synthesizing Motion Dynamics...", "Calibrating Lip-Sync Precision...", "Rendering Realistic Frames...", "Finalizing UGC Aesthetic..."];

  const progress = ((step + 1) / steps.length) * 100;

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
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(255,58,58,0.8)] border-2 border-black" />
        </div>
      </div>

      <div className="text-center space-y-6 max-w-xs px-6 relative z-10">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(255,58,58,0.6)]" />
            <p className="text-[#c8f135] font-black italic text-sm uppercase tracking-[0.25em] drop-shadow-[0_0_8px_rgba(200,241,53,0.4)]">
              {message || steps[step]}
            </p>
          </div>
          <p className="text-gray-500 font-mono text-[9px] uppercase tracking-[0.3em] font-medium">
            {type === 'image' ? 'Frame Synthesis' : 'Motion Engine'}
          </p>
        </div>

        <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-[#00ffe0] to-[#c8f135] transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(200,241,53,0.6)]"
            style={{ width: `${message ? 100 : progress}%` }}
          />
        </div>

        <div className="flex justify-between items-center px-1">
          <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Status: Active</span>
          <span className="text-[8px] font-mono text-[#c8f135]">{message ? '100' : Math.round(progress)}%</span>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 pt-4">
          {["4K", "RAW", "LOG", "UGC"].map(tag => (
            <span key={tag} className="text-[8px] font-bold font-mono border px-2 py-1 rounded transition-all tracking-widest text-white/30 border-white/10 bg-white/5">
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
const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Zephyr', 'Orion', 'Leda', 'Orus', 'Perseus', 'Castor', 'Pollux', 'Cetus', 'Aquila', 'Rigel', 'Spica', 'Algieba', 'Despina', 'Erinome', 'Algenib', 'Rasalghul'];

const SCENE_TEMPLATES = [
  { id: 1, title: 'Park Walk', sceneContext: 'A lush park', prompt: 'A casual vlog-style video of a creator walking through a bright, lush park. The camera bobs slightly to simulate walking. Natural sunlight illuminating the face, a gentle breeze in the air.', img: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=150' },
  { id: 2, title: 'Kitchen Review', sceneContext: 'A modern kitchen', prompt: 'Creator standing in a brightly lit modern kitchen with marble countertops. They are holding a product up to the camera with an excited expression. Warm indoor lighting.', img: 'https://images.unsplash.com/photo-1556910103-1c02745ae239?auto=format&fit=crop&q=80&w=150' },
  { id: 3, title: 'Car Vlog', sceneContext: 'Inside a moving car', prompt: 'Close-up shot of a creator sitting in the driver seat of a car, talking directly into the camera attached to the dashboard. Natural light coming through the windshield, soft background blur.', img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=150' },
  { id: 4, title: 'Bedroom Chat', sceneContext: 'A cozy bedroom', prompt: 'Creator sitting cross-legged on a bed in a cozy bedroom with warm string lights. They are casually chatting with the camera. Intimate, relaxed vibe.', img: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f1425?auto=format&fit=crop&q=80&w=150' },
  { id: 5, title: 'Street Style', sceneContext: 'A bustling street', prompt: 'Dynamic tracking shot of a creator walking down a bustling city street at golden hour. Trendy outfit, confident walk, talking directly to the viewer.', img: 'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?auto=format&fit=crop&q=80&w=150' },
  { id: 6, title: 'Makeup Session', sceneContext: 'A vanity mirror', prompt: 'Close-up of a creator sitting at a vanity mirror, applying makeup while giving tips to the camera. Soft ring light reflects in their eyes. High-detail skin textures.', img: 'https://images.unsplash.com/photo-1522335719551-bb2f15e3850d?auto=format&fit=crop&q=80&w=150' },
  { id: 7, title: 'Quiet Study', sceneContext: 'A library/study', prompt: 'Creator sitting at a wooden desk in a quiet library surrounded by books. They are whispering into the camera about their favorite reads. Moody, academic aesthetic.', img: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=150' },
  { id: 8, title: 'Hair Styling', sceneContext: 'A bathroom mirror', prompt: 'A medium shot of a man in front of a bathroom mirror, running his hands through his damp hair with the Elegance Hair Cream. He styles it effortlessly, achieving a natural, textured look. Bright, clean bathroom lighting, realistic UGC style, shot on iPhone, authentic home environment, 4k.', img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&q=80&w=150' }
];

// ── Inpaint Editor (Brush Edit modal, mirrors MarketingStudio) ───────────────
function InpaintEditor({ imageUrl, userId, onClose, onDone }: { imageUrl: string; userId?: string | null; onClose: () => void; onDone: (url: string) => void }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [tool, setTool] = React.useState<'brush' | 'eraser'>('brush');
  const [brushSize, setBrushSize] = React.useState(32);
  const [instruction, setInstruction] = React.useState('');
  const [model, setModel] = React.useState<'gemini' | 'gpt'>('gemini');
  const [isEditing, setIsEditing] = React.useState(false);
  const [history, setHistory] = React.useState<string[]>([]);
  const lastPos = React.useRef<{ x: number; y: number } | null>(null);
  const [refImage, setRefImage] = React.useState<string | null>(null);
  const refInputRef = React.useRef<HTMLInputElement>(null);

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setRefImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory(prev => [...prev.slice(-10), canvas.toDataURL()]);
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory();
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2) return;
    const prev = history[history.length - 2];
    const i = new window.Image();
    i.onload = () => { const ctx = canvas.getContext('2d')!; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(i, 0, 0); };
    i.src = prev;
    setHistory(h => h.slice(0, -1));
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
  };

  const getPos = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const draw = (e: any) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e, canvas);
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = 'rgba(168,85,247,0.85)';
    ctx.lineWidth = brushSize * (canvas.width / canvas.getBoundingClientRect().width);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current?.x ?? pos.x, lastPos.current?.y ?? pos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const startDraw = (e: any) => { e.preventDefault(); setIsDrawing(true); const canvas = canvasRef.current!; lastPos.current = getPos(e, canvas); draw(e); };
  const stopDraw = () => { if (isDrawing) { setIsDrawing(false); saveHistory(); } lastPos.current = null; };

  const getMaskBase64 = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const mask = document.createElement('canvas');
    mask.width = canvas.width; mask.height = canvas.height;
    const mctx = mask.getContext('2d')!;
    mctx.fillStyle = 'black';
    mctx.fillRect(0, 0, mask.width, mask.height);
    const paintData = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    const out = mctx.getImageData(0, 0, mask.width, mask.height);
    for (let i = 0; i < paintData.data.length; i += 4) {
      if (paintData.data[i + 3] > 10) { out.data[i] = 255; out.data[i+1] = 255; out.data[i+2] = 255; out.data[i+3] = 255; }
    }
    mctx.putImageData(out, 0, 0);
    return mask.toDataURL('image/png');
  };

  const handleEdit = async () => {
    if (!instruction.trim()) { alert('Describe what to change in the painted area.'); return; }
    const maskBase64 = getMaskBase64();
    if (!maskBase64) return;
    setIsEditing(true);
    try {
      let resultUrl: string | null = null;
      if (model === 'gemini') {
        const resp = await fetch(getApiUrl('/api/edit-image'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: imageUrl, maskBase64, prompt: instruction + (refImage ? ' Reference image provided for style guidance.' : ''), referenceImage: refImage || undefined, userId })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Edit failed');
        resultUrl = data.url || data.imageUrl || data.dataUrl;
      } else {
        const editPrompt = `Edit the image as follows: ${instruction}.${refImage ? ' Use the reference image as a style/content guide for the marked area.' : ''} Focus changes ONLY on the highlighted/masked region. Keep everything else exactly the same.`;
        const resp = await fetch(getApiUrl('/api/generate-image'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-image-2', prompt: editPrompt, image: imageUrl, secondImage: refImage || undefined, size: '1024x1024', quality: 'medium', userId })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'GPT edit failed');
        resultUrl = data.url || data.imageUrl;
      }
      if (resultUrl) { onDone(resultUrl); onClose(); }
      else throw new Error('No image returned');
    } catch (err: any) {
      alert('Edit failed: ' + err.message);
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }}
          className="relative w-full max-w-4xl bg-[#0e0e11] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl max-h-[95vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0e0e11] flex-none">
            <div className="flex items-center gap-3">
              <Pencil className="w-4 h-4 text-purple-400" />
              <span className="font-black text-white text-sm uppercase tracking-wider">Brush Edit</span>
              <span className="text-[10px] text-white/30 uppercase tracking-widest">Paint the area · describe the change · hit Edit</span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white/60" /></button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Canvas area */}
            <div className="flex-1 relative overflow-auto flex items-center justify-center bg-black/40 p-3">
              <div className="relative inline-block">
                <img ref={imgRef} src={imageUrl} alt="edit base" onLoad={initCanvas}
                  className="block rounded-xl max-w-full max-h-[70vh] object-contain" />
                <canvas ref={canvasRef}
                  className="absolute inset-0 rounded-xl"
                  style={{ width: '100%', height: '100%', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
                  onMouseDown={startDraw} onMouseMove={e => isDrawing && draw(e)} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={startDraw} onTouchMove={e => isDrawing && draw(e)} onTouchEnd={stopDraw}
                />
              </div>
            </div>

            {/* Right controls */}
            <div className="w-60 flex-none border-l border-white/10 bg-[#111114] flex flex-col p-4 gap-4 overflow-y-auto">
              {/* Tools */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Tool</p>
                <div className="flex gap-2">
                  <button onClick={() => setTool('brush')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tool === 'brush' ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>🖌 Brush</button>
                  <button onClick={() => setTool('eraser')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tool === 'eraser' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>◻ Erase</button>
                </div>
              </div>

              {/* Brush size */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Brush Size: {brushSize}px</p>
                <input type="range" min={8} max={120} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-full accent-purple-500" />
              </div>

              {/* Undo / Clear */}
              <div className="flex gap-2">
                <button onClick={undo} disabled={history.length < 2} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 text-white/40 hover:bg-white/10 disabled:opacity-30 transition-all">↩ Undo</button>
                <button onClick={clearMask} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 text-white/40 hover:bg-white/10 transition-all">✕ Clear</button>
              </div>

              {/* Reference Image */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Reference Image <span className="font-normal normal-case text-white/20">(optional)</span></p>
                {refImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-lime-500/30 bg-white/5">
                    <img src={refImage} alt="ref" className="w-full max-h-24 object-cover" />
                    <button onClick={() => setRefImage(null)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-red-500/80 flex items-center justify-center transition-colors"><X className="w-3 h-3 text-white" /></button>
                    <span className="absolute bottom-1 left-1 text-[8px] text-lime-300 bg-black/60 px-1.5 py-0.5 rounded font-bold uppercase">Ref ✓</span>
                  </div>
                ) : (
                  <button onClick={() => refInputRef.current?.click()} className="w-full border-2 border-dashed border-white/15 hover:border-lime-400/40 rounded-xl py-3 flex items-center justify-center gap-2 text-[10px] text-white/30 hover:text-white/60 transition-all">
                    <Upload className="w-3.5 h-3.5" /> Upload Reference
                  </button>
                )}
                <input ref={refInputRef} type="file" accept="image/*" className="hidden" onChange={handleRefUpload} />
                <p className="text-[8px] text-white/15 leading-relaxed">Sent alongside image to guide AI on what to draw in marked area.</p>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">AI Model</p>
                <div className="flex flex-col gap-1.5">
                  <button onClick={() => setModel('gemini')} className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-left px-3 ${model === 'gemini' ? 'bg-blue-500/20 border border-blue-400/40 text-blue-300' : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'}`}>
                    ✦ Gemini (NB2)<br/><span className="text-[8px] font-normal normal-case opacity-60">Precise mask-based inpainting</span>
                  </button>
                  <button onClick={() => setModel('gpt')} className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-left px-3 ${model === 'gpt' ? 'bg-purple-500/20 border border-purple-400/40 text-purple-300' : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'}`}>
                    ◈ GPT Image 2<br/><span className="text-[8px] font-normal normal-case opacity-60">Instruction-based regeneration</span>
                  </button>
                </div>
              </div>

              {/* Instruction */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">What to change</p>
                <textarea value={instruction} onChange={e => setInstruction(e.target.value)}
                  placeholder="e.g. Replace wall with brick texture, Change color to blue…"
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-purple-400/50 resize-none" />
              </div>

              {/* Submit */}
              <button onClick={handleEdit} disabled={isEditing || !instruction.trim()}
                className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${isEditing || !instruction.trim() ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-[1.02] shadow-lg shadow-purple-500/20'}`}>
                {isEditing ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Editing…</span> : '✦ Apply Edit'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ── IndexedDB gallery persistence (no size limit, survives refresh) ──────────
const IDB_NAME = 'ugc_studio';
const IDB_STORE = 'gallery';

const openIDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const req = indexedDB.open(IDB_NAME, 1);
  req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE, { keyPath: 'id' }); };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const saveGalleryToIDB = async (items: GalleryItem[]) => {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.clear();
    items.forEach(item => store.put(item));
  } catch {}
};

const loadGalleryFromIDB = async (): Promise<GalleryItem[]> => {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve((req.result as GalleryItem[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
};
// ─────────────────────────────────────────────────────────────────────────────

const uploadToSupabase = async (blob: Blob, type: 'image' | 'video', promptText: string, userId?: string | null) => {
  try {
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    const res = await fetch(getApiUrl('/api/upload-asset'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: base64, type, prompt: promptText, userId })
    });

    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
    const { url } = await res.json();
    console.log('[GCS] Asset uploaded:', url);
    return url;
  } catch (error) {
    console.error('[GCS] Upload error:', error);
    return null;
  }
};

interface SortableTimelineItemProps {
  key?: string;
  item: TimelineItem;
  index: number;
  isSelected: boolean;
  zoomLevel: number;
  currentTime: number;
  accumulatedStartTime: number;
  onSelect: (id: string) => void;
  onTrimStart: (id: string, start: number) => void;
  onTrimEnd: (id: string, end: number) => void;
  onRemove: (id: string) => void;
}

const SortableTimelineItem = ({ item, index, isSelected, zoomLevel, currentTime, accumulatedStartTime, onSelect, onTrimStart, onTrimEnd, onRemove }: SortableTimelineItemProps) => {
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

      {/* Progress Overlay */}
      <div 
        className="absolute inset-y-0 left-0 bg-[#c8f135]/20 pointer-events-none border-r border-[#c8f135]/50 z-10"
        style={{ 
          width: `${Math.min(100, Math.max(0, (currentTime - accumulatedStartTime) / (item.end - item.start) * 100))}%`,
          opacity: currentTime >= accumulatedStartTime ? 1 : 0
        }}
      />
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
    modifier: "action-oriented performance, dramatic movements, intense expressions, powerful gestures, high energy, dynamic delivery"
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

export default function UGC() {
  const { spend, refund } = useShorts();
  const userProfile = useAppStore(state => state.userProfile as { id?: string; role?: string } | null);
  const currentUserId = userProfile?.id || null;
  const isGlobalAdmin = userProfile?.role === 'admin';

  const [activeTab, setActiveTab] = useState('ugc');

  const getApiKey = () => {
    return localStorage.getItem('GOOGLE_API_KEY') || (window as any).aistudio?.apiKey || import.meta.env.VITE_GOOGLE_API_KEY || '';
  };

  const getAI = () => {
    const key = getApiKey();
    if (!key) throw new Error("No API Key detected. Please provide a Gemini API Key in Settings.");
    
    return new GoogleGenAI({ 
        apiKey: key
    });
  };

  const [dbSceneTemplates, setDbSceneTemplates] = useState(SCENE_TEMPLATES);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!supabase) return; // Fix Typescript 'possibly null' error
      try {
        const { data, error } = await supabase.from('ugc_scene_templates').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          setDbSceneTemplates([...data, ...SCENE_TEMPLATES]);
        }
      } catch (err) {
        console.warn('Failed to fetch scene templates', err);
      }
    };
    fetchTemplates();
  }, []);

  const [showUploadForm, setShowUploadForm] = useState(false);

  const handleUploadTemplateUgc = async () => {
    const title = (document.getElementById('ugcTplTitle') as HTMLInputElement)?.value;
    const context = (document.getElementById('ugcTplContext') as HTMLInputElement)?.value;
    const prompt = (document.getElementById('ugcTplPrompt') as HTMLTextAreaElement)?.value;
    const fileInput = document.getElementById('ugcTplFile') as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!title || !prompt || !file) {
      alert('Please fill headline title, prompt, and attach a file.');
      return;
    }
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((res, rej) => { reader.onload = e => res(e.target!.result as string); reader.onerror = rej; reader.readAsDataURL(file); });
      const uploadResp = await fetch('/api/upload-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: base64, type: file.type.startsWith('video') ? 'video' : 'image', userId: null })
      });
      const uploadData = await uploadResp.json();
      if (!uploadData.url) throw new Error('Upload failed');
      if (!supabase) return;
      const { error: dbError } = await supabase.from('ugc_scene_templates').insert({
        title, scene_context: context, prompt, img: uploadData.url
      });
      if (dbError) throw dbError;

      alert('Template Uploaded Successfully!');
      setShowUploadForm(false);
      
      const { data } = await supabase.from('ugc_scene_templates').select('*').order('created_at', { ascending: false });
      if (data) setDbSceneTemplates([...data, ...SCENE_TEMPLATES]);
    } catch (err: any) {
      console.error(err);
      alert('Upload failed: ' + err.message);
    }
  };

  const handleDeleteTemplate = async (templateId: any) => {
    if (!window.confirm('Delete this template permanently?')) return;
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('ugc_scene_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
      
      setDbSceneTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const [characterImg, setCharacterImg] = useState<{ url: string, file: File } | null>(null);
  const [productImg, setProductImg] = useState<{ url: string, file: File } | null>(null);
  const [locationImg, setLocationImg] = useState<{ url: string, file: File } | null>(null);
  const [podcastHost1Img, setPodcastHost1Img] = useState<{ url: string, file: File } | null>(null);
  const [podcastHost2Img, setPodcastHost2Img] = useState<{ url: string, file: File } | null>(null);
  const [podcastProductImg, setPodcastProductImg] = useState<{ url: string, file: File } | null>(null);
  const [host1Voice, setHost1Voice] = useState('Aoede');
  const [host2Voice, setHost2Voice] = useState('Puck');
  const [host1Name, setHost1Name] = useState('Host 1');
  const [host2Name, setHost2Name] = useState('Host 2');
  const [podcastScene, setPodcastScene] = useState('');
  const [podcastDirectorNote, setPodcastDirectorNote] = useState('');

  const [productTags, setProductTags] = useState<string[]>([]);
  const [productAnalysis, setProductAnalysis] = useState<{ productName?: string; description?: string; keyBenefits?: string[]; targetAudience?: string; useCases?: string[] } | null>(null);
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
  // ── Talking Head state ──────────────────────────────────────
  const [thPersonImg, setThPersonImg] = useState<{ file: File; url: string } | null>(null);
  const [thProductImg, setThProductImg] = useState<{ file: File; url: string } | null>(null);
  const [thLocationImg, setThLocationImg] = useState<{ file: File; url: string } | null>(null);
  const [thGeneratedImg, setThGeneratedImg] = useState<string>('');
  const [thGeneratedVideo, setThGeneratedVideo] = useState<string>('');
  const [thScript, setThScript] = useState<string>('');
  const [thEngine, setThEngine] = useState<'veo3' | 'veo_fast'>('veo_fast');
  const [thIsGeneratingImg, setThIsGeneratingImg] = useState(false);
  const [thIsGeneratingVideo, setThIsGeneratingVideo] = useState(false);
  const [thVideoProgress, setThVideoProgress] = useState('');
  const [thDuration, setThDuration] = useState<'4' | '6' | '8'>('8');
  const [thAspectRatio, setThAspectRatio] = useState<'9:16' | '16:9'>('9:16');

  const [voiceSampleFile, setVoiceSampleFile] = useState<File | null>(null);
  const [voiceSampleName, setVoiceSampleName] = useState<string | null>(null);
  const [voiceStyle, setVoiceStyle] = useState<string>('');
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);
  const [imageStyle, setImageStyle] = useState<'studio' | 'ultra-realistic' | 'iphone' | 'short' | 'normal' | 'cinematic'>('ultra-realistic');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [durationSeconds, setDurationSeconds] = useState<'4' | '6' | '8'>('8');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('720p');
  const [selectedVideoStyle, setSelectedVideoStyle] = useState<'calm' | 'energetic' | 'action' | 'professional' | 'casual' | 'storytelling'>('calm');
  const [isPerformanceStyleExpanded, setIsPerformanceStyleExpanded] = useState(false);

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
  const [analysisProgress, setAnalysisProgress] = useState('');


  const [timeline, setTimeline] = useState<TimelineItem[]>(() => {
    const saved = localStorage.getItem('ugc_timeline_cache');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  const [zoomLevel, setZoomLevel] = useState(40); // pixels per second
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessingTimeline, setIsProcessingTimeline] = useState(false);
  const [montageOptions, setMontageOptions] = useState<{ id: string, title: string, prompt: string, icon: string }[]>([]);
  const [selectedMontageOption, setSelectedMontageOption] = useState<{ id: string, title: string, prompt: string, icon: string } | null>(null);
  const [montagePrompt, setMontagePrompt] = useState('');
  const [isMontageApproved, setIsMontageApproved] = useState(false);
  const [isGeneratingMontageOptions, setIsGeneratingMontageOptions] = useState(false);
  const [showMontageOptions, setShowMontageOptions] = useState(false);
  const [montageGeneratedImg, setMontageGeneratedImg] = useState<string>('');
  const [isGeneratingMontageImg, setIsGeneratingMontageImg] = useState(false);
  const [montageImgProgressMsg, setMontageImgProgressMsg] = useState('');
  const [montageImgExpanded, setMontageImgExpanded] = useState(false);
  const [montageAudioEnabled, setMontageAudioEnabled] = useState(false);
  const [montageDuration, setMontageDuration] = useState<'4' | '6' | '8'>('4');

  const totalTimelineDuration = timeline.reduce((acc: number, t: TimelineItem) => acc + (t.end - t.start), 0);

  const getCurrentClip = (time: number) => {
    let accumulatedTime = 0;
    for (const item of timeline) {
      const itemDuration = item.end - item.start;
      if (time >= accumulatedTime && time < accumulatedTime + itemDuration) {
        return { item, localTime: item.start + (time - accumulatedTime) };
      }
      accumulatedTime += itemDuration;
    }
    return null;
  };

  const activeClip = getCurrentClip(currentTime);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        // Prevent scrolling if space is pressed
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsPlaying(prev => !prev);
        }
      }
      if (e.code === 'Escape') {
        setMontageImgExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const [gallery, setGallery] = useState<GalleryItem[]>(() => {
    try {
      const saved = localStorage.getItem('ugc_generation_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [galleryTab, setGalleryTab] = useState<'all' | 'image' | 'video'>('all');
  const [galleryExpandItem, setGalleryExpandItem] = useState<GalleryItem | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [trainedStrategy, setTrainedStrategy] = useState<string>(() => {
    return localStorage.getItem('ugc_trained_strategy') || '';
  });
  const [isTraining, setIsTraining] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);

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

  // On mount: load from IDB (primary) and merge with localStorage items
  useEffect(() => {
    loadGalleryFromIDB().then(idbItems => {
      const sorted = [...idbItems].sort((a, b) => {
        const aNum = parseInt(a.id) || 0;
        const bNum = parseInt(b.id) || 0;
        return bNum - aNum;
      });
      setGallery(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const extras = sorted.filter(i => !existingIds.has(i.id) && i.url);
        return extras.length ? [...extras, ...prev] : prev;
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When user logs in: fetch their assets from Supabase and merge into gallery
  useEffect(() => {
    if (!currentUserId) return;
    fetch(getApiUrl(`/api/ugc/assets/${currentUserId}`))
      .then(r => r.json())
      .then(({ assets }) => {
        if (!Array.isArray(assets) || assets.length === 0) return;
        const dbItems: GalleryItem[] = assets
          .filter((a: any) => a.url)
          .map((a: any) => ({
            id: String(a.id),
            type: (a.type === 'video' ? 'video' : 'image') as 'image' | 'video',
            url: a.url,
            prompt: a.prompt || '',
          }));
        setGallery(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const fresh = dbItems.filter(i => !existingIds.has(i.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      })
      .catch(err => console.warn('[GALLERY-LOAD]', err.message));
  }, [currentUserId]);

  // Mirror MarketingStudio: save gallery inline whenever a new item is added
  const addToGallery = React.useCallback((item: GalleryItem) => {
    setGallery(prev => {
      const next = [item, ...prev].slice(0, 100);
      // If it's a real persistent URL (R2/GCS/https) — save to localStorage like MarketingStudio
      const persistable = next.filter(i => i.url && !i.url.startsWith('data:') && !i.url.startsWith('blob:'));
      try { localStorage.setItem('ugc_generation_history', JSON.stringify(persistable)); } catch (_) {}
      // Also save ALL (including data: base64) to IDB so nothing is lost
      saveGalleryToIDB(next.filter(i => i.url && !i.url.startsWith('blob:')));
      return next;
    });
  }, []);

  const handleAdminLogin = () => {
    if (adminPassword === 'admin123') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
      showToast('Admin mode ON — unlimited video generation', 'success');
    } else {
      alert('Invalid password');
    }
  };

  // Ctrl+Shift+A opens admin login
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (isAdmin) { setIsAdmin(false); showToast('Admin mode OFF', 'error'); }
        else setShowAdminLogin(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const trainAgent = async () => {
    if (knowledgeBase.length === 0) return;

    setIsTraining(true);
    try {
      const ai = getAI();
      const allContent = knowledgeBase.map((kb: KnowledgeBaseEntry) => kb.content).join('\n\n---\n\n');

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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

  const testApiConnection = async () => {
    setIsTestingApi(true);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "API Connection Test. Respond with 'OK' if you can hear me.",
      });
      if (response.text?.toLowerCase().includes('ok')) {
        showToast("API Connection Verified: Success", "success");
      } else {
        showToast("API Connection Verified: Unexpected Response", "info");
      }
    } catch (error) {
      handleApiError(error, "API Connection Test");
    } finally {
      setIsTestingApi(false);
    }
  };

  const [sceneContext, setSceneContext] = useState('Studio (Default)');
  const [isUploadingKB, setIsUploadingKB] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isScriptCardOpen, setIsScriptCardOpen] = useState(true);
  const [leftPanelMode, setLeftPanelMode] = useState<'image' | 'video'>('video');
  const [imgEngine, setImgEngine] = useState<'nb2' | 'gpt2'>('nb2');
  const [gpt2Quality, setGpt2Quality] = useState<'low' | 'medium' | 'high'>('low');
  const [isGalleryOpen, setIsGalleryOpen] = useState(true);
  const [inpaintImg, setInpaintImg] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [attachedRefImage, setAttachedRefImage] = useState<string | null>(null);
  const [spokenDialog, setSpokenDialog] = useState<string>('');
  const [splitScenes, setSplitScenes] = useState<{label: string; dialog: string}[]>([]);
  const [activeSplitTab, setActiveSplitTab] = useState(0);
  const [selectedPromptVariant, setSelectedPromptVariant] = useState(0);
  const [chatTab, setChatTab] = useState<'script' | 'video'>('script');
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [videoGenMode, setVideoGenMode] = useState<'veo_fast' | 'veo3' | 'montage'>('veo_fast');
  const [showVideoMontageOptions, setShowVideoMontageOptions] = useState(true);
  const [showLiveGuide, setShowLiveGuide] = useState(false);


  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const studioVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isStudioVideoPlaying, setIsStudioVideoPlaying] = useState(false);

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
        alert(`Failed to parse ${file.name}. Please check console for details.`);
      }
    }

    if (newEntries.length > 0) {
      setKnowledgeBase((prev: KnowledgeBaseEntry[]) => [...prev, ...newEntries]);
      if (!hasError) showToast(`${newEntries.length} document(s) loaded successfully into Viral DNA!`, 'success');
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
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const historyGallery: GalleryItem[] = data.map((item: any) => ({
          id: item.id,
          type: item.asset_type as 'image' | 'video',
          url: ensureDataUri(item.public_url),
          prompt: item.prompt
        }));

        // Append Supabase history after current session items (session items stay on top)
        setGallery((prev: GalleryItem[]) => {
          const existingIds = new Set(prev.map((p: GalleryItem) => p.id));
          const existingUrls = new Set(prev.map((p: GalleryItem) => p.url).filter(Boolean));
          const newItems = historyGallery.filter((hist: GalleryItem) =>
            hist.url && !existingIds.has(hist.id) && !existingUrls.has(hist.url)
          );
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
    };

    fetchAssets();
  }, []);



  const addToTimeline = (item: any) => {
    if (item.type !== 'video' && item.type !== 'audio') return;

    // Use the current duration setting or the item's duration if it's audio
    const duration = item.type === 'audio' ? (item.duration || 8) : parseInt(durationSeconds);

    const newEntry: TimelineItem = {
      id: Date.now().toString(),
      url: item.url,
      start: 0,
      end: duration,
      duration: duration,
      type: item.type as 'video' | 'audio'
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
      const res = videoResolution === '1080p' ? '1920x1080' : '1280x720';
      const [width, height] = res.split('x');

      for (let i = 0; i < timeline.length; i++) {
        const item = timeline[i];
        const inputName = item.type === 'video' ? `input${i}.mp4` : `input${i}.wav`;
        const outputName = `output${i}.mp4`;
        
        const fileData = await fetchFile(item.url);
        await ffmpeg.writeFile(inputName, fileData);

        if (item.type === 'video') {
          // Trim and normalize video
          await ffmpeg.exec([
            '-ss', item.start.toString(),
            '-to', item.end.toString(),
            '-i', inputName,
            '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
            '-r', '30',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-c:a', 'aac',
            '-ar', '44100',
            '-ac', '2',
            outputName
          ]);
        } else {
          // Convert audio to video with black background
          const duration = item.end - item.start;
          await ffmpeg.exec([
            '-ss', item.start.toString(),
            '-to', item.end.toString(),
            '-f', 'lavfi',
            '-i', `color=c=black:s=${res}:r=30`,
            '-i', inputName,
            '-t', duration.toString(),
            '-vf', 'format=yuv420p',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-c:a', 'aac',
            '-ar', '44100',
            '-ac', '2',
            '-shortest',
            outputName
          ]);
        }
        inputFiles.push(outputName);
      }

      // Merge command with crossfades
      if (inputFiles.length === 1) {
        await ffmpeg.exec(['-i', inputFiles[0], '-c', 'copy', 'final.mp4']);
      } else {
        // For multiple files, we'll use xfade. 
        // This is complex for many files, so we'll use a simpler approach: 
        // Sequential crossfades or just a clean concat if it's too many.
        // Let's try a sequential approach for up to 10 clips, otherwise fallback to concat.
        
        if (inputFiles.length <= 10) {
          let filterComplex = '';
          let lastOutput = '[0:v]';
          let lastAudio = '[0:a]';
          const transitionDuration = 0.5; // 0.5s crossfade
          let accumulatedOffset = 0;

          // We need to know durations of each processed clip
          const durations = timeline.map(item => item.end - item.start);

          for (let i = 0; i < inputFiles.length - 1; i++) {
            const nextInput = `[${i + 1}:v]`;
            const nextAudio = `[${i + 1}:a]`;
            const outputName = `vfade${i}`;
            const audioOutputName = `afade${i}`;
            
            accumulatedOffset += durations[i] - transitionDuration;
            
            filterComplex += `${lastOutput}${nextInput}xfade=transition=fade:duration=${transitionDuration}:offset=${accumulatedOffset}[${outputName}];`;
            filterComplex += `${lastAudio}${nextAudio}acrossfade=d=${transitionDuration}[${audioOutputName}];`;
            
            lastOutput = `[${outputName}]`;
            lastAudio = `[${audioOutputName}]`;
          }

          const inputs = inputFiles.flatMap((f, i) => ['-i', f]);
          await ffmpeg.exec([
            ...inputs,
            '-filter_complex', filterComplex.slice(0, -1),
            '-map', lastOutput,
            '-map', lastAudio,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-c:a', 'aac',
            'final.mp4'
          ]);
        } else {
          // Fallback to simple concat for many files to avoid complex filter limits
          const listContent = inputFiles.map((f: string) => `file ${f}`).join('\n');
          await ffmpeg.writeFile('list.txt', listContent);
          await ffmpeg.exec([
            '-f', 'concat',
            '-safe', '0',
            '-i', 'list.txt',
            '-c', 'copy',
            'final.mp4'
          ]);
        }
      }

      const data = await ffmpeg.readFile('final.mp4');
      const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: 'video/mp4' }));

      setGeneratedVideo(url);
      addToGallery({ id: Date.now().toString(), type: 'video', url });
      setRenderMode('video');
      showToast("Video rendered successfully!", "success");
    } catch (e) {
      handleApiError(e, "Video processing");
    }
    setIsProcessingTimeline(false);
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isExtractingPrompts, setIsExtractingPrompts] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isAnalyzingScenes, setIsAnalyzingScenes] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageProgressMsg, setImageProgressMsg] = useState('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgressMsg, setVideoProgressMsg] = useState('');
  const [videoError, setVideoError] = useState('');
  const [videoTimedOut, setVideoTimedOut] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleApiError = (e: any, context: string) => {
    // Properly serialize error for visibility — handles Error instances, fetch Response objects, and plain objects
    const errorDetails = {
      message: e?.message || (typeof e === 'string' ? e : ''),
      name: e?.name,
      status: e?.status || e?.code,
      stack: e?.stack,
      response: e?.response,
      cause: e?.cause,
      raw: e,
    };
    console.error(`[${context}] failed →`, errorDetails);
    console.error(`[${context}] error stringified →`, JSON.stringify(e, Object.getOwnPropertyNames(e || {})));

    const errorMsg = e instanceof Error ? e.message
      : typeof e === 'string' ? e
      : e?.message || e?.error?.message || JSON.stringify(e) || 'Unknown error';

    if (errorMsg.includes('Quota exceeded') || errorMsg.includes('429')) {
      showToast("API Quota Exceeded. Please try again later or provide your own API key in Settings.", 'error');
    } else if (errorMsg.includes('No API Key')) {
      showToast(`${context} requires API key. Add it in Settings or it will route through server.`, 'error');
    } else {
      showToast(`${context} failed: ${errorMsg.substring(0, 120)}`, 'error');
    }
  };

  const [hasPaidKey, setHasPaidKey] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      if (getApiKey()) {
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

  const analyzeProductForMontage = async (file: File) => {
    setIsGeneratingMontageOptions(true);
    const analysisPromptText = `Identify this product and suggest 3 specific, high-performance montage video clip ideas for a UGC ad. 
            The product could be cosmetics (lipstick, mascara), hair care (gel, spray), skin care, or any consumer good.
            IMPORTANT: The prompts MUST be in a realistic UGC (User Generated Content) style. 
            They should look like they were shot by a customer on their own phone (e.g., iPhone), in an authentic home environment. 
            Avoid "cinematic" or "commercial" tropes. Focus on natural lighting, relatable settings, and authentic product usage.
            For each idea, provide:
            1. A short title (e.g., "Applying", "Opening", "Texture").
            2. A detailed video generation prompt for Veo (e.g., "A close-up of a person's hand as they squeeze a small amount of the cream, natural bathroom lighting, shot on iPhone, realistic UGC style, 4k").
            3. A relevant Lucide icon name (e.g., "Sparkles", "Zap", "Fingerprint", "Droplets", "Wind", "Scissors").
            Return the result as a JSON array of objects with keys: id, title, prompt, icon.`;
    // Try primary model first, fallback to nano-banana-2 (gemini-3.1-flash) on failure
    const modelsToTry = ['gemini-2.5-flash', 'nano-banana-2'];
    try {
      const imagePart = await fileToGenerativePart(file);
      let data: any = null;
      for (const model of modelsToTry) {
        try {
          const response = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parts: [imagePart, { text: analysisPromptText }],
              model,
              userId: currentUserId,
              generationConfig: { responseMimeType: 'application/json' }
            })
          });
          if (!response.ok) {
            const errBody = await response.text().catch(() => response.statusText);
            console.warn(`[analyzeProductForMontage] model ${model} failed ${response.status}: ${errBody} — trying next`);
            continue;
          }
          data = await response.json();
          if (data.text) break; // success
          console.warn(`[analyzeProductForMontage] model ${model} returned empty — trying next`);
        } catch (innerErr: any) {
          console.warn(`[analyzeProductForMontage] model ${model} threw: ${innerErr.message} — trying next`);
        }
      }
      if (!data?.text) throw new Error('All models failed to return analysis');
      const rawOptions = JSON.parse(data.text || '[]');
      const options = rawOptions.map((o: any, i: number) => ({ ...o, id: `montage-${i}-${Date.now()}` }));
      setMontageOptions(options);

    } catch (e: any) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      console.error('[analyzeProductForMontage]', msg);
      showToast(`Product analysis failed: ${msg.slice(0, 120)}`, 'error');
    }
    setIsGeneratingMontageOptions(false);
  };

  /**
   * Step 1 of the montage pipeline: generate a reference image using
   * character + product images (mirrors the generateImage() logic) then
   * store it in montageGeneratedImg so the user can preview it before
   * moving on to Veo animation.
   */
  const generateMontageReferenceImage = async (option: any): Promise<string> => {
    const isPodcastMode = activeTab === 'podcast';
    const primaryPersonImg = isPodcastMode ? podcastHost1Img : characterImg;
    const secondaryPersonImg = isPodcastMode ? podcastHost2Img : null;
    const activeProductImg = isPodcastMode ? podcastProductImg : productImg;
    if (!primaryPersonImg && !secondaryPersonImg && !activeProductImg) return '';
    const imgCost = getImageCost();
    if (!isAdmin && !isGlobalAdmin) {
      const spendRes = await spend('veo_fast', imgCost as any);
      if (!spendRes || !spendRes.success) {
        showToast(`Insufficient Credits: You need ${imgCost} Shorts to generate this image.`, 'error');
        return '';
      }
    }
    setIsGeneratingMontageImg(true);
    setMontageImgProgressMsg('Calibrating Studio Camera...');
    let generatedUrl = '';
    console.log(`[generateMontageReferenceImage] Starting — mode: ${isPodcastMode ? 'podcast' : 'ugc'}, engine: ${imgEngine}, hasPrimary: ${!!primaryPersonImg}, hasSecondary: ${!!secondaryPersonImg}, hasProduct: ${!!activeProductImg}`);
    try {
      let contents: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];

      // Build style prompt (UGC ultra-realistic for montage)
      const stylePrompt = 'Ultra-realistic UGC photo, natural look, shot on a phone, authentic lighting, no heavy bokeh, real human appearance, 8K quality';

      // Add person/host references if present
      if (primaryPersonImg) {
        setMontageImgProgressMsg(isPodcastMode ? 'Loading Host 1 Reference...' : 'Loading Character Reference...');
        contents.push(await fileToGenerativePart(primaryPersonImg.file));
      }

      if (secondaryPersonImg) {
        setMontageImgProgressMsg('Loading Host 2 Reference...');
        contents.push(await fileToGenerativePart(secondaryPersonImg.file));
      }

      // Add product reference if present
      if (activeProductImg) {
        setMontageImgProgressMsg('Analysing Product DNA...');
        contents.push(await fileToGenerativePart(activeProductImg.file));
      }

      setMontageImgProgressMsg('Synthesising Reference Frame...');

      // Build instruction based on what references we have
      let promptInstructions = '';
      const sceneDesc = `${option.title} — ${option.prompt.substring(0, 120)}`;

      if (isPodcastMode) {
        const providedRefs = [
          primaryPersonImg ? 'HOST 1' : null,
          secondaryPersonImg ? 'HOST 2' : null,
          activeProductImg ? 'PRODUCT' : null
        ].filter(Boolean).join(', ') || 'none';
        promptInstructions = `Images provided in order: ${providedRefs}.
        TASK: Generate ONE single, coherent podcast-studio frame for this scene: ${sceneDesc}.
        Show a natural two-host podcast setup with microphones, a desk or studio table, warm realistic studio lighting, and relaxed natural host body language.
        ${primaryPersonImg ? 'Match Host 1 face, skin tone, and features exactly from the Host 1 reference.' : ''}
        ${secondaryPersonImg ? 'Match Host 2 face, skin tone, and features exactly from the Host 2 reference.' : ''}
        ${activeProductImg ? 'Place the product naturally on the desk or in the set, matching the product reference exactly.' : ''}
        SKIN REALISM (critical): Ultra-realistic human skin — visible pores, natural skin texture, subtle imperfections like fine lines or uneven tone, slight oiliness or dryness where natural, micro-hair detail on face. NO airbrushing, NO plastic skin, NO over-smoothed complexion, NO beauty filter. Skin must look like a real unedited photo of a living person.
        Style: candid editorial podcast frame, natural window or studio light, no collage, no split-screen, no extra text or logos, raw photo quality, shot on Sony A7 IV, 85mm f/2.0.`;
      } else if (primaryPersonImg && activeProductImg) {
        promptInstructions = `The FIRST image is the PERSON (creator) reference. The SECOND image is the PRODUCT reference.
        TASK: Generate ONE single, coherent UGC-style photo where this EXACT person is using/wearing/holding this EXACT product in the following scene: ${sceneDesc}.
        Style: ${stylePrompt}.
        CRITICAL: Do NOT create a collage, side-by-side, or split screen. One unified photo only. Match the person's skin, features, and the product appearance precisely.`;
      } else if (primaryPersonImg) {
        promptInstructions = `The image is the PERSON (creator) reference.
        TASK: Generate ONE UGC-style photo of this person in the following scene: ${sceneDesc}.
        Style: ${stylePrompt}.`;
      } else if (activeProductImg) {
        promptInstructions = `The image is the PRODUCT reference.
        TASK: Generate ONE UGC-style photo of a creator using/showcasing this product in the following scene: ${sceneDesc}.
        The product in the final image must look exactly like the reference. Style: ${stylePrompt}.`;
      } else {
        promptInstructions = `TASK: Generate ONE UGC-style photo for this scene: ${sceneDesc}. Style: ${stylePrompt}.`;
      }

      // Append everyday-phone-photo quality block when ultra-realistic is selected
      if (imageStyle === 'ultra-realistic') {
        promptInstructions += `\n\nphoto quality and vibe: non-studio lighting, no oversharpening, real light from the location, iphone photo vibe, imperfect photo quality/raw quality (for realism), random realistic photo taken during a random moment of the day, make sure the lighting is natural and matches the background, 2k. It's better to make it slightly blurry, like a phone photo.`;
      }

      contents.push({ text: promptInstructions });

      const useGPT2 = imgEngine === 'gpt2';
      console.log(`[generateMontageReferenceImage] useGPT2: ${useGPT2}`);

      if (useGPT2) {
        // Step 1: rewrite prompt using GPT-image-2 prompt engineering system instruction
        setMontageImgProgressMsg('Structuring Prompt…');
        const GPT2_PROMPT_SYSTEM = `you are a prompt writer/structuring assistant for gpt image 2.

# your task:
the user gives you a raw image idea. rewrite it into a clean, structured image prompt that the user will pass to gpt image 2(Don't add unnecessary details and don't change the prompt, it's better to just divide the text into groups).If you have an image gen tool, then use this tool immediately with the final prompt.

# main rules:
- do not use any external instructions for photo generation except those from the user and this skill
- DON'T CHANGE THE PROMPT, JUST STRUCTURE IT
- YOU CAN ONLY ADD RECOMMENDATIONS
- structure the prompt using fields
- if a recommendation contradicts the user's request, do not add it.
- always include the most suitable aspect ratio from 3:1 to 1:3.
- always start the final prompt exactly with:
"Generate an image with the following prompt, dont change it(DO NOT CHANGE THIS PROMPT, IT'S ALREADY AN IMPROVED PROMPT) - "

# output format:
write only the final structured prompt. no explanations, no commentary, no extra notes.

# recommendations:
only include fields that make sense for the user's idea

for regular photo / real-life / everyday photography:
if the idea is a realistic everyday-life photo, add:
photo quality and vibe: non-studio lighting,no oversharpening, real light from the location, iphone photo vibe, imperfect photo quality/raw quality (for realism), random realistic photo taken during a random moment of the day, make sure the lighting is natural and matches the background, 2k. It's better to make it slightly blurry, like a phone photo.

for cinematic / high-quality photography:
if the idea asks for premium quality, cinematic look, movie still, luxury, aesthetic visual, or best photo quality, add:
photo quality and vibe: focused cinematic shot, natural light, highly aesthetic scene, movie-still composition, raw quality, warm rim light, subtle film grain, clean composition, cool ambient shadows, colors with a slight gray tone, make sure the lighting is natural and matches the background, no oversaturation, no oversharpening,a lively vibe, as if the frame was taken while the characters were doing something, strong vignette, raw quality

for ads generation:
if the idea is an ad, product promo, commercial banner, marketing creative, or social media advertisement, add:
no extra text, no watermarks, no unrelated logos. use clean composition, strong color direction.

# OPTIONAL
If it doesn't conflict with the user's request, try to make the characters prettier, for example, "beautiful vibe girl"
If the prompt says something about selfies, then if it doesn't contradict the user, then "characters should do something vibe".

# negative instructions:
if useful, add a final line:
Avoid : [things to avoid] (Be sure to add - avoid excessive yellow in the photo, too sharp or overly sharpened and too many highlights/glare on the characters faces)`;

        let finalPrompt = promptInstructions;
        try {
          const structRes = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parts: [{ text: `${GPT2_PROMPT_SYSTEM}\n\nUser prompt:\n${promptInstructions}` }],
              model: 'gemini-2.5-flash',
            }),
          });
          if (structRes.ok) {
            const structData = await structRes.json();
            if (structData.text) finalPrompt = structData.text;
          }
        } catch (_) { /* fallback to original prompt */ }

        // Step 2: load reference images as base64 for edit mode
        setMontageImgProgressMsg('Loading Reference Images…');
        const readFileAsBase64 = (file: File): Promise<string> =>
          new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = ev => resolve(ev.target?.result as string);
            reader.readAsDataURL(file);
          });

        // primary person/host = primary image ref, product or second host = secondImage ref
        let primaryImage: string | undefined;
        let secondaryImage: string | undefined;

        if (primaryPersonImg?.file) {
          primaryImage = await readFileAsBase64(primaryPersonImg.file);
        }
        if (isPodcastMode && secondaryPersonImg?.file) {
          secondaryImage = await readFileAsBase64(secondaryPersonImg.file);
        } else if (activeProductImg?.file) {
          secondaryImage = await readFileAsBase64(activeProductImg.file);
        }
        // If only product, promote it to primary
        if (!primaryImage && secondaryImage) {
          primaryImage = secondaryImage;
          secondaryImage = undefined;
        }

        console.log(`[GPT2] Sending refs — primary: ${!!primaryImage}, secondary: ${!!secondaryImage}`);
        setMontageImgProgressMsg('GPT Image 2 Generating…');
        const gptRes = await fetch(getApiUrl('/api/generate-image'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-image-2',
            prompt: finalPrompt,
            quality: gpt2Quality,
            size: aspectRatio === '16:9' ? '1536x1024' : aspectRatio === '1:1' ? '1024x1024' : '1024x1536',
            aspect_ratio: aspectRatio,
            userId: currentUserId,
            ...(primaryImage && { image: primaryImage }),
            ...(secondaryImage && { secondImage: secondaryImage }),
          }),
        });
        if (!gptRes.ok) throw new Error(`GPT Image 2 failed: ${gptRes.status}`);
        const gptData = await gptRes.json();
        const url = gptData.url || gptData.imageUrl;
        if (url) { generatedUrl = url; setMontageGeneratedImg(url); addToGallery({ id: Date.now().toString(), type: 'image', url }); }
      } else {
        // NB2 path: route through server (no client API key needed)
        setMontageImgProgressMsg('AI Generating Reference Image...');
        console.log('[generateMontageReferenceImage] Routing NB2 via server /api/generate-image...');

        const readFileAsBase64 = (file: File): Promise<string> =>
          new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = ev => resolve(ev.target?.result as string);
            reader.readAsDataURL(file);
          });

        const refImages: string[] = [];
        if (primaryPersonImg?.file) refImages.push(await readFileAsBase64(primaryPersonImg.file));
        if (secondaryPersonImg?.file) refImages.push(await readFileAsBase64(secondaryPersonImg.file));
        if (activeProductImg?.file) refImages.push(await readFileAsBase64(activeProductImg.file));

        const nb2Res = await fetch(getApiUrl('/api/generate-image'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'nano-banana-2',
            prompt: contents.find(c => c.text)?.text || promptInstructions,
            aspect_ratio: aspectRatio,
            userId: currentUserId,
            referenceImages: refImages,
          }),
        });

        if (!nb2Res.ok) {
          const errData = await nb2Res.json().catch(() => ({}));
          throw new Error(`NB2 server error: ${errData.message || nb2Res.status}`);
        }

        const nb2Data = await nb2Res.json();
        console.log('[generateMontageReferenceImage] Server response:', nb2Data);

        // Server returns jobId (queued) or imageUrl (direct)
        if (nb2Data.jobId) {
          setMontageImgProgressMsg('Queued — polling for result...');
          const pollUrl = getApiUrl(`/api/job-status/${nb2Data.jobId}`);
          let attempts = 0;
          while (attempts < 30) {
            await new Promise(r => setTimeout(r, 3000));
            attempts++;
            const pollRes = await fetch(pollUrl);
            const pollData = await pollRes.json();
            console.log(`[NB2 poll ${attempts}]`, pollData.status, pollData.imageUrl || '');
            if (pollData.status === 'done' && pollData.imageUrl) {
              generatedUrl = pollData.imageUrl;
              setMontageGeneratedImg(pollData.imageUrl);
              addToGallery({ id: Date.now().toString(), type: 'image', url: pollData.imageUrl });
              break;
            }
            if (pollData.status === 'failed') throw new Error(pollData.error || 'Image generation failed');
            setMontageImgProgressMsg(`Generating… (${attempts * 3}s)`);
          }
          if (!generatedUrl) throw new Error('NB2 image generation timed out — try again');
        } else if (nb2Data.imageUrl || nb2Data.url) {
          const url = nb2Data.imageUrl || nb2Data.url;
          generatedUrl = url;
          setMontageGeneratedImg(url);
          addToGallery({ id: Date.now().toString(), type: 'image', url });
        } else {
          throw new Error('No image returned from server');
        }
      }
    } catch (e: any) {
      // Smart error context: when called from "quick image" button vs montage flow
      const isQuickImg = option?.id === 'quick-img';
      const contextLabel = isQuickImg ? 'Image generation' : 'Montage reference image generation';

      // Special hint for safety-blocked errors (Content blocked: OTHER usually = face refs)
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('content blocked') || msg.includes('image_other') || msg.includes('safety')) {
        showToast(
          `AI declined this image. Tip: try switching engine to GPT-2, or remove/replace the character photo. (${e?.message?.slice(0, 80) || ''})`,
          'error'
        );
        console.error(`[${contextLabel}] safety blocked →`, e);
      } else {
        if (!isAdmin && !isGlobalAdmin) refund('veo_fast', imgCost as any);
        handleApiError(e, contextLabel);
      }
    }
    setIsGeneratingMontageImg(false);
    setMontageImgProgressMsg('');
    return generatedUrl;
  };

  /**
   * Step 2 of the montage pipeline: animate the reference image to video
   * using Veo with the generated (or fallback product) image as the first frame.
   */
  const generateMontageVideo = async (option: any) => {
    if (!productImg && !characterImg && !montageGeneratedImg) return;

    const unitCost = getCurrentCost(true);
    if (!isAdmin && !isGlobalAdmin) {
      const spendRes = await spend('veo_fast', unitCost as any);
      if (!spendRes || !spendRes.success) {
        showToast(`Insufficient Credits: You need ${unitCost} Shorts to generate video.`, 'error');
        return;
      }
    }

    setIsGeneratingVideo(true);
    setVideoProgressMsg(`Animating ${option.title} Montage...`);
    try {
      const ai = getAI();

      // Prefer the already-generated reference image; fall back to product image.
      let imageBase64 = '';
      let imageMime = 'image/jpeg';

      if (montageGeneratedImg) {
        // decode the data URL
        setVideoProgressMsg('Loading Generated Reference...');
        imageMime = montageGeneratedImg.split(';')[0].split(':')[1];
        imageBase64 = montageGeneratedImg.split(',')[1];
        // resize for Veo
        const imgBlob = await (await fetch(montageGeneratedImg)).blob();
        imageBase64 = await resizeImage(imgBlob);
      } else if (productImg) {
        setVideoProgressMsg('Loading Product Reference...');
        imageBase64 = await resizeImage(productImg.file);
      }

      setVideoProgressMsg(`Submitting to Veo-3...`);
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: option.prompt.substring(0, 1000),
        image: {
          imageBytes: imageBase64,
          mimeType: imageMime,
        },
        config: {
          numberOfVideos: 1,
          durationSeconds: parseInt(montageDuration),
          includeAudio: montageAudioEnabled,
          resolution: '720p',
          aspectRatio: aspectRatio === '1:1' ? '9:16' : aspectRatio,
        } as any
      });

      const pollMsgs = [
        'Generating Video Frames...',
        'Animating Character Motion...',
        'Refining Realistic Details...',
        'Processing Visual Output...',
        'Finalizing Render...'
      ];
      let pollCount = 0;
      const MONTAGE_TIMEOUT_MS = 90_000; // 90s for montage (always veo-fast)
      const montagePollStart = Date.now();
      while (!operation.done) {
        const elapsed = Math.floor((Date.now() - montagePollStart) / 1000);
        if (Date.now() - montagePollStart > MONTAGE_TIMEOUT_MS) {
          setIsGeneratingVideo(false);
          setVideoProgressMsg('');
          showToast(`Montage timed out after ${elapsed}s — tap Retry to try again.`, 'error');
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
        const msg = pollMsgs[Math.min(pollCount, pollMsgs.length - 1)];
        setVideoProgressMsg(`${msg} (${elapsed}s)`);
        pollCount++;
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const generateVideoResponse = (operation.response as any)?.generateVideoResponse;
      const raiFiltered = generateVideoResponse?.raiMediaFilteredCount || 0;

      if (raiFiltered > 0) {
        const reason = generateVideoResponse?.raiMediaFilteredReasons?.[0] || 'Prompt conflicted with safety policies.';
        showToast(`Montage blocked by safety filter — try rephrasing the prompt. (You were not charged)`, 'error');
        console.warn('Veo RAI filter:', reason);
        setIsGeneratingVideo(false);
        setVideoProgressMsg('');
        return;
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const apiKey = getApiKey();
        setVideoProgressMsg('Downloading Render...');
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: { 'x-goog-api-key': apiKey },
        });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const newItem: TimelineItem = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'video',
          url: url,
          start: 0,
          end: parseInt(montageDuration),
          duration: parseInt(montageDuration),
          originalFile: new File([blob], `${option.id}_montage.mp4`, { type: 'video/mp4' })
        };
        setTimeline(prev => [...prev, newItem]);
        addToGallery({ id: Date.now().toString(), type: 'video', url });
        showToast(`${option.title} montage added to timeline!`, 'success');
        setShowMontageOptions(false);
        setMontageGeneratedImg(''); // reset for next montage
      } else {
        showToast('Veo returned no video. The prompt may have been filtered. Try rephrasing.', 'error');
      }
    } catch (e) {
      refund('veo_fast', unitCost as any);
      handleApiError(e, 'Montage video generation');
    }
    setIsGeneratingVideo(false);
    setVideoProgressMsg('');
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'character' | 'product' | 'location' | 'generated' | 'podcastHost1' | 'podcastHost2' | 'podcastProduct') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'character') setCharacterImg({ url, file });
    else if (type === 'location') setLocationImg({ url, file });
    else if (type === 'podcastHost1') setPodcastHost1Img({ url, file });
    else if (type === 'podcastHost2') setPodcastHost2Img({ url, file });
    else if (type === 'podcastProduct') setPodcastProductImg({ url, file });
    else if (type === 'product') {
      setProductImg({ url, file });
      setMontageOptions([]);
      analyzeProductForMontage(file);
    } else {
      setGeneratedImg(url);
      setScenes((prev: Scene[]) => prev.map((s: Scene, i: number) => i === activeSceneIndex ? { ...s, image: url } : s));
      addToGallery({ id: Date.now().toString(), type: 'image', url });
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      if (video.duration > 30) {
        handleApiError(new Error("Reference video must be 30 seconds or less for analysis."), "Video Upload");
        return;
      }
      const url = URL.createObjectURL(file);
      setSourceVideo({ url, file });
    };
    video.src = URL.createObjectURL(file);
  };

  const analyzeVideo = async () => {
    if (!sourceVideo) return;
    setIsAnalyzingVideo(true);
    setAnalysisProgress('Reading Video File...');
    try {
      const base64Video = await fileToBase64(sourceVideo.file);
      
      setAnalysisProgress('AI Analysis in Progress (Character & Dialogue)...');
      const response = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parts: [
            { 
              inlineData: { 
                mimeType: sourceVideo.file.type || 'video/mp4', 
                data: base64Video 
              } 
            },
            { text: 'Analyze this video reference. Focus EXCLUSIVELY on the main character/person. Ignore the background, environment, and lighting. \n\nTASK:\n1. Extract the EXACT sequence of physical actions and movements (e.g., "points at camera", "smiles", "gestures with left hand").\n2. Transcribe the EXACT dialogue/script being spoken (limit to the first 30 seconds).\n3. Summarize the character\'s tone and personality.\n\nProvide the result in JSON format with "characterActions", "script", and "toneSummary".' }
          ],
          model: 'gemini-2.5-flash',
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                characterActions: { type: "STRING" },
                script: { type: "STRING" },
                toneSummary: { type: "STRING" }
              },
              required: ["characterActions", "script", "toneSummary"]
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Video analysis failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const result = safeJsonParse(data.text);
      
      // Map the results to the existing state
      if (result.toneSummary) setUserPrompt(result.toneSummary);
      if (result.script) setScript(result.script);
      if (result.characterActions) setVideoPrompt(result.characterActions);

    } catch (e) {
      handleApiError(e, "Video analysis");
    }
    setIsAnalyzingVideo(false);
    setAnalysisProgress('');
  };

  const analyzeProduct = async () => {
    if (!productImg) return;
    setIsAnalyzing(true);
    try {
      const imagePart = await fileToGenerativePart(productImg.file);
      const response = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parts: [imagePart, { text: `You are an expert product analyst and UGC marketing strategist. Deeply analyze this product image and extract every detail you can observe or reasonably infer.

Return a detailed JSON with:
- "productName": The exact product name or best guess (e.g., "South Indian Thali", "Matte Lipstick - Rose Red")
- "description": A rich, detailed 4-6 sentence description covering what the product is, its visual presentation, key ingredients/materials, sensory qualities (taste, texture, scent, feel), and overall appeal. Be specific and evocative.
- "keyBenefits": Array of 4-6 specific benefits or selling points (e.g., "Rich in 12 traditional spices", "100% natural ingredients", "Ready in under 5 minutes")
- "targetAudience": Who this product is ideal for (e.g., "Food lovers seeking authentic regional cuisine", "Health-conscious young adults")
- "useCases": Array of 3-4 occasions or use cases (e.g., "Weekend family meals", "Restaurant-style home dining")
- "tags": Array of 6-10 descriptive keywords for search and categorization` }],
          model: 'gemini-2.5-flash',
          userId: currentUserId,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                productName: { type: "STRING" },
                description: { type: "STRING" },
                keyBenefits: { type: "ARRAY", items: { type: "STRING" } },
                targetAudience: { type: "STRING" },
                useCases: { type: "ARRAY", items: { type: "STRING" } },
                tags: { type: "ARRAY", items: { type: "STRING" } }
              },
              required: ["productName", "description", "keyBenefits", "targetAudience", "useCases", "tags"]
            }
          }
        })
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => response.statusText);
        throw new Error(`Analysis failed ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      if (!data.text) throw new Error(`Empty response from server: ${JSON.stringify(data)}`);
      const result = safeJsonParse(data.text);

      if (result.tags) setProductTags([...new Set(result.tags as string[])]);
      setProductAnalysis(result);

      // Build a rich, comprehensive product context string for the script generator
      if (result.description) {
        const parts: string[] = [];
        if (result.productName) parts.push(`PRODUCT: ${result.productName}`);
        parts.push(`DESCRIPTION: ${result.description}`);
        if (result.keyBenefits?.length) parts.push(`KEY BENEFITS: ${result.keyBenefits.join(' | ')}`);
        if (result.targetAudience) parts.push(`TARGET AUDIENCE: ${result.targetAudience}`);
        if (result.useCases?.length) parts.push(`USE CASES: ${result.useCases.join(', ')}`);
        setProductDetails(parts.join('\n'));
      }
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      console.error('[analyzeProduct]', msg);
      showToast(`Product scan failed: ${msg.slice(0, 120)}`, 'error');
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

  const extractVisualPrompts = async () => {
    if (!script) return;
    setIsExtractingPrompts(true);
    try {
      const prompt = `You are an expert AI video prompt engineer for Veo 3.1. 
      I have a UGC script. I need you to break it down into scenes (approx 8 seconds each) and for each scene, provide:
      1. The dialogue (text being said).
      2. A "visualCue" (brief description of the action).
      3. A detailed "visualPrompt" (60-80 words) for Veo 3.1 that includes camera angles, lighting, facial expressions, and lipsync requirements.

      SCRIPT:
      ${script}

      PRODUCT: ${productDetails || 'Not specified'}
      
      ${characterImg ? 'CHARACTER REFERENCE: Use the person provided in the context.' : ''}

      Return ONLY a valid JSON object with a "scenes" array:
      {
        "scenes": [
          {
            "id": "1",
            "timestamp": "0:00 - 0:08",
            "label": "HOOK",
            "dialogue": "...",
            "visualCue": "...",
            "visualPrompt": "..."
          }
        ]
      }`;

      const response = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parts: [{ text: prompt }],
          model: 'gemini-2.5-flash',
          userId: currentUserId,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                scenes: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      id: { type: "STRING" },
                      timestamp: { type: "STRING" },
                      label: { type: "STRING" },
                      dialogue: { type: "STRING" },
                      visualCue: { type: "STRING" },
                      visualPrompt: { type: "STRING" }
                    },
                    required: ["id", "timestamp", "label", "dialogue", "visualCue", "visualPrompt"]
                  }
                }
              },
              required: ["scenes"]
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Extraction failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const result = safeJsonParse(data.text);
      if (result.scenes && Array.isArray(result.scenes)) {
        const structuredScenes: Scene[] = result.scenes.map((s: any) => ({
          id: s.id || Math.random().toString(36).substring(7),
          text: s.dialogue || '',
          prompt: s.visualPrompt || '',
          isApproved: false,
          visualCue: s.visualCue || '',
          timestamp: s.timestamp || '',
          label: s.label || ''
        }));
        setScenes(structuredScenes);
        if (structuredScenes.length > 0) setActiveSceneIndex(0);
      }
    } catch (e) {
      console.error("Extraction failed", e);
    }
    setIsExtractingPrompts(false);
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

  const handleVoiceSampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    if (isVideo) {
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      const objectUrl = URL.createObjectURL(file);
      videoEl.src = objectUrl;
      videoEl.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        if (videoEl.duration > 30) {
          showToast('Video must be 30 seconds or less for voice analysis.', 'error');
          e.target.value = '';
          return;
        }
        setVoiceSampleFile(file);
        setVoiceSampleName(file.name);
        setVoiceStyle('');
        setVoiceTranscript('');
      };
      videoEl.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setVoiceSampleFile(file);
        setVoiceSampleName(file.name);
        setVoiceStyle('');
        setVoiceTranscript('');
      };
      return;
    }

    setVoiceSampleFile(file);
    setVoiceSampleName(file.name);
    setVoiceStyle('');
    setVoiceTranscript('');
  };

  const analyzeVoiceSample = async () => {
    if (!voiceSampleFile) return;
    setIsAnalyzingVoice(true);
    setVoiceStyle('');
    setVoiceTranscript('');
    try {
      const formData = new FormData();
      formData.append('audio', voiceSampleFile);
      const apiUrl = `http://localhost:3002/api/ugc/analyze-voice`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Voice analysis failed');
      if (data.style) setVoiceStyle(data.style);
      if (data.transcript) setVoiceTranscript(data.transcript);
    } catch (e) {
      handleApiError(e, 'Voice analysis');
    }
    setIsAnalyzingVoice(false);
  };

  const generateScript = async () => {
    setIsGeneratingScript(true);
    setScript('');
    setVideoPrompt('');
    try {
      if (activeTab === 'podcast') {
        const durationInt = parseInt(scriptDuration);
        const segmentCount = Math.max(1, Math.ceil(durationInt / 8));
        const podcastPrompt = `You are an expert podcast producer writing a short two-host branded podcast segment.

Create a natural ${language} conversation between HOST 1 and HOST 2.

CONTEXT:
- Host 1 reference image: ${podcastHost1Img ? 'provided' : 'not provided'}
- Host 2 reference image: ${podcastHost2Img ? 'provided' : 'not provided'}
- Product reference image: ${podcastProductImg ? 'provided' : 'not provided'}
- User direction/topic: ${userPrompt || 'Create a useful, engaging short podcast-style product discussion.'}
- Product knowledge: ${productDetails || 'No product scan yet. Infer a general product discussion without making specific factual claims.'}
- Duration: ${scriptDuration}. Create exactly ${segmentCount} segment(s), each about 8 seconds.${voiceStyle ? `\n- Voice/speaking style to mimic: ${voiceStyle}` : ''}

STYLE RULES:
- Natural host banter, not an ad read.
- Alternate HOST 1 and HOST 2.
- Include small reactions, agreement, and handoff lines.
- Keep each segment concise and speakable.
- If a product is referenced, discuss it conversationally and avoid unsupported claims.
- Each scene's visualCue must specify a DIFFERENT camera angle cut: Scene 1 = wide two-shot, Scene 2 = medium shot on HOST 1, Scene 3 = medium shot on HOST 2, Scene 4+ = over-shoulder or close-up reaction. Always mention: microphones, studio lighting, product on desk if provided. No title cards.

Return ONLY valid JSON:
{
  "script": "[0:00 - 0:08] HOST 1: ...\\nHOST 2: ...",
  "scenes": [
    {
      "id": "1",
      "timestamp": "0:00 - 0:08",
      "label": "PODCAST",
      "dialogue": "HOST 1: ...\\nHOST 2: ...",
      "visualCue": "Two-host podcast setup. Cut at timestamp. Host 1 and Host 2 seated at microphones, natural studio lighting, camera angle changes per cut (wide shot / over-shoulder / close-up alternating). Product visible on desk if provided. No title cards or lower thirds."
    }
  ]
}`;

        const response = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parts: [{ text: podcastPrompt }],
            model: 'gemini-2.5-flash',
            userId: currentUserId,
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  script: { type: "STRING" },
                  scenes: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        id: { type: "STRING" },
                        timestamp: { type: "STRING" },
                        label: { type: "STRING" },
                        dialogue: { type: "STRING" },
                        visualCue: { type: "STRING" }
                      },
                      required: ["id", "timestamp", "label", "dialogue", "visualCue"]
                    }
                  }
                },
                required: ["script", "scenes"]
              }
            }
          })
        });

        if (!response.ok) throw new Error(`Podcast script generation failed: ${response.status} ${response.statusText}`);
        const data = await response.json();
        const result = safeJsonParse(data.text);
        if (result?.script) setScript(result.script);
        if (result?.scenes && Array.isArray(result.scenes)) {
          const structuredScenes: Scene[] = result.scenes.map((s: any) => ({
            id: s.id || Math.random().toString(36).substring(7),
            text: s.dialogue || '',
            prompt: s.visualCue || '',
            isApproved: false,
            visualCue: s.visualCue || '',
            timestamp: s.timestamp || '',
            label: s.label || 'PODCAST'
          }));
          setScenes(structuredScenes);
          if (structuredScenes.length > 0) {
            setActiveSceneIndex(0);
            setVideoPrompt(structuredScenes[0].prompt);
          }
        }
        setIsGeneratingScript(false);
        return;
      }

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

      const prompt = `You are an elite UGC scriptwriter who writes exactly how real people actually talk — casual, natural, human.

CRITICAL WRITING STYLE — READ THIS FIRST:
- Write like a real person speaking to a friend, NOT like an ad or a press release
- Use contractions: "I've", "you'll", "it's", "don't", "can't", "this'll"
- Use filler energy words naturally: "okay so", "honestly", "literally", "like", "okay real talk", "no cap", "I'm not even joking"
- Short punchy sentences. Fragments are fine. Real people don't always finish sentences perfectly.
- Avoid ANY corporate/ad words: "experience", "elevate", "indulge", "journey", "discover", "innovative", "premium", "solution", "transformative"
- No rhyming unless the tone specifically calls for it
- The script should sound like something you'd actually say out loud — read it back and if it sounds robotic, rewrite it

══════════════════════════════════════════════════
STEP 1 — CREATIVE DIRECTION (HIGHEST PRIORITY)
══════════════════════════════════════════════════
${userPrompt
  ? `The creator has given you this creative direction. Follow it precisely and let it shape the entire script:\n"${userPrompt}"`
  : `No specific direction given. Use your best judgment to create a compelling, authentic UGC script.`}

══════════════════════════════════════════════════
STEP 2 — PRODUCT KNOWLEDGE
══════════════════════════════════════════════════
${productDetails || 'No product scanned yet. Write a general lifestyle UGC script.'}

══════════════════════════════════════════════════
STEP 3 — SCRIPT PARAMETERS
══════════════════════════════════════════════════
DURATION: ${scriptDuration} → EXACTLY ${sceneCount} scene(s) of 8 seconds each (${durationLogic})
LANGUAGE: ${language} — Write ALL dialogue in ${language} only.
TONE: ${SCRIPT_TONES[selectedScriptTone]?.prompt || SCRIPT_TONES.viral_marketing.prompt}
PERFORMANCE STYLE: ${VIDEO_STYLES[selectedVideoStyle]?.name} — ${VIDEO_STYLES[selectedVideoStyle]?.modifier || VIDEO_STYLES.calm.modifier}${voiceStyle ? `\nVOICE STYLE (mimic this speaker's personality exactly in how you write): ${voiceStyle}` : ''}
${strategyContext}

══════════════════════════════════════════════════
STEP 4 — VIRAL SCRIPT TRAINING EXAMPLES
══════════════════════════════════════════════════
${trainingContent || 'No templates loaded. Apply viral UGC best practices.'}

══════════════════════════════════════════════════
MANDATORY RULES — FOLLOW EVERY SINGLE ONE
══════════════════════════════════════════════════
1. HOOK FIRST: Scene 1 MUST open with a natural, scroll-stopping hook in the first 2 seconds. Sound like a real person — NOT an ad. Good examples: "okay so I tried this and I'm obsessed", "why did nobody tell me about this sooner", "I genuinely can't stop thinking about this", "bro this changed everything for me". BAD examples: "Experience the ultimate...", "Discover the power of...", "Introducing the revolutionary...".
2. TONE: Every single line must feel and sound like: ${SCRIPT_TONES[selectedScriptTone]?.name || 'Viral Marketing'} — ${SCRIPT_TONES[selectedScriptTone]?.prompt || SCRIPT_TONES.viral_marketing.prompt}. The tone must be consistent across ALL scenes.
3. WORD COUNT: Strictly 20-25 spoken words per 8-second scene. Total ≈ ${sceneCount * 22} words.
4. SCENE COUNT: Output EXACTLY ${sceneCount} scene(s). No more, no less.
5. COMPLETE THOUGHTS: Each scene is self-contained — no sentence starts in one scene and ends in another.
6. LANGUAGE: Every word of dialogue must be in ${language}. No mixing languages.
7. PRODUCT INTEGRATION: Use specific details from the product knowledge above (benefits, use cases, audience) — not generic claims.
8. FORMATTING: Label each scene exactly as: [0:00 - 0:08] HOOK, [0:08 - 0:16] PAYOFF, etc.
9. VISUAL CUES: Describe a realistic UGC creator shot — natural lighting, phone camera, authentic setting. NO cinematic/commercial tropes. NO bokeh, NO 85mm lens.
10. CLOTHING RULE: If the product is clothing/apparel, the creator MUST be wearing it — never just holding it.

Return ONLY a valid JSON object:
{
  "script": "Clean dialogue-only with timestamps and scene labels",
  "scenes": [
    {
      "id": "1",
      "timestamp": "0:00 - 0:08",
      "label": "HOOK",
      "dialogue": "The exact spoken words for this scene in ${language}",
      "visualCue": "Realistic UGC shot description: creator action, expression, environment, camera angle. Performance: ${VIDEO_STYLES[selectedVideoStyle]?.modifier || ''}. The creator is saying: [insert dialogue here]."
    }
  ]
}`;

      const response = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parts: [{ text: prompt }],
          model: 'gemini-2.5-flash',
          userId: currentUserId,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                script: { type: "STRING" },
                scenes: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      id: { type: "STRING" },
                      timestamp: { type: "STRING" },
                      label: { type: "STRING" },
                      dialogue: { type: "STRING" },
                      visualCue: { type: "STRING" }
                    },
                    required: ["id", "timestamp", "label", "dialogue", "visualCue"]
                  }
                }
              },
              required: ["script", "scenes"]
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Script generation failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const result = safeJsonParse(data.text);

      if (result?.script) {
        setScript(result.script);
      }

      if (result?.scenes && Array.isArray(result.scenes)) {
        const structuredScenes: Scene[] = result.scenes.map((s: any) => ({
          id: s.id || Math.random().toString(36).substring(7),
          text: s.dialogue || '',
          prompt: s.visualCue || '',
          isApproved: false,
          visualCue: s.visualCue || '',
          timestamp: s.timestamp || '',
          label: s.label || ''
        }));
        setScenes(structuredScenes);
        if (structuredScenes.length > 0) {
          setActiveSceneIndex(0);
          setVideoPrompt(structuredScenes[0].prompt);
        }
      } else {
        // Fallback if scenes array is missing
        const automaticallySplitScenes = splitScriptIntoScenes(result?.script || '');
        setScenes(automaticallySplitScenes);
        if (automaticallySplitScenes.length > 0) setActiveSceneIndex(0);
      }
    } catch (e) {
      handleApiError(e, "Script generation");
    }
    setIsGeneratingScript(false);
  };

  const [isRegeneratingPart, setIsRegeneratingPart] = useState(false);

  const regenerateScriptPart = async (idx: number, label: string) => {
    if (!script || scenes.length <= idx) return;
    setIsRegeneratingPart(true);
    try {
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

      const response = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parts: [{ text: prompt }],
          model: 'gemini-2.5-flash',
          userId: currentUserId,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                newDialogue: { type: "STRING" },
                newVisualCue: { type: "STRING" }
              },
              required: ["newDialogue", "newVisualCue"]
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Regeneration failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const result = safeJsonParse(data.text);
      if (result.newDialogue) {
        setScenes(prev => {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            text: result.newDialogue,
            prompt: result.newVisualCue || updated[idx].prompt,
            visualCue: result.newVisualCue || updated[idx].visualCue
          };

          if (idx === activeSceneIndex) {
            setVideoPrompt(result.newVisualCue || updated[idx].prompt);
          }

          // Rebuild full script text to keep it in sync
          const newScript = updated.map(s => `[${s.timestamp}] ${s.label || 'SCENE'}\n${s.text}`).join('\n\n');
          setScript(newScript);
          return updated;
        });
      }
    } catch (e) {
      handleApiError(e, "Script regeneration");
    }
    setIsRegeneratingPart(false);
  };

  const analyzeScenePrompt = async (idx: number) => {
    if (scenes.length <= idx) return;
    setIsRegeneratingPart(true);
    try {
      const scene = scenes[idx];
      const prompt = `Analyze the following UGC script dialogue and generate a detailed visual prompt for a video generation model (like Veo 3.1).
      
      DIALOGUE: "${scene.text}"
      PRODUCT: ${productDetails}
      PERFORMANCE STYLE: ${VIDEO_STYLES[selectedVideoStyle]?.modifier || VIDEO_STYLES.calm.modifier}
      
      The visual prompt should describe a UGC Creator Style scene:
      1. The creator talking directly to the camera with a relatable, genuine emotion.
      2. A natural, everyday environment (living room, bedroom, outdoor street, cozy cafe).
      3. The camera angle and movement (prefer wide or medium shots, avoid tight portraits).
      4. If the product is clothing, the creator MUST be wearing it naturally and showing it off.
      5. The creator is speaking the exact words: "${scene.text}". This is critical for accurate lip-sync.
      6. Performance Style: The creator's performance must reflect a ${VIDEO_STYLES[selectedVideoStyle]?.name} style: ${VIDEO_STYLES[selectedVideoStyle]?.modifier}.
      
      AVOID: 85mm lens, portrait mode, heavy bokeh, or 'fashion film' or 'cinematic' aesthetics. Keep it grounded, natural, and realistic.
      Return ONLY the visual prompt text (max 80 words).`;

      const response = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parts: [{ text: prompt }],
          model: 'gemini-2.5-flash',
          userId: currentUserId
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const newPrompt = data.text || '';
      setVideoPrompt(newPrompt);
      setScenes(prev => prev.map((s, i) => i === idx ? { ...s, prompt: newPrompt } : s));
    } catch (e) {
      console.error("Analysis failed", e);
    }
    setIsRegeneratingPart(false);
  };




  const analyzeAllScenes = async () => {
    // Feature removed
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
  };

  const generateVoice = async () => {
    if (!script) return;
    setIsGeneratingAudio(true);
    try {
      const isPodcast = activeTab === 'podcast';
      const spokenText = isPodcast
        ? script.trim()
        : script.replace(/\[.*?\]/g, '').trim();
      const response = await fetch(getApiUrl('/api/ugc/speech'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isPodcast
            ? { text: spokenText, multiSpeaker: true, host1Voice, host2Voice, host1Name, host2Name, podcastScene, podcastDirectorNote }
            : { text: spokenText, voice }
        )
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => response.statusText);
        throw new Error(`Voice generation failed: ${response.status} — ${errBody}`);
      }

      const data = await response.json();
      const audioDataUrl: string = data.audio || '';
      const base64Audio = audioDataUrl.startsWith('data:')
        ? audioDataUrl.split(',')[1]
        : audioDataUrl;

      if (base64Audio) {
        setAudioData(base64Audio);
        const url = createWavUrl(base64Audio);
        setAudioUrl(url);

        const tempAudio = new Audio(url);
        tempAudio.onloadedmetadata = () => {
          const duration = tempAudio.duration;

          const audioEntry: TimelineItem = {
            id: 'audio-' + Date.now(),
            url: url,
            start: 0,
            end: duration,
            duration: duration,
            type: 'audio'
          };
          setTimeline((prev: TimelineItem[]) => {
            const filtered = prev.filter((t: TimelineItem) => t.type !== 'audio');
            return [audioEntry, ...filtered];
          });

          const sceneCount = Math.ceil(duration / 8);
          setScenes((prev: Scene[]) => {
            const newScenes = [...prev];
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
      handleApiError(e, "Voice generation");
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
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [
            { inlineData: { mimeType: file.type, data: base64Audio } },
            { text: `Transcribe this audio exactly. Return ONLY the transcription text.` }
          ]
        }]
      });

      if (response.text) {
        setScript(response.text.trim());
      }
    } catch (e) {
      handleApiError(e, "Audio transcription");
    }
    setIsGeneratingScript(false);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedAudioFile(file);
    transcribeAudio(file);

    try {
      const base64Audio = await fileToBase64(file);
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
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            { text: "Analyze this image and provide 5 short, creative suggestions for how to change or refine this scene for a UGC (User Generated Content) ad. The suggestions should be concise (max 10 words each) and focus on different angles, actions, or environmental changes. IMPORTANT: If the product is clothing, ensure suggestions involve the creator WEARING it naturally. Format the output as a simple JSON array of strings." }
          ]
        }],
        config: {
          responseMimeType: "application/json",
        }
      });

      const suggestions = safeJsonParse(response.text);
      setImageSuggestions(Array.isArray(suggestions) ? suggestions : []);
    } catch (err) {
      console.error("Failed to generate suggestions", err);
    }
    setIsGeneratingSuggestions(false);
  };

  const generateImage = async (overridePrompt?: string | React.MouseEvent | any): Promise<string> => {
    const imgCost = getImageCost();
    if (!isAdmin && !isGlobalAdmin) {
      const spendRes = await spend('veo_fast', imgCost as any);
      if (!spendRes || !spendRes.success) {
        showToast(`Insufficient Credits: You need ${imgCost} Shorts to generate an image.`, 'error');
        return '';
      }
    }
    setIsGeneratingImage(true);
    setImageProgressMsg('Initializing Studio Camera...');
    let generatedUrl = '';
    try {
      const ai = getAI();
      setImageProgressMsg('Calibrating Lighting & Style...');
      let contents: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];

      let stylePrompt = '';
      if (imageStyle === 'ultra-realistic') {
        stylePrompt = 'Ultra-realistic raw photo, natural looking normal photo quality, super natural, no background blur, no bokeh, sharp focus across the entire frame, shot on a normal phone, mobile photography aesthetic, natural lighting, super real human appearance, authentic and imperfect, 8K resolution, wide angle or medium shot, natural environment, no 85mm, no portrait lens effect, zero depth of field blur';
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
      const locationContext = locationImg ? ` The scene takes place in the location shown in the reference location image — replicate its background, environment, and lighting atmosphere closely.` : '';
      const promptText = isStringOverride
        ? `A professional UGC photo capturing this specific scene: ${overridePrompt}. If the product is clothing, the creator MUST be wearing it naturally. DO NOT show them holding the clothes.${locationContext} Artistic Style: ${stylePrompt}`
        : `A UGC style photo of a creator wearing and showcasing this product: ${productDetails}. 
      CRITICAL: If the product is clothing/apparel, the creator MUST be wearing it naturally. DO NOT show them holding the clothes in their hands.
      The creator looks directly at the camera, engaging the viewer.${locationContext}
      Style instructions: ${stylePrompt} `;

      // Assemble content parts to shape the final image
      if (characterImg) {
        contents.push(await fileToGenerativePart(characterImg.file));
      }

      if (productImg) {
        setImageProgressMsg('Analyzing Product DNA...');
        contents.push(await fileToGenerativePart(productImg.file));
      }

      if (locationImg) {
        setImageProgressMsg('Reading Location Reference...');
        contents.push(await fileToGenerativePart(locationImg.file));
      }

      setImageProgressMsg('Synthesizing UGC Frame...');

      const hasChar = !!characterImg;
      const hasProd = !!productImg;
      const hasLoc = !!locationImg;
      let promptInstructions = '';

      if (hasChar && hasProd && hasLoc) {
        promptInstructions = `Images provided in order: PERSON, PRODUCT, LOCATION. TASK: Generate a SINGLE photograph of the PERSON wearing or using the PRODUCT, placed naturally inside the LOCATION environment. Match the person's likeness, integrate the product naturally, and replicate the location's background, lighting, and atmosphere exactly. Scene: ${promptText}. Output must be one seamless photo — no collage, no split-screen.`;
      } else if (hasChar && hasProd) {
        promptInstructions = `The first image is the reference for the PERSON (creator). The second image is the reference for the PRODUCT. 
        TASK: Generate a SINGLE, COHERENT photograph where this person is wearing or using this product in the scene: ${promptText}. 
        CRITICAL: DO NOT create a collage, side-by-side comparison, or split-screen. The output must be one single, natural-looking photo. 
        Match the lighting, skin texture, and aesthetic of the first image. The product must be integrated naturally.`;
      } else if (hasChar && hasLoc) {
        promptInstructions = `The first image is the reference for the PERSON. The second image is the LOCATION. TASK: Generate a SINGLE photograph of this person placed naturally inside the location environment. Scene: ${promptText}. Match the person's appearance and replicate the location's background and atmosphere.`;
      } else if (hasProd && hasLoc) {
        promptInstructions = `The first image is the reference for the PRODUCT. The second image is the LOCATION. TASK: Generate a SINGLE photograph of a creator using or wearing this product inside the location environment. Scene: ${promptText}. The product must look exactly like the reference and the background must match the location.`;
      } else if (hasChar) {
        promptInstructions = `The image provided is the reference for the PERSON (creator). 
        TASK: Generate a SINGLE photograph of this person in the scene: ${promptText}. 
        Match their appearance and the lighting/aesthetic of the reference image perfectly.`;
      } else if (hasProd) {
        promptInstructions = `The image provided is the reference for the PRODUCT. 
        TASK: Generate a SINGLE photograph of a creator using/wearing this product in the scene: ${promptText}. 
        The product in the generated image must look exactly like the reference.`;
      } else if (hasLoc) {
        promptInstructions = `The image provided is the LOCATION reference. TASK: Generate a SINGLE photograph of a creator in the scene: ${promptText}, placed naturally inside this location. Replicate the background, lighting, and atmosphere of the location image exactly.`;
      } else {
        promptInstructions = `TASK: Generate a SINGLE photograph of a creator in the scene: ${promptText}.`;
      }

      // Append everyday-phone-photo quality block when ultra-realistic is selected
      if (imageStyle === 'ultra-realistic') {
        promptInstructions += `\n\nphoto quality and vibe: non-studio lighting, no oversharpening, real light from the location, iphone photo vibe, imperfect photo quality/raw quality (for realism), random realistic photo taken during a random moment of the day, make sure the lighting is natural and matches the background, 2k. It's better to make it slightly blurry, like a phone photo.`;
      }

    contents.push({ text: promptInstructions });

    // gemini-3.1-flash-image-preview = Nano Banana 2 (correct per official docs)
    const modelName = 'gemini-3.1-flash-image-preview';

    console.log(`[NB2 generateImage] Starting — model: ${modelName}, aspectRatio: ${aspectRatio}, parts: ${contents.length}`);
    console.time('[NB2 generateImage] API call duration');

    const NB2_TIMEOUT_MS = 90_000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('[NB2] Image generation timed out after 90s — try again')), NB2_TIMEOUT_MS)
    );

    const response = await Promise.race([
      ai.models.generateContent({
        model: modelName,
        contents: [{ parts: contents }],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          responseFormat: {
            image: {
              aspectRatio: aspectRatio,
              imageSize: '1K',
            }
          },
          thinkingConfig: {
            thinkingLevel: 'minimal',
          },
        } as any,
      }),
      timeoutPromise
    ]);

      console.timeEnd('[NB2 generateImage] API call duration');
      const candidateCount = response.candidates?.length ?? 0;
      console.log(`[NB2 generateImage] Response candidates: ${candidateCount}`);
      if (candidateCount === 0) console.warn('[NB2 generateImage] WARNING: 0 candidates — possible safety block or empty response');

      setImageProgressMsg('Processing Visual Output...');
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const url = `data:image/png;base64,${part.inlineData.data}`;
          generatedUrl = url;
          try {
            const byteCharacters = atob(part.inlineData.data || '');
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });
            const publicUrl = await uploadToSupabase(blob, 'image', promptText, currentUserId);
            const finalUrl = publicUrl || url;
            generatedUrl = finalUrl;
            setImageProgressMsg('Finalizing Frame...');
            setGeneratedImg(finalUrl);
            setGeneratedVideo('');
            addToGallery({ id: Date.now().toString(), type: 'image', url: finalUrl });
            generateImageSuggestions(finalUrl);
          } catch (uploadErr) {
            console.error(uploadErr);
            setGeneratedImg(url);
            setGeneratedVideo('');
            addToGallery({ id: Date.now().toString(), type: 'image', url });
            generateImageSuggestions(url);
          }
          break;
        }
      }
    } catch (e) {
      console.timeEnd('[NB2 generateImage] API call duration');
      if (!isAdmin && !isGlobalAdmin) refund('veo_fast', imgCost as any);
      handleApiError(e, "Image generation");
    }
    setIsGeneratingImage(false);
    return generatedUrl;
  };

  // ── TALKING HEAD — generate reference image ────────────────────────────────
  const generateTalkingHeadImage = async () => {
    if (!thPersonImg) { showToast('Upload a person photo first.', 'error'); return; }
    setThIsGeneratingImg(true);
    setThGeneratedImg('');
    setThGeneratedVideo('');
    try {
      const ai = getAI();
      const contents: any[] = [];

      // Add person image
      contents.push(await fileToGenerativePart(thPersonImg.file));
      // Add product image if provided
      if (thProductImg) contents.push(await fileToGenerativePart(thProductImg.file));
      // Add location image if provided
      if (thLocationImg) contents.push(await fileToGenerativePart(thLocationImg.file));

      let promptInstructions = '';
      if (thProductImg && thLocationImg) {
        promptInstructions = `Images: PERSON, PRODUCT, LOCATION. Generate ONE photorealistic portrait photo of this person holding or using the product, placed inside the location environment. Match the person's likeness exactly. The person faces directly at camera with a confident, engaging expression — ready to deliver a brand message. Natural lighting, sharp focus on face. No collage.`;
      } else if (thProductImg) {
        promptInstructions = `Images: PERSON, PRODUCT. Generate ONE photorealistic portrait photo of this person holding or showcasing the product. They face directly at camera, confident and engaging. Professional UGC lighting. No collage.`;
      } else if (thLocationImg) {
        promptInstructions = `Images: PERSON, LOCATION. Generate ONE photorealistic portrait photo of this person placed inside the location. They face camera confidently, ready to speak. Match the location lighting and atmosphere. No collage.`;
      } else {
        promptInstructions = `Generate ONE photorealistic portrait photo of this person facing the camera directly, confident and engaging expression, professional UGC lighting, clean background, ready to deliver a brand message.`;
      }
      promptInstructions += ` Style: Ultra-realistic, natural skin texture, sharp face detail, 9:16 portrait format, smartphone camera aesthetic.`;
      contents.push({ text: promptInstructions });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: [{ parts: contents }],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          responseFormat: { image: { aspectRatio: '9:16', imageSize: '1K' } },
          thinkingConfig: { thinkingLevel: 'minimal' },
        } as any,
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const url = `data:image/png;base64,${part.inlineData.data}`;
          setThGeneratedImg(url);
          // Upload to Supabase
          const byteChars = atob(part.inlineData.data || '');
          const byteArr = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
          const blob = new Blob([byteArr], { type: 'image/png' });
          const publicUrl = await uploadToSupabase(blob, 'image', promptInstructions, currentUserId);
          if (publicUrl) { setThGeneratedImg(publicUrl); addToGallery({ id: Date.now().toString(), type: 'image', url: publicUrl }); }
          else addToGallery({ id: Date.now().toString(), type: 'image', url });
          break;
        }
      }
    } catch (e) {
      handleApiError(e, 'Talking Head image generation');
    }
    setThIsGeneratingImg(false);
  };

  // ── TALKING HEAD — generate video from image + script ────────────────────
  const generateTalkingHeadVideo = async () => {
    if (!thGeneratedImg) { showToast('Generate the reference image first.', 'error'); return; }
    if (!thScript.trim()) { showToast('Add a script / hook for the talking head.', 'error'); return; }

    const unitCost = getCurrentCost(false);
    if (!isAdmin && !isGlobalAdmin) {
      const spendRes = await spend('veo_fast', unitCost as any);
      if (!spendRes || !spendRes.success) {
        showToast(`Insufficient Credits: You need ${unitCost} Shorts to generate video.`, 'error');
        return;
      }
    }

    setThIsGeneratingVideo(true);
    setThVideoProgress('Initializing Talking Head Engine…');
    setThGeneratedVideo('');

    try {
      const ai = getAI();

      // Fetch and resize the generated image for use as Veo reference
      let imagePayload: { imageBytes: string; mimeType: string } | undefined;
      try {
        const imgRes = await fetch(thGeneratedImg);
        const imgBlob = await imgRes.blob();
        const base64 = await resizeImage(imgBlob);
        imagePayload = { imageBytes: base64, mimeType: 'image/jpeg' };
      } catch { /* no ref image — generate from prompt only */ }

      const veoModel = thEngine === 'veo3' ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';

      const talkingPrompt = `A confident creator looks directly into the camera and delivers this message with natural, expressive lip sync: "${thScript.trim().substring(0, 400)}". They speak clearly, with hook energy — engaging the viewer from the first frame. Realistic facial movements, natural blinks, slight head movement. Shot in ${thAspectRatio} portrait. Cinematic UGC style.${imagePayload ? ' Animate from the reference image — keep face, background and outfit consistent.' : ''}`;

      setThVideoProgress('Submitting to Veo…');

      const videoRequest: any = {
        model: veoModel,
        prompt: talkingPrompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: thAspectRatio,
          durationSeconds: parseInt(thDuration),
          includeAudio: true,
        },
      };
      if (imagePayload) videoRequest.image = imagePayload;

      const operation = await (ai.models as any).generateVideo(videoRequest);
      let op = operation;
      setThVideoProgress('Rendering frames…');

      let attempts = 0;
      while (!op.done && attempts < 60) {
        await new Promise(r => setTimeout(r, 5000));
        op = await (ai.operations as any).getVideosOperation({ operation: op });
        attempts++;
        setThVideoProgress(`Rendering… (${attempts * 5}s)`);
      }

      if (!op.done) throw new Error('Talking head video generation timed out. Try a shorter duration.');

      const raiFiltered = op.response?.raiMediaFilteredCount ?? 0;
      if (raiFiltered > 0) {
        showToast('Video blocked by safety filter — rephrase the script.', 'error');
        if (!isAdmin && !isGlobalAdmin) refund('veo_fast', unitCost as any);
        setThIsGeneratingVideo(false);
        setThVideoProgress('');
        return;
      }

      setThVideoProgress('Downloading…');
      const downloadLink = op.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const currentApiKey = getApiKey();
        const resp = await fetch(downloadLink, { headers: { 'x-goog-api-key': currentApiKey } });
        if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
        const blob = await resp.blob();
        setThVideoProgress('Saving…');
        const publicUrl = await uploadToSupabase(blob, 'video', talkingPrompt, currentUserId);
        const finalUrl = publicUrl || URL.createObjectURL(blob);
        setThGeneratedVideo(finalUrl);
        addToGallery({ id: Date.now().toString(), type: 'video', url: finalUrl });
        showToast('Talking Head video ready!', 'success');
      } else {
        throw new Error('No video returned from Veo.');
      }
    } catch (e) {
      if (!isAdmin && !isGlobalAdmin) refund('veo_fast', getCurrentCost(false) as any);
      handleApiError(e, 'Talking Head video');
    }
    setThIsGeneratingVideo(false);
    setThVideoProgress('');
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
        if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
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
        model: 'gemini-2.5-flash-image',
        contents: [{
          parts: [
            imagePart,
            { text: `Edit this image based on this request: ${imageEditPrompt}. Maintain the same person and product if they are present.` }
          ]
        }],
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any
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

            const publicUrl = await uploadToSupabase(blob, 'image', imageEditPrompt, currentUserId);
            if (publicUrl) {
              setGeneratedImg(publicUrl);
              addToGallery({ id: Date.now().toString(), type: 'image', url: publicUrl });
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
      handleApiError(e, "Image regeneration");
    }
    setIsRegeneratingImage(false);
  };

  const getImageCost = () => imgEngine === 'gpt2' ? 5 : 2;

  const getCurrentCost = (isMontage = false) => {
    const duration = isMontage ? parseInt(montageDuration) : parseInt(durationSeconds);
    const audioOn = isMontage ? montageAudioEnabled : includeAudio;
    
    let costPerSec = audioOn ? 17.43 : 11.62;
    if ((videoResolution as string) === '4K') {
       costPerSec = audioOn ? 40.67 : 34.86;
    }
    return Math.ceil(costPerSec * duration);
  };

  const generateVideo = async (overridePrompt?: string, referenceImageUrl?: string) => {
    const unitCost = getCurrentCost(false);
    if (!isAdmin && !isGlobalAdmin) {
      const spendRes = await spend('veo_fast', unitCost as any);
      if (!spendRes || !spendRes.success) {
        showToast(`Insufficient Credits: You need ${unitCost} Shorts to generate video.`, 'error');
        return;
      }
    }

    setIsGeneratingVideo(true);
    setVideoError('');
    setVideoTimedOut(false);
    setVideoProgressMsg(videoGenMode === 'veo3' ? 'Initializing Veo 3 HQ…' : 'Initializing Veo 3 Fast…');
    try {
      const ai = getAI();

      let stylePrompt = '';
      if (imageStyle === 'ultra-realistic') {
        stylePrompt = 'Ultra-realistic raw footage, natural looking normal video quality, super natural, no background blur, no bokeh, sharp focus across the entire frame, shot on a normal phone, mobile video aesthetic, natural lighting, super real human appearance, authentic and imperfect, 4K resolution, natural camera movement, no 85mm lens, no bokeh portrait effect, zero depth of field blur';
      } else if (imageStyle === 'iphone') {
        stylePrompt = 'UGC vlog style, shot on iPhone, handheld movement, casual lighting, relatable social media aesthetic';
      } else if (imageStyle === 'cinematic') {
        stylePrompt = 'Cinematic lighting, high contrast, moody, professional commercial look, 35mm lens, polished aesthetic';
      }

      const lipSyncBooster = ` UGC Creator Style: The creator is in a natural, relatable environment, talking directly to the camera. Performance Style: ${VIDEO_STYLES[selectedVideoStyle]?.modifier}. The creator is speaking the script dialogue clearly with natural mouth movements. High quality facial animation. Avoid high-end commercial sets.`;

      // Prioritize the specific reference image if provided (e.g. for montage clips)
      const activeRefImg = referenceImageUrl || scenes[activeSceneIndex]?.image || generatedImg;
      
      let virtualCreatorPrompt = '';
      if (!activeRefImg && !characterImg) {
        virtualCreatorPrompt = ` Virtual Creator: ${getVirtualCreatorPrompt(productDetails, productTags)}.`;
      }

      const dialogue = scenes[activeSceneIndex]?.text ? ` Dialogue to speak: "${scenes[activeSceneIndex].text}".` : '';

      let promptText: string;
      let imagePayload: { imageBytes: string; mimeType: string } | undefined = undefined;

      if (activeTab === 'podcast') {
        // Podcast cuts: use only the podcast visual cue + spoken dialogue (no UGC boosters)
        const podcastVisual = overridePrompt || scenes[activeSceneIndex]?.visualCue || 'Two-host podcast setup with Host 1 and Host 2 at microphones, natural studio lighting, product visible on the desk.';
        const podcastDialogue = scenes[activeSceneIndex]?.text ? ` The hosts are speaking: "${scenes[activeSceneIndex].text}"` : '';

        // If host/product images are uploaded, generate composite reference frame → image-to-video
        const hasPodcastAssets = podcastHost1Img || podcastHost2Img || podcastProductImg;
        if (hasPodcastAssets) {
          setVideoProgressMsg('Building Podcast Reference Frame...');
          const sceneOption = {
            id: 'podcast-video-ref',
            title: 'Podcast Studio Frame',
            prompt: podcastVisual
          };
          const refUrl = await generateMontageReferenceImage(sceneOption);
          if (refUrl) {
            const res = await fetch(refUrl);
            const blob = await res.blob();
            const base64 = await resizeImage(blob);
            imagePayload = { imageBytes: base64, mimeType: 'image/jpeg' };
          }
        }

        const hasRef = !!imagePayload;
        promptText = `${podcastVisual}${podcastDialogue}${hasRef ? ' Animate naturally from the reference image. Keep host faces, microphones and product consistent.' : ''}${stylePrompt ? ` Style: ${stylePrompt}` : ''}`;
      } else {
        promptText = (overridePrompt || (scenes[activeSceneIndex]?.isApproved
          ? scenes[activeSceneIndex].prompt
          : (videoPrompt || `A creator wearing or interacting with this product: ${productDetails}. If it's clothing, they MUST be wearing it.`))) + dialogue + (stylePrompt ? ` Style: ${stylePrompt}` : '') + lipSyncBooster + virtualCreatorPrompt + (activeRefImg || characterImg ? " IMPORTANT: Match the natural vibe, lighting, and aesthetic of the provided reference image perfectly." : "");

        if (activeRefImg) {
          let base64 = '';
          const mimeType = 'image/jpeg';
          const res = await fetch(activeRefImg);
          const blob = await res.blob();
          base64 = await resizeImage(blob);
          imagePayload = { imageBytes: base64, mimeType };
        } else if (characterImg) {
          let base64 = '';
          const mimeType = 'image/jpeg';
          if (characterImg.url && characterImg.url.startsWith('http')) {
            const res = await fetch(characterImg.url);
            const blob = await res.blob();
            base64 = await resizeImage(blob);
          } else {
            base64 = await resizeImage(characterImg.file);
          }
          imagePayload = { imageBytes: base64, mimeType };
        }
      }

      setVideoProgressMsg('Igniting the Motion Engine...');

      const veoModel = videoGenMode === 'veo3'
        ? 'veo-3.1-generate-preview'
        : 'veo-3.1-fast-generate-preview';

      const videoRequest: any = {
        model: veoModel,
        prompt: promptText.substring(0, 1000), // Safety truncation
        config: {
          numberOfVideos: 1,
          resolution: videoResolution as any,
          aspectRatio: aspectRatio === '1:1' ? '9:16' : aspectRatio as any, // Veo doesn't support 1:1
          durationSeconds: parseInt(durationSeconds),
          includeAudio: includeAudio
        }
      };

      if (imagePayload) {
        videoRequest.image = imagePayload;
      }

      let operation = await ai.models.generateVideos(videoRequest);

      let pollCount = 0;
      const messages = [
        'Generating Video Frames...',
        'Refining Realistic Details...',
        'Processing Motion Dynamics...',
        'Applying High-Res Textures...',
        'Finalizing Render...'
      ];

      const VIDEO_TIMEOUT_MS = videoGenMode === 'veo3' ? 150_000 : 90_000; // 150s HQ / 90s Fast
      const pollStart = Date.now();

      while (!operation.done) {
        const elapsed = Math.floor((Date.now() - pollStart) / 1000);
        if (Date.now() - pollStart > VIDEO_TIMEOUT_MS) {
          setVideoTimedOut(true);
          setIsGeneratingVideo(false);
          setVideoProgressMsg('');
          showToast(`Video generation timed out after ${elapsed}s — tap Retry to try again.`, 'error');
          refund('veo_fast', unitCost as any);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
        const msg = messages[Math.min(pollCount, messages.length - 1)];
        setVideoProgressMsg(`${msg} (${elapsed}s)`);
        pollCount++;
        operation = await ai.operations.getVideosOperation({ operation });
      }

      setVideoProgressMsg('Checking Response...');
      const generateVideoResponse = (operation.response as any)?.generateVideoResponse;
      const raiFiltered = generateVideoResponse?.raiMediaFilteredCount || 0;

      if (raiFiltered > 0) {
        const reason = generateVideoResponse?.raiMediaFilteredReasons?.[0] || 'Prompt conflicted with safety policies.';
        setVideoError(`Video blocked by Veo safety filter. Try rephrasing your prompt.\n\nReason: ${reason}\n\nYou have not been charged.`);
        showToast('Video blocked by safety filter — try rephrasing the prompt. (Not charged)', 'error');
        setIsGeneratingVideo(false);
        setVideoProgressMsg('');
        return;
      }

      setVideoProgressMsg('Downloading Render...');
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        // Get the current API key for the download request
        const currentApiKey = getApiKey();

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
        const publicUrl = await uploadToSupabase(blob, 'video', promptText, currentUserId);

        const finalUrl = publicUrl || URL.createObjectURL(blob);
        setGeneratedVideo(finalUrl);
        addToGallery({ id: Date.now().toString(), type: 'video', url: finalUrl });
        addToTimeline({ type: 'video', url: finalUrl });
      } else {
        setVideoError('Veo returned no video. The prompt may have been filtered — try a different prompt.');
        showToast('No video generated. Try rephrasing your prompt.', 'error');
      }
    } catch (e: any) {
      refund('veo_fast', unitCost as any);
      handleApiError(e, "Video generation");
      const errMsg = e.message || JSON.stringify(e);
      if (errMsg.includes("Requested entity was not found")) {
        setVideoError("Session expired or invalid key. Please try re-selecting your API key.");
      } else if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED")) {
        setVideoError(`Permission Denied: Your API key doesn't have access to Veo-3.1. Please ensure:
    1. Billing is ACTIVE for your Google Cloud project.
    2. The Generative AI Video API is enabled.
    3. You have selected a valid API key from a paid project.`);
      } else {
        setVideoError(`Error: ${errMsg} `);
      }
    }
    setIsGeneratingVideo(false);
    setVideoProgressMsg('');
  };

  return (
    <>
      <div className="h-full flex flex-col bg-[#020202] text-white selection:bg-[#c8f135] selection:text-black relative">
      {/* ── Toast Notifications ─────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-12 right-4 z-[1000] flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-500 animate-in slide-in-from-top-4 ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
          toast.type === 'success' ? 'bg-[#c8f135]/10 border-[#c8f135]/30 text-[#c8f135]' :
            'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : toast.type === 'success' ? <CheckCircle size={18} /> : <Sparkles size={18} />}
          <span className="text-[11px] font-bold tracking-wide">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Montage Image Lightbox ────────────────────────────────── */}
      {montageImgExpanded && montageGeneratedImg && (
        <div
          className="fixed inset-0 z-[2000] bg-black/92 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setMontageImgExpanded(false)}
        >
          <div
            className="relative max-w-3xl w-full flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="w-full flex items-center justify-between px-1 py-2 mb-2">
              <span className="text-[9px] font-mono text-[#c8f135] uppercase tracking-widest flex items-center gap-1.5">
                <Camera size={11} />
                Character + Product Reference
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={montageGeneratedImg}
                  download="montage-reference.png"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/15 rounded-lg text-[9px] font-black uppercase tracking-widest text-white hover:bg-[#c8f135]/20 hover:text-[#c8f135] hover:border-[#c8f135]/40 transition-all"
                  onClick={e => e.stopPropagation()}
                >
                  <Download size={11} />
                  Save PNG
                </a>
                <button
                  onClick={() => setMontageImgExpanded(false)}
                  className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-red-500/70 transition-colors"
                >
                  <X size={13} className="text-white" />
                </button>
              </div>
            </div>
            {/* Image */}
            <div className="rounded-xl overflow-hidden border border-[#c8f135]/20 shadow-[0_0_60px_rgba(200,241,53,0.08)] w-full">
              <img
                src={montageGeneratedImg}
                alt="Montage Reference Full Size"
                className="w-full h-auto max-h-[82vh] object-contain"
              />
            </div>
            <p className="mt-2 text-[8px] font-mono text-gray-600 uppercase tracking-widest">Click outside to close</p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex-none py-2 px-4 border-b border-white/10 flex items-center gap-3 z-10 bg-black/40 backdrop-blur-md shrink-0">
        <div className="flex items-baseline gap-2 flex-shrink-0">
          <h1 className="text-base font-black italic uppercase tracking-tighter bg-gradient-to-r from-[#c8f135] via-lime-300 to-emerald-400 bg-clip-text text-transparent whitespace-nowrap">
            Influencer Studio
          </h1>
        </div>
        <div className="w-px h-5 bg-white/10 flex-shrink-0" />
        {/* Mode Filter Tabs */}
        <div className="flex gap-1.5">
          {[
            { id: 'ugc', label: 'UGC', icon: Film },
            { id: 'podcast', label: 'Podcast', icon: Volume2 },
            { id: 'talking-head', label: 'Talking Head', icon: User },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-[10px] font-black uppercase tracking-wider transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#c8f135] text-black shadow-[0_0_15px_rgba(200,241,53,0.25)]'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5 border border-white/10'
              }`}
            >
              <tab.icon size={10} className={activeTab === tab.id ? 'text-black' : 'text-[#c8f135]'} />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isGeneratingVideo && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#c8f135]/10 border border-[#c8f135]/20">
              <Loader2 size={9} className="animate-spin text-[#c8f135]" />
              <span className="text-[8px] font-black text-[#c8f135] uppercase tracking-widest">{videoProgressMsg || 'Generating…'}</span>
            </div>
          )}
          {isGeneratingScript && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <Loader2 size={9} className="animate-spin text-white/50" />
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Writing Script…</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Main DirectorStudio-style flex layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT PANEL ── */}
        <div className="relative flex shrink-0 h-full">
          <motion.div
            animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="h-full border-r border-[#1e1e24] bg-[#080808] flex flex-col overflow-hidden"
            style={{ minWidth: 0 }}
          >
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
            {activeTab === 'talking-head' ? (
              <>
                <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Camera size={12} className="text-[#c8f135]" /> Reference Assets
                </h2>

                {/* 3-slot grid: Person / Product / Stage */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Person */}
                  <div className="space-y-1">
                    <div className="relative group aspect-square bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/50 transition-colors flex items-center justify-center">
                      <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setThPersonImg({ file: f, url: URL.createObjectURL(f) }); }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      {thPersonImg ? (
                        <>
                          <img src={thPersonImg.url} alt="Person" className="w-full h-full object-cover" />
                          <button onClick={ev => { ev.stopPropagation(); setThPersonImg(null); }} className="absolute top-1 right-1 z-20 w-4 h-4 rounded-full bg-black/80 flex items-center justify-center hover:bg-red-500 transition-colors"><X size={8} /></button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors"><User size={18} strokeWidth={1.5} /></div>
                      )}
                    </div>
                    <p className="text-[7px] text-center font-black text-white/20 uppercase tracking-widest">Person</p>
                  </div>
                  {/* Product */}
                  <div className="space-y-1">
                    <div className="relative group aspect-square bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/50 transition-colors flex items-center justify-center">
                      <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setThProductImg({ file: f, url: URL.createObjectURL(f) }); }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      {thProductImg ? (
                        <>
                          <img src={thProductImg.url} alt="Product" className="w-full h-full object-cover" />
                          <button onClick={ev => { ev.stopPropagation(); setThProductImg(null); }} className="absolute top-1 right-1 z-20 w-4 h-4 rounded-full bg-black/80 flex items-center justify-center hover:bg-red-500 transition-colors"><X size={8} /></button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors"><Package size={18} strokeWidth={1.5} /></div>
                      )}
                    </div>
                    <p className="text-[7px] text-center font-black text-white/20 uppercase tracking-widest">Product</p>
                  </div>
                  {/* Location */}
                  <div className="space-y-1">
                    <div className="relative group aspect-square bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/50 transition-colors flex items-center justify-center">
                      <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setThLocationImg({ file: f, url: URL.createObjectURL(f) }); }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      {thLocationImg ? (
                        <>
                          <img src={thLocationImg.url} alt="Location" className="w-full h-full object-cover" />
                          <button onClick={ev => { ev.stopPropagation(); setThLocationImg(null); }} className="absolute top-1 right-1 z-20 w-4 h-4 rounded-full bg-black/80 flex items-center justify-center hover:bg-red-500 transition-colors"><X size={8} /></button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors"><MapPin size={18} strokeWidth={1.5} /></div>
                      )}
                    </div>
                    <p className="text-[7px] text-center font-black text-white/20 uppercase tracking-widest">Stage</p>
                  </div>
                </div>

                {/* Generate Image button */}
                <button
                  onClick={generateTalkingHeadImage}
                  disabled={thIsGeneratingImg || !thPersonImg}
                  className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                    thIsGeneratingImg ? 'bg-white/5 text-white/20 cursor-not-allowed' :
                    !thPersonImg ? 'bg-white/5 text-white/10 cursor-not-allowed border border-white/5' :
                    'bg-[#c8f135] text-black hover:bg-[#d4ff3a] shadow-[0_4px_16px_rgba(200,241,53,0.25)]'
                  }`}
                >
                  {thIsGeneratingImg ? <><Loader2 size={10} className="animate-spin" /> Generating…</> : <><Camera size={10} /> Generate Reference Image</>}
                </button>

                {/* Product Scan */}
                <section className="space-y-3 border-t border-[#1e1e24] pt-4">
                  <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Search size={10} className="text-[#c8f135]" /> Product Scan
                  </h2>
                  <button
                    onClick={analyzeProduct}
                    disabled={isAnalyzing || !thProductImg}
                    className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      isAnalyzing ? 'bg-white/5 text-white/20 cursor-not-allowed' :
                      !thProductImg ? 'bg-white/5 text-white/10 cursor-not-allowed border border-white/5' :
                      'bg-[#c8f135]/15 border border-[#c8f135]/30 text-[#c8f135] hover:bg-[#c8f135] hover:text-black'
                    }`}
                  >
                    {isAnalyzing ? <><Loader2 size={10} className="animate-spin" /> Scanning…</> : <><Search size={10} /> {productAnalysis ? 'Re-Scan Product' : 'Scan Product'}</>}
                  </button>
                  {productAnalysis && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                      {productAnalysis.productName && <p className="text-[10px] font-black text-white tracking-wide leading-tight">{productAnalysis.productName}</p>}
                      {productAnalysis.description && <p className="text-[8px] text-white/40 font-mono leading-relaxed line-clamp-4">{productAnalysis.description}</p>}
                      {Array.isArray(productAnalysis.keyBenefits) && productAnalysis.keyBenefits.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(productAnalysis.keyBenefits as string[]).slice(0, 4).map((b: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded-md bg-[#c8f135]/10 border border-[#c8f135]/20 text-[7px] font-black text-[#c8f135] uppercase tracking-widest">{b}</span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                  {!thProductImg && <p className="text-[7px] text-white/20 font-mono uppercase tracking-widest text-center">Upload a product image first</p>}
                </section>
              </>
            ) : activeTab === 'podcast' ? (
              <>
                <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Volume2 size={12} className="text-[#c8f135]" /> Podcast Assets
                </h2>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Host 1', value: podcastHost1Img, target: 'podcastHost1' as const, icon: User, voiceVal: host1Voice, setVoice: setHost1Voice },
                    { label: 'Host 2', value: podcastHost2Img, target: 'podcastHost2' as const, icon: User, voiceVal: host2Voice, setVoice: setHost2Voice },
                    { label: 'Product', value: podcastProductImg, target: 'podcastProduct' as const, icon: Package, voiceVal: null, setVoice: null },
                  ].map(({ label, value, target, icon: Icon, voiceVal, setVoice }) => (
                    <div className="space-y-1" key={target}>
                      <div className="relative group aspect-square bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/50 transition-colors flex items-center justify-center">
                        <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, target)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        {value ? (
                          <img src={value.url} alt={label} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors">
                            <Icon size={18} strokeWidth={1.5} />
                          </div>
                        )}
                        {value && <div className="absolute inset-0 bg-[#c8f135]/10 opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </div>
                      <p className="text-[7px] text-center font-black text-white/20 uppercase tracking-widest">{label}</p>
                      {setVoice && (
                        <select
                          value={voiceVal || ''}
                          onChange={e => setVoice(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="w-full bg-[#111113] border border-[#1e1e24] rounded-lg px-1.5 py-1 text-[7px] font-mono text-[#c8f135] focus:outline-none focus:border-[#c8f135]/40 cursor-pointer"
                        >
                          {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                </div>

                {/* Voice Sample Upload — Podcast */}
                <section className="space-y-2 border-t border-[#1e1e24] pt-4">
                  <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Volume2 size={10} className="text-[#c8f135]" /> Voice Sample
                  </h2>

                  {/* Drop zone */}
                  <label className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                    voiceSampleName ? 'border-[#c8f135]/40 bg-[#c8f135]/5' : 'border-dashed border-white/10 bg-[#111113] hover:border-[#c8f135]/30'
                  }`}>
                    <input type="file" accept="audio/*,video/*" onChange={handleVoiceSampleUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {voiceSampleName ? (
                      <><Volume2 size={11} className="text-[#c8f135] shrink-0" /><span className="text-[8px] font-mono text-[#c8f135] truncate flex-1">{voiceSampleName}</span><button onClick={e => { e.preventDefault(); setVoiceSampleFile(null); setVoiceSampleName(null); setVoiceStyle(''); setVoiceTranscript(''); }} className="shrink-0 hover:text-red-400 text-white/30 transition-colors"><X size={9} /></button></>
                    ) : (
                      <><Upload size={11} className="text-white/20 shrink-0" /><span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Drop MP3 / WAV / MP4 here</span></>
                    )}
                  </label>

                  {/* Analyse button — shown once file selected, before results */}
                  {voiceSampleFile && !voiceTranscript && (
                    <button
                      onClick={analyzeVoiceSample}
                      disabled={isAnalyzingVoice}
                      className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                        isAnalyzingVoice
                          ? 'bg-white/5 text-white/20 cursor-not-allowed'
                          : 'bg-[#c8f135] text-black hover:bg-[#d4ff3a] shadow-[0_4px_16px_rgba(200,241,53,0.25)]'
                      }`}
                    >
                      {isAnalyzingVoice
                        ? <><Loader2 size={11} className="animate-spin" /> Transcribing &amp; Analysing…</>
                        : <><Wand2 size={11} /> Analyse Voice &amp; Extract Script</>}
                    </button>
                  )}

                  {/* Results */}
                  {(voiceTranscript || voiceStyle) && (
                    <div className="space-y-2">
                      {voiceTranscript && (
                        <div className="px-2.5 py-2 bg-[#0a0a0a] border border-[#c8f135]/15 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[7px] font-black text-[#c8f135]/60 uppercase tracking-widest flex items-center gap-1"><FileText size={8} /> Transcript</p>
                            <button onClick={() => setScript(voiceTranscript)} className="text-[7px] font-black text-[#c8f135] uppercase tracking-widest hover:underline">Use as Script</button>
                          </div>
                          <p className="text-[8px] font-mono text-white/60 leading-relaxed line-clamp-5">{voiceTranscript}</p>
                          <button
                            onClick={() => { setScript(voiceTranscript); }}
                            className="w-full py-2 rounded-lg bg-[#c8f135] text-black text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-[#d4ff3a] transition-all"
                          >
                            <Film size={10} /> Use Script &amp; Generate Video
                          </button>
                        </div>
                      )}
                      {voiceStyle && (
                        <div className="px-2.5 py-2 bg-black/40 border border-white/8 rounded-lg">
                          <p className="text-[7px] font-black text-white/30 uppercase tracking-widest mb-1">Voice Style</p>
                          <p className="text-[8px] font-mono text-white/60 leading-relaxed line-clamp-3">{voiceStyle}</p>
                        </div>
                      )}
                      <button
                        onClick={analyzeVoiceSample}
                        disabled={isAnalyzingVoice}
                        className="w-full py-1.5 rounded-lg border border-white/10 text-[7px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 hover:border-white/20 transition-all flex items-center justify-center gap-1"
                      >
                        <Loader2 size={8} /> Re-analyse
                      </button>
                    </div>
                  )}
                </section>

                <section className="space-y-3 border-t border-[#1e1e24] pt-4">
                  <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <FileText size={10} className="text-[#c8f135]" /> Podcast Setup
                  </h2>

                  {/* Host names */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[7px] font-black text-white/25 uppercase tracking-widest mb-1">Host 1 Name</p>
                      <input
                        value={host1Name}
                        onChange={e => setHost1Name(e.target.value)}
                        placeholder="e.g. Jaz R."
                        className="w-full bg-black/40 border border-white/8 rounded-lg px-2.5 py-1.5 text-[10px] text-white/70 focus:outline-none focus:border-[#c8f135]/50 font-mono"
                      />
                    </div>
                    <div>
                      <p className="text-[7px] font-black text-white/25 uppercase tracking-widest mb-1">Host 2 Name</p>
                      <input
                        value={host2Name}
                        onChange={e => setHost2Name(e.target.value)}
                        placeholder="e.g. Monica A."
                        className="w-full bg-black/40 border border-white/8 rounded-lg px-2.5 py-1.5 text-[10px] text-white/70 focus:outline-none focus:border-[#c8f135]/50 font-mono"
                      />
                    </div>
                  </div>

                  {/* Topic / creative direction */}
                  <div>
                    <p className="text-[7px] font-black text-white/25 uppercase tracking-widest mb-1">Topic & Direction</p>
                    <textarea
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="Podcast topic, tone, guest angle, product talking points..."
                      className="w-full min-h-[72px] bg-black/40 border border-white/8 rounded-xl px-3 py-2 text-[11px] text-white/70 focus:outline-none focus:border-[#c8f135]/60 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Scene setting */}
                  <div>
                    <p className="text-[7px] font-black text-white/25 uppercase tracking-widest mb-1">Scene Setting <span className="normal-case text-white/20">(sets vocal vibe)</span></p>
                    <textarea
                      value={podcastScene}
                      onChange={e => setPodcastScene(e.target.value)}
                      placeholder="e.g. A glass-walled studio at 10 PM, red ON AIR light blazing, upbeat music in the background..."
                      className="w-full min-h-[64px] bg-black/40 border border-white/8 rounded-xl px-3 py-2 text-[10px] text-white/50 font-mono focus:outline-none focus:border-[#c8f135]/50 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Director's notes */}
                  <div>
                    <p className="text-[7px] font-black text-white/25 uppercase tracking-widest mb-1">Director's Notes <span className="normal-case text-white/20">(style, pace, accent)</span></p>
                    <textarea
                      value={podcastDirectorNote}
                      onChange={e => setPodcastDirectorNote(e.target.value)}
                      placeholder={`Style: Infectious enthusiasm, like two best friends.\nPace: Energetic, no dead air.\nAccent: American GenZ`}
                      className="w-full min-h-[72px] bg-black/40 border border-white/8 rounded-xl px-3 py-2 text-[10px] text-white/50 font-mono focus:outline-none focus:border-[#c8f135]/50 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Audio tag chips */}
                  <div>
                    <p className="text-[7px] font-black text-white/25 uppercase tracking-widest mb-1.5">Audio Tags <span className="normal-case text-white/20">— click to copy, paste into script</span></p>
                    <div className="flex flex-wrap gap-1">
                      {['[excitedly]','[whispers]','[laughs]','[shouting]','[sarcastic]','[serious]','[sighs]','[giggles]','[curious]','[amazed]','[tired]','[crying]','[gasp]','[panicked]','[trembling]'].map(tag => (
                        <button
                          key={tag}
                          onClick={() => navigator.clipboard.writeText(tag)}
                          className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[7px] font-mono text-white/40 hover:bg-[#c8f135]/10 hover:border-[#c8f135]/30 hover:text-[#c8f135] transition-all"
                          title="Click to copy"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-[7px] text-white/20 font-mono uppercase tracking-widest leading-relaxed">
                    Host images stay separate from UGC assets. Gallery is shared.
                  </p>
                </section>

                {/* Product Scan */}
                <section className="space-y-3 border-t border-[#1e1e24] pt-4">
                  <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Search size={10} className="text-[#c8f135]" /> Product Scan
                  </h2>
                  <button
                    onClick={analyzeProduct}
                    disabled={isAnalyzing || !podcastProductImg}
                    className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      isAnalyzing ? 'bg-white/5 text-white/20 cursor-not-allowed' :
                      !podcastProductImg ? 'bg-white/5 text-white/10 cursor-not-allowed border border-white/5' :
                      'bg-[#c8f135]/15 border border-[#c8f135]/30 text-[#c8f135] hover:bg-[#c8f135] hover:text-black'
                    }`}
                  >
                    {isAnalyzing ? <><Loader2 size={10} className="animate-spin" /> Scanning…</> : <><Search size={10} /> {productAnalysis ? 'Re-Scan Product' : 'Scan Product'}</>}
                  </button>
                  {productAnalysis && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                      {productAnalysis.productName && <p className="text-[10px] font-black text-white tracking-wide leading-tight">{productAnalysis.productName}</p>}
                      {productAnalysis.description && <p className="text-[8px] text-white/40 font-mono leading-relaxed line-clamp-4">{productAnalysis.description}</p>}
                      {Array.isArray(productAnalysis.keyBenefits) && productAnalysis.keyBenefits.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(productAnalysis.keyBenefits as string[]).slice(0, 4).map((b: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded-md bg-[#c8f135]/10 border border-[#c8f135]/20 text-[7px] font-black text-[#c8f135] uppercase tracking-widest">{b}</span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                  {!podcastProductImg && <p className="text-[7px] text-white/20 font-mono uppercase tracking-widest text-center">Upload a product image first</p>}
                </section>

              </>
            ) : (
              <>
            <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-2">
              <Camera size={12} className="text-[#c8f135]" /> Reference Assets
            </h2>

            {/* 3-slot grid: Person / Product / Stage */}
            <div className="grid grid-cols-3 gap-2">
              {/* Person */}
              <div className="space-y-1">
                <div className="relative group aspect-square bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/50 transition-colors flex items-center justify-center">
                  <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'character')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  {characterImg ? (
                    <img src={characterImg.url} alt="Person" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors">
                      <User size={18} strokeWidth={1.5} />
                    </div>
                  )}
                  {characterImg && <div className="absolute inset-0 bg-[#c8f135]/10 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>
                <p className="text-[7px] text-center font-black text-white/20 uppercase tracking-widest">Person</p>
              </div>
              {/* Product */}
              <div className="space-y-1">
                <div className="relative group aspect-square bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/50 transition-colors flex items-center justify-center">
                  <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'product')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  {productImg ? (
                    <img src={productImg.url} alt="Product" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors">
                      <Package size={18} strokeWidth={1.5} />
                    </div>
                  )}
                  {productImg && <div className="absolute inset-0 bg-[#c8f135]/10 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>
                <p className="text-[7px] text-center font-black text-white/20 uppercase tracking-widest">Product</p>
              </div>
              {/* Stage */}
              <div className="space-y-1">
                <div className="relative group aspect-square bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/50 transition-colors flex items-center justify-center">
                  <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'location')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  {locationImg ? (
                    <>
                      <img src={locationImg.url} alt="Stage" className="w-full h-full object-cover" />
                      <button onClick={(ev) => { ev.stopPropagation(); setLocationImg(null); }} className="absolute top-1 right-1 z-20 w-4 h-4 rounded-full bg-black/80 flex items-center justify-center hover:bg-red-500 transition-colors"><X size={8} /></button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors">
                      <MapPin size={18} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <p className="text-[7px] text-center font-black text-white/20 uppercase tracking-widest">Stage</p>
              </div>
            </div>

            {/* Voice Sample Upload — UGC */}
            <section className="space-y-2 border-t border-[#1e1e24] pt-4">
              <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-1.5">
                <Volume2 size={10} className="text-[#c8f135]" /> Voice Sample
              </h2>

              {/* Drop zone */}
              <label className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                voiceSampleName ? 'border-[#c8f135]/40 bg-[#c8f135]/5' : 'border-dashed border-white/10 bg-[#111113] hover:border-[#c8f135]/30'
              }`}>
                <input type="file" accept="audio/*,video/*" onChange={handleVoiceSampleUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                {voiceSampleName ? (
                  <><Volume2 size={11} className="text-[#c8f135] shrink-0" /><span className="text-[8px] font-mono text-[#c8f135] truncate flex-1">{voiceSampleName}</span><button onClick={e => { e.preventDefault(); setVoiceSampleFile(null); setVoiceSampleName(null); setVoiceStyle(''); setVoiceTranscript(''); }} className="shrink-0 hover:text-red-400 text-white/30 transition-colors"><X size={9} /></button></>
                ) : (
                  <><Upload size={11} className="text-white/20 shrink-0" /><span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Drop MP3 / WAV / MP4 here</span></>
                )}
              </label>

              {/* Analyse button */}
              {voiceSampleFile && !voiceTranscript && (
                <button
                  onClick={analyzeVoiceSample}
                  disabled={isAnalyzingVoice}
                  className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                    isAnalyzingVoice
                      ? 'bg-white/5 text-white/20 cursor-not-allowed'
                      : 'bg-[#c8f135] text-black hover:bg-[#d4ff3a] shadow-[0_4px_16px_rgba(200,241,53,0.25)]'
                  }`}
                >
                  {isAnalyzingVoice
                    ? <><Loader2 size={11} className="animate-spin" /> Transcribing &amp; Analysing…</>
                    : <><Wand2 size={11} /> Analyse Voice &amp; Extract Script</>}
                </button>
              )}

              {/* Results */}
              {(voiceTranscript || voiceStyle) && (
                <div className="space-y-2">
                  {voiceTranscript && (
                    <div className="px-2.5 py-2 bg-[#0a0a0a] border border-[#c8f135]/15 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[7px] font-black text-[#c8f135]/60 uppercase tracking-widest flex items-center gap-1"><FileText size={8} /> Transcript</p>
                        <button onClick={() => setScript(voiceTranscript)} className="text-[7px] font-black text-[#c8f135] uppercase tracking-widest hover:underline">Use as Script</button>
                      </div>
                      <p className="text-[8px] font-mono text-white/60 leading-relaxed line-clamp-5">{voiceTranscript}</p>
                      <button
                        onClick={() => { setScript(voiceTranscript); }}
                        className="w-full py-2 rounded-lg bg-[#c8f135] text-black text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-[#d4ff3a] transition-all"
                      >
                        <Film size={10} /> Use Script &amp; Generate Video
                      </button>
                    </div>
                  )}
                  {voiceStyle && (
                    <div className="px-2.5 py-2 bg-black/40 border border-white/8 rounded-lg">
                      <p className="text-[7px] font-black text-white/30 uppercase tracking-widest mb-1">Voice Style</p>
                      <p className="text-[8px] font-mono text-white/60 leading-relaxed line-clamp-3">{voiceStyle}</p>
                    </div>
                  )}
                  <button
                    onClick={analyzeVoiceSample}
                    disabled={isAnalyzingVoice}
                    className="w-full py-1.5 rounded-lg border border-white/10 text-[7px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 hover:border-white/20 transition-all flex items-center justify-center gap-1"
                  >
                    <Loader2 size={8} /> Re-analyse
                  </button>
                </div>
              )}
            </section>

            {/* Product Scan section */}
            <section className="space-y-3 border-t border-[#1e1e24] pt-4">
              <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-1.5">
                <Search size={10} className="text-[#c8f135]" /> Product Scan
              </h2>
              <button
                onClick={analyzeProduct}
                disabled={isAnalyzing || !productImg}
                className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  isAnalyzing
                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                    : !productImg
                    ? 'bg-white/5 text-white/10 cursor-not-allowed border border-white/5'
                    : 'bg-[#c8f135]/15 border border-[#c8f135]/30 text-[#c8f135] hover:bg-[#c8f135] hover:text-black'
                }`}
              >
                {isAnalyzing ? (
                  <><Loader2 size={10} className="animate-spin" /> Scanning…</>
                ) : (
                  <><Search size={10} /> {productAnalysis ? 'Re-Scan Product' : 'Scan Product'}</>
                )}
              </button>

              {/* Description result */}
              {productAnalysis && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="space-y-2.5"
                >
                  {productAnalysis.productName && (
                    <p className="text-[10px] font-black text-white tracking-wide leading-tight">{productAnalysis.productName}</p>
                  )}
                  {productAnalysis.description && (
                    <p className="text-[8px] text-white/40 font-mono leading-relaxed line-clamp-4">{productAnalysis.description}</p>
                  )}
                  {productAnalysis.keyBenefits && productAnalysis.keyBenefits.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {productAnalysis.keyBenefits.slice(0, 4).map((b, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded-md bg-[#c8f135]/10 border border-[#c8f135]/20 text-[7px] font-black text-[#c8f135] uppercase tracking-widest leading-tight">{b}</span>
                      ))}
                    </div>
                  )}
                  {productAnalysis.targetAudience && (
                    <p className="text-[7px] text-white/25 font-mono uppercase tracking-widest">
                      <span className="text-white/40">For: </span>{productAnalysis.targetAudience}
                    </p>
                  )}
                </motion.div>
              )}

              {!productImg && (
                <p className="text-[7px] text-white/20 font-mono uppercase tracking-widest text-center">Upload a product image first</p>
              )}
            </section>

            {/* Reference Video — only in video mode */}
            {leftPanelMode === 'video' && <section className="space-y-2 border-t border-[#1e1e24] pt-4">
              <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em]">Reference Video</h2>
              <div className="relative group aspect-video bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/40 transition-colors flex items-center justify-center">
                <input type="file" accept="video/*" onChange={handleVideoUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                {sourceVideo ? (
                  <>
                    <video src={sourceVideo.url} className="w-full h-full object-cover opacity-50" />
                    <div className="absolute inset-0 flex items-center justify-center"><Play size={24} className="text-white/60" /></div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors">
                    <Video size={20} strokeWidth={1.5} />
                    <span className="text-[7px] font-black uppercase tracking-widest text-[#333]">Upload Ref</span>
                  </div>
                )}
              </div>
              {sourceVideo && (
                <button onClick={analyzeVideo} disabled={isAnalyzingVideo} className={`w-full py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${isAnalyzingVideo ? 'bg-white/5 text-white/20' : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'}`}>
                  {isAnalyzingVideo ? <><Loader2 size={10} className="animate-spin" />{analysisProgress || 'Analyzing...'}</> : <><Sparkles size={10} />Analyze Video</>}
                </button>
              )}
            </section>}

            {/* Scene Templates shortcut */}
            <button onClick={() => setShowTemplates(true)} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-[#1e1e24] text-[#3a3a4a] text-[8px] font-black uppercase tracking-widest hover:border-[#c8f135]/40 hover:text-[#c8f135]/60 transition-all">
              <Layers size={11} /> Scene Templates
            </button>

            {/* Admin KB */}
            {isAdmin && (
              <section className="space-y-3 border-t border-[#1e1e24] pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[10px] font-black text-[#00ffe0]/60 uppercase tracking-[0.2em] flex items-center gap-2"><BrainCircuit size={11} />Viral DNA</h2>
                  <div className="flex gap-1.5">
                    <button onClick={trainAgent} disabled={isTraining || knowledgeBase.length === 0} className="text-[7px] font-black uppercase px-2 py-1 rounded-lg bg-[#00ffe0]/10 border border-[#00ffe0]/20 text-[#00ffe0] hover:bg-[#00ffe0] hover:text-black transition-all disabled:opacity-30">
                      {isTraining ? 'Training...' : 'Train'}
                    </button>
                    <button onClick={testApiConnection} disabled={isTestingApi} className="text-[7px] font-black uppercase px-2 py-1 rounded-lg bg-[#c8f135]/10 border border-[#c8f135]/20 text-[#c8f135] hover:bg-[#c8f135] hover:text-black transition-all disabled:opacity-30">
                      {isTestingApi ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                </div>
                <div className="relative group w-full py-5 bg-black/40 border border-dashed border-[#1e1e24] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#00ffe0]/40 transition-all">
                  <input type="file" multiple accept=".txt,.md,.pdf" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleKBUpload(e)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  {isUploadingKB ? <Loader2 size={18} className="text-[#00ffe0] animate-spin" /> : <><Plus size={16} className="text-[#2a2a3a] group-hover:text-[#00ffe0] transition-colors" /><span className="text-[7px] font-black text-[#333] group-hover:text-white uppercase tracking-widest mt-1 transition-colors">Load Viral DNA</span></>}
                </div>
                {knowledgeBase.length > 0 && (
                  <div className="space-y-1.5 max-h-[100px] overflow-y-auto custom-scrollbar">
                    {knowledgeBase.map((kb) => (
                      <div key={kb.id} className="flex items-center justify-between px-2 py-1.5 bg-white/5 rounded-lg">
                        <span className="text-[8px] text-gray-400 truncate font-bold uppercase">{kb.name}</span>
                        <button onClick={() => setKnowledgeBase((prev: KnowledgeBaseEntry[]) => prev.filter((item: KnowledgeBaseEntry) => item.id !== kb.id))} className="text-gray-600 hover:text-red-400 transition-colors ml-1 shrink-0"><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
              </>
            )}
          </div>

          {/* ── Bottom Controls Bar ── */}
          <div className="border-t border-[#1e1e24] bg-[#0a0a0a]">

            {/* Image generation controls */}
              <div className="p-3 space-y-2">
                {/* Engine + Ratio row */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.15em] mb-1 block">Engine</span>
                    <div className="flex bg-white/5 p-0.5 rounded-lg border border-[#1e1e24]">
                      <button type="button" onClick={() => setImgEngine('nb2')} className={`flex-1 py-1 rounded-md text-[8px] font-black uppercase tracking-wide transition-all ${ imgEngine === 'nb2' ? 'bg-[#c8f135]/20 text-[#c8f135] border border-[#c8f135]/30' : 'text-white/30 hover:text-white/60' }`}>NB2</button>
                      <button type="button" onClick={() => setImgEngine('gpt2')} className={`flex-1 py-1 rounded-md text-[8px] font-black uppercase tracking-wide transition-all ${ imgEngine === 'gpt2' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-white/30 hover:text-white/60' }`}>GPT-2</button>
                    </div>
                  </div>
                  {imgEngine === 'gpt2' && (
                    <div>
                      <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.15em] mb-1 block">Quality</span>
                      <select value={gpt2Quality} onChange={e => setGpt2Quality(e.target.value as any)} className="bg-[#111113] border border-purple-500/30 px-2 py-1 rounded-full text-[8px] font-black uppercase text-purple-300 outline-none cursor-pointer">
                        <option value="low">Low ⚡</option>
                        <option value="medium">Med</option>
                        <option value="high">High ✨</option>
                      </select>
                    </div>
                  )}
                  <div className="w-28">
                    <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.15em] mb-1 block">Ratio</span>
                    <Dropdown
                      label=""
                      value={aspectRatio}
                      options={['9:16', '16:9', '1:1']}
                      onChange={(ratio) => setAspectRatio(ratio as any)}
                      direction="up"
                      icon={Layout}
                    />
                  </div>
                </div>


                {/* Loading state */}
                {isGeneratingMontageImg && (
                  <div className="flex items-center gap-2 py-1 animate-pulse">
                    <Loader2 size={11} className="animate-spin text-[#c8f135]" />
                    <span className="text-[8px] font-mono text-[#c8f135] uppercase tracking-widest">{montageImgProgressMsg || 'Generating…'}</span>
                  </div>
                )}

                {/* Requirements hint */}
                {(activeTab === 'podcast'
                  ? !podcastHost1Img && !podcastHost2Img && !podcastProductImg
                  : !characterImg && !productImg) && (
                  <p className="text-[7px] text-white/20 font-mono uppercase tracking-widest text-center py-1">
                    {activeTab === 'podcast' ? 'Upload host 1, host 2, or product above' : 'Upload person and/or product above'}
                  </p>
                )}

                {/* Generate Image button */}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const syntheticOption = {
                      id: 'quick-img',
                      title: activeTab === 'podcast' ? 'Podcast Studio Frame' : (productAnalysis?.productName || 'Product Shot'),
                      prompt: activeTab === 'podcast'
                        ? `A two-host podcast studio scene for this topic: ${userPrompt || script || 'branded podcast conversation'}. Show Host 1 and Host 2 at microphones with the product placed naturally in the setup.`
                        : productDetails
                        ? `A creator naturally using/holding the product: ${productDetails.substring(0, 200)}`
                        : 'A creator naturally holding and showcasing the product in a UGC style photo, natural lighting, authentic look',
                      icon: 'Sparkles',
                    };
                    generateMontageReferenceImage(syntheticOption);
                  }}
                  disabled={isGeneratingMontageImg || (activeTab === 'podcast' ? (!podcastHost1Img && !podcastHost2Img && !podcastProductImg) : (!characterImg && !productImg))}
                  className={`w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${
                    isGeneratingMontageImg || (activeTab === 'podcast' ? (!podcastHost1Img && !podcastHost2Img && !podcastProductImg) : (!characterImg && !productImg))
                      ? 'bg-white/5 text-white/20 cursor-not-allowed'
                      : 'bg-[#c8f135] text-black shadow-[0_6px_20px_rgba(200,241,53,0.25)]'
                  }`}
                >
                  {isGeneratingMontageImg
                    ? <><Loader2 size={12} className="animate-spin" />{montageImgProgressMsg || 'Generating…'}</>
                    : <><Camera size={12} />{montageGeneratedImg ? 'Regenerate Image' : 'Generate Image'}</>
                  }
                </motion.button>
              </div>
          </div>
          </motion.div>

          {/* Drawer toggle button — sits on the right edge of the sidebar wrapper */}
          <button
            onClick={() => setIsSidebarOpen(o => !o)}
            className={`absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-6 h-12 flex items-center justify-center rounded-r-xl transition-all shadow-lg
              ${isSidebarOpen
                ? 'bg-[#111113] border border-[#1e1e24] text-white/30 hover:text-[#c8f135] hover:border-[#c8f135]/40'
                : 'bg-[#c8f135] border border-[#c8f135] text-black hover:bg-[#d4f545] animate-pulse shadow-[0_0_12px_rgba(200,241,53,0.7)]'
              }`}
            title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {isSidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
          </button>
        </div>

        {/* ── RIGHT CONTENT AREA ── */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-[#050505]">

          {/* Scene Templates slide-out (absolute overlay) */}
          <aside
            onMouseMove={resetSidebarTimer}
            onClick={resetSidebarTimer}
            className={`absolute right-0 top-0 bottom-0 w-full sm:w-80 overflow-y-auto custom-scrollbar flex flex-col bg-black/95 backdrop-blur-3xl border-l border-[#222] z-50 transition-transform duration-500 shadow-2xl ${showTemplates ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="p-4 border-b border-[#222] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase px-1">Scene Templates</h2>
                <div className="flex items-center gap-2">
                  {isGlobalAdmin && (
                    <button onClick={() => setShowUploadForm(!showUploadForm)} className="text-[#c8f135] hover:text-white bg-[#c8f135]/10 p-1.5 rounded transition-colors flex items-center gap-1 text-[9px] font-black uppercase">
                      <Plus size={12} /> Add
                    </button>
                  )}
                  <button onClick={() => setShowTemplates(false)} className="text-[#555] hover:text-[#fff] bg-[#111] p-1 rounded transition-colors">
                    <SidebarClose size={14} />
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {showUploadForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-2 bg-[#111] p-3 rounded-xl border border-white/5">
                    <input id="ugcTplTitle" type="text" placeholder="Template title" className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#c8f135]" />
                    <input id="ugcTplContext" type="text" placeholder="Scene Context (e.g. Park)" className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#c8f135]" />
                    <textarea id="ugcTplPrompt" placeholder="Prompt used for video generation" className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white h-20 outline-none focus:border-[#c8f135] custom-scrollbar" />
                    <div className="flex items-center justify-between gap-1">
                      <input id="ugcTplFile" type="file" accept="video/*,image/*" className="text-[8px] text-zinc-400 file:bg-white/10 file:border-0 file:rounded file:text-white file:px-2 file:py-1 file:text-[8px] cursor-pointer" />
                      <button onClick={handleUploadTemplateUgc} className="bg-[#c8f135] hover:bg-[#a9cd2b] text-black px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1"><Upload size={11} /> Post</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex-1 p-4 grid grid-cols-2 gap-3 content-start overflow-y-auto custom-scrollbar">
              {(dbSceneTemplates as any[]).map((template: any) => (
                <div key={template.id} className="relative group">
                  <button
                    onClick={() => { setSceneContext(template.sceneContext || template.scene_context); setVideoPrompt(template.prompt); setShowTemplates(false); }}
                    className={`w-full aspect-[9/16] rounded-xl border overflow-hidden transition-all block bg-white/5 ${sceneContext === template.sceneContext ? 'border-[#c8f135] shadow-[0_0_15px_rgba(212,255,0,0.3)]' : 'border-white/10 hover:border-white/30'}`}
                    title={template.title}
                  >
                    {template.img?.endsWith('.mp4') ? (
                      <video autoPlay muted loop playsInline src={template.img ? `${template.img}?v=1` : ''} className={`w-full h-full object-cover transition-all duration-300 ${sceneContext === template.sceneContext ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />
                    ) : (
                      <img src={template.img} alt="" className={`w-full h-full object-cover transition-all duration-300 ${sceneContext === template.sceneContext ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-2 text-left pointer-events-none">
                      <span className="text-[#c8f135] font-mono text-[8.5px] font-bold tracking-widest uppercase leading-tight line-clamp-2">{template.title}</span>
                    </div>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(template.prompt); alert("Prompt Copied!"); }} className="absolute top-2 right-2 bg-black/60 hover:bg-[#c8f135] hover:text-black text-white p-1.5 rounded-md backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10 border border-white/20 hover:border-[#c8f135]" title="Copy Prompt">
                    <LucideIcons.Copy size={12} />
                  </button>
                  {isGlobalAdmin && template.created_at && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }} className="absolute top-2 right-8 bg-black/60 hover:bg-red-500 hover:text-white text-white p-1.5 rounded-md backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10 border border-white/20 hover:border-red-500" title="Delete Template">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </aside>


          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-36">
          {(activeTab === 'ugc' || activeTab === 'podcast' || activeTab === 'talking-head') ? (
            <div className="w-full h-full">
            <div className="flex gap-5 items-start p-4">

              {/* Center Column — Full Masonry Gallery */}
              <div id="tour-script" className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">

                {/* Filter tabs row */}
                {gallery.length > 0 && (
                  <div className="flex gap-1 mb-2 px-1">
                    {(['all', 'image', 'video'] as const).map(t => (
                      <button key={t} onClick={() => setGalleryTab(t)}
                        className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all ${
                          galleryTab === t ? 'bg-[#c8f135] text-black' : 'text-white/30 border border-white/10 hover:text-white/60'
                        }`}>
                        {t}
                        {t === 'all' && <span className="ml-1 opacity-60">{gallery.length}</span>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0a0a0a]" style={{ paddingBottom: '80px' }}>
                  {isGeneratingVideo && gallery.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 min-h-[300px]">
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                        <div className="absolute inset-0 rounded-full border-4 border-t-[#c8f135] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                        <Film className="absolute inset-0 m-auto w-6 h-6 text-[#c8f135]" />
                      </div>
                      <p className="text-[10px] font-mono text-[#c8f135] uppercase tracking-widest animate-pulse">{videoProgressMsg || 'Generating…'}</p>
                    </div>
                  ) : gallery.length === 0 ? (
                    <div className="w-full flex flex-col items-center justify-center gap-3 min-h-[300px] select-none">
                      <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center">
                        <Film size={22} className="text-white/15" />
                      </div>
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Generated assets appear here</p>
                      <p className="text-[8px] text-white/10 font-mono">Generate an image or video to get started</p>
                    </div>
                  ) : (
                    <div className="p-2" style={{ columns: 5, columnGap: '4px' }}>
                      {/* Spinner tile while generating next */}
                      {isGeneratingVideo && (
                        <div className="break-inside-avoid mb-1.5 rounded-lg border border-white/10 bg-white/3 flex flex-col items-center justify-center gap-2 aspect-[9/16]">
                          <div className="relative w-7 h-7">
                            <div className="absolute inset-0 rounded-full border-2 border-t-[#c8f135] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                            <Film className="absolute inset-0 m-auto w-3 h-3 text-[#c8f135]" />
                          </div>
                          <span className="text-[7px] text-white/30 font-bold uppercase tracking-widest">Generating…</span>
                        </div>
                      )}
                      {gallery
                        .filter(item => galleryTab === 'all' || item.type === galleryTab)
                        .map((item, idx) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="break-inside-avoid mb-1.5 relative group rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => setGalleryExpandItem(item)}
                          >
                            {item.type === 'video' ? (
                              <div className="w-full relative bg-black/60 aspect-[9/16] flex items-center justify-center">
                                <video src={item.url} className="w-full h-full object-cover" preload="metadata" playsInline />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="w-10 h-10 rounded-full bg-black/70 border border-white/30 flex items-center justify-center shadow-lg">
                                    <Play size={14} className="text-white fill-white ml-0.5" />
                                  </div>
                                </div>
                                <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded-md pointer-events-none">
                                  <Video size={9} className="text-[#c8f135]" />
                                  <span className="text-[7px] text-[#c8f135] font-black uppercase">Video</span>
                                </div>
                              </div>
                            ) : (
                              <img src={item.url} alt={`gen-${idx}`} className="w-full block" />
                            )}
                            {/* NEW badge */}
                            {idx === 0 && (
                              <span className="absolute top-1.5 left-1.5 text-[7px] bg-[#c8f135] text-black font-black px-1 py-0.5 rounded uppercase tracking-wider z-10">New</span>
                            )}
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-10">
                              <div className="flex gap-1.5">
                                <button title="Save" onClick={async e => {
                                  e.stopPropagation();
                                  const ext = item.type === 'video' ? 'mp4' : 'png';
                                  try {
                                    const res = await fetch(item.url);
                                    const blob = await res.blob();
                                    const blobUrl = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = blobUrl;
                                    a.download = `ugc-${item.id}.${ext}`;
                                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                                    URL.revokeObjectURL(blobUrl);
                                  } catch { /* fallback */ const a = document.createElement('a'); a.href = item.url; a.download = `ugc-${item.id}.${ext}`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
                                }} className="w-9 h-9 flex items-center justify-center bg-black/80 hover:bg-white/25 rounded-xl text-white text-sm font-black border border-white/20 transition-all shadow-lg">
                                  <Download size={14} />
                                </button>
                                {item.type === 'image' && (
                                  <button title="Edit" onClick={e => { e.stopPropagation(); setInpaintImg(item.url); }}
                                    className="w-9 h-9 flex items-center justify-center bg-purple-600/90 hover:bg-purple-500 rounded-xl text-white border border-purple-400/40 transition-all shadow-lg">
                                    <Wand2 size={14} />
                                  </button>
                                )}
                              </div>
                              {item.type === 'image' && (
                                <button title="Attach for video"
                                  onClick={e => { e.stopPropagation(); setAttachedRefImage(item.url); showToast('Image attached — ready to make a video!', 'success'); }}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border transition-all shadow-lg text-[8px] font-black uppercase tracking-wider ${
                                    attachedRefImage === item.url
                                      ? 'bg-[#c8f135] text-black border-[#c8f135]'
                                      : 'bg-black/80 hover:bg-[#c8f135]/20 hover:border-[#c8f135]/50 text-white hover:text-[#c8f135] border-white/20'
                                  }`}>
                                  <Plus size={10} /> {attachedRefImage === item.url ? 'Added' : 'Use for Video'}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  )}
                </div>

                {/* dead code preserved */}
                {false && <Card title="" icon={FileText} contentClassName="p-0">
                  <div className="space-y-4">

                    <div>
                      <label className="text-[#999] font-sans font-bold text-[10px] tracking-wide mb-1.5 block uppercase">Creative Direction</label>
                      <input
                        type="text"
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        placeholder="e.g., Energetic demo with a focus on product durability..."
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 font-sans text-[11px] text-white focus:outline-none focus:border-[#c8f135] transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Dropdown label="Language" value={language} options={LANGUAGES} onChange={setLanguage} icon={Box} />
                      <Dropdown label="Voice" value={voice} options={VOICES} onChange={setVoice} icon={Volume2} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Dropdown label="Duration" value={scriptDuration} options={['8 seconds', '16 seconds', '24 seconds', '36 seconds']} onChange={setScriptDuration} icon={Clock} />
                      <Dropdown
                        label="Tone"
                        value={SCRIPT_TONES[selectedScriptTone]?.name}
                        options={Object.values(SCRIPT_TONES).map(t => t.name)}
                        onChange={(name) => {
                          const key = Object.keys(SCRIPT_TONES).find(k => SCRIPT_TONES[k].name === name);
                          if (key) setSelectedScriptTone(key);
                        }}
                        icon={Sparkles}
                      />
                    </div>

                    {/* Vision Analysis — collapsed info row */}
                    {productDetails && (
                      <div className="bg-black/30 border border-white/5 rounded-xl px-3 py-2.5 font-mono text-[9px] text-gray-500 leading-relaxed flex gap-2 items-start max-h-32 overflow-y-auto custom-scrollbar">
                        <Wand2 size={10} className="text-[#c8f135] mt-0.5 flex-shrink-0" />
                        <div className="space-y-0.5">
                          {productDetails.split('\n').map((line, i) => (
                            <p key={i} className={line.startsWith('PRODUCT:') ? 'text-[#c8f135] font-bold not-italic' : 'italic'}>{line}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[#999] font-sans font-bold text-[10px] tracking-wide uppercase">Script</label>
                        <div className="flex items-center gap-1.5">
                          <button onClick={generateScript} disabled={isGeneratingScript} className="flex items-center gap-1.5 text-[9px] font-black tracking-widest px-3 py-1.5 rounded-lg bg-[#c8f135]/10 border border-[#c8f135]/20 text-[#c8f135] hover:bg-[#c8f135] hover:text-black transition-all">
                            {isGeneratingScript ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                            {isGeneratingScript ? 'Writing...' : 'Generate'}
                          </button>
                          <button onClick={analyzeScenes} disabled={!script} title="Split into scenes" className="flex items-center gap-1.5 text-[9px] font-black tracking-widest px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-30">
                            <Scissors size={10} />
                            Split
                          </button>
                          <button onClick={extractVisualPrompts} disabled={!script || isGeneratingScript} title="Extract visual prompts" className="flex items-center gap-1.5 text-[9px] font-black tracking-widest px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#c8f135] hover:bg-[#c8f135]/10 transition-all disabled:opacity-30">
                            <Wand2 size={10} />
                            Prompts
                          </button>
                          {script && scenes.length > 0 && scenes.map((scene, idx) => (
                            <button
                              key={idx}
                              onClick={() => regenerateScriptPart(idx, scene.label || 'SCENE')}
                              disabled={isRegeneratingPart}
                              className="text-[8px] font-bold tracking-widest px-2 py-1.5 rounded bg-white/5 border border-white/10 text-gray-400 hover:text-[#c8f135] hover:border-[#c8f135]/30 transition-all uppercase whitespace-nowrap"
                              title={`Regenerate ${scene.label || 'Scene'}`}
                            >
                              {isRegeneratingPart ? '...' : `↺ ${scene.label || 'S'}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative">
                        {(isGeneratingScript || isExtractingPrompts) && (
                          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <div key={i} className="w-1.5 h-1.5 bg-[#c8f135] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2} s` }} />
                              ))}
                            </div>
                            <p className="text-[10px] font-mono text-[#c8f135] uppercase tracking-widest animate-pulse">
                              {isExtractingPrompts ? 'Extracting Visual Prompts...' : 'Drafting UGC Script...'}
                            </p>
                          </div>
                        )}
                        <textarea
                          value={script}
                          onChange={(e) => setScript(e.target.value)}
                          className="w-full h-32 bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-sans text-sm text-white focus:outline-none focus:border-[#c8f135] resize-none leading-relaxed"
                          placeholder="AI will formulate script here..."
                        />
                      </div>

                      {/* Performance Montage Expandable Section */}
                      <div className="mt-4">
                        <button
                          onClick={() => setShowMontageOptions(!showMontageOptions)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${showMontageOptions ? 'bg-[#c8f135]/10 border-[#c8f135]/30' : 'bg-white/5 border-white/10 hover:bg-white/10'} `}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${showMontageOptions ? 'bg-[#c8f135] text-black' : 'bg-white/10 text-gray-400'} `}>
                              <Sparkles size={14} />
                            </div>
                            <div className="text-left">
                              <p className={`text-[10px] font-black uppercase tracking-widest ${showMontageOptions ? 'text-[#c8f135]' : 'text-white'} `}>Performance Montage</p>
                              <p className="text-[8px] text-gray-500 font-mono uppercase tracking-tighter">AI-Generated Product Hooks</p>
                            </div>
                          </div>
                          <div className={`transition-transform duration-300 ${showMontageOptions ? 'rotate-180' : ''} `}>
                            <ChevronDown size={16} className={showMontageOptions ? 'text-[#c8f135]' : 'text-gray-500'} />
                          </div>
                        </button>

                        {showMontageOptions && (
                          <div className="mt-2 p-3 bg-black/40 border border-white/5 rounded-xl animate-in slide-in-from-top-2 duration-300">
                            {isGeneratingMontageOptions ? (
                              <div className="flex items-center gap-3 animate-pulse">
                                <div className="w-4 h-4 rounded-full bg-[#c8f135]/20 animate-ping" />
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Analyzing Product...</span>
                              </div>
                            ) : montageOptions.length > 0 ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Film size={12} className="text-[#c8f135]" />
                                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Select a Clip to Review</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {montageOptions.map((option, optI) => (
                                    <button
                                      key={`opt-${optI}`}
                                      onClick={() => {
                                        setSelectedMontageOption(option);
                                        setMontagePrompt(option.prompt);
                                        setIsMontageApproved(false);
                                        setMontageGeneratedImg(''); // clear stale ref image when switching clips
                                      }}
                                      disabled={isGeneratingVideo}
                                      className={`flex items-center gap-3 p-3 border rounded-xl transition-all group relative overflow-hidden text-left ${selectedMontageOption?.id === option.id ? 'bg-[#c8f135]/10 border-[#c8f135]/50 shadow-[0_0_12px_rgba(200,241,53,0.08)]' : 'bg-white/5 border-white/10 hover:border-[#c8f135]/30 hover:bg-white/8'} `}
                                    >
                                      <div className={`p-1.5 rounded-lg ${selectedMontageOption?.id === option.id ? 'bg-[#c8f135]/20 text-[#c8f135]' : 'bg-white/10 text-gray-400 group-hover:text-[#c8f135]'} transition-all relative z-10`}>
                                        {option.icon === 'Droplets' ? <Droplets size={14} /> : 
                                         option.icon === 'Wind' ? <Wind size={14} /> :
                                         option.icon === 'Scissors' ? <Scissors size={14} /> :
                                         option.icon === 'Zap' ? <Zap size={14} /> :
                                         option.icon === 'Fingerprint' ? <Fingerprint size={14} /> :
                                         <Sparkles size={14} />}
                                      </div>
                                      <div className="relative z-10 min-w-0">
                                        <p className={`text-[10px] font-black uppercase tracking-wide truncate ${selectedMontageOption?.id === option.id ? 'text-[#c8f135]' : 'text-white group-hover:text-[#c8f135]'} transition-colors`}>{option.title}</p>
                                        <p className="text-[8px] text-gray-500 font-mono mt-0.5">Performance Clip</p>
                                      </div>
                                      {selectedMontageOption?.id === option.id && <div className="absolute right-2 top-2"><div className="w-1.5 h-1.5 rounded-full bg-[#c8f135]" /></div>}
                                      <div className="absolute inset-0 bg-gradient-to-r from-[#c8f135]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                  ))}
                                </div>

                                {selectedMontageOption && (
                                  <div className="mt-4 space-y-3 p-3 bg-white/5 border border-white/10 rounded-xl animate-in fade-in slide-in-from-top-2 duration-500">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="text-[#c8f135]">
                                          {selectedMontageOption?.icon === 'Droplets' ? <Droplets size={14} /> : 
                                           selectedMontageOption?.icon === 'Wind' ? <Wind size={14} /> :
                                           selectedMontageOption?.icon === 'Scissors' ? <Scissors size={14} /> :
                                           selectedMontageOption?.icon === 'Zap' ? <Zap size={14} /> :
                                           selectedMontageOption?.icon === 'Fingerprint' ? <Fingerprint size={14} /> :
                                           <Sparkles size={14} />}
                                        </div>
                                        <span className="text-[9px] font-black text-white uppercase tracking-widest">{selectedMontageOption?.title} Prompt</span>
                                      </div>
                                      <button
                                        onClick={() => setIsMontageApproved(!isMontageApproved)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isMontageApproved ? 'bg-[#c8f135] text-black' : 'bg-white/10 text-gray-400 hover:bg-white/20'} `}
                                      >
                                        {isMontageApproved ? <Check size={12} /> : null}
                                        {isMontageApproved ? 'Approved' : 'Approve Montage'}
                                      </button>
                                    </div>
                                    <textarea
                                      value={montagePrompt}
                                      onChange={(e) => {
                                        setMontagePrompt(e.target.value);
                                        setIsMontageApproved(false);
                                        setMontageGeneratedImg(''); // reset ref image if prompt edited
                                      }}
                                      className="w-full h-20 bg-black/40 border border-white/5 rounded-lg px-3 py-2 font-sans text-[11px] text-white focus:outline-none focus:border-[#c8f135] resize-none leading-relaxed"
                                      placeholder="Edit montage prompt here..."
                                    />

                                    {/* ── Two-Step Montage Pipeline ── */}
                                    <div className="space-y-2">
                                      {/* Step 1: Generate Reference Image */}
                                      <div className="p-2.5 bg-black/30 rounded-lg border border-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-1.5">
                                            <span className="w-4 h-4 rounded-full bg-[#c8f135]/20 border border-[#c8f135]/40 text-[#c8f135] text-[7px] font-black flex items-center justify-center">1</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-[#c8f135]">Generate Reference Image</span>
                                          </div>
                                          {montageGeneratedImg && (
                                            <span className="text-[7px] font-mono text-[#c8f135] bg-[#c8f135]/10 px-2 py-0.5 rounded border border-[#c8f135]/30">✓ Ready</span>
                                          )}
                                        </div>

                                        {/* Generated reference image preview */}
                                        {montageGeneratedImg && (
                                          <div className="relative mb-2 rounded-lg overflow-hidden border border-[#c8f135]/30 group/img">
                                            <img src={montageGeneratedImg} alt="Montage Reference" className="w-full max-h-[140px] object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                                              <span className="text-[7px] font-mono text-[#c8f135] uppercase tracking-widest">Character + Product Reference</span>
                                            </div>
                                            {/* Expand button */}
                                            <button
                                              onClick={() => setMontageImgExpanded(true)}
                                              className="absolute top-1.5 left-1.5 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center hover:bg-[#c8f135]/80 hover:text-black transition-colors opacity-0 group-hover/img:opacity-100"
                                              title="Expand image"
                                            >
                                              <ZoomIn size={11} className="text-white" />
                                            </button>
                                            {/* Push to Monitor button */}
                                            <button
                                              onClick={() => {
                                                setGeneratedImg(montageGeneratedImg);
                                                setScenes((prev: Scene[]) => prev.map((s: Scene, i: number) => i === activeSceneIndex ? { ...s, image: montageGeneratedImg } : s));
                                                setRenderMode('image');
                                                showToast('Reference image pushed to Studio Monitor!', 'success');
                                              }}
                                              className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-2 py-1 bg-black/80 border border-[#c8f135]/40 rounded-md text-[7px] font-black uppercase tracking-widest text-[#c8f135] hover:bg-[#c8f135]/20 transition-all opacity-0 group-hover/img:opacity-100"
                                              title="Push to Studio Monitor"
                                            >
                                              <Monitor size={9} />
                                              Push to Monitor
                                            </button>
                                            {/* Remove button */}
                                            <button
                                              onClick={() => setMontageGeneratedImg('')}
                                              className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center hover:bg-red-500/80 transition-colors"
                                              title="Remove"
                                            >
                                              <X size={9} className="text-white" />
                                            </button>
                                          </div>
                                        )}

                                        {/* Show loading state */}
                                        {isGeneratingMontageImg && (
                                          <div className="flex items-center gap-2 py-2 animate-pulse">
                                            <Loader2 size={12} className="animate-spin text-[#c8f135]" />
                                            <span className="text-[8px] font-mono text-[#c8f135] uppercase tracking-widest">{montageImgProgressMsg || 'Generating...'}</span>
                                          </div>
                                        )}

                                        <button
                                          onClick={() => generateMontageReferenceImage({ ...selectedMontageOption, prompt: montagePrompt })}
                                          disabled={!isMontageApproved || isGeneratingMontageImg || isGeneratingVideo}
                                          className="w-full py-1.5 bg-white/10 border border-white/15 text-white font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-[#c8f135]/10 hover:border-[#c8f135]/40 hover:text-[#c8f135] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                        >
                                          {isGeneratingMontageImg ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                                          {montageGeneratedImg ? 'Regenerate Image' : 'Generate Reference Image'}
                                        </button>
                                      </div>

                                      {/* Step 2: Animate to Video */}
                                      <div className={`p-2.5 rounded-lg border transition-all ${montageGeneratedImg ? 'bg-black/30 border-[#c8f135]/20' : 'bg-black/20 border-white/5 opacity-60'}`}>
                                        <div className="flex items-center gap-1.5 mb-2">
                                          <span className={`w-4 h-4 rounded-full text-[7px] font-black flex items-center justify-center ${montageGeneratedImg ? 'bg-[#c8f135] text-black' : 'bg-white/10 border border-white/20 text-gray-500'}`}>2</span>
                                          <span className={`text-[8px] font-black uppercase tracking-widest ${montageGeneratedImg ? 'text-white' : 'text-gray-500'}`}>Animate to Video</span>
                                          {!montageGeneratedImg && <span className="text-[7px] text-gray-600 font-mono uppercase">( complete step 1 first )</span>}
                                        </div>

                                        {/* ── Audio & Duration controls ── */}
                                        <div className="flex items-center gap-2 mb-2.5">
                                          {/* Audio toggle */}
                                          <button
                                            onClick={() => setMontageAudioEnabled(prev => !prev)}
                                            title={montageAudioEnabled ? 'Audio ON — click to disable (saves credits)' : 'Audio OFF — click to enable'}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${
                                              montageAudioEnabled
                                                ? 'bg-[#c8f135]/15 border-[#c8f135]/50 text-[#c8f135]'
                                                : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                                            }`}
                                          >
                                            {montageAudioEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
                                            {montageAudioEnabled ? 'Audio' : 'Mute'}
                                          </button>

                                          {/* Duration pills */}
                                          <div className="flex items-center gap-1 flex-1">
                                            {(['4', '6', '8'] as const).map(sec => (
                                              <button
                                                key={sec}
                                                onClick={() => setMontageDuration(sec)}
                                                className={`flex-1 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${
                                                  montageDuration === sec
                                                    ? 'bg-[#c8f135] text-black border-[#c8f135]'
                                                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                                                }`}
                                              >
                                                {sec}s
                                              </button>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Credit hint */}
                                        <p className="text-[7px] font-mono text-gray-600 uppercase tracking-wider mb-2">
                                          {montageAudioEnabled ? '🔊 Audio ON — costs more credits' : '🔇 Muted — saves credits'} &nbsp;·&nbsp; {montageDuration}s clip ({getCurrentCost(true)} Shorts)
                                        </p>

                                        <button
                                          onClick={() => generateMontageVideo({ ...selectedMontageOption, prompt: montagePrompt })}
                                          disabled={!isMontageApproved || isGeneratingVideo || isGeneratingMontageImg}
                                          className="w-full py-2 bg-[#c8f135] text-black font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-[#d9ff4d] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                          {isGeneratingVideo ? <Loader2 size={13} className="animate-spin" /> : <Video size={13} />}
                                          {isGeneratingVideo ? (videoProgressMsg || 'Generating...') : (montageGeneratedImg ? `Animate Reference → Video (${getCurrentCost(true)} Shorts)` : `Produce Montage Video (${getCurrentCost(true)} Shorts)`)}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-3 py-4">
                                {productImg ? (
                                  // Product is uploaded but analysis failed/timed out — show retry
                                  <>
                                    <div className="flex items-center gap-2 text-amber-400/70">
                                      <AlertCircle size={14} />
                                      <p className="text-[9px] font-mono uppercase tracking-widest">Analysis incomplete. Retry to unlock clips.</p>
                                    </div>
                                    <button
                                      onClick={() => productImg && analyzeProductForMontage(productImg.file)}
                                      disabled={isGeneratingMontageOptions}
                                      className="flex items-center gap-2 px-4 py-2 bg-[#c8f135]/10 border border-[#c8f135]/30 text-[#c8f135] rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#c8f135]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isGeneratingMontageOptions ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                                      {isGeneratingMontageOptions ? 'Analysing...' : 'Analyse for Montages'}
                                    </button>
                                  </>
                                ) : (
                                  // No product image yet
                                  <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Upload a product image to unlock montages</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1.5 custom-scrollbar">
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
                      <div className="space-y-1.5 mb-2 p-2 bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                        <div className="flex items-center justify-between mb-1 px-1">
                          <label className="text-[#999] font-sans font-bold text-[9px] tracking-wide block uppercase">
                            Video Performance Style
                          </label>
                          <button 
                            onClick={() => setIsPerformanceStyleExpanded(!isPerformanceStyleExpanded)}
                            className="text-[8px] font-black uppercase tracking-widest text-[#c8f135] hover:brightness-110 flex items-center gap-1 transition-all"
                          >
                            {isPerformanceStyleExpanded ? (
                              <>Close <X size={10} /></>
                            ) : (
                              <>Expand <Maximize size={10} /></>
                            )}
                          </button>
                        </div>

                        <AnimatePresence mode="wait">
                          {!isPerformanceStyleExpanded ? (
                            <motion.div
                              key="collapsed"
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center gap-3 p-2.5 bg-[#c8f135]/5 border border-[#c8f135]/20 rounded-lg cursor-pointer hover:bg-[#c8f135]/10 transition-all"
                              onClick={() => setIsPerformanceStyleExpanded(true)}
                            >
                              <span className="text-xl">{VIDEO_STYLES[selectedVideoStyle].icon}</span>
                              <div className="flex-1">
                                <p className="text-[10px] font-black text-[#c8f135] uppercase tracking-widest">{VIDEO_STYLES[selectedVideoStyle].name}</p>
                                <p className="text-[8px] text-gray-500 font-mono uppercase">{VIDEO_STYLES[selectedVideoStyle].description}</p>
                              </div>
                              <ChevronRight size={14} className="text-[#c8f135]/50" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="expanded"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.4, ease: "circOut" }}
                              className="space-y-3"
                            >
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                {Object.entries(VIDEO_STYLES).map(([key, style]) => (
                                  <button
                                    key={key}
                                    onClick={() => setSelectedVideoStyle(key as any)}
                                    className={`p-2.5 rounded-lg border transition-all text-left group relative overflow-hidden ${selectedVideoStyle === key
                                      ? 'bg-[#c8f135]/10 border-[#c8f135] shadow-[0_0_15px_rgba(200,241,53,0.2)]'
                                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                      } `}
                                  >
                                    <div className="flex items-start gap-2 relative z-10">
                                      <span className="text-xl flex-shrink-0 group-hover:scale-110 transition-transform">{style.icon}</span>
                                      <div className="flex-1 min-w-0">
                                        <div className={`text-[9px] font-black tracking-wider uppercase ${selectedVideoStyle === key ? 'text-[#c8f135]' : 'text-gray-300'
                                          } `}>
                                          {style.name}
                                        </div>
                                        <div className="text-[7px] text-gray-500 mt-0.5 leading-tight font-mono uppercase">
                                          {style.description}
                                        </div>
                                      </div>
                                    </div>
                                    {selectedVideoStyle === key && (
                                      <motion.div 
                                        layoutId="activeStyle"
                                        className="absolute inset-0 bg-gradient-to-br from-[#c8f135]/5 to-transparent pointer-events-none"
                                      />
                                    )}
                                  </button>
                                ))}
                              </div>
                              
                              {/* "Packet" Style Detail View */}
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-3 bg-gradient-to-br from-[#c8f135]/10 to-transparent border border-[#c8f135]/20 rounded-xl relative overflow-hidden"
                              >
                                <div className="absolute top-0 right-0 p-2 opacity-10">
                                  <Sparkles size={40} className="text-[#c8f135]" />
                                </div>
                                <div className="relative z-10">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-xs font-black text-[#c8f135] uppercase tracking-[0.2em]">Active Packet: {VIDEO_STYLES[selectedVideoStyle].name}</span>
                                    <div className="h-px flex-1 bg-[#c8f135]/20" />
                                  </div>
                                  <p className="text-[9px] text-gray-300 leading-relaxed font-medium italic">
                                    {VIDEO_STYLES[selectedVideoStyle].modifier}
                                  </p>
                                </div>
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="flex justify-between items-center mb-1.5 gap-2">
                        <label className="text-[#999] font-sans font-bold text-[10px] tracking-wide block uppercase truncate">Scene {activeSceneIndex + 1} — Visual Prompt</label>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => analyzeScenePrompt(activeSceneIndex)}
                            disabled={isRegeneratingPart}
                            className="text-[9px] font-sans font-bold tracking-wider px-2 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5"
                          >
                            <Search size={11} />
                            Analysis
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

                      <div className="flex flex-col gap-3">
                        <div className="bg-black/60 rounded-xl border border-white/10 overflow-hidden mb-1">
                          <div className="text-[10px] font-mono text-[#c8f135] uppercase tracking-widest px-3 pt-2.5 pb-1.5 border-b border-[#c8f135]/10 flex justify-between items-center">
                            <span>Dialogue</span>
                            <span className="text-gray-600">{scenes[activeSceneIndex]?.timestamp}</span>
                          </div>
                          <textarea
                            value={scenes[activeSceneIndex]?.text || ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                              const newText = e.target.value;
                              setScenes((prev: Scene[]) => prev.map((s: Scene, i: number) =>
                                i === activeSceneIndex ? { ...s, text: newText } : s
                              ));
                            }}
                            placeholder="No dialogue yet. Generate a script or type here..."
                            className="w-full bg-transparent px-3 py-2.5 font-sans text-sm text-[#c8f135] italic font-bold leading-relaxed focus:outline-none resize-none min-h-[72px]"
                          />
                        </div>

                        <div className="relative">
                          <textarea
                            value={videoPrompt}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                              setVideoPrompt(e.target.value);
                              setScenes((prev: Scene[]) => prev.map((s: Scene, i: number) => i === activeSceneIndex ? { ...s, prompt: e.target.value } : s));
                            }}
                            className="w-full h-32 bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-sans text-[13px] text-gray-300 focus:outline-none focus:border-[#c8f135] resize-none leading-relaxed"
                            placeholder="Realistic UGC video prompt will be refined here..."
                          />
                        </div>

                        {/* SHIFTED VIDEO PRODUCTION CONTROLS */}
                        <div className="p-4 bg-[#c8f135]/5 border border-[#c8f135]/10 rounded-2xl space-y-4 animate-in fade-in slide-in-from-bottom-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block px-1">Shot Duration</span>
                              <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                                {(['4', '6', '8'] as const).map(sec => (
                                  <button 
                                    key={sec} 
                                    type="button"
                                    onClick={() => setDurationSeconds(sec as any)} 
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${durationSeconds === sec ? 'bg-[#c8f135] text-black shadow-[0_0_15px_rgba(200,241,53,0.2)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                  >
                                    {sec}s
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block px-1">Aspect Ratio</span>
                              <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                                {(['9:16', '16:9', '1:1'] as const).map(ratio => (
                                  <button 
                                    key={ratio} 
                                    type="button"
                                    onClick={() => setAspectRatio(ratio)} 
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${aspectRatio === ratio ? 'bg-[#c8f135] text-black shadow-[0_0_15px_rgba(200,241,53,0.2)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                  >
                                    {ratio}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {videoTimedOut && (
                            <button
                              onClick={() => { setVideoTimedOut(false); generateVideo(); }}
                              className="w-full py-3 mb-2 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/30 animate-pulse"
                            >
                              <RotateCcw size={16} /> Timed Out — Retry Generate
                            </button>
                          )}

                          <Button 
                            onClick={() => generateVideo()} 
                            disabled={isGeneratingVideo || !scenes[activeSceneIndex]?.isApproved} 
                            loading={isGeneratingVideo} 
                            className={`w-full py-5 rounded-2xl shadow-2xl transition-all duration-500 ${scenes[activeSceneIndex]?.isApproved ? 'bg-[#c8f135] text-black scale-100 hover:scale-[1.02]' : 'bg-white/5 text-gray-500'}`}
                          >
                            <div className="flex items-center justify-center gap-3">
                              {scenes[activeSceneIndex]?.isApproved ? (
                                <>
                                  <PlayCircle size={20} fill="currentColor" />
                                  <span className="text-sm font-black uppercase tracking-[0.1em]">Produce Scene {activeSceneIndex + 1} ({getCurrentCost(false)} Shorts)</span>
                                </>
                              ) : (
                                <>
                                  <Lock size={16} />
                                  <span className="text-xs font-bold uppercase tracking-widest text-[#999]">Approve Scene to Produce</span>
                                </>
                              )}
                            </div>
                          </Button>
                          
                        </div>
                      </div>
                    </div>

                      <div className="pt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative group">
                            <input type="file" accept="audio/*" onChange={handleAudioUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                            <Button variant="secondary" className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                              <Upload size={11} /> Upload Voice
                            </Button>
                          </div>
                          <Button onClick={generateVoice} disabled={!script || isGeneratingAudio} loading={isGeneratingAudio} variant="secondary" className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest">
                            Synthesize Audio
                          </Button>
                        </div>
                        <Button onClick={() => generateImage()} disabled={isGeneratingImage || !productDetails} loading={isGeneratingImage} variant="secondary" className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                          <Camera size={11} /> Generate Influencer Reference <span className="ml-1 opacity-60">· {getImageCost()} Shorts</span>
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
                </Card>}
              </div>

              {/* Studio Monitor removed — output shown in floating chatbox overlay */}
              {false && <Card
                  title="Studio Monitor"
                  icon={Video}
                  contentClassName="p-0"
                  className="lg:h-[calc(100vh-10px)] lg:min-h-[700px] h-[700px] overflow-hidden"
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
                    ) : null
                  }
                >
                  <div className="w-full h-full relative group">
                    {renderMode === 'image' ? (
                      <>
                        {/* Full Background Preview */}
                        <div className="absolute inset-0">
                          {isGeneratingImage && <UGCProcessingOverlay type="image" message={imageProgressMsg} />}
                          {isRegeneratingImage && <UGCProcessingOverlay type="image" />}
                          {generatedImg ? (
                            <>
                              <img src={generatedImg} className="w-full h-full object-cover transition-transform duration-700" alt="Generated" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
                            </>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 opacity-60">
                              <div className="relative group/camera">
                                <div className="absolute inset-0 bg-[#c8f135]/10 rounded-full blur-xl animate-pulse group-hover/camera:bg-[#c8f135]/20 transition-all"></div>
                                <div className="w-16 h-16 rounded-full border border-white/5 bg-black/50 backdrop-blur-lg flex items-center justify-center relative z-10 hover:border-[#c8f135]/50 transition-all cursor-pointer">
                                  <Camera size={24} className="text-[#c8f135] opacity-50 group-hover/camera:opacity-100" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => handleImageUpload(e, 'generated')}
                                  />
                                </div>
                              </div>
                              <div className="text-center space-y-2 px-6">
                                <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Generate Influencer Reference</p>
                                <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest max-w-[200px] mx-auto">Click generate below or upload a frame</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Controls Overlay */}
                        <div className="absolute bottom-0 inset-x-0 px-5 pb-12 pt-20 bg-gradient-to-t from-[#020202] via-[#020202]/90 to-transparent flex flex-col space-y-4 z-10 pointer-events-none">
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

                          <div className="grid grid-cols-2 gap-2 pointer-events-auto">
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

                          <Button onClick={generateImage} disabled={isGeneratingImage || !productDetails} loading={isGeneratingImage} className="w-full py-3.5 pointer-events-auto">Generate Influencer · {getImageCost()} Shorts</Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Full Background Preview for Video */}
                        <div className="absolute inset-0 bg-[#050505] overflow-hidden flex flex-col">
                          {videoError && (
                            <div className="absolute inset-x-0 top-10 p-4 text-center z-20 bg-black/80 backdrop-blur-sm">
                              <AlertCircle size={24} className="text-red-500 mb-2 mx-auto" />
                              <p className="text-[8px] text-red-400 font-mono uppercase tracking-widest leading-relaxed">
                                {videoError}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex-1 relative flex items-center justify-center bg-black/20 p-4">
                            {generatedVideo ? (
                              <div className="relative h-full aspect-[9/16] bg-black shadow-2xl overflow-hidden group/video rounded-2xl border border-white/10">
                                <video 
                                  ref={studioVideoRef}
                                  src={generatedVideo} 
                                  className="w-full h-full object-cover" 
                                  onPlay={() => setIsStudioVideoPlaying(true)}
                                  onPause={() => setIsStudioVideoPlaying(false)}
                                  loop
                                />
                                
                                <button 
                                  onClick={() => {
                                    if (studioVideoRef.current) {
                                      if (isStudioVideoPlaying) studioVideoRef.current.pause();
                                      else studioVideoRef.current.play();
                                    }
                                  }}
                                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#c8f135]/90 text-black rounded-full flex items-center justify-center transition-all duration-300 z-40 ${isStudioVideoPlaying ? 'opacity-0 scale-75 group-hover/video:opacity-100 group-hover:video:scale-100' : 'opacity-100 scale-100'} hover:scale-110 hover:bg-[#c8f135] shadow-[0_0_30px_rgba(200,241,53,0.4)]`}
                                >
                                  {isStudioVideoPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                                </button>
                                
                                {/* Hover Controls Overlay */}
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4 opacity-0 group-hover/video:opacity-100 transition-all duration-300 z-30 pointer-events-auto">
                                  <div className="flex items-center gap-3">
                                    <button 
                                      onClick={() => {
                                        if (studioVideoRef.current) {
                                          studioVideoRef.current.currentTime = 0;
                                          studioVideoRef.current.play();
                                          setIsStudioVideoPlaying(true);
                                        }
                                      }}
                                      className="w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
                                      title="Restart"
                                    >
                                      <RotateCcw size={20} />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        if (studioVideoRef.current) {
                                          if (isStudioVideoPlaying) studioVideoRef.current.pause();
                                          else studioVideoRef.current.play();
                                        }
                                      }}
                                      className="w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
                                      title={isStudioVideoPlaying ? "Pause" : "Play"}
                                    >
                                      {isStudioVideoPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                                    </button>
                                  </div>

                                  <div className="flex flex-col gap-2 w-full px-8">
                                    <button 
                                      onClick={() => addToTimeline({ id: Date.now().toString(), type: 'video', url: generatedVideo })} 
                                      className="w-full py-3 bg-[#c8f135] text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg"
                                    >
                                      <Plus size={14} /> Deploy to Timeline
                                    </button>
                                    
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
                                          console.error("Error downloading video", err);
                                        }
                                      }}
                                      className="w-full py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                                    >
                                      <Download size={14} /> Download MP4
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : isGeneratingVideo ? (
                              <UGCProcessingOverlay type="video" message={videoProgressMsg} />
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-6 opacity-60">
                                <div className="relative">
                                  <div className="absolute inset-0 border border-[#c8f135] rounded-full animate-ping opacity-20"></div>
                                  <div className="absolute inset-0 bg-[#c8f135]/10 rounded-full blur-xl animate-pulse"></div>
                                  <div className="w-16 h-16 rounded-full border border-white/5 bg-black/50 backdrop-blur-lg flex items-center justify-center relative z-10 overflow-hidden">
                                    <div className="absolute inset-0 border-t border-[#c8f135] rounded-full animate-spin opacity-30" style={{ animationDuration: '3s' }}></div>
                                    <Video size={20} className="text-[#c8f135] opacity-80" />
                                  </div>
                                </div>
                                <div className="text-center space-y-2">
                                  <p className="font-black text-white text-[10px] uppercase tracking-[0.2em] relative inline-block">
                                    <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#c8f135] animate-pulse"></span>
                                    Your video is starting to generate
                                  </p>
                                  <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest leading-relaxed max-w-[220px] mx-auto">
                                    Prepare a scene script to make your realistic UGC ad.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* AI Context Display Area (Below Video) */}
                          <div className="px-5 pb-6 pt-2 bg-gradient-to-t from-black to-transparent">
                            {videoPrompt && (
                              <div className="p-3 bg-white/5 border border-white/10 rounded-xl mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <BrainCircuit size={10} className="text-[#c8f135]" />
                                  <span className="text-[8px] font-black text-[#c8f135] uppercase tracking-[0.2em]">
                                    {sourceVideo ? 'Character Movement' : 'AI Context'}
                                  </span>
                                </div>
                                <p className="text-[9px] text-gray-400 italic font-medium leading-relaxed line-clamp-2">
                                  {videoPrompt}
                                </p>
                              </div>
                            )}

                            {/* Mode Switcher */}
                            <div className="flex bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/5 mb-2">
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
                            <div className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] text-center py-1">
                                Studio Output Monitor
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </Card>}
            </div>


            </div>
          ) : null}
          </div>

          {/* ── Floating Chatbox Overlay (MarketingStudio-style) ── */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 px-4 pb-4 w-full max-w-4xl">
            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="bg-[#0e0e10]/95 backdrop-blur-2xl border border-[#1e1e24] rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.6)] overflow-visible"
            >
              {/* ── Tab switcher: Script | Video ── */}
              <div className="relative z-50 flex items-center gap-0 border-b border-[#1e1e24]">
                {([
                  { id: 'script' as const, label: activeTab === 'podcast' ? 'Podcast Script' : activeTab === 'talking-head' ? 'Image' : 'Script', icon: activeTab === 'talking-head' ? Camera : FileText },
                  { id: 'video' as const, label: activeTab === 'podcast' ? 'Podcast Clip' : activeTab === 'talking-head' ? 'Talking Head Video' : 'Video', icon: Film },
                ] as {id: 'script'|'video', label: string, icon: any}[]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setChatTab(tab.id); setIsChatCollapsed(false); }}
                    className={`flex items-center gap-1.5 px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 ${
                      chatTab === tab.id
                        ? 'border-[#c8f135] text-[#c8f135] bg-[#c8f135]/5'
                        : 'border-transparent text-white/30 hover:text-white/60'
                    }`}
                  >
                    <tab.icon size={10} />
                    {tab.label}
                  </button>
                ))}
                {isAdmin && (
                  <button onClick={() => { setIsAdmin(false); showToast('Admin mode OFF', 'error'); }}
                    className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00ffe0]/15 border border-[#00ffe0]/30 text-[#00ffe0] text-[7px] font-black uppercase tracking-widest hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-all"
                    title="Admin mode ON — click to deactivate">
                    <ShieldCheck size={8} /> Admin
                  </button>
                )}
                {/* error pill pushed right */}
                {videoError && (
                  <div className="ml-auto mr-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                    <AlertCircle size={9} className="text-red-400" />
                    <span className="text-[8px] font-black text-red-400 uppercase tracking-widest truncate max-w-[140px]">{videoError}</span>
                  </div>
                )}
                {/* Script-tab dropdowns pushed right */}
                {chatTab === 'script' && (
                  <div className="ml-auto flex items-center gap-1.5 px-3 flex-wrap justify-end">
                    <Dropdown label="" value={language} options={LANGUAGES} onChange={setLanguage} icon={Box} direction="up" />
                    <Dropdown label="" value={voice} options={VOICES} onChange={setVoice} icon={Volume2} direction="up" />
                    <Dropdown label="" value={scriptDuration} options={['8 seconds', '16 seconds', '24 seconds', '36 seconds']} onChange={setScriptDuration} icon={Clock} direction="up" />
                    <Dropdown label="" value={SCRIPT_TONES[selectedScriptTone]?.name || selectedScriptTone} options={Object.values(SCRIPT_TONES).map((t: any) => t.name)} onChange={(name: string) => { const key = Object.keys(SCRIPT_TONES).find(k => (SCRIPT_TONES as any)[k].name === name); if (key) setSelectedScriptTone(key); }} icon={Sparkles} direction="up" />
                  </div>
                )}
                {/* Collapse / expand toggle — far right */}
                <button
                  onClick={() => setIsChatCollapsed(c => !c)}
                  title={isChatCollapsed ? 'Expand chat' : 'Collapse chat'}
                  className="ml-auto mr-2 shrink-0 w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-[#c8f135] hover:border-[#c8f135]/40 transition-all"
                >
                  <motion.div animate={{ rotate: isChatCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={11} />
                  </motion.div>
                </button>
              </div>

              {/* Collapsible body */}
              <motion.div
                animate={{ height: isChatCollapsed ? 0 : 'auto', opacity: isChatCollapsed ? 0 : 1 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >

              {/* ════════════════ SCRIPT TAB ════════════════ */}
              {chatTab === 'script' && <React.Fragment>

              {/* Performance Montage preview layer — shown above textarea when output exists */}
              {(generatedVideo || generatedImg) && (
                <div className="flex items-center gap-3 px-4 pt-3">
                  <div
                    className="relative shrink-0 rounded-xl overflow-hidden border border-[#1e1e24] bg-black cursor-pointer group/thumb"
                    style={{ width: 56, height: 56 }}
                    onClick={() => setIsExpandModalOpen(true)}
                    title={generatedVideo ? 'Click to expand & download' : 'Click to expand'}
                  >
                    {generatedVideo ? (
                      <video src={generatedVideo} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                    ) : (
                      <img src={generatedImg!} className="w-full h-full object-cover" alt="output" />
                    )}
                    <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-black/60 flex items-center justify-center transition-all">
                      {generatedVideo ? (
                        <>
                          <Play size={14} className="text-white/80 group-hover/thumb:hidden" fill="currentColor" />
                          <Maximize size={14} className="text-[#c8f135] hidden group-hover/thumb:block" />
                        </>
                      ) : (
                        <>
                          <Camera size={12} className="text-white/80 group-hover/thumb:hidden" />
                          <Maximize size={12} className="text-[#c8f135] hidden group-hover/thumb:block" />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-black text-[#c8f135] uppercase tracking-widest mb-0.5">
                      {generatedVideo ? 'Latest Video' : 'Latest Image'}
                    </p>
                    <p className="text-[8px] text-white/30 font-mono uppercase tracking-widest truncate">
                      {isGeneratingVideo ? (videoProgressMsg || 'Generating…') : 'Ready · Click to expand'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsExpandModalOpen(true)}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1"
                  >
                    <Maximize size={9} /> View
                  </button>
                  <button
                    onClick={async () => {
                      const url = generatedVideo || generatedImg;
                      if (!url) return;
                      try {
                        const res = await fetch(url);
                        const blob = await res.blob();
                        const a = document.createElement('a');
                        a.href = window.URL.createObjectURL(blob);
                        a.download = `ugc_output_${Date.now()}.${generatedVideo ? 'mp4' : 'png'}`;
                        document.body.appendChild(a); a.click(); document.body.removeChild(a);
                      } catch (e) { console.error(e); }
                    }}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-white/50 hover:text-[#c8f135] hover:border-[#c8f135]/30 transition-all flex items-center gap-1"
                  >
                    <Download size={9} /> Save
                  </button>
                </div>
              )}

              {/* Split scenes dialog panel */}
              {splitScenes.length > 0 && (
                <div className="mx-4 mt-2 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  {/* Tab headers */}
                  <div className="flex border-b border-white/10">
                    {splitScenes.map((sc, i) => (
                      <button key={i} onClick={() => { setActiveSplitTab(i); setSelectedPromptVariant(0); }}
                        className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${
                          activeSplitTab === i ? 'bg-[#c8f135]/15 text-[#c8f135] border-b-2 border-[#c8f135]' : 'text-white/30 hover:text-white/60'
                        }`}>
                        {sc.label}
                      </button>
                    ))}
                    <button onClick={() => { setSplitScenes([]); setSpokenDialog(''); }} className="px-2 text-white/20 hover:text-white/50 transition-colors"><X size={9} /></button>
                  </div>
                  {/* Active scene dialog + prompt variant picker */}
                  <div className="p-2.5 space-y-2">
                    <p className="text-[9px] text-white/70 font-mono leading-relaxed">{splitScenes[activeSplitTab]?.dialog}</p>

                    {activeTab === 'podcast' && (() => {
                      const sceneIdx = activeSplitTab;
                      const baseVisual = scenes[sceneIdx]?.visualCue || 'Two-host podcast setup with Host 1 and Host 2 at microphones, natural studio lighting.';
                      const sc = splitScenes[activeSplitTab];
                      const dialogue = sc?.dialog || '';
                      const variants = [
                        { label: '🎥 Wide Shot', prompt: `Wide two-shot: ${baseVisual} Both hosts visible, relaxed posture, natural conversation. The hosts are speaking: "${dialogue}"` },
                        { label: '🎙️ Host 1 Close-up', prompt: `Medium close-up on HOST 1: ${baseVisual} HOST 1 is speaking, HOST 2 slightly blurred in background, eye contact with camera. The hosts are speaking: "${dialogue}"` },
                        { label: '📐 Over-Shoulder', prompt: `Over-shoulder shot from behind HOST 2 looking at HOST 1: ${baseVisual} Dynamic conversational angle, product visible on desk. The hosts are speaking: "${dialogue}"` },
                      ];
                      return (
                        <div className="space-y-1.5">
                          <p className="text-[7px] text-white/30 font-black uppercase tracking-widest">Video Prompt — Pick Camera Angle</p>
                          <div className="flex flex-col gap-1">
                            {variants.map((v, i) => (
                              <button
                                key={i}
                                onClick={() => setSelectedPromptVariant(i)}
                                className={`text-left px-2.5 py-2 rounded-lg text-[8px] font-mono leading-relaxed transition-all border ${
                                  selectedPromptVariant === i
                                    ? 'bg-[#c8f135]/15 border-[#c8f135]/50 text-[#c8f135]'
                                    : 'bg-white/3 border-white/8 text-white/40 hover:text-white/70 hover:border-white/20'
                                }`}
                              >
                                <span className="font-black mr-1.5">{v.label}</span>
                                <span className="opacity-70 line-clamp-2">{v.prompt.substring(0, 90)}…</span>
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => {
                              const selected = variants[selectedPromptVariant];
                              if (selected) generateVideo(selected.prompt);
                            }}
                            disabled={isGeneratingVideo}
                            className="mt-1 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#c8f135]/15 border border-[#c8f135]/30 text-[#c8f135] text-[8px] font-black uppercase tracking-widest hover:bg-[#c8f135] hover:text-black transition-all disabled:opacity-30"
                          >
                            {isGeneratingVideo
                              ? <><Loader2 size={9} className="animate-spin" />{videoProgressMsg || 'Rendering…'}</>
                              : <><Film size={9} /> Make Video · {variants[selectedPromptVariant]?.label}</>}
                          </button>
                        </div>
                      );
                    })()}

                    {activeTab !== 'podcast' && (
                      <button
                        onClick={() => {
                          const sc = splitScenes[activeSplitTab];
                          if (!sc) return;
                          generateVideo([videoPrompt, sc.dialog].filter(Boolean).join(' '));
                        }}
                        disabled={isGeneratingVideo}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#c8f135]/15 border border-[#c8f135]/30 text-[#c8f135] text-[8px] font-black uppercase tracking-widest hover:bg-[#c8f135] hover:text-black transition-all disabled:opacity-30"
                      >
                        {isGeneratingVideo
                          ? <><Loader2 size={9} className="animate-spin" />{videoProgressMsg || 'Rendering…'}</>
                          : <><Check size={9} /> Approve {splitScenes[activeSplitTab]?.label} · Make Video</>}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Attached reference image thumbnail */}
              {attachedRefImage && (
                <div className="flex items-center gap-2 px-4 pt-2">
                  <div className="relative group/att">
                    <img src={attachedRefImage} alt="ref" className="w-10 h-10 rounded-lg object-cover border border-[#c8f135]/40 shadow-md" />
                    <button
                      onClick={() => setAttachedRefImage(null)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity"
                    >
                      <X size={8} className="text-white" />
                    </button>
                  </div>
                  <span className="text-[8px] text-[#c8f135] font-black uppercase tracking-widest">Image attached · use as video reference</span>
                </div>
              )}

              {/* Script textarea */}
              <div className="relative px-4 pt-2">
                {(isGeneratingScript || isExtractingPrompts) && (
                  <div className="absolute inset-x-4 inset-y-2 z-10 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center gap-2">
                    <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-[#c8f135] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
                    <p className="text-[10px] font-mono text-[#c8f135] uppercase tracking-widest animate-pulse">{isExtractingPrompts ? 'Extracting prompts...' : activeTab === 'podcast' ? 'Writing podcast...' : 'Writing script...'}</p>
                  </div>
                )}
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className="w-full h-16 bg-transparent font-sans text-sm text-white/90 resize-none focus:outline-none placeholder-white/20 leading-relaxed"
                  placeholder={activeTab === 'podcast' ? 'Your podcast script will appear here — or type episode direction...' : 'Your UGC script will appear here — or type your creative direction...'}
                />
              </div>

              {/* Bottom action bar */}
              <div className="flex items-center gap-2 px-4 pb-3">
                <input
                  type="text"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder={activeTab === 'podcast' ? 'Podcast direction (topic, host angle, product talking points...)' : 'Creative direction (e.g. energetic demo, focus on results...)'}
                  className="flex-1 bg-white/5 border border-[#1e1e24] rounded-xl px-3 py-2 text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-[#c8f135]/40 transition-colors"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !isGeneratingScript) generateScript(); }}
                />
                <button
                  onClick={generateScript}
                  disabled={isGeneratingScript}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${isGeneratingScript ? 'bg-white/5 text-white/20' : 'bg-[#c8f135]/15 border border-[#c8f135]/30 text-[#c8f135] hover:bg-[#c8f135] hover:text-black'}`}
                >
                  {isGeneratingScript ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  {activeTab === 'podcast' ? 'Podcast' : 'Script'}
                </button>
                <button
                  onClick={() => {
                    generateVoice();
                    if (!script) return;
                    setSpokenDialog(script);
                    // Parse script into scenes by [H:MM - H:MM] or [0:00 - 0:08] timestamps
                    const segmentRegex = /\[([\d:]+\s*[-–]\s*[\d:]+)\][^:]*:\s*([\s\S]*?)(?=\[|$)/gi;
                    const parsed: {label: string; dialog: string}[] = [];
                    let m;
                    let idx = 0;
                    while ((m = segmentRegex.exec(script)) !== null) {
                      const timeRange = m[1].trim();
                      const text = m[2].trim();
                      if (text) parsed.push({ label: `Scene ${++idx} [${timeRange}]`, dialog: text });
                    }
                    // Fallback: split on double newline if no timestamps found
                    if (parsed.length === 0) {
                      script.split(/\n{2,}/).forEach((chunk, i) => {
                        const t = chunk.trim();
                        if (t) parsed.push({ label: `Scene ${i + 1}`, dialog: t });
                      });
                    }
                    if (parsed.length > 0) { setSplitScenes(parsed); setActiveSplitTab(0); }
                  }}
                  disabled={!script || isGeneratingAudio}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${!script || isGeneratingAudio ? 'bg-white/5 text-white/20' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'}`}
                >
                  {isGeneratingAudio ? <Loader2 size={10} className="animate-spin" /> : <Scissors size={10} />}
                  Split
                </button>
              </div>
              </React.Fragment>}

              {/* ════════════════ TALKING HEAD VIDEO TAB ════════════════ */}
              {chatTab === 'video' && activeTab === 'talking-head' && (
                <div className="p-4 space-y-3">
                  {/* Script textarea */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Hook / Script</p>
                      <span className="text-[7px] text-white/20 font-mono">{thScript.length}/400 · under 60 words = best lip sync</span>
                    </div>
                    <textarea
                      value={thScript}
                      onChange={e => setThScript(e.target.value)}
                      placeholder="Write what the creator says to camera — hook first, then sell. Keep it punchy."
                      rows={3}
                      className="w-full bg-white/5 border border-[#1e1e24] rounded-xl px-3 py-2.5 text-[11px] text-white/90 placeholder-white/20 focus:outline-none focus:border-[#c8f135]/40 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Settings row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="text-[7px] font-black text-white/25 uppercase tracking-widest">Engine</span>
                      {([['veo_fast', '⚡ Fast'] , ['veo3', '🎬 HQ']] as const).map(([val, lbl]) => (
                        <button key={val} onClick={() => setThEngine(val)}
                          className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${thEngine === val ? 'bg-[#c8f135] text-black border-[#c8f135]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                        >{lbl}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[7px] font-black text-white/25 uppercase tracking-widest">Ratio</span>
                      {(['9:16', '16:9'] as const).map(r => (
                        <button key={r} onClick={() => setThAspectRatio(r)}
                          className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${thAspectRatio === r ? 'bg-[#c8f135] text-black border-[#c8f135]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                        >{r}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[7px] font-black text-white/25 uppercase tracking-widest">Dur</span>
                      {(['4', '6', '8'] as const).map(s => (
                        <button key={s} onClick={() => setThDuration(s)}
                          className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${thDuration === s ? 'bg-[#c8f135] text-black border-[#c8f135]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                        >{s}s</button>
                      ))}
                    </div>
                  </div>

                  {/* Warning if no image yet */}
                  {!thGeneratedImg && (
                    <p className="text-[8px] text-amber-400/70 font-mono uppercase tracking-widest text-center">⚠ Generate the reference image first (Image tab → sidebar)</p>
                  )}

                  {/* Generate button */}
                  <button
                    onClick={generateTalkingHeadVideo}
                    disabled={thIsGeneratingVideo || !thGeneratedImg || !thScript.trim()}
                    className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                      thIsGeneratingVideo ? 'bg-white/5 text-white/20 cursor-not-allowed' :
                      (!thGeneratedImg || !thScript.trim()) ? 'bg-white/5 text-white/10 cursor-not-allowed border border-white/5' :
                      'bg-[#c8f135] text-black hover:bg-[#d4ff3a] shadow-[0_4px_16px_rgba(200,241,53,0.3)]'
                    }`}
                  >
                    {thIsGeneratingVideo
                      ? <><Loader2 size={12} className="animate-spin" />{thVideoProgress || 'Generating…'}</>
                      : <><Film size={12} /> Generate Talking Head Video · {getCurrentCost(false)} Shorts</>}
                  </button>
                </div>
              )}

              {/* ════════════════ VIDEO TAB ════════════════ */}
              {chatTab === 'video' && activeTab !== 'talking-head' && (
                <div className="p-4 space-y-3">

                  {/* Model selector row */}
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest shrink-0">Mode</span>
                    {([
                      { id: 'veo_fast' as const, label: 'Veo Fast', sub: '~90s · 8sec', icon: Zap },
                      { id: 'veo3'    as const, label: 'Veo 3',    sub: '~3min · HQ',  icon: Film },
                      { id: 'montage' as const, label: 'Montage',  sub: 'AI clips',     icon: Sparkles },
                    ] as {id:'veo_fast'|'veo3'|'montage', label:string, sub:string, icon:any}[]).map(m => (
                      <button key={m.id} onClick={() => setVideoGenMode(m.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                          videoGenMode === m.id
                            ? 'bg-[#c8f135]/15 border-[#c8f135]/50 text-[#c8f135]'
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                        }`}>
                        <m.icon size={10} />
                        <span>{m.label}</span>
                        <span className="text-[7px] opacity-50 normal-case font-mono">{m.sub}</span>
                      </button>
                    ))}
                  </div>

                  {/* Video prompt textarea */}
                  {videoGenMode !== 'montage' && (
                    <div className="relative">
                      <textarea
                        value={videoPrompt}
                        onChange={e => setVideoPrompt(e.target.value)}
                        rows={3}
                        className="w-full bg-white/5 border border-[#1e1e24] rounded-xl px-3 py-2.5 text-[11px] text-white/90 placeholder-white/20 focus:outline-none focus:border-[#c8f135]/40 transition-colors resize-none leading-relaxed"
                        placeholder={videoGenMode === 'veo_fast'
                          ? 'Describe your video scene — Veo Fast generates an 8-sec clip…'
                          : 'Describe your video scene — Veo 3 generates a high-quality clip…'}
                      />
                      {/* Generate from script shortcut */}
                      {script && (
                        <button
                          onClick={() => setVideoPrompt(script.replace(/\[[^\]]+\]/g, '').replace(/HOOK:|PAYOFF:|Scene \d+:/gi, '').trim())}
                          className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-[#c8f135]/10 border border-[#c8f135]/20 text-[7px] font-black text-[#c8f135] uppercase tracking-widest hover:bg-[#c8f135]/20 transition-all"
                        >
                          From Script
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Montage mode: show the full montage options panel ── */}
                  {videoGenMode === 'montage' && (
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowVideoMontageOptions(!showVideoMontageOptions)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${showVideoMontageOptions ? 'bg-[#c8f135]/10 border-[#c8f135]/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${showVideoMontageOptions ? 'bg-[#c8f135] text-black' : 'bg-white/10 text-gray-400'}`}><Sparkles size={13} /></div>
                          <div className="text-left">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${showVideoMontageOptions ? 'text-[#c8f135]' : 'text-white'}`}>Performance Montage</p>
                            <p className="text-[8px] text-gray-500 font-mono uppercase tracking-tighter">AI-Generated Product Hooks</p>
                          </div>
                        </div>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${showVideoMontageOptions ? 'rotate-180 text-[#c8f135]' : 'text-gray-500'}`} />
                      </button>

                      {showVideoMontageOptions && (
                        <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-2 animate-in slide-in-from-top-2 duration-300">
                          {isGeneratingMontageOptions ? (
                            <div className="flex items-center gap-3 animate-pulse py-2">
                              <div className="w-4 h-4 rounded-full bg-[#c8f135]/20 animate-ping" />
                              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Analyzing Product...</span>
                            </div>
                          ) : montageOptions.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                              {montageOptions.map((option, optI) => (
                                <button key={`vt-opt-${optI}`}
                                  onClick={() => { setSelectedMontageOption(option); setMontagePrompt(option.prompt); setIsMontageApproved(false); }}
                                  disabled={isGeneratingVideo}
                                  className={`flex flex-col gap-1.5 p-2.5 border rounded-xl transition-all text-left ${selectedMontageOption?.id === option.id ? 'bg-[#c8f135]/10 border-[#c8f135]/50 text-[#c8f135]' : 'bg-white/5 border-white/10 hover:border-[#c8f135]/30 text-white/60'}`}
                                >
                                  <span className="text-[9px] font-black uppercase tracking-wide truncate">{option.title}</span>
                                  <span className="text-[7px] font-mono text-white/30">Performance Clip</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[8px] text-white/20 font-mono text-center py-3 uppercase tracking-widest">Upload a product image to generate montage options</p>
                          )}

                          {selectedMontageOption && (
                            <div className="mt-2 space-y-2 p-3 bg-white/5 border border-white/10 rounded-xl">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">{selectedMontageOption.title}</span>
                                <button onClick={() => setIsMontageApproved(!isMontageApproved)}
                                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${isMontageApproved ? 'bg-[#c8f135] text-black' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}>
                                  {isMontageApproved && <Check size={10} />} {isMontageApproved ? 'Approved' : 'Approve'}
                                </button>
                              </div>
                              <textarea value={montagePrompt} onChange={e => { setMontagePrompt(e.target.value); setIsMontageApproved(false); setMontageGeneratedImg(''); }}
                                rows={2} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[11px] text-white focus:outline-none focus:border-[#c8f135] resize-none" />

                              {/* Step 1: preview image */}
                              {montageGeneratedImg ? (
                                <div className="relative rounded-lg overflow-hidden border border-[#c8f135]/40 group/mimg">
                                  <img src={montageGeneratedImg} alt="Reference" className="w-full max-h-[160px] object-cover" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2">
                                    <span className="text-[7px] font-mono text-[#c8f135] uppercase tracking-widest">✓ Reference Image Ready — now animate to video</span>
                                  </div>
                                  <button onClick={() => setMontageGeneratedImg('')} className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center hover:bg-red-500/80 transition-colors">
                                    <X size={9} className="text-white" />
                                  </button>
                                </div>
                              ) : isGeneratingMontageImg ? (
                                <div className="flex items-center gap-2 py-2 animate-pulse">
                                  <Loader2 size={11} className="animate-spin text-[#c8f135]" />
                                  <span className="text-[8px] font-mono text-[#c8f135] uppercase tracking-widest">{montageImgProgressMsg || 'Generating preview...'}</span>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Generate button — two-step for montage */}
                  {videoGenMode === 'montage' && selectedMontageOption ? (
                    <div className="flex flex-col gap-1.5">
                      {/* Step 1: Generate Image */}
                      <button
                        onClick={() => generateMontageReferenceImage({ ...selectedMontageOption, prompt: montagePrompt })}
                        disabled={isGeneratingMontageImg || isGeneratingVideo || !isMontageApproved}
                        className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          isGeneratingMontageImg || !isMontageApproved ? 'bg-white/5 text-white/20 cursor-not-allowed'
                          : montageGeneratedImg ? 'bg-white/10 text-white/60 border border-white/15 hover:bg-white/15'
                          : 'bg-purple-600 text-white shadow-[0_4px_15px_rgba(147,51,234,0.3)] hover:brightness-110'
                        }`}
                      >
                        {isGeneratingMontageImg
                          ? <><Loader2 size={11} className="animate-spin" />{montageImgProgressMsg || 'Generating Image…'}</>
                          : <><Camera size={11} />{montageGeneratedImg ? `Regenerate Image · ${getImageCost()} Shorts` : `Step 1 — Preview Image · ${getImageCost()} Shorts`}</>
                        }
                      </button>
                      {/* Step 2: Animate to Video */}
                      <button
                        onClick={() => generateMontageVideo({ ...selectedMontageOption, prompt: montagePrompt })}
                        disabled={!montageGeneratedImg || isGeneratingVideo || isGeneratingMontageImg}
                        className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          isGeneratingVideo ? 'bg-white/5 text-white/20 cursor-not-allowed'
                          : !montageGeneratedImg ? 'bg-white/5 text-white/20 cursor-not-allowed'
                          : 'bg-[#c8f135] text-black shadow-[0_4px_15px_rgba(200,241,53,0.3)] hover:brightness-110'
                        }`}
                      >
                        {isGeneratingVideo
                          ? <><Loader2 size={11} className="animate-spin" />{videoProgressMsg || 'Animating…'}</>
                          : <><Film size={11} />{montageGeneratedImg ? 'Step 2 — Animate to Video' : 'Generate Image First ↑'}</>
                        }
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => generateVideo(videoPrompt || undefined)}
                      disabled={isGeneratingVideo}
                      className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        isGeneratingVideo ? 'bg-white/5 text-white/20' : 'bg-[#c8f135] text-black shadow-[0_4px_15px_rgba(200,241,53,0.3)] hover:brightness-110'
                      }`}
                    >
                      {isGeneratingVideo
                        ? <><Loader2 size={11} className="animate-spin" />{videoProgressMsg || 'Generating…'}</>
                        : <><Film size={11} />{videoGenMode === 'veo_fast' ? `Veo 3 Fast · ${getCurrentCost(false)} Shorts` : `Veo 3 HQ · ${getCurrentCost(false)} Shorts`}</>
                      }
                    </button>
                  )}
                </div>
              )}
              </motion.div>{/* end collapsible body */}
            </motion.div>
          </div>

        </div>{/* end right content area */}
      </div>{/* end main DirectorStudio flex */}
      </div>{/* end outer h-full flex flex-col */}

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
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#c8f135]">AI Upscaling Active</span>
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
                  <>
                    {generatedImg ? (
                      <img src={generatedImg} className="w-full h-full object-contain" alt="Focus" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 min-h-[300px]">
                        <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center">
                          <Camera size={22} className="text-white/15" />
                        </div>
                        <p className="text-[10px] text-white/15 font-black uppercase tracking-widest">No image generated yet</p>
                      </div>
                    )}
                    {isRegeneratingImage && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                        <Loader2 className="w-12 h-12 text-[#c8f135] animate-spin mb-4" />
                        <span className="text-white font-mono text-[10px] tracking-widest uppercase animate-pulse">Refining Image...</span>
                      </div>
                    )}
                    {isRefinementOpen && !isRegeneratingImage && (
                      <div className="absolute bottom-0 inset-x-0 p-6 lg:p-10 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-4 animate-in slide-in-from-bottom-5">
                        <div className="flex gap-3 max-w-2xl mx-auto w-full relative">
                          <input
                            type="text"
                            value={imageEditPrompt}
                            onChange={(e) => setImageEditPrompt(e.target.value)}
                            placeholder="How should we edit this image? (e.g. 'Make it evening', 'Add a neon glow')"
                            className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-white/40 focus:outline-none focus:border-[#c8f135] transition-all text-sm backdrop-blur-md pr-16"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && imageEditPrompt && !isRegeneratingImage) {
                                regenerateImage();
                              }
                            }}
                          />
                          <button
                            onClick={regenerateImage}
                            disabled={!imageEditPrompt || isRegeneratingImage}
                            className="absolute right-2 top-2 bottom-2 w-12 bg-[#c8f135] text-black rounded-xl flex items-center justify-center hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                          >
                            <Sparkles size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <video src={generatedVideo || ''} className="w-full h-full object-contain" controls autoPlay />
                )}
              </div>

              <div className="w-full lg:w-36 flex lg:flex-col gap-4 lg:gap-6 items-center justify-center lg:pt-10 pb-6 lg:pb-0">
                {renderMode === 'image' ? (
                  <>
                    <button
                      onClick={() => setIsRefinementOpen(!isRefinementOpen)}
                      className="group flex flex-col items-center gap-3"
                    >
                      <div className={`w-14 h-14 lg:w-16 lg:h-16 backdrop-blur-xl border rounded-2xl flex items-center justify-center transition-all duration-500 cursor-pointer shadow-xl group-hover:-translate-y-1 ${isRefinementOpen ? 'bg-[#c8f135] text-black border-[#c8f135]' : 'bg-white/5 text-white border-white/10 hover:bg-[#c8f135] hover:text-black'}`}>
                        <Wand2 size={24} className="lg:size-[28px]" />
                      </div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">{isRefinementOpen ? 'Cancel' : 'Edit'}</span>
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          if (!generatedImg) return;
                          const response = await fetch(generatedImg);
                          const blob = await response.blob();
                          const dUrl = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = dUrl;
                          a.download = `ugc_image_${Date.now()}.png`;
                          document.body.appendChild(a); a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(dUrl);
                        } catch (err) { console.error(err); }
                      }}
                      className="group flex flex-col items-center gap-3"
                    >
                      <div className="w-14 h-14 lg:w-16 lg:h-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-[#c8f135] hover:text-black transition-all duration-500 cursor-pointer shadow-xl group-hover:-translate-y-1">
                        <Download size={24} className="lg:size-[28px]" />
                      </div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Save PNG</span>
                    </button>
                  </>
                ) : (
                  /* Video mode — download only, no edit */
                  <div className="flex flex-col items-center gap-6 w-full">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="w-2 h-2 rounded-full bg-[#c8f135] animate-pulse" />
                      <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-[#c8f135]">Video Ready</span>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          if (!generatedVideo) return;
                          const response = await fetch(generatedVideo);
                          const blob = await response.blob();
                          const dUrl = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = dUrl;
                          a.download = `ugc_video_${Date.now()}.mp4`;
                          document.body.appendChild(a); a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(dUrl);
                        } catch (err) { console.error(err); }
                      }}
                      className="group flex flex-col items-center gap-3 w-full"
                    >
                      <div className="w-16 h-16 lg:w-20 lg:h-20 bg-[#c8f135]/10 backdrop-blur-xl border-2 border-[#c8f135]/40 rounded-3xl flex items-center justify-center text-[#c8f135] hover:bg-[#c8f135] hover:text-black transition-all duration-500 cursor-pointer shadow-[0_0_30px_rgba(200,241,53,0.15)] group-hover:shadow-[0_0_40px_rgba(200,241,53,0.4)] group-hover:-translate-y-1">
                        <Download size={28} className="lg:size-[32px]" />
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest group-hover:text-[#c8f135] transition-colors">Download</span>
                        <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">MP4 · Full Quality</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }


      {/* ── Gallery Expand Modal ── */}
      {galleryExpandItem && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setGalleryExpandItem(null)}
        >
          <div
            className="relative max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setGalleryExpandItem(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/70 border border-white/20 text-white hover:bg-white/20 transition-all"
            >
              <X size={14} />
            </button>

            {galleryExpandItem.type === 'video' ? (
              <video
                src={galleryExpandItem.url}
                className="w-full max-h-[80vh] object-contain bg-black"
                controls
                autoPlay
                playsInline
              />
            ) : (
              <img
                src={galleryExpandItem.url}
                alt="expanded"
                className="w-full max-h-[80vh] object-contain bg-black"
              />
            )}

            {/* Download bar */}
            <div className="bg-black/80 border-t border-white/10 px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-[9px] text-white/40 font-mono uppercase tracking-widest">
                {galleryExpandItem.type === 'video' ? 'MP4 Video' : 'PNG Image'}
              </span>
              <button
                onClick={async () => {
                  const ext = galleryExpandItem.type === 'video' ? 'mp4' : 'png';
                  try {
                    const res = await fetch(galleryExpandItem.url);
                    const blob = await res.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = `ugc-${galleryExpandItem.id}.${ext}`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                  } catch {
                    const a = document.createElement('a');
                    a.href = galleryExpandItem.url;
                    a.download = `ugc-${galleryExpandItem.id}.${ext}`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#c8f135] text-black text-[9px] font-black uppercase tracking-widest hover:bg-[#d4f545] transition-all"
              >
                <Download size={12} /> Download {galleryExpandItem.type === 'video' ? 'MP4' : 'PNG'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Deployment Guide */}
      {showLiveGuide && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in zoom-in-95 duration-300 overflow-y-auto">
          <div className="w-full max-w-2xl bg-gray-900/80 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl ring-1 ring-white/10 backdrop-blur-3xl relative">
            <button onClick={() => setShowLiveGuide(false)} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors">
              <X size={24} />
            </button>

            <div className="flex items-center gap-5 mb-10">
              <div className="p-4 bg-[#c8f135]/10 rounded-2xl border border-[#c8f135]/30 shadow-[0_0_20px_rgba(200,241,53,0.1)]">
                <Zap className="w-8 h-8 text-[#c8f135]" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">Go-Live Protocol</h2>
                <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-gray-500">Scale: 1000+ Concurrent Users</p>
              </div>
            </div>

            <div className="space-y-8 text-sm leading-relaxed text-gray-300">
              <section className="space-y-3">
                <h3 className="text-[#c8f135] font-mono text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Shield size={14} /> 1. Error Resilience
                </h3>
                <p>The application is now wrapped in a <strong>Global Error Boundary</strong>. If a specific component crashes, the system will isolate the error and allow the user to restart without losing the entire session.</p>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#c8f135] font-mono text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Activity size={14} /> 2. API Quota Management
                </h3>
                <p>With 1000+ users, you will hit Google Cloud quotas quickly. <strong>Precaution:</strong> Ensure you have requested a quota increase for <code>Gemini 3 Flash</code> and <code>Veo 3.1</code> in your Google Cloud Console. The app now detects quota errors and provides clear guidance to users.</p>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#c8f135] font-mono text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Layers size={14} /> 3. Client-Side Resource Limits
                </h3>
                <p>FFmpeg processing happens in the user's browser. For 1000+ users, this saves server costs but can crash mobile browsers. <strong>Improvement:</strong> We've added memory-safe checks. Advise users to use Desktop Chrome for complex renders.</p>
              </section>

              <section className="space-y-3">
                <h3 className="text-[#c8f135] font-mono text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle size={14} /> 4. Stability Checklist
                </h3>
                <ul className="list-disc list-inside space-y-2 text-[12px] text-gray-400">
                  <li>Verify Supabase Storage bucket is set to 'Public'</li>
                  <li>Enable 'Billing' on Google Cloud Project</li>
                  <li>Set up a custom domain to avoid 'run.app' rate limits</li>
                  <li>Monitor 'System Status' bar for real-time health</li>
                </ul>
              </section>

              <button
                onClick={() => setShowLiveGuide(false)}
                className="w-full bg-[#c8f135] text-black font-black uppercase tracking-widest py-5 rounded-2xl hover:scale-[1.02] transition-all shadow-[0_20px_40px_rgba(200,241,53,0.2)]"
              >
                Acknowledge & Deploy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brush Edit / Inpaint Modal */}
      {inpaintImg && (
        <InpaintEditor
          imageUrl={inpaintImg}
          userId={currentUserId}
          onClose={() => setInpaintImg(null)}
          onDone={(url) => {
            setGeneratedImg(url);
            addToGallery({ id: Date.now().toString(), type: 'image', url });
            setInpaintImg(null);
          }}
        />
      )}

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
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">AI Secure</h2>
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

    </>
  );
}
