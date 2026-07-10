import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, User, Box, FileText, Camera, Play, Pause, Wand2, Loader2, Volume2, VolumeX, Sparkles, Video, X, Scissors, Plus, Trash2, ChevronRight, ChevronLeft, ChevronDown, Layout, AlertCircle, HelpCircle, Settings, SidebarClose, Download, GripVertical, Check, CheckCircle, BrainCircuit, Zap, ShieldCheck, Shield, Clock, Activity, Maximize, Layers, Search, Package, Droplets, Wind, Fingerprint, Lock, PlayCircle, RotateCcw, Film, MapPin, Pencil } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { supabase as rawSupabase } from '../../lib/supabase';
const supabase = rawSupabase as any;
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
import { getApiUrl, resolveUrl } from '../../config/apiConfig';
import { SHOT_BLUEPRINTS, SCENE_SEQUENCES, buildMultiCutPrompt } from './utils/ugcMultiShot';
import { buildNicheHookContext } from './constants/hookLibrary';
// ─── Feature module imports ──────────────────────────────────────────────────
import { SCRIPT_TONES } from './constants/scriptTones';
import { VIDEO_STYLES, SCENE_STYLES, MULTI_SHOT_PRESETS } from './constants/videoStyles';
import { LANGUAGES, VOICES, SCENE_TEMPLATES } from './constants/sceneTemplates';
import {
  uint8ArrayToBase64,
  ensureDataUri,
  fileToBase64,
  resizeImage,
  withTimeout,
  safeJsonParse,
  fileToGenerativePart,
  getVirtualCreatorPrompt,
} from './utils/imageUtils';
import { createWavUrl, playPcm } from './utils/audioUtils';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenAI } from "@google/genai";
import { UGCContext } from './context/UGCContext';
import type { UGCContextType, TimelineItem, Scene, SplitScene, GalleryItem, KnowledgeBaseEntry } from './context/UGCContext';
import { Timeline } from './components/Timeline';
import { TalkingHeadTab } from './components/TalkingHeadTab';
import HomeTourTab from './components/HomeTourTab';
import { Button } from './components/Button';
import { Dropdown } from './components/Dropdown';
import LeftSidebar from './components/LeftSidebar';
import SplitScenesPanel from './components/SplitScenesPanel';
import VideoTab from './components/VideoTab';
import FocusModal from './components/modals/FocusModal';
import GalleryExpandModal from './components/modals/GalleryExpandModal';
import AdminLoginModal from './components/modals/AdminLoginModal';

import InpaintEditor from './components/InpaintEditor';
import {
  saveGalleryToIDB,
  loadGalleryFromIDB,
  uploadToSupabase
} from './utils/storageUtils';
import {
  buildPodcastPrompt,
  buildScriptPrompt,
  buildRegenerateScriptPartPrompt,
  buildAnalyzeScenePrompt,
  buildSplitScenePrompt,
  buildImageAnalysisPrompt
} from './constants/prompts';

import LiveGuideModal from './components/modals/LiveGuideModal';
import MontageImgLightbox from './components/modals/MontageImgLightbox';
import SceneTemplatesAside from './components/SceneTemplatesAside';
import Toast from './components/Toast';
import Header from './components/Header';
import GalleryGrid from './components/GalleryGrid';

import { useUGCAssets } from './hooks/useUGCAssets';
import { useUGCAudio } from './hooks/useUGCAudio';
import { useUGCGallery } from './hooks/useUGCGallery';

// Use the worker file we copied to the public/ directory
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';





// SCRIPT_TONES → imported from features/UGCStudio/constants/scriptTones


// VIDEO_STYLES, SCENE_STYLES → imported from features/UGCStudio/constants/videoStyles


