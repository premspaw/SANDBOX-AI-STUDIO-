// ─── UGC STUDIO CONTEXT ───────────────────────────────────────────────────────
// Single shared context so all child components can access UGC state without
// prop-drilling through deeply nested subtrees.
//
// USAGE:
//   import { useUGC } from '../../features/UGCStudio/context/UGCContext';
//   const { script, generateVideo } = useUGC();
//
// Provider is in UGC.tsx (the main shell) — all useState stays there for now.
// This file only defines the shape; nothing breaks if a field is added later.

import React, { createContext, useContext } from 'react';

export interface KnowledgeBaseEntry {
  id: string;
  name: string;
  content: string;
}

// ── Type re-exports so consumers don't need to import from UGC.tsx directly ──
export interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt?: string;
  loading?: boolean;
}

export interface TimelineItem {
  id: string;
  url: string;
  start: number;
  end: number;
  duration: number;
  type: 'video' | 'audio';
  originalFile?: File;
}

export interface Scene {
  id: string;
  text?: string;
  prompt: string;
  isApproved: boolean;
  visualCue?: string;
  timestamp?: string;
  label?: string;
  image?: string;
}

export interface SplitScene {
  label: string;
  dialog: string;
  prompt: string;
  refImage?: string | null;
}

// ── Context shape ──────────────────────────────────────────────────────────────
export interface UGCContextType {
  // ── Auth / user ──────────────────────────────────────────────────────────
  currentUserId: string;
  isGlobalAdmin: boolean;
  isAdmin: boolean;

  // ── Reference assets ─────────────────────────────────────────────────────
  characterImg: { url: string; file: File } | null;
  setCharacterImg: (v: { url: string; file: File } | null) => void;
  productImg: { url: string; file: File } | null;
  setProductImg: (v: { url: string; file: File } | null) => void;
  locationImg: { url: string; file: File } | null;
  setLocationImg: (v: { url: string; file: File } | null) => void;

  // ── Podcast assets ───────────────────────────────────────────────────────
  podcastHost1Img: { url: string; file: File } | null;
  setPodcastHost1Img: (v: { url: string; file: File } | null) => void;
  podcastHost2Img: { url: string; file: File } | null;
  setPodcastHost2Img: (v: { url: string; file: File } | null) => void;
  podcastProductImg: { url: string; file: File } | null;
  setPodcastProductImg: (v: { url: string; file: File } | null) => void;

  // ── Product metadata ─────────────────────────────────────────────────────
  productDetails: string;
  setProductDetails: (v: string) => void;
  productTags: string[];
  setProductTags: (v: string[]) => void;
  productAnalysis: { productName?: string; description?: string; keyBenefits?: string[]; targetAudience?: string; useCases?: string[] } | null;
  setProductAnalysis: (v: any) => void;
  userPrompt: string;
  setUserPrompt: (v: string) => void;

  // ── Script ───────────────────────────────────────────────────────────────
  script: string;
  setScript: (v: string) => void;
  scriptDuration: string;
  setScriptDuration: (v: string) => void;
  selectedScriptTone: string;
  setSelectedScriptTone: (v: string) => void;
  selectedNiche: string;
  setSelectedNiche: (v: string) => void;
  spokenDialog: string;
  setSpokenDialog: (v: string) => void;
  scenes: Scene[];
  setScenes: (v: Scene[]) => void;
  activeSceneIndex: number;
  setActiveSceneIndex: (v: number) => void;

  // ── Split scenes ─────────────────────────────────────────────────────────
  splitScenes: SplitScene[];
  setSplitScenes: React.Dispatch<React.SetStateAction<SplitScene[]>>;
  isGeneratingSplitPrompt: boolean;
  activeSplitTab: number;
  setActiveSplitTab: (v: number) => void;
  selectedPromptVariant: number;
  setSelectedPromptVariant: (v: number) => void;

