import React, { useState, useRef, useEffect } from 'react';
import { LayoutGrid, Send, Loader2, User, Bot, Trash2, Plus, Zap, Sliders, X, Copy, Check, Sparkles, Type, Image, MousePointerClick, Pen } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getApiUrl } from '../../config/apiConfig';
import { useAppStore } from '../../store';

const HERMES_API = 'http://localhost:8642';

const CAROUSEL_SECTIONS = [
    { id: 'hook', label: 'Hook', icon: Zap, color: 'text-pink-400', desc: 'First slide — stop the scroll', prompt: 'Write 5 scroll-stopping hook options for a carousel about' },
    { id: 'slides', label: 'Slides', icon: Type, color: 'text-purple-400', desc: 'Body slides with value', prompt: 'Create a 5-8 slide carousel structure explaining' },
    { id: 'cta', label: 'CTA', icon: MousePointerClick, color: 'text-green-400', desc: 'Final slide — drive action', prompt: 'Write 3 compelling CTA options for a carousel ending about' },
    { id: 'design', label: 'Design Notes', icon: Image, color: 'text-amber-400', desc: 'Visual style guide', prompt: 'Create design specs including colors, fonts, imagery style for a carousel about' },
    { id: 'headline', label: 'Headlines', icon: Pen, color: 'text-cyan-400', desc: 'Title & subtitle options', prompt: 'Write 10 headline options for a carousel about' },
    { id: 'storyboard', label: 'Storyboard', icon: LayoutGrid, color: 'text-rose-400', desc: 'Full slide-by-slide plan', prompt: 'Create a complete slide-by-slide storyboard for a carousel about' },
];

const SYSTEM_PROMPTS = {
    hook: `You are ZeroLens Carousel Brief — Hook specialist. Write scroll-stopping first slides. Each hook must: grab attention in under 2 seconds, create curiosity gap, promise value. Include headline, subheadline, and visual direction.`,
    slides: `You are ZeroLens Carousel Brief — Slides specialist. Structure value-delivering body slides. Each slide: ONE key point, supporting visual cue, transition to next. Progress logically: Problem → Education → Solution → Proof.`,
    cta: `You are ZeroLens Carousel Brief — CTA specialist. Write action-driving final slides. Options: direct CTA, soft CTA, curiosity CTA, social proof CTA. Include button text, placement, and urgency angle.`,
    design: `You are ZeroLens Carousel Brief — Design Notes specialist. Create comprehensive visual guides. Include: color palette (primary + accent), typography hierarchy, imagery style, layout patterns, icon style, mood board description.`,
    headline: `You are ZeroLens Carousel Brief — Headline specialist. Write attention-grabbing titles and subtitles. Generate multiple options: curiosity, benefit-driven, question-based, number-list, provocative. Include A/B test recommendations.`,
    storyboard: `You are ZeroLens Carousel Brief — Storyboard specialist. Create complete slide-by-slade plans. Each slide: headline, body text, visual direction, transition note. Include overall narrative arc and engagement strategy.`,
};

const SUGGESTED = {
    hook: ['Hook for a productivity app carousel', 'Scroll-stopping first slide for a fitness brand', 'Curiosity gap hook for a finance tip carousel'],
    slides: ['5 slides explaining AI video generation', 'Educational carousel about color grading', 'Problem-solution carousel for skincare'],
    cta: ['CTA for a free ebook download carousel', 'Soft CTA for a brand awareness carousel', 'Urgency CTA for a limited-time offer'],
    design: ['Design specs for a luxury brand carousel', 'Minimalist design guide for a tech carousel', 'Bold color palette for a fitness carousel'],
    headline: ['Headlines for a social media tips carousel', 'Title options for a recipe carousel', 'Question-based headlines for a marketing carousel'],
    storyboard: ['10-slide storyboard for a brand story carousel', 'Educational carousel slide plan for SaaS', 'Before/after transformation carousel outline'],
};

