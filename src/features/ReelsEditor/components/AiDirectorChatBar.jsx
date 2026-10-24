import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Send,
  Check,
  AlertCircle,
  Loader2,
  Bot,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import { reelsApi } from '../services/reelsApi.js';

const QUICK_COMMANDS = [
  {
    label: '🔥 Viral Hook (0-3s)',
    prompt: 'Add a high-energy scroll-stopping viral hook in the first 3 seconds',
    style: 'viral-hook',
  },
  {
    label: '✂️ Auto-Cut Silences',
    prompt: 'Cut all dead pauses, acoustic silence gaps, and awkward breaths',
    style: 'viral-hook',
    removeGaps: true,
  },
  {
    label: '⚡ Hormozi Kinetic Captions',
    prompt: 'Add high-retention yellow/black Hormozi kinetic text overlays',
    style: 'hormozi',
  },
  {
    label: '🎯 Spotlight Pro Callout',
    prompt: 'Add neon green spotlight callout highlighting key pro tips',
    style: 'spotlight',
  },
  {
    label: '📊 3-Point List Breakdown',
    prompt: 'Structure the key points as 01, 02, 03 value cards',
    style: 'educational',
  },
  {
    label: '✨ Full Argon Magic Reel',
    prompt: 'Execute full director edit: cut all silence, craft viral opening hook, middle kinetic points, and closing CTA',
    style: 'viral-hook',
    removeGaps: true,
  },
];

