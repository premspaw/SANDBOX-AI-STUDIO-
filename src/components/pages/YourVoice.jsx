import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Download, 
  Trash2, 
  Loader2, 
  Sparkles, 
  Volume2, 
  Music,
  Check,
  Info,
  Search,
  Sliders,
  Copy,
  Clock,
  Globe,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store';
import { getApiUrl } from '../../config/apiConfig';
import { useShorts } from '../../hooks/useShorts';
import { supabase } from '../../lib/supabase';

const VOICES = [
  { name: 'Achernar', tags: ['Soft', 'Higher pitch'] },
  { name: 'Achird', tags: ['Friendly', 'Lower middle pitch'] },
  { name: 'Algenib', tags: ['Gravelly', 'Lower pitch'] },
  { name: 'Algieba', tags: ['Smooth', 'Lower pitch'] },
  { name: 'Alnilam', tags: ['Firm', 'Lower middle pitch'] },
  { name: 'Aoede', tags: ['Breezy', 'Middle pitch'] },
  { name: 'Autonoe', tags: ['Bright', 'Clear'] },
  { name: 'Callirrhoe', tags: ['Easy-going', 'Conversational'] },
  { name: 'Charon', tags: ['Informative', 'Clear'] },
  { name: 'Despina', tags: ['Smooth', 'Soft'] },
  { name: 'Enceladus', tags: ['Breathy', 'Intimate'] },
  { name: 'Erinome', tags: ['Clear', 'Direct'] },
  { name: 'Fenrir', tags: ['Excitable', 'High-energy'] },
  { name: 'Gacrux', tags: ['Mature', 'Deep'] },
  { name: 'Iapetus', tags: ['Clear', 'Natural'] },
  { name: 'Kore', tags: ['Firm', 'Professional'] },
  { name: 'Laomedeia', tags: ['Upbeat', 'Friendly'] },
  { name: 'Leda', tags: ['Youthful', 'Friendly'] },
  { name: 'Orus', tags: ['Firm', 'Authoritative'] },
  { name: 'Puck', tags: ['Upbeat', 'Playful'] },
  { name: 'Pulcherrima', tags: ['Forward', 'Expressive'] },
  { name: 'Rasalgethi', tags: ['Informative', 'Steady'] },
  { name: 'Sadachbia', tags: ['Lively', 'Lower pitch'] },
  { name: 'Sadaltager', tags: ['Knowledgeable', 'Middle pitch'] },
  { name: 'Schedar', tags: ['Even', 'Lower middle pitch'] },
  { name: 'Sulafat', tags: ['Warm', 'Middle pitch'] },
  { name: 'Umbriel', tags: ['Easy-going', 'Lower middle pitch'] },
  { name: 'Vindemiatrix', tags: ['Gentle', 'Middle pitch'] },
  { name: 'Zephyr', tags: ['Bright', 'Higher pitch'] },
  { name: 'Zubenelgenubi', tags: ['Casual', 'Lower middle pitch'] }
];

