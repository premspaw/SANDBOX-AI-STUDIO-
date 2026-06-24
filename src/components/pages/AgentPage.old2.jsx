import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Trash2, Loader2, Sparkles, Image, FileText, Search, Code2, LayoutGrid, Zap, ChevronDown, ChevronUp, Brain, Terminal, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getApiUrl } from '../../config/apiConfig';
import { useAppStore } from '../../store';

const AGENT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

const TOOLS = [
    { id: 'carousel', icon: LayoutGrid, label: 'Carousel', color: 'text-pink-400', desc: 'Design an Instagram carousel' },
    { id: 'image', icon: Image, label: 'Image Gen', color: 'text-orange-400', desc: 'Generate marketing images' },
    { id: 'copy', icon: FileText, label: 'Copywriting', color: 'text-blue-400', desc: 'Write social captions & ads' },
    { id: 'code', icon: Code2, label: 'Code', color: 'text-emerald-400', desc: 'Write or fix code' },
    { id: 'search', icon: Search, label: 'Research', color: 'text-purple-400', desc: 'Research a topic' },
    { id: 'strategy', icon: Brain, label: 'Strategy', color: 'text-yellow-400', desc: 'Marketing & brand strategy' },
];

const SYSTEM_PROMPT = `You are ZeroLens AI — an intelligent creative agent embedded in ZeroLens Studio, a professional content creation platform.

Your capabilities:
- Generate carousel slide plans (ask for brand/topic/style details)
- Write marketing copy: captions, ads, scripts, email sequences
- Create content strategies and brand guidelines
- Write and review code (React, JavaScript, Python, etc.)
- Research and summarize topics
- Help with any creative or technical task

Your personality:
- Direct, intelligent, and professional
- You remember context within the conversation
- You proactively suggest next steps
- When given a task like "create a carousel", you gather what you need then deliver a structured result
- Format responses with clear sections, use **bold** for emphasis, use bullet points where helpful

When you help with carousel/image tasks, output a structured plan. When writing code, use code blocks. Always be useful and thorough.

Current platform: AI Studio — a Sass platform for content creators, marketers and brands.`;

const SUGGESTED_PROMPTS = [
    "Create a 6-slide Instagram carousel about productivity tips for entrepreneurs",
    "Write 5 Instagram captions for a skincare brand launch",
    "Build a 30-day content calendar for a fitness brand",
    "Write a Facebook ad for a $97 online course on social media marketing",
    "What's the best content strategy for a new B2B SaaS product?",
    "Review my brand positioning and suggest improvements",
];

function ToolBadge({ tool }) {
    const T = tool.icon;
    return (
        <span className={cn('inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/10', tool.color)}>
            <T className="w-2.5 h-2.5" /> {tool.label}
        </span>
    );
}

function MessageBubble({ msg }) {
    const [showRaw, setShowRaw] = useState(false);
    const isUser = msg.role === 'user';

    const renderContent = (text) => {
        const parts = [];
        let remaining = text;
        let key = 0;

        // Parse code blocks
        const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
        let lastIndex = 0;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
            }
            parts.push(
                <div key={key++} className="my-2 rounded-xl overflow-hidden border border-white/10">
                    {match[1] && <div className="px-3 py-1 bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/30">{match[1]}</div>}
                    <pre className="p-3 text-[11px] text-emerald-300 overflow-x-auto bg-black/40 leading-relaxed">{match[2].trim()}</pre>
                </div>
            );
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
            parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
        }
        return parts.length > 0 ? parts : <span>{text}</span>;
    };

    const formatInline = (text) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-black">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="text-white/80">$1</em>')
            .replace(/^### (.*?)$/gm, '<div class="text-white font-black text-sm mt-3 mb-1">$1</div>')
            .replace(/^## (.*?)$/gm, '<div class="text-white font-black text-base mt-4 mb-1">$1</div>')
            .replace(/^# (.*?)$/gm, '<div class="text-white font-black text-lg mt-4 mb-2">$1</div>')
            .replace(/^- (.*?)$/gm, '<div class="flex gap-2 my-0.5"><span class="text-white/30 mt-0.5">•</span><span>$1</span></div>')
            .replace(/^\d+\. (.*?)$/gm, (_, p1, offset, str) => {
                const num = str.slice(0, offset).split('\n').filter(l => /^\d+\./.test(l)).length + 1;
                return `<div class="flex gap-2 my-0.5"><span class="text-white/30 font-black min-w-[1rem]">${num}.</span><span>${p1}</span></div>`;
            })
            .replace(/\n/g, '<br/>');
    };

    return (
        <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
            {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-violet-900/40">
                    <Bot className="w-4 h-4 text-white" />
                </div>
            )}
            <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                isUser
                    ? 'bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/20 text-white ml-auto'
                    : 'bg-white/[0.04] border border-white/8 text-white/80'
            )}>
                {msg.tool && <div className="mb-2"><ToolBadge tool={TOOLS.find(t => t.id === msg.tool) || TOOLS[0]} /></div>}
                <div className="text-[13px] leading-relaxed">{renderContent(msg.content)}</div>
                {msg.thinking && (
                    <button onClick={() => setShowRaw(!showRaw)}
                        className="mt-2 flex items-center gap-1 text-[9px] text-white/20 hover:text-white/40 transition-colors">
                        <Brain className="w-2.5 h-2.5" />
                        {showRaw ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                        {showRaw ? 'Hide' : 'Show'} reasoning
                    </button>
                )}
                {showRaw && msg.thinking && (
                    <pre className="mt-2 text-[10px] text-white/20 whitespace-pre-wrap border-t border-white/5 pt-2">{msg.thinking}</pre>
                )}
                <div className="mt-1 text-[9px] text-white/15">{msg.ts}</div>
            </div>
            {isUser && (
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black text-white/50">
                    U
                </div>
            )}
        </div>
    );
}

