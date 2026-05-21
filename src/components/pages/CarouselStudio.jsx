// CarouselStudio.jsx — Dual engine: HTML Render OR GPT Image 2

import React, { useState, useRef, useEffect } from 'react';
import {
    LayoutGrid, Send, Download, RefreshCw, Bot,
    Loader2, ChevronLeft, ChevronRight, Sparkles, ArrowRight,
    Edit3, Maximize2, X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getApiUrl } from '../../config/apiConfig';
import { useAppStore } from '../../store';

// ─── Image Engines ──────────────────────────────────────────────────────────

const IMAGE_MODELS = [
    { id: 'html',      label: 'HTML Render', desc: 'Typography-first · instant',  emoji: '⚡' },
    { id: 'gpt-image', label: 'GPT Image 2', desc: 'AI visuals · ~45s',           emoji: '🎨' },
];

// ─── Visual Prompt Builder — clean creative direction for gpt-image-2 ────────

function buildVisualPrompt({ carouselType, slideId, brand, slideContent }) {
    const bName    = brand?.name  || '';
    const bColor   = brand?.color || '';
    const bWhat    = brand?.whatTheyDo || '';
    const headline = slideContent?.headline || slideContent?.hook || '';
    const body     = slideContent?.body || slideContent?.subhook || '';

    const designStyle = {
        'step-by-step':     'Clean editorial infographic. Numbered sections.',
        'before-after':     'Split-screen comparison. Transformation design.',
        'mini-case-study':  'Professional presentation. Data-driven layout.',
        'myth-busting':     'Bold magazine editorial. High contrast.',
        'listicle':         'Numbered editorial cards. Structured list.',
        'do-dont':          'Two-column comparison. Wrong vs right.',
        'swipe-secrets':    'Dark editorial. Mystery reveal. Exclusive.',
    }[carouselType] || 'Bold editorial social media design.';

    const scene = bWhat || `Professional ${bName} environment.`;

    return [
        `Premium Instagram carousel graphic. 4:5 vertical format.`,
        headline ? `Headline: "${headline}".` : '',
        body     ? `Body text: "${body}".` : '',
        designStyle,
        scene,
        bColor ? `${bColor} color palette.` : '',
        'Readable typography. Professional social media design.',
    ].filter(Boolean).join(' ');
}

// ─── Types ────────────────────────────────────────────────────────────────────

const CAROUSEL_TYPES = [
    { id: 'classic-hook-cta', label: 'Classic Hook → CTA', emoji: '🎯', desc: 'The proven 7-slide formula',    color: 'from-pink-500 to-rose-500'     },
    { id: 'step-by-step',     label: 'Step by Step',       emoji: '📋', desc: 'Numbered tutorial / how-to',    color: 'from-blue-500 to-cyan-500'     },
    { id: 'before-after',     label: 'Before & After',     emoji: '✨', desc: 'Transformation reveal',          color: 'from-orange-500 to-red-500'    },
    { id: 'mini-case-study',  label: 'Mini Case Study',    emoji: '📊', desc: 'Client story / real results',   color: 'from-emerald-500 to-teal-500'  },
    { id: 'myth-busting',     label: 'Myth Busting',       emoji: '💥', desc: 'Debunk misconceptions',          color: 'from-violet-500 to-indigo-500' },
    { id: 'listicle',         label: 'Listicle',           emoji: '🔢', desc: 'Top N things / ranked list',    color: 'from-teal-500 to-green-500'    },
    { id: 'do-dont',          label: "Do's & Don'ts",      emoji: '✅', desc: 'Mistakes vs. right way',         color: 'from-red-500 to-pink-500'      },
    { id: 'swipe-secrets',    label: 'Swipe Secrets',      emoji: '🤫', desc: 'Hidden tips that hook & reward', color: 'from-purple-500 to-pink-500'   },
];

// ─── Claude system prompt ─────────────────────────────────────────────────────
// Collects 6 answers → outputs carouselData JSON → backend builds HTML slides

