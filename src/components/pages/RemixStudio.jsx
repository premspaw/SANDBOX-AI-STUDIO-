import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowsClockwise, 
  Sparkle, 
  VideoCamera, 
  UploadSimple, 
  Play, 
  Pause, 
  Lightning, 
  Coins, 
  CheckCircle, 
  WarningCircle, 
  Info, 
  DownloadSimple, 
  ShareNetwork,
  FilmSlate,
  Clock,
  Plus,
  Trash,
  LinkSimple,
  Copy,
  MagicWand,
  Package,
  Watch,
  Cube,
  Tag as TagIcon,
  Image as ImageIcon,
  FolderOpen,
  MusicNotes,
  FilmStrip,
  X,
  CaretDown,
  CaretLeft,
  CaretRight,
  PencilSimple,
  UserFocus,
  SlidersHorizontal,
  User,
  Check
} from '@phosphor-icons/react';
import { useAppStore } from '../../store';
import { useShorts } from '../../hooks/useShorts';
import { SHORTS_COST } from '../../config/shortsConfig';
import { AssetsLibrary } from '../panels/AssetsLibrary';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { sanitizeUserErrorMessage } from '../../utils/errorSanitizer';

// Normalizes image and video preview URLs, ensuring images mistakenly stored with .mp4 or CDN MIME quirks render reliably across mobile Safari & Chrome
const getMediaPreviewUrl = (url, isImage = false) => {
  if (!url || typeof url !== 'string') return '';
  if (isImage && (url.endsWith('.mp4') || url.includes('/veo_ai_influencer_') || url.includes('mode=ai-influencer'))) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}&as=image`;
  }
  return url;
};

export default function RemixStudio({ initialMode = 'motion-transfer' }) {
  // Mode: 'motion-transfer' | 'object-swap' | 'ai-influencer'
  const [activeMode, setActiveMode] = useState(
    initialMode === 'ai-influencer' || initialMode === 'remixnfluencer' || initialMode === 'creator-influencer'
      ? 'ai-influencer'
      : initialMode === 'object-swap'
      ? 'object-swap'
      : 'motion-transfer'
  );

  const defaultMotionPrompt = 'Transform the subject from Image 1 with cinematic lighting, dynamic styling and high-end aesthetic fidelity while preserving the exact motion from driving video';
  const defaultSwapPrompt = 'Swap the target object in the video with the reference item from Image 1, preserving flawless lighting, depth, and motion dynamics.';
  const defaultInfluencerBrief = 'High-end aesthetic character sheet, studio lighting, crisp 2K resolution close-up and full body view';

  const [prompt, setPrompt] = useState(initialMode === 'object-swap' ? defaultSwapPrompt : defaultMotionPrompt);
  const [resolution, setResolution] = useState('720p');
  const [mobileTab, setMobileTab] = useState('controls'); // 'controls' | 'gallery'
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Media State
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');

  // Array of { id, url, tag: 'Image 1', token: '@image1', name: string }
  const [referenceImages, setReferenceImages] = useState([]); 

  // AI Influencer Specific State
  const [aiTier, setAiTier] = useState('normal'); // 'normal' | 'freak' | 'total' | 'cats' | 'dogs' | 'capybaras' | 'birds' | 'insects' | 'frogs'
  const [aiBrief, setAiBrief] = useState(defaultInfluencerBrief);
  const [aiIdentityPhoto, setAiIdentityPhoto] = useState('');
  const [aiItemImages, setAiItemImages] = useState([]); // Array of strings (up to 3)
  const [aiSelection, setAiSelection] = useState({}); // { categoryKey: [optionKey, ...] }
  const [aiSeed, setAiSeed] = useState('');
  const [aiVariationIndex, setAiVariationIndex] = useState(0);
  const [aiBodyColor, setAiBodyColor] = useState('#D9A066');
  const [aiPinnedSpecies, setAiPinnedSpecies] = useState('');
  const [optionsCatalog, setOptionsCatalog] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [activeCatalogCategory, setActiveCatalogCategory] = useState(null);

  // Gallery Picker State
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState('image'); // 'image' | 'video' | 'ai-identity' | 'ai-item'

  // Autocomplete Mentions Query State (@image1, @video1, etc.)
  const [mentionSearch, setMentionSearch] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);

  // Generation & Progress State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedResult, setGeneratedResult] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'ai-influencer' | 'motion-transfer' | 'object-swap'
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const [videoDuration, setVideoDuration] = useState(5);

  const fileInputVideoRef = useRef(null);
  const fileInputImageRef = useRef(null);
  const fileInputIdentityRef = useRef(null);
  const fileInputItemRef = useRef(null);
  const promptTextareaRef = useRef(null);
  const galleryScrollRef = useRef(null);

  const scrollGallery = (direction) => {
    if (galleryScrollRef.current) {
      const scrollAmount = 300;
      galleryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const { shorts, spend, refund, canAfford } = useShorts();
  const userProfile = useAppStore(state => state.userProfile);

  const isSwapMode = activeMode === 'object-swap';
  const isInfluencerMode = activeMode === 'ai-influencer';

  const ratePerSec = resolution === '480p' ? 18 : resolution === '1080p' ? 89 : 44;
  const effectiveDuration = Math.max(1, Math.round(videoDuration || 5));
  
  // Cost: AI Influencer = 6 Shorts (₹6 / $0.065)
  const costAmount = isInfluencerMode 
    ? 6 
    : isSwapMode 
    ? ratePerSec * effectiveDuration 
    : ratePerSec * effectiveDuration;
  
  const costKey = isInfluencerMode 
    ? 'ai_influencer' 
    : isSwapMode 
    ? `object_swap_${resolution}` 
    : `remix_motion_transfer_${resolution}`;

  // Persistent History Load on Mount + Database Sync
  useEffect(() => {
    let isMounted = true;

    // 1. Instant local restore
    try {
      const saved = localStorage.getItem('remix_studio_history_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.map(item => {
            const isInf = item.mode === 'ai-influencer' || item.type === 'image';
            return {
              ...item,
              type: isInf ? 'image' : (item.type || 'video'),
              url: getMediaPreviewUrl(item.url, isInf)
            };
          });
          setHistoryList(sanitized);
          setGeneratedResult(prev => prev || sanitized[0]);
        }
      }
    } catch (err) {
      console.warn('[RemixStudio] Failed to load local history:', err);
    }

    // 2. Fetch authenticated user's remix records from database
    if (userProfile?.id && userProfile.id !== 'anonymous' && supabase) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('assets')
            .select('*')
            .eq('user_id', userProfile.id)
            .order('created_at', { ascending: false })
            .limit(60);

          if (!error && Array.isArray(data) && isMounted) {
            const dbItems = data.filter(a => {
              const mode = a.metadata?.mode;
              const nameLower = (a.name || '').toLowerCase();
              return mode === 'ai-influencer' || mode === 'object-swap' || mode === 'motion-transfer' ||
                nameLower.includes('influencer') || nameLower.includes('motion remix') || nameLower.includes('object swap');
            }).map(a => {
              const isInf = a.metadata?.mode === 'ai-influencer' || a.type === 'image' || (a.name || '').toLowerCase().includes('influencer');
              return {
                id: a.id,
                mode: a.metadata?.mode || (isInf ? 'ai-influencer' : 'motion-transfer'),
                type: isInf ? 'image' : 'video',
                prompt: a.metadata?.prompt || a.name || 'Remix Generation',
                resolution: a.metadata?.resolution || (isInf ? '2K Sheet' : '720p'),
                url: getMediaPreviewUrl(a.url, isInf),
                zipUrl: a.metadata?.zipUrl || null,
                movUrl: a.metadata?.movUrl || null,
                jsxUrl: a.metadata?.jsxUrl || null,
                fbxUrl: a.metadata?.fbxUrl || null,
                plyUrl: a.metadata?.plyUrl || null,
                createdAt: a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
                meta: a.metadata || {}
              };
            });

            if (dbItems.length > 0) {
              setHistoryList(prev => {
                const map = new Map();
                // Add db items first
                dbItems.forEach(item => map.set(item.url, item));
                prev.forEach(item => {
                  if (!map.has(item.url)) map.set(item.url, item);
                });
                const merged = Array.from(map.values());
                try {
                  localStorage.setItem('remix_studio_history_v1', JSON.stringify(merged.slice(0, 60)));
                } catch (cacheErr) {
                  console.warn('[RemixStudio] Failed to cache merged history:', cacheErr);
                }
                return merged;
              });
              setGeneratedResult(prev => prev || dbItems[0]);
            }
          }
        } catch (dbErr) {
          console.warn('[RemixStudio] DB history load failed:', dbErr);
        }
      })();
    }

    return () => {
      isMounted = false;
    };
  }, [userProfile?.id]);

  // Helper to persist new generation into state and localStorage
  const saveToStudioHistory = (newItem) => {
    setHistoryList(prev => {
      const updated = [newItem, ...prev.filter(item => item.id !== newItem.id && item.url !== newItem.url)];
      try {
        localStorage.setItem('remix_studio_history_v1', JSON.stringify(updated.slice(0, 60)));
      } catch (err) {
        console.warn('[RemixStudio] Failed to save history to localStorage:', err);
      }
      return updated;
    });
  };

  const handleDeleteHistoryItem = (id, e) => {
    if (e) e.stopPropagation();
    setHistoryList(prev => {
      const updated = prev.filter(item => item.id !== id);
      try {
        localStorage.setItem('remix_studio_history_v1', JSON.stringify(updated));
      } catch (err) {
        console.warn('[RemixStudio] Failed to update localStorage history on delete:', err);
      }
      if (generatedResult?.id === id) {
        setGeneratedResult(updated[0] || null);
      }
      return updated;
    });

    if (supabase && id && typeof id === 'string' && !id.startsWith('influencer-') && !id.startsWith('swap-') && !id.startsWith('remix-')) {
      supabase.from('assets').delete().eq('id', id).catch(err => {
        console.warn('[RemixStudio] DB delete warning:', err);
      });
    }
  };

  // Fetch Options Catalog for AI Influencer
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      setIsLoadingOptions(true);
      try {
        const resp = await fetch('/api/remix/ai-influencer/options');
        const data = await resp.json();
        if (isMounted && data.success && data.catalog?.categories) {
          setOptionsCatalog(data.catalog.categories);
          if (data.catalog.categories.length > 0) {
            setActiveCatalogCategory(data.catalog.categories[0].key);
          }
        }
      } catch (err) {
        console.warn('[RemixStudio] Failed to load options catalog:', err);
      } finally {
        if (isMounted) setIsLoadingOptions(false);
      }
    };
    fetchCatalog();
    return () => { isMounted = false; };
  }, []);

  // Switch Mode handler
  const handleModeChange = (mode) => {
    setActiveMode(mode);
    setErrorMessage('');
    if (mode === 'object-swap') {
      if (prompt === defaultMotionPrompt || !prompt.trim()) {
        setPrompt(defaultSwapPrompt);
      }
    } else if (mode === 'motion-transfer') {
      if (prompt === defaultSwapPrompt || !prompt.trim()) {
        setPrompt(defaultMotionPrompt);
      }
    }
  };

  // Convert File to Base64 Data URL
  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Probe Video Duration in seconds
  const probeVideoDuration = (dataUrlOrBlob) => {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        const dur = v.duration && !isNaN(v.duration) ? Math.round(v.duration) : 5;
        resolve(Math.max(1, dur));
      };
      v.onerror = () => resolve(5);
      v.src = dataUrlOrBlob;
    });
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const dataUrl = await fileToDataUrl(file);
      setVideoPreview(dataUrl);
      const dur = await probeVideoDuration(dataUrl);
      setVideoDuration(dur);
      setErrorMessage('');
    }
  };

  // Add references with strict sequential tagging: Image 1, Image 2, etc.
  const addImagesWithTags = (urls) => {
    setReferenceImages(prev => {
      const newRefs = [...prev];
      for (const item of urls) {
        if (newRefs.length >= 8) break;
        const currentIdx = newRefs.length + 1;
        const urlStr = typeof item === 'string' ? item : item.url;
        newRefs.push({
          id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url: urlStr,
          tag: `Image ${currentIdx}`,
          token: `@image${currentIdx}`,
          name: typeof item === 'object' && item.name ? item.name : `Image ${currentIdx}`
        });
      }
      return newRefs;
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (referenceImages.length + files.length > 8) {
        setErrorMessage('Maximum 8 reference images allowed.');
        return;
      }
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      addImagesWithTags(dataUrls);
      setErrorMessage('');
    }
  };

  const handleIdentityPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await fileToDataUrl(file);
      setAiIdentityPhoto(dataUrl);
      setErrorMessage('');
    }
  };

  const handleItemImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (aiItemImages.length + files.length > 3) {
        setErrorMessage('Maximum 3 item/clothing reference images allowed.');
        return;
      }
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      setAiItemImages(prev => [...prev, ...dataUrls].slice(0, 3));
      setErrorMessage('');
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setReferenceImages(prev => {
      const filtered = prev.filter((_, idx) => idx !== indexToRemove);
      return filtered.map((img, idx) => ({
        ...img,
        tag: `Image ${idx + 1}`,
        token: `@image${idx + 1}`
      }));
    });
  };

  // Toggle selection option for AI Influencer
  const toggleAiOption = (catKey, optionKey, maxAllowed = 1) => {
    setAiSelection(prev => {
      const currentArr = prev[catKey] || [];
      const isSelected = currentArr.includes(optionKey);

      if (isSelected) {
        const nextArr = currentArr.filter(k => k !== optionKey);
        const nextObj = { ...prev };
        if (nextArr.length > 0) {
          nextObj[catKey] = nextArr;
        } else {
          delete nextObj[catKey];
        }
        return nextObj;
      }

      if (maxAllowed === 1) {
        return { ...prev, [catKey]: [optionKey] };
      }

      const nextArr = [...currentArr, optionKey].slice(0, maxAllowed);
      return { ...prev, [catKey]: nextArr };
    });
  };

  // Active mention slots
  const activeMentionSlots = useMemo(() => {
    const slots = [];
    referenceImages.forEach((img, idx) => {
      slots.push({
        id: img.id || `ref_${idx}`,
        name: `image${idx + 1}`,
        token: `@image${idx + 1}`,
        tag: `Image ${idx + 1}`,
        label: `Image ${idx + 1}`,
        desc: img.name || `Reference Image ${idx + 1}`,
        url: img.url,
        type: 'image'
      });
    });
    if (videoPreview) {
      slots.push({
        id: 'slot_video',
        name: 'video1',
        token: '@video1',
        tag: isSwapMode ? 'Scene Video' : 'Driving Video',
        label: isSwapMode ? 'Scene Video' : 'Driving Video',
        desc: isSwapMode ? 'Source Scene Video' : 'Source Motion Video',
        url: videoPreview,
        type: 'video'
      });
    }
    return slots;
  }, [referenceImages, videoPreview, isSwapMode]);

  const filteredMentionSlots = useMemo(() => {
    if (mentionSearch === null) return [];
    const q = mentionSearch.trim().toLowerCase();
    if (!q) return activeMentionSlots;
    return activeMentionSlots.filter(s => 
      s.token.toLowerCase().includes(q) || 
      s.name.toLowerCase().includes(q) || 
      s.tag.toLowerCase().includes(q)
    );
  }, [activeMentionSlots, mentionSearch]);

  const handlePromptChange = (e) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart || 0;
    setPrompt(val);

    const match = val.slice(0, cursor).match(/@([\w_]*)$/);
    if (match) {
      setMentionSearch(match[1].toLowerCase());
      setMentionCursorPos(cursor);
      setMentionIndex(0);
    } else {
      setMentionSearch(null);
    }
  };

  const handlePromptInput = (e) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(Math.max(target.scrollHeight, 72), 240)}px`;
    handlePromptChange(e);
  };

  const selectMentionSlot = (slot) => {
    const textarea = promptTextareaRef.current;
    const text = prompt;
    const cursor = mentionCursorPos || (textarea ? textarea.selectionStart : text.length);
    const before = text.slice(0, cursor).replace(/@[\w_]*$/, '');
    const after = text.slice(cursor);
    const tagText = `${slot.tag} `;
    const newText = `${before}${tagText}${after}`;
    const nextCursor = before.length + tagText.length;

    setPrompt(newText);
    setMentionSearch(null);

    setTimeout(() => {
      if (promptTextareaRef.current) {
        promptTextareaRef.current.focus();
        promptTextareaRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    }, 50);
  };

  const handlePromptKeyDown = (e) => {
    if (mentionSearch !== null && filteredMentionSlots.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredMentionSlots.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredMentionSlots.length) % filteredMentionSlots.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectMentionSlot(filteredMentionSlots[mentionIndex] || filteredMentionSlots[0]);
      } else if (e.key === 'Escape') {
        setMentionSearch(null);
      }
    }
  };

  const insertTagIntoPrompt = (tagStr) => {
    const textarea = promptTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || prompt.length;
      const end = textarea.selectionEnd || prompt.length;
      const newPrompt = prompt.substring(0, start) + ` ${tagStr} ` + prompt.substring(end);
      setPrompt(newPrompt.replace(/\s+/g, ' '));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tagStr.length + 2, start + tagStr.length + 2);
      }, 50);
    } else {
      setPrompt(prev => `${prev} ${tagStr}`.trim());
    }
  };

  const handleGallerySelect = async (url, item) => {
    if (galleryTarget === 'video') {
      setVideoPreview(url);
      setVideoFile(null);
      const dur = item?.duration ? Math.round(Number(item.duration)) : await probeVideoDuration(url);
      setVideoDuration(dur || 5);
    } else if (galleryTarget === 'ai-identity') {
      setAiIdentityPhoto(url);
    } else if (galleryTarget === 'ai-item') {
      setAiItemImages(prev => [...prev, url].slice(0, 3));
    } else {
      addImagesWithTags([{ url, name: item?.name || 'Gallery Asset' }]);
    }
    setShowGalleryModal(false);
    setErrorMessage('');
  };

  // Resilient Remix Status Polling Helper (tolerates upstream delay & network glitches up to ~17 mins)
  const pollRemixStatus = async (requestId, { mode = 'motion-transfer', onProgress } = {}) => {
    for (let attempt = 0; attempt < 250; attempt++) {
      await new Promise(r => setTimeout(r, 4000));
      try {
        const resp = await fetch(`/api/remix/status/${requestId}`);
        if (!resp.ok) {
          console.warn(`[RemixStudio Poll] HTTP ${resp.status}, continuing to wait...`);
          continue;
        }
        const data = await resp.json();
        if (data.status === 'completed') {
          return data;
        }
        if (data.status === 'failed') {
          throw new Error(data.error || 'Generation could not be completed.');
        }
        if (data.status === 'nsfw') {
          throw new Error(data.error || '⚠️ Content Safety Policy Restriction: Generation flagged by safety filter.');
        }
        if (typeof onProgress === 'function') {
          onProgress(data.progress, attempt);
        }
      } catch (pollErr) {
        if (pollErr.message && (
          pollErr.message.includes('failed') || 
          pollErr.message.includes('Safety') || 
          pollErr.message.includes('policy') || 
          pollErr.message.includes('nsfw')
        )) {
          throw pollErr;
        }
        console.warn(`[RemixStudio Poll] Transient notice for ${requestId}:`, pollErr.message);
      }
    }
    throw new Error('Generation is taking longer than expected. Please check your Studio Gallery in a few minutes or contact support@zerolens.in.');
  };

  // Execute Generation
  const handleStartGeneration = async () => {
    if (isGenerating) return;
    setErrorMessage('');

    // AI Influencer Mode Generation (6 Shorts cost)
    if (isInfluencerMode) {
      if (!canAfford('ai_influencer', 6)) {
        setErrorMessage('Insufficient Shorts balance. You need 6 Shorts (₹6 · $0.065) for AI Influencer Character Sheet generation.');
        return;
      }

      const spendRes = await spend('ai_influencer', 6);
      if (!spendRes.success) {
        setErrorMessage('Failed to deduct credits. Please check your Shorts balance.');
        return;
      }

      setIsGenerating(true);
      if (isMobile) setMobileTab('gallery');
      setGenerationProgress(10);
      setStatusMessage('Forging AI Influencer Character Sheet...');

      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 92) return 92;
          if (prev < 30) setStatusMessage('Analyzing character options & identity embeddings...');
          else if (prev < 60) setStatusMessage('Synthesizing 2K portrait & full-body view...');
          else setStatusMessage('Rendering high-fidelity textures & lighting...');
          return prev + Math.floor(Math.random() * 8 + 5);
        });
      }, 1600);

      try {
        const response = await fetch('/api/remix/ai-influencer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userProfile?.id || 'anonymous'
          },
          body: JSON.stringify({
            tier: aiTier,
            brief: aiBrief,
            image_url: aiIdentityPhoto || null,
            item_image_urls: aiItemImages,
            selection: aiSelection,
            seed: aiSeed ? Number(aiSeed) : null,
            variation_index: Number(aiVariationIndex || 0),
            body_color: aiBodyColor || null,
            pinned_species: aiPinnedSpecies || null,
            userId: userProfile?.id
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to complete AI Influencer character sheet generation.');
        }

        let finalData = data;
        if (data.status === 'processing' && data.requestId) {
          finalData = await pollRemixStatus(data.requestId, {
            mode: 'ai-influencer',
            onProgress: (p, attempt) => {
              const elapsed = (attempt + 1) * 4;
              setStatusMessage(`Synthesizing 2K character sheet... (${elapsed}s)`);
            }
          });
        }

        clearInterval(progressInterval);
        setGenerationProgress(100);
        setStatusMessage('AI Influencer Character Sheet Complete!');

        const newItem = {
          id: finalData.requestId || `influencer-${Date.now()}`,
          mode: 'ai-influencer',
          type: 'image',
          prompt: aiBrief || `${aiTier} Character Sheet`,
          url: finalData.imageUrl || finalData.originalUrl || finalData.url,
          images: finalData.images || [{ url: finalData.imageUrl || finalData.url }],
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          meta: finalData.meta || {}
        };

        setGeneratedResult(newItem);
        saveToStudioHistory(newItem);

        // Sync to unified studio store and project vault
        try {
          useAppStore.getState().addUnifiedAsset({
            id: newItem.id,
            type: 'image',
            url: newItem.url,
            thumbUrl: newItem.url,
            prompt: newItem.prompt,
            name: `AI Influencer: ${newItem.prompt.substring(0, 50)}`,
            engine: 'AI Influencer Pro',
            resolution: '2K',
            aspectRatio: '16:9',
            folder: 'remix',
            category: 'influencer'
          });
        } catch (storeErr) {
          console.warn('[RemixStudio] Failed to add to unified store:', storeErr);
        }

        // Direct client database backup sync
        if (supabase && userProfile?.id && userProfile.id !== 'anonymous') {
          supabase.from('assets').insert([{
            user_id: userProfile.id,
            type: 'image',
            url: newItem.url,
            name: `AI Influencer: ${newItem.prompt.substring(0, 50)}`,
            metadata: {
              engine: 'AI Influencer Pro',
              mode: 'ai-influencer',
              tier: aiTier,
              prompt: newItem.prompt,
              resolution: '2K Sheet',
              selection: aiSelection
            }
          }]).then(({ error }) => {
            if (error) console.warn('[RemixStudio] Supabase image insert notice:', error.message);
          });
        }

        setIsGenerating(false);

      } catch (err) {
        console.error('[RemixStudio] AI Influencer error:', err);
        clearInterval(progressInterval);
        setIsGenerating(false);
        setErrorMessage(sanitizeUserErrorMessage(err, 'AI Influencer'));
        await refund('ai_influencer', 6);
      }
      return;
    }

    // Motion Transfer / Object Swap Generation
    const sourceVideo = videoPreview;
    if (!sourceVideo) {
      setErrorMessage(`Please add a reference video.`);
      return;
    }

    if (referenceImages.length === 0) {
      setErrorMessage(`Please add at least 1 character, product, or style reference image.`);
      return;
    }

    if (!canAfford(costKey, costAmount)) {
      setErrorMessage(`Insufficient Shorts balance. You need ${costAmount} Shorts (${ratePerSec} Shorts/s × ${effectiveDuration}s) for ${resolution} ${isSwapMode ? 'Object Swap' : 'Motion Remix'}.`);
      return;
    }

    const spendRes = await spend(costKey, costAmount);
    if (!spendRes.success) {
      setErrorMessage('Failed to deduct credits. Please check your Shorts balance.');
      return;
    }

    setIsGenerating(true);
    if (isMobile) setMobileTab('gallery');
    setGenerationProgress(10);
    setStatusMessage(isSwapMode ? 'Initiating Genjutsu Object Swap Engine...' : 'Initiating Genjutsu Motion Transfer Engine...');

    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 92) return 92;
        if (isSwapMode) {
          if (prev < 30) setStatusMessage('Analyzing Scene Geometry & Tracking Objects...');
          else if (prev < 55) setStatusMessage('Segmenting Target Items & Boundaries...');
          else if (prev < 78) setStatusMessage('Neural Inpainting & Object Material Swap...');
          else setStatusMessage('Synthesizing Motion Consistency & Reflections...');
        } else {
          if (prev < 30) setStatusMessage('Uploading & Analyzing Source Motion DNA...');
          else if (prev < 60) setStatusMessage('Mapping Character References...');
          else setStatusMessage('Synthesizing Neural Motion Transfer Layers...');
        }
        return prev + Math.floor(Math.random() * 8 + 4);
      });
    }, 1800);

    const endpoint = isSwapMode ? '/api/remix/object-swap' : '/api/remix/motion-transfer';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userProfile?.id || 'anonymous'
        },
        body: JSON.stringify({
          prompt,
          video_url: sourceVideo,
          image_urls: referenceImages.map(img => img.url),
          referenceImages: referenceImages.map(img => ({ tag: img.tag, token: img.token, url: img.url })),
          resolution,
          userId: userProfile?.id
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to complete ${isSwapMode ? 'Object Swap' : 'Motion Remix'}.`);
      }

      let finalData = data;
      if (data.status === 'processing' && data.requestId) {
        finalData = await pollRemixStatus(data.requestId, {
          mode: isSwapMode ? 'object-swap' : 'motion-transfer',
          onProgress: (p, attempt) => {
            const elapsed = (attempt + 1) * 4;
            if (isSwapMode) {
              setStatusMessage(`Synthesizing Object Swap & Neural Inpainting... (${elapsed}s)`);
            } else {
              setStatusMessage(`Synthesizing Neural Motion Transfer Layers... (${elapsed}s)`);
            }
          }
        });
      }

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setStatusMessage(`${isSwapMode ? 'Object Swap' : 'Motion Remix'} Synthesis Complete!`);

      const newItem = {
        id: finalData.requestId || `${isSwapMode ? 'swap' : 'remix'}-${Date.now()}`,
        mode: activeMode,
        type: 'video',
        prompt,
        resolution,
        url: finalData.videoUrl || finalData.originalUrl || finalData.url,
        zipUrl: finalData.zipUrl,
        movUrl: finalData.movUrl,
        jsxUrl: finalData.jsxUrl,
        fbxUrl: finalData.fbxUrl,
        plyUrl: finalData.plyUrl,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setGeneratedResult(newItem);
      saveToStudioHistory(newItem);

      // Sync to unified studio store and project vault
      try {
        useAppStore.getState().addUnifiedAsset({
          id: newItem.id,
          type: 'video',
          url: newItem.url,
          thumbUrl: newItem.url,
          prompt: newItem.prompt,
          name: `${isSwapMode ? 'Object Swap' : 'Motion Remix'}: ${newItem.prompt.substring(0, 50)}`,
          engine: isSwapMode ? 'Object Swap Pro' : 'Motion Transfer Pro',
          resolution: newItem.resolution,
          aspectRatio: '16:9',
          folder: 'remix',
          category: isSwapMode ? 'swap' : 'remix'
        });
      } catch (storeErr) {
        console.warn('[RemixStudio] Failed to add to unified store:', storeErr);
      }

      // Direct client database backup sync
      if (supabase && userProfile?.id && userProfile.id !== 'anonymous') {
        supabase.from('assets').insert([{
          user_id: userProfile.id,
          type: 'video',
          url: newItem.url,
          name: `${isSwapMode ? 'Object Swap' : 'Motion Remix'}: ${newItem.prompt.substring(0, 50)}`,
          metadata: {
            engine: isSwapMode ? 'Object Swap Pro' : 'Motion Transfer Pro',
            mode: activeMode,
            prompt: newItem.prompt,
            resolution: newItem.resolution,
            zipUrl: newItem.zipUrl,
            movUrl: newItem.movUrl,
            jsxUrl: newItem.jsxUrl,
            fbxUrl: newItem.fbxUrl,
            plyUrl: newItem.plyUrl
          }
        }]).then(({ error }) => {
          if (error) console.warn('[RemixStudio] Supabase video insert notice:', error.message);
        });
      }

      setIsGenerating(false);

    } catch (err) {
      console.error(`[RemixStudio] ${isSwapMode ? 'Object Swap' : 'Motion Remix'} error:`, err);
      clearInterval(progressInterval);
      setIsGenerating(false);
      setErrorMessage(sanitizeUserErrorMessage(err, isSwapMode ? 'Object Swap' : 'Motion Remix'));
      await refund(costKey, costAmount);
    }
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadMedia = async (url, type = 'video', mode = 'motion-transfer') => {
    if (!url) return;
    const showToast = useAppStore.getState().showToast;
    try {
      setIsDownloading(true);
      if (showToast) showToast("Downloading directly to your device...", "info");

      const ext = (type === 'image' || mode === 'ai-influencer') ? 'png' : 'mp4';
      const filename = mode === 'ai-influencer' 
        ? `remix_influencer_${Date.now()}.${ext}` 
        : mode === 'object-swap' 
        ? `remix_object_swap_${Date.now()}.${ext}` 
        : `remix_motion_${Date.now()}.${ext}`;

      // Fetch as blob to trigger direct local browser download and avoid navigating/opening new tabs
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download request failed: ${res.statusText}`);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }, 300);

      if (showToast) showToast("Download completed successfully!", "success");
    } catch (err) {
      console.warn("Direct blob download error, falling back to proxy stream:", err);
      try {
        const ext = (type === 'image' || mode === 'ai-influencer') ? 'png' : 'mp4';
        const filename = `remix_${Date.now()}.${ext}`;
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}&download=${encodeURIComponent(filename)}`;
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = proxyUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 300);
      } catch (fallbackErr) {
        console.error("All direct download methods failed:", fallbackErr);
        if (showToast) showToast("Download failed. Opening asset in view...", "error");
        window.open(url, '_blank');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Filter categories by current tier
  const visibleCategories = useMemo(() => {
    if (!optionsCatalog || optionsCatalog.length === 0) return [];
    return optionsCatalog.filter(cat => !cat.tiers || cat.tiers.includes(aiTier));
  }, [optionsCatalog, aiTier]);

  // Filter history by active filter tab
  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return historyList;
    return historyList.filter(item => item.mode === historyFilter);
  }, [historyList, historyFilter]);

  return (
    <div className="flex-1 h-full w-full bg-[#0a0c10] text-white flex flex-col overflow-hidden relative font-sans">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-white/10 px-3 sm:px-6 flex items-center justify-between bg-black/40 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-2 sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-wide">Remix Studio</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Credit Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-zinc-300">
            <Coins size={14} className="text-[#D4FF00]" />
            <span className="hidden sm:inline">Shorts Balance:</span>
            <span className="font-bold text-white">{shorts ?? 0}</span>
          </div>

          {/* Quick Header Generate Button */}
          <button
            onClick={handleStartGeneration}
            disabled={isGenerating}
            className={`px-3 sm:px-4 py-2 rounded-xl font-black uppercase tracking-wider text-[11px] sm:text-xs flex items-center gap-1.5 sm:gap-2 transition-all ${
              isGenerating
                ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed border border-white/10'
                : 'bg-[#D4FF00] hover:bg-[#bce400] text-black shadow-[0_0_20px_rgba(212,255,0,0.3)] active:scale-95'
            }`}
          >
            {isGenerating ? (
              <>
                <ArrowsClockwise size={14} className="animate-spin text-black" />
                <span>{generationProgress}%</span>
              </>
            ) : (
              <>
                <Lightning size={14} weight="fill" />
                <span className="hidden sm:inline">Generate • {isInfluencerMode ? '6 Shorts' : `${costAmount} Shorts`}</span>
                <span className="sm:hidden">{isInfluencerMode ? '6⚡' : `${costAmount}⚡`}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── MOBILE VIEW TAB SWITCHER (MATCHING UGC & GENERATOR STUDIO) ── */}
      {isMobile && (
        <div className="flex lg:hidden items-center justify-between px-3 py-2 bg-[#08080c] border-b border-white/[0.08] shrink-0 z-30">
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 w-full">
            <button
              type="button"
              onClick={() => setMobileTab('controls')}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                mobileTab === 'controls'
                  ? "bg-[#D4FF00] text-black shadow-md shadow-[#D4FF00]/25 font-black"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <SlidersHorizontal size={14} weight="bold" />
              <span>Remix Controls</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('gallery')}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer relative",
                mobileTab === 'gallery'
                  ? "bg-[#D4FF00] text-black shadow-md shadow-[#D4FF00]/25 font-black"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <FilmStrip size={14} weight="bold" />
              <span>Gallery</span>
              {historyList.length > 0 && (
                <span className={cn(
                  "text-[9px] font-mono px-1.5 py-0.2 rounded-full ml-1",
                  mobileTab === 'gallery' ? "bg-black/25 text-black font-extrabold" : "bg-white/10 text-white/70"
                )}>
                  {historyList.length}
                </span>
              )}
              {isGenerating && (
                <span className="w-2 h-2 rounded-full bg-[#D4FF00] animate-ping ml-1" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Studio Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden z-10">
        
        {/* Left Controls Column */}
        <div className={cn(
          "w-full lg:w-[400px] xl:w-[440px] border-r border-white/10 bg-[#0d0f14] flex-col h-full min-h-0 shrink-0 overflow-hidden",
          isMobile ? (mobileTab === 'controls' ? "flex flex-1 w-full h-full min-h-0" : "hidden") : "flex"
        )}>
          
          {/* Scrollable Form Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 min-h-0 pb-4">
            
            {/* Mode Pill Toggle (Motion Transfer vs Objects Swap vs AI Influencer) */}
            <div className="grid grid-cols-3 gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => handleModeChange('motion-transfer')}
                className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-[11px] font-bold transition-all ${
                  activeMode === 'motion-transfer'
                    ? 'bg-zinc-800 text-white border border-white/20 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ArrowsClockwise size={14} weight={activeMode === 'motion-transfer' ? "bold" : "regular"} className={activeMode === 'motion-transfer' ? "text-[#D4FF00]" : ""} />
                <span>Motion</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('object-swap')}
                className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-[11px] font-bold transition-all ${
                  activeMode === 'object-swap'
                    ? 'bg-zinc-800 text-white border border-white/20 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Cube size={14} weight={activeMode === 'object-swap' ? "bold" : "regular"} className={activeMode === 'object-swap' ? "text-[#D4FF00]" : ""} />
                <span>Object Swap</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('ai-influencer')}
                className={`flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-[11px] font-bold transition-all relative ${
                  activeMode === 'ai-influencer'
                    ? 'bg-gradient-to-r from-amber-500/20 to-[#D4FF00]/20 text-[#D4FF00] border border-[#D4FF00]/40 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <UserFocus size={14} weight={activeMode === 'ai-influencer' ? "bold" : "regular"} className={activeMode === 'ai-influencer' ? "text-[#D4FF00]" : ""} />
                <span>AI Influencer</span>
              </button>
            </div>

            {/* Hidden File Inputs */}
            <input type="file" accept="video/*" ref={fileInputVideoRef} onChange={handleVideoUpload} className="hidden" />
            <input type="file" accept="image/*" multiple ref={fileInputImageRef} onChange={handleImageUpload} className="hidden" />
            <input type="file" accept="image/*" ref={fileInputIdentityRef} onChange={handleIdentityPhotoUpload} className="hidden" />
            <input type="file" accept="image/*" multiple ref={fileInputItemRef} onChange={handleItemImageUpload} className="hidden" />

            {/* ── MODE 1 & 2 CONTROLS: Motion Transfer & Object Swap ── */}
            {!isInfluencerMode && (
              <>
                {/* Card 1: Reference Video Input */}
                <div 
                  onClick={() => !videoPreview && fileInputVideoRef.current?.click()}
                  className="relative rounded-2xl border border-white/10 hover:border-white/25 bg-black/30 hover:bg-white/[0.02] p-3.5 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[120px] group overflow-hidden"
                >
                  {videoPreview ? (
                    <div className="relative w-full h-28 rounded-xl overflow-hidden bg-black">
                      <video src={videoPreview} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 border border-white/20 text-[9px] font-mono font-bold text-[#D4FF00]">
                        {effectiveDuration}s
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); fileInputVideoRef.current?.click(); }}
                          className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-bold text-white transition-all"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setGalleryTarget('video'); setShowGalleryModal(true); }}
                          className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-bold text-white transition-all"
                        >
                          Gallery
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setVideoPreview(''); setVideoFile(null); }}
                          className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-all"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-9 h-9 rounded-full bg-zinc-800/80 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:text-white group-hover:bg-zinc-700 transition-all">
                        <VideoCamera size={18} weight="fill" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white">
                          {isSwapMode ? 'Add a video to swap objects' : 'Add a reference video to extract motion'}
                        </h3>
                        <p className="text-[10.5px] text-zinc-400 mt-0.5">Video duration: 3–30 seconds</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); fileInputVideoRef.current?.click(); }}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 font-medium transition-all"
                        >
                          From Computer
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setGalleryTarget('video'); setShowGalleryModal(true); }}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 font-medium transition-all"
                        >
                          From Gallery
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 2: Reference Characters, Products, or Clothes */}
                <div className="relative rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
                  <div 
                    onClick={() => fileInputImageRef.current?.click()}
                    className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300">
                        <ImageIcon size={15} />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300">
                        <Package size={15} />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300">
                        <Cube size={15} />
                      </div>
                    </div>

                    <h3 className="text-xs font-bold text-white">
                      Add your characters, products, or clothes
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Up to 8 images ({referenceImages.length}/8 added)</p>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); fileInputImageRef.current?.click(); }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 font-medium transition-all"
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setGalleryTarget('image'); setShowGalleryModal(true); }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 font-medium transition-all"
                      >
                        Pick from Gallery
                      </button>
                    </div>
                  </div>

                  {referenceImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {referenceImages.map((img, idx) => (
                        <div key={img.id || idx} className="relative group rounded-xl overflow-hidden border border-white/15 bg-black aspect-square shadow-md">
                          <img src={img.url} alt={img.tag} className="w-full h-full object-cover" />
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/80 text-[#D4FF00] font-black text-[8px] uppercase tracking-wider border border-[#D4FF00]/40">
                            {img.tag}
                          </div>
                          <button
                            type="button"
                            onClick={() => insertTagIntoPrompt(img.tag)}
                            className="absolute bottom-1 left-1 right-1 py-1 rounded bg-black/80 hover:bg-[#D4FF00] hover:text-black text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1"
                            title="Insert tag into prompt"
                          >
                            <TagIcon size={10} />
                            <span>Tag</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prompt Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Prompt Instructions
                    </label>
                    <span className="text-[10px] text-zinc-400">Type @ to tag references</span>
                  </div>

                  {referenceImages.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-white/[0.02] border border-white/10">
                      <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider pl-1">Tags:</span>
                      {referenceImages.map((img) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => insertTagIntoPrompt(img.tag)}
                          className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-[#D4FF00] transition-all flex items-center gap-1"
                        >
                          <span>+</span>
                          <span>{img.tag}</span>
                        </button>
                      ))}
                      {videoPreview && (
                        <button
                          type="button"
                          onClick={() => insertTagIntoPrompt(isSwapMode ? 'scene video' : 'driving video')}
                          className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-white transition-all flex items-center gap-1"
                        >
                          <span>+</span>
                          <span>{isSwapMode ? 'scene video' : 'driving video'}</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="relative">
                    <AnimatePresence>
                      {mentionSearch !== null && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          transition={{ duration: 0.12 }}
                          className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-[#0d0f15]/95 backdrop-blur-2xl border border-[#D4FF00]/80 rounded-2xl shadow-[0_-15px_45px_rgba(212,255,0,0.25)] overflow-hidden flex flex-col max-h-[260px]"
                        >
                          <div className="p-2.5 border-b border-white/10 bg-[#D4FF00]/10 flex items-center justify-between">
                            <span className="text-[10px] font-black text-[#D4FF00] uppercase tracking-widest flex items-center gap-1.5">
                              <TagIcon size={12} weight="bold" />
                              <span>Tag Active Studio Media</span>
                            </span>
                            <button 
                              type="button" 
                              onClick={() => setMentionSearch(null)} 
                              className="text-zinc-400 hover:text-white p-0.5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>

                          <div className="overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                            {filteredMentionSlots.length === 0 ? (
                              <div className="p-4 text-center">
                                <p className="text-[11px] text-zinc-400 font-medium">No uploaded slot matches &quot;@{mentionSearch}&quot;</p>
                              </div>
                            ) : (
                              filteredMentionSlots.map((slot, idx) => (
                                <button
                                  key={slot.id || idx}
                                  type="button"
                                  onClick={() => selectMentionSlot(slot)}
                                  className={`w-full p-2 rounded-xl flex items-center gap-2.5 text-left transition-all group ${
                                    idx === mentionIndex 
                                      ? 'bg-[#D4FF00] text-black font-bold shadow-md' 
                                      : 'hover:bg-white/10 text-white'
                                  }`}
                                >
                                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/60 border border-white/15 shrink-0 flex items-center justify-center">
                                    {slot.type === 'video' ? (
                                      <video src={slot.url} className="w-full h-full object-cover" muted />
                                    ) : (
                                      <img src={slot.url} alt={slot.label} className="w-full h-full object-cover" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-black truncate">{slot.tag}</span>
                                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${idx === mentionIndex ? 'bg-black/20 text-black' : 'bg-[#D4FF00]/20 text-[#D4FF00]'}`}>
                                        {slot.token}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <textarea
                      ref={promptTextareaRef}
                      value={prompt}
                      onInput={handlePromptInput}
                      onKeyDown={handlePromptKeyDown}
                      rows={3}
                      placeholder={isSwapMode 
                        ? "Describe which object to replace and how Image 1 should be integrated... Type @ to tag media" 
                        : "e.g. Extract the character from Image 1 and clothing styling from Image 2 while preserving exact motion... Type @ to tag media"}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#D4FF00]/80 focus:ring-1 focus:ring-[#D4FF00]/30 transition-all resize-none font-sans custom-scrollbar min-h-[72px] max-h-[240px]"
                    />
                  </div>
                </div>

                {/* Resolution Dropdown Quality Selector */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                      Quality & Resolution ({ratePerSec} Shorts/s)
                    </label>
                    <span className="text-[11px] font-bold text-[#D4FF00]">{costAmount} Shorts ({effectiveDuration}s)</span>
                  </div>

                  <div className="relative">
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="w-full appearance-none bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#D4FF00]/80 cursor-pointer transition-colors"
                    >
                      <option value="480p" className="bg-zinc-900 text-white">480p SD · Fast (18 Shorts/s)</option>
                      <option value="720p" className="bg-zinc-900 text-white">720p HD · Standard (44 Shorts/s)</option>
                      <option value="1080p" className="bg-zinc-900 text-white">1080p Full HD · Master (89 Shorts/s)</option>
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                      <CaretDown size={14} weight="bold" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── MODE 3 CONTROLS: AI Influencer / Character Creator ── */}
            {isInfluencerMode && (
              <div className="space-y-3">
                {/* 1. Character Type (Tier) Picker */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <UserFocus size={14} className="text-[#D4FF00]" />
                      <span>Character Type (`tier`)</span>
                    </label>
                    <span className="text-[10px] text-[#D4FF00] font-mono font-bold">6 Shorts / Sheet</span>
                  </div>

                  {/* Humans vs Animals Toggle */}
                  <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                    {[
                      { key: 'normal', label: 'Average', desc: 'Human (Natural)' },
                      { key: 'freak', label: 'Bold', desc: 'Human (Unusual)' },
                      { key: 'total', label: 'Extreme', desc: 'Human (Transformed)' },
                    ].map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setAiTier(t.key)}
                        className={`py-1.5 px-2 rounded-lg text-center transition-all ${
                          aiTier === t.key
                            ? 'bg-[#D4FF00] text-black font-black shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold'
                        }`}
                      >
                        <div className="text-[11px] font-bold truncate">{t.label}</div>
                      </button>
                    ))}
                  </div>

                  {/* Animal Tiers Grid */}
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    {[
                      { key: 'cats', label: '🐱 Cat' },
                      { key: 'dogs', label: '🐶 Dog' },
                      { key: 'capybaras', label: '🦫 Rodent' },
                      { key: 'birds', label: '🦅 Bird' },
                      { key: 'insects', label: '🦗 Insect' },
                      { key: 'frogs', label: '🐸 Frog' },
                    ].map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setAiTier(t.key)}
                        className={`py-1.5 px-2 rounded-lg text-center text-xs font-bold transition-all border ${
                          aiTier === t.key
                            ? 'bg-[#D4FF00]/20 border-[#D4FF00] text-[#D4FF00]'
                            : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-zinc-400'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Photo Reference (`image_url` - Upload identity photo) */}
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <User size={14} className="text-[#D4FF00]" />
                      <span>Identity Photo (`image_url`)</span>
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono">Optional Likeness</span>
                  </div>

                  {aiIdentityPhoto ? (
                    <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/20 bg-black group">
                      <img src={aiIdentityPhoto} alt="Identity" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                        <button
                          type="button"
                          onClick={() => fileInputIdentityRef.current?.click()}
                          className="px-2.5 py-1 rounded-lg bg-white/20 text-xs font-bold text-white"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiIdentityPhoto('')}
                          className="p-1.5 rounded-lg bg-red-500/80 text-white"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputIdentityRef.current?.click()}
                      className="p-3 rounded-xl border border-dashed border-white/15 hover:border-[#D4FF00]/50 hover:bg-white/[0.02] cursor-pointer text-center transition-all flex flex-col items-center justify-center gap-1"
                    >
                      <UploadSimple size={18} className="text-zinc-400" />
                      <p className="text-xs font-bold text-zinc-200">Upload Character Identity Photo</p>
                      <p className="text-[9.5px] text-zinc-500">Guides facial structure & likeness</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); fileInputIdentityRef.current?.click(); }}
                          className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-zinc-300"
                        >
                          Upload File
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setGalleryTarget('ai-identity'); setShowGalleryModal(true); }}
                          className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-zinc-300"
                        >
                          From Gallery
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Clothing / Elements References (`item_image_urls` - max 3) */}
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Package size={14} className="text-[#D4FF00]" />
                      <span>Item & Outfit References (`item_image_urls`)</span>
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono">{aiItemImages.length}/3 max</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {aiItemImages.map((img, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden border border-white/20 aspect-square bg-black group">
                        <img src={img} alt={`Item ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setAiItemImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 rounded bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash size={10} />
                        </button>
                      </div>
                    ))}

                    {aiItemImages.length < 3 && (
                      <div
                        onClick={() => fileInputItemRef.current?.click()}
                        className="rounded-xl border border-dashed border-white/15 hover:border-white/30 bg-white/[0.02] cursor-pointer flex flex-col items-center justify-center p-2 text-center aspect-square transition-all"
                      >
                        <Plus size={16} className="text-zinc-400" />
                        <span className="text-[9px] font-bold text-zinc-400 mt-1">Add Outfit/Item</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Appearance Catalog Selections (`selection`) */}
                <div className="rounded-2xl border border-white/10 bg-black/40 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <SlidersHorizontal size={14} className="text-[#D4FF00]" />
                      <span>Appearance Traits Catalog</span>
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono">
                      {Object.keys(aiSelection).length} active selection(s)
                    </span>
                  </div>

                  {isLoadingOptions ? (
                    <div className="p-4 text-center text-xs text-zinc-400 animate-pulse">
                      Loading trait options catalog...
                    </div>
                  ) : visibleCategories.length === 0 ? (
                    <div className="p-3 text-center text-xs text-zinc-500">
                      No custom traits catalog available for tier &quot;{aiTier}&quot;
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Category Tabs Scroll Header */}
                      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                        {visibleCategories.map(cat => {
                          const hasSelected = Boolean(aiSelection[cat.key]?.length);
                          const isActive = activeCatalogCategory === cat.key;
                          return (
                            <button
                              key={cat.key}
                              type="button"
                              onClick={() => setActiveCatalogCategory(cat.key)}
                              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold shrink-0 transition-all ${
                                isActive
                                  ? 'bg-[#D4FF00] text-black shadow-md'
                                  : hasSelected
                                  ? 'bg-white/15 text-white border border-[#D4FF00]/40'
                                  : 'bg-white/5 hover:bg-white/10 text-zinc-400'
                              }`}
                            >
                              <span>{cat.label || cat.key}</span>
                              {hasSelected && <span className="ml-1 text-[9px] opacity-80">✓</span>}
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Category Option Grid */}
                      {(() => {
                        const activeCat = visibleCategories.find(c => c.key === activeCatalogCategory) || visibleCategories[0];
                        if (!activeCat) return null;
                        const selectedKeys = aiSelection[activeCat.key] || [];

                        return (
                          <div className="space-y-1.5 bg-black/30 p-2.5 rounded-xl border border-white/5">
                            <div className="flex items-center justify-between text-[10px] text-zinc-400">
                              <span>Select up to {activeCat.max || 1} {activeCat.label}</span>
                              <span className="font-mono text-[#D4FF00]">{selectedKeys.length} selected</span>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                              {activeCat.options?.map(opt => {
                                const isSel = selectedKeys.includes(opt.key);
                                return (
                                  <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => toggleAiOption(activeCat.key, opt.key, activeCat.max || 1)}
                                    className={`relative p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                                      isSel
                                        ? 'bg-[#D4FF00]/20 border-[#D4FF00] text-[#D4FF00] font-bold shadow-sm'
                                        : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-zinc-300'
                                    }`}
                                  >
                                    {opt.img && (
                                      <div className="w-full h-14 rounded-lg overflow-hidden bg-black mb-1">
                                        <img src={opt.img} alt={opt.label} className="w-full h-full object-cover" />
                                      </div>
                                    )}
                                    {opt.color && (
                                      <div 
                                        className="w-full h-6 rounded-lg mb-1 border border-white/20" 
                                        style={{ backgroundColor: opt.color }}
                                      />
                                    )}
                                    <span className="text-[10px] truncate max-w-full">{opt.label || opt.key}</span>

                                    {isSel && (
                                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#D4FF00] text-black flex items-center justify-center">
                                        <Check size={10} weight="bold" />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* 5. Direction Brief Input (`brief`) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                    Character Brief / Styling Direction (`brief`)
                  </label>
                  <textarea
                    value={aiBrief}
                    onChange={(e) => setAiBrief(e.target.value)}
                    rows={2}
                    placeholder="Describe character mood, aesthetic, background setting, accessories..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#D4FF00]/80 focus:ring-1 focus:ring-[#D4FF00]/30 transition-all resize-none font-sans custom-scrollbar"
                  />
                </div>

                {/* 6. Animal Variations & Seed options */}
                {!['normal', 'freak', 'total'].includes(aiTier) && (
                  <div className="grid grid-cols-2 gap-2 bg-black/30 p-2.5 rounded-xl border border-white/10 text-xs">
                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold block mb-1">Variation Index</label>
                      <input
                        type="number"
                        min="0"
                        value={aiVariationIndex}
                        onChange={(e) => setAiVariationIndex(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold block mb-1">Body Color (#HEX)</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={aiBodyColor || '#D9A066'}
                          onChange={(e) => setAiBodyColor(e.target.value)}
                          className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={aiBodyColor}
                          onChange={(e) => setAiBodyColor(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-xs text-red-300">
                <WarningCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}


          </div>

          {/* Fixed Bottom Generate Action (Pinned, always visible) */}
          <div className="p-3 border-t border-white/10 bg-[#0d0f14] shrink-0 sticky bottom-0 z-20 shadow-2xl">
            <button
              onClick={handleStartGeneration}
              disabled={isGenerating}
              className={`w-full py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                isGenerating
                  ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed border border-white/10'
                  : 'bg-[#D4FF00] hover:bg-[#bce400] text-black shadow-[0_0_30px_rgba(212,255,0,0.35)] active:scale-[0.98]'
              }`}
            >
              {isGenerating ? (
                <>
                  <ArrowsClockwise size={18} className="animate-spin text-black" />
                  <span>Processing ({generationProgress}%)</span>
                </>
              ) : (
                <>
                  <Lightning size={16} weight="fill" />
                  <span>
                    Generate • {isInfluencerMode ? '6 Shorts (₹6 · 2K Sheet)' : `${costAmount} Shorts (${effectiveDuration}s)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Viewport: Real-time Player & Persistent Gallery Canvas */}
        <div className={cn(
          "flex-1 flex-col min-h-0 bg-[#07080c] overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3 pb-28 lg:pb-4 relative",
          isMobile ? (mobileTab === 'gallery' ? "flex flex-1 w-full h-full min-h-0" : "hidden") : "flex"
        )}>
          
          {/* Main Display Stage (Compact preview area) */}
          <div className="w-full h-[280px] sm:h-[360px] shrink-0 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl relative overflow-hidden flex items-center justify-center shadow-2xl">
            
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4 text-center p-6 z-10">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-[#D4FF00] border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-[#D4FF00]">
                    {generationProgress}%
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{statusMessage}</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {isInfluencerMode
                      ? 'Generating 2K 16:9 character sheet with close-up portrait & full-body view...'
                      : isSwapMode 
                      ? 'Replacing object geometry while preserving lighting & reflections...' 
                      : 'Preserving actor motion, camera trajectory, and frame timing...'}
                  </p>
                </div>
              </div>
            ) : generatedResult ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
                {generatedResult.type === 'image' || generatedResult.mode === 'ai-influencer' ? (
                  <img
                    src={getMediaPreviewUrl(generatedResult.url, true)}
                    alt="Character Sheet"
                    onClick={() => setShowLightbox(true)}
                    onError={(e) => {
                      if (!e.currentTarget.src.includes('/api/proxy-image')) {
                        e.currentTarget.src = `/api/proxy-image?url=${encodeURIComponent(generatedResult.url)}&as=image`;
                      }
                    }}
                    className="w-full h-full object-contain max-h-[260px] sm:max-h-[340px] rounded-xl shadow-2xl cursor-zoom-in"
                  />
                ) : (
                  <video
                    src={generatedResult.url}
                    className="w-full h-full object-contain max-h-[260px] sm:max-h-[340px] rounded-xl shadow-2xl"
                    controls
                    autoPlay
                    playsInline
                    loop
                  />
                )}
                
                {/* Overlay Action Bar */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex items-center gap-1.5 sm:gap-2 z-10">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(generatedResult.url)}
                    className="p-1.5 sm:p-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold"
                  >
                    <Copy size={14} />
                    <span>{copiedUrl ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadMedia(generatedResult.url, generatedResult.type, generatedResult.mode)}
                    disabled={isDownloading}
                    className="p-1.5 sm:p-2 rounded-xl bg-[#D4FF00] text-black font-bold hover:bg-[#bce400] transition-all flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs cursor-pointer active:scale-95 disabled:opacity-50 shadow-lg"
                    title="Download directly to your computer or phone"
                  >
                    <DownloadSimple size={14} weight="bold" className={isDownloading ? "animate-bounce" : ""} />
                    <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center p-6 text-zinc-500 max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-zinc-600">
                  {isInfluencerMode ? (
                    <UserFocus size={28} className="text-[#D4FF00]" />
                  ) : isSwapMode ? (
                    <Cube size={28} />
                  ) : (
                    <FilmSlate size={28} />
                  )}
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-300 uppercase tracking-wider">
                    Ready for {isInfluencerMode ? 'AI Influencer Character Creation' : isSwapMode ? 'Object Swap Synthesis' : 'Motion Transfer Synthesis'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                    {isInfluencerMode
                      ? 'Customize your character appearance, upload identity or item references, and click Generate to produce a 2K character reference sheet.'
                      : isSwapMode 
                      ? 'Upload your scene video on the left, add reference images of your desired replacement object, and click Generate.' 
                      : 'Upload your source video on the left, add reference images of your desired character or style, and click Generate.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Persistent Studio Gallery History */}
          {historyList.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[#D4FF00]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                    Remix Studio Gallery ({filteredHistory.length})
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'ai-influencer', label: 'Influencers' },
                      { id: 'motion-transfer', label: 'Motion' },
                      { id: 'object-swap', label: 'Object Swap' },
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setHistoryFilter(f.id)}
                        className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold transition-all ${
                          historyFilter === f.id
                            ? 'bg-[#D4FF00] text-black shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Left / Right Swipe Carousel Controls */}
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => scrollGallery('left')}
                      className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                      title="Swipe left"
                    >
                      <CaretLeft size={13} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollGallery('right')}
                      className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                      title="Swipe right"
                    >
                      <CaretRight size={13} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Horizontal Swipeable Carousel (Scroll to Right) */}
              <div 
                ref={galleryScrollRef}
                className="flex items-stretch gap-3 overflow-x-auto custom-scrollbar pb-3 pt-1 scroll-smooth snap-x select-none"
              >
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setGeneratedResult(item)}
                    className={`w-48 sm:w-56 shrink-0 snap-start group relative rounded-2xl border bg-white/[0.02] p-2.5 cursor-pointer transition-all overflow-hidden ${
                      generatedResult?.id === item.id 
                        ? 'border-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.2)]' 
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="w-full h-28 rounded-xl bg-black overflow-hidden relative">
                      {item.type === 'image' || item.mode === 'ai-influencer' ? (
                        <img
                          src={getMediaPreviewUrl(item.url, true)}
                          alt="Generation"
                          onError={(e) => {
                            if (!e.currentTarget.src.includes('/api/proxy-image')) {
                              e.currentTarget.src = `/api/proxy-image?url=${encodeURIComponent(item.url)}&as=image`;
                            }
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                      )}
                      
                      {/* Play overlay ONLY for videos (Motion Remix / Object Swap), NOT for AI Influencer or images */}
                      {item.type === 'video' && item.mode !== 'ai-influencer' ? (
                        <div className="absolute inset-0 bg-black/30 group-hover:opacity-0 transition-opacity flex items-center justify-center pointer-events-none">
                          <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20">
                            <Play size={14} className="text-white fill-white ml-0.5" />
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/20 group-hover:opacity-0 transition-opacity flex items-center justify-center pointer-events-none">
                          <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10 opacity-70 group-hover:opacity-0 transition-opacity">
                            <ImageIcon size={14} className="text-[#D4FF00]" />
                          </div>
                        </div>
                      )}

                      <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        item.mode === 'ai-influencer' 
                          ? 'bg-[#D4FF00] text-black' 
                          : item.mode === 'object-swap' 
                          ? 'bg-cyan-400 text-black' 
                          : 'bg-purple-400 text-black'
                      }`}>
                        {item.mode === 'ai-influencer' ? 'Influencer' : item.mode === 'object-swap' ? 'Swap' : 'Remix'}
                      </div>

                      {/* Card Actions (Direct Download & Delete) */}
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadMedia(item.url, item.type, item.mode);
                          }}
                          className="p-1 rounded bg-black/70 hover:bg-[#D4FF00] hover:text-black text-white transition-colors cursor-pointer"
                          title="Download directly to your device"
                        >
                          <DownloadSimple size={11} weight="bold" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          className="p-1 rounded bg-red-500/80 hover:bg-red-500 text-white transition-colors cursor-pointer"
                          title="Delete from studio gallery"
                        >
                          <Trash size={11} />
                        </button>
                      </div>
                    </div>

                    <div className="p-1 mt-1">
                      <p className="text-[11px] text-zinc-200 truncate font-medium">{item.prompt}</p>
                      <div className="flex items-center justify-between text-[9px] text-zinc-500 mt-0.5">
                        <span>{item.createdAt}</span>
                        <span className="font-bold text-[#D4FF00]">{item.resolution || '2K Sheet'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Floating "Remix Controls" Action Button */}
          {isMobile && mobileTab === 'gallery' && (
            <button
              type="button"
              onClick={() => setMobileTab('controls')}
              className="lg:hidden fixed bottom-24 right-4 z-40 px-4 py-2.5 rounded-full bg-[#D4FF00] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(212,255,0,0.5)] border border-[#D4FF00] flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <SlidersHorizontal size={14} weight="bold" />
              <span>Remix Controls</span>
            </button>
          )}

        </div>
      </div>

      {/* Gallery Modal Picker */}
      <AnimatePresence>
        {showGalleryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-4xl max-h-[85vh] bg-zinc-900 border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative"
            >
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#D4FF00]/20 text-[#D4FF00] flex items-center justify-center">
                    <FolderOpen size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Select Asset from Studio Library ({galleryTarget === 'video' ? 'Reference Video' : 'Reference Image'})
                    </h3>
                    <p className="text-[11px] text-zinc-400">Click any media item to select and attach to your studio synthesis</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGalleryModal(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <AssetsLibrary
                  compact={true}
                  defaultTab={galleryTarget === 'video' ? 'videos' : 'images'}
                  onSelectReference={handleGallerySelect}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal for Character Sheet Image View */}
      <AnimatePresence>
        {showLightbox && generatedResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-8">
            <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center">
              <div className="absolute -top-10 right-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadMedia(generatedResult.url, generatedResult.type, generatedResult.mode)}
                  disabled={isDownloading}
                  className="px-3 py-1.5 text-xs font-bold rounded-full bg-[#D4FF00] text-black hover:bg-[#bce400] flex items-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-95"
                >
                  <DownloadSimple size={14} weight="bold" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLightbox(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <img
                src={getMediaPreviewUrl(generatedResult.url, true)}
                alt="Character Sheet Lightbox"
                onError={(e) => {
                  if (!e.currentTarget.src.includes('/api/proxy-image')) {
                    e.currentTarget.src = `/api/proxy-image?url=${encodeURIComponent(generatedResult.url)}&as=image`;
                  }
                }}
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
