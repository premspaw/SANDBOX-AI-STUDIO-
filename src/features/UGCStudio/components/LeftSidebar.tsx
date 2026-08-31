import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Camera, User, X, Package, MapPin, Search, Volume2, Upload, FileText, Film, Layers, BrainCircuit, Plus, Loader2, ChevronLeft, ChevronRight, ChevronDown, Layout, Clock, Sparkles, AlertCircle, CheckCircle, ShieldCheck, Wand2, Play, Video, Image as ImageIcon, Zap } from 'lucide-react';
import { useUGC, KnowledgeBaseEntry, SplitScene } from '../context/UGCContext';
import { Dropdown } from './Dropdown';
import { SCENE_STYLES } from '../constants/videoStyles';
import { VOICES } from '../constants/sceneTemplates';
import { MontagePanel } from './MontagePanel';
import { getApiUrl, resolveUrl } from '../../../config/apiConfig';
import { GoogleGenAI } from '@google/genai';
import { fileToBase64, safeJsonParse } from '../utils/imageUtils';

export default function LeftSidebar() {
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    activeTab,
    getImageCost,
    thPersonImg,
    setThPersonImg,
    thProductImg,
    setThProductImg,
    thLocationImg,
    setThLocationImg,
    thSpokespersonGender,
    setThSpokespersonGender,
    thSpokespersonRegion,
    setThSpokespersonRegion,
    thSpokespersonAge,
    setThSpokespersonAge,
    thSpokespersonOutfit,
    setThSpokespersonOutfit,
    thSpokespersonPose,
    setThSpokespersonPose,
    thSpokespersonShotType,
    setThSpokespersonShotType,
    styleRefImg,
    setStyleRefImg,
    thAnimation,
    setThAnimation,
    generateTalkingHeadImage,
    thIsGeneratingImg,
    analyzeProduct,
    isAnalyzing,
    productAnalysis,
    podcastHost1Img,
    setPodcastHost1Img,
    podcastHost2Img,
    setPodcastHost2Img,
    podcastProductImg,
    setPodcastProductImg,
    handleImageUpload,
    host1Voice,
    setHost1Voice,
    host2Voice,
    setHost2Voice,
    voiceSampleName,
    handleVoiceSampleUpload,
    setVoiceSampleFile,
    setVoiceSampleName,
    setVoiceStyle,
    setVoiceTranscript,
    voiceSampleFile,
    analyzeVoiceSample,
    isAnalyzingVoice,
    voiceTranscript,
    setScript,
    voiceStyle,
    host1Name,
    setHost1Name,
    host2Name,
    setHost2Name,
    userPrompt,
    setUserPrompt,
    script,
    generateAllSceneVideos,
    generateTalkingHeadVideo,
    generateGeneralVideoPrompt,
    isGeneratingGeneralPrompt,
    podcastScene,
    setPodcastScene,
    podcastDirectorNote,
    setPodcastDirectorNote,
    leftPanelMode,
    productImg,
    setProductImg,
    characterImg,
    setCharacterImg,
    locationImg,
    setLocationImg,
    refVideoFile,
    setRefVideoFile,
    refVideoUrl,
    setRefVideoUrl,
    setRefVideoDuration,
    generateVideoWithMotionRef,
    isGeneratingMotionRef,
    isAnalyzingMotionRefVideo,
    analysisMotionRefProgress,
    analyzeMotionReferenceVideo,
    sourceVideo,
    handleVideoUpload,
    analyzeVideo,
    isAnalyzingVideo,
    analysisProgress,
    setShowTemplates,
    isAdmin,
    setIsAdmin,
    trainAgent,
    isTraining,
    knowledgeBase,
    setKnowledgeBase,
    testApiConnection,
    isTestingApi,
    isUploadingKB,
    handleKBUpload,
    imgEngine,
    setImgEngine,
    gpt2Quality,
    setGpt2Quality,
    aspectRatio,
    setAspectRatio,
    isGeneratingMontageImg,
    montageImgProgressMsg,
    selectedSceneStyle,
    setSelectedSceneStyle,
    imageStyle,
    productDetails,
    generateMontageReferenceImage,
    montageGeneratedImg,
    showToast,
    gallery,
    inpaintImg,
    setInpaintImg,
    // Multi-short visual scan extras
    fetchImageAsBlob,
    handleApiError,
    currentUserId,
    getApiKey,
    splitScenes,
    setSplitScenes,
    durationSeconds,
  } = useUGC();

  if (activeTab === 'home-tour') return null;

  // Helper styles matching T design tokens
  const T = {
    lime: '#c8f135',
  };

  const [sidebarTab, setSidebarTab] = useState<'creator' | 'motion-control' | 'storyboard'>('creator');

  // Motion Control Local States
  const [motionPreset, setMotionPreset] = useState<'push_in' | 'orbit' | 'macro' | 'tracking' | 'drone'>('push_in');
  const [motionZoom, setMotionZoom] = useState<'in' | 'out' | 'none'>('in');
  const [motionPan, setMotionPan] = useState<'left' | 'right' | 'none'>('none');
  const [motionTilt, setMotionTilt] = useState<'up' | 'down' | 'none'>('none');

  // Storyboard Local States
  const [storyboardPreset, setStoryboardPreset] = useState<'insta_reel' | 'tiktok_ugc' | 'commercial' | 'tech_demo'>('insta_reel');
  const [storyboardBrief, setStoryboardBrief] = useState('High-converting marketing commercial with locked face & product identity');
  const [isGeneratingGrid, setIsGeneratingGrid] = useState(false);

  // Apply Motion Parameters to Active Scene Prompt
  const handleApplyMotionToScene = () => {
    let motionText = `Camera Motion: ${motionPreset.replace('_', ' ').toUpperCase()}`;
    if (motionZoom !== 'none') motionText += `, Zoom ${motionZoom}`;
    if (motionPan !== 'none') motionText += `, Pan ${motionPan}`;
    if (motionTilt !== 'none') motionText += `, Tilt ${motionTilt}`;

    if (splitScenes && splitScenes.length > 0) {
      setSplitScenes((prev: any[]) => prev.map((s, idx) => {
        if (idx === 0) {
          return { ...s, prompt: `${s.prompt} [${motionText}]` };
        }
        return s;
      }));
      showToast(`Applied ${motionText} to Scene 1`, 'success');
    } else {
      showToast(`Motion preset set: ${motionText}`, 'info');
    }
  };

  // Generate Composite Storyboard Grid & Split Scenes
  const handleGenerateStoryboardInSidebar = async () => {
    setIsGeneratingGrid(true);
    showToast('Generating AI Storyboard Grid Sheet...', 'info');

    try {
      const parts = [];
      if (thProductImg?.url) parts.push({ text: `[PRODUCT_REF] attached.` });
      if (thPersonImg?.url) parts.push({ text: `[CHARACTER_REF] attached.` });

      parts.push({
        text: `Generate a 4-panel marketing storyboard grid sequence for brief: "${storyboardBrief}". Return JSON array of 4 scenes with keys "label", "prompt", "dialog".`
      });

      const res = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts, model: 'gemini-2.5-flash' })
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.text || '';
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsedScenes = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsedScenes) && parsedScenes.length > 0) {
            setSplitScenes(parsedScenes.map((ps: any, i: number) => ({
              label: ps.label || `Panel ${i + 1}`,
              dialog: ps.dialog || '',
              prompt: ps.prompt || '',
            })));
            showToast('Loaded 4-panel Storyboard into Split Scenes!', 'success');
          }
        }
      }
    } catch (e) {
      console.error('[Sidebar Storyboard Error]', e);
      showToast('Generated 4-panel Storyboard fallback sequence!', 'info');
      setSplitScenes([
        { label: 'Panel 1: Attention Hook', dialog: 'Stop doing it the old way!', prompt: 'Close up creator holding product with surprised reaction.' },
        { label: 'Panel 2: Texture & Unboxing', dialog: 'Look at the build quality.', prompt: 'Macro shot of product unboxing with hands.' },
        { label: 'Panel 3: Demonstration', dialog: 'It takes literally 5 seconds.', prompt: 'Creator demonstrating product in real environment.' },
        { label: 'Panel 4: Hero Smile & CTA', dialog: 'Click below to grab yours!', prompt: 'Low angle hero shot of creator smiling with product.' }
      ]);
    } finally {
      setIsGeneratingGrid(false);
    }
  };

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidth = isMobile ? (typeof window !== 'undefined' ? Math.min(Math.round(window.innerWidth * 0.88), 350) : 340) : 280;

  return (
    <div className="absolute md:relative flex shrink-0 h-full z-[45]">
      {/* Mobile backdrop overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[40] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <motion.div
        animate={{ width: isSidebarOpen ? sidebarWidth : 0, opacity: isSidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="h-full border-r border-[#1e1e24] bg-[#080808] flex flex-col overflow-hidden relative z-[45]"
        style={{ minWidth: 0 }}
      >
        {/* ── UNIFIED TOP TAB BAR IN SIDEBAR ── */}
        <div className="p-2 border-b border-[#1e1e24] bg-[#0c0c12] shrink-0 z-10">
          <div className="grid grid-cols-3 gap-1 bg-[#14141d] p-1 rounded-xl border border-white/5 select-none">
            <button
              onClick={() => setSidebarTab('creator')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                sidebarTab === 'creator'
                  ? 'bg-[#c8f135] text-black shadow-md shadow-[#c8f135]/20'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles size={11} />
              <span>Studio</span>
            </button>

            <button
              onClick={() => setSidebarTab('motion-control')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                sidebarTab === 'motion-control'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <Video size={11} />
              <span>Motion</span>
            </button>

            <button
              onClick={() => setSidebarTab('storyboard')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                sidebarTab === 'storyboard'
                  ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers size={11} />
              <span>Board</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {/* ── MOTION CONTROL SUB-PANEL ── */}
          {sidebarTab === 'motion-control' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h2 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Video size={13} /> Camera Motion Control
                </h2>
                <span className="text-[8px] bg-amber-400/10 text-amber-400 border border-amber-400/20 px-1.5 py-0.5 rounded font-mono uppercase">Cinematic</span>
              </div>

              {/* 1. Camera Angle Presets */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-white/40 uppercase tracking-widest block">1. Shot Framing &amp; Motion Angle</label>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { id: 'push_in', label: '🎬 Slow Push-In Hook', desc: 'Dramatic zoom push into face/product' },
                    { id: 'orbit', label: '🔄 360° Orbit Sweep', desc: 'Smooth rotational camera sweep' },
                    { id: 'macro', label: '🔍 Macro Close-Up Reveal', desc: 'Extreme detail focus on product texture' },
                    { id: 'tracking', label: '🚶 Handheld Follow Vlog', desc: 'Natural organic movement with creator' },
                    { id: 'drone', label: '🚁 Drone High Wide Angle', desc: 'Expansive overhead wide framing' }
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setMotionPreset(p.id as any)}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        motionPreset === p.id
                          ? 'bg-amber-400/15 border-amber-400 text-amber-300'
                          : 'bg-[#12121c] border-white/5 text-white/60 hover:border-white/20'
                      }`}
                    >
                      <p className="text-[9px] font-black uppercase tracking-wider">{p.label}</p>
                      <p className="text-[8px] text-white/30 font-medium truncate">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Manual Trajectory Control */}
              <div className="p-3 rounded-xl bg-[#12121c] border border-white/5 space-y-2">
                <label className="text-[8px] font-black text-white/40 uppercase tracking-widest block">2. Pan / Tilt / Zoom Dynamics</label>
                
                <div className="grid grid-cols-3 gap-1">
                  <div>
                    <span className="text-[7px] text-white/30 font-bold block mb-0.5">Zoom</span>
                    <select value={motionZoom} onChange={e => setMotionZoom(e.target.value as any)} className="w-full bg-[#181824] text-white text-[8px] font-bold p-1 rounded border border-white/10">
                      <option value="in">Zoom In</option>
                      <option value="out">Zoom Out</option>
                      <option value="none">Static</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[7px] text-white/30 font-bold block mb-0.5">Pan</span>
                    <select value={motionPan} onChange={e => setMotionPan(e.target.value as any)} className="w-full bg-[#181824] text-white text-[8px] font-bold p-1 rounded border border-white/10">
                      <option value="none">Off</option>
                      <option value="left">Pan Left</option>
                      <option value="right">Pan Right</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[7px] text-white/30 font-bold block mb-0.5">Tilt</span>
                    <select value={motionTilt} onChange={e => setMotionTilt(e.target.value as any)} className="w-full bg-[#181824] text-white text-[8px] font-bold p-1 rounded border border-white/10">
                      <option value="none">Off</option>
                      <option value="up">Tilt Up</option>
                      <option value="down">Tilt Down</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Motion Reference Video Upload */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-white/40 uppercase tracking-widest block">3. Motion Video Reference</label>
                <div className="relative group p-3 rounded-xl bg-[#12121c] border border-dashed border-white/10 hover:border-amber-400/50 transition-all flex flex-col items-center justify-center text-center cursor-pointer">
                  <input type="file" accept="video/*" onChange={handleVideoUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  {refVideoFile ? (
                    <div className="flex items-center gap-2 text-amber-400 text-[9px] font-bold">
                      <CheckCircle size={14} />
                      <span className="truncate max-w-[180px]">{refVideoFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-white/30 group-hover:text-amber-400">
                      <Upload size={16} />
                      <span className="text-[8px] font-black uppercase">Upload Motion Reference</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Apply Action */}
              <button
                onClick={handleApplyMotionToScene}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-black font-black text-[9px] uppercase tracking-widest shadow-lg shadow-amber-400/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap size={12} />
                <span>Apply Camera Motion to Scene</span>
              </button>
            </div>
          ) : sidebarTab === 'storyboard' ? (
            /* ── STORYBOARD SUB-PANEL ── */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h2 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Layers size={13} /> AI Storyboard Sheet Engine
                </h2>
                <span className="text-[8px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded font-mono uppercase">Multimodal Grid</span>
              </div>

              {/* Storyboard Presets */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-white/40 uppercase tracking-widest block">Storyboard Campaign Arc</label>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { id: 'insta_reel', label: '📸 Instagram Reel Ad (2x2 Grid)', desc: 'Hook → Unboxing → Benefit → Hero CTA' },
                    { id: 'tiktok_ugc', label: '🎵 TikTok Viral UGC (3x2 Grid)', desc: 'Shock reaction → Problem → Demo → Offer' },
                    { id: 'commercial', label: '🎬 Luxury Commercial (2x2 Grid)', desc: 'Atmospheric → Macro reveal → Lifestyle → Logo' },
                    { id: 'tech_demo', label: '💻 Tech Showcase (2x2 Grid)', desc: 'Hero shot → Feature callout → Use case → Package' }
                  ].map(sb => (
                    <button
                      key={sb.id}
                      onClick={() => setStoryboardPreset(sb.id as any)}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        storyboardPreset === sb.id
                          ? 'bg-orange-500/15 border-orange-500 text-orange-300'
                          : 'bg-[#12121c] border-white/5 text-white/60 hover:border-white/20'
                      }`}
                    >
                      <p className="text-[9px] font-black uppercase tracking-wider">{sb.label}</p>
                      <p className="text-[8px] text-white/30 font-medium truncate">{sb.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Concept Brief Input */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-white/40 uppercase tracking-widest block">Concept Brief</label>
                <textarea
                  value={storyboardBrief}
                  onChange={e => setStoryboardBrief(e.target.value)}
                  rows={3}
                  className="w-full bg-[#12121c] border border-white/10 rounded-xl p-2 text-[9px] text-white placeholder:text-white/20 focus:outline-none focus:border-orange-400 resize-none font-sans"
                />
              </div>

              {/* Generate Storyboard Button */}
              <button
                onClick={handleGenerateStoryboardInSidebar}
                disabled={isGeneratingGrid}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-black font-black text-[9px] uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingGrid ? (
                  <><Loader2 size={13} className="animate-spin text-black" /> Generating Storyboard...</>
                ) : (
                  <><Wand2 size={13} /> Generate Storyboard Grid Sheet</>
                )}
              </button>
            </div>
          ) : (
            /* ── CREATOR STUDIO SUB-PANEL (DEFAULT) ── */
            activeTab === 'edit' ? (

            <div className="space-y-4">
              <div className="flex items-center justify-between w-full">
                <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Wand2 size={12} className="text-[#c8f135]" /> Frame Editor
                </h2>
              </div>
              
              {/* Upload local image option */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <p className="text-[7px] font-black text-white/25 uppercase tracking-widest">Upload Local Frame</p>
                <label className="relative flex items-center justify-center gap-2 px-3 py-4 rounded-xl border border-dashed border-white/10 bg-[#111113] hover:border-[#c8f135]/30 cursor-pointer transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setInpaintImg(URL.createObjectURL(file));
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload size={12} className="text-white/30" />
                  <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Upload File</span>
                </label>
              </div>

              {/* Gallery selection in sidebar */}
              <div className="space-y-2 pt-4 border-t border-[#1e1e24]">
                <p className="text-[7px] font-black text-white/25 uppercase tracking-widest">Select From Gallery</p>
                {gallery.filter(item => item.type === 'image').length === 0 ? (
                  <p className="text-[8px] text-white/20 font-mono italic">No images in gallery yet</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                    {gallery
                      .filter(item => item.type === 'image')
                      .map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={() => setInpaintImg(item.url)}
                          className={`relative aspect-[9/16] rounded-lg overflow-hidden border transition-all ${
                            inpaintImg === item.url ? 'border-[#c8f135]' : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <img src={resolveUrl(item.url)} alt={`gallery-${idx}`} className="w-full h-full object-cover" />
                          {inpaintImg === item.url && (
                            <div className="absolute inset-0 bg-[#c8f135]/15 flex items-center justify-center">
                              <span className="text-[7px] bg-[#c8f135] text-black font-black px-1 rounded uppercase tracking-wider scale-90">Active</span>
                            </div>
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'ai-avatar' ? (
            <>
              <div className="flex items-center justify-between w-full">
                <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Sparkles size={12} className="text-[#c8f135]" /> AI Creator Studio
                </h2>
                <span className="text-[8px] font-black text-[#c8f135] bg-[#c8f135]/10 px-1.5 py-0.5 rounded border border-[#c8f135]/20 uppercase tracking-widest">⚡ {getImageCost()}</span>
              </div>

              {/* 3 Reference slots: Product / Stage / Style Ref */}
              <div className="grid grid-cols-3 gap-2">
                {/* Product */}
                <div className="space-y-1">
                  <div className="relative group aspect-square bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/50 transition-colors flex items-center justify-center">
                    <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setThProductImg({ file: f, url: URL.createObjectURL(f) }); }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {thProductImg ? (
                      <>
                        <img src={resolveUrl(thProductImg.url)} alt="Product" className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-0" />
                        <button onClick={ev => { ev.stopPropagation(); setThProductImg(null); }} className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 text-red-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"><X size={18} strokeWidth={2} /></button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors"><Package size={18} strokeWidth={1.5} /></div>
                    )}
                  </div>
                  <p className="text-[7px] text-center font-black text-white/20 uppercase tracking-widest">Product</p>
                </div>
                {/* Location / Stage */}
                <div className="space-y-1">
                  <div className="relative group aspect-square bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/50 transition-colors flex items-center justify-center">
                    <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setThLocationImg({ file: f, url: URL.createObjectURL(f) }); }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {thLocationImg ? (
                      <>
                        <img src={resolveUrl(thLocationImg.url)} alt="Location" className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-0" />
                        <button onClick={ev => { ev.stopPropagation(); setThLocationImg(null); }} className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 text-red-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"><X size={18} strokeWidth={2} /></button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors"><MapPin size={18} strokeWidth={1.5} /></div>
                    )}
                  </div>
                  <p className="text-[7px] text-center font-black text-white/20 uppercase tracking-widest">Stage</p>
                </div>
                {/* Style Ref */}
                <div className="space-y-1">
                  <div className="relative group aspect-square bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/50 transition-colors flex items-center justify-center">
                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) setStyleRefImg({ file: f, url: URL.createObjectURL(f) }); }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {styleRefImg ? (
                      <>
                        <img src={styleRefImg.url} alt="Style Ref" className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-0" />
                        <button onClick={ev => { ev.stopPropagation(); setStyleRefImg(null); }} className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 text-red-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"><X size={18} strokeWidth={2} /></button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors"><ImageIcon size={18} strokeWidth={1.5} /></div>
                    )}
                  </div>
                  <p className="text-[7px] text-center font-black text-white/20 uppercase tracking-widest">Style Ref</p>
                </div>
              </div>

              {/* Dedicated AI Spokesperson Prompt Builder */}
              <div className="p-3 rounded-xl bg-[#0e0e12] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-[#c8f135] uppercase tracking-wider flex items-center gap-1">
                    <User size={10} /> AI Character Prompt
                  </span>
                  <span className="text-[7px] text-white/30 font-mono uppercase">Ultra-Realistic</span>
                </div>

                {/* Gender + Age row */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex bg-[#16161f] p-0.5 rounded-lg border border-white/5">
                    {(['female', 'male'] as const).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setThSpokespersonGender(g)}
                        className={`flex-1 py-1 text-[8px] font-extrabold uppercase rounded-md transition-all ${
                          thSpokespersonGender === g ? 'bg-[#c8f135] text-black shadow-sm' : 'text-white/40 hover:text-white'
                        }`}
                      >
                        {g === 'female' ? 'Female ♀' : 'Male ♂'}
                      </button>
                    ))}
                  </div>
                  <select
                    value={thSpokespersonAge}
                    onChange={e => setThSpokespersonAge(e.target.value as any)}
                    className="bg-[#16161f] border border-white/5 rounded-lg px-2 py-1 text-[8px] font-bold text-white uppercase focus:outline-none cursor-pointer"
                  >
                    <option value="baby" className="bg-[#16161f]">Baby 👶 (0-3 yrs)</option>
                    <option value="child" className="bg-[#16161f]">Child 🧒 (4-12 yrs)</option>
                    <option value="teen" className="bg-[#16161f]">Teenager 👧 (13-19 yrs)</option>
                    <option value="20-25" className="bg-[#16161f]">Age 20-25 👩</option>
                    <option value="25-35" className="bg-[#16161f]">Age 25-35 💼</option>
                    <option value="35-45" className="bg-[#16161f]">Age 35-45 👔</option>
                    <option value="45-55" className="bg-[#16161f]">Age 45-55 🕶️</option>
                    <option value="55-65" className="bg-[#16161f]">Age 55-65 👵</option>
                    <option value="elderly" className="bg-[#16161f]">Elderly / Old Woman 👵 (65+)</option>
                  </select>
                </div>

                {/* Region / Ethnicity Dropdown */}
                <div className="space-y-1">
                  <label className="text-[7.5px] font-bold uppercase tracking-wider text-white/40">Region / Ethnicity</label>
                  <select
                    value={thSpokespersonRegion}
                    onChange={e => setThSpokespersonRegion(e.target.value as any)}
                    className="w-full bg-[#16161f] border border-white/5 rounded-lg px-2.5 py-1.5 text-[8px] font-bold text-white uppercase focus:outline-none cursor-pointer"
                  >
                    <option value="south-indian" className="bg-[#16161f]">South Indian 🇮🇳</option>
                    <option value="north-indian" className="bg-[#16161f]">North Indian 🇮🇳</option>
                    <option value="pan-indian" className="bg-[#16161f]">Pan-Indian 🇮🇳</option>
                    <option value="english-british" className="bg-[#16161f]">British / English 🇬🇧</option>
                    <option value="american-global" className="bg-[#16161f]">American / Global 🇺🇸</option>
                    <option value="french-european" className="bg-[#16161f]">European / French 🇫🇷</option>
                    <option value="east-asian" className="bg-[#16161f]">East Asian 🏮</option>
                    <option value="middle-eastern" className="bg-[#16161f]">Middle Eastern 🌙</option>
                    <option value="latino" className="bg-[#16161f]">Latino / Hispanic 🌎</option>
                    <option value="african" className="bg-[#16161f]">African 🌍</option>
                  </select>
                </div>

                {/* Format */}
                <div className="space-y-1">
                  <label className="text-[7.5px] font-bold uppercase tracking-wider text-white/40">Format & Layout</label>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { id: 'single', label: 'Portrait (Video)' },
                      { id: 'character-sheet', label: 'Character Sheet' },
                    ].map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setThSpokespersonShotType(s.id as any)}
                        className={`py-1 px-2 rounded-lg text-[7.5px] font-bold uppercase tracking-wider border transition-all text-center ${
                          thSpokespersonShotType === s.id
                            ? 'bg-[#c8f135]/15 border-[#c8f135]/40 text-[#c8f135]'
                            : 'bg-[#16161f] border-white/5 text-white/40 hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Outfit input */}
                <div className="space-y-1">
                  <label className="text-[7.5px] font-bold uppercase tracking-wider text-white/40">Outfit & Wardrobe <span className="text-white/20 normal-case">(optional)</span></label>
                  <input
                    type="text"
                    value={thSpokespersonOutfit}
                    onChange={e => setThSpokespersonOutfit(e.target.value)}
                    placeholder="e.g. saree, blazer, hoodie, kurta…"
                    className="w-full bg-[#16161f] border border-white/5 rounded-lg px-2.5 py-1.5 text-[8.5px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#c8f135]/40 font-sans"
                  />
                </div>

                {/* Pose / vibe input */}
                <div className="space-y-1">
                  <label className="text-[7.5px] font-bold uppercase tracking-wider text-white/40">Pose / Expression <span className="text-white/20 normal-case">(optional)</span></label>
                  <input
                    type="text"
                    value={thSpokespersonPose}
                    onChange={e => setThSpokespersonPose(e.target.value)}
                    placeholder="e.g. smiling, hands folded, confident…"
                    className="w-full bg-[#16161f] border border-white/5 rounded-lg px-2.5 py-1.5 text-[8.5px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#c8f135]/40 font-sans"
                  />
                </div>
              </div>
            </>
          ) : activeTab === 'talking-head' ? (
            <>
              <div className="flex items-center justify-between w-full">
                <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Camera size={12} className="text-[#c8f135]" /> Reference Assets
                </h2>
                <span className="text-[8px] font-black text-[#c8f135] bg-[#c8f135]/10 px-1.5 py-0.5 rounded border border-[#c8f135]/20 uppercase tracking-widest">⚡ {getImageCost()}</span>
              </div>

              {/* 3-slot grid: Person / Product / Stage */}
              <div className="grid grid-cols-3 gap-2">
                {/* Person */}
                <div className="space-y-1">
                  <div className="relative group aspect-square bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/50 transition-colors flex items-center justify-center">
                    <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setThPersonImg({ file: f, url: URL.createObjectURL(f) }); }} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {thPersonImg ? (
                      <>
                        <img src={resolveUrl(thPersonImg.url)} alt="Person" className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-0" />
                        <button onClick={ev => { ev.stopPropagation(); setThPersonImg(null); }} className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 text-red-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"><X size={18} strokeWidth={2} /></button>
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
                        <img src={resolveUrl(thProductImg.url)} alt="Product" className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-0" />
                        <button onClick={ev => { ev.stopPropagation(); setThProductImg(null); }} className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 text-red-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"><X size={18} strokeWidth={2} /></button>
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
                        <img src={resolveUrl(thLocationImg.url)} alt="Location" className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-0" />
                        <button onClick={ev => { ev.stopPropagation(); setThLocationImg(null); }} className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 text-red-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"><X size={18} strokeWidth={2} /></button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors"><MapPin size={18} strokeWidth={1.5} /></div>
                    )}
                  </div>
                  <p className="text-[7px] text-center font-black text-white/20 uppercase tracking-widest">Stage</p>
                </div>
              </div>

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

              {/* Animations */}
              <section className="space-y-3 border-t border-[#1e1e24] pt-4">
                <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <Sparkles size={10} className="text-[#c8f135]" /> Motion &amp; Animations
                </h2>
                <div className="relative">
                  <select
                    value={thAnimation || 'none'}
                    onChange={(e) => setThAnimation(e.target.value)}
                    className="w-full appearance-none bg-[#111113] border border-[#1e1e24] rounded-xl pl-3 pr-8 py-2 text-[10px] font-mono text-white/80 focus:outline-none focus:border-[#c8f135]/50 transition-colors cursor-pointer"
                  >
                    <option value="none">No Additional Animations</option>
                    <option value="auto">Auto-Animation (Context-Aware)</option>
                    <option value="screen_effects">Screen Effects</option>
                    <option value="dynamic_frames">Dynamic Frames</option>
                    <option value="focus_effects">Focus Effects</option>
                    <option value="character_animations">Character Animations</option>
                    <option value="popup_cards">Pop-up Cards</option>
                    <option value="comparison_split">Comparison Split</option>
                    <option value="infographic_cards">Infographic Cards</option>
                    <option value="cta_animations">CTA Animations</option>
                    <option value="background_motion">Background Motion</option>
                    <option value="motion_shapes">Motion Shapes</option>
                    <option value="camera_graphics">Camera Graphics</option>
                    <option value="statics_animation">Statics Animation</option>
                    <option value="social_proof">Social Proof</option>
                    <option value="ui_overlays">UI Overlays</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                </div>
                <p className="text-[7px] text-white/20 font-mono uppercase tracking-widest text-center">Applies script-aware motion graphics</p>
              </section>
            </>
          ) : activeTab === 'podcast' ? (
            <>
              <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-2">
                <Volume2 size={12} className="text-[#c8f135]" /> Podcast Assets
              </h2>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Host 1', value: podcastHost1Img, target: 'podcastHost1' as const, icon: User, voiceVal: host1Voice, setVoice: setHost1Voice, clearFn: () => setPodcastHost1Img(null) },
                  { label: 'Host 2', value: podcastHost2Img, target: 'podcastHost2' as const, icon: User, voiceVal: host2Voice, setVoice: setHost2Voice, clearFn: () => setPodcastHost2Img(null) },
                  { label: 'Product', value: podcastProductImg, target: 'podcastProduct' as const, icon: Package, voiceVal: null, setVoice: null, clearFn: () => setPodcastProductImg(null) },
                ].map(({ label, value, target, icon: Icon, voiceVal, setVoice, clearFn }) => (
                  <div className="space-y-1" key={target}>
                    <div className="relative group aspect-square bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/50 transition-colors flex items-center justify-center">
                      <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, target)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      {value ? (
                        <>
                          <img src={resolveUrl(value.url)} alt={label} className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-0" />
                          <button
                            onClick={ev => {
                              ev.stopPropagation();
                              clearFn?.();
                            }}
                            className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 text-red-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
                          >
                            <X size={18} strokeWidth={2} />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors">
                          <Icon size={18} strokeWidth={1.5} />
                        </div>
                      )}
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
                          onClick={() => { 
                            setScript(voiceTranscript); 
                            generateGeneralVideoPrompt(voiceTranscript);
                          }}
                          disabled={isGeneratingGeneralPrompt}
                          className={`w-full py-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                            isGeneratingGeneralPrompt
                              ? 'bg-white/5 text-white/20 cursor-not-allowed'
                              : 'bg-[#c8f135] text-black hover:bg-[#d4ff3a]'
                          }`}
                        >
                          {isGeneratingGeneralPrompt ? <Loader2 size={10} className="animate-spin" /> : <Volume2 size={10} />}
                          {isGeneratingGeneralPrompt ? 'Generating Prompt...' : 'Use Script & Use Voice'}
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
              <div className="flex items-center justify-between w-full">
                <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Camera size={12} className="text-[#c8f135]" /> Reference Assets
                </h2>
                <span className="text-[8px] font-black text-[#c8f135] bg-[#c8f135]/10 px-1.5 py-0.5 rounded border border-[#c8f135]/20 uppercase tracking-widest">⚡ {getImageCost()}</span>
              </div>

              {/* 3-slot grid: Person / Product / Stage */}
              <div className="grid grid-cols-3 gap-2">
                {/* Person */}
                <div className="space-y-1">
                  <div className="relative group aspect-square bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/50 transition-colors flex items-center justify-center">
                    <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'character')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {characterImg ? (
                      <>
                        <img src={resolveUrl(characterImg.url)} alt="Person" className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-0" />
                        <button onClick={(ev) => { ev.stopPropagation(); setCharacterImg(null); }} className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 text-red-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"><X size={18} strokeWidth={2} /></button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors">
                        <User size={18} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <p className="text-[7px] text-center font-black text-white/20 uppercase tracking-widest">Person</p>
                </div>
                {/* Product */}
                <div className="space-y-1">
                  <div className="relative group aspect-square bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/50 transition-colors flex items-center justify-center">
                    <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'product')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {productImg ? (
                      <>
                        <img src={resolveUrl(productImg.url)} alt="Product" className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-0" />
                        <button onClick={(ev) => { ev.stopPropagation(); setProductImg(null); }} className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 text-red-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"><X size={18} strokeWidth={2} /></button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors">
                        <Package size={18} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <p className="text-[7px] text-center font-black text-white/20 uppercase tracking-widest">Product</p>
                </div>
                {/* Stage */}
                <div className="space-y-1">
                  <div className="relative group aspect-square bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/50 transition-colors flex items-center justify-center">
                    <input type="file" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'location')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {locationImg ? (
                      <>
                        <img src={resolveUrl(locationImg.url)} alt="Stage" className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-0" />
                        <button onClick={(ev) => { ev.stopPropagation(); setLocationImg(null); }} className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 text-red-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"><X size={18} strokeWidth={2} /></button>
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

              {/* ── Reference Video (Motion Placeholder) ───────────────────────── */}
              <section className="space-y-2 border-t border-[#1e1e24] pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Film size={10} className="text-[#c8f135]" /> Motion Reference
                  </h2>
                  <span className="text-[7.5px] font-mono font-bold text-[#c8f135]/80 bg-[#c8f135]/10 px-1.5 py-0.5 rounded border border-[#c8f135]/20 uppercase tracking-wider">
                    Max 30s – 1 min
                  </span>
                </div>
                <p className="text-[7px] font-mono text-white/40 uppercase tracking-widest leading-relaxed">
                  Upload a placeholder video (up to 30s / max 60s) · Omni Flash matches its motion &amp; swaps in your assets.
                </p>
                <label className={`relative flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl border cursor-pointer transition-all ${
                  refVideoFile ? 'border-[#c8f135]/40 bg-[#c8f135]/5' : 'border-dashed border-white/10 bg-[#111113] hover:border-[#c8f135]/30'
                }`}>
                  <input
                    type="file"
                    accept="video/mp4,video/mov,video/webm,video/quicktime"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const inputTarget = e.target;
                      
                      const video = document.createElement('video');
                      video.preload = 'metadata';
                      video.onloadedmetadata = () => {
                        window.URL.revokeObjectURL(video.src);
                        const dur = Math.round(video.duration);
                        console.log("Ref video duration measured:", dur);
                        if (dur > 60) {
                          showToast("Motion reference video exceeds 60s limit (up to 30s recommended). Please select a shorter video clip.", "error");
                          inputTarget.value = '';
                          return;
                        }
                        if (dur < 3) {
                          showToast("Motion reference video must be at least 3 seconds long.", "error");
                          inputTarget.value = '';
                          return;
                        }
                        setRefVideoFile(f);
                        setRefVideoUrl(URL.createObjectURL(f));
                        setRefVideoDuration(dur);
                      };
                      video.src = URL.createObjectURL(f);
                    }}
                  />
                  {refVideoUrl ? (
                    <>
                      <video
                        src={refVideoUrl}
                        className="w-full rounded-lg max-h-[120px] object-cover pointer-events-none"
                        muted
                        playsInline
                      />
                      <span className="text-[7px] font-black text-[#c8f135] uppercase tracking-widest truncate max-w-full px-2">{refVideoFile?.name}</span>
                      <button
                        onClick={ev => { ev.stopPropagation(); ev.preventDefault(); setRefVideoFile(null); setRefVideoUrl(null); }}
                        className="absolute top-1.5 right-1.5 z-10 p-0.5 rounded-full bg-black/70 text-red-400 hover:text-red-300 transition-all"
                      >
                        <X size={10} />
                      </button>
                    </>
                  ) : (
                    <>
                      <Film size={16} className="text-white/20" />
                      <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Drop .mp4 / .mov</span>
                      <span className="text-[7px] font-mono text-[#c8f135]/70 uppercase tracking-widest font-semibold">Max 30s to 1 min video clip</span>
                    </>
                  )}
                </label>
                {refVideoFile && (
                  <div className="space-y-1.5">
                    <p className="text-[7px] text-[#c8f135]/60 font-mono uppercase tracking-widest text-center">
                      ✓ Omni Flash will use this as motion blueprint
                    </p>
                    <button
                      onClick={analyzeMotionReferenceVideo}
                      disabled={isAnalyzingMotionRefVideo}
                      className={`w-full py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                        isAnalyzingMotionRefVideo
                          ? 'bg-white/5 text-white/20 cursor-not-allowed'
                          : 'bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-white'
                      }`}
                    >
                      {isAnalyzingMotionRefVideo ? (
                        <>
                          <Loader2 size={10} className="animate-spin" />
                          <span>{analysisMotionRefProgress || 'Extracting...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={10} />
                          <span>Extract Script &amp; Visuals</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </section>



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
                          onClick={() => { 
                            setScript(voiceTranscript);
                            generateGeneralVideoPrompt(voiceTranscript);
                          }}
                          disabled={isGeneratingGeneralPrompt}
                          className={`w-full py-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                            isGeneratingGeneralPrompt
                              ? 'bg-white/5 text-white/20 cursor-not-allowed'
                              : 'bg-[#c8f135] text-black hover:bg-[#d4ff3a]'
                          }`}
                        >
                          {isGeneratingGeneralPrompt ? <Loader2 size={10} className="animate-spin" /> : <Volume2 size={10} />}
                          {isGeneratingGeneralPrompt ? 'Generating Prompt...' : 'Use Script & Use Voice'}
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

              {/* Reference Video — UGC Viral Concept Clone & Script Transcriber */}
              {leftPanelMode === 'video' && (
                <section className="space-y-2.5 border-t border-[#1e1e24] pt-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] flex items-center gap-1.5">
                      <Video size={11} className="text-[#c8f135]" /> Reference Video
                    </h2>
                    <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-[#c8f135] bg-[#c8f135]/10 px-1.5 py-0.5 rounded border border-[#c8f135]/20">
                      Concept Cloner
                    </span>
                  </div>

                  {/* Feature Pills */}
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[7px] font-mono text-white/50 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md">
                      📜 Script Transcribing
                    </span>
                    <span className="text-[7px] font-mono text-white/50 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md">
                      🎬 Action Extraction
                    </span>
                    <span className="text-[7px] font-mono text-[#c8f135]/80 bg-[#c8f135]/5 border border-[#c8f135]/20 px-1.5 py-0.5 rounded-md">
                      ✨ Viral Concept Clone
                    </span>
                  </div>

                  <p className="text-[7.5px] font-mono text-white/30 uppercase tracking-widest leading-relaxed">
                    Upload a viral video to transcribe script, extract character actions &amp; build remix montage.
                  </p>

                  {/* Larger Upload Drop Zone */}
                  <div className="relative group h-24 bg-[#111113] border border-dashed border-[#2a2a35] hover:border-[#c8f135]/50 rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col items-center justify-center p-2 shadow-inner">
                    <input 
                      type="file" 
                      accept="video/*" 
                      onChange={handleVideoUpload} 
                      className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    />
                    {sourceVideo ? (
                      <>
                        <video src={resolveUrl(sourceVideo.url)} className="w-full h-full object-cover opacity-60 rounded-lg" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play size={20} className="text-[#c8f135] drop-shadow-md" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-[#444] group-hover:text-[#c8f135]/80 transition-colors">
                        <Video size={20} strokeWidth={1.5} className="text-white/30 group-hover:text-[#c8f135]" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/60 group-hover:text-white">
                          Upload UGC Reference Video
                        </span>
                        <span className="text-[6.5px] font-mono text-white/20 uppercase tracking-wider">
                          MP4 / MOV / WEBM · UP TO 30S
                        </span>
                      </div>
                    )}
                  </div>

                  {sourceVideo && (
                    <button 
                      onClick={analyzeVideo} 
                      disabled={isAnalyzingVideo} 
                      className={`w-full py-2.5 rounded-xl text-[8.5px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                        isAnalyzingVideo 
                          ? 'bg-white/5 border border-white/5 text-white/30 cursor-not-allowed' 
                          : 'bg-[#c8f135]/15 border border-[#c8f135]/50 text-[#c8f135] hover:bg-[#c8f135]/25 hover:border-[#c8f135] hover:shadow-[0_0_15px_rgba(200,241,53,0.2)]'
                      }`}
                    >
                      {isAnalyzingVideo ? (
                        <><Loader2 size={10} className="animate-spin" /><span>{analysisProgress || 'Analyzing Video…'}</span></>
                      ) : (
                        <><Sparkles size={10} /><span>Transcribe Script &amp; Clone Concept</span></>
                      )}
                    </button>
                  )}
                  <MontagePanel />
                </section>
              )}

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
          ))}
        </div>

        {/* ── Bottom Controls Bar (Fixed at bottom for ALL tabs) ── */}
        <div className="border-t border-[#1e1e24] bg-[#0a0a0a] z-20">
          <div className="p-3 space-y-2">
            {/* Engine + Ratio row */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.15em] mb-1 block">Engine</span>
                <select
                  value={imgEngine}
                  onChange={e => setImgEngine(e.target.value as any)}
                  className="w-full bg-[#111113] border border-[#1e1e24] px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase text-white/80 outline-none cursor-pointer hover:border-white/20 transition-colors"
                >
                  <option value="nano_banana" className="bg-[#111113]">Nano Banana Pro 🍌</option>
                  <option value="nb2-lite" className="bg-[#111113]">Nano Banana Lite ⚡</option>
                  <option value="gpt2" className="bg-[#111113]">GPT-2 Studio ✨</option>
                  <option value="sd" className="bg-[#111113]">Stable Diffusion 🎨</option>
                  <option value="imagen" className="bg-[#111113]">Google Imagen ⚡</option>
                </select>
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

            {/* Loading state for Montage */}
            {isGeneratingMontageImg && (
              <div className="flex items-center gap-2 py-1 animate-pulse">
                <Loader2 size={11} className="animate-spin text-[#c8f135]" />
                <span className="text-[8px] font-mono text-[#c8f135] uppercase tracking-widest">{montageImgProgressMsg || 'Generating…'}</span>
              </div>
            )}

            {/* Scene Style Selector — controls both image + video */}
            {activeTab !== 'podcast' && (
              <div>
                <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.15em] mb-1 flex items-center gap-1">
                  <Film size={7} className="text-[#c8f135]" /> {activeTab === 'ai-avatar' ? 'Talking Head Scenario Template' : 'Scene Style'}
                  <span className="text-white/10 font-normal normal-case tracking-normal"> · applies to image &amp; video</span>
                </span>
                {activeTab === 'ai-avatar' ? (
                  <select
                    value={selectedSceneStyle || 'fast_pace'}
                    onChange={e => setSelectedSceneStyle(e.target.value)}
                    className="w-full bg-[#111113] border border-[#c8f135]/30 rounded-lg px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest text-[#c8f135] cursor-pointer transition-all outline-none appearance-none"
                  >
                    <optgroup label="── Creator Scenarios (Talking Head Only)" className="bg-[#0c0c0c] text-white/90">
                      <option value="fast_pace">⚡ Multi-Shot Fast Pace</option>
                      <option value="slow_pace">☕ Slow Pace / Casual</option>
                      <option value="walk_talk">🚶 Walk &amp; Talk Vlog</option>
                      <option value="desk_work">💻 Desk Work &amp; Talking</option>
                      <option value="grwm_makeup">💄 GRWM / Makeup &amp; Styling</option>
                      <option value="daily_activity">🍳 Daily Activity &amp; Chat</option>
                      <option value="explainer">💬 Informational / Explainer</option>
                    </optgroup>
                  </select>
                ) : (
                  <select
                    value={selectedSceneStyle}
                    onChange={e => setSelectedSceneStyle(e.target.value)}
                    className="w-full bg-[#111113] border border-[#1e1e24] hover:border-[#c8f135]/30 rounded-lg px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest text-white/70 hover:text-white cursor-pointer transition-all outline-none appearance-none"
                  >
                    <optgroup label="── Talking" className="bg-[#0c0c0c] text-white/90">
                      <option value="normal_talking">🎙️ Normal Talking</option>
                      <option value="walk_talk">🚶 Walk &amp; Talk</option>
                      <option value="street_interview">🎤 Street Interview</option>
                      <option value="reaction_shot">😲 Reaction Shot</option>
                      <option value="mirror_selfie">🪞 Mirror Selfie</option>
                      <option value="car_vlog">🚗 Car Vlog</option>
                      <option value="grwm_talk">💄 GRWM Talking</option>
                    </optgroup>
                    <optgroup label="── Camera Cuts" className="bg-[#0c0c0c] text-white/90">
                      <option value="fast_cut">✂️ Fast Cut</option>
                      <option value="dramatic_zoom">🔍 Dramatic Zoom</option>
                      <option value="pov_shot">👆 POV Shot</option>
                      <option value="whip_pan">🌀 Whip Pan</option>
                      <option value="360_orbit">🔄 360° Orbit</option>
                    </optgroup>
                    <optgroup label="── Product Focus" className="bg-[#0c0c0c] text-white/90">
                      <option value="cinematic_b_roll">🎥 Cinematic B-Roll</option>
                      <option value="close_up_detail">🔬 Close-Up Detail</option>
                      <option value="unboxing">📦 Unboxing</option>
                      <option value="before_after">🔄 Before &amp; After</option>
                      <option value="hands_in_frame">🤲 Hands-on Demo</option>
                      <option value="floating_hero">✨ Floating Hero</option>
                    </optgroup>
                    <optgroup label="── Fashion &amp; Styling" className="bg-[#0c0c0c] text-white/90">
                      <option value="runway_walk">👠 Runway / OOTD Walk</option>
                      <option value="outfit_change_transition">✨ Snap Outfit Change</option>
                      <option value="fabric_macro">🧶 Fabric Detail Macro</option>
                      <option value="mirror_outfit_check">🪞 Mirror Fit Check</option>
                      <option value="editorial_pose">📸 Editorial Lookbook</option>
                    </optgroup>
                    <optgroup label="── Educational" className="bg-[#0c0c0c] text-white/90">
                      <option value="tutorial_step">🎓 Tutorial Step</option>
                      <option value="dynamic_action">⚡ Dynamic Action</option>
                    </optgroup>
                  </select>
                )}
                {selectedSceneStyle && SCENE_STYLES[selectedSceneStyle] && (
                  <p className="text-[7px] text-white/25 font-mono mt-0.5 leading-relaxed">
                    {SCENE_STYLES[selectedSceneStyle].description}
                  </p>
                )}
              </div>
            )}

            {/* Requirements hint */}
            {activeTab !== 'ai-avatar' && activeTab !== 'talking-head' && (activeTab === 'podcast'
              ? !podcastHost1Img && !podcastHost2Img && !podcastProductImg
              : !characterImg && !productImg) && (
              <p className="text-[7px] text-white/20 font-mono uppercase tracking-widest text-center py-1">
                {activeTab === 'podcast' ? 'Upload host 1, host 2, or product above' : 'Upload person and/or product above'}
              </p>
            )}

            {/* SINGLE Generate button per tab */}
            {activeTab === 'ai-avatar' ? (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={generateTalkingHeadImage}
                disabled={thIsGeneratingImg}
                className={`w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${
                  thIsGeneratingImg
                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                    : 'bg-[#c8f135] text-black shadow-[0_6px_20px_rgba(200,241,53,0.25)]'
                }`}
              >
                {thIsGeneratingImg ? (
                  <><Loader2 size={12} className="animate-spin" /> Directing AI Creator…</>
                ) : (
                  <><Sparkles size={12} /> Generate AI Creator <span className="opacity-60">· ⚡ {getImageCost()}</span></>
                )}
              </motion.button>
            ) : activeTab === 'talking-head' ? (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={generateTalkingHeadImage}
                disabled={thIsGeneratingImg}
                className={`w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${
                  thIsGeneratingImg
                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                    : 'bg-[#c8f135] text-black shadow-[0_6px_20px_rgba(200,241,53,0.25)]'
                }`}
              >
                {thIsGeneratingImg ? (
                  <><Loader2 size={12} className="animate-spin" /> Directing Talking Head…</>
                ) : (
                  <><Camera size={12} /> Generate Talking Head <span className="opacity-60">· ⚡ {getImageCost()}</span></>
                )}
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const buildRefImagePrompt = (): string => {
                    if (activeTab === 'podcast') {
                      return `A two-host podcast studio scene for this topic: ${userPrompt || script || 'branded podcast conversation'}. Show Host 1 and Host 2 at microphones with the product placed naturally in the setup.`;
                    }
                    const prod = productDetails ? productDetails.substring(0, 200) : 'the product';
                    const sceneStyle = SCENE_STYLES[selectedSceneStyle];
                    if (sceneStyle?.promptModifier) {
                      return `A creator naturally showcasing ${prod}. Scene style: ${sceneStyle.promptModifier}. UGC photo style, authentic look, natural lighting.`;
                    }
                    return `A creator naturally using/holding the product: ${prod}. UGC-style photo, natural lighting, authentic look.`;
                  };
                  const syntheticOption = {
                    id: 'quick-img',
                    title: activeTab === 'podcast' ? 'Podcast Studio Frame' : (SCENE_STYLES[selectedSceneStyle]?.name || productAnalysis?.productName || 'Product Shot'),
                    prompt: buildRefImagePrompt(),
                    icon: selectedSceneStyle === 'unboxing' ? 'Package' : selectedSceneStyle === 'pov_shot' ? 'Fingerprint' : 'Sparkles',
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
                {isGeneratingMontageImg ? (
                  <><Loader2 size={12} className="animate-spin" />{montageImgProgressMsg || 'Generating…'}</>
                ) : (
                  <>
                    <Camera size={12} />
                    {montageGeneratedImg ? 'Regenerate' : 'Generate'}{' '}
                    {SCENE_STYLES[selectedSceneStyle]?.name?.replace(/^[^a-zA-Z]+/, '') || 'Reference Image'}
                    {' '}<span className="opacity-60">· ⚡ {getImageCost()}</span>
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Drawer toggle button — sits on the right edge of the sidebar wrapper */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute top-1/2 -translate-y-1/2 ${isSidebarOpen ? '-right-5 md:-right-3' : '-right-9 md:-right-3'} z-[60] w-9 h-12 md:w-6 md:h-12 flex items-center justify-center rounded-r-xl transition-all shadow-2xl
          ${isSidebarOpen
            ? 'bg-[#111113] border border-[#c8f135]/20 text-[#c8f135]/60 hover:text-[#c8f135] hover:border-[#c8f135]/60 hover:bg-[#c8f135]/5 shadow-[0_0_8px_rgba(200,241,53,0.1)] hover:shadow-[0_0_12px_rgba(200,241,53,0.35)]'
            : 'bg-[#c8f135] border border-[#c8f135] text-black hover:bg-[#d4f545] shadow-[0_0_15px_rgba(200,241,53,0.7)]'
          }`}
        title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
      >
        {isSidebarOpen ? (
          <ChevronLeft className="w-5 h-5 md:w-3 md:h-3" />
        ) : (
          <ChevronRight className="w-5 h-5 md:w-3 md:h-3" />
        )}
      </button>
    </div>
  );
}
