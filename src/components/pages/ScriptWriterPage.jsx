import React, { useState, useRef, useEffect } from 'react';
import { FileText, Send, Loader2, User, Bot, Trash2, Plus, Zap, Sliders, X, Copy, Check, Film, Clapperboard, Megaphone, Monitor, BookOpen, Globe, Mic, Youtube, Sparkles, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getApiUrl } from '../../config/apiConfig';
import { useAppStore } from '../../store';

const HERMES_API = 'http://localhost:8642';

const SCRIPT_TYPES = [
    { id: 'reels', label: 'Reels', icon: Film, color: 'text-pink-400', desc: '15-60s vertical videos', template: 'viral hooks, fast pacing, trend-aware' },
    { id: 'commercial', label: 'Commercial', icon: Megaphone, color: 'text-orange-400', desc: 'TV & digital ads', template: 'brand-focused, persuasive, 30-60s' },
    { id: 'trailer', label: 'Trailer', icon: Clapperboard, color: 'text-amber-400', desc: 'Movie & product trailers', template: 'cinematic pacing, teaser structure, emotional arc' },
    { id: 'shortfilm', label: 'Short Film', icon: Film, color: 'text-violet-400', desc: 'Narrative 1-15 min films', template: 'three-act structure, character-driven' },
    { id: 'documentary', label: 'Documentary', icon: BookOpen, color: 'text-emerald-400', desc: 'Factual storytelling', template: 'narrative arc, interview structure, B-roll planning' },
    { id: 'brandfilm', label: 'Brand Film', icon: Sparkles, color: 'text-blue-400', desc: 'Corporate & brand stories', template: 'mission-driven, emotional resonance' },
    { id: 'podcast', label: 'Podcast', icon: Mic, color: 'text-purple-400', desc: 'Audio/video episodes', template: 'intro, segments, outro, guest flow' },
    { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-red-400', desc: 'Long-form content', template: 'hook, retention curve, CTA optimization' },
    { id: 'ugc', label: 'UGC', icon: Globe, color: 'text-cyan-400', desc: 'User-generated content scripts', template: 'authentic tone, casual delivery, platform-native' },
];

const SYSTEM_PROMPTS = {
    reels: `You are ZeroLens Script Writer — Reels specialist. Write fast-paced, hook-driven vertical video scripts optimized for Reels, Shorts, and TikTok. Format: HOOK (0-3s) → BODY (3-45s) → CTA (45-60s). Include visual cues, text overlays, and audio suggestions.`,
    commercial: `You are ZeroLens Script Writer — Commercial specialist. Write persuasive brand scripts for TV, streaming, and digital ads. Format: PROBLEM → SOLUTION → BENEFIT → CTA. Include visual direction, voiceover, and timing.`,
    trailer: `You are ZeroLens Script Writer — Trailer specialist. Write cinematic trailer scripts with emotional pacing. Format: TEASE → BUILD → CLIMAX → REVEAL. Include music cues, visual transitions, and title cards.`,
    shortfilm: `You are ZeroLens Script Writer — Short Film specialist. Write narrative short film scripts with three-act structure. Include character descriptions, scene headings, dialogue, and visual direction.`,
    documentary: `You are ZeroLens Script Writer — Documentary specialist. Write factual documentary scripts with narrative arc. Format: THEME → INTERVIEWS → B-ROLL → NARRATIVE THREAD. Include interview questions and visual sequences.`,
    brandfilm: `You are ZeroLens Script Writer — Brand Film specialist. Write emotionally resonant brand stories. Format: MISSION → JOURNEY → IMPACT → FUTURE. Include visual metaphors and brand voice guidelines.`,
    podcast: `You are ZeroLens Script Writer — Podcast specialist. Write podcast episode structures with engaging flow. Format: INTRO → TOPIC → SEGMENTS → OUTRO. Include talking points, guest questions, and ad breaks.`,
    youtube: `You are ZeroLens Script Writer — YouTube specialist. Write retention-optimized long-form scripts. Format: HOOK → RETENTION → VALUE → CTA. Include chapter markers, visual cues, and thumbnail ideas.`,
    ugc: `You are ZeroLens Script Writer — UGC specialist. Write authentic user-generated content scripts. Format: HOOK → STORY → RELATABLE → CTA. Keep casual, platform-native, and trend-aware.`,
};

const SUGGESTED = {
    reels: ['5 hook ideas for a fitness brand Reel', 'Write a 30s Reel script for a skincare launch', 'Trend transition idea for fashion haul'],
    commercial: ['30s TV commercial for a luxury watch brand', 'Digital ad script for a SaaS product', 'Brand awareness ad for a sustainable fashion line'],
    trailer: ['Movie trailer for a sci-fi thriller', 'Product launch trailer script', 'Short film teaser trailer'],
    shortfilm: ['5-min short film about a time traveler', 'Coming-of-age short film outline', 'Dialogue-driven short film scene'],
    documentary: ['5-min documentary on urban farming', 'Interview questions for a chef documentary', 'Documentary opening narration'],
    brandfilm: ['Brand film for an eco-friendly startup', 'Corporate mission story script', 'Founder story brand film'],
    podcast: ['Podcast episode on AI in filmmaking', 'Interview structure for a creator podcast', 'Podcast intro and outro script'],
    youtube: ['10-min YouTube video on video editing tips', 'YouTube essay hook ideas', 'Sponsorship integration script'],
    ugc: ['UGC script for a skincare product', 'Authentic review script for a gadget', 'Day-in-the-life UGC storyboard'],
};

const ANTI_SLOP_RULES = `
CRITICAL WRITING RULES (STOP SLOP):
1. Cut filler phrases (throat-clearing openers, emphasis crutches, adverbs).
2. Break formulaic structures (no binary contrasts, negative listings, dramatic fragmentation).
3. Use active voice (no passive constructions).
4. Be specific (no vague declaratives or lazy extremes like "every", "always").
5. Put the reader in the room ("You" beats "People").
6. Vary rhythm (mix sentence lengths, no em dashes).
7. Trust readers (state facts directly, skip softening).
8. Cut quotables (no pull-quote style sentences).
9. NO FAKE CASUAL OPENERS: Never start a script with "Okay, wait," "Hear me out," "I'm not even joking," or "Listen up." Just start the script immediately.`;

export default function ScriptWriterPage({ activeTool, setActiveTool }) {
    const userProfile = useAppStore(state => state.userProfile);
    const [activeType, setActiveType] = useState('reels');
    const [messages, setMessages] = useState([
        { role: 'assistant', content: `Choose a script type and describe your project. I'll write a professional ${SCRIPT_TYPES.find(s => s.id === 'reels')?.label.toLowerCase()} script for you.`, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [hermesSessionId, setHermesSessionId] = useState(null);
    const [sessionReady, setSessionReady] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isThinking]);

    useEffect(() => { setSessionReady(false); setHermesSessionId(null); }, [activeType]);

    useEffect(() => {
        if (!hermesSessionId && !sessionReady) {
            const system_prompt = (SYSTEM_PROMPTS[activeType] || '') + ANTI_SLOP_RULES;
            fetch(`${HERMES_API}/api/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_prompt }) })
                .then(r => r.json())
                .then(data => { if (data.session_id) { setHermesSessionId(data.session_id); setSessionReady(true); } })
                .catch(err => { console.warn('[ScriptWriter] Bridge unavailable:', err.message); });
        }
    }, [hermesSessionId, sessionReady, activeType]);

    useEffect(() => {
        const st = SCRIPT_TYPES.find(s => s.id === activeType);
        if (st) {
            setMessages([{ role: 'assistant', content: `**${st.label}** mode active.\n\nDescribe your project — I'll write a professional ${st.label.toLowerCase()} script following ${st.template}.`, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        }
    }, [activeType]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isThinking || !sessionReady || !hermesSessionId) return;
        setInput('');
        const userMsg = { role: 'user', content: text, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setIsThinking(true);
        try {
            const resp = await fetch(`${HERMES_API}/api/sessions/${hermesSessionId}/chat`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `[${SCRIPT_TYPES.find(s => s.id === activeType)?.label.toUpperCase()} MODE]\n${text}` }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || `Error ${resp.status}`);
            setMessages([...nextMessages, { role: 'assistant', content: data.text || '', ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        } catch (err) {
            setMessages([...nextMessages, { role: 'assistant', content: `Error: ${err.message}`, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        } finally { setIsThinking(false); }
    };

    if (!userProfile) {
        return <div className="h-full flex items-center justify-center bg-[#06060c] text-white"><p className="text-sm text-white/40">Sign in to use Script Writer</p></div>;
    }

    return (
        <div className="h-full flex bg-[#06060c] text-white overflow-hidden">
            {/* LEFT: Script Types */}
            <div className="w-52 shrink-0 flex flex-col border-r border-white/5 bg-[#0a0a14]/60 backdrop-blur-xl">
                <div className="px-4 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><FileText className="w-4 h-4 text-white" /></div>
                        <p className="text-xs font-black text-white tracking-tight">Script Writer</p>
                    </div>
                </div>
                <div className="p-3 border-b border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 mb-2.5">Script Types</p>
                    <div className="space-y-1">
                        {SCRIPT_TYPES.map(st => {
                            const Icon = st.icon;
                            const active = activeType === st.id;
                            return (
                                <button key={st.id} onClick={() => setActiveType(st.id)}
                                    className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-200 border', active ? 'bg-blue-500/10 border-blue-500/20' : 'hover:bg-white/[0.03] border-transparent')}>
                                    <Icon className={cn('w-3.5 h-3.5 shrink-0', active ? st.color : 'text-white/30')} />
                                    <div className="min-w-0">
                                        <p className={cn('text-[10px] font-black tracking-wide', active ? 'text-white' : 'text-white/60')}>{st.label}</p>
                                        <p className="text-[9px] text-white/35 truncate leading-tight mt-0.5">{st.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* RIGHT: Chat */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#08080e]">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] bg-[#0a0a14]/30 backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-2">
                        {setActiveTool && (
                            <button onClick={() => setActiveTool(null)} className="mr-1.5 p-1.5 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all border border-white/5 flex items-center justify-center" title="Back to Assistant">
                                <ArrowLeft size={14} />
                            </button>
                        )}
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/80 to-indigo-600/80 flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-white" /></div>
                        <span className="text-sm font-semibold text-white/70">{SCRIPT_TYPES.find(s => s.id === activeType)?.label}</span>
                        <span className="text-[8px] text-white/30 font-mono bg-white/5 px-2 py-0.5 rounded-md">{SCRIPT_TYPES.find(s => s.id === activeType)?.template}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
                        {messages.length === 1 && (
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {(SUGGESTED[activeType] || []).map((p, i) => (
                                    <button key={i} onClick={() => { setInput(p); }}
                                        className="text-left text-[12px] text-white/50 bg-white/[0.02] border border-white/[0.06] rounded-2xl px-4 py-3.5 hover:bg-white/[0.05] hover:text-white/80 transition-all leading-relaxed">{p}</button>
                                ))}
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                {msg.role === 'assistant' && <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-white" /></div>}
                                <div className={cn('relative max-w-[80%] rounded-2xl px-5 py-3.5 leading-relaxed', msg.role === 'user' ? 'bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/10 text-white/90' : 'bg-white/[0.03] border border-white/[0.06] text-white/80')}>
                                    <div className="text-[15px] leading-relaxed tracking-wide">{msg.content}</div>
                                    <div className="mt-1.5 text-[10px] text-white/20">{msg.ts}</div>
                                </div>
                                {msg.role === 'user' && <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/[0.08] flex items-center justify-center shrink-0"><User className="w-4 h-4 text-white/40" /></div>}
                            </div>
                        ))}
                        {isThinking && (
                            <div className="flex gap-3 justify-start">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-white" /></div>
                                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3 flex items-center gap-2.5"><Loader2 className="w-4 h-4 text-blue-400 animate-spin" /><span className="text-[13px] text-white/30 font-medium">Writing script...</span></div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                </div>

                <div className="border-t border-white/[0.02] bg-gradient-to-t from-[#0a0a14]/90 via-[#0a0a14]/70 to-transparent backdrop-blur-2xl shrink-0 relative z-10 before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.01] before:to-transparent before:pointer-events-none">
                    <div className="max-w-3xl mx-auto px-4 py-4">
                        <div className="flex gap-3 items-end">
                            <div className="flex-1 relative group">
                                <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-blue-500/20 via-transparent to-indigo-500/20 opacity-0 group-focus-within:opacity-100 transition-all duration-500 blur-sm" />
                                <div className="relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] rounded-2xl px-5 py-4 focus-within:border-blue-500/30 focus-within:shadow-[0_0_40px_rgba(59,130,246,0.08)] transition-all duration-300 shadow-inner shadow-black/20">
                                    <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                        placeholder={`Describe your ${SCRIPT_TYPES.find(s => s.id === activeType)?.label.toLowerCase()} project...`}
                                        rows={1} className="w-full bg-transparent text-[15px] text-white/90 placeholder-white/15 outline-none resize-none leading-relaxed max-h-[200px] overflow-y-auto" style={{ minHeight: '80px' }} />
                                </div>
                            </div>
                            <button onClick={handleSend} disabled={!input.trim() || isThinking}
                                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white disabled:opacity-20 disabled:cursor-not-allowed hover:from-blue-400 hover:to-indigo-500 active:scale-90 transition-all duration-200 shadow-[0_0_25px_rgba(59,130,246,0.3)] shrink-0 hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:scale-[1.02]">
                                {isThinking ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
