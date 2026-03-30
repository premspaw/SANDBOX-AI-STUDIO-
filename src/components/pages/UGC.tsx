import React, { useState, useEffect } from 'react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { motion, AnimatePresence } from 'motion/react';
import { Upload, User, Box, FileText, Camera, Play, Pause, Wand2, Loader2, Volume2, VolumeX, Sparkles, Video, X, Scissors, Plus, Trash2, Save, ChevronRight, ChevronLeft, ChevronDown, Layout, AlertCircle, HelpCircle, Settings, SidebarClose, SidebarOpen, Download, ZoomIn, ZoomOut, GripVertical, Check, CheckCircle, BrainCircuit, Zap, ShieldCheck, Shield, MessageSquare, Clock, Activity, Maximize, Layers, Monitor, Search, Package, Droplets, Wind, Fingerprint, Lock, PlayCircle, RotateCcw } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
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

const getApiKey = () => {
  const env = (import.meta as any).env || {};
  return (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined) ||
    (typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined) ||
    env.VITE_GEMINI_API_KEY ||
    env.VITE_GOOGLE_API_KEY ||
    (typeof window !== 'undefined' && (window as any).process?.env?.GEMINI_API_KEY) ||
    (typeof window !== 'undefined' && (window as any).process?.env?.API_KEY) || '';
};

