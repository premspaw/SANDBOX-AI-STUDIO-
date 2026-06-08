// ─── useUGCAudio ──────────────────────────────────────────────────────────────
// Manages audio generation state and the generateVoice() async function.
//
// Extracted from UGC.tsx — all audio-related useState and the generateVoice
// function are now co-located here. The hook returns everything consumers need.
//
// USAGE:
//   const {
//     audioData, audioUrl, isGeneratingAudio,
//     language, voice, generateVoice, toggleAudio, ...
//   } = useUGCAudio({ script, activeTab, ... });

import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../../../config/apiConfig';
import { createWavUrl } from '../utils/audioUtils';

// ── Dependency types (avoid circular imports) ─────────────────────────────────
interface TimelineItem {
  id: string;
  url: string;
  start: number;
  end: number;
  duration: number;
  type: 'video' | 'audio';
}

interface Scene {
  id: string;
  text?: string;
  prompt: string;
  isApproved: boolean;
  visualCue?: string;
  timestamp?: string;
  label?: string;
  image?: string;
}

interface UseUGCAudioOptions {
  /** Current script text (used to extract spoken dialog). */
  script: string;
  /** Active top-level tab — needed to toggle podcast vs single-voice mode. */
  activeTab: string;
  /** Podcast-specific metadata. */
  host1Voice: string;
  host2Voice: string;
  host1Name: string;
  host2Name: string;
  podcastScene: string;
  podcastDirectorNote: string;
  /** Callbacks to update external state. */
  setTimeline: (updater: (prev: TimelineItem[]) => TimelineItem[]) => void;
  setScenes: (updater: (prev: Scene[]) => Scene[]) => void;
  handleApiError: (e: any, context: string) => void;
}

export function useUGCAudio({
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
}: UseUGCAudioOptions) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [audioData, setAudioData] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('English');
  const [voice, setVoice] = useState('Kore');

  // Reset playback state whenever the audio URL changes
  useEffect(() => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsAudioPlaying(false);
    }
  }, [audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── generateVoice ──────────────────────────────────────────────────────────
  const generateVoice = useCallback(async () => {
    if (!script) return;
    setIsGeneratingAudio(true);
    try {
      const isPodcast = activeTab === 'podcast';
      const spokenText = isPodcast
        ? script.trim()
        : script.replace(/\[.*?\]/g, '').trim();

      const response = await fetch(getApiUrl('/api/ugc/speech'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isPodcast
            ? { text: spokenText, multiSpeaker: true, host1Voice, host2Voice, host1Name, host2Name, podcastScene, podcastDirectorNote }
            : { text: spokenText, voice }
        ),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => response.statusText);
        throw new Error(`Voice generation failed: ${response.status} — ${errBody}`);
      }

      const data = await response.json();
      const audioDataUrl: string = data.audio || '';
      const base64Audio = audioDataUrl.startsWith('data:')
        ? audioDataUrl.split(',')[1]
        : audioDataUrl;

      if (base64Audio) {
        setAudioData(base64Audio);
        const url = createWavUrl(base64Audio);
        setAudioUrl(url);

        const tempAudio = new Audio(url);
        tempAudio.onloadedmetadata = () => {
          const duration = tempAudio.duration;

          // Add audio track to timeline (replaces any previous audio track)
          const audioEntry: TimelineItem = {
            id: 'audio-' + Date.now(),
            url,
            start: 0,
            end: duration,
            duration,
            type: 'audio',
          };
          setTimeline(prev => {
            const filtered = prev.filter(t => t.type !== 'audio');
            return [audioEntry, ...filtered];
          });

          // Auto-extend scenes array to match audio duration (1 scene per 8s)
          const sceneCount = Math.ceil(duration / 8);
          setScenes(prev => {
            const next = [...prev];
            if (sceneCount > next.length) {
              for (let i = next.length; i < sceneCount; i++) {
                next.push({ id: (i + 1).toString(), prompt: '', isApproved: false });
              }
            }
            return next;
          });
        };
      }
    } catch (e) {
      handleApiError(e, 'Voice generation');
    }
    setIsGeneratingAudio(false);
  }, [script, activeTab, voice, host1Voice, host2Voice, host1Name, host2Name, podcastScene, podcastDirectorNote, setTimeline, setScenes, handleApiError]);

  // ── toggleAudio — play / pause current audioUrl ────────────────────────────
  const toggleAudio = useCallback(() => {
    if (!audioUrl) return;
    if (currentAudio) {
      if (isAudioPlaying) {
        currentAudio.pause();
        setIsAudioPlaying(false);
      } else {
        currentAudio.play().catch(err => console.error('Playback failed', err));
        setIsAudioPlaying(true);
      }
    } else {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsAudioPlaying(false);
      audio.play().catch(err => console.error('Playback failed', err));
      setCurrentAudio(audio);
      setIsAudioPlaying(true);
    }
  }, [audioUrl, currentAudio, isAudioPlaying]);

  return {
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
  };
}