  // ── Audio ────────────────────────────────────────────────────────────────
  audioData: string;
  setAudioData: (v: string) => void;
  audioUrl: string;
  setAudioUrl: (v: string) => void;
  isGeneratingAudio: boolean;
  language: string;
  setLanguage: (v: string) => void;
  voice: string;
  setVoice: (v: string) => void;

  // ── Video generation ──────────────────────────────────────────────────────
  videoPrompt: string;
  setVideoPrompt: (v: string) => void;
  videoGenMode: 'veo_fast' | 'veo3' | 'veo_lite' | 'montage';
  setVideoGenMode: (v: 'veo_fast' | 'veo3' | 'veo_lite' | 'montage') => void;
  isGeneratingVideo: boolean;
  setIsGeneratingVideo: (v: boolean) => void;
  videoProgressMsg: string;
  setVideoProgressMsg: (v: string) => void;
  videoError: string;
  videoTimedOut: boolean;
  generateVideo: (prompt?: string, refImage?: string) => Promise<void>;
  generateAllSceneVideos: () => Promise<void>;
  generateTalkingHeadImage: () => Promise<void>;
  generateTalkingHeadVideo: () => Promise<void>;

  // ── Image generation ──────────────────────────────────────────────────────
  isGeneratingImage: boolean;
  imageProgressMsg: string;
  generatedImg: string;
  setGeneratedImg: (v: string) => void;
  imageStyle: 'studio' | 'ultra-realistic' | 'iphone' | 'short' | 'normal' | 'cinematic';
  setImageStyle: (v: any) => void;
  aspectRatio: '9:16' | '16:9' | '1:1';
  setAspectRatio: (v: any) => void;
  imgEngine: 'nb2' | 'gpt2';
  setImgEngine: (v: 'nb2' | 'gpt2') => void;

  // ── Video output ──────────────────────────────────────────────────────────
  generatedVideo: string;
  setGeneratedVideo: (v: string) => void;
  renderMode: 'image' | 'video';
  setRenderMode: (v: 'image' | 'video') => void;
  durationSeconds: '4' | '6' | '8';
  setDurationSeconds: (v: '4' | '6' | '8') => void;
  videoResolution: '720p' | '1080p';
  setVideoResolution: (v: '720p' | '1080p') => void;
  selectedVideoStyle: string;
  setSelectedVideoStyle: (v: any) => void;
  selectedSceneStyle: string;
  setSelectedSceneStyle: (v: string) => void;
  attachedRefImage: string | null;
  setAttachedRefImage: (v: string | null) => void;
  includeAudio: boolean;
  setIncludeAudio: (v: boolean) => void;

  // ── Timeline ─────────────────────────────────────────────────────────────
  timeline: TimelineItem[];
  setTimeline: React.Dispatch<React.SetStateAction<TimelineItem[]>>;
  zoomLevel: number;
  setZoomLevel: (v: number) => void;
  selectedTimelineId: string | null;
  setSelectedTimelineId: (v: string | null) => void;
  isProcessingTimeline: boolean;
  addToTimeline: (item: any) => void;
  processTimeline: () => Promise<void>;

  // ── Gallery ───────────────────────────────────────────────────────────────
  gallery: GalleryItem[];
  galleryTab: 'all' | 'image' | 'video';
  setGalleryTab: (v: 'all' | 'image' | 'video') => void;
  galleryExpandItem: GalleryItem | null;
  setGalleryExpandItem: (v: GalleryItem | null) => void;
  addToGallery: (item: GalleryItem) => void;
  updateGalleryItem: (id: string, updates: Partial<GalleryItem>) => void;

