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
  Search,
  Copy,
  Clock,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  X,
  Send,
  RotateCcw,
  Settings2,
  Mic,
  AudioWaveform,
  VolumeX,
  ChevronRight,
  Info,
  User,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store';
import { getApiUrl } from '../../config/apiConfig';
import { useShorts } from '../../hooks/useShorts';
import { supabase } from '../../lib/supabase';

const VOICES = [
  // Female voices
  { name: 'Achernar', gender: 'Female', tags: ['Soft', 'Higher pitch'] },
  { name: 'Aoede', gender: 'Female', tags: ['Breezy', 'Middle pitch'] },
  { name: 'Autonoe', gender: 'Female', tags: ['Bright', 'Clear'] },
  { name: 'Callirrhoe', gender: 'Female', tags: ['Easy-going', 'Conversational'] },
  { name: 'Despina', gender: 'Female', tags: ['Smooth', 'Soft'] },
  { name: 'Erinome', gender: 'Female', tags: ['Clear', 'Direct'] },
  { name: 'Kore', gender: 'Female', tags: ['Firm', 'Professional'] },
  { name: 'Laomedeia', gender: 'Female', tags: ['Upbeat', 'Friendly'] },
  { name: 'Leda', gender: 'Female', tags: ['Youthful', 'Friendly'] },
  { name: 'Pulcherrima', gender: 'Female', tags: ['Forward', 'Expressive'] },
  { name: 'Sulafat', gender: 'Female', tags: ['Warm', 'Middle pitch'] },
  { name: 'Vindemiatrix', gender: 'Female', tags: ['Gentle', 'Middle pitch'] },
  { name: 'Zephyr', gender: 'Female', tags: ['Bright', 'Higher pitch'] },

  // Male voices
  { name: 'Achird', gender: 'Male', tags: ['Friendly', 'Lower middle pitch'] },
  { name: 'Algenib', gender: 'Male', tags: ['Gravelly', 'Lower pitch'] },
  { name: 'Algieba', gender: 'Male', tags: ['Smooth', 'Lower pitch'] },
  { name: 'Alnilam', gender: 'Male', tags: ['Firm', 'Lower middle pitch'] },
  { name: 'Charon', gender: 'Male', tags: ['Informative', 'Clear'] },
  { name: 'Enceladus', gender: 'Male', tags: ['Breathy', 'Intimate'] },
  { name: 'Fenrir', gender: 'Male', tags: ['Excitable', 'High-energy'] },
  { name: 'Gacrux', gender: 'Male', tags: ['Mature', 'Deep'] },
  { name: 'Iapetus', gender: 'Male', tags: ['Clear', 'Natural'] },
  { name: 'Orus', gender: 'Male', tags: ['Firm', 'Authoritative'] },
  { name: 'Puck', gender: 'Male', tags: ['Upbeat', 'Playful'] },
  { name: 'Rasalgethi', gender: 'Male', tags: ['Informative', 'Steady'] },
  { name: 'Sadachbia', gender: 'Male', tags: ['Lively', 'Lower pitch'] },
  { name: 'Sadaltager', gender: 'Male', tags: ['Knowledgeable', 'Middle pitch'] },
  { name: 'Schedar', gender: 'Male', tags: ['Even', 'Lower middle pitch'] },
  { name: 'Umbriel', gender: 'Male', tags: ['Easy-going', 'Lower middle pitch'] },
  { name: 'Zubenelgenubi', gender: 'Male', tags: ['Casual', 'Lower middle pitch'] }
];

const MODELS = [
  { id: 'gemini-3.1-flash-tts-preview', label: 'Ultra Flash Studio', badge: 'Recommended', desc: 'Highest audio fidelity & fastest response' },
  { id: 'gemini-3-flash-preview', label: 'Speed Flash Studio', badge: 'Fastest', desc: 'Low latency conversational audio' },
  { id: 'gemini-2.5-flash-preview-tts', label: 'Standard Studio', badge: 'Stable', desc: 'Consistent reliable synthesis' },
  { id: 'gemini-2.5-pro-preview-tts', label: 'Cinema Pro Studio', badge: 'Pro Quality', desc: 'Deep nuances for broadcast storytelling' }
];

const STYLES = [
  { value: 'Default', label: 'Default Style', desc: 'Standard balanced vocal delivery profile.' },
  { value: 'Vocal Smile', label: 'Vocal Smile', desc: 'Soft palate raised for bright, sunny, explicitly inviting tone.' },
  { value: 'Newscaster', label: 'Newscaster', desc: 'Authoritative, clear articulation with broadcast cadence.' },
  { value: 'Whisper', label: 'Whisper', desc: 'Intimate, breathy, close-to-mic proximity effect.' },
  { value: 'Empathetic', label: 'Empathetic', desc: 'Warm, understanding, soft tone with gentle inflections.' },
  { value: 'Promo/Hype', label: 'Promo/Hype', desc: 'High energy, punchy consonants, elongated excitement words.' },
  { value: 'Deadpan', label: 'Deadpan', desc: 'Flat affect, minimal pitch variation, dry delivery.' }
];

const PACES = [
  { value: 'Default', label: 'Default Pace', desc: 'Standard natural tempo.' },
  { value: 'Natural', label: 'Natural', desc: 'Natural conversational pace.' },
  { value: 'Rapid Fire', label: 'Rapid Fire', desc: 'Fast, energetic, zero dead air.' },
  { value: 'The Drift', label: 'The Drift', desc: 'Slow, liquid, zero urgency with long pauses.' },
  { value: 'Staccato', label: 'Staccato', desc: 'Short, clipped sentences with distinct pauses.' }
];

const ACCENTS = [
  { value: 'Neutral', label: 'Neutral (Default)', desc: 'Standard balanced vocal accent.' },
  { value: 'Indian', label: 'Indian Accent', desc: 'Traditional South Asian English inflections.' },
  { value: 'British', label: 'British Accent', desc: 'Received Pronunciation and UK cadence.' },
  { value: 'American', label: 'American Accent', desc: 'Standard General American pronunciation.' },
  { value: 'Australian', label: 'Australian Accent', desc: 'Standard Australian English accent.' }
];