function buildSystemPrompt(typeId, brandVoice) {
    const type = CAROUSEL_TYPES.find(t => t.id === typeId) || CAROUSEL_TYPES[0];

    const brandBlock = brandVoice?.brandName ? `
## PRE-LOADED BRAND DATA — skip asking these, use them directly
- Brand Name: ${brandVoice.brandName}
${brandVoice.words?.filter(Boolean).length ? `- Keywords: ${brandVoice.words.filter(Boolean).join(', ')}` : ''}
${brandVoice.whatTheyDo ? `- What They Do: ${brandVoice.whatTheyDo}` : ''}
${brandVoice.address ? `- Location: ${brandVoice.address}` : ''}
${brandVoice.brandColor ? `- Brand Color: ${brandVoice.brandColor} (use this exact hex in the brand.color field)` : ''}
${brandVoice.instagramHandle ? `- Instagram: ${brandVoice.instagramHandle}` : ''}
${brandVoice.website ? `- Website: ${brandVoice.website}` : ''}
` : '';

    return `You are ZeroLens AI — a world-class Instagram carousel strategist and copywriter.

You are building a "${type.label}" carousel. Your copy feeds a professional HTML design system that renders pixel-perfect 1080×1350px Instagram slides. Every word you write appears on a real slide seen by thousands — write like a senior agency copywriter.
${brandBlock}
## CONVERSATION RULES
- Ask ONLY ONE question per message. Never combine two.
- Keep questions short and direct — like a sharp creative director.
- If brand data is pre-loaded above, SKIP those questions entirely and use the data.
- Once you have all 6 answers → output the JSON immediately. No intro, no explanation, no markdown fences. Start directly with {

## QUESTIONS TO COLLECT (only what's missing)
1. Topic — what insight, story, or offer is this carousel about?
2. Brand name — (skip if pre-loaded)
3. Instagram handle — e.g. @yourbrand
4. Brand color — hex code OR describe it (e.g. "deep gold", "electric teal", "cobalt blue")
5. Font style — pick one: editorial / modern / warm / technical / bold / classic / friendly
6. CTA — what action drives the last slide? (e.g. "DM us", "Book a call", "Shop now", "Follow for more")

## COPY QUALITY RULES — CRITICAL
- brand.hook: Stop-the-scroll. Bold claim, surprising stat, or provocative question. MAX 8 WORDS. Zero fluff.
- brand.subhook: One sentence that earns the swipe. MAX 120 CHARS. Specific, not generic.
- brand.tag: 2-3 word pill label. E.g. "NEW DROP", "PRO TIP", "CASE STUDY", "MUST READ"
- Problem slide.headline: MAX 12 WORDS, MAX 55 CHARS. Name the real pain. Language your audience uses internally.
- Problem slide.body: MAX 120 CHARS.
- Solution slide.headline: MAX 12 WORDS, MAX 55 CHARS. Make transformation feel inevitable.
- Solution slide.quote: MAX 100 CHARS. Something a senior expert would say.
- Solution slide.body: MAX 120 CHARS.
- Features: Only 3 items max. Title = benefit, MAX 30 CHARS. Desc = proof, MAX 50 CHARS.
- Details: Only 4 points max. Each point MAX 55 CHARS. Real, specific. Never buzzwords.
- How-to: Only 3 steps max. Title = action verb, MAX 28 CHARS. Desc = outcome, MAX 50 CHARS.
- brand.ctaHeadline: Create urgency or curiosity. MAX 12 WORDS, MAX 55 CHARS. Never "Get started today."
- brand.ctaBody: MAX 120 CHARS.
- ctaText: 2-4 words max.
- If user gives a color name (not hex), convert it yourself: "warm gold"→#D4AF37, "cobalt blue"→#0047AB, "electric teal"→#00CED1, "deep navy"→#0A1628, etc.

## JSON OUTPUT — exact structure, raw, no wrapping
{
  "type": "carousel",
  "brand": {
    "name": "",
    "handle": "",
    "tag": "",
    "hook": "",
    "subhook": "",
    "ctaHeadline": "",
    "ctaBody": "",
    "color": "#hex",
    "fontStyle": "modern"
  },
  "slides": [
    { "id": "hero",     "headline": "", "body": "" },
    { "id": "problem",  "headline": "", "body": "", "points": ["", "", ""] },
    { "id": "solution", "headline": "", "body": "", "quote": "" },
    { "id": "features", "headline": "", "features": [{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""}] },
    { "id": "details",  "headline": "", "points": ["", "", "", ""] },
    { "id": "howto",    "headline": "", "steps": [{"title":"","desc":""},{"title":"","desc":""},{"title":"","desc":""}] }
  ],
  "ctaText": ""
}

CRITICAL: After the closing } write absolutely nothing. No sign-off. No follow-up. Silence.`;
}

// ─── Session cache (survives tab switches) ────────────────────────────────────

