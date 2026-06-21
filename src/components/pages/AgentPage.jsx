import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Bot, Sparkles, Image, Video, Download, Trash2, Loader2, Edit3, Settings, Play, CheckCircle2, ChevronRight, Globe, Layers, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getApiUrl } from '../../config/apiConfig';
import { useAppStore } from '../../store';

export default function AgentPage() {
    const userProfile = useAppStore(state => state.userProfile);
    const userId = userProfile?.id || 'anon';

    // Form inputs
    const [topic, setTopic] = useState('');
    const [brandName, setBrandName] = useState(userProfile?.brand_voice?.brandName || '');
    const [audience, setAudience] = useState(userProfile?.brand_voice?.whatTheyDo || '');
    const [tone, setTone] = useState('cinematic');
    const [duration, setDuration] = useState('3'); // 3, 5, 7 days
    
    const [isGeneratingCalendar, setIsGeneratingCalendar] = useState(false);
    const [calendarData, setCalendarData] = useState(null);

    // Active card for details view
    const [activeDayIndex, setActiveDayIndex] = useState(null);

    // State to track media generation per day
    // format: { [dayIndex]: { status: 'idle' | 'generating' | 'completed' | 'failed', url: '', progressText: '', type: 'image' | 'video' } }
    const [generationStates, setGenerationStates] = useState({});

    // Sync brand name from store when it loads
    useEffect(() => {
        if (userProfile?.brand_voice?.brandName && !brandName) {
            setBrandName(userProfile.brand_voice.brandName);
        }
        if (userProfile?.brand_voice?.whatTheyDo && !audience) {
            setAudience(userProfile.brand_voice.whatTheyDo);
        }
    }, [userProfile]);

    const handleGenerateCalendar = async () => {
        if (!topic.trim()) return;
        setIsGeneratingCalendar(true);
        setCalendarData(null);
        setGenerationStates({});
        setActiveDayIndex(null);

        const promptText = `Generate a ${duration}-day content calendar campaign for:
- Topic: ${topic}
- Brand Name: ${brandName || 'Not specified'}
- Target Audience: ${audience || 'General public'}
- Style/Tone: ${tone}

Please output the calendar as a structured JSON object.`;

        const CALENDAR_SYSTEM_PROMPT = `You are Hermes, a world-class Social Media Strategist and GenAI Creative Director.
Your task is to generate a premium social media Content Calendar based on the user's campaign topic, brand details, tone, and duration.

Return ONLY a valid JSON object matching this structure exactly (do not output any markdown block, code formatting, or other text outside the JSON):
{
  "theme": "A high-level catchy title for this campaign",
  "audienceSummary": "Brief summary of the target audience",
  "calendar": [
    {
      "day": 1,
      "platform": "Instagram",
      "type": "video",
      "title": "Title of the post",
      "hook": "Scroll-stopping hook",
      "caption": "Highly engaging caption with hashtags",
      "visualPrompt": "Detailed visual prompt for generating the image/video matching this post (e.g. 'Cinematic close-up of gourmet dessert, gold dust, volumetric lighting...')",
      "suggestedModel": "seedance-1-5-pro-251215"
    }
  ]
}`;

        try {
            const resp = await fetch(getApiUrl('/api/agent/chat'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: [{ role: 'user', content: promptText }],
                    systemPrompt: CALENDAR_SYSTEM_PROMPT,
                    memory: [],
                    userId,
                })
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || `Error ${resp.status}`);

            // Parse response JSON
            let cleanText = data.text || '';
            const jsonMatch = cleanText.match(/```json\n?([\s\S]*?)```/) || cleanText.match(/{[\s\S]*}/);
            const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : cleanText;
            const parsed = JSON.parse(jsonStr.trim());
            
            setCalendarData(parsed);
            if (parsed.calendar?.length > 0) {
                setActiveDayIndex(0);
            }
        } catch (err) {
            console.error('Failed to generate calendar:', err);
            alert(`Generation failed: ${err.message}. Please try again.`);
        } finally {
            setIsGeneratingCalendar(false);
        }
    };

    // Trigger Image generation
    const generateImage = async (dayIndex, visualPrompt, model = 'nano-banana-2') => {
        setGenerationStates(prev => ({
            ...prev,
            [dayIndex]: { status: 'generating', progressText: 'Generating premium image...', url: '', type: 'image' }
        }));

        try {
            const resp = await fetch(getApiUrl('/api/generate-image'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: visualPrompt,
                    model: model,
                    userId
                })
            });

            const result = await resp.json();
            if (!resp.ok) throw new Error(result.error || `Server returned ${resp.status}`);

            if (!result.url) throw new Error("No image URL returned from server.");

            setGenerationStates(prev => ({
                ...prev,
                [dayIndex]: { status: 'completed', url: result.url, progressText: '', type: 'image' }
            }));
        } catch (err) {
            console.error("Image generation failed:", err);
            setGenerationStates(prev => ({
                ...prev,
                [dayIndex]: { status: 'failed', progressText: err.message, url: '', type: 'image' }
            }));
        }
    };

    // Trigger Video generation (Seedance) & Poll status
    const generateVideo = async (dayIndex, visualPrompt) => {
        setGenerationStates(prev => ({
            ...prev,
            [dayIndex]: { status: 'generating', progressText: 'Creating video task...', url: '', type: 'video' }
        }));

        try {
            // 1. Create seedance task
            const resp = await fetch(getApiUrl('/api/seedance/generate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    engine: 'seedance-fast',
                    prompt: visualPrompt,
                    duration: 5,
                    aspectRatio: '9:16',
                    userId
                })
            });

            const result = await resp.json();
            if (!resp.ok) throw new Error(result.error || `Server returned ${resp.status}`);

            const { requestId, engine } = result;
            if (!requestId) throw new Error("No task requestId returned from server.");

            setGenerationStates(prev => ({
                ...prev,
                [dayIndex]: { status: 'generating', progressText: 'Video in queue... (approx 30s)', url: '', type: 'video' }
            }));

            // 2. Poll status
            let attempts = 0;
            const maxAttempts = 40; // 200 seconds max
            
            const interval = setInterval(async () => {
                attempts++;
                if (attempts > maxAttempts) {
                    clearInterval(interval);
                    setGenerationStates(prev => ({
                        ...prev,
                        [dayIndex]: { status: 'failed', progressText: 'Generation timed out.', url: '', type: 'video' }
                    }));
                    return;
                }

                try {
                    const statusResp = await fetch(getApiUrl(`/api/seedance/status/${requestId}?userId=${userId}&aspectRatio=9:16&engine=${engine || 'seedance-fast'}`));
                    const statusResult = await statusResp.json();
                    
                    if (statusResult.status === 'completed') {
                        clearInterval(interval);
                        setGenerationStates(prev => ({
                            ...prev,
                            [dayIndex]: { status: 'completed', url: statusResult.url, progressText: '', type: 'video' }
                        }));
                    } else if (statusResult.status === 'failed') {
                        clearInterval(interval);
                        setGenerationStates(prev => ({
                            ...prev,
                            [dayIndex]: { status: 'failed', progressText: statusResult.error || 'Generation failed.', url: '', type: 'video' }
                        }));
                    } else {
                        // Still processing
                        setGenerationStates(prev => ({
                            ...prev,
                            [dayIndex]: { 
                                status: 'generating', 
                                progressText: `Generating video... (${attempts * 5}s)`, 
                                url: '', 
                                type: 'video' 
                            }
                        }));
                    }
                } catch (pollErr) {
                    console.warn("Polling error:", pollErr);
                }
            }, 5000);

        } catch (err) {
            console.error("Video generation failed:", err);
            setGenerationStates(prev => ({
                ...prev,
                [dayIndex]: { status: 'failed', progressText: err.message, url: '', type: 'video' }
            }));
        }
    };

    // Update single post field in calendarState
    const handleUpdateCalendarField = (dayIndex, field, value) => {
        setCalendarData(prev => {
            const updated = [...prev.calendar];
            updated[dayIndex] = {
                ...updated[dayIndex],
                [field]: value
            };
            return {
                ...prev,
                calendar: updated
            };
        });
    };

    return (
        <div className="h-full flex bg-[#07070f] text-white overflow-hidden font-sans">
            {/* LEFT SIDEBAR: Planner Inputs */}
            <div className="w-80 shrink-0 flex flex-col border-r border-white/8 bg-black/40 backdrop-blur-xl p-5 overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-2 mb-6 border-b border-white/8 pb-4">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-wider">Hermes Planner</h2>
                        <p className="text-[9px] text-[#AADD00] uppercase tracking-widest font-bold">Content Studio v2.0</p>
                    </div>
                </div>

                <div className="space-y-5 flex-1">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Campaign Topic / Keyword</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Productivity secrets for SaaS founders"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 outline-none focus:border-[#AADD00] transition-colors"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Brand Name</label>
                        <input
                            type="text"
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            placeholder="e.g. ZeroLens"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 outline-none focus:border-[#AADD00] transition-colors"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Target Audience</label>
                        <input
                            type="text"
                            value={audience}
                            onChange={(e) => setAudience(e.target.value)}
                            placeholder="e.g. Freelancers, creators"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 outline-none focus:border-[#AADD00] transition-colors"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Tone & Visual Style</label>
                        <select
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#AADD00] transition-colors"
                        >
                            <option value="cinematic">Cinematic & Cinematic Lighting</option>
                            <option value="bold">Bold & Streetwear High Contrast</option>
                            <option value="luxury">Luxury & Soft Accent gold</option>
                            <option value="minimalist">Minimalist Apple Style</option>
                            <option value="cyberpunk">Cyberpunk Neon Noir</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Duration (Days)</label>
                        <select
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#AADD00] transition-colors"
                        >
                            <option value="3">3-Day Fast Campaign</option>
                            <option value="5">5-Day Launch Sequence</option>
                            <option value="7">7-Day Full Weekly Flow</option>
                        </select>
                    </div>

                    <button
                        onClick={handleGenerateCalendar}
                        disabled={isGeneratingCalendar || !topic.trim()}
                        className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                        {isGeneratingCalendar ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Analyzing Niche...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3.5 h-3.5" />
                                Generate Campaign
                            </>
                        )}
                    </button>
                </div>

                {calendarData && (
                    <div className="mt-6 pt-4 border-t border-white/8">
                        <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl text-left">
                            <span className="text-[8px] font-black uppercase bg-[#AADD00]/10 border border-[#AADD00]/30 text-[#AADD00] px-2 py-0.5 rounded-full">Active Campaign</span>
                            <h4 className="text-xs font-bold text-white mt-2 truncate">{calendarData.theme}</h4>
                            <p className="text-[10px] text-white/40 mt-1 leading-snug">{calendarData.audienceSummary}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* MAIN PANEL: Calendar view / Details view */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#040409]">
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-white/8 bg-black/20 shrink-0">
                    <Calendar className="w-4 h-4 text-[#AADD00]" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-white/50">AI Content Calendar Studio</span>
                </div>

                {!calendarData && !isGeneratingCalendar ? (
                    /* Initial Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center mb-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500/20 rounded-full blur-md" />
                            <Calendar className="w-6 h-6 text-zinc-400 z-10" />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight uppercase text-white/80">No Active Calendar</h3>
                        <p className="text-xs text-white/30 max-w-sm mt-2 leading-relaxed">
                            Input your topic, brand, and target audience in the sidebar, and let Hermes generate a fully scheduled visual content campaign with automated assets!
                        </p>
                    </div>
                ) : isGeneratingCalendar ? (
                    /* Generating Loader State */
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="relative w-16 h-16 mb-6">
                            <div className="absolute inset-0 rounded-full border border-white/5" />
                            <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-[#AADD00] animate-spin" />
                        </div>
                        <h3 className="text-lg font-bold uppercase tracking-widest text-[#AADD00]">Hermes is Thinking...</h3>
                        <p className="text-xs text-white/30 mt-2 max-w-xs leading-relaxed">
                            Analyzing target audience keywords, mapping emotional triggers, and generating visual content prompts...
                        </p>
                    </div>
                ) : (
                    /* Main Calendar Content Grid */
                    <div className="flex-1 flex overflow-hidden">
                        {/* Day Cards List (Left part of main) */}
                        <div className="w-[55%] border-r border-white/8 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Scheduled Posts</h3>
                                <span className="text-[10px] text-zinc-500 font-mono">{calendarData.calendar?.length} Days</span>
                            </div>

                            <div className="space-y-3">
                                {calendarData.calendar?.map((post, index) => {
                                    const isActive = activeDayIndex === index;
                                    const mediaState = generationStates[index];
                                    
                                    return (
                                        <div key={index}
                                            onClick={() => setActiveDayIndex(index)}
                                            className={cn(
                                                'p-4 rounded-xl border text-left cursor-pointer transition-all relative overflow-hidden',
                                                isActive 
                                                    ? 'bg-white/[0.04] border-blue-500/50 shadow-lg shadow-blue-500/5' 
                                                    : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.02] hover:border-white/10'
                                            )}
                                        >
                                            {/* Glow overlay for active */}
                                            {isActive && (
                                                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
                                            )}

                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-blue-400">DAY {post.day}</span>
                                                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">{post.platform}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {post.type === 'video' ? <Video size={12} className="text-[#AADD00]" /> : <Image size={12} className="text-orange-400" />}
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">{post.type}</span>
                                                </div>
                                            </div>

                                            <h4 className="font-bold text-white text-xs leading-snug">{post.title}</h4>
                                            
                                            <div className="mt-2 flex justify-between items-center">
                                                <p className="text-[10px] text-zinc-400 italic line-clamp-1 flex-1 pr-4">"{post.hook}"</p>
                                                
                                                {/* Media status pill */}
                                                {mediaState && (
                                                    <span className={cn(
                                                        'text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0',
                                                        mediaState.status === 'completed' && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                                                        mediaState.status === 'generating' && 'bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse',
                                                        mediaState.status === 'failed' && 'bg-red-500/15 text-red-400 border border-red-500/30'
                                                    )}>
                                                        {mediaState.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Detailed Editor + Asset Generation (Right part of main) */}
                        {activeDayIndex !== null && calendarData.calendar?.[activeDayIndex] && (() => {
                            const post = calendarData.calendar[activeDayIndex];
                            const mediaState = generationStates[activeDayIndex] || { status: 'idle', url: '', progressText: '' };
                            
                            return (
                                <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-between custom-scrollbar bg-black/10">
                                    <div className="space-y-5">
                                        <div className="flex justify-between items-start border-b border-white/5 pb-4">
                                            <div>
                                                <span className="text-[9px] font-black uppercase bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2.5 py-0.5 rounded-full">Day {post.day} Editor</span>
                                                <h3 className="text-base font-bold text-white mt-2 leading-snug">{post.title}</h3>
                                            </div>
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{post.platform}</span>
                                        </div>

                                        {/* Editable copywriting fields */}
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Post Title</label>
                                                <input
                                                    type="text"
                                                    value={post.title}
                                                    onChange={(e) => handleUpdateCalendarField(activeDayIndex, 'title', e.target.value)}
                                                    className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Scroll-stopping Hook</label>
                                                <input
                                                    type="text"
                                                    value={post.hook}
                                                    onChange={(e) => handleUpdateCalendarField(activeDayIndex, 'hook', e.target.value)}
                                                    className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Caption & Hashtags</label>
                                                <textarea
                                                    value={post.caption}
                                                    onChange={(e) => handleUpdateCalendarField(activeDayIndex, 'caption', e.target.value)}
                                                    rows={4}
                                                    className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500 transition-colors resize-none leading-relaxed"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Hermes Engineered Visual Prompt</label>
                                                <textarea
                                                    value={post.visualPrompt}
                                                    onChange={(e) => handleUpdateCalendarField(activeDayIndex, 'visualPrompt', e.target.value)}
                                                    rows={3}
                                                    className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500 transition-colors resize-none font-mono text-[11px] leading-relaxed"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Visual Generation Panel */}
                                    <div className="mt-8 pt-5 border-t border-white/5">
                                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden min-h-[160px] flex flex-col justify-between">
                                            
                                            {mediaState.status === 'idle' && (
                                                <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                                                    <Layers className="w-8 h-8 text-zinc-600 mb-2" />
                                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No Visual Asset Generated</h4>
                                                    <p className="text-[10px] text-zinc-500 max-w-xs mt-1">
                                                        Trigger the AI generation model to create a dedicated {post.type} based on the prompt.
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            if (post.type === 'video') {
                                                                generateVideo(activeDayIndex, post.visualPrompt);
                                                            } else {
                                                                generateImage(activeDayIndex, post.visualPrompt);
                                                            }
                                                        }}
                                                        className="mt-4 px-6 py-2.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-105 active:scale-95 transition-all text-black flex items-center gap-1.5"
                                                    >
                                                        <Play size={10} className="fill-black text-black" /> Generate {post.type}
                                                    </button>
                                                </div>
                                            )}

                                            {mediaState.status === 'generating' && (
                                                <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                                                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
                                                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">AI Engine Running</h4>
                                                    <p className="text-[10px] text-zinc-500 mt-1">{mediaState.progressText}</p>
                                                </div>
                                            )}

                                            {mediaState.status === 'failed' && (
                                                <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                                                    <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                                                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest">Generation Failed</h4>
                                                    <p className="text-[10px] text-red-400/60 max-w-xs mt-1 leading-snug">{mediaState.progressText}</p>
                                                    <button
                                                        onClick={() => {
                                                            if (post.type === 'video') {
                                                                generateVideo(activeDayIndex, post.visualPrompt);
                                                            } else {
                                                                generateImage(activeDayIndex, post.visualPrompt);
                                                            }
                                                        }}
                                                        className="mt-4 px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-[10px] font-bold uppercase transition-all"
                                                    >
                                                        Retry Generation
                                                    </button>
                                                </div>
                                            )}

                                            {mediaState.status === 'completed' && (
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                                                            <CheckCircle2 size={12} /> Asset Ready
                                                        </span>
                                                        <a 
                                                            href={mediaState.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            download={`day-${post.day}-${post.type}.png`}
                                                            className="text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-white flex items-center gap-1 transition-all bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg"
                                                        >
                                                            <Download size={10} /> Download
                                                        </a>
                                                    </div>

                                                    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
                                                        {mediaState.type === 'video' ? (
                                                            <video src={mediaState.url} controls className="w-full h-full object-contain" />
                                                        ) : (
                                                            <img src={mediaState.url} className="w-full h-full object-contain" alt="Generated post media" />
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
}
