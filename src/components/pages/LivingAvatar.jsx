import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store';
import { 
  supabase 
} from '../../lib/supabase';
import { 
  uploadAsset, 
  uploadAudioAsset, 
  saveCharacterToDb 
} from '../../services/supabaseService';
import { 
  getApiUrl, 
  API_BASE_URL, 
  resolveUrl 
} from '../../config/apiConfig';
import { 
  Sparkles, Upload, User, Languages, Volume2, Play, Trash2, 
  Plus, X, Activity, Check, Loader2, Mic, FileAudio, 
  Wand2, Fingerprint, Camera, ShieldAlert, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RECOMMENDED_VOICES = [
  { id: 'Aoede', label: 'Aoede (Female - Warm & Clear)' },
  { id: 'Kore', label: 'Kore (Female - Energetic & Sharp)' },
  { id: 'Schedar', label: 'Schedar (Female - Professional)' },
  { id: 'Charon', label: 'Charon (Male - Deep & Warm)' },
  { id: 'Fenrir', label: 'Fenrir (Male - Authoritative)' },
  { id: 'Puck', label: 'Puck (Male - Casual & Friendly)' },
];

const RECOMMENDED_LANGUAGES = [
  { id: 'English', label: 'English (US/UK)' },
  { id: 'Spanish', label: 'Spanish (Español)' },
  { id: 'French', label: 'French (Français)' },
  { id: 'German', label: 'German (Deutsch)' },
  { id: 'Hindi', label: 'Hindi (हिन्दी)' },
  { id: 'Japanese', label: 'Japanese (日本語)' },
  { id: 'Korean', label: 'Korean (한국어)' },
  { id: 'Portuguese', label: 'Portuguese (Português)' },
];

const VISUAL_STYLES = [
  { id: 'Ultra Realistic', label: 'Ultra Real' },
  { id: 'Cinematic', label: 'Cinematic' },
  { id: 'Cyberpunk', label: 'Cyberpunk' },
  { id: 'Anime', label: 'Anime' },
  { id: 'Realistic', label: 'Realistic' }
];

export default function LivingAvatar() {
  const { 
    userProfile, 
    userShorts, 
    setActiveCharacter, 
    activeCharacter,
    showToast 
  } = useAppStore();

  const userId = userProfile?.id || 'anon';

  // ─── Creation Form States ──────────────────────────────────────────
  const [characterName, setCharacterName] = useState('');
  const [niche, setNiche] = useState('Tech & Lifestyle');
  const [visualStyle, setVisualStyle] = useState('Ultra Realistic');
  const [language, setLanguage] = useState('English');
  const [voiceType, setVoiceType] = useState('google'); // 'google' | 'cloned'
  const [googleVoiceId, setGoogleVoiceId] = useState('Aoede');
  const [customVoiceBase64, setCustomVoiceBase64] = useState(null);
  const [customVoiceName, setCustomVoiceName] = useState('');
  
  // Base64 Previews
  const [face1, setFace1] = useState(null);
  const [face2, setFace2] = useState(null);
  const [face3, setFace3] = useState(null);
  const [costume, setCostume] = useState(null);

  // Loading & Testing States
  const [isForging, setIsForging] = useState(false);
  const [forgeStep, setForgeStep] = useState('');
  const [testingTts, setTestingTts] = useState(false);
  const [ttsAudio, setTtsAudio] = useState(null);

  // ─── Vault States ──────────────────────────────────────────────────
  const [vaultCharacters, setVaultCharacters] = useState([]);
  const [loadingVault, setLoadingVault] = useState(false);

  // File Input Refs
  const face1InputRef = useRef(null);
  const face2InputRef = useRef(null);
  const face3InputRef = useRef(null);
  const costumeInputRef = useRef(null);
  const audioInputRef = useRef(null);

  // Fetch Saved Characters from Vault
  const fetchVaultCharacters = async () => {
    if (!userId || userId === 'anon') return;
    setLoadingVault(true);
    try {
      const response = await fetch(getApiUrl(`/api/list-characters?userId=${userId}`));
      if (response.ok) {
        const data = await response.json();
        setVaultCharacters(data.characters || []);
      }
    } catch (err) {
      console.error('Failed to fetch characters from vault:', err);
    } finally {
      setLoadingVault(false);
    }
  };

  useEffect(() => {
    fetchVaultCharacters();
  }, [userId]);

  // Image Upload Helper
  const handleImageSelect = (e, setter) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Audio Upload Helper
  const handleAudioSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        showToast("Audio file exceeds 8MB size limit", "error");
        return;
      }
      setCustomVoiceName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomVoiceBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Test Standard Voice TTS Playback
  const handleTestTts = async () => {
    if (testingTts) return;
    setTestingTts(true);
    try {
      const testText = `Hello! I am ${characterName || 'your custom avatar'}, speaking in ${language} with my synthesized vocal blueprint. How does this sound?`;
      
      const response = await fetch(getApiUrl('/api/proxy/tts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          voiceId: googleVoiceId
        })
      });

      if (!response.ok) throw new Error("TTS proxy returned non-200");
      const data = await response.json();
      
      if (data.audioContent) {
        // Stop currently playing ttsAudio if any
        if (ttsAudio) {
          ttsAudio.pause();
        }
        
        const snd = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        setTtsAudio(snd);
        snd.play();
        showToast("Playing vocal diagnostic blueprint...", "success");
      } else {
        throw new Error("Missing audioContent");
      }
    } catch (err) {
      console.error(err);
      showToast("Vocal synthesis preview failed. Verify backend services.", "error");
    } finally {
      setTestingTts(false);
    }
  };

  // Main "Forge Character Sheet" Submission
  const handleForgeCharacter = async () => {
    if (!characterName.trim()) {
      showToast("Identity Error: Character Name is required.", "error");
      return;
    }
    if (!face1 || !face2 || !face3) {
      showToast("Biological DNA Error: All 3 Face Reference images are required.", "error");
      return;
    }
    if (voiceType === 'cloned' && !customVoiceBase64) {
      showToast("Acoustic DNA Error: Please upload a voice blueprint to clone.", "error");
      return;
    }
    if (userShorts < 3) {
      showToast("Deduction Blocked: 3 Credits required to forge a premium Character Sheet.", "error");
      return;
    }

    setIsForging(true);
    const charId = `char-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    try {
      // 1. Upload all assets in parallel to Cloudflare R2 / GCS first to prevent lost credits
      setForgeStep('Securing visual & acoustic DNA blueprints in parallel to Cloudflare R2...');
      const uploadPromises = [
        uploadAsset(face1, userId, 'face1'),
        uploadAsset(face2, userId, 'face2'),
        uploadAsset(face3, userId, 'face3'),
        costume ? uploadAsset(costume, userId, 'costume') : Promise.resolve(''),
        (voiceType === 'cloned' && customVoiceBase64) ? uploadAudioAsset(customVoiceBase64, userId, `cloned_voice_${Date.now()}.mp3`) : Promise.resolve('')
      ];

      const [face1Url, face2Url, face3Url, costumeUrl, customVoiceUrl] = await Promise.all(uploadPromises);

      // 2. Validate all mandatory uploads succeeded before proceeding
      if (!face1Url || !face2Url || !face3Url) {
        throw new Error("Cloudflare R2 Upload Interruption: Face reference images failed to secure. Please try again.");
      }
      if (voiceType === 'cloned' && !customVoiceUrl) {
        throw new Error("Cloudflare R2 Upload Interruption: Cloned voice blueprint failed to secure. Please try again.");
      }

      // 3. Spend credits server-side only AFTER confirming successful uploads
      setForgeStep('Deducting character creation credits...');
      const spendRes = await fetch(getApiUrl('/api/credits/spend'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ amount: 3, reason: `Forge character: ${characterName}` })
      });

      if (!spendRes.ok) {
        throw new Error("Credit deduction failed. Insufficient shorts balance.");
      }

      // 4. Save to Database
      setForgeStep('Assembling visual and vocal DNA in database...');
      const finalPayload = {
        id: charId,
        userId: userId,
        name: characterName.trim(),
        visualStyle: visualStyle,
        origin: niche,
        image: face1Url, // Default hero avatar anchor
        anchor_image: face1Url,
        identityKit: {
          anchor: face1Url,
          profile: face2Url,
          closeUp: face3Url,
          expression: face1Url,
          halfBody: costumeUrl || face1Url,
          fullBody: costumeUrl || face1Url
        },
        metadata: {
          characterName: characterName.trim(),
          niche: niche,
          face1: face1Url,
          face2: face2Url,
          face3: face3Url,
          costume: costumeUrl,
          voiceType: voiceType,
          customVoiceUrl: customVoiceUrl,
          googleVoiceId: voiceType === 'google' ? googleVoiceId : '',
          language: language,
          isCharacterSheet: true
        }
      };

      const savedChar = await saveCharacterToDb(finalPayload);
      
      // 5. Update Local state & Zustand store
      setActiveCharacter(savedChar);
      showToast(`Character Sheet for "${characterName}" successfully forged!`, "success");

      // Reset creators
      setCharacterName('');
      setFace1(null);
      setFace2(null);
      setFace3(null);
      setCostume(null);
      setCustomVoiceBase64(null);
      setCustomVoiceName('');

      // Refresh list
      fetchVaultCharacters();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Forge execution failed. Retrying in debug mode...", "error");
    } finally {
      setIsForging(false);
      setForgeStep('');
    }
  };

  // Delete Character Sheet
  const handleDeleteCharacter = async (charToDelete, e) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to permanently erase the Character Sheet for "${charToDelete.name}"?`)) return;

    try {
      const response = await fetch(getApiUrl(`/api/delete-character/${charToDelete.id}`), {
        method: 'DELETE'
      });
      if (response.ok) {
        showToast("Character DNA erased successfully.", "info");
        
        // If current active character was deleted, clear active state
        if (activeCharacter?.id === charToDelete.id) {
          setActiveCharacter(null);
        }
        
        fetchVaultCharacters();
      } else {
        throw new Error("Erasing returned non-200");
      }
    } catch (err) {
      console.error(err);
      showToast("Eraser failure. Verify database permissions.", "error");
    }
  };

  return (
    <div className="h-full w-full bg-[#030305] text-white flex flex-col font-sans relative overflow-y-auto select-text pb-12 custom-scrollbar">
      {/* Background cyber glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-15%] w-[600px] h-[600px] bg-magenta-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Hero Header Section */}
      <header className="px-6 py-5 border-b border-white/5 bg-zinc-950/40 backdrop-blur-md flex items-center justify-between z-20 sticky top-0">
        <div className="space-y-1">
          <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-cyan-400 via-teal-400 to-[#bef264] bg-clip-text text-transparent">
            AI CHARACTER FORGE
          </h1>
          <p className="text-[10px] text-white/35 font-bold uppercase tracking-[0.25em]">
            Multi-Face DNA Consistency • Cloudflare R2 Secure Vault
          </p>
        </div>

        {/* Credit Tracker */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/5 text-xs font-black uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[#bef264]" />
          <span className="text-white/50">Shorts:</span>
          <span className="text-[#bef264]">{userShorts}</span>
        </div>
      </header>

      {/* Main Form Content Grid */}
      <div className="p-6 md:p-8 flex flex-col lg:grid lg:grid-cols-12 gap-8 max-w-7xl mx-auto w-full relative z-10">
        
        {/* Left Column: DESIGN WORKSPACE (Form Fields) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="border border-white/10 bg-black/40 backdrop-blur-2xl p-6 rounded-3xl flex flex-col gap-6 shadow-2xl relative overflow-hidden">
            {/* Corner glowing border */}
            <div className="absolute top-0 right-0 w-24 h-px bg-cyan-400/50" />
            <div className="absolute top-0 right-0 w-px h-24 bg-cyan-400/50" />

            <div className="space-y-1">
              <h2 className="text-lg font-black italic uppercase tracking-wider flex items-center gap-2 text-cyan-400">
                <Fingerprint className="w-5 h-5 text-cyan-400" />
                Initialize Digital DNA
              </h2>
              <p className="text-[10px] text-white/45">Setup character names, niches, visual aesthetics, and voices.</p>
            </div>

            {/* Row 1: Name and Niche */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-white/40 tracking-wider">Character Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none focus:border-cyan-500 transition-colors"
                    placeholder="e.g. Luna Veda"
                  />
                  <User className="w-3.5 h-3.5 absolute right-3.5 top-3.5 text-white/30" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-white/40 tracking-wider">Content Niche</label>
                <div className="relative">
                  <select
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none focus:border-cyan-500 appearance-none cursor-pointer"
                  >
                    <option value="Tech & Lifestyle" className="bg-zinc-950 text-white font-bold">Tech & Lifestyle</option>
                    <option value="Fashion & Beauty" className="bg-zinc-950 text-white font-bold">Fashion & Beauty</option>
                    <option value="Gaming & Virtual" className="bg-zinc-950 text-white font-bold">Gaming & Virtual</option>
                    <option value="Luxury & Travel" className="bg-zinc-950 text-white font-bold">Luxury & Travel</option>
                    <option value="Fitness & Wellness" className="bg-zinc-950 text-white font-bold">Fitness & Wellness</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Row 2: Visual Style & Language */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-white/40 tracking-wider">Visual Style Style</label>
                <div className="relative">
                  <select
                    value={visualStyle}
                    onChange={(e) => setVisualStyle(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none focus:border-cyan-500 appearance-none cursor-pointer"
                  >
                    {VISUAL_STYLES.map(s => (
                      <option key={s.id} value={s.id} className="bg-zinc-950 text-white font-bold">{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-white/40 tracking-wider">Language Model</label>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none focus:border-cyan-500 appearance-none cursor-pointer"
                  >
                    {RECOMMENDED_LANGUAGES.map(l => (
                      <option key={l.id} value={l.id} className="bg-zinc-950 text-white font-bold">{l.label}</option>
                    ))}
                  </select>
                  <Languages className="w-3.5 h-3.5 absolute right-3.5 top-3.5 text-white/30 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Section 2: Visual DNA Matrices (3 Face Photos & Costume) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> Visual Anchor Multi-Boards
                </label>
                <span className="text-[8px] text-white/35 font-mono uppercase">Upload 3 Faces (DNA lock) + 1 Costume</span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {/* Face 1 Slot */}
                <div 
                  onClick={() => face1InputRef.current.click()}
                  className={`aspect-square relative rounded-2xl border ${face1 ? 'border-cyan-400' : 'border-dashed border-white/10'} bg-black/40 hover:bg-black/60 transition-all flex flex-col items-center justify-center cursor-pointer group`}
                >
                  {face1 ? (
                    <>
                      <img src={face1} alt="face1" className="w-full h-full object-cover rounded-2xl" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFace1(null); }}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 rounded-full border border-white/10 hover:bg-red-500"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-2 gap-1 opacity-40 group-hover:opacity-75 transition-opacity">
                      <Plus className="w-4 h-4 text-cyan-400" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Face Ref 1</span>
                    </div>
                  )}
                  <input ref={face1InputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, setFace1)} />
                </div>

                {/* Face 2 Slot */}
                <div 
                  onClick={() => face2InputRef.current.click()}
                  className={`aspect-square relative rounded-2xl border ${face2 ? 'border-cyan-400' : 'border-dashed border-white/10'} bg-black/40 hover:bg-black/60 transition-all flex flex-col items-center justify-center cursor-pointer group`}
                >
                  {face2 ? (
                    <>
                      <img src={face2} alt="face2" className="w-full h-full object-cover rounded-2xl" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFace2(null); }}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 rounded-full border border-white/10 hover:bg-red-500"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-2 gap-1 opacity-40 group-hover:opacity-75 transition-opacity">
                      <Plus className="w-4 h-4 text-cyan-400" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Face Ref 2</span>
                    </div>
                  )}
                  <input ref={face2InputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, setFace2)} />
                </div>

                {/* Face 3 Slot */}
                <div 
                  onClick={() => face3InputRef.current.click()}
                  className={`aspect-square relative rounded-2xl border ${face3 ? 'border-cyan-400' : 'border-dashed border-white/10'} bg-black/40 hover:bg-black/60 transition-all flex flex-col items-center justify-center cursor-pointer group`}
                >
                  {face3 ? (
                    <>
                      <img src={face3} alt="face3" className="w-full h-full object-cover rounded-2xl" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFace3(null); }}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 rounded-full border border-white/10 hover:bg-red-500"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-2 gap-1 opacity-40 group-hover:opacity-75 transition-opacity">
                      <Plus className="w-4 h-4 text-cyan-400" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Face Ref 3</span>
                    </div>
                  )}
                  <input ref={face3InputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, setFace3)} />
                </div>

                {/* Costume Slot */}
                <div 
                  onClick={() => costumeInputRef.current.click()}
                  className={`aspect-square relative rounded-2xl border ${costume ? 'border-magenta-500' : 'border-dashed border-white/10'} bg-black/40 hover:bg-black/60 transition-all flex flex-col items-center justify-center cursor-pointer group`}
                >
                  {costume ? (
                    <>
                      <img src={costume} alt="costume" className="w-full h-full object-cover rounded-2xl" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCostume(null); }}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 rounded-full border border-white/10 hover:bg-red-500"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-2 gap-1 opacity-40 group-hover:opacity-75 transition-opacity">
                      <Plus className="w-4 h-4 text-magenta-500 animate-pulse" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-magenta-300">Costume (Opt)</span>
                    </div>
                  )}
                  <input ref={costumeInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, setCostume)} />
                </div>
              </div>
            </div>

            {/* Section 3: Voice Synthesis Deck */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#bef264] flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" /> Acoustic Voice DNA Blueprint
                </label>
                
                {/* Voice Type Switches */}
                <div className="flex bg-white/5 border border-white/15 p-0.5 rounded-lg">
                  <button 
                    onClick={() => setVoiceType('google')}
                    className={`px-3 py-1 rounded-md text-[8px] font-black uppercase transition-all ${voiceType === 'google' ? 'bg-[#bef264] text-black shadow-md' : 'text-white/40 hover:text-white'}`}
                  >
                    Google Synthesized
                  </button>
                  <button 
                    onClick={() => setVoiceType('cloned')}
                    className={`px-3 py-1 rounded-md text-[8px] font-black uppercase transition-all ${voiceType === 'cloned' ? 'bg-[#bef264] text-black shadow-md' : 'text-white/40 hover:text-white'}`}
                  >
                    Voice Clone Upload
                  </button>
                </div>
              </div>

              {/* Switches Output panels */}
              <AnimatePresence mode="wait">
                {voiceType === 'google' ? (
                  <motion.div 
                    key="google" 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -5 }} 
                    className="grid grid-cols-12 gap-4 items-center bg-black/20 p-4 border border-white/5 rounded-2xl"
                  >
                    <div className="col-span-8 space-y-1">
                      <label className="text-[8.5px] font-bold uppercase text-white/35">Select Spoken Accent model</label>
                      <select 
                        value={googleVoiceId} 
                        onChange={(e) => setGoogleVoiceId(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-bold outline-none cursor-pointer"
                      >
                        {RECOMMENDED_VOICES.map(v => (
                          <option key={v.id} value={v.id} className="bg-zinc-950 text-white font-bold">{v.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-4 flex flex-col justify-end h-full">
                      <button 
                        onClick={handleTestTts}
                        disabled={testingTts}
                        className="w-full py-2 px-3.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-black font-black uppercase tracking-wider text-[9px] rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md mt-4.5"
                      >
                        {testingTts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        Test Sample
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="cloned" 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -5 }} 
                    className="bg-black/20 p-4 border border-white/5 rounded-2xl flex flex-col gap-3"
                  >
                    <div 
                      onClick={() => audioInputRef.current.click()}
                      className="border border-dashed border-white/10 bg-black/35 hover:bg-black/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all gap-1.5 group"
                    >
                      <FileAudio className="w-8 h-8 text-white/20 group-hover:text-[#bef264] transition-colors" />
                      <span className="text-xs font-bold text-white/70 group-hover:text-white uppercase tracking-wide">
                        {customVoiceName || "Drop Voice Audio Blueprint"}
                      </span>
                      <span className="text-[9px] text-white/30">Supports WAV, MP3 up to 8MB</span>
                      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
                    </div>

                    {customVoiceBase64 && (
                      <div className="flex items-center justify-between bg-zinc-950/80 p-2.5 rounded-lg border border-[#bef264]/20">
                        <div className="flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-[#bef264] animate-pulse" />
                          <span className="text-[9px] font-mono text-white/60 truncate max-w-[180px]">{customVoiceName}</span>
                        </div>
                        <span className="text-[8px] font-black text-[#bef264] uppercase border border-[#bef264]/40 px-2 py-0.5 rounded-full bg-[#bef264]/10">
                          Secure Ready
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Pinned Action Button */}
            <div className="mt-2 pt-4 border-t border-white/5 space-y-4">
              {isForging && (
                <div className="bg-[#bef264]/5 border border-[#bef264]/20 p-3 rounded-xl flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-[#bef264] animate-spin" />
                  <span className="text-[9px] font-mono text-[#bef264] uppercase tracking-wider">{forgeStep}</span>
                </div>
              )}

              <button
                onClick={handleForgeCharacter}
                disabled={isForging}
                className={`w-full py-4.5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2.5 transition-all shadow-xl ${
                  isForging 
                    ? "bg-zinc-800 text-white/40 cursor-wait" 
                    : "bg-[#bef264] text-black hover:bg-white shadow-[#bef264]/10 hover:scale-[1.01]"
                }`}
              >
                <Wand2 className="w-4.5 h-4.5" /> FORGE CHARACTER SHEET
              </button>
            </div>

          </div>
        </div>

        {/* Right Column: VAULT LIST & CARD DETAIL */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Active DNA Detail Card (if one selected) */}
          <div className="border border-white/10 bg-black/60 backdrop-blur-2xl p-6 rounded-3xl flex flex-col gap-6 shadow-2xl relative overflow-hidden">
            {/* Holographic scanner laser overlay */}
            {activeCharacter && (
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce opacity-40 pointer-events-none" />
            )}

            <div className="space-y-1">
              <span className="text-[8.5px] font-black uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" /> Anchored Active Persona
              </span>
              <h3 className="text-base font-black italic uppercase tracking-wide">
                {activeCharacter ? activeCharacter.name : "NO PERSONA ANCHORED"}
              </h3>
            </div>

            {activeCharacter ? (
              <div className="space-y-5">
                
                {/* Visual Grid Preview */}
                <div className="grid grid-cols-4 gap-2 bg-black/40 p-2.5 rounded-2xl border border-white/5">
                  <div className="aspect-square bg-zinc-950 border border-white/10 rounded-xl overflow-hidden relative">
                    <img src={resolveUrl(activeCharacter.image)} alt="face1" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 inset-x-0 text-[6px] text-center font-black bg-black/80 text-white/50 py-0.5 uppercase">FACE_1</span>
                  </div>

                  <div className="aspect-square bg-zinc-950 border border-white/10 rounded-xl overflow-hidden relative">
                    <img src={resolveUrl(activeCharacter.kitImages?.profile || activeCharacter.image)} alt="face2" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 inset-x-0 text-[6px] text-center font-black bg-black/80 text-white/50 py-0.5 uppercase">FACE_2</span>
                  </div>

                  <div className="aspect-square bg-zinc-950 border border-white/10 rounded-xl overflow-hidden relative">
                    <img src={resolveUrl(activeCharacter.kitImages?.closeUp || activeCharacter.image)} alt="face3" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 inset-x-0 text-[6px] text-center font-black bg-black/80 text-white/50 py-0.5 uppercase">FACE_3</span>
                  </div>

                  <div className="aspect-square bg-zinc-950 border border-white/10 rounded-xl overflow-hidden relative">
                    <img src={resolveUrl(activeCharacter.kitImages?.halfBody || activeCharacter.image)} alt="costume" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 inset-x-0 text-[6px] text-center font-black bg-black/80 text-white/50 py-0.5 uppercase">COSTUME</span>
                  </div>
                </div>

                {/* Identity DNA rows */}
                <div className="space-y-2 bg-black/30 border border-white/5 rounded-xl p-3 text-[11px] font-mono leading-relaxed">
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-white/35 uppercase">Aesthetic style:</span>
                    <span className="text-cyan-300 font-bold">{activeCharacter.visualStyle}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-white/35 uppercase">Niche Sector:</span>
                    <span className="text-white font-bold">{activeCharacter.origin || 'Digital Influencer'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-white/35 uppercase">Accents Dialect:</span>
                    <span className="text-[#bef264] font-bold">{activeCharacter.rawData?.metadata?.language || 'English'}</span>
                  </div>
                  <div className="flex justify-between pb-0.5">
                    <span className="text-white/35 uppercase">Voice blueprint:</span>
                    <span className="text-magenta-400 font-bold uppercase truncate max-w-[140px]">
                      {activeCharacter.rawData?.metadata?.voiceType === 'cloned' ? 'Custom Cloned File' : `Google ${activeCharacter.rawData?.metadata?.googleVoiceId || 'Aoede'}`}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2.5 p-3 rounded-xl bg-cyan-400/5 border border-cyan-400/15 text-[10px] text-cyan-300/80 leading-relaxed font-sans">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>DNA Active Lock Secured.</strong> When feeding storyboard scripts into Seedance 2.0 (Google Omni) generation, this high-fidelity Character Sheet payload is automatically injected to anchor visual and audio likeness!
                  </p>
                </div>

              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center gap-3 opacity-25">
                <Fingerprint className="w-12 h-12 text-white/50" />
                <p className="text-[10px] uppercase font-bold tracking-wider max-w-xs">
                  Create a new character blueprint or select one from the talent vault below to establish an active likeness anchor.
                </p>
              </div>
            )}
          </div>

          {/* Saved Characters Talent Vault */}
          <div className="border border-white/10 bg-black/40 backdrop-blur-2xl p-6 rounded-3xl flex flex-col gap-4 shadow-2xl flex-1 max-h-[480px]">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#bef264] flex items-center justify-between border-b border-white/5 pb-2">
              <span>Talent Vault Library</span>
              <span className="text-[8px] font-mono text-white/30 lowercase">{vaultCharacters.length} constructs saved</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
              {loadingVault ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-50">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-[8px] font-mono uppercase">Scanning vaults...</span>
                </div>
              ) : vaultCharacters.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-2 opacity-25">
                  <User className="w-8 h-8 text-white/50" />
                  <span className="text-[8px] font-black uppercase tracking-wider">Vaults are currently empty</span>
                </div>
              ) : (
                vaultCharacters.map(char => {
                  const isActive = activeCharacter?.id === char.id;
                  return (
                    <div
                      key={char.id}
                      onClick={() => setActiveCharacter(char)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer group ${
                        isActive 
                          ? 'bg-[#bef264]/10 border-[#bef264]/40 shadow-lg' 
                          : 'bg-white/3 border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 flex-shrink-0 bg-zinc-950 flex items-center justify-center">
                        <img src={resolveUrl(char.image)} alt={char.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-xs truncate ${isActive ? 'text-[#bef264]' : 'text-white'}`}>
                          {char.name}
                        </div>
                        <div className="text-[8px] text-white/40 uppercase tracking-widest mt-0.5">{char.visualStyle}</div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteCharacter(char, e)}
                        className="p-2 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-500/10 hover:border-red-500/20 text-red-400 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                        title="Delete DNA"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
