import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, User, X, Package, MapPin, Search, Volume2, Upload, FileText, Film, Layers, BrainCircuit, Plus, Loader2, ChevronLeft, ChevronRight, Layout, Clock, Sparkles, AlertCircle, CheckCircle, ShieldCheck, Wand2, Play, Video } from 'lucide-react';
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

  // ── Multi-Short Visual Scan local state ───────────────────────────────────
  const [isVisualScanning, setIsVisualScanning] = useState(false);
  const [visualScanProgress, setVisualScanProgress] = useState('');
  const [visualScanScenes, setVisualScanScenes] = useState<
    { sceneName: string; dialog: string; visualPrompt: string; imageUrl: string }[]
  >([]);

  // ── Multi-Short Visual Scan handler ───────────────────────────────────────
  // Omni Flash visually reads the product image, generates N product-specific
  // UGC short scenarios (e.g. unboxing / applying / glow result for a serum),
  // then generates a start-frame image for each scene and assigns it as the
  // refImage on the matching SplitScene.
  const runVisualMultiScan = async () => {
    if (!productImg) return;
    setIsVisualScanning(true);
    setVisualScanProgress('Analyzing product with Gemini…');

    try {
      // Helper: convert any image object to data-URL base64
      const toBase64DataUrl = async (imgObj: { url?: string; file?: File }): Promise<string> => {
        let blob: Blob | null = imgObj.file || null;
        if (!blob && imgObj.url) blob = await fetchImageAsBlob(imgObj.url);
        if (!blob) throw new Error('No image data');
        const raw = await fileToBase64(blob as File);
        // fileToBase64 may already return a data URL — strip prefix so we get raw b64
        return raw.startsWith('data:') ? raw : `data:${(blob as File).type || 'image/jpeg'};base64,${raw}`;
      };

      const productDataUrl = await toBase64DataUrl(productImg);
      const productRawB64 = productDataUrl.replace(/^data:[^;]+;base64,/, '');
      const productMime = productImg.file?.type || 'image/jpeg';

      const numScenes = Math.max(splitScenes.length, 3);
      const productContext = productDetails ||
        (productAnalysis as any)?.productName ||
        'product';

      // ── Step 1: Generate N product-specific UGC scenarios via Gemini ──────
      const scenarioPrompt = `You are a UGC short-form video director specializing in TikTok and Instagram Reels.
Analyze the provided product image and generate exactly ${numScenes} unique, creative UGC short-video scenarios.

Product context: ${productContext}
${productAnalysis ? `Product analysis: ${JSON.stringify(productAnalysis)}` : ''}
Character/Person reference: ${characterImg ? 'Available' : 'Not provided'}
Location/Stage reference: ${locationImg ? 'Available' : 'Not provided'}

Rules:
- Each scene must be a DIFFERENT moment in the product's story (e.g. unboxing, application POV, result/before-after, close-up texture, lifestyle use, reaction, etc.).
- Adapt scene types to the SPECIFIC product category you see — a skin serum gets "applying" and "glow result" scenes; sneakers get "unboxing" and "on-feet walk"; food gets "taste reaction" and "plating close-up".
- Dialog should be natural creator speech (not an ad voiceover).
- visualPrompt: write a Veo / Omni motion prompt (40-70 words) for what the video clip should look like.
- imagePrompt: write a short, crisp image generation prompt (20-35 words) for the start-frame of this scene. ALWAYS mention the specific product visually.

Return a JSON array with exactly ${numScenes} objects.`;

      const responseSchema = {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            sceneName:    { type: 'STRING' },
            dialog:       { type: 'STRING' },
            visualPrompt: { type: 'STRING' },
            imagePrompt:  { type: 'STRING' },
          },
          required: ['sceneName', 'dialog', 'visualPrompt', 'imagePrompt'],
        },
      };

      let scenariosText: string | undefined;

      // Try server-side (uses service account billing)
      try {
        const serverResp = await fetch(getApiUrl('/api/ai/analyze-ugc'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parts: [
              { inlineData: { data: productRawB64, mimeType: productMime } },
              { text: scenarioPrompt },
            ],
            model: 'gemini-2.5-flash',
            userId: currentUserId,
            responseSchema,
          }),
        });
        if (serverResp.ok) {
          const d = await serverResp.json();
          scenariosText = d.text;
        }
      } catch (e) {
        console.warn('[VisualScan] Server-side failed, falling back to client…');
      }

      // Client-side fallback
      if (!scenariosText) {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        const resp = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{
            role: 'user',
            parts: [
              { inlineData: { data: productRawB64, mimeType: productMime } },
              { text: scenarioPrompt },
            ],
          }],
          config: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
        scenariosText = resp.text;
      }

      if (!scenariosText) throw new Error('No scenarios returned from AI');
      type ScenarioRaw = { sceneName: string; dialog: string; visualPrompt: string; imagePrompt: string };
      const scenarios: ScenarioRaw[] = safeJsonParse(scenariosText) || [];
      if (!scenarios || scenarios.length === 0) {
        throw new Error('Failed to parse scenarios JSON from AI response');
      }

      // ── Step 2: Generate start-frame image for each scenario ─────────────
      const generated: { sceneName: string; dialog: string; visualPrompt: string; imageUrl: string }[] = [];

      for (let i = 0; i < scenarios.length; i++) {
        const sc = scenarios[i];
        setVisualScanProgress(`Generating visual ${i + 1}/${scenarios.length}: ${sc.sceneName}…`);

        try {
          // Build reference images array: product first, then optional location/character
          const refImages: { url: string }[] = [{ url: productDataUrl }];
          if (locationImg) {
            try { refImages.push({ url: await toBase64DataUrl(locationImg) }); } catch {}
          }
          if (characterImg) {
            try { refImages.push({ url: await toBase64DataUrl(characterImg) }); } catch {}
          }

          // Build Omni-style tagged image prompt
          const fullImgPrompt = [
            `<IMAGE_REF_0>`,
            sc.imagePrompt,
            'Authentic UGC creator shot, phone camera, no studio lighting.',
            characterImg ? 'Creator/person visible in scene, natural pose.' : '',
            locationImg  ? 'Use the provided location as background setting.' : '',
          ].filter(Boolean).join(' ');

          const imgResp = await fetch(getApiUrl('/api/generate-image'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: imgEngine === 'gpt2' ? 'gpt-image-1' : imgEngine === 'nb2-lite' ? 'nano-banana-2-lite' : imgEngine === 'nb2-open' ? 'nano-banana-2-open' : 'nano-banana-2',
              prompt: fullImgPrompt,
              aspect_ratio: '9:16',
              size: '2K',
              userId: currentUserId,
              folder: 'ugc/generated',
              referenceImages: refImages,
            }),
          });

          let imageUrl = '';
          if (imgResp.ok) {
            const imgData = await imgResp.json();
            imageUrl = imgData.imageUrl || imgData.url || '';

            // Poll job if async
            if (imgData.jobId && !imageUrl) {
              let attempts = 0;
              const pollUrl = getApiUrl(`/api/job-status/${imgData.jobId}`);
              while (attempts < 20) {
                await new Promise(r => setTimeout(r, 3000));
                attempts++;
                const pollRes = await fetch(pollUrl);
                if (pollRes.ok) {
                  const pollData = await pollRes.json();
                  if (pollData.status === 'done' && pollData.imageUrl) {
                    imageUrl = pollData.imageUrl;
                    break;
                  }
                }
              }
            }
          }

          generated.push({ sceneName: sc.sceneName, dialog: sc.dialog, visualPrompt: sc.visualPrompt, imageUrl });
        } catch (scErr) {
          console.error(`[VisualScan] Scene ${i + 1} image failed:`, scErr);
          generated.push({ sceneName: sc.sceneName, dialog: sc.dialog, visualPrompt: sc.visualPrompt, imageUrl: '' });
        }
      }

      // ── Step 3: Apply to splitScenes ─────────────────────────────────────
      setVisualScanProgress('Applying visuals to scenes…');

      if (splitScenes.length > 0) {
        // Merge into existing split scenes
        setSplitScenes((prev: SplitScene[]) =>
          prev.map((existing, i) => {
            const gen = generated[i];
            if (!gen) return existing;
            return {
              ...existing,
              label: `Scene ${i + 1}: ${gen.sceneName}`,
              dialog: gen.dialog || existing.dialog,
              prompt: gen.visualPrompt || existing.prompt,
              refImage: gen.imageUrl || existing.refImage || null,
            };
          })
        );
      } else {
        // Create brand-new split scenes from scratch
        const newScenes: SplitScene[] = generated.map((gen, i) => ({
          label: `Scene ${i + 1}: ${gen.sceneName}`,
          dialog: gen.dialog,
          prompt: gen.visualPrompt,
          refImage: gen.imageUrl || null,
        }));
        setSplitScenes(newScenes);
      }

      setVisualScanScenes(generated);
      setVisualScanProgress('');
      showToast(`✓ ${generated.length} visual scenes generated for your ${productContext}!`, 'success');
    } catch (e) {
      handleApiError(e, 'Visual Multi-Short Scan');
      setVisualScanProgress('');
    } finally {
      setIsVisualScanning(false);
    }
  };

  return (
    <div className="absolute md:relative flex shrink-0 h-full z-[45]">
      <motion.div
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="h-full border-r border-[#1e1e24] bg-[#080808] flex flex-col overflow-hidden"
        style={{ minWidth: 0 }}
      >
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {activeTab === 'edit' ? (
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
                {thIsGeneratingImg ? <><Loader2 size={10} className="animate-spin" /> Generating…</> : <><Camera size={10} /> Generate Reference Image <span className="opacity-60">· ⚡ {getImageCost()}</span></>}
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

              {/* ── Multi-Short Visual Scan ── */}
              {(() => {
                const totalDuration = splitScenes.length > 0
                  ? splitScenes.length * parseInt(durationSeconds)
                  : 0;
                const isEligible = productImg && totalDuration >= 20;

                return (
                  <section className="space-y-3 border-t border-[#1e1e24] pt-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <Layers size={10} className="text-[#c8f135]" /> Multi-Short Visuals
                      </h2>
                      <div className="flex items-center gap-1.5">
                        {totalDuration > 0 && (
                          <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-widest ${
                            isEligible
                              ? 'bg-[#c8f135]/10 border-[#c8f135]/30 text-[#c8f135]'
                              : 'bg-white/5 border-white/10 text-white/30'
                          }`}>
                            {totalDuration}s
                          </span>
                        )}
                        <span className="text-[7px] font-mono text-white/20 uppercase tracking-widest">⚡ Omni</span>
                      </div>
                    </div>

                    {/* Eligibility hint */}
                    {!isEligible && (
                      <p className="text-[7px] text-white/20 font-mono uppercase tracking-widest text-center leading-relaxed">
                        {!productImg
                          ? 'Upload a product image first'
                          : splitScenes.length === 0
                          ? 'Split your script into scenes first'
                          : `Need ≥ 20s total · ${totalDuration}s across ${splitScenes.length} scene${splitScenes.length !== 1 ? 's' : ''}`
                        }
                      </p>
                    )}

                    {/* Progress message */}
                    {visualScanProgress && (
                      <div className="px-2.5 py-2 bg-black/60 border border-[#c8f135]/20 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Loader2 size={9} className="animate-spin text-[#c8f135] shrink-0" />
                          <p className="text-[8px] font-mono text-[#c8f135] animate-pulse leading-tight">{visualScanProgress}</p>
                        </div>
                      </div>
                    )}

                    {/* Generated scene previews */}
                    {visualScanScenes.length > 0 && !isVisualScanning && (
                      <div className="space-y-1.5">
                        {visualScanScenes.map((sc, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 p-1.5 rounded-xl bg-white/3 border border-[#c8f135]/15 hover:border-[#c8f135]/30 transition-all"
                          >
                            {sc.imageUrl ? (
                              <img
                                src={resolveUrl(sc.imageUrl)}
                                alt={sc.sceneName}
                                className="w-9 h-9 rounded-lg object-cover border border-[#c8f135]/30 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                <Camera size={10} className="text-white/20" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[8px] font-black text-[#c8f135] uppercase tracking-wide truncate">
                                {i + 1}. {sc.sceneName}
                              </p>
                              <p className="text-[7px] text-white/30 font-mono truncate leading-tight">
                                {sc.dialog.substring(0, 45)}{sc.dialog.length > 45 ? '…' : ''}
                              </p>
                            </div>
                            {sc.imageUrl && (
                              <CheckCircle size={10} className="text-[#c8f135] shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Scan button */}
                    <button
                      onClick={runVisualMultiScan}
                      disabled={!isEligible || isVisualScanning}
                      className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                        !isEligible || isVisualScanning
                          ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                          : visualScanScenes.length > 0
                          ? 'bg-white/5 border border-[#c8f135]/30 text-[#c8f135] hover:bg-[#c8f135]/10'
                          : 'bg-[#c8f135] text-black hover:bg-[#d4ff3a] shadow-[0_4px_16px_rgba(200,241,53,0.3)]'
                      }`}
                    >
                      {isVisualScanning ? (
                        <><Loader2 size={10} className="animate-spin" /> Scanning…</>
                      ) : visualScanScenes.length > 0 ? (
                        <><Sparkles size={10} /> Re-Scan Product Visuals</>
                      ) : (
                        <><Sparkles size={10} /> ⚡ Scan &amp; Gen Multi-Short Visuals</>
                      )}
                    </button>

                    <p className="text-[7px] text-white/15 font-mono uppercase tracking-widest text-center leading-relaxed">
                      Omni reads your product → auto-creates scene-specific start frames
                    </p>
                  </section>
                );
              })()}

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

              {/* Reference Video — only in video mode */}
              {leftPanelMode === 'video' && <section className="space-y-2 border-t border-[#1e1e24] pt-4">
                <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em]">Reference Video</h2>
                <div className="relative group h-12 bg-[#111113] border border-[#1e1e24] rounded-xl overflow-hidden cursor-pointer hover:border-[#c8f135]/40 transition-colors flex items-center justify-center">
                  <input type="file" accept="video/*" onChange={handleVideoUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  {sourceVideo ? (
                    <>
                      <video src={resolveUrl(sourceVideo.url)} className="w-full h-full object-cover opacity-50" />
                      <div className="absolute inset-0 flex items-center justify-center"><Play size={16} className="text-white/60" /></div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[#2a2a3a] group-hover:text-[#c8f135]/60 transition-colors">
                      <Video size={14} strokeWidth={1.5} />
                      <span className="text-[7px] font-black uppercase tracking-widest text-[#555]">Upload Reference Video</span>
                    </div>
                  )}
                </div>
                {sourceVideo && (
                  <button onClick={analyzeVideo} disabled={isAnalyzingVideo} className={`w-full py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${isAnalyzingVideo ? 'bg-white/5 text-white/20' : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'}`}>
                    {isAnalyzingVideo ? <><Loader2 size={10} className="animate-spin" />{analysisProgress || 'Analyzing...'}</> : <><Sparkles size={10} />Analyze Video</>}
                  </button>
                )}
                <MontagePanel />
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
                <select
                  value={imgEngine}
                  onChange={e => setImgEngine(e.target.value as any)}
                  className="w-full bg-[#111113] border border-[#1e1e24] px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase text-white/80 outline-none cursor-pointer hover:border-white/20 transition-colors"
                >
                  <option value="nb2" className="bg-[#111113]">NB2 (1 cr)</option>
                  <option value="nb2-open" className="bg-[#111113]">NB2 GA (1 cr)</option>
                  <option value="nb2-lite" className="bg-[#111113]">NB2 Lite (0.5 cr)</option>
                  <option value="gpt2" className="bg-[#111113]">GPT-2 (1-3 cr)</option>
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

            {/* Loading state */}
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
                  <Film size={7} className="text-[#c8f135]" /> Scene Style
                  <span className="text-white/10 font-normal normal-case tracking-normal"> · applies to image &amp; video</span>
                </span>
                <select
                  value={selectedSceneStyle}
                  onChange={e => setSelectedSceneStyle(e.target.value)}
                  className="w-full bg-[#111113] border border-[#1e1e24] hover:border-[#c8f135]/30 rounded-lg px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest text-white/70 hover:text-white cursor-pointer transition-all outline-none appearance-none"
                >
                  <optgroup label="── Talking">
                    <option value="normal_talking">🎙️ Normal Talking</option>
                    <option value="walk_talk">🚶 Walk &amp; Talk</option>
                    <option value="reaction_shot">😲 Reaction Shot</option>
                    <option value="mirror_selfie">🪞 Mirror Selfie</option>
                  </optgroup>
                  <optgroup label="── Camera Cuts">
                    <option value="fast_cut">✂️ Fast Cut</option>
                    <option value="dramatic_zoom">🔍 Dramatic Zoom</option>
                    <option value="pov_shot">👆 POV Shot</option>
                  </optgroup>
                  <optgroup label="── Product Focus">
                    <option value="cinematic_b_roll">🎥 Cinematic B-Roll</option>
                    <option value="close_up_detail">🔬 Close-Up Detail</option>
                    <option value="unboxing">📦 Unboxing</option>
                    <option value="before_after">🔄 Before &amp; After</option>
                  </optgroup>
                  <optgroup label="── Educational">
                    <option value="tutorial_step">🎓 Tutorial Step</option>
                    <option value="dynamic_action">⚡ Dynamic Action</option>
                  </optgroup>
                </select>
                {selectedSceneStyle && SCENE_STYLES[selectedSceneStyle] && (
                  <p className="text-[7px] text-white/25 font-mono mt-0.5 leading-relaxed">
                    {SCENE_STYLES[selectedSceneStyle].description}
                  </p>
                )}
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
                // Build a style-aware prompt for the reference image
                const buildRefImagePrompt = (): string => {
                  if (activeTab === 'podcast') {
                    return `A two-host podcast studio scene for this topic: ${userPrompt || script || 'branded podcast conversation'}. Show Host 1 and Host 2 at microphones with the product placed naturally in the setup.`;
                  }
                  const prod = productDetails ? productDetails.substring(0, 200) : 'the product';
                  const sceneStyle = SCENE_STYLES[selectedSceneStyle];

                  // Style-specific first-frame reference prompts
                  if (selectedSceneStyle === 'pov_shot') {
                    return `First-person POV shot: looking down at ${prod} held in both hands. Realistic hand details, natural indoor lighting, phone-shot authentic feel, first-frame reference for a POV video.`;
                  }
                  if (selectedSceneStyle === 'unboxing') {
                    return `POV overhead shot looking down at a cardboard unboxing box being opened by human hands. The product "${prod}" is nestled inside with tissue paper. Overhead angle, natural home lighting, authentic UGC phone photo style, first-frame reveal shot before product is lifted out. Shot on iPhone, no heavy filters.`;
                  }
                  if (selectedSceneStyle === 'cinematic_b_roll') {
                    return `Cinematic close-up product reveal shot of ${prod}. Shallow depth of field, soft bokeh background, luxury aesthetic, product centered on a clean surface, professional lighting, slow-mo vibe, first frame of a cinematic b-roll sequence.`;
                  }
                  if (selectedSceneStyle === 'close_up_detail') {
                    return `Extreme macro close-up of ${prod} showing texture, color, and fine details. Ultra-sharp focus, cinematic depth of field, studio or natural light, first-frame reference for a detail shot.`;
                  }
                  if (selectedSceneStyle === 'before_after') {
                    return `A person's face before using ${prod}, natural look with no makeup/product applied yet. Clean honest UGC photo, natural lighting, authentic phone photo feel — the "before" half of a before-after reveal.`;
                  }
                  if (selectedSceneStyle === 'tutorial_step') {
                    return `A creator holding ${prod} up toward the camera with one hand, pointing at it with the other, explaining step 1. Educational framing, natural lighting, UGC phone video screenshot style.`;
                  }
                  if (selectedSceneStyle === 'dynamic_action') {
                    return `Action shot of a creator actively demonstrating ${prod} with energy and motion. Slightly blurred background from movement, handheld camera feel, natural lighting, UGC vibe.`;
                  }
                  if (selectedSceneStyle === 'walk_talk') {
                    return `A creator walking outdoors while holding ${prod} up to the camera, handheld vlog style, slight motion blur on background, natural daylight, authentic UGC feel.`;
                  }
                  if (selectedSceneStyle === 'reaction_shot') {
                    return `A creator's face in close-up showing a genuine wide-eyed surprise-delight reaction while holding ${prod}. Expressive emotion, natural lighting, UGC authentic phone photo.`;
                  }
                  if (selectedSceneStyle === 'mirror_selfie') {
                    return `A creator taking a mirror selfie while holding ${prod}, phone visible in the reflection, casual home bathroom or bedroom background, natural lighting, authentic UGC vibe.`;
                  }
                  if (selectedSceneStyle === 'fast_cut') {
                    return `High-energy close-up of ${prod} held up confidently toward the camera, sharp focus, bold natural lighting — the first freeze-frame of a fast-cut sequence. UGC phone style.`;
                  }
                  if (selectedSceneStyle === 'dramatic_zoom') {
                    return `Cinematic wide shot of a creator holding ${prod}, slightly blurred background suggesting a slow push-in zoom is starting. Dramatic moody lighting, hook-worthy framing, UGC cinematic vibe.`;
                  }

                  // Image-style overrides (when no specific scene style matched)
                  if (imageStyle === 'ultra-realistic') {
                    return `A real person naturally using/holding ${prod} in an authentic home environment. Ultra-realistic UGC photo, natural lighting, shot on iPhone, no filters, raw look.`;
                  }
                  if (imageStyle === 'iphone') {
                    return `Casual selfie-style UGC photo of a creator with ${prod}. Shot on iPhone, handheld, relatable vibe, everyday background, natural light.`;
                  }
                  if (imageStyle === 'cinematic') {
                    return `Cinematic product lifestyle photo of ${prod}. Professional lighting, elegant composition, moody atmosphere, polished commercial look.`;
                  }

                  // Default
                  if (sceneStyle?.promptModifier) {
                    return `A creator naturally showcasing ${prod}. Scene style: ${sceneStyle.promptModifier}. UGC photo style, authentic look, natural lighting.`;
                  }
                  return `A creator naturally using/holding the product: ${prod}. UGC-style photo, natural lighting, authentic look.`;
                };

                const syntheticOption = {
                  id: 'quick-img',
                  title: activeTab === 'podcast'
                    ? 'Podcast Studio Frame'
                    : (SCENE_STYLES[selectedSceneStyle]?.name || productAnalysis?.productName || 'Product Shot'),
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
              {isGeneratingMontageImg
                ? <><Loader2 size={12} className="animate-spin" />{montageImgProgressMsg || 'Generating…'}</>
                : <>
                    <Camera size={12} />
                    {montageGeneratedImg ? 'Regenerate' : 'Generate'}{' '}
                    {SCENE_STYLES[selectedSceneStyle]?.name?.replace(/^[^a-zA-Z]+/, '') || 'Reference Image'}
                    {' '}<span className="opacity-60">· ⚡ {getImageCost()}</span>
                  </>
              }
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Drawer toggle button — sits on the right edge of the sidebar wrapper */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-6 h-12 flex items-center justify-center rounded-r-xl transition-all shadow-lg
          ${isSidebarOpen
            ? 'bg-[#111113] border border-[#c8f135]/20 text-[#c8f135]/60 hover:text-[#c8f135] hover:border-[#c8f135]/60 hover:bg-[#c8f135]/5 shadow-[0_0_8px_rgba(200,241,53,0.1)] hover:shadow-[0_0_12px_rgba(200,241,53,0.35)]'
            : 'bg-[#c8f135] border border-[#c8f135] text-black hover:bg-[#d4f545] animate-pulse shadow-[0_0_12px_rgba(200,241,53,0.7)]'
          }`}
        title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
      >
        {isSidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </div>
  );
}