const LANGUAGES = [
  { value: 'English', label: 'English', desc: 'Default synthesis language' },
  { value: 'Hindi', label: 'Hindi (हिन्दी)', desc: 'Spoken natively in India' },
  { value: 'Telugu', label: 'Telugu (తెలుగు)', desc: 'Spoken in Andhra Pradesh & Telangana' },
  { value: 'Tamil', label: 'Tamil (தமிழ்)', desc: 'Spoken in Tamil Nadu & Sri Lanka' },
  { value: 'Kannada', label: 'Kannada (ಕನ್ನಡ)', desc: 'Spoken in Karnataka' },
  { value: 'Spanish', label: 'Spanish (Español)', desc: 'European & Latin American variants' },
  { value: 'French', label: 'French (Français)', desc: 'Standard French pronunciation' },
  { value: 'German', label: 'German (Deutsch)', desc: 'Standard High German delivery' },
  { value: 'Japanese', label: 'Japanese (日本語)', desc: 'Standard Japanese articulation' },
  { value: 'Mandarin', label: 'Mandarin (中文)', desc: 'Standard Putonghua speech' },
  { value: 'Arabic', label: 'Arabic (العربية)', desc: 'Modern Standard Arabic synthesis' },
  { value: 'Portuguese', label: 'Portuguese (Português)', desc: 'Iberian & Brazilian variants' },
  { value: 'Italian', label: 'Italian (Italiano)', desc: 'Standard Italian inflections' }
];

const SAMPLE_TAGS = [
  { tag: '[whispers]', label: 'Whisper', emoji: '🤫' },
  { tag: '[excitedly]', label: 'Excited', emoji: '✨' },
  { tag: '[laughs]', label: 'Laugh', emoji: '😄' },
  { tag: '[sighs]', label: 'Sigh', emoji: '😮‍💨' },
  { tag: '[sarcastically]', label: 'Sarcastic', emoji: '😏' },
  { tag: '[serious]', label: 'Serious', emoji: '🎯' },
  { tag: '[tired]', label: 'Tired', emoji: '🥱' },
  { tag: '[cough]', label: 'Cough', emoji: '😷' }
];

const QUICK_PROMPTS = [
  {
    title: 'Cinematic Voiceover',
    text: 'In a world beyond tomorrow, [whispers] silence is the only sound that echoes forever.'
  },
  {
    title: 'Product Launch Announcement',
    text: 'Welcome to Sandbox AI Studio! [excitedly] Today we are unveiling the next evolution in generative media.'
  },
  {
    title: 'Narrator Tale',
    text: 'The traveller reached the crossroad at dusk. [sighs] Neither road promised safe return.'
  },
  {
    title: 'Playful Commentary',
    text: 'Did they actually think that would go unnoticed? [laughs] Let us see how they explain this one.'
  }
];

