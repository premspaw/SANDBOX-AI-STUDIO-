import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Bot, Send, Trash2, Loader2, Sparkles, Image, FileText, LayoutGrid, Zap, 
    ChevronDown, ChevronUp, Brain, Terminal, Globe, Sliders, User, Key, 
    Volume2, FolderOpen, ToggleLeft, ToggleRight, Settings, Play, Plus, X,
    Copy, Check, Paperclip, FileAudio, Camera, MapPin, Box, Palette, Sun,
    Eye, Crosshair, TrendingUp, Monitor, Film, RefreshCw, Lightbulb,
    Compass, Layers, Target, Flag, ArrowRight, List, Grid3X3, Shirt,
    Upload, PanelRight, Video
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getApiUrl } from '../../config/apiConfig';
import { useAppStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { AssetsLibrary } from '../panels/AssetsLibrary';

const HERMES_API = 'http://localhost:8642';

const DIRECTORS = [
    { name: 'Christopher Nolan', focus: 'Story Structure' },
    { name: 'Denis Villeneuve', focus: 'Composition & Scale' },
    { name: 'David Fincher', focus: 'Precision & Camera' },
    { name: 'Roger Deakins', focus: 'Lighting' },
    { name: 'Emmanuel Lubezki', focus: 'Natural Camera' },
];

const TOOLS = [
    { id: 'director', icon: Film, label: 'Director Mode', color: 'text-violet-400', desc: 'Full cinematic prompt engineering' },
    { id: 'seedance', icon: Play, label: 'Seedance', color: 'text-cyan-400', desc: 'Cinematic video prompt builder' },
    { id: 'script', icon: FileText, label: 'Script Writer', color: 'text-blue-400', desc: 'Reels, ads, storytelling' },
    { id: 'image_prompt', icon: Image, label: 'Image Generator', color: 'text-purple-400', desc: 'Visual prompts for image models' },
    { id: 'calendar', icon: Brain, label: '30-Day Content Plan', color: 'text-yellow-400', desc: 'Social media calendar & strategy' },
    { id: 'carousel', icon: LayoutGrid, label: 'Carousel Brief', color: 'text-pink-400', desc: 'Instagram carousel planning' },
];

const PIPELINE_STEPS = [
    { id: 'script', label: 'Script Analysis', icon: FileText, color: 'from-blue-500/20 to-blue-600/10' },
    { id: 'character', label: 'Character Analysis', icon: User, color: 'from-violet-500/20 to-violet-600/10' },
    { id: 'location', label: 'Location Analysis', icon: MapPin, color: 'from-emerald-500/20 to-emerald-600/10' },
    { id: 'prop', label: 'Prop Analysis', icon: Box, color: 'from-amber-500/20 to-amber-600/10' },
    { id: 'emotion', label: 'Emotion Analysis', icon: Palette, color: 'from-rose-500/20 to-rose-600/10' },
    { id: 'camera', label: 'Camera Planning', icon: Camera, color: 'from-cyan-500/20 to-cyan-600/10' },
    { id: 'lighting', label: 'Lighting', icon: Sun, color: 'from-yellow-500/20 to-yellow-600/10' },
    { id: 'blocking', label: 'Blocking', icon: Crosshair, color: 'from-orange-500/20 to-orange-600/10' },
    { id: 'shotlist', label: 'Shot List', icon: List, color: 'from-indigo-500/20 to-indigo-600/10' },
    { id: 'breakdown', label: 'Scene Breakdown', icon: Layers, color: 'from-pink-500/20 to-pink-600/10' },
    { id: 'prompt', label: 'Final Prompt', icon: Zap, color: 'from-lime-500/20 to-lime-600/10' },
];

const SYSTEM_PROMPT = `You are ZeroLens Director Agent — an AI film director embedded in ZeroLens Studio.

Your role is to think like a top filmmaker. You learn from directors like Christopher Nolan (story structure), Denis Villeneuve (composition and scale), David Fincher (precision and camera movement), Roger Deakins (lighting), and Emmanuel Lubezki (natural camera movement).

YOUR PROCESS:
1. Receive the user's creative idea
2. Analyze the script/story for beginning, conflict, emotional beat, climax, resolution
3. Analyze characters (age, gender, ethnicity, hair, skin tone, eyes, body type, expression, accessories)
4. Analyze locations (indoor/outdoor, time of day, architecture, weather, textures, lighting)
5. Analyze props (brand, material, scale, texture, reflection, importance)
6. Determine emotional arc
7. Plan cinematography (lens, camera height, composition, movement, focus, depth of field, frame rate)
8. Plan lighting (key, fill, rim, practicals, sun direction, color temperature, atmosphere)
9. Plan blocking and character positioning
10. Generate a full shot list with precise timestamps
11. Produce a final production-ready prompt optimized for Seedance / Veo 3

You have VISION CAPABILITIES — when the user uploads reference images, you can SEE them directly. Do NOT ask the user to describe what's in the images. Instead, visually analyze each image yourself and describe what you see.

For character reference images, visually extract: age, gender, ethnicity, hair, skin tone, eye color, body type, height, facial features, expression, accessories, lighting, pose, lens estimate, camera angle. Describe the character directly from what you see in the photo.

For location reference images, visually extract: indoor/outdoor, time of day, architecture, weather, textures, available lighting, walking space, camera paths, reflection surfaces, natural light direction, color palette, mood. Describe the location directly from the photo.

For prop and wardrobe reference images, visually describe them: brand, material, scale, texture, style, color, details.

Maintain CHARACTER CONSISTENCY across all shots — track face, hair, clothes, shoes, accessories, body proportions, expressions. Preserve these details into every subsequent shot unless the story changes. NEVER ask the user to describe images — you can see them.

FORMAT YOUR OUTPUT:
Use the Seedance multishot cinematic spec structure with: STYLE, SCENE CONTEXT, FORMAT MODE, LIGHTING, COLOR, CAMERA, CHARACTER DESIGN, SUBJECTS, PHYSICS, COMPOSITION, FIRST FRAME, then individual CUT sections with timestamps, and CLOSING sections for CONTINUITY, TECHNICAL, AUDIO, CONSTRAINTS, POSITIVE LOCKS.`;

const SUGGESTED_PROMPTS = [
    "A lone warrior walking through a neon-lit cyberpunk city at midnight, rain-slicked streets reflecting holographic signs",
    "10s luxury watch ad: a diver's watch descending into deep ocean, slow-motion bubble trail, macro dial detail",
    "Fantasy warrior vs ice dragon in a frozen tundra, blizzard atmosphere, creature scales crusted with frost",
    "Apocalyptic scene: lone figure walking through abandoned city swallowed by sandstorm, dust particles catching amber light",
];

const REF_CATEGORIES = [
    { id: 'character', label: 'Character', icon: User, color: 'from-violet-500 to-purple-600', desc: 'Face, body, expression, wardrobe' },
    { id: 'location', label: 'Location', icon: MapPin, color: 'from-emerald-500 to-teal-600', desc: 'Indoor/outdoor, architecture, mood' },
    { id: 'prop', label: 'Prop', icon: Box, color: 'from-amber-500 to-orange-600', desc: 'Objects, materials, scale' },
    { id: 'wardrobe', label: 'Wardrobe', icon: Shirt, color: 'from-rose-500 to-pink-600', desc: 'Clothing, accessories, textures' },
    { id: 'video', label: 'Video', icon: Video, color: 'from-red-500 to-orange-600', desc: 'Video clips, B-roll, motion refs' },
];

const CATEGORY_FIELDS = {
    character: [
        { name: 'characterName', label: 'Character Name', type: 'text', placeholder: 'e.g. Detective Miller, John Doe, Protagonist' },
        { name: 'age', label: 'Age', type: 'text', placeholder: 'e.g. 20s, 30s, Teenager, Elder' },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Select Gender', 'Male', 'Female', 'Non-Binary', 'Androgynous', 'Custom'] },
        { name: 'hair', label: 'Hair Details', type: 'text', placeholder: 'e.g. Short dark hair, blonde curls' },
        { name: 'wardrobe', label: 'Outfit Details', type: 'text', placeholder: 'e.g. Black leather jacket, futuristic armor' },
        { name: 'ethnicity', label: 'Ethnicity/Skin Tone', type: 'text', placeholder: 'e.g. Caucasian, Hispanic, Fair skin' },
        { name: 'expression', label: 'Facial Expression', type: 'text', placeholder: 'e.g. Neutral, intense gaze, smiling' },
        { name: 'body', label: 'Body Type/Details', type: 'text', placeholder: 'e.g. Athletic build, tall, rugged' },
    ],
    location: [
        { name: 'locationName', label: 'Location Name', type: 'text', placeholder: 'e.g. Melancholic Cafe, Neon Alleyway, Kitchen Set' },
        { name: 'environment', label: 'Environment', type: 'select', options: ['Select Environment', 'Indoor', 'Outdoor', 'Studio Set', 'Mixed'] },
        { name: 'placeType', label: 'Place Type', type: 'text', placeholder: 'e.g. Kitchen, Hall, Cafe, Office, Alleyway, Desert' },
        { name: 'lighting', label: 'Lighting & Mood', type: 'text', placeholder: 'e.g. Neon twilight, high-contrast chiaroscuro, dim candlelit' },
        { name: 'style', label: 'Architecture Style', type: 'text', placeholder: 'e.g. Cyberpunk, Victorian gothic, minimalist scandinavian' },
        { name: 'timeOfDay', label: 'Time of Day', type: 'text', placeholder: 'e.g. Golden hour, midnight, early morning' }
    ],
    prop: [
        { name: 'propName', label: 'Prop Name', type: 'text', placeholder: 'e.g. Vintage Camera, Police Badge, Ancient Dagger' },
        { name: 'material', label: 'Material/Texture', type: 'text', placeholder: 'e.g. Brushed steel, polished mahogany, cracked ceramic' },
        { name: 'scale', label: 'Scale/Size', type: 'select', options: ['Select Scale', 'Micro (jewelry)', 'Small (handheld)', 'Medium (backpack)', 'Large (furniture)', 'Giant (building/vehicle)'] },
        { name: 'reflectivity', label: 'Reflective Surface', type: 'text', placeholder: 'e.g. High glossy, chrome mirror, matte finish' },
        { name: 'details', label: 'Object Specifications', type: 'textarea', placeholder: 'e.g. Vintage Leica camera with a worn brown leather strap' }
    ],
    wardrobe: [
        { name: 'wardrobeName', label: 'Wardrobe Name', type: 'text', placeholder: 'e.g. Main Cyberpunk Suit, Formal Gown' },
        { name: 'style', label: 'Clothing Style', type: 'text', placeholder: 'e.g. Techwear, formal tuxedo, vintage 70s casual' },
        { name: 'color', label: 'Primary Colors', type: 'text', placeholder: 'e.g. Crimson red, obsidian black, holographic teal' },
        { name: 'fabric', label: 'Fabric/Texture', type: 'text', placeholder: 'e.g. Distressed denim, heavy canvas, silk blend' },
        { name: 'details', label: 'Accessories/Details', type: 'text', placeholder: 'e.g. Golden buttons, high collars, combat boots' }
    ],
    video: [
        { name: 'videoName', label: 'Video Name', type: 'text', placeholder: 'e.g. Drone Flyover B-roll, Tracking Shot' },
        { name: 'motion', label: 'Camera Movement', type: 'text', placeholder: 'e.g. Slow tracking shot, fast dolly zoom, crane tilt down' },
        { name: 'subject', label: 'Subject Action', type: 'text', placeholder: 'e.g. Walking slowly, running from danger, talking on phone' },
        { name: 'framerate', label: 'Framerate/Speed', type: 'select', options: ['Select Speed', 'Normal speed (24fps)', 'Slow motion (60fps)', 'Ultra slow-mo (120fps)', 'Timelapse'] }
    ]
};

function ParticlesBackground() {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        const particles = [];
        const count = 60;
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.4 + 0.1,
            });
        }
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const p of particles) {
                p.x += p.speedX;
                p.y += p.speedY;
                if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
                if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.shadowBlur = 4;
                ctx.shadowColor = 'rgba(167, 139, 250, 0.4)';
                ctx.fillStyle = `rgba(167, 139, 250, ${p.opacity})`;
                ctx.fill();
            }
            animId = requestAnimationFrame(animate);
        };
        animate();
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);
    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