const _s = {
    selectedType:  null,
    imageEngine:   'html',
    messages:      [],
    carouselData:  null,
    slideImages:   [],
    activeSlide:   0,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CarouselStudio({ userId }) {
    const userProfile = useAppStore(s => s.userProfile);
    const brandVoice  = userProfile?.brand_voice || userProfile?.metadata?.brand_voice || null;

    const [selectedType,  setSelectedType]  = useState(_s.selectedType);
    const [imageEngine,   setImageEngine]   = useState(_s.imageEngine);
    const [messages,      setMessages]      = useState(_s.messages);
    const [input,         setInput]         = useState('');
    const [isThinking,    setIsThinking]    = useState(false);
    const [carouselData,  setCarouselData]  = useState(_s.carouselData);
    const [slideImages,   setSlideImages]   = useState(_s.slideImages);
    const [isGenerating,  setIsGenerating]  = useState(false);
    const [genStatus,     setGenStatus]     = useState('');
    const [activeSlide,   setActiveSlide]   = useState(_s.activeSlide);
    const [gptQueue,      setGptQueue]      = useState([]);
    const [gptPending,    setGptPending]    = useState(null);
    const [editingPrompt, setEditingPrompt] = useState('');
    const [showPromptEditor, setShowPromptEditor] = useState(false);
    const [useBrandVoice, setUseBrandVoice] = useState(!!brandVoice?.brandName);

    const bottomRef = useRef(null);

    // Map brandVoice flat keys → carousel brand object keys
    const normalizeBrand = (bv, fallback = {}) => ({
        ...fallback,
        name: bv?.brandName || fallback.name,
        color: bv?.brandColor || fallback.color,
        whatTheyDo: bv?.whatTheyDo || fallback.whatTheyDo,
        instagramHandle: bv?.instagramHandle,
        website: bv?.website,
    });

    // Sync session cache
    useEffect(() => { _s.selectedType = selectedType; }, [selectedType]);
    useEffect(() => { _s.imageEngine  = imageEngine;  }, [imageEngine]);
    useEffect(() => { _s.messages     = messages;     }, [messages]);
    useEffect(() => { _s.carouselData = carouselData; }, [carouselData]);
    useEffect(() => { _s.slideImages  = slideImages;  }, [slideImages]);
    useEffect(() => { _s.activeSlide  = activeSlide;  }, [activeSlide]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    // ── Select carousel type ──────────────────────────────────────────────────

    const handleSelectType = (type) => {
        setSelectedType(type.id);
        setCarouselData(null);
        setSlideImages([]);
        setActiveSlide(0);
        setInput('');
        const bv = useBrandVoice ? brandVoice : null;
        const greeting = bv?.brandName
            ? `${type.emoji} Building a **${type.label}** carousel for **${bv.brandName}**! Brand loaded. What topic should this carousel cover?`
            : `${type.emoji} **${type.label}** — great choice! What's the topic or core message for this carousel?`;
        setMessages([{ role: 'assistant', text: greeting }]);
    };

    // ── Chat ──────────────────────────────────────────────────────────────────

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isThinking || !selectedType || isGenerating) return;
        setInput('');

        const userMsg     = { role: 'user', text };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setIsThinking(true);

        try {
            // Cut history at the JSON turn so Claude doesn't re-ask questions
            const jsonTurnIdx = nextMessages.findIndex(
                m => m.text?.includes('"type":"carousel"') || m.text?.includes('"type": "carousel"')
            );
            const historyMessages = jsonTurnIdx !== -1
                ? nextMessages.slice(0, jsonTurnIdx)
                : nextMessages;

            const history = historyMessages.map(m => ({
                role:    m.role === 'assistant' ? 'assistant' : 'user',
                content: m.text,
            }));

            const resp = await fetch(getApiUrl('/api/carousel/chat'), {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    history,
                    systemPrompt: buildSystemPrompt(selectedType, useBrandVoice ? brandVoice : null),
                }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.error || `Server error ${resp.status}`);

            const reply     = data.text || '';
            const jsonStart = reply.indexOf('{');
            const jsonEnd   = reply.lastIndexOf('}');

            if (jsonStart !== -1 && jsonEnd > jsonStart) {
                const candidate = reply.slice(jsonStart, jsonEnd + 1);
                if (candidate.includes('"type"') && candidate.includes('"slides"')) {
                    try {
                        const parsed = JSON.parse(candidate);
                        if (parsed?.slides?.length > 0 && parsed?.brand) {
                            setCarouselData(parsed);
                            setSlideImages([]);
                            setActiveSlide(0);
                            setMessages(prev => [...prev, {
                                role: 'assistant',
                                text: imageEngine === 'gpt-image'
                                    ? `✅ Carousel planned for **${parsed.brand.name}**! Generating ${parsed.slides.length + 1} AI images — ~45 seconds…`
                                    : `✅ Carousel planned for **${parsed.brand.name}**! Rendering ${parsed.slides.length + 1} slides — ~30 seconds…`,
                            }]);
                            // Kick off HTML generation
                            setTimeout(() => generateCarousel(parsed), 400);
                            return;
                        }
                    } catch (_) { /* JSON parse failed, fall through */ }
                }
            }

            setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${err.message}` }]);
        } finally {
            setIsThinking(false);
        }
    };

    // ── GPT Image: generate ONE slide, then wait for user approval ──────────

    const generateOneGptSlide = async (prompts, index, existingSlides, data) => {
        if (index >= prompts.length) {
            setGptQueue([]);
            setGptPending(null);
            setIsGenerating(false);
            setGenStatus('');
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: `🎉 All ${existingSlides.length} AI slides approved — download and post!`,
            }]);
            return;
        }
        setIsGenerating(true);
        setGenStatus(`Generating slide ${index + 1} of ${prompts.length}…`);
        console.log(`%c[GPT Image] Slide ${index + 1}/${prompts.length} — slideId: ${prompts[index]?.slideId}`, 'color:#f472b6;font-weight:bold;font-size:13px');
        console.log('%cPROMPT:', 'color:#fb923c;font-weight:bold', '\n' + prompts[index]?.prompt);
        try {
            const resp = await fetch(getApiUrl('/api/carousel/generate-images'), {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ prompts: [prompts[index]], userId, brand: data.brand }),
            });
            const result = await resp.json();
            if (!resp.ok) throw new Error(result?.error || `Server error ${resp.status}`);
            const newSlide = { ...result.slides[0], index };
            setGptPending({ slide: newSlide, index, prompts, data });
            setSlideImages(prev => {
                const updated = [...prev];
                updated[index] = newSlide;
                return updated;
            });
            setActiveSlide(index);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: `Slide ${index + 1} failed: ${err.message}` }]);
        } finally {
            setIsGenerating(false);
            setGenStatus('');
        }
    };

    const approveSlide = () => {
        if (!gptPending) return;
        const { index, prompts, data } = gptPending;
        setGptPending(null);
        generateOneGptSlide(prompts, index + 1, slideImages, data);
    };

    const regenSlide = () => {
        if (!gptPending) return;
        const { index, prompts, data } = gptPending;
        setGptPending(null);
        generateOneGptSlide(prompts, index, slideImages, data);
    };

    const regenerateWithEditedPrompt = async () => {
        if (!editingPrompt.trim() || !carouselData) return;
        const slideIdx = activeSlide;
        const slide = carouselData.slides[slideIdx] || { id: 'cta', headline: carouselData.brand?.ctaHeadline };
        const promptObj = { slideId: slide.id, headline: slide.headline || '', prompt: editingPrompt.trim() };
        setShowPromptEditor(false);
        setGptPending(null);
        setIsGenerating(true);
        setGenStatus(`Regenerating slide ${slideIdx + 1} with edited prompt…`);
        try {
            const resp = await fetch(getApiUrl('/api/carousel/generate-images'), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompts: [promptObj], userId, brand: carouselData.brand }),
            });
            const result = await resp.json();
            if (!resp.ok) throw new Error(result?.error || `Server error ${resp.status}`);
            const newSlide = { ...result.slides[0], index: slideIdx };
            setSlideImages(prev => { const u = [...prev]; u[slideIdx] = newSlide; return u; });
            setMessages(prev => [...prev, { role: 'assistant', text: `✅ Slide ${slideIdx + 1} regenerated.` }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: `Regen failed: ${err.message}` }]);
        } finally { setIsGenerating(false); setGenStatus(''); }
    };

    // ── Generate — branches on imageEngine ─────────────────────────────────

    const generateCarousel = async (dataOverride) => {
        const data = dataOverride || carouselData;
        if (!data?.brand || !data?.slides) return;

        setIsGenerating(true);
        setSlideImages([]);
        setGptPending(null);

        try {
            if (imageEngine === 'gpt-image') {
                const allSlides = [
                    ...data.slides,
                    { id: 'cta', headline: data.brand.ctaHeadline || 'Ready?' },
                ];
                const prompts = allSlides.map((slide, i) => ({
                    slideId:  slide.id,
                    headline: slide.headline || '',
                    prompt:   buildVisualPrompt({
                        carouselType: selectedType,
                        slideId:      slide.id,
                        brand:        normalizeBrand(useBrandVoice ? brandVoice : null, data.brand),
                        slideContent: { ...slide, _index: i },
                    }),
                }));
                setGptQueue(prompts);
                setIsGenerating(false);
                // Start with slide 0 only
                generateOneGptSlide(prompts, 0, [], data);
                return;
            } else {
                // ── HTML Render path: carouselGenerator → Playwright
                setGenStatus('Rendering slides with Playwright…');
                const normalizedData = {
                    ...data,
                    brand: normalizeBrand(useBrandVoice ? brandVoice : null, data.brand),
                };
                const resp = await fetch(getApiUrl('/api/carousel/generate'), {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ carouselData: normalizedData, userId }),
                });
                const result = await resp.json();
                if (!resp.ok) throw new Error(result?.error || `Server error ${resp.status}`);
                setSlideImages(result.slides || []);
                setActiveSlide(0);
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: `🎉 Done! ${result.slides.length} slides at 1080×1350px — download and post!`,
                }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: `Generation failed: ${err.message}`,
            }]);
        } finally {
            setIsGenerating(false);
            setGenStatus('');
        }
    };

    // ── Download ──────────────────────────────────────────────────────────────

    const downloadSlide = (url, idx) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(carouselData?.brand?.name || 'carousel').replace(/\s/g, '-')}-slide-${idx + 1}.png`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const downloadAll = async () => {
        for (const slide of slideImages) {
            await downloadSlide(slide.url, slide.index);
            await new Promise(r => setTimeout(r, 300));
        }
    };

    // ── Reset ─────────────────────────────────────────────────────────────────

    const reset = () => {
        setSelectedType(null);
        setCarouselData(null);
        setSlideImages([]);
        setActiveSlide(0);
        setMessages([]);
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    const hasImages = slideImages.length > 0;
    const activeImg = slideImages.find(s => s.index === activeSlide)?.url || null;

    return (
        <div className="flex-1 flex overflow-hidden">

            {/* ════ LEFT: Chat ════ */}
            <div className="w-[360px] flex-shrink-0 flex flex-col border-r border-white/10 bg-black/30">

                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/20 shrink-0">
                    <LayoutGrid className="w-4 h-4 text-pink-400" />
                    {selectedType ? (() => {
                        const t = CAROUSEL_TYPES.find(x => x.id === selectedType);
                        return (
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="text-base leading-none">{t?.emoji}</span>
                                <span className="text-[10px] font-black uppercase tracking-wider text-white/60 truncate">{t?.label}</span>
                                <button
                                    onClick={reset}
                                    className="ml-1 text-[9px] text-white/25 hover:text-white/60 border border-white/10 rounded-full px-1.5 py-0.5 transition-colors shrink-0">
                                    change
                                </button>
                            </div>
                        );
                    })() : (
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 flex-1">ZeroLens AI</span>
                    )}
                    {/* Engine toggle */}
                    <div className="flex items-center gap-1 shrink-0">
                        {IMAGE_MODELS.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setImageEngine(m.id)}
                                title={m.desc}
                                className={cn(
                                    'text-[9px] font-black px-2 py-0.5 rounded-full border transition-all',
                                    imageEngine === m.id
                                        ? 'bg-pink-500/20 border-pink-500/40 text-pink-400'
                                        : 'bg-white/[0.03] border-white/10 text-white/30 hover:text-white/60'
                                )}>
                                {m.emoji} {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Brand Voice Toggle */}
                {brandVoice?.brandName && (
                    <div className="px-4 py-2 border-b border-white/8 bg-black/20 shrink-0">
                        <button
                            onClick={() => setUseBrandVoice(v => !v)}
                            className={cn(
                                'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all',
                                useBrandVoice ? 'border-[#D4FF00]/40 bg-[#D4FF00]/5' : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                            )}>
                            <div className={cn(
                                'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                                useBrandVoice ? 'border-[#D4FF00] bg-[#D4FF00]' : 'border-white/30'
                            )}>
                                {useBrandVoice && <span className="text-black text-[9px] font-black">✓</span>}
                            </div>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {brandVoice.logoUrl && (
                                    <img src={brandVoice.logoUrl} className="w-5 h-5 rounded object-contain bg-white/10" alt="logo" />
                                )}
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-white/70 truncate">{brandVoice.brandName}</p>
                                    <p className="text-[9px] text-white/30 truncate">{brandVoice.words?.filter(Boolean).join(' · ')}</p>
                                </div>
                            </div>
                            <span className={cn('text-[9px] font-black uppercase tracking-wider shrink-0', useBrandVoice ? 'text-[#D4FF00]' : 'text-white/20')}>
                                {useBrandVoice ? 'ON' : 'OFF'}
                            </span>
                        </button>
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {!selectedType && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
                            <span className="text-4xl">🎨</span>
                            <p className="text-white/50 font-black text-sm uppercase tracking-wider">ZeroLens Carousel</p>
                            <p className="text-white/20 text-xs max-w-[200px] leading-relaxed">Pick a carousel type to start.</p>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                            {m.role === 'assistant' && (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                                    <Bot className="w-3 h-3 text-white" />
                                </div>
                            )}
                            <div className={cn(
                                'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words',
                                m.role === 'user'
                                    ? 'bg-white/10 text-white rounded-tr-sm'
                                    : 'bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 text-white/80 rounded-tl-sm'
                            )}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex gap-2 justify-start">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                                <Bot className="w-3 h-3 text-white" />
                            </div>
                            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                                {[0, 1, 2].map(i => (
                                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-pink-400/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Generation progress bar */}
                {isGenerating && (
                    <div className="px-4 py-2.5 border-t border-white/8 bg-black/30 shrink-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Loader2 className="w-3 h-3 text-pink-400 animate-spin shrink-0" />
                            <span className="text-[10px] text-white/40">{genStatus}</span>
                        </div>
                        <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-pink-500 to-orange-500 rounded-full animate-pulse w-2/3" />
                        </div>
                    </div>
                )}

                {/* Input */}
                <div className="p-3 border-t border-white/10 flex gap-2 items-end shrink-0">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder={selectedType ? 'Reply here… (Enter to send)' : 'Pick a carousel type first →'}
                        rows={1}
                        disabled={!selectedType || isGenerating}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-pink-500/40 resize-none transition-colors disabled:opacity-40"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isThinking || !selectedType || isGenerating}
                        className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shrink-0">
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* ════ RIGHT: Preview ════ */}
            <div className="flex-1 flex flex-col bg-[#050507] overflow-hidden">

                {/* ── Has slides ── */}
                {hasImages && carouselData ? (
                    <>
                        {/* Toolbar */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/30 shrink-0 flex-wrap gap-y-2">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: carouselData.brand?.color || '#fff' }} />
                                <span className="text-[11px] font-black uppercase tracking-widest text-white/60">{carouselData.brand?.name}</span>
                                <span className="text-[10px] text-white/25">{slideImages.length} slides · 1080×1350</span>
                            </div>
                            <div className="ml-auto flex gap-2">
                                {/* GPT Image approval buttons */}
                                {gptPending && imageEngine === 'gpt-image' && (
                                    <>
                                        <span className="flex items-center text-[10px] text-white/40 font-black uppercase tracking-wider">
                                            Slide {gptPending.index + 1}/{gptQueue.length} — approve?
                                        </span>
                                        <button
                                            onClick={regenSlide}
                                            disabled={isGenerating}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white/60 text-[10px] font-black uppercase tracking-wider hover:text-white hover:bg-white/10 transition-all disabled:opacity-40">
                                            <RefreshCw className="w-3 h-3" /> Redo
                                        </button>
                                        <button
                                            onClick={approveSlide}
                                            disabled={isGenerating}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/30">
                                            ✓ Approve &amp; Next
                                        </button>
                                    </>
                                )}
                                {!gptPending && (
                                <button
                                    onClick={() => generateCarousel()}
                                    disabled={isGenerating}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-pink-900/30">
                                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    {isGenerating ? 'Generating…' : 'Regenerate'}
                                </button>
                                )}
                                <button
                                    onClick={downloadAll}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white/60 text-[10px] font-black uppercase tracking-wider hover:text-white hover:bg-white/10 transition-all">
                                    <Download className="w-3 h-3" /> Download All
                                </button>
                                <button
                                    onClick={reset}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-wider hover:text-white hover:bg-white/10 transition-all">
                                    <RefreshCw className="w-3 h-3" /> New
                                </button>
                            </div>
                        </div>

                        {/* Thumbnail strip */}
                        <div className="flex gap-2 px-4 py-3 border-b border-white/8 overflow-x-auto no-scrollbar shrink-0">
                            {slideImages.map((slide) => (
                                <button
                                    key={slide.index}
                                    onClick={() => setActiveSlide(slide.index)}
                                    className={cn(
                                        'shrink-0 rounded-xl overflow-hidden border-2 transition-all hover:scale-105',
                                        activeSlide === slide.index
                                            ? 'border-pink-500 shadow-lg shadow-pink-900/40'
                                            : 'border-white/10 opacity-60 hover:opacity-100'
                                    )}>
                                    <div style={{ width: 48, aspectRatio: '4/5' }}>
                                        <img src={slide.url} className="w-full h-full object-cover" alt={`Slide ${slide.index + 1}`} />
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Active slide */}
                        <div className="flex-1 overflow-y-auto flex items-start justify-center p-6 custom-scrollbar">
                            <div className="flex gap-8 items-start max-w-3xl w-full">

                                {/* Phone frame */}
                                <div className="shrink-0" style={{ width: 280 }}>
                                    <div
                                        className="rounded-[28px] overflow-hidden border-2 border-white/15 shadow-2xl shadow-black/80 bg-black"
                                        style={{ aspectRatio: '4/5' }}>
                                        {activeImg
                                            ? <img src={activeImg} className="w-full h-full object-cover" alt={`Slide ${activeSlide + 1}`} />
                                            : <div className="w-full h-full bg-gradient-to-br from-[#1a0a2e] to-[#0a0a1e] flex items-center justify-center">
                                                <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
                                              </div>
                                        }
                                    </div>
                                    {/* Prev / dot nav / Next */}
                                    <div className="flex justify-between items-center mt-3">
                                        <button
                                            onClick={() => setActiveSlide(p => Math.max(0, p - 1))}
                                            disabled={activeSlide === 0}
                                            className="p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white disabled:opacity-20 transition-all">
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <div className="flex gap-1 items-center">
                                            {slideImages.map((_, pi) => (
                                                <button
                                                    key={pi}
                                                    onClick={() => setActiveSlide(pi)}
                                                    className={cn('rounded-full transition-all',
                                                        pi === activeSlide ? 'w-5 h-1.5 bg-pink-400' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
                                                    )} />
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setActiveSlide(p => Math.min(slideImages.length - 1, p + 1))}
                                            disabled={activeSlide === slideImages.length - 1}
                                            className="p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white disabled:opacity-20 transition-all">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Slide info panel */}
                                <div className="flex-1 space-y-4 pt-2 min-w-0">
                                    {(() => {
                                        // Find the slide data by index
                                        const slideData = carouselData.slides[activeSlide] || carouselData.slides[0];
                                        const isCTA     = activeSlide === slideImages.length - 1;
                                        return (
                                            <>
                                                <div>
                                                    <p className="text-[9px] text-pink-400/60 font-black uppercase tracking-[0.3em] mb-1">
                                                        Slide {activeSlide + 1} of {slideImages.length}
                                                        {isCTA ? ' · CTA' : ` · ${slideData?.id || ''}`}
                                                    </p>
                                                    <p className="text-white font-black text-lg leading-tight">
                                                        {isCTA
                                                            ? carouselData.brand?.ctaHeadline
                                                            : (slideData?.headline || carouselData.brand?.hook)}
                                                    </p>
                                                    <p className="text-white/40 text-xs mt-1">
                                                        {isCTA
                                                            ? carouselData.brand?.ctaBody
                                                            : slideData?.body}
                                                    </p>
                                                </div>

                                                {/* GPT Prompt */}
{imageEngine === 'gpt-image' && (
<div className="bg-[#0a0a1a] border border-pink-500/20 rounded-xl p-3 space-y-2">
    <div className="flex items-center justify-between">
        <p className="text-[9px] text-pink-400/70 font-black uppercase tracking-[0.2em]">GPT Prompt</p>
        <button onClick={() => { const p = gptQueue?.[activeSlide]?.prompt || ''; setEditingPrompt(p); setShowPromptEditor(!showPromptEditor); }}
            className="p-1 rounded text-white/25 hover:text-pink-400 hover:bg-white/5 transition-all"><Edit3 className="w-3 h-3" /></button>
    </div>
    {showPromptEditor && (
        <div className="space-y-2">
            <textarea value={editingPrompt} onChange={e => setEditingPrompt(e.target.value)} rows={5}
                className="w-full bg-black/50 border border-pink-500/30 rounded-lg px-3 py-2 text-[11px] text-white/80 font-mono resize-y outline-none focus:border-pink-500/60"
                placeholder="Edit prompt…" />
            <button onClick={regenerateWithEditedPrompt} disabled={isGenerating || !editingPrompt.trim()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider hover:scale-105 transition-all disabled:opacity-40">
                <Sparkles className="w-3 h-3" /> Regenerate
            </button>
        </div>
    )}
    {!showPromptEditor && (
        <p className="text-white/40 text-[10px] leading-relaxed font-mono line-clamp-3">
            {gptQueue?.[activeSlide]?.prompt || 'No prompt'}
        </p>
    )}
</div>
)}

{/* Brand system info */}
                                                <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3 space-y-2">
                                                    <p className="text-[9px] text-white/25 font-black uppercase tracking-[0.2em]">Brand System</p>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="w-4 h-4 rounded-full border border-white/10 shrink-0" style={{ background: carouselData.brand?.color }} />
                                                        <span className="text-white/40 text-[11px]">{carouselData.brand?.color}</span>
                                                        <span className="text-white/20 text-[11px]">·</span>
                                                        <span className="text-white/40 text-[11px] capitalize">{carouselData.brand?.fontStyle || 'modern'}</span>
                                                        <span className="text-white/20 text-[11px]">·</span>
                                                        <span className="text-white/40 text-[11px]">@{carouselData.brand?.handle}</span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 flex-wrap">
                                                    <button
                                                        onClick={() => activeImg && downloadSlide(activeImg, activeSlide)}
                                                        disabled={!activeImg}
                                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all disabled:opacity-30 shadow-md shadow-pink-900/30">
                                                        <Download className="w-3 h-3" /> Save PNG
                                                    </button>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </>

                ) : isGenerating ? (
                    /* ── Generating state ── */
                    <div className="flex-1 flex flex-col items-center justify-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-xl shadow-pink-900/40">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-black text-sm uppercase tracking-wider mb-2">Building Your Carousel</p>
                            <p className="text-white/30 text-xs max-w-[240px] leading-relaxed">{genStatus || 'Rendering 1080×1350px slides…'}</p>
                        </div>
                        <div className="flex gap-2">
                            {[...Array(7)].map((_, i) => (
                                <div key={i} className="rounded-lg bg-white/5 border border-white/8 animate-pulse" style={{ width: 40, height: 50, animationDelay: `${i * 0.1}s` }} />
                            ))}
                        </div>
                    </div>

                ) : selectedType ? (
                    /* ── Type selected, waiting for chat ── */
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="max-w-lg mx-auto">
                            {(() => {
                                const t = CAROUSEL_TYPES.find(x => x.id === selectedType);
                                return (
                                    <>
                                        <div className={cn('rounded-2xl bg-gradient-to-br p-px mb-6', t.color)}>
                                            <div className="rounded-2xl bg-[#080810] p-5 flex items-center gap-3">
                                                <span className="text-3xl">{t.emoji}</span>
                                                <div>
                                                    <p className="text-white font-black text-lg tracking-tight">{t.label}</p>
                                                    <p className="text-white/40 text-xs">{t.desc}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-3">Pipeline</p>
                                        <div className="space-y-2">
                                            {[
                                                { n: '01', title: 'Chat with AI',          desc: 'Answer 6 quick questions' },
                                                { n: '02', title: 'Color System Built',    desc: '6-token palette derived from your brand color' },
                                                { n: '03', title: 'Typography Set',        desc: 'Google Fonts pairing matched to your style' },
                                                { n: '04', title: 'Playwright Renders',    desc: 'Each slide captured at 1080×1350px' },
                                                { n: '05', title: 'Download & Post',       desc: 'Instagram-ready PNGs in seconds' },
                                            ].map(item => (
                                                <div key={item.n} className="flex items-start gap-3 rounded-xl bg-white/[0.03] border border-white/6 px-3.5 py-2.5">
                                                    <span className="text-[10px] font-black text-pink-400/60 min-w-[24px]">{item.n}</span>
                                                    <div>
                                                        <p className="text-white/60 text-[11px] font-black">{item.title}</p>
                                                        <p className="text-white/25 text-[10px] mt-0.5">{item.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-white/15 text-center mt-6">← Answer the questions in the chat</p>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                ) : (
                    /* ── Type picker ── */
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="max-w-2xl mx-auto">
                            <div className="mb-6">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Carousel Studio</p>
                                <p className="text-white font-black text-xl">What kind of carousel?</p>
                                <p className="text-white/25 text-xs mt-1">HTML design system · 1080×1350px · Instagram ready</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {CAROUSEL_TYPES.map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => handleSelectType(type)}
                                        className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:border-white/20 hover:bg-white/[0.06] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
                                        <div className="flex items-start justify-between mb-3">
                                            <span className="text-2xl">{type.emoji}</span>
                                            <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors mt-0.5" />
                                        </div>
                                        <p className="text-white font-black text-sm tracking-tight">{type.label}</p>
                                        <p className="text-white/35 text-[11px] mt-0.5 leading-snug">{type.desc}</p>
                                        <div className={cn('absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity', type.color)} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
