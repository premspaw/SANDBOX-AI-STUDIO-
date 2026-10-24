import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Bot,
  Cpu,
  Scissors,
  Check,
  AlertCircle,
  Loader2,
  Zap,
  Flame,
  Layers,
  Wand2,
  FileText,
  BookmarkCheck,
  ShieldAlert,
  UploadCloud,
  FileCheck,
} from 'lucide-react';
import { reelsApi } from '../services/reelsApi.js';

const AI_ENGINES = [
  {
    id: 'gemini',
    name: 'Gemini 4 Argon',
    provider: 'Google Vertex AI',
    desc: 'Google’s frontier model with multi-step reasoning, vision analysis & viral hook timing.',
    accent: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
    ring: 'ring-blue-500',
    iconColor: 'text-blue-400',
  },
  {
    id: 'openai',
    name: 'OpenAI GPT-4o',
    provider: 'OpenAI',
    desc: 'Top-tier conversion copywriting, retention pacing, and viral angles.',
    accent: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
    ring: 'ring-emerald-500',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'claude',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    desc: 'Elite storytelling nuance, editorial pacing, and structured value hooks.',
    accent: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
    ring: 'ring-amber-500',
    iconColor: 'text-amber-400',
  },
];

const STYLE_PRESETS = [
  {
    id: 'viral-hook',
    title: 'Viral Hook & High Retention',
    badge: 'Trending',
    desc: 'Instant 3-second scroll-stopper with high-contrast badge + retention captions.',
  },
  {
    id: 'hormozi',
    title: 'Hormozi Fast-Paced Kinetic',
    badge: 'Max Watch Time',
    desc: 'Bold yellow and black center titles driving fast pacing and dynamic rhythm.',
  },
  {
    id: 'educational',
    title: '3-Point Value Breakdown',
    badge: 'Educational',
    desc: 'Structured 01, 02, 03 cards for tutorials, tips, and step-by-step guides.',
  },
  {
    id: 'spotlight',
    title: 'Product & Feature Spotlight',
    badge: 'Showcase',
    desc: 'Neon Pro-Tip callouts highlighting killer specs and unique value props.',
  },
  {
    id: 'before-after',
    title: 'Before & After Transformation',
    badge: 'Results',
    desc: 'Comparison split cards highlighting the drama of transformation.',
  },
];

