import React, { useState, useEffect } from 'react';
import { Upload, User, Box, FileText, Camera, Play, Wand2, Loader2, Volume2, Sparkles, Video, X, Scissors, Plus, Trash2, Save, ChevronRight, ChevronLeft, Layout, AlertCircle, HelpCircle, Settings, SidebarClose, SidebarOpen, Download } from 'lucide-react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { supabase } from '../../lib/supabase';

const getAI = (usePaidKey = false) => {
  const apiKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_API_KEY) || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY);
  const projectId = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_PROJECT_ID;
  const location = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_LOCATION) || 'us-central1';

  if (usePaidKey && !apiKey && !projectId) {
    throw new Error("Vertex AI Key or Project required");
  }

  let config: any = { apiKey };
  if (usePaidKey && projectId) {
    config = { vertexai: { project: projectId, location: location } };
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
  const [script, setScript] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [audioData, setAudioData] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [language, setLanguage] = useState('English');
  const [voice, setVoice] = useState('Kore');
  const [imageStyle, setImageStyle] = useState<'studio' | 'ultra-realistic' | 'iphone' | 'short' | 'normal' | 'cinematic'>('studio');
  const [durationSeconds, setDurationSeconds] = useState<'4' | '6' | '8'>('6');

  const [renderMode, setRenderMode] = useState<'image' | 'video'>('image');
  const [generatedImg, setGeneratedImg] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState('');
  const [timeline, setTimeline] = useState<{ id: string, url: string, start: number, end: number, duration: number }[]>(() => {
    const saved = localStorage.getItem('ugc_timeline_cache');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('ugc_timeline_cache', JSON.stringify(timeline));
  }, [timeline]);
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const [isProcessingTimeline, setIsProcessingTimeline] = useState(false);
  const [gallery, setGallery] = useState<{ id: string, type: 'image' | 'video', url: string }[]>([]);
  const [scriptLibrary, setScriptLibrary] = useState<{ id: string, title: string, script: string, videoPrompt: string, date: string }[]>([]);

  const [sceneContext, setSceneContext] = useState('Studio (Default)');
  const [isGeneratingMagicPrompt, setIsGeneratingMagicPrompt] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const scriptTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [scriptSelection, setScriptSelection] = useState<{ start: number, end: number, text: string } | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);

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
      title: script.split('\n')[0].substring(0, 30) + '...',
      script,
      videoPrompt,
      date: new Date().toLocaleString()
    };
    setScriptLibrary([newEntry, ...scriptLibrary]);
  };

  const loadFromLibrary = (entry: any) => {
    setScript(entry.script);
    setVideoPrompt(entry.videoPrompt);
  };

  const deleteFromLibrary = (id: string) => {
    setScriptLibrary(scriptLibrary.filter(s => s.id !== id));
  };

  const addToTimeline = (item: any) => {
    if (item.type !== 'video') return;

    // Get duration (mocking for now, in real app we'd get it from metadata)
    const duration = 6; // Default to 6s since that's our default render

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'character' | 'product') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'character') setCharacterImg({ url, file });
    else setProductImg({ url, file });
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

  const generateScript = async () => {
    setIsGeneratingScript(true);
    setScript('');
    setVideoPrompt('');
    try {
      const ai = getAI();
      const prompt = `You are an expert TikTok/Instagram Reels UGC creator and viral content strategist. 
      Based on this product: ${productDetails}, create a high-energy, viral-style UGC script AND a detailed video generation prompt.
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

  const handleScriptSelect = () => {
    if (scriptTextareaRef.current) {
      const start = scriptTextareaRef.current.selectionStart;
      const end = scriptTextareaRef.current.selectionEnd;
      if (start !== end && end - start > 0) {
        setScriptSelection({
          start,
          end,
          text: scriptTextareaRef.current.value.substring(start, end)
        });
      } else {
        setScriptSelection(null);
      }
    }
  };

  const rewriteSelection = async () => {
    if (!scriptSelection) return;
    setIsRewriting(true);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Rewrite the following script snippet to be more engaging or phrased differently. Keep it concise. Simply provide the rewritten text without markdown or quotes. Snippet: "${scriptSelection.text}"`
      });
      const newText = response.text?.trim() || '';

      const newScript = script.substring(0, scriptSelection.start) + newText + script.substring(scriptSelection.end);
      setScript(newScript);
      setScriptSelection(null);
    } catch (e) {
      console.error("Failed to rewrite", e);
    }
    setIsRewriting(false);
  };

  const generateMagicPrompt = async () => {
    setIsGeneratingMagicPrompt(true);
    setVideoPrompt("Generating AI suggestion...");
    try {
      const ai = getAI();

      const contents = [];
      if (characterImg) {
        contents.push(await fileToGenerativePart(characterImg.file));
      }

      let basePrompt = `You are an expert AI video prompt engineer. Write a concise, 50-word cinematic prompt for a video generation model (like Veo).`;
      if (characterImg) {
        basePrompt += ` The subject should be the person in the provided image.`;
      }

      if (productDetails) {
        basePrompt += ` They are showcasing or presenting this product: ${productDetails}.`;
      }

      basePrompt += ` The scene should take place in: ${sceneContext}. Focus on describing camera angles, lighting, and small micro-movements to make the video look hyper-realistic. Return ONLY the prompt text without quotes or explanations.`;

      contents.push({ text: basePrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents
      });

      if (response.text) {
        setVideoPrompt(response.text.trim());
      } else {
        setVideoPrompt('');
      }
    } catch (e) {
      console.error(e);
      setVideoPrompt('Failed to generate prompt.');
    }
    setIsGeneratingMagicPrompt(false);
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

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      // Ensure we treat this as base64 without the data URI prefix if reusing audioData logic. 
      // The audio preview mechanism `createWavUrl` works best with consistent base64.
      const base64Audio = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      // We maintain the file type by wrapping it properly for standard preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAudioData(base64Audio);
        setAudioUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

    } catch (err) {
      console.error("Failed to parse uploaded audio", err);
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
        stylePrompt = 'Professional studio lighting, high contrast, moody, cinematic, shot on 35mm lens, polished commercial look.';
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
        model: 'gemini-2.5-flash-image',
        contents: contents,
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
        imagePayload = { imageBytes: base64, bytesBase64Encoded: base64, mimeType } as any;
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
        imagePayload = { imageBytes: base64, bytesBase64Encoded: base64, mimeType } as any;
      }

      setVideoProgressMsg('Submitting to Veo-3...');
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: promptText,
        image: imagePayload,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '9:16',
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
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: { 'x-goog-api-key': (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_API_KEY) || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) || '' },
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
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 xl:p-8 pb-20 w-full pr-10 md:pr-16">
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
              </div>

              {/* Column 2: Cognitive Engine / Narrative (Center | 5 cols) */}
              <div className="xl:col-span-5 space-y-4">
                <Card title="Vision Output" icon={Wand2} contentClassName="p-0" className="mb-4">
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
                      <div>
                        <label className="text-[#999] font-sans font-bold text-[10px] tracking-wide mb-1.5 block uppercase">Voice Language</label>
                        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 font-mono text-[9px] text-white focus:outline-none focus:border-[#D4FF00] cursor-pointer appearance-none">
                          {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[#999] font-sans font-bold text-[10px] tracking-wide mb-1.5 block uppercase">Synthetic Voice</label>
                        <select value={voice} onChange={(e) => setVoice(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 font-mono text-[9px] text-white focus:outline-none focus:border-[#D4FF00] cursor-pointer appearance-none">
                          {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[#999] font-sans font-bold text-[10px] tracking-wide block uppercase">Script Protocol</label>
                        <div className="flex gap-2">
                          <button onClick={saveToLibrary} disabled={!script} className="text-[10px] font-sans font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/5 text-[#777] hover:text-white hover:border-white/20 transition-all disabled:opacity-30">Archive</button>
                          <button onClick={generateScript} disabled={isGeneratingScript} className="text-[10px] font-sans font-bold tracking-wider px-3 py-1.5 rounded-lg bg-[#D4FF00]/10 border border-[#D4FF00]/20 text-[#D4FF00] hover:bg-[#D4FF00] hover:text-black transition-all">
                            {isGeneratingScript ? 'Writing...' : 'Generate Script'}
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <textarea
                          ref={scriptTextareaRef}
                          value={script}
                          onChange={(e) => {
                            setScript(e.target.value);
                            handleScriptSelect();
                          }}
                          onSelect={handleScriptSelect}
                          onClick={handleScriptSelect}
                          onKeyUp={handleScriptSelect}
                          className="w-full h-64 bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-sans text-sm text-white focus:outline-none focus:border-[#D4FF00] resize-none leading-relaxed"
                          placeholder="AI will formulate script here..."
                        />
                        {scriptSelection && (
                          <div className="absolute top-2 right-2 z-10 transition-all animate-in fade-in zoom-in duration-200">
                            <button
                              onClick={rewriteSelection}
                              disabled={isRewriting}
                              className="px-3 py-1.5 bg-[#D4FF00] text-black font-black text-[9px] uppercase tracking-widest rounded-lg shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:scale-100"
                            >
                              <Wand2 size={10} className={isRewriting ? "animate-spin" : ""} />
                              {isRewriting ? 'Rewriting...' : 'Rewrite Selection'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[#999] font-sans font-bold text-[10px] tracking-wide block uppercase">Visual Prompt / Scene Logic</label>
                        <button onClick={generateMagicPrompt} disabled={isGeneratingMagicPrompt} className="text-[10px] font-sans font-bold tracking-wider px-3 py-1.5 rounded-lg bg-[#D4FF00]/10 border border-[#D4FF00]/20 text-[#D4FF00] hover:bg-[#D4FF00] hover:text-black transition-all">
                          {isGeneratingMagicPrompt ? 'Enhancing...' : 'Enhance Prompt'}
                        </button>
                      </div>
                      <textarea
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        className="w-full h-48 bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-sans text-sm text-white focus:outline-none focus:border-[#D4FF00] resize-none leading-relaxed border-dashed"
                        placeholder="Describe cinematic action..."
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
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
                        <button onClick={() => playPcm(audioData)} className="p-2 bg-[#D4FF00] text-black rounded-lg hover:scale-105 transition-transform"><Play size={14} fill="currentColor" /></button>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Column 3: Studio Monitor (Right | 4 cols) */}
              <div className="xl:col-span-4 h-[calc(100vh-80px)] min-h-[600px] sticky top-4 -mt-[10px]">
                <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-[#050505] relative group shadow-2xl">
                  {renderMode === 'image' ? (
                    <>
                      {/* Full Background Preview */}
                      <div className="absolute inset-0">
                        {generatedImg ? (
                          <>
                            <img src={generatedImg} className="w-full h-full object-cover transition-transform duration-700" alt="Generated" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
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
                      <div className="absolute bottom-0 inset-x-0 px-5 pb-4 pt-20 bg-gradient-to-t from-[#020202] via-[#020202]/90 to-transparent flex flex-col space-y-4 z-10">
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

                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {(['ultra-realistic', 'iphone', 'short', 'normal', 'cinematic'] as const).map((s) => (
                            <button key={s} onClick={() => setImageStyle(s)} className={`px-2 py-1 rounded border font-mono text-[8px] uppercase tracking-widest transition-all ${imageStyle === s ? 'bg-[#D4FF00]/20 border-[#D4FF00] text-[#D4FF00]' : 'border-white/10 bg-black/40 backdrop-blur-md text-gray-400 hover:border-white/30 hover:text-white'}`}>
                              {s}
                            </button>
                          ))}
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
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-[#D4FF00] bg-black/40 backdrop-blur-sm z-10"><div className="w-8 h-8 rounded-full border-2 border-[#D4FF00]/20 border-t-[#D4FF00] animate-spin" /><div className="text-center space-y-1"><p className="font-black italic text-[9px] uppercase tracking-widest animate-pulse">{videoProgressMsg}</p><p className="text-[7px] text-gray-500 font-mono uppercase tracking-widest">Synthesizing Frames...</p></div></div>
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
                      <div className="absolute bottom-0 inset-x-0 px-5 pb-4 pt-32 bg-gradient-to-t from-[#020202] via-[#020202]/95 to-transparent flex flex-col space-y-4 z-10 pointer-events-none">
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
                          <div className="flex gap-2 pointer-events-auto">
                            <button onClick={handleResetKey} className="flex-1 p-2 border border-white/10 bg-black/40 backdrop-blur-md rounded-lg text-gray-400 font-mono text-[8px] uppercase tracking-widest hover:text-white hover:border-white/30 transition-colors flex justify-center items-center gap-2"><Sparkles size={12} className="text-[#D4FF00]" /> Vertex Mode</button>
                            <div className="flex flex-1 gap-1">
                              {['4', '6', '8'].map(d => (
                                <button key={d} onClick={() => setDurationSeconds(d as any)} className={`flex-1 font-mono text-[9px] uppercase tracking-widest rounded-lg border transition-all ${durationSeconds === d ? 'bg-[#D4FF00]/20 text-[#D4FF00] border-[#D4FF00]' : 'border-white/10 bg-black/40 backdrop-blur-md text-gray-500 hover:border-white/30 hover:text-white'}`}>{d}s</button>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button onClick={generateVideo} disabled={isGeneratingVideo} loading={isGeneratingVideo} className="w-full py-4 pointer-events-auto">Produce Video</Button>
                      </div>
                    </>
                  )}
                </div>
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
                  <h2 className="text-[#D4FF00] font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <Scissors size={14} />
                    Video Timeline & Editor
                  </h2>
                  {timeline.length > 0 && (
                    <Button
                      onClick={processTimeline}
                      disabled={isProcessingTimeline}
                      loading={isProcessingTimeline}
                      className="px-6"
                    >
                      Merge & Export Video
                    </Button>
                  )}
                </div>

                {timeline.length === 0 ? (
                  <div className="bg-[#0a0a0a] border border-dashed border-[#222] rounded-xl p-12 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#111] flex items-center justify-center text-[#444]">
                      <Plus size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[#a3a3a3] font-sans text-sm">Your timeline is empty</p>
                      <p className="text-[#555] font-mono text-[10px] uppercase tracking-widest">Add clips from the gallery above to start editing</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {/* The Track */}
                    <div className="bg-[#050505] border border-[#222] rounded-xl p-4 overflow-hidden shadow-inner">
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className="text-[#555] font-mono text-[8px] uppercase tracking-widest">Sequence 01</span>
                        <div className="flex-1 h-px bg-[#222]" />
                        <span className="text-[#D4FF00] font-mono text-[9px] font-bold">
                          {timeline.reduce((acc, t) => acc + (t.end - t.start), 0).toFixed(1)}s Total
                        </span>
                      </div>
                      <div className="flex h-24 bg-[#111] border border-[#222] rounded-lg overflow-x-auto custom-scrollbar p-1 gap-1">
                        {timeline.map((item, index) => {
                          const isSelected = selectedTimelineId === item.id;
                          const duration = item.end - item.start;
                          return (
                            <div
                              key={item.id}
                              onClick={() => setSelectedTimelineId(item.id)}
                              className={`relative h-full flex-shrink-0 cursor-pointer rounded overflow-hidden border-2 transition-all ${isSelected ? 'border-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.2)]' : 'border-transparent hover:border-white/20'}`}
                              style={{ width: Math.max(100, duration * 30) + 'px' }}
                            >
                              <video src={item.url} className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none" />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent h-1/2" />
                              <div className="absolute bottom-1 left-2 text-white font-mono text-[8px] font-bold drop-shadow-md">
                                Clip {index + 1}
                              </div>
                              <div className="absolute top-1 right-2 text-[#D4FF00] font-mono text-[8px] bg-black/50 px-1 rounded">
                                {duration.toFixed(1)}s
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* The Inspector */}
                    {selectedTimelineId && timeline.find(t => t.id === selectedTimelineId) ? (
                      (() => {
                        const item = timeline.find(t => t.id === selectedTimelineId)!;
                        const index = timeline.findIndex(t => t.id === selectedTimelineId);
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0a0a0a] border border-[#222] rounded-xl p-4">
                            {/* Preview */}
                            <div className="col-span-1 border border-[#222] rounded-lg overflow-hidden bg-black aspect-video relative group">
                              <video
                                id={`timeline-video-${item.id}`}
                                src={item.url}
                                controls
                                className="w-full h-full object-contain"
                              />
                            </div>

                            {/* Controls */}
                            <div className="col-span-2 flex flex-col justify-center space-y-5">
                              <div className="flex justify-between items-center border-b border-[#222] pb-3">
                                <h3 className="text-white font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
                                  <Settings size={14} className="text-[#D4FF00]" />
                                  Clip Inspector (Clip {index + 1})
                                </h3>
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
                                    className="p-1.5 rounded bg-[#1a1a1a] text-white hover:text-[#D4FF00] transition-colors border border-[#333]"
                                    title="Preview Trimmed Clip"
                                  >
                                    <Play size={12} fill="currentColor" />
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
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#D4FF00]/10 text-[#D4FF00] font-mono text-[9px] uppercase tracking-widest hover:bg-[#D4FF00] hover:text-black transition-colors border border-[#D4FF00]/20 mx-2"
                                    title="Extract this specific exact frame timestamp for a new scene extension"
                                  >
                                    <Camera size={12} /> Extend Frame
                                  </button>

                                  <button onClick={() => moveTimelineItem(index, 'left')} disabled={index === 0} className="p-1.5 rounded bg-[#1a1a1a] text-[#737373] hover:text-[#D4FF00] disabled:opacity-30 border border-[#222]">
                                    <ChevronLeft size={12} />
                                  </button>
                                  <button onClick={() => moveTimelineItem(index, 'right')} disabled={index === timeline.length - 1} className="p-1.5 rounded bg-[#1a1a1a] text-[#737373] hover:text-[#D4FF00] disabled:opacity-30 border border-[#222]">
                                    <ChevronRight size={12} />
                                  </button>
                                  <button onClick={() => { removeFromTimeline(item.id); setSelectedTimelineId(null); }} className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[#777] font-mono text-[9px] uppercase tracking-widest">Trim Start</label>
                                    <input type="number" step="0.1" min="0" max={item.end - 0.1} value={item.start.toFixed(1)} onChange={(e) => updateTimelineItem(item.id, { start: Math.max(0, Math.min(parseFloat(e.target.value) || 0, item.end - 0.1)) })} className="bg-[#111] border border-[#333] text-[#D4FF00] font-mono text-[10px] w-14 px-1 py-1 rounded text-center focus:outline-none focus:border-[#D4FF00]" />
                                  </div>
                                  <input type="range" min="0" max={item.duration} step="0.1" value={item.start} onChange={(e) => updateTimelineItem(item.id, { start: Math.min(parseFloat(e.target.value), item.end - 0.1) })} className="w-full accent-[#D4FF00] h-1.5 bg-[#222] rounded-full appearance-none cursor-pointer" />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[#777] font-mono text-[9px] uppercase tracking-widest">Trim End</label>
                                    <input type="number" step="0.1" min={item.start + 0.1} max={item.duration} value={item.end.toFixed(1)} onChange={(e) => updateTimelineItem(item.id, { end: Math.min(item.duration, Math.max(parseFloat(e.target.value) || item.duration, item.start + 0.1)) })} className="bg-[#111] border border-[#333] text-[#D4FF00] font-mono text-[10px] w-14 px-1 py-1 rounded text-center focus:outline-none focus:border-[#D4FF00]" />
                                  </div>
                                  <input type="range" min="0" max={item.duration} step="0.1" value={item.end} onChange={(e) => updateTimelineItem(item.id, { end: Math.max(parseFloat(e.target.value), item.start + 0.1) })} className="w-full accent-[#D4FF00] h-1.5 bg-[#222] rounded-full appearance-none cursor-pointer" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-8 flex flex-col items-center justify-center text-center">
                        <Settings size={20} className="text-[#333] mb-2" />
                        <p className="text-[#555] font-mono text-[10px] uppercase tracking-widest">Select a clip on the timeline to edit its properties</p>
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
                            <span className="text-white font-sans text-sm font-bold line-clamp-1">{entry.title}</span>
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
      </div >
    </div >
  );
}
