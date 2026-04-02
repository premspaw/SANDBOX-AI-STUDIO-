import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
    Copy, Sparkles, Video, Aperture, Sun, Palette, Camera, Focus,
    Smartphone, Film, Upload, X, Image as ImageIcon, Type, Layers,
    ArrowRight, Edit, ImagePlus, MonitorPlay, Mic, Clock,
    ChevronDown, ChevronUp, ChevronRight, Settings, Zap, Maximize, Maximize2, Download, RefreshCw, Lock, FastForward, PenTool, Grid, LayoutGrid, Music,
    Users, Map, Package, Plus, Save, Square, Timer
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { AssetsLibrary } from './AssetsLibrary'
import { useAppStore } from '../../store'
import { getApiUrl, resolveUrl } from '../../config/apiConfig'
import { supabase } from '../../lib/supabase'
import CameraGuide from './CameraGuide'
import ImageEditorModal from '../common/ImageEditorModal'
import { useShorts } from '../../hooks/useShorts'
import { StoryboardView } from './StoryboardView'
import { MultiShotView } from './MultiShotView'
import { SHORTS_COST } from '../../config/shortsConfig'
import { refineNarrative, compressImageToMax1024 } from '../../services/geminiService'

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const CAMERA_ANGLES = [
    { id: 'extreme_wide', label: 'Extreme Wide', desc: 'Vast landscape', img: '/assets/angle_extreme_wide.jpeg' },
    { id: 'wide', label: 'Wide Shot', desc: 'Full scene', img: '/assets/angle_wide.jpeg' },
    { id: 'medium', label: 'Medium Shot', desc: 'Waist up', img: '/assets/angle_medium.png' },
    { id: 'cowboy', label: 'Cowboy Shot', desc: 'Mid-thigh up', img: '/assets/Cowboy_Shot.jpeg' },
    { id: 'closeup', label: 'Close Up', desc: 'Face details', img: '/assets/angle_closeup.jpeg' },
    { id: 'extreme_closeup', label: 'Extreme Close', desc: 'Eye/Detail', img: '/assets/angle_extreme_closeup.jpeg' },
    { id: 'low_angle', label: 'Low Angle', desc: 'Looking up', img: '/assets/angle_low.jpeg' },
    { id: 'high_angle', label: 'High Angle', desc: 'Looking down', img: '/assets/High_Angle.png' },
    { id: 'drone', label: 'Drone View', desc: 'Aerial', img: '/assets/Drone_view.jpeg' },
    { id: 'pov', label: 'POV', desc: 'First person', img: '/assets/angle_pov.jpeg' },
    { id: 'dutch', label: 'Dutch Angle', desc: 'Tilted', img: '/assets/Dutch_Angle.jpeg' },
    { id: 'ots', label: 'Over Shoulder', desc: 'Behind subject', img: '/assets/Over_Shoulder.jpeg' },
    { id: 'eagle_pov', label: 'Eagle POV', desc: 'Extreme top-down', img: '/assets/Eagle_POV.png' },
]

const CAMERA_MODELS = [
    {
        id: 'arri', label: 'ARRI Alexa 35', type: 'Cinema', icon: Film,
        desc: 'The Hollywood gold standard. High dynamic range, organic color.',
        soul: 'with organic color science and cinematic highlight roll-off',
        invalidAngles: [],
        lensMap: {
            'extreme_wide': { lenses: ['12mm', '14mm', '16mm'], default: '14mm' },
            'wide': { lenses: ['18mm', '21mm', '24mm'], default: '21mm' },
            'medium': { lenses: ['35mm', '40mm', '50mm'], default: '35mm' },
            'cowboy': { lenses: ['35mm', '50mm'], default: '50mm' },
            'closeup': { lenses: ['50mm', '85mm'], default: '85mm' },
            'extreme_closeup': { lenses: ['100mm', '135mm'], default: '100mm' },
            'low_angle': { lenses: ['14mm', '18mm', '35mm'], default: '18mm' },
            'high_angle': { lenses: ['18mm', '35mm', '50mm'], default: '35mm' },
            'drone': { lenses: ['12mm', '14mm'], default: '12mm' },
            'pov': { lenses: ['14mm', '18mm'], default: '18mm' },
            'dutch': { lenses: ['35mm', '50mm'], default: '35mm' },
            'ots': { lenses: ['35mm', '50mm', '85mm'], default: '50mm' },
            'eagle_pov': { lenses: ['12mm', '14mm'], default: '12mm' }
        }
    },
    {
        id: 'sony', label: 'Sony Venice 2', type: 'Cinema', icon: Video,
        desc: 'Full-frame digital cinema, dual base ISO. Clean & sharp.',
        soul: 'with full-frame clarity and rich shadow detail',
        invalidAngles: [],
        lensMap: {
            'extreme_wide': { lenses: ['16mm Anamorphic', '18mm'], default: '16mm Anamorphic' },
            'wide': { lenses: ['24mm', '28mm Anamorphic'], default: '24mm' },
            'medium': { lenses: ['40mm', '50mm Anamorphic'], default: '50mm Anamorphic' },
            'cowboy': { lenses: ['50mm', '75mm Anamorphic'], default: '75mm Anamorphic' },
            'closeup': { lenses: ['85mm', '100mm Anamorphic'], default: '85mm Anamorphic' },
            'extreme_closeup': { lenses: ['135mm', '180mm'], default: '135mm' },
            'low_angle': { lenses: ['16mm Anamorphic', '24mm'], default: '24mm' }, // Using wide defaults 
            'high_angle': { lenses: ['24mm', '50mm Anamorphic'], default: '50mm Anamorphic' },
            'drone': { lenses: ['16mm Anamorphic'], default: '16mm Anamorphic' },
            'pov': { lenses: ['24mm', '35mm'], default: '24mm' },
            'dutch': { lenses: ['50mm Anamorphic'], default: '50mm Anamorphic' },
            'ots': { lenses: ['50mm', '75mm Anamorphic'], default: '75mm Anamorphic' },
            'eagle_pov': { lenses: ['16mm Anamorphic', '18mm'], default: '16mm Anamorphic' }
        }
    },
    {
        id: 'red', label: 'RED V-Raptor', type: 'Cinema', icon: Video,
        desc: '8K Vista Vision. Ultra-high resolution and raw detail.',
        soul: 'with sharp, high-contrast 8K RAW detail',
        invalidAngles: [],
        lensMap: {
            'extreme_wide': { lenses: ['12mm', '15mm'], default: '12mm' },
            'wide': { lenses: ['18mm', '24mm'], default: '18mm' },
            'medium': { lenses: ['35mm', '50mm'], default: '50mm' },
            'cowboy': { lenses: ['50mm', '85mm'], default: '85mm' },
            'closeup': { lenses: ['85mm', '105mm'], default: '85mm' },
            'extreme_closeup': { lenses: ['105mm', '150mm Macro'], default: '150mm Macro' },
            'low_angle': { lenses: ['15mm', '24mm'], default: '24mm' },
            'high_angle': { lenses: ['24mm', '50mm'], default: '50mm' },
            'drone': { lenses: ['12mm', '14mm'], default: '12mm' },
            'pov': { lenses: ['18mm', '24mm'], default: '24mm' },
            'dutch': { lenses: ['35mm', '50mm'], default: '35mm' },
            'ots': { lenses: ['50mm', '85mm'], default: '85mm' },
            'eagle_pov': { lenses: ['12mm', '14mm', '15mm'], default: '12mm' }
        }
    },
    {
        id: 'imax', label: 'IMAX 70mm', type: 'Film', icon: Film,
        desc: 'Massive format film. Unparalleled depth and resolution.',
        soul: 'capturing the epic scale and immersive depth of a native 70mm IMAX frame',
        invalidAngles: ['drone', 'pov', 'dutch'], // "all others not recommended"
        lensMap: {
            'extreme_wide': { lenses: ['15mm IMAX', '18mm IMAX'], default: '15mm IMAX' },
            'wide': { lenses: ['18mm IMAX', '30mm IMAX'], default: '18mm IMAX' },
            'medium': { lenses: ['30mm IMAX'], default: '30mm IMAX' },
            'cowboy': { lenses: ['30mm IMAX', '65mm IMAX'], default: '65mm IMAX' },
            'closeup': { lenses: ['65mm IMAX'], default: '65mm IMAX' },
            'extreme_closeup': { lenses: ['65mm IMAX'], default: '65mm IMAX' },
            'low_angle': { lenses: ['18mm IMAX', '30mm IMAX'], default: '30mm IMAX' },
            'high_angle': { lenses: ['30mm IMAX'], default: '30mm IMAX' },
            'ots': { lenses: ['65mm IMAX'], default: '65mm IMAX' },
            'eagle_pov': { lenses: ['15mm IMAX', '18mm IMAX'], default: '15mm IMAX' }
        }
    },
    {
        id: 'iphone', label: 'iPhone 15 Pro', type: 'Mobile', icon: Smartphone,
        desc: 'Modern mobile look. Deep depth of field, digital sharpening.',
        soul: 'with vibrant HDR mobile-cinematography clarity',
        invalidAngles: [],
        lensMap: {
            'extreme_wide': { lenses: ['13mm Ultra Wide'], default: '13mm' },
            'wide': { lenses: ['24mm Main'], default: '24mm' },
            'medium': { lenses: ['24mm Main'], default: '24mm' },
            'cowboy': { lenses: ['24mm Main', '77mm Telephoto'], default: '77mm' },
            'closeup': { lenses: ['77mm Telephoto'], default: '77mm' },
            'extreme_closeup': { lenses: ['77mm Macro'], default: '77mm Macro' },
            'low_angle': { lenses: ['24mm Main'], default: '24mm' },
            'high_angle': { lenses: ['24mm Main'], default: '24mm' },
            'drone': { lenses: ['24mm Main'], default: '24mm' },
            'pov': { lenses: ['13mm Ultra Wide'], default: '13mm' },
            'dutch': { lenses: ['24mm Main'], default: '24mm' },
            'ots': { lenses: ['24mm Main'], default: '24mm Main' },
            'eagle_pov': { lenses: ['13mm Ultra Wide', '24mm Main'], default: '13mm Ultra Wide' }
        }
    },
    {
        id: 'gopro', label: 'GoPro Hero 12', type: 'Action', icon: Camera,
        desc: 'Action cam fisheye. High distortion, infinite focus.',
        soul: 'with a fisheye ultra-wide perspective and rugged outdoor clarity',
        invalidAngles: ['closeup', 'extreme_closeup'], // "Not recommended"
        lensMap: {
            'extreme_wide': { lenses: ['12mm SuperView'], default: '12mm SuperView' },
            'wide': { lenses: ['14mm Wide'], default: '14mm Wide' },
            'medium': { lenses: ['14mm Wide'], default: '14mm Wide' },
            'cowboy': { lenses: ['14mm Wide'], default: '14mm Wide' },
            'low_angle': { lenses: ['14mm Wide'], default: '14mm Wide' },
            'high_angle': { lenses: ['14mm Wide'], default: '14mm Wide' },
            'drone': { lenses: ['12mm SuperView'], default: '12mm SuperView' },
            'pov': { lenses: ['12mm SuperView'], default: '12mm' }, // Note 12mm
            'dutch': { lenses: ['14mm Wide'], default: '14mm Wide' },
            'ots': { lenses: ['14mm Wide'], default: '14mm Wide' },
            'eagle_pov': { lenses: ['12mm SuperView', '14mm Wide'], default: '12mm SuperView' }
        }
    },
    {
        id: 'vhs', label: 'Vintage Camcorder', type: 'Retro', icon: Video,
        desc: '1990s home video tape. Noisy, chromatic aberration.',
        soul: 'with lo-fi magnetic tape grain and nostalgic VHS chromatic aberration',
        invalidAngles: [],
        lensMap: {
            // Default generic fallback for all if not explicitly mapped.
            '*': { lenses: ['Auto Zoom'], default: 'Auto Zoom' }
        }
    },
    {
        id: 'dslr', label: 'Canon R5', type: 'Hybrid', icon: Camera,
        desc: 'Modern mirrorless photography/video hybrid.',
        soul: 'with clinical mirrorless sharpness and natural color reproduction',
        invalidAngles: [],
        lensMap: {
            '*': { lenses: ['24mm', '35mm', '50mm', '85mm', '70-200mm'], default: '50mm' }
        }
    },
    {
        id: 'blackmagic', label: 'Blackmagic 6K', type: 'Cinema', icon: Video,
        desc: 'Indie cinema workhorse. Raw, gritty, natural tonality.',
        soul: 'with a raw, indie-film grain and organic tonality',
        invalidAngles: [],
        lensMap: {
            'extreme_wide': { lenses: ['12mm', '16mm'], default: '16mm' },
            'wide': { lenses: ['18mm', '24mm'], default: '24mm' },
            'medium': { lenses: ['35mm', '50mm'], default: '35mm' },
            'cowboy': { lenses: ['50mm', '85mm'], default: '85mm' },
            'closeup': { lenses: ['50mm', '85mm'], default: '85mm' },
            'extreme_closeup': { lenses: ['100mm Macro'], default: '100mm Macro' },
            'low_angle': { lenses: ['24mm', '35mm'], default: '35mm' },
            'high_angle': { lenses: ['35mm', '50mm'], default: '50mm' },
            'drone': { lenses: ['12mm', '16mm'], default: '16mm' },
            'pov': { lenses: ['18mm', '24mm'], default: '24mm' },
            'dutch': { lenses: ['35mm'], default: '35mm' },
            'ots': { lenses: ['50mm', '85mm'], default: '85mm' },
            'eagle_pov': { lenses: ['12mm', '16mm'], default: '12mm' }
        }
    },
    {
        id: 'hasselblad', label: 'Hasselblad X2D', type: 'Photography', icon: Camera,
        desc: 'Medium format luxury. Incredible resolution and color depth.',
        soul: 'with medium-format micro-contrast and extraordinary color depth',
        invalidAngles: ['drone', 'pov'], // "Action not made for this"
        lensMap: {
            'extreme_wide': { lenses: ['21mm XCD'], default: '21mm' },
            'wide': { lenses: ['30mm XCD'], default: '30mm' },
            'medium': { lenses: ['45mm XCD'], default: '45mm' },
            'cowboy': { lenses: ['45mm XCD', '90mm XCD'], default: '90mm' },
            'closeup': { lenses: ['90mm XCD'], default: '90mm' },
            'extreme_closeup': { lenses: ['120mm Macro XCD'], default: '120mm Macro' },
            'low_angle': { lenses: ['30mm XCD', '45mm XCD'], default: '45mm' },
            'high_angle': { lenses: ['45mm XCD', '90mm XCD'], default: '45mm' },
            'dutch': { lenses: ['45mm XCD'], default: '45mm' },
            'ots': { lenses: ['90mm XCD'], default: '90mm' },
            'eagle_pov': { lenses: ['21mm XCD', '30mm XCD'], default: '21mm XCD' }
        }
    },
    {
        id: 'fujifilm', label: 'Fujifilm X-T5', type: 'Photography', icon: Camera,
        desc: 'Retro-inspired mirrorless. Famous for film simulations.',
        soul: 'with authentic film-simulation color science and classic analog warmth',
        invalidAngles: [],
        lensMap: {
            '*': { lenses: ['18mm', '23mm', '35mm', '56mm'], default: '35mm' }
        }
    },
    {
        id: 'disposable', label: 'Disposable Camera', type: 'Retro', icon: Camera,
        desc: 'Plastic lens, high noise, nostalgic flash look.',
        soul: 'with a raw, nostalgic flash aesthetic and characteristic plastic lens distortion',
        invalidAngles: ['drone', 'ots', 'eagle_pov'],
        lensMap: {
            '*': { lenses: ['Fixed 32px'], default: 'Fixed 32mm' }
        }
    }
]

const LIGHTING_STYLES = [
    {
        id: 'none', label: 'Default',
        narrative: 'natural, balanced lighting'
    },
    {
        id: 'cinematic', label: 'Cinematic',
        narrative: 'professional 3-point lighting with deep, atmospheric shadows'
    },
    {
        id: 'natural', label: 'Natural Daylight',
        narrative: 'soft, diffused overcast light with gentle, realistic shadows'
    },
    {
        id: 'neon', label: 'Neon Cyberpunk',
        narrative: 'high-contrast pink and cyan neon glows with cinematic reflections'
    },
    {
        id: 'golden', label: 'Golden Hour',
        narrative: 'warm, long-shadowed amber glow of a setting sun'
    },
    {
        id: 'studio', label: 'Studio Pro',
        narrative: 'clean, controlled softbox lighting for absolute clarity'
    },
    {
        id: 'chiaroscuro', label: 'Chiaroscuro',
        narrative: 'dramatic Chiaroscuro with harsh high-contrast shadows'
    },
]

const ART_STYLES = [
    {
        id: 'none', label: 'None (Neutral)',
        narrative: 'natural photography',
        quality: 'clean textures, natural materials'
    },
    {
        id: 'realistic', label: 'Hyper Realistic',
        narrative: 'photorealistic',
        quality: '8K photographic fidelity, micro-textured surfaces'
    },
    {
        id: 'anime', label: 'Celestial Anime',
        narrative: 'high-end Japanese anime style',
        quality: 'clean line-art, vibrant cel-shading, Ghibli-level polish'
    },
    {
        id: 'hyper_realistic', label: 'Film Stills',
        narrative: 'masterful cinematic style',
        quality: 'flawless technical resolution, professional color grade'
    },
    {
        id: '3d', label: '3D CGI Render',
        narrative: 'octane-rendered 3D scene',
        quality: 'global illumination, industry-standard CGI finish'
    },
    {
        id: 'vintage', label: 'Vintage 35mm',
        narrative: 'analog 35mm film',
        quality: 'authentic film grain, soft lens halation'
    },
    {
        id: 'cyberpunk', label: 'Cyberpunk Noir',
        narrative: 'gritty cyberpunk aesthetic',
        quality: 'ray-traced reflections, high-tech textures'
    },
    {
        id: 'oil_painting', label: 'Old Master Oil',
        narrative: 'classical oil painting',
        quality: 'visible impasto strokes, rich pigment depth'
    },
    {
        id: 'architecture', label: 'ArchViz Brutalist',
        narrative: 'architectural visualization',
        quality: 'structural precision, realistic concrete textures'
    },
    {
        id: 'product', label: 'Product Hero',
        narrative: 'commercial studio photography',
        quality: 'perfect surface reflections, macro-detail sharpness'
    }
]

const COMPOSITION_OPTIONS = [
    { id: 'none', label: 'None (AI Balance)', desc: 'Let the AI decide framing' },
    { id: 'rule_of_thirds', label: 'Rule of Thirds', desc: 'Subject on grid lines' },
    { id: 'symmetry', label: 'Symmetry', desc: 'Perfect center balance' },
    { id: 'leading_lines', label: 'Leading Lines', desc: 'Lines guide eye to subject' },
    { id: 'golden_ratio', label: 'Golden Ratio', desc: 'Spiral draws to subject' },
    { id: 'frame_in_frame', label: 'Frame in Frame', desc: 'Window/door frames subject' },
    { id: 'negative_space', label: 'Negative Space', desc: 'Empty space dominates' },
    { id: 'diagonal', label: 'Diagonal', desc: 'Subject on diagonal axis' },
    { id: 'foreground_depth', label: 'Foreground Depth', desc: 'Object close + subject far' },
    { id: 'two_point', label: 'Two-Point', desc: 'Two subjects balance frame' },
    { id: 'centered', label: 'Centered', desc: 'Subject dead center' }
]

const COMPOSITION_PROMPTS = {
    "rule_of_thirds": "subject positioned at left third intersection, rule of thirds composition",
    "symmetry": "perfect bilateral symmetry, subject centered, mirrored environment",
    "leading_lines": "strong leading lines converging toward subject, architectural lines",
    "golden_ratio": "golden spiral composition, subject at phi point",
    "frame_in_frame": "subject framed within environmental frame, doorway/arch/window",
    "negative_space": "dramatic negative space, subject occupies 20% of frame",
    "diagonal": "strong diagonal composition, subject on diagonal axis",
    "foreground_depth": "foreground element in extreme close, subject in mid-ground, deep focus",
    "two_point": "two subjects at opposite third points, balanced frame",
    "centered": "subject perfectly centered, symmetrical framing"
}

const ASPECT_RATIOS = [
    { id: '16:9', label: '16:9' },
    { id: '9:16', label: '9:16' },
    { id: '1:1', label: '1:1' },
    { id: '4:3', label: '4:3' },
    { id: '3:4', label: '3:4' },
    { id: '3:2', label: '3:2' },
    { id: '2:3', label: '2:3' },
    { id: '4:5', label: '4:5' },
    { id: '5:4', label: '5:4' },
    { id: '21:9', label: '21:9' },
    { id: '1:4', label: '1:4' },
    { id: '4:1', label: '4:1' },
    { id: '1:8', label: '1:8' },
    { id: '8:1', label: '8:1' },
]

// Maps angle IDs → narrative shot type phrases for Gemini
const ANGLE_NARRATIVES = {
    extreme_wide: 'revealing a vast, sprawling landscape where the environment is the focal point',
    wide: 'showing the full scene',
    medium: 'framed to show a natural interaction with the immediate setting',
    cowboy: 'framed with a heroic, confident posture that emphasizes personal gear and surroundings',
    closeup: 'tightly focused to reveal every subtle texture and intimate detail',
    extreme_closeup: 'an intense, microscopic view into a single focal point, filling the frame',
    low_angle: 'looking up from a powerful ground-level perspective',
    high_angle: 'looking down from an elevated position to provide a grand overview',
    drone: 'a majestic aerial bird\'s-eye view from high above',
    pov: 'looking directly through the subject\'s eyes in a first-person immersion',
    dutch: 'with a tilted horizon to create a sense of unease and psychological tension',
    ots: 'looking over the shoulder of a secondary observer toward the focus',
    eagle_pov: 'a direct top-down bird\'s-eye view, emphasizing the layout from above',
}

// Maps mood/atmosphere based on lighting + style combo
const MOOD_MAP = {
    'none_none': 'balanced and neutral',
    'none_realistic': 'natural, balanced lighting, creating an authentic and true-to-life atmosphere',
    'none_anime': 'clean and vibrant',
    'none_3d': 'pristine and well-defined',
    'none_vintage': 'nostalgic and soft',
    'none_cyberpunk': 'gritty and urban',
    'none_oil_painting': 'artistic and expressive',
    'none_architecture': 'structured and clean',
    'none_product': 'focused and commercial',
    'cinematic_realistic': 'brooding, tense, and cinematic',
    'cinematic_anime': 'dramatic and emotionally charged',
    'cinematic_3d': 'epic and otherworldly',
    'cinematic_vintage': 'dark, nostalgic, and melancholic',
    'cinematic_cyberpunk': 'neon-drenched and dystopian',
    'cinematic_oil_painting': 'dramatic and masterfully painted',
    'cinematic_architecture': 'monumental and shadow-defined',
    'cinematic_product': 'heroic and luxuriously lit',
    'natural_realistic': 'serene, honest, and grounded',
    'natural_anime': 'gentle, warm, and slice-of-life',
    'natural_3d': 'bright, optimistic, and lush',
    'natural_vintage': 'soft, hazy, and warmly nostalgic',
    'natural_cyberpunk': 'worn, overcast, and rain-slicked',
    'natural_oil_painting': 'soft, impressionistic, and naturalistic',
    'natural_architecture': 'bright, airy, and sun-lit',
    'natural_product': 'organic, clean, and lifestyle-oriented',
    'neon_realistic': 'electric, dystopian, and hypnotic',
    'neon_anime': 'hyper-stylized and futuristic',
    'neon_3d': 'vibrant, glossy, and synthwave',
    'neon_vintage': 'retro-futuristic and otherworldly',
    'neon_cyberpunk': 'vibrant, high-tech, and neon-saturated',
    'neon_oil_painting': 'vivid, high-contrast, and surreal',
    'neon_architecture': 'night-time, neon-traced, and modern',
    'neon_product': 'electric, colorful, and energetic',
    'golden_realistic': 'warm, romantic, and beautifully captured',
    'golden_anime': 'dreamy, emotional, and golden-hour tender',
    'golden_3d': 'magical, radiant, and optimistic',
    'golden_vintage': 'deeply nostalgic and warmly cinematic',
    'golden_cyberpunk': 'amber-hued, dusty, and post-apocalyptic',
    'golden_oil_painting': 'luminous, tonal, and richly golden',
    'golden_architecture': 'glimmering, warm, and elegantly lit',
    'golden_product': 'warm, inviting, and premium',
    'studio_realistic': 'clean, authoritative, and precise',
    'studio_anime': 'crisp, polished, and professional',
    'studio_3d': 'pristine, commercial, and highly crafted',
    'studio_vintage': 'retro-studio glamour with analog warmth',
    'studio_cyberpunk': 'industrial, harsh, and tech-focused',
    'studio_oil_painting': 'stark, textured, and portrait-like',
    'studio_architecture': 'clinical, perfect, and abstract',
    'studio_product': 'flawless, high-end, and commercial',
}

// f-stop narrative phrases
const FSTOP_NARRATIVES = {
    '1.4': 'with a wide f/1.4 aperture, creating a dreamy, blurred background (bokeh) that isolates the subject perfectly',
    '2.8': 'with a wide f/2.8 aperture, creating a creamy, blurred background (bokeh) that isolates the subject perfectly',
    '5.6': 'with an f/5.6 aperture, balancing sharp subject detail against a naturally softened environment',
    '8.0': 'with a deep depth of field (f/8.0), ensuring every detail from foreground to background is in sharp focus',
    '16': 'with a deep depth of field (f/11), ensuring every detail from foreground to background is in sharp focus',
}

const REF_CATEGORIES = [
    { id: 'characters', label: 'Characters', desc: 'Multiple Allowed', icon: Users, color: 'text-blue-400' },
    { id: 'locations', label: 'Location', desc: 'One Location', icon: Map, color: 'text-green-400' },
    { id: 'wardrobes', label: 'Wardrobe', desc: 'One Wardrobe Ref', icon: Package, color: 'text-orange-400' },
    { id: 'props', label: 'Props', desc: 'Multiple Props', icon: Plus, color: 'text-yellow-400' },
    { id: 'moods', label: 'Mood/Style', desc: 'One Mood Ref', icon: Sparkles, color: 'text-purple-400' }
]

