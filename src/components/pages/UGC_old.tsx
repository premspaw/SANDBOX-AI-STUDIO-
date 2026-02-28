import React, { useState, useEffect } from 'react';
import { Upload, User, Box, FileText, Camera, Play, Wand2, Loader2, Volume2, Sparkles, Video, X, Scissors, Plus, Trash2, Save, ChevronRight, ChevronLeft, ChevronDown, Layout, AlertCircle, HelpCircle, Settings, SidebarClose, SidebarOpen, Download, ZoomIn, ZoomOut, GripVertical, Check, CheckCircle, BrainCircuit, Zap, ShieldCheck, Shield } from 'lucide-react';
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

// Set worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const getAI = (useVertex = false) => {
  const env = (import.meta as any).env || {};

  // Prioritize the injected API_KEY from the selection dialog
  const apiKey = (typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined) ||
    (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined) ||
    env.VITE_GOOGLE_API_KEY ||
    env.VITE_GEMINI_API_KEY ||
    (typeof window !== 'undefined' && (window as any).process?.env?.GEMINI_API_KEY);

  let config: any = { apiKey: apiKey || "" };
  if (useVertex) {
    config = { vertexai: { project: env.VITE_GOOGLE_PROJECT_ID || '569815811058', location: 'us-central1' } };
  }

  return new GoogleGenAI(config);
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