export default function UGC() {
  const { spend, refund, canAfford } = useShorts();
  const userProfile = useAppStore(state => state.userProfile as { id?: string; role?: string } | null);
  const currentUserId = userProfile?.id || 'local_user';
  const isGlobalAdmin = userProfile?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'ugc' | 'podcast' | 'talking-head' | 'home-tour' | 'edit'>('ugc');

  const getApiKey = () => {
    if (userProfile?.role === 'admin' || (userProfile as any)?.email?.startsWith('premspaw@gmail')) {
      return (window as any).__ADMIN_GOOGLE_API_KEY__ || import.meta.env.VITE_ADMIN_GOOGLE_API_KEY || localStorage.getItem('GOOGLE_API_KEY') || (window as any).aistudio?.apiKey || import.meta.env.VITE_GOOGLE_API_KEY || '';
    }
    return localStorage.getItem('GOOGLE_API_KEY') || (window as any).aistudio?.apiKey || import.meta.env.VITE_GOOGLE_API_KEY || '';
  };

  const getAI = () => {
    const key = getApiKey();
    if (!key) throw new Error("No API Key detected. Please provide a Gemini API Key in Settings.");
    
    return new GoogleGenAI({ 
        apiKey: key
    });
  };

  const fetchImageAsBlob = async (url: string) => {
    if (!url) throw new Error("No URL provided");
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
      const res = await fetch(url);
      return await res.blob();
    }
    const proxyUrl = getApiUrl(`/api/proxy-image?url=${encodeURIComponent(url)}`);
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Proxy fetch failed: ${res.statusText}`);
    return await res.blob();
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
      showToast('Please fill headline title, prompt, and attach a file.', 'error');
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

      showToast('Template Uploaded Successfully!', 'success');
      setShowUploadForm(false);
      
      const { data } = await supabase.from('ugc_scene_templates').select('*').order('created_at', { ascending: false });
      if (data) setDbSceneTemplates([...data, ...SCENE_TEMPLATES]);
    } catch (err: any) {
      console.error(err);
      showToast('Upload failed: ' + err.message, 'error');
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
      showToast('Failed to delete: ' + err.message, 'error');
    }
  };

  // ── Hooks Integration ──────────────────────────────────────────────────────
  const {
    characterImg, setCharacterImg,
    productImg, setProductImg,
    locationImg, setLocationImg,
    thPersonImg, setThPersonImg,
    thProductImg, setThProductImg,
    thLocationImg, setThLocationImg,
    podcastHost1Img, setPodcastHost1Img,
    podcastHost2Img, setPodcastHost2Img,
    podcastProductImg, setPodcastProductImg,
    sourceVideo, setSourceVideo,
  } = useUGCAssets();
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
  const [scriptDuration, setScriptDuration] = useState('20 seconds');
  const [scriptModel, setScriptModel] = useState<'veo3' | 'omni'>('omni');
  const [selectedScriptTone, setSelectedScriptTone] = useState('viral_marketing');
  const [selectedNiche, setSelectedNiche] = useState('none');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([
    { id: '1', prompt: '', isApproved: false }
  ]);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  // Timeline state moved up so it can be passed to useUGCAudio
  const [timeline, setTimeline] = useState<TimelineItem[]>(() => {
    const saved = localStorage.getItem('ugc_timeline_cache');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [zoomLevel, setZoomLevel] = useState(40);
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessingTimeline, setIsProcessingTimeline] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);

  // ── Toast + Error helpers (declared early so useUGCAudio can receive them) ──
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleApiError = (e: any, context: string) => {
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

    const hasCustomKey = !!localStorage.getItem('GOOGLE_API_KEY');

    if (errorMsg.toLowerCase().includes('prepayment credits') || errorMsg.toLowerCase().includes('depleted')) {
      showToast("Gemini API Prepayment Credits Depleted. Please top up your billing in Google AI Studio.", 'error');
    } else if (errorMsg.includes('Quota exceeded') || errorMsg.includes('429')) {
      if (hasCustomKey) {
        showToast("Custom API Key Quota Exceeded. Please check your usage/limits in Google AI Studio.", 'error');
      } else {
        showToast("API Quota Exceeded. Please try again later or configure your own API key in Settings.", 'error');
      }
    } else if (errorMsg.includes('No API Key')) {
      showToast(`${context} requires API key. Add it in Settings or it will route through server.`, 'error');
    } else {
      showToast(`${context} failed: ${errorMsg.substring(0, 120)}`, 'error');
    }
  };

  const {
    audioData,
    setAudioData,
    audioUrl,
    setAudioUrl,
    currentAudio,
    setCurrentAudio,
    isAudioPlaying,
    setIsAudioPlaying,
    isGeneratingAudio,
    uploadedAudioFile,
    setUploadedAudioFile,
    language,
    setLanguage,
    voice,
    setVoice,
    generateVoice,
    toggleAudio,
  } = useUGCAudio({
    script,
    activeTab,
    host1Voice,
    host2Voice,
    host1Name,
    host2Name,
    podcastScene,
    podcastDirectorNote,
    setTimeline,
    setScenes,
    handleApiError,
  });

  // Talking Head generated states (reference images are now inside useUGCAssets)
  const [thGeneratedImg, setThGeneratedImg] = useState<string>('');
  const [thGeneratedVideo, setThGeneratedVideo] = useState<string>('');
  const [thScript, setThScript] = useState<string>('');
  const [thEngine, setThEngine] = useState<'veo3' | 'veo_fast' | 'veo_lite' | 'omni-flash'>('veo_fast');
  const [thIsGeneratingImg, setThIsGeneratingImg] = useState(false);
  const [thIsGeneratingVideo, setThIsGeneratingVideo] = useState(false);
  const [thVideoProgress, setThVideoProgress] = useState('');
  const [thDuration, setThDuration] = useState<'4' | '6' | '8' | '10' | '20' | '30' | '40' | '50' | '60'>('8');
  const [thAspectRatio, setThAspectRatio] = useState<'9:16' | '16:9'>('9:16');

  const [voiceSampleFile, setVoiceSampleFile] = useState<File | null>(null);
  const [voiceSampleName, setVoiceSampleName] = useState<string | null>(null);
  const [voiceStyle, setVoiceStyle] = useState<string>('');
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);
  const [imageStyle, setImageStyle] = useState<'studio' | 'ultra-realistic' | 'iphone' | 'short' | 'normal' | 'cinematic'>('ultra-realistic');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [durationSeconds, setDurationSeconds] = useState<'4' | '6' | '8' | '10' | '20' | '30' | '40' | '50' | '60'>('10');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('720p');
  const [selectedVideoStyle, setSelectedVideoStyle] = useState<'calm' | 'energetic' | 'action' | 'professional' | 'casual' | 'storytelling'>('calm');
  const [selectedSceneStyle, setSelectedSceneStyle] = useState<string>('normal_talking');
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
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
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

  const {
    gallery,
    setGallery,
    galleryTab,
    setGalleryTab,
    galleryExpandItem,
    setGalleryExpandItem,
    addToGallery,
    updateGalleryItem,
  } = useUGCGallery(currentUserId);
  const isAdmin = useAppStore(state => state.isAdmin);
  const setIsAdmin = useAppStore(state => state.setIsAdmin);
  const showAdminLogin = useAppStore(state => state.showAdminLogin);
  const setShowAdminLogin = useAppStore(state => state.setShowAdminLogin);
  const setUserShorts = useAppStore(state => state.setUserShorts);
  const [adminPassword, setAdminPassword] = useState('');

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

  const handleAdminLogin = async () => {
    if (!adminPassword) return;
    try {
      const resp = await fetch(getApiUrl('/api/admin/verify-login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      if (resp.ok) {
        setIsAdmin(true);
        setShowAdminLogin(false);
        setAdminPassword('');
        setUserShorts(10000);
        showToast('Admin mode ON — 10,000 credits loaded', 'success');
      } else {
        alert('Invalid password');
      }
    } catch (e) {
      showToast('Network or server error during admin verification', 'error');
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
  const [leftPanelMode, setLeftPanelMode] = useState<'image' | 'video'>('video');
  const [imgEngine, setImgEngine] = useState<'nb2' | 'gpt2' | 'nb2-lite' | 'nb2-open'>('nb2');
  const [gpt2Quality, setGpt2Quality] = useState<'low' | 'medium' | 'high'>('low');
  const [isGalleryOpen, setIsGalleryOpen] = useState(true);
  const [inpaintImg, setInpaintImg] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth > 768 : true);
  const [attachedRefImage, setAttachedRefImage] = useState<string | null>(null);
  const [attachedRefImages, setAttachedRefImages] = useState<string[]>([]);
  const [spokenDialog, setSpokenDialog] = useState<string>('');
  const [splitScenes, setSplitScenes] = useState<SplitScene[]>([]);
  const [isGeneratingSplitPrompt, setIsGeneratingSplitPrompt] = useState(false);
  const [isGeneratingGeneralPrompt, setIsGeneratingGeneralPrompt] = useState(false);
  const [activeSplitTab, setActiveSplitTab] = useState(0);
  const [selectedPromptVariant, setSelectedPromptVariant] = useState(0);
  const [multiShotPrompt, setMultiShotPrompt] = useState(false);
  const [selectedMultiShotPreset, setSelectedMultiShotPreset] = useState('food_beverage_review');
  const [chatTab, setChatTab] = useState<'script' | 'video'>('script');
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [videoGenMode, setVideoGenMode] = useState<'veo_fast' | 'veo3' | 'veo_lite' | 'montage' | 'omni-flash'>('omni-flash');
  const [showVideoMontageOptions, setShowVideoMontageOptions] = useState(true);
  const [showLiveGuide, setShowLiveGuide] = useState(false);
  const [showPromptDropdown, setShowPromptDropdown] = useState(false);

  const handleScriptModelChange = (model: 'veo3' | 'omni') => {
    setScriptModel(model);
    if (model === 'omni') {
      setVideoGenMode('omni-flash');
      setDurationSeconds('10');
      
      if (scriptDuration === '8 seconds') setScriptDuration('10 seconds');
      else if (scriptDuration === '16 seconds') setScriptDuration('20 seconds');
      else if (scriptDuration === '24 seconds') setScriptDuration('30 seconds');
      else if (scriptDuration === '36 seconds' || scriptDuration === '42 seconds') setScriptDuration('40 seconds');
      else setScriptDuration('20 seconds');
    } else {
      if (videoGenMode === 'omni-flash') {
        setVideoGenMode('veo_fast');
      }
      setDurationSeconds('8');

      if (scriptDuration === '10 seconds') setScriptDuration('8 seconds');
      else if (scriptDuration === '20 seconds') setScriptDuration('16 seconds');
      else if (scriptDuration === '30 seconds') setScriptDuration('24 seconds');
      else if (scriptDuration === '40 seconds') setScriptDuration('36 seconds');
      else setScriptDuration('16 seconds');
    }
  };


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

  useEffect(() => {
    if (videoGenMode === 'omni-flash') {
      setDurationSeconds('10');
    } else {
      if (durationSeconds === '10') {
        setDurationSeconds('8');
      }
    }
  }, [videoGenMode]);

  useEffect(() => {
    if (thEngine === 'omni-flash') {
      setThDuration('10');
    } else {
      if (thDuration === '10') {
        setThDuration('8');
      }
    }
  }, [thEngine]);

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
      const url = typeof input === 'string' ? input : (input as Request).url || '';
      
      // Only intercept calls going to our backend APIs
      if (url.includes('/api/')) {
        const newInit = { ...init };
        const headers = new Headers(newInit.headers || {});
        
        // 1. Inject x-admin-trial-key if custom key is set
        const key = getApiKey();
        if (key && !headers.has('x-admin-trial-key')) {
          headers.set('x-admin-trial-key', key);
        }

        // 2. Inject admin password header if admin mode is active
        if (isAdmin) {
          headers.set('x-admin-password', 'admin123');
        }

        // 3. Inject Authorization header if user is logged in
        try {
          const session = (await supabase.auth.getSession())?.data?.session;
          const token = session?.access_token;
          if (token && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
        } catch (_) {}

        newInit.headers = headers;
        return originalFetch(input, newInit);
      }
      return originalFetch(input, init);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [userProfile, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageProgressMsg, setImageProgressMsg] = useState('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgressMsg, setVideoProgressMsg] = useState('');
  const [videoError, setVideoError] = useState('');
  const [videoTimedOut, setVideoTimedOut] = useState(false);

  // showToast and handleApiError are declared earlier (above useUGCAudio)

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

  // toggleAudio is provided by useUGCAudio hook (declared above)

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
    let targetImg = productImg;
    if (activeTab === 'talking-head') {
      targetImg = thProductImg;
    } else if (activeTab === 'podcast') {
      targetImg = podcastProductImg;
    }

    if (!targetImg) return;

    setIsAnalyzing(true);
    try {
      const imagePart = await fileToGenerativePart(targetImg.file);
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
        // Try to parse a clean error message from the JSON body
        let userMsg = `Analysis failed (${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson?.error) userMsg = errJson.error;
        } catch {
          userMsg = (await response.text().catch(() => response.statusText)) || userMsg;
        }
        throw new Error(userMsg);
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
      showToast(msg.length > 140 ? msg.slice(0, 137) + '…' : msg, 'error');
    }
    setIsAnalyzing(false);
  };

  const splitScriptIntoScenes = (text: string) => {
    if (!text) return [];

    const isOmni = scriptModel === 'omni';
    const sceneDuration = isOmni ? 10 : 8;
    const targetWordsPerScene = isOmni ? 30 : 20;
    const maxWordsPerScene = isOmni ? 33 : 23;
    const newScenes: Scene[] = [];

    // Split by timestamps
    const parts = text.split(/(\[\d+:\d+\s*[-–]\s*\d+:\d+\])/g);
    
    if (parts.length > 1) {
      // It has timestamps! Parse them.
      for (let i = 1; i < parts.length; i += 2) {
        const timeRange = parts[i].replace(/[\[\]]/g, '').trim();
        let segmentText = parts[i + 1]?.trim() || '';
        if (segmentText) {
          // Extract label if present (e.g. "HOOK: " -> label = "HOOK")
          let label = 'SCENE';
          const labelMatch = segmentText.match(/^(HOOK|PAYOFF|CTA|SCENE\s*\d*|INTRO|OUTRO|BODY|SCENE)\b/i);
          if (labelMatch) {
            label = labelMatch[1].toUpperCase();
            // strip the label prefix
            segmentText = segmentText.replace(/^(HOOK|PAYOFF|CTA|SCENE\s*\d*|INTRO|OUTRO|BODY|SCENE)\b\s*[:\-\–\s\,]*\s*/i, '').trim();
          }

          const words = segmentText.split(/\s+/).filter(w => w.length > 0);

          if (words.length <= maxWordsPerScene) {
            newScenes.push({
              id: (newScenes.length + 1).toString(),
              text: segmentText,
              prompt: '',
              isApproved: false,
              visualCue: '',
              timestamp: `[${timeRange}]`,
              label: label
            });
          } else {
            // Sub-split into targetWordsPerScene chunks if a single segment is too long
            for (let j = 0; j < words.length; j += targetWordsPerScene) {
              const chunk = words.slice(j, j + targetWordsPerScene).join(' ');
              newScenes.push({
                id: (newScenes.length + 1).toString(),
                text: chunk,
                prompt: '',
                isApproved: false,
                visualCue: '',
                timestamp: `[${timeRange}]`,
                label: label
              });
            }
          }
        }
      }
    } else {
      // Plain text script with no timestamps - split evenly across scenes!
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const totalSeconds = parseInt(scriptDuration) || (isOmni ? 20 : 16);
      const targetSceneCount = Math.max(1, Math.ceil(totalSeconds / sceneDuration));
      
      const wordsPerScene = Math.max(5, Math.ceil(words.length / targetSceneCount));
      
      for (let i = 0; i < words.length; i += wordsPerScene) {
        const chunk = words.slice(i, i + wordsPerScene).join(' ');
        const startTime = newScenes.length * sceneDuration;
        const timeStr = `${Math.floor(startTime / 60)}:${(startTime % 60).toString().padStart(2, '0')} - ${Math.floor((startTime + sceneDuration) / 60)}:${((startTime + sceneDuration) % 60).toString().padStart(2, '0')}`;
        newScenes.push({
          id: (newScenes.length + 1).toString(),
          text: chunk,
          prompt: '',
          isApproved: false,
          visualCue: '',
          timestamp: `[${timeStr}]`,
          label: newScenes.length === 0 ? 'HOOK' : newScenes.length === 1 ? 'PAYOFF' : `SCENE ${newScenes.length + 1}`
        });
      }
    }

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
      '10 seconds': '8-Second',
      '16 seconds': '16Second',
      '20 seconds': '16Second',
      '24 seconds': '24Second',
      '30 seconds': '24Second',
      '36 seconds': '34Second',
      '40 seconds': '34Second'
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
      const apiUrl = getApiUrl('/api/ugc/analyze-voice');
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
        const podcastPrompt = buildPodcastPrompt({
          language,
          podcastHost1Img: !!podcastHost1Img,
          podcastHost2Img: !!podcastHost2Img,
          podcastProductImg: !!podcastProductImg,
          userPrompt,
          productDetails,
          scriptDuration,
          segmentCount,
          voiceStyle,
        });

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

      const isOmni = scriptModel === 'omni';
      const sceneLength = isOmni ? 10 : 8;
      const durationInt = parseInt(scriptDuration);
      const sceneCount = Math.ceil(durationInt / sceneLength);

      let durationLogic = '';
      if (isOmni) {
        durationLogic = {
          10: "1 HOOK scene (10s)",
          20: "1 HOOK scene (10s) and 1 PAYOFF/CTA scene (10s)",
          30: "1 HOOK (10s), 1 PAYOFF (10s), and 1 CTA (10s)",
          40: "1 HOOK (10s), 2 PERSUASIVE/PAYOFF scenes (10s each), and 1 CTA (10s)",
          50: "1 HOOK (10s), 3 PERSUASIVE/PAYOFF scenes (10s each), and 1 CTA (10s)",
          60: "1 HOOK (10s), 4 PERSUASIVE/PAYOFF scenes (10s each), and 1 CTA (10s)"
        }[durationInt as 10 | 20 | 30 | 40 | 50 | 60] || "multiple 10-second scenes";
      } else {
        durationLogic = {
          8: "1 HOOK scene (8s)",
          16: "1 HOOK scene (8s) and 1 PAYOFF/CTA scene (8s)",
          24: "1 HOOK (8s), 1 PAYOFF (8s), and 1 CTA (8s)",
          36: "1 HOOK (8s), 2 PERSUASIVE/PAYOFF scenes (8s each), and 1 CTA (8s)",
          42: "1 HOOK (8s), 3 PERSUASIVE/PAYOFF scenes (8s each), and 1 CTA (10s)"
        }[durationInt as 8 | 16 | 24 | 36 | 42] || "multiple 8-second scenes";
      }

      const nicheHookContext = buildNicheHookContext(selectedNiche);

      const prompt = buildScriptPrompt({
        userPrompt,
        productDetails,
        scriptDuration,
        language,
        selectedScriptTone,
        selectedVideoStyle,
        selectedSceneStyle,
        sceneCount,
        durationLogic,
        SCRIPT_TONES,
        VIDEO_STYLES,
        SCENE_STYLES,
        voiceStyle,
        strategyContext,
        trainingContent,
        nicheHookContext,
        scriptModel,
        isMultiShot: multiShotPrompt
      });

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
                hook: { type: "STRING" },
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
              required: ["hook", "script", "scenes"]
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

      const fullScript = result?.script || result?.text || script || '';
      const automaticallySplitScenes = splitScriptIntoScenes(fullScript);

      if (result?.scenes && Array.isArray(result.scenes) && result.scenes.length > 0) {
        const structuredScenes: Scene[] = result.scenes.map((aiScene: any, idx: number) => {
          const autoScene = automaticallySplitScenes[idx] || {};
          return {
            id: String(aiScene.id || idx + 1),
            text: aiScene.dialogue || aiScene.text || autoScene.text || '',
            prompt: aiScene.visualCue || '',
            isApproved: false,
            visualCue: aiScene.visualCue || '',
            timestamp: aiScene.timestamp || autoScene.timestamp || '',
            label: aiScene.label || autoScene.label || 'SCENE'
          };
        });
        setScenes(structuredScenes);
        if (structuredScenes.length > 0) {
          setActiveSceneIndex(0);
          setVideoPrompt(structuredScenes[0].prompt);
        }
      } else {
        setScenes(automaticallySplitScenes);
        if (automaticallySplitScenes.length > 0) {
          setActiveSceneIndex(0);
          setVideoPrompt(automaticallySplitScenes[0].prompt);
        }
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
      const prompt = buildRegenerateScriptPartPrompt({
        script,
        label,
        idx,
        productDetails,
        selectedSceneStyle,
        SCENE_STYLES,
        scriptModel,
      });

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

      // Determine if we have a reference image (generated image or scene-level image)
      const activeRefImg = scenes[idx]?.image || generatedImg;

      if (activeRefImg) {
        // ── MULTIMODAL PATH: analyze the reference image to generate a face-consistent prompt ──
        let base64Data = '';
        let mimeType = 'image/png';

        try {
          if (activeRefImg.startsWith('data:')) {
            base64Data = activeRefImg.split(',')[1];
            mimeType = activeRefImg.split(';')[0].split(':')[1];
          } else {
            const blob = await fetchImageAsBlob(activeRefImg);
            mimeType = blob.type || 'image/jpeg';
            base64Data = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
              reader.readAsDataURL(blob);
            });
          }
        } catch (imgErr) {
          console.warn('[analyzeScenePrompt] Could not load reference image, falling back to text-only:', imgErr);
        }

        if (base64Data) {
          const aiPrompt = buildImageAnalysisPrompt({
            text: scene.text || '',
            productDetails,
            selectedVideoStyle,
            VIDEO_STYLES,
            selectedSceneStyle,
            SCENE_STYLES,
          });

          const response = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parts: [
                { inlineData: { mimeType, data: base64Data } },
                { text: aiPrompt }
              ],
              model: 'gemini-2.5-flash',
              userId: currentUserId
            })
          });

          if (!response.ok) throw new Error(`Prompt gen failed: ${response.status}`);
          const data = await response.json();
          const newPrompt = (data.text || '').trim();
          if (newPrompt) {
            setVideoPrompt(newPrompt);
            setScenes(prev => prev.map((s, i) => i === idx ? { ...s, prompt: newPrompt } : s));
            showToast('🎯 Face-locked prompt generated from reference image!', 'success');
          }
          setIsRegeneratingPart(false);
          return;
        }
      }

      // ── TEXT-ONLY FALLBACK ──
      const prompt = buildAnalyzeScenePrompt({
        text: scene.text || '',
        productDetails,
        selectedVideoStyle,
        VIDEO_STYLES,
        selectedSceneStyle,
        SCENE_STYLES,
        hasRefImage: false,
      });

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
      console.error('Analysis failed', e);
      showToast('Failed to generate prompt. Please try again.', 'error');
    }
    setIsRegeneratingPart(false);
  };

  const resolveRefTags = (sceneRefImgUrl?: string | null) => {
    const imageToSend = sceneRefImgUrl || generatedImg || null;

    const refsToResolve: { type: string; url: string | null }[] = [
      { type: 'character', url: characterImg?.url || null },
      { type: 'product', url: productImg?.url || null },
      { type: 'location', url: locationImg?.url || null },
    ];

    if (splitScenes.length > 0) {
      const sc = splitScenes[activeSplitTab];
      const customSceneRefs = sc?.refImages || (sc?.refImage ? [sc.refImage] : []);
      customSceneRefs.forEach((ref, idx) => {
        refsToResolve.push({ type: `custom_${idx}`, url: ref });
      });
    } else {
      attachedRefImages.forEach((ref, idx) => {
        refsToResolve.push({ type: `custom_${idx}`, url: ref });
      });
    }

    const filteredRefs = refsToResolve.filter(r => r.url && r.url !== imageToSend);
    
    const seenUrls = new Set<string>();
    const uniqueRefs: { type: string; url: string }[] = [];
    for (const ref of filteredRefs) {
      if (ref.url && !seenUrls.has(ref.url)) {
        seenUrls.add(ref.url);
        uniqueRefs.push({ type: ref.type, url: ref.url });
      }
    }

    const mappings: Record<string, string> = {};
    uniqueRefs.forEach((ref, idx) => {
      mappings[ref.type] = `<IMAGE_REF_${idx}>`;
    });

    return mappings;
  };

  const getMultimodalParts = async (sceneRefImgUrl?: string | null) => {
    const imagesToConvert: { tag: string; url: string }[] = [];
    const refMappings = resolveRefTags(sceneRefImgUrl);

    // 1. Add Scene Reference / First Frame
    if (sceneRefImgUrl) {
      imagesToConvert.push({ tag: '<FIRST_FRAME>', url: sceneRefImgUrl });
    } else if (generatedImg) {
      imagesToConvert.push({ tag: '<FIRST_FRAME>', url: generatedImg });
    }

    // 2. Add Character Image
    if (characterImg?.url && refMappings.character) {
      imagesToConvert.push({ tag: refMappings.character, url: characterImg.url });
    }

    // 3. Add Product Image
    if (productImg?.url && refMappings.product) {
      imagesToConvert.push({ tag: refMappings.product, url: productImg.url });
    }

    // 4. Add Location Image
    if (locationImg?.url && refMappings.location) {
      imagesToConvert.push({ tag: refMappings.location, url: locationImg.url });
    }

    // 5. Add Custom Scene / Global References
    if (splitScenes.length > 0) {
      const sc = splitScenes[activeSplitTab];
      const customSceneRefs = sc?.refImages || (sc?.refImage ? [sc.refImage] : []);
      customSceneRefs.forEach((ref, idx) => {
        const tag = refMappings[`custom_${idx}`];
        if (tag) {
          imagesToConvert.push({ tag, url: ref });
        }
      });
    } else {
      attachedRefImages.forEach((ref, idx) => {
        const tag = refMappings[`custom_${idx}`];
        if (tag) {
          imagesToConvert.push({ tag, url: ref });
        }
      });
    }

    const parts: any[] = [];
    const instructions: string[] = [];

    // Deduplicate images to convert by URL
    const seenUrls = new Set<string>();
    const uniqueImages = imagesToConvert.filter(img => {
      if (seenUrls.has(img.url)) return false;
      seenUrls.add(img.url);
      return true;
    });

    for (const img of uniqueImages) {
      try {
        let base64Data = '';
        let mimeType = 'image/png';

        if (img.url.startsWith('data:')) {
          base64Data = img.url.split(',')[1];
          mimeType = img.url.split(';')[0].split(':')[1];
        } else {
          const blob = await fetchImageAsBlob(img.url);
          mimeType = blob.type || 'image/jpeg';
          base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
          });
        }

        if (base64Data) {
          parts.push({
            inlineData: {
              mimeType,
              data: base64Data
            }
          });
          instructions.push(`- Image ${parts.length} corresponds to tag ${img.tag}.`);
        }
      } catch (err) {
        console.warn(`[getMultimodalParts] Failed to convert image ${img.tag} (${img.url}):`, err);
      }
    }

    return { parts, instructions, refMappings };
  };

  const getProductCategory = (details: string): 'food_beverage' | 'lifestyle' | 'general_product' => {
    const text = (details || '').toLowerCase();
    const foodKeywords = ['food', 'beverage', 'drink', 'coffee', 'tea', 'juice', 'snack', 'delicious', 'taste', 'recipe', 'cook', 'eat', 'bottle', 'can', 'organic'];
    const lifestyleKeywords = ['skin', 'face', 'cosmetics', 'beauty', 'makeup', 'fashion', 'cloth', 'apparel', 'hair', 'wear', 'living', 'home', 'decor', 'furniture', 'sleep', 'routine', 'wellness'];
    
    if (foodKeywords.some(kw => text.includes(kw))) return 'food_beverage';
    if (lifestyleKeywords.some(kw => text.includes(kw))) return 'lifestyle';
    return 'general_product';
  };

  const buildMultiReferencePrompt = (params: {
    dialog: string;
    productDetails: string;
    selectedVideoStyle: string;
    VIDEO_STYLES: any;
    selectedSceneStyle?: string;
    SCENE_STYLES?: any;
    instructions: string[];
    isOmni: boolean;
    sceneIdx: number;
    totalScenes: number;
    refMappings: Record<string, string>;
  }) => {
    const styleInfo = params.VIDEO_STYLES[params.selectedVideoStyle] || params.VIDEO_STYLES.calm;
    const sceneStyle = params.SCENE_STYLES && params.selectedSceneStyle ? params.SCENE_STYLES[params.selectedSceneStyle] : null;

    const mappings = params.refMappings;
    const creatorTag = mappings.character || '<CREATOR_REF>';
    const productTag = mappings.product || '<PRODUCT_REF>';
    const locationTag = mappings.location || '<LOCATION_REF>';

    const category = getProductCategory(params.productDetails);
    let categoryGuidelines = '';
    if (category === 'food_beverage') {
      categoryGuidelines = `UGC DIRECTOR CATEGORY GUIDELINES (Food & Beverage):
- Highlight sensory freshness, pouring liquid flow, crisp packaging details, or mouth-watering product close-ups.
- The camera shot must focus closely on the food/drink items to make them look delicious and styled.
- Creator performance: Relatable, happy, taking a sip/bite or holding the product naturally.`;
    } else if (category === 'lifestyle') {
      categoryGuidelines = `UGC DIRECTOR CATEGORY GUIDELINES (Lifestyle / Beauty / Fashion):
- Focus on seamless product integration in a daily routine (e.g., applying to skin, wearing in movement, placing on a clean dresser).
- The environment should feel authentic, clean, and premium (bathroom, cozy bedroom, natural light cafe).
- Creator performance: Friendly, intimate, talking to camera like a friend sharing a routine.`;
    } else {
      categoryGuidelines = `UGC DIRECTOR CATEGORY GUIDELINES (General Product & Tech):
- Focus on practical demonstration, unboxing details, or ergonomics (e.g. demonstrating a specific feature, holding to show texture/materials, active usage on desk).
- Visuals must emphasize design quality, clean desk/hand setup, and clear functionality.
- Creator performance: Informative, natural, highlighting benefits clearly.`;
    }

    return `You are the world's best UGC (User-Generated Content) video director. Think like a top-tier UGC director who understands visual pacing, shot angles, consistency, and how to sell a product naturally.
You are writing the video prompt for Scene ${params.sceneIdx + 1} of ${params.totalScenes} in a UGC ad.

DIALOGUE:
"${params.dialog}"

PRODUCT DETAILS:
"${params.productDetails || 'consumer product'}"

PERFORMANCE STYLE:
"${styleInfo.name} — ${styleInfo.modifier || 'natural, authentic'}"

VISUAL STYLE PRESET:
"${sceneStyle ? sceneStyle.name : 'Normal Talking'} — ${sceneStyle ? sceneStyle.promptModifier : 'direct-to-camera'}"

The attached images correspond to these tags:
${params.instructions.join('\n')}

${categoryGuidelines}

CRITICAL MULTI-REFERENCE INSTRUCTIONS:
- You must keep the character's face, hair, and clothing consistent with ${creatorTag}. Refer to ${creatorTag} to describe the creator's features.
- If ${mappings.product} is provided, describe the product based on its visual features in ${productTag}.
- If ${mappings.location} is provided, describe the setting based on the location details in ${locationTag}.
- If <FIRST_FRAME> is provided:
  * For Scene 1: The starting frame of this scene's video must begin with the visual layout/static state of <FIRST_FRAME>.
  * For subsequent scenes: Pick up visually from the previous scene's state, but keep the styling consistent with <FIRST_FRAME> if applicable.

PROMPT FORMAT:
Generate a single, highly detailed, continuous paragraph (max 100 words) describing the video scene.
- Avoid using bullet points or headers like 'Shot:', 'Camera:', or 'Dialogue:'.
- Describe the environment, the camera movement, the creator's actions and facial expression.
- Explicitly state: "The creator looks at the camera and lip-syncs the dialogue: \"[dialogue portion]\"."
- Ensure natural real-world physics, gravity, and material weight.

Return ONLY the final prompt text. No preamble, no explanation, no markdown quotes around the paragraph.`;
  };

  // Generates an AI visual prompt specifically for a split-scene tab
  const generateSplitScenePrompt = async (tabIdx: number) => {
    const sc = splitScenes[tabIdx];
    if (!sc) return;
    setIsGeneratingSplitPrompt(true);
    try {
      const { parts, instructions, refMappings } = await getMultimodalParts(sc.refImage);

      const aiPrompt = buildMultiReferencePrompt({
        dialog: sc.dialog,
        productDetails,
        selectedVideoStyle,
        VIDEO_STYLES,
        selectedSceneStyle,
        SCENE_STYLES,
        instructions,
        isOmni: scriptModel === 'omni',
        sceneIdx: tabIdx,
        totalScenes: splitScenes.length,
        refMappings
      });

      parts.push({ text: aiPrompt });

      const response = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parts,
          model: 'gemini-2.5-flash',
          userId: currentUserId
        })
      });
      if (!response.ok) throw new Error(`Prompt gen failed: ${response.status}`);
      const data = await response.json();
      const newPrompt = (data.text || '').trim();
      if (newPrompt) {
        setSplitScenes(prev => prev.map((s, i) => i === tabIdx ? { ...s, prompt: newPrompt } : s));
        showToast('🎯 Scene prompt generated!', 'success');
      }
    } catch (e) {
      console.error('[generateSplitScenePrompt]', e);
      showToast('Failed to generate video prompt.', 'error');
    }
    setIsGeneratingSplitPrompt(false);
  };

  // Generates AI prompts for ALL split scenes using the selected Multi-Shot preset
  const generateAllSplitPrompts = async () => {
    if (splitScenes.length === 0) return;
    setIsGeneratingSplitPrompt(true);
    setMultiShotPrompt(true);

    // Find the selected preset (fall back to first if not found)
    const preset = MULTI_SHOT_PRESETS.find(p => p.id === selectedMultiShotPreset) || MULTI_SHOT_PRESETS[0];

    // Per-scene duration = total duration / number of scenes
    const sceneDurationSec = Math.round((durationSeconds || 30) / splitScenes.length);

    try {
      for (let idx = 0; idx < splitScenes.length; idx++) {
        const sc = splitScenes[idx];
        if (!sc) continue;
        setActiveSplitTab(idx);

        const { parts, instructions, refMappings } = await getMultimodalParts(sc.refImage);

        // Build the meta-prompt using the preset
        const metaPrompt = preset.buildPrompt({
          dialog: sc.dialog,
          sceneIdx: idx,
          totalScenes: splitScenes.length,
          sceneDurationSec,
          productDetails: productDetails || '',
          instructions,
          refMappings,
          selectedSceneStyle,
          SCENE_STYLES,
        });

        parts.push({ text: metaPrompt });

        const response = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parts, model: 'gemini-2.5-flash', userId: currentUserId })
        });
        if (!response.ok) throw new Error(`Prompt gen failed for scene ${idx + 1}: ${response.status}`);
        const data = await response.json();
        const newPrompt = (data.text || '').trim();
        if (newPrompt) {
          setSplitScenes(prev => prev.map((s, i) => i === idx ? { ...s, prompt: newPrompt } : s));
        }
      }
      showToast(`🎬 ${preset.emoji} ${preset.label} prompts ready for all ${splitScenes.length} scenes!`, 'success');
    } catch (e) {
      console.error('[generateAllSplitPrompts]', e);
      showToast('Failed to generate prompts for all scenes.', 'error');
    }
    setIsGeneratingSplitPrompt(false);
  };


  const generateGeneralVideoPrompt = async () => {
    if (!script && !userPrompt) return;
    setIsGeneratingGeneralPrompt(true);
    try {
      const { parts, instructions, refMappings } = await getMultimodalParts(null);

      const aiPrompt = buildMultiReferencePrompt({
        dialog: script || userPrompt,
        productDetails,
        selectedVideoStyle,
        VIDEO_STYLES,
        selectedSceneStyle,
        SCENE_STYLES,
        instructions,
        isOmni: scriptModel === 'omni',
        sceneIdx: 0,
        totalScenes: 1,
        refMappings
      });

      parts.push({ text: aiPrompt });

      const response = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parts,
          model: 'gemini-2.5-flash',
          userId: currentUserId
        })
      });
      if (!response.ok) throw new Error(`Prompt gen failed: ${response.status}`);
      const data = await response.json();
      const newPrompt = (data.text || '').trim();
      if (newPrompt) {
        setVideoPrompt(newPrompt);
        showToast('🎯 AI video prompt generated successfully!', 'success');
      }
    } catch (e) {
      console.error('[generateGeneralVideoPrompt]', e);
      showToast('Failed to generate video prompt.', 'error');
    }
    setIsGeneratingGeneralPrompt(false);
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
        const blob = await fetchImageAsBlob(imageUrl);
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
    setGalleryTab('all');
    // Add a loading placeholder immediately so gallery shows a spinner tile
    const placeholderImgId = `img-pending-${Date.now()}`;
    addToGallery({ id: placeholderImgId, type: 'image', url: '', loading: true });
    let generatedUrl = '';
    try {
      const ai = getAI();
      setImageProgressMsg('Calibrating Lighting & Style...');
      let contents: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];

      let stylePrompt = '';
      const frontFacing = 'SUBJECT FACING: The person looks straight and directly into the camera lens, full-frontal face, NOT turned or angled to either side.';
      if (imageStyle === 'ultra-realistic') {
        stylePrompt = `${frontFacing} Ultra-realistic raw photo, natural looking normal photo quality, super natural, no background blur, no bokeh, sharp focus across the entire frame, shot on a normal phone, mobile photography aesthetic, natural lighting, super real human appearance, authentic and imperfect, 8K resolution, wide angle or medium shot, natural environment, no 85mm, no portrait lens effect, zero depth of field blur`;
      } else if (imageStyle === 'iphone') {
        stylePrompt = `${frontFacing} POV selfie shot on iPhone 15 front-facing camera. The person is visibly holding the phone with one extended hand, showing their arm reaching towards the camera lens. Casual, spontaneous social media aesthetic, slightly imperfect natural lighting, authentic unedited vlog style, slight lens distortion typical of a front-facing smartphone camera, relatable and genuine.`;
      } else if (imageStyle === 'short') {
        stylePrompt = `${frontFacing} Quick snapshot style, candid, slightly blurry background, fast shutter speed, everyday lighting, highly relatable and casual, like a quick photo taken for a friend.`;
      } else if (imageStyle === 'normal') {
        stylePrompt = `${frontFacing} Standard digital photography, clear and well-lit, balanced colors, realistic but flattering, typical high-quality social media post, no extreme filters.`;
      } else {
        stylePrompt = `${frontFacing} Ultra-realistic studio lighting, high contrast, moody, cinematic, shot on 35mm lens, polished commercial look, authentic skin textures, professional UGC aesthetic, 8K resolution, highly detailed.`;
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

      const faceLockInstructions = hasChar
        ? ` Preserve every facial feature exactly — bone structure, eye shape, skin tone, nose, lips, natural asymmetry. Ultra-realistic skin: visible pores, subtle texture, no airbrushing, no beauty filter. This is a real person — do not idealize or alter.`
        : '';

      const skinRealismBlock = `SKIN REALISM (critical): Ultra-realistic human skin — visible pores, natural texture, subtle imperfections, micro-hair detail. NO airbrushed or plastic skin. NO beauty filter. Skin must look like an unedited photo of a real person.`;

      const photoQualityBlock = imageStyle === 'ultra-realistic'
        ? `Shot on iPhone, natural ambient light, imperfect raw quality, slight handheld movement, no studio polish, real-life moment feel, 2K resolution.`
        : imageStyle === 'cinematic'
        ? `Shot on Sony A7 IV, 35mm f/1.8, dramatic natural light, cinematic color grade, shallow depth of field on background only.`
        : `Natural phone camera quality, authentic lighting, candid feel.`;

      if (hasChar && hasProd && hasLoc) {
        promptInstructions = `One seamless photograph. 
        Subject: the person from the first reference image — ${faceLockInstructions}
        They are naturally wearing or using the product from the second reference image, integrated as if they own it.
        Environment: the background, lighting, and atmosphere from the third reference image — replicated exactly.
        Scene: ${promptText}.
        ${skinRealismBlock}
        ${photoQualityBlock}
        No collage. No split-screen. One photo.`;
      } else if (hasChar && hasProd) {
        promptInstructions = `One seamless photograph of this specific person using this specific product.
        Person: match the face, skin tone, hair, and body from the first reference image exactly.${faceLockInstructions}
        Product: integrated naturally — worn, held, or used as fits the scene. Matches the product reference exactly.
        Scene: ${promptText}.
        ${skinRealismBlock}
        ${photoQualityBlock}
        No collage. No split-screen. One photo.`;
      } else if (hasChar && hasLoc) {
        promptInstructions = `One photograph of this person inside this specific environment.
        Person: face, skin, hair match the reference image exactly.${faceLockInstructions}
        Location: background, lighting, and atmosphere replicated from the reference — the person belongs in this space naturally.
        Scene: ${promptText}.
        ${skinRealismBlock}
        ${photoQualityBlock}
        One photo.`;
      } else if (hasProd && hasLoc) {
        promptInstructions = `One photograph of a creator using this product inside this specific location.
        Product: appears exactly as in the reference — same shape, color, branding, texture.
        Location: background and lighting match the reference environment exactly.
        Scene: ${promptText}.
        ${skinRealismBlock}
        ${photoQualityBlock}
        One photo.`;
      } else if (hasChar) {
        promptInstructions = `One photograph of this specific person.
        Face and appearance: match the reference image exactly.${faceLockInstructions}
        Scene: ${promptText}.
        ${skinRealismBlock}
        ${photoQualityBlock}`;
      } else if (hasProd) {
        promptInstructions = `One photograph of a creator using this product.
        Product: matches the reference exactly — same design, color, texture, branding.
        Scene: ${promptText}.
        ${skinRealismBlock}
        ${photoQualityBlock}`;
      } else if (hasLoc) {
        promptInstructions = `One photograph of a creator inside this specific location.
        Environment: background and lighting replicated from the reference exactly.
        Scene: ${promptText}.
        ${skinRealismBlock}
        ${photoQualityBlock}`;
      } else {
        promptInstructions = `One photograph of a UGC creator.
        Scene: ${promptText}.
        ${skinRealismBlock}
        ${photoQualityBlock}`;
      }

      contents.push({ text: promptInstructions });

    // gemini-3.1-flash-image-preview = Nano Banana 2 (correct per official docs)
    // gemini-3.1-flash-image = Nano Banana 2 GA/Open model
    const modelName = imgEngine === 'nb2-lite' ? 'gemini-3.1-flash-lite-image' : imgEngine === 'nb2-open' ? 'gemini-3.1-flash-image' : 'gemini-3.1-flash-image-preview';

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
            // Update the placeholder that was added at the start of generation
            updateGalleryItem(placeholderImgId, { url: finalUrl, loading: false });
            generateImageSuggestions(finalUrl);
          } catch (uploadErr) {
            console.error(uploadErr);
            setGeneratedImg(url);
            setGeneratedVideo('');
            updateGalleryItem(placeholderImgId, { url, loading: false });
            generateImageSuggestions(url);
          }
          break;
        }
      }
    } catch (e) {
      console.timeEnd('[NB2 generateImage] API call duration');
      if (!isAdmin && !isGlobalAdmin) refund('veo_fast', imgCost as any);
      handleApiError(e, "Image generation");
      // Remove the loading placeholder on error
      setGallery(prev => prev.filter(item => item.id !== placeholderImgId));
    }
    setIsGeneratingImage(false);
    return generatedUrl;
  };

  // ── TALKING HEAD — generate reference image ────────────────────────────────
  const generateTalkingHeadImage = async () => {
    if (!thPersonImg) { showToast('Upload a person photo first.', 'error'); return; }
    const imgCost = getImageCost();
    if (!isAdmin && !isGlobalAdmin) {
      const spendRes = await spend('veo_fast', imgCost as any);
      if (!spendRes || !spendRes.success) {
        showToast(`Insufficient Credits: You need ${imgCost} Shorts to generate reference image.`, 'error');
        return;
      }
    }
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
        model: imgEngine === 'nb2-lite' ? 'gemini-3.1-flash-lite-image' : imgEngine === 'nb2-open' ? 'gemini-3.1-flash-image' : 'gemini-3.1-flash-image-preview',
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
      if (!isAdmin && !isGlobalAdmin) refund('veo_fast', imgCost as any);
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
    const placeholderThVideoId = `vid-pending-${Date.now()}`;
    addToGallery({ id: placeholderThVideoId, type: 'video', url: '', loading: true });

    try {
      const ai = getAI();

      let imagePayload: { imageBytes: string; mimeType: string } | undefined;
      try {
        const imgBlob = await fetchImageAsBlob(thGeneratedImg);
        const base64 = await resizeImage(imgBlob);
        imagePayload = { imageBytes: base64, mimeType: 'image/jpeg' };
      } catch { /* no ref image — generate from prompt only */ }

      const veoModel = thEngine === 'veo3'
        ? 'veo-3.1-generate-preview'
        : thEngine === 'veo_lite'
        ? 'veo-3.1-lite-generate-preview'
        : 'veo-3.1-fast-generate-preview';

      const talkingPrompt = `A confident creator looks directly into the camera and delivers this message with natural, expressive lip sync: "${thScript.trim().substring(0, 400)}". They speak clearly, with hook energy — engaging the viewer from the first frame. Realistic facial movements, natural blinks, slight head movement. Shot in ${thAspectRatio} portrait. Cinematic UGC style.${imagePayload ? ' Animate from the reference image — keep face, background and outfit consistent.' : ''}`;

      updateGalleryItem(placeholderThVideoId, { prompt: talkingPrompt.substring(0, 1000) });

      setThVideoProgress('Submitting to Veo…');

      if (isAdmin || isGlobalAdmin) {
        setThVideoProgress('Submitting to Vertex AI (Veo 3.1)...');
        const headers: any = { 'Content-Type': 'application/json' };
        const customKey = getApiKey();
        if (customKey) headers['x-admin-trial-key'] = customKey;

        const resp = await fetch(getApiUrl('/api/ugc/video'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image: thGeneratedImg || undefined,
            script: talkingPrompt,
            userId: currentUserId,
            duration: thDuration,
            resolution: '720p',
            model: thEngine === 'veo3' ? 'veo3' : 'veo_fast',
            aspect_ratio: thAspectRatio
          })
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Vertex AI Talking Head generation failed.');
        if (!data.url) throw new Error('Vertex AI returned no video URL.');

        setThGeneratedVideo(data.url);
        updateGalleryItem(placeholderThVideoId, {
          url: data.url,
          loading: false,
          prompt: talkingPrompt.substring(0, 1000)
        });
        setThIsGeneratingVideo(false);
        setThVideoProgress('');
        showToast('Talking Head video ready via Vertex AI!', 'success');
        return;
      }

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

      if (thEngine === 'omni-flash') {
        setThVideoProgress('Submitting to Gemini Omni Flash...');
        let imageToSend = '';
        if (imagePayload) {
          imageToSend = `data:${imagePayload.mimeType};base64,${imagePayload.imageBytes}`;
        }

        const headers: any = { 'Content-Type': 'application/json' };
        const customKey = getApiKey();
        if (customKey) headers['x-admin-trial-key'] = customKey;

        const resp = await fetch(getApiUrl('/api/omni-i2v'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image: imageToSend || undefined,
            motionPrompt: talkingPrompt,
            duration: parseInt(thDuration),
            aspectRatio: thAspectRatio,
            resolution: '720p',
            model: 'gemini-omni-flash-preview',
            userId: currentUserId,
            generateAudio: true,
            creditReason: 'veo_fast'
          })
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Omni generation failed.');
        if (!data.videoUrl) throw new Error('Omni returned no video URL.');

        const videoUrl = data.videoUrl;
        const res = await fetch(videoUrl);
        const blob = await res.blob();
        const localUrl = URL.createObjectURL(blob);

        setThGeneratedVideo(localUrl);
        updateGalleryItem(placeholderThVideoId, {
          url: localUrl,
          loading: false,
          prompt: talkingPrompt.substring(0, 1000)
        });
        showToast('Talking Head video ready!', 'success');

        uploadToSupabase(blob, 'video', talkingPrompt, currentUserId)
          .then(publicUrl => {
            if (publicUrl) {
              updateGalleryItem(placeholderThVideoId, { url: publicUrl });
              setThGeneratedVideo(publicUrl);
            }
          })
          .catch(err => {
            console.error('[Background Upload] Talking head upload failed:', err);
          });

        setThIsGeneratingVideo(false);
        setThVideoProgress('');
        return;
      }

      const operation = await (ai.models as any).generateVideo(videoRequest);
      let op = operation;
      setThVideoProgress('Rendering frames…');

      let attempts = 0;
      while (!op.done && attempts < 60) {
        await new Promise(r => setTimeout(r, 5000));
        op = await (ai.operations as any).getVideosOperation({ operation: op });
        attempts++;
        setThVideoProgress(`Rendering… (${attempts * 5}s / 300s)`);
      }

      if (!op.done) throw new Error('Talking head video generation timed out. Try a shorter duration.');

      const raiFiltered = op.response?.raiMediaFilteredCount ?? 0;
      if (raiFiltered > 0) {
        const errStr = 'Video blocked by Veo safety filter. Rephrase the script.';
        showToast(errStr, 'error');
        if (!isAdmin && !isGlobalAdmin) refund('veo_fast', unitCost as any);
        setThIsGeneratingVideo(false);
        setThVideoProgress('');
        updateGalleryItem(placeholderThVideoId, { loading: false, error: errStr });
        return;
      }

      const downloadLink = op.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const currentApiKey = getApiKey();

        // ── Step 1: Download blob immediately for instant preview ──────────────
        setThVideoProgress('Downloading video...');
        const resp = await fetch(downloadLink, {
          headers: { 'x-goog-api-key': currentApiKey },
        });
        if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
        const blob = await resp.blob();
        const localUrl = URL.createObjectURL(blob);

        // ── Step 2: Show instantly in gallery + player ─────────────────────────
        setThGeneratedVideo(localUrl);
        updateGalleryItem(placeholderThVideoId, {
          url: localUrl,
          loading: false,
          prompt: talkingPrompt.substring(0, 1000)
        });
        showToast('Talking Head video ready!', 'success');

        // ── Step 3: Upload to Supabase in background ───────────────────────────
        uploadToSupabase(blob, 'video', talkingPrompt, currentUserId)
          .then(publicUrl => {
            if (publicUrl) {
              setThGeneratedVideo(publicUrl);
              updateGalleryItem(placeholderThVideoId, { url: publicUrl });
            }
          })
          .catch(err => console.error('[Background Save] Failed:', err));
      } else {
        throw new Error('No video returned from Veo.');
      }
    } catch (e: any) {
      const errMsg = e.message || JSON.stringify(e);
      updateGalleryItem(placeholderThVideoId, { loading: false, error: `Error: ${errMsg}` });
      if (!isAdmin && !isGlobalAdmin) refund('veo_fast', unitCost as any);
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
        const blob = await fetchImageAsBlob(generatedImg);
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

  const getImageCost = () => imgEngine === 'gpt2' ? 5 : imgEngine === 'nb2-lite' ? 0.5 : 2;

  const getCurrentCost = (isMontage = false, customDuration?: number) => {
    const audioOn = isMontage ? montageAudioEnabled : includeAudio;
    const duration = customDuration !== undefined
      ? customDuration
      : isMontage
      ? parseInt(montageDuration)
      : activeTab === 'talking-head'
      ? parseInt(thDuration)
      : parseInt(durationSeconds);

    let engine = 'veo_fast';
    if (activeTab === 'talking-head') {
      engine = thEngine;
    } else if (isMontage) {
      engine = 'veo_fast';
    } else {
      engine = videoGenMode;
    }

    let costPerSec = 10;
    const is4K = (videoResolution as string) === '4k' || (videoResolution as string) === '4K';
    const is1080p = (videoResolution as string) === '1080p';

    if (engine === 'veo3') {
      if (is4K) {
        costPerSec = audioOn ? 80 : 54;
      } else {
        costPerSec = audioOn ? 54 : 30;
      }
    } else if (engine === 'veo_fast') {
      if (is4K) {
        costPerSec = audioOn ? 38 : 31;
      } else if (is1080p) {
        costPerSec = audioOn ? 15 : 12;
      } else {
        costPerSec = audioOn ? 12 : 10;
      }
    } else if (engine === 'veo_lite') {
      if (is4K || is1080p) {
        costPerSec = audioOn ? 10 : 6;
      } else {
        costPerSec = audioOn ? 6 : 4;
      }
    } else if (engine === 'omni-flash') {
      const costPerSec = audioOn ? 6 : 5;
      return Math.ceil(costPerSec * 1.1 * duration);
    }

    return costPerSec * duration;
  };

  // ─── GENERATE ALL SHOTS (multi-cut loop) ───────────────────────────────
  const generateAllSceneVideos = async () => {
    if (splitScenes.length === 0) return;

    // Pick shot-type sequence based on script duration (strip non-digits then parse)
    const durationNum = parseInt(scriptDuration.replace(/\D/g, ''));
    const shotSequence: string[] =
      SCENE_SEQUENCES[durationNum] ?? Array(splitScenes.length).fill('PAYOFF');

    const totalCost = getCurrentCost(false) * splitScenes.length;
    if (!isAdmin && !isGlobalAdmin) {
      const spendRes = await spend('veo_fast', totalCost as any);
      if (!spendRes?.success) {
        showToast(`Need ${totalCost} Shorts for ${splitScenes.length} shots`, 'error');
        return;
      }
    }

    setIsGeneratingVideo(true);

    for (let i = 0; i < splitScenes.length; i++) {
      const sc = splitScenes[i];
      const shotType = shotSequence[i] ?? 'PAYOFF';
      setVideoProgressMsg(`Shot ${i + 1}/${splitScenes.length} — ${shotType}...`);

      const isTalkingHead = activeTab === 'talking-head';

      // For talking-head mode use a natural talking-head prompt; otherwise use the UGC multi-cut prompt
      let prompt = '';
      if (isTalkingHead) {
        prompt = `A confident creator looks directly into the camera and delivers this message with natural, expressive lip sync: "${sc.dialog.substring(0, 400)}". They speak clearly with hook energy — engaging the viewer from the first frame. Realistic facial movements, natural blinks, slight head movement. Cinematic UGC style.${sc.refImage || thGeneratedImg ? ' Animate from the reference image — keep face, background and outfit consistent.' : ''}`;
      } else if (multiShotPrompt && sc.prompt) {
        prompt = sc.prompt;
      } else {
        prompt = buildMultiCutPrompt({
          dialog: sc.dialog,
          shotType,
          shotIndex: i,
          totalShots: splitScenes.length,
          imageStyle,
          productName: productAnalysis?.productName,
          productDetails: productDetails?.substring(0, 60),
          hasCharacterRef: !!characterImg,
          hasProductRef: !!productImg,
        });
      }

      try {
        const ai = getAI();
        let imagePayload: { imageBytes: string; mimeType: string } | undefined;

        // For talking-head tab, fall back to the generated face image instead of characterImg
        const refImg = sc.refImage ?? (isTalkingHead ? thGeneratedImg : characterImg?.url);
        if (refImg) {
          const blob = await fetchImageAsBlob(refImg);
          const base64 = await resizeImage(blob);
          imagePayload = { imageBytes: base64, mimeType: 'image/jpeg' };
        }

        // Use talking-head model/settings when in that tab, otherwise use UGC video settings
        const resolvedEngine = isTalkingHead ? thEngine : videoGenMode;
        const veoModel =
          resolvedEngine === 'veo3'
            ? 'veo-3.1-generate-preview'
            : resolvedEngine === 'veo_lite'
            ? 'veo-3.1-lite-generate-preview'
            : 'veo-3.1-fast-generate-preview';

        const resolvedAspectRatio = isTalkingHead ? thAspectRatio : (aspectRatio === '1:1' ? '9:16' : aspectRatio as any);
        const resolvedDuration = isTalkingHead 
          ? parseInt(thDuration) 
          : (resolvedEngine === 'omni-flash' ? 10 : 8);
        const resolvedIncludeAudio = isTalkingHead ? true : includeAudio;

        if (resolvedEngine === 'omni-flash') {
          setVideoProgressMsg(`Shot ${i + 1}/${splitScenes.length} · Submitting to Gemini Omni Flash...`);
          let imageToSend = '';
          if (imagePayload) {
            imageToSend = `data:${imagePayload.mimeType};base64,${imagePayload.imageBytes}`;
          }

          const headers: any = { 'Content-Type': 'application/json' };
          const customKey = getApiKey();
          if (customKey) headers['x-admin-trial-key'] = customKey;

          const resp = await fetch(getApiUrl('/api/omni-i2v'), {
            method: 'POST',
            headers,
            body: JSON.stringify({
              image: imageToSend || undefined,
              motionPrompt: (prompt.includes('Dialogue to speak:') ? prompt : `${prompt} Dialogue to speak: "${sc.dialog}".`).substring(0, 1000),
              duration: resolvedDuration,
              aspectRatio: resolvedAspectRatio,
              resolution: '720p',
              model: 'gemini-omni-flash-preview',
              userId: currentUserId,
              generateAudio: resolvedIncludeAudio,
              creditReason: 'veo_fast'
            })
          });

          const data = await resp.json();
          if (!resp.ok) throw new Error(data.error || 'Omni generation failed.');
          if (!data.videoUrl) throw new Error('Omni returned no video URL.');

          const videoUrl = data.videoUrl;
          const res = await fetch(videoUrl);
          const blob = await res.blob();
          const localUrl = URL.createObjectURL(blob);
          const tempId = Date.now().toString();

          // Immediately push to gallery and timeline using local URL
          addToGallery({ id: tempId, type: 'video', url: localUrl });
          const timelineId = `shot-${i}-${Date.now()}`;
          setTimeline((prev: TimelineItem[]) => [
            ...prev,
            {
              id: timelineId,
              url: localUrl,
              start: 0,
              end: resolvedDuration,
              duration: resolvedDuration,
              type: 'video' as const,
            },
          ]);
          showToast(`Shot ${i + 1} done ✓`, 'success');

          // Upload to Supabase in the background
          uploadToSupabase(blob, 'video', prompt, currentUserId).then((publicUrl) => {
            if (publicUrl) {
              updateGalleryItem(tempId, { url: publicUrl });
              setTimeline((prev: TimelineItem[]) =>
                prev.map((t) => (t.id === timelineId ? { ...t, url: publicUrl } : t))
              );
            }
          }).catch((err) => {
            console.error('[Background Upload] Shot upload failed:', err);
          });

          continue; // Move to next scene
        }

        const videoRequest: any = {
          model: veoModel,
          prompt: prompt.substring(0, 1000),
          config: {
            numberOfVideos: 1,
            resolution: videoResolution as any,
            aspectRatio: resolvedAspectRatio,
            durationSeconds: resolvedDuration,
            includeAudio: resolvedIncludeAudio,
          },
        };
        if (imagePayload) videoRequest.image = imagePayload;

        let op = await ai.models.generateVideos(videoRequest);
        const start = Date.now();

        while (!op.done) {
          if (Date.now() - start > 90_000) {
            showToast(`Shot ${i + 1} timed out`, 'error');
            break;
          }
          await new Promise((r) => setTimeout(r, 5000));
          op = await ai.operations.getVideosOperation({ operation: op });
          setVideoProgressMsg(
            `Shot ${i + 1}/${splitScenes.length} · ${Math.round((Date.now() - start) / 1000)}s`,
          );
        }

        const link = op.response?.generatedVideos?.[0]?.video?.uri;
        if (link) {
          const res = await fetch(link, { headers: { 'x-goog-api-key': getApiKey() } });
          const blob = await res.blob();
          const localUrl = URL.createObjectURL(blob);
          const tempId = Date.now().toString();

          // Immediately push to gallery and timeline using local URL
          addToGallery({ id: tempId, type: 'video', url: localUrl });
          const timelineId = `shot-${i}-${Date.now()}`;
          setTimeline((prev: TimelineItem[]) => [
            ...prev,
            {
              id: timelineId,
              url: localUrl,
              start: 0,
              end: Math.min(parseInt(durationSeconds), 8),
              duration: Math.min(parseInt(durationSeconds), 8),
              type: 'video' as const,
            },
          ]);
          showToast(`Shot ${i + 1} done ✓`, 'success');

          // Upload to Supabase in the background
          uploadToSupabase(blob, 'video', prompt, currentUserId).then((publicUrl) => {
            if (publicUrl) {
              updateGalleryItem(tempId, { url: publicUrl });
              // Also update the timeline item URL
              setTimeline((prev: TimelineItem[]) =>
                prev.map((t) => (t.id === timelineId ? { ...t, url: publicUrl } : t))
              );
            }
          }).catch((err) => {
            console.error('[Background Upload] Shot upload failed:', err);
          });
        }

        if (i < splitScenes.length - 1) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (e: any) {
        showToast(`Shot ${i + 1} failed: ${e.message?.slice(0, 60)}`, 'error');
      }
    }

    setIsGeneratingVideo(false);
    setVideoProgressMsg('');
    showToast(`All ${splitScenes.length} shots in timeline — hit Render!`, 'success');
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
          if (data.text) break;
        } catch (innerErr: any) {
          console.warn(`[analyzeProductForMontage] model ${model} threw: ${innerErr.message} — trying next`);
        }
      }
      if (!data?.text) throw new Error('All models failed to return analysis');
      const parsed = safeJsonParse(data.text);
      const rawOptions = Array.isArray(parsed) ? parsed : [];
      const options = rawOptions.map((o: any, i: number) => ({ ...o, id: `montage-${i}-${Date.now()}` }));
      setMontageOptions(options);
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      console.error('[analyzeProductForMontage]', msg);
      showToast(`Product analysis failed: ${msg.slice(0, 120)}`, 'error');
    }
    setIsGeneratingMontageOptions(false);
  };

  const generateMontageReferenceImage = async (option: any, quality: 'standard' | 'hd' = 'standard'): Promise<string> => {
    const isPodcastMode = activeTab === 'podcast';
    const primaryPersonImg = isPodcastMode ? podcastHost1Img : characterImg;
    const secondaryPersonImg = isPodcastMode ? podcastHost2Img : null;
    const activeProductImg = isPodcastMode ? podcastProductImg : productImg;
    const activeLocationImg = isPodcastMode ? null : locationImg;
    if (!primaryPersonImg && !secondaryPersonImg && !activeProductImg && !activeLocationImg) return '';
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
    setGalleryTab('all');
    // Add a loading placeholder so gallery shows a spinner tile immediately
    const placeholderMontageId = `montage-pending-${Date.now()}`;
    addToGallery({ id: placeholderMontageId, type: 'image', url: '', loading: true });
    let generatedUrl = '';
    try {
      let contents: any[] = [];
      const stylePrompt = 'Ultra-realistic UGC photo, natural look, shot on a phone, authentic lighting, no heavy bokeh, real human appearance, 8K quality. SUBJECT FACING: The person looks straight and directly into the camera lens, full-frontal face, NOT turned or angled to either side.';

      if (primaryPersonImg) {
        setMontageImgProgressMsg(isPodcastMode ? 'Loading Host 1 Reference...' : 'Loading Character Reference...');
        contents.push(await fileToGenerativePart(primaryPersonImg.file));
      }

      if (secondaryPersonImg) {
        setMontageImgProgressMsg('Loading Host 2 Reference...');
        contents.push(await fileToGenerativePart(secondaryPersonImg.file));
      }

      if (activeProductImg) {
        setMontageImgProgressMsg('Analysing Product DNA...');
        contents.push(await fileToGenerativePart(activeProductImg.file));
      }

      if (activeLocationImg) {
        setMontageImgProgressMsg('Loading Stage/Location Reference...');
        contents.push(await fileToGenerativePart(activeLocationImg.file));
      }

      setMontageImgProgressMsg('Synthesising Reference Frame...');

      let promptInstructions = '';
      const sceneDesc = `${option.title} — ${option.prompt.substring(0, 120)}`;

      const hasPerson = !!primaryPersonImg;
      const hasProduct = !!activeProductImg;
      const hasLocation = !!activeLocationImg;

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
      } else if (hasPerson && hasProduct && hasLocation) {
        promptInstructions = `The FIRST image is the PERSON (creator) reference. The SECOND image is the PRODUCT reference. The THIRD image is the LOCATION/STAGE reference.
        TASK: Generate ONE single, coherent UGC-style photo where this EXACT person is using/wearing/holding this EXACT product in this EXACT environment/location.
        Scene: ${sceneDesc}.
        Style: ${stylePrompt}.
        CRITICAL: Do NOT create a collage, side-by-side, or split screen. One unified photo only. Match the person's skin, features, the product, and environment precisely.`;
      } else if (hasPerson && hasProduct) {
        promptInstructions = `The FIRST image is the PERSON (creator) reference. The SECOND image is the PRODUCT reference.
        TASK: Generate ONE single, coherent UGC-style photo where this EXACT person is using/wearing/holding this EXACT product in the following scene: ${sceneDesc}.
        Style: ${stylePrompt}.
        CRITICAL: Do NOT create a collage, side-by-side, or split screen. One unified photo only. Match the person's skin, features, and the product appearance precisely.`;
      } else if (hasPerson && hasLocation) {
        promptInstructions = `The FIRST image is the PERSON (creator) reference. The SECOND image is the LOCATION/STAGE reference.
        TASK: Generate ONE single, coherent UGC-style photo of this EXACT person in this EXACT environment/location.
        Scene: ${sceneDesc}.
        Style: ${stylePrompt}.
        CRITICAL: Do NOT create a collage, side-by-side, or split screen. One unified photo only. Match the person's skin, features, and environment precisely.`;
      } else if (hasProduct && hasLocation) {
        promptInstructions = `The FIRST image is the PRODUCT reference. The SECOND image is the LOCATION/STAGE reference.
        TASK: Generate ONE single, coherent UGC-style photo of a creator using/showcasing this EXACT product in this EXACT environment/location.
        Scene: ${sceneDesc}.
        Style: ${stylePrompt}.
        CRITICAL: Do NOT create a collage, side-by-side, or split screen. One unified photo only. Match the product and environment precisely.`;
      } else if (hasPerson) {
        promptInstructions = `The image is the PERSON (creator) reference.
        TASK: Generate ONE UGC-style photo of this person in the following scene: ${sceneDesc}.
        Style: ${stylePrompt}.`;
      } else if (hasProduct) {
        promptInstructions = `The image is the PRODUCT reference.
        TASK: Generate ONE UGC-style photo of a creator using/showcasing this product in the following scene: ${sceneDesc}.
        The product in the final image must look exactly like the reference. Style: ${stylePrompt}.`;
      } else if (hasLocation) {
        promptInstructions = `The image is the LOCATION/STAGE reference.
        TASK: Generate ONE UGC-style photo of a creator in this environment/location.
        Scene: ${sceneDesc}.
        Style: ${stylePrompt}.`;
      } else {
        promptInstructions = `TASK: Generate ONE UGC-style photo for this scene: ${sceneDesc}. Style: ${stylePrompt}.`;
      }

      if (primaryPersonImg || secondaryPersonImg) {
        promptInstructions += `\n\nCRITICAL FACE LIKENESS LOCK: Preserve every facial feature exactly — bone structure, eye shape, skin tone, nose, lips, and natural asymmetry. The face must remain 100% identical to the reference photo without any change in face symmetry.
SKIN REALISM: Enforce ultra-realistic human skin with visible pores, natural skin texture, micro-hair details, and subtle imperfections. Do NOT airbrush, do NOT use beauty filters, and do NOT make the skin look plastic or cartoonish. It must look like an ultra-natural, unedited photo of a real person.`;
      }

      if (imageStyle === 'ultra-realistic') {
        promptInstructions += `\n\nphoto quality and vibe: non-studio lighting, no oversharpening, real light from the location, iphone photo vibe, imperfect photo quality/raw quality (for realism), random realistic photo taken during a random moment of the day, make sure the lighting is natural and matches the background, 2k. It's better to make it slightly blurry, like a phone photo.`;
      }

      contents.push({ text: promptInstructions });

      const useGPT2 = imgEngine === 'gpt2';

      if (useGPT2) {
        setMontageImgProgressMsg('Structuring Prompt…');
        const GPT2_PROMPT_SYSTEM = `you are a prompt writer/structuring assistant for gpt image 2.
        # your task: rewrite user raw prompt into gpt image 2 format. Dont change meaning, just structure. Start with "Generate an image with the following prompt, dont change it(DO NOT CHANGE THIS PROMPT, IT'S ALREADY AN IMPROVED PROMPT) - "`;

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
        } catch (_) {}

        setMontageImgProgressMsg('Loading Reference Images…');
        const readFileAsBase64 = (f: File): Promise<string> =>
          new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = ev => resolve(ev.target?.result as string);
            reader.readAsDataURL(f);
          });

        let primaryImage: string | undefined;
        let secondaryImage: string | undefined;

        if (primaryPersonImg?.file) primaryImage = await readFileAsBase64(primaryPersonImg.file);
        if (isPodcastMode && secondaryPersonImg?.file) {
          secondaryImage = await readFileAsBase64(secondaryPersonImg.file);
        } else if (activeProductImg?.file) {
          secondaryImage = await readFileAsBase64(activeProductImg.file);
        }
        if (!primaryImage && secondaryImage) {
          primaryImage = secondaryImage;
          secondaryImage = undefined;
        }

        setMontageImgProgressMsg('GPT Image 2 Generating…');
        const gptRes = await fetch(getApiUrl('/api/generate-image'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-image-2',
            prompt: finalPrompt,
            quality,
            size: aspectRatio === '16:9' ? '1536x1024' : aspectRatio === '1:1' ? '1024x1024' : '1024x1536',
            aspect_ratio: aspectRatio,
            userId: currentUserId,
            folder: 'ugc/generated',
            ...(primaryImage && { image: primaryImage }),
            ...(secondaryImage && { secondImage: secondaryImage }),
          }),
        });
        if (!gptRes.ok) throw new Error(`GPT Image 2 failed: ${gptRes.status}`);
        const gptData = await gptRes.json();
        const url = gptData.url || gptData.imageUrl;
        if (url) { 
          generatedUrl = url; 
          setMontageGeneratedImg(url); 
          updateGalleryItem(placeholderMontageId, { url, loading: false }); 
        }
      } else {
        setMontageImgProgressMsg('AI Generating Reference Image...');
        const readFileAsBase64 = (f: File): Promise<string> =>
          new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = ev => resolve(ev.target?.result as string);
            reader.readAsDataURL(f);
          });

        const refImages: string[] = [];
        if (primaryPersonImg?.file) refImages.push(await readFileAsBase64(primaryPersonImg.file));
        if (secondaryPersonImg?.file) refImages.push(await readFileAsBase64(secondaryPersonImg.file));
        if (activeProductImg?.file) refImages.push(await readFileAsBase64(activeProductImg.file));
        if (activeLocationImg?.file) refImages.push(await readFileAsBase64(activeLocationImg.file));

        const nb2Res = await fetch(getApiUrl('/api/generate-image'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: imgEngine === 'nb2-lite' ? 'nano-banana-2-lite' : imgEngine === 'nb2-open' ? 'nano-banana-2-open' : 'nano-banana-2',
            prompt: contents.find(c => c.text)?.text || promptInstructions,
            aspect_ratio: aspectRatio,
            userId: currentUserId,
            folder: 'ugc/generated',
            referenceImages: refImages,
          }),
        });

        if (!nb2Res.ok) {
          const errData = await nb2Res.json().catch(() => ({}));
          throw new Error(`NB2 server error: ${errData.error || errData.message || nb2Res.status}`);
        }

        const nb2Data = await nb2Res.json();
        if (nb2Data.jobId) {
          setMontageImgProgressMsg('Queued — polling for result...');
          const pollUrl = getApiUrl(`/api/job-status/${nb2Data.jobId}`);
          let attempts = 0;
          while (attempts < 30) {
            await new Promise(r => setTimeout(r, 3000));
            attempts++;
            const pollRes = await fetch(pollUrl);
            const pollData = await pollRes.json();
            if (pollData.status === 'done' && pollData.imageUrl) {
              generatedUrl = pollData.imageUrl;
              setMontageGeneratedImg(pollData.imageUrl);
              updateGalleryItem(placeholderMontageId, { url: pollData.imageUrl, loading: false });
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
          updateGalleryItem(placeholderMontageId, { url, loading: false });
        } else {
          throw new Error('No image returned from server');
        }
      }
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('content blocked') || msg.includes('image_other') || msg.includes('safety')) {
        showToast(`AI declined this image. Tip: try switching engine to GPT-2, or replace character photo.`, 'error');
      } else {
        if (!isAdmin && !isGlobalAdmin) refund('veo_fast', imgCost as any);
        handleApiError(e, 'Montage reference image generation');
      }
      // Remove the loading placeholder on error
      setGallery(prev => prev.filter(item => item.id !== placeholderMontageId));
    }
    setIsGeneratingMontageImg(false);
    setMontageImgProgressMsg('');
    return generatedUrl;
  };

  // ─────────────────────────────────────────────────────────────────────────

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
    setVideoProgressMsg(
      videoGenMode === 'veo3'
        ? 'Initializing Veo 3 HQ…'
        : videoGenMode === 'veo_lite'
        ? 'Initializing Veo 3 Lite…'
        : 'Initializing Veo 3 Fast…'
    );
    const placeholderVideoId = `vid-pending-${Date.now()}`;
    addToGallery({ id: placeholderVideoId, type: 'video', url: '', loading: true });
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
      const activeRefImg = referenceImageUrl || scenes[activeSceneIndex]?.image || (activeTab === 'talking-head' ? thGeneratedImg : generatedImg);
      
      let virtualCreatorPrompt = '';
      if (!activeRefImg && !characterImg) {
        virtualCreatorPrompt = ` Virtual Creator: ${getVirtualCreatorPrompt(productDetails, productTags)}.`;
      }

      const dialogueText = splitScenes.length > 0
        ? splitScenes[activeSplitTab]?.dialog
        : scenes[activeSceneIndex]?.text;

      const dialogue = dialogueText ? ` Dialogue to speak: "${dialogueText}".` : '';

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
            const blob = await fetchImageAsBlob(refUrl);
            const base64 = await resizeImage(blob);
            imagePayload = { imageBytes: base64, mimeType: 'image/jpeg' };
          }
        }

        const hasRef = !!imagePayload;
        promptText = `${podcastVisual}${podcastDialogue}${hasRef ? ' Animate naturally from the reference image. Keep host faces, microphones and product consistent.' : ''}${stylePrompt ? ` Style: ${stylePrompt}` : ''}`;
      } else {
        const sceneStyleModifier = SCENE_STYLES[selectedSceneStyle]?.promptModifier;
        const compiledStyle = [stylePrompt, sceneStyleModifier].filter(Boolean).join(', ');

        const faceLockInstructions = (activeRefImg || characterImg)
          ? ` FACE IDENTITY LOCK — CRITICAL: The creator's face MUST remain 100% identical to the reference image throughout the entire video. Do NOT change any facial features, skin tone, eye shape, nose, lips, or face structure. Maintain natural facial symmetry. This is a real person — do not idealize, stylize, or alter their appearance in any way. The person speaks like a natural UGC creator — authentic, direct, and relatable.`
          : '';

        let basePrompt = (overridePrompt || (scenes[activeSceneIndex]?.isApproved
          ? scenes[activeSceneIndex].prompt
          : (videoPrompt || `A creator wearing or interacting with this product: ${productDetails}. If it's clothing, they MUST be wearing it.`))) + dialogue + (compiledStyle ? ` Style: ${compiledStyle}.` : '') + lipSyncBooster + virtualCreatorPrompt + faceLockInstructions;

        if (videoGenMode === 'omni-flash') {
          basePrompt += " Animate starting from the first reference image. Use the additional reference images provided to maintain strict visual consistency for the product appearance, character details, and location background.";
        }

        promptText = basePrompt;

        if (activeRefImg) {
          let base64 = '';
          const mimeType = 'image/jpeg';
          const blob = await fetchImageAsBlob(activeRefImg);
          base64 = await resizeImage(blob);
          imagePayload = { imageBytes: base64, mimeType };
        } else if (characterImg) {
          let base64 = '';
          const mimeType = 'image/jpeg';
          if (characterImg.url && characterImg.url.startsWith('http')) {
            const blob = await fetchImageAsBlob(characterImg.url);
            base64 = await resizeImage(blob);
          } else {
            base64 = await resizeImage(characterImg.file);
          }
          imagePayload = { imageBytes: base64, mimeType };
        }
      }
      updateGalleryItem(placeholderVideoId, { prompt: promptText.substring(0, 1000) });

      const engine = activeTab === 'talking-head' ? thEngine : videoGenMode;

      if (engine === 'omni-flash') {
        setVideoProgressMsg('Submitting to Gemini Omni Flash...');
        const resolvedAspectRatio = activeTab === 'talking-head' ? thAspectRatio : (aspectRatio === '1:1' ? '9:16' : aspectRatio as any);
        const resolvedDuration = activeTab === 'talking-head' ? parseInt(thDuration) : (splitScenes.length > 0 ? 10 : parseInt(durationSeconds));
        const resolvedIncludeAudio = activeTab === 'talking-head' ? true : includeAudio;

        let imageToSend = '';
        if (imagePayload) {
          imageToSend = `data:${imagePayload.mimeType};base64,${imagePayload.imageBytes}`;
        }

        // Helper to resolve Asset objects or raw strings to Base64 data URLs on the client
        const resolveAssetToBase64 = async (asset: any) => {
          if (!asset) return null;
          try {
            if (typeof asset === 'string') {
              if (asset.startsWith('data:')) return asset;
              const blob = await fetchImageAsBlob(asset);
              const base64 = await resizeImage(blob);
              return `data:image/jpeg;base64,${base64}`;
            }
            if (asset.file) {
              const base64 = await resizeImage(asset.file);
              return `data:image/jpeg;base64,${base64}`;
            }
            if (asset.url) {
              if (asset.url.startsWith('data:')) return asset.url;
              const blob = await fetchImageAsBlob(asset.url);
              const base64 = await resizeImage(blob);
              return `data:image/jpeg;base64,${base64}`;
            }
          } catch (e) {
            console.warn('[UGC-OMNI] Reference resolution failed:', e);
          }
          return null;
        };

        const activeCharacterImg = activeTab === 'talking-head' ? thPersonImg : characterImg;
        const activeProductImg = activeTab === 'talking-head' ? thProductImg : productImg;
        const activeLocationImg = activeTab === 'talking-head' ? thLocationImg : locationImg;

        const currentScene = splitScenes[activeSplitTab];
        const customSceneRefs = splitScenes.length > 0
          ? (currentScene?.refImages || (currentScene?.refImage ? [currentScene.refImage] : []))
          : attachedRefImages;

        // Resolve reference images in parallel
        const resolvedList = await Promise.all([
          resolveAssetToBase64(activeCharacterImg),
          resolveAssetToBase64(activeProductImg),
          resolveAssetToBase64(activeLocationImg),
          ...customSceneRefs.map(ref => resolveAssetToBase64({ url: ref }))
        ]);

        const charBase64 = resolvedList[0];
        const prodBase64 = resolvedList[1];
        const locBase64 = resolvedList[2];
        const customB64s = resolvedList.slice(3);

        const allRefs = [
          charBase64,
          prodBase64,
          locBase64,
          ...customB64s
        ].filter((val): val is string => !!val && val !== imageToSend);

        // Deduplicate references to prevent sending the same image twice
        const uniqueRefs = Array.from(new Set(allRefs));
        const refImagesList = uniqueRefs.map(url => ({ url }));

        const headers: any = { 'Content-Type': 'application/json' };
        const customKey = getApiKey();
        if (customKey) headers['x-admin-trial-key'] = customKey;

        const resp = await fetch(getApiUrl('/api/omni-i2v'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image: imageToSend || undefined,
            motionPrompt: promptText.substring(0, 1000),
            duration: resolvedDuration,
            aspectRatio: resolvedAspectRatio,
            resolution: '720p',
            model: 'gemini-omni-flash-preview',
            userId: currentUserId,
            generateAudio: resolvedIncludeAudio,
            creditReason: 'veo_fast',
            ref_images: refImagesList
          })
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Omni generation failed.');
        if (!data.videoUrl) throw new Error('Omni returned no video URL.');

        setGeneratedVideo(data.videoUrl);
        updateGalleryItem(placeholderVideoId, {
          url: data.videoUrl,
          loading: false,
          prompt: promptText.substring(0, 1000)
        });
        setIsGeneratingVideo(false);
        setVideoProgressMsg('');
        showToast('Video scene generated successfully!', 'success');
        return;
      }

      setVideoProgressMsg('Igniting the Motion Engine...');

      if (isAdmin || isGlobalAdmin) {
        setVideoProgressMsg('Submitting to Vertex AI (Veo 3.1)...');
        const headers: any = { 'Content-Type': 'application/json' };
        const customKey = getApiKey();
        if (customKey) headers['x-admin-trial-key'] = customKey;

        const imageToSend = activeRefImg || undefined;

        const resp = await fetch(getApiUrl('/api/ugc/video'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image: imageToSend,
            script: promptText,
            userId: currentUserId,
            duration: activeTab === 'talking-head' ? thDuration : (splitScenes.length > 0 ? '8' : durationSeconds),
            resolution: videoResolution,
            model: engine === 'veo3' ? 'veo3' : 'veo_fast',
            aspect_ratio: activeTab === 'talking-head' ? thAspectRatio : aspectRatio
          })
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Vertex AI Veo generation failed.');
        if (!data.url) throw new Error('Vertex AI returned no video URL.');

        setGeneratedVideo(data.url);
        updateGalleryItem(placeholderVideoId, {
          url: data.url,
          loading: false,
          prompt: promptText.substring(0, 1000)
        });
        setIsGeneratingVideo(false);
        setVideoProgressMsg('');
        showToast('Video scene generated successfully via Vertex AI!', 'success');
        return;
      }

      const veoModel = engine === 'veo3'
        ? 'veo-3.1-generate-preview'
        : engine === 'veo_lite'
        ? 'veo-3.1-lite-generate-preview'
        : 'veo-3.1-fast-generate-preview';

      const videoRequest: any = {
        model: veoModel,
        prompt: promptText.substring(0, 1000), // Safety truncation
        config: {
          numberOfVideos: 1,
          resolution: videoResolution as any,
          aspectRatio: activeTab === 'talking-head' ? thAspectRatio : (aspectRatio === '1:1' ? '9:16' : aspectRatio as any),
          durationSeconds: activeTab === 'talking-head' ? parseInt(thDuration) : (splitScenes.length > 0 ? 8 : parseInt(durationSeconds)),
          includeAudio: activeTab === 'talking-head' ? true : includeAudio
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

      const VIDEO_TIMEOUT_MS = videoGenMode === 'veo3' ? 150_000 : videoGenMode === 'veo_lite' ? 60_000 : 90_000; // 150s HQ / 60s Lite / 90s Fast
      const pollStart = Date.now();

      while (!operation.done) {
        const elapsed = Math.floor((Date.now() - pollStart) / 1000);
        if (Date.now() - pollStart > VIDEO_TIMEOUT_MS) {
          setVideoTimedOut(true);
          setIsGeneratingVideo(false);
          setVideoProgressMsg('');
          showToast(`Video generation timed out after ${elapsed}s — tap Retry to try again.`, 'error');
          if (!isAdmin && !isGlobalAdmin) refund('veo_fast', unitCost as any);
          updateGalleryItem(placeholderVideoId, { loading: false, error: `Video generation timed out after ${elapsed}s. Please check billing or try again.` });
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
        const msg = messages[Math.min(pollCount, messages.length - 1)];
        setVideoProgressMsg(`${msg} (${elapsed}s / ${Math.floor(VIDEO_TIMEOUT_MS / 1000)}s)`);
        pollCount++;
        operation = await ai.operations.getVideosOperation({ operation });
      }

      setVideoProgressMsg('Checking Response...');
      const generateVideoResponse = (operation.response as any)?.generateVideoResponse;
      const raiFiltered = generateVideoResponse?.raiMediaFilteredCount || 0;

      if (raiFiltered > 0) {
        const reason = generateVideoResponse?.raiMediaFilteredReasons?.[0] || 'Prompt conflicted with safety policies.';
        const errStr = `Video blocked by Veo safety filter. Reason: ${reason}`;
        setVideoError(errStr);
        showToast('Video blocked by safety filter — try rephrasing the prompt.', 'error');
        setIsGeneratingVideo(false);
        setVideoProgressMsg('');
        updateGalleryItem(placeholderVideoId, { loading: false, error: errStr });
        return;
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const currentApiKey = getApiKey();

        // ── Step 1: Download blob immediately ──────────────────────────────────
        setVideoProgressMsg('Downloading video...');
        const resp = await fetch(downloadLink, {
          headers: { 'x-goog-api-key': currentApiKey },
        });
        if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
        const blob = await resp.blob();
        const localUrl = URL.createObjectURL(blob);

        // ── Step 2: Show instantly in gallery + player ─────────────────────────
        setGeneratedVideo(localUrl);
        updateGalleryItem(placeholderVideoId, { url: localUrl, loading: false, prompt: promptText.substring(0, 1000) });
        showToast('Video ready! Saving to cloud...', 'success');

        // ── Step 3: Upload to Supabase in background ───────────────────────────
        uploadToSupabase(blob, 'video', promptText, currentUserId)
          .then(publicUrl => {
            if (publicUrl) {
              setGeneratedVideo(publicUrl);
              updateGalleryItem(placeholderVideoId, { url: publicUrl });
            }
          })
          .catch(err => {
            console.error('[Background GCS Save] Failed:', err);
          });
      } else {
        const errStr = 'Veo returned no video. The prompt may have been filtered — try a different prompt.';
        setVideoError(errStr);
        showToast('No video generated. Try rephrasing your prompt.', 'error');
        updateGalleryItem(placeholderVideoId, { loading: false, error: errStr });
      }
    } catch (e: any) {
      if (!isAdmin && !isGlobalAdmin) refund('veo_fast', unitCost as any);
      handleApiError(e, "Video generation");
      const errMsg = e.message || JSON.stringify(e);
      let displayError = `Error: ${errMsg}`;
      if (errMsg.includes("Requested entity was not found")) {
        displayError = "Session expired or invalid key. Please try re-selecting your API key.";
      } else if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED")) {
        displayError = `Permission Denied: Your API key doesn't have access to Veo-3.1. Please ensure:
    1. Billing is ACTIVE for your Google Cloud project.
    2. The Generative AI Video API is enabled.
    3. You have selected a valid API key from a paid project.`;
      }
      setVideoError(displayError);
      updateGalleryItem(placeholderVideoId, { loading: false, error: displayError });
    }
    setIsGeneratingVideo(false);
    setVideoProgressMsg('');
  };

  const contextValue: UGCContextType = {
    currentUserId,
    isGlobalAdmin,
    isAdmin,
    characterImg,
    setCharacterImg,
    productImg,
    setProductImg,
    locationImg,
    setLocationImg,
    podcastHost1Img,
    setPodcastHost1Img,
    podcastHost2Img,
    setPodcastHost2Img,
    podcastProductImg,
    setPodcastProductImg,
    productDetails,
    setProductDetails,
    productTags,
    setProductTags,
    productAnalysis,
    setProductAnalysis,
    userPrompt,
    setUserPrompt,
    script,
    setScript,
    scriptDuration,
    setScriptDuration,
    scriptModel,
    setScriptModel,
    handleScriptModelChange,
    selectedScriptTone,
    setSelectedScriptTone,
    selectedNiche,
    setSelectedNiche,
    spokenDialog,
    setSpokenDialog,
    scenes,
    setScenes,
    activeSceneIndex,
    setActiveSceneIndex,
    splitScenes,
    setSplitScenes,
    isGeneratingSplitPrompt,
    activeSplitTab,
    setActiveSplitTab,
    selectedPromptVariant,
    setSelectedPromptVariant,
    multiShotPrompt,
    setMultiShotPrompt,
    selectedMultiShotPreset,
    setSelectedMultiShotPreset,

    audioData,
    setAudioData,
    audioUrl,
    setAudioUrl,
    isGeneratingAudio,
    language,
    setLanguage,
    voice,
    setVoice,
    videoPrompt,
    setVideoPrompt,
    videoGenMode,
    setVideoGenMode,
    isGeneratingVideo,
    setIsGeneratingVideo,
    videoProgressMsg,
    setVideoProgressMsg,
    videoError,
    videoTimedOut,
    generateVideo,
    generateAllSceneVideos,
    generateTalkingHeadImage,
    generateTalkingHeadVideo,
    generateImage,
    isGeneratingImage,
    imageProgressMsg,
    generatedImg,
    setGeneratedImg,
    imageStyle,
    setImageStyle,
    aspectRatio,
    setAspectRatio,
    imgEngine,
    setImgEngine,
    generatedVideo,
    setGeneratedVideo,
    renderMode,
    setRenderMode,
    durationSeconds,
    setDurationSeconds,
    videoResolution,
    setVideoResolution,
    selectedVideoStyle,
    setSelectedVideoStyle,
    selectedSceneStyle,
    setSelectedSceneStyle,
    attachedRefImage,
    setAttachedRefImage,
    attachedRefImages,
    setAttachedRefImages,
    includeAudio,
    setIncludeAudio,
    timeline,
    setTimeline,
    zoomLevel,
    setZoomLevel,
    selectedTimelineId,
    setSelectedTimelineId,
    isProcessingTimeline,
    addToTimeline,
    processTimeline,
    gallery,
    setGallery,
    galleryTab,
    setGalleryTab,
    galleryExpandItem,
    setGalleryExpandItem,
    addToGallery,
    updateGalleryItem,
    activeTab,
    setActiveTab,
    chatTab,
    setChatTab,
    isChatCollapsed,
    setIsChatCollapsed,
    isSidebarOpen,
    setIsSidebarOpen,
    isGalleryOpen,
    setIsGalleryOpen,
    leftPanelMode,
    setLeftPanelMode,
    inpaintImg,
    setInpaintImg,
    showVideoMontageOptions,
    setShowVideoMontageOptions,
    thScript,
    setThScript,
    thEngine,
    setThEngine,
    thAspectRatio,
    setThAspectRatio,
    thDuration,
    setThDuration,
    thGeneratedImg,
    setThGeneratedImg,
    thGeneratedVideo,
    setThGeneratedVideo,
    thIsGeneratingImg,
    setThIsGeneratingImg,
    thIsGeneratingVideo,
    setThIsGeneratingVideo,
    thVideoProgress,
    setThVideoProgress,
    thPersonImg,
    setThPersonImg,
    thProductImg,
    setThProductImg,
    thLocationImg,
    setThLocationImg,
    toast,
    setToast,
    showToast,
    getApiKey,
    fetchImageAsBlob,
    isAnalyzing,
    isGeneratingScript,
    handleApiError,
    getImageCost,
    getCurrentCost,
    montageOptions,
    setMontageOptions,
    selectedMontageOption,
    setSelectedMontageOption,
    montagePrompt,
    setMontagePrompt,
    isMontageApproved,
    setIsMontageApproved,
    montageGeneratedImg,
    setMontageGeneratedImg,
    isGeneratingMontageImg,
    setIsGeneratingMontageImg,
    montageImgProgressMsg,
    setMontageImgProgressMsg,
    isGeneratingMontageOptions,
    setIsGeneratingMontageOptions,
    montageImgExpanded,
    setMontageImgExpanded,
    montageAudioEnabled,
    setMontageAudioEnabled,
    montageDuration,
    setMontageDuration,
    analyzeProductForMontage,
    generateMontageReferenceImage,
    analyzeProduct,
    handleImageUpload,
    sourceVideo,
    setSourceVideo,
    isAnalyzingVideo,
    setIsAnalyzingVideo,
    analysisProgress,
    setAnalysisProgress,
    handleVideoUpload,
    analyzeVideo,
    showTemplates,
    setShowTemplates,
    setIsAdmin,
    trainAgent,
    isTraining,
    testApiConnection,
    isTestingApi,
    knowledgeBase,
    setKnowledgeBase,
    isUploadingKB,
    setIsUploadingKB,
    handleKBUpload,
    gpt2Quality,
    setGpt2Quality,
    host1Voice,
    setHost1Voice,
    host2Voice,
    setHost2Voice,
    host1Name,
    setHost1Name,
    host2Name,
    setHost2Name,
    podcastScene,
    setPodcastScene,
    podcastDirectorNote,
    setPodcastDirectorNote,
    voiceSampleFile,
    setVoiceSampleFile,
    voiceSampleName,
    setVoiceSampleName,
    voiceStyle,
    setVoiceStyle,
    voiceTranscript,
    setVoiceTranscript,
    isAnalyzingVoice,
    setIsAnalyzingVoice,
    handleVoiceSampleUpload,
    analyzeVoiceSample,
    showPromptDropdown,
    setShowPromptDropdown,
    isRefinementOpen,
    setIsRefinementOpen,
    imageEditPrompt,
    setImageEditPrompt,
    isRegeneratingImage,
    setIsRegeneratingImage,
    regenerateImage,
    adminPassword,
    setAdminPassword,
    handleAdminLogin,
    showLiveGuide,
    setShowLiveGuide,
    generateSplitScenePrompt,
    generateAllSplitPrompts,
    generateGeneralVideoPrompt,
    isGeneratingGeneralPrompt,
    isExpandModalOpen,
    setIsExpandModalOpen,
    showAdminLogin,
    setShowAdminLogin,
    setIsGeneratingSplitPrompt,
    dbSceneTemplates,
    setDbSceneTemplates,
    showUploadForm,
    setShowUploadForm,
    handleUploadTemplateUgc,
    handleDeleteTemplate,
    sceneContext,
    setSceneContext,
    resetSidebarTimer
  };

  return (
    <UGCContext.Provider value={contextValue}>
      <div className="h-full flex flex-col bg-[#020202] text-white selection:bg-[#c8f135] selection:text-black relative">
      {/* ── Toast Notifications ─────────────────────────────────────── */}
      <Toast />

      {/* ── Montage Image Lightbox ────────────────────────────────── */}
      <MontageImgLightbox />

      {/* ── Scene Templates Aside ─────────────────────────────────── */}
      <SceneTemplatesAside />

      {/* ── Main DirectorStudio Layout ───────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar />

        {/* Center Column — Gallery / Editor */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
          <Header />

          {activeTab === 'edit' ? (
            <div className="flex-1 min-h-0 p-4 bg-[#050506] flex flex-col">
              {inpaintImg ? (
                <InpaintEditor
                  imageUrl={inpaintImg}
                  userId={currentUserId}
                  isEmbedded={true}
                  onClose={() => setInpaintImg(null)}
                  onDone={(url) => {
                    setGeneratedImg(url);
                    addToGallery({ id: Date.now().toString(), type: 'image', url });
                    setInpaintImg(null);
                  }}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#0a0a0c] border border-white/5 rounded-2xl p-6 text-center select-none min-h-[300px]">
                  <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Wand2 size={28} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Frame Editor</h3>
                    <p className="text-[10px] text-white/40 max-w-sm mx-auto leading-relaxed font-sans">
                      Paint over any generated image or uploaded frame and use AI to modify or regenerate that specific area.
                    </p>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <label className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all shadow-lg shadow-purple-600/20">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setInpaintImg(URL.createObjectURL(file));
                          }
                        }}
                        className="hidden"
                      />
                      Upload Image
                    </label>
                    <button
                      onClick={() => {
                        const firstImg = gallery.find(item => item.type === 'image');
                        if (firstImg) {
                          setInpaintImg(firstImg.url);
                        } else {
                          showToast("No images in gallery to edit. Generate one or upload a file.", "info");
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Use Gallery Image
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'home-tour' ? (
            <HomeTourTab />
          ) : (
            <GalleryGrid />
          )}

          {/* ── Timeline Editor Panel — docked bottom strip below gallery ── */}
          {activeTab === 'edit' && timeline.length > 0 && (
            <div className="shrink-0 border-t border-white/[0.06] bg-[#080809]">
              {/* Panel header */}
              <button
                onClick={() => setIsTimelineOpen(!isTimelineOpen)}
                className="w-full flex items-center gap-2 px-4 py-1.5 border-b border-white/[0.04] hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors text-left focus:outline-none"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#c8f135] animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">Timeline Editor</span>
                <span className="text-[7px] font-mono text-white/20">({timeline.length} clip{timeline.length !== 1 ? 's' : ''})</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[7px] font-bold uppercase tracking-wider text-white/30">
                    {isTimelineOpen ? 'Hide' : 'Show'}
                  </span>
                  <ChevronDown
                    size={10}
                    className={`text-white/40 transition-transform duration-200 ${isTimelineOpen ? '' : '-rotate-180'}`}
                  />
                </div>
              </button>
              {/* Timeline component */}
              {isTimelineOpen && (
                <div className="px-3 py-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                  <Timeline />
                </div>
              )}
            </div>
          )}

          {/* ── Floating Chatbox Overlay ── */}
          {activeTab !== 'edit' && activeTab !== 'home-tour' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 px-4 pb-4 w-full max-w-4xl">
              <motion.div
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="bg-[#0e0e10]/95 backdrop-blur-2xl border border-[#1e1e24] rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.6)] overflow-visible"
              >
                {/* ── Tab switcher: Script | Video ── */}
                <div className="relative z-50 flex flex-col md:flex-row md:items-center gap-2 md:gap-0 border-b border-[#1e1e24] p-2 md:p-0">
                  <div className="flex items-center gap-0 w-full md:w-auto">
                    {([
                      { id: 'script' as const, label: activeTab === 'podcast' ? 'Podcast Script' : activeTab === 'talking-head' ? 'Image' : 'Script', icon: activeTab === 'talking-head' ? Camera : FileText },
                      { id: 'video' as const, label: activeTab === 'podcast' ? 'Podcast Clip' : activeTab === 'talking-head' ? 'Talking Head Video' : 'Video', icon: Film },
                    ] as {id: 'script'|'video', label: string, icon: any}[]).map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => { setChatTab(tab.id); setIsChatCollapsed(false); }}
                        className={`flex-grow md:flex-grow-0 flex items-center justify-center gap-1.5 px-4 md:px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 ${
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
                        className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00ffe0]/15 border border-[#00ffe0]/30 text-[#00ffe0] text-[7px] font-black uppercase tracking-widest hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-all shrink-0"
                        title="Admin mode ON — click to deactivate">
                        <ShieldCheck size={8} /> Admin
                      </button>
                    )}
                  </div>
                  {/* error pill pushed right */}
                  {videoError && (
                    <div className="ml-0 md:ml-auto mr-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 max-w-max">
                      <AlertCircle size={9} className="text-red-400 text-xs shrink-0" />
                      <span className="text-[8px] font-black text-red-400 uppercase tracking-widest truncate max-w-[140px]">{videoError}</span>
                    </div>
                  )}
                  {/* Script-tab dropdowns pushed right */}
                  {chatTab === 'script' && (
                    <div className="ml-0 md:ml-auto flex items-center gap-1.5 px-2 md:px-3 overflow-x-auto no-scrollbar py-1" style={{ scrollbarWidth: 'none' }}>
                      <Dropdown label="" value={language} options={LANGUAGES} onChange={setLanguage} direction="up" className="w-[72px] md:w-[85px] shrink-0" />
                      <Dropdown label="" value={voice} options={VOICES} onChange={setVoice} direction="up" className="w-[62px] md:w-[80px] shrink-0" />
                      
                      {/* Script Model Switcher Dropdown */}
                      <Dropdown
                        label=""
                        value={scriptModel === 'veo3' ? 'VEO 3' : 'OMNI'}
                        options={['VEO 3', 'OMNI']}
                        onChange={(val: string) => {
                          handleScriptModelChange(val === 'VEO 3' ? 'veo3' : 'omni');
                        }}
                        direction="up"
                        className="w-[65px] md:w-[75px] shrink-0"
                      />

                      {/* Multi-Shot Toggle */}
                      <button
                        type="button"
                        onClick={() => setMultiShotPrompt(!multiShotPrompt)}
                        title={multiShotPrompt ? 'Multi-Shot Prompt: ON' : 'Multi-Shot Prompt: OFF'}
                        className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 flex-shrink-0 text-[8.5px] font-black uppercase tracking-widest ${
                          multiShotPrompt
                            ? 'border-[#c8f135]/40 bg-[#c8f135]/10 text-[#c8f135]'
                            : 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70'
                        }`}
                      >
                        <Film size={9} />
                        <span>Multi-Shot</span>
                      </button>

                      <Dropdown label="" value={scriptDuration} options={scriptModel === 'omni' ? ['10 seconds', '20 seconds', '30 seconds', '40 seconds', '50 seconds', '60 seconds'] : ['8 seconds', '16 seconds', '24 seconds', '36 seconds', '42 seconds']} onChange={setScriptDuration} direction="up" className="w-[82px] md:w-[100px] shrink-0" />
                      <Dropdown
                        label=""
                        value={SCRIPT_TONES[selectedScriptTone] ? SCRIPT_TONES[selectedScriptTone].name : selectedScriptTone}
                        options={Object.values(SCRIPT_TONES).map((t: any) => `${t.category}: ${t.name}`)}
                        onChange={(val: string) => {
                          const key = Object.keys(SCRIPT_TONES).find(k => `${SCRIPT_TONES[k].category}: ${SCRIPT_TONES[k].name}` === val);
                          if (key) setSelectedScriptTone(key);
                        }}
                        direction="up"
                        className="w-[80px] md:w-[120px] shrink-0"
                      />
                    </div>
                  )}
                  {/* Collapse / expand toggle — far right */}
                  <button
                    onClick={() => setIsChatCollapsed(c => !c)}
                    title={isChatCollapsed ? 'Expand chat' : 'Collapse chat'}
                    className="absolute right-2 top-2.5 md:relative md:right-0 md:top-0 md:ml-auto md:mr-2 shrink-0 w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-[#c8f135] hover:border-[#c8f135]/40 transition-all"
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
                  className="max-h-[50vh] md:max-h-none overflow-y-auto custom-scrollbar"
                  style={{ overflowX: 'hidden' }}
                >



 
                {/* Split scenes dialog panel — globally visible at top */}
                {splitScenes.length > 0 && <SplitScenesPanel />}


                {/* ════════════════ SCRIPT TAB ════════════════ */}
                {chatTab === 'script' && <React.Fragment>

                {/* Attached reference image thumbnail */}
                {attachedRefImage && (
                  <div className="flex items-center gap-2 px-4 pt-2">
                    <div className="relative group/att">
                      <img src={resolveUrl(attachedRefImage)} alt="ref" className="w-10 h-10 rounded-lg object-cover border border-[#c8f135]/40 shadow-md" />
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
                    className="w-full h-16 bg-transparent font-sans text-sm text-white/90 resize-none focus:outline-none placeholder-white/20 leading-relaxed pr-8"
                    placeholder={activeTab === 'podcast' ? 'Your podcast script will appear here — or type episode direction...' : 'Your UGC script will appear here — or type your creative direction...'}
                  />
                  {script && !isGeneratingScript && !isExtractingPrompts && (
                    <button
                      onClick={generateScript}
                      title="Rewrite Script"
                      className="absolute right-6 top-3 p-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-[#c8f135] hover:bg-white/10 hover:border-[#c8f135]/30 hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
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

                      const parsed: {label: string; dialog: string; prompt: string; refImage?: string | null}[] = [];

                      // Split by timestamps
                      const parts = script.split(/(\[\d+:\d+\s*[-–]\s*\d+:\d+\])/g);
                      if (parts.length > 1) {
                        for (let i = 1; i < parts.length; i += 2) {
                          const timeRange = parts[i].replace(/[\[\]]/g, '').trim();
                          let segmentText = parts[i + 1]?.trim() || '';
                          if (segmentText) {
                            segmentText = segmentText.replace(/^(HOOK|PAYOFF|CTA|SCENE\s*\d*|INTRO|OUTRO|BODY|SCENE)\b\s*[:\-\–\s\,]*\s*/i, '').trim();
                            const matchingScene = scenes[parsed.length];
                            const defaultPrompt = matchingScene?.prompt || matchingScene?.visualCue || videoPrompt || '';
                            parsed.push({ label: `Scene ${parsed.length + 1} [${timeRange}]`, dialog: segmentText, prompt: defaultPrompt });
                          }
                        }
                      } else {
                        // Fallback to chunking by words
                        const cleanText = script
                          .replace(/\[[^\]]+\]/g, '')           // remove [0:00-0:08] style timestamps
                          .replace(/^(HOOK|PAYOFF|Scene\s+\d+|Host\s*\d*)\s*:/gim, '') // remove scene/speaker labels
                          .replace(/\*\*[^*]+\*\*/g, '')        // strip markdown bold
                          .replace(/\n{3,}/g, '\n\n')           // collapse triple+ newlines
                          .trim();

                        const isOmni = scriptModel === 'omni';
                        // Derive scene count from the actual selected total duration
                        const totalDurSec = parseInt(scriptDuration) || (isOmni ? 20 : 16);
                        // Each scene is 10s for Omni, 8s otherwise — but clamp to at least 1 scene
                        const perSceneDur = isOmni ? 10 : 8;
                        const targetSceneCount = Math.max(1, Math.round(totalDurSec / perSceneDur));
                        const words = cleanText.split(/\s+/).filter(Boolean);
                        // Distribute words evenly across targetSceneCount scenes
                        const wordsPerChunk = Math.max(5, Math.ceil(words.length / targetSceneCount));
                        if (words.length > 0) {
                          let chunkStart = 0;
                          let sceneNum = 1;
                          for (let wi = 0; wi < words.length; wi += wordsPerChunk) {
                            const chunkWords = words.slice(wi, wi + wordsPerChunk);
                            const dialog = chunkWords.join(' ');
                            // Each scene takes exactly perSceneDur seconds of the total
                            const chunkEnd = chunkStart + perSceneDur;
                            const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
                            const label = `Scene ${sceneNum} [${fmt(chunkStart)} - ${fmt(chunkEnd)}]`;
                            const matchingScene = scenes[sceneNum - 1];
                            const defaultPrompt = matchingScene?.prompt || matchingScene?.visualCue || videoPrompt || '';
                            parsed.push({ label, dialog, prompt: defaultPrompt });
                            chunkStart = chunkEnd;
                            sceneNum++;
                          }
                        }
                      }

                      if (parsed.length > 0) { 
                        setSplitScenes(parsed); 
                        setActiveSplitTab(0); 
                        setVideoPrompt(parsed[0].prompt || '');
                        setChatTab('video');
                      }
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
                <TalkingHeadTab />
              )}

              {/* ════════════════ VIDEO TAB ════════════════ */}
              {chatTab === 'video' && activeTab !== 'talking-head' && <VideoTab />}
              </motion.div>{/* end collapsible body */}
            </motion.div>
          </div>
          )}

        </div>{/* end center column */}
      </div>{/* end main DirectorStudio flex */}
      </div>{/* end outer h-full flex flex-col */}

      {/* ── Overlays & Modals ────────────────────────────────────────── */}

      {/* Focus Modal */}
      <FocusModal />


      {/* ── Gallery Expand Modal ── */}
      <GalleryExpandModal />

      {/* Live Deployment Guide */}
      <LiveGuideModal />

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

    </UGCContext.Provider>
  );
}