const PRO_LIGHTING_TRANSFORMS = [
    { id: 'none', label: 'No Transform', category: 'Basic' },
    { id: 'cinematic', label: 'Cinematic', category: 'Basic' },
    
    // Natural
    { id: 'morning_sun', label: 'Morning Sun', category: 'Natural', narrative: 'soft morning sunlight streaming through a window.' },
    { id: 'overcast', label: 'Overcast', category: 'Natural', narrative: 'diffused overcast daylight with soft, even shadows.' },
    { id: 'moonlight', label: 'Moonlight', category: 'Natural', narrative: 'pale, ethereal moonlight casting soft silvery glows and deep shadows.' },
    
    // Artificial
    { id: 'fireplace', label: 'Fireplace', category: 'Artificial', narrative: 'warm, flickering glow from a fireplace casting orange highlights.' },
    { id: 'candlelight', label: 'Candlelight', category: 'Artificial', narrative: 'intimate, flickering candlelight with warm, dancing shadows.' },
    { id: 'fluorescent', label: 'Fluorescent', category: 'Artificial', narrative: 'harsh, cold fluorescent office lighting with clinical clarity.' },
    { id: 'neon_pulsating', label: 'Neon Pulsating', category: 'Artificial', narrative: 'vibrant, pulsating neon sign lighting in electric colors.' },
    
    // Cinematic
    { id: 'rembrandt', label: 'Rembrandt', category: 'Cinematic', narrative: 'classic Rembrandt lighting with a small triangle of light on the cheek.' },
    { id: 'film_noir', label: 'Film Noir', category: 'Cinematic', narrative: 'film noir aesthetic with deep, high-contrast shadows and stark highlights.' },
    { id: 'high_key', label: 'High-Key', category: 'Cinematic', narrative: 'bright, cheerful high-key lighting for an upbeat, optimistic mood.' },
    { id: 'low_key', label: 'Low-Key', category: 'Cinematic', narrative: 'dark, mysterious low-key lighting with moody shadows.' },
    
    // Specific Effects
    { id: 'volumetric', label: 'Volumetric', category: 'Effects', narrative: 'volumetric lighting creating visible, atmospheric light rays.' },
    { id: 'silhouette', label: 'Silhouette', category: 'Effects', narrative: 'backlit lighting to create a sharp, dramatic silhouette.' },
    { id: 'golden_hour', label: 'Golden Hour', category: 'Effects', narrative: 'warm, rich golden hour glow with long, soft shadows.' },
    { id: 'side_lighting', label: 'Side Light', category: 'Effects', narrative: 'dramatic side lighting that emphasizes texture and form.' },
    
    // Transforms
    { id: 'day_to_night', label: 'Day ➔ Night', category: 'Transforms', narrative: 'Transform this daytime scene into a deep nighttime environment with moonlight or artificial urban lighting.' },
    { id: 'night_to_day', label: 'Night ➔ Day', category: 'Transforms', narrative: 'Transform this nighttime scene into a bright, sunlit daytime environment.' },
    { id: 'sunrise', label: 'Cold Sunrise', category: 'Transforms', narrative: 'Apply a cold, blue-hour sunrise light with high-contrast morning shadows.' },
    { id: 'sunset', label: 'Deep Sunset', category: 'Transforms', narrative: 'Apply a rich, fiery sunset palette with long silhouettes and glowing highlights.' },
]

const PRO_FOCUS_CONTROLS = [
    { id: 'none', label: 'Standard Focus' },
    { id: 'subject', label: 'Focus on Subject', narrative: 'Ensure the main subject is perfectly sharp, blurring all other layers.' },
    { id: 'background', label: 'Focus on Background', narrative: 'Shift focus to the distant background, blurring the foreground elements.' },
    { id: 'foreground', label: 'Focus on Foreground', narrative: 'Prioritize sharpness in the immediate foreground elements.' },
]

// AI MODEL CONFIGURATION
const AI_MODELS = [
    {
        id: 'nano-banana', name: 'Nano Banana', provider: 'Google', type: 'image',
        description: 'Gemini 3.1 Flash Image — blazing fast native generation',
        credits: 1, available: true, icon: Zap,
        modelId: 'gemini-3.1-flash-image-preview'
    },
    {
        id: 'nano-banana-2', name: 'Nano Banana 2', provider: 'Google', type: 'image',
        description: 'Gemini 3.1 Flash Image — high quality refinement',
        credits: 2, available: true, icon: Sparkles,
        modelId: 'gemini-3.1-flash-image-preview'
    },
    {
        id: 'nano-banana-pro', name: 'Nano Banana Pro', provider: 'Google', type: 'image',
        description: 'Gemini 3 Pro Image — elite resolution & detail',
        credits: 5, available: true, icon: Sparkles,
        modelId: 'gemini-3-pro-image-preview'
    },
    {
        id: 'veo', name: 'Google Veo 3.1', provider: 'Google', type: 'video',
        description: 'Native 2K High-Definition video generation (Preview)',
        credits: 5, available: true, icon: Video,
        modelId: 'veo-3.1-generate-preview'
    },
    {
        id: 'veo-fast', name: 'Google Veo 3.1 Fast', provider: 'Google', type: 'video',
        description: 'Faster video generation without audio (Preview)',
        credits: 3, available: true, icon: FastForward,
        modelId: 'veo-3.1-fast-generate-preview'
    },
    {
        id: 'kling-2.6', name: 'Kling 2.6', provider: 'Kling', type: 'video',
        description: 'V2.6 High-Performance Video Model',
        credits: 8, available: true, icon: Zap,
        modelId: 'kling-2.6/image-to-video'
    },
    {
        id: 'kling', name: 'Kling 3.0', provider: 'Kling', type: 'video',
        description: 'V3.0 Ultra-High Fidelity Model',
        credits: 10, available: true, icon: Sparkles,
        modelId: 'kling-3.0/video'
    },
    {
        id: 'runway', name: 'Runway Gen-3', provider: 'Runway', type: 'video',
        description: 'Creative video generation tools (Coming Soon)',
        credits: 4, available: false, icon: Film
    },
    {
        id: 'pika', name: 'Pika Labs', provider: 'Pika', type: 'video',
        description: 'Text and image to video transformation (Coming Soon)',
        credits: 3, available: false, icon: MonitorPlay
    }
]

const CAMERA_MOVEMENT = [
    { id: 'static', label: 'Static Shot', desc: 'No camera movement' },
    { id: 'pan_left', label: 'Pan Left', desc: 'Camera rotates to the left' },
    { id: 'pan_right', label: 'Pan Right', desc: 'Camera rotates to the right' },
    { id: 'dolly_in', label: 'Dolly In', desc: 'Camera moves toward subject' },
    { id: 'dolly_out', label: 'Dolly Out', desc: 'Camera moves away from subject' },
    { id: 'arc_left', label: '180° Arc Left', desc: 'The camera performs a smooth 180-degree arc shot to the left' },
    { id: 'arc_right', label: '180° Arc Right', desc: 'The camera performs a smooth 180-degree arc shot to the right' },
    { id: 'tilt_up', label: 'Tilt Up', desc: 'Camera rotates upwards' },
    { id: 'tilt_down', label: 'Tilt Down', desc: 'Camera rotates downwards' },
    { id: 'handheld', label: 'Handheld', desc: 'Organic, subtle shake' },
    { id: 'drone_rise', label: 'Drone Rise', desc: 'Camera ascends vertically' },
    { id: 'drone_fall', label: 'Drone Fall', desc: 'Camera descends vertically' }
]

const SPEED_RAMP_CURVES = {
    "Linear (Standard)": [[0, 50], [50, 50], [100, 50]],
    "Impact": [[0, 60], [20, 10], [40, 10], [70, 50], [100, 60]],
    "Cinematic": [[0, 50], [50, 50], [100, 50]],
    "Ramp In": [[0, 60], [40, 60], [80, 20], [100, 10]],
    "Ramp Out": [[0, 10], [20, 20], [60, 60], [100, 60]],
    "Snap": [[0, 60], [10, 10], [40, 10], [60, 60], [80, 10], [100, 10]],
    "Viral": [[0, 10], [30, 60], [50, 10], [70, 60], [100, 10]],
};

const VIDEO_CONTROLS = [
    {
        key: "cameraMovement", label: "MOVEMENT",
        options: CAMERA_MOVEMENT.map(m => m.label),
        default: "Static Shot"
    },
    {
        key: "speedRamp", label: "SPEED RAMP",
        options: ["Linear (Standard)", "Impact", "Cinematic", "Ramp In", "Ramp Out", "Snap", "Viral"],
        default: "Linear (Standard)"
    },
    {
        key: "emotion", label: "TONE",
        options: [
            "Neutral",
            "Happy / Joyful",
            "Sad / Melancholy",
            "Suspenseful / Tense",
            "Peaceful / Serene",
            "Epic / Grandiose",
            "Futuristic / Sci-Fi",
            "Vintage / Retro",
            "Romantic",
            "Horror"
        ],
        default: "Neutral"
    },
    {
        key: "dialogue", label: "DIALOGUE",
        options: ["Off", "Character 1", "Character 2", "Both", "Voiceover", "Ambient Only"],
        default: "Off"
    },
    {
        key: "duration", label: "DURATION",
        options: ["4 Seconds", "6 Seconds", "8 Seconds"],
        default: "4 Seconds"
    },
    {
        key: "resolution", label: "RESOLUTION",
        options: ["720p", "1080p", "2K"],
        default: "1080p"
    },
    {
        key: "lens", label: "LENS",
        options: [
            "Default",
            "Wide-Angle Lens",
            "Telephoto Lens",
            "Shallow Depth of Field",
            "Deep Depth of Field",
            "Lens Flare",
            "Rack Focus",
            "Fisheye Lens",
            "Vertigo Effect"
        ],
        default: "Default"
    },
    {
        key: "aspectRatio", label: "RATIO",
        options: ["16:9", "9:16", "1:1", "4:5"],
        default: "16:9"
    },
    {
        key: "pacing", label: "PACING",
        options: ["None", "slow-motion", "fast-paced action", "time-lapse"],
        default: "None"
    },
    {
        key: "artisticStyle", label: "ART STYLE",
        options: [
            "Photorealistic",
            "Cinematic Film",
            "Japanese Anime",
            "Classic Disney Animation",
            "Pixar 3D Animation",
            "Claymation",
            "Stop-Motion",
            "Cel-Shaded Animation",
            "Van Gogh Style",
            "Surrealist Painting",
            "Impressionistic",
            "Art Deco",
            "Bauhaus Aesthetic",
            "Graphic Novel",
            "Watercolor Painting",
            "Charcoal Sketch",
            "Blueprint Schematic"
        ],
        default: "Photorealistic"
    },
    {
        key: "audio", label: "AUDIO",
        options: ["On", "Off"],
        default: "On",
        toggle: true
    },
]

const LENS_FOCUS = [
    { id: 'shallow_dof', label: 'Shallow Depth of Field', desc: 'Blurred background, subject sharp' },
    { id: 'deep_focus', label: 'Deep Focus', desc: 'Everything in sharp focus' },
    { id: 'soft_focus', label: 'Soft Focus', desc: 'Dreamy, diffused look' },
    { id: 'rack_focus', label: 'Rack Focus', desc: 'Focus shifts during shot' },
    { id: 'wide_angle', label: 'Wide-Angle Lens', desc: 'Expansive, slight distortion' },
    { id: 'telephoto', label: 'Telephoto Lens', desc: 'Compressed perspective' },
    { id: 'macro', label: 'Macro Lens', desc: 'Extreme close detail' },
    { id: 'anamorphic', label: 'Anamorphic', desc: 'Cinematic lens flares, wide format' }
]

const REFERENCE_USAGE = [
    { id: 'first_frame', label: 'First Frame', desc: 'Video starts from this image' },
    { id: 'last_frame', label: 'Last Frame', desc: 'Video ends at this image' },
    { id: 'style', label: 'Style Reference', desc: 'Maintain visual style/aesthetic' },
    { id: 'subject', label: 'Subject/Character', desc: 'Keep subject consistent' }
]

const EMOTION_OPTIONS = [
    { id: 'neutral', label: 'Neutral', desc: 'Balanced expression' },
    { id: 'happy', label: 'Happy', desc: 'Joyful, smiling' },
    { id: 'sad', label: 'Sad', desc: 'Melancholic, somber' },
    { id: 'angry', label: 'Angry', desc: 'Intense, aggressive' },
    { id: 'surprised', label: 'Surprised', desc: 'Shocked, wide-eyed' },
    { id: 'fearful', label: 'Fearful', desc: 'Scared, anxious' },
    { id: 'disgusted', label: 'Disgusted', desc: 'Repulsed expression' },
    { id: 'stoic', label: 'Stoic', desc: 'Unemotional, firm' },
    { id: 'ethereal', label: 'Ethereal', desc: 'Dreamy, otherworldly gaze' }
]

const SPEED_RAMP_OPTIONS = [
    { id: 'none', label: 'Normal (1x)', desc: 'Standard playback' },
    { id: 'slow_mo', label: 'Slow Motion', desc: 'Cinematic slow-down' },
    { id: 'fast_mo', label: 'Fast Motion', desc: 'Time-compressed' },
    { id: 'ramp_in', label: 'Ramp In', desc: 'Slow start → Fast finish' },
    { id: 'ramp_out', label: 'Ramp Out', desc: 'Fast start → Slow finish' },
    { id: 'freeze_frame', label: 'Freeze Frame', desc: 'Momentary pause' }
]

// ─────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────

/**
 * Nano Banana PRO (Gemini 3 Pro Image) prompt builder.
 * Follows the "Prompt like a Creative Director" guidelines:
 * - Start with a strong verb.
 * - Describe the scene naturally, replacing keywords with narrative direction.
 */
const buildNanoBananaProPrompt = (selections, getFStop) => {
    const cam = CAMERA_MODELS.find(c => c.id === selections.camera) || CAMERA_MODELS[0]
    const lighting = LIGHTING_STYLES.find(l => l.id === selections.lighting)
    const artStyle = ART_STYLES.find(s => s.id === selections.style)
    const angle = CAMERA_ANGLES.find(a => a.id === selections.angle) || CAMERA_ANGLES[2]
    const spatialDirective = ANGLE_NARRATIVES[selections.angle] || 'showing the subject in a natural setting'

    // Aperture & Physics
    const apertureLabel = typeof getFStop === 'function' ? getFStop(selections.aperture) : 'Auto Aperture'

    const store = useAppStore.getState()
    const activeChar = store.activeCharacter
    const charDesc = activeChar?.metadata?.imageAnalysis?.description || activeChar?.personality || ''

    let subject = selections.subject?.trim() || 'the subject'
    if (activeChar && (subject.toLowerCase() === activeChar.name.toLowerCase() || subject === 'the subject')) {
        subject = charDesc || subject
    }

    const compPrompt = COMPOSITION_PROMPTS[selections.composition] || 'balanced visual symmetry'
    const isStyleNone = selections.style === 'none'
    const stylePrefix = isStyleNone ? '' : `${artStyle?.label || 'Photorealistic'} `

    // Format angle directly to lowercase for sentence insertion
    const angleStr = angle.label.toLowerCase()

    const lightingLabel = selections.lighting === 'none' ? 'natural, balanced lighting' : (lighting?.narrative || lighting?.label || 'cinematic lighting')

    // Pro Enhancements
    const focusCtrl = PRO_FOCUS_CONTROLS.find(f => f.id === selections.focusPoint)
    let proNotes = []
    if (focusCtrl && focusCtrl.id !== 'none') proNotes.push(focusCtrl.narrative)
    if (selections.searchGrounding) proNotes.push('Use real-world accuracy and current information from Google Search.')
    const proNarrative = proNotes.length > 0 ? ` Additional directives: ${proNotes.join(' ')}` : ''

    // Assembly using explicit "Creative Director" narrative flow
    const line1 = `${stylePrefix}${angle.label}, ${spatialDirective} of ${subject}.`
    const line2 = `Captured on ${cam.label} ${cam.soul ? cam.soul + ',' : ''} using a ${selections.focalLength}mm lens at ${apertureLabel} to dictate depth and perspective.`
    const line3 = `The lighting is ${lightingLabel}, ${compPrompt}.`
    const qualityTag = isStyleNone ? '' : ` Rendered in a ${artStyle?.quality || 'high-quality'} style.`
    const ratio = `--ar ${selections.aspectRatio}`

    return `${line1} ${line2} ${line3}${qualityTag}${proNarrative} ${ratio}`.replace(/  +/g, ' ').trim()
}

/**
 * Nano Banana (Gemini 3.1 Flash Image) optimized prompt builder.
 * Follows a descriptive, narrative paragraph format for maximum coherence.
 *
 * Assembly Order:
 * 1. Framing/Perspective
 * 2. Subject + Action/Scene
 * 3. Camera + Lens + Aperture
 * 4. Lighting
 * 5. Quality & Technicals
 */
const buildNanoBananaPrompt = (selections, getFStop) => {
    const cam = CAMERA_MODELS.find(c => c.id === selections.camera) || CAMERA_MODELS[0]
    const lighting = LIGHTING_STYLES.find(l => l.id === selections.lighting)
    const artStyle = ART_STYLES.find(s => s.id === selections.style)
    const angle = CAMERA_ANGLES.find(a => a.id === selections.angle) || CAMERA_ANGLES[2]
    const spatialDirective = ANGLE_NARRATIVES[selections.angle] || 'showing the subject in a natural setting'

    // Lens Physics & Perspective Mapping
    const fl = selections.focalLength
    let lensDesc
    if (fl <= 16) lensDesc = `${fl}mm ultra-wide angle lens that exaggerates distance for an expansive sense of space`
    else if (fl <= 24) lensDesc = `${fl}mm wide-angle lens that establishes the environment`
    else if (fl <= 50) lensDesc = `${fl}mm prime lens for a natural, undistorted perspective`
    else if (fl <= 100) lensDesc = `${fl}mm telephoto lens that compresses the background`
    else lensDesc = `${fl}mm telephoto lens that heavily compresses the background to isolate the subject`

    // Aperture & Focus Narrative
    const apertureLabel = typeof getFStop === 'function' ? getFStop(selections.aperture) : 'Auto Aperture'







    const store = useAppStore.getState()
    const activeChar = store.activeCharacter
    const charDesc = activeChar?.metadata?.imageAnalysis?.description || activeChar?.personality || ''

    let subject = selections.subject?.trim() || 'the subject'
    if (activeChar && (subject.toLowerCase() === activeChar.name.toLowerCase() || subject === 'the subject')) {
        subject = charDesc || subject
    }

    const compPrompt = COMPOSITION_PROMPTS[selections.composition]
    const isStyleNone = selections.style === 'none'
    const stylePrefix = isStyleNone ? '' : `${artStyle?.label || 'Photorealistic'} `

    // Opening Style Injection
    let perspectiveBlock = angle.label
    if (!isStyleNone) {
        const styleLabel = artStyle?.label || 'photorealistic'
        if (perspectiveBlock.startsWith('A ')) perspectiveBlock = perspectiveBlock.replace('A ', `A ${styleLabel} `)
        else if (perspectiveBlock.startsWith('An ')) perspectiveBlock = perspectiveBlock.replace('An ', `An ${styleLabel} `)
        else perspectiveBlock = `${styleLabel} ${perspectiveBlock}`
    }

    // Pro Features
    const focusCtrl = PRO_FOCUS_CONTROLS.find(f => f.id === selections.focusPoint)
    let proNotes = []
    if (focusCtrl && focusCtrl.id !== 'none') proNotes.push(focusCtrl.narrative)
    if (selections.searchGrounding) proNotes.push("Augment with accurate real-world knowledge from Google Search.")
    const proNarrative = proNotes.length > 0 ? ` ${proNotes.join(' ')}` : ''

    // Environment & Lighting
    let envDesc = 'set in a meticulously detailed environment'
    if (selections.style === 'cyberpunk') envDesc = 'set in a high-tech, rain-slicked futuristic cityscape with wet, reflective streets'
    else if (selections.style === 'oil_painting') envDesc = 'set in a richly textured canvas with visible impasto strokes'
    else if (selections.style === 'architecture') envDesc = 'set in a geometrically perfect architectural setting'
    else if (selections.style === 'product') envDesc = 'set in a minimalist, commercial-grade studio environment'
    else if (selections.style === 'anime') envDesc = 'set in a painterly, stylized anime background'

    const lightingLabel = selections.lighting === 'none' ? 'Natural and balanced' : (lighting?.label || 'Cinematic')

    // Assembly
    const line1 = `${stylePrefix}${angle.label}, ${spatialDirective} of ${subject}.`
    const line2 = `Captured on ${cam.label} ${cam.soul ? cam.soul + ',' : ''} ${lensDesc} at ${apertureLabel}.`
    const line3 = `The lighting is ${lightingLabel}${compPrompt ? ', ' + compPrompt : ''}.`
    const qualityTag = isStyleNone ? '' : ` ${artStyle?.quality || ''}`.trimEnd()
    const ratio = `--ar ${selections.aspectRatio}`

    return `${line1} ${line2} ${line3}${qualityTag}${proNarrative} ${ratio}`.replace(/  +/g, ' ').trim()
}

/**
 * Standard prompt builder for non-Gemini models (Flux, GPT Image).
 * Uses the structured keyword + flag format these models expect.
 */
const buildStandardPrompt = (selections, getFStop) => {
    const cam = CAMERA_MODELS.find(c => c.id === selections.camera) || CAMERA_MODELS[0]
    const angle = CAMERA_ANGLES.find(a => a.id === selections.angle) || CAMERA_ANGLES[2]
    const lighting = LIGHTING_STYLES.find(l => l.id === selections.lighting)
    const artStyle = ART_STYLES.find(s => s.id === selections.style)
    const store = useAppStore.getState()
    const activeChar = store.activeCharacter
    const charDesc = activeChar?.metadata?.imageAnalysis?.description || activeChar?.personality || ''

    let subject = selections.subject?.trim() || 'the main subject'

    // ANTI-LEAKAGE
    if (activeChar && (subject.toLowerCase() === activeChar.name.toLowerCase() || subject === 'the main subject')) {
        subject = charDesc || subject
    }
    const refContext = selections.referenceImage
        ? 'Following the composition and style of the attached reference image, '
        : ''

    const compKeyword = COMPOSITION_PROMPTS[selections.composition]
    const apertureLabel = typeof getFStop === 'function' ? getFStop(selections.aperture) : 'Auto Aperture'
    const styleLabel = artStyle?.label ? `${artStyle.label} style ` : ''

    // ── Template Assembly ──
    const line1 = `${refContext}${styleLabel}${angle.label} of ${subject}.`
    const line2 = `Captured on ${cam.label} ${cam.soul ? cam.soul + ',' : ''} ${selections.focalLength}mm lens at ${apertureLabel}.`
    const line3 = `The lighting is ${lighting?.label || 'cinematic'}${compKeyword ? ', ' + compKeyword : ''}.`
    const ratio = `--ar ${selections.aspectRatio}`

    return `${line1} ${line2} ${line3} ${ratio}`.replace(/  +/g, ' ').trim()
}

/**
 * Video prompt builder for Veo.
 * Gemini Veo also benefits from narrative language.
 * Now includes support for categorized references from the @Ref Board.
 */
