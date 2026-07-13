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
import { useShorts } from '../../hooks/useShorts';

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

const SYSTEM_PROMPT = `You are the ZeroLens AI Cinema Director. Do NOT write your creative thoughts or prompts immediately. You think and act like a hierarchical directing team (Executive Creative Director, Film Director, Cinematographer, Production Designer, Editor, AI Capability Supervisor, and Commercial Reviewer) supported by a 15-step Visual Intelligence Engine.

### YOUR CONVERSATIONAL PROTOCOL (MUST FOLLOW STATE TRANSITIONS):

On every single turn, before outputting your response, you must execute your self-assessment "Director's Inner Monologue" wrapped exactly in "[INNER MONOLOGUE]" and "[/INNER MONOLOGUE]" tags. 

Inside the monologue, you must strictly run through these 15 Engines in this exact order:

1. Creative Intent: What story, emotion, and visual language should the audience experience?
2. Visual Intelligence Engine: Analyze Object, Material, Shape, Surface, Motion, Reflection, Hero Details, Manufacturing Style, Category, and Brand Positioning.
3. Audience Emotion Engine: Map Current Emotion -> Desired Emotion -> Buying Trigger -> Memory Trigger -> Final Action.
4. Creative Concept Engine: Explore Literal -> Emotional -> Symbolic -> Material -> Environmental -> Fantasy -> Luxury -> Scientific -> Minimal -> Artistic concepts.
5. Story Graph Engine: Map the narrative arc: Hook -> Discovery -> Conflict -> Transformation -> Desire -> Resolution -> Brand Memory.
6. Scene Planner: Block out the high-level scenes based on the Story Graph.
7. Shot Purpose Engine: Define every shot's singular purpose: Hook, Information, Emotion, Proof, Hero, or Memory.
8. Camera Motivation Engine: Why move? Why stop? Why macro? Why orbit? Why handheld? Why static? Every camera move must have strict intent.
9. Light Psychology Engine: Attach emotion to lighting (e.g., Luxury -> Warm Soft, Technology -> Clean White, Horror -> Directional, Fashion -> High Contrast, Food -> Golden Warm, Medical -> Bright Clinical).
10. Material Engine: Analyze how the product material behaves under light (Glass, Gold, Leather, Fabric, Wood, Food, Metal, Plastic, Liquid, Smoke, Fire, Water, Crystal, Ice, Paper, Stone).
11. Transition Engine: Choose intent-driven transitions (Match Cut, Light Transition, Object Transition, Reflection, Motion Match, Camera Pass, Fabric Wipe, Focus Pull, Whip Pan, Hidden Cut).
12. Visual Balance Engine: Automatically check for compositional fatigue. Too many macros? Too many wides? Too much left composition? Too much center framing? Too much movement? Too much darkness? Fix automatically.
13. Continuity Engine: Maintain strict World State across scenes. Track Character, Wardrobe, Product, Lighting, Lens, Color Grade, Weather, Props, Camera Height, Composition, Time of Day. No contradictions.
14. AI Reliability Engine: Evaluate AI generation safety. Check Identity, Physics, Lighting, Materials, Motion, Continuity, Particles, Liquids, Crowds, Animals, Text, Hands. Optimize out impossible shots.
15. Director Review: Ask yourself: "Would I shoot this? Would Nike shoot this? Would Apple shoot this? Would Dior shoot this? Would A24 shoot this? Would this win an ad festival?" If not, REWRITE.

---

### YOUR STEP-BY-STEP WORKFLOW:

#### Turn 1 (Initial Setup Analysis):
- Run Engines 1 through 5 in your [INNER MONOLOGUE].
- Define the "[GLOBAL DIRECTOR BIBLE]" for this project (defining style, mood, lighting, color, camera, visual language, aspect ratio, character consistency, and continuity constraints) once. All future scene prompts will inherit from this bible rather than repeating these parameters.
- Provide a credit-optimized duration breakdown (e.g. for a 30s video: 4 scenes, 8 shots budget) and ask: "Would you like me to proceed?"

#### Turn 2 (Hook Selection):
- Run Engines 6 and 7 in your [INNER MONOLOGUE].
- Propose 5 specific hook options based on the brand/product using the Opening Strategy Engine. Ask: "Which hook would you like to choose?"

#### Turn 3 (Ending Selection):
- Run Engines 8 and 9 in your [INNER MONOLOGUE].
- Propose 4 specific ending options. Ask: "Which ending would you like to choose?"

#### Turn 4 (Storyboard & Critique):
- Run Engines 10 through 15 in your [INNER MONOLOGUE].
- Construct the detailed storyboard cut specifying Scene Number, Duration, Purpose, Emotion, and Shot breakdown (inheriting from the Global Director Bible).
- Ask: "Do you approve this storyboard?"

#### Turn 5 (Final Prompt Pack Generation):
- Run a final Director Review in your [INNER MONOLOGUE].
- Output the final production-ready prompt pack (storyboard sequence, shot list, camera suggestions, character actions, sound cues) including the Scene-by-Scene Generation Prompts mapped to the Seedance multishot cinematic spec, inheriting all rules from the Global Director Bible. CRITICAL: You MUST wrap each scene's final generation prompt inside its own separate markdown code block (using \`\`\` scene ... \`\`\` formatting) so the frontend video rendering panels appear correctly.

Keep your language professional, direct, and creative. You are an expert commercial filmmaker.`;

const SUGGESTED_PROMPTS = [
    "A lone warrior walking through a neon-lit cyberpunk city at midnight, rain-slicked streets reflecting holographic signs",
    "10s luxury watch ad: a diver's watch descending into deep ocean, slow-motion bubble trail, macro dial detail",
    "Fantasy warrior vs ice dragon in a frozen tundra, blizzard atmosphere, creature scales crusted with frost",
    "Apocalyptic scene: lone figure walking through abandoned city swallowed by sandstorm, dust particles catching amber light",
];