export default function CarouselBriefPage() {
    const userProfile = useAppStore(state => state.userProfile);
    const [activeSection, setActiveSection] = useState('hook');
    const [activeSubSection, setActiveSubSection] = useState(null);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: `**Carousel Brief** — ${CAROUSEL_SECTIONS.find(s => s.id === 'hook')?.label} mode ready.\n\nDescribe your brand, topic, or goal and I'll help craft your carousel.`, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [hermesSessionId, setHermesSessionId] = useState(null);
    const [sessionReady, setSessionReady] = useState(false);
    const [brandInput, setBrandInput] = useState('');
    const [topicInput, setTopicInput] = useState('');
    const [slideCount, setSlideCount] = useState(6);
    const bottomRef = useRef(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isThinking]);

    useEffect(() => { setSessionReady(false); setHermesSessionId(null); }, [activeSection]);

    useEffect(() => {
        if (!hermesSessionId && !sessionReady) {
            const system_prompt = SYSTEM_PROMPTS[activeSection] || '';
            fetch(`${HERMES_API}/api/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_prompt }) })
                .then(r => r.json())
                .then(data => { if (data.session_id) { setHermesSessionId(data.session_id); setSessionReady(true); } })
                .catch(err => { console.warn('[CarouselBrief] Bridge unavailable:', err.message); });
        }
    }, [hermesSessionId, sessionReady, activeSection]);

    useEffect(() => {
        const s = CAROUSEL_SECTIONS.find(s => s.id === activeSection);
        if (s) {
            setMessages([{ role: 'assistant', content: `**${s.label}** mode active.\n\n${s.prompt}. Share your brand and topic below.`, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
            setActiveSubSection(null);
        }
    }, [activeSection]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isThinking || !sessionReady || !hermesSessionId) return;
        setInput('');
        const context = `[Brand: ${brandInput || 'Not specified'}] [Topic: ${topicInput || 'Not specified'}] [Slides: ${slideCount}]\n`;
        const fullText = `${context}${text}`;
        const userMsg = { role: 'user', content: fullText, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setIsThinking(true);
        try {
            const resp = await fetch(`${HERMES_API}/api/sessions/${hermesSessionId}/chat`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `[${CAROUSEL_SECTIONS.find(s => s.id === activeSection)?.label.toUpperCase()}]\n${fullText}` }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || `Error ${resp.status}`);
            setMessages([...nextMessages, { role: 'assistant', content: data.text || '', ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        } catch (err) {
            setMessages([...nextMessages, { role: 'assistant', content: `Error: ${err.message}`, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        } finally { setIsThinking(false); }
    };

    if (!userProfile) {
        return <div className="h-full flex items-center justify-center bg-[#06060c] text-white"><p className="text-sm text-white/40">Sign in to use Carousel Brief</p></div>;
    }

    return (
        <div className="h-full flex bg-[#06060c] text-white overflow-hidden">
            {/* LEFT: Sections */}
            <div className="w-52 shrink-0 flex flex-col border-r border-white/5 bg-[#0a0a14]/60 backdrop-blur-xl">
                <div className="px-4 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center"><LayoutGrid className="w-4 h-4 text-white" /></div>
                        <p className="text-xs font-black text-white tracking-tight">Carousel Brief</p>
                    </div>
                </div>
                <div className="p-3 border-b border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 mb-2.5">Sections</p>
                    <div className="space-y-1">
                        {CAROUSEL_SECTIONS.map(s => {
                            const Icon = s.icon;
                            const active = activeSection === s.id;
                            return (
                                <button key={s.id} onClick={() => setActiveSection(s.id)}
                                    className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-200 border', active ? 'bg-pink-500/10 border-pink-500/20' : 'hover:bg-white/[0.03] border-transparent')}>
                                    <Icon className={cn('w-3.5 h-3.5 shrink-0', active ? s.color : 'text-white/30')} />
                                    <div className="min-w-0">
                                        <p className={cn('text-[10px] font-black tracking-wide', active ? 'text-white' : 'text-white/60')}>{s.label}</p>
                                        <p className="text-[9px] text-white/35 truncate leading-tight mt-0.5">{s.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Context inputs */}
                <div className="p-3 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 mb-2">Context</p>
                    <input value={brandInput} onChange={e => setBrandInput(e.target.value)} placeholder="Brand name" className="w-full bg-black/30 border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder-white/20 outline-none focus:border-pink-500/40 transition-colors" />
                    <input value={topicInput} onChange={e => setTopicInput(e.target.value)} placeholder="Topic / Goal" className="w-full bg-black/30 border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder-white/20 outline-none focus:border-pink-500/40 transition-colors" />
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/30 shrink-0">Slides:</span>
                        <input type="number" min={3} max={15} value={slideCount} onChange={e => setSlideCount(Number(e.target.value))} className="w-14 bg-black/30 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] text-white text-center outline-none focus:border-pink-500/40 transition-colors" />
                    </div>
                </div>
            </div>

            {/* RIGHT: Chat */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#08080e]">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] bg-[#0a0a14]/30 backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500/80 to-rose-600/80 flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-white" /></div>
                        <span className="text-sm font-semibold text-white/70">{CAROUSEL_SECTIONS.find(s => s.id === activeSection)?.label}</span>
                        {brandInput && <span className="text-[8px] text-white/30 font-mono bg-white/5 px-2 py-0.5 rounded-md">{brandInput}</span>}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
                        {messages.length === 1 && (
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {(SUGGESTED[activeSection] || []).map((p, i) => (
                                    <button key={i} onClick={() => { setInput(p); }}
                                        className="text-left text-[12px] text-white/50 bg-white/[0.02] border border-white/[0.06] rounded-2xl px-4 py-3.5 hover:bg-white/[0.05] hover:text-white/80 transition-all leading-relaxed">{p}</button>
                                ))}
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                {msg.role === 'assistant' && <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shrink-0"><LayoutGrid className="w-4 h-4 text-white" /></div>}
                                <div className={cn('relative max-w-[80%] rounded-2xl px-5 py-3.5 leading-relaxed', msg.role === 'user' ? 'bg-gradient-to-br from-pink-600/20 to-rose-600/10 border border-pink-500/10 text-white/90' : 'bg-white/[0.03] border border-white/[0.06] text-white/80')}>
                                    <div className="text-[15px] leading-relaxed tracking-wide">{msg.content}</div>
                                    <div className="mt-1.5 text-[10px] text-white/20">{msg.ts}</div>
                                </div>
                                {msg.role === 'user' && <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/[0.08] flex items-center justify-center shrink-0"><User className="w-4 h-4 text-white/40" /></div>}
                            </div>
                        ))}
                        {isThinking && (
                            <div className="flex gap-3 justify-start">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shrink-0"><LayoutGrid className="w-4 h-4 text-white" /></div>
                                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3 flex items-center gap-2.5"><Loader2 className="w-4 h-4 text-pink-400 animate-spin" /><span className="text-[13px] text-white/30 font-medium">Creating carousel...</span></div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                </div>

                <div className="border-t border-white/[0.02] bg-gradient-to-t from-[#0a0a14]/90 via-[#0a0a14]/70 to-transparent backdrop-blur-2xl shrink-0 relative z-10 before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.01] before:to-transparent before:pointer-events-none">
                    <div className="max-w-3xl mx-auto px-4 py-4">
                        <div className="flex gap-3 items-end">
                            <div className="flex-1 relative group">
                                <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-pink-500/20 via-transparent to-rose-500/20 opacity-0 group-focus-within:opacity-100 transition-all duration-500 blur-sm" />
                                <div className="relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] rounded-2xl px-5 py-4 focus-within:border-pink-500/30 focus-within:shadow-[0_0_40px_rgba(236,72,153,0.08)] transition-all duration-300 shadow-inner shadow-black/20">
                                    <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                        placeholder={`Describe your carousel ${CAROUSEL_SECTIONS.find(s => s.id === activeSection)?.label.toLowerCase()} needs...`}
                                        rows={1} className="w-full bg-transparent text-[15px] text-white/90 placeholder-white/15 outline-none resize-none leading-relaxed max-h-[200px] overflow-y-auto" style={{ minHeight: '80px' }} />
                            </div>
                            </div>
                            <button onClick={handleSend} disabled={!input.trim() || isThinking}
                                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white disabled:opacity-20 disabled:cursor-not-allowed hover:from-pink-400 hover:to-rose-500 active:scale-90 transition-all duration-200 shadow-[0_0_25px_rgba(236,72,153,0.3)] shrink-0 hover:shadow-[0_0_40px_rgba(236,72,153,0.5)] hover:scale-[1.02]">
                                {isThinking ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