const buildVideoPrompt = (selections, selectedModel, refBoard = { characters: [], locations: [], wardrobes: [], props: [], moods: [] }) => {
    // Helper to extract tagged references from text
    const getTaggedRefs = (text) => {
        const mentions = ((text || '').match(/@(\w+)/g) || []).map(m => m.slice(1).toLowerCase());
        const allItems = [
            ...refBoard.characters.map(i => ({ ...i, category: 'character' })),
            ...refBoard.locations.map(i => ({ ...i, category: 'location' })),
            ...refBoard.wardrobes.map(i => ({ ...i, category: 'wardrobe' })),
            ...refBoard.props.map(i => ({ ...i, category: 'prop' })),
            ...refBoard.moods.map(i => ({ ...i, category: 'mood' })),
        ];
        return allItems.filter(item => mentions.some(m => item.name?.toLowerCase().replace(/\s+/g, '') === m || item.name?.toLowerCase().includes(m)));
    };

    // ─── Resolve UI selections into narratives ───────────────────────────
    const cam = CAMERA_MODELS.find(c => c.id === selections.camera) || CAMERA_MODELS[0]
    const artStyle = ART_STYLES.find(s => s.id === selections.style)
    const lighting = LIGHTING_STYLES.find(l => l.id === selections.lighting)

    const subject = (selections.subject || selections.subjectDescription || '').trim() || 'the subject'
    const action = (selections.actionDescription || '').trim()
    const context = (selections.contextDescription || '').trim()

    // ── AUTO-DETECT VEO MODE ─────────────────────────────────────────────
    const hasFirstFrame = !!(selections.firstFrame && selections.firstFrame !== 'loading');
    const hasLastFrame = !!(selections.lastFrame && selections.lastFrame !== 'loading');
    const isFirstAndLastFrame = hasFirstFrame && hasLastFrame;
    const isImageToVideo = hasFirstFrame && !hasLastFrame;
    const isTextToVideo = !hasFirstFrame && !hasLastFrame;

    // ── [1] CINEMATOGRAPHY: Camera shot + movement ──────────────────────
    const movement = selections.cameraMovement || 'Static Shot'
    const shotAngle = CAMERA_ANGLES.find(a => a.id === selections.angle)?.label || ''

    // Map speed ramp to cinematic language
    const speedRampMap = {
        "Impact": "Use an aggressive speed ramp: start slow, snap to high-speed during the impact, then return to slow-motion.",
        "Cinematic": "Capture in 120fps slow-motion for a dreamlike, high-end cinematic feel.",
        "Ramp In": "Start the shot in extreme slow-motion then rapidly accelerate the time-scale into real-time.",
        "Ramp Out": "Start in real-time then gracefully decelerate into a frozen-time slow-motion finish.",
        "Snap": "Use rhythmic time-mapping, snapping between fast and slow motion to highlight key movements.",
        "Viral": "Dynamic TikTok-style speed ramping with high-energy velocity shifts."
    };
    const speedNarrative = speedRampMap[selections.speedRamp] || "at a steady, natural cinematic pace.";

    const cameraMovementMap = {
        'Static Shot':      'Camera holds completely still.',
        'Pan Left':         'Camera slowly pans left.',
        'Pan Right':        'Camera slowly pans right.',
        'Dolly In':         'Camera slowly pushes in toward the subject.',
        'Dolly Out':        'Camera slowly pulls back to reveal the scene.',
        '180° Arc Left':    'Camera performs a smooth 180-degree arc to the left around the subject.',
        '180° Arc Right':   'Camera performs a smooth 180-degree arc to the right around the subject.',
        'Tilt Up':          'Camera tilts upward.',
        'Tilt Down':        'Camera tilts downward.',
        'Handheld':         'Handheld camera with natural organic movement.',
        'Drone Rise':       'Camera ascends vertically like a drone.',
        'Drone Fall':       'Camera descends vertically.',
    };
    const cameraClause = cameraMovementMap[movement] || 'Camera holds steady.';

    // ── [2] SUBJECT + ACTION + CONTEXT ───────────────────────────────────
    const actionClause = action ? `, ${action}` : ''
    const contextClause = context ? `, set in ${context}` : ''
    const lightingNarrative = lighting?.narrative || lighting?.label?.toLowerCase() || 'cinematic lighting'
    const styleNarrative = artStyle?.narrative || artStyle?.label?.toLowerCase() || 'photorealistic'

    // Tone / Mood tag
    const toneNarrativeMap = {
        'Happy / Joyful':       'Bright, vibrant, cheerful, uplifting and whimsical tone — visual warmth and joyful energy throughout.',
        'Sad / Melancholy':     'Somber, muted colors, slow pace and poignant atmosphere — wistful and emotionally heavy tone.',
        'Suspenseful / Tense':  'Dark, shadowy, with a palpable sense of unease and thrilling tension — every frame feels dangerous.',
        'Peaceful / Serene':    'Calm, tranquil, soft and meditative atmosphere — gentle and unhurried visual pacing.',
        'Epic / Grandiose':     'Sweeping, majestic, dramatic and awe-inspiring tone — cinematic grandeur at maximum scale.',
        'Futuristic / Sci-Fi':  'Sleek, metallic, neon-lit and technological atmosphere — alternating between dystopian dread and utopian wonder.',
        'Vintage / Retro':      'Sepia-toned, grainy film aesthetic with era-specific visual cues — nostalgic and warmly aged.',
        'Romantic':             'Soft focus, warm colors and intimate framing — a tender, emotionally close atmosphere.',
        'Horror':               'Dark, unsettling and eerie atmosphere with shadows and dread — deeply unnerving visual tension.',
    };
    const emotion = (selections.emotion && selections.emotion !== 'Neutral' && toneNarrativeMap[selections.emotion])
        ? ` Tone: ${toneNarrativeMap[selections.emotion]}`
        : ''

    // ── AUDIO LAYER (Veo 3.1) ────────────────────────────────────────────
    const audioLines = []
    const audioActive = selections.audioActive || {}
    const audioPrompts = selections.audioPrompts || {}
    if (selections.audio === 'On') {
        if (audioActive.dialogue) {
            if (audioPrompts.dialogue) audioLines.push(`A voice says, "${audioPrompts.dialogue}".`)
            else if (selections.dialogue && selections.dialogue !== 'Off') audioLines.push(`Dialogue: ${selections.dialogue}.`)
        }
        if (audioActive.sfx && audioPrompts.sfx) audioLines.push(`SFX: ${audioPrompts.sfx}.`)
        if (audioActive.ambient) {
            if (audioPrompts.ambient) audioLines.push(`Ambient noise: ${audioPrompts.ambient}.`)
            else audioLines.push('Ambient noise: natural, immersive soundscape.')
        }
        if (audioActive.music && audioPrompts.music) audioLines.push(`Music: ${audioPrompts.music}.`)
    }

    // ── AMBIANCE LAYER (Color, Atmosphere, Texture) ──────────────────────
    const ambianceLines = []
    const ambianceActive = selections.ambianceActive || {}
    const ambiancePrompts = selections.ambiancePrompts || {}
    if (ambianceActive.color && ambiancePrompts.color) ambianceLines.push(`Color Palette: ${ambiancePrompts.color}.`)
    if (ambianceActive.atmosphere && ambiancePrompts.atmosphere) ambianceLines.push(`Atmospheric Effects: ${ambiancePrompts.atmosphere}.`)
    if (ambianceActive.texture && ambiancePrompts.texture) ambianceLines.push(`Textural Qualities: ${ambiancePrompts.texture}.`)
    const ambianceNarrative = ambianceLines.length > 0 ? ` Ambiance: ${ambianceLines.join(' ')}` : ''

    // ── TIMESTAMP SEGMENTS (multi-shot) ──────────────────────────────────
    const segments = selections.timestampSegments || []
    const hasTimestamps = segments.length > 1 && segments.some(s => s.description?.trim())
    let timestampBlock = ''
    if (hasTimestamps) {
        timestampBlock = '\n\n' + segments
            .filter(s => s.description?.trim())
            .map(s => `[${String(s.start).padStart(2, '0')}:${String((s.start % 1 * 60) | 0).padStart(2, '0')}-${String(s.end).padStart(2, '0')}:${String((s.end % 1 * 60) | 0).padStart(2, '0')}] ${s.description.trim()}`)
            .join('\n')
    }

    // ── MODE-SPECIFIC PREAMBLE ────────────────────────────────────────────
    let modePreamble = ''
    
    // Detect references for "Ingredients" style prompting early
    const allNarrativeText = (selections.subject || '') + ' ' + (selections.subjectDescription || '') + ' ' + (selections.actionDescription || '') + ' ' + (selections.contextDescription || '');
    const tagged = getTaggedRefs(allNarrativeText);
    const hasIngredients = tagged.length > 0;

    if (hasIngredients) {
        // Suppression: No interpolation preamble if we have ingredients
        modePreamble = ''; 
    } else if (isFirstAndLastFrame) {
        // Veo 3.1 "First and Last Frame" interpolation mode
        modePreamble = `The camera performs a smooth ${movement !== 'Static Shot' ? cameraMovementMap[movement]?.replace('Camera ', '').replace('.', '') || 'arc shot' : 'transition'}, ` +
            `starting with the provided start frame and seamlessly ending on the provided end frame. `
    } else if (isImageToVideo) {
        // Veo 3.1 Image-to-Video: animate the source image
        modePreamble = `Animate this image. `
    }

    // Text-to-video: no preamble, just the structured prompt below

    // ── ASSEMBLE FINAL VEO 3.1 PROMPT ────────────────────────────────────
    // Formula: [References Preamble] + [Cinematography] + [Subject] + [Action] + [Context] + [Style & Ambiance]
    
    let ingredientsPreamble = '';
    if (hasIngredients) {
        const refsFormatted = tagged.map(i => {
            const label = i.category?.replace(/s$/, '') || 'Reference';
            const capLabel = label.charAt(0).toUpperCase() + label.slice(1);
            return `${capLabel} @${i.name}`;
        }).join(', ');
        ingredientsPreamble = `Using the provided images for ${refsFormatted}, `;
    }

    // Fix: If modePreamble already contains the camera movement (interpolation mode), 
    // don't repeat the cameraClause to avoid "performs a smooth performs a smooth"
    const cinematography = (isFirstAndLastFrame && !hasIngredients) ? '' : `${cameraClause} `
    const core = `${ingredientsPreamble}${modePreamble}${cinematography}${subject}${actionClause}${contextClause}.`

    // ── LENS / OPTICAL EFFECTS ────────────────────────────────────────────
    const lensNarrativeMap = {
        'Wide-Angle Lens':        'Shot with a wide-angle lens that captures a broader field of view, exaggerating perspective and creating a grand sense of scale.',
        'Telephoto Lens':         'Shot with a telephoto lens that narrows the field of view compresses perspective, making distant subjects appear closer and beautifully isolated.',
        'Shallow Depth of Field': 'Shallow depth of field with only a narrow plane in sharp focus — the background dissolves into smooth, creamy bokeh.',
        'Deep Depth of Field':    'Deep depth of field keeping everything in sharp focus from the immediate foreground to the distant background.',
        'Lens Flare':             'Cinematic lens flare streaks and starbursts as bright light directly strikes the lens, creating a dramatic, cinematic atmosphere.',
        'Rack Focus':             'Rack focus technique shifting from one subject to another within a single continuous shot, guiding the viewer\'s attention.',
        'Fisheye Lens':           'Fisheye lens effect with extreme barrel distortion creating a circular, panoramic wide-angle image of the scene.',
        'Vertigo Effect':         'Vertigo effect (dolly zoom): camera dollies while simultaneously zooming in the opposite direction, creating a dramatic, disorienting background perspective shift.',
    };
    const lensNarrative = lensNarrativeMap[selections.lens] ? ` Lens: ${lensNarrativeMap[selections.lens]}` : '';

    // ── ARTISTIC STYLE ────────────────────────────────────────────
    const artisticStyleNarrativeMap = {
        'Photorealistic':           'ultra-realistic rendering with 8K camera-level fidelity, true-to-life textures and lighting.',
        'Cinematic Film':           'cinematic film look shot on 35mm film with anamorphic widescreen lens flares and grain.',
        'Japanese Anime':           'high-quality Japanese anime style with clean line-art, vibrant cel-shading and expressive characters.',
        'Classic Disney Animation': 'classic Disney hand-drawn animation style with fluid, expressive motion and warm, painterly backgrounds.',
        'Pixar 3D Animation':       'Pixar-like 3D CGI animation with subsurface scattering, expressive characters and richly detailed environments.',
        'Claymation':               'claymation style with visible fingerprint texture, tactile clay surfaces and organic stop-motion charm.',
        'Stop-Motion':              'stop-motion animation aesthetic with deliberate frame-by-frame movement and handcrafted physical materials.',
        'Cel-Shaded Animation':     'cel-shaded animation with bold outlines, flat color fills and a stylized graphic-novel energy.',
        'Van Gogh Style':           'in the expressive style of Van Gogh — swirling brushstrokes, vivid impasto color and emotional intensity.',
        'Surrealist Painting':      'surrealist painting aesthetic with dreamlike imagery, unexpected juxtapositions and melting, impossible forms.',
        'Impressionistic':          'impressionistic style with loose, dappled brushwork capturing light and atmosphere over sharp detail.',
        'Art Deco':                 'Art Deco design aesthetic with geometric symmetry, bold gold and black palettes, and elegant stylized forms.',
        'Bauhaus Aesthetic':        'Bauhaus aesthetic emphasizing functional minimalism, primary colors, geometric shapes and rational composition.',
        'Graphic Novel':            'gritty graphic novel illustration with high-contrast inking, dramatic shadows and kinetic panel energy.',
        'Watercolor Painting':      'watercolor painting coming to life with soft bleeding pigment, wet edges and translucent layered washes.',
        'Charcoal Sketch':          'charcoal sketch animation with rough textured strokes, deep blacks and expressive gestural mark-making.',
        'Blueprint Schematic':      'blueprint schematic style with white technical line-art on deep engineering blue, precise and architectural.',
    };
    const artisticStyle = selections.artisticStyle && selections.artisticStyle !== 'Photorealistic'
        ? ` Artistic Style: ${artisticStyleNarrativeMap[selections.artisticStyle] || selections.artisticStyle}.`
        : ' ultra-realistic rendering with 8K photographic fidelity.';

    const pacingMap = {
        'slow-motion': 'Shot in extreme slow-motion for a dreamlike, graceful feel.',
        'fast-paced action': 'High-energy, fast-paced action editing style with rapid visual pacing.',
        'time-lapse': 'Captured as an accelerated time-lapse, compressing long periods of time into a single dynamic segment.'
    }
    const pacingNarrative = pacingMap[selections.pacing] ? ` Pacing: ${pacingMap[selections.pacing]}` : ''

    const style = ` ${styleNarrative} aesthetic, ${lightingNarrative}, ${speedNarrative}.${pacingNarrative}`

    // Camera credit only for text-to-video
    const cameraCreditLine = isTextToVideo
        ? ` Recorded on ${cam.label} for maximum cinematic realism.`
        : ''

    const audio = (audioLines.length > 0 && selectedModel !== 'veo-fast' && selections.audio === 'On')
        ? ' ' + audioLines.join(' ')
        : ''

    const transform = PRO_LIGHTING_TRANSFORMS.find(t => t.id === selections.lightingTransform)
    const transformNarrative = (transform && transform.id !== 'none') ? ` Lighting Transform: ${transform.narrative}` : ''

    const finalPrompt = `${core}${style}${emotion}${ambianceNarrative}${lensNarrative}${artisticStyle}${transformNarrative}${cameraCreditLine}${audio}${timestampBlock}`

    // ── REFERENCE BOARD INTEGRATION ────────────────────────────────────
    const refBlock = (() => {
        if (tagged.length === 0) return '';

        const lines = [];
        const chars = tagged.filter(i => i.category === 'characters' || i.category === 'character');
        const locs = tagged.filter(i => i.category === 'locations' || i.category === 'location');
        const wards = tagged.filter(i => i.category === 'wardrobes' || i.category === 'wardrobe');
        const props = tagged.filter(i => i.category === 'props' || i.category === 'prop');
        const moods = tagged.filter(i => i.category === 'moods' || i.category === 'mood');

        if (chars.length > 0) lines.push(`Characters: ${chars.map(c => '@' + c.name).join(', ')}`);
        if (locs.length > 0) lines.push(`Location Reference: ${locs.map(l => '@' + l.name).join(', ')}`);
        if (wards.length > 0) lines.push(`Wardrobe Reference: ${wards.map(w => '@' + w.name).join(', ')}`);
        if (props.length > 0) lines.push(`Key Props: ${props.map(p => '@' + p.name).join(', ')}`);
        if (moods.length > 0) lines.push(`Visual Style/Mood: ${moods.map(m => '@' + m.name).join(', ')}`);

        return lines.length > 0 ? '\n\nReferences Definitions:\n' + lines.join('\n') : '';
    })();

    const negativeClause = ' Avoid: sudden transitions.';

    return (core + style + cameraCreditLine + emotion + lensNarrative + artisticStyle + transformNarrative + audio + negativeClause + timestampBlock + refBlock).trim()
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

// ── SUB-COMPONENTS (Defined outside to prevent unmount on render) ──
const KlingShotBuilder = ({ selections, setSelections }) => (
    <div className="w-1/3 shrink-0 h-full">
        <div className="h-full bg-[#AADD00]/5 border border-[#AADD00]/20 rounded-xl p-2 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-[#AADD00] uppercase tracking-widest flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Kling Shot Builder
                </label>
                <button
                    onClick={() => setSelections(p => ({
                        ...p,
                        timestampSegments: [...(p.timestampSegments || []), { id: Date.now(), start: 0, end: 2, description: '' }]
                    }))}
                    className="px-1.5 py-0.5 bg-[#AADD00]/10 hover:bg-[#AADD00]/20 border border-[#AADD00]/20 rounded text-[#AADD00] text-[8px] font-black uppercase transition-all"
                >
                    + Add Segment
                </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[40px]">
                {(selections.timestampSegments || []).map((seg, idx) => (
                    <div key={seg.id || idx} className="bg-black/40 border border-[#AADD00]/5 rounded-lg p-1.5 space-y-1 group/seg">
                        <div className="flex items-center gap-1.5 justify-between">
                            <div className="flex items-center gap-1 text-[8px] font-bold text-white/40">
                                <input
                                    type="text"
                                    value={seg.start}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSelections(p => ({
                                            ...p,
                                            timestampSegments: p.timestampSegments.map((s, i) => i === idx ? { ...s, start: val } : s)
                                        }));
                                    }}
                                    className="w-6 bg-white/5 border-none p-0 px-0.5 focus:outline-none rounded text-center text-[#AADD00]"
                                />
                                <span>-</span>
                                <input
                                    type="text"
                                    value={seg.end}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSelections(p => ({
                                            ...p,
                                            timestampSegments: p.timestampSegments.map((s, i) => i === idx ? { ...s, end: val } : s)
                                        }));
                                    }}
                                    className="w-6 bg-white/5 border-none p-0 px-0.5 focus:outline-none rounded text-center text-[#AADD00]"
                                />
                                <span className="uppercase ml-1">sec</span>
                            </div>
                            <button
                                onClick={() => setSelections(p => ({
                                    ...p,
                                    timestampSegments: p.timestampSegments.filter((_, i) => i !== idx)
                                }))}
                                className="opacity-0 group-hover/seg:opacity-100 p-0.5 hover:bg-red-500/20 rounded text-red-500 transition-all"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </div>
                        <textarea
                            value={seg.description}
                            onChange={(e) => setSelections(p => ({
                                ...p,
                                timestampSegments: p.timestampSegments.map((s, i) => i === idx ? { ...s, description: e.target.value } : s)
                            }))}
                            placeholder="Kling segment prompt..."
                            className="w-full bg-white/5 border border-white/5 rounded p-1 text-[10px] text-white/80 placeholder:text-white/10 focus:outline-none resize-none h-8 custom-scrollbar"
                        />
                    </div>
                ))}
                {(selections.timestampSegments || []).length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-4">
                        <Zap className="w-6 h-6 mb-1 text-[#AADD00]" />
                        <span className="text-[7px] font-bold uppercase text-[#AADD00]">Add sequence mapping</span>
                    </div>
                )}
            </div>
        </div>
    </div>
);

const KlingCharacterLayer = ({ selections, handleTextChange, setShowRefBoard, mentionSearch, setMentionSearch, allRefItems, selectMention }) => (
    <div className="flex-1 bg-purple-500/5 border border-purple-500/20 rounded-xl p-2 flex flex-col">
        <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> Kling & Veo Ingredients
            </label>
            <div className="flex items-center gap-2">
                <span className="text-gray-600 font-normal normal-case tracking-normal text-[9px] hidden sm:block">Type @ to tag</span>
                <button onClick={() => setShowRefBoard(true)} className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded text-purple-400 transition-all">
                    <span className="text-[10px] font-black">@</span>
                </button>
            </div>
        </div>
        <div className="relative flex-1 flex flex-col min-h-[40px]">
            <textarea
                value={selections.subjectDescription}
                onChange={(e) => handleTextChange('subjectDescription', e)}
                placeholder="Describe character or @ tag reference..."
                className="w-full bg-black/40 border border-purple-500/10 rounded-lg p-2 text-xs text-white placeholder:text-gray-600 focus:outline-none resize-none flex-1 custom-scrollbar"
            />
            {mentionSearch !== null && (
                <div className="absolute bottom-full left-0 mb-3 w-72 z-[500] animation-slide-up">
                    <div className="bg-[#050505] border-2 border-[#D4FF00] rounded-2xl shadow-[0_-10px_50px_rgba(212,255,0,0.3)] overflow-hidden flex flex-col max-h-[300px]">
                        <div className="p-3 border-b border-white/10 bg-[#D4FF00]/10 flex items-center justify-between">
                            <span className="text-[10px] font-black text-[#D4FF00] uppercase tracking-widest flex items-center gap-2">
                                <Users className="w-3.5 h-3.5" /> Select Character
                            </span>
                            <button onClick={() => setMentionSearch(null)} className="text-[#D4FF00]/40 hover:text-[#D4FF00] p-1"><X size={14} /></button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar bg-black/80 backdrop-blur-xl flex-1">
                            {allRefItems
                                .filter(item => item.name.toLowerCase().includes(mentionSearch.toLowerCase()))
                                .length > 0 ? (
                                allRefItems
                                    .filter(item => item.name.toLowerCase().includes(mentionSearch.toLowerCase()))
                                    .map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => selectMention(item)}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#D4FF00]/20 transition-colors group border-b border-white/[0.05] last:border-0"
                                        >
                                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 relative shrink-0">
                                                <img src={item.imageUrl} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="text-left flex-1 min-w-0">
                                                <p className="text-[11px] font-black text-white group-hover:text-[#D4FF00] transition-colors truncate">@{item.name?.replace(/\s+/g, '')}</p>
                                                <p className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">{item.category}</p>
                                            </div>
                                        </button>
                                    ))
                            ) : (
                                <div className="p-8 text-center bg-black/90">
                                    <p className="text-[11px] text-white/50 mb-4 font-bold">No characters found for "{mentionSearch}"</p>
                                    <button
                                        onClick={() => { setShowRefBoard(true); setMentionSearch(null); }}
                                        className="inline-flex items-center gap-2 px-5 py-3 bg-[#D4FF00] text-black text-[10px] rounded-xl font-black transition-all hover:bg-white uppercase tracking-widest shadow-lg"
                                    >
                                        <ImagePlus className="w-4 h-4" /> Add Character
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
)

const KlingAudioMode = () => (
    <div className="flex-1 min-w-[140px]">
        <div className="h-full bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-2 flex items-center gap-2 opacity-60">
            <Sun className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-[9px] font-black text-yellow-500 uppercase">Kling Audio Mode</span>
        </div>
    </div>
)

const TimestampMultiShot = ({ selections, setSelections, setShowRefBoard, allRefItems, setMentionSearch, setMentionField, setMentionCursorPos }) => (
    <div className="w-1/3 shrink-0 h-full">
        <div className="h-full bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-[#AADD00] uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Veo Sequence Builder
                </label>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setSelections(p => ({
                            ...p,
                            timestampSegments: [...(p.timestampSegments || []), { id: Date.now(), start: 0, end: 2, description: '' }]
                        }))}
                        className="px-1.5 py-0.5 bg-[#AADD00]/10 hover:bg-[#AADD00]/20 border border-[#AADD00]/20 rounded text-[#AADD00] text-[8px] font-black uppercase transition-all"
                    >
                        + Add Segment
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[40px]">
                {(selections.timestampSegments || []).map((seg, idx) => (
                    <div key={seg.id || idx} className="bg-black/40 border border-white/5 rounded-lg p-1.5 space-y-1 group/seg">
                        <div className="flex items-center gap-1.5 justify-between">
                            <div className="flex items-center gap-1 text-[8px] font-bold text-white/40">
                                <input
                                    type="text"
                                    value={seg.start}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSelections(p => ({
                                            ...p,
                                            timestampSegments: p.timestampSegments.map((s, i) => i === idx ? { ...s, start: val } : s)
                                        }));
                                    }}
                                    className="w-6 bg-white/5 border-none p-0 px-0.5 focus:outline-none rounded text-center text-[#AADD00]"
                                />
                                <span>-</span>
                                <input
                                    type="text"
                                    value={seg.end}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSelections(p => ({
                                            ...p,
                                            timestampSegments: p.timestampSegments.map((s, i) => i === idx ? { ...s, end: val } : s)
                                        }));
                                    }}
                                    className="w-6 bg-white/5 border-none p-0 px-0.5 focus:outline-none rounded text-center text-[#AADD00]"
                                />
                                <span className="uppercase ml-1">sec</span>
                            </div>
                            <button
                                onClick={() => setSelections(p => ({
                                    ...p,
                                    timestampSegments: p.timestampSegments.filter((_, i) => i !== idx)
                                }))}
                                className="opacity-0 group-hover/seg:opacity-100 p-0.5 hover:bg-red-500/20 rounded text-red-500 transition-all"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </div>
                        <textarea
                            value={seg.description}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelections(p => ({
                                    ...p,
                                    timestampSegments: p.timestampSegments.map((s, i) => i === idx ? { ...s, description: val } : s)
                                }));
                                // @ mention detection for character tagging
                                const cursor = e.target.selectionStart || 0;
                                const match = val.slice(0, cursor).match(/@(\w*)$/);
                                if (match && setMentionSearch) {
                                    setMentionSearch(match[1].toLowerCase());
                                    setMentionCursorPos && setMentionCursorPos(cursor);
                                    setMentionField && setMentionField(`seg_desc_${idx}`);
                                } else if (setMentionSearch) {
                                    setMentionSearch(null);
                                }
                            }}
                            placeholder="Type @ to tag a character, or describe the shot..."
                            className="w-full bg-white/5 border border-white/5 rounded p-1 text-[10px] text-white/80 placeholder:text-white/20 focus:outline-none resize-none h-8 custom-scrollbar"
                        />
                    </div>
                ))}
                {(selections.timestampSegments || []).length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-4">
                        <Clock className="w-6 h-6 mb-1" />
                        <span className="text-[7px] font-bold uppercase">No segments added</span>
                    </div>
                )}
            </div>
        </div>
    </div>
)

