import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Film, 
  Droplets, 
  Wind, 
  Scissors, 
  Zap, 
  Fingerprint, 
  Sparkles, 
  Check, 
  Camera, 
  ZoomIn, 
  Monitor, 
  X, 
  Loader2, 
  Volume2, 
  VolumeX, 
  AlertCircle, 
  Video, 
  Download,
  ChevronDown
} from 'lucide-react';
import { useUGC, Scene } from '../context/UGCContext';
import { useShorts } from '../../../hooks/useShorts';
import { fileToGenerativePart, resizeImage } from '../utils/imageUtils';
import { getApiUrl } from '../../../config/apiConfig';
import { GoogleGenAI } from "@google/genai";

// Local helper to upload file to GCS via server API
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
    return url;
  } catch (error) {
    console.error('[GCS] Upload error:', error);
    return null;
  }
};

export const MontagePanel: React.FC = () => {
  const {
    currentUserId,
    isAdmin,
    isGlobalAdmin,
    activeTab,
    characterImg,
    productImg,
    podcastHost1Img,
    podcastHost2Img,
    podcastProductImg,
    productDetails,
    imageStyle,
    aspectRatio,
    imgEngine,
    setScenes,
    setRenderMode,
    setGeneratedImg,
    isGeneratingVideo,
    setIsGeneratingVideo,
    videoProgressMsg,
    setVideoProgressMsg,
    addToGallery,
    updateGalleryItem,
    addToTimeline,
    setTimeline,
    showToast,
    getApiKey,
    fetchImageAsBlob,
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
    showVideoMontageOptions: showMontageOptions,
    setShowVideoMontageOptions: setShowMontageOptions,
    videoGenMode
  } = useUGC();

  const { spend, refund } = useShorts();

  // Local state that is not shared
  const [gpt2Quality, setGpt2Quality] = useState<'standard' | 'hd'>('standard');

  const getAI = () => {
    const key = getApiKey();
    if (!key) throw new Error("No API Key detected. Please provide a Gemini API Key in Settings.");
    return new GoogleGenAI({ apiKey: key });
  };

  const generateMontageVideo = async (option: any) => {
    const isPodcastMode = activeTab === 'podcast';
    const activeProductImg = isPodcastMode ? podcastProductImg : productImg;
    const primaryPersonImg = isPodcastMode ? podcastHost1Img : characterImg;
    if (!activeProductImg && !primaryPersonImg && !montageGeneratedImg) return;

    // Use a custom calculation for montage cost:
    // duration * (veo_fast rate). Fast rate is 10s audio off, 12s audio on
    const duration = parseInt(montageDuration);
    const costPerSec = montageAudioEnabled ? 12 : 10;
    const unitCost = costPerSec * duration;

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

      let imageBase64 = '';
      let imageMime = 'image/jpeg';

      if (montageGeneratedImg) {
        setVideoProgressMsg('Loading Generated Reference...');
        imageMime = montageGeneratedImg.split(';')[0].split(':')[1] || 'image/png';
        const imgBlob = await fetchImageAsBlob(montageGeneratedImg);
        imageBase64 = await resizeImage(imgBlob);
      } else if (activeProductImg) {
        setVideoProgressMsg('Loading Product Reference...');
        imageBase64 = await resizeImage(activeProductImg.file);
      }

      if (videoGenMode === 'omni-flash') {
        setVideoProgressMsg('Submitting to Gemini Omni Flash...');
        let imageToSend = '';
        if (imageBase64) {
          imageToSend = `data:${imageMime};base64,${imageBase64}`;
        }

        const headers: any = { 'Content-Type': 'application/json' };
        const customKey = getApiKey();
        if (customKey) headers['x-admin-trial-key'] = customKey;

        const resp = await fetch(getApiUrl('/api/omni-i2v'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image: imageToSend || undefined,
            motionPrompt: option.prompt.substring(0, 1000),
            duration: duration,
            aspectRatio: aspectRatio === '1:1' ? '9:16' : aspectRatio,
            resolution: '720p',
            model: 'gemini-omni-flash-preview',
            userId: currentUserId,
            generateAudio: montageAudioEnabled,
            creditReason: 'ugc_video_generation'
          })
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Omni generation failed.');
        if (!data.videoUrl) throw new Error('Omni returned no video URL.');

        setMontageGeneratedImg('');
        addToGallery({ id: Date.now().toString(), type: 'video', url: data.videoUrl });
        addToTimeline({
          id: `montage-${Date.now()}`,
          url: data.videoUrl,
          start: 0,
          end: duration,
          duration: duration,
          type: 'video'
        });
        showToast('Montage video generated successfully!', 'success');
        setIsGeneratingVideo(false);
        setVideoProgressMsg('');
        return;
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
          durationSeconds: duration,
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
      const MONTAGE_TIMEOUT_MS = 90_000;
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
        operation = await ai.operations.getVideosOperation({ operation });
      }

      const generateVideoResponse = (operation.response as any)?.generateVideoResponse;
      const raiFiltered = generateVideoResponse?.raiMediaFilteredCount || 0;

      if (raiFiltered > 0) {
        showToast(`Montage blocked by safety filter — try rephrasing the prompt.`, 'error');
        setIsGeneratingVideo(false);
        setVideoProgressMsg('');
        return;
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const apiKey = getApiKey();
        const directUrl = `${downloadLink}${downloadLink.includes('?') ? '&' : '?'}key=${apiKey}`;
        const tempId = Date.now().toString();
        
        const newItemId = Math.random().toString(36).substr(2, 9);
        const newItem = {
          id: newItemId,
          type: 'video' as const,
          url: directUrl,
          start: 0,
          end: duration,
          duration: duration
        };
        addToTimeline(newItem);
        addToGallery({ id: tempId, type: 'video', url: directUrl });
        showToast(`${option.title} montage added to timeline!`, 'success');
        setShowMontageOptions(false);
        setMontageGeneratedImg('');

        // Download and upload to Supabase in the background
        fetch(downloadLink, {
          method: 'GET',
          headers: { 'x-goog-api-key': apiKey },
        })
          .then(res => {
            if (!res.ok) throw new Error(`Background download failed: ${res.status}`);
            return res.blob();
          })
          .then(blob => {
            return uploadToSupabase(blob, 'video', option.prompt || option.title, currentUserId);
          })
          .then(publicUrl => {
            if (publicUrl) {
              updateGalleryItem(tempId, { url: publicUrl });
              setTimeline((prev: any[]) =>
                prev.map((t) => (t.id === newItemId ? { ...t, url: publicUrl } : t))
              );
            }
          })
          .catch((err) => {
            console.error('[Background Upload] Montage upload failed:', err);
          });
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

  const isPodcastMode = activeTab === 'podcast';
  const currentProductImg = isPodcastMode ? podcastProductImg : productImg;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setShowMontageOptions(!showMontageOptions)}
        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${showMontageOptions ? 'bg-[#c8f135]/10 border-[#c8f135]/30' : 'bg-white/5 border-white/10 hover:bg-white/10'} `}
      >
        <div className="flex items-center gap-2.5">
          <Sparkles size={14} className={showMontageOptions ? 'text-[#c8f135]' : 'text-gray-400'} />
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
              <div className="flex flex-col gap-1.5">
                {montageOptions.map((option, optI) => (
                  <button
                    key={`opt-${optI}`}
                    type="button"
                    onClick={() => {
                      setSelectedMontageOption(option);
                      setMontagePrompt(option.prompt);
                      setIsMontageApproved(false);
                      setMontageGeneratedImg('');
                    }}
                    disabled={isGeneratingVideo}
                    className={`flex items-center justify-between p-2.5 border rounded-xl transition-all group relative overflow-hidden text-left ${selectedMontageOption?.id === option.id ? 'bg-[#c8f135]/5 border-[#c8f135]/30 shadow-[0_0_12px_rgba(200,241,53,0.04)]' : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/8'} `}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                      <div className={`p-0.5 transition-colors ${selectedMontageOption?.id === option.id ? 'text-[#c8f135]' : 'text-gray-400 group-hover:text-white'}`}>
                        {option.icon === 'Droplets' ? <Droplets size={12} /> : 
                         option.icon === 'Wind' ? <Wind size={12} /> :
                         option.icon === 'Scissors' ? <Scissors size={12} /> :
                         option.icon === 'Zap' ? <Zap size={12} /> :
                         option.icon === 'Fingerprint' ? <Fingerprint size={12} /> :
                         <Sparkles size={12} />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[9px] font-black uppercase tracking-wider truncate ${selectedMontageOption?.id === option.id ? 'text-[#c8f135]' : 'text-white'}`}>{option.title}</p>
                        <p className="text-[7px] text-gray-500 font-mono uppercase tracking-tighter">Performance Clip</p>
                      </div>
                    </div>
                    {selectedMontageOption?.id === option.id && (
                      <span className="text-[7px] font-black uppercase tracking-widest text-[#c8f135] bg-[#c8f135]/10 px-1.5 py-0.5 rounded border border-[#c8f135]/20 relative z-10 shrink-0">Selected</span>
                    )}
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
                      type="button"
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
                      setMontageGeneratedImg('');
                    }}
                    className="w-full h-20 bg-black/40 border border-white/5 rounded-lg px-3 py-2 font-sans text-[11px] text-white focus:outline-none focus:border-[#c8f135] resize-none leading-relaxed"
                    placeholder="Edit montage prompt here..."
                  />

                  {/* Two-Step Montage Pipeline */}
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

                      {montageGeneratedImg && (
                        <div className="relative mb-2 rounded-lg overflow-hidden border border-[#c8f135]/30 group/img">
                          <img src={montageGeneratedImg} alt="Montage Reference" className="w-full max-h-[140px] object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                            <span className="text-[7px] font-mono text-[#c8f135] uppercase tracking-widest">Character + Product Reference</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setMontageImgExpanded(true)}
                            className="absolute top-1.5 left-1.5 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center hover:bg-[#c8f135]/80 hover:text-black transition-colors opacity-0 group-hover/img:opacity-100"
                            title="Expand image"
                          >
                            <ZoomIn size={11} className="text-white" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setGeneratedImg(montageGeneratedImg);
                              setRenderMode('image');
                              showToast('Reference image pushed to Studio Monitor!', 'success');
                            }}
                            className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-2 py-1 bg-black/80 border border-[#c8f135]/40 rounded-md text-[7px] font-black uppercase tracking-widest text-[#c8f135] hover:bg-[#c8f135]/20 transition-all opacity-0 group-hover/img:opacity-100"
                            title="Push to Studio Monitor"
                          >
                            <Monitor size={9} />
                            Push to Monitor
                          </button>
                          <button
                            type="button"
                            onClick={() => setMontageGeneratedImg('')}
                            className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center hover:bg-red-500/80 transition-colors"
                            title="Remove"
                          >
                            <X size={9} className="text-white" />
                          </button>
                        </div>
                      )}

                      {isGeneratingMontageImg && (
                        <div className="flex items-center gap-2 py-2 animate-pulse">
                          <Loader2 size={12} className="animate-spin text-[#c8f135]" />
                          <span className="text-[8px] font-mono text-[#c8f135] uppercase tracking-widest">{montageImgProgressMsg || 'Generating...'}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => generateMontageReferenceImage({ ...selectedMontageOption, prompt: montagePrompt })}
                        disabled={!isMontageApproved || isGeneratingMontageImg || isGeneratingVideo}
                        className="w-full py-1.5 bg-white/10 border border-white/15 text-white font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-[#c8f135]/10 hover:border-[#c8f135]/40 hover:text-[#c8f135] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        {isGeneratingMontageImg ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                        {montageGeneratedImg ? 'Regenerate Image' : 'Generate Reference Image'} <span className="opacity-60">· ⚡ {getImageCost()}</span>
                      </button>
                    </div>

                    {/* Step 2: Animate to Video */}
                    <div className={`p-2.5 rounded-lg border transition-all ${montageGeneratedImg ? 'bg-black/30 border-[#c8f135]/20' : 'bg-black/20 border-white/5 opacity-60'}`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={`w-4 h-4 rounded-full text-[7px] font-black flex items-center justify-center ${montageGeneratedImg ? 'bg-[#c8f135] text-black' : 'bg-white/10 border border-white/20 text-gray-500'}`}>2</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${montageGeneratedImg ? 'text-white' : 'text-gray-500'}`}>Animate to Video</span>
                        {!montageGeneratedImg && <span className="text-[7px] text-gray-600 font-mono uppercase">( complete step 1 first )</span>}
                      </div>

                      <div className="flex items-center gap-2 mb-2.5">
                        <button
                          type="button"
                          onClick={() => setMontageAudioEnabled(prev => !prev)}
                          title={montageAudioEnabled ? 'Audio ON' : 'Audio OFF'}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${
                            montageAudioEnabled
                              ? 'bg-[#c8f135]/15 border-[#c8f135]/50 text-[#c8f135]'
                              : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                          }`}
                        >
                          {montageAudioEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
                          {montageAudioEnabled ? 'Audio' : 'Mute'}
                        </button>

                        <div className="flex items-center gap-1 flex-1">
                          {(['4', '6', '8'] as const).map(sec => (
                            <button
                              key={sec}
                              type="button"
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

                      {/* Estimated cost calculation */}
                      <p className="text-[7px] font-mono text-gray-600 uppercase tracking-wider mb-2">
                        {montageAudioEnabled ? '🔊 Audio ON' : '🔇 Muted'} &nbsp;·&nbsp; {montageDuration}s clip (⚡ {getCurrentCost(true)})
                      </p>

                      <button
                        type="button"
                        onClick={() => generateMontageVideo({ ...selectedMontageOption, prompt: montagePrompt })}
                        disabled={!isMontageApproved || isGeneratingVideo || isGeneratingMontageImg}
                        className="w-full py-2 bg-[#c8f135] text-black font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-[#d9ff4d] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isGeneratingVideo ? <Loader2 size={13} className="animate-spin" /> : <Video size={13} />}
                        {isGeneratingVideo ? (videoProgressMsg || 'Generating...') : (montageGeneratedImg ? `Animate Reference → Video (⚡ ${getCurrentCost(true)})` : `Produce Montage Video (⚡ ${getCurrentCost(true)})`)}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              {currentProductImg ? (
                <>
                  <div className="flex items-center gap-2 text-amber-400/70">
                    <AlertCircle size={14} />
                    <p className="text-[9px] font-mono uppercase tracking-widest">Analysis incomplete. Retry to unlock clips.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => currentProductImg && analyzeProductForMontage(currentProductImg.file)}
                    disabled={isGeneratingMontageOptions}
                    className="flex items-center gap-2 px-4 py-2 bg-[#c8f135]/10 border border-[#c8f135]/30 text-[#c8f135] rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#c8f135]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingMontageOptions ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    {isGeneratingMontageOptions ? 'Analysing...' : 'Analyse for Montages'}
                  </button>
                </>
              ) : (
                <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Upload a product image to unlock montages</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Expanded Reference Image Lightbox */}
      {montageImgExpanded && montageGeneratedImg && (
        <div
          className="fixed inset-0 z-[2000] bg-black/92 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setMontageImgExpanded(false)}
        >
          <div
            className="relative max-w-3xl w-full flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
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
                  type="button"
                  onClick={() => setMontageImgExpanded(false)}
                  className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-red-500/70 transition-colors"
                >
                  <X size={13} className="text-white" />
                </button>
              </div>
            </div>
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
    </div>
  );
};