function CursorGlow() {
    const [pos, setPos] = useState({ x: -100, y: -100 });
    useEffect(() => {
        const move = (e) => setPos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', move);
        return () => window.removeEventListener('mousemove', move);
    }, []);
    return <div className="cursor-glow" style={{ left: pos.x, top: pos.y }} />;
}

function LoadingSkeleton({ lines = 4, variant = 'card' }) {
    if (variant === 'card') {
        return (
            <div className="glass-card rounded-2xl p-5 space-y-4">
                <div className="skeleton-shimmer h-4 w-3/4 rounded-md" />
                <div className="skeleton-shimmer h-3 w-1/2 rounded-md" />
                <div className="space-y-2 pt-2">
                    {Array.from({ length: lines }).map((_, i) => (
                        <div key={i} className="skeleton-shimmer h-2.5 rounded-md" style={{ width: `${70 + Math.random() * 30}%` }} />
                    ))}
                </div>
            </div>
        );
    }
    return (
        <div className="space-y-3">
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className="skeleton-shimmer h-3 rounded-md" style={{ width: `${60 + Math.random() * 40}%` }} />
            ))}
        </div>
    );
}

function GenerationProgress({ isThinking }) {
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState(0);
    const phases = [
        'Analyzing your idea...',
        'Breaking down the story...',
        'Planning cinematography...',
        'Designing lighting...',
        'Building shot list...',
        'Generating production prompt...',
    ];

    useEffect(() => {
        if (!isThinking) { setProgress(0); setPhase(0); return; }
        const interval = setInterval(() => {
            setProgress((prev) => { const next = prev + Math.random() * 8 + 2; return next > 100 ? 100 : next; });
            setPhase((prev) => {
                if (prev < phases.length - 1 && progress > (prev + 1) * (100 / phases.length)) return prev + 1;
                return prev;
            });
        }, 400);
        return () => clearInterval(interval);
    }, [isThinking, progress, phases.length]);

    if (!isThinking) return null;

    return (
        <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center animate-pulse">
                    <Film className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/90 apple-text">{phases[Math.min(phase, phases.length - 1)]}</p>
                    <p className="text-[10px] text-white/40 font-mono">{Math.round(progress)}% complete</p>
                </div>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 progress-bar-glow transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex gap-1.5">
                {phases.map((p, i) => (
                    <div key={i} className={cn('h-1 flex-1 rounded-full transition-all duration-500', i <= phase ? 'bg-violet-500/40' : 'bg-white/5')} />
                ))}
            </div>
        </div>
    );
}

function ThinkingIndicator() {
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 typing-dot" />
            </div>
            <span className="text-[11px] text-white/40 font-medium">Director is thinking...</span>
        </div>
    );
}

function ToolBadge({ tool }) {
    if (!tool) return null;
    const T = tool.icon;
    return (
        <span className={cn('inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full glass-card', tool.color)}>
            <T className="w-2.5 h-2.5" /> {tool.label}
        </span>
    );
}