const VideoNarrativeComponents = ({ mode, isNanoBanana, isVeo, allRefItems, setShowRefBoard, selections, handleTextChange, mentionSearch, setMentionSearch, mentionField, selectMention, textareaRef, handleRefinePrompt, isPolishing, setStagedRefBoard, refBoard }) => (
    <div className={cn("h-full", mode === 'video' ? "w-2/3" : "flex-1")}>
        <div className="bg-white/5 border border-white/10 rounded-xl p-2 h-full flex-1 flex flex-col">
            <label className="w-full text-[10px] font-bold text-[#D4FF00] uppercase tracking-widest flex items-center mb-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRefinePrompt(); }}
                        disabled={isPolishing}
                        className={cn("p-1 hover:bg-[#D4FF00]/10 rounded-md transition-all group/pen cursor-pointer", isPolishing && "opacity-50 cursor-wait")}
                        title="AI Refine Prompt/Narrative (1 Credit)"
                    >
                        <PenTool className={cn("w-3.5 h-3.5 text-[#D4FF00] group-hover/pen:scale-110 transition-transform", isPolishing && "animate-pulse")} />
                    </button>
                    <Sparkles className="w-3.5 h-3.5" />
                    {mode === 'video' ? 'Video Narrative Components' : isNanoBanana ? 'Scene Narrative' : 'Vision Input'}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-gray-600 font-normal normal-case tracking-normal text-[9px] hidden sm:block">Type @ to tag a character</span>
                    <button onClick={() => { setStagedRefBoard({ ...refBoard }); setShowRefBoard(true) }} className={cn("flex items-center gap-1 px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-purple-400 transition-all font-sans normal-case tracking-normal")}>
                        <span className="text-[11px] font-black">@</span><span className="text-[9px] font-bold hidden sm:block">Refs</span>
                        {allRefItems.length > 0 && <span className="w-3.5 h-3.5 rounded-full bg-purple-500 text-white text-[7px] font-black flex items-center justify-center">{allRefItems.length}</span>}
                    </button>
                </div>
            </label>
            <div className="relative flex-1 flex flex-col min-h-[40px]">
                <textarea
                    ref={textareaRef}
                    value={isVeo ? (selections.subject || '') : (mode === 'video' ? (selections.subjectDescription || '') : (selections.subject || ''))}
                    onChange={(e) => handleTextChange(isVeo ? 'subject' : (mode === 'video' ? 'subjectDescription' : 'subject'), e)}
                    placeholder={isVeo
                        ? "1. Who or what?  •  2. What is happening?  •  3. Environment, Lighting & Style?"
                        : (isNanoBanana ? "Describe your scene..." : "Describe your cinematic vision...")}
                    className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-sm text-white placeholder:text-gray-600 focus:outline-none resize-none flex-1 custom-scrollbar"
                />

                {mentionSearch !== null && (
                    <div className={cn(
                        "absolute bottom-full mb-3 w-80 z-[500] animation-slide-up",
                        mentionField === 'actionDescription' ? "left-1/3" : mentionField === 'contextDescription' ? "right-0" : "left-0"
                    )}>
                        <div className="bg-[#050505] border-2 border-[#D4FF00] rounded-2xl shadow-[0_-15px_60px_rgba(212,255,0,0.4)] overflow-hidden flex flex-col max-h-[300px]">
                            <div className="p-3.5 border-b border-white/10 bg-[#D4FF00]/10 flex items-center justify-between">
                                <span className="text-[11px] font-black text-[#D4FF00] uppercase tracking-widest flex items-center gap-2">
                                    <Users className="w-4 h-4" /> Tagged character
                                </span>
                                <button onClick={() => setMentionSearch(null)} className="text-[#D4FF00]/40 hover:text-[#D4FF00] p-1"><X size={16} /></button>
                            </div>
                            <div className="overflow-y-auto custom-scrollbar bg-black/90 backdrop-blur-2xl flex-1">
                                {allRefItems
                                    .filter(item => item.name.toLowerCase().includes(mentionSearch.toLowerCase()))
                                    .length > 0 ? (
                                    allRefItems
                                        .filter(item => item.name.toLowerCase().includes(mentionSearch.toLowerCase()))
                                        .map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => selectMention(item)}
                                                className="w-full px-4 py-3.5 flex items-center gap-4 hover:bg-[#D4FF00]/20 transition-colors group border-b border-white/[0.05] last:border-0"
                                            >
                                                <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/20 relative shrink-0 shadow-lg">
                                                    <img src={item.imageUrl} className="w-full h-full object-cover" />
                                                    {item.isMatrix && (
                                                        <div className="absolute inset-0 bg-[#D4FF00]/20 flex items-center justify-center">
                                                            <Zap size={16} className="text-[#D4FF00]" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-left flex-1 min-w-0">
                                                    <p className="text-xs font-black text-white group-hover:text-[#D4FF00] transition-colors truncate">@{item.name?.replace(/\s+/g, '')}</p>
                                                    <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1 font-bold">{item.category}</p>
                                                </div>
                                            </button>
                                        ))
                                ) : (
                                    <div className="p-10 text-center bg-black/95">
                                        <p className="text-xs text-white/60 mb-6 font-bold uppercase tracking-wider">No matching characters</p>
                                        <button
                                            onClick={() => { setShowRefBoard(true); setMentionSearch(null); }}
                                            className="w-full px-6 py-4 bg-[#D4FF00] text-black text-[11px] rounded-2xl font-black transition-all hover:bg-white uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"
                                        >
                                            <ImagePlus className="w-4 h-4" /> Load from Ref Board
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
)

const ProLighting = ({ selections, setSelections }) => (
    <div className="flex flex-col items-start shrink-0">
        <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.15em] mb-0.5 px-1 flex items-center gap-1">
            <Sun className="w-1.5 h-1.5" /> Lighting
        </span>
        <div className="relative">
            <select
                value={selections.lighting === 'cinematic' ? 'cinematic' : selections.lightingTransform}
                onChange={e => {
                    const val = e.target.value;
                    if (val === 'cinematic') {
                        setSelections(p => ({ ...p, lighting: 'cinematic', lightingTransform: 'none' }));
                    } else {
                        setSelections(p => ({ ...p, lightingTransform: val, lighting: val === 'none' ? 'none' : p.lighting }));
                    }
                }}
                className="appearance-none bg-white/[0.06] hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full pl-3 pr-6 py-1 text-[10px] font-semibold text-white transition-all cursor-pointer focus:outline-none focus:border-white/30 truncate"
                style={{ width: '90px' }}
            >
                {['Basic', 'Natural', 'Artificial', 'Cinematic', 'Effects', 'Transforms'].map(cat => (
                    <optgroup key={cat} label={cat} className="bg-[#111] text-gray-400">
                        {PRO_LIGHTING_TRANSFORMS.filter(t => t.category === cat).map(t => (
                            <option key={t.id} value={t.id} className="bg-[#111] text-white">{t.label}</option>
                        ))}
                    </optgroup>
                ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white/30 pointer-events-none" />
        </div>
    </div>
)

export function PromptGenerator({ onUpscale }) {
    const [mode, setMode] = useState(() => localStorage.getItem('prompt_generator_mode') || 'image')
    const [previewTab, setPreviewTab] = useState('image')
    const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('prompt_generator_selected_model') || 'veo-fast')
    const [showCinematography, setShowCinematography] = useState(true)
    const [selections, setSelections] = useState(() => {
        const defaults = {
            camera: 'arri', angle: 'wide', lighting: 'cinematic', style: 'realistic',
            lens: '35mm', composition: 'none', focalLength: 35, aperture: 45,
            aspectRatio: '9:16', subject: '', referenceImage: null, quality: '1k',
            videoInputMode: 'text', referenceUsage: 'first_frame', referenceImageEnd: null,
            firstFrame: null, lastFrame: null, editInstruction: '',
            timestampSegments: [{ start: 0, end: 2, description: '' }],
            cameraMovement: 'Static Shot', lensFocus: 'deep_focus', emotion: 'Neutral',
            speedRamp: 'Cinematic', dialogue: 'Off', fps: '24fps — Cinematic',
            loop: 'Off', audio: 'On', cinematographyDescription: '',
            subjectDescription: '', actionDescription: '', contextDescription: '',
            audioActive: { dialogue: false, sfx: false, ambient: false, music: false },
            audioPrompts: { dialogue: '', sfx: '', ambient: '', music: '' },
            ambianceActive: { color: false, atmosphere: false, texture: false },
            ambiancePrompts: { color: '', atmosphere: '', texture: '' },
            pacing: 'None',
            duration: "4 Seconds", resolution: "1080p",
            searchGrounding: false, lightingTransform: 'none', focusPoint: 'none',
            multishotMode: 'single',
            storyboardBrief: '',
            storyboardTimings: '1.0, 1.5, 0.5, 2.0',
        };
        try {
            const saved = localStorage.getItem('prompt_generator_selections');
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch (e) { return defaults; }
    });

    // 🛰️ PERSISTENCE FIX: Load frames from local cache to prevent empty UI on refresh
    const [frames, setFrames] = useState(() => {
        try {
            const saved = localStorage.getItem('persistent_filmstrip');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.map(f => ({ ...f, loading: false }));
            }
            return [];
        } catch (e) { return []; }
    });

    const isLoadingRef = useRef(false);
    const hasFetched = useRef(false);

    // ✅ PERSISTENCE: Save frame metadata to localStorage whenever the list changes
    useEffect(() => {
        const framesToCache = frames
            .filter(f => f.url && !f.url.startsWith('data:')) // Only cache permanent URLs (GCS/Supabase)
            .map(f => ({
                id: f.id,
                url: f.url,
                thumb: f.thumb,
                type: f.type,
                model: f.model,
                prompt: f.prompt,
                assetId: f.assetId,
                assetPath: f.assetPath
            }))
            .slice(0, 20); // Keep it light
        
        if (framesToCache.length > 0) {
            localStorage.setItem('persistent_filmstrip', JSON.stringify(framesToCache));
        }
    }, [frames]);

    const [activeFrameId, setActiveFrameId] = useState(() => localStorage.getItem('active_image_frame_id') || null)

    // Removed local storage frames caching that was causing lags with large base64 strings

    useEffect(() => {
        if (activeFrameId) {
            localStorage.setItem('active_image_frame_id', activeFrameId);
        } else {
            localStorage.removeItem('active_image_frame_id');
        }
    }, [activeFrameId]);

    const [queueStatus, setQueueStatus] = useState("Initializing...")

    // ─────────────────────────────────────────────
    // PERSISTENCE STATE for Storyboard / Multi Shot
    // ─────────────────────────────────────────────
    const [storyboardSlots, setStoryboardSlots] = useState(() => {
        try {
            const saved = localStorage.getItem('storyboard_slots')
            return saved ? JSON.parse(saved) : [
                { id: 'sb-1', url: null, loading: false, prompt: '', duration: '1.0s' },
                { id: 'sb-2', url: null, loading: false, prompt: '', duration: '1.5s' },
                { id: 'sb-3', url: null, loading: false, prompt: '', duration: '0.5s' },
                { id: 'sb-4', url: null, loading: false, prompt: '', duration: '2.0s' },
            ]
        } catch (e) { return [] }
    });

    const [shotSlots, setShotSlots] = useState(() => {
        try {
            const saved = localStorage.getItem('multi_shot_slots')
            const slots = saved ? JSON.parse(saved) : []
            // Cleanup: remove any legacy empty slots on load
            return slots.filter(s => s.url || s.loading)
        } catch (e) { return [] }
    });

    const [upscaling, setUpscaling] = useState(false);
    const [upscaledImage, setUpscaledImage] = useState(null)
    const [activeStorySlotId, setActiveStorySlotId] = useState(() => localStorage.getItem('active_story_slot_id') || 'sb-1');
    const [activeShotSlotId, setActiveShotSlotId] = useState(() => localStorage.getItem('active_shot_slot_id') || 'ms-1');
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Safe Storage Wrappers (Filtered to avoid 5MB limit)
    const sanitizeForStorage = (slots) => {
        if (!Array.isArray(slots)) return "[]";
        return JSON.stringify(slots.map(s => {
            // If the URL is a massive Base64 string, don't persist it to localStorage
            // This prevents QuotaExceededError crashes.
            if (s.url && s.url.startsWith('data:image')) {
                return { ...s, url: null, base64Removed: true };
            }
            return s;
        }));
    };

    useEffect(() => {
        try {
            localStorage.setItem('storyboard_slots', sanitizeForStorage(storyboardSlots))
        } catch (e) { console.warn('[STORAGE] storyboard_slots quota exceeded'); }
    }, [storyboardSlots])

    useEffect(() => {
        try {
            localStorage.setItem('multi_shot_slots', sanitizeForStorage(shotSlots))
        } catch (e) { console.warn('[STORAGE] multi_shot_slots quota exceeded'); }
    }, [shotSlots])

    useEffect(() => {
        try {
            localStorage.setItem('active_story_slot_id', activeStorySlotId)
        } catch (e) { }
    }, [activeStorySlotId])

    useEffect(() => {
        try {
            localStorage.setItem('active_shot_slot_id', activeShotSlotId)
        } catch (e) { }
    }, [activeShotSlotId])

    useEffect(() => {
        // Migration: Remove any ghost slots (no URL and not loading)
        const hasGhost = shotSlots.some(s => !s.url && !s.loading);
        if (hasGhost) {
            setShotSlots(prev => prev.filter(s => s.url || s.loading));
        }
    }, [shotSlots]);

    useEffect(() => {
        localStorage.setItem('prompt_generator_mode', mode)
    }, [mode])

    useEffect(() => {
        localStorage.setItem('prompt_generator_selected_model', selectedModel)
    }, [selectedModel])

    const isNanoBanana = selectedModel === 'nano-banana' || selectedModel.includes('gemini') || selectedModel === 'nano-banana-2'
    const isKling = ['kling', 'kling-2.6', 'kling-3.0', 'kling-2.1'].includes(selectedModel)
    const isVeo = (selectedModel === 'veo' || selectedModel === 'veo-fast')

    useEffect(() => {
        const timeout = setTimeout(() => {
            localStorage.setItem('prompt_generator_selections', JSON.stringify(selections));
        }, 500);
        return () => clearTimeout(timeout);
    }, [selections]);

    // ✅ Technical Cleanup: Remove any legacy "Upscaling to 2K" text sticking in user's browser
    useEffect(() => {
        const cleanup = (prev) => {
            let changed = false;
            const update = { ...prev };
            ['subject', 'subjectDescription'].forEach(key => {
                if (update[key]?.includes('Upscaling to 2K')) {
                    update[key] = '';
                    changed = true;
                }
            });
            return changed ? update : prev;
        };
        setSelections(p => cleanup(p));
    }, []);

    const [leftPreviewId, setLeftPreviewId] = useState(null)
    const [rightPreviewId, setRightPreviewId] = useState(null)
    const [renderTarget, setRenderTarget] = useState('center')
    const MAX_FRAMES = 25

    const [showGallery, setShowGallery] = useState(false)

    const gridImgRef = useRef(null)

    // Main film strip scroll persistence per-mode
    const mainFilmStripRef = useRef(null);
    const scrollPositions = useRef({ image: 0, video: 0, multishot: 0, storyboard: 0 });

    // Restore scroll position when mode changes
    useEffect(() => {
        if (mainFilmStripRef.current) {
            setTimeout(() => {
                if (mainFilmStripRef.current) {
                    mainFilmStripRef.current.scrollLeft = scrollPositions.current[mode] || 0;
                }
            }, 10);
        }
    }, [mode]);

    const handleMainFilmStripScroll = (e) => {
        scrollPositions.current[mode] = e.target.scrollLeft;
    };
    const [galleryTab, setGalleryTab] = useState('recent') // recent | library
    const [isLoading, setIsLoading] = useState(false)
    const [showAnglesModal, setShowAnglesModal] = useState(false)

    const [mentionSearch, setMentionSearch] = useState(null)
    const [mentionCursorPos, setMentionCursorPos] = useState(0)
    const [mentionField, setMentionField] = useState('subject')
    const [taggedCharacters, setTaggedCharacters] = useState([])
    const textareaRef = useRef(null)

    const [dbAngles, setDbAngles] = useState([])
    const [isUploadingAngle, setIsUploadingAngle] = useState(null)
    const angleFileRef = useRef(null)

    // ── REFERENCE BOARD PERSISTENCE ────────────────────────────────────
    const loadRefBoard = (m) => {
        try {
            const saved = localStorage.getItem(`refBoard_${m}`)
            return saved ? JSON.parse(saved) : { characters: [], locations: [], wardrobes: [], props: [], moods: [] }
        } catch (e) {
            console.error(`Failed to load refBoard for ${m}:`, e)
            return { characters: [], locations: [], wardrobes: [], props: [], moods: [] }
        }
    }

    const handleRefUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file || !activeRefUploadCategory) return
        
        setIsUploadingRef(true)
        const reader = new FileReader()
        reader.onloadend = async () => {
            const base64 = reader.result;
            try {
                const assetData = await saveAsset(base64, `ref_${Date.now()}`, 'image');
                const url = assetData?.url || base64;
                const defaultName = `Ref_${Date.now().toString().slice(-4)}`;
                const customName = prompt(`Enter a name for this ${activeRefUploadCategory.replace(/s$/, '')} (e.g., riya):`, "");
                const finalName = (customName?.trim() || defaultName).replace(/\s+/g, '');

                const newItem = {
                    id: crypto.randomUUID(),
                    name: finalName,
                    category: activeRefUploadCategory,
                    imageUrl: url
                };
                addRefItem(newItem);
            } catch (err) {
                console.error("Ref upload failed:", err);
            } finally {
                setIsUploadingRef(false);
            }
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const [imageRefBoard, setImageRefBoard] = useState(() => loadRefBoard('image'))
    const [videoRefBoard, setVideoRefBoard] = useState(() => loadRefBoard('video'))
    const [stagedRefBoard, setStagedRefBoard] = useState({ characters: [], locations: [], wardrobes: [], props: [], moods: [] })

    // Active board based on mode
    const refBoard = mode === 'video' ? videoRefBoard : imageRefBoard
    const setRefBoard = mode === 'video' ? setVideoRefBoard : setImageRefBoard

    const [showRefBoard, setShowRefBoard] = useState(false)
    const [showLibPicker, setShowLibPicker] = useState(false)
    const [libPickerTarget, setLibPickerTarget] = useState(null)
    const [refMentionOpen, setRefMentionOpen] = useState(false)
    const [refMentionQuery, setRefMentionQuery] = useState('')
    const [isUploadingRef, setIsUploadingRef] = useState(false)
    const [faceConsistency, setFaceConsistency] = useState(true)
    const refUploadInputRef = useRef(null)
    const [activeRefUploadCategory, setActiveRefUploadCategory] = useState(null)
    const [showSpeedPanel, setShowSpeedPanel] = useState(false)
    const [zoomState, setZoomState] = useState({ url: null, isOpen: false, slot: null, isEditing: false })
    const [isPolishing, setIsPolishing] = useState(false)

    const startFrameInputRef = useRef(null)
    const endFrameInputRef = useRef(null)

    const handleFrameUpload = async (e, field) => {
        const file = e.target.files?.[0]
        if (!file) return
        
        // Indicate loading
        setSelections(p => ({ ...p, [field]: 'loading' }));

        const reader = new FileReader()
        reader.onloadend = async () => {
            const base64 = reader.result;
            try {
                // ✅ OPTIMIZATION: Upload reference image to GCS immediately
                // This converts a huge Base64 string into a small URL string.
                // This fixes the "vanishing reference" bug by making it persist in LocalStorage easily.
                const assetData = await saveAsset(base64, `ref_${Date.now()}`, 'image');
                if (assetData?.url) {
                    setSelections(p => ({ ...p, [field]: assetData.url }));
                    console.log(`[REF_UPLOAD] Success: ${field} = ${assetData.url}`);
                } else {
                    setSelections(p => ({ ...p, [field]: base64 })); // Fallback
                }
            } catch (err) {
                console.warn("[REF_UPLOAD] Upload failed, falling back to local base64", err);
                setSelections(p => ({ ...p, [field]: base64 }));
            }
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const handleRefinePrompt = async (specificField = null) => {
        setIsPolishing(true)
        try {
            // Cost check
            const res = await spend('refine_prompt');
            if (!res || !res.success) {
                if (res?.reason === 'unauthenticated') {
                    useAppStore.getState().setShowingAuthModal(true);
                } else if (res?.reason === 'insufficient_funds' || useAppStore.getState().userShorts <= 0) {
                    showToast("Insufficient Shorts! Redirecting to pricing...", "info");
                    useAppStore.getState().setActiveTab('pricing');
                } else {
                    showToast("Refinement could not proceed: " + (res?.reason || "error"));
                }
                return;
            }

            const fieldsToRefine = specificField ? [specificField] : (mode === 'video'
                ? ['subjectDescription', 'actionDescription', 'contextDescription']
                : ['subject'])

            for (const field of fieldsToRefine) {
                const currentText = selections[field]
                if (currentText && currentText.trim().length > 3) {
                    const refined = await refineNarrative(currentText, field)
                    setSelections(p => ({ ...p, [field]: refined }))
                }
            }
        } catch (err) {
            console.error("Refinement failed:", err)
            showToast("AI Refinement failed. Please try again.");
            await refund('refine_prompt');
        } finally {
            setIsPolishing(false)
        }
    }

    // Flat list of all refBoard items for @mention autocomplete
    const allRefItems = [
        ...refBoard.characters.map(i => ({ ...i, category: 'character', prefix: 'char' })),
        ...refBoard.locations.map(i => ({ ...i, category: 'location', prefix: 'loc' })),
        ...refBoard.wardrobes.map(i => ({ ...i, category: 'wardrobe', prefix: 'ward' })),
        ...refBoard.props.map(i => ({ ...i, category: 'prop', prefix: 'prop' })),
        ...refBoard.moods.map(i => ({ ...i, category: 'mood', prefix: 'mood' })),
    ]

    const addRefItem = (item) => {
        const categoryKey = item.category.endsWith('s') ? item.category : item.category + 's'
        const singleAllowed = ['locations', 'wardrobes', 'moods']
        setStagedRefBoard(prev => {
            const currentList = prev[categoryKey] || []
            if (singleAllowed.includes(categoryKey)) {
                return { ...prev, [categoryKey]: [item] }
            }
            return { ...prev, [categoryKey]: [...currentList, item] }
        })
    }
    const renameRefItem = (id, newName) => {
        setStagedRefBoard(prev => {
            const updated = {}
            for (const [key, arr] of Object.entries(prev)) {
                updated[key] = arr.map(i => i.id === id ? { ...i, name: newName } : i)
            }
            return updated
        })
    }

    const removeRefItem = (id) => {
        setStagedRefBoard(prev => {
            const updated = {}
            for (const [key, arr] of Object.entries(prev)) { updated[key] = arr.filter(i => i.id !== id) }
            return updated
        })
    }

    const handleSaveRefBoard = () => {
        setRefBoard(stagedRefBoard)
        localStorage.setItem(`refBoard_${mode}`, JSON.stringify(stagedRefBoard))
        setShowRefBoard(false)
        showToast("Reference Board Saved")
    }

    const handleCancelRefBoard = () => {
        setShowRefBoard(false)
        setShowLibPicker(false)
    }

    const getTaggedRefItems = (text) => {
        const mentions = ((text || '').match(/@(\w+)/g) || []).map(m => m.slice(1).toLowerCase())
        return allRefItems.filter(item => mentions.some(m => item.name?.toLowerCase().replace(/\s+/g, '') === m || item.name?.toLowerCase().includes(m)))
    }

    // ── Zustand store ──────────────────────────────────────────────────
    const userProfile = useAppStore(s => s.userProfile)
    const fetchBalance = useAppStore(s => s.fetchBalance)
    const isAdmin = userProfile?.role === 'admin'
    const { shorts, spend, refund, canAfford, refresh } = useShorts()

    // ── Load camera angles from DB ─────────────────────────────────────
    const loadAngles = async () => {
        try {
            const { data, error } = await supabase.from('camera_angles').select('*').order('created_at', { ascending: true })
            if (error) throw error
            if (data && data.length > 0) setDbAngles(data)
            else setDbAngles(CAMERA_ANGLES)
        } catch { console.warn('Camera angles table missing, using local fallback.'); setDbAngles(CAMERA_ANGLES) }
    }
    useEffect(() => { if (showAnglesModal && dbAngles.length === 0) loadAngles() }, [showAnglesModal])

    // ── Auto-switch model when mode changes ────────────────────────────
    useEffect(() => {
        const current = AI_MODELS.find(m => m.id === selectedModel)
        if (current && current.type !== mode) {
            const fallback = AI_MODELS.find(m => m.type === mode && m.available)
            if (fallback) setSelectedModel(fallback.id)
        }
    }, [mode, selectedModel])

    useEffect(() => {
        if (selectedModel === 'gemini-3-pro-image-preview') setSelections(p => ({ ...p, quality: ['1k', '2k'].includes(p.quality) ? p.quality : '2k' }))
        else if (selectedModel === 'gemini-2.5-flash-image') setSelections(p => ({ ...p, quality: '1k' }))
        else if (isKling) setSelections(p => ({ ...p, duration: '5 Seconds' }))
    }, [selectedModel])

    // Removed automatic reference board population to follow "Session Only" rule.

    // ── Load Recent Generations from DB ──

    const loadRecentFrames = async () => {
        if (isLoadingRef.current || !supabase || !userProfile?.id) return;
        isLoadingRef.current = true; // Lock the door

        // ✅ Parse hiddenIds once here, reuse in both code paths below
        let hiddenIds = [];
        try {
            const raw = localStorage.getItem('hidden_filmstrip_frames');
            if (raw && raw.length < 50000) hiddenIds = JSON.parse(raw);
        } catch { hiddenIds = []; }

        try {
            console.log('[PromptGenerator] Loading recent frames...');
            if (!userProfile?.id) {
                setFrames([]);
                console.log('[PromptGenerator] No user profile found; skipping historical frames load.');
                return;
            }

            // --- Try Zustand cache first (avoids duplicate Supabase round-trip) ---
            const store = useAppStore.getState();
            const cached = store.cachedAssets;
            if (cached) {
                const allCached = [...(cached.images || []), ...(cached.videos || []), ...(cached.upscaled || [])];
                if (allCached.length > 0) {
                    const recentFrames = allCached
                        .filter(a => !hiddenIds.includes(a.id))
                        .slice(0, MAX_FRAMES)
                        .map(a => ({
                            id: a.id, assetId: a.id,
                            url: a.url,
                            assetPath: a.url,
                            type: a.type || 'image', model: a.model || 'Historical', loading: false
                        }));
                    setFrames(prev => {
                        const sessionIds = new Set(prev.map(f => f.id));
                        const newHistorical = recentFrames.filter(f => !sessionIds.has(f.id));
                        if (newHistorical.length === 0) return prev;
                        // Limit combined list to not exceed MAX_FRAMES
                        const merged = [...prev, ...newHistorical].slice(0, MAX_FRAMES);
                        // Set activeFrameId synchronously inside same batch
                        if (!activeFrameId && merged.length > 0) {
                            setTimeout(() => setActiveFrameId(merged[0].id), 0);
                        }
                        return merged;
                    });
                    console.log('[PromptGenerator] Used cached assets for filmstrip.');
                    return;
                }
            }

            // --- Proxy Fetch: Use backend API (IPv4 Fix) ---
            console.log('[CHECK] Requesting assets for User ID via Proxy:', userProfile?.id);
            const response = await fetch(getApiUrl(`/api/list-assets?userId=${userProfile.id}`));
            const data = await response.json();

            if (!response.ok) {
                console.error('[PROXY_FETCH_FAIL]:', data.error);
                showToast(`Persistence Error: ${data.error}`);
                return;
            }

            // ✅ FLATTEN THE OBJECT INTO A SINGLE ARRAY
            const allAssets = [
                ...(data.images || []),
                ...(data.videos || []),
                ...(data.upscaled || [])
            ];

            if (allAssets.length > 0) {
                console.log(`[PromptGenerator] Found ${allAssets.length} historical frames.`);
                const historicalFrames = allAssets.map(a => ({
                    id: a.id,
                    url: a.url,
                    type: a.type || 'image',
                    model: 'Historical',
                    loading: false
                }));
                // Using simplistic setFrames as requested
                setFrames(historicalFrames);
            } else {
                console.log('[PromptGenerator] No historical frames found in DB.');
            }
        } catch (err) {
            console.error('[PromptGenerator] Failed to load recent frames logic:', err);
        } finally {
            isLoadingRef.current = false;
        }
    }
    useEffect(() => {
        if (userProfile?.id && !hasFetched.current) {
            hasFetched.current = true;
            loadRecentFrames();
        }
    }, [userProfile?.id]);

    const getFStop = (ap) => {
        if (selections.camera === 'iphone' || selections.camera === 'gopro') return 'Auto Aperture'
        if (ap < 20) return 'f/1.4'; if (ap < 40) return 'f/2.8'
        if (ap < 60) return 'f/5.6'; if (ap < 80) return 'f/8.0'
        return 'f/16'
    }

    const handleTextChange = (field, e) => {
        const val = e.target.value
        setSelections(p => ({ ...p, [field]: val }))
        const cursor = e.target.selectionStart || 0
        const match = val.slice(0, cursor).match(/@(\w*)$/)
        if (match) {
            setMentionSearch(match[1].toLowerCase())
            setMentionCursorPos(cursor)
            setMentionField(field)
        } else {
            setMentionSearch(null)
        }
    }

    const selectMention = (item) => {
        // Handle segment description fields: mentionField = 'seg_desc_N'
        if (mentionField?.startsWith('seg_desc_')) {
            const segIdx = parseInt(mentionField.split('_')[2]);
            const mentionName = item.name.replace(/\s+/g, '');
            setSelections(p => ({
                ...p,
                timestampSegments: (p.timestampSegments || []).map((s, i) => {
                    if (i !== segIdx) return s;
                    const text = s.description || '';
                    const before = text.slice(0, mentionCursorPos).replace(/@\w*$/, '')
                    const after = text.slice(mentionCursorPos)
                    return { ...s, description: `${before}@${mentionName} ${after}` };
                })
            }));
            setMentionSearch(null);
            return;
        }
        const text = selections[mentionField] || ''
        const before = text.slice(0, mentionCursorPos).replace(/@\w*$/, '')
        const after = text.slice(mentionCursorPos)
        const mentionName = item.name.replace(/\s+/g, '')
        const newText = `${before}@${mentionName} ${after}`
        setSelections(p => ({ ...p, [mentionField]: newText }))
        setMentionSearch(null)
        if (textareaRef.current && mentionField === 'subject') textareaRef.current.focus()
    }

    const getAvailableLenses = () => {
        const cam = CAMERA_MODELS.find(c => c.id === selections.camera) || CAMERA_MODELS[0]
        const mapping = cam.lensMap?.[selections.angle] || cam.lensMap?.['*']
        return mapping?.lenses || ['Auto']
    }
    const currentCamera = CAMERA_MODELS.find(c => c.id === selections.camera) || CAMERA_MODELS[0]
    const availableLenses = getAvailableLenses()

    const handleCameraChange = (camId) => {
        const cam = CAMERA_MODELS.find(c => c.id === camId) || CAMERA_MODELS[0]
        const validAngle = CAMERA_ANGLES.find(a => !cam.invalidAngles?.includes(a.id))
        const angleId = validAngle?.id || 'medium'
        const lensMapping = cam.lensMap?.[angleId] || cam.lensMap?.['*']
        const defaultLens = lensMapping?.default || lensMapping?.lenses?.[0] || 'Auto'
        setSelections(p => ({ ...p, camera: camId, angle: angleId, lens: defaultLens }))
    }

    const handleAngleChange = (angleId) => {
        const cam = CAMERA_MODELS.find(c => c.id === selections.camera) || CAMERA_MODELS[0]
        const mapping = cam.lensMap?.[angleId] || cam.lensMap?.['*']
        const defaultLens = mapping?.default || mapping?.lenses?.[0] || 'Auto'
        setSelections(p => ({ ...p, angle: angleId, lens: defaultLens }))
        setShowAnglesModal(false)
    }

    useEffect(() => {
        if (!availableLenses.includes(selections.lens) && availableLenses[0] !== 'Auto')
            setSelections(p => ({ ...p, lens: availableLenses[0] }))
    }, [selections.camera, selections.angle])

    useEffect(() => {
        const fl = parseInt(selections.lens)
        if (!isNaN(fl)) {
            let aperture = 45
            if (fl <= 24) aperture = 75; else if (fl <= 35) aperture = 45
            else if (fl <= 50) aperture = 25; else aperture = 10
            setSelections(p => ({ ...p, focalLength: fl, aperture }))
        }
    }, [selections.lens])

    const generatedPrompt = mode === 'video'
        ? buildVideoPrompt(selections, selectedModel, refBoard)
        : selectedModel === 'gemini-3-pro-image-preview' ? buildNanoBananaProPrompt(selections)
            : (selectedModel === 'nano-banana' || selectedModel === 'nano-banana-2' || selectedModel.includes('gemini')) ? buildNanoBananaPrompt(selections, getFStop)
                : buildStandardPrompt(selections, getFStop)

    const copyPrompt = () => navigator.clipboard.writeText(generatedPrompt)

    const downloadImage = (url) => {
        if (!url) return;
        window.open(url, '_blank');
    }

    const saveAsset = async (url, slot, type = 'image') => {
        try {
            const ext = type === 'video' ? 'mp4' : 'png';
            const fileName = `flare_${slot}_${Date.now()}.${ext}`;
            const { data: { user } } = await supabase.auth.getUser();
            console.log(`[SAVE_ATTEMPT] Target: ${slot}. User: ${user?.id || 'ANONYMOUS'}`);

            // 1. PRE-CHECK: Is this already a remote URL? 
            const isRemote = url.startsWith('http');

            const payload = {
                imageData: url, // Could be base64 or remote URL
                fileName,
                type,
                userId: user?.id,
                isUrlOnly: isRemote // Tell backend: "Don't process, just record"
            };

            const res = await fetch(getApiUrl('/api/save-asset'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save asset');

            // Generate thumb for filmstrip performance if it's a data URL
            const thumb = type === 'image' && url.startsWith('data:')
                ? await compressImageToMax1024(url)
                : url;

            // Return path (Supabase internal), final public URL, and thumb
            return {
                path: data.path,
                id: data.id,
                url: data.url || url,
                thumb
            };
        } catch (err) {
            console.error('[SAVE_ASSET_FAILURE]:', err);
            return null;
        }
    };

    const takeScreenshot = async (previewSlot) => {
        const video = document.getElementById(`video-preview-${previewSlot}`);
        if (!video) {
            showToast('Video player not ready');
            return;
        }

        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL('image/png');
            const result = await saveAsset(dataUrl, `shot_${previewSlot}`, 'image');
            
            if (result) {
                const newFrame = {
                    id: result.id,
                    assetId: result.id,
                    url: result.url,
                    assetPath: result.url,
                    type: 'image',
                    model: 'Shot',
                    loading: false
                };
                // Respect frame limit: if at limit, remove the oldest (rightmost)
                setFrames(prev => {
                    const next = [newFrame, ...prev];
                    return next.slice(0, MAX_FRAMES);
                });
                showToast('Frame extracted');
            }
        } catch (err) {
            console.error('Screenshot error:', err);
            showToast('Extraction failed');
        }
    };
    const permanentlyDeleteAsset = async (assetId) => {
        try {
            const res = await fetch(getApiUrl(`/api/delete-asset/${assetId}`), { method: 'DELETE' });
            if (!res.ok) throw new Error('Backend deletion failed');
            return true;
        } catch (err) {
            console.error('[DELETE_ERR]', err);
            return false;
        }
    };

    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const removeFrame = async (id) => {
        // If it's a permanent asset (historical or saved), require double-confirm
        const frame = frames.find(f => f.id === id);
        
        // If not already confirming this frame, show toast and set state
        if (deleteConfirmId !== id) {
            setDeleteConfirmId(id);
            showToast("Tap again to delete permanently", 3000);
            setTimeout(() => setDeleteConfirmId(null), 3000);
            return;
        }

        // Second click: Proceed with deletion
        try {
            // 1. Permanent backend deletion if it has a DB ID
            if (frame && frame.assetId) {
                const success = await permanentlyDeleteAsset(frame.assetId);
                if (!success) {
                    showToast("Failed to delete from cloud. Hide only.");
                }
            }

            // 2. Local cleanup
            setFrames(prev => prev.filter(f => f.id !== id));
            if (activeFrameId === id) setActiveFrameId(null);
            
            // 3. Update hidden cache for this session
            const currentHidden = JSON.parse(localStorage.getItem('hidden_filmstrip_frames') || '[]');
            localStorage.setItem('hidden_filmstrip_frames', JSON.stringify([...currentHidden, id]));
            
            setDeleteConfirmId(null);
            showToast("Asset deleted permanently");
        } catch (err) {
            console.error("Remove frame failed:", err);
        }
    };

    const updateVideoSetting = (key, val) => {
        setSelections(p => { let u = { ...p, [key]: val }; if (key === 'dialogue' && val !== 'Off' && val !== 'Ambient Only') u.audio = 'On'; return u })
    }

    // Simple UI toast for non-blocking messages
    const [toast, setToast] = useState(null);
    const showToast = (msg, duration = 4000) => {
        setToast(msg);
        window.setTimeout(() => setToast(null), duration);
    };

    const SpeedRampCurve = ({ name, active }) => {
        const curve = SPEED_RAMP_CURVES[name] || SPEED_RAMP_CURVES["Linear (Standard)"] || [[0, 50], [100, 50]];
        const pts = curve.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0] * 0.8},${p[1]}`).join(' ')
        return (<svg width="80" height="62" viewBox="0 0 80 62" className="mx-auto"><path d={pts} fill="none" stroke={active ? '#84CC16' : '#333'} strokeWidth={active ? 2 : 1} strokeLinecap="round" strokeLinejoin="round" /></svg>)
    }

    const pollJobStatus = async (jobId, frameId, costKey, jobType = 'image', targetTray = null, unitCost = null) => {
        const isVideoJob = jobType === 'video';
        const maxWaitMs = isVideoJob ? 3 * 60 * 1000 : 1 * 60 * 1000;
        const pollIntervalMs = isVideoJob ? 3000 : 2000;
        const maxAttempts = Math.ceil(maxWaitMs / pollIntervalMs);

        try {
            let attempt = 0;
            while (attempt < maxAttempts) {
                let res;
                let fetchError = null;
                
                try {
                    res = await fetch(getApiUrl(`/api/job-status/${jobId}`));
                } catch (e) {
                    fetchError = e;
                }

                if (fetchError || !res.ok) {
                    console.warn(`[POLLING] Attempt ${attempt} failed:`, fetchError?.message || res?.statusText);
                    // Network issues or transient errors: retry with backoff if it's the first few times
                    attempt++;
                    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
                    continue;
                }

                const data = await res.json();
                console.debug('[RAILWAY] Job status poll', jobId, 'state', data.status || data.state, 'progress', data.progress)
                const jobState = data.status || data.state;

                if (jobState === 'completed') {
                    const resultUrl = data.url || data.videoUrl;
                    if (!resultUrl) {
                        throw new Error('Job completed but no result URL was returned');
                    }

                    // 1) Save to Supabase Storage (Middleman)
                    const assetData = await saveAsset(resultUrl, frameId, isVideoJob ? 'video' : 'image');
                    const dbId = assetData?.id || `db_${Date.now()}`;

                    // 2) Update the specific Frame in UI - Essential: Convert to permanent DB ID
                    setFrames(prev => prev.map(f => f.id === frameId ? {
                        ...f,
                        id: dbId, // 🛰️ ID Transform
                        url: resultUrl,
                        assetPath: assetData?.path,
                        assetId: assetData?.id,
                        thumb: assetData?.thumb, // ✅ Store thumbnail for performance!
                        loading: false
                    } : f));

                    // ✅ PERSISTENCE FIX: Update selection pointer
                    if (activeFrameId === frameId) {
                        setActiveFrameId(dbId);
                        localStorage.setItem('active_image_frame_id', dbId);
                    }

                    // 2b) Update specific trays based on origin
                    if (targetTray === 'storyboard' && setStoryboardSlots) {
                        setStoryboardSlots(prev => prev.map(s => s.id === frameId ? {
                            ...s,
                            id: dbId,
                            url: resultUrl,
                            thumb: assetData?.thumb,
                            loading: false
                        } : s));
                        if (activeStorySlotId === frameId) setActiveStorySlotId(dbId);
                    } else if (setShotSlots) {
                        setShotSlots(prev => prev.map(s => s.id === frameId ? {
                            ...s,
                            id: dbId,
                            url: resultUrl,
                            thumb: assetData?.thumb, // ✅ Store thumbnail for performance!
                            loading: false
                        } : s));
                        if (activeShotSlotId === frameId) setActiveShotSlotId(dbId);
                    }

                    setQueueStatus("Generation Complete");
                    return;
                } else if (jobState === 'failed') {
                    throw new Error(data.error || 'Generation failed');
                } else if (jobState === 'queued') {
                    setQueueStatus(`Queued... ${isVideoJob ? 'Video render may take 2–5 min' : 'Image render usually finishes soon'}`);
                } else if (jobState === 'processing') {
                    setQueueStatus(
                        isVideoJob
                            ? `Rendering video... ${data.progress ? `${data.progress}%` : 'This can take a few minutes'}`
                            : `Generating image... ${data.progress ? `${data.progress}%` : 'Almost there'}`
                    );
                }

                attempt++;
                await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
            }
            throw new Error(
                isVideoJob
                    ? 'Video is taking longer than usual. It may still be processing in background.'
                    : 'Image is taking longer than usual. Please try again.'
            );
        } catch (err) {
            const message = err?.message || '';
            const timedOut = message.toLowerCase().includes('taking longer than usual') || message.toLowerCase().includes('timed out');
            if (!timedOut) {
                await refund(costKey, unitCost);
            }
            console.error('Polling error:', err);
            let msg = message;
            if (msg.toLowerCase().includes('safety system')) msg = "Creative Block: The AI's safety filters flagged this prompt.";
            
            // Graceful UI handling: stop loaders in all relevant trays
            showToast(`AI Engine Status: ${msg}`);
            setFrames(prev => prev.map(f => f.id === frameId ? { ...f, loading: false, error: true } : f));
            
            if (targetTray === 'storyboard' && setStoryboardSlots) {
                setStoryboardSlots(prev => prev.map(s => s.id === frameId ? { ...s, loading: false, error: true } : s));
            } else if (setShotSlots) {
                setShotSlots(prev => prev.map(s => s.id === frameId ? { ...s, loading: false, error: true } : s));
            }
        } finally {
            setIsLoading(false);
            setQueueStatus("Initializing...");
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id) fetchBalance(user.id);
        }
    };

    const getCurrentCost = () => {
        const shotCount = (mode === 'image' && selections.multishotMode === 'triple') ? 3 : 1;
        let costKey = 'image_nano_banana';
        let unitCost = 0;

        if (mode === 'video') {
            const isFast = selectedModel === 'veo-fast';
            const audioLayersActive = Object.values(selections.audioActive || {}).some(v => v === true);
            // In Fast mode, we only count audio if layers are explicitly added or if audio is forced 'On'
            const hasAudio = selections.audio === 'On' || audioLayersActive;
            const isHighRes = selections.resolution === '2K' || selections.resolution === '4K';
            
            let durSec = (parseInt((selections.duration || "4s").split(' ')[0]) || 4);
            
            if (!isKling) {
                // Veo 3.1 Image-to-Video (End Frame) interpolation REQUIRES 8 seconds
                const mustBe8 = !!selections.lastFrame;
                if (mustBe8) durSec = 8;
                
                costKey = isFast ? 'veo_fast' : 'veo_full';
                let costPerSec = 0;
                if (isFast) {
                     if (isHighRes) costPerSec = hasAudio ? 40.67 : 34.86;
                     else costPerSec = hasAudio ? 17.43 : 11.62;
                } else {
                     if (isHighRes) costPerSec = hasAudio ? 69.72 : 46.48;
                     else costPerSec = hasAudio ? 46.48 : 23.24;
                }
                unitCost = Math.ceil(costPerSec * durSec);
            } else {
                costKey = 'kling';
                const isPro = selectedModel === 'kling' || selectedModel === 'kling-3.0';
                let costPerSec = 0;
                if (isPro) {
                    costPerSec = hasAudio ? 23.24 : 15.69;
                } else {
                    costPerSec = hasAudio ? 17.43 : 11.62;
                }
                unitCost = Math.ceil(costPerSec * durSec);
            }
        } else if (mode === 'multishot' && selections.multishotMode === 'multiple') {
            costKey = 'image_grid_multishot';
            unitCost = SHORTS_COST[costKey] || 0;
        } else {
            if (selectedModel === 'nano-banana-pro' || selectedModel === 'gemini-3-pro-image-preview') costKey = 'image_nano_banana_pro';
            else if (selectedModel === 'nano-banana-2' || selectedModel.includes('3.1-flash')) costKey = 'image_nano_banana_2';
            else if (selectedModel === 'gemini-2.0-flash-exp-image-generation') costKey = 'image_nano_banana';
            unitCost = SHORTS_COST[costKey] || 0;
        }

        return { costKey, unitCost, totalCost: unitCost * shotCount, shotCount };
    };

    const generateImage = async () => {
        if (isLoading) return;
        setIsLoading(true);

        const { costKey, totalCost, shotCount, unitCost } = getCurrentCost();
        
        // Final sanity check for credits upfront
        if (useAppStore.getState().userShorts < totalCost && useAppStore.getState().userProfile?.role !== 'admin') {
            alert(`Insufficient Credits: You need ${totalCost} shorts. You only have ${useAppStore.getState().userShorts}.`);
            useAppStore.getState().setActiveTab('pricing');
            setIsLoading(false);
            return;
        }

        try {
            for (let i = 0; i < shotCount; i++) {
                if (shotCount > 1) setQueueStatus(`Preparing variation ${i + 1} of 3...`);

                const modelInfo = AI_MODELS.find(m => m.id === selectedModel)
                if (!modelInfo?.available) { alert(`${modelInfo?.name || 'This model'} is coming soon!`); break; }
                
                // FIFO logic: If limit reached, oldest frames will be removed automatically
                // in the setFrames call below to allow new generations.

                // Deduct shorts for each iteration
                const res = await spend(costKey, unitCost);
                if (!res || !res.success) {
                    if (res?.reason === 'unauthenticated') {
                        useAppStore.getState().setShowingAuthModal(true);
                    } else if (res?.reason === 'insufficient_funds' || useAppStore.getState().userShorts <= 0) {
                        showToast("Insufficient Shorts! Redirecting to pricing...", "info");
                        useAppStore.getState().setActiveTab('pricing');
                    } else {
                        showToast("Generation could not proceed: " + (res?.reason || "error"));
                    }
                    break;
                }

                const newFrameId = `frame-${Date.now()}-${i}`
                setFrames(prev => {
                    const newFrame = { id: newFrameId, url: null, type: mode, model: selectedModel, prompt: generatedPrompt, aspectRatio: selections.aspectRatio, loading: true };
                    // Prepend new frame to LEFT so latest is always first
                    const next = [newFrame, ...prev];
                    // FIFO: keep only the most recent MAX_FRAMES
                    return next.length > MAX_FRAMES ? next.slice(0, MAX_FRAMES) : next;
                })
                setActiveFrameId(newFrameId)

                const isGoogleVideo = selectedModel === 'veo' || selectedModel === 'veo-fast' || selectedModel.startsWith('veo-3.1');
                const isKlingVideo = isKling || selectedModel === 'veo-kling';
                const endpoint = getApiUrl((mode === 'video' && !(isGoogleVideo || isKlingVideo)) ? '/api/ugc/video' : '/api/generate-image')
                const { data: { user } } = await supabase.auth.getUser()
                const userId = user?.id

                // ── STRUCTURED REFERENCE ALIGNMENT ──────────────────────────────
                let finalPrompt = generatedPrompt
                const taggedItems = getTaggedRefItems(generatedPrompt)

                if (taggedItems.length > 0) {
                    const categories = { character: [], location: [], wardrobe: [], prop: [], mood: [] }
                    taggedItems.forEach(item => { if (categories[item.category]) categories[item.category].push(`@${item.name?.replace(/\s+/g, '')}`) })

                    let structuralBlock = "\n\n[REFERENCE ALIGNMENT DIRECTIVES]:"
                    if (categories.character.length > 0) {
                        structuralBlock += `\n- CHARACTERS: ${categories.character.join(', ')}`
                        if (faceConsistency) structuralBlock += " (CRITICAL: maintain a same 100% face match, identical facial features and bone structure as the character reference)."
                    }
                    if (categories.location.length > 0) structuralBlock += `\n- LOCATION: ${categories.location.join(', ')} (maintain exact environment layout and architecture from reference).`
                    if (categories.wardrobe.length > 0) structuralBlock += `\n- WARDROBE: ${categories.wardrobe.join(', ')} (match clothing style, fabric textures, and colors from reference).`
                    if (categories.prop.length > 0) structuralBlock += `\n- PROPS: ${categories.prop.join(', ')} (use the exact object designs from reference).`
                    if (categories.mood.length > 0) structuralBlock += `\n- MOOD/STYLE: ${categories.mood.join(', ')} (match color grading, atmosphere, and artistic style from reference).`

                    finalPrompt += structuralBlock
                }

                // ── MULTI-SHOT / IMAGE VARIATIONS: inject 3x3 grid prompt ──
                if ((mode === 'multishot' || mode === 'image') && selections.multishotMode === 'multiple') {
                    finalPrompt += ', generated as a tight 3x3 cinematic grid image showing 9 different creative variations. ZERO OUTER PADDING — the 9 photographs must touch the literal edges of the image file. Each cell separated by ultra-thin internal black dividers only. Consistent identity across panels.'
                }

                const validRatio = (selections.aspectRatio || '16:9').split('—')[0].trim().split(' ')[0].trim();

                const payload = mode === 'video' ? {
                    prompt: finalPrompt,
                    userId,
                    model: AI_MODELS.find(m => m.id === selectedModel)?.modelId || selectedModel,
                    duration: (() => {
                        if (isKling) return parseInt(selections.duration.split(' ')[0]) || 5;
                        const mustBe8 = !!selections.lastFrame;
                        return mustBe8 ? 8 : (parseInt(selections.duration.split(' ')[0]) || 4);
                    })(),
                    resolution: (() => {
                        const raw = selections.resolution || '720p';
                        return raw === '4K' ? '4k' : raw.toLowerCase();
                    })(),
                    aspect_ratio: validRatio,
                    firstFrame: taggedItems.length > 0 ? null : selections.firstFrame,
                    lastFrame: taggedItems.length > 0 ? null : selections.lastFrame,
                    multi_shots: isKling && (selections.timestampSegments?.length > 1),
                    multi_prompt: isKling ? selections.timestampSegments?.map(s => ({
                        prompt: s.description || finalPrompt,
                        duration: Math.max(1, Math.min(12, parseInt(s.end - s.start) || 3))
                    })) : [],
                    referenceImages: taggedItems
                        .flatMap(i => [i.imageUrl])
                        .filter(Boolean)
                        .slice(0, 3)
                } : {
                    model: selectedModel, prompt: finalPrompt, aspect_ratio: validRatio,
                    image: selections.referenceImage,
                    identity_images: [
                        ...(selections.identity_images || []),
                        ...taggedCharacters.map(c => c.matrix).filter(Boolean),
                        ...taggedCharacters.map(c => c.matrix ? null : c.image).filter(Boolean),
                        ...getTaggedRefItems(finalPrompt).flatMap(i => [i.imageUrl, i.matrixUrl]).filter(Boolean)
                    ].slice(0, 14),
                    identity_gcs_uris: taggedCharacters.filter(c => c.gcs_uri).map(c => ({ name: c.name, uri: c.gcs_uri })),
                    product_image: selections.product_image || null,
                    quality: selections.quality, google_search: selections.searchGrounding,
                    duration: selections.duration, userId
                }

                const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                const data = await response.json()

                if (!response.ok) throw new Error(data.message || data.error || 'Generation failed')

                if (data.jobId) {
                    if (shotCount === 1) setQueueStatus("Sending to AI Engine...")
                    pollJobStatus(data.jobId, newFrameId, costKey, mode === 'video' ? 'video' : 'image', null, unitCost)
                } else {
                    if (userId) fetchBalance(userId);
                    const resultUrl = data.url || data.videoUrl
                    if (resultUrl) {
                        setFrames(prev => prev.map(f => f.id === newFrameId ? { ...f, url: resultUrl, loading: false } : f))
                        saveAsset(resultUrl, newFrameId, mode === 'video' ? 'video' : 'image').then(assetData => {
                            if (assetData) {
                                setFrames(prev => prev.map(f => f.id === newFrameId ? {
                                    ...f,
                                    assetPath: assetData.path,
                                    assetId: assetData.id,
                                    thumb: assetData.thumb, // ✅ Keep sync!
                                    loading: false
                                } : f))
                                
                                // ✅ PERSISTENCE FIX: Update the frame index to uses the DB ID instead of local frame-xxx
                                // This prevents the "disappearing image" bug after refresh because IDs will match the DB.
                                if (activeFrameId === newFrameId) {
                                    setActiveFrameId(assetData.id);
                                    localStorage.setItem('active_image_frame_id', assetData.id);
                                }
                                
                                // Update all state trackers that might be using the local ID
                                setFrames(prev => prev.map(f => f.id === newFrameId ? { ...f, id: assetData.id } : f));

                                if (setShotSlots) {
                                  setShotSlots(prev => prev.map(s => s.id === newFrameId ? { 
                                      ...s, 
                                      id: assetData.id, // Transform to permanent DB ID
                                      url: resultUrl, 
                                      thumb: assetData.thumb, 
                                      loading: false 
                                  } : s));
                                }

                                if (typeof activeShotSlotId !== 'undefined' && activeShotSlotId === newFrameId && typeof setActiveShotSlotId !== 'undefined') {
                                    setActiveShotSlotId(assetData.id);
                                }
                            }
                        })
                    }
                }
                
                if (shotCount > 1 && i < shotCount - 1) await new Promise(r => setTimeout(r, 800));
            }
        } catch (err) {
            console.error('Generation error:', err)
            let msg = err.message
            if (msg.toLowerCase().includes('safety system')) msg = "Creative Block: The AI's safety filters flagged this prompt."
            alert(`AI Engine Status: ${msg}`)
        } finally {
            setIsLoading(false)
            setQueueStatus("Initializing...")
        }
    }

    const upscaleImage = async (frameId) => {
        const frame = frames.find(f => f.id === frameId)
        if (!frame || !frame.url) {
            console.error('[2K_UPSCALE] Error: Frame or URL missing', { frameId, frame });
            alert('Upscale failed: Image source not found.');
            return
        }
        const { data: { user } } = await supabase.auth.getUser()

        console.log(`[2K_UPSCALE] Started for frame: ${frameId}`, {
            url: frame.url,
            userId: user?.id || 'anonymous'
        });

        // Cost check BEFORE upscaling
        const res = await spend('image_upscale_4k');
        if (!res || !res.success) {
            if (res?.reason === 'unauthenticated') {
                useAppStore.getState().setShowingAuthModal(true);
            } else if (res?.reason === 'insufficient_funds' || useAppStore.getState().userShorts <= 0) {
                showToast("Insufficient Shorts! Redirecting to pricing...", "info");
                useAppStore.getState().setActiveTab('pricing');
            } else {
                showToast("Upscale could not proceed: " + (res?.reason || "error"));
            }
            return;
        }

        setIsLoading(true)
        setFrames(prev => prev.map(f => f.id === frameId ? { ...f, loading: true } : f))

        try {
            const prompt = frame.prompt || generatedPrompt || 'Cinematic High Fidelity Masterwork'
            const currentSelected = AI_MODELS.find(m => m.id === selectedModel);
            const imageModel = (currentSelected?.type === 'image') 
                ? currentSelected 
                : (AI_MODELS.find(m => m.type === 'image') || AI_MODELS[0]);
            
            const modelToUse = imageModel.modelId || 'gemini-3.1-flash-image-preview';

            const payload = {
                model: modelToUse,
                prompt,
                aspect_ratio: frame.aspectRatio || '16:9',
                quality: qualityOverride || '2k',
                image: frame.url,
                userId: user?.id || null
            }

            console.log('[4K_UPSCALE] Sending payload:', payload);
            const res = await fetch(getApiUrl('/api/generate-image'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            console.log('[4K_UPSCALE] Server response:', data);

            if (!res.ok) throw new Error(data.message || data.error || 'Upscale failed')

            if (data.url) {
                const finalUrl = data.url.startsWith('http') || data.url.startsWith('data:') ? data.url : getApiUrl(data.url);
                const assetData = await saveAsset(finalUrl, frameId, 'image')
                const currentModel = AI_MODELS.find(m => m.id === selectedModel)
                setFrames(prev => prev.map(f => f.id === frameId ? {
                    ...f,
                    url: finalUrl,
                    assetPath: assetData?.path,
                    assetId: assetData?.id,
                    thumb: assetData?.thumb, // Store compressed thumbnail
                    model: currentModel?.modelId || 'gemini-3.1-flash-image-preview',
                    loading: false
                } : f))
                console.log('[4K_UPSCALE] Success! New URL applied.');
            } else {
                throw new Error('Server returned success but URL was missing.');
            }
        } catch (err) {
            console.error('[4K_UPSCALE] Failed:', err);
            alert(`AI Engine Status: ${err.message}`)
            setFrames(prev => prev.map(f => f.id === frameId ? { ...f, loading: false } : f))
        } finally {
            setIsLoading(false)
        }
    }

    const handleCellClick = (row, col) => {
        const img = gridImgRef.current
        if (!img) return
        const cellW = img.naturalWidth / 3
        const cellH = img.naturalHeight / 3
        const canvas = document.createElement('canvas')
        canvas.width = cellW
        canvas.height = cellH
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, col * cellW, row * cellH, cellW, cellH, 0, 0, cellW, cellH)

        // Convert to URL and show in modal — no API needed
        // Using JPEG with high quality to reduce payload size significantly (~1/10th of PNG)
        const croppedUrl = canvas.toDataURL('image/jpeg', 0.9)
        setUpscaledImage(croppedUrl)
    }

    // ── Upscale via Nano Banana 4K ──
    const runAiUpscale = async (targetImage = null, customPrompt = null, targetTray = 'multishot') => {
        const imageToProcess = targetImage || upscaledImage
        if (!imageToProcess) {
            console.error('[CROP_UPSCALE] No image found to upscale.');
            alert('Upscale Error: Please select an image.');
            return
        }

        const newId = `frame-${Date.now()}`;

        // Cost check BEFORE upscaling
        const res = await spend('image_upscale_4k');
        if (!res || !res.success) {
            if (res?.reason === 'unauthenticated') {
                useAppStore.getState().setShowingAuthModal(true);
            } else if (res?.reason === 'insufficient_funds' || useAppStore.getState().userShorts <= 0) {
                showToast("Insufficient Shorts! Redirecting to pricing...", "info");
                useAppStore.getState().setActiveTab('pricing');
            } else {
                showToast("Upscale could not proceed: " + (res?.reason || "error"));
            }
            return;
        }

        console.log('[CROP_UPSCALE] Initiating 2K refinement...');
        setUpscaling(true)

        // ⚡ IMMEDIATE UI RESPONSE: Add placeholder slot RIGHT NOW, before any async work
        // This makes the preview section respond within 1 render frame (<16ms)
        const placeholderSlot = {
            id: newId,
            prompt: '',
            loading: true,
            url: null,
            isGrid: false,
            jobType: 'upscale'
        };
        if (targetTray === 'storyboard') {
            setStoryboardSlots(prev => [...prev, placeholderSlot]);
            setActiveStorySlotId(newId);
        } else {
            setShotSlots(prev => [...prev, placeholderSlot]);
            setActiveShotSlotId(newId);
        }
        // Also push a loading frame so the main film strip shows it
        setFrames(prev => [...prev, { id: newId, url: null, type: 'image', prompt: '', loading: true }]);
        setActiveFrameId(newId);

        try {
            console.log('[CROP_UPSCALE] Checking session...');
            const { data: { user } } = await supabase.auth.getUser()
            console.log('[CROP_UPSCALE] Auth user:', user?.id || 'anonymous');

            // Find the active frame object safely within this scope
            const activeFrame = frames.find(f => f.id === activeFrameId);

            // Resolve the most accurate prompt (original if it's an extraction)
            const resolveBase = customPrompt || activeFrame?.prompt || generatedPrompt || 'Cinematic focal point';
            const basePrompt = resolveBase.includes("extracted from grid") ? generatedPrompt : resolveBase;
            
            // STRICT UPSCALER PROMPT: Forbids the Image-to-Image model from hallucinating entirely new scenes.
            const prompt = `REFINE TO 2K: Upscale this image to high resolution. 
STRICT RULE: Maintain 100% pixel-perfect fidelity to the original subject, lighting, and composition. 
DO NOT add new objects or change the scene. Enhance only.
[Semantic Context: ${basePrompt}]`;

            // ⚠️ FIX: Ensure we use an IMAGE model even if the user has VEO selected in the sidebar
            const currentSelected = AI_MODELS.find(m => m.id === selectedModel);
            const imageModel = (currentSelected?.type === 'image') 
                ? currentSelected 
                : (AI_MODELS.find(m => m.type === 'image') || AI_MODELS[0]);
            
            const modelToUse = imageModel.modelId || 'gemini-3.1-flash-image-preview';

            // Payload Optimization: Max size to prevent 413 Payload Too Large on Railway 
            const compressedImage = await compressImageToMax1024(imageToProcess);

            const payload = {
                model: modelToUse,
                prompt,
                aspect_ratio: '16:9',
                quality: '2k',
                image: compressedImage, // Optimized blob or URL
                userId: user?.id || null
            }

            console.log('[CROP_UPSCALE] Fetching API:', getApiUrl('/api/generate-image'));
            const res = await fetch(getApiUrl('/api/generate-image'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            console.log('[CROP_UPSCALE] Engine result:', data);

            if (!res.ok) throw new Error(data.message || data.error || 'Upscale failed')

            if (data.jobId) {
                // If the backend runs this as a background job (preventing Railway timeout)
                console.log(`[CROP_UPSCALE] Job queued: ${data.jobId}`);
                // Note: frames entry was already added above as a placeholder, just ensure it stays loading
                setUpscaledImage(null);
                pollJobStatus(data.jobId, newId, 'image_upscale_4k', 'image', targetTray);
            } else if (data.url) {
                // If the backend returns it synchronously
                const finalUrl = data.url.startsWith('http') || data.url.startsWith('data:') ? data.url : getApiUrl(data.url);
                console.log(`[CROP_UPSCALE] Creating new asset: ${newId}`);
                const assetData = await saveAsset(finalUrl, newId, 'image')

                const newFrameObj = {
                    id: newId,
                    url: finalUrl,
                    assetPath: assetData?.path,
                    assetId: assetData?.id,
                    thumb: assetData?.thumb, // Store compressed thumbnail
                    type: 'image',
                    model: currentModel?.modelId || 'gemini-3.1-flash-image-preview',
                    prompt,
                    aspectRatio: '16:9',
                    loading: false
                };

                // Update the pre-existing placeholder frame in the film strip (added before async)
                setFrames(prev => prev.map(f => f.id === newId ? {
                    ...f,
                    url: finalUrl,
                    assetPath: assetData?.path,
                    assetId: assetData?.id,
                    thumb: assetData?.thumb,
                    model: currentModel?.modelId,
                    prompt,
                    loading: false
                } : f))

                // Update the appropriate tray for immediate feedback
                if (targetTray === 'storyboard') {
                    setStoryboardSlots(prev => prev.map(s => s.id === newId ? { ...s, url: finalUrl, loading: false } : s));
                } else {
                    setShotSlots(prev => prev.map(s => s.id === newId ? { ...s, url: finalUrl, loading: false } : s));
                }

                setActiveFrameId(newId)

                // Success cleanup (stay in current mode)
                setUpscaledImage(null)

                console.log('[CROP_UPSCALE] Finalized successfully.');
            } else {
                throw new Error('AI Engine reported success but URL or Job ID was missing from the response.');
            }
        } catch (err) {
            console.error('[CROP_UPSCALE] Terminal Failure:', err);
            alert(`AI Upscale Status: ${err.message}`)
            if (targetTray === 'storyboard') {
                setStoryboardSlots(prev => prev.filter(s => s.id !== newId));
            } else {
                setShotSlots(prev => prev.filter(s => s.id !== newId));
            }
        } finally {
            setUpscaling(false)
        }
    }

    const filteredModels = AI_MODELS.filter(m => m.type === (mode === 'multishot' ? 'image' : mode))
    const activeFrame = frames.find(f => f.id === activeFrameId) || null
    // Props bridging for onUpscale (new clean API) + legacy window hook fallback
    const promptGeneratorBridgeProps = (typeof window !== 'undefined' && window.__PROMPTGENERATOR_PROPS__) ? window.__PROMPTGENERATOR_PROPS__ : {}
    const triggerExternalUpscale = async (frame) => {
        const propOnUpscale = typeof promptGeneratorBridgeProps.onUpscale === 'function' ? promptGeneratorBridgeProps.onUpscale : null
        if (typeof propOnUpscale === 'function') {
            try {
                const res = await propOnUpscale(frame)
                if (res) return true
            } catch (e) {
                console.error('[PROMPT-GEN] onUpscale prop failed', e)
            }
        }
        const external = typeof window !== 'undefined' ? window.__PROMPTGENERATOR_ONUPSCALE__ : undefined
        if (typeof external === 'function') {
            try {
                const result = await external(frame)
                if (result) return true
            } catch (e) {
                console.error('[PROMPT-GEN] External onUpscale failed', e)
            }
        }
        return false
    }
    const internalUpscale = async (frameId) => {
        if (!frameId) return
        await upscaleImage(frameId)
    }
    const handleUpscale = async (frame) => {
        if (!frame) return
        const didExternal = await triggerExternalUpscale(frame)
        if (didExternal) return
        await upscaleImage(frame.id)
    }

    // 2K Upscale: new drop-in replacement with frame.assetPath as source
    const compressImageToMax1024 = (src) => {
        return new Promise((resolve, reject) => {
            if (!src) { reject(new Error('No source provided')); return }
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
                const max = 1024
                const w = img.naturalWidth
                const h = img.naturalHeight
                const scale = Math.min(1, max / Math.max(w, h))
                const cw = Math.max(1, Math.floor(w * scale))
                const ch = Math.max(1, Math.floor(h * scale))
                const canvas = document.createElement('canvas')
                canvas.width = cw
                canvas.height = ch
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, cw, ch)
                try {
                    const data = canvas.toDataURL('image/jpeg', 0.92)
                    resolve(data)
                } catch (e) {
                    reject(e)
                }
            }
            img.onerror = (e) => reject(e)
            img.src = src
            // note: potential CORS issues if source not allowed
        })
    }

    const upscaleImageDropIn = async (frameId) => {
        console.debug('[2K_UPSCALE] Start drop-in for frame', frameId);
        const frame = frames.find(f => f.id === frameId)
        if (!frame || !frame.url && !frame.assetPath) {
            alert('Upscale failed: Frame not found.')
            return
        }

        const spendRes = await spend('image_upscale_4k')
        console.debug('[RAILWAY] Upscale cost check response:', spendRes)
        if (!spendRes || !spendRes.success) {
            if (spendRes?.reason === 'unauthenticated') {
                useAppStore.getState().setShowingAuthModal(true)
            } else if (spendRes?.reason === 'insufficient_funds' || useAppStore.getState().userShorts <= 0) {
                showToast("Insufficient Shorts! Redirecting to pricing...", "info");
                useAppStore.getState().setActiveTab('pricing')
            } else {
                showToast("Upscale could not proceed: " + (spendRes?.reason || 'error'))
            }
            return
        }

        setIsLoading(true)
        setFrames(prev => prev.map(f => f.id === frameId ? { ...f, loading: true } : f))

        try {
            const { data: { user } } = await supabase.auth.getUser()
            console.debug('[RAILWAY] Current user from Supabase:', user?.id)

            // Use full-res assetPath if available, else fall back to frame.url
            const sourceUrl = frame.url
            const compressedBase64 = await compressImageToMax1024(sourceUrl)

            // Basic Gemini 3.1-like prompt for upscaling. Modify as needed for your backend.
            const payload = {
                model: 'gemini-3.1-flash-image-preview',
                prompt: `${frame.prompt || 'Cinematic masterpiece'} - 2K high fidelity, micro-texture refinement, cinematic lighting`,
                aspect_ratio: frame.aspectRatio || '16:9',
                quality: '4K',
                image: compressedBase64,
                userId: user?.id || null
            }

            console.log('[4K_UPSCALE] Payload size:', Math.round(JSON.stringify(payload).length / 1024), 'KB')

            const response = await fetch(getApiUrl('/api/generate-image'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            console.debug('[RAILWAY] Upscale /generate-image response OK?', response.ok)

            const data = await response.json()
            console.debug('[RAILWAY] Upscale response data:', data)
            if (!response.ok) throw new Error(data.error || 'Upscale request failed')

            if (data.jobId) {
                setQueueStatus("Enhancing resolution... 30-45 seconds.")
                pollJobStatus(data.jobId, frameId, 'image_upscale_4k', 'image')
            } else if (data.url) {
                await handleUpscaleSuccess(data.url, frameId)
            }
        } catch (err) {
            console.error('[4K_UPSCALE_ERROR]:', err)
            await refund('image_upscale_4k')
            showToast(`2K Error: ${err.message}`)
            setFrames(prev => prev.map(f => f.id === frameId ? { ...f, loading: false } : f))
        } finally {
            setIsLoading(false)
        }
    }

    const handleUpscaleSuccess = async (newUrl, frameId) => {
        // Store thumb for filmstrip performance; also save asset metadata
        const frame = frames.find(f => f.id === frameId)
        if (!frame) return
        const thumb = await compressImageToMax1024(newUrl)
        const assetData = await saveAsset(newUrl, `upscale_${frameId}`, 'image')
        setFrames(prev => prev.map(f => f.id === frameId ? {
            ...f,
            url: newUrl,
            thumb: thumb,
            assetPath: assetData?.path,
            assetId: assetData?.id,
            loading: false,
            is2K: true
        } : f))
    }

    return (
        <div className="h-screen overflow-hidden flex flex-col bg-black px-2 pb-0 pt-0 gap-2">
            {toast && (
                <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
                    <div style={{ background: '#111', color: '#fff', padding: '10px 14px', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,.4)' }}>
                        {toast}
                    </div>
                </div>
            )}
            {/* ─── TOP BAR ─────────────────────────────────────────────── */}
            <div className="relative flex items-center justify-between pt-2 shrink-0">
                {/* ── Left Side: Logo/REC ── */}
                <div className="flex gap-2 items-center z-10">
                    <div className="relative flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
                        <div className="absolute w-4 h-4 rounded-full border border-red-500/20 animate-ping" />
                    </div>
                    <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em] flex items-center gap-2">
                        AI Cinema Vision
                        <span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-[7px] animate-pulse">REC</span>
                    </span>
                </div>

                {/* ── Center: Mode Tabs ── */}
                <div className="absolute inset-x-0 flex justify-center pointer-events-none z-0">
                    <div className="flex border border-white/10 rounded-xl overflow-hidden pointer-events-auto">
                        {[{ id: 'image', label: 'IMAGE', icon: ImageIcon }, { id: 'multishot', label: 'MULTI SHOT', icon: Grid }, { id: 'storyboard', label: 'STORYBOARD', icon: Layers }, { id: 'video', label: 'VIDEO', icon: Film }].map(tab => (
                            <button key={tab.id} onClick={() => {
                                setMode(tab.id);

                                const isImageLike = tab.id === 'image' || tab.id === 'multishot';
                                const currentFrame = frames.find(f => f.id === activeFrameId);
                                const isCompatible = currentFrame && (isImageLike
                                    ? (currentFrame.type === 'image' || currentFrame.type === 'multishot')
                                    : currentFrame.type === tab.id);

                                if (!isCompatible) {
                                    const latestOfTab = frames.find(f => {
                                        if (isImageLike) return (f.type === 'image' || f.type === 'multishot') && f.url;
                                        return f.type === tab.id && f.url;
                                    });
                                    if (latestOfTab) setActiveFrameId(latestOfTab.id);
                                }
                            }} className={cn(
                                "px-4 py-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border-r border-white/5 last:border-r-0",
                                mode === tab.id ? "bg-[#D4FF00] text-black shadow-[0_0_15px_rgba(212,255,0,0.3)]" : "bg-white/[0.03] text-gray-500 hover:text-white hover:bg-white/[0.06]"
                            )}>
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Right Side: Reference Image / Tools ── */}
                <div className="flex gap-3 items-center z-10">
                    {selections.referenceImage && (
                        <div className="relative group w-12 h-8 rounded-lg overflow-hidden border border-purple-500/50">
                            <img src={selections.referenceImage} className="w-full h-full object-cover" />
                            <button onClick={() => setSelections(p => ({ ...p, referenceImage: null }))} className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <X className="w-3 h-3 text-white" />
                            </button>
                        </div>
                    )}
                    <button onClick={copyPrompt} className="text-[#D4FF00]/60 hover:text-[#D4FF00] text-[10px] font-bold flex items-center gap-1.5 transition uppercase" title="Copy generated prompt">
                        <Copy className="w-3.5 h-3.5" /> Copy Prompt
                    </button>
                    {/* ── Gallery Toggle ── */}
                    <button onClick={() => setShowGallery(g => !g)} className={cn(
                        "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all",
                        showGallery ? "border-[#D4FF00] bg-[#D4FF00]/10 text-[#D4FF00]" : "border-white/10 text-gray-500 hover:text-white hover:border-white/20"
                    )}>
                        <LayoutGrid className="w-3.5 h-3.5" /> Gallery
                    </button>
                </div>
            </div>

            {mode === 'storyboard' && (
                <div className="flex-1 min-h-0 flex flex-col gap-2 px-0">
                    <StoryboardView
                        activeFrame={activeFrame}
                        frames={frames}
                        setFrames={setFrames}
                        setActiveFrameId={setActiveFrameId}
                        setMode={setMode}
                        selections={selections}
                        setSelections={setSelections}
                        storyboardSlots={storyboardSlots}
                        setStoryboardSlots={setStoryboardSlots}
                        activeSlotId={activeStorySlotId}
                        setActiveSlotId={setActiveStorySlotId}
                        runAiUpscale={runAiUpscale}
                        upscaling={upscaling}
                        selectedModel={selectedModel}
                        downloadImage={downloadImage}
                    />
                </div>
            )}

            {mode === 'multishot' && (
                <div className="flex-1 min-h-0 flex flex-col gap-2 px-0">
                    <MultiShotView
                        activeFrame={activeFrame}
                        frames={frames}
                        setFrames={setFrames}
                        setActiveFrameId={setActiveFrameId}
                        setMode={setMode}
                        selections={selections}
                        setSelections={setSelections}
                        shotSlots={shotSlots}
                        setShotSlots={setShotSlots}
                        activeSlotId={activeShotSlotId}
                        setActiveSlotId={setActiveShotSlotId}
                        runAiUpscale={runAiUpscale}
                        upscaling={upscaling}
                        selectedModel={selectedModel}
                        refBoard={refBoard}
                    />
                </div>
            )}

            {/* ─── MAIN CONTENT ─ 3-PANEL LAYOUT ──────────────────────── */}
            {(mode === 'image' || mode === 'video') && (
                <div className="flex-1 min-h-0 flex flex-col gap-2">
                    {/* ── PREVIEW PANELS ─────────────────────────── */}
                    <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-2 overflow-y-auto md:overflow-hidden p-1 md:p-0">

                        {/* ── LEFT PREVIEW ──────────────────────────────────── */}
                        <div onClick={() => setRenderTarget('left')}
                            className={cn("shrink-0 md:flex-1 h-32 md:h-full min-w-0 rounded-2xl surface-glass overflow-hidden relative flex items-center justify-center border-2 transition-all cursor-pointer",
                                renderTarget === 'left' ? "border-[#D4FF00] shadow-[0_0_20px_rgba(212,255,0,0.4)]" : "border-transparent hover:border-white/10")}>
                            {(() => {
                                const leftFrame = frames.find(f => f.id === leftPreviewId)
                                if (leftFrame && leftFrame.url) return (
                                    <div className="relative w-full h-full group">
                                        {leftFrame.type === 'video' ? (
                                            <video id="video-preview-left" src={resolveUrl(leftFrame.url)} controls loop crossOrigin="anonymous" className="w-full h-full object-contain" onClick={(e) => e.stopPropagation()} />
                                        ) : (
                                            <img src={resolveUrl(leftFrame.url)} alt="Left Preview" crossOrigin="anonymous" className="w-full h-full object-contain" />
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 z-20 pointer-events-none">
                                            <button onClick={() => setZoomState({ url: leftFrame.url, isOpen: true, slot: leftFrame.id, isEditing: false })} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white pointer-events-auto"><Maximize2 className="w-4 h-4" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); downloadImage(leftFrame.url); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white pointer-events-auto"><Download className="w-4 h-4" /></button>
                                            {leftFrame.type === 'video' ? (
                                                <button onClick={(e) => { e.stopPropagation(); takeScreenshot('left'); }} className="px-2 py-1.5 bg-[#D4FF00] hover:bg-white rounded text-black text-[9px] font-black uppercase pointer-events-auto flex items-center gap-1" title="Capture Frame"><Camera className="w-3 h-3" /> Shot</button>
                                            ) : (
                                                <button onClick={() => setSelections(p => ({ ...p, referenceImage: leftFrame.url }))} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white pointer-events-auto" title="Set as Ref"><ImagePlus className="w-4 h-4" /></button>
                                            )}
                                            <button onClick={() => setLeftPreviewId(null)} className="p-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-white pointer-events-auto" title="Unpin"><X className="w-4 h-4" /></button>
                                        </div>
                                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#D4FF00]/80 text-black text-[7px] font-black uppercase rounded-md pointer-events-none">Left</div>
                                    </div>
                                )
                                return (
                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                        <ImageIcon className="w-8 h-8 text-white" />
                                        <p className="text-[9px] font-bold text-white uppercase">Scene Left</p>
                                        <p className="text-[7px] text-white/60">Click "L" on a scene</p>
                                    </div>
                                )
                            })()}
                        </div>

                        {/* ── CENTER PREVIEW (Main) ─────────────────────────── */}
                        <div onClick={() => setRenderTarget('center')}
                            className={cn("flex-[2] md:flex-1 min-h-[300px] md:min-h-0 min-w-0 rounded-2xl surface-glass overflow-hidden relative flex items-center justify-center border-2 transition-all cursor-pointer",
                                renderTarget === 'center' ? "border-[#D4FF00] shadow-[0_0_20px_rgba(212,255,0,0.4)]" : "border-transparent hover:border-white/10")}>
                            {activeFrame ? (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    {activeFrame.loading ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <Sparkles className="w-8 h-8 text-[#D4FF00] animate-spin" />
                                            <p className="text-[10px] font-bold text-white uppercase animate-pulse">
                                                {queueStatus}
                                            </p>
                                        </div>
                                    ) : activeFrame.error ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <X className="w-8 h-8 text-red-500" />
                                            <p className="text-[10px] font-bold text-red-400 uppercase">Generation Failed</p>
                                        </div>
                                    ) : activeFrame.url ? (
                                        <div className="relative w-full h-full group">
                                            {activeFrame.type === 'video' ? (
                                                <video id="video-preview-center" src={resolveUrl(activeFrame.url)} controls autoPlay loop muted crossOrigin="anonymous" className="w-full h-full object-contain" onClick={(e) => e.stopPropagation()} />
                                            ) : (
                                                <div className="relative w-full h-full flex items-center justify-center">
                                                    <img ref={activeFrame.type === 'multishot' ? gridImgRef : null} src={resolveUrl(activeFrame.url)} alt="Generated" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                                    {/* 3x3 Grid Overlay - Only active in MULTISHOT interface mode or for multishot types if needed, but per user request let's make it flexible */}
                                                    {(mode === 'multishot' || activeFrame.type === 'multishot') && (
                                                        <div className="absolute inset-0 flex items-center justify-center z-10">
                                                            <div className="w-full h-full grid grid-cols-3 grid-rows-3" style={{ pointerEvents: 'auto' }}>
                                                                {[...Array(9)].map((_, i) => (
                                                                    <div key={i} onClick={() => handleCellClick(Math.floor(i / 3), i % 3)}
                                                                        className="cursor-pointer border border-white/5 transition-all flex items-center justify-center group/cell hover:bg-white/[0.15]"
                                                                        onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.15)'}
                                                                        onMouseLeave={e => e.target.style.background = 'transparent'}>
                                                                        <span className="text-[8px] font-black text-white/0 group-hover/cell:text-white/40 uppercase">
                                                                            {['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR'][i]}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 z-20 pointer-events-none">
                                                <button onClick={() => setZoomState({ url: activeFrame.url, isOpen: true, slot: activeFrame.id, isEditing: false })} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white pointer-events-auto"><Maximize2 className="w-4 h-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); downloadImage(activeFrame.url); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white pointer-events-auto"><Download className="w-4 h-4" /></button>

                                                {(activeFrame && (activeFrame.type === 'image' || activeFrame.type === 'multishot') && activeFrame.model !== 'gemini-3-pro-image-preview') && (
                                                    <button
                                                        onClick={() => handleUpscale(activeFrame)}
                                                        className="px-3 py-2 bg-[#D4AF37] hover:bg-yellow-400 rounded-lg text-black text-[9px] font-black uppercase flex items-center gap-1 pointer-events-auto"
                                                        disabled={!(activeFrame?.url || activeFrame?.assetPath)}
                                                        aria-disabled={!(activeFrame?.url || activeFrame?.assetPath)}
                                                        title={!(activeFrame?.url || activeFrame?.assetPath) ? 'No image available for upscaling' : 'Upscale to 2K'}
                                                    >
                                                        <Sparkles className="w-3 h-3" /> 2K
                                                    </button>
                                                )}

                                                {activeFrame.type === 'video' ? (
                                                    <button onClick={(e) => { e.stopPropagation(); takeScreenshot('center'); }} className="px-2 py-1.5 bg-[#D4FF00] hover:bg-white rounded text-black text-[9px] font-black uppercase pointer-events-auto flex items-center gap-1" title="Capture Frame"><Camera className="w-3 h-3" /> Shot</button>
                                                ) : (
                                                    <button onClick={() => setSelections(p => ({ ...p, referenceImage: activeFrame.url }))} className="p-2 bg-cyan-500/20 hover:bg-cyan-400 text-cyan-400 hover:text-black rounded-lg pointer-events-auto transition-all" title="Set as Ref"><ImagePlus className="w-4 h-4" /></button>
                                                )}

                                                {(activeFrame.type === 'image' || activeFrame.type === 'multishot') && (
                                                    <>
                                                        <button onClick={() => { setSelections(p => ({ ...p, firstFrame: activeFrame.url })); setMode('video') }} className="px-2 py-2 bg-[#D4FF00] hover:bg-white rounded-lg text-black text-[9px] font-black uppercase flex items-center gap-1 pointer-events-auto"><Film className="w-3 h-3" /> First</button>
                                                        <button onClick={() => { setSelections(p => ({ ...p, lastFrame: activeFrame.url })); setMode('video') }} className="px-2 py-2 bg-purple-500 hover:bg-purple-400 rounded-lg text-white text-[9px] font-black uppercase flex items-center gap-1 pointer-events-auto"><FastForward className="w-3 h-3" /> Last</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 opacity-20"><Sparkles className="w-8 h-8 text-white" /><p className="text-[10px] font-bold text-white uppercase">Waiting for Input</p></div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3 opacity-20">
                                    <Sparkles className="w-12 h-12 text-white" />
                                    <p className="text-sm font-bold text-white uppercase">Generate your first scene</p>
                                    <p className="text-[10px] text-white/60">Configure settings below and hit Render</p>
                                </div>
                            )}
                        </div>

                        {/* ── RIGHT PREVIEW ─────────────────────────────────── */}
                        <div onClick={() => setRenderTarget('right')}
                            className={cn("shrink-0 md:flex-1 h-32 md:h-full min-w-0 rounded-2xl surface-glass overflow-hidden relative flex items-center justify-center border-2 transition-all cursor-pointer",
                                renderTarget === 'right' ? "border-[#D4FF00] shadow-[0_0_20px_rgba(212,255,0,0.4)]" : "border-transparent hover:border-white/10")}>
                            {(() => {
                                const rightFrame = frames.find(f => f.id === rightPreviewId)
                                if (rightFrame && rightFrame.url) return (
                                    <div className="relative w-full h-full group">
                                        {rightFrame.type === 'video' ? (
                                            <video id="video-preview-right" src={resolveUrl(rightFrame.url)} controls loop crossOrigin="anonymous" className="w-full h-full object-contain" onClick={(e) => e.stopPropagation()} />
                                        ) : (
                                            <img src={resolveUrl(rightFrame.url)} alt="Right Preview" crossOrigin="anonymous" className="w-full h-full object-contain" />
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 z-20 pointer-events-none">
                                            <button onClick={() => setZoomState({ url: rightFrame.url, isOpen: true, slot: rightFrame.id, isEditing: false })} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white pointer-events-auto"><Maximize2 className="w-4 h-4" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); downloadImage(rightFrame.url); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white pointer-events-auto"><Download className="w-4 h-4" /></button>
                                            {rightFrame.type === 'video' ? (
                                                <button onClick={(e) => { e.stopPropagation(); takeScreenshot('right'); }} className="px-2 py-1.5 bg-[#D4FF00] hover:bg-white rounded text-black text-[9px] font-black uppercase pointer-events-auto flex items-center gap-1" title="Capture Frame"><Camera className="w-3 h-3" /> Shot</button>
                                            ) : (
                                                <button onClick={() => setSelections(p => ({ ...p, referenceImage: rightFrame.url }))} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white pointer-events-auto" title="Set as Ref"><ImagePlus className="w-4 h-4" /></button>
                                            )}
                                            <button onClick={() => setRightPreviewId(null)} className="p-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-white pointer-events-auto" title="Unpin"><X className="w-4 h-4" /></button>
                                        </div>
                                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-purple-500/80 text-white text-[7px] font-black uppercase rounded-md pointer-events-none">Right</div>
                                    </div>
                                )
                                return (
                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                        <ImageIcon className="w-8 h-8 text-white" />
                                        <p className="text-[9px] font-bold text-white uppercase">Scene Right</p>
                                        <p className="text-[7px] text-white/60">Click "R" on a scene</p>
                                    </div>
                                )
                            })()}
                        </div>
                    </div>

                    {/* ── FILM ROLL STRIP (Full Width) ─────────────────────── */}
                    <div 
                        ref={mainFilmStripRef}
                        onScroll={handleMainFilmStripScroll}
                        className="shrink-0 h-16 surface-glass rounded-xl p-1 flex gap-1 overflow-x-auto custom-scrollbar"
                    >
                        {/* VIDEO MODE: START/END SLOTS & CONTROLS (AT START) */}
                        {mode === 'video' && (
                            <>
                                {/* START FRAME SLOT */}
                                <input type="file" accept="image/*" className="hidden" ref={startFrameInputRef} onChange={(e) => handleFrameUpload(e, 'firstFrame')} />
                                <div onClick={() => !selections.firstFrame && startFrameInputRef.current?.click()} className={cn("shrink-0 w-24 h-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group/frame transition-all",
                                    selections.firstFrame ? "bg-[#D4FF00]/10 border-[#D4FF00]/40 shadow-[0_0_10px_rgba(212,255,0,0.2)]" : "bg-lime-500/5 border-lime-500/20 hover:border-lime-500/40 cursor-pointer")}>
                                    {selections.firstFrame ? (
                                        <>
                                            <img src={resolveUrl(selections.firstFrame)} className="absolute inset-0 w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/frame:opacity-100 flex items-center justify-center transition-all">
                                                <button onClick={(e) => { e.stopPropagation(); setSelections(p => ({ ...p, firstFrame: null })) }} className="p-1 px-1.5 bg-red-500 rounded text-white text-[10px] font-black uppercase shadow-lg">X</button>
                                            </div>
                                            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#D4FF00] text-black text-[6px] font-black uppercase rounded shadow-sm">Start</div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-0.5 opacity-30 group-hover/frame:opacity-60 transition-opacity">
                                            <ImageIcon className="w-3.5 h-3.5 text-lime-400" />
                                            <span className="text-[6px] font-black text-lime-400 uppercase tracking-tighter">Upload Start</span>
                                        </div>
                                    )}
                                </div>

                                {/* END FRAME SLOT */}
                                <input type="file" accept="image/*" className="hidden" ref={endFrameInputRef} onChange={(e) => handleFrameUpload(e, 'lastFrame')} />
                                <div onClick={() => !selections.lastFrame && endFrameInputRef.current?.click()} className={cn("shrink-0 w-24 h-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group/frame transition-all",
                                    selections.lastFrame ? "bg-purple-500/10 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]" : "bg-purple-500/5 border-purple-500/20 hover:border-purple-500/40 cursor-pointer")}>
                                    {selections.lastFrame ? (
                                        <>
                                            <img src={resolveUrl(selections.lastFrame)} className="absolute inset-0 w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/frame:opacity-100 flex items-center justify-center transition-all">
                                                <button onClick={(e) => { e.stopPropagation(); setSelections(p => ({ ...p, lastFrame: null })) }} className="p-1 px-1.5 bg-red-500 rounded text-white text-[10px] font-black uppercase shadow-lg">X</button>
                                            </div>
                                            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-purple-500 text-white text-[6px] font-black uppercase rounded shadow-sm">End</div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-0.5 opacity-30 group-hover/frame:opacity-60 transition-opacity">
                                            <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                                            <span className="text-[6px] font-black text-purple-400 uppercase tracking-tighter">Upload End</span>
                                        </div>
                                    )}
                                </div>

                                {/* MODE INDICATOR — slim vertical line only */}
                                {(() => {
                                    const hasFirst = !!(selections.firstFrame && selections.firstFrame !== 'loading');
                                    const hasLast = !!(selections.lastFrame && selections.lastFrame !== 'loading');
                                    const colorClass = (hasFirst && hasLast)
                                        ? 'bg-purple-500'
                                        : hasFirst
                                            ? 'bg-[#D4FF00]'
                                            : 'bg-white/10';
                                    return <div className={`shrink-0 h-full w-1 rounded-full ${colorClass} transition-all`} />;
                                })()}

                            </>
                        )}

                        {frames.some(f => !f.url && !f.loading) && (
                            <button onClick={() => setFrames(prev => prev.filter(f => f.url || f.loading))}
                                className="shrink-0 w-10 h-full rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex flex-col items-center justify-center gap-0.5 transition-all group"
                                title="Clear all failed frames">
                                <RefreshCw className="w-3 h-3 text-red-500/40 group-hover:text-red-500 transition-colors" />
                                <span className="text-[5px] font-black text-red-500/40 uppercase group-hover:text-red-500">Clear</span>
                            </button>
                        )}
                        {frames.filter(frame => {
                            const isImageLike = mode === 'image' || mode === 'multishot';
                            if (isImageLike) return (frame.type === 'image' || frame.type === 'multishot');
                            if (mode === 'video') return (frame.type === 'video' || frame.model === 'Shot');
                            return frame.type === mode;
                        }).map(frame => (
                            <div key={frame.id} className={cn("shrink-0 w-20 h-full rounded-lg overflow-hidden cursor-pointer transition-all border-2 relative group/strip", activeFrameId === frame.id ? "border-[#D4FF00] shadow-[0_0_10px_#D4FF00]" : "border-transparent hover:border-white/20")}>
                                <div onClick={() => setActiveFrameId(frame.id)} className="w-full h-full">
                                    {frame.loading ? <div className="w-full h-full bg-black/40 flex items-center justify-center"><Sparkles className="w-3 h-3 text-[#D4FF00] animate-spin" /></div>
                                        : frame.url ? (frame.type === 'video' ? <video src={frame.url} muted preload="metadata" crossOrigin="anonymous" className="w-full h-full object-cover" /> : <img src={frame.thumb || frame.url} loading="lazy" decoding="async" className="w-full h-full object-cover" />)
                                            : <div className="w-full h-full bg-black/40 flex items-center justify-center"><X className="w-3 h-3 text-red-500/50" /></div>}
                                </div>

                                <button onClick={(e) => { e.stopPropagation(); removeFrame(frame.id) }}
                                    className="absolute top-1 right-1 p-0.5 bg-red-500/80 rounded-md text-white opacity-0 group-hover/strip:opacity-100 transition-opacity z-10"
                                    title="Remove Frame">
                                    <X className="w-2 h-2" />
                                </button>

                                {frame.url && !frame.loading && (
                                    <div className="absolute bottom-0 inset-x-0 flex opacity-0 group-hover/strip:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); setLeftPreviewId(frame.id) }} className="flex-1 bg-[#D4FF00]/80 text-black text-[6px] font-black py-0.5 hover:bg-[#D4FF00]" title="Pin to Left Preview">L</button>
                                        <button onClick={(e) => { e.stopPropagation(); setRightPreviewId(frame.id) }} className="flex-1 bg-purple-500/80 text-white text-[6px] font-black py-0.5 hover:bg-purple-500" title="Pin to Right Preview">R</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}



            {/* ─── SETTINGS PANEL ──────────────────────────────────────── */}
            {(mode === 'image' || mode === 'video') && (
                <div className={cn("shrink-0 surface-glass rounded-2xl p-2 md:pb-4 relative z-30 transition-all", 
                    mentionSearch !== null && "shadow-[0_0_50px_rgba(0,0,0,0.5)]",
                    (showSpeedPanel || mentionSearch !== null || activeDropdown !== null) ? "overflow-visible" : "overflow-hidden"
                )} style={{ maxHeight: '40vh' }}>
                    <div className={cn(
                        "pr-2 pb-16 space-y-2 custom-scrollbar overflow-x-visible",
                        (mentionSearch !== null || showSpeedPanel || activeDropdown !== null) ? "overflow-y-visible" : "overflow-y-auto max-h-[calc(40vh-16px)]"
                    )}>
                        <div className="flex flex-col md:flex-row gap-2 items-stretch min-h-[84px] relative">
                            {mode === 'video' && (isKling ? <KlingShotBuilder selections={selections} setSelections={setSelections} /> : <TimestampMultiShot selections={selections} setSelections={setSelections} setShowRefBoard={setShowRefBoard} allRefItems={allRefItems} setMentionSearch={setMentionSearch} setMentionField={setMentionField} setMentionCursorPos={setMentionCursorPos} />)}

                            {isKling ? (
                                <KlingCharacterLayer
                                    selections={selections}
                                    handleTextChange={handleTextChange}
                                    setShowRefBoard={setShowRefBoard}
                                    mentionSearch={mentionSearch}
                                    setMentionSearch={setMentionSearch}
                                    allRefItems={allRefItems}
                                    selectMention={selectMention}
                                />
                            ) : (
                                <VideoNarrativeComponents
                                    mode={mode}
                                    isNanoBanana={isNanoBanana}
                                    isVeo={isVeo}
                                    allRefItems={allRefItems}
                                    setShowRefBoard={setShowRefBoard}
                                    selections={selections}
                                    handleTextChange={handleTextChange}
                                    mentionSearch={mentionSearch}
                                    setMentionSearch={setMentionSearch}
                                    mentionField={mentionField}
                                    selectMention={selectMention}
                                    textareaRef={textareaRef}
                                    handleRefinePrompt={handleRefinePrompt}
                                    isPolishing={isPolishing}
                                    setStagedRefBoard={setStagedRefBoard}
                                    refBoard={refBoard}
                                />
                            )}
                            <div className="shrink-0 flex flex-col gap-1.5 w-full md:w-52">
                                <button onClick={generateImage} disabled={isLoading}
                                    className={cn("w-full rounded-[20px] flex flex-col items-center justify-center gap-1 transition-all active:scale-95 h-20",
                                        isLoading ? "bg-white/5 cursor-not-allowed" : "bg-[#D4FF00] hover:bg-white hover:shadow-[0_0_30px_rgba(212,255,0,0.3)]")}
                                >
                                    <Zap className={cn("w-6 h-6 text-black", isLoading && "animate-pulse")} />
                                    <span className="text-sm font-black text-black uppercase tracking-tighter">
                                        {isLoading ? 'Computing...' : mode === 'video' ? 'Generate Video' : 'Generate Image'}
                                    </span>
                                    {!isLoading && (() => {
                                        const { totalCost } = getCurrentCost();
                                        return (
                                            <span className="text-[10px] font-bold text-black/60 flex items-center gap-1 uppercase tracking-widest mt-0.5">
                                                <Film className="w-3 h-3" /> {totalCost} Shorts
                                            </span>
                                        )
                                    })()}
                                </button>

                                {/* MODERN DROP-UP CONTROLS ROW */}
                                {mode === 'video' && (
                                    <div className="flex items-center gap-2 overflow-visible py-2 border-t border-white/5 mt-2 relative z-40">
                                        {/* ENGINE DROP-UP */}
                                        <div className="relative">
                                            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.18em] mb-1 px-1 flex items-center gap-1.5">
                                                <Zap className="w-2 h-2 text-[#AADD00]" /> Engine
                                            </span>
                                            <button 
                                                onClick={() => setActiveDropdown(activeDropdown === 'engine' ? null : 'engine')}
                                                className={cn(
                                                    "bg-white/[0.03] border border-white/5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase text-white hover:bg-white/10 transition-all flex items-center gap-2",
                                                    activeDropdown === 'engine' && "border-[#AADD00]/50 bg-[#AADD00]/5"
                                                )}
                                            >
                                                {selectedModel === 'veo3_fast' ? 'Veo Fast' : selectedModel === 'veo-fast' ? 'Veo Fast' : selectedModel === 'veo' ? 'Veo Pro' : 'Kling'}
                                                <ChevronDown className={cn("w-2.5 h-2.5 text-white/30 transition-transform", activeDropdown === 'engine' && "rotate-180")} />
                                            </button>
                                            <AnimatePresence>
                                                {activeDropdown === 'engine' && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        className="absolute bottom-full left-0 mb-2 w-32 bg-[#141414] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-[100] p-1"
                                                    >
                                                        {filteredModels.map(m => (
                                                            <button
                                                                key={m.id}
                                                                disabled={!m.available}
                                                                onClick={() => { setSelectedModel(m.id); setActiveDropdown(null); }}
                                                                className={cn(
                                                                    "w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all",
                                                                    selectedModel === m.id ? "bg-[#AADD00] text-black" : "text-white/60 hover:bg-white/5 hover:text-white",
                                                                    !m.available && "opacity-30 cursor-not-allowed"
                                                                )}
                                                            >
                                                                {m.name}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* RATIO DROP-UP */}
                                        <div className="relative">
                                            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.18em] mb-1 px-1 flex items-center gap-1.5">
                                                <Square className="w-2 h-2 text-purple-400" /> Ratio
                                            </span>
                                            <button 
                                                onClick={() => setActiveDropdown(activeDropdown === 'ratio' ? null : 'ratio')}
                                                className={cn(
                                                    "bg-white/[0.03] border border-white/5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase text-white hover:bg-white/10 transition-all flex items-center gap-2",
                                                    activeDropdown === 'ratio' && "border-purple-500/50 bg-purple-500/5"
                                                )}
                                            >
                                                {selections.aspectRatio}
                                                <ChevronDown className={cn("w-2.5 h-2.5 text-white/30 transition-transform", activeDropdown === 'ratio' && "rotate-180")} />
                                            </button>
                                            <AnimatePresence>
                                                {activeDropdown === 'ratio' && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        className="absolute bottom-full left-0 mb-2 w-32 bg-[#141414] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-[100] p-1"
                                                    >
                                                        {['16:9', '9:16', '1:1', '4:3'].map(opt => (
                                                            <button
                                                                key={opt}
                                                                onClick={() => { updateVideoSetting('aspectRatio', opt); setActiveDropdown(null); }}
                                                                className={cn(
                                                                    "w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all",
                                                                    selections.aspectRatio === opt ? "bg-purple-500 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                                                                )}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* DURATION DROP-UP */}
                                        <div className="relative">
                                            <span className={cn("text-[8px] font-black uppercase tracking-[0.18em] mb-1 px-1 flex items-center gap-1.5", 
                                                (!isKling && !!selections.lastFrame) ? "text-[#AADD00]" : "text-white/30")}>
                                                <Timer className="w-2 h-2" /> {!isKling && !!selections.lastFrame ? "FIXED" : "DUR"}
                                            </span>
                                            <button 
                                                disabled={!isKling && !!selections.lastFrame}
                                                onClick={() => setActiveDropdown(activeDropdown === 'duration' ? null : 'duration')}
                                                className={cn(
                                                    "bg-white/[0.03] border border-white/5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase text-white hover:bg-white/10 transition-all flex items-center gap-2",
                                                    activeDropdown === 'duration' && "border-[#AADD00]/50 bg-[#AADD00]/5",
                                                    (!isKling && !!selections.lastFrame) && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                {!isKling && !!selections.lastFrame ? '8s' : selections.duration.replace(' Seconds', 's')}
                                                <ChevronDown className={cn("w-2.5 h-2.5 text-white/30 transition-transform", activeDropdown === 'duration' && "rotate-180")} />
                                            </button>
                                            <AnimatePresence>
                                                {activeDropdown === 'duration' && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        className="absolute bottom-full left-0 mb-2 w-32 bg-[#141414] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-[100] p-1"
                                                    >
                                                        {(isKling 
                                                            ? [{ id: '5 Seconds', label: '5s' }, { id: '10 Seconds', label: '10s' }]
                                                            : [{ id: '4 Seconds', label: '4s' }, { id: '6 Seconds', label: '6s' }, { id: '8 Seconds', label: '8s' }]
                                                        ).map(opt => (
                                                            <button
                                                                key={opt.id}
                                                                onClick={() => { updateVideoSetting('duration', opt.id); setActiveDropdown(null); }}
                                                                className={cn(
                                                                    "w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all",
                                                                    selections.duration === opt.id ? "bg-[#AADD00] text-black" : "text-white/60 hover:bg-white/5 hover:text-white"
                                                                )}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* RESOLUTION DROP-UP */}
                                        <div className="relative">
                                            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.18em] mb-1 px-1 flex items-center gap-1.5">
                                                <Maximize2 className="w-2 h-2 text-emerald-400" /> Res
                                            </span>
                                            <button 
                                                onClick={() => setActiveDropdown(activeDropdown === 'res' ? null : 'res')}
                                                className={cn(
                                                    "bg-white/[0.03] border border-white/5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase text-white hover:bg-white/10 transition-all flex items-center gap-2",
                                                    activeDropdown === 'res' && "border-emerald-500/50 bg-emerald-500/5"
                                                )}
                                            >
                                                {selections.resolution.toUpperCase()}
                                                <ChevronDown className={cn("w-2.5 h-2.5 text-white/30 transition-transform", activeDropdown === 'res' && "rotate-180")} />
                                            </button>
                                            <AnimatePresence>
                                                {activeDropdown === 'res' && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        className="absolute bottom-full left-0 mb-2 w-32 bg-[#141414] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-[100] p-1"
                                                    >
                                                        {['720p', '1080p', '2K'].map(opt => (
                                                            <button
                                                                key={opt}
                                                                onClick={() => { updateVideoSetting('resolution', opt); setActiveDropdown(null); }}
                                                                className={cn(
                                                                    "w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all",
                                                                    selections.resolution === opt ? "bg-emerald-500 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                                                                )}
                                                            >
                                                                {opt.toUpperCase()}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {mode === 'video' ? (
                            <div className="space-y-1">
                                {/* ── COMPACT PILL CONTROL BAR ───────────────────────────────── */}
                                <div className="relative z-[100]">
                                    <div
                                        className="flex items-center gap-1.5 overflow-visible pb-1"
                                    >
                                        {/* ENGINE REMOVED - NOW IN DROP-UP ROW */}

                                        {/* DIVIDER */}
                                        <div className="w-px h-6 bg-white/8 shrink-0" />

                                        {/* VIDEO CONTROL PILLS */}
                                        {VIDEO_CONTROLS.filter(c => !['duration', 'resolution', 'aspectRatio', 'dialogue', 'audio'].includes(c.key)).map(ctrl => {
                                            const val = selections[ctrl.key]

                                            // Icon mapping for "Evolved" pill bar
                                            const ctrlIcons = {
                                                'cameraMovement': Video,
                                                'speedRamp': FastForward,
                                                'emotion': Sun,
                                                'lens': Camera,
                                                'artisticStyle': Sparkles,
                                                'audio': Mic,
                                                'duration': Timer,
                                                'resolution': Maximize,
                                                'aspectRatio': Square,
                                                'pacing': Clock,
                                            }
                                            const Icon = ctrlIcons[ctrl.key]

                                            if (ctrl.key === 'speedRamp') return (
                                                <div key={ctrl.key} className="relative z-[150] flex flex-col items-start shrink-0">
                                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.15em] mb-0.5 px-1 flex items-center gap-1">
                                                        {Icon && <Icon className="w-1.5 h-1.5" />} {ctrl.label}
                                                    </span>
                                                    <button
                                                        onClick={() => setShowSpeedPanel(!showSpeedPanel)}
                                                        className={cn(
                                                            "flex items-center gap-1 border rounded-full pl-3 pr-2 py-1 text-[10px] font-semibold text-white transition-all",
                                                            showSpeedPanel
                                                                ? "bg-white/15 border-white/30"
                                                                : "bg-white/[0.06] hover:bg-white/10 border-white/10 hover:border-white/20"
                                                        )}
                                                    >
                                                        <span className="whitespace-nowrap">{val}</span>
                                                        <ChevronDown className="w-2.5 h-2.5 text-white/30 shrink-0" />
                                                    </button>
                                                    {showSpeedPanel && (
                                                        <div className="absolute bottom-full left-0 mb-3 z-[500] bg-[#0d0d0d] border border-white/10 rounded-2xl p-4 w-[320px] max-w-[90vw] grid grid-cols-3 gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                                                            {ctrl.options.map(opt => (
                                                                <div
                                                                    key={opt}
                                                                    onClick={() => { updateVideoSetting('speedRamp', opt); setShowSpeedPanel(false) }}
                                                                    className={cn("p-2 rounded-xl border cursor-pointer text-center", val === opt ? "bg-[#D4FF00]/10 border-[#D4FF00]/40" : "bg-white/5 border-white/5 hover:border-white/20")}
                                                                >
                                                                    <SpeedRampCurve name={opt} active={val === opt} />
                                                                    <div className={cn("text-[8px] mt-2 uppercase font-black", val === opt ? "text-[#D4FF00]" : "text-white/30")}>{opt}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )

                                            const options = ctrl.key === 'lighting'
                                                ? ["Default", "Cinematic", "Natural Daylight", "Neon Cyberpunk", "Golden Hour", "Studio Pro", "Chiaroscuro"]
                                                : ctrl.key === 'duration' && isKling
                                                    ? ['5 Seconds', '10 Seconds']
                                                    : ctrl.options

                                            const displayVal = ctrl.key === 'duration'
                                                ? val?.replace(' Seconds', 's')
                                                : val;

                                            // Pills with long option texts get capped so they don't bloat the bar
                                            const isWidePill = ['emotion', 'artisticStyle', 'lens', 'pacing'].includes(ctrl.key)
                                            const isDurationLocked = ctrl.key === 'duration' && !isKling && !!selections.lastFrame;

                                            return (
                                                <div key={ctrl.key} className="flex flex-col items-start shrink-0">
                                                    <span className={cn("text-[8px] font-black uppercase tracking-[0.15em] mb-0.5 px-1 flex items-center gap-1", 
                                                        isDurationLocked ? "text-[#D4FF00]" : "text-gray-600")}>
                                                        {Icon && <Icon className="w-1.5 h-1.5" />} 
                                                        {ctrl.label} {isDurationLocked && "(8s Locked)"}
                                                    </span>
                                                    <div className="relative" style={isWidePill ? { maxWidth: '85px' } : {}}>
                                                        <select
                                                            disabled={isDurationLocked}
                                                            value={isDurationLocked ? "8 Seconds" : val}
                                                            onChange={e => updateVideoSetting(ctrl.key, e.target.value)}
                                                            className={cn(
                                                                "appearance-none bg-white/[0.06] hover:bg-white/10 border transition-all cursor-pointer focus:outline-none focus:border-white/30 rounded-full pl-3 pr-6 py-1 text-[10px] font-semibold text-white",
                                                                isDurationLocked ? "border-[#D4FF00]/40 opacity-80 cursor-not-allowed" : "border-white/10 hover:border-white/20"
                                                            )}
                                                            style={{ minWidth: 0, width: isWidePill ? '85px' : 'auto' }}
                                                        >
                                                            {options.map(o => <option key={o} value={o} className="bg-[#111]">{ctrl.key === 'duration' ? o.replace(' Seconds', 's') : o}</option>)}
                                                        </select>
                                                        {!isDurationLocked && <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white/30 pointer-events-none" />}
                                                        {isDurationLocked && <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 text-[#D4FF00] pointer-events-none" />}
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        {/* DIVIDER */}
                                        <div className="w-px h-6 bg-white/8 shrink-0" />

                                        {/* PRO LIGHTING / KLING AUDIO */}
                                        <div className="shrink-0 flex items-center gap-1.5">
                                            {isKling ? <KlingAudioMode /> : <ProLighting selections={selections} setSelections={setSelections} />}
                                            
                                            
                                            {/* AUDIO DIRECTION BUTTON (Converted to Pill) */}
                                            <div className="flex flex-col items-start shrink-0">
                                                <span className="text-[8px] font-black text-transparent select-none mb-0.5 px-1 flex items-center gap-1">
                                                    <Mic className="w-1.5 h-1.5 opacity-0" /> Audio
                                                </span>
                                                <div className="relative">
                                                    <button
                                                    onClick={() => setActiveDropdown(activeDropdown === 'audio' ? null : 'audio')}
                                                    className={cn("h-7 px-3 bg-purple-500/5 hover:bg-purple-500/10 border rounded-full flex items-center gap-2 transition-all group shrink-0",
                                                        activeDropdown === 'audio' ? "border-purple-500 bg-purple-500/20" : "border-white/10 hover:border-white/20")}
                                                >
                                                    <Mic className={cn("w-3.5 h-3.5 transition-colors", activeDropdown === 'audio' ? "text-[#D4FF00]" : "text-purple-400")} />
                                                    <span className={cn("text-[9px] font-black uppercase tracking-widest transition-colors", activeDropdown === 'audio' ? "text-white" : "text-purple-400/60 group-hover:text-purple-400")}>Audio Layer</span>
                                                </button>

                                                {activeDropdown === 'audio' && (
                                                    <div className="absolute bottom-full right-0 mb-3 z-[500] bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-4 w-[480px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] border-purple-500/20">
                                                        <div className="flex items-center justify-between mb-4 px-1">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                                                                    <Mic className="w-4 h-4 text-purple-400" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-black text-white uppercase tracking-widest">Multi-Track Audio Engine</p>
                                                                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-tighter mt-0.5">Veo 3.1 & Kling 3.0 Synced</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#D4FF00]/10 border border-[#D4FF00]/20 rounded-xl">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
                                                                <span className="text-[9px] font-black text-[#D4FF00] uppercase tracking-tighter">Live Monitor</span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {[
                                                                { id: 'dialogue', label: 'Dialogue', icon: Mic, placeholder: 'What they say...' },
                                                                { id: 'sfx', label: 'SFX', icon: Zap, placeholder: 'Crunch, bang, splash...' },
                                                                { id: 'ambient', label: 'Ambient', icon: Sun, placeholder: 'Rain, wind, crowd...' },
                                                                { id: 'music', label: 'Music', icon: Music, placeholder: 'Genre, mood, instruments...' }
                                                            ].map(item => (
                                                                <div key={item.id} className={cn("space-y-2 group transition-all p-3 rounded-2xl border bg-black/40",
                                                                    selections.audioActive?.[item.id] ? "border-purple-500/30 ring-1 ring-purple-500/10" : "border-white/5")}>
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <item.icon className={cn("w-3.5 h-3.5", selections.audioActive?.[item.id] ? "text-purple-400" : "text-white/20")} />
                                                                            <span className={cn("text-[10px] font-black uppercase tracking-widest", selections.audioActive?.[item.id] ? "text-white" : "text-white/20")}>{item.label}</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelections(p => ({
                                                                                    ...p,
                                                                                    audioActive: { ...p.audioActive, [item.id]: !p.audioActive?.[item.id] }
                                                                                }))
                                                                            }}
                                                                            className={cn("w-6 h-3.5 rounded-full relative transition-all border shrink-0",
                                                                                selections.audioActive?.[item.id] ? "bg-purple-600 border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]" : "bg-white/10 border-white/10")}
                                                                        >
                                                                            <div className={cn("absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all shadow-sm",
                                                                                selections.audioActive?.[item.id] ? "right-0.5" : "left-0.5")} />
                                                                        </button>
                                                                    </div>
                                                                    {selections.audioActive?.[item.id] && (
                                                                        <textarea
                                                                            value={selections.audioPrompts?.[item.id] || ''}
                                                                            onChange={(e) => setSelections(p => ({
                                                                                ...p,
                                                                                audioPrompts: { ...p.audioPrompts, [item.id]: e.target.value }
                                                                            }))}
                                                                            placeholder={item.placeholder}
                                                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-[10px] text-white/90 placeholder:text-white/15 focus:outline-none focus:border-purple-500/40 resize-none h-16 custom-scrollbar transition-all"
                                                                            onClick={e => e.stopPropagation()}
                                                                        />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                            {/* AMBIANCE LAYER BUTTON (New) */}
                                            <div className="flex flex-col items-start shrink-0">
                                                <span className="text-[8px] font-black text-transparent select-none mb-0.5 px-1 flex items-center gap-1">
                                                    <Palette className="w-1.5 h-1.5 opacity-0" /> Ambiance
                                                </span>
                                                <div className="relative">
                                                    <button
                                                    onClick={() => setActiveDropdown(activeDropdown === 'ambiance' ? null : 'ambiance')}
                                                    className={cn("h-7 px-3 bg-[#D4FF00]/5 hover:bg-[#D4FF00]/10 border rounded-full flex items-center gap-2 transition-all group shrink-0",
                                                        activeDropdown === 'ambiance' ? "border-[#D4FF00] bg-[#D4FF00]/20" : "border-white/10 hover:border-white/20")}
                                                >
                                                    <Palette className={cn("w-3.5 h-3.5 transition-colors", activeDropdown === 'ambiance' ? "text-white" : "text-[#D4FF00]/60 group-hover:text-[#D4FF00]")} />
                                                    <span className={cn("text-[9px] font-black uppercase tracking-widest transition-colors", activeDropdown === 'ambiance' ? "text-[#D4FF00]" : "text-white/30 group-hover:text-white")}>Ambiance Layer</span>
                                                </button>

                                                {activeDropdown === 'ambiance' && (
                                                    <div className="absolute bottom-full right-0 mb-3 z-[500] bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-4 w-[500px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] border-[#D4FF00]/20">
                                                        <div className="flex items-center justify-between mb-4 px-1">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-[#D4FF00]/20 border border-[#D4FF00]/40 flex items-center justify-center">
                                                                    <Palette className="w-4 h-4 text-[#D4FF00]" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-black text-white uppercase tracking-widest">Atmospheric Ambiance Engine</p>
                                                                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-tighter mt-0.5">High-Fidelity Environmental Control</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-3">
                                                            {[
                                                                { id: 'color', label: 'Color Palette', icon: Palette, placeholder: 'e.g., monochromatic black and white, warm autumnal oranges...', examples: ['monochromatic B&W', 'tropical colors', 'earthy tones', 'futuristic blue & silver'] },
                                                                { id: 'atmosphere', label: 'Atmospheric Effects', icon: Sun, placeholder: 'e.g., thick fog rolling, heat haze shimmering, magical glowing particles...', examples: ['thick fog', 'swirling sand', 'falling snow', 'heat haze'] },
                                                                { id: 'texture', label: 'Textural Qualities', icon: Aperture, placeholder: 'e.g., rough-hewn stone walls, smooth polished chrome, soft velvety fabric...', examples: ['rough stone', 'polished chrome', 'velvety fabric', 'dewdrops'] }
                                                            ].map(item => (
                                                                <div key={item.id} className={cn("space-y-2 group transition-all p-3 rounded-2xl border bg-black/40",
                                                                    selections.ambianceActive?.[item.id] ? "border-[#D4FF00]/30 ring-1 ring-[#D4FF00]/10" : "border-white/5")}>
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <item.icon className={cn("w-3.5 h-3.5", selections.ambianceActive?.[item.id] ? "text-[#D4FF00]" : "text-white/20")} />
                                                                            <span className={cn("text-[10px] font-black uppercase tracking-widest", selections.ambianceActive?.[item.id] ? "text-white" : "text-white/20")}>{item.label}</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelections(p => ({
                                                                                    ...p,
                                                                                    ambianceActive: { ...p.ambianceActive, [item.id]: !p.ambianceActive?.[item.id] }
                                                                                }))
                                                                            }}
                                                                            className={cn("w-6 h-3.5 rounded-full relative transition-all border shrink-0",
                                                                                selections.ambianceActive?.[item.id] ? "bg-[#D4FF00] border-[#D4FF00] shadow-[0_0_10px_rgba(212,255,0,0.4)]" : "bg-white/10 border-white/10")}
                                                                        >
                                                                            <div className={cn("absolute top-0.5 w-2 h-2 rounded-full bg-black transition-all shadow-sm",
                                                                                selections.ambianceActive?.[item.id] ? "right-0.5" : "left-0.5")} />
                                                                        </button>
                                                                    </div>
                                                                    {selections.ambianceActive?.[item.id] && (
                                                                        <div className="space-y-2">
                                                                            <textarea
                                                                                value={selections.ambiancePrompts?.[item.id] || ''}
                                                                                onChange={(e) => setSelections(p => ({
                                                                                    ...p,
                                                                                    ambiancePrompts: { ...p.ambiancePrompts, [item.id]: e.target.value }
                                                                                }))}
                                                                                placeholder={item.placeholder}
                                                                                className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-[10px] text-white/90 placeholder:text-white/15 focus:outline-none focus:border-[#D4FF00]/40 resize-none h-14 custom-scrollbar transition-all"
                                                                                onClick={e => e.stopPropagation()}
                                                                            />
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {item.examples.map(ex => (
                                                                                    <button
                                                                                        key={ex}
                                                                                        onClick={() => setSelections(p => ({
                                                                                            ...p,
                                                                                            ambiancePrompts: { ...p.ambiancePrompts, [item.id]: ex }
                                                                                        }))}
                                                                                        className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 text-[8px] text-white/40 hover:text-white transition-all uppercase font-bold"
                                                                                    >
                                                                                        {ex}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <div className="flex flex-wrap md:flex-nowrap w-full gap-2">
                                {['engine', 'camera', 'angle', 'lens', 'composition', 'lighting', 'style', 'aspectRatio', 'quality'].map(key => {
                                    let flexValue = 1;
                                    if (key === 'engine') flexValue = 1.1;
                                    if (key === 'angle') flexValue = 1.1;
                                    if (key === 'lens') flexValue = 0.8; 
                                    if (key === 'composition') flexValue = 1.3;
                                    if (key === 'quality') flexValue = 0.6;

                                    return (
                                        <div key={key} style={{ flex: flexValue }} className={cn("min-w-[45%] md:min-w-0")}>
                                            <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase tracking-wider truncate">{key === 'lens' ? 'Lens' : key === 'aspectRatio' ? 'Ratio' : key}</label>
                                            {key === 'engine' ? (
                                                <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white">
                                                    {filteredModels.map(m => <option key={m.id} value={m.id} disabled={!m.available}>{m.name}{m.available ? '' : ' — Soon'}</option>)}
                                                </select>
                                            ) : key === 'angle' ? (
                                                <button onClick={() => setShowAnglesModal(true)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white flex justify-between items-center">
                                                    <span className="truncate">{CAMERA_ANGLES.find(a => a.id === selections.angle)?.label}</span><ChevronDown className="w-3 shrink-0 h-3 opacity-30 ml-1" />
                                                </button>
                                            ) : (
                                                <select value={selections[key]} onChange={e => key === 'camera' ? handleCameraChange(e.target.value) : setSelections(p => ({ ...p, [key]: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white">
                                                    {key === 'camera' && CAMERA_MODELS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                                    {key === 'lens' && availableLenses.map(l => <option key={l} value={l}>{l}</option>)}
                                                    {key === 'composition' && COMPOSITION_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                                    {key === 'lighting' && LIGHTING_STYLES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                                                    {key === 'style' && ART_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                                    {key === 'aspectRatio' && ASPECT_RATIOS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                                                    {key === 'quality' && ['1k', '2k'].map(q => <option key={q} value={q}>{q}</option>)}
                                                </select>
                                            )}
                                        </div>
                                    )
                                })}
                                {(mode === 'multishot' || mode === 'image') && (
                                    <div style={{ flex: 1 }} className="min-w-[45%] md:min-w-0">
                                        <label className="text-[10px] font-bold text-purple-400 mb-1 block uppercase tracking-wider truncate">Variations</label>
                                        <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5">
                                            <button onClick={() => setSelections(p => ({ ...p, multishotMode: 'single' }))}
                                                className={cn("flex-1 py-1 px-2 rounded-md text-[9px] font-black uppercase transition-all truncate",
                                                    selections.multishotMode === 'single' ? "bg-white/10 text-white shadow-inner" : "text-gray-500 hover:text-gray-300")}>
                                                1
                                            </button>
                                            <button onClick={() => setSelections(p => ({ ...p, multishotMode: 'triple' }))}
                                                className={cn("flex-1 py-1 px-2 rounded-md text-[9px] font-black uppercase transition-all truncate",
                                                    selections.multishotMode === 'triple' ? "bg-purple-500/50 text-white shadow-lg" : "text-gray-500 hover:text-gray-300")}>
                                                3
                                            </button>
                                            <button onClick={() => setSelections(p => ({ ...p, multishotMode: 'multiple' }))}
                                                className={cn("flex-1 py-1 px-2 rounded-md text-[9px] font-black uppercase transition-all truncate",
                                                    selections.multishotMode === 'multiple' ? "bg-purple-500 text-white shadow-lg" : "text-gray-500 hover:text-gray-300")}>
                                                Mult
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {isNanoBanana && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-white/5">
                                <div>
                                    <label className="text-[10px] font-bold text-yellow-400 mb-2 block uppercase tracking-[0.2em] flex items-center gap-2"><Focus className="w-3 h-3" /> Focus Ctrl</label>
                                    <select value={selections.focusPoint} onChange={e => setSelections(p => ({ ...p, focusPoint: e.target.value }))} className="w-full bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-2.5 text-xs text-white outline-none">
                                        {PRO_FOCUS_CONTROLS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col justify-end">
                                    <button onClick={() => setSelections(p => ({ ...p, searchGrounding: !p.searchGrounding }))} className={cn("w-full py-2.5 rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-all border", selections.searchGrounding ? "bg-[#AADD00]/20 border-[#AADD00] text-[#AADD00]" : "bg-white/5 border-white/10 text-gray-500")}>
                                        <Zap className={cn("w-3 h-3", selections.searchGrounding && "animate-pulse")} /> Live Search
                                    </button>
                                </div>
                                <div className="flex flex-col justify-end">
                                    <button onClick={() => setSelections(p => ({ ...p, quality: p.quality === '2k' ? '1k' : '2k' }))} className={cn("w-full py-2.5 rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-all border", selections.quality === '2k' ? "bg-yellow-400 text-black border-yellow-400" : "bg-white/5 border-white/10 text-gray-500")}>
                                        <Maximize2 className="w-3 h-3" /> 2K Master
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── ZOOM MODAL ──────────────────────────────────────────── */}
            {
                zoomState.isOpen && (
                    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8">
                        <button onClick={() => setZoomState(p => ({ ...p, isOpen: false }))} className="absolute top-4 right-4 md:top-8 md:right-8 text-white/50 hover:text-white transition"><X className="w-6 h-6 md:w-8 md:h-8" /></button>
                        {(() => {
                            const zoomedFrame = frames.find(f => f.id === zoomState.slot);
                            const isVideo = zoomedFrame ? zoomedFrame.type === 'video' : zoomState.url?.endsWith('.mp4');
                            return isVideo ? (
                                <video src={resolveUrl(zoomState.url)} controls autoPlay loop className="max-w-full max-h-full rounded-2xl shadow-2xl" style={{ maxHeight: '85vh' }} />
                            ) : (
                                <img src={resolveUrl(zoomState.url)} className="max-w-full max-h-full rounded-2xl shadow-2xl" alt="Zoomed" />
                            );
                        })()}
                        <div className="absolute bottom-6 md:bottom-12 flex gap-4 w-full justify-center px-4 md:w-auto">
                            <button onClick={() => setZoomState(p => ({ ...p, isOpen: false }))} className="flex-1 md:flex-none justify-center bg-white/10 hover:bg-white/20 border border-white/10 text-white px-6 py-3 md:py-2 rounded-full font-bold uppercase text-[10px] md:text-xs flex items-center gap-2 transition shadow-xl"><X className="w-4 h-4" /> Back</button>
                            <button onClick={() => setZoomState(p => ({ ...p, isEditing: true }))} className="flex-1 md:flex-none justify-center bg-[#D4FF00] text-black px-6 py-3 md:py-2 rounded-full font-bold uppercase text-[10px] md:text-xs flex items-center gap-2 hover:bg-white transition shadow-xl"><PenTool className="w-4 h-4" /> Edit</button>
                            <button onClick={(e) => { e.stopPropagation(); downloadImage(zoomState.url); }} className="flex-1 md:flex-none justify-center bg-white text-black px-6 py-3 md:py-2 rounded-full font-bold uppercase text-[10px] md:text-xs flex items-center gap-2 hover:bg-cyan-500 hover:text-white transition shadow-xl"><Download className="w-4 h-4" /> Save</button>
                        </div>
                    </div>
                )
            }

            {
                zoomState.isEditing && zoomState.url && (
                    <ImageEditorModal imageUrl={zoomState.url} onClose={() => setZoomState(p => ({ ...p, isEditing: false }))} onSubmitSuccess={(newUrl) => { if (zoomState.slot) setFrames(prev => prev.map(f => f.id === zoomState.slot ? { ...f, url: newUrl } : f)) }} />
                )
            }

            {
                showAnglesModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div onClick={() => setShowAnglesModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <div className="relative w-full max-w-5xl bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                                <h3 className="text-base font-bold text-white flex items-center gap-2"><Camera className="w-4 h-4 text-[#bef264]" /> Perspective & Framing</h3>
                                <button onClick={() => setShowAnglesModal(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-4 gap-3 overflow-y-auto max-h-[70vh] custom-scrollbar">
                                {CAMERA_ANGLES.map(angle => (
                                    <div key={angle.id}
                                        className={cn("group relative flex flex-col bg-white/5 border rounded-2xl overflow-hidden transition-all hover:border-[#bef264]/40 hover:bg-white/10",
                                            selections.angle === angle.id ? "border-[#bef264] bg-white/10 shadow-[0_0_20px_rgba(190,242,100,0.15)]" : "border-white/5")}
                                    >
                                        <button onClick={() => !currentCamera.invalidAngles?.includes(angle.id) && handleAngleChange(angle.id)} className="w-full aspect-video bg-black/40 flex items-center justify-center relative overflow-hidden">
                                            {(angle.image_url || angle.img) ? <img src={angle.image_url || angle.img} loading="lazy" className={cn("w-full h-full object-cover transition-transform duration-700", selections.angle === angle.id ? "scale-110" : "group-hover:scale-105")} alt={angle.label} /> : <Camera className="w-5 h-5 text-white/10" />}
                                            {selections.angle === angle.id && <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[#bef264] flex items-center justify-center"><Zap className="w-2 h-2 text-black" /></div>}
                                        </button>
                                        <div className="px-2 py-1.5"><div className="text-[9px] font-black text-white uppercase tracking-wider truncate">{angle.label}</div><div className="text-[7px] text-white/25 truncate uppercase mt-0.5">{angle.description || angle.desc}</div></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showRefBoard && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <div onClick={handleCancelRefBoard} className="absolute inset-0 bg-black/85 backdrop-blur-lg" />
                        <div className="relative w-full max-w-3xl bg-[#0e0e0e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.03] shrink-0">
                                <div>
                                    <h3 className="text-base font-black text-white flex items-center gap-2">
                                        <span className="text-purple-400 text-xl font-black">@</span> {mode.toUpperCase()} REFERENCE BOARD
                                    </h3>
                                    <p className="text-[8px] text-white/25 mt-0.5 uppercase tracking-wider font-bold">MODE SPECIFIC - CHANGES MUST BE SAVED TO PERSIST</p>
                                </div>
                                <button onClick={handleCancelRefBoard} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            {/* Consistency Toggle */}
                            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <div onClick={() => setFaceConsistency(!faceConsistency)} className={cn("w-10 h-5 rounded-full p-1 cursor-pointer transition-all duration-300 border", faceConsistency ? "bg-purple-500 border-purple-400" : "bg-white/10 border-white/10")}>
                                            <div className={cn("w-3 h-3 bg-white rounded-full transition-all duration-300", faceConsistency ? "translate-x-5 shadow-[0_0_8px_white]" : "translate-x-0")} />
                                        </div>
                                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", faceConsistency ? "text-white" : "text-white/40")}>MAINTAIN FACE CONSISTENCY</span>
                                    </div>
                                    <span className="text-[8px] text-white/30 truncate mt-1">Adds explicit consistency directives to the prompt</span>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-black/40">
                                <div className="grid grid-cols-1 gap-4">
                                    {REF_CATEGORIES.map(category => (
                                        <div key={category.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <category.icon className={cn("w-5 h-5", category.color)} />
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-white uppercase tracking-[0.2em]">{category.label}</span>
                                                        <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest">{category.desc}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => { setActiveRefUploadCategory(category.id); refUploadInputRef.current?.click() }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-white transition-all text-[9px] font-bold uppercase"
                                                    >
                                                        <Upload className="w-3 h-3" /> Upload
                                                    </button>
                                                    <button
                                                        onClick={() => { setLibPickerTarget(category.id); setShowLibPicker(true) }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-all text-[9px] font-bold uppercase"
                                                    >
                                                        <ImagePlus className="w-3 h-3" /> Library
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-1">
                                                {!stagedRefBoard[category.id] || stagedRefBoard[category.id].length === 0 ? (
                                                    <p className="text-[9px] text-white/20 italic">Nothing staged yet.</p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {stagedRefBoard[category.id].map(item => (
                                                            <div key={item.id} className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10 group bg-black/20 shrink-0">
                                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                                                <div className="absolute inset-x-0 bottom-0 bg-black/80 px-1 py-0.5 backdrop-blur-sm border-t border-white/5">
                                                                    <p className="text-[6px] font-black text-[#D4FF00] uppercase truncate text-center">@{item.name}</p>
                                                                </div>
                                                                <button onClick={() => removeRefItem(item.id)} className="absolute top-0.5 right-0.5 p-0.5 bg-red-500/80 rounded border border-red-400 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <X className="w-2 h-2" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-3 border-t border-white/5 bg-black/40 shrink-0 text-center">
                                <span className="text-[9px] text-white/30 tracking-wide font-medium">Type <span className="text-purple-400 font-bold">@name</span> in narrative to tag a ref. Only SAVED images are used.</span>
                            </div>

                            <div className="p-4 border-t border-white/5 bg-white/[0.04] flex gap-3 shrink-0">
                                <button
                                    onClick={handleSaveRefBoard}
                                    className="flex-3 flex-grow-[2] py-3.5 bg-purple-500 hover:bg-purple-600 rounded-xl text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> Save Changes
                                </button>
                                <button
                                    onClick={handleCancelRefBoard}
                                    className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 font-bold uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>

                            <input type="file" ref={refUploadInputRef} className="hidden" accept="image/*" onChange={handleRefUpload} />

                            {showLibPicker && (
                                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                                    <div onClick={() => setShowLibPicker(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
                                    <div className="relative w-full max-w-2xl bg-[#0e0e0e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-white uppercase tracking-widest">Select {libPickerTarget?.toUpperCase() || 'Reference'}</h4>
                                            <button onClick={() => setShowLibPicker(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                            <AssetsLibrary compact={true} defaultTab={libPickerTarget === 'characters' ? 'matrix' : 'images'} onSelectReference={(url, item) => {
                                                const name = (item.name || 'Reference').replace(/\s+/g, '');
                                                const category = libPickerTarget?.replace(/s$/, '') || item.category || (item.isCharacter ? 'character' : 'mood');
                                                addRefItem({
                                                    id: crypto.randomUUID(),
                                                    name,
                                                    category,
                                                    imageUrl: url,
                                                    isMatrix: !!(item.isMatrix || item.identity_kit?.matrix)
                                                });
                                                setShowLibPicker(false);
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* ─── GALLERY OVERLAY ──────────────────────────────────────── */}
            {
                showGallery && (
                    <div className="fixed inset-0 z-[100] flex flex-col">
                        <div onClick={() => setShowGallery(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <div className="relative z-10 flex-1 flex flex-col p-4 overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-6">
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <LayoutGrid className="w-4 h-4 text-[#D4FF00]" /> Studio Gallery
                                    </h3>
                                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                                        <button onClick={() => setGalleryTab('recent')}
                                            className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all",
                                                galleryTab === 'recent' ? "bg-[#D4FF00] text-black" : "text-gray-400 hover:text-white")}>
                                            Recent ({frames.filter(f => f.url).length})
                                        </button>
                                        <button onClick={() => setGalleryTab('library')}
                                            className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all",
                                                galleryTab === 'library' ? "bg-[#D4FF00] text-black" : "text-gray-400 hover:text-white")}>
                                            Asset Library
                                        </button>
                                    </div>
                                </div>
                                <button onClick={() => setShowGallery(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X className="w-5 h-5 text-white" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {galleryTab === 'recent' ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {frames.filter(f => f.url && !f.loading).map(frame => (
                                            <div key={frame.id} onClick={() => { setActiveFrameId(frame.id); setShowGallery(false) }}
                                                className={cn("relative aspect-video rounded-xl overflow-hidden cursor-pointer group border-2 transition-all",
                                                    activeFrameId === frame.id ? "border-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.3)]" : "border-white/5 hover:border-white/20")}>
                                                {frame.type === 'video' ? (
                                                    <video src={resolveUrl(frame.url)} muted preload="metadata" className="w-full h-full object-cover" />
                                                ) : (
                                                    <img src={resolveUrl(frame.thumb || frame.url)} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                                )}
                                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-[8px] font-bold text-white/80 truncate">{frame.model}</p>
                                                    <div className="flex gap-1 mt-1">
                                                        <button onClick={(e) => { e.stopPropagation(); downloadImage(frame.url) }} className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[7px] text-white font-bold">DL</button>
                                                        <button onClick={(e) => {
                                                            e.stopPropagation();
                                                            const url = frame.url;
                                                            setSelections(p => ({ ...p, referenceImage: url }));
                                                            addRefItem({ id: crypto.randomUUID(), name: `Ref_${frame.id.slice(-4)}`, category: 'mood', imageUrl: url });
                                                        }} className="px-1.5 py-0.5 bg-purple-500/50 hover:bg-purple-500 rounded text-[7px] text-white font-bold">ADD TO REF</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setLeftPreviewId(frame.id); setShowGallery(false) }} className="px-1.5 py-0.5 bg-[#D4FF00]/50 hover:bg-[#D4FF00] rounded text-[7px] text-black font-bold">L</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setRightPreviewId(frame.id); setShowGallery(false) }} className="px-1.5 py-0.5 bg-purple-500/50 hover:bg-purple-500 rounded text-[7px] text-white font-bold">R</button>
                                                    </div>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); removeFrame(frame.id) }}
                                                    className={cn(
                                                        "absolute top-2 right-2 p-1.5 rounded-lg text-white transition-all z-20 overflow-hidden flex items-center gap-1",
                                                        deleteConfirmId === frame.id ? "bg-red-600 px-3 scale-110 shadow-lg" : "bg-red-500/80 opacity-0 group-hover:opacity-100"
                                                    )}
                                                    title={deleteConfirmId === frame.id ? "Confirm?" : "Delete Frame"}>
                                                    <X className="w-3 h-3" />
                                                    {deleteConfirmId === frame.id && <span className="text-[7px] font-black uppercase">Confirm?</span>}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full bg-white/5 rounded-3xl overflow-hidden border border-white/10">
                                        <AssetsLibrary defaultTab="images" onSelectReference={(url, item) => {
                                            const name = (item.name || 'Reference').replace(/\s+/g, '');
                                            const category = item.category || (item.isCharacter ? 'character' : 'mood');
                                            addRefItem({
                                                id: crypto.randomUUID(),
                                                name,
                                                category,
                                                imageUrl: url,
                                                isMatrix: !!(item.isMatrix || item.identity_kit?.matrix)
                                            });
                                            // Optionally keep gallery open but switch back to recent? 
                                            // Or just close gallery and select the ref?
                                            setSelections(p => ({ ...p, referenceImage: url }));
                                            setShowGallery(false);
                                        }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            {/* ─── CROPPED IMAGE MODAL ───────────────────────────────────── */}
            {
                upscaledImage && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div onClick={() => setUpscaledImage(null)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
                        <div className="relative z-10 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20">
                                <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <Grid className="w-4 h-4 text-[#D4FF00]" /> Isolate Cell / Character
                                </h4>
                                <button onClick={() => setUpscaledImage(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white text-[10px] font-bold uppercase px-3">Close</button>
                            </div>
                            <div className="flex-1 overflow-hidden flex items-center justify-center p-4 bg-black/40">
                                <img src={upscaledImage} alt="Crop Preview" className="max-w-full max-h-[70vh] rounded-xl border border-white/5 object-contain shadow-2xl" />
                            </div>
                            <div className="flex gap-3 px-6 py-4 border-t border-white/5 bg-black/20">
                                <button onClick={(e) => { e.stopPropagation(); downloadImage(upscaledImage, 'isolated-crop.png'); }}
                                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all border border-white/10">
                                    <Download className="w-4 h-4" /> Download
                                </button>
                                <button onClick={runAiUpscale} disabled={upscaling}
                                    className="flex-2 py-3 px-8 rounded-xl bg-[#D4FF00] hover:bg-white text-black text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-50 min-w-[200px]">
                                    {upscaling ? <><Sparkles className="w-4 h-4 animate-spin" /> Generating 2K...</> : <><Sparkles className="w-4 h-4" /> Generate 2K Upscale (2 Credits)</>}
                                </button>
                                <button onClick={() => { setSelections(p => ({ ...p, referenceImage: upscaledImage })); setUpscaledImage(null) }}
                                    className="flex-1 py-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all border border-purple-500/20">
                                    <ImagePlus className="w-4 h-4" /> Set as Ref
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <CameraGuide />
        </div>
    );
}

export default PromptGenerator;
