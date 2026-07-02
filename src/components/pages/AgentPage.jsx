import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Trash2, Loader2, Sparkles, Image, FileText, LayoutGrid, Zap, Play, Brain, User, Sliders, X, Copy, Check, Film } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getApiUrl } from '../../config/apiConfig';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import DirectorAgentPage from './DirectorAgentPage';
import ScriptWriterPage from './ScriptWriterPage';
import CarouselBriefPage from './CarouselBriefPage';

const HERMES_API = 'http://localhost:8642';

const TOOLS = [
    { id: 'director', icon: Film, label: 'Director Mode', color: 'text-violet-400', desc: 'Full cinematic prompt engineering' },
    { id: 'seedance', icon: Play, label: 'Seedance', color: 'text-cyan-400', desc: 'Cinematic video prompt builder' },
    { id: 'script', icon: FileText, label: 'Script Writer', color: 'text-blue-400', desc: 'Reels, ads, storytelling' },
    { id: 'image_prompt', icon: Image, label: 'Image Generator', color: 'text-purple-400', desc: 'Visual prompts for image models' },
    { id: 'calendar', icon: Brain, label: '30-Day Content Plan', color: 'text-yellow-400', desc: 'Social media calendar & strategy' },
    { id: 'carousel', icon: LayoutGrid, label: 'Carousel Brief', color: 'text-pink-400', desc: 'Instagram carousel planning' },
];

const SYSTEM_PROMPT = `You are ZeroLens AI — an intelligent creative agent embedded in ZeroLens Studio.

Your capabilities:
- Generate carousel slide plans (ask for brand/topic/style details)
- Write marketing copy: viral reels scripts, video narration scripts, social ads, hooks
- Create content calendars and brand voice strategies
- Engineer high-quality visual prompts for images and video generators
- Build cinematic video prompts for Seedance 2

You are a CREATIVE CONTENT WRITER AND ART DIRECTOR ONLY. Do not assist with programming or code tasks.`;