export default function AgentPage() {
    const userProfile = useAppStore(state => state.userProfile);
    const userId = userProfile?.id;

    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: `Hey! I'm **ZeroLens AI** — your creative agent powered by NVIDIA Nemotron 120B.\n\nI can help you with:\n- Instagram carousels & content plans\n- Marketing copy & ad scripts\n- Brand strategy & positioning\n- Code, research, and anything else\n\nWhat do you want to create today?`,
            ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [activeTool, setActiveTool] = useState(null);
    const [memory, setMemory] = useState([]);
    const [memoryLoaded, setMemoryLoaded] = useState(false);
    const bottomRef = useRef(null);
    const textRef = useRef(null);

    // Load memory from R2 on mount
    useEffect(() => {
        if (!userId || memoryLoaded) return;
        fetch(getApiUrl(`/api/agent/memory?userId=${userId}`))
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data.memories) && data.memories.length > 0) {
                    setMemory(data.memories);
                }
                setMemoryLoaded(true);
            })
            .catch(() => setMemoryLoaded(true));
    }, [userId, memoryLoaded]);

    // Save memory to R2
    const saveMemory = async (newMemory) => {
        if (!userId) return;
        try {
            await fetch(getApiUrl('/api/agent/memory'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, memories: newMemory })
            });
        } catch (_) {}
    };

    // Extract memorable facts from AI reply
    const extractMemory = (reply, userMsg) => {
        const facts = [];
        const brandMatch = userMsg.match(/(?:brand|company|business)[:\s]+([\w\s&.'-]{2,30})/i);
        if (brandMatch) facts.push(`Brand: ${brandMatch[1].trim()}`);
        const colorMatch = userMsg.match(/#[0-9a-fA-F]{3,6}|\b(red|blue|green|black|white|purple|orange|pink|gold|navy)\b/i);
        if (colorMatch) facts.push(`Brand color: ${colorMatch[0]}`);
        const topicMatch = userMsg.match(/(?:about|topic|niche)[:\s]+([\w\s&]{2,40})/i);
        if (topicMatch) facts.push(`Topic interest: ${topicMatch[1].trim()}`);
        return facts;
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    const handleSend = async (text = input.trim()) => {
        if (!text || isThinking) return;
        setInput('');

        const userMsg = {
            role: 'user',
            content: text,
            tool: activeTool,
            ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setIsThinking(true);

        try {
            const history = nextMessages.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.tool
                    ? `[Tool: ${TOOLS.find(t => t.id === m.tool)?.label || m.tool}]\n${m.content}`
                    : m.content
            }));

            const resp = await fetch(getApiUrl('/api/agent/chat'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history,
                    systemPrompt: SYSTEM_PROMPT + (activeTool ? `\n\nCurrent task mode: ${TOOLS.find(t => t.id === activeTool)?.label} — ${TOOLS.find(t => t.id === activeTool)?.desc}` : ''),
                    memory,
                    userId,
                })
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || `Error ${resp.status}`);

            const assistantMsg = {
                role: 'assistant',
                content: data.text || '',
                thinking: data.thinking || null,
                ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages(prev => [...prev, assistantMsg]);

            // Extract facts from user message and save to R2
            const newFacts = extractMemory(data.text || '', text);
            if (newFacts.length > 0) {
                const updatedMemory = [...new Set([...memory, ...newFacts])].slice(-50);
                setMemory(updatedMemory);
                saveMemory(updatedMemory);
            }
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Sorry, something went wrong: ${err.message}`,
                ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const clearChat = () => {
        setMessages([{
            role: 'assistant',
            content: "Chat cleared. What do you want to work on next?",
            ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
        setMemory([]);
        saveMemory([]);
    };

    return (
        <div className="h-full flex bg-[#07070f] text-white overflow-hidden">
            {/* LEFT: Tools + Memory sidebar */}
            <div className="w-64 shrink-0 flex flex-col border-r border-white/8 bg-black/30">
                {/* Header */}
                <div className="px-4 py-4 border-b border-white/8">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
                            <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-white tracking-tight">ZeroLens AI</p>
                            <p className="text-[9px] text-white/30">Nemotron 120B · OpenRouter</p>
                        </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[9px] text-white/30 uppercase tracking-widest">Online via OpenRouter</span>
                    </div>
                </div>

                {/* Tools */}
                <div className="p-3 border-b border-white/8">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-2">Task Mode</p>
                    <div className="space-y-1">
                        {TOOLS.map(tool => {
                            const Icon = tool.icon;
                            const active = activeTool === tool.id;
                            return (
                                <button key={tool.id}
                                    onClick={() => setActiveTool(active ? null : tool.id)}
                                    className={cn(
                                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all',
                                        active
                                            ? 'bg-white/10 border border-white/15'
                                            : 'hover:bg-white/5 border border-transparent'
                                    )}>
                                    <Icon className={cn('w-3.5 h-3.5 shrink-0', active ? tool.color : 'text-white/30')} />
                                    <div>
                                        <p className={cn('text-[10px] font-black', active ? 'text-white' : 'text-white/50')}>{tool.label}</p>
                                        <p className="text-[9px] text-white/20 leading-tight">{tool.desc}</p>
                                    </div>
                                    {active && <div className={cn('ml-auto w-1.5 h-1.5 rounded-full', tool.color.replace('text-', 'bg-'))} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Memory */}
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-2">Session Memory</p>
                    {memory.length === 0 ? (
                        <p className="text-[10px] text-white/15 leading-relaxed">Memory builds as you chat. Key facts about your brand, goals and preferences are stored here.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {memory.map((m, i) => (
                                <div key={i} className="text-[10px] text-white/40 bg-white/3 rounded-lg px-2.5 py-1.5 border border-white/5 leading-relaxed">
                                    {m}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Clear */}
                <div className="p-3 border-t border-white/8">
                    <button onClick={clearChat}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black text-white/30 hover:text-white/60 hover:bg-white/5 border border-white/8 transition-all uppercase tracking-wider">
                        <Trash2 className="w-3 h-3" /> Clear Chat
                    </button>
                </div>
            </div>

            {/* RIGHT: Chat area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-white/8 bg-black/20 shrink-0">
                    <Zap className="w-4 h-4 text-violet-400" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">ZeroLens AI</span>
                    {activeTool && (() => {
                        const t = TOOLS.find(x => x.id === activeTool);
                        const Icon = t.icon;
                        return (
                            <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-wider', t.color)}>
                                <Icon className="w-2.5 h-2.5" /> {t.label} Mode
                            </div>
                        );
                    })()}
                    <div className="ml-auto flex items-center gap-2 text-[9px] text-white/20 uppercase tracking-widest">
                        <Globe className="w-3 h-3" /> {AGENT_MODEL.split('/')[1]?.split(':')[0]}
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 custom-scrollbar">
                    {/* Suggested prompts — only show if just the greeting */}
                    {messages.length === 1 && (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            {SUGGESTED_PROMPTS.map((p, i) => (
                                <button key={i} onClick={() => handleSend(p)}
                                    className="text-left text-[11px] text-white/40 bg-white/[0.025] border border-white/8 rounded-xl px-3 py-2.5 hover:bg-white/[0.05] hover:text-white/60 hover:border-white/15 transition-all leading-snug">
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <MessageBubble key={i} msg={msg} />
                    ))}

                    {isThinking && (
                        <div className="flex gap-3 justify-start">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/40">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-white/[0.04] border border-white/8 rounded-2xl px-4 py-3 flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                                <span className="text-[12px] text-white/30">ZeroLens AI is thinking…</span>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/8 bg-black/20 shrink-0">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 focus-within:border-violet-500/40 transition-colors">
                            <textarea
                                ref={textRef}
                                value={input}
                                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                placeholder={activeTool ? `Ask ZeroLens AI to help with ${TOOLS.find(t => t.id === activeTool)?.label}…` : "Ask ZeroLens AI anything… (Enter to send, Shift+Enter for new line)"}
                                rows={1}
                                className="w-full bg-transparent text-sm text-white placeholder-white/20 outline-none resize-none leading-relaxed"
                                style={{ maxHeight: 160 }}
                            />
                        </div>
                        <button onClick={() => handleSend()}
                            disabled={!input.trim() || isThinking}
                            className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shadow-lg shadow-violet-900/40 shrink-0">
                            {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-[9px] text-white/15 mt-2 text-center">ZeroLens AI · NVIDIA Nemotron 120B via OpenRouter · Free</p>
                </div>
            </div>
        </div>
    );
}