function RefThumbnail({ file, category, onRemove }) {
    const [analysis, setAnalysis] = useState(null);
    const isVideo = file.type?.startsWith('video/');
    useEffect(() => {
        if (!file || isVideo) return;
        const img = new window.Image();
        img.onload = () => {
            const isPortrait = img.height > img.width;
            setAnalysis({ dimensions: `${img.width}×${img.height}`, orientation: isPortrait ? 'Portrait' : 'Landscape', size: (file.size / 1024).toFixed(0) + ' KB' });
        };
        img.src = file.data;
    }, [file, isVideo]);

    return (
        <div className="group relative glass-card rounded-xl overflow-hidden hover:border-white/15 transition-all duration-300 hover:scale-[1.02]">
            <div className="aspect-[4/3] overflow-hidden bg-black/40 flex items-center justify-center">
                {isVideo ? (
                    <video src={file.data} className="w-full h-full object-cover" muted controls={false} />
                ) : (
                    <img src={file.data} alt={file.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                )}
            </div>
            {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/10"><Play className="w-5 h-5 text-white ml-0.5" /></div>
                </div>
            )}
            
            {/* Custom hover detail panel */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5">
                {file.details && Object.keys(file.details).length > 0 && (
                    <div className="space-y-1 mb-2 max-h-[60%] overflow-y-auto no-scrollbar border-b border-white/5 pb-1.5">
                        {Object.entries(file.details).map(([k, v]) => (
                            <p key={k} className="text-[7.5px] text-white/70 font-semibold tracking-wide leading-tight">
                                <span className="text-violet-400 capitalize font-bold">{k.replace(/([A-Z])/g, ' $1')}:</span> {v}
                            </p>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-1.5 mt-auto">
                    {analysis && (
                        <span className="text-[7px] text-white/40 font-mono bg-white/5 px-1.5 py-0.5 rounded">{analysis.dimensions}</span>
                    )}
                    {isVideo && <span className="text-[7px] text-white/40 font-mono bg-white/5 px-1.5 py-0.5 rounded">{(file.size / 1024 / 1024).toFixed(1)} MB</span>}
                    <button onClick={() => onRemove(category, file.id)} className="ml-auto px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/25 transition-all text-[8px] font-black uppercase tracking-wider">
                        Delete
                    </button>
                </div>
            </div>
            
            <div className="absolute top-1.5 left-1.5">
                <span className="text-[6px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-black/60 text-white/70">{file.categoryLabel}</span>
            </div>
        </div>
    );
}

function ReferenceDetailsModal({ pendingRef, modalDetails, setModalDetails, onSave, onCancel }) {
    if (!pendingRef) return null;
    const category = pendingRef.category;
    const fields = CATEGORY_FIELDS[category] || [];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
            <div className="w-full max-w-md bg-[#0a0a14] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col animate-float">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-[80px] pointer-events-none -z-10" />
                
                {/* Header */}
                <div className="p-5 border-b border-white/[0.04] bg-black/20 flex justify-between items-center">
                    <div>
                        <h3 className="text-xs font-black text-violet-400 uppercase tracking-widest">Add {pendingRef.categoryLabel} details</h3>
                        <p className="text-[8px] text-white/30 uppercase font-mono tracking-widest mt-0.5">Specify Reference Parameters</p>
                    </div>
                    <button onClick={onCancel} className="p-1.5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-5 space-y-4 overflow-y-auto max-h-[50vh] custom-scrollbar">
                    {/* Image Preview */}
                    <div className="flex gap-4 items-center p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center shrink-0 border border-white/5">
                            {pendingRef.type?.startsWith('video/') ? (
                                <video src={pendingRef.data} className="w-full h-full object-cover" muted />
                            ) : (
                                <img src={pendingRef.data} alt="preview" className="w-full h-full object-cover" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-white/80 font-bold truncate">{pendingRef.name}</p>
                            <p className="text-[8px] text-white/30 font-mono">{(pendingRef.size / 1024).toFixed(0)} KB</p>
                        </div>
                    </div>

                    {/* Parameter Fields */}
                    <div className="space-y-3">
                        {fields.map(field => (
                            <div key={field.name} className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-white/45 tracking-wider font-mono">
                                    {field.label}
                                </label>
                                {field.type === 'select' ? (
                                    <select 
                                        value={modalDetails[field.name] || ''}
                                        onChange={(e) => setModalDetails(prev => ({ ...prev, [field.name]: e.target.value }))}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-violet-500/50 transition-colors"
                                    >
                                        {field.options.map(opt => (
                                            <option key={opt} value={opt} className="bg-[#0c0c14] text-white">
                                                {opt}
                                            </option>
                                        ))}
                                    </select>
                                ) : field.type === 'textarea' ? (
                                    <textarea 
                                        value={modalDetails[field.name] || ''}
                                        onChange={(e) => setModalDetails(prev => ({ ...prev, [field.name]: e.target.value }))}
                                        placeholder={field.placeholder}
                                        rows={2}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-white/20 outline-none focus:border-violet-500/50 transition-colors resize-none font-sans"
                                    />
                                ) : (
                                    <input 
                                        type="text"
                                        value={modalDetails[field.name] || ''}
                                        onChange={(e) => setModalDetails(prev => ({ ...prev, [field.name]: e.target.value }))}
                                        placeholder={field.placeholder}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-white/20 outline-none focus:border-violet-500/50 transition-colors"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-white/[0.04] bg-black/20 flex gap-3 justify-end">
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl text-[9px] font-bold text-white/50 hover:text-white hover:bg-white/5 border border-white/5 transition-all uppercase tracking-wider"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onSave}
                        className="px-5 py-2 rounded-xl text-[9px] font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-xl shadow-violet-950/50 transition-all uppercase tracking-wider"
                    >
                        Add Reference
                    </button>
                </div>
            </div>
        </div>
    );
}

function ReferenceSection({ category, references, onUpload, onRemove, onSelectFromGallery }) {
    const fileRef = useRef(null);
    const CatIcon = category.icon;
    const items = references.filter(r => r.category === category.id);

    return (
        <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', category.color)}>
                        <CatIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-white/80 apple-text">{category.label}</p>
                        <p className="text-[8px] text-white/30">{category.desc}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={() => onSelectFromGallery(category.id)} className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-150" title="Select from Gallery">
                        <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => fileRef.current?.click()} className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-150" title="Upload File">
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>
                <input ref={fileRef} type="file" accept={category.id === 'video' ? 'video/*' : 'image/*'} onChange={(e) => onUpload(e, category.id)} className="hidden" />
            </div>
            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 border border-dashed border-white/5 rounded-xl">
                    <Upload className="w-5 h-5 text-white/15 mb-2" />
                    <p className="text-[9px] text-white/20">Drop {category.label.toLowerCase()}{category.id === 'video' ? ' videos' : ' images'} or click +</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-2">
                    {items.map(ref => (<RefThumbnail key={ref.id} file={ref} category={category.id} onRemove={onRemove} />))}
                </div>
            )}
        </div>
    );
}

function ReferenceBoard({ references, onUpload, onRemove, onClose, onSelectFromGallery }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <PanelRight className="w-4 h-4 text-violet-400" />
                    <h2 className="text-sm font-bold apple-text-heading text-white/80">Reference Board</h2>
                    <span className="text-[9px] text-white/30 font-mono bg-white/5 px-2 py-0.5 rounded-md">{references.filter(r => r.type?.startsWith('video/')).length > 0 ? `${references.length} files` : `${references.length} images`}</span>
                </div>
                <button onClick={onClose} className="text-[8px] font-semibold text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider">Hide</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {REF_CATEGORIES.map(cat => (
                    <ReferenceSection key={cat.id} category={cat} references={references} onUpload={onUpload} onRemove={onRemove} onSelectFromGallery={onSelectFromGallery} />
                ))}
            </div>
        </div>
    );
}

function DirectorHero({ onSend }) {
    return (
        <div className="relative overflow-hidden rounded-3xl mb-6 border border-white/[0.08] bg-gradient-to-br from-violet-950/20 via-indigo-950/15 to-[#05050a]/40 shadow-2xl shadow-violet-950/10 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-indigo-500/5 to-transparent animate-gradient" />
            <div className="relative hero-overlay p-8 md:p-10">
                <div className="flex items-center gap-4.5 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)] shadow-violet-500/30 animate-float border border-violet-400/20">
                        <Film className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] bg-violet-500/10 border border-violet-500/20 text-violet-300 px-2.5 py-0.5 rounded-full w-fit">ZeroLens Studio</p>
                        <h1 className="text-3xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent mt-1">Director Agent</h1>
                    </div>
                </div>
                <p className="text-xs text-white/50 max-w-2xl leading-relaxed mb-6 apple-text font-medium">
                    Upload reference images, describe your vision, and let the Director Agent analyze, plan, and generate production-ready cinematic prompts — just like a professional filmmaker.
                </p>
                <div className="flex flex-wrap gap-2">
                    {DIRECTORS.map((d) => (
                        <div key={d.name} className="px-3.5 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[10px] hover:bg-white/[0.04] transition-all duration-300">
                            <span className="text-white/80 font-bold tracking-wide">{d.name}</span>
                            <span className="text-white/30 ml-1.5 font-medium">· {d.focus}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function PipelineFlow({ activeStep }) {
    return (
        <div className="glass-card rounded-2xl p-5 mb-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="w-3 h-3 text-violet-400" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Director Pipeline</span>
            </div>
            <div className="flex items-start gap-0 overflow-x-auto pb-2 no-scrollbar">
                {PIPELINE_STEPS.map((step, i) => {
                    const StepIcon = step.icon;
                    const isActive = activeStep === step.id;
                    const isPast = PIPELINE_STEPS.findIndex(s => s.id === activeStep) > i;
                    return (
                        <div key={step.id} className="flex items-start shrink-0">
                            <div className="flex flex-col items-center w-20">
                                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-300', isActive ? 'bg-gradient-to-br from-violet-500 to-indigo-600 border-violet-400/30 shadow-lg shadow-violet-900/30 scale-110' : isPast ? 'bg-violet-500/20 border-violet-500/20' : 'bg-white/[0.02] border-white/5')}>
                                    <StepIcon className={cn('w-3.5 h-3.5', isActive ? 'text-white' : isPast ? 'text-violet-400/60' : 'text-white/20')} />
                                </div>
                                <p className={cn('text-[7px] font-semibold uppercase tracking-wider mt-1.5 text-center leading-tight', isActive ? 'text-violet-300' : isPast ? 'text-violet-400/40' : 'text-white/20')}>{step.label}</p>
                            </div>
                            {i < PIPELINE_STEPS.length - 1 && <div className={cn('h-px w-6 mt-4 mx-1 transition-colors duration-300', isPast ? 'bg-violet-500/30' : 'bg-white/5')} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MessageBubble({ msg }) {
    const [showRaw, setShowRaw] = useState(false);
    const [copied, setCopied] = useState(false);
    const isUser = msg.role === 'user';

    const parseLines = (text) => text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const handleCopy = () => { navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };

    const renderContent = (text) => {
        const parts = [];
        let lastIndex = 0;
        let match;
        const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
        while ((match = codeBlockRegex.exec(text)) !== null) {
            if (match.index > lastIndex) parts.push(<span key={lastIndex}>{text.slice(lastIndex, match.index)}</span>);
            parts.push(<div key={`code-${match.index}`} className="my-2 rounded-xl overflow-hidden glass-card">{match[1] && <div className="px-3 py-1 bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/30">{match[1]}</div>}<pre className="p-3 text-[11px] text-emerald-300 overflow-x-auto bg-black/40 leading-relaxed">{match[2].trim()}</pre></div>);
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);
        return parts.length > 0 ? parts : <span>{text}</span>;
    };

    return (
        <div className={cn('flex gap-3 group', isUser ? 'justify-end' : 'justify-start')}>
            {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-1 shadow-xl shadow-violet-900/30 relative">
                    <div className="absolute inset-0 rounded-xl bg-white/10 animate-ping opacity-25 scale-75" />
                    <Film className="w-4 h-4 text-white" />
                </div>
            )}
            <div className={cn('relative max-w-[80%] rounded-2xl px-5 py-4 leading-relaxed transition-all duration-200', isUser ? 'bg-gradient-to-br from-violet-600/20 to-indigo-600/10 border border-violet-500/10 text-white/90 shadow-sm' : 'glass-card hover:bg-white/[0.04]')}>
                {!isUser && (
                    <button onClick={handleCopy} className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all duration-150 opacity-0 group-hover:opacity-100">
                        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-white/60" />}
                    </button>
                )}
                {msg.tool && <div className="mb-2"><ToolBadge tool={TOOLS.find(t => t.id === msg.tool)} /></div>}
                {msg.attachment && (
                    <div className="mb-3">
                        {msg.attachment.type?.startsWith('image/') ? (
                            <div className="glass-card rounded-xl p-2"><img src={msg.attachment.data} alt={msg.attachment.name} className="w-32 h-32 rounded-lg object-cover" /><p className="text-[9px] text-white/30 mt-1.5 font-mono">{msg.attachment.name}</p></div>
                        ) : (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg glass-card"><FileAudio size={12} className="text-cyan-400" /><span className="text-[10px] text-white/60 truncate max-w-[120px]">{msg.attachment.name}</span></div>
                        )}
                    </div>
                )}
                <div className="text-[14px] leading-relaxed tracking-wide apple-text">
                    {isUser ? renderContent(msg.content.replace(/^\[Attached:[^\]]*\]\n?/, '')) : parseLines(msg.content).map((line, i) => (<p key={i} className="mb-1.5">{line}</p>))}
                </div>
                {msg.thinking && (
                    <button onClick={() => setShowRaw(!showRaw)} className="mt-2 flex items-center gap-1 text-[9px] text-white/20 hover:text-white/40 transition-colors">
                        <Brain className="w-2.5 h-2.5" />{showRaw ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}{showRaw ? 'Hide' : 'Show'} reasoning
                    </button>
                )}
                {showRaw && msg.thinking && <pre className="mt-2 text-[10px] text-white/20 whitespace-pre-wrap border-t border-white/5 pt-2">{msg.thinking}</pre>}
                <div className="mt-1.5 text-[9px] text-white/20 font-mono">{msg.ts}</div>
            </div>
            {isUser && <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/[0.08] flex items-center justify-center shrink-0 mt-1 shadow-sm"><User className="w-3.5 h-3.5 text-white/40" /></div>}
        </div>
    );
}

export default function DirectorAgentPage({ activeTool, setActiveTool }) {
    const userProfile = useAppStore(state => state.userProfile);
    const userId = userProfile?.id;

    const [hermesSessionId, setHermesSessionId] = useState(null);
    const [sessionReady, setSessionReady] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: `Hey, I'm your **Director Agent**.\n\nUpload reference images, describe your vision, and I'll think like a professional filmmaker — analyzing story, characters, locations, cinematography, and lighting — to produce a production-ready cinematic prompt.`, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [references, setReferences] = useState([]);
    const [showReferenceBoard, setShowReferenceBoard] = useState(true);
    const [activePipelineStep, setActivePipelineStep] = useState(null);
    const [memory, setMemory] = useState([]);
    const [showMention, setShowMention] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const [mentionCursorPos, setMentionCursorPos] = useState(0);
    const mentionRef = useRef(null);
    const [memoryLoaded, setMemoryLoaded] = useState(false);
    const [chatLoaded, setChatLoaded] = useState(false);
    const bottomRef = useRef(null);
    const textRef = useRef(null);

    const [pendingRef, setPendingRef] = useState(null);
    const [modalDetails, setModalDetails] = useState({});
    const [galleryPickerCategory, setGalleryPickerCategory] = useState(null);

    const processRefImage = (file, category) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const cat = REF_CATEGORIES.find(c => c.id === category);
            resolve({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: file.name, type: file.type, size: file.size, data: ev.target.result, category, categoryLabel: cat?.label || category, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
        };
        reader.readAsDataURL(file);
    });

    const handleRefUpload = async (e, category) => {
        const files = e.target.files;
        if (!files?.length) return;
        const fileData = await processRefImage(files[0], category);
        
        // Open modal
        setPendingRef(fileData);
        
        // Initialize details fields
        const fields = CATEGORY_FIELDS[category] || [];
        const initialDetails = {};
        fields.forEach(f => {
            initialDetails[f.name] = f.type === 'select' ? f.options[0] : '';
        });
        setModalDetails(initialDetails);
        
        if (e.target) e.target.value = '';
    };

    const handleSavePendingRef = () => {
        if (!pendingRef) return;
        // Clean out default select values
        const cleanedDetails = {};
        Object.entries(modalDetails).forEach(([k, v]) => {
            if (v && !v.startsWith('Select ')) {
                cleanedDetails[k] = v;
            }
        });
        
        // Find if a custom name is entered for this reference category
        const inputName = cleanedDetails.characterName 
            || cleanedDetails.locationName 
            || cleanedDetails.propName 
            || cleanedDetails.wardrobeName 
            || cleanedDetails.videoName 
            || pendingRef.name;

        const refWithDetails = {
            ...pendingRef,
            name: inputName,
            details: cleanedDetails
        };
        setReferences(prev => [...prev, refWithDetails]);
        setPendingRef(null);
        setModalDetails({});
    };

    const handleSelectFromGallery = (url, item) => {
        const catId = galleryPickerCategory;
        const cat = REF_CATEGORIES.find(c => c.id === catId);
        
        const fileData = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: item.name || 'Gallery Item',
            type: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
            size: 0,
            data: url,
            category: catId,
            categoryLabel: cat?.label || catId,
            ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setGalleryPickerCategory(null);
        setPendingRef(fileData);
        
        const fields = CATEGORY_FIELDS[catId] || [];
        const initialDetails = {};
        fields.forEach(f => {
            initialDetails[f.name] = f.type === 'select' ? f.options[0] : '';
        });
        
        // Pre-fill name if available
        if (item.name) {
            initialDetails[catId + 'Name'] = item.name;
        }
        setModalDetails(initialDetails);
    };

    const handleRefRemove = (category, id) => setReferences(prev => prev.filter(r => !(r.category === category && r.id === id)));

    const [customPersona, setCustomPersona] = useState(() => localStorage.getItem('director_custom_persona') || '');
    const [dbSkills, setDbSkills] = useState([]);
    const [activeSkills, setActiveSkills] = useState(() => {
        const saved = localStorage.getItem('director_active_skills');
        return saved ? JSON.parse(saved) : [];
    });
    const [showMemoryImport, setShowMemoryImport] = useState(false);
    const [importMemoryText, setImportMemoryText] = useState('');
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [configTab, setConfigTab] = useState('persona');

    useEffect(() => { localStorage.setItem('director_custom_persona', customPersona); }, [customPersona]);
    useEffect(() => { localStorage.setItem('director_active_skills', JSON.stringify(activeSkills)); }, [activeSkills]);

    useEffect(() => {
        const fetchDbSkills = async () => {
            if (!supabase) return;
            try {
                const { data, error } = await supabase.from('hermes_skills').select('*').eq('is_active', true);
                if (!error && data) setDbSkills(data);
            } catch (err) { console.warn("[DirectorAgent] Failed to load skills:", err.message); }
        };
        fetchDbSkills();
    }, []);

    useEffect(() => {
        if (!userId || memoryLoaded) return;
        fetch(getApiUrl(`/api/agent/memory?userId=${userId}`))
            .then(r => r.json())
            .then(data => { if (Array.isArray(data.memories) && data.memories.length > 0) setMemory(data.memories); setMemoryLoaded(true); })
            .catch(() => setMemoryLoaded(true));
    }, [userId, memoryLoaded]);

    const saveMemory = async (newMemory) => {
        if (!userId) return;
        try { await fetch(getApiUrl('/api/agent/memory'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, memories: newMemory }) }); }
        catch (err) { console.warn('[DirectorAgent] Failed to save memory:', err.message); }
    };

    useEffect(() => {
        const handleClickOutside = (e) => { if (mentionRef.current && !mentionRef.current.contains(e.target)) setShowMention(false); };
        if (showMention) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMention]);

    useEffect(() => {
        if (!userId || chatLoaded || !supabase) return;
        const loadChatHistory = async () => {
            try {
                const { data, error } = await supabase.from('agent_chats').select('messages').eq('user_id', userId).single();
                if (!error && data?.messages && Array.isArray(data.messages) && data.messages.length > 0) setMessages(data.messages);
            } catch (err) { console.warn('[DirectorAgent] Failed to load chat history:', err.message); }
            finally { setChatLoaded(true); }
        };
        loadChatHistory();
    }, [userId, chatLoaded]);

    const PROMPT_VERSION = '6';
    useEffect(() => {
        let cancelled = false;
        let retryInterval = null;

        const storedVersion = localStorage.getItem('director_prompt_version');
        if (storedVersion !== PROMPT_VERSION) { 
            localStorage.removeItem('director_session_id'); 
            localStorage.setItem('director_prompt_version', PROMPT_VERSION); 
        }

        const checkOrCreateSession = async () => {
            const existingId = localStorage.getItem('director_session_id');
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
                    console.debug('[DirectorAgent] Error checking session:', e);
                }
                localStorage.removeItem('director_session_id');
            }

            try {
                const r = await fetch(`${HERMES_API}/api/sessions`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ system_prompt: SYSTEM_PROMPT }) 
                });
                const data = await r.json();
                if (data.session_id && !cancelled) {
                    localStorage.setItem('director_session_id', data.session_id);
                    setHermesSessionId(data.session_id);
                    setSessionReady(true);
                    if (retryInterval) clearInterval(retryInterval);
                }
            } catch (err) {
                console.warn('[DirectorAgent] Bridge unavailable, retrying in 4 seconds...');
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
    }, [sessionReady]);

    const saveChatHistory = async (nextMessages) => {
        if (!userId || !supabase) return;
        try { await supabase.from('agent_chats').upsert({ user_id: userId, messages: nextMessages, updated_at: new Date() }, { onConflict: 'user_id' }); }
        catch (err) { console.warn('[DirectorAgent] Failed to save chat:', err.message); }
    };

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isThinking]);

    const handleSend = async (text = input.trim()) => {
        const hasRefs = references.length > 0;
        if ((!text && !hasRefs) || isThinking) return;
        const refContext = hasRefs 
            ? `[REFERENCE BOARD: ${references.length} references attached]\n${references.map((r, idx) => {
                let desc = `  - Reference #${idx + 1} [${r.categoryLabel}] File: ${r.name}`;
                if (r.details && Object.keys(r.details).length > 0) {
                    const detailStrings = Object.entries(r.details)
                        .filter(([_, v]) => v)
                        .map(([k, v]) => `${k}: ${v}`);
                    if (detailStrings.length > 0) {
                        desc += ` (Metadata -> ${detailStrings.join(' | ')})`;
                    }
                }
                return desc;
            }).join('\n')}\n\n`
            : '';
        const fullText = text ? `${refContext}${text}` : refContext.trim();
        if (!fullText) return;
        setInput('');

        const userMsg = { role: 'user', content: fullText, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        saveChatHistory(nextMessages);
        setIsThinking(true);
        setActivePipelineStep('script');

        const pipelineInterval = setInterval(() => {
            setActivePipelineStep((prev) => {
                const idx = PIPELINE_STEPS.findIndex(s => s.id === prev);
                if (idx < PIPELINE_STEPS.length - 1) return PIPELINE_STEPS[idx + 1].id;
                clearInterval(pipelineInterval);
                return prev;
            });
        }, 1200);

        try {
            if (!sessionReady || !hermesSessionId) throw new Error('Session not ready');
            const activeSkillInstructions = dbSkills
                .filter(s => activeSkills.includes(s.name) && s.system_instructions)
                .map(s => `[SKILL: ${s.name}]\n${s.system_instructions}`)
                .join('\n\n');
            const skillsBlock = activeSkillInstructions ? `\n\n[ACTIVE SKILLS]\n${activeSkillInstructions}\n[/ACTIVE SKILLS]\n` : '';
            
            // Inject custom persona details if set
            const personaBlock = customPersona ? `\n\n[DIRECTOR PERSONA INSTRUCTIONS]\n${customPersona}\n[/DIRECTOR PERSONA INSTRUCTIONS]\n` : '';
            
            const toolLabel = 'DIRECTOR MODE';
            const toolPrefixed = `[${toolLabel}]\n${fullText}${personaBlock}${skillsBlock}`;
            const attachments = references.length > 0 ? references.map(r => ({ name: r.name, type: r.type, data: r.data, category: r.categoryLabel })) : undefined;
            const resp = await fetch(`${HERMES_API}/api/sessions/${hermesSessionId}/chat`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: toolPrefixed, attachments }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || `Error ${resp.status}`);
            const assistantMsg = { role: 'assistant', content: data.text || '', thinking: null, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
            const updatedMessages = [...nextMessages, assistantMsg];
            setMessages(updatedMessages);
            saveChatHistory(updatedMessages);
        } catch (err) {
            const errorMsg = { role: 'assistant', content: `Sorry, something went wrong: ${err.message}`, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
            setMessages([...nextMessages, errorMsg]);
        } finally {
            setIsThinking(false);
            clearInterval(pipelineInterval);
            setActivePipelineStep(null);
        }
    };

    const clearChat = () => {
        setMessages([{ role: 'assistant', content: "Chat cleared. Ready for your next vision — what story do you want to tell today?", ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        saveChatHistory([]);
        setMemory([]); saveMemory([]);
        setReferences([]);
        setShowReferenceBoard(true);
        if (hermesSessionId) fetch(`${HERMES_API}/api/sessions/${hermesSessionId}/clear`, { method: 'POST' }).catch(() => {});
    };

    const toggleSkill = (skillName) => setActiveSkills(prev => prev.includes(skillName) ? prev.filter(n => n !== skillName) : [...prev, skillName]);

    const handleImportMemories = async () => {
        if (!importMemoryText.trim()) return;
        const newFacts = importMemoryText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
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

    if (!userProfile) {
        const setActiveTab = useAppStore.getState().setActiveTab;
        return (
            <div className="h-full flex items-center justify-center bg-[#06060c] text-white relative overflow-hidden">
                <ParticlesBackground />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="text-center max-w-md px-6 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-violet-900/50 animate-float">
                        <Film className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold apple-text-heading text-gradient-primary mb-2">Sign in to use Director Agent</h2>
                    <p className="text-sm text-white/40 leading-relaxed mb-6 apple-text">Access the full cinematic production suite — image analysis, shot planning, and AI-powered prompt engineering.</p>
                    <button onClick={() => setActiveTab('auth')} className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm hover:from-violet-500 hover:to-indigo-500 transition-all shadow-xl shadow-violet-900/30 hover:shadow-violet-900/50">Sign In</button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex bg-[#06060c] text-white overflow-hidden relative">
            <ParticlesBackground />
            <CursorGlow />
            <div className="fixed top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none animate-glow-pulse" />
            <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none animate-glow-pulse" style={{ animationDelay: '2s' }} />

            {/* LEFT: Tools + Memory */}
            <div className="w-60 shrink-0 flex flex-col border-r border-white/[0.04] bg-[#0a0a14]/40 backdrop-blur-2xl relative z-10">
                <div className="px-4 py-5 border-b border-white/[0.04]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-900/40 relative">
                            <div className="absolute inset-0 rounded-xl bg-white/10 animate-ping opacity-20 scale-75" />
                            <Film className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-bold apple-text-heading text-white/90">Director</p>
                            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/30">ZeroLens Agent</p>
                        </div>
                    </div>
                    <div className={cn("mt-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full w-fit border", sessionReady ? "bg-emerald-500/10 border-emerald-500/20" : "bg-yellow-500/10 border-yellow-500/20")}>
                        <div className={cn("w-1 h-1 rounded-full animate-pulse", sessionReady ? "bg-emerald-400" : "bg-yellow-400")} />
                        <span className={cn("text-[7px] font-bold uppercase tracking-wider", sessionReady ? "text-emerald-400" : "text-yellow-400")}>{sessionReady ? "Session Ready" : "Connecting"}</span>
                    </div>
                </div>

                <div className="p-3 border-b border-white/[0.04]">
                    <p className="text-[8px] font-black uppercase tracking-[0.25em] text-white/25 mb-3 px-1">Studio Modes</p>
                    <div className="space-y-1">
                        {!sessionReady ? <LoadingSkeleton lines={3} variant="inline" />
                        : TOOLS.map(tool => {
                            const Icon = tool.icon;
                            const active = activeTool === tool.id;
                            return (
                                <button key={tool.id} 
                                    onClick={() => setActiveTool && setActiveTool(active ? null : tool.id)}
                                    className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-300 border group', 
                                        active ? 'bg-violet-500/10 border-violet-500/20 shadow-md shadow-violet-950/20' : 'hover:bg-white/[0.02] border-transparent'
                                    )}>
                                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300',
                                        active ? 'bg-violet-500/25 border border-violet-400/25' : 'bg-white/[0.02] group-hover:bg-white/[0.04]'
                                    )}><Icon className={cn('w-3 h-3 transition-colors', active ? tool.color : 'text-white/30 group-hover:text-white/50')} /></div>
                                    <div className="min-w-0">
                                        <p className={cn('text-[10px] font-semibold tracking-wide apple-text transition-colors', active ? 'text-white font-bold' : 'text-white/50 group-hover:text-white/70')}>{tool.label}</p>
                                        <p className="text-[8px] text-white/30 truncate leading-tight mt-0.5">{tool.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Memory */}
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-white/25">Visual Memory</p>
                        <button onClick={() => setShowMemoryImport(!showMemoryImport)} className="text-[8px] font-black uppercase tracking-wider text-violet-400/60 hover:text-violet-300 transition-colors flex items-center gap-1">
                            <Plus className="w-2 h-2" /> Import
                        </button>
                    </div>
                    {showMemoryImport && (
                        <div className="mb-3 p-3 rounded-xl glass-card space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-violet-300 uppercase tracking-wider">Bulk Import</span>
                                <button onClick={() => { setImportMemoryText("Character: Protagonist — Male, 30s, rugged, blue eyes, dark hair\nLocation: Cyberpunk city — night, neon, rain\nProp: Vintage Leica camera — metal, reflections, leather strap\nTone: Noir, melancholic, high contrast"); }} className="text-[7px] font-bold text-white/40 hover:text-white/70 transition-colors underline">Use Template</button>
                            </div>
                            <textarea value={importMemoryText} onChange={(e) => setImportMemoryText(e.target.value)} placeholder="Paste visual memories (one per line)" className="w-full h-20 bg-black/40 border border-white/5 rounded-lg p-2 text-[9px] text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 resize-none font-sans" />
                            <div className="flex gap-1.5 justify-end">
                                <button onClick={() => { setShowMemoryImport(false); setImportMemoryText(''); }} className="px-2.5 py-1 rounded-lg text-[8px] font-bold text-white/45 hover:text-white/70 hover:bg-white/5 transition-all uppercase tracking-wider">Cancel</button>
                                <button onClick={handleImportMemories} disabled={!importMemoryText.trim()} className="px-3 py-1 rounded-lg text-[8px] font-bold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 transition-all uppercase tracking-wider shadow-md">Confirm</button>
                            </div>
                        </div>
                    )}
                    {memory.length === 0 ? (
                        <div className="space-y-2 px-1">
                            <p className="text-[9px] text-white/20 leading-relaxed glass-card rounded-xl p-3">Visual memories are built as you upload references. Character profiles, locations, and props populate here for consistent shot-to-shot continuity.</p>
                            <p className="text-[8px] text-white/20 leading-relaxed glass-card rounded-xl p-3"><span className="font-bold text-violet-400/60 block mb-1">Tip</span> Upload a character photo and the Director Agent will auto-analyze age, expression, lighting, and camera angle.</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5 px-1">
                            {memory.map((m, i) => (
                                <div key={i} className="group relative text-[9px] text-white/50 glass-card rounded-lg px-2.5 py-2 pr-7 leading-relaxed font-medium transition-all hover:bg-white/[0.04]">
                                    {m}
                                    <button onClick={() => handleDeleteMemory(i)} className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all duration-150 p-0.5"><X className="w-2 h-2" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-white/[0.04]">
                    <button onClick={clearChat} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] font-bold text-white/30 hover:text-white/60 hover:bg-white/[0.03] border border-white/5 transition-all uppercase tracking-wider"><Trash2 className="w-3 h-3" /> Reset Session</button>
                </div>
            </div>

            {/* RIGHT: Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#08080e]/80 relative z-10">
                <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.02] bg-[#0a0a14]/30 backdrop-blur-2xl shrink-0">
                    <div className="flex items-center gap-3 w-full">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/80 to-indigo-600/80 flex items-center justify-center shadow-lg shadow-violet-900/20"><Zap className="w-3.5 h-3.5 text-white" /></div>
                            <span className="text-sm font-semibold apple-text-heading text-white/70">Director Agent</span>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <button onClick={clearChat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card text-[9px] font-semibold tracking-wide text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-200"><Plus className="w-3 h-3" /> New Chat</button>
                            <button onClick={() => setIsConfigOpen(!isConfigOpen)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-semibold tracking-wide transition-all duration-200", isConfigOpen ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "glass-card text-white/40 hover:text-white/70 hover:bg-white/[0.04]")}><Sliders className="w-3 h-3" /> Config</button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-4xl mx-auto px-6 py-6">
                        {/* Hero + Reference Board */}
                        <DirectorHero onSend={handleSend} />
                        <ReferenceBoard
                            references={references} onUpload={handleRefUpload} onRemove={handleRefRemove}
                            onClose={() => setShowReferenceBoard(false)}
                            onSelectFromGallery={(cat) => setGalleryPickerCategory(cat)}
                        />

                        {/* Pipeline */}
                        {isThinking && <PipelineFlow activeStep={activePipelineStep} />}

                        {/* Progress */}
                        <GenerationProgress isThinking={isThinking} />

                        {/* Messages */}
                        <div className="space-y-4">
                            {messages.map((msg, i) => (<MessageBubble key={i} msg={msg} />))}
                            {isThinking && (
                                <div className="flex gap-3 justify-start">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-xl shadow-violet-900/30 relative">
                                        <div className="absolute inset-0 rounded-xl bg-white/10 animate-ping opacity-25 scale-75" /><Film className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="glass-card rounded-2xl px-4 py-3"><ThinkingIndicator /></div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>
                    </div>
                </div>

                {/* Input */}
                <div className="border-t border-white/[0.02] bg-gradient-to-t from-[#0a0a14]/90 via-[#0a0a14]/70 to-transparent backdrop-blur-2xl shrink-0 relative z-10 before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.01] before:to-transparent before:pointer-events-none">
                    <div className="max-w-4xl mx-auto px-6 py-4">
                        {references.length > 0 && (
                            <div className="flex items-center gap-2 mb-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] shadow-inner shadow-white/[0.02]">
                                <div className="flex items-center gap-1.5">
                                    {REF_CATEGORIES.map(cat => { const count = references.filter(r => r.category === cat.id).length; if (count === 0) return null; const CatIcon = cat.icon; return (<span key={cat.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-[8px] text-white/50 font-mono"><CatIcon className="w-2.5 h-2.5" />{count} {cat.label}</span>); })}
                                </div>
                                <span className="text-[9px] text-white/30 ml-auto">{references.length} reference{references.length > 1 ? 's' : ''} loaded</span>
                                <button onClick={() => setShowReferenceBoard(true)} className="text-[8px] font-semibold text-violet-400/60 hover:text-violet-300 transition-colors uppercase tracking-wider ml-2">Edit</button>
                                <button onClick={() => setReferences([])} className="text-white/30 hover:text-red-400 transition-colors p-0.5"><X size={13} /></button>
                            </div>
                        )}
                        <div className="flex gap-3 items-end">
                            <div className="flex-1 relative group">
                                <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-violet-500/20 via-transparent to-indigo-500/20 opacity-0 group-focus-within:opacity-100 transition-all duration-500 blur-sm" />
                                <div className="relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] rounded-2xl px-5 py-4 focus-within:border-violet-500/30 focus-within:shadow-[0_0_40px_rgba(139,92,246,0.08)] transition-all duration-300 shadow-inner shadow-black/20">
                                    {/* @mention dropdown */}
                                    {showMention && references.length > 0 && (
                                        <div ref={mentionRef} className="absolute bottom-full left-0 right-0 mb-2 mx-1 max-h-[200px] overflow-y-auto rounded-2xl bg-[#12121e] border border-white/[0.06] shadow-2xl shadow-black/50 backdrop-blur-2xl z-50 custom-scrollbar">
                                            {references
                                                .filter(r => {
                                                    const idx = references.indexOf(r);
                                                    const tag = r.type?.startsWith('video/') ? 'Video' : 'Image';
                                                    const label = `${tag} ${idx + 1}`;
                                                    return !mentionFilter || label.toLowerCase().includes(mentionFilter.toLowerCase()) || r.name.toLowerCase().includes(mentionFilter.toLowerCase()) || r.categoryLabel.toLowerCase().includes(mentionFilter.toLowerCase());
                                                })
                                                .map((r, i) => {
                                                    const idx = references.indexOf(r);
                                                    const isVideo = r.type?.startsWith('video/');
                                                    const tag = isVideo ? 'Video' : 'Image';
                                                    return (
                                                        <button key={r.id} onClick={() => {
                                                            const before = input.slice(0, mentionCursorPos - 1);
                                                            const after = input.slice(mentionCursorPos + mentionFilter.length);
                                                            setInput(`${before}@${tag} ${idx + 1} ${after}`);
                                                            setShowMention(false);
                                                            textRef.current?.focus();
                                                        }}
                                                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-white/[0.04] transition-all text-left border-b border-white/[0.03] last:border-b-0">
                                                            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', isVideo ? 'bg-gradient-to-br from-red-500/20 to-orange-500/10' : 'bg-white/[0.06]')}>
                                                                {isVideo ? <Play className="w-3.5 h-3.5 text-red-400" /> : <Image className="w-3.5 h-3.5 text-violet-400" />}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[11px] font-semibold text-white/80">@{tag} {idx + 1}</p>
                                                                <p className="text-[8px] text-white/30 truncate">{r.categoryLabel} — {r.name}</p>
                                                            </div>
                                                            <span className={cn('text-[7px] font-mono px-1.5 py-0.5 rounded-md shrink-0', isVideo ? 'bg-red-500/10 text-red-400' : 'bg-violet-500/10 text-violet-400')}>{tag}</span>
                                                        </button>
                                                    );
                                                })}
                                            {references.filter(r => {
                                                const idx = references.indexOf(r);
                                                const tag = r.type?.startsWith('video/') ? 'Video' : 'Image';
                                                const label = `@${tag} ${idx + 1}`;
                                                return !mentionFilter || label.toLowerCase().includes(mentionFilter.toLowerCase()) || r.name.toLowerCase().includes(mentionFilter.toLowerCase()) || r.categoryLabel.toLowerCase().includes(mentionFilter.toLowerCase());
                                            }).length === 0 && (
                                                <div className="px-3.5 py-3 text-[10px] text-white/30 text-center">No references match "@{mentionFilter}"</div>
                                            )}
                                        </div>
                                    )}
                                    <textarea ref={textRef} value={input}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const selStart = e.target.selectionStart;
                                            setInput(val);
                                            const beforeCursor = val.slice(0, selStart);
                                            const atIdx = beforeCursor.lastIndexOf('@');
                                            if (atIdx !== -1 && (atIdx === 0 || beforeCursor[atIdx - 1] === ' ' || beforeCursor[atIdx - 1] === '\n')) {
                                                const afterAt = beforeCursor.slice(atIdx + 1);
                                                if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
                                                    setShowMention(true);
                                                    setMentionFilter(afterAt);
                                                    setMentionCursorPos(selStart);
                                                } else { setShowMention(false); }
                                            } else { setShowMention(false); }
                                        }}
                                        onKeyDown={e => {
                                            if (showMention) {
                                                if (e.key === 'Escape') { setShowMention(false); return; }
                                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setShowMention(false); handleSend(); return; }
                                            }
                                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                                        }}
                                        placeholder="Describe your cinematic vision... Type @ to tag references..."
                                        rows={1} className="w-full bg-transparent text-[15px] text-white/90 placeholder-white/15 outline-none resize-none leading-relaxed max-h-[200px] overflow-y-auto apple-text" style={{ minHeight: '80px' }} />
                                </div>
                            </div>
                            <button onClick={() => handleSend()} disabled={(!input.trim() && references.length === 0) || isThinking} className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white disabled:opacity-20 disabled:cursor-not-allowed hover:from-violet-400 hover:to-indigo-500 active:scale-90 transition-all duration-200 shadow-[0_0_25px_rgba(139,92,246,0.3)] shrink-0 hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] hover:scale-[1.02]">
                                {isThinking ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONFIG DRAWER */}
            {isConfigOpen && (
                <div className="w-80 shrink-0 border-l border-white/[0.04] bg-[#0a0a14]/60 backdrop-blur-2xl flex flex-col z-20 transition-all duration-300">
                    <div className="p-4 border-b border-white/[0.04] flex justify-between items-center bg-black/20">
                        <div><h3 className="text-xs font-bold apple-text-heading text-gradient-primary">Director Config</h3><p className="text-[8px] text-white/30 uppercase mt-0.5 font-mono tracking-wider">Agent Settings</p></div>
                        <button onClick={() => setIsConfigOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="flex border-b border-white/[0.04] bg-black/10">
                        {[{ id: 'persona', label: 'Persona', icon: User }, { id: 'skills', label: 'Skills', icon: Brain }].map(tab => {
                            const TabIcon = tab.icon;
                            return (<button key={tab.id} onClick={() => setConfigTab(tab.id)} className={cn("flex-1 flex flex-col items-center gap-1 py-2 text-[8px] font-bold uppercase tracking-wider transition-all", configTab === tab.id ? "text-violet-400 bg-white/[0.03] border-b border-violet-400" : "text-white/40 hover:text-white/70")}><TabIcon className="w-3 h-3" />{tab.label}</button>);
                        })}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
                        {configTab === 'persona' && (
                            <div className="space-y-4">
                                <div><h4 className="font-bold text-white/80 text-xs apple-text mb-1">Director Persona</h4><p className="text-[9px] text-white/40 mb-2">Define the director's creative identity and decision-making style.</p>
                                    <textarea value={customPersona} onChange={(e) => setCustomPersona(e.target.value)} rows={12} placeholder="# Director Persona&#10;style: cinematic, precise&#10;influences: Nolan, Villeneuve..." className="w-full bg-black/40 border border-white/10 rounded-lg p-3 font-mono text-[9px] text-zinc-300 outline-none focus:border-violet-500 transition-colors" />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setCustomPersona(`# Director Persona\nstyle: Precise, cinematic, atmospheric\ninfluences: Denis Villeneuve (composition), Roger Deakins (lighting)\nsignature: Wide establishing shots, slow dolly movements, natural light`); }} className="flex-1 py-1.5 glass-card rounded-lg text-[8px] font-black uppercase text-white/60 hover:text-white transition-all">Load Template</button>
                                    <button onClick={() => setCustomPersona('')} className="py-1.5 px-3 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-950/30 rounded-lg text-[8px] font-black uppercase transition-all">Clear</button>
                                </div>
                            </div>
                        )}
                        {configTab === 'skills' && (
                            <div className="space-y-4">
                                <div><h4 className="font-bold text-white/80 text-xs apple-text mb-1">Production Skills</h4><p className="text-[9px] text-white/40 mb-3">Toggle cinematic skills to inject into the director's workflow.</p>
                                    <div className="space-y-2">
                                        {dbSkills.map(skill => { const active = activeSkills.includes(skill.name); return (<button key={skill.id} onClick={() => toggleSkill(skill.name)} className={cn("w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left", active ? "glass-card-strong border-violet-500/20" : "glass-card border-white/5 text-white/50 hover:bg-white/[0.03]")}><div className="min-w-0 pr-2"><p className="font-bold text-[9px] apple-text">{skill.name}</p><p className="text-[8px] text-white/30 truncate mt-0.5">{skill.description}</p></div>{active ? <ToggleRight className="w-4 h-4 text-violet-400 shrink-0" /> : <ToggleLeft className="w-4 h-4 text-white/20 shrink-0" />}</button>); })}
                                        {dbSkills.length === 0 && <p className="text-[9px] text-white/20 italic text-center py-4 glass-card rounded-xl">No active skills found. Go to Admin {'>'} Hermes Skills to create one.</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ReferenceDetailsModal 
                pendingRef={pendingRef} 
                modalDetails={modalDetails} 
                setModalDetails={setModalDetails} 
                onSave={handleSavePendingRef} 
                onCancel={() => { setPendingRef(null); setModalDetails({}); }}
            />

            {galleryPickerCategory && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[9999] p-6">
                    <div className="w-full max-w-5xl h-[85vh] bg-[#08080e] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />
                        
                        {/* Header */}
                        <div className="p-5 border-b border-white/[0.04] bg-black/20 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xs font-black text-violet-400 uppercase tracking-widest">Select {REF_CATEGORIES.find(c => c.id === galleryPickerCategory)?.label} Reference from Gallery</h3>
                                <p className="text-[8px] text-white/30 uppercase font-mono tracking-widest mt-0.5">Choose any of your previously generated or uploaded assets</p>
                            </div>
                            <button onClick={() => setGalleryPickerCategory(null)} className="p-1.5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0 min-w-0">
                            <AssetsLibrary 
                                compact={true} 
                                defaultTab={
                                    galleryPickerCategory === 'character' ? 'characters' : 
                                    galleryPickerCategory === 'video' ? 'videos' : 'images'
                                } 
                                onSelectReference={handleSelectFromGallery}
                            />
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/[0.04] bg-black/20 flex justify-end shrink-0">
                            <button 
                                onClick={() => setGalleryPickerCategory(null)}
                                className="px-5 py-2.5 rounded-xl text-[9px] font-bold text-white/50 hover:text-white hover:bg-white/5 border border-white/5 transition-all uppercase tracking-wider"
                            >
                                Close Gallery
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.04); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.08); }`}</style>
        </div>
    );
}
