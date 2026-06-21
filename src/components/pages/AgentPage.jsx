import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Bot, Send, Trash2, Loader2, Sparkles, Image, FileText, LayoutGrid, Zap, 
    ChevronDown, ChevronUp, Brain, Terminal, Globe, Sliders, User, Key, 
    Volume2, FolderOpen, ToggleLeft, ToggleRight, Settings, Play, Plus, X 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getApiUrl } from '../../config/apiConfig';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';

const AGENT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

// Restricted to Content Creation, Scriptwriting, Reels, and Visual Prompts
const TOOLS = [
    { id: 'carousel', icon: LayoutGrid, label: 'Carousel Brief', color: 'text-pink-400', desc: 'Design Instagram carousels & briefs' },
    { id: 'script', icon: FileText, label: 'Scriptwriting / Reel', color: 'text-blue-400', desc: 'Write viral reels, scripts & shorts' },
    { id: 'video_prompt', icon: Sparkles, label: 'Video Prompter', color: 'text-orange-400', desc: 'Engineered prompts for video tools' },
    { id: 'image_prompt', icon: Image, label: 'Image Prompter', color: 'text-purple-400', desc: 'Engineered prompts for image tools' },
    { id: 'calendar', icon: Brain, label: 'Content Strategy', color: 'text-yellow-400', desc: 'Content calendar & brand strategy' },
];

const SYSTEM_PROMPT = `You are ZeroLens AI — an intelligent creative agent embedded in ZeroLens Studio, a professional content creation platform.

Your capabilities:
- Generate carousel slide plans (ask for brand/topic/style details)
- Write marketing copy: viral reels scripts, video narration scripts, social ads, hooks
- Create content calendars and brand voice strategies
- Engineer high-quality visual prompts for images and video generators (Seedance, Nano Banana, Veo)

SCOPE AND CONSTRAINTS:
- YOU ARE A CREATIVE CONTENT WRITER AND ART DIRECTOR ONLY.
- Under NO circumstances should you assist with programming, writing code, software development, debugging, or tech engineering questions. If the user asks for code, script code, HTML, CSS, JavaScript, or any programming task, you MUST politely decline and redirect them back to content creation: "I am Hermes, your AI Creative Director. I specialize in scripting, storytelling, reel production, and art direction. Let's design an amazing content strategy or script for your brand instead!"

Your personality:
- Direct, intelligent, and professional
- Format responses with clear sections, use **bold** for emphasis, use bullet points where helpful
- Current platform: AI Studio — a SaaS platform for content creators, marketers and brands.`;

const SUGGESTED_PROMPTS = [
    "Create a 6-slide Instagram carousel about productivity tips for entrepreneurs",
    "Write 5 Instagram captions for a skincare brand launch",
    "Build a 30-day content calendar for a fitness brand",
    "Write a Facebook ad for a $97 online course on social media marketing",
    "What's the best content strategy for a new B2B SaaS product?",
    "Review my brand positioning and suggest improvements",
];