const Button = ({ children, onClick, disabled, loading, variant = 'primary', className = '' }: any) => {
  const baseStyle = "relative font-sans text-xs font-bold py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 overflow-hidden";
  const variants = {
    primary: "bg-[#D4FF00] text-black hover:brightness-105 active:scale-95 disabled:bg-[#222] disabled:text-[#555] shadow-[0_2px_10px_rgba(212,255,0,0.15)]",
    secondary: "bg-transparent border border-[#555] text-white hover:bg-white/5 hover:border-[#D4FF00] hover:text-[#D4FF00] active:scale-95 disabled:border-[#222] disabled:text-[#555]",
    ghost: "bg-transparent text-[#999] hover:text-white hover:bg-white/5 active:scale-95"
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

const Dropdown = ({ label, value, options, onChange, icon: Icon, className = "", direction = "down" }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-gray-500 font-mono text-[8px] uppercase tracking-widest pl-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-[9px] uppercase tracking-widest hover:border-white/30 transition-all group"
        >
          <div className="flex items-center gap-2">
            {Icon && <Icon size={12} className="text-[#D4FF00]" />}
            <span className="truncate">{value}</span>
          </div>
          <ChevronDown size={12} className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className={`absolute ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-full bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden backdrop-blur-xl`}>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {options.map((opt: any) => (
                  <button
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-[9px] font-mono uppercase tracking-widest transition-colors hover:bg-[#D4FF00]/10 hover:text-[#D4FF00] ${value === opt ? 'bg-[#D4FF00]/5 text-[#D4FF00]' : 'text-gray-400'}`}
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
      setStep((s) => (s + 1) % steps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md overflow-hidden">
      {/* Scanlines Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 border-2 border-[#D4FF00]/10 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-2 border border-[#D4FF00]/20 rounded-full animate-pulse" />
        <div className="absolute inset-0 border-t-2 border-[#D4FF00] rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {type === 'image' ? <Camera className="text-[#D4FF00] w-8 h-8" /> : <Video className="text-[#D4FF00] w-8 h-8" />}
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
          </div>
        </div>
      </div>

      <div className="text-center space-y-4 max-w-xs px-6 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
            <p className="text-[#D4FF00] font-black italic text-xs uppercase tracking-[0.2em] animate-pulse">
              {message || steps[step]}
            </p>
          </div>
          <p className="text-gray-500 font-mono text-[8px] uppercase tracking-widest">
            {type === 'image' ? 'Neural Frame Synthesis' : 'Temporal Motion Generation'}
          </p>
        </div>

        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full bg-[#D4FF00] transition-all duration-1000 ease-in-out shadow-[0_0_10px_rgba(212,255,0,0.5)]"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {["4K", "RAW", "LOG", "UGC", "REC"].map(tag => (
            <span key={tag} className={`text-[7px] font-mono border px-1.5 py-0.5 rounded uppercase transition-colors ${tag === 'REC' ? 'text-red-500 border-red-500/30 bg-red-500/5' : 'text-white/20 border-white/10'}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const Card = ({ title, icon: Icon, action, tooltip, children, className = '', contentClassName = 'p-5 gap-5' }: any) => (
  <div className={`bg-[#050505] border border-white/5 rounded-xl overflow-hidden flex flex-col shadow-lg transition-all hover:border-white/10 ${className}`}>
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent">
      <div className="flex items-center gap-2.5 text-white font-sans font-bold text-sm tracking-wide">
        {Icon && <Icon size={16} className="text-[#D4FF00]" />}
        <span className="flex items-center gap-2">
          {title}
          {tooltip && (
            <div className="group relative flex items-center">
              <HelpCircle size={14} className="text-[#555] group-hover:text-white transition-colors cursor-help" />
              <div className="absolute left-6 top-1/2 -translate-y-1/2 w-56 p-2.5 bg-[#111] border border-white/10 text-[#999] text-xs font-normal normal-case tracking-normal rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                {tooltip}
              </div>
            </div>
          )}
        </span>
      </div>
      {action && <div>{action}</div>}
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

export default function UGC() {
  const [characterImg, setCharacterImg] = useState<{ url: string, file: File } | null>(null);
  const [productImg, setProductImg] = useState<{ url: string, file: File } | null>(null);

  const [productTags, setProductTags] = useState<string[]>([]);
  const [productDetails, setProductDetails] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [scriptName, setScriptName] = useState('');
  const [script, setScript] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [scenes, setScenes] = useState<{ id: string, prompt: string, isApproved: boolean }[]>([
    { id: '1', prompt: '', isApproved: false }
  ]);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [audioData, setAudioData] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('English');
  const [voice, setVoice] = useState('Kore');
  const [imageStyle, setImageStyle] = useState<'studio' | 'ultra-realistic' | 'iphone' | 'short' | 'normal' | 'cinematic'>('ultra-realistic');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [durationSeconds, setDurationSeconds] = useState<'4' | '6' | '8'>('6');
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('720p');

  const [renderMode, setRenderMode] = useState<'image' | 'video'>('image');
  const [generatedImg, setGeneratedImg] = useState('');
  const [imageEditPrompt, setImageEditPrompt] = useState('');
  const [imageSuggestions, setImageSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState('');
  const [sourceVideo, setSourceVideo] = useState<{ url: string, file: File } | null>(null);
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState(false);
  const [timeline, setTimeline] = useState<{ id: string, url: string, start: number, end: number, duration: number }[]>(() => {
    const saved = localStorage.getItem('ugc_timeline_cache');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  const [zoomLevel, setZoomLevel] = useState(30); // pixels per second
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

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
      setTimeline((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      const totalDuration = timeline.reduce((acc, t) => acc + (t.end - t.start), 0);
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeline]);

  useEffect(() => {
    localStorage.setItem('ugc_timeline_cache', JSON.stringify(timeline));
  }, [timeline]);
  const [isProcessingTimeline, setIsProcessingTimeline] = useState(false);
  const [gallery, setGallery] = useState<{ id: string, type: 'image' | 'video', url: string }[]>([]);
  const [scriptLibrary, setScriptLibrary] = useState<{ id: string, title: string, script: string, videoPrompt: string, date: string }[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [trainedStrategy, setTrainedStrategy] = useState<string>(() => {
    return localStorage.getItem('ugc_trained_strategy') || '';
  });
  const [isTraining, setIsTraining] = useState(false);

  const [knowledgeBase, setKnowledgeBase] = useState<{ id: string, name: string, content: string }[]>(() => {
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
      const allContent = knowledgeBase.map(kb => kb.content).join('\n\n---\n\n');

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

  const [sceneContext, setSceneContext] = useState('Studio (Default)');
  const [isGeneratingMagicPrompt, setIsGeneratingMagicPrompt] = useState(false);
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
            fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
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
        console.error(`Failed to parse ${file.name}`, err);
      }
    }

    setKnowledgeBase(prev => [...prev, ...newEntries]);
    setIsUploadingKB(false);
  };

  const removeKBEntry = (id: string) => {
    setKnowledgeBase(prev => prev.filter(e => e.id !== id));
  };

  const ffmpegRef = React.useRef(new FFmpeg());

  useEffect(() => {
    const saved = localStorage.getItem('ugc_script_library');
    if (saved) {
      try {
        setScriptLibrary(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load script library", e);
      }
    }

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
        const historyGallery = data.map(item => ({
          id: item.id,
          type: item.asset_type as 'image' | 'video',
          url: item.public_url,
          prompt: item.prompt
        }));

        // Use functional state update to avoid overwriting session-generated assets
        setGallery(prev => {
          const newItems = historyGallery.filter(hist => !prev.some(p => p.url === hist.url));
          return [...prev, ...newItems];
        });
      }
    };

    fetchAssets();
  }, []);

  useEffect(() => {
    localStorage.setItem('ugc_script_library', JSON.stringify(scriptLibrary));
  }, [scriptLibrary]);

  const saveToLibrary = () => {
    if (!script) return;
    const newEntry = {
      id: Date.now().toString(),
      title: scriptName || (script.split('\n')[0].substring(0, 30) + '...'),
      script,
      videoPrompt,
      date: new Date().toLocaleString()
    };
    setScriptLibrary([newEntry, ...scriptLibrary]);
    setScriptName('');
  };

  const renameEntry = (id: string, newTitle: string) => {
    setScriptLibrary(scriptLibrary.map(s => s.id === id ? { ...s, title: newTitle } : s));
  };

  const loadFromLibrary = (entry: any) => {
    setScript(entry.script);
    setVideoPrompt(entry.videoPrompt);
  };

  const deleteFromLibrary = (id: string) => {
    setScriptLibrary(scriptLibrary.filter(s => s.id !== id));
  };

  const SortableTimelineItem = ({ item, index, isSelected, zoomLevel, onSelect, onTrimStart, onTrimEnd }: any) => {
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

    const handleTrimStart = (e: React.MouseEvent) => {
      e.stopPropagation();
      const startX = e.clientX;
      const initialStart = item.start;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = (moveEvent.clientX - startX) / zoomLevel;
        const newStart = Math.max(0, Math.min(initialStart + delta, item.end - 0.5));
        onTrimStart(item.id, newStart);
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
        className={`relative h-full flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all group ${isSelected ? 'border-[#D4FF00] shadow-[0_0_20px_rgba(212,255,0,0.4)]' : 'border-[#222] hover:border-white/20'}`}
      >
        {/* Drag Handle */}
        <div {...attributes} {...listeners} className="absolute top-1 left-1/2 -translate-x-1/2 z-20 p-1 bg-black/60 rounded-full cursor-grab active:cursor-grabbing text-white/50 hover:text-[#D4FF00] opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={10} />
        </div>

        {/* Trimming Handles */}
        <div
          onMouseDown={handleTrimStart}
          className="absolute left-0 inset-y-0 w-2 bg-[#D4FF00]/20 hover:bg-[#D4FF00] z-30 cursor-ew-resize transition-colors flex items-center justify-center"
        >
          <div className="w-0.5 h-4 bg-white/50 rounded-full" />
        </div>
        <div
          onMouseDown={handleTrimEnd}
          className="absolute right-0 inset-y-0 w-2 bg-[#D4FF00]/20 hover:bg-[#D4FF00] z-30 cursor-ew-resize transition-colors flex items-center justify-center"
        >
          <div className="w-0.5 h-4 bg-white/50 rounded-full" />
        </div>

        <video src={item.url} className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent h-1/2" />

        <div className="absolute bottom-1.5 left-3 text-white font-mono text-[8px] font-bold drop-shadow-md">
          {index + 1}
        </div>

        <div className="absolute top-1.5 right-3 text-[#D4FF00] font-mono text-[8px] bg-black/60 px-1.5 py-0.5 rounded border border-white/10">
          {(item.end - item.start).toFixed(1)}s
        </div>

        {isSelected && (
          <div className="absolute inset-0 border border-[#D4FF00]/40 pointer-events-none animate-pulse" />
        )}
      </div>
    );
  };

  const addToTimeline = (item: any) => {
    if (item.type !== 'video') return;

    // Use the current duration setting
    const duration = parseInt(durationSeconds);

    const newEntry = {
      id: Date.now().toString(),
      url: item.url,
      start: 0,
      end: duration,
      duration: duration
    };
    setTimeline([...timeline, newEntry]);
  };

  const removeFromTimeline = (id: string) => {
    setTimeline(timeline.filter(t => t.id !== id));
    if (selectedTimelineId === id) setSelectedTimelineId(null);
  };

  const updateTimelineItem = (id: string, updates: any) => {
    setTimeline(timeline.map(t => t.id === id ? { ...t, ...updates } : t));
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
        const inputName = `input${i}.mp4`;
        const outputName = `output${i}.mp4`;
        await ffmpeg.writeFile(inputName, await fetchFile(item.url));

        // Trim command
        await ffmpeg.exec([
          '-ss', item.start.toString(),
          '-to', item.end.toString(),
          '-i', inputName,
          '-c', 'copy',
          outputName
        ]);
        inputFiles.push(outputName);
      }

      // Merge command
      const listContent = inputFiles.map(f => `file ${f}`).join('\n');
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
      setGallery(prev => [{ id: Date.now().toString(), type: 'video', url }, ...prev]);
      setRenderMode('video');
    } catch (e) {
      console.error("Timeline processing failed", e);
      alert("Video processing failed. This might be due to browser security restrictions or file format issues.");
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

  const playAudio = () => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.play().catch(err => console.error("Playback failed", err));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'character' | 'product' | 'generated') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'character') setCharacterImg({ url, file });
    else if (type === 'product') setProductImg({ url, file });
    else {
      setGeneratedImg(url);
      setGallery(prev => [...prev, { id: Date.now().toString(), type: 'image', url }]);
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
        new Uint8Array((frameData as any).buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Extract audio (first 10s)
      await ffmpeg.exec(['-i', 'input.mp4', '-t', '10', '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', 'audio.wav']);
      const audioData = await ffmpeg.readFile('audio.wav');
      const audioBase64 = btoa(
        new Uint8Array((audioData as any).buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
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
      alert("Video analysis failed. Please try again.");
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

  const analyzeScenes = async () => {
    if (!script) return;
    setIsAnalyzingScenes(true);
    try {
      const ai = getAI();
      const contents: any[] = [];

      if (uploadedAudioFile) {
        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(uploadedAudioFile);
        });
        contents.push({ inlineData: { mimeType: uploadedAudioFile.type, data: base64Audio } });
      }

      const prompt = `You are an expert UGC director. Analyze this script and break it down into exactly 3 cinematic scenes. 
      ${uploadedAudioFile ? "I have provided the audio file of this script. Listen to the tone, pacing, and emotional delivery to inform the visual prompts." : ""}
      For each scene, provide a detailed visual prompt for an AI video generator.
      
      CRITICAL: The visualPrompt MUST describe the influencer's facial expressions, hand gestures, and reactions that perfectly sync with the emotional tone, pacing, and specific words in the script. 
      Include camera angles (close-ups for emotion, wide shots for context), dynamic movements, and lighting that enhances the mood of the spoken words. 
      The influencer should react to what they are saying (e.g., smiling when talking about benefits, looking surprised during a hook).
      
      SCRIPT:
      ${script}
      
      Return ONLY a valid JSON array of objects with the following structure:
      [
        {
          "prompt": "Concise visual prompt for scene 1..."
        },
        ...
      ]`;

      contents.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                prompt: { type: Type.STRING }
              },
              required: ["prompt"]
            }
          }
        }
      });

      const data = JSON.parse(response.text || '[]');
      if (data.length > 0) {
        const newScenes = data.map((item: any, idx: number) => ({
          id: (idx + 1).toString(),
          prompt: item.prompt,
          isApproved: false
        }));
        setScenes(newScenes);
        setActiveSceneIndex(0);
        setVideoPrompt(newScenes[0].prompt);
      }
    } catch (e) {
      console.error("Failed to analyze scenes", e);
    }
    setIsAnalyzingScenes(false);
  };

  const generateScript = async () => {
    setIsGeneratingScript(true);
    setScript('');
    setVideoPrompt('');
    try {
      const ai = getAI();

      const strategyContext = trainedStrategy
        ? `\n\nTRAINED VIRAL STRATEGY (APPLY THESE PATTERNS):\n${trainedStrategy}\n\nINSTRUCTION: Use the patterns, hooks, and pacing identified in the strategy above to craft this new script.`
        : '';

      const prompt = `You are an expert TikTok/Instagram Reels UGC creator and viral content strategist. 
      Based on this product: ${productDetails}, create a high-energy, viral-style UGC script AND a detailed video generation prompt.${strategyContext}
      ${userPrompt ? `Additional User Instructions: ${userPrompt}` : ''}
      The spoken script MUST be written in ${language}.
      
      VIRAL STRUCTURE (MANDATORY):
      1. HOOK (0s to 4s): A high-energy, attention-grabbing opening that stops the scroll.
      2. MIDDLE/PAYOFF (4s to 8s): The core value, demonstration, or "wow" moment of the product.
      3. CTA (8s to 12s+): A clear, punchy call to action (e.g., "Link in bio", "Shop now").
      
      SCENE ORGANIZATION: Organize the script into explicitly timestamped blocks (e.g., [0:00 - 0:04], [0:04 - 0:08]) to help the user understand the timing and edit easily.
      The script MUST include visual cues enclosed in square brackets right after the timestamp (e.g., [0:00 - 0:04] [Scene 1: Creator points to camera] ... [0:04 - 0:08] [Scene 2: Close-up]).
      
      CRITICAL FOR PRECISION LIP-SYNC: The video prompt MUST explicitly and meticulously describe the creator's mouth movements, jaw synchronization, and facial expressions to match the spoken words (or lyrics) in the script. 
      Instructions for the video prompt:
      1. Describe the precise articulation of lips and jaw as they form the specific sounds of the script.
      2. Detail the facial expressions (eye movements, eyebrow raises, smiles) that match the emotional tone and inflection of the delivery.
      3. Ensure the synchronization is described as "pixel-perfect" and "frame-accurate" to the rhythm of the speech.
      
      The video prompt should describe the visual scene, camera angles (e.g., close-up, wide shot, dynamic movement), and lighting for an AI video generator, matching the visual cues in the script.
      Return ONLY a valid JSON object with the following structure:
      {
        "script": "The spoken script with [Scene X: Ys - visual cues] and labels for HOOK, PAYOFF, CTA",
        "videoPrompt": "Detailed visual prompt for the AI video generator, describing camera angles, movements, and meticulous lip-syncing/jaw-sync/expression details."
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
              videoPrompt: { type: Type.STRING }
            },
            required: ["script", "videoPrompt"]
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

      // Final parse to get the video prompt
      try {
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        const data = JSON.parse(jsonMatch ? jsonMatch[0] : fullText);
        if (data.script) setScript(data.script);
        if (data.videoPrompt) setVideoPrompt(data.videoPrompt);
      } catch (e) {
        console.error("Final JSON parse failed", e, fullText);
      }
    } catch (e) {
      console.error(e);
    }
    setIsGeneratingScript(false);
  };

  const generateMagicPrompt = async (index: number = activeSceneIndex) => {
    setIsGeneratingMagicPrompt(true);

    const updateScenePrompt = (val: string) => {
      setScenes(prev => prev.map((s, i) => i === index ? { ...s, prompt: val } : s));
      if (index === activeSceneIndex) setVideoPrompt(val);
    };

    updateScenePrompt("Generating AI suggestion...");

    try {
      const ai = getAI();
      const contents = [];
      if (characterImg) {
        contents.push(await fileToGenerativePart(characterImg.file));
      }

      let basePrompt = `You are an expert AI video prompt engineer. Write a concise, 50-word cinematic prompt for Scene ${index + 1} of a 3-scene UGC ad story arc.`;

      if (index > 0) {
        basePrompt += ` Previous scene context: ${scenes[index - 1].prompt}. Ensure a smooth narrative transition.`;
      }

      if (characterImg) {
        basePrompt += ` The subject should be the person in the provided image.`;
      }

      if (productDetails) {
        basePrompt += ` They are showcasing or presenting this product: ${productDetails}.`;
      }

      basePrompt += ` The scene should take place in: ${sceneContext}. Focus on describing camera angles, lighting, and small micro-movements. Return ONLY the prompt text.`;

      contents.push({ text: basePrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents
      });

      if (response.text) {
        updateScenePrompt(response.text.trim());
      } else {
        updateScenePrompt('');
      }
    } catch (e) {
      console.error(e);
      updateScenePrompt('Failed to generate prompt.');
    }
    setIsGeneratingMagicPrompt(false);
  };

  const toggleSceneApproval = (index: number) => {
    setScenes(prev => {
      const newScenes = prev.map((s, i) => i === index ? { ...s, isApproved: !s.isApproved } : s);

      // If we just approved the last scene and it's not scene 3, add a new one
      if (newScenes[index].isApproved && index === newScenes.length - 1 && newScenes.length < 3) {
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
        setAudioUrl(createWavUrl(base64Audio));
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
          { text: `Transcribe this audio exactly. Return ONLY the transcription text.` }
        ]
      });

      if (response.text) {
        setScript(response.text.trim());
      }
    } catch (e) {
      console.error("Transcription failed", e);
      alert("Failed to transcribe audio.");
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
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      setAudioData(base64Audio);
      setAudioUrl(URL.createObjectURL(file));
    } catch (e) {
      console.error("Audio preview setup failed", e);
    }
  };

  const generateImage = async () => {
    setIsGeneratingImage(true);
    try {
      const ai = getAI();
      let contents: any[] = [];

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

      const promptText = `A UGC style photo of a creator holding and showcasing this product: ${productDetails}. 
      The creator looks directly at the camera, engaging the viewer. 
      Style instructions: ${stylePrompt}`;

      // Assemble content parts to shape the final image
      if (characterImg) {
        contents.push(await fileToGenerativePart(characterImg.file));
      }

      if (productImg) {
        contents.push(await fileToGenerativePart(productImg.file));
      }

      contents.push({
        text: `Use this person as the creator (if provided). Show them holding and interacting with this product (if provided) in the following scene: ${promptText}`
      });

      const response = await ai.models.generateContent({
        model: 'imagen-3.0-generate-001',
        contents: contents,
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

            // Ensure we use the public URL so timeline cache never breaks
            const publicUrl = await uploadToSupabase(blob, 'image', promptText);

            const finalUrl = publicUrl || url;
            setGeneratedImg(finalUrl);
            setGeneratedVideo('');
            setGallery(prev => [...prev, { id: Date.now().toString(), type: 'image', url: finalUrl }]);
          } catch (uploadErr) {
            console.error(uploadErr);
            setGeneratedImg(url);
            setGeneratedVideo('');
            setGallery(prev => [...prev, { id: Date.now().toString(), type: 'image', url }]);
          }

          break;
        }
      }
    } catch (e) {
      console.error(e);
    }
    setIsGeneratingImage(false);
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
        base64Data = generatedImg.split(',')[1];
        mimeType = generatedImg.split(';')[0].split(':')[1];
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
        model: 'imagen-3.0-generate-001',
        contents: [
          imagePart,
          { text: `Edit this image based on this request: ${imageEditPrompt}. Maintain the same person and product if they are present.` }
        ],
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
              setGallery(prev => [...prev, { id: Date.now().toString(), type: 'image', url: publicUrl }]);
            } else {
              setGeneratedImg(url);
            }
          } catch (err) {
            console.error("Supabase upload failed for regenerated image", err);
            setGeneratedImg(url);
          }
        }
      }
      setImageEditPrompt(''); // Clear prompt after success
    } catch (e) {
      console.error("Regeneration failed", e);
      alert("Failed to regenerate image.");
    }
    setIsRegeneratingImage(false);
  };

  const generateVideo = async () => {
    if (!hasPaidKey) {
      handleSelectKey();
      return;
    }
    setIsGeneratingVideo(true);
    setVideoError('');
    setVideoProgressMsg('Initializing Veo Engine...');
    try {
      const ai = getAI(true);

      const promptText = videoPrompt || `A creator showcasing a product: ${productDetails}. Cinematic lighting, high quality, 35mm lens.`;

      let imagePayload = undefined;
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
          base64 = generatedImg.split(',')[1];
          mimeType = generatedImg.split(';')[0].split(':')[1];
        }
        imagePayload = { imageBytes: base64, mimeType } as any;
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
        imagePayload = { imageBytes: base64, mimeType } as any;
      }

      setVideoProgressMsg('Submitting to Veo-3...');
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: promptText,
        image: imagePayload,
        config: {
          numberOfVideos: 1,
          resolution: videoResolution as any,
          aspectRatio: aspectRatio as any,
          durationSeconds: parseInt(durationSeconds)
        }
      });

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
          throw new Error(`Download failed: ${response.status} - ${errText}`);
        }
        const blob = await response.blob();
        setVideoProgressMsg('Cloud Archiving...');
        const publicUrl = await uploadToSupabase(blob, 'video', promptText);

        const finalUrl = publicUrl || URL.createObjectURL(blob);
        setGeneratedVideo(finalUrl);
        setGallery(prev => [...prev, { id: Date.now().toString(), type: 'video', url: finalUrl }]);
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
        setVideoError(`Error: ${errMsg}`);
      }
    }
    setIsGeneratingVideo(false);
    setVideoProgressMsg('');
  };

  return (
    <div className="h-full flex flex-col bg-[#020202] text-white selection:bg-[#D4FF00] selection:text-black">

      <div className="flex-1 flex overflow-hidden relative">
        {/* Visible trigger handle on the far right edge */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-20 bg-black border border-[#222] border-r-0 rounded-l-xl z-40 flex items-center justify-center cursor-pointer shadow-2xl hover:bg-[#111] hover:border-[#D4FF00]/50 group transition-all"
          onClick={() => setShowTemplates(true)}
        >
          <div className="w-1 h-8 rounded-full bg-[#333] group-hover:bg-[#D4FF00] transition-colors" />
        </div>

        {/* ── Sidebar (Scene Templates) ─────────────────────────────── */}
        <aside
          onMouseMove={resetSidebarTimer}
          onClick={resetSidebarTimer}
          className={`absolute right-0 top-0 bottom-0 w-80 overflow-y-auto custom-scrollbar flex flex-col bg-black/95 backdrop-blur-3xl border-l border-[#222] z-50 transition-transform duration-500 shadow-2xl ${showTemplates ? 'translate-x-0' : 'translate-x-full'}`}
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
                  ? 'border-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.3)]'
                  : 'border-white/10 hover:border-white/30'
                  }`}
                title={template.title}
              >
                <img src={template.img} alt="" className={`w-full h-full object-cover transition-all duration-300 ${sceneContext === template.sceneContext ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3 text-left">
                  <span className="text-[#D4FF00] font-mono text-[9px] font-bold tracking-widest uppercase">{template.title}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Main Workspace ─────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 xl:p-8 pb-20 w-full">
          <div className="w-full h-full max-w-[1600px] mx-auto">
            {/* ── Master Production Dashboard ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">

              {/* Column 1: Asset Ingestion (Left | 3 cols) */}
              <div className="xl:col-span-3 space-y-4">
                <Card title="Creator Reference" icon={User} tooltip="Upload a photo of the actor or creator." contentClassName="p-0">
                  <div className="relative group w-full aspect-[4/5] bg-[#050505] flex flex-col items-center justify-center cursor-pointer overflow-hidden border-b border-white/5">
                    <input type="file" accept="image/*" onChange={(e: any) => handleImageUpload(e, 'character')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {characterImg ? (
                      <>
                        <img src={characterImg.url} alt="Creator" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                          <span className="bg-black/80 backdrop-blur-md text-[#D4FF00] font-sans text-[10px] font-bold tracking-wide px-3 py-1.5 rounded-md border border-[#D4FF00]/30 shadow-lg flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
                            Photo Uploaded
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-[#555] group-hover:text-[#D4FF00] transition-colors">
                        <Upload size={24} />
                        <span className="font-sans text-[11px] font-bold tracking-wide text-[#999]">Upload Photo</span>
                      </div>
                    )}
                  </div>
                </Card>

                <Card title="Product Spec" icon={Box} tooltip="Upload the product you want to feature. Our AI will extract its visual DNA." contentClassName="p-0">
                  <div className="flex flex-col h-full">
                    <div className="relative group w-full aspect-[4/5] bg-[#050505] flex flex-col items-center justify-center cursor-pointer overflow-hidden border-b border-white/5">
                      <input type="file" accept="image/*" onChange={(e: any) => handleImageUpload(e, 'product')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      {productImg ? (
                        <>
                          <img src={productImg.url} alt="Product" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                            <span className="bg-black/80 backdrop-blur-md text-[#D4FF00] font-sans text-[10px] font-bold tracking-wide px-3 py-1.5 rounded-md border border-[#D4FF00]/30 shadow-lg flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
                              Product Uploaded
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-[#555] group-hover:text-[#D4FF00] transition-colors">
                          <Upload size={24} />
                          <span className="font-sans text-[11px] font-bold tracking-wide text-[#999]">Upload Case</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-black/20">
                      <Button onClick={analyzeProduct} disabled={!productImg || isAnalyzing} loading={isAnalyzing} variant={productDetails ? 'ghost' : 'primary'} className="w-full">
                        {productDetails ? 'Re-Analyze DNA' : 'Analyze DNA'}
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card title="Video Reference" icon={Video} tooltip="Upload a reference video to extract style, audio, and script." contentClassName="p-0">
                  <div className="flex flex-col h-full">
                    <div className="relative group w-full aspect-[4/5] bg-[#050505] flex flex-col items-center justify-center cursor-pointer overflow-hidden border-b border-white/5">
                      <input type="file" accept="video/*" onChange={handleVideoUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      {sourceVideo ? (
                        <>
                          <video src={sourceVideo.url} className="w-full h-full object-cover opacity-60" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play size={32} className="text-white opacity-50 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                            <span className="bg-black/80 backdrop-blur-md text-[#D4FF00] font-sans text-[10px] font-bold tracking-wide px-3 py-1.5 rounded-md border border-[#D4FF00]/30 shadow-lg flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
                              Video Uploaded
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-[#555] group-hover:text-[#D4FF00] transition-colors">
                          <Upload size={24} />
                          <span className="font-sans text-[11px] font-bold tracking-wide text-[#999]">Upload Reference Video</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-black/20">
                      <Button onClick={analyzeVideo} disabled={!sourceVideo || isAnalyzingVideo} loading={isAnalyzingVideo} variant={sourceVideo ? 'primary' : 'ghost'} className="w-full">
                        Analyze Video Context
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
                          <BrainCircuit size={14} className="text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Training Agent</span>
                        </div>
                        <button
                          onClick={trainAgent}
                          disabled={isTraining || knowledgeBase.length === 0}
                          className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
                        <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Agent Status: Trained</span>
                          </div>
                          <p className="text-[9px] text-gray-400 italic leading-relaxed line-clamp-3">
                            "{trainedStrategy}"
                          </p>
                        </div>
                      )}

                      <div className="relative group w-full py-6 bg-black/40 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 transition-all">
                        <input
                          type="file"
                          multiple
                          accept=".txt,.md,.pdf"
                          onChange={handleKBUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        {isUploadingKB ? (
                          <Loader2 size={20} className="text-emerald-500 animate-spin" />
                        ) : (
                          <>
                            <Plus size={20} className="text-[#555] group-hover:text-emerald-500 mb-2" />
                            <span className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Add Viral Scripts</span>
                            <span className="text-[8px] text-gray-600 mt-1 uppercase tracking-widest">PDF, TXT, MD</span>
                          </>
                        )}
                      </div>

                      {knowledgeBase.length > 0 && (
                        <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                          {knowledgeBase.map((kb) => (
                            <div key={kb.id} className="group flex items-center justify-between p-2.5 bg-white/5 border border-white/5 rounded-lg hover:border-white/20 transition-all">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileText size={12} className="text-emerald-500 flex-shrink-0" />
                                <span className="text-[10px] text-gray-300 truncate font-medium">{kb.name}</span>
                              </div>
                              <button
                                onClick={() => setKnowledgeBase(prev => prev.filter(item => item.id !== kb.id))}
                                className="text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={12} />
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
              <div className="xl:col-span-5 space-y-4">
                <Card title="Vision Output" icon={Wand2} contentClassName="p-0">
                  {productTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2 px-4 pt-4">
                      {productTags.map((tag, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded border border-[#D4FF00]/30 text-[#D4FF00] font-mono text-[8px] uppercase tracking-widest bg-[#D4FF00]/5 flex items-center gap-1"><Sparkles size={8} />{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className={`bg-black/40 border-t border-white/5 p-4 font-mono text-[9px] text-gray-400 leading-relaxed italic overflow-y-auto ${productTags.length > 0 ? 'max-h-[80px]' : 'h-[50px] flex items-center text-[#555]'}`}>
                    {productDetails || "Awaiting product scan..."}
                  </div>
                  {productDetails && (
                    <div className="p-3 border-t border-white/5 bg-black/20">
                      <Button
                        onClick={generateMagicPrompt}
                        disabled={isGeneratingMagicPrompt}
                        loading={isGeneratingMagicPrompt}
                        className="w-full text-[10px] py-2"
                      >
                        <Sparkles size={12} /> Generate Magic Video Prompt
                      </Button>
                    </div>
                  )}
                </Card>

                <Card title="Concept & Narrative" icon={FileText} tooltip="Define the core scene parameters, voiceover script, and visual prompt for the generative AI models." contentClassName="p-5 gap-3">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[#999] font-sans font-bold text-[10px] tracking-wide mb-1.5 block uppercase">Creative Direction / Direct instructions</label>
                      <input
                        type="text"
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        placeholder="e.g., Energetic demo with a focus on product durability..."
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 font-sans text-[11px] text-white focus:outline-none focus:border-[#D4FF00] transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
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

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[#999] font-sans font-bold text-[10px] tracking-wide block uppercase">Script Protocol</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={scriptName}
                            onChange={(e) => setScriptName(e.target.value)}
                            placeholder="Script Name (Optional)"
                            className="bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 font-sans text-[10px] text-white focus:outline-none focus:border-[#D4FF00] transition-colors w-32"
                          />
                          <button onClick={saveToLibrary} disabled={!script} className="text-[10px] font-sans font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/5 text-[#777] hover:text-white hover:border-white/20 transition-all disabled:opacity-30">Archive</button>
                          <button onClick={generateScript} disabled={isGeneratingScript} className="text-[10px] font-sans font-bold tracking-wider px-3 py-1.5 rounded-lg bg-[#D4FF00]/10 border border-[#D4FF00]/20 text-[#D4FF00] hover:bg-[#D4FF00] hover:text-black transition-all">
                            {isGeneratingScript ? 'Writing...' : 'Generate Script'}
                          </button>
                          <button onClick={analyzeScenes} disabled={isAnalyzingScenes || !script} className="text-[10px] font-sans font-bold tracking-wider px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-30">
                            {isAnalyzingScenes ? 'Analyzing...' : 'Analyze Scenes'}
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        {isGeneratingScript && (
                          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <div key={i} className="w-1.5 h-1.5 bg-[#D4FF00] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                              ))}
                            </div>
                            <p className="text-[10px] font-mono text-[#D4FF00] uppercase tracking-widest animate-pulse">Drafting UGC Script...</p>
                          </div>
                        )}
                        <textarea
                          value={script}
                          onChange={(e) => setScript(e.target.value)}
                          className="w-full h-64 bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-sans text-sm text-white focus:outline-none focus:border-[#D4FF00] resize-none leading-relaxed"
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
                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all ${activeSceneIndex === idx ? 'bg-[#D4FF00] text-black font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                          >
                            Scene {idx + 1}
                            {scene.isApproved && <Check size={10} className={activeSceneIndex === idx ? 'text-black' : 'text-[#D4FF00]'} />}
                          </button>
                        ))}
                      </div>

                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[#999] font-sans font-bold text-[10px] tracking-wide block uppercase">Visual Prompt / Scene {activeSceneIndex + 1} Logic</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleSceneApproval(activeSceneIndex)}
                            className={`text-[10px] font-sans font-bold tracking-wider px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${scenes[activeSceneIndex].isApproved ? 'bg-[#D4FF00] text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'}`}
                          >
                            {scenes[activeSceneIndex].isApproved ? <CheckCircle size={12} /> : <Check size={12} />}
                            {scenes[activeSceneIndex].isApproved ? 'Approved' : 'Approve Scene'}
                          </button>
                          <button onClick={() => generateMagicPrompt(activeSceneIndex)} disabled={isGeneratingMagicPrompt} className="text-[10px] font-sans font-bold tracking-wider px-3 py-1.5 rounded-lg bg-[#D4FF00]/10 border border-[#D4FF00]/20 text-[#D4FF00] hover:bg-[#D4FF00] hover:text-black transition-all">
                            {isGeneratingMagicPrompt ? 'Enhancing...' : 'Enhance Prompt'}
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        {isGeneratingMagicPrompt && (
                          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <div key={i} className="w-1.5 h-1.5 bg-[#D4FF00] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                              ))}
                            </div>
                            <p className="text-[10px] font-mono text-[#D4FF00] uppercase tracking-widest animate-pulse">Enhancing Visual Logic...</p>
                          </div>
                        )}
                        <textarea
                          value={videoPrompt}
                          onChange={(e) => {
                            setVideoPrompt(e.target.value);
                            setScenes(prev => prev.map((s, i) => i === activeSceneIndex ? { ...s, prompt: e.target.value } : s));
                          }}
                          className="w-full h-48 bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-sans text-sm text-white focus:outline-none focus:border-[#D4FF00] resize-none leading-relaxed border-dashed"
                          placeholder={`Describe cinematic action for Scene ${activeSceneIndex + 1}...`}
                        />
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
                      <Button onClick={generateImage} disabled={isGeneratingImage || !productDetails} loading={isGeneratingImage} variant="secondary" className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest">
                        Gen Reference
                      </Button>
                    </div>

                    {audioData && (
                      <div className="p-3 bg-[#D4FF00]/5 border border-[#D4FF00]/20 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#D4FF00] font-black italic text-[9px] uppercase tracking-widest">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-ping" /><span>Audio Ready</span>
                        </div>
                        <button onClick={playAudio} className="p-2 bg-[#D4FF00] text-black rounded-lg hover:scale-105 transition-transform"><Play size={14} fill="currentColor" /></button>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Column 3: Studio Monitor (Right | 4 cols) */}
              <div className="xl:col-span-4 sticky top-1">
                <Card title="Studio Monitor" icon={Video} contentClassName="p-0" className="h-[calc(100vh-45px)] min-h-[555px]">
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
                              <div className="absolute top-4 left-4 z-20">
                                <label className="shadow-xl py-1.5 px-3 bg-black/50 backdrop-blur-md border border-white/10 text-white font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-white/20 transition-all flex items-center gap-1.5 cursor-pointer">
                                  <Upload size={10} /> Direct Upload
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleImageUpload(e, 'generated')}
                                  />
                                </label>
                              </div>
                              <div className="absolute top-4 right-4 flex gap-2 z-20">
                                <button
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(generatedImg);
                                      const blob = await response.blob();
                                      const downloadUrl = window.URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = downloadUrl;
                                      a.download = `lunar_flare_image_${Date.now()}.png`;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      window.URL.revokeObjectURL(downloadUrl);
                                    } catch (err) {
                                      console.error("Error downloading file", err);
                                      const a = document.createElement('a');
                                      a.href = generatedImg;
                                      a.download = `lunar_flare_image_${Date.now()}.png`;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                    }
                                  }}
                                  className="shadow-xl py-1.5 px-3 bg-black/50 backdrop-blur-md border border-white/10 text-white font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-white/20 transition-all flex items-center gap-1.5"
                                >
                                  <Download size={10} /> Download Image
                                </button>
                                <button onClick={() => window.open(generatedImg)} className="shadow-xl py-1.5 px-3 bg-black/50 backdrop-blur-md border border-white/10 text-white font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-white/20 transition-all">Expand</button>
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 opacity-60">
                              <div className="relative group">
                                <div className="absolute inset-0 bg-[#D4FF00]/10 rounded-full blur-xl animate-pulse"></div>
                                <div className="w-16 h-16 rounded-full border border-white/5 bg-black/50 backdrop-blur-lg flex items-center justify-center relative z-10">
                                  <Camera size={24} className="text-[#D4FF00] opacity-50" />
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
                                className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${renderMode === mode ? 'bg-[#D4FF00] text-black shadow-lg shadow-[#D4FF00]/10' : 'text-gray-500 hover:text-white'}`}
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

                          {generatedImg && (
                            <div className="mt-4 space-y-3 p-3 bg-white/5 rounded-xl border border-white/10 pointer-events-auto">
                              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Refine Frame</label>
                              <textarea
                                value={imageEditPrompt}
                                onChange={(e) => setImageEditPrompt(e.target.value)}
                                placeholder="e.g., Change location to a sunny park, make her smile more..."
                                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 font-sans text-[10px] text-white focus:outline-none focus:border-[#D4FF00] transition-colors resize-none h-16"
                              />
                              <Button
                                onClick={regenerateImage}
                                disabled={isRegeneratingImage || !imageEditPrompt}
                                loading={isRegeneratingImage}
                                variant="ghost"
                                className="w-full text-[9px] border-[#D4FF00]/30 text-[#D4FF00] hover:bg-[#D4FF00]/10"
                              >
                                Apply Changes & Regenerate
                              </Button>
                            </div>
                          )}
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
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await fetch(generatedVideo);
                                    const blob = await response.blob();
                                    const downloadUrl = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = downloadUrl;
                                    a.download = `lunar_flare_video_${Date.now()}.mp4`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    window.URL.revokeObjectURL(downloadUrl);
                                  } catch (err) {
                                    console.error("Error downloading file", err);
                                    // Fallback for direct download
                                    const a = document.createElement('a');
                                    a.href = generatedVideo;
                                    a.download = `lunar_flare_video_${Date.now()}.mp4`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                  }
                                }}
                                className="absolute top-4 shadow-xl right-4 py-1.5 px-3 bg-black/50 backdrop-blur-md border border-white/10 text-white font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-white/20 transition-all z-20 flex items-center gap-1.5"
                              >
                                <Download size={10} /> Download Video
                              </button>
                              <div className="absolute inset-x-0 bottom-[140px] p-4 flex justify-center z-20 pointer-events-none">
                                <button onClick={() => addToTimeline({ id: Date.now().toString(), type: 'video', url: generatedVideo })} className="px-6 py-2 bg-[#D4FF00] text-black font-black text-[9px] uppercase tracking-widest rounded-lg hover:scale-105 transition-all shadow-[0_0_20px_rgba(212,255,0,0.3)] pointer-events-auto">Deploy to Timeline</button>
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
                                <div className="absolute inset-0 border border-[#D4FF00] rounded-full animate-ping opacity-20"></div>
                                <div className="absolute inset-0 bg-[#D4FF00]/10 rounded-full blur-xl animate-pulse"></div>
                                <div className="w-16 h-16 rounded-full border border-white/5 bg-black/50 backdrop-blur-lg flex items-center justify-center relative z-10 overflow-hidden">
                                  <div className="absolute inset-0 border-t border-[#D4FF00] rounded-full animate-spin opacity-30" style={{ animationDuration: '3s' }}></div>
                                  <Video size={24} className="text-[#D4FF00] opacity-80" />
                                </div>
                              </div>
                              <div className="text-center space-y-2">
                                <p className="font-black text-white text-[10px] uppercase tracking-[0.2em] relative inline-block">
                                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse"></span>
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
                                className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${renderMode === mode ? 'bg-[#D4FF00] text-black shadow-lg shadow-[#D4FF00]/10' : 'text-gray-500 hover:text-white'}`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>

                          {!hasPaidKey ? (
                            <div className="p-4 border border-[#D4FF00]/20 bg-[#D4FF00]/10 backdrop-blur-md rounded-xl flex flex-col gap-3 pointer-events-auto">
                              <div className="flex items-center gap-2 text-[#D4FF00] font-black italic text-[9px] uppercase tracking-widest"><Sparkles size={14} /><span>Veo-3 Required</span></div>
                              <Button onClick={handleSelectKey} className="w-full py-2.5 text-[9px]">Authorize Vertex Key</Button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 gap-1.5 pointer-events-auto">
                              <button
                                onClick={handleResetKey}
                                className="flex flex-col gap-1.5 group"
                              >
                                <span className="text-gray-500 font-mono text-[8px] uppercase tracking-widest pl-1 text-left">Engine</span>
                                <div className="w-full h-[31px] border border-white/10 bg-black/40 backdrop-blur-md rounded-lg text-gray-400 font-mono text-[8px] uppercase tracking-widest hover:text-white hover:border-white/30 transition-colors flex justify-center items-center gap-1.5 px-2">
                                  <Sparkles size={10} className="text-[#D4FF00]" />
                                  <span className="truncate">Vertex</span>
                                </div>
                              </button>
                              <Dropdown
                                label="Duration"
                                value={`${durationSeconds}s`}
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

                          <Button onClick={generateVideo} disabled={isGeneratingVideo} loading={isGeneratingVideo} className="w-full py-4 pointer-events-auto">Produce Video</Button>
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
                <div className="max-w-7xl mx-auto mt-8 border-t border-[#222] pt-6">
                  <h2 className="text-[#D4FF00] font-mono text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkles size={14} />
                    Generated Assets Queue
                  </h2>
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {gallery.map(item => (
                      <div
                        key={item.id}
                        className="relative w-32 h-40 flex-shrink-0 border border-[#222] rounded-lg overflow-hidden group border-[#222] hover:border-[#D4FF00] transition-colors"
                      >
                        {item.type === 'image' ? (
                          <img src={item.url} className="w-full h-full object-cover" />
                        ) : (
                          <video src={item.url} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute top-2 right-2 bg-black/80 p-1.5 rounded border border-[#333]">
                          {item.type === 'image' ? <Camera size={12} className="text-[#D4FF00]" /> : <Video size={12} className="text-[#D4FF00]" />}
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
                                a.download = `lunar_flare_asset_${Date.now()}.${item.type === 'video' ? 'mp4' : 'png'}`;
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
                              className="w-full font-mono text-[9px] uppercase tracking-widest text-black bg-[#D4FF00] hover:bg-[#D4FF00] py-1.5 rounded font-bold transition-all flex items-center justify-center gap-2"
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
                    <h2 className="text-[#D4FF00] font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
                      <Scissors size={14} />
                      Professional Editor / Timeline
                    </h2>
                    <p className="text-[#555] text-[9px] font-sans uppercase tracking-tighter">Trim, Arrange, and Master your UGC content</p>
                  </div>
                  {timeline.length > 0 && (
                    <div className="flex gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => { setTimeline([]); setSelectedTimelineId(null); }}
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
                    {/* The Track */}
                    <div className="bg-[#080808] border border-[#1a1a1a] rounded-2xl p-6 overflow-hidden shadow-2xl relative">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full border border-white/5">
                            <span className="text-[#555] font-mono text-[9px] uppercase tracking-widest">Sequence 01</span>
                            <div className="w-1 h-1 rounded-full bg-[#D4FF00]" />
                            <span className="text-white font-mono text-[11px] font-bold">
                              {timeline.reduce((acc, t) => acc + (t.end - t.start), 0).toFixed(1)}s
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setIsPlaying(!isPlaying)}
                              className="p-2 rounded-full bg-[#D4FF00] text-black hover:scale-110 transition-transform"
                            >
                              {isPlaying ? <X size={14} /> : <Play size={14} fill="currentColor" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3 bg-black/60 px-4 py-2 rounded-full border border-white/5">
                            <ZoomOut size={14} className="text-gray-600" />
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={zoomLevel}
                              onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                              className="w-32 accent-[#D4FF00] h-1 bg-[#222] rounded-full appearance-none cursor-pointer"
                            />
                            <ZoomIn size={14} className="text-gray-600" />
                          </div>
                        </div>
                      </div>

                      <div className="relative">
                        {/* Playhead */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-40 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                          style={{ left: `${currentTime * zoomLevel + 8}px` }}
                        >
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rotate-45" />
                        </div>

                        <div className="flex h-40 bg-[#050505] border border-[#1a1a1a] rounded-xl overflow-x-auto custom-scrollbar p-2 gap-2 relative">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                            modifiers={[restrictToHorizontalAxis]}
                          >
                            <SortableContext
                              items={timeline.map(t => t.id)}
                              strategy={horizontalListSortingStrategy}
                            >
                              {timeline.map((item, index) => (
                                <SortableTimelineItem
                                  key={item.id}
                                  item={item}
                                  index={index}
                                  isSelected={selectedTimelineId === item.id}
                                  zoomLevel={zoomLevel}
                                  onSelect={setSelectedTimelineId}
                                  onTrimStart={(id: string, start: number) => updateTimelineItem(id, { start })}
                                  onTrimEnd={(id: string, end: number) => updateTimelineItem(id, { end })}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
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
                                <video
                                  id={`timeline-video-${item.id}`}
                                  src={item.url}
                                  className="w-full h-full object-contain"
                                  onTimeUpdate={(e: any) => {
                                    // Sync playhead if needed
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                                  <Play size={48} className="text-white/20" />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => {
                                  const video = document.getElementById(`timeline-video-${item.id}`) as HTMLVideoElement;
                                  if (video) {
                                    video.currentTime = item.start;
                                    video.play();
                                    const checkEnd = () => {
                                      if (video.currentTime >= item.end) {
                                        video.pause();
                                        video.removeEventListener('timeupdate', checkEnd);
                                      }
                                    };
                                    video.addEventListener('timeupdate', checkEnd);
                                  }
                                }}
                                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-all border border-white/10 font-mono text-[10px] uppercase tracking-widest"
                                >
                                  <Play size={14} fill="currentColor" /> Preview Trim
                                </button>
                                <button onClick={() => {
                                  const video = document.getElementById(`timeline-video-${item.id}`) as HTMLVideoElement;
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
                                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#D4FF00]/10 text-[#D4FF00] hover:bg-[#D4FF00] hover:text-black transition-all border border-[#D4FF00]/20 font-mono text-[10px] uppercase tracking-widest"
                                >
                                  <Camera size={14} /> Extend Scene
                                </button>
                              </div>
                            </div>

                            {/* Controls */}
                            <div className="lg:col-span-7 flex flex-col space-y-6">
                              <div className="flex justify-between items-center border-b border-[#1a1a1a] pb-4">
                                <div className="flex flex-col">
                                  <h3 className="text-white font-mono text-[11px] uppercase tracking-widest flex items-center gap-2">
                                    <Settings size={16} className="text-[#D4FF00]" />
                                    Clip Inspector
                                  </h3>
                                  <span className="text-[#555] text-[9px] font-mono uppercase">Index: {index + 1} / ID: {item.id.slice(0, 8)}</span>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => moveTimelineItem(index, 'left')} disabled={index === 0} className="p-2.5 rounded-xl bg-[#111] text-[#555] hover:text-[#D4FF00] disabled:opacity-30 border border-[#222] transition-colors">
                                    <ChevronLeft size={16} />
                                  </button>
                                  <button onClick={() => moveTimelineItem(index, 'right')} disabled={index === timeline.length - 1} className="p-2.5 rounded-xl bg-[#111] text-[#555] hover:text-[#D4FF00] disabled:opacity-30 border border-[#222] transition-colors">
                                    <ChevronRight size={16} />
                                  </button>
                                  <button onClick={() => { removeFromTimeline(item.id); setSelectedTimelineId(null); }} className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[#999] font-mono text-[10px] uppercase tracking-widest">In Point</label>
                                    <div className="flex items-center gap-2 bg-[#111] border border-[#222] rounded-lg px-3 py-1.5">
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max={item.end - 0.5}
                                        value={item.start.toFixed(1)}
                                        onChange={(e) => updateTimelineItem(item.id, { start: Math.max(0, Math.min(parseFloat(e.target.value) || 0, item.end - 0.5)) })}
                                        className="bg-transparent text-[#D4FF00] font-mono text-[11px] w-12 text-center focus:outline-none"
                                      />
                                      <span className="text-[#444] text-[9px] font-mono">SEC</span>
                                    </div>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max={item.duration}
                                    step="0.1"
                                    value={item.start}
                                    onChange={(e) => updateTimelineItem(item.id, { start: Math.min(parseFloat(e.target.value), item.end - 0.5) })}
                                    className="w-full accent-[#D4FF00] h-1.5 bg-[#1a1a1a] rounded-full appearance-none cursor-pointer"
                                  />
                                </div>

                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[#999] font-mono text-[10px] uppercase tracking-widest">Out Point</label>
                                    <div className="flex items-center gap-2 bg-[#111] border border-[#222] rounded-lg px-3 py-1.5">
                                      <input
                                        type="number"
                                        step="0.1"
                                        min={item.start + 0.5}
                                        max={item.duration}
                                        value={item.end.toFixed(1)}
                                        onChange={(e) => updateTimelineItem(item.id, { end: Math.min(item.duration, Math.max(parseFloat(e.target.value) || item.duration, item.start + 0.5)) })}
                                        className="bg-transparent text-[#D4FF00] font-mono text-[11px] w-12 text-center focus:outline-none"
                                      />
                                      <span className="text-[#444] text-[9px] font-mono">SEC</span>
                                    </div>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max={item.duration}
                                    step="0.1"
                                    value={item.end}
                                    onChange={(e) => updateTimelineItem(item.id, { end: Math.max(parseFloat(e.target.value), item.start + 0.5) })}
                                    className="w-full accent-[#D4FF00] h-1.5 bg-[#1a1a1a] rounded-full appearance-none cursor-pointer"
                                  />
                                </div>
                              </div>

                              <div className="pt-4 border-t border-[#1a1a1a]">
                                <div className="flex items-center justify-between mb-4">
                                  <Dropdown
                                    label="Crop & Aspect Ratio"
                                    value="9:16" // This would ideally be linked to a clip-specific state
                                    options={['9:16', '1:1', '16:9']}
                                    onChange={() => { }} // Placeholder for clip-specific state update
                                    className="w-48"
                                    direction="up"
                                    icon={Layout}
                                  />
                                </div>
                                <div className="bg-[#111] border border-[#222] rounded-xl p-8 flex flex-col items-center justify-center text-center gap-2">
                                  <Layout size={24} className="text-[#333]" />
                                  <p className="text-[#555] font-mono text-[9px] uppercase tracking-widest">Spatial Cropping Engine Active</p>
                                  <p className="text-[#444] text-[8px] font-sans">AI automatically centers on detected subjects</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="bg-[#080808] border border-[#1a1a1a] rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-[#111] flex items-center justify-center text-[#333] mb-4 border border-[#1a1a1a]">
                          <Settings size={20} />
                        </div>
                        <p className="text-[#555] font-mono text-[10px] uppercase tracking-widest">Select a clip on the timeline to unlock professional mastering tools</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Script Library */}
              {scriptLibrary.length > 0 && (
                <div className="max-w-7xl mx-auto mt-8 border-t border-white/10 pt-8 pb-12">
                  <h2 className="text-[#D4FF00] font-mono text-[10px] uppercase tracking-widest mb-6 flex items-center gap-2">
                    <FileText size={14} />
                    Script Library / Viral Templates
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scriptLibrary.map(entry => (
                      <div key={entry.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 hover:border-[#D4FF00]/50 transition-colors group">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-sans text-sm font-bold line-clamp-1">{entry.title}</span>
                              <button
                                onClick={() => {
                                  const newName = window.prompt('Rename script:', entry.title);
                                  if (newName !== null && newName.trim() !== '') {
                                    renameEntry(entry.id, newName);
                                  }
                                }}
                                className="text-gray-600 hover:text-[#D4FF00] transition-colors"
                                title="Rename"
                              >
                                <Scissors size={10} />
                              </button>
                            </div>
                            <span className="text-gray-500 font-mono text-[9px] uppercase tracking-widest mt-1">{entry.date}</span>
                          </div>
                          <button
                            onClick={() => deleteFromLibrary(entry.id)}
                            className="text-gray-500 hover:text-red-500 transition-colors bg-white/5 p-1.5 rounded-lg"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-gray-400 text-xs line-clamp-3 font-sans italic leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                          {entry.script.substring(0, 100)}...
                        </p>
                        <div className="flex gap-2 mt-auto pt-2">
                          <button
                            onClick={() => loadFromLibrary(entry)}
                            className="w-full bg-[#D4FF00] text-black font-black text-[10px] uppercase tracking-widest py-3 rounded-xl hover:-translate-y-0.5 transition-all shadow-lg"
                          >
                            Load Script
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main >

        {/* Admin Login Modal */}
        {showAdminLogin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <ShieldCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Admin Access</h2>
                  <p className="text-xs opacity-50">Enter password to manage Knowledge Base</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider opacity-50 font-mono">Password</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="••••••••"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAdminLogin(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdminLogin}
                    className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition-colors"
                  >
                    Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Toggle (Hidden in footer) */}
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminLogin(true)}
            className={`p-2 rounded-full border border-white/10 backdrop-blur-md transition-all ${isAdmin ? 'bg-emerald-500 text-black' : 'bg-black/50 opacity-20 hover:opacity-100'}`}
            title={isAdmin ? "Logout Admin" : "Admin Login"}
          >
            {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
          </button>
        </div>
      </div >
    </div >
  );
}