const REF_CATEGORIES = [
    { id: 'character', label: 'Character', icon: User, color: 'from-violet-500 to-purple-600', desc: 'Face, body, identity references' },
    { id: 'product', label: 'Product', icon: Box, color: 'from-amber-500 to-orange-600', desc: 'Product packaging, textures' },
    { id: 'location', label: 'Location', icon: MapPin, color: 'from-emerald-500 to-teal-600', desc: 'Shooting settings, environments' },
    { id: 'first_frame', label: 'First Frame', icon: Image, color: 'from-blue-500 to-cyan-600', desc: 'Starting reference frame' },
    { id: 'brand_guidelines', label: 'Brand Guidelines', icon: FileText, color: 'from-pink-500 to-rose-600', desc: 'Style guide, color rules' },
    { id: 'logo', label: 'Logo', icon: Target, color: 'from-yellow-500 to-amber-600', desc: 'Brand logo graphic files' },
    { id: 'voice', label: 'Voice', icon: Volume2, color: 'from-cyan-500 to-teal-600', desc: 'Audio clips, voice styling' },
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
    product: [
        { name: 'productName', label: 'Product Name', type: 'text', placeholder: 'e.g. Skincare Serum, Energy Drink' },
        { name: 'material', label: 'Material/Texture', type: 'text', placeholder: 'e.g. Amber glass bottle, matte cardboard' },
        { name: 'color', label: 'Product Color', type: 'text', placeholder: 'e.g. Translucent gold, crimson red' },
        { name: 'details', label: 'Product Specifications', type: 'textarea', placeholder: 'e.g. Premium skincare serum bottle with white dropper' }
    ],
    location: [
        { name: 'locationName', label: 'Location Name', type: 'text', placeholder: 'e.g. Melancholic Cafe, Neon Alleyway, Kitchen Set' },
        { name: 'environment', label: 'Environment', type: 'select', options: ['Select Environment', 'Indoor', 'Outdoor', 'Studio Set', 'Mixed'] },
        { name: 'placeType', label: 'Place Type', type: 'text', placeholder: 'e.g. Kitchen, Hall, Cafe, Office, Alleyway, Desert' },
        { name: 'lighting', label: 'Lighting & Mood', type: 'text', placeholder: 'e.g. Neon twilight, high-contrast chiaroscuro, dim candlelit' },
        { name: 'style', label: 'Architecture Style', type: 'text', placeholder: 'e.g. Cyberpunk, Victorian gothic, minimalist scandinavian' },
        { name: 'timeOfDay', label: 'Time of Day', type: 'text', placeholder: 'e.g. Golden hour, midnight, early morning' }
    ],
    first_frame: [
        { name: 'frameName', label: 'Frame Description', type: 'text', placeholder: 'e.g. Starting static shot of product on table' },
        { name: 'details', label: 'Visual Composition', type: 'textarea', placeholder: 'e.g. Close up of the bottle, camera angled slightly up, blurry background' }
    ],
    brand_guidelines: [
        { name: 'brandName', label: 'Brand Name', type: 'text', placeholder: 'e.g. GlowSkin Co.' },
        { name: 'colors', label: 'Brand Colors', type: 'text', placeholder: 'e.g. Pastel pink, gold, clean white' },
        { name: 'tone', label: 'Tone of Voice', type: 'text', placeholder: 'e.g. Luxury, medical, scientific, emotional' },
        { name: 'rules', label: 'Key Constraints', type: 'textarea', placeholder: 'e.g. Never show harsh shadows, keep branding visible, no fast transitions' }
    ],
    logo: [
        { name: 'logoName', label: 'Logo Label', type: 'text', placeholder: 'e.g. Glowing text logo' },
        { name: 'placement', label: 'Preferred Placement', type: 'select', options: ['Select Placement', 'Top Left', 'Top Right', 'Bottom Left', 'Bottom Right', 'Center Overlay'] },
        { name: 'opacity', label: 'Opacity/Style', type: 'text', placeholder: 'e.g. Semi-translucent, high contrast white' }
    ],
    voice: [
        { name: 'voiceName', label: 'Voice Profile Name', type: 'text', placeholder: 'e.g. Calm Female Voice, Energetic Male' },
        { name: 'tone', label: 'Emotional Tone', type: 'text', placeholder: 'e.g. Soothing, professional, friendly, dramatic' },
        { name: 'accent', label: 'Accent/Language', type: 'text', placeholder: 'e.g. US English, British accent' }
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
    const isAudio = category === 'voice' || file.type?.startsWith('audio/');

    useEffect(() => {
        if (!file || isVideo || isAudio) return;
        const img = new window.Image();
        img.onload = () => {
            const isPortrait = img.height > img.width;
            setAnalysis({ dimensions: `${img.width}×${img.height}`, orientation: isPortrait ? 'Portrait' : 'Landscape', size: (file.size / 1024).toFixed(0) + ' KB' });
        };
        img.src = file.data;
    }, [file, isVideo, isAudio]);

    return (
        <div className="group relative glass-card rounded-xl overflow-hidden hover:border-white/15 transition-all duration-300 hover:scale-[1.02]">
            <div className="aspect-[4/3] overflow-hidden bg-black/40 flex items-center justify-center">
                {isAudio ? (
                    <div className="flex flex-col items-center gap-1.5 p-3 text-center w-full">
                        <Volume2 className="w-8 h-8 text-cyan-400 animate-pulse" />
                        <audio src={file.data} className="w-full max-w-[150px] h-6 scale-75 opacity-70 hover:opacity-100 transition-opacity" controls />
                    </div>
                ) : isVideo ? (
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
                    {(isVideo || isAudio) && <span className="text-[7px] text-white/40 font-mono bg-white/5 px-1.5 py-0.5 rounded">{(file.size / 1024 / 1024).toFixed(1)} MB</span>}
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
                <input ref={fileRef} type="file" accept={category.id === 'voice' ? 'audio/*' : category.id === 'video' ? 'video/*' : 'image/*'} onChange={(e) => onUpload(e, category.id)} className="hidden" />
            </div>
            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 border border-dashed border-white/5 rounded-xl">
                    <Upload className="w-5 h-5 text-white/15 mb-2" />
                    <p className="text-[9px] text-white/20">Drop {category.label.toLowerCase()}{category.id === 'voice' ? ' audio' : category.id === 'video' ? ' videos' : ' images'} or click +</p>
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

function ProjectSetupWizard({
    videoDuration, setVideoDuration,
    platform, setPlatform,
    videoGoal, setVideoGoal,
    scriptText, setScriptText,
    directorMode, setDirectorMode,
    references, handleRefUpload, handleRefRemove, setGalleryPickerCategory,
    onInitialize, isSessionReady
}) {
    return (
        <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/[0.08] bg-gradient-to-br from-violet-950/10 via-[#0a0a14]/60 to-[#05050a]/40 shadow-2xl relative overflow-hidden animate-fade-in mb-6">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
            
            {/* Title */}
            <div className="flex items-center gap-4 mb-6 border-b border-white/[0.04] pb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 border border-violet-400/20">
                    <Film className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                        AI Cinema Director
                    </h2>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 mt-0.5 font-mono">
                        Step 1 - Project setup & assets configuration
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Specs & Script */}
                <div className="space-y-5">
                    {/* Specs Card */}
                    <div className="space-y-4 p-4 rounded-2xl border border-white/[0.04] bg-black/20">
                        <div>
                            <label className="text-[9px] font-black uppercase text-violet-400 tracking-wider font-mono">Video Duration</label>
                            <div className="grid grid-cols-3 gap-2 mt-1.5">
                                {['10 sec', '15 sec', '20 sec', '30 sec', '45 sec', '60 sec'].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setVideoDuration(d)}
                                        className={cn(
                                            "py-2 rounded-xl text-[10px] font-bold border transition-all duration-300",
                                            videoDuration === d
                                                ? "bg-violet-500/20 border-violet-500/40 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                                : "bg-white/[0.02] border-white/5 text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                                        )}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] font-black uppercase text-violet-400 tracking-wider font-mono">Platform Format</label>
                            <div className="grid grid-cols-3 gap-2 mt-1.5">
                                {[
                                    { id: 'Instagram', label: 'Instagram', icon: '📸' },
                                    { id: 'TikTok', label: 'TikTok', icon: '🎵' },
                                    { id: 'YouTube', label: 'YouTube', icon: '📺' }
                                ].map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setPlatform(p.id)}
                                        className={cn(
                                            "py-2 px-3 rounded-xl text-[10px] font-bold border flex flex-col items-center gap-1 transition-all duration-300",
                                            platform === p.id
                                                ? "bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                                                : "bg-white/[0.02] border-white/5 text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                                        )}
                                    >
                                        <span className="text-xs">{p.icon}</span>
                                        <span>{p.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] font-black uppercase text-violet-400 tracking-wider font-mono">Director Mode</label>
                            <div className="grid grid-cols-2 gap-2 mt-1.5 mb-4">
                                <button
                                    onClick={() => setDirectorMode('auto')}
                                    className={cn(
                                        "px-3 py-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all duration-300 relative overflow-hidden text-left",
                                        directorMode === 'auto'
                                            ? "bg-violet-500/20 border-violet-500/40 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                            : "bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/40 opacity-60 hover:opacity-100"
                                    )}
                                >
                                    {directorMode === 'auto' && <div className="absolute inset-0 bg-gradient-to-br from-violet-400/10 to-transparent pointer-events-none" />}
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-[10px] font-bold text-white flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-violet-400" /> Auto Director</span>
                                        {directorMode === 'auto' && <Check className="w-3 h-3 text-violet-400" />}
                                    </div>
                                    <span className="text-[8px] text-white/50 leading-relaxed font-medium">Fully autonomous. AI selects best hook, metaphor, and pacing instantly without interrupting.</span>
                                </button>
                                <button
                                    onClick={() => setDirectorMode('workshop')}
                                    className={cn(
                                        "px-3 py-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all duration-300 relative overflow-hidden text-left",
                                        directorMode === 'workshop'
                                            ? "bg-indigo-500/20 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                                            : "bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/40 opacity-60 hover:opacity-100"
                                    )}
                                >
                                    {directorMode === 'workshop' && <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/10 to-transparent pointer-events-none" />}
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-[10px] font-bold text-white flex items-center gap-1.5"><Palette className="w-3 h-3 text-indigo-400" /> Director Workshop</span>
                                        {directorMode === 'workshop' && <Check className="w-3 h-3 text-indigo-400" />}
                                    </div>
                                    <span className="text-[8px] text-white/50 leading-relaxed font-medium">Interactive mode. Compare hooks, brainstorm metaphors, and build the story step-by-step.</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] font-black uppercase text-violet-400 tracking-wider font-mono">Production Goal</label>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {['UGC', 'Advertisement', 'Storytelling', 'Product Demo', 'Cinematic', 'Hook', 'Educational', 'Visual Metaphor'].map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setVideoGoal(g)}
                                        className={cn(
                                            "px-2.5 py-1.5 rounded-lg text-[9px] font-bold border transition-all duration-300",
                                            videoGoal === g
                                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                                                : "bg-white/[0.02] border-white/5 text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                                        )}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Script Area */}
                    <div className="p-4 rounded-2xl border border-white/[0.04] bg-black/20 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[9px] font-black uppercase text-violet-400 tracking-wider font-mono">Creative Script</label>
                            <span className="text-[8px] text-white/30 font-mono">
                                {scriptText ? `${scriptText.split(/\s+/).filter(Boolean).length} words` : 'Empty'}
                            </span>
                        </div>
                        <textarea
                            value={scriptText}
                            onChange={(e) => setScriptText(e.target.value)}
                            placeholder="Write your story/script or paste an existing script here..."
                            rows={6}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 outline-none focus:border-violet-500/50 transition-colors resize-none font-sans leading-relaxed"
                        />
                    </div>
                </div>

                {/* Right: Asset Board */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-[9px] font-black uppercase text-violet-400 tracking-wider font-mono">Step 2 - Attach Assets</label>
                        <span className="text-[8px] text-white/30 font-mono">{references.length} assets uploaded</span>
                    </div>
                    
                    {/* Simplified list of assets for the Setup Wizard */}
                    <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        {REF_CATEGORIES.map(cat => {
                            const uploadedItems = references.filter(r => r.category === cat.id);
                            const isUploaded = uploadedItems.length > 0;
                            const CatIcon = cat.icon;
                            return (
                                <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-black/10 hover:bg-black/30 transition-all">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow border", isUploaded ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/[0.02] border-white/5 text-white/30")}>
                                            {isUploaded ? <Check className="w-4 h-4 text-emerald-400" /> : <CatIcon className="w-4 h-4" />}
                                        </div>
                                        <div className="min-w-0 pr-2 flex-1">
                                            <p className="text-[10px] font-bold text-white/80">{cat.label}</p>
                                            <p className="text-[8px] text-white/35 truncate">{isUploaded ? uploadedItems.map(i => i.name).join(', ') : cat.desc}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-2">
                                        <button 
                                            onClick={() => setGalleryPickerCategory(cat.id)}
                                            className="px-2 py-1 rounded bg-white/[0.04] border border-white/10 hover:border-violet-500/30 hover:bg-violet-500/5 text-white/50 hover:text-violet-300 text-[8px] font-bold uppercase transition-all"
                                        >
                                            Gallery
                                        </button>
                                        <label className="px-2 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white text-[8px] font-bold uppercase cursor-pointer transition-all">
                                            Upload
                                            <input 
                                                type="file" 
                                                accept={cat.id === 'voice' ? 'audio/*' : cat.id === 'video' ? 'video/*' : 'image/*'} 
                                                onChange={(e) => handleRefUpload(e, cat.id)} 
                                                className="hidden" 
                                            />
                                        </label>
                                        {isUploaded && (
                                            <button 
                                                onClick={() => handleRefRemove(cat.id, uploadedItems[0].id)}
                                                className="p-1 rounded bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-400 transition-all"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Initializer Button */}
            <div className="mt-8 flex justify-center border-t border-white/[0.04] pt-5">
                <button
                    onClick={onInitialize}
                    disabled={!isSessionReady}
                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] hover:scale-[1.02]"
                >
                    Initialize Director Session
                </button>
            </div>
        </div>
    );
}

function VideoPromptGenerator({ promptText, references, userId, getApiKey, defaultAspectRatio = '16:9' }) {
    const [status, setStatus] = useState('idle');
    const [engine, setEngine] = useState('seedance-fast');
    const [aspectRatio, setAspectRatio] = useState(defaultAspectRatio);
    const [duration, setDuration] = useState(5);
    const [generateAudio, setGenerateAudio] = useState(true);
    const [videoUrl, setVideoUrl] = useState('');
    const [progressMsg, setProgressMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const { refresh: refreshShorts } = useShorts() || { refresh: () => {} };

    const handleGenerate = async () => {
        setStatus('loading');
        setErrorMsg('');
        
        const isOmni = engine === 'omni-flash';
        setProgressMsg(isOmni ? 'Submitting to Gemini Omni Flash...' : 'Initializing Seedance engine...');
        
        try {
            let firstFrame = null;
            let lastFrame = null;
            const refImages = [];
            const refVideos = [];
            const refAudios = [];
            const contentBlocks = [];
            contentBlocks.push({ type: 'text', text: promptText });
            
            references.forEach((ref) => {
                const isVideo = ref.type?.startsWith('video/');
                const isAudio = ref.type?.startsWith('audio/');
                
                if (isVideo) {
                    refVideos.push(ref.data);
                    contentBlocks.push({
                        type: 'video_url',
                        video_url: { url: ref.data },
                        role: 'reference_video'
                    });
                } else if (isAudio) {
                    refAudios.push(ref.data);
                    contentBlocks.push({
                        type: 'audio_url',
                        audio_url: { url: ref.data },
                        role: 'reference_audio'
                    });
                } else {
                    refImages.push(ref.data);
                    contentBlocks.push({
                        type: 'image_url',
                        image_url: { url: ref.data },
                        role: 'reference_image'
                    });
                    if (ref.category === 'first_frame') {
                        firstFrame = ref.data;
                    }
                }
            });

            if (!firstFrame && refImages.length > 0) {
                firstFrame = refImages[0];
            }

            const headers = { 'Content-Type': 'application/json' };
            const adminKey = getApiKey();
            if (adminKey) headers['x-admin-trial-key'] = adminKey;

            if (isOmni) {
                const resp = await fetch(getApiUrl('/api/omni-i2v'), {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        image: firstFrame || undefined,
                        firstFrameImage: firstFrame || undefined,
                        lastFrameImage: lastFrame || undefined,
                        motionPrompt: promptText,
                        duration,
                        aspectRatio,
                        resolution: '720p',
                        model: 'gemini-omni-flash-preview',
                        ref_images: refImages,
                        ref_videos: refVideos,
                        ref_audios: refAudios,
                        userId,
                        generateAudio,
                        creditReason: 'cinematic_video_generation'
                    })
                });

                const json = await resp.json();
                if (!resp.ok) throw new Error(json.error || 'Gemini Omni Flash task failed.');
                if (!json.videoUrl) throw new Error('Omni returned no video URL.');

                setVideoUrl(json.videoUrl);
                setStatus('completed');
                setProgressMsg('');
                refreshShorts();
                return;
            }

            // Seedance Logic
            const modelParam = engine === 'seedance-fast'
                ? 'dreamina-seedance-2-0-fast-260128'
                : engine === 'seedance-mini'
                ? 'bytedance/seedance-2-mini'
                : 'dreamina-seedance-2-0-260128';

            const resp = await fetch(getApiUrl('/api/seedance/generate'), {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    engine,
                    model: modelParam,
                    seedanceContentArray: contentBlocks,
                    duration,
                    aspectRatio,
                    resolution: engine === 'seedance-fast' ? '720p' : '1080p',
                    userId,
                    generateAudio,
                    creditReason: 'cinematic_video_generation'
                })
            });

            const json = await resp.json();
            if (!resp.ok) throw new Error(json.error || 'Seedance task initialization failed.');

            const taskId = json.requestId;
            if (!taskId) throw new Error('No task ID returned from server.');

            pollTask(taskId, json.engine || engine);
        } catch (err) {
            setStatus('error');
            setErrorMsg(err.message || 'Generation failed.');
        }
    };

    const pollTask = async (taskId, activeEngine) => {
        setStatus('polling');
        const engineLabel = activeEngine.includes('fast') ? 'Seedance Fast' : activeEngine.includes('mini') ? 'Seedance Mini' : 'Seedance 2.0';
        
        for (let i = 0; i < 150; i++) {
            await new Promise(r => setTimeout(r, 6000));
            const elapsed = (i + 1) * 6;
            setProgressMsg(`Rendering video... (${elapsed}s)`);
            
            try {
                const res = await fetch(getApiUrl(`/api/seedance/status/${taskId}?userId=${userId}&aspectRatio=${aspectRatio}&engine=${activeEngine}`));
                const json = await res.json();
                const st = json.status;
                
                if (st === 'completed') {
                    const url = json.url;
                    if (url) {
                        setVideoUrl(url);
                        setStatus('completed');
                        setProgressMsg('');
                        refreshShorts();
                        return;
                    }
                }
                
                if (st === 'failed' || st === 'error') {
                    setStatus('error');
                    setErrorMsg(json.error || json.message || `${engineLabel} generation failed.`);
                    setProgressMsg('');
                    refreshShorts();
                    return;
                }
            } catch (pollErr) {
                console.warn('[Seedance Poll Error]:', pollErr.message);
                continue;
            }
        }
        
        setStatus('error');
        setErrorMsg('Generation timed out.');
        refreshShorts();
    };

    return (
        <div className="mt-4 p-4 rounded-2xl border border-white/[0.06] bg-[#0c0c16]/80 backdrop-blur-md shadow-2xl relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
            
            {status === 'completed' && videoUrl ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-white/[0.04] pb-2">
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Generated Video Output</span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black shadow-inner aspect-video max-w-full">
                        <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                    </div>
                    <div className="flex gap-2">
                        <a href={videoUrl} download="director-cut.mp4" target="_blank" rel="noreferrer" className="flex-1 py-2 text-center rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] uppercase tracking-wider transition-all">
                            Open/Download HD Video
                        </a>
                        <button onClick={() => setStatus('idle')} className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-white/70 text-[10px] font-bold uppercase transition-all">
                            Re-generate
                        </button>
                    </div>
                </div>
            ) : status === 'loading' || status === 'polling' ? (
                <div className="py-6 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                    <p className="text-[11px] font-bold text-white/80">{progressMsg}</p>
                    <p className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Deducting credits & calling {engine === 'omni-flash' ? 'Vertex AI' : 'BytePlus'} nodes...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-white/80">Cinematic Video Studio</span>
                        </div>
                        <span className="text-[8px] font-mono text-white/30 uppercase">{engine === 'omni-flash' ? 'Gemini Omni Flash' : 'Dreamina Seedance 2.0'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[8px] font-black uppercase tracking-wider text-white/30 font-mono">Engine Quality</label>
                            <select value={engine} onChange={(e) => setEngine(e.target.value)} className="w-full bg-[#12121f] border border-white/10 rounded-xl px-2.5 py-1.5 text-[9px] font-bold text-white outline-none focus:border-violet-500/50 mt-1">
                                <option value="seedance-fast">Seedance 2.0 Fast (720p)</option>
                                <option value="seedace">Seedance 2.0 HD (1080p)</option>
                                <option value="seedance-mini">Seedance Mini (480p)</option>
                                <option value="omni-flash">Gemini Omni Flash (720p)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[8px] font-black uppercase tracking-wider text-white/30 font-mono">Duration</label>
                            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full bg-[#12121f] border border-white/10 rounded-xl px-2.5 py-1.5 text-[9px] font-bold text-white outline-none focus:border-violet-500/50 mt-1">
                                <option value={5}>5 Seconds</option>
                                <option value={10}>10 Seconds</option>
                                <option value={15}>15 Seconds (Max)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[8px] font-black uppercase tracking-wider text-white/30 font-mono">Aspect Ratio</label>
                            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-[#12121f] border border-white/10 rounded-xl px-2.5 py-1.5 text-[9px] font-bold text-white outline-none focus:border-violet-500/50 mt-1">
                                <option value="16:9">16:9 Landscape</option>
                                <option value="9:16">9:16 Portrait</option>
                                <option value="1:1">1:1 Square</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 mt-4 pl-1">
                            <input type="checkbox" checked={generateAudio} onChange={(e) => setGenerateAudio(e.target.checked)} className="rounded border-white/10 bg-[#12121f] text-violet-600 focus:ring-0 w-3 h-3 cursor-pointer" />
                            <label className="text-[9px] font-bold text-white/60 cursor-pointer">Generate Synced Audio</label>
                        </div>
                    </div>

                    {status === 'error' && (
                        <div className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-[10px] leading-relaxed">
                            {errorMsg}
                        </div>
                    )}

                    <button onClick={handleGenerate} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                        Generate Cinematic Video
                    </button>
                </div>
            )}
        </div>
    );
}

function DirectorAnalysisCard({ content, directorMode = 'auto' }) {
    const [showRaw, setShowRaw] = useState(false);
    
    const checklist = [
        { label: "Product DNA analyzed", desc: "Category, texture, macro priorities & hero selling moment defined" },
        { label: "Audience Psychology mapped", desc: "Buy triggers, consumption context & emotional comfort triggers identified" },
        { label: "Visual Hook selected", desc: "Scroll-stopping options (A/B/C) generated and score-critiqued" },
        { label: "Metaphor Engine activated", desc: "Symbolic metaphors, universal symbols & visual poetry mapped to benefits" },
        { label: "Shot Rhythm structured", desc: "Shot pacing sizes (Macro/Wide/Medium alternation) enforced" },
        { label: "AI Difficulty verified", desc: "Gemini Flash success probability checked & complex motion simplified" },
        { label: "Commercial Score calculated", desc: "Numerical metrics calculated out of 100" },
        { label: "Credit usage optimized", desc: "Duration timeline budgeted and scene/shot count minimized" }
    ];

    return (
        <div className="my-4 p-4 rounded-2xl border border-violet-500/20 bg-gradient-to-b from-[#0a0a18]/90 to-[#05050b]/90 shadow-2xl relative overflow-hidden text-left font-sans">
            <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-2 border-b border-white/[0.04] pb-2.5 mb-3">
                <Brain className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider text-violet-300">🎬 Director's Inner Analysis</span>
                <span className="text-[7.5px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-widest ml-auto font-bold animate-pulse">Verified</span>
            </div>

            <div className="space-y-2.5">
                {checklist.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-white/80 leading-none">{item.label}</p>
                            <p className="text-[9px] text-white/40 mt-1 font-mono">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {directorMode !== 'auto' && (
                <div className="border-t border-white/[0.04] mt-3.5 pt-2.5 flex justify-end">
                    <button 
                        onClick={() => setShowRaw(!showRaw)} 
                        className="text-[8px] font-bold text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider font-mono"
                    >
                        {showRaw ? "Hide raw thinking" : "View raw monologue"}
                    </button>
                </div>
            )}

            {showRaw && (
                <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-[9.5px] text-violet-300/80 leading-relaxed max-h-[220px] overflow-y-auto custom-scrollbar select-text text-left">
                    {content}
                </div>
            )}
        </div>
    );
}

function MessageBubble({ msg, references = [], userId, getApiKey, defaultAspectRatio = '16:9', directorMode = 'auto', isLast = false, onSend }) {
    const [showRaw, setShowRaw] = useState(false);
    const [copied, setCopied] = useState(false);
    const isUser = msg.role === 'user';

    const handleCopy = () => { navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };

    const formatText = (text) => {
        const parts = [];
        let lastIndex = 0;
        let match;
        
        // Find monologue and code blocks
        const monologues = [];
        const monologueRegex = /\[INNER MONOLOGUE\]([\s\S]*?)\[\/INNER MONOLOGUE\]/g;
        while ((match = monologueRegex.exec(text)) !== null) {
            monologues.push({
                type: 'monologue',
                index: match.index,
                length: match[0].length,
                content: match[1].trim()
            });
        }

        const blocks = [];
        const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
        while ((match = codeBlockRegex.exec(text)) !== null) {
            blocks.push({
                type: 'code',
                index: match.index,
                length: match[0].length,
                language: match[1],
                content: match[2]
            });
        }

        monologues.forEach(m => blocks.push(m));
        blocks.sort((a, b) => a.index - b.index);

        let combinedPromptTexts = [];

        blocks.forEach(block => {
            if (block.index > lastIndex) {
                parts.push(...formatInlineText(text.slice(lastIndex, block.index), lastIndex));
            }

            if (block.type === 'monologue') {
                parts.push(
                    <DirectorAnalysisCard
                        key={`monologue-${block.index}`}
                        content={formatInlineText(block.content, block.index)}
                        directorMode={directorMode}
                    />
                );
            } else if (block.type === 'code') {
                const promptText = block.content.trim();
                const language = block.language?.trim().toLowerCase();
                const isCodeLanguage = ['javascript', 'js', 'json', 'html', 'css', 'python', 'py', 'sql', 'bash', 'sh', 'yaml', 'yml'].includes(language);
                const isVideoPrompt = !isCodeLanguage && (
                    language === 'scene' || 
                    language === 'prompt' || 
                    language === 'generate' || 
                    language === 'text' ||
                    !language ||
                    promptText.toLowerCase().includes('style') ||
                    promptText.toLowerCase().includes('scene') ||
                    promptText.toLowerCase().includes('shot') ||
                    promptText.toLowerCase().includes('camera') ||
                    promptText.toLowerCase().includes('prompt') ||
                    promptText.toLowerCase().includes('lighting')
                );

                if (isVideoPrompt) {
                    combinedPromptTexts.push(promptText);
                }

                parts.push(
                    <div key={`code-${block.index}`} className="my-3 rounded-xl overflow-hidden border border-white/5 bg-black/40 text-left">
                        {block.language && <div className="px-3 py-1 bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/30">{block.language}</div>}
                        <pre className="p-3 text-[11px] text-emerald-300 overflow-x-auto leading-relaxed font-mono select-text">{promptText}</pre>
                        {isVideoPrompt && (
                            <div className="p-3 border-t border-white/5 bg-black/25">
                                <VideoPromptGenerator
                                    promptText={promptText}
                                    references={references}
                                    userId={userId}
                                    getApiKey={getApiKey}
                                    defaultAspectRatio={defaultAspectRatio}
                                />
                            </div>
                        )}
                    </div>
                );
            }
            
            lastIndex = block.index + block.length;
        });

        if (lastIndex < text.length) {
            parts.push(...formatInlineText(text.slice(lastIndex), lastIndex));
        }

        if (combinedPromptTexts.length > 0) {
            const masterPrompt = combinedPromptTexts.join('\n\n---\n\n');
            parts.push(
                <div key="master-generate" className="mt-5 border border-white/10 bg-[#0a0a14]/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
                    <div className="px-4 py-2.5 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Film className="w-3.5 h-3.5 text-violet-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-violet-300">Master Sequence Generator</span>
                        </div>
                        <span className="text-[9px] text-white/40 font-mono font-bold bg-white/5 px-2 py-0.5 rounded">{combinedPromptTexts.length} Scenes Combined</span>
                    </div>
                    <div className="p-3 bg-black/20">
                        <VideoPromptGenerator
                            promptText={masterPrompt}
                            references={references}
                            userId={userId}
                            getApiKey={getApiKey}
                            defaultAspectRatio={defaultAspectRatio}
                        />
                    </div>
                </div>
            );
        }
        return parts;
    };

    const renderBoldText = (processed) => {
        const boldRegex = /\*\*([^*]+)\*\*/g;
        const elements = [];
        let lastIdx = 0;
        let bMatch;
        while ((bMatch = boldRegex.exec(processed)) !== null) {
            if (bMatch.index > lastIdx) {
                elements.push(processed.slice(lastIdx, bMatch.index));
            }
            elements.push(<strong key={bMatch.index} className="text-violet-300 font-extrabold">{bMatch[1]}</strong>);
            lastIdx = bMatch.index + bMatch[0].length;
        }
        if (lastIdx < processed.length) {
            elements.push(processed.slice(lastIdx));
        }
        return elements.length > 0 ? elements : processed;
    };

    const formatInlineText = (text, keyOffset) => {
        const lines = text.split('\n');
        return lines.map((line, idx) => {
            const trimmed = line.trim();
            if (trimmed === '') {
                return <div key={`${keyOffset}-${idx}`} className="h-2.5" />;
            }
            
            // 1. Headers
            const h1Match = line.match(/^#\s+(.*)/);
            if (h1Match) {
                return (
                    <h1 key={`${keyOffset}-${idx}`} className="text-base font-black tracking-tight text-gradient-primary uppercase mt-4 mb-2 border-b border-white/5 pb-1">
                        {renderBoldText(h1Match[1])}
                    </h1>
                );
            }

            const h2Match = line.match(/^##\s+(.*)/);
            if (h2Match) {
                return (
                    <h2 key={`${keyOffset}-${idx}`} className="text-xs font-black tracking-wider text-violet-400 uppercase mt-3 mb-1.5 font-mono">
                        {renderBoldText(h2Match[1])}
                    </h2>
                );
            }

            const h3Match = line.match(/^###\s+(.*)/);
            if (h3Match) {
                return (
                    <h3 key={`${keyOffset}-${idx}`} className="text-[10px] font-black tracking-widest text-violet-300 mt-2.5 mb-1 uppercase font-mono">
                        {renderBoldText(h3Match[1])}
                    </h3>
                );
            }

            // 2. Numbered Lists (e.g. "1. Shot 1...")
            const numListMatch = line.match(/^(\d+)\.\s*(.*)/);
            if (numListMatch) {
                return (
                    <div key={`${keyOffset}-${idx}`} className="flex items-start gap-2 pl-2 my-1.5 leading-relaxed">
                        <span className="text-[9px] font-black font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 mt-0.5 select-none shrink-0">
                            {numListMatch[1]}
                        </span>
                        <span className="flex-1 text-white/80 text-xs md:text-sm">{renderBoldText(numListMatch[2])}</span>
                    </div>
                );
            }

            // 3. Bullet Lists
            const bulletMatch = line.match(/^([•\-*○])\s*(.*)/);
            if (bulletMatch) {
                const bulletChar = bulletMatch[1];
                return (
                    <div key={`${keyOffset}-${idx}`} className="flex items-start gap-2.5 pl-3 my-1 leading-relaxed">
                        <span className="text-violet-400 select-none mt-1.5 text-[8px] shrink-0">
                            {bulletChar === '○' ? '○' : '•'}
                        </span>
                        <span className="flex-1 text-white/80 text-xs md:text-sm">{renderBoldText(bulletMatch[2])}</span>
                    </div>
                );
            }

            // 4. Standard Paragraph
            return (
                <p key={`${keyOffset}-${idx}`} className="mb-2 text-white/85 text-xs md:text-sm leading-relaxed">
                    {renderBoldText(line)}
                </p>
            );
        });
    };

    const renderQuickReplies = () => {
        if (!isLast || isUser || !onSend || directorMode === 'auto') return null;

        const textLower = msg.content.toLowerCase();
        let options = [];

        if (textLower.includes("would you like me to proceed")) {
            options = ["Yes, please proceed", "No, let's change the setup"];
        } else if (textLower.includes("which hook would you like to choose") || textLower.includes("which hook")) {
            const hookMatches = [...msg.content.matchAll(/(?:Option|Hook)\s+([A-E1-5])/gi)];
            if (hookMatches.length > 0) {
                options = [...new Set(hookMatches.map(m => `Option ${m[1].toUpperCase()}`))];
            } else {
                options = ["Option 1", "Option 2", "Option 3", "Option 4", "Option 5"];
            }
            options.push("Generate new hooks");
        } else if (textLower.includes("which ending would you like to choose") || textLower.includes("which ending")) {
            const endMatches = [...msg.content.matchAll(/(?:Option|Ending)\s+([A-E1-5])/gi)];
            if (endMatches.length > 0) {
                options = [...new Set(endMatches.map(m => `Option ${m[1].toUpperCase()}`))];
            } else {
                options = ["Option 1", "Option 2", "Option 3", "Option 4"];
            }
            options.push("Generate new endings");
        } else if (textLower.includes("do you approve this storyboard")) {
            options = ["Yes, approve and generate prompts", "No, rewrite storyboard"];
        } else if (textLower.includes("?")) {
            options = ["Yes", "No", "Retry"];
        }

        if (options.length === 0) return null;

        return (
            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/[0.04]">
                {options.map((opt, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSend(opt)}
                        className="px-3 py-1.5 rounded-full bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-300 hover:text-violet-200 text-[10px] font-bold tracking-wide transition-all duration-200 shadow-sm"
                    >
                        {opt}
                    </button>
                ))}
            </div>
        );
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
                    {formatText(isUser ? msg.content.replace(/^\[Attached:[^\]]*\]\n?/, '') : msg.content)}
                </div>
                {msg.thinking && (
                    <button onClick={() => setShowRaw(!showRaw)} className="mt-2 flex items-center gap-1 text-[9px] text-white/20 hover:text-white/40 transition-colors">
                        <Brain className="w-2.5 h-2.5" />{showRaw ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}{showRaw ? 'Hide' : 'Show'} reasoning
                    </button>
                )}
                {showRaw && msg.thinking && <pre className="mt-2 text-[10px] text-white/20 whitespace-pre-wrap border-t border-white/5 pt-2">{msg.thinking}</pre>}
                <div className="mt-1.5 text-[9px] text-white/20 font-mono">{msg.ts}</div>
                {renderQuickReplies()}
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

    // AI Cinema Director states
    const [videoDuration, setVideoDuration] = useState('30 sec');
    const [platform, setPlatform] = useState('Instagram');
    const [videoGoal, setVideoGoal] = useState('Cinematic');
    const [directorMode, setDirectorMode] = useState('auto');
    const [scriptText, setScriptText] = useState('');
    const [isInitialized, setIsInitialized] = useState(false);

    // Sync isInitialized state on chat history load
    useEffect(() => {
        if (chatLoaded && messages.length > 1) {
            setIsInitialized(true);
        }
    }, [chatLoaded, messages.length]);

    const getApiKey = () => {
        if (userProfile?.role === 'admin' || userProfile?.email === 'premspaw@gmail.com') {
            return window.__ADMIN_GOOGLE_API_KEY__ || import.meta.env.VITE_ADMIN_GOOGLE_API_KEY || localStorage.getItem('GOOGLE_API_KEY') || window.aistudio?.apiKey || import.meta.env.VITE_GOOGLE_API_KEY || '';
        }
        return localStorage.getItem('GOOGLE_API_KEY') || window.aistudio?.apiKey || import.meta.env.VITE_GOOGLE_API_KEY || '';
    };

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

    const PROMPT_VERSION = '13';
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

    const handleInitialize = () => {
        setIsInitialized(true);
        
        const refCount = references.length;
        const refList = references.map((r, idx) => `Asset #${idx + 1} (${r.categoryLabel}): ${r.name}`).join(', ');
        
        const baseInitText = `[PROJECT SETUP]
- Video Duration: ${videoDuration}
- Platform: ${platform}
- Goal: ${videoGoal}
- Director Mode: ${directorMode === 'auto' ? 'Auto Director (Autonomous)' : 'Director Workshop (Interactive)'}
${scriptText.trim() ? `- Script: "${scriptText.trim()}"` : '- Script: None provided yet.'}
- Attached Assets: ${refCount > 0 ? refList : 'None'}

Please start the Creative Director session. Analyze my specifications and perform Credit Optimization for the ${videoDuration} duration.`;

        const modeInstructions = directorMode === 'auto' 
            ? `\nCRITICAL AUTO MODE INSTRUCTION: You are running in AUTO DIRECTOR mode. Do NOT pause and ask the user for choices. You must execute all turns (Turn 1 Setup, Turn 2 Hook Selection, Turn 3 Ending Selection, Turn 4 Storyboard, Turn 5 Final Prompt Generation) autonomously right now in this single response. Select the absolute best options automatically and only interrupt/ask the user if your confidence in the best hook is below 70%.`
            : `\nWORKSHOP MODE INSTRUCTION: You are running in DIRECTOR WORKSHOP mode. Follow your step-by-step conversational protocol. Provide the breakdown and ask: "Would you like me to proceed?" at the end of Turn 1.`;

        const initText = baseInitText + modeInstructions;

        handleSend(initText, true);
    };

    const handleSend = async (text = input.trim(), includeAllReferences = false) => {
        const hasRefs = includeAllReferences && references.length > 0;
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
            const attachments = includeAllReferences && references.length > 0 ? references.map(r => ({ name: r.name, type: r.type, data: r.data, category: r.categoryLabel })) : undefined;
            
            const headers = { 'Content-Type': 'application/json' };
            const adminKey = getApiKey();
            if (adminKey) headers['x-admin-trial-key'] = adminKey;

            const resp = await fetch(`${HERMES_API}/api/sessions/${hermesSessionId}/chat`, {
                method: 'POST', headers,
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
        setIsInitialized(false);
        setScriptText('');
        if (hermesSessionId) {
            const headers = { 'Content-Type': 'application/json' };
            const adminKey = getApiKey();
            if (adminKey) headers['x-admin-trial-key'] = adminKey;
            fetch(`${HERMES_API}/api/sessions/${hermesSessionId}/clear`, { method: 'POST', headers }).catch(() => {});
        }
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
                        {!isInitialized ? (
                                <ProjectSetupWizard
                                    videoDuration={videoDuration}
                                    setVideoDuration={setVideoDuration}
                                    platform={platform}
                                    setPlatform={setPlatform}
                                    videoGoal={videoGoal}
                                    setVideoGoal={setVideoGoal}
                                    scriptText={scriptText}
                                    setScriptText={setScriptText}
                                    directorMode={directorMode}
                                    setDirectorMode={setDirectorMode}
                                    references={references}
                                    handleRefUpload={handleRefUpload}
                                    handleRefRemove={handleRefRemove}
                                    setGalleryPickerCategory={setGalleryPickerCategory}
                                    onInitialize={handleInitialize}
                                    isSessionReady={sessionReady}
                                />
                        ) : (
                            <>
                                {/* Collapsed Spec Bar */}
                                <div className="glass-card rounded-2xl p-4 mb-6 flex items-center justify-between border border-white/[0.06] bg-[#0a0a14]/60 backdrop-blur-md shadow-xl animate-fade-in">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                                            <Film className="w-4 h-4 text-violet-400 animate-pulse" />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-white/50">Spec:</span>
                                            <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 text-[9px] font-bold border border-violet-500/20">{videoDuration}</span>
                                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold border border-blue-500/20">{platform}</span>
                                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold border border-emerald-500/20">{videoGoal}</span>
                                            <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold border", scriptText ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                                                {scriptText ? `Script (${scriptText.split(/\s+/).filter(Boolean).length} words)` : 'No Script'}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 text-[9px] font-bold border border-pink-500/20">{references.length} Assets</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsInitialized(false)} className="px-3.5 py-1.5 rounded-xl border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 text-white/50 hover:text-violet-300 text-[9px] font-bold transition-all uppercase tracking-wider">
                                        Edit Setup
                                    </button>
                                </div>

                                {/* Pipeline */}
                                {isThinking && <PipelineFlow activeStep={activePipelineStep} />}

                                {/* Progress */}
                                <GenerationProgress isThinking={isThinking} />

                                {/* Messages */}
                                <div className="space-y-4">
                                    {messages.map((msg, i) => {
                                        const defaultAspect = platform === 'Instagram' || platform === 'TikTok' ? '9:16' : '16:9';
                                        return (
                                            <MessageBubble 
                                                key={i} 
                                                msg={msg} 
                                                references={references} 
                                                userId={userId} 
                                                getApiKey={getApiKey} 
                                                defaultAspectRatio={defaultAspect} 
                                                directorMode={directorMode}
                                                isLast={i === messages.length - 1}
                                                onSend={handleSend}
                                            />
                                        );
                                    })}
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
                            </>
                        )}
                        
                        {isInitialized && directorMode === 'workshop' && !isThinking && messages.length > 0 && (
                            <div className="mt-6 flex justify-center animate-fade-in">
                                <button 
                                    onClick={() => handleSend("✨ Explore Creative Directions. Please brainstorm distinct paths (Cinematic, Emotional, Metaphorical, Luxury, Viral, Minimal, Fashion, Documentary) for this project with hooks and metaphors for each.")}
                                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:shadow-[0_0_30px_rgba(99,102,241,0.25)] hover:scale-105 hover:border-indigo-400/50 hover:text-indigo-200 transition-all duration-300 flex items-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4 text-indigo-400" />
                                    Explore Creative Directions
                                </button>
                            </div>
                        )}
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
                                <button onClick={() => setIsInitialized(false)} className="text-[8px] font-semibold text-violet-400/60 hover:text-violet-300 transition-colors uppercase tracking-wider ml-2">Edit</button>
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
                        <div className="flex-1 overflow-hidden min-h-0 flex flex-col p-6">
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