// Interactive Audio Player Card inside chat messages
function ChatAudioPlayer({ item, isPlaying, onTogglePlay, audioProgress, onSeek, playbackRate, onChangePlaybackRate }) {
  const bars = [40, 75, 55, 95, 30, 85, 60, 100, 45, 90, 70, 35, 80, 50, 95, 65, 40, 85];

  return (
    <div className="bg-black/60 border border-white/10 rounded-2xl p-3.5 space-y-3 shadow-inner">
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={onTogglePlay}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-lg ${
            isPlaying 
              ? 'bg-[#c8f135] text-black shadow-[#c8f135]/30 scale-105' 
              : 'bg-white/10 hover:bg-[#c8f135] text-white hover:text-black hover:scale-105'
          }`}
          title={isPlaying ? 'Pause speech' : 'Play speech'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Visualizer & Progress bar */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Animated sound wave bars */}
          <div className="flex items-center gap-0.5 sm:gap-1 h-6 px-1">
            {bars.map((h, i) => {
              const active = isPlaying;
              return (
                <motion.div
                  key={i}
                  animate={active ? {
                    height: [`${Math.max(15, h * 0.3)}%`, `${h}%`, `${Math.max(20, h * 0.5)}%`],
                    opacity: [0.6, 1, 0.7]
                  } : { height: `${Math.max(20, h * 0.4)}%`, opacity: 0.35 }}
                  transition={active ? {
                    duration: 0.6 + (i % 5) * 0.1,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'easeInOut'
                  } : { duration: 0.2 }}
                  className={`flex-1 rounded-full min-w-[2px] ${active ? 'bg-[#c8f135]' : 'bg-white/40'}`}
                />
              );
            })}
          </div>

          {/* Interactive Seek Bar */}
          <div 
            onClick={onSeek}
            className="h-1.5 bg-white/10 rounded-full cursor-pointer relative overflow-hidden group"
          >
            <div 
              className="absolute left-0 top-0 bottom-0 bg-[#c8f135] rounded-full transition-all duration-100 group-hover:bg-[#d8ff4d]"
              style={{ width: `${Math.min(100, Math.max(0, audioProgress || 0))}%` }}
            />
          </div>
        </div>

        {/* Playback speed toggle */}
        <button
          onClick={onChangePlaybackRate}
          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/60 hover:text-white transition-colors cursor-pointer shrink-0"
          title="Playback speed"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}

export default function YourVoice() {
  const { userProfile } = useAppStore();
  const showToast = useAppStore(state => state.showToast);
  const { shorts, refresh: refreshShorts } = useShorts();
  
  // Prompt & synthesis config state
  const [prompt, setPrompt] = useState('');
  const [voiceName, setVoiceName] = useState('Kore');
  const [model, setModel] = useState('gemini-3.1-flash-tts-preview');
  const [selectedStyle, setSelectedStyle] = useState('Default');
  const [selectedPace, setSelectedPace] = useState('Default');
  const [selectedAccent, setSelectedAccent] = useState('Neutral');
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // Execution & conversation state
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Audio playback state
  const [playingId, setPlayingId] = useState(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playingPreviewId, setPlayingPreviewId] = useState(null);

  // Chat bar inline popovers & settings state
  const [genderFilter, setGenderFilter] = useState('all'); // 'all' | 'Female' | 'Male'
  const [isVoicePickerOpen, setIsVoicePickerOpen] = useState(false);
  const [voiceSearchQuery, setVoiceSearchQuery] = useState('');
  const [showMoreDirectives, setShowMoreDirectives] = useState(false);

  // Full Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('voice'); // 'voice' | 'director' | 'model'

  // Refs
  const textareaRef = useRef(null);
  const chatBottomRef = useRef(null);
  const voicePickerRef = useRef(null);
  const currentAudioElementRef = useRef(null);
  const previewAudioRef = useRef(null);

  // Close voice picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (voicePickerRef.current && !voicePickerRef.current.contains(event.target)) {
        setIsVoicePickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll chat to bottom on updates
  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatBottomRef.current) {
        chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

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
          scrollToBottom();
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
          scrollToBottom();
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

  // Cleanup active audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, []);

  const insertTag = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setPrompt(prev => prev ? `${prev} ${tag} ` : `${tag} `);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    setPrompt(before + tag + ' ' + after);
    
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
      if (showToast) showToast('Please enter text to synthesize speech.', 'error');
      return;
    }

    const estShorts = getEstimatedShorts();
    if (shorts < estShorts) {
      if (showToast) showToast(`Insufficient balance. Requires ~${estShorts}⚡ shorts.`, 'error');
      return;
    }

    setGenerating(true);
    scrollToBottom();

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
          prompt: prompt.trim(),
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
        throw new Error(data.error || 'Failed to generate voice.');
      }

      if (data.url) {
        const newItem = {
          id: data.id || `tts_${Date.now()}`,
          prompt: prompt.trim(),
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

        const updatedHistory = [...history, newItem];
        saveHistory(updatedHistory);
        setPrompt('');
        
        if (showToast) showToast('Voice speech synthesized successfully!', 'success');
        scrollToBottom();

        // Automatically start playing the newly generated audio
        setTimeout(() => {
          handlePlayAudio(newItem.id, newItem.url);
        }, 300);
      } else {
        throw new Error('No audio URL returned.');
      }

    } catch (err) {
      console.error('[TTS Generation Error]:', err);
      if (showToast) showToast(`Synthesis failed: ${err.message}`, 'error');
    } finally {
      setGenerating(false);
      refreshShorts();
    }
  };

  // Play pre-generated voice preview
  const playPreview = async (name, e) => {
    if (e) e.stopPropagation();

    if (playingPreviewId === name) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPlayingPreviewId(null);
      return;
    }

    try {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
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

  // Audio Playback Handler for Chat items
  const handlePlayAudio = (id, url) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPlayingPreviewId(null);
    }

    if (playingId === id) {
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
      }
      setPlayingId(null);
      return;
    }

    if (currentAudioElementRef.current) {
      currentAudioElementRef.current.pause();
    }

    const audio = new Audio(url);
    audio.playbackRate = playbackRate;
    currentAudioElementRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        setPlaybackProgress((audio.currentTime / audio.duration) * 100);
      }
    });

    audio.addEventListener('ended', () => {
      setPlayingId(null);
      setPlaybackProgress(0);
    });

    audio.play()
      .then(() => {
        setPlayingId(id);
      })
      .catch(err => {
        console.error('Audio play error:', err);
        setPlayingId(null);
        if (showToast) showToast('Playback failed. Please try downloading the WAV.', 'error');
      });
  };

  const handleSeek = (e) => {
    if (!currentAudioElementRef.current || !currentAudioElementRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    currentAudioElementRef.current.currentTime = pct * currentAudioElementRef.current.duration;
    setPlaybackProgress(pct * 100);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (currentAudioElementRef.current) {
      currentAudioElementRef.current.playbackRate = nextRate;
    }
  };

  const handleDeleteHistoryItem = async (id, e) => {
    if (e) e.stopPropagation();
    
    if (playingId === id && currentAudioElementRef.current) {
      currentAudioElementRef.current.pause();
      setPlayingId(null);
    }

    const nextHistory = history.filter(item => item.id !== id);
    saveHistory(nextHistory);

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

  const handleReuseSettings = (item) => {
    setPrompt(item.prompt || '');
    if (item.voiceName) setVoiceName(item.voiceName);
    if (item.model) setModel(item.model);
    if (item.style) setSelectedStyle(item.style);
    if (item.pace) setSelectedPace(item.pace);
    if (item.accent) setSelectedAccent(item.accent);
    if (item.language) setSelectedLanguage(item.language);

    if (showToast) showToast('Prompt and voice settings loaded into composer!', 'info');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    if (showToast) showToast('Audio link copied to clipboard!', 'success');
  };

  const currentVoiceObj = VOICES.find(v => v.name === voiceName) || VOICES[0];

  // Filtered voice list for picker & settings
  const filteredVoices = VOICES.filter(v => {
    const matchesGender = genderFilter === 'all' || v.gender === genderFilter;
    const matchesSearch = v.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
      v.tags.some(tag => tag.toLowerCase().includes(voiceSearchQuery.toLowerCase()));
    return matchesGender && matchesSearch;
  });

  const femaleVoices = VOICES.filter(v => v.gender === 'Female');
  const maleVoices = VOICES.filter(v => v.gender === 'Male');

  return (
    <div className="h-full w-full flex flex-col bg-[#07070a] text-white select-none overflow-hidden relative font-sans">
      
      {/* Top Header Bar (100% White-labeled, no Google branding) */}
      <header className="shrink-0 h-16 border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between bg-[#0b0b12]/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c8f135]/20 to-neutral-900 border border-[#c8f135]/40 flex items-center justify-center shrink-0 shadow-inner">
            <Volume2 className="w-4 h-4 text-[#c8f135]" />
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-white flex items-center gap-2 truncate">
                Your Voice Studio
              </h1>
              <span className="hidden sm:inline-flex text-[8px] font-black uppercase tracking-widest bg-[#c8f135]/15 text-[#c8f135] px-2 py-0.5 rounded-full border border-[#c8f135]/30">
                AI Voice Synthesis
              </span>
            </div>
            <p className="text-[10px] text-white/40 truncate">
              Ultra-realistic speech generation with directional performance controls
            </p>
          </div>
        </div>

        {/* Right header controls: Active summary, balance badge, settings button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Active Settings Pill */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#c8f135]/40 transition-all text-xs font-semibold group cursor-pointer"
            title="Configure all voice parameters"
          >
            <div className="w-2 h-2 rounded-full bg-[#c8f135] animate-pulse" />
            <span className="text-[#c8f135] font-black text-[11px] uppercase tracking-wider">
              {currentVoiceObj.gender === 'Female' ? '♀' : '♂'} {voiceName}
            </span>
            <span className="text-[10px] text-white/40">·</span>
            <span className="text-[10px] text-white/60">{selectedStyle}</span>
            <span className="text-[10px] text-white/40">·</span>
            <span className="text-[10px] text-white/60">{selectedLanguage}</span>
            <SlidersHorizontal className="w-3.5 h-3.5 text-white/40 group-hover:text-[#c8f135] transition-colors ml-1" />
          </button>

          {/* Shorts Balance Badge */}
          <div className="flex items-center gap-1.5 bg-[#c8f135]/10 border border-[#c8f135]/30 rounded-xl px-3 py-1.5 shadow-[0_0_15px_rgba(200,241,53,0.1)]">
            <Sparkles className="w-3.5 h-3.5 text-[#c8f135]" />
            <span className="text-xs font-black text-[#c8f135] font-mono">{shorts}⚡</span>
          </div>

          {/* Open Full Settings Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-[#c8f135]/20 hover:text-[#c8f135] border border-white/10 hover:border-[#c8f135]/40 text-white/70 flex items-center justify-center transition-all cursor-pointer shadow-sm"
            title="Open Full Voice Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Center Chat Feed */}
      <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 sm:px-6 md:px-8 py-6 space-y-6">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          
          {/* Welcome Screen / Empty State */}
          {history.length === 0 && !loadingHistory && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-8 sm:py-12 px-4 rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent text-center space-y-6 backdrop-blur-sm"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c8f135]/20 to-neutral-900 border border-[#c8f135]/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(200,241,53,0.15)]">
                <AudioWaveform className="w-8 h-8 text-[#c8f135]" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                  Studio Voice Synthesis
                </h2>
                <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
                  Type your script in the chat bar below. Choose between female and male voices, customize the language and delivery style, and add performance directions like <span className="text-[#c8f135] font-mono font-bold">[whispers]</span> or <span className="text-[#c8f135] font-mono font-bold">[excitedly]</span>.
                </p>
              </div>

              {/* Quick Template Prompts */}
              <div className="space-y-2 max-w-2xl mx-auto text-left pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">
                  Try an example script:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {QUICK_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPrompt(p.text);
                        if (textareaRef.current) textareaRef.current.focus();
                      }}
                      className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-[#c8f135]/30 transition-all text-left space-y-1 group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white/90 group-hover:text-[#c8f135] transition-colors">{p.title}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-[#c8f135] transition-colors" />
                      </div>
                      <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed font-mono">
                        {p.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading History Indicator */}
          {loadingHistory && (
            <div className="py-12 text-center text-white/30 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#c8f135]" />
              <p className="text-xs font-black uppercase tracking-wider text-[#c8f135]">Loading Voice Stream...</p>
            </div>
          )}

          {/* Conversation Stream */}
          {history.map((item) => {
            const isThisAudioPlaying = playingId === item.id;
            const itemVoice = VOICES.find(v => v.name === item.voiceName);
            const genderLabel = itemVoice?.gender === 'Female' ? '♀ Female' : '♂ Male';

            return (
              <div key={item.id} className="space-y-4">
                
                {/* User Prompt Message (Right Bubble) */}
                <div className="flex justify-end">
                  <div className="max-w-xl bg-[#151520] border border-white/10 rounded-2xl rounded-tr-sm px-4 py-3 shadow-lg space-y-2 group">
                    <div className="flex items-center justify-between gap-3 text-[10px] text-white/30 font-mono">
                      <span className="font-bold text-white/40">You</span>
                      <div className="flex items-center gap-2">
                        <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <button
                          onClick={() => handleReuseSettings(item)}
                          className="opacity-0 group-hover:opacity-100 hover:text-[#c8f135] transition-opacity cursor-pointer flex items-center gap-1"
                          title="Reuse this prompt & settings"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reuse</span>
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-xs sm:text-sm text-white/90 leading-relaxed break-words whitespace-pre-wrap">
                      {/* Highlight bracket tags like [whispers] */}
                      {item.prompt.split(/(\[[^\]]+\])/g).map((chunk, ci) => {
                        if (chunk.startsWith('[') && chunk.endsWith(']')) {
                          return (
                            <span key={ci} className="text-[#c8f135] font-bold font-mono px-1 py-0.5 bg-[#c8f135]/10 rounded border border-[#c8f135]/20 mx-0.5">
                              {chunk}
                            </span>
                          );
                        }
                        return chunk;
                      })}
                    </p>
                  </div>
                </div>

                {/* AI Assistant Audio Response Message (Left Bubble) */}
                <div className="flex justify-start items-start gap-3 max-w-2xl w-full">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c8f135]/20 to-neutral-950 border border-[#c8f135]/40 flex items-center justify-center shrink-0 shadow-md">
                    <span className="text-xs font-black text-[#c8f135]">
                      {item.voiceName?.substring(0, 2).toUpperCase() || 'AI'}
                    </span>
                  </div>

                  {/* Main Response Box */}
                  <div className="flex-1 bg-zinc-950/80 border border-white/10 rounded-2xl rounded-tl-sm p-4 space-y-4 backdrop-blur-md shadow-xl">
                    
                    {/* Header: Voice & Metrics Details */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-tight text-white flex items-center gap-1.5">
                          {item.voiceName}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-wider bg-white/5 text-[#c8f135] px-1.5 py-0.5 rounded border border-white/10">
                          {genderLabel}
                        </span>
                      </div>
                      
                      {item.pricing && (
                        <div className="text-[9px] font-mono text-white/40 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-[#c8f135]" />
                          <span>${item.pricing.totalOurCostUSD?.toFixed(6) || '0.000'}</span>
                          <span>•</span>
                          <span>{item.tokens?.input || 0} in / {item.tokens?.output || 0} out</span>
                        </div>
                      )}
                    </div>

                    {/* Interactive Player */}
                    <ChatAudioPlayer 
                      item={item}
                      isPlaying={isThisAudioPlaying}
                      onTogglePlay={() => handlePlayAudio(item.id, item.url)}
                      audioProgress={isThisAudioPlaying ? playbackProgress : 0}
                      onSeek={handleSeek}
                      playbackRate={playbackRate}
                      onChangePlaybackRate={cyclePlaybackRate}
                    />

                    {/* Generated Voice Options Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <div className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wider bg-[#c8f135]/10 text-[#c8f135] border border-[#c8f135]/25 px-2 py-0.5 rounded-lg">
                        <Mic className="w-3 h-3" /> Voice: {item.voiceName} ({itemVoice?.gender || 'Voice'})
                      </div>

                      {item.style && item.style !== 'Default' && (
                        <div className="flex items-center gap-1 text-[8.5px] font-medium text-white/60 bg-white/5 border border-white/5 px-2 py-0.5 rounded-lg">
                          <Sparkles className="w-3 h-3 text-amber-400" /> Style: {item.style}
                        </div>
                      )}

                      {item.pace && item.pace !== 'Default' && (
                        <div className="flex items-center gap-1 text-[8.5px] font-medium text-white/60 bg-white/5 border border-white/5 px-2 py-0.5 rounded-lg">
                          <Clock className="w-3 h-3 text-cyan-400" /> Pace: {item.pace}
                        </div>
                      )}

                      {item.accent && item.accent !== 'Neutral' && (
                        <div className="flex items-center gap-1 text-[8.5px] font-medium text-white/60 bg-white/5 border border-white/5 px-2 py-0.5 rounded-lg">
                          <Globe className="w-3 h-3 text-purple-400" /> Accent: {item.accent}
                        </div>
                      )}

                      {item.language && item.language !== 'English' && (
                        <div className="flex items-center gap-1 text-[8.5px] font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-lg">
                          <Globe className="w-3 h-3" /> Lang: {item.language}
                        </div>
                      )}

                      <div className="text-[8.5px] font-mono text-white/30 bg-black/40 px-2 py-0.5 rounded-lg border border-white/5 ml-auto">
                        24kHz PCM WAV
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-white/50">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard(item.url)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-[10px]"
                          title="Copy direct audio URL"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy link</span>
                        </button>

                        <a
                          href={item.url}
                          download={`voice_${item.voiceName}_${item.id}.wav`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-[10px]"
                          title="Download standard WAV audio"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download WAV</span>
                        </a>

                        <button
                          onClick={() => handleReuseSettings(item)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#c8f135]/20 hover:text-[#c8f135] transition-colors cursor-pointer text-[10px]"
                          title="Load this prompt and voice settings into chat composer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Use in Chat</span>
                        </button>
                      </div>

                      <button
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        className="p-1.5 rounded-lg hover:bg-red-500/15 hover:text-red-400 text-white/30 transition-colors cursor-pointer"
                        title="Delete generation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            );
          })}

          {/* Synthesizing indicator bubble while generating */}
          {generating && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start items-start gap-3 max-w-lg w-full"
            >
              <div className="w-9 h-9 rounded-xl bg-[#c8f135]/20 border border-[#c8f135] flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 animate-spin text-[#c8f135]" />
              </div>
              <div className="bg-zinc-950/90 border border-[#c8f135]/40 rounded-2xl rounded-tl-sm p-4 space-y-2 backdrop-blur-md shadow-xl w-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#c8f135] flex items-center gap-2">
                    <Music className="w-3.5 h-3.5 animate-bounce" /> Synthesizing Speech...
                  </span>
                  <span className="text-[9px] font-mono text-white/40">~{getEstimatedShorts()}⚡</span>
                </div>
                <p className="text-[11px] text-white/50">
                  Generating vocal performance using <strong className="text-white">{voiceName}</strong> with {selectedStyle !== 'Default' ? selectedStyle : 'natural'} style...
                </p>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ x: ['-100%', '100%'] }} 
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-1/3 h-full bg-[#c8f135] rounded-full" 
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Anchor to scroll to bottom */}
          <div ref={chatBottomRef} className="h-4" />
        </div>
      </main>

      {/* Bottom Chat Composer with INLINE SETTINGS (Requested by user: "put settings in the chat bar itself") */}
      <footer className="shrink-0 p-3 sm:p-5 bg-gradient-to-t from-[#07070a] via-[#07070a]/95 to-transparent border-t border-white/5 z-20">
        <div className="max-w-4xl mx-auto w-full space-y-2.5">
          
          {/* Quick Speech Direction Tags Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-[11px]">
            <span className="text-[9px] font-black uppercase tracking-wider text-white/30 shrink-0 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#c8f135]" /> Quick Tags:
            </span>
            {SAMPLE_TAGS.map(t => (
              <button
                key={t.tag}
                type="button"
                onClick={() => insertTag(t.tag)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-[#c8f135]/15 border border-white/10 hover:border-[#c8f135]/40 text-white/70 hover:text-[#c8f135] transition-all shrink-0 flex items-center gap-1 font-mono text-[10px] cursor-pointer shadow-sm active:scale-95"
              >
                <span>{t.emoji}</span>
                <span>{t.tag}</span>
              </button>
            ))}
          </div>

          {/* Main Chat Box Container with Inline Settings Bar */}
          <div className="rounded-2xl border border-white/10 bg-[#12121a]/95 p-2 sm:p-3 shadow-2xl backdrop-blur-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3 focus-within:border-[#c8f135]/60 focus-within:shadow-[0_0_30px_rgba(200,241,53,0.15)] transition-all relative">
            
            {/* Left/Center: Textarea + Full Inline Settings Bar */}
            <div className="flex-1 flex flex-col justify-between min-h-[72px] sm:min-h-[84px] space-y-2.5">
              
              {/* Text input */}
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder="Type your message to convert to speech... (Press Enter to generate, Shift+Enter for new line)"
                rows={2}
                className="w-full bg-transparent px-2 pt-1 text-xs sm:text-sm text-white placeholder-white/25 outline-none resize-none leading-relaxed font-sans"
              />

              {/* CHAT BAR SETTINGS ROW (Voice, Gender segregation, Language, Style, and more) */}
              <div className="flex flex-wrap items-center gap-2 px-1 pt-1.5 border-t border-white/5 text-[11px]">
                
                {/* 1. Voice Picker Button with Female/Male Segregation Popover */}
                <div className="relative" ref={voicePickerRef}>
                  <button
                    type="button"
                    onClick={() => setIsVoicePickerOpen(!isVoicePickerOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 hover:border-[#c8f135]/40 transition-all font-bold cursor-pointer shadow-sm"
                    title="Select voice (Female or Male)"
                  >
                    <Mic className="w-3.5 h-3.5 text-[#c8f135]" />
                    <span className="text-[#c8f135] text-[10.5px]">
                      {currentVoiceObj.gender === 'Female' ? '♀' : '♂'} {voiceName}
                    </span>
                    <span className="text-[9px] text-white/40 uppercase bg-white/5 px-1 py-0.2 rounded font-mono">
                      {currentVoiceObj.gender}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${isVoicePickerOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Popover Menu for Voice with Segregated Female & Male tabs */}
                  <AnimatePresence>
                    {isVoicePickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 bg-[#0f0f16]/98 border border-white/15 rounded-2xl shadow-2xl p-3 z-50 backdrop-blur-2xl space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                            <Mic className="w-3 h-3 text-[#c8f135]" /> Choose Voice Profile
                          </span>
                          <span className="text-[9px] font-mono text-[#c8f135]">30 Voices</span>
                        </div>

                        {/* Gender Segregation Filter Tabs */}
                        <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/5 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setGenderFilter('all')}
                            className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
                              genderFilter === 'all' ? 'bg-[#c8f135] text-black shadow-sm font-black' : 'text-white/50 hover:text-white'
                            }`}
                          >
                            All ({VOICES.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setGenderFilter('Female')}
                            className={`flex-1 py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                              genderFilter === 'Female' ? 'bg-[#c8f135] text-black shadow-sm font-black' : 'text-white/50 hover:text-white'
                            }`}
                          >
                            <span>♀ Female</span>
                            <span className="text-[9px] opacity-70 font-mono">({femaleVoices.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setGenderFilter('Male')}
                            className={`flex-1 py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                              genderFilter === 'Male' ? 'bg-[#c8f135] text-black shadow-sm font-black' : 'text-white/50 hover:text-white'
                            }`}
                          >
                            <span>♂ Male</span>
                            <span className="text-[9px] opacity-70 font-mono">({maleVoices.length})</span>
                          </button>
                        </div>

                        {/* Search input */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Filter voices..."
                            value={voiceSearchQuery}
                            onChange={(e) => setVoiceSearchQuery(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#c8f135]/50 transition-colors"
                          />
                        </div>

                        {/* Scrollable voice list */}
                        <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                          {filteredVoices.map(v => {
                            const isSelected = v.name === voiceName;
                            const isPreviewPlaying = playingPreviewId === v.name;

                            return (
                              <div
                                key={v.name}
                                onClick={() => {
                                  setVoiceName(v.name);
                                  setIsVoicePickerOpen(false);
                                }}
                                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                  isSelected 
                                    ? 'bg-[#c8f135]/15 border-[#c8f135] shadow-sm' 
                                    : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05] hover:border-white/10'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                                    isSelected ? 'bg-[#c8f135] text-black' : 'bg-white/5 text-white/60'
                                  }`}>
                                    {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : v.name.substring(0, 2).toUpperCase()}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#c8f135]' : 'text-white'}`}>
                                        {v.name}
                                      </span>
                                      <span className={`text-[8px] font-mono px-1 py-0.2 rounded ${
                                        v.gender === 'Female' ? 'bg-pink-500/10 text-pink-300' : 'bg-blue-500/10 text-blue-300'
                                      }`}>
                                        {v.gender}
                                      </span>
                                    </div>
                                    <p className="text-[9px] text-white/40 truncate">{v.tags.join(', ')}</p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => playPreview(v.name, e)}
                                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all ${
                                    isPreviewPlaying 
                                      ? 'bg-[#c8f135] text-black scale-105' 
                                      : 'bg-white/5 text-white/40 hover:bg-[#c8f135]/20 hover:text-[#c8f135]'
                                  }`}
                                  title={`Listen to sample of ${v.name}`}
                                >
                                  {isPreviewPlaying ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 2. Target Language Select (Directly in the chat bar) */}
                <div className="relative flex items-center">
                  <Globe className="w-3 h-3 text-[#c8f135] absolute left-2 pointer-events-none" />
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#c8f135]/40 rounded-xl pl-6 pr-6 py-1 text-[10.5px] font-bold text-white outline-none cursor-pointer transition-all appearance-none"
                    title="Select output language"
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.value} value={l.value} className="bg-zinc-950 text-white">
                        {l.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-white/40 absolute right-2 pointer-events-none" />
                </div>

                {/* 3. Style Select (Directly in the chat bar) */}
                <div className="relative flex items-center">
                  <Sparkles className="w-3 h-3 text-amber-400 absolute left-2 pointer-events-none" />
                  <select
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#c8f135]/40 rounded-xl pl-6 pr-6 py-1 text-[10.5px] font-bold text-white outline-none cursor-pointer transition-all appearance-none"
                    title="Select vocal style"
                  >
                    {STYLES.map(s => (
                      <option key={s.value} value={s.value} className="bg-zinc-950 text-white">
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-white/40 absolute right-2 pointer-events-none" />
                </div>

                {/* 4. More Settings Toggle (Pace, Accent, Engine) */}
                <button
                  type="button"
                  onClick={() => setShowMoreDirectives(!showMoreDirectives)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                    showMoreDirectives || selectedPace !== 'Default' || selectedAccent !== 'Neutral'
                      ? 'bg-[#c8f135]/15 border-[#c8f135]/40 text-[#c8f135]' 
                      : 'bg-white/[0.02] border-white/10 text-white/50 hover:text-white'
                  }`}
                  title="Toggle Pace & Accent settings"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Pace & Accent</span>
                </button>

                {/* Character & shorts info counter on the right */}
                <div className="ml-auto hidden md:flex items-center gap-2 font-mono text-[10px] text-white/35">
                  <span>{prompt.length} chars</span>
                  <span>•</span>
                  <span className="text-[#c8f135] font-bold">~{getEstimatedShorts()}⚡</span>
                </div>

              </div>

              {/* Optional Expanded Row for Pace & Accent right inside the chat bar */}
              <AnimatePresence>
                {showMoreDirectives && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5 overflow-hidden"
                  >
                    {/* Pace Select */}
                    <div className="relative flex items-center">
                      <Clock className="w-3 h-3 text-cyan-400 absolute left-2 pointer-events-none" />
                      <select
                        value={selectedPace}
                        onChange={(e) => setSelectedPace(e.target.value)}
                        className="bg-white/[0.04] border border-white/10 rounded-xl pl-6 pr-6 py-1 text-[10px] font-semibold text-white outline-none cursor-pointer appearance-none"
                      >
                        {PACES.map(p => (
                          <option key={p.value} value={p.value} className="bg-zinc-950 text-white">{p.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-white/40 absolute right-2 pointer-events-none" />
                    </div>

                    {/* Accent Select */}
                    <div className="relative flex items-center">
                      <Globe className="w-3 h-3 text-purple-400 absolute left-2 pointer-events-none" />
                      <select
                        value={selectedAccent}
                        onChange={(e) => setSelectedAccent(e.target.value)}
                        className="bg-white/[0.04] border border-white/10 rounded-xl pl-6 pr-6 py-1 text-[10px] font-semibold text-white outline-none cursor-pointer appearance-none"
                      >
                        {ACCENTS.map(a => (
                          <option key={a.value} value={a.value} className="bg-zinc-950 text-white">{a.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-white/40 absolute right-2 pointer-events-none" />
                    </div>

                    {/* Model Select */}
                    <div className="relative flex items-center">
                      <Volume2 className="w-3 h-3 text-[#c8f135] absolute left-2 pointer-events-none" />
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="bg-white/[0.04] border border-white/10 rounded-xl pl-6 pr-6 py-1 text-[10px] font-semibold text-white outline-none cursor-pointer appearance-none"
                      >
                        {MODELS.map(m => (
                          <option key={m.id} value={m.id} className="bg-zinc-950 text-white">{m.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-white/40 absolute right-2 pointer-events-none" />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPace('Default');
                        setSelectedAccent('Neutral');
                      }}
                      className="text-[9.5px] text-white/40 hover:text-white underline cursor-pointer ml-1"
                    >
                      Reset
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Right-hand Side: The VERY BIG Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className={`sm:w-36 md:w-40 h-16 sm:h-20 rounded-xl flex flex-col items-center justify-center gap-1 font-black uppercase tracking-wider text-black transition-all cursor-pointer shrink-0 select-none shadow-xl ${
                generating || !prompt.trim()
                  ? 'bg-white/10 text-white/25 border border-white/5 cursor-not-allowed shadow-none'
                  : 'bg-[#c8f135] hover:bg-[#d8ff4d] active:scale-95 shadow-[0_0_25px_rgba(200,241,53,0.3)] hover:shadow-[0_0_35px_rgba(200,241,53,0.5)]'
              }`}
              title="Generate speech audio"
            >
              {generating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-black" />
                  <span className="text-[11px] font-black">CREATING...</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <Music className="w-5 h-5 fill-black stroke-black" />
                    <span className="text-sm font-black tracking-tight">GENERATE</span>
                  </div>
                  <span className="text-[9px] font-mono tracking-widest bg-black/15 px-2 py-0.5 rounded-full font-bold">
                    {getEstimatedShorts()}⚡ SHORTS
                  </span>
                </>
              )}
            </button>

          </div>

        </div>
      </footer>

      {/* Full Settings Modal with Segregated Voices & Performance Tuning */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
            
            {/* Modal backdrop tap to close */}
            <div 
              className="absolute inset-0"
              onClick={() => setIsSettingsOpen(false)}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-3xl max-h-[85vh] bg-[#0f0f15] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
            >
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-zinc-950/60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#c8f135]/20 border border-[#c8f135]/30 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4 text-[#c8f135]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Voice Studio Settings</h3>
                    <p className="text-[10px] text-white/40">Select voices, models, and directorial performance controls</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Tabs inside Settings */}
              <div className="flex items-center border-b border-white/5 px-6 bg-black/40 gap-4">
                <button
                  onClick={() => setActiveSettingsTab('voice')}
                  className={`py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeSettingsTab === 'voice' 
                      ? 'border-[#c8f135] text-[#c8f135]' 
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Voices ({VOICES.length})</span>
                </button>

                <button
                  onClick={() => setActiveSettingsTab('director')}
                  className={`py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeSettingsTab === 'director' 
                      ? 'border-[#c8f135] text-[#c8f135]' 
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Director's Note</span>
                </button>

                <button
                  onClick={() => setActiveSettingsTab('model')}
                  className={`py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeSettingsTab === 'model' 
                      ? 'border-[#c8f135] text-[#c8f135]' 
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Audio Engine</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                
                {/* TAB 1: Voice Profiles with Female and Male Segregation */}
                {activeSettingsTab === 'voice' && (
                  <div className="space-y-4">
                    
                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      {/* Female / Male Filter Segment */}
                      <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10 text-xs font-bold w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setGenderFilter('all')}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            genderFilter === 'all' ? 'bg-[#c8f135] text-black shadow-sm font-black' : 'text-white/50 hover:text-white'
                          }`}
                        >
                          All ({VOICES.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setGenderFilter('Female')}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                            genderFilter === 'Female' ? 'bg-[#c8f135] text-black shadow-sm font-black' : 'text-white/50 hover:text-white'
                          }`}
                        >
                          <span>♀ Female</span>
                          <span className="text-[10px] opacity-70 font-mono">({femaleVoices.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGenderFilter('Male')}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                            genderFilter === 'Male' ? 'bg-[#c8f135] text-black shadow-sm font-black' : 'text-white/50 hover:text-white'
                          }`}
                        >
                          <span>♂ Male</span>
                          <span className="text-[10px] opacity-70 font-mono">({maleVoices.length})</span>
                        </button>
                      </div>

                      {/* Search input */}
                      <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search voices by name or pitch (e.g. Kore, Soft, Clear)..."
                          value={voiceSearchQuery}
                          onChange={(e) => setVoiceSearchQuery(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-[#c8f135]/50 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Voices Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                      {filteredVoices.map(v => {
                        const isSelected = v.name === voiceName;
                        const isPreviewPlaying = playingPreviewId === v.name;

                        return (
                          <div
                            key={v.name}
                            onClick={() => setVoiceName(v.name)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 group ${
                              isSelected 
                                ? 'bg-[#c8f135]/10 border-[#c8f135] shadow-[0_0_20px_rgba(200,241,53,0.15)]' 
                                : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                                isSelected ? 'bg-[#c8f135] text-black' : 'bg-white/5 text-white/60 group-hover:text-white'
                              }`}>
                                {isSelected ? <Check className="w-4 h-4 stroke-[3px]" /> : v.name.substring(0, 2).toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-black truncate ${isSelected ? 'text-[#c8f135]' : 'text-white'}`}>
                                    {v.name}
                                  </span>
                                  <span className={`text-[7.5px] font-mono px-1 py-0.2 rounded ${
                                    v.gender === 'Female' ? 'bg-pink-500/10 text-pink-300' : 'bg-blue-500/10 text-blue-300'
                                  }`}>
                                    {v.gender}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {v.tags.map(t => (
                                    <span key={t} className="text-[7.5px] bg-white/5 text-white/40 px-1 py-0.2 rounded-full">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Play Preview Button */}
                            <button
                              type="button"
                              onClick={(e) => playPreview(v.name, e)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                                isPreviewPlaying 
                                  ? 'bg-[#c8f135] text-black scale-105' 
                                  : 'bg-white/5 text-white/50 hover:bg-[#c8f135]/20 hover:text-[#c8f135]'
                              }`}
                              title={`Preview ${v.name}`}
                            >
                              {isPreviewPlaying ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3 fill-current ml-0.5" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 2: Director's Note */}
                {activeSettingsTab === 'director' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Style dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#c8f135]" /> Vocal Style
                        </label>
                        <select
                          value={selectedStyle}
                          onChange={(e) => setSelectedStyle(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#c8f135]/50 cursor-pointer font-bold"
                        >
                          {STYLES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        <p className="text-[9.5px] text-white/40 italic">
                          {STYLES.find(s => s.value === selectedStyle)?.desc}
                        </p>
                      </div>

                      {/* Pace dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#c8f135]" /> Speech Pace
                        </label>
                        <select
                          value={selectedPace}
                          onChange={(e) => setSelectedPace(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#c8f135]/50 cursor-pointer font-bold"
                        >
                          {PACES.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                        <p className="text-[9.5px] text-white/40 italic">
                          {PACES.find(p => p.value === selectedPace)?.desc}
                        </p>
                      </div>

                      {/* Accent dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-[#c8f135]" /> Vocal Accent
                        </label>
                        <select
                          value={selectedAccent}
                          onChange={(e) => setSelectedAccent(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#c8f135]/50 cursor-pointer font-bold"
                        >
                          {ACCENTS.map(a => (
                            <option key={a.value} value={a.value}>{a.label}</option>
                          ))}
                        </select>
                        <p className="text-[9.5px] text-white/40 italic">
                          {ACCENTS.find(a => a.value === selectedAccent)?.desc}
                        </p>
                      </div>

                      {/* Language dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-[#c8f135]" /> Target Language
                        </label>
                        <select
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#c8f135]/50 cursor-pointer font-bold"
                        >
                          {LANGUAGES.map(l => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                          ))}
                        </select>
                        <p className="text-[9.5px] text-white/40 italic">
                          {LANGUAGES.find(l => l.value === selectedLanguage)?.desc}
                        </p>
                      </div>

                    </div>
                  </div>
                )}

                {/* TAB 3: Model Engine */}
                {activeSettingsTab === 'model' && (
                  <div className="space-y-3">
                    <p className="text-xs text-white/50 leading-relaxed">
                      Choose which speech synthesis engine powers your voice generations:
                    </p>
                    <div className="grid grid-cols-1 gap-2.5">
                      {MODELS.map(m => {
                        const isSelected = m.id === model;
                        return (
                          <div
                            key={m.id}
                            onClick={() => setModel(m.id)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected 
                                ? 'bg-[#c8f135]/10 border-[#c8f135] shadow-[0_0_20px_rgba(200,241,53,0.12)]' 
                                : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-black ${isSelected ? 'text-[#c8f135]' : 'text-white'}`}>
                                  {m.label}
                                </span>
                                <span className="text-[8px] bg-white/10 text-white/70 px-1.5 py-0.2 rounded font-mono font-bold">
                                  {m.badge}
                                </span>
                              </div>
                              <p className="text-[10px] text-white/40">{m.desc}</p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-[#c8f135] stroke-[3px]" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-white/10 bg-zinc-950/60 flex items-center justify-between">
                <div className="text-[11px] text-white/50">
                  Active: <strong className="text-white">{currentVoiceObj.gender === 'Female' ? '♀' : '♂'} {voiceName}</strong> · <strong className="text-white">{selectedStyle}</strong> · <strong className="text-white">{selectedLanguage}</strong>
                </div>

                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#c8f135] hover:bg-[#d8ff4d] text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#c8f135]/20 active:scale-95"
                >
                  Done & Apply
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