export function AiSmartEditModal({
  isOpen,
  onClose,
  projectId,
  onProjectUpdated,
}) {
  const [activeTab, setActiveTab] = useState('director'); // 'director' | 'script' | 'refs'
  const [selectedEngine, setSelectedEngine] = useState('gemini');
  const [selectedStyle, setSelectedStyle] = useState('viral-hook');
  const [removeGaps, setRemoveGaps] = useState(true);
  const [userPrompt, setUserPrompt] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [referenceNotes, setReferenceNotes] = useState('');
  const [proofNotes, setProofNotes] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStage, setProcessStage] = useState('');
  const [error, setError] = useState(null);
  const [paperEditResult, setPaperEditResult] = useState(null);

  if (!isOpen) return null;

  const handleStartAiEdit = async () => {
    setIsProcessing(true);
    setError(null);
    setProcessStage('Analyzing raw footage & scanning speech audio...');

    try {
      setTimeout(() => {
        setProcessStage(`Synthesizing edit with ${selectedEngine.toUpperCase()} & verbatim script...`);
      }, 800);

      const res = await reelsApi.applyAiEdit(projectId, {
        engine: selectedEngine,
        style: selectedStyle,
        removeGaps,
        userPrompt: userPrompt.trim(),
        scriptText: scriptText.trim(),
        referenceNotes: referenceNotes.trim(),
        proofNotes: proofNotes.trim(),
      });

      setProcessStage('Applying cinematic templates onto timeline...');
      setTimeout(() => {
        if (res.project) {
          onProjectUpdated(res.project);
        }
        setIsProcessing(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('AI Auto-Edit error:', err);
      setError(err.message || 'AI Auto-Edit failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleScriptFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setScriptText(String(event.target?.result || ''));
    };
    reader.readAsText(file);
  };

  const loadSampleHinglish = () => {
    setScriptText(
`aaj main tumhe dikhata hoon
ki ek reel ko 10 minute mein
kaise edit karwate hain
aur woh bhi bina template ke`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#c8f135]/10 rounded-full blur-3xl pointer-events-none" />

        {/* ── Modal Header ── */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-[#c8f135] flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Wand2 className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight uppercase italic">
                  AI Magic Reel Director
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300">
                  {selectedEngine.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Transform raw footage with multi-model AI, exact script matching, and gap cuts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Workflow Tabs ── */}
        <div className="px-6 py-2.5 border-b border-white/5 bg-zinc-900/40 flex items-center gap-2 z-10 shrink-0">
          <button
            onClick={() => setActiveTab('director')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'director'
                ? 'bg-white text-black shadow'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Director</span>
          </button>

          <button
            onClick={() => setActiveTab('script')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 relative ${
              activeTab === 'script'
                ? 'bg-white text-black shadow'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Spoken Script (script.txt)</span>
            {scriptText.trim() && (
              <span className="w-2 h-2 rounded-full bg-[#c8f135]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('refs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'refs'
                ? 'bg-white text-black shadow'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>Refs & Proof</span>
            {(referenceNotes.trim() || proofNotes.trim()) && (
              <span className="w-2 h-2 rounded-full bg-[#c8f135]" />
            )}
          </button>
        </div>

        {/* ── Modal Body Content ── */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 z-10">
          {activeTab === 'director' && (
            <>
              {/* Section 1: Choose AI Engine */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#c8f135]" />
                  <span>Choose AI Engine</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {AI_ENGINES.map((engine) => {
                    const isSelected = selectedEngine === engine.id;
                    return (
                      <div
                        key={engine.id}
                        onClick={() => !isProcessing && setSelectedEngine(engine.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? `${engine.accent} ring-2 ${engine.ring}`
                            : 'border-white/10 bg-zinc-900/40 hover:border-white/20 hover:bg-zinc-900/80'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">
                              {engine.provider}
                            </span>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-[#c8f135] text-black flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-white leading-tight">
                            {engine.name}
                          </h4>
                          <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2">
                            {engine.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Choose Style Preset */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Cinematic Style & Pacing</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STYLE_PRESETS.map((style) => {
                    const isSelected = selectedStyle === style.id;
                    return (
                      <div
                        key={style.id}
                        onClick={() => !isProcessing && setSelectedStyle(style.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'border-[#c8f135] bg-[#c8f135]/5 ring-1 ring-[#c8f135]'
                            : 'border-white/10 bg-zinc-900/30 hover:border-white/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">
                              {style.title}
                            </h4>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-zinc-300">
                              {style.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {style.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#c8f135] shrink-0 mt-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Silence Cut Switch */}
              <div
                onClick={() => !isProcessing && setRemoveGaps(!removeGaps)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/40 border border-white/10 hover:border-white/20 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      Auto-Cut Dead Air & Silences
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Acoustically removes boring pauses while keeping natural breath boundaries.
                    </p>
                  </div>
                </div>
                <div
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    removeGaps ? 'bg-[#c8f135]' : 'bg-zinc-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-black shadow-md transition-transform ${
                      removeGaps ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Section 4: Prompt */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                  <span>Director Prompt (Optional)</span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    High reasoning
                  </span>
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  disabled={isProcessing}
                  rows={2}
                  placeholder="E.g., Hook the viewer immediately, highlight the key metric at 10s, end with strong CTA to comment."
                  className="w-full bg-zinc-900/80 border border-white/10 focus:border-[#c8f135] rounded-xl p-3 text-xs text-white placeholder-zinc-500 outline-none resize-none transition-colors"
                />
              </div>
            </>
          )}

          {activeTab === 'script' && (
            <div className="space-y-4">
              {/* Alert: The Trap: Translated Captions */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    The Trap: Translated Captions
                  </p>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    Speech recognition often mishears slang and translates Hinglish into plain English.
                    Providing your <strong>script.txt</strong> ensures the AI times YOUR exact words to your voice without translating.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#c8f135]" />
                  <span>Exact Spoken Script (One Line Per Spoken Line)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadSampleHinglish}
                    className="text-[10px] font-semibold text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Load Sample Hinglish
                  </button>
                  <label className="text-[10px] font-semibold text-[#c8f135] px-2 py-1 rounded bg-[#c8f135]/10 hover:bg-[#c8f135]/20 cursor-pointer transition-colors flex items-center gap-1">
                    <UploadCloud className="w-3 h-3" />
                    <span>Upload script.txt</span>
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleScriptFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                disabled={isProcessing}
                rows={8}
                placeholder={`aaj main tumhe dikhata hoon\nki ek reel ko 10 minute mein\nkaise edit karwate hain\naur woh bhi bina template ke`}
                className="w-full bg-zinc-900 border border-white/10 focus:border-[#c8f135] rounded-2xl p-4 font-mono text-xs text-white placeholder-zinc-600 outline-none resize-none leading-relaxed"
              />

              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <FileCheck className="w-4 h-4 text-[#c8f135]" />
                <span>
                  Directive enabled: <em>"Captions are my words as spoken, from script.txt. Never translate them."</em>
                </span>
              </div>
            </div>
          )}

          {activeTab === 'refs' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                  <span>Reference Notes (from refs/)</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Show, do not describe</span>
                </label>
                <textarea
                  value={referenceNotes}
                  onChange={(e) => setReferenceNotes(e.target.value)}
                  disabled={isProcessing}
                  rows={3}
                  placeholder={`ref-a.mp4: take the caption style and the pace.\nref-b.mp4: take how the screenshots slide in over the speaker.`}
                  className="w-full bg-zinc-900 border border-white/10 focus:border-[#c8f135] rounded-2xl p-3 text-xs text-white placeholder-zinc-600 outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                  <span>Proof & Designed Pictures (from proof/)</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Real proof beats stock clips</span>
                </label>
                <textarea
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  disabled={isProcessing}
                  rows={3}
                  placeholder={`proof/: real dashboard revenue screenshot at 0:12, user testimonial post at 0:24. Lift them full width above the speaker.`}
                  className="w-full bg-zinc-900 border border-white/10 focus:border-[#c8f135] rounded-2xl p-3 text-xs text-white placeholder-zinc-600 outline-none resize-none"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 text-[11px] text-zinc-400 space-y-1">
                <p className="font-bold text-white">Rule: Every idea gets a designed picture</p>
                <p>
                  Avoid boring stock clips on every noun. The AI will place real proof callouts, kinetic typography, and motion badges instead.
                </p>
              </div>
            </div>
          )}

          {/* Processing State Indicator */}
          {isProcessing && (
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-3 animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin text-[#c8f135]" />
              <div className="text-xs">
                <p className="font-bold text-white">AI Director is executing round...</p>
                <p className="text-purple-300 text-[11px] font-mono">{processStage}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-white/10 bg-zinc-950 flex items-center justify-between z-10 shrink-0">
          <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-2">
            <span>Input: {scriptText.trim() ? 'script.txt active' : 'Raw Audio Voice'}</span>
            <span>•</span>
            <span>Engine: {selectedEngine.toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-semibold transition-colors disabled:opacity-30"
            >
              Cancel
            </button>

            <button
              onClick={handleStartAiEdit}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c8f135] to-emerald-400 text-black font-black text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#c8f135]/25 flex items-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Directing Reel...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Run AI Auto-Edit</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