export default function AgentPage() {
    const userProfile = useAppStore(state => state.userProfile);
    const userId = userProfile?.id;

    const getApiKey = () => {
        if (userProfile?.role === 'admin' || userProfile?.email === 'premspaw@gmail.com') {
            return window.__ADMIN_GOOGLE_API_KEY__ || import.meta.env.VITE_ADMIN_GOOGLE_API_KEY || localStorage.getItem('GOOGLE_API_KEY') || window.aistudio?.apiKey || import.meta.env.VITE_GOOGLE_API_KEY || '';
        }
        return localStorage.getItem('GOOGLE_API_KEY') || window.aistudio?.apiKey || import.meta.env.VITE_GOOGLE_API_KEY || '';
    };

    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hey! I'm ZeroLens AI — your creative agent. Choose a mode below to get started.", ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [activeTool, setActiveTool] = useState(null);
    const [sessionReady, setSessionReady] = useState(false);
    const [hermesSessionId, setHermesSessionId] = useState(null);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    const PROMPT_VERSION = '2'; // version for agent prompt cache
    useEffect(() => {
        let cancelled = false;
        let retryInterval = null;

        const storedVersion = localStorage.getItem('agent_prompt_version');
        if (storedVersion !== PROMPT_VERSION) { 
            localStorage.removeItem('agent_session_id'); 
            localStorage.setItem('agent_prompt_version', PROMPT_VERSION); 
        }

        const checkOrCreateSession = async () => {
            const existingId = localStorage.getItem('agent_session_id');
            if (existingId) {
                try {
                    const r = await fetch(`${HERMES_API}/api/sessions/${existingId}`);
                    if (r.ok) {
                        if (!cancelled) {
                            setHermesSessionId(existingId);
                            setSessionReady(true);
                            if (retryInterval) clearInterval(retryInterval);
                        }
                        return;
                    }
                } catch (e) {
                    console.debug('[AgentPage] Error verifying session:', e);
                }
                localStorage.removeItem('agent_session_id');
            }

            try {
                const headers = { 'Content-Type': 'application/json' };
                const adminKey = getApiKey();
                if (adminKey) headers['x-admin-trial-key'] = adminKey;

                const r = await fetch(`${HERMES_API}/api/sessions`, { 
                    method: 'POST', 
                    headers, 
                    body: JSON.stringify({ system_prompt: SYSTEM_PROMPT }) 
                });
                const data = await r.json();
                if (data.session_id && !cancelled) {
                    localStorage.setItem('agent_session_id', data.session_id);
                    setHermesSessionId(data.session_id);
                    setSessionReady(true);
                    if (retryInterval) clearInterval(retryInterval);
                }
            } catch (err) {
                console.warn('[AgentPage] Bridge unavailable, retrying in 4 seconds...');
                if (!cancelled) setSessionReady(false);
            }
        };

        checkOrCreateSession();

        retryInterval = setInterval(() => {
            if (!sessionReady && !cancelled) {
                checkOrCreateSession();
            }
        }, 4000);

        return () => {
            cancelled = true;
            if (retryInterval) clearInterval(retryInterval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionReady]);

    const handleToolClick = (toolId) => {
        setActiveTool(activeTool === toolId ? null : toolId);
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isThinking) return;
        setInput('');

        const userMsg = { role: 'user', content: text, tool: activeTool, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setIsThinking(true);

        if (!sessionReady || !hermesSessionId) {
            setMessages([...nextMessages, { role: 'assistant', content: "Error: AI Session is not initialized. Please verify that the Hermes Agent Bridge is running and try again.", ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
            setIsThinking(false);
            return;
        }

        try {
            const toolLabel = activeTool ? TOOLS.find(t => t.id === activeTool)?.label || activeTool : null;
            
            const headers = { 'Content-Type': 'application/json' };
            const adminKey = getApiKey();
            if (adminKey) headers['x-admin-trial-key'] = adminKey;

            const resp = await fetch(`${HERMES_API}/api/sessions/${hermesSessionId}/chat`, {
                method: 'POST', headers,
                body: JSON.stringify({ message: toolLabel ? `[${toolLabel.toUpperCase()} MODE]\n${text}` : text }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || `Error ${resp.status}`);
            const assistantMsg = { role: 'assistant', content: data.text || '', ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
            setMessages([...nextMessages, assistantMsg]);
        } catch (err) {
            setMessages([...nextMessages, { role: 'assistant', content: `Error: ${err.message}`, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        } finally {
            setIsThinking(false);
        }
    };

    const clearChat = () => {
        setMessages([{ role: 'assistant', content: "Chat cleared. Select a mode to start creating.", ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        setActiveTool(null);
    };

    if (!userProfile) {
        const setActiveTab = useAppStore.getState().setActiveTab;
        return (
            <div className="h-full flex items-center justify-center bg-[#06060c] text-white">
                <div className="text-center max-w-md px-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-violet-900/50">
                        <Bot className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Sign in to use ZeroLens AI</h2>
                    <p className="text-sm text-white/40 leading-relaxed mb-6">You need an account to chat with the AI agent.</p>
                    <button onClick={() => setActiveTab('auth')} className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm hover:from-violet-500 hover:to-indigo-500 transition-all shadow-xl shadow-violet-900/30">Sign In</button>
                </div>
            </div>
        );
    }

    // Director, Script, and Carousel render their own full-page UI
    if (activeTool === 'director') {
        return <DirectorAgentPage activeTool={activeTool} setActiveTool={setActiveTool} />;
    }
    if (activeTool === 'script') {
        return <ScriptWriterPage activeTool={activeTool} setActiveTool={setActiveTool} />;
    }
    if (activeTool === 'carousel') {
        return <CarouselBriefPage activeTool={activeTool} setActiveTool={setActiveTool} />;
    }

    return (
        <div className="h-full flex bg-[#06060c] text-white overflow-hidden">
            <div className="w-52 shrink-0 flex flex-col border-r border-white/5 bg-[#0a0a14]/60 backdrop-blur-xl">
                <div className="px-4 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
                        <p className="text-xs font-black text-white tracking-tight">ZeroLens AI</p>
                    </div>
                    <div className={cn("mt-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full w-fit border", sessionReady ? "bg-emerald-500/10 border-emerald-500/20" : "bg-yellow-500/10 border-yellow-500/20")}>
                        <div className={cn("w-1 h-1 rounded-full animate-pulse", sessionReady ? "bg-emerald-400" : "bg-yellow-400")} />
                        <span className={cn("text-[7px] font-bold uppercase tracking-wider", sessionReady ? "text-emerald-400" : "text-yellow-400")}>{sessionReady ? "Session Ready" : "Connecting"}</span>
                    </div>
                </div>
                <div className="p-3 border-b border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 mb-2.5">Modes</p>
                    <div className="space-y-1">
                        {TOOLS.map(tool => {
                            const Icon = tool.icon;
                            const active = activeTool === tool.id;
                            return (
                                <button key={tool.id} onClick={() => handleToolClick(tool.id)}
                                    className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-200 border', active ? 'bg-white/[0.06] border-white/10' : 'hover:bg-white/[0.03] border-transparent')}>
                                    <Icon className={cn('w-3.5 h-3.5 shrink-0', active ? tool.color : 'text-white/30')} />
                                    <div className="min-w-0">
                                        <p className={cn('text-[10px] font-black tracking-wide', active ? 'text-white' : 'text-white/60')}>{tool.label}</p>
                                        <p className="text-[9px] text-white/35 truncate leading-tight mt-0.5">{tool.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="p-3 border-t border-white/5 mt-auto">
                    <button onClick={clearChat} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold text-white/30 hover:text-white/60 hover:bg-white/5 border border-white/5 transition-all uppercase tracking-wider">
                        <Trash2 className="w-3 h-3" /> Clear Chat
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-[#08080e]">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
                        {messages.length === 1 && (
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {[
                                    "Write a script for a 30-second Reel about productivity hacks",
                                    "Create a 5-slide carousel for a fitness brand launch",
                                    "Build a 30-day content calendar for a fashion label",
                                    "Generate a video prompt for a luxury perfume ad"
                                ].map((p, i) => (
                                    <button key={i} onClick={() => { setInput(p); }}
                                        className="text-left text-[12px] text-white/50 bg-white/[0.02] border border-white/[0.06] rounded-2xl px-4 py-3.5 hover:bg-white/[0.05] hover:text-white/80 transition-all leading-relaxed">
                                        {p}
                                    </button>
                                ))}
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-white" /></div>
                                )}
                                <div className={cn('relative max-w-[80%] rounded-2xl px-5 py-3.5 leading-relaxed', msg.role === 'user' ? 'bg-gradient-to-br from-violet-600/25 to-indigo-600/15 border border-violet-500/15 text-white/90' : 'bg-white/[0.03] border border-white/[0.06] text-white/80')}>
                                    <div className="text-[15px] leading-relaxed tracking-wide">{msg.content}</div>
                                    <div className="mt-1.5 text-[10px] text-white/20">{msg.ts}</div>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/[0.08] flex items-center justify-center shrink-0"><User className="w-4 h-4 text-white/40" /></div>
                                )}
                            </div>
                        ))}

                        {isThinking && (
                            <div className="flex gap-3 justify-start">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-white" /></div>
                                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3 flex items-center gap-2.5">
                                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                                    <span className="text-[13px] text-white/30 font-medium">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                </div>

                <div className="border-t border-white/[0.04] bg-[#0a0a14]/80 backdrop-blur-xl shrink-0">
                    <div className="max-w-3xl mx-auto px-4 py-3">
                        <div className="flex gap-3 items-end">
                            <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3.5 focus-within:border-indigo-500/40 transition-all">
                                <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    placeholder={activeTool ? `Instruct ${TOOLS.find(t => t.id === activeTool)?.label}...` : "Message ZeroLens AI..."}
                                    rows={1} className="w-full bg-transparent text-[14px] text-white placeholder-white/25 outline-none resize-none leading-relaxed" style={{ minHeight: '24px' }} />
                            </div>
                            <button onClick={handleSend} disabled={!input.trim() || isThinking}
                                className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white disabled:opacity-20 disabled:cursor-not-allowed hover:from-indigo-400 hover:to-indigo-500 active:scale-95 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] shrink-0">
                                {isThinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