function ToolBadge({ tool }) {
    if (!tool) return null;
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

        // Parse code blocks (if any, though restricted, keep for layout integrity)
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
                {msg.tool && <div className="mb-2"><ToolBadge tool={TOOLS.find(t => t.id === msg.tool)} /></div>}
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

    // Chat State
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: `Hey! I'm **ZeroLens AI** — your creative agent powered by NVIDIA Nemotron 120B.\n\nI can help you with:\n- Instagram carousels & content plans\n- Storytelling scripts & viral Reels copy\n- High-fidelity video and image prompt engineering\n- Weekly content calendars & brand voice strategy\n\nWhat do you want to create today?`,
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

    // Configuration Panel State
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [configTab, setConfigTab] = useState('persona'); // 'persona' | 'skills' | 'keys' | 'targets'
    
    // Configurable fields (persisted in localStorage)
    const [customPersona, setCustomPersona] = useState(() => {
        return localStorage.getItem('hermes_custom_persona') || '';
    });
    const [apiKeys, setApiKeys] = useState(() => {
        const saved = localStorage.getItem('hermes_api_keys');
        return saved ? JSON.parse(saved) : { openRouter: '', elevenLabs: '', openAi: '', anthropic: '', telegram: '' };
    });
    const [workspaceTarget, setWorkspaceTarget] = useState(() => {
        return localStorage.getItem('hermes_workspace_target') || 'AGENTS.md';
    });
    const [ttsAsset, setTtsAsset] = useState(() => {
        return localStorage.getItem('hermes_tts_asset') || 'default_voice';
    });

    // DB Skills
    const [dbSkills, setDbSkills] = useState([]);
    const [activeSkills, setActiveSkills] = useState(() => {
        const saved = localStorage.getItem('hermes_active_skills');
        return saved ? JSON.parse(saved) : [];
    });

    // Memory Import UI States
    const [showMemoryImport, setShowMemoryImport] = useState(false);
    const [importMemoryText, setImportMemoryText] = useState('');

    const handleImportMemories = async () => {
        if (!importMemoryText.trim()) return;
        const newFacts = importMemoryText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 2);
        
        if (newFacts.length > 0) {
            const updatedMemory = [...new Set([...memory, ...newFacts])].slice(-50);
            setMemory(updatedMemory);
            await saveMemory(updatedMemory);
            setImportMemoryText('');
            setShowMemoryImport(false);
        }
    };

    const handleDeleteMemory = async (index) => {
        const updatedMemory = memory.filter((_, idx) => idx !== index);
        setMemory(updatedMemory);
        await saveMemory(updatedMemory);
    };

    // Save configurations
    useEffect(() => {
        localStorage.setItem('hermes_custom_persona', customPersona);
    }, [customPersona]);

    useEffect(() => {
        localStorage.setItem('hermes_api_keys', JSON.stringify(apiKeys));
    }, [apiKeys]);

    useEffect(() => {
        localStorage.setItem('hermes_workspace_target', workspaceTarget);
    }, [workspaceTarget]);

    useEffect(() => {
        localStorage.setItem('hermes_tts_asset', ttsAsset);
    }, [ttsAsset]);

    useEffect(() => {
        localStorage.setItem('hermes_active_skills', JSON.stringify(activeSkills));
    }, [activeSkills]);

    // Load active skills from Supabase
    useEffect(() => {
        const fetchDbSkills = async () => {
            if (!supabase) return;
            try {
                const { data, error } = await supabase
                    .from('hermes_skills')
                    .select('*')
                    .eq('is_active', true);
                if (!error && data) {
                    setDbSkills(data);
                }
            } catch (err) {
                console.warn("[AgentConfig] Failed to load hermes_skills:", err.message);
            }
        };
        fetchDbSkills();
    }, []);

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
        } catch (err) {
            console.warn('[AgentPage] Failed to save memory:', err.message);
        }
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

            // Assemble dynamic system prompt combining base prompt + custom settings
            let compiledSystemPrompt = SYSTEM_PROMPT;
            
            if (customPersona.trim()) {
                compiledSystemPrompt += `\n\n[CUSTOM PERSONA / SOUL.md]\n${customPersona.trim()}`;
            }

            // Append instructions from selected active skills
            const selectedSkillsData = dbSkills.filter(s => activeSkills.includes(s.name));
            if (selectedSkillsData.length > 0) {
                compiledSystemPrompt += `\n\n[ACTIVE SPECIALIST SKILLS]:`;
                selectedSkillsData.forEach(s => {
                    compiledSystemPrompt += `\n### Skill: ${s.name}\n${s.system_instructions}`;
                });
            }

            if (workspaceTarget) {
                compiledSystemPrompt += `\n\n[WORKSPACE INSTRUCTIONS]\nTarget target instructions are bound to: ${workspaceTarget}`;
            }

            if (activeTool) {
                compiledSystemPrompt += `\n\n[CURRENT TASK MODE]\nMode: ${TOOLS.find(t => t.id === activeTool)?.label} — ${TOOLS.find(t => t.id === activeTool)?.desc}`;
            }

            const resp = await fetch(getApiUrl('/api/agent/chat'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history,
                    systemPrompt: compiledSystemPrompt,
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

    const toggleSkill = (skillName) => {
        setActiveSkills(prev => 
            prev.includes(skillName) 
                ? prev.filter(name => name !== skillName) 
                : [...prev, skillName]
        );
    };

    return (
        <div className="h-full flex bg-[#06060c] text-white overflow-hidden font-sans relative">
            {/* Background glowing matrix orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#6366f1]/5 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" />

            {/* LEFT: Tools + Memory sidebar */}
            <div className="w-64 shrink-0 flex flex-col border-r border-white/5 bg-[#0a0a14]/60 backdrop-blur-xl">
                {/* Header */}
                <div className="px-4 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-7.5 h-7.5 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center shadow-lg shadow-violet-950/60 relative">
                            <div className="absolute inset-0 rounded-xl bg-white/10 animate-ping opacity-25 scale-75" />
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-white tracking-tight uppercase italic">Hermes AI</p>
                            <p className="text-[9px] text-white/45 font-mono">Nemotron 128B · Creative</p>
                        </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full w-fit">
                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider">Ready</span>
                    </div>
                </div>

                {/* Tools */}
                <div className="p-3 border-b border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 mb-2.5">Studio Task Modes</p>
                    <div className="space-y-1">
                        {TOOLS.map(tool => {
                            const Icon = tool.icon;
                            const active = activeTool === tool.id;
                            return (
                                <button key={tool.id}
                                    onClick={() => setActiveTool(active ? null : tool.id)}
                                    className={cn(
                                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-200 border',
                                        active
                                            ? 'bg-gradient-to-r from-white/[0.06] to-white/[0.02] border-white/10 shadow-inner'
                                            : 'hover:bg-white/[0.03] border-transparent'
                                    )}>
                                    <Icon className={cn('w-3.5 h-3.5 shrink-0 transition-colors duration-200', active ? tool.color : 'text-white/30')} />
                                    <div className="min-w-0">
                                        <p className={cn('text-[10px] font-black tracking-wide', active ? 'text-white' : 'text-white/60')}>{tool.label}</p>
                                        <p className="text-[9px] text-white/35 truncate leading-tight mt-0.5">{tool.desc}</p>
                                    </div>
                                    {active && <div className={cn('ml-auto w-1.5 h-1.5 rounded-full shadow-lg shadow-current', tool.color)} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Memory */}
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Persistent Memories</p>
                        <button 
                            onClick={() => setShowMemoryImport(!showMemoryImport)}
                            className="text-[9px] font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                        >
                            <Plus className="w-2.5 h-2.5" /> Import
                        </button>
                    </div>

                    {showMemoryImport && (
                        <div className="mb-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-indigo-300 uppercase tracking-wider">Bulk Import</span>
                                <button 
                                    onClick={() => {
                                        setImportMemoryText("Brand: zeroLens\nTone: energetic, professional, direct\nTarget Audience: marketing teams, content creators\nVisual Style: high contrast, cinematic lighting, modern neon accent");
                                    }}
                                    className="text-[8px] font-bold text-white/40 hover:text-white/70 transition-colors underline"
                                >
                                    Use Template
                                </button>
                            </div>
                            
                            <textarea
                                value={importMemoryText}
                                onChange={(e) => setImportMemoryText(e.target.value)}
                                placeholder="Paste memories (one per line, e.g. Brand: zeroLens)"
                                className="w-full h-24 bg-black/40 border border-white/5 rounded-lg p-2 text-[10px] text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 resize-none font-sans"
                            />

                            <div className="text-[9px] text-white/40 leading-relaxed bg-black/20 p-2 rounded-lg border border-white/[0.02]">
                                <span className="font-bold text-indigo-300/80">How Hermes uses this:</span> These facts are automatically injected as custom context in your copywriting, reel script writing, and video generation modes to maintain brand consistency.
                            </div>

                            <div className="flex gap-1.5 justify-end">
                                <button 
                                    onClick={() => {
                                        setShowMemoryImport(false);
                                        setImportMemoryText('');
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-[9px] font-bold text-white/45 hover:text-white/70 hover:bg-white/5 border border-transparent transition-all uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleImportMemories}
                                    disabled={!importMemoryText.trim()}
                                    className="px-3 py-1 rounded-lg text-[9px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all uppercase tracking-wider shadow-md shadow-indigo-950/50"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    )}

                    {memory.length === 0 ? (
                        <div className="space-y-2">
                            <p className="text-[10px] text-white/20 leading-relaxed bg-white/[0.01] border border-white/5 rounded-xl p-3">
                                Hermes constructs memories as you converse. Brand profiles, tones, and target niches populate here. You can also import them directly.
                            </p>
                            <div className="text-[9px] text-white/30 leading-relaxed bg-white/[0.01] border border-white/5 rounded-xl p-3">
                                <span className="font-bold text-indigo-400/80 block mb-1">💡 Pro-tip: How to use memories</span>
                                Add facts like:
                                <ul className="list-disc pl-3 mt-1 space-y-0.5">
                                    <li>Brand: BrandName</li>
                                    <li>Audience: Fitness Enthusiasts</li>
                                    <li>Tone: Humorous & casual</li>
                                    <li>Topic: Vegan healthy meals</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {memory.map((m, i) => (
                                <div key={i} className="group relative text-[10px] text-white/60 bg-white/[0.02] border border-white/5 rounded-lg px-2.5 py-1.5 pr-7 leading-relaxed font-medium transition-all hover:bg-white/[0.04] hover:border-white/10">
                                    {m}
                                    <button 
                                        onClick={() => handleDeleteMemory(i)}
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all duration-150 p-0.5"
                                        title="Delete memory"
                                    >
                                        <X className="w-2.5 h-2.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Clear */}
                <div className="p-3 border-t border-white/5">
                    <button onClick={clearChat}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold text-white/30 hover:text-white/60 hover:bg-white/5 border border-white/8 transition-all uppercase tracking-wider">
                        <Trash2 className="w-3 h-3" /> Reset Chat State
                    </button>
                </div>
            </div>

            {/* RIGHT: Chat area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 bg-[#0a0a14]/40 shrink-0">
                    <Zap className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-white/70 italic">Hermes AI Director</span>
                    {activeTool && (() => {
                        const t = TOOLS.find(x => x.id === activeTool);
                        const Icon = t.icon;
                        return (
                            <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-wider', t.color)}>
                                <Icon className="w-2.5 h-2.5" /> {t.label} Active
                            </div>
                        );
                    })()}
                    
                    {/* Settings Trigger */}
                    <button 
                        onClick={() => setIsConfigOpen(!isConfigOpen)}
                        className={cn(
                            "ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wider uppercase transition-all duration-200",
                            isConfigOpen 
                                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                                : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                        )}
                    >
                        <Sliders className="w-3.5 h-3.5" /> Configuration
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 custom-scrollbar">
                    {/* Suggested prompts — only show if just the greeting */}
                    {messages.length === 1 && (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            {SUGGESTED_PROMPTS.map((p, i) => (
                                <button key={i} onClick={() => handleSend(p)}
                                    className="text-left text-[11px] text-white/50 bg-white/[0.015] border border-white/5 rounded-2xl px-4 py-3 hover:bg-white/[0.04] hover:text-white/80 hover:border-white/10 transition-all duration-200 leading-snug shadow-sm">
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
                                <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                                <span className="text-[12px] text-white/30">Hermes is shaping concepts…</span>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/5 bg-[#0a0a14]/40 shrink-0">
                    <div className="flex gap-2 items-end max-w-4xl mx-auto w-full">
                        <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl px-4 py-3 focus-within:border-indigo-500/40 focus-within:bg-white/[0.03] transition-all">
                            <textarea
                                ref={textRef}
                                value={input}
                                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                placeholder={activeTool ? `Instruct Hermes on ${TOOLS.find(t => t.id === activeTool)?.label}…` : "Ask Hermes for scripting, reel concepts, or visual prompts…"}
                                rows={1}
                                className="w-full bg-transparent text-sm text-white placeholder-white/20 outline-none resize-none leading-relaxed"
                                style={{ maxHeight: 160 }}
                            />
                        </div>
                        <button onClick={() => handleSend()}
                            disabled={!input.trim() || isThinking}
                            className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 shrink-0">
                            {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-[9px] text-white/20 mt-2 text-center font-mono">Hermes AI · NVIDIA Nemotron 128B via OpenRouter · Creative Mode</p>
                </div>
            </div>

            {/* CONFIGURATION PANEL SLIDE-OUT DRAWER */}
            {isConfigOpen && (
                <div className="w-80 shrink-0 border-l border-white/5 bg-[#0a0a14]/90 backdrop-blur-2xl flex flex-col z-10 transition-all duration-300">
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Agent Configuration</h3>
                            <p className="text-[9px] text-white/30 uppercase mt-0.5 font-mono">Import soul, memories, and skills</p>
                        </div>
                        <button 
                            onClick={() => setIsConfigOpen(false)}
                            className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Sub-tabs */}
                    <div className="flex border-b border-white/5 bg-black/10">
                        {[
                            { id: 'persona', label: 'Persona', icon: User },
                            { id: 'skills', label: 'Skills', icon: Brain },
                            { id: 'keys', label: 'API Keys', icon: Key },
                            { id: 'targets', label: 'Targets', icon: FolderOpen }
                        ].map(tab => {
                            const TabIcon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setConfigTab(tab.id)}
                                    className={cn(
                                        "flex-1 flex flex-col items-center gap-1 py-2 text-[9px] font-bold uppercase tracking-wider transition-all",
                                        configTab === tab.id
                                            ? "text-indigo-400 bg-white/[0.03] border-b border-indigo-400"
                                            : "text-white/40 hover:text-white/70"
                                    )}
                                >
                                    <TabIcon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
                        {configTab === 'persona' && (
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-bold text-white mb-1">Import Soul Persona</h4>
                                    <p className="text-[10px] text-white/40 mb-2">Simulate import from <strong>SOUL.md</strong> to train the Agent's identity and persona parameters.</p>
                                    <textarea
                                        value={customPersona}
                                        onChange={(e) => setCustomPersona(e.target.value)}
                                        rows={12}
                                        placeholder="# SOUL.md&#10;name: Hermes Creative Director&#10;tone: bold, highly conversational&#10;style: cinematic storytelling..."
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 font-mono text-[10px] text-zinc-300 outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setCustomPersona(`# SOUL.md\nname: Hermes Creative Director\ntone: Proactive, artistic, highly opinionated, descriptive\nstyle: A24 Cinematic pacing, visual storytelling, rich vocabulary\nconstraints: Always pitch 1-2 creative design hook ideas on every prompt`);
                                        }}
                                        className="flex-1 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase text-white/60 hover:text-white transition-all"
                                    >
                                        Load Template
                                    </button>
                                    <button
                                        onClick={() => setCustomPersona('')}
                                        className="py-1.5 px-3 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-950/30 rounded-lg text-[9px] font-black uppercase transition-all"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        )}

                        {configTab === 'skills' && (
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-bold text-white mb-1">Import User Skills</h4>
                                    <p className="text-[10px] text-white/40 mb-3">Toggle skills created by Admins to inject writing presets directly into the session.</p>
                                    
                                    <div className="space-y-2">
                                        {dbSkills.map(skill => {
                                            const active = activeSkills.includes(skill.name);
                                            return (
                                                <button
                                                    key={skill.id}
                                                    onClick={() => toggleSkill(skill.name)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left",
                                                        active 
                                                            ? "bg-indigo-500/10 border-indigo-500/30 text-white" 
                                                            : "bg-white/[0.01] border-white/5 text-white/50 hover:bg-white/[0.03]"
                                                    )}
                                                >
                                                    <div className="min-w-0 pr-2">
                                                        <p className="font-bold text-[10px]">{skill.name}</p>
                                                        <p className="text-[9px] text-white/30 truncate mt-0.5">{skill.description}</p>
                                                    </div>
                                                    {active ? <ToggleRight className="w-5 h-5 text-indigo-400 shrink-0" /> : <ToggleLeft className="w-5 h-5 text-white/20 shrink-0" />}
                                                </button>
                                            );
                                        })}
                                        {dbSkills.length === 0 && (
                                            <p className="text-[10px] text-white/20 italic text-center py-4 bg-white/[0.01] rounded-xl border border-white/5">
                                                No active database skills found. Go to Landing Admin {`>`} Hermes Skills to create one!
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {configTab === 'keys' && (
                            <div className="space-y-3">
                                <div>
                                    <h4 className="font-bold text-white mb-1">Platform Credentials</h4>
                                    <p className="text-[10px] text-white/40 mb-3">Allowlist secret keys and platform messaging targets for automation.</p>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { key: 'openRouter', label: 'OpenRouter API Key', placeholder: 'sk-or-...' },
                                        { key: 'elevenLabs', label: 'ElevenLabs API Key', placeholder: 'el-...' },
                                        { key: 'openAi', label: 'OpenAI API Key', placeholder: 'sk-proj-...' },
                                        { key: 'telegram', label: 'Telegram Bot Token / Config', placeholder: 'bot...' }
                                    ].map(item => (
                                        <div key={item.key} className="space-y-1">
                                            <label className="text-[9px] text-white/40 uppercase tracking-widest font-black block">{item.label}</label>
                                            <input
                                                type="password"
                                                value={apiKeys[item.key] || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setApiKeys(prev => ({ ...prev, [item.key]: val }));
                                                }}
                                                placeholder={item.placeholder}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 font-mono text-[10px] text-white outline-none focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {configTab === 'targets' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="font-bold text-white mb-1">Workspace & Audio Assets</h4>
                                    <p className="text-[10px] text-white/40 leading-relaxed">Define the working target file (e.g. <strong>AGENTS.md</strong>) and choose active Text-To-Speech background tracks.</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-white/40 uppercase tracking-widest font-black block">Workspace Target (AGENTS.md)</label>
                                        <input
                                            type="text"
                                            value={workspaceTarget}
                                            onChange={(e) => setWorkspaceTarget(e.target.value)}
                                            placeholder="e.g. AGENTS.md"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 font-mono text-[10px] text-white outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-white/40 uppercase tracking-widest font-black block">TTS Output Accent & Audio Track</label>
                                        <select
                                            value={ttsAsset}
                                            onChange={(e) => setTtsAsset(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] text-white outline-none focus:border-indigo-500 transition-colors"
                                        >
                                            <option value="default_voice">ElevenLabs Adam (Male / Narrative)</option>
                                            <option value="female_energetic">ElevenLabs Rachel (Female / Energetic Reel)</option>
                                            <option value="google_tts">Google Cloud Wavenet-C (Standard)</option>
                                            <option value="silent">No TTS (Silent Script)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
}