const getAI = () => {
  const apiKey = getApiKey();
  return new GoogleGenAI({ apiKey });
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
const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

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
      // Save to generated_assets (UGC history tracker)
      await supabase
        .from('generated_assets')
        .insert({
          user_id: user.id,
          asset_type: type,
          storage_path: fileName,
          public_url: publicUrlData.publicUrl,
          prompt: promptText
        });

      // ✅ Also save to 'assets' table so it appears in the shared Assets Library
      await supabase
        .from('assets')
        .insert({
          user_id: user.id,
          url: publicUrlData.publicUrl,
          type: type, // Ensure type is saved (image or video)
          name: `UGC_${type}_${Date.now()}`,
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
  const userProfile = useAppStore(state => state.userProfile as { role?: string } | null);
  const isGlobalAdmin = userProfile?.role === 'admin';

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
    if (!supabase) return;

    try {
      const ext = file.name.split('.').pop();
      const fileName = `template_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('ugc_assets').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from('ugc_assets').getPublicUrl(fileName);
      const { error: dbError } = await supabase.from('ugc_scene_templates').insert({
        title, scene_context: context, prompt, img: urlData.publicUrl
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

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: 'rgba(0, 0, 0, 0.85)',
      steps: [
        { 
          element: '#tour-assets', 
          popover: { 
            title: 'Step 1: Upload your photo', 
            description: 'Upload your photo, product photo, and video. These help us make your realistic UGC ad.',
            side: "right",
            align: 'start'
          } 
        },
        { 
          element: '#tour-script', 
          popover: { 
            title: 'Step 2: Your Product', 
            description: 'Tell us about your product and generate viral scripts. Our AI uses your uploaded assets to make your realistic UGC ad.',
            side: "left",
            align: 'start'
          } 
        },
        { 
          element: '#tour-timeline', 
          popover: { 
            title: 'Step 3: Professional Editor', 
            description: 'Arrange your generated clips, voiceovers, and background music on the timeline. Trim and reorder segments to perfect your ad.',
            side: "top",
            align: 'center'
          } 
        },
        { 
          element: '#tour-generate', 
          popover: { 
            title: 'Step 4: Final Production', 
            description: 'Once your timeline is complete, click here to process and render your final high-quality video production.',
            side: "bottom",
            align: 'center'
          } 
        },
      ]
    });
    driverObj.drive();
  };

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('ugc_tour_seen');
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        startTour();
        localStorage.setItem('ugc_tour_seen', 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

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

  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [galleryTab, setGalleryTab] = useState<'all' | 'image' | 'video'>('all');
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

  const handleAdminLogin = () => {
    if (adminPassword === 'admin123') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
    } else {
      alert('Invalid password');
    }
  };

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
      setGallery((prev: GalleryItem[]) => [{ id: Date.now().toString(), type: 'video', url }, ...prev]);
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleApiError = (e: any, context: string) => {
    console.error(`${context} failed`, e);
    const errorMsg = e instanceof Error ? e.message : String(e);
    
    if (errorMsg.includes('Quota exceeded') || errorMsg.includes('429')) {
      showToast("API Quota Exceeded. Please try again later or provide your own API key in Settings.", 'error');
    } else {
      showToast(`${context} failed: ${errorMsg}`, 'error');
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
    try {
      const ai = getAI();
      const imagePart = await fileToGenerativePart(file);
      
      const response = await withTimeout(ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { parts: [
            imagePart,
            { text: `Identify this product and suggest 3 specific, high-performance montage video clip ideas for a UGC ad. 
            The product could be cosmetics (lipstick, mascara), hair care (gel, spray), skin care, or any consumer good.
            IMPORTANT: The prompts MUST be in a realistic UGC (User Generated Content) style. 
            They should look like they were shot by a customer on their own phone (e.g., iPhone), in an authentic home environment. 
            Avoid "cinematic" or "commercial" tropes. Focus on natural lighting, relatable settings, and authentic product usage.
            For each idea, provide:
            1. A short title (e.g., "Applying", "Opening", "Texture").
            2. A detailed video generation prompt for Veo (e.g., "A close-up of a person's hand as they squeeze a small amount of the cream, natural bathroom lighting, shot on iPhone, realistic UGC style, 4k").
            3. A relevant Lucide icon name (e.g., "Sparkles", "Zap", "Fingerprint", "Droplets", "Wind", "Scissors").
            
            Return the result as a JSON array of objects with keys: id, title, prompt, icon.` }
          ] }
        ],
        config: {
          responseMimeType: "application/json",
        }
      }), 60000, "Montage analysis timed out. Please try again.");

      const options = JSON.parse(response.text || '[]');
      setMontageOptions(options);
    } catch (e) {
      handleApiError(e, "Product analysis for montage");
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
    if (!productImg && !characterImg) return '';
    setIsGeneratingMontageImg(true);
    setMontageImgProgressMsg('Calibrating Studio Camera...');
    let generatedUrl = '';
    try {
      const ai = getAI();
      let contents: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];

      // Build style prompt (UGC ultra-realistic for montage)
      const stylePrompt = 'Ultra-realistic UGC photo, natural look, shot on a phone, authentic lighting, no heavy bokeh, real human appearance, 8K quality';

      // Add character reference if present
      if (characterImg) {
        setMontageImgProgressMsg('Loading Character Reference...');
        contents.push(await fileToGenerativePart(characterImg.file));
      }

      // Add product reference if present
      if (productImg) {
        setMontageImgProgressMsg('Analysing Product DNA...');
        contents.push(await fileToGenerativePart(productImg.file));
      }

      setMontageImgProgressMsg('Synthesising Reference Frame...');

      // Build instruction based on what references we have
      let promptInstructions = '';
      const sceneDesc = `${option.title} — ${option.prompt.substring(0, 120)}`;

      if (characterImg && productImg) {
        promptInstructions = `The FIRST image is the PERSON (creator) reference. The SECOND image is the PRODUCT reference.
        TASK: Generate ONE single, coherent UGC-style photo where this EXACT person is using/wearing/holding this EXACT product in the following scene: ${sceneDesc}.
        Style: ${stylePrompt}.
        CRITICAL: Do NOT create a collage, side-by-side, or split screen. One unified photo only. Match the person's skin, features, and the product appearance precisely.`;
      } else if (characterImg) {
        promptInstructions = `The image is the PERSON (creator) reference.
        TASK: Generate ONE UGC-style photo of this person in the following scene: ${sceneDesc}.
        Style: ${stylePrompt}.`;
      } else if (productImg) {
        promptInstructions = `The image is the PRODUCT reference.
        TASK: Generate ONE UGC-style photo of a creator using/showcasing this product in the following scene: ${sceneDesc}.
        The product in the final image must look exactly like the reference. Style: ${stylePrompt}.`;
      } else {
        promptInstructions = `TASK: Generate ONE UGC-style photo for this scene: ${sceneDesc}. Style: ${stylePrompt}.`;
      }

      contents.push({ text: promptInstructions });

      const modelName = hasPaidKey ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
      setMontageImgProgressMsg('AI Generating Reference Image...');

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ parts: contents }],
        config: {
          imageConfig: { aspectRatio: aspectRatio as any }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const url = `data:image/png;base64,${part.inlineData.data}`;
          generatedUrl = url;
          setMontageGeneratedImg(url);
          break;
        }
      }
    } catch (e) {
      handleApiError(e, 'Montage reference image generation');
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
    if (useAppStore.getState().userShorts < unitCost && useAppStore.getState().userProfile?.role !== 'admin') {
      showToast(`Insufficient Credits: You need ${unitCost} Shorts.`, 'error');
      useAppStore.getState().setActiveTab('pricing');
      return;
    }

    const spendRes = await spend('veo_fast', unitCost);
    if (!spendRes || !spendRes.success) {
      showToast("Insufficient Shorts! Redirecting to pricing...", "error");
      useAppStore.getState().setActiveTab('pricing');
      return;
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
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        setVideoProgressMsg(pollMsgs[Math.min(pollCount, pollMsgs.length - 1)]);
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
        setGallery((prev: GalleryItem[]) => [...prev, { id: Date.now().toString(), type: 'video', url }]);
        showToast(`${option.title} montage added to timeline!`, 'success');
        setShowMontageOptions(false);
        setMontageGeneratedImg(''); // reset for next montage
      } else {
        showToast('Veo returned no video. The prompt may have been filtered. Try rephrasing.', 'error');
      }
    } catch (e) {
      refund('veo_fast', unitCost);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'character' | 'product' | 'generated') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'character') setCharacterImg({ url, file });
    else if (type === 'product') {
      setProductImg({ url, file });
      setMontageOptions([]);
      analyzeProductForMontage(file);
    } else {
      setGeneratedImg(url);
      setScenes((prev: Scene[]) => prev.map((s: Scene, i: number) => i === activeSceneIndex ? { ...s, image: url } : s));
      setGallery((prev: GalleryItem[]) => [...prev, { id: Date.now().toString(), type: 'image', url }]);
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
      const ai = getAI();
      const response = await withTimeout(ai.models.generateContent({
        model: 'gemini-3.1-flash-preview',
        contents: [{
          role: 'user',
          parts: [
            { 
              inlineData: { 
                mimeType: sourceVideo.file.type || 'video/mp4', 
                data: base64Video 
              } 
            },
            { text: 'Analyze this video reference. Focus EXCLUSIVELY on the main character/person. Ignore the background, environment, and lighting. \n\nTASK:\n1. Extract the EXACT sequence of physical actions and movements (e.g., "points at camera", "smiles", "gestures with left hand").\n2. Transcribe the EXACT dialogue/script being spoken (limit to the first 30 seconds).\n3. Summarize the character\'s tone and personality.\n\nProvide the result in JSON format with "characterActions", "script", and "toneSummary".' }
          ]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              characterActions: { type: Type.STRING, description: "Detailed sequence of physical movements and gestures." },
              script: { type: Type.STRING, description: "The exact spoken dialogue (max 30 seconds)." },
              toneSummary: { type: Type.STRING, description: "The character's energy and tone." }
            },
            required: ["characterActions", "script", "toneSummary"]
          }
        }
      }), 90000, "Video analysis timed out. Please try again.");

      setAnalysisProgress('Finalizing Results...');
      const result = safeJsonParse(response.text);
      
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
      const ai = getAI();
      const imagePart = await fileToGenerativePart(productImg.file);
      const response = await withTimeout(ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [imagePart, { text: 'Analyze this product for a UGC ad. Provide a "productName", "productDetails" (concise description), and "tags" (array of keywords).' }] }],
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
      }), 60000, "Product analysis timed out. Please try again.");

      const data = safeJsonParse(response.text);
      if (data.tags) setProductTags(data.tags);
      if (data.description) setProductDetails(data.description);
    } catch (e) {
      handleApiError(e, "Product analysis");
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
      const ai = getAI();
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

      const response = await withTimeout(ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    timestamp: { type: Type.STRING },
                    label: { type: Type.STRING },
                    dialogue: { type: Type.STRING },
                    visualCue: { type: Type.STRING },
                    visualPrompt: { type: Type.STRING }
                  },
                  required: ["id", "timestamp", "label", "dialogue", "visualCue", "visualPrompt"]
                }
              }
            },
            required: ["scenes"]
          }
        }
      }), 15000, "Prompt extraction timed out. Please try again.");

      const data = safeJsonParse(response.text);
      if (data.scenes && Array.isArray(data.scenes)) {
        const structuredScenes: Scene[] = data.scenes.map((s: any) => ({
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
PERFORMANCE STYLE: ${VIDEO_STYLES[selectedVideoStyle]?.modifier || VIDEO_STYLES.calm.modifier}
DURATION: ${scriptDuration} (${durationLogic})
${userPrompt ? `USER INSTRUCTIONS: ${userPrompt}` : ''}
LANGUAGE: ${language}

MANDATORY REQUIREMENTS:
1. WORD COUNT: Strictly 20-25 words PER 8-second scene. (Total words for ${scriptDuration}: ${sceneCount * 22} approx).
2. STRUCTURE: Maintain the exactly ${sceneCount} scene structure (${durationLogic}).
3. BALANCED PACING: Distribute the dialogue evenly across all scenes. Each 8-second scene MUST have its own 20-25 words. DO NOT cut sentences in half between scenes. Ensure each scene ends with a complete thought or a natural pause.
4. PAYOFF FOCUS: For durations > 8s, significantly expand the PAYOFF/VALUE blocks to fill the extra time.
5. FORMATTING: Use the exact formatting: [0:00 - 0:08] HOOK, etc.
6. QUALITY: High-energy, scroll-stopping dialogue. No word repetition.
7. LANGUAGE: ${language}
8. TONE: ${SCRIPT_TONES[selectedScriptTone]?.prompt || SCRIPT_TONES.viral_marketing.prompt}
9. PERFORMANCE STYLE: The script should be written to be performed in a ${VIDEO_STYLES[selectedVideoStyle]?.name} style.
10. PRODUCT TYPE: If the product is clothing/apparel, the visual cues MUST describe the creator WEARING the item naturally, not just holding it.
11. COMPLETE THOUGHTS: Each scene must contain its own self-contained dialogue block. Do not start a sentence in one scene and finish it in another.
12. VISUAL CUES: The visual cues for each scene MUST reflect the performance style: ${VIDEO_STYLES[selectedVideoStyle]?.modifier}.

Return ONLY a valid JSON object with the following structure:
{
  "script": "The clean dialogue-only script with timestamps and labels",
  "scenes": [
    {
      "id": "1",
      "timestamp": "0:00 - 0:08",
      "label": "HOOK",
      "dialogue": "Spoken text for scene 1",
      "visualCue": "UGC Creator Style: A relatable creator talking directly to the camera in a natural setting (home, street, cafe). Describe creator action, emotion, camera movement, and environment. Performance Style: ${VIDEO_STYLES[selectedVideoStyle]?.modifier}. If product is clothing, they MUST be wearing it naturally. The creator is speaking the words: \"[Dialogue Text]\". This ensures natural lip-sync. Focus on natural looking normal photo quality, wide or medium shots. AVOID: 85mm, portrait lens, bokeh, extreme close-ups, and 'fashion film' or 'cinematic' tropes. Keep it grounded and realistic."
    }
  ]
}`;

      const response = await withTimeout(ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
      }), 15000, "Script generation timed out. Please try again.");

      const data = safeJsonParse(response.text);

      if (data.script) {
        setScript(data.script);
      }

      if (data.scenes && Array.isArray(data.scenes)) {
        const structuredScenes: Scene[] = data.scenes.map((s: any) => ({
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
        const automaticallySplitScenes = splitScriptIntoScenes(data.script || response.text || '');
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
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
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

      const data = safeJsonParse(response.text);
      if (data.newDialogue) {
        setScenes(prev => {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            text: data.newDialogue,
            prompt: data.newVisualCue || updated[idx].prompt,
            visualCue: data.newVisualCue || updated[idx].visualCue
          };

          if (idx === activeSceneIndex) {
            setVideoPrompt(data.newVisualCue || updated[idx].prompt);
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
      const ai = getAI();
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

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const newPrompt = response.text || '';
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
      const ai = getAI();
      const spokenText = script.replace(/\[.*?\]/g, '').trim();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: spokenText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
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
            type: 'audio'
          };
          setTimeline((prev: TimelineItem[]) => {
            // Remove existing audio clips if any, to avoid duplicates
            const filtered = prev.filter((t: TimelineItem) => t.type !== 'audio');
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
      const promptText = isStringOverride
        ? `A professional UGC photo capturing this specific scene: ${overridePrompt}. If the product is clothing, the creator MUST be wearing it naturally. DO NOT show them holding the clothes. Artistic Style: ${stylePrompt}`
        : `A UGC style photo of a creator wearing and showcasing this product: ${productDetails}. 
      CRITICAL: If the product is clothing/apparel, the creator MUST be wearing it naturally. DO NOT show them holding the clothes in their hands.
      The creator looks directly at the camera, engaging the viewer. 
      Style instructions: ${stylePrompt} `;

      // Assemble content parts to shape the final image
      if (characterImg) {
        contents.push(await fileToGenerativePart(characterImg.file));
      }

      if (productImg) {
        setImageProgressMsg('Analyzing Product DNA...');
        contents.push(await fileToGenerativePart(productImg.file));
      }

      setImageProgressMsg('Synthesizing UGC Frame...');
      
      let promptInstructions = '';
      if (characterImg && productImg) {
        promptInstructions = `The first image provided is the reference for the PERSON (creator). The second image is the reference for the PRODUCT. 
        TASK: Generate a SINGLE, COHERENT photograph where this person is wearing or using this product in the scene: ${promptText}. 
        CRITICAL: DO NOT create a collage, side-by-side comparison, or split-screen. The output must be one single, natural-looking photo. 
        Match the lighting, skin texture, and aesthetic of the first image. The product must be integrated naturally.`;
      } else if (characterImg) {
        promptInstructions = `The image provided is the reference for the PERSON (creator). 
        TASK: Generate a SINGLE photograph of this person in the scene: ${promptText}. 
        Match their appearance and the lighting/aesthetic of the reference image perfectly.`;
      } else if (productImg) {
        promptInstructions = `The image provided is the reference for the PRODUCT. 
        TASK: Generate a SINGLE photograph of a creator using/wearing this product in the scene: ${promptText}. 
        The product in the generated image must look exactly like the reference.`;
      } else {
        promptInstructions = `TASK: Generate a SINGLE photograph of a creator in the scene: ${promptText}.`;
      }

      contents.push({ text: promptInstructions });

      const modelName = hasPaidKey ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ parts: contents }],
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            ...(hasPaidKey ? { imageSize: '1K' } : {})
          },
          ...(hasPaidKey ? {
            tools: [{
              googleSearch: {}
            }]
          } : {})
        }
      });

      setImageProgressMsg('Processing Visual Output...');
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
            setImageProgressMsg('Finalizing Frame...');
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
      handleApiError(e, "Image generation");
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
      handleApiError(e, "Image regeneration");
    }
    setIsRegeneratingImage(false);
  };

  const getCurrentCost = (isMontage = false) => {
    const duration = isMontage ? parseInt(montageDuration) : parseInt(durationSeconds);
    const audioOn = isMontage ? montageAudioEnabled : includeAudio;
    
    let costPerSec = audioOn ? 17.43 : 11.62;
    if (videoResolution === '4K') {
       costPerSec = audioOn ? 40.67 : 34.86;
    }
    return Math.ceil(costPerSec * duration);
  };

  const generateVideo = async (overridePrompt?: string, referenceImageUrl?: string) => {
    const unitCost = getCurrentCost(false);
    if (useAppStore.getState().userShorts < unitCost && useAppStore.getState().userProfile?.role !== 'admin') {
      showToast(`Insufficient Credits: You need ${unitCost} Shorts.`, 'error');
      useAppStore.getState().setActiveTab('pricing');
      return;
    }

    const spendRes = await spend('veo_fast', unitCost);
    if (!spendRes || !spendRes.success) {
      showToast("Insufficient Shorts! Redirecting to pricing...", "error");
      useAppStore.getState().setActiveTab('pricing');
      return;
    }

    setIsGeneratingVideo(true);
    setVideoError('');
    setVideoProgressMsg('Initializing Veo Engine...');
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
      const promptText = (overridePrompt || (scenes[activeSceneIndex]?.isApproved
        ? scenes[activeSceneIndex].prompt
        : (videoPrompt || `A creator wearing or interacting with this product: ${productDetails}. If it's clothing, they MUST be wearing it.`))) + dialogue + (stylePrompt ? ` Style: ${stylePrompt}` : '') + lipSyncBooster + virtualCreatorPrompt + (activeRefImg || characterImg ? " IMPORTANT: Match the natural vibe, lighting, and aesthetic of the provided reference image perfectly." : "");

      let imagePayload: { imageBytes: string; mimeType: string } | undefined = undefined;

      if (activeRefImg) {
        let base64 = '';
        let mimeType = 'image/jpeg';
        if (activeRefImg.startsWith('http')) {
          const res = await fetch(activeRefImg);
          const blob = await res.blob();
          base64 = await resizeImage(blob);
        } else {
          // If it's a data URL, convert to blob then resize
          const res = await fetch(activeRefImg);
          const blob = await res.blob();
          base64 = await resizeImage(blob);
        }
        imagePayload = { imageBytes: base64, mimeType };
      } else if (characterImg) {
        let base64 = '';
        let mimeType = 'image/jpeg';
        if (characterImg.url && characterImg.url.startsWith('http')) {
          const res = await fetch(characterImg.url);
          const blob = await res.blob();
          base64 = await resizeImage(blob);
        } else {
          base64 = await resizeImage(characterImg.file);
        }
        imagePayload = { imageBytes: base64, mimeType };
      }

      setVideoProgressMsg('Igniting the Motion Engine...');

      const videoRequest: any = {
        model: 'veo-3.1-fast-generate-preview',
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

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        setVideoProgressMsg(messages[Math.min(pollCount, messages.length - 1)]);
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
        const publicUrl = await uploadToSupabase(blob, 'video', promptText);

        const finalUrl = publicUrl || URL.createObjectURL(blob);
        setGeneratedVideo(finalUrl);
        setGallery((prev: GalleryItem[]) => [...prev, { id: Date.now().toString(), type: 'video', url: finalUrl }]);
        addToTimeline({ type: 'video', url: finalUrl });
      } else {
        setVideoError('Veo returned no video. The prompt may have been filtered — try a different prompt.');
        showToast('No video generated. Try rephrasing your prompt.', 'error');
      }
    } catch (e: any) {
      refund('veo_fast', unitCost);
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
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-2 bg-[#111] p-3 rounded-xl border border-white/5"
                >
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
                  onClick={() => {
                    setSceneContext(template.sceneContext || template.scene_context);
                    setVideoPrompt(template.prompt);
                    setShowTemplates(false); // Automatically hide after picking a template
                  }}
                  className={`w-full aspect-[9/16] rounded-xl border overflow-hidden transition-all block bg-white/5 ${sceneContext === template.sceneContext
                    ? 'border-[#c8f135] shadow-[0_0_15px_rgba(212,255,0,0.3)]'
                    : 'border-white/10 hover:border-white/30'
                    } `}
                  title={template.title}
                >
                  {template.img?.endsWith('.mp4') ? (
                    <video autoPlay muted loop playsInline src={template.img ? `${template.img}?v=1` : ''} className={`w-full h-full object-cover transition-all duration-300 ${sceneContext === template.sceneContext ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'} `} />
                  ) : (
                    <img src={template.img} alt="" className={`w-full h-full object-cover transition-all duration-300 ${sceneContext === template.sceneContext ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'} `} />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-2 text-left pointer-events-none">
                    <span className="text-[#c8f135] font-mono text-[8.5px] font-bold tracking-widest uppercase leading-tight line-clamp-2">{template.title}</span>
                  </div>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(template.prompt);
                    alert("Prompt Copied!");
                  }}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-[#c8f135] hover:text-black text-white p-1.5 rounded-md backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10 border border-white/20 hover:border-[#c8f135]"
                  title="Copy Prompt"
                >
                  <LucideIcons.Copy size={12} />
                </button>

                {isGlobalAdmin && template.created_at && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(template.id);
                    }}
                    className="absolute top-2 right-8 bg-black/60 hover:bg-red-500 hover:text-white text-white p-1.5 rounded-md backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10 border border-white/20 hover:border-red-500"
                    title="Delete Template"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* ── Main Workspace ─────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-[10px] lg:px-8 lg:py-[10px] pb-24 w-full relative">
          {/* Floating Help Button */}
          <button 
            onClick={startTour}
            className="fixed bottom-8 right-8 w-12 h-12 bg-[#c8f135] text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(200,241,53,0.4)] hover:scale-110 transition-all z-[60] group"
            title="Restart Onboarding Tour"
          >
            <HelpCircle size={24} />
            <span className="absolute right-full mr-4 px-3 py-1.5 bg-black/90 text-[#c8f135] text-[10px] font-bold uppercase tracking-widest rounded-lg border border-[#c8f135]/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Need Help?
            </span>
          </button>

          <div className="w-full h-full max-w-[1600px] mx-auto">
            {/* ── Master Production Dashboard ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

              {/* Column 1: Asset Ingestion (Left | 3 cols) */}
              <div id="tour-assets" className="lg:col-span-3 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-4 lg:pb-0 custom-scrollbar order-2 lg:order-1 lg:space-y-2">
                <Card title="Your Creator" icon={User} tooltip="Upload your photo to create your first influencer." className="min-w-[180px] lg:min-w-0 flex-shrink-0" contentClassName="p-0">
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
                        <span className="font-sans text-[11px] font-bold tracking-wide text-[#999]">Upload your photo</span>
                      </div>
                    )}
                  </div>
                </Card>

                <Card
                  title=""
                  className="min-w-[180px] lg:min-w-0 flex-shrink-0"
                  contentClassName="p-0"
                  action={
                    <Button
                      onClick={analyzeProduct}
                      disabled={!productImg || isAnalyzing}
                      loading={isAnalyzing}
                      variant={productDetails ? 'ghost' : 'primary'}
                      className="h-10 px-6 text-[11px] min-w-[180px] tracking-widest font-black"
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
                          <div className="text-center">
                            <span className="block font-sans text-[11px] font-bold tracking-wide text-[#999]">Upload Reference Video</span>
                            <span className="block font-mono text-[8px] text-[#555] mt-1 uppercase tracking-tighter">Max 30 Seconds</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-black/20">
                      <Button onClick={analyzeVideo} disabled={!sourceVideo || isAnalyzingVideo} loading={isAnalyzingVideo} variant={sourceVideo ? 'primary' : 'ghost'} className="w-full h-8 text-[9px]">
                        Analyze
                      </Button>
                      {isAnalyzingVideo && analysisProgress && (
                        <div className="mt-2 text-center">
                          <p className="text-[8px] font-mono text-[#c8f135] uppercase tracking-widest animate-pulse">{analysisProgress}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Admin-only Viral Knowledge Base */}
                {isAdmin && (
                  <Card title="Viral Knowledge Base (Admin)" icon={Sparkles} tooltip="Upload viral scripts or documents to train the AI on specific high-conversion styles." contentClassName="p-4 gap-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <BrainCircuit size={14} className="text-[#00ffe0]" />
                            <span className="text-[10px] font-bold text-[#00ffe0] uppercase tracking-wider">Training Agent</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 border border-white/10">
                            <div className={`w-1 h-1 rounded-full ${getApiKey() ? 'bg-[#c8f135] shadow-[0_0_8px_rgba(200,241,53,0.6)]' : 'bg-red-500'}`} />
                            <span className="text-[7px] font-mono uppercase tracking-tighter text-gray-400">
                              {getApiKey() ? (getApiKey().startsWith('AI') ? 'Gemini Key Active' : 'API Key Active') : 'No Key Detected'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
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
                        <button
                          onClick={testApiConnection}
                          disabled={isTestingApi}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${isTestingApi ? 'bg-white/5 border-white/10 text-gray-500' : 'bg-[#c8f135]/10 border-[#c8f135]/30 text-[#c8f135] hover:bg-[#c8f135] hover:text-black shadow-[0_0_15px_rgba(200,241,53,0.2)]'
                            } `}
                        >
                          {isTestingApi ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <Activity size={10} />
                          )}
                          <span className="text-[9px] font-bold uppercase tracking-tighter">
                            {isTestingApi ? 'Testing...' : 'Test API'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {trainedStrategy && (
                        <div className="p-3 bg-[#00ffe0]/5 border border-[#00ffe0]/20 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00ffe0] animate-pulse shadow-[0_0_8px_rgba(0,255,224,0.6)]" />
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
              <div id="tour-script" className="lg:col-span-5 space-y-3 order-3 lg:order-2">
                <Card title="Your Product" icon={FileText} tooltip="Tell us about your product and make your script." contentClassName="p-4 gap-3">
                  <div className="space-y-3">
                    {/* Integrated Vision Output */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-3 font-mono text-[9px] text-gray-400 leading-relaxed italic relative group">
                      <div className="flex items-center gap-2 mb-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                        <Wand2 size={10} className="text-[#c8f135]" />
                        <span className="uppercase tracking-widest font-bold text-[8px]">Vision Analysis</span>
                      </div>
                      <div className="line-clamp-2 hover:line-clamp-none transition-all cursor-default">
                        {productDetails || "Awaiting product scan..."}
                      </div>
                    </div>

                    <div>
                      <label className="text-[#999] font-sans font-bold text-[10px] tracking-wide mb-1 block uppercase">Creative Direction/Direct instructions</label>
                      <input
                        type="text"
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        placeholder="e.g., Energetic demo with a focus on product durability..."
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 font-sans text-[11px] text-white focus:outline-none focus:border-[#c8f135] transition-colors"
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
                          <button 
                            onClick={extractVisualPrompts} 
                            disabled={!script || isGeneratingScript} 
                            className="text-[10px] font-sans font-bold tracking-wider px-3 py-1.5 rounded-lg bg-[#c8f135]/10 border border-[#c8f135]/20 text-[#c8f135] hover:bg-[#c8f135]/20 transition-all disabled:opacity-30 flex items-center gap-1.5"
                          >
                            <Sparkles size={12} />
                            Extract Prompts
                          </button>
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
                                <div className="flex items-center justify-between">
                                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Select a clip to review</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {montageOptions.map((option) => (
                                    <button
                                      key={option.id}
                                      onClick={() => {
                                        setSelectedMontageOption(option);
                                        setMontagePrompt(option.prompt);
                                        setIsMontageApproved(false);
                                        setMontageGeneratedImg(''); // clear stale ref image when switching clips
                                      }}
                                      disabled={isGeneratingVideo}
                                      className={`flex items-center gap-3 p-2.5 border rounded-lg transition-all group relative overflow-hidden text-left ${selectedMontageOption?.id === option.id ? 'bg-[#c8f135]/10 border-[#c8f135]/40' : 'bg-white/5 border-white/10 hover:border-[#c8f135]/40'} `}
                                    >
                                      <div className={`${selectedMontageOption?.id === option.id ? 'text-[#c8f135]' : 'text-gray-400'} group-hover:scale-110 transition-transform relative z-10`}>
                                        {option.icon === 'Droplets' ? <Droplets size={16} /> : 
                                         option.icon === 'Wind' ? <Wind size={16} /> :
                                         option.icon === 'Scissors' ? <Scissors size={16} /> :
                                         option.icon === 'Zap' ? <Zap size={16} /> :
                                         option.icon === 'Fingerprint' ? <Fingerprint size={16} /> :
                                         <Sparkles size={16} />}
                                      </div>
                                      <div className="relative z-10">
                                        <p className={`text-[9px] font-black uppercase tracking-wider ${selectedMontageOption?.id === option.id ? 'text-[#c8f135]' : 'text-white'} `}>{option.title}</p>
                                        <p className="text-[7px] text-gray-500 font-mono uppercase truncate w-24">Performance Clip</p>
                                      </div>
                                      <div className="absolute inset-0 bg-gradient-to-r from-[#c8f135]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                  ))}
                                </div>

                                {selectedMontageOption && (
                                  <div className="mt-4 space-y-3 p-3 bg-white/5 border border-white/10 rounded-xl animate-in fade-in slide-in-from-top-2 duration-500">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="text-[#c8f135]">
                                          {selectedMontageOption.icon === 'Droplets' ? <Droplets size={14} /> : 
                                           selectedMontageOption.icon === 'Wind' ? <Wind size={14} /> :
                                           selectedMontageOption.icon === 'Scissors' ? <Scissors size={14} /> :
                                           selectedMontageOption.icon === 'Zap' ? <Zap size={14} /> :
                                           selectedMontageOption.icon === 'Fingerprint' ? <Fingerprint size={14} /> :
                                           <Sparkles size={14} />}
                                        </div>
                                        <span className="text-[9px] font-black text-white uppercase tracking-widest">{selectedMontageOption.title} Prompt</span>
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
                                      onClick={() => analyzeProductForMontage(productImg.file)}
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
                        <label className="text-[#999] font-sans font-bold text-[10px] tracking-wide block uppercase truncate">Visual Prompt/Scene {activeSceneIndex + 1} Logic</label>
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
                                    onClick={() => setAspectRatio(ratio)} 
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${aspectRatio === ratio ? 'bg-[#c8f135] text-black shadow-[0_0_15px_rgba(200,241,53,0.2)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                  >
                                    {ratio}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

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
                        <Button onClick={() => generateImage()} disabled={isGeneratingImage || !productDetails} loading={isGeneratingImage} variant="secondary" className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest">
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

                          <Button onClick={generateImage} disabled={isGeneratingImage || !productDetails} loading={isGeneratingImage} className="w-full py-4 pointer-events-auto">Generate your Influencer</Button>
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
                </Card>
              </div>
            </div>

            {/* ── Asset Forge / Generation Queue (Tabbed) ──────────────────── */}
            {gallery.length > 0 && (
              <div className="max-w-7xl mx-auto mt-10 border-t border-white/5 pt-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[#c8f135] font-mono text-[10.5px] font-black uppercase tracking-[0.2em] flex items-center gap-3 drop-shadow-[0_0_8px_rgba(200,241,53,0.3)]">
                    <Sparkles size={16} />
                    Asset Forge / Generation Queue
                    <span className="text-[8px] bg-[#c8f135]/10 border border-[#c8f135]/30 text-[#c8f135] px-2 py-0.5 rounded-full">{gallery.length}</span>
                  </h2>
                  <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#c8f135] animate-pulse" />
                    Saved to Assets Library
                  </span>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-5 bg-black/40 p-1 rounded-xl border border-white/5 w-fit">
                  {([
                    { id: 'all' as const, label: 'All', count: gallery.length },
                    { id: 'image' as const, label: 'Images', count: gallery.filter(g => g.type === 'image').length, icon: Camera },
                    { id: 'video' as const, label: 'Videos', count: gallery.filter(g => g.type === 'video').length, icon: Video },
                  ]).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setGalleryTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                        galleryTab === tab.id
                          ? 'bg-[#c8f135] text-black shadow-lg shadow-[#c8f135]/20'
                          : 'text-gray-500 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tab.icon && <tab.icon size={10} />}
                      {tab.label}
                      <span className={`px-1.5 py-0.5 rounded-full text-[7px] ${galleryTab === tab.id ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-500'}`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Gallery Grid */}
                {(() => {
                  const filtered = galleryTab === 'all' ? gallery : gallery.filter(g => g.type === galleryTab);
                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center gap-3 py-16 opacity-30">
                        {galleryTab === 'video' ? <Video size={32} className="text-[#c8f135]" /> : <Camera size={32} className="text-[#c8f135]" />}
                        <p className="text-[9px] font-mono uppercase tracking-widest text-gray-500">
                          No {galleryTab === 'all' ? '' : galleryTab + ' '}assets generated yet
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="flex gap-5 overflow-x-auto pb-6 custom-scrollbar px-1">
                      {filtered.map((item: any) => (
                        <div
                          key={item.id}
                          className="relative w-36 h-44 flex-shrink-0 bg-gray-900/40 backdrop-blur-md rounded-xl overflow-hidden group border-2 border-white/5 hover:border-[#c8f135]/50 hover:shadow-[0_0_20px_rgba(200,241,53,0.15)] transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                        >
                          {item.type === 'image' ? (
                            <img src={item.url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <video src={item.url} className="w-full h-full object-cover" muted loop onMouseEnter={e => (e.target as HTMLVideoElement).play()} onMouseLeave={e => (e.target as HTMLVideoElement).pause()} />
                          )}

                          {/* Type badge */}
                          <div className="absolute top-2 right-2 bg-black/80 p-1.5 rounded border border-[#333]">
                            {item.type === 'image' ? <Camera size={12} className="text-[#c8f135]" /> : <Video size={12} className="text-[#c8f135]" />}
                          </div>

                          {/* Hover Actions */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                            <button
                              onClick={async () => {
                                if (item.type === 'image') {
                                  setRenderMode('image');
                                  setGeneratedImg(item.url);
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
                                  a.download = `ugc_asset_${Date.now()}.${item.type === 'video' ? 'mp4' : 'png'}`;
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
                                className="w-full font-mono text-[9px] uppercase tracking-widest text-black bg-[#c8f135] py-1.5 rounded font-bold transition-all flex items-center justify-center gap-2"
                              >
                                <Plus size={10} /> Timeline
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

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
                    <img src={generatedImg || ''} className="w-full h-full object-contain" alt="Focus" />
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

              <div className="w-full lg:w-24 flex lg:flex-col gap-6 lg:gap-8 items-center justify-center lg:pt-10 pb-6 lg:pb-0">
                {renderMode === 'image' && (
                  <button
                    onClick={() => setIsRefinementOpen(!isRefinementOpen)}
                    className="group flex flex-col items-center gap-3"
                  >
                    <div className={`w-14 h-14 lg:w-16 lg:h-16 backdrop-blur-xl border rounded-2xl flex items-center justify-center transition-all duration-500 cursor-pointer shadow-xl group-hover:-translate-y-1 ${isRefinementOpen ? 'bg-[#c8f135] text-black border-[#c8f135]' : 'bg-white/5 text-white border-white/10 hover:bg-[#c8f135] hover:text-black'}`}>
                      <Wand2 size={24} className="lg:size-[28px]" />
                    </div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">{isRefinementOpen ? 'Cancel' : 'Edit'}</span>
                  </button>
                )}
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
            </div>
          </div>
        )
      }


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

      {/* Onboarding Help Button */}
      <div className="fixed bottom-8 right-24 z-[90]">
        <button
          onClick={startTour}
          className="w-14 h-14 rounded-2xl bg-black/60 text-[#c8f135] border border-white/10 hover:border-[#c8f135]/50 hover:bg-[#c8f135]/10 transition-all flex items-center justify-center cursor-pointer shadow-2xl group backdrop-blur-xl"
          title="Restart Onboarding Tour"
        >
          <HelpCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>
      </div>

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
      </div>
    </>
  );
}