  // ── UI / layout ───────────────────────────────────────────────────────────
  activeTab: 'ugc' | 'podcast' | 'talking-head' | 'home-tour' | 'edit';
  setActiveTab: (v: 'ugc' | 'podcast' | 'talking-head' | 'home-tour' | 'edit') => void;
  chatTab: 'script' | 'video';
  setChatTab: (v: 'script' | 'video') => void;
  isChatCollapsed: boolean;
  setIsChatCollapsed: (v: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
  isGalleryOpen: boolean;
  setIsGalleryOpen: (v: boolean) => void;
  leftPanelMode: 'image' | 'video';
  setLeftPanelMode: (v: 'image' | 'video') => void;
  inpaintImg: string | null;
  setInpaintImg: (v: string | null) => void;
  showVideoMontageOptions: boolean;
  setShowVideoMontageOptions: (v: boolean) => void;

  // ── Shared Montage States & Helpers ──────────────────────────────────────
  montageOptions: { id: string; title: string; prompt: string; icon: string }[];
  setMontageOptions: (v: { id: string; title: string; prompt: string; icon: string }[]) => void;
  selectedMontageOption: { id: string; title: string; prompt: string; icon: string } | null;
  setSelectedMontageOption: (v: { id: string; title: string; prompt: string; icon: string } | null) => void;
  montagePrompt: string;
  setMontagePrompt: (v: string) => void;
  isMontageApproved: boolean;
  setIsMontageApproved: (v: boolean) => void;
  montageGeneratedImg: string;
  setMontageGeneratedImg: (v: string) => void;
  isGeneratingMontageImg: boolean;
  setIsGeneratingMontageImg: (v: boolean) => void;
  montageImgProgressMsg: string;
  setMontageImgProgressMsg: (v: string) => void;
  isGeneratingMontageOptions: boolean;
  setIsGeneratingMontageOptions: (v: boolean) => void;
  montageImgExpanded: boolean;
  setMontageImgExpanded: (v: boolean) => void;
  montageAudioEnabled: boolean;
  setMontageAudioEnabled: (v: boolean | ((prev: boolean) => boolean)) => void;
  montageDuration: '4' | '6' | '8';
  setMontageDuration: (v: '4' | '6' | '8') => void;
  analyzeProductForMontage: (file: File) => Promise<void>;
  generateMontageReferenceImage: (option: any) => Promise<string>;

  // ── Talking Head Tab States ───────────────────────────────────────────────
  thScript: string;
  setThScript: (v: string) => void;
  thEngine: 'veo_lite' | 'veo_fast' | 'veo3';
  setThEngine: (v: 'veo_lite' | 'veo_fast' | 'veo3') => void;
  thAspectRatio: '9:16' | '16:9';
  setThAspectRatio: (v: '9:16' | '16:9') => void;
  thDuration: '4' | '6' | '8';
  setThDuration: (v: '4' | '6' | '8') => void;
  thGeneratedImg: string;
  setThGeneratedImg: (v: string) => void;
  thGeneratedVideo: string;
  setThGeneratedVideo: (v: string) => void;
  thIsGeneratingImg: boolean;
  setThIsGeneratingImg: (v: boolean) => void;
  thIsGeneratingVideo: boolean;
  setThIsGeneratingVideo: (v: boolean) => void;
  thVideoProgress: string;
  setThVideoProgress: (v: string) => void;
  thPersonImg: { url: string; file: File } | null;
  setThPersonImg: (v: { url: string; file: File } | null) => void;
  thProductImg: { url: string; file: File } | null;
  setThProductImg: (v: { url: string; file: File } | null) => void;
  thLocationImg: { url: string; file: File } | null;
  setThLocationImg: (v: { url: string; file: File } | null) => void;

  // ── Toast / error ─────────────────────────────────────────────────────────
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  setToast: React.Dispatch<React.SetStateAction<{ message: string; type: 'success' | 'error' | 'info' } | null>>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  // ── Misc helpers ──────────────────────────────────────────────────────────
  getApiKey: () => string;
  fetchImageAsBlob: (url: string) => Promise<Blob>;
  isAnalyzing: boolean;
  isGeneratingScript: boolean;
  handleApiError: (e: any, context: string) => void;
  getImageCost: () => number;
  getCurrentCost: (isMontage?: boolean, customDuration?: number) => number;

  // ── Extended States & Handlers ──────────────────────────────────────────
  analyzeProduct: () => Promise<void>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'character' | 'product' | 'location' | 'generated' | 'podcastHost1' | 'podcastHost2' | 'podcastProduct') => void;
  sourceVideo: { url: string; file: File } | null;
  setSourceVideo: (v: { url: string; file: File } | null) => void;
  isAnalyzingVideo: boolean;
  setIsAnalyzingVideo: (v: boolean) => void;
  analysisProgress: string;
  setAnalysisProgress: (v: string) => void;
  handleVideoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  analyzeVideo: () => Promise<void>;
  showTemplates: boolean;
  setShowTemplates: (v: boolean) => void;
  setIsAdmin: (v: boolean) => void;
  trainAgent: () => Promise<void>;
  isTraining: boolean;
  testApiConnection: () => Promise<void>;
  isTestingApi: boolean;
  knowledgeBase: KnowledgeBaseEntry[];
  setKnowledgeBase: (v: any) => void;
  isUploadingKB: boolean;
  setIsUploadingKB: (v: boolean) => void;
  handleKBUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  gpt2Quality: 'low' | 'medium' | 'high';
  setGpt2Quality: (v: 'low' | 'medium' | 'high') => void;
  host1Voice: string;
  setHost1Voice: (v: string) => void;
  host2Voice: string;
  setHost2Voice: (v: string) => void;
  host1Name: string;
  setHost1Name: (v: string) => void;
  host2Name: string;
  setHost2Name: (v: string) => void;
  podcastScene: string;
  setPodcastScene: (v: string) => void;
  podcastDirectorNote: string;
  setPodcastDirectorNote: (v: string) => void;
  voiceSampleFile: File | null;
  setVoiceSampleFile: (v: File | null) => void;
  voiceSampleName: string | null;
  setVoiceSampleName: (v: string | null) => void;
  voiceStyle: string;
  setVoiceStyle: (v: string) => void;
  voiceTranscript: string;
  setVoiceTranscript: (v: string) => void;
  isAnalyzingVoice: boolean;
  setIsAnalyzingVoice: (v: boolean) => void;
  handleVoiceSampleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  analyzeVoiceSample: () => Promise<void>;
  showPromptDropdown: boolean;
  setShowPromptDropdown: (v: boolean) => void;
  isRefinementOpen: boolean;
  setIsRefinementOpen: (v: boolean) => void;
  imageEditPrompt: string;
  setImageEditPrompt: (v: string) => void;
  isRegeneratingImage: boolean;
  setIsRegeneratingImage: (v: boolean) => void;
  regenerateImage: () => Promise<void>;
  adminPassword: string;
  setAdminPassword: (v: string) => void;
  handleAdminLogin: () => void;
  showLiveGuide: boolean;
  setShowLiveGuide: (v: boolean) => void;
  generateSplitScenePrompt: (tabIdx: number) => Promise<void>;
  isExpandModalOpen: boolean;
  setIsExpandModalOpen: (v: boolean) => void;
  showAdminLogin: boolean;
  setShowAdminLogin: (v: boolean) => void;
  setIsGeneratingSplitPrompt: (v: boolean) => void;

  // Scene Templates Management
  dbSceneTemplates: any[];
  setDbSceneTemplates: React.Dispatch<React.SetStateAction<any[]>>;
  showUploadForm: boolean;
  setShowUploadForm: (v: boolean) => void;
  handleUploadTemplateUgc: () => Promise<void>;
  handleDeleteTemplate: (templateId: any) => Promise<void>;
  sceneContext: string;
  setSceneContext: (v: string) => void;
  resetSidebarTimer: () => void;
}

// ── Context creation ──────────────────────────────────────────────────────────
export const UGCContext = createContext<UGCContextType | null>(null);

/**
 * useUGC — consume the shared UGC Studio context.
 * Throws a clear error if used outside a <UGCContext.Provider>.
 */
export const useUGC = (): UGCContextType => {
  const ctx = useContext(UGCContext);
  if (!ctx) throw new Error('useUGC must be called inside UGCStudio (UGCContext.Provider)');
  return ctx;
};