export function AiDirectorChatBar({
  projectId,
  onProjectUpdated,
  onOpenFullModal,
}) {
  const [commandText, setCommandText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');
  const [notification, setNotification] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState('gemini');
  const [showEngineMenu, setShowEngineMenu] = useState(false);

  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize Web Speech API for voice dictation
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognizer = new SpeechRecognition();
      recognizer.continuous = false;
      recognizer.interimResults = true;
      recognizer.lang = 'en-US';

      recognizer.onstart = () => {
        setIsListening(true);
      };

      recognizer.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setCommandText(transcript);
        }
      };

      recognizer.onerror = (event) => {
        console.warn('[AI Bar Dictation Error]:', event.error);
        setIsListening(false);
      };

      recognizer.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognizer;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          // Cleanup speech recognition on unmount
          console.debug('Speech recognition cleanup:', err);
        }
      }
    };
  }, []);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      setNotification({
        type: 'info',
        message: 'Speech recognition is not supported in this browser. Please type your command.',
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setCommandText('');
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Speech start error:', err);
      }
    }
  };

  const handleRunCommand = async (overridePrompt = null, overrideOptions = {}) => {
    const promptToRun = (overridePrompt || commandText).trim();
    if (!promptToRun && !overrideOptions.removeGaps) {
      inputRef.current?.focus();
      return;
    }

    setIsProcessing(true);
    setProcessStatus('⚡ Gemini 4 Argon analyzing footage & acoustic speech...');
    setNotification(null);

    try {
      const isSilenceOnly = promptToRun.toLowerCase().includes('cut') && promptToRun.toLowerCase().includes('silence');
      const style = overrideOptions.style || (promptToRun.toLowerCase().includes('hormozi') ? 'hormozi' : 'viral-hook');
      const removeGaps = overrideOptions.removeGaps !== undefined ? overrideOptions.removeGaps : true;

      const res = await reelsApi.applyAiEdit(projectId, {
        engine: selectedEngine,
        style,
        removeGaps,
        userPrompt: promptToRun || 'Execute high-retention viral edit with hook and kinetic overlays.',
      });

      setProcessStatus('Applying cinematic motion overlays to timeline...');

      setTimeout(() => {
        if (res.project) {
          onProjectUpdated(res.project);
        }
        setIsProcessing(false);
        setCommandText('');
        setNotification({
          type: 'success',
          message: `✨ ${selectedEngine === 'gemini' ? 'Gemini 4 Argon' : selectedEngine.toUpperCase()} applied ${res.overlaysCount || 4} cinematic overlays!`,
        });
        setTimeout(() => setNotification(null), 5000);
      }, 400);
    } catch (err) {
      console.error('AI Command failed:', err);
      setIsProcessing(false);
      setNotification({
        type: 'error',
        message: err.message || 'AI Command execution failed. Please try again.',
      });
      setTimeout(() => setNotification(null), 6000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRunCommand();
    }
  };

  return (
    <div className="w-full bg-[#0a0a0c] border-t border-b border-white/10 px-4 py-2.5 z-30 shrink-0">
      {/* ── Status / Notification Bar (if active) ── */}
      {notification && (
        <div
          className={`mb-2 px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-[#c8f135]/15 border border-[#c8f135]/30 text-[#c8f135]'
              : notification.type === 'error'
              ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              : 'bg-zinc-800 border border-white/10 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <Check className="w-3.5 h-3.5" />}
            {notification.type === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-60 hover:opacity-100 ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Main Command Bar Row ── */}
      <div className="flex items-center gap-2">
        {/* Engine Badge / Selector Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowEngineMenu(!showEngineMenu)}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 hover:border-blue-400 text-xs font-black text-blue-300 hover:text-white transition-all group"
            title="Active AI Director Engine"
          >
            <Bot className="w-3.5 h-3.5 text-blue-400 group-hover:rotate-12 transition-transform" />
            <span className="tracking-tight hidden sm:inline">
              {selectedEngine === 'gemini'
                ? 'Gemini 4 Argon'
                : selectedEngine === 'openai'
                ? 'OpenAI GPT-4o'
                : 'Claude 3.5'}
            </span>
            <span className="tracking-tight sm:hidden">Argon 4</span>
            <ChevronDown className="w-3 h-3 text-blue-400/80" />
          </button>

          {showEngineMenu && (
            <div className="absolute bottom-full left-0 mb-1.5 w-60 rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl p-1.5 z-50">
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Directing Engine
              </div>
              <button
                onClick={() => {
                  setSelectedEngine('gemini');
                  setShowEngineMenu(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                  selectedEngine === 'gemini'
                    ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30'
                    : 'text-zinc-300 hover:bg-white/5'
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span>Gemini 4 Argon</span>
                    <span className="text-[9px] bg-blue-500/30 text-blue-200 px-1.5 py-0.2 rounded font-mono">
                      Vertex AI
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-normal">
                    Frontier reasoning & vision
                  </div>
                </div>
                {selectedEngine === 'gemini' && <Check className="w-3.5 h-3.5 text-blue-400" />}
              </button>

              <button
                onClick={() => {
                  setSelectedEngine('openai');
                  setShowEngineMenu(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                  selectedEngine === 'openai'
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                    : 'text-zinc-300 hover:bg-white/5'
                }`}
              >
                <div>
                  <div className="font-bold">OpenAI GPT-4o</div>
                  <div className="text-[10px] text-zinc-500 font-normal">
                    High precision hook copy
                  </div>
                </div>
                {selectedEngine === 'openai' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </button>

              <button
                onClick={() => {
                  setSelectedEngine('claude');
                  setShowEngineMenu(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                  selectedEngine === 'claude'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-zinc-300 hover:bg-white/5'
                }`}
              >
                <div>
                  <div className="font-bold">Claude 3.5 Sonnet</div>
                  <div className="text-[10px] text-zinc-500 font-normal">
                    Elite storytelling & nuance
                  </div>
                </div>
                {selectedEngine === 'claude' && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            </div>
          )}
        </div>

        {/* Voice Dictation Button (Microphone) */}
        <button
          onClick={toggleListening}
          disabled={isProcessing}
          className={`relative p-2.5 rounded-xl border transition-all shrink-0 ${
            isListening
              ? 'bg-rose-500 border-rose-400 text-white animate-pulse shadow-lg shadow-rose-500/40'
              : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-zinc-400 hover:text-white'
          }`}
          title={isListening ? 'Listening to your voice... click to stop' : 'Speak AI Command (Voice Dictation)'}
        >
          {isListening ? (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <Mic className="w-4 h-4" />
            </div>
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        {/* Command Input Box */}
        <div className="flex-1 relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder={
              isListening
                ? '🎙️ Listening... speak your editing command now...'
                : 'Command Gemini 4 Argon: "Cut silences & add a viral hook in first 3s"...'
            }
            className="w-full bg-zinc-900/90 border border-white/10 focus:border-[#c8f135] focus:bg-zinc-900 rounded-xl pl-3.5 pr-20 py-2 text-xs text-white placeholder-zinc-500 outline-none transition-all"
          />

          {/* Run Command Button */}
          <div className="absolute right-1.5 flex items-center gap-1">
            <button
              onClick={() => handleRunCommand()}
              disabled={isProcessing || (!commandText.trim() && !isListening)}
              className="px-3 py-1.5 rounded-lg bg-[#c8f135] hover:bg-[#b8e125] active:scale-95 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-[#c8f135]/20"
              title="Run AI Edit Command (Enter)"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Editing...</span>
                </>
              ) : (
                <>
                  <span>Run</span>
                  <Send className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Full Director Modal Link */}
        <button
          onClick={onOpenFullModal}
          disabled={isProcessing}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors shrink-0"
          title="Open Full Director Studio (Script.txt, Reference Edits, Proof Notes)"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* ── Processing Indicator ── */}
      {isProcessing && (
        <div className="mt-2 flex items-center gap-2 text-xs font-mono text-[#c8f135] bg-[#c8f135]/10 border border-[#c8f135]/20 px-3 py-1.5 rounded-xl">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span className="truncate">{processStatus || 'AI Director at work...'}</span>
        </div>
      )}

      {/* ── Quick Command Pills (1-Click Run) ── */}
      <div className="mt-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest shrink-0 pl-0.5">
          Quick Actions:
        </span>
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd.label}
            onClick={() => handleRunCommand(cmd.prompt, { style: cmd.style, removeGaps: cmd.removeGaps })}
            disabled={isProcessing}
            className="px-2.5 py-1 rounded-lg bg-zinc-900/80 hover:bg-white/10 border border-white/5 hover:border-white/20 text-[11px] font-semibold text-zinc-300 hover:text-white whitespace-nowrap transition-all shrink-0 active:scale-95"
          >
            {cmd.label}
          </button>
        ))}
      </div>
    </div>
  );
}