const MODELS = [
  { id: 'gemini-3.1-flash-tts-preview', label: 'Gemini 3.1 Flash TTS (Recommended)' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
  { id: 'gemini-2.5-flash-preview-tts', label: 'Gemini 2.5 Flash TTS' },
  { id: 'gemini-2.5-pro-preview-tts', label: 'Gemini 2.5 Pro TTS' }
];

const STYLES = [
  { value: 'Default', label: 'Default Style', desc: 'Standard vocal delivery profile.' },
  { value: 'Vocal Smile', label: 'Vocal Smile', desc: 'The soft palate is raised to keep the tone bright, sunny, and explicitly inviting.' },
  { value: 'Newscaster', label: 'Newscaster', desc: 'Professional, authoritative, clear articulation with standard broadcast cadence.' },
  { value: 'Whisper', label: 'Whisper', desc: 'Intimate, breathy, close-to-mic proximity effect.' },
  { value: 'Empathetic', label: 'Empathetic', desc: 'Warm, understanding, soft tone with gentle inflections.' },
  { value: 'Promo/Hype', label: 'Promo/Hype', desc: 'High energy, punchy consonants, elongated vowels on excitement words.' },
  { value: 'Deadpan', label: 'Deadpan', desc: 'Flat affect, minimal pitch variation, dry delivery.' }
];

const PACES = [
  { value: 'Default', label: 'Default Pace', desc: 'Standard tempo configuration.' },
  { value: 'Natural', label: 'Natural', desc: 'Natural conversational pace.' },
  { value: 'Rapid Fire', label: 'Rapid Fire', desc: 'Fast, energetic, no dead air. Sentences overlap slightly.' },
  { value: 'The Drift', label: 'The Drift', desc: 'Slow, liquid, zero urgency. Long pauses for breath.' },
  { value: 'Staccato', label: 'Staccato', desc: 'Short, clipped sentences with distinct pauses between words.' }
];

const ACCENTS = [
  { value: 'Neutral', label: 'Neutral (Default)', desc: 'Standard balanced vocal accent.' },
  { value: 'Indian', label: 'Indian Accent', desc: 'Traditional South Asian English inflections.' },
  { value: 'British', label: 'British Accent', desc: 'Received Pronunciation and UK cadence.' },
  { value: 'American', label: 'American Accent', desc: 'Standard General American pronunciation.' },
  { value: 'Australian', label: 'Australian Accent', desc: 'Standard Australian English accent.' }
];

const LANGUAGES = [
  { value: 'English', label: 'English', desc: 'Default synthesis language.' },
  { value: 'Hindi', label: 'Hindi (हिन्दी)', desc: 'Spoken natively in India.' },
  { value: 'Telugu', label: 'Telugu (తెలుగు)', desc: 'Spoken in Andhra Pradesh & Telangana.' },
  { value: 'Tamil', label: 'Tamil (தமிழ்)', desc: 'Spoken in Tamil Nadu & Sri Lanka.' },
  { value: 'Kannada', label: 'Kannada (ಕನ್ನಡ)', desc: 'Spoken in Karnataka.' },
  { value: 'Spanish', label: 'Spanish (Español)', desc: 'European & Latin American variants.' },
  { value: 'French', label: 'French (Français)', desc: 'Standard French pronunciation.' },
  { value: 'German', label: 'German (Deutsch)', desc: 'Standard High German delivery.' },
  { value: 'Japanese', label: 'Japanese (日本語)', desc: 'Standard Japanese articulation.' },
  { value: 'Mandarin', label: 'Mandarin (中文)', desc: 'Standard Putonghua speech.' },
  { value: 'Arabic', label: 'Arabic (العربية)', desc: 'Modern Standard Arabic synthesis.' },
  { value: 'Portuguese', label: 'Portuguese (Português)', desc: 'Iberian & Brazilian variants.' },
  { value: 'Italian', label: 'Italian (Italiano)', desc: 'Standard Italian inflections.' }
];

const SAMPLE_TAGS = [
  { tag: '[excitedly]', label: 'Excited' },
  { tag: '[whispers]', label: 'Whisper' },
  { tag: '[laughs]', label: 'Laugh' },
  { tag: '[sighs]', label: 'Sigh' },
  { tag: '[sarcastically]', label: 'Sarcastic' },
  { tag: '[serious]', label: 'Serious' },
  { tag: '[tired]', label: 'Tired' },
  { tag: '[cough]', label: 'Cough' }
];

function CustomDropdown({ label, value, options, onChange, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="space-y-1 relative flex-1 min-w-[120px]" ref={ref}>
      <label className="text-[9px] font-black uppercase tracking-wider text-white/30 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#c8f135]" />} {label}
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-zinc-950/80 border ${
          isOpen ? 'border-[#c8f135]' : 'border-white/10 hover:border-white/20'
        } rounded-xl px-3 py-2 text-xs text-white text-left outline-none transition-all flex items-center justify-between cursor-pointer font-bold h-9 select-none`}
      >
        <span className="truncate">{selectedOption.label}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3.5 h-3.5 text-white/30" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute left-0 mt-1.5 w-full min-w-[200px] max-h-80 overflow-y-auto bg-zinc-950/95 border border-white/10 rounded-xl shadow-2xl z-[999] py-1.5 custom-scrollbar backdrop-blur-xl"
          >
            {options.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 hover:bg-white/5 transition-colors flex flex-col gap-0.5 select-none ${
                    isSelected ? 'bg-white/[0.02] border-l-2 border-[#c8f135]' : ''
                  }`}
                >
                  <span className={`text-xs font-black transition-colors ${isSelected ? 'text-[#c8f135]' : 'text-white/80'}`}>
                    {opt.label}
                  </span>
                  {opt.desc && (
                    <span className="text-[9.5px] leading-relaxed text-white/40 font-medium">
                      {opt.desc}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VoiceDropdown({ 
  voiceName, 
  setVoiceName, 
  playingPreviewId, 
  playPreview 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredVoices = VOICES.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedVoice = VOICES.find(v => v.name === voiceName) || VOICES[0];
  const isTriggerPreviewPlaying = playingPreviewId === selectedVoice.name;

  return (
    <div className="space-y-2 relative" ref={ref}>
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-1.5">
        <Volume2 className="w-3.5 h-3.5 text-[#c8f135]" /> Voice Profile
      </label>
      
      {/* Premium Trigger Button */}
      <div className="relative group">
        {/* Glow effect on hover */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-[#c8f135]/30 to-transparent rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-full bg-zinc-950/80 border ${
            isOpen ? 'border-[#c8f135] shadow-[0_0_20px_rgba(200,241,53,0.15)]' : 'border-white/10 hover:border-white/20'
          } rounded-2xl p-4 text-xs text-white text-left outline-none transition-all flex items-center justify-between cursor-pointer select-none`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Visual indicator / Avatar */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c8f135]/20 to-neutral-900 border border-[#c8f135]/30 flex items-center justify-center shrink-0 shadow-inner relative">
              {isTriggerPreviewPlaying && (
                <span className="absolute inset-0 rounded-xl border border-[#c8f135] animate-ping opacity-75" />
              )}
              <span className="text-sm font-black text-[#c8f135] tracking-tighter">
                {selectedVoice.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
            
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-black uppercase tracking-tight text-white group-hover:text-[#c8f135] transition-colors">
                  {selectedVoice.name}
                </span>
                <span className="text-[7.5px] font-black uppercase tracking-wider bg-[#c8f135]/15 text-[#c8f135] px-1.5 py-0.5 rounded border border-[#c8f135]/25 shrink-0">
                  Active
                </span>
              </div>
              <div className="hidden sm:flex flex-wrap gap-1">
                {selectedVoice.tags.map(t => (
                  <span key={t} className="text-[8px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded-full border border-white/5 font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Preview Button directly on the Trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playPreview(selectedVoice.name, e);
              }}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                isTriggerPreviewPlaying 
                  ? 'bg-[#c8f135] text-black scale-105 shadow-md shadow-[#c8f135]/20' 
                  : 'bg-white/5 text-white/50 hover:bg-[#c8f135]/20 hover:text-[#c8f135] hover:scale-105'
              }`}
              title={`Preview ${selectedVoice.name} voice`}
            >
              {isTriggerPreviewPlaying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-white/40 group-hover:text-white/70" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Premium Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 mt-2 w-full bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl z-[100] p-3 space-y-3 backdrop-blur-xl"
          >
            {/* Dropdown Header Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search 30+ voice profiles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none placeholder-white/20 focus:border-[#c8f135]/40 transition-colors"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-[10px] font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Scrollable list */}
            <div className="max-h-[250px] overflow-y-auto custom-scrollbar space-y-1 pr-1">
              {filteredVoices.map(v => {
                const isSelected = v.name === voiceName;
                const isPreviewPlaying = playingPreviewId === v.name;
                return (
                  <div
                    key={v.name}
                    onClick={() => {
                      setVoiceName(v.name);
                      setIsOpen(false);
                    }}
                    className={`p-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer group/item ${
                      isSelected 
                        ? 'border-[#c8f135] bg-[#c8f135]/5 shadow-[0_0_15px_rgba(200,241,53,0.05)]' 
                        : 'border-transparent bg-transparent hover:border-white/5 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Small avatar or checkmark */}
                      <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 transition-all relative ${
                        isSelected ? 'bg-[#c8f135] text-black font-black' : 'bg-white/5 text-white/30 group-hover/item:text-white/60'
                      }`}>
                        {isPreviewPlaying && (
                          <span className="absolute inset-0 rounded-lg border border-[#c8f135] animate-ping opacity-75" />
                        )}
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        ) : (
                          <span className="text-[10px] font-black">
                            {v.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-[#c8f135]' : 'text-white/80 group-hover/item:text-white'}`}>
                          {v.name}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {v.tags.map(t => (
                            <span key={t} className="text-[7.5px] bg-white/5 text-white/40 px-1 py-0.2 rounded-full font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Play preview inside the dropdown */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playPreview(v.name, e);
                      }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isPreviewPlaying 
                          ? 'bg-[#c8f135] text-black scale-105' 
                          : 'bg-white/5 text-white/40 hover:bg-[#c8f135]/20 hover:text-[#c8f135] hover:scale-105'
                      }`}
                      title={`Preview ${v.name} voice`}
                    >
                      {isPreviewPlaying ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>
                );
              })}
              {filteredVoices.length === 0 && (
                <div className="py-8 text-center text-white/20">
                  <Search className="w-5 h-5 mx-auto stroke-1" />
                  <p className="text-[9px] font-black uppercase mt-2">No matching voices</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function YourVoice() {
  const { userProfile } = useAppStore();
  const showToast = useAppStore(state => state.showToast);
  const { shorts, refresh: refreshShorts } = useShorts();
  
  const [prompt, setPrompt] = useState('');
  const [voiceName, setVoiceName] = useState('Kore');
  const [model, setModel] = useState('gemini-3.1-flash-tts-preview');
  
  // Director's note configuration states
  const [selectedStyle, setSelectedStyle] = useState('Default');
  const [selectedPace, setSelectedPace] = useState('Default');
  const [selectedAccent, setSelectedAccent] = useState('Neutral');
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  const [generating, setGenerating] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentMetadata, setCurrentMetadata] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Audio control states
  const [playingId, setPlayingId] = useState(null);
  const [playingPreviewId, setPlayingPreviewId] = useState(null);
  
  const textareaRef = useRef(null);
  const audioPlayersRef = useRef({});
  const previewAudioRef = useRef(null);

  // Load history from R2 per user with localStorage fallback
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token || '';
        
        const resp = await fetch(getApiUrl(`/api/voice-history?userId=${userProfile?.id || ''}`), {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const data = await resp.json();
        if (resp.ok && data.history) {
          setHistory(data.history);
          if (userProfile?.id) {
            localStorage.setItem(`yourvoice_history_${userProfile.id}`, JSON.stringify(data.history));
          }
          return;
        }
      } catch (err) {
        console.warn('Failed to fetch pricing history from R2, falling back to local storage:', err);
      } finally {
        setLoadingHistory(false);
      }

      // Local storage fallback
      try {
        const histKey = userProfile?.id ? `yourvoice_history_${userProfile.id}` : null;
        const savedHistory = histKey ? localStorage.getItem(histKey) : null;
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
        }
      } catch (err) {
        console.error('Failed to load voice generation history:', err);
      }
    };

    fetchHistory();
  }, [userProfile?.id]);

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    try {
      const histKey = userProfile?.id ? `yourvoice_history_${userProfile.id}` : null;
      if (histKey) {
        localStorage.setItem(histKey, JSON.stringify(newHistory));
      }
    } catch (err) {
      console.warn('Failed to save history to localStorage:', err);
    }
  };

  const insertTag = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    setPrompt(before + tag + ' ' + after);
    
    // Focus back and set cursor position after the inserted tag
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + tag.length + 1;
    }, 50);
  };

  const getEstimatedShorts = () => {
    if (!prompt.trim()) return 0;
    const estInputTokens = Math.ceil(prompt.length / 4);
    const estOutputTokens = Math.ceil(prompt.length * 1.67);
    
    let baseInputRate = 1.00;
    let baseOutputRate = 20.00;
    if (model === 'gemini-3-flash-preview') {
      baseInputRate = 0.50;
      baseOutputRate = 3.00;
    } else if (model.includes('pro')) {
      baseInputRate = 5.00;
      baseOutputRate = 80.00;
    }

    const estGoogleCost = (estInputTokens / 1000000) * baseInputRate + (estOutputTokens / 1000000) * baseOutputRate;
    const estOurCostUSD = estGoogleCost * 1.30;
    return Math.max(1, Math.ceil(estOurCostUSD * 100));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      if (showToast) showToast('Please write some text to convert to speech.', 'error');
      return;
    }

    const estShorts = getEstimatedShorts();
    if (shorts < estShorts) {
      if (showToast) showToast(`Insufficient shorts balance. TTS generation requires approximately ${estShorts}⚡.`, 'error');
      return;
    }

    setGenerating(true);
    if (showToast) showToast('Synthesizing speech via Gemini Native Audio...', 'info');

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token || '';

      const resp = await fetch(getApiUrl('/api/generate-voice'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          prompt,
          voiceName,
          model,
          style: selectedStyle,
          pace: selectedPace,
          accent: selectedAccent,
          language: selectedLanguage,
          userId: userProfile?.id
        })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to generate speech.');
      }

      if (data.url) {
        setCurrentAudioUrl(data.url);
        setCurrentMetadata(data);
        
        // Add to history
        const newItem = {
          id: data.id || `tts_${Date.now()}`,
          prompt: prompt,
          voiceName,
          model,
          style: selectedStyle,
          pace: selectedPace,
          accent: selectedAccent,
          language: selectedLanguage,
          url: data.url,
          timestamp: Date.now(),
          tokens: data.tokens,
          pricing: data.pricing
        };

        const updatedHistory = [newItem, ...history].slice(0, 50);
        saveHistory(updatedHistory);
        
        if (showToast) showToast('Speech successfully generated!', 'success');
      } else {
        throw new Error('API returned no audio URL.');
      }

    } catch (err) {
      console.error('[TTS UI Error]:', err);
      if (showToast) showToast(`Synthesis failed: ${err.message}`, 'error');
    } finally {
      setGenerating(false);
      refreshShorts();
    }
  };

  // Play pre-generated previews
  const playPreview = async (name, e) => {
    if (e) e.stopPropagation();

    // If currently playing this preview, stop it
    if (playingPreviewId === name) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPlayingPreviewId(null);
      return;
    }

    try {
      // Pause any ongoing preview or generation playback
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      if (playingId && audioPlayersRef.current[playingId]) {
        audioPlayersRef.current[playingId].pause();
        setPlayingId(null);
      }

      setPlayingPreviewId(name);
      
      const resp = await fetch(getApiUrl(`/api/preview-voice?voiceName=${name}`));
      const data = await resp.json();
      if (!resp.ok || !data.url) {
        throw new Error(data.error || 'Failed to load preview');
      }

      const audio = new Audio(data.url);
      previewAudioRef.current = audio;
      audio.addEventListener('ended', () => {
        setPlayingPreviewId(null);
      });
      await audio.play();
    } catch (err) {
      console.error('[TTS Preview Error]:', err);
      if (showToast) showToast(`Preview failed: ${err.message}`, 'error');
      setPlayingPreviewId(null);
    }
  };

  const togglePlayAudio = (id, url) => {
    // Pause any preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPlayingPreviewId(null);
    }

    const existingPlayer = audioPlayersRef.current[id];
    
    if (playingId === id) {
      if (existingPlayer) existingPlayer.pause();
      setPlayingId(null);
    } else {
      // Pause currently playing audio
      if (playingId && audioPlayersRef.current[playingId]) {
        audioPlayersRef.current[playingId].pause();
      }

      let player = existingPlayer;
      if (!player) {
        player = new Audio(url);
        player.addEventListener('ended', () => {
          setPlayingId(null);
        });
        audioPlayersRef.current[id] = player;
      }
      
      player.play()
        .then(() => setPlayingId(id))
        .catch(err => {
          console.error('Audio playback failed:', err);
          if (showToast) showToast('Playback failed. Please download the file.', 'error');
        });
    }
  };

  const handleDeleteHistoryItem = async (id, e) => {
    if (e) e.stopPropagation();
    
    if (playingId === id && audioPlayersRef.current[id]) {
      audioPlayersRef.current[id].pause();
      setPlayingId(null);
    }

    const nextHistory = history.filter(item => item.id !== id);
    saveHistory(nextHistory);
    delete audioPlayersRef.current[id];

    // Sync deletion back to R2 database
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token || '';
      
      await fetch(getApiUrl(`/api/delete-voice-history-item`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ id, userId: userProfile?.id })
      });
    } catch (err) {
      console.warn('Failed to delete history item from R2:', err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    if (showToast) showToast('Audio link copied to clipboard!', 'success');
  };

  return (
    <div className="h-full bg-black text-white py-6 font-sans select-none overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-5 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#c8f135] animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#c8f135]">Voice Synthesis Lab</span>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight italic bg-gradient-to-r from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent">
              Your Voice
            </h1>
            <p className="text-xs text-white/40 max-w-xl leading-relaxed">
              Google Gemini TTS generation capabilities. Craft controllable, high-fidelity recitations with fine-grained style, pacing, and tone.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#c8f135]/10 border border-[#c8f135]/30 rounded-2xl px-5 py-3 shrink-0 self-start md:self-auto shadow-[0_0_15px_rgba(200,241,53,0.1)]">
            <Volume2 className="w-5 h-5 text-[#c8f135]" />
            <div className="flex flex-col">
              <span className="text-[8px] text-white/30 font-black tracking-widest leading-none">BALANCE</span>
              <span className="text-base font-black text-[#c8f135] mt-0.5">{shorts} ⚡ SHORTS</span>
            </div>
          </div>
        </div>

        {/* Master Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Config Panel & Voice Selector */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Voice Selection Dropdown Card */}
            <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4 backdrop-blur-md relative z-30">
              <VoiceDropdown 
                voiceName={voiceName}
                setVoiceName={setVoiceName}
                playingPreviewId={playingPreviewId}
                playPreview={playPreview}
              />
            </div>

            {/* Director's Note Controls */}
            <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4 space-y-4 backdrop-blur-md relative z-20">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#c8f135] flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#c8f135]" /> Director's Note
                </h3>
                <span className="text-[8px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full border border-white/5 font-mono uppercase">Controllable</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <CustomDropdown
                    label="Style"
                    value={selectedStyle}
                    options={STYLES}
                    onChange={setSelectedStyle}
                    icon={Sparkles}
                  />
                  
                  <CustomDropdown
                    label="Pace"
                    value={selectedPace}
                    options={PACES}
                    onChange={setSelectedPace}
                    icon={Clock}
                  />
                  
                  <CustomDropdown
                    label="Accent"
                    value={selectedAccent}
                    options={ACCENTS}
                    onChange={setSelectedAccent}
                    icon={Globe}
                  />

                  <CustomDropdown
                    label="Language"
                    value={selectedLanguage}
                    options={LANGUAGES}
                    onChange={setSelectedLanguage}
                    icon={Globe}
                  />
                </div>
            </div>
          </div>

          {/* Right Column: Spoken Transcript, Output, and History */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Transcript & Model Config Box */}
            <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4 space-y-4 backdrop-blur-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#c8f135]" />
                  <span className="text-xs font-black uppercase tracking-widest text-[#c8f135]">Spoken Transcript</span>
                </div>
                
                {/* Model Select */}
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Model:</span>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-[#c8f135]/40 transition-colors cursor-pointer font-semibold"
                  >
                    {MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-2">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`e.g. Speak with your custom tone. Type something like:
"Hello! I can narrate any story you put in here. [whispers] Make it dramatic or exciting!"`}
                  rows={7}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-xs text-white placeholder-white/20 outline-none focus:border-[#c8f135]/50 transition-colors resize-none leading-relaxed font-sans"
                />
                
                <div className="flex items-center justify-between text-[8px] font-mono text-white/25">
                  <span className="flex items-center gap-1">
                    <Info className="w-3 h-3 text-[#c8f135]" /> Dynamic voice modulation supported
                  </span>
                  <span>{prompt.length} characters</span>
                </div>
              </div>

              {/* Dynamic tag picker */}
              <div className="space-y-2 border-t border-white/5 pt-3.5">
                <span className="text-[8px] font-black uppercase tracking-wider text-white/30 flex items-center gap-1.5">
                  Quick inject speech tag:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_TAGS.map(t => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => insertTag(t.tag)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-[#c8f135]/15 border border-white/5 hover:border-[#c8f135]/30 text-[9px] font-mono text-white/50 hover:text-[#c8f135] transition-all"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all duration-300 ${
                  generating || !prompt.trim()
                    ? 'bg-white/5 text-white/25 border border-white/5 cursor-not-allowed'
                    : 'bg-[#c8f135] text-black shadow-[0_0_25px_rgba(200,241,53,0.25)] hover:shadow-[0_0_35px_rgba(200,241,53,0.4)] hover:scale-[1.005] active:scale-95'
                }`}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    Synthesizing Speech...
                  </>
                ) : (
                  <>
                    <Music className="w-4.5 h-4.5" />
                    Generate Playable WAV
                    <span className="opacity-30">|</span>
                    <span className="font-mono text-[10px]">{getEstimatedShorts()}⚡</span>
                  </>
                )}
              </button>
            </div>

            {/* Current Output Player */}
            {currentAudioUrl && (
              <div className="rounded-2xl border border-[#c8f135]/30 bg-[#c8f135]/5 p-4.5 space-y-3.5 shadow-lg shadow-[#c8f135]/5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#c8f135] flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 animate-bounce" /> Current Audio Ready
                  </p>
                  <span className="text-[7.5px] bg-[#c8f135]/20 text-[#c8f135] px-2 py-0.5 rounded border border-[#c8f135]/20 font-mono">24kHz PCM WAV</span>
                </div>
                
                <div className="flex items-center gap-4 bg-black/40 border border-white/5 p-3 rounded-xl">
                  <button
                    onClick={() => togglePlayAudio('current', currentAudioUrl)}
                    className="w-12 h-12 rounded-full bg-[#c8f135] hover:bg-[#b0d62a] text-black flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0 shadow-lg shadow-[#c8f135]/20"
                  >
                    {playingId === 'current' ? (
                      <Pause className="w-5 h-5 fill-black text-black" />
                    ) : (
                      <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">Voice Recitation: {voiceName}</p>
                    <p className="text-[8.5px] font-mono text-white/30 uppercase mt-1 flex flex-wrap gap-2">
                      <span>Model: {model}</span>
                      {selectedStyle !== 'Default' && <span>Style: {selectedStyle}</span>}
                      {selectedPace !== 'Default' && <span>Pace: {selectedPace}</span>}
                      {selectedAccent !== 'Neutral' && <span>Accent: {selectedAccent}</span>}
                      {selectedLanguage !== 'English' && <span>Lang: {selectedLanguage}</span>}
                    </p>
                    {currentMetadata && currentMetadata.pricing && (
                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-3 text-[9px] font-mono text-white/45">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-[#c8f135]" />
                          Invoice: <strong className="text-[#c8f135]">${currentMetadata.pricing.totalOurCostUSD.toFixed(6)}</strong>
                        </span>
                        <span>•</span>
                        <span>Tokens: <strong>{currentMetadata.tokens?.input}</strong> in / <strong>{currentMetadata.tokens?.output}</strong> out</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => copyToClipboard(currentAudioUrl)}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center border border-white/10 transition-colors"
                      title="Copy Audio Link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={currentAudioUrl}
                      download={`voice_${voiceName}_${Date.now()}.wav`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center border border-white/10 transition-colors"
                      title="Download WAV"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Local History */}
            <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4 space-y-4 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/35">Generation History</h3>
                <span className="text-[8.5px] text-white/20 font-bold font-mono">PERSISTED</span>
              </div>
              
              {loadingHistory ? (
                <div className="py-12 text-center text-white/20 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#c8f135]" />
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#c8f135]">Synchronising R2 Storage...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center text-white/20 flex flex-col items-center gap-2">
                  <Volume2 className="w-8 h-8 stroke-1 text-white/10" />
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/25">No voice history yet</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                  {history.map(item => (
                    <div 
                      key={item.id}
                      className="p-3.5 rounded-xl border border-white/5 bg-black/40 flex items-center justify-between gap-4 hover:border-white/15 transition-all group"
                    >
                      <button
                        onClick={() => togglePlayAudio(item.id, item.url)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                          playingId === item.id 
                            ? 'bg-[#c8f135] text-black scale-105' 
                            : 'bg-white/5 text-white/60 hover:bg-[#c8f135] hover:text-black hover:scale-105'
                        }`}
                      >
                        {playingId === item.id ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-xs font-bold text-white/80 truncate">{item.prompt}</p>

                        {item.pricing && (
                          <div className="flex items-center gap-2 text-[9px] font-mono text-white/35 leading-none">
                            <span>Cost: <strong className="text-[#c8f135]">${item.pricing.totalOurCostUSD?.toFixed(6)}</strong></span>
                            <span>•</span>
                            <span>Tokens: <strong>{item.tokens?.input}</strong> in / <strong>{item.tokens?.output}</strong> out</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[8px] font-black text-[#c8f135] uppercase tracking-wider bg-[#c8f135]/10 px-1.5 py-0.5 rounded">
                            {item.voiceName}
                          </span>
                          {item.style && item.style !== 'Default' && (
                            <span className="text-[7.5px] font-medium text-white/40 border border-white/5 px-1 py-0.5 rounded">
                              {item.style}
                            </span>
                          )}
                          {item.pace && item.pace !== 'Default' && (
                            <span className="text-[7.5px] font-medium text-white/40 border border-white/5 px-1 py-0.5 rounded">
                              {item.pace}
                            </span>
                          )}
                          {item.accent && item.accent !== 'Neutral' && (
                            <span className="text-[7.5px] font-medium text-[#00FFFF] border border-[#00FFFF]/10 bg-[#00FFFF]/5 px-1 py-0.5 rounded">
                              {item.accent}
                            </span>
                          )}
                          {item.language && item.language !== 'English' && (
                            <span className="text-[7.5px] font-medium text-emerald-400 border border-emerald-400/10 bg-emerald-400/5 px-1 py-0.5 rounded">
                              {item.language}
                            </span>
                          )}
                          <span className="text-[7.5px] font-mono text-white/20 ml-auto">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => copyToClipboard(item.url)}
                          className="w-7 h-7 rounded-lg hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
                          title="Copy Link"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <a
                          href={item.url}
                          download={`voice_${item.voiceName}_${item.id}.wav`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-7 h-7 rounded-lg hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          className="w-7 h-7 rounded-lg hover:bg-red-500/15 text-white/40 hover:text-red-400 flex items-center justify-center transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
