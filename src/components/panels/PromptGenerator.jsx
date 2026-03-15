import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
    Copy, Sparkles, Video, Aperture, Sun, Palette, Camera, Focus,
    Smartphone, Film, Upload, X, Image as ImageIcon, Type, Layers,
    ArrowRight, Edit, ImagePlus, MonitorPlay, Mic, Clock,
    ChevronDown, ChevronUp, ChevronRight, Settings, Zap, Maximize2, Download, RefreshCw, Lock, FastForward, PenTool, Grid, LayoutGrid, Music,
    Users, Map, Package, Plus
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { AssetsLibrary } from './AssetsLibrary'
import { useAppStore } from '../../store'
import { getApiUrl } from '../../config/apiConfig'
import { supabase } from '../../lib/supabase'
import CameraGuide from './CameraGuide'
import ImageEditorModal from '../common/ImageEditorModal'
import { useShorts } from '../../hooks/useShorts'
import { StoryboardView } from './StoryboardView'
import { MultiShotView } from './MultiShotView'
import { SHORTS_COST } from '../../config/shortsConfig'
import { refineNarrative } from '../../services/geminiService'

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const CAMERA_ANGLES = [
    { id: 'extreme_wide', label: 'Extreme Wide', desc: 'Vast landscape', img: '/assets/angle_wide.png' },
    { id: 'wide', label: 'Wide Shot', desc: 'Full scene', img: '/assets/angle_wide.png' },
    { id: 'medium', label: 'Medium Shot', desc: 'Waist up', img: '/assets/angle_closeup.png' },
    { id: 'closeup', label: 'Close Up', desc: 'Face details', img: '/assets/angle_closeup.png' },
    { id: 'extreme_closeup', label: 'Extreme Close', desc: 'Eye/Detail', img: '/assets/angle_closeup.png' },
    { id: 'low_angle', label: 'Low Angle', desc: 'Looking up', img: '/assets/angle_low.png' },
    { id: 'high_angle', label: 'High Angle', desc: 'Looking down', img: '/assets/angle_drone.png' },
    { id: 'drone', label: 'Drone View', desc: 'Aerial', img: '/assets/angle_drone.png' },
    { id: 'pov', label: 'POV', desc: 'First person', img: '/assets/angle_pov.png' },
    { id: 'dutch', label: 'Dutch Angle', desc: 'Tilted', img: '/assets/angle_low.png' },
    { id: 'ots', label: 'Over Shoulder', desc: 'Behind subject', img: '/assets/angle_pov.png' },
    { id: 'eagle_pov', label: 'Eagle POV', desc: 'Extreme top-down', img: '/assets/angle_drone.png' },
]

const CAMERA_MODELS = [
    {
        id: 'arri', label: 'ARRI Alexa 35', type: 'Cinema', icon: Film,
        desc: 'The Hollywood gold standard. High dynamic range, organic color.',
        narrative: 'captured on an ARRI Alexa 35 cinema camera, rendering organic filmic grain, wide dynamic range, and a natural color science with deep shadow detail',
        invalidAngles: [],
        lensMap: {
            'extreme_wide': { lenses: ['12mm', '14mm', '16mm'], default: '14mm' },
            'wide': { lenses: ['18mm', '21mm', '24mm'], default: '21mm' },
            'medium': { lenses: ['35mm', '40mm', '50mm'], default: '35mm' },
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
        narrative: 'shot on a Sony Venice 2 full-frame cinema camera, producing pristine digital clarity, wide color gamut, and ultra-clean highlights',
        invalidAngles: [],
        lensMap: {
            'extreme_wide': { lenses: ['16mm Anamorphic', '18mm'], default: '16mm Anamorphic' },
            'wide': { lenses: ['24mm', '28mm Anamorphic'], default: '24mm' },
            'medium': { lenses: ['40mm', '50mm Anamorphic'], default: '50mm Anamorphic' },
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
        narrative: 'photographed with a RED V-Raptor 8K Vista Vision camera, delivering razor-sharp micro-detail, rich texture, and hyper-real resolution',
        invalidAngles: [],
        lensMap: {
            'extreme_wide': { lenses: ['12mm', '15mm'], default: '12mm' },
            'wide': { lenses: ['18mm', '24mm'], default: '18mm' },
            'medium': { lenses: ['35mm', '50mm'], default: '50mm' },
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
        narrative: 'captured on IMAX 70mm large-format film, with unmatched tonal depth, immersive sharpness, and the iconic cinematic grandeur of the format',
        invalidAngles: ['drone', 'pov', 'dutch'], // "all others not recommended"
        lensMap: {
            'extreme_wide': { lenses: ['15mm IMAX', '18mm IMAX'], default: '15mm IMAX' },
            'wide': { lenses: ['18mm IMAX', '30mm IMAX'], default: '18mm IMAX' },
            'medium': { lenses: ['30mm IMAX'], default: '30mm IMAX' },
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
        narrative: 'taken on an iPhone 15 Pro, with characteristic mobile sharpness, computational photography processing, and digital depth-of-field rendering',
        invalidAngles: [],
        lensMap: {
            'extreme_wide': { lenses: ['13mm Ultra Wide'], default: '13mm' },
            'wide': { lenses: ['24mm Main'], default: '24mm' },
            'medium': { lenses: ['24mm Main'], default: '24mm' },
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
        narrative: 'shot on a GoPro Hero 12 action camera, with signature wide fisheye distortion, infinite depth of field, and high-contrast vivid colors',
        invalidAngles: ['closeup', 'extreme_closeup'], // "Not recommended"
        lensMap: {
            'extreme_wide': { lenses: ['12mm SuperView'], default: '12mm SuperView' },
            'wide': { lenses: ['14mm Wide'], default: '14mm Wide' },
            'medium': { lenses: ['14mm Wide'], default: '14mm Wide' },
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
        narrative: 'recorded on a 1990s VHS camcorder, with magnetic tape grain, chromatic color bleeding, interlace scan lines, and the warm nostalgic decay of analog video',
        invalidAngles: [],
        lensMap: {
            // Default generic fallback for all if not explicitly mapped.
            '*': { lenses: ['Auto Zoom'], default: 'Auto Zoom' }
        }
    },
    {
        id: 'dslr', label: 'Canon R5', type: 'Hybrid', icon: Camera,
        desc: 'Modern mirrorless photography/video hybrid.',
        narrative: 'photographed with a Canon R5 mirrorless camera, combining clinical digital sharpness with beautiful optical rendering and accurate, natural color reproduction',
        invalidAngles: [],
        lensMap: {
            '*': { lenses: ['24mm', '35mm', '50mm', '85mm', '70-200mm'], default: '50mm' }
        }
    },
    {
        id: 'blackmagic', label: 'Blackmagic 6K', type: 'Cinema', icon: Video,
        desc: 'Indie cinema workhorse. Raw, gritty, natural skin tones.',
        narrative: 'shot on a Blackmagic Pocket Cinema Camera 6K, rendering a gritty indie film aesthetic, pleasing natural skin tones, and subtle color roll-off',
        invalidAngles: [],
        lensMap: {
            'extreme_wide': { lenses: ['12mm', '16mm'], default: '16mm' },
            'wide': { lenses: ['18mm', '24mm'], default: '24mm' },
            'medium': { lenses: ['35mm', '50mm'], default: '35mm' },
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
        narrative: 'photographed with a Hasselblad X2D medium format camera, utilizing Hasselblad Natural Color Solution to render breathtaking detail and smooth tonal transitions',
        invalidAngles: ['drone', 'pov'], // "Action not made for this"
        lensMap: {
            'extreme_wide': { lenses: ['21mm XCD'], default: '21mm' },
            'wide': { lenses: ['30mm XCD'], default: '30mm' },
            'medium': { lenses: ['45mm XCD'], default: '45mm' },
            'closeup': { lenses: ['90mm XCD'], default: '90mm' },
            'extreme_closeup': { lenses: ['120mm Macro XCD'], default: '120mm Macro' },
            'low_angle': { lenses: ['30mm XCD', '45mm XCD'], default: '45mm' },
            'high_angle': { lenses: ['45mm XCD', '90mm XCD'], default: '45mm' },
            'dutch': { lenses: ['45mm XCD'], default: '45mm' },
            'ots': { lenses: ['90mm XCD'], default: '90mm' },
            'eagle_pov': { lenses: ['21mm XCD', '30mm XCD'], default: '21mm XCD' }
        }
    }
]

const LIGHTING_STYLES = [
    {
        id: 'none', label: 'None (Default)',
        narrative: 'natural, balanced lighting'
    },
    {
        id: 'cinematic', label: 'Cinematic',
        narrative: 'dramatically lit with high contrast chiaroscuro, deep shadows, and carefully controlled single-source key lighting'
    },
    {
        id: 'natural', label: 'Natural Daylight',
        narrative: 'bathed in soft, diffused natural daylight with gentle fill from environmental bounce'
    },
    {
        id: 'neon', label: 'Neon Cyberpunk',
        narrative: 'soaked in vibrant neon light from multiple colored sources — electric magenta and acid violet — casting hard colored shadows'
    },
    {
        id: 'golden', label: 'Golden Hour',
        narrative: 'illuminated by the warm, low-angle golden hour sun casting long amber shadows and a glowing atmospheric haze'
    },
    {
        id: 'studio', label: 'Studio Pro',
        narrative: 'lit with a professional three-point studio setup — soft key, balanced fill, and a crisp rim light'
    },
]

const ART_STYLES = [
    {
        id: 'none', label: 'None (Neutral)',
        narrative: 'in a neutral, realistic style',
        quality: 'balanced textures, natural materials, clean rendering'
    },
    {
        id: 'realistic', label: 'Hyper Realistic',
        narrative: 'photorealistic',
        quality: 'ultra-detailed, photorealistic rendering, ultra high-definition details, true-to-life textures'
    },
    {
        id: 'anime', label: 'Celestial Anime',
        narrative: 'in the style of high-end Japanese anime',
        quality: 'clean line art, cel shading, vibrant colors, Studio Ghibli-level polish'
    },
    {
        id: 'hyper_realistic', label: 'Hyper Realistic',
        narrative: 'in a hyper-realistic cinematic style',
        quality: 'ultra high-definition rendering, hyper-detailed textures, photorealistic materials, flawless lighting'
    },
    {
        id: '3d', label: '3D CGI Render',
        narrative: 'as a high-end 3D rendered scene',
        quality: 'Pixar/Disney-quality 3D CGI, global illumination, subsurface scattering'
    },
    {
        id: 'vintage', label: 'Vintage 35mm',
        narrative: 'in a vintage analog film aesthetic',
        quality: 'heavy 35mm film grain, faded Kodachrome palette, soft halation'
    },
    {
        id: 'cyberpunk', label: 'Cyberpunk',
        narrative: 'in a gritty cyberpunk aesthetic',
        quality: 'high-tech low-life, rainy urban textures, glowing interfaces, heavy atmosphere'
    },
    {
        id: 'oil_painting', label: 'Oil Painting',
        narrative: 'as a textured oil painting',
        quality: 'visible impasto brushstrokes, rich pigment textures, classic canvas grain'
    },
    {
        id: 'architecture', label: 'Architectural',
        narrative: 'in a clean architectural photography style',
        quality: 'perfect perspective, orthogonal lines, pristine surfaces, minimalist lighting'
    },
    {
        id: 'product', label: 'Product Photo',
        narrative: 'as a commercial product photograph',
        quality: 'macro detail, commercial grade glass/metal rendering, heroic lighting'
    },
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
    { id: '16:9', label: '16:9 (Cinematic)' },
    { id: '9:16', label: '9:16 (Mobile/Reel)' },
    { id: '1:1', label: '1:1 (Square)' },
    { id: '4:3', label: '4:3 (TV)' },
    { id: '3:4', label: '3:4 (Portrait)' },
    { id: '21:9', label: '21:9 (Ultra Wide)' },
]

// Maps angle IDs → narrative shot type phrases for Gemini
const ANGLE_NARRATIVES = {
    extreme_wide: 'An extreme wide establishing shot',
    wide: 'A wide shot',
    medium: 'A medium shot framing the subject from the waist up',
    closeup: 'A cinematic close-up',
    extreme_closeup: 'An extreme close-up revealing intimate detail',
    low_angle: 'A low-angle shot looking upward',
    high_angle: 'A high-angle shot looking down',
    drone: 'An aerial drone perspective from far above',
    pov: 'A first-person POV shot through the subject\'s eyes',
    dutch: 'A Dutch angle with the camera tilted at 30°',
    ots: 'An over-the-shoulder shot',
    eagle_pov: 'An extreme top-down bird\'s-eye view looking straight down at the location, with the subject either absent or secondary to the environmental layout',
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
    '1.4': 'a wide open f/1.4 aperture creating a razor-thin plane of focus with luxuriously blurred bokeh behind the subject',
    '2.8': 'an f/2.8 aperture with soft, creamy background separation',
    '5.6': 'an f/5.6 standard aperture balancing sharp subject detail against a slightly softened environment',
    '8.0': 'a stopped-down f/8 aperture keeping the entire scene in crisp, sharp focus',
    '16': 'an f/16 deep-focus aperture rendering every plane — foreground to horizon — with absolute sharpness',
}

const PRO_LIGHTING_TRANSFORMS = [
    { id: 'none', label: 'No Transform' },
    { id: 'day_to_night', label: 'Day ➔ Night', narrative: 'Transform this daytime scene into a deep nighttime environment with moonlight or artificial urban lighting.' },
    { id: 'night_to_day', label: 'Night ➔ Day', narrative: 'Transform this nighttime scene into a bright, sunlit daytime environment.' },
    { id: 'sunrise', label: 'Cold Sunrise', narrative: 'Apply a cold, blue-hour sunrise light with high-contrast morning shadows.' },
    { id: 'sunset', label: 'Deep Sunset', narrative: 'Apply a rich, fiery sunset palette with long silhouettes and glowing highlights.' },
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
        description: 'Ultra-high definition video generation (Preview)',
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
        id: 'kling-2.6', name: 'Google Kling 2.6', provider: 'Kling', type: 'video',
        description: 'V2.6 High-Performance Video Model',
        credits: 8, available: true, icon: Zap,
        modelId: 'kling-2.6/video'
    },
    {
        id: 'kling', name: 'Google Kling 3.0', provider: 'Kling', type: 'video',
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
    "Linear": [[0, 60], [25, 45], [50, 30], [75, 15], [100, 0]],
    "Impact": [[0, 60], [10, 5], [25, 5], [60, 20], [100, 0]],
    "Drift": [[0, 60], [40, 55], [70, 30], [90, 5], [100, 0]],
    "Smooth": [[0, 60], [25, 40], [50, 20], [75, 10], [100, 0]],
    "Snap": [[0, 60], [5, 2], [30, 2], [50, 25], [100, 0]],
    "Viral": [[0, 60], [15, 10], [30, 50], [60, 10], [100, 0]],
    "Cinematic": [[0, 60], [30, 50], [60, 20], [85, 5], [100, 0]],
}

const VIDEO_CONTROLS = [
    {
        key: "cameraMovement", label: "MOVEMENT",
        options: CAMERA_MOVEMENT.map(m => m.label),
        default: "Static Shot"
    },
    {
        key: "speedRamp", label: "SPEED RAMP",
        options: ["Linear", "Impact", "Drift", "Smooth", "Snap", "Viral", "Cinematic"],
        default: "Cinematic"
    },
    {
        key: "emotion", label: "EMOTION",
        options: ["Neutral", "Tense", "Calm", "Epic", "Intimate", "Melancholic", "Triumphant", "Desperate", "Menacing"],
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
        options: ["720p", "1080p", "4K"],
        default: "1080p"
    },
    {
        key: "fps", label: "FPS",
        options: ["24fps — Cinematic", "30fps — Standard", "60fps — Smooth"],
        default: "24fps — Cinematic"
    },
    {
        key: "aspectRatio", label: "RATIO",
        options: ["16:9 — Cinematic", "9:16 — Reels", "1:1 — Feed", "4:5 — Portrait"],
        default: "16:9 — Cinematic"
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
 *
 * Follows Google's official structured prompt format:
 * Subject → Composition → Action → Location → Style → Camera/Lighting → Aspect Ratio
 * Simple, direct, labeled sections. No narrative weaving.
 */
const buildNanoBananaProPrompt = (selections) => {
    const cam = CAMERA_MODELS.find(c => c.id === selections.camera) || CAMERA_MODELS[0]
    const lighting = LIGHTING_STYLES.find(l => l.id === selections.lighting)
    const artStyle = ART_STYLES.find(s => s.id === selections.style)
    const angleLabel = CAMERA_ANGLES.find(a => a.id === selections.angle)?.label || 'Medium shot'

    // Aperture label
    const ap = selections.aperture
    let fstopLabel
    if (ap < 20) fstopLabel = 'f/1.4'
    else if (ap < 40) fstopLabel = 'f/2.8'
    else if (ap < 60) fstopLabel = 'f/5.6'
    else if (ap < 80) fstopLabel = 'f/8.0'
    else fstopLabel = 'f/16'

    const store = useAppStore.getState()
    const activeChar = store.activeCharacter
    const charDesc = activeChar?.metadata?.imageAnalysis?.description || activeChar?.personality || ''

    let subject = selections.subject?.trim() || '[describe your subject here]'

    // ANTI-LEAKAGE: If subject is name, swap for description
    if (activeChar && (subject.toLowerCase() === activeChar.name.toLowerCase() || subject === '[describe your subject here]')) {
        subject = charDesc || subject
    }
    const lightingLabel = selections.lighting === 'none' ? 'natural, balanced lighting' : (lighting?.label || 'cinematic lighting')
    const compPrompt = COMPOSITION_PROMPTS[selections.composition]
    const compositionLabel = compPrompt ? `, ${compPrompt}` : ''
    const isStyleNone = selections.style === 'none'
    const styleLabel = isStyleNone ? null : (artStyle?.narrative || 'photorealistic')
    const qualityLabel = selections.quality?.toUpperCase() || '2K'

    // Reference image editing mode
    if (selections.referenceImage) {
        const parts = [
            `Editing instruction: ${subject || 'modify the scene as described'}.`,
            `Composition: ${angleLabel}${compositionLabel}.`,
            ...(styleLabel ? [`Style: ${styleLabel}.`] : []),
            `Lighting: ${lightingLabel}.`,
            `Camera: ${cam.label}, ${selections.focalLength}mm lens at ${fstopLabel}.`,
            `Aspect ratio: ${selections.aspectRatio}.`,
            `Output resolution: ${qualityLabel}.`,
        ]
        return parts.join(' ')
    }

    // Pro Enhancements
    const focusCtrl = PRO_FOCUS_CONTROLS.find(f => f.id === selections.focusPoint)
    let proNotes = []
    if (focusCtrl && focusCtrl.id !== 'none') proNotes.push(focusCtrl.narrative)
    if (selections.searchGrounding) proNotes.push('Use real-world accuracy and current information from Google Search.')

    // Assemble structured sections — skip Style line entirely if none
    const parts = [
        `Subject: ${subject}.`,
        `Composition: ${angleLabel}${compositionLabel}.`,
        ...(styleLabel ? [`Style: ${styleLabel}${artStyle?.quality ? `, ${artStyle.quality}` : ''}.`] : []),
        `Lighting: ${lightingLabel}.`,
        `Camera: ${cam.label}, ${selections.focalLength}mm lens at ${fstopLabel} aperture.`,
        `Aspect ratio: ${selections.aspectRatio}.`,
        `Output resolution: ${qualityLabel}.`,
    ]

    if (proNotes.length > 0) parts.push(`Additional directives: ${proNotes.join(' ')}`)

    return parts.join('\n')
}

/**
 * Nano Banana (Gemini 2.5 Flash Image) optimized prompt builder.
 *
 * Core principle from Google's docs:
 * "Describe the scene, don't list keywords. A narrative, descriptive paragraph
 *  will almost always produce a better, more coherent image."
 *
 * Template:
 * "[Shot type] of [subject], [action/expression], set in [environment].
 *  The scene is illuminated by [lighting], creating a [mood] atmosphere.
 *  Captured on [camera] with a [focal length] lens at [aperture].
 *  [Style quality descriptors]. Aspect ratio [X:Y]."
 */
const buildNanoBananaPrompt = (selections) => {
    const cam = CAMERA_MODELS.find(c => c.id === selections.camera) || CAMERA_MODELS[0]
    const lighting = LIGHTING_STYLES.find(l => l.id === selections.lighting)
    const artStyle = ART_STYLES.find(s => s.id === selections.style)
    const shotType = ANGLE_NARRATIVES[selections.angle] || 'A medium shot'
    const moodPrefix = selections.lighting === 'none' && selections.style === 'none' ? 'none_none' : `${selections.lighting}_${selections.style}`
    const mood = MOOD_MAP[moodPrefix] || 'evocative'

    // Focal length → descriptive phrase
    const fl = selections.focalLength
    let lensDesc
    if (fl <= 18) lensDesc = `an ultra-wide ${fl}mm lens with dramatic environmental perspective`
    else if (fl <= 28) lensDesc = `a wide ${fl}mm lens slightly expanding the scene's spatial depth`
    else if (fl <= 40) lensDesc = `a natural-perspective ${fl}mm lens closely mimicking human vision`
    else if (fl <= 60) lensDesc = `a standard ${fl}mm portrait lens rendering natural proportions`
    else if (fl <= 100) lensDesc = `a short telephoto ${fl}mm lens gently compressing depth and flattering the subject`
    else lensDesc = `a telephoto ${fl}mm lens strongly compressing spatial depth and isolating the subject against a distant, abstract background`

    // Aperture → narrative
    const ap = selections.aperture
    let fstopDesc
    if (ap < 20) fstopDesc = FSTOP_NARRATIVES['1.4']
    else if (ap < 40) fstopDesc = FSTOP_NARRATIVES['2.8']
    else if (ap < 60) fstopDesc = FSTOP_NARRATIVES['5.6']
    else if (ap < 80) fstopDesc = FSTOP_NARRATIVES['8.0']
    else fstopDesc = FSTOP_NARRATIVES['16']

    const store = useAppStore.getState()
    const activeChar = store.activeCharacter
    const charDesc = activeChar?.metadata?.imageAnalysis?.description || activeChar?.personality || ''

    let subject = selections.subject?.trim() || 'the subject'

    // ANTI-LEAKAGE: Swap name for descriptor
    if (activeChar && (subject.toLowerCase() === activeChar.name.toLowerCase() || subject === 'the subject')) {
        subject = charDesc || subject
    }
    const compPrompt = COMPOSITION_PROMPTS[selections.composition]
    const compositionNarrative = compPrompt ? `, arranged with a ${compPrompt}` : ''
    const isStyleNone = selections.style === 'none'

    // EDITING TEMPLATE (Multi-modal)
    if (selections.referenceImage) {
        return `Using the provided image of ${subject}, please modify the scene. 
        Ensure the output maintains the original image's ${lighting?.label || 'lighting'} and composition, 
        but adjust the elements as follows: ${shotType} framing with ${lensDesc}${compositionNarrative}. 
        ${!isStyleNone && artStyle?.quality ? `Focus on ${artStyle.quality}. ` : ''}The final image should be in a ${selections.aspectRatio} aspect ratio.`
    }

    // Opening: inject style only if not None
    let opening = shotType
    if (!isStyleNone) {
        const styleLabel = artStyle?.narrative || 'photorealistic'
        if (opening.startsWith('A ')) opening = opening.replace('A ', `A ${styleLabel} `)
        else if (opening.startsWith('An ')) opening = opening.replace('An ', `An ${styleLabel} `)
        else opening = `${styleLabel} ${opening}`
    }

    const camNarrative = cam.narrative.charAt(0).toUpperCase() + cam.narrative.slice(1)

    // Pro Features Narratives
    const focusCtrl = PRO_FOCUS_CONTROLS.find(f => f.id === selections.focusPoint)

    let proNotes = []
    if (focusCtrl && focusCtrl.id !== 'none') proNotes.push(focusCtrl.narrative)
    if (selections.searchGrounding) proNotes.push("Augment the scene with accurate real-world knowledge and real-time information from Google Search.")

    const proNarrative = proNotes.length > 0 ? ` ${proNotes.join(' ')}` : ''

    // Dynamic Environment Description
    let envDesc = 'meticulously detailed environment'
    if (selections.style === 'cyberpunk') envDesc = 'high-tech, rain-slicked futuristic cityscape'
    else if (selections.style === 'oil_painting') envDesc = 'richly textured canvas with visible impasto strokes'
    else if (selections.style === 'architecture') envDesc = 'geometrically perfect architectural setting'
    else if (selections.style === 'product') envDesc = 'minimalist, commercial-grade studio environment'
    else if (selections.style === 'anime') envDesc = 'painterly, stylized anime background'

    const lightingNarrative = selections.lighting === 'none' ? 'natural, balanced lighting' : (lighting?.narrative || 'cinematic lighting')
    const finalAtmosphere = (selections.lighting === 'none' && selections.style === 'realistic')
        ? 'creating an authentic and true-to-life atmosphere'
        : `creating a ${mood} atmosphere`

    // Quality emphasis — omit entirely if style is None
    const qualityEmphasis = !isStyleNone && artStyle?.quality
        ? `, emphasizing ${artStyle.quality}`
        : ''

    return `${opening} of ${subject}, set in a ${envDesc}${compositionNarrative}. The scene is ${lightingNarrative}, ${finalAtmosphere}. ${camNarrative}, with ${lensDesc}, and ${fstopDesc}${qualityEmphasis}.${proNarrative} The final image should be composed for a ${selections.aspectRatio} aspect ratio.`
}

/**
 * Standard prompt builder for non-Gemini models (Flux, GPT Image).
 * Uses the structured keyword + flag format these models expect.
 */
const buildStandardPrompt = (selections, getFStop) => {
    const cam = CAMERA_MODELS.find(c => c.id === selections.camera) || CAMERA_MODELS[0]
    const angle = CAMERA_ANGLES.find(a => a.id === selections.angle)?.label || ''
    const lighting = LIGHTING_STYLES.find(l => l.id === selections.lighting)?.label || ''
    const artStyle = ART_STYLES.find(s => s.id === selections.style)?.label || ''
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
    const compositionPart = compKeyword ? `, ${compKeyword}` : ''

    return `${refContext}${artStyle} style image of ${subject}. Shot on ${cam.label} with ${selections.lens} lens at ${selections.focalLength}mm (${getFStop(selections.aperture)}). ${angle} shot${compositionPart}. ${lighting} lighting. Ultra-detailed, 4K, cinematic. --ar ${selections.aspectRatio}`
}

/**
 * Video prompt builder for Veo.
 * Gemini Veo also benefits from narrative language.
 */
const buildVideoPrompt = (selections, selectedModel) => {
    // ─── Resolve UI selections into narratives ───────────────────────────
    const cam = CAMERA_MODELS.find(c => c.id === selections.camera) || CAMERA_MODELS[0]
    const artStyle = ART_STYLES.find(s => s.id === selections.style)
    const lighting = LIGHTING_STYLES.find(l => l.id === selections.lighting)

    const subject = (selections.subjectDescription || selections.subject || '').trim() || 'the subject'
    const action = (selections.actionDescription || '').trim()
    const context = (selections.contextDescription || '').trim()

    // ── [1] CINEMATOGRAPHY: Camera shot + movement ──────────────────────
    const movement = selections.cameraMovement || 'Static Shot'
    const shotAngle = CAMERA_ANGLES.find(a => a.id === selections.angle)?.label || ''

    // Map speed ramp to cinematic language
    const speedRampMap = {
        'Cinematic': 'with a smooth, cinematic tempo',
        'Slow Motion': 'in dramatic slow motion',
        'Fast Cut': 'with intense fast-cut pacing',
        'Time Lapse': 'as a sweeping time-lapse',
        'Hyperlapse': 'as a dynamic hyperlapse',
        'Ramp Up': 'starting slow then ramping to full speed',
        'Ramp Down': 'starting at speed then gracefully decelerating',
    }
    const speedNarrative = speedRampMap[selections.speedRamp] || 'at a cinematic pace'

    const cameraClause = movement === 'Static Shot'
        ? `${shotAngle ? shotAngle + ', ' : ''}static, locked-off framing`
        : (() => {
            const movementObj = CAMERA_MOVEMENT.find(m => m.label === movement);
            const narrative = movementObj?.desc || movement;
            return `${narrative}${shotAngle ? ' from a ' + shotAngle.toLowerCase() : ''}`;
        })();

    // ── [2] SUBJECT ──────────────────────────────────────────────────────
    // ── [3] ACTION ───────────────────────────────────────────────────────
    const actionClause = action ? `, ${action}` : ''

    // ── [4] CONTEXT: Environment + lighting ──────────────────────────────
    const contextClause = context ? `, set in ${context}` : ''
    const lightingNarrative = lighting?.narrative || lighting?.label?.toLowerCase() || 'cinematic lighting'

    // ── [5] STYLE & AMBIANCE ─────────────────────────────────────────────
    const styleNarrative = artStyle?.narrative || artStyle?.label?.toLowerCase() || 'photorealistic'

    // Emotion tag (Veo 3.1 supports this natively)
    const emotion = selections.emotion && selections.emotion !== 'Neutral'
        ? ` Emotion: ${selections.emotion}.`
        : ''

    // ── AUDIO LAYER (Veo 3.1 audio guide) ───────────────────────────────
    const audioLines = []
    const audioActive = selections.audioActive || {}
    const audioPrompts = selections.audioPrompts || {}

    // Only build audio lines if the main audio toggle is ON
    if (selections.audio === 'On') {
        if (audioActive.dialogue) {
            if (audioPrompts.dialogue) audioLines.push(`A voice says, "${audioPrompts.dialogue}".`)
            else if (selections.dialogue && selections.dialogue !== 'Off') audioLines.push(`Dialogue: ${selections.dialogue}.`)
        }

        if (audioActive.sfx && audioPrompts.sfx) {
            audioLines.push(`SFX: ${audioPrompts.sfx}.`)
        }

        if (audioActive.ambient) {
            if (audioPrompts.ambient) audioLines.push(`Ambient noise: ${audioPrompts.ambient}.`)
            else audioLines.push('Ambient noise: natural, immersive soundscape.')
        }

        if (audioActive.music && audioPrompts.music) {
            audioLines.push(`Music: ${audioPrompts.music}.`)
        }
    }

    // ── FRAME REFERENCE ──────────────────────────────────────────────────
    const frameRef = []
    if (selections.firstFrame) frameRef.push('starting from the provided first frame')
    if (selections.lastFrame) frameRef.push('transitioning to the provided last frame')
    const frameClause = frameRef.length > 0 ? ` [Frame refs: ${frameRef.join(' and ')}].` : ''

    // ── TIMESTAMP PROMPTING (multi-shot) ─────────────────────────────────
    const segments = selections.timestampSegments || []
    const hasTimestamps = segments.length > 1 && segments.some(s => s.description?.trim())
    let timestampBlock = ''
    if (hasTimestamps) {
        timestampBlock = '\n\n' + segments
            .filter(s => s.description?.trim())
            .map(s => `[${String(s.start).padStart(2, '0')}:${String((s.start % 1 * 60) | 0).padStart(2, '0')}-${String(s.end).padStart(2, '0')}:${String((s.end % 1 * 60) | 0).padStart(2, '0')}] ${s.description.trim()}`)
            .join('\n')
    }

    // ── Assemble final Veo 3.1 prompt ────────────────────────────────────
    // Formula: [Cinematography], [Subject], [Action], [Context]. [Style & Ambiance]. [Audio]. [Frame refs].
    const core = `${cameraClause}, ${subject}${actionClause}${contextClause}.`
    const style = ` ${styleNarrative} aesthetic, ${lightingNarrative}, ${speedNarrative}.`
    
    // Remove "Recorded on..." for I2V/Interpolation as the source image already defines the visual baseline
    // The user explicitly requested to remove this when images are used.
    const camera = (selections.firstFrame || selections.lastFrame || selections.referenceImage) 
        ? '' 
        : ` Recorded on ${cam.label} for maximum cinematic realism.`
        
    // Audio directions are only appended if the main Audio toggle is set to "On"
    const audio = (audioLines.length > 0 && selectedModel !== 'veo-fast' && selections.audio === 'On') 
        ? ' ' + audioLines.join(' ') 
        : ''

    // ── Pro Lighting Transforms (Legacy) ───────────────────────────────
    const transform = PRO_LIGHTING_TRANSFORMS.find(t => t.id === selections.lightingTransform)
    const transformNarrative = (transform && transform.id !== 'none') ? ` Lighting Transform: ${transform.narrative}` : ''

    return (core + style + camera + emotion + transformNarrative + audio + frameClause + timestampBlock).trim()
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

// ── SUB-COMPONENTS (Defined outside to prevent unmount on render) ──
const KlingShotBuilder = ({ selections, setSelections }) => (
    <div className="w-1/3 shrink-0 h-full">
        <div className="h-full bg-blue-500/5 border border-blue-500/20 rounded-xl p-2 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Kling Shot Builder
                </label>
                <button 
                    onClick={() => setSelections(p => ({ 
                        ...p, 
                        timestampSegments: [...(p.timestampSegments || []), { id: Date.now(), start: 0, end: 2, description: '' }] 
                    }))}
                    className="px-1.5 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded text-blue-400 text-[8px] font-black uppercase transition-all"
                >
                    + Add Segment
                </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[40px]">
                {(selections.timestampSegments || []).map((seg, idx) => (
                    <div key={seg.id || idx} className="bg-black/40 border border-blue-500/5 rounded-lg p-1.5 space-y-1 group/seg">
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
                                    className="w-6 bg-white/5 border-none p-0 px-0.5 focus:outline-none rounded text-center text-blue-400"
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
                                    className="w-6 bg-white/5 border-none p-0 px-0.5 focus:outline-none rounded text-center text-blue-400"
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
                        <Zap className="w-6 h-6 mb-1 text-blue-400" />
                        <span className="text-[7px] font-bold uppercase text-blue-400">Add sequence mapping</span>
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
                <Zap className="w-3.5 h-3.5" /> Kling Character Layer
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

const TimestampMultiShot = ({ selections, setSelections }) => (
    <div className="w-1/3 shrink-0 h-full">
        <div className="h-full bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Timestamp Multi-Shot
                </label>
                <button 
                    onClick={() => setSelections(p => ({ 
                        ...p, 
                        timestampSegments: [...(p.timestampSegments || []), { id: Date.now(), start: 0, end: 2, description: '' }] 
                    }))}
                    className="px-1.5 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded text-blue-400 text-[8px] font-black uppercase transition-all"
                >
                    + Add Segment
                </button>
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
                                    className="w-6 bg-white/5 border-none p-0 px-0.5 focus:outline-none rounded text-center text-blue-400"
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
                                    className="w-6 bg-white/5 border-none p-0 px-0.5 focus:outline-none rounded text-center text-blue-400"
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
                            placeholder="Segment description..."
                            className="w-full bg-white/5 border border-white/5 rounded p-1 text-[10px] text-white/80 placeholder:text-white/10 focus:outline-none resize-none h-8 custom-scrollbar"
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

const VideoNarrativeComponents = ({ mode, isNanoBanana, allRefItems, setShowRefBoard, selections, handleTextChange, mentionSearch, setMentionSearch, mentionField, selectMention, textareaRef, handleRefinePrompt, isPolishing }) => (
    <div className={cn("h-full", mode === 'video' ? "w-2/3" : "flex-1")}>
        <div className="bg-white/5 border border-white/10 rounded-xl p-2 h-full flex-1 flex flex-col">
            <label className="w-full text-[10px] font-bold text-[#D4FF00] uppercase tracking-widest flex items-center mb-2">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRefinePrompt(); }}
                        disabled={isPolishing}
                        className={cn("p-1 hover:bg-[#D4FF00]/10 rounded-md transition-all group/pen cursor-pointer", isPolishing && "opacity-50 cursor-wait")}
                        title="AI Refine Prompt/Narrative"
                    >
                        <PenTool className={cn("w-3.5 h-3.5 text-[#D4FF00] group-hover/pen:scale-110 transition-transform", isPolishing && "animate-pulse")} />
                    </button>
                    <Sparkles className="w-3.5 h-3.5" />
                    {mode === 'video' ? 'Video Narrative Components' : isNanoBanana ? 'Scene Narrative' : 'Vision Input'}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-gray-600 font-normal normal-case tracking-normal text-[9px] hidden sm:block">Type @ to tag a character</span>
                    <button onClick={() => setShowRefBoard(true)} className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-purple-400 transition-all font-sans normal-case tracking-normal">
                        <span className="text-[11px] font-black">@</span><span className="text-[9px] font-bold hidden sm:block">Refs</span>
                        {allRefItems.length > 0 && <span className="w-3.5 h-3.5 rounded-full bg-purple-500 text-white text-[7px] font-black flex items-center justify-center">{allRefItems.length}</span>}
                    </button>
                </div>
            </label>
            <div className="relative flex-1 flex flex-col min-h-[40px]">
                {mode === 'video' ? (
                    <div className="grid grid-cols-3 gap-2 h-full">
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[8px] font-bold text-white/30 uppercase">Subject</span>
                                <button 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRefinePrompt('subjectDescription'); }}
                                    className="p-1 hover:bg-[#D4FF00]/10 rounded transition-all group/pen cursor-pointer"
                                    title="AI Refine Subject"
                                >
                                    <PenTool className="w-2.5 h-2.5 text-[#D4FF00]/40 group-hover/pen:text-[#D4FF00]" />
                                </button>
                            </div>
                            <textarea
                                value={selections.subjectDescription}
                                onChange={(e) => handleTextChange('subjectDescription', e)}
                                placeholder="Who or what..."
                                className="w-full bg-black/40 border border-white/5 rounded-lg p-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none resize-none flex-1 custom-scrollbar"
                            />
                        </div>
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[8px] font-bold text-white/30 uppercase">Action</span>
                                <button 
                                    onClick={(e) => { e.preventDefault(); handleRefinePrompt('actionDescription'); }}
                                    className="p-1 hover:bg-[#D4FF00]/10 rounded transition-all group/pen"
                                    title="AI Refine Action"
                                >
                                    <PenTool className="w-2.5 h-2.5 text-[#D4FF00]/40 group-hover/pen:text-[#D4FF00]" />
                                </button>
                            </div>
                            <textarea
                                value={selections.actionDescription}
                                onChange={(e) => handleTextChange('actionDescription', e)}
                                placeholder="What is happening..."
                                className="w-full bg-black/40 border border-white/5 rounded-lg p-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none resize-none flex-1 custom-scrollbar"
                            />
                        </div>
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[8px] font-bold text-white/30 uppercase">Context</span>
                                <button 
                                    onClick={(e) => { e.preventDefault(); handleRefinePrompt('contextDescription'); }}
                                    className="p-1 hover:bg-[#D4FF00]/10 rounded transition-all group/pen"
                                    title="AI Refine Context"
                                >
                                    <PenTool className="w-2.5 h-2.5 text-[#D4FF00]/40 group-hover/pen:text-[#D4FF00]" />
                                </button>
                            </div>
                            <textarea
                                value={selections.contextDescription}
                                onChange={(e) => handleTextChange('contextDescription', e)}
                                placeholder="Environment/Lighting..."
                                className="w-full bg-black/40 border border-white/5 rounded-lg p-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none resize-none flex-1 custom-scrollbar"
                            />
                        </div>
                    </div>
                ) : (
                    <textarea
                        ref={textareaRef}
                        value={selections.subject}
                        onChange={(e) => handleTextChange('subject', e)}
                        placeholder={isNanoBanana ? "Describe your scene..." : "Describe your cinematic vision..."}
                        className="w-full bg-black/40 border border-purple-500/10 rounded-lg p-2 text-sm text-white placeholder:text-gray-600 focus:outline-none resize-none flex-1 custom-scrollbar"
                    />
                )}
                
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
    <div className="flex-1 min-w-[140px]">
        <label className="text-[10px] font-bold text-yellow-500 mb-1 block uppercase tracking-wider flex items-center gap-1.5">
            <Sun className="w-3 h-3" /> Pro Lighting
        </label>
        <select
            value={selections.lightingTransform}
            onChange={e => setSelections(p => ({ ...p, lightingTransform: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white"
        >
            {PRO_LIGHTING_TRANSFORMS.map(t => (
                <option key={t.id} value={t.id} className="bg-[#111]">{t.label}</option>
            ))}
        </select>
    </div>
)

export function PromptGenerator({ onUpscale }) {
    const [mode, setMode] = useState('image')
    const [previewTab, setPreviewTab] = useState('image')
    const [selectedModel, setSelectedModel] = useState('nano-banana')
    const [showCinematography, setShowCinematography] = useState(true)
    const [selections, setSelections] = useState({
        camera: 'arri', angle: 'wide', lighting: 'cinematic', style: 'realistic',
        lens: '35mm', composition: 'none', focalLength: 35, aperture: 45,
        aspectRatio: '16:9', subject: '', referenceImage: null, quality: '1k',
        videoInputMode: 'text', referenceUsage: 'first_frame', referenceImageEnd: null,
        firstFrame: null, lastFrame: null, editInstruction: '',
        timestampSegments: [{ start: 0, end: 2, description: '' }],
        cameraMovement: 'Static Shot', lensFocus: 'deep_focus', emotion: 'Neutral',
        speedRamp: 'Cinematic', dialogue: 'Off', fps: '24fps — Cinematic',
        loop: 'Off', audio: 'On', cinematographyDescription: '',
        subjectDescription: '', actionDescription: '', contextDescription: '',
        audioActive: { dialogue: false, sfx: false, ambient: false, music: false },
        audioPrompts: { dialogue: '', sfx: '', ambient: '', music: '' },
        duration: "4 Seconds", resolution: "1080p",
        searchGrounding: false, lightingTransform: 'none', focusPoint: 'none',
        multishotMode: 'single', quality: '2k',
    })

    const [frames, setFrames] = useState([])
    const [activeFrameId, setActiveFrameId] = useState(null)
    const [queueStatus, setQueueStatus] = useState("Initializing...")

    // ─────────────────────────────────────────────
    // PERSISTENCE STATE for Storyboard / Multi Shot
    // ─────────────────────────────────────────────
    const [storyboardSlots, setStoryboardSlots] = useState([
        { id: 'sb-1', url: null, loading: false, prompt: '', duration: '1.0s' },
        { id: 'sb-2', url: null, loading: false, prompt: '', duration: '1.5s' },
        { id: 'sb-3', url: null, loading: false, prompt: '', duration: '0.5s' },
        { id: 'sb-4', url: null, loading: false, prompt: '', duration: '2.0s' },
    ]);
    const [shotSlots, setShotSlots] = useState([
        { id: 'ms-1', url: null, loading: false, prompt: '', duration: 'N/A' },
    ]);
    const [upscaling, setUpscaling] = useState(false);
    const [upscaledImage, setUpscaledImage] = useState(null)
    const [activeStorySlotId, setActiveStorySlotId] = useState('sb-1');
    const [activeShotSlotId, setActiveShotSlotId] = useState('ms-1');

    const [leftPreviewId, setLeftPreviewId] = useState(null)
    const [rightPreviewId, setRightPreviewId] = useState(null)
    const [renderTarget, setRenderTarget] = useState('center')
    const MAX_FRAMES = 50

    const removeFrame = async (id) => {
        setFrames(prev => {
            const frameToDelete = prev.find(f => f.id === id)
            if (!frameToDelete) return prev

            // Save to "hidden" list in localStorage so it persists after refresh without deleting from DB
            try {
                const hidden = JSON.parse(localStorage.getItem('hidden_filmstrip_frames') || '[]')
                if (!hidden.includes(id)) {
                    hidden.push(id)
                    localStorage.setItem('hidden_filmstrip_frames', JSON.stringify(hidden))
                }
            } catch (e) { console.error("Failed to update hidden frames:", e) }

            const updated = prev.filter(f => f.id !== id)
            if (id === activeFrameId) {
                if (updated.length > 0) setActiveFrameId(updated[0].id)
                else setActiveFrameId(null)
            }
            if (leftPreviewId === id) setLeftPreviewId(null)
            if (rightPreviewId === id) setRightPreviewId(null)
            
            return updated
        })
    }

    const gridImgRef = useRef(null)
    const [showGallery, setShowGallery] = useState(false)
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

    const [refBoard, setRefBoard] = useState({ characters: [], locations: [], wardrobes: [], props: [], moods: [] })
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

    const handleRefinePrompt = async (specificField = null) => {
        setIsPolishing(true)
        try {
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
        const category = item.category + 's'
        setRefBoard(prev => ({ ...prev, [category]: [...prev[category], item] }))
    }
    const renameRefItem = (id, newName) => {
        setRefBoard(prev => {
            const updated = {}
            for (const [key, arr] of Object.entries(prev)) {
                updated[key] = arr.map(i => i.id === id ? { ...i, name: newName } : i)
            }
            return updated
        })
    }

    const removeRefItem = (id) => {
        setRefBoard(prev => {
            const updated = {}
            for (const [key, arr] of Object.entries(prev)) { updated[key] = arr.filter(i => i.id !== id) }
            return updated
        })
    }
    const getTaggedRefItems = (text) => {
        const mentions = ((text || '').match(/@(\w+)/g) || []).map(m => m.slice(1).toLowerCase())
        return allRefItems.filter(item => mentions.some(m => item.name?.toLowerCase().replace(/\s+/g, '') === m || item.name?.toLowerCase().includes(m)))
    }

    const handleRefUpload = (e) => {
        const file = e.target.files?.[0]
        const target = e.target
        if (file && activeRefUploadCategory) {
            const fileName = file.name.split('.')[0]
            const categoryLabel = activeRefUploadCategory.replace(/s$/, '')

            // Slight delay to ensure prompt appears clearly after file dialog closes
            setTimeout(() => {
                const customName = window.prompt(`Enter a name for this ${categoryLabel}:`, fileName)
                if (customName === null) {
                    target.value = ''
                    return
                }

                const reader = new FileReader()
                reader.onloadend = () => {
                    const img = new Image()
                    img.onload = () => {
                        const canvas = document.createElement('canvas')
                        let width = img.width
                        let height = img.height
                        const maxDimension = 1024
                        if (width > maxDimension || height > maxDimension) {
                            if (width > height) {
                                height = Math.round((height * maxDimension) / width)
                                width = maxDimension
                            } else {
                                width = Math.round((width * maxDimension) / height)
                                height = maxDimension
                            }
                        }
                        canvas.width = width
                        canvas.height = height
                        const ctx = canvas.getContext('2d')
                        ctx.drawImage(img, 0, 0, width, height)
                        const compressedData = canvas.toDataURL('image/jpeg', 0.8)

                        const newItem = {
                            id: crypto.randomUUID(),
                            name: (customName || fileName).replace(/\s+/g, ''),
                            category: categoryLabel,
                            imageUrl: compressedData,
                            isMatrix: false
                        }
                        addRefItem(newItem)
                        target.value = ''
                    }
                    img.src = reader.result
                }
                reader.readAsDataURL(file)
            }, 100)
        }
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
        if (selectedModel === 'gemini-3-pro-image-preview') setSelections(p => ({ ...p, quality: ['1k', '2k', '4k'].includes(p.quality) ? p.quality : '2k' }))
        else if (selectedModel === 'gemini-2.5-flash-image') setSelections(p => ({ ...p, quality: '1k' }))
    }, [selectedModel])

    // Removed automatic reference board population to follow "Session Only" rule.

    // ── Load Recent Generations from DB ──
    const loadRecentFrames = async () => {
        if (!supabase) return;
        try {
            console.log('[PromptGenerator] Loading recent frames from DB...');
            let query = supabase.from('assets').select('*');
            
            // If we have a user, only show their assets. Otherwise show all (historical/public)
            if (userProfile?.id) {
                query = query.eq('user_id', userProfile.id);
            }
            
            const { data: assets, error } = await query
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('[PromptGenerator] Supabase error loading assets:', error.message);
                return;
            }

            if (assets && assets.length > 0) {
                console.log(`[PromptGenerator] Found ${assets.length} historical frames.`);
                // Get list of frames user has hidden from the strip
                let hiddenIds = []
                try {
                    hiddenIds = JSON.parse(localStorage.getItem('hidden_filmstrip_frames') || '[]')
                } catch (e) { console.warn("[PromptGenerator] Hidden frames parse error:", e) }

                const recentFrames = assets
                    .filter(a => !hiddenIds.includes(a.id)) // Surgical curation: filter out hidden ones
                    .map(a => ({
                        id: a.id,
                        assetId: a.id,
                        url: a.url,
                        assetPath: a.url,
                        type: a.type || 'image',
                        model: a.model || 'Historical',
                        loading: false
                    }))
                
                setFrames(prev => {
                    const sessionIds = new Set(prev.map(f => f.id));
                    const newHistorical = recentFrames.filter(f => !sessionIds.has(f.id));
                    if (newHistorical.length === 0) return prev;
                    return [...prev, ...newHistorical];
                });

                setFrames(prev => {
                    if (prev.length > 0 && !activeFrameId) {
                        setActiveFrameId(prev[0].id);
                    }
                    return prev;
                });
            } else {
                console.log('[PromptGenerator] No historical frames found in DB.');
            }
        } catch (err) {
            console.error('[PromptGenerator] Failed to load recent frames logic:', err);
        }
    }
    useEffect(() => { loadRecentFrames() }, [userProfile?.id])

    const getFStop = (ap) => {
        if (selections.camera === 'iphone' || selections.camera === 'gopro') return 'Auto Aperture'
        if (ap < 20) return 'f/1.4 (Blurry BG)'; if (ap < 40) return 'f/2.8 (Soft Focus)'
        if (ap < 60) return 'f/5.6 (Standard)'; if (ap < 80) return 'f/8.0 (Sharp)'
        return 'f/16 (Everything in Focus)'
    }

    const isNanoBanana = selectedModel === 'nano-banana' || selectedModel.includes('gemini') || selectedModel === 'nano-banana-2'
    const isKling = ['kling', 'kling-2.6', 'kling-3.0', 'kling-2.1'].includes(selectedModel)


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
        const text = selections[mentionField] || ''
        const before = text.slice(0, mentionCursorPos).replace(/@\w*$/, '')
        const after = text.slice(mentionCursorPos)
        // Auto-format name to be mention-friendly (no spaces)
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
        ? buildVideoPrompt(selections, selectedModel)
        : selectedModel === 'gemini-3-pro-image-preview' ? buildNanoBananaProPrompt(selections)
            : ['gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview'].includes(selectedModel) ? buildNanoBananaPrompt(selections)
                : buildStandardPrompt(selections, getFStop)

    const copyPrompt = () => navigator.clipboard.writeText(generatedPrompt)

    const downloadImage = (url, filename = 'flare-gen.png') => {
        const a = document.createElement('a'); a.href = url; a.download = filename
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
    }

    const saveAsset = async (url, slot, type = 'image') => {
        try {
            const ext = type === 'video' ? 'mp4' : 'png'
            const fileName = `flare_${slot}_${Date.now()}.${ext}`
            const { data: { user } } = await supabase.auth.getUser()
            const res = await fetch(getApiUrl('/api/save-asset'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageData: url, fileName, type, userId: user?.id }) })
            const data = await res.json()
            return { path: data.path, id: data.id }
        } catch (err) { 
            console.error('[SAVE_ASSET] Error:', err)
            return null 
        }
    }

    const updateVideoSetting = (key, val) => {
        setSelections(p => { let u = { ...p, [key]: val }; if (key === 'dialogue' && val !== 'Off' && val !== 'Ambient Only') u.audio = 'On'; return u })
    }

    const SpeedRampCurve = ({ name, active }) => {
        const pts = (SPEED_RAMP_CURVES[name] || SPEED_RAMP_CURVES.Linear).map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0] * 0.8},${p[1]}`).join(' ')
        return (<svg width="80" height="62" viewBox="0 0 80 62" className="mx-auto"><path d={pts} fill="none" stroke={active ? '#84CC16' : '#333'} strokeWidth={active ? 2 : 1} strokeLinecap="round" strokeLinejoin="round" /></svg>)
    }

    const pollJobStatus = async (jobId, frameId, costKey) => {
        try {
            let attempt = 0;
            const maxAttempts = 120; // 4 minutes max
            while (attempt < maxAttempts) {
                const res = await fetch(getApiUrl(`/api/job-status/${jobId}`));
                if (!res.ok) throw new Error('Failed to fetch job status');
                const data = await res.json();
                
                if (data.status === 'completed') {
                    const resultUrl = data.url || data.videoUrl;
                    if (resultUrl) {
                        // Show video/image IMMEDIATELY, save to DB in background
                        setFrames(prev => prev.map(f => f.id === frameId ? { ...f, url: resultUrl, loading: false } : f));
                        if (renderTarget === 'left') setLeftPreviewId(frameId);
                        else if (renderTarget === 'right') setRightPreviewId(frameId);
                        setRenderTarget('center');
                        // Non-blocking asset save
                        saveAsset(resultUrl, frameId, mode === 'video' ? 'video' : 'image').then(assetData => {
                            if (assetData) setFrames(prev => prev.map(f => f.id === frameId ? { ...f, assetPath: assetData.path, assetId: assetData.id } : f));
                        }).catch(e => console.warn('[SAVE_ASSET_BG]', e));
                    }
                    return;
                } else if (data.status === 'failed') {
                    throw new Error(data.error || 'Generation failed in queue');
                } else if (data.status === 'queued') {
                    setQueueStatus(`Waiting in line (Position: ${data.position || '?'})`);
                } else if (data.status === 'processing') {
                    setQueueStatus(`Processing ${data.progress || 0}%`);
                }
                
                attempt++;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            throw new Error('Generation timed out in queue');
        } catch (err) {
            await refund(costKey);
            console.error('Polling error:', err);
            let msg = err.message;
            if (msg.toLowerCase().includes('safety system')) msg = "Creative Block: The AI's safety filters flagged this prompt.";
            alert(`AI Engine Status: ${msg}`);
            setFrames(prev => prev.map(f => f.id === frameId ? { ...f, loading: false, error: true } : f));
        } finally {
            setIsLoading(false);
            setQueueStatus("Initializing...");
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id) fetchBalance(user.id);
        }
    };

    const generateImage = async () => {
        const modelInfo = AI_MODELS.find(m => m.id === selectedModel)
        if (!modelInfo?.available) { alert(`${modelInfo?.name || 'This model'} is coming soon!`); return }
        if (frames.length >= MAX_FRAMES) { alert('Frame limit reached (50). Clear some frames.'); return }

        let costKey = 'image_nano_banana';
        if (mode === 'video') {
            if (isKling) costKey = 'kling';
            else costKey = selectedModel === 'veo-fast' ? 'veo_fast' : 'veo_full';
        } else if (mode === 'multishot' && selections.multishotMode === 'multiple') {
            costKey = 'image_grid_multishot';
        } else {
            if (selectedModel === 'gemini-2.5-flash-image' || selectedModel === 'nano-banana') costKey = 'image_nano_banana';
            if (selectedModel === 'gemini-3.1-flash-image-preview' || selectedModel === 'nano-banana-2' || selectedModel.includes('3.1-flash')) costKey = 'image_nano_banana_2';
            if (selectedModel === 'gemini-3-pro-image-preview' || selectedModel === 'nano-banana-pro' || selectedModel.includes('3.0-pro')) costKey = 'image_nano_banana_pro';
        }

        if (selectedModel === 'veo' || selectedModel === 'veo-fast' || selectedModel === 'kling' || selectedModel.includes('3.0-pro') || selectedModel.includes('3.1-flash')) {
            if (!canAfford(costKey)) {
                alert('Not enough Shorts! 🎞 Top up to continue.');
                return;
            }
        }

        const newFrameId = `frame-${Date.now()}`
        setFrames(prev => [...prev, { id: newFrameId, url: null, type: mode, model: selectedModel, prompt: generatedPrompt, aspectRatio: selections.aspectRatio, loading: true }])
        setActiveFrameId(newFrameId)
        setIsLoading(true)

        try {
            const isGoogleVideo = selectedModel === 'veo' || selectedModel === 'veo-fast' || selectedModel.startsWith('veo-3.1');
            const isKlingVideo = isKling || selectedModel === 'veo-kling';
            const endpoint = getApiUrl((mode === 'video' && !(isGoogleVideo || isKlingVideo)) ? '/api/ugc/video' : '/api/generate-image')
            let refImage = selections.firstFrame || selections.lastFrame || selections.referenceImage
            if (mode === 'video' && !refImage) {
                const store = useAppStore.getState()
                refImage = store.activeCharacter?.image || store.activeCharacter?.identity_kit?.anchor
            }
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
                finalPrompt += ', generated as a 3x3 cinematic grid image showing 9 different creative variations of the exact same subject/scene. Each cell separated by thin black borders. Consistent subject identity across all 9 panels but with varying artistic interpretations.'
            }

            const validRatio = (selections.aspectRatio || '16:9').split('—')[0].trim().split(' ')[0].trim();

            const payload = mode === 'video' ? {
                prompt: finalPrompt,
                userId,
                model: AI_MODELS.find(m => m.id === selectedModel)?.modelId || selectedModel,
                duration: (() => {
                    const taggedRefs = getTaggedRefItems(finalPrompt).flatMap(i => [i.imageUrl]).filter(Boolean);
                    const mustBe8 = selections.lastFrame || taggedRefs.length > 0 
                        || ['1080p', '4K', '4k'].includes(selections.resolution);
                    return mustBe8 ? 8 : (parseInt(selections.duration.split(' ')[0]) || 4);
                })(),
                resolution: (() => {
                    const raw = selections.resolution || '720p';
                    return raw === '4K' ? '4k' : raw.toLowerCase();
                })(),
                aspect_ratio: validRatio,
                firstFrame: selections.firstFrame,
                lastFrame: selections.lastFrame,
                referenceImages: getTaggedRefItems(finalPrompt)
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
                setQueueStatus("Sending to AI Engine...")
                // We do NOT block the thread or call setIsLoading(false) yet.
                pollJobStatus(data.jobId, newFrameId, costKey)
            } else {
                // Synchronous fallback
                if (userId) fetchBalance(userId);
                const resultUrl = data.url || data.videoUrl
                if (resultUrl) {
                    // Show video/image IMMEDIATELY, save to DB in background
                    setFrames(prev => prev.map(f => f.id === newFrameId ? { ...f, url: resultUrl, loading: false } : f))
                    if (renderTarget === 'left') setLeftPreviewId(newFrameId)
                    else if (renderTarget === 'right') setRightPreviewId(newFrameId)
                    setRenderTarget('center')
                    // Non-blocking asset save - never block playback
                    saveAsset(resultUrl, newFrameId, mode === 'video' ? 'video' : 'image').then(assetData => {
                        if (assetData) setFrames(prev => prev.map(f => f.id === newFrameId ? { ...f, assetPath: assetData.path, assetId: assetData.id } : f))
                    }).catch(e => console.warn('[SAVE_ASSET_BG]', e))
                }
                setIsLoading(false)
            }
        } catch (err) {
            await refund(costKey)
            console.error('Generation error:', err)
            let msg = err.message
            if (msg.toLowerCase().includes('safety system')) msg = "Creative Block: The AI's safety filters flagged this prompt. Try refining your subject."
            alert(`AI Engine Status: ${msg}`)
            setFrames(prev => prev.map(f => f.id === newFrameId ? { ...f, loading: false, error: true } : f))
            setIsLoading(false)
        }
    }

    const upscaleImage = async (frameId) => {
        const frame = frames.find(f => f.id === frameId)
        if (!frame || !frame.url) {
            console.error('[4K_UPSCALE] Error: Frame or URL missing', { frameId, frame });
            alert('Upscale failed: Image source not found.');
            return
        }
        const { data: { user } } = await supabase.auth.getUser()

        console.log(`[4K_UPSCALE] Started for frame: ${frameId}`, {
            url: frame.url,
            userId: user?.id || 'anonymous'
        });

        setIsLoading(true)
        setFrames(prev => prev.map(f => f.id === frameId ? { ...f, loading: true } : f))

        try {
            const prompt = frame.prompt || generatedPrompt || 'Cinematic High Fidelity Masterwork'
            const currentModel = AI_MODELS.find(m => m.id === selectedModel)
            const modelToUse = currentModel?.modelId || 'gemini-3.1-flash-image-preview'
            
            const payload = {
                model: modelToUse,
                prompt,
                aspect_ratio: frame.aspectRatio || '16:9',
                quality: '4k',
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
                const assetData = await saveAsset(data.url, frameId, 'image')
                const currentModel = AI_MODELS.find(m => m.id === selectedModel)
                setFrames(prev => prev.map(f => f.id === frameId ? { 
                    ...f, 
                    url: data.url, 
                    assetPath: assetData?.path, 
                    assetId: assetData?.id, 
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
    const runAiUpscale = async (targetImage = null, customPrompt = null) => {
        const imageToProcess = targetImage || upscaledImage
        if (!imageToProcess) {
            console.error('[CROP_UPSCALE] No image found to upscale.');
            alert('Upscale Error: Please select an image.');
            return
        }

        console.log('[CROP_UPSCALE] Initiating 4K refinement...');
        setUpscaling(true)

        try {
            console.log('[CROP_UPSCALE] Checking session...');
            const { data: { user } } = await supabase.auth.getUser()
            console.log('[CROP_UPSCALE] Auth user:', user?.id || 'anonymous');

            // Robust fallback for prompt
            const basePrompt = customPrompt || activeFrame?.prompt || generatedPrompt || 'Cinematic character focal point'
            const prompt = `${basePrompt} - 4K isolate, cinematic texture, high-detail finish`

            const currentModel = AI_MODELS.find(m => m.id === selectedModel)
            const modelToUse = currentModel?.modelId || 'gemini-3.1-flash-image-preview'

            const payload = {
                model: modelToUse,
                prompt,
                aspect_ratio: '16:9',
                quality: '4k',
                image: imageToProcess, // Optimized blob or URL
                userId: user?.id || null
            }

            console.log('[CROP_UPSCALE] Payload size:', Math.round(JSON.stringify(payload).length / 1024), 'KB');
            console.log('[CROP_UPSCALE] Fetching API:', getApiUrl('/api/generate-image'));
            const res = await fetch(getApiUrl('/api/generate-image'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            console.log('[CROP_UPSCALE] Engine result:', data);

            if (!res.ok) throw new Error(data.message || data.error || 'Upscale failed')

            if (data.url) {
                const newId = `frame-${Date.now()}`
                console.log(`[CROP_UPSCALE] Creating new asset: ${newId}`);
                const assetData = await saveAsset(data.url, newId, 'image')

                setFrames(prev => [...prev, {
                    id: newId,
                    url: data.url,
                    assetPath: assetData?.path,
                    assetId: assetData?.id,
                    type: 'image',
                    model: currentModel?.modelId || 'gemini-3.1-flash-image-preview',
                    prompt,
                    aspectRatio: '16:9',
                    loading: false
                }])

                setActiveFrameId(newId)

                // Success cleanup and redirect
                setUpscaledImage(null)
                setMode('image')
                setPreviewTab('image')

                console.log('[CROP_UPSCALE] Finalized successfully.');
            } else {
                throw new Error('AI Engine reported success but URL was missing from the response.');
            }
        } catch (err) {
            console.error('[CROP_UPSCALE] Terminal Failure:', err);
            alert(`AI Upscale Status: ${err.message}`)
        } finally {
            setUpscaling(false)
        }
    }

    const filteredModels = AI_MODELS.filter(m => m.type === (mode === 'multishot' ? 'image' : mode))
    const activeFrame = frames.find(f => f.id === activeFrameId) || null

    return (
        <div className="h-screen overflow-hidden flex flex-col bg-black px-2 pb-0 pt-0 gap-2">
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
                                // Auto-select latest compatible frame
                                const isImageLike = tab.id === 'image' || tab.id === 'multishot';
                                const latestOfTab = [...frames].reverse().find(f => {
                                    if (isImageLike) return (f.type === 'image' || f.type === 'multishot') && f.url;
                                    return f.type === tab.id && f.url;
                                });
                                if (latestOfTab) setActiveFrameId(latestOfTab.id);
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
                        setSelections={setSelections}
                        storyboardSlots={storyboardSlots}
                        setStoryboardSlots={setStoryboardSlots}
                        activeSlotId={activeStorySlotId}
                        setActiveSlotId={setActiveStorySlotId}
                        runAiUpscale={runAiUpscale}
                        upscaling={upscaling}
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
                        setSelections={setSelections}
                        shotSlots={shotSlots}
                        setShotSlots={setShotSlots}
                        activeSlotId={activeShotSlotId}
                        setActiveSlotId={setActiveShotSlotId}
                        runAiUpscale={runAiUpscale}
                        upscaling={upscaling}
                    />
                </div>
            )}

            {/* ─── MAIN CONTENT ─ 3-PANEL LAYOUT ──────────────────────── */}
            {(mode === 'image' || mode === 'video') && (
                <div className="flex-1 min-h-0 flex flex-col gap-2">
                    {/* ── 3 Equal Preview Panels Row ──────────────────────── */}
                    <div className="flex-1 min-h-0 flex gap-2">

                        {/* ── LEFT PREVIEW ──────────────────────────────────── */}
                        <div onClick={() => setRenderTarget('left')}
                            className={cn("flex-1 min-w-0 rounded-2xl surface-glass overflow-hidden relative flex items-center justify-center border-2 transition-all cursor-pointer",
                                renderTarget === 'left' ? "border-[#D4FF00] shadow-[0_0_20px_rgba(212,255,0,0.4)]" : "border-transparent hover:border-white/10")}>
                            {(() => {
                                const isImageLike = mode === 'image' || mode === 'multishot';
                                const leftFrame = frames.find(f => f.id === leftPreviewId && (isImageLike ? (f.type === 'image' || f.type === 'multishot') : f.type === mode))
                                if (leftFrame && leftFrame.url) return (
                                    <div className="relative w-full h-full group">
                                        {leftFrame.type === 'video' ? (
                                            <video src={leftFrame.url} controls loop muted className="w-full h-full object-contain" />
                                        ) : (
                                            <img src={leftFrame.url} alt="Left Preview" className="w-full h-full object-contain" />
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                                            <button onClick={() => setZoomState({ url: leftFrame.url, isOpen: true, slot: leftFrame.id, isEditing: false })} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"><Maximize2 className="w-4 h-4" /></button>
                                            <button onClick={() => downloadImage(leftFrame.url)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"><Download className="w-4 h-4" /></button>
                                            <button onClick={() => setSelections(p => ({ ...p, referenceImage: leftFrame.assetPath || leftFrame.url }))} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white" title="Set as Ref"><ImagePlus className="w-4 h-4" /></button>
                                            <button onClick={() => setLeftPreviewId(null)} className="p-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-white" title="Unpin"><X className="w-4 h-4" /></button>
                                        </div>
                                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#D4FF00]/80 text-black text-[7px] font-black uppercase rounded-md">Left</div>
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
                            className={cn("flex-1 min-w-0 rounded-2xl surface-glass overflow-hidden relative flex items-center justify-center border-2 transition-all cursor-pointer",
                                renderTarget === 'center' ? "border-[#D4FF00] shadow-[0_0_20px_rgba(212,255,0,0.4)]" : "border-transparent hover:border-white/10")}>
                            {activeFrame && (mode === 'video' ? activeFrame.type === 'video' : (activeFrame.type === 'image' || activeFrame.type === 'multishot')) ? (
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
                                                <video src={activeFrame.url} controls autoPlay loop muted className="w-full h-full object-contain" />
                                            ) : (
                                                <div className="relative w-full h-full flex items-center justify-center">
                                                    <img ref={activeFrame.type === 'multishot' ? gridImgRef : null} src={activeFrame.url} alt="Generated" className="w-full h-full object-contain" crossOrigin="anonymous" />
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
                                                <button onClick={() => downloadImage(activeFrame.url)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white pointer-events-auto"><Download className="w-4 h-4" /></button>
                                                <button onClick={() => setSelections(p => ({ ...p, referenceImage: activeFrame.assetPath || activeFrame.url }))} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white pointer-events-auto" title="Set as Ref"><ImagePlus className="w-4 h-4" /></button>
                                                {(activeFrame.type === 'image' || activeFrame.type === 'multishot') && activeFrame.model !== 'gemini-3-pro-image-preview' && (
                                                    <button onClick={() => upscaleImage(activeFrame.id)} className="px-3 py-2 bg-[#D4AF37] hover:bg-yellow-400 rounded-lg text-black text-[9px] font-black uppercase flex items-center gap-1 pointer-events-auto"><Sparkles className="w-3 h-3" /> Upscale 4K</button>
                                                )}
                                                {(activeFrame.type === 'image' || activeFrame.type === 'multishot') && (
                                                    <>
                                                        <button onClick={() => { setSelections(p => ({ ...p, firstFrame: activeFrame.assetPath || activeFrame.url })); setMode('video') }} className="px-2 py-2 bg-[#D4FF00] hover:bg-white rounded-lg text-black text-[9px] font-black uppercase flex items-center gap-1 pointer-events-auto"><Film className="w-3 h-3" /> First</button>
                                                        <button onClick={() => { setSelections(p => ({ ...p, lastFrame: activeFrame.assetPath || activeFrame.url })); setMode('video') }} className="px-2 py-2 bg-purple-500 hover:bg-purple-400 rounded-lg text-white text-[9px] font-black uppercase flex items-center gap-1 pointer-events-auto"><FastForward className="w-3 h-3" /> Last</button>
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
                            className={cn("flex-1 min-w-0 rounded-2xl surface-glass overflow-hidden relative flex items-center justify-center border-2 transition-all cursor-pointer",
                                renderTarget === 'right' ? "border-[#D4FF00] shadow-[0_0_20px_rgba(212,255,0,0.4)]" : "border-transparent hover:border-white/10")}>
                            {(() => {
                                const isImageLike = mode === 'image' || mode === 'multishot';
                                const rightFrame = frames.find(f => f.id === rightPreviewId && (isImageLike ? (f.type === 'image' || f.type === 'multishot') : f.type === mode))
                                if (rightFrame && rightFrame.url) return (
                                    <div className="relative w-full h-full group">
                                        {rightFrame.type === 'video' ? (
                                            <video src={rightFrame.url} controls loop muted className="w-full h-full object-contain" />
                                        ) : (
                                            <img src={rightFrame.url} alt="Right Preview" className="w-full h-full object-contain" />
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                                            <button onClick={() => setZoomState({ url: rightFrame.url, isOpen: true, slot: rightFrame.id, isEditing: false })} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"><Maximize2 className="w-4 h-4" /></button>
                                            <button onClick={() => downloadImage(rightFrame.url)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"><Download className="w-4 h-4" /></button>
                                            <button onClick={() => setSelections(p => ({ ...p, referenceImage: rightFrame.assetPath || rightFrame.url }))} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white" title="Set as Ref"><ImagePlus className="w-4 h-4" /></button>
                                            <button onClick={() => setRightPreviewId(null)} className="p-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-white" title="Unpin"><X className="w-4 h-4" /></button>
                                        </div>
                                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-purple-500/80 text-white text-[7px] font-black uppercase rounded-md">Right</div>
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
                    <div className="shrink-0 h-16 surface-glass rounded-xl p-1 flex gap-1 overflow-x-auto custom-scrollbar">
                        {/* VIDEO MODE: START/END SLOTS & CONTROLS (AT START) */}
                        {mode === 'video' && (
                            <>
                                {/* START FRAME SLOT */}
                                <div className={cn("shrink-0 w-24 h-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group/frame transition-all",
                                    selections.firstFrame ? "bg-[#D4FF00]/10 border-[#D4FF00]/40 shadow-[0_0_10px_rgba(212,255,0,0.2)]" : "bg-lime-500/5 border-lime-500/20 hover:border-lime-500/40")}>
                                    {selections.firstFrame ? (
                                        <>
                                            <img src={selections.firstFrame} className="absolute inset-0 w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/frame:opacity-100 flex items-center justify-center transition-all">
                                                <button onClick={(e) => { e.stopPropagation(); setSelections(p => ({ ...p, firstFrame: null })) }} className="p-1 px-1.5 bg-red-500 rounded text-white text-[10px] font-black uppercase shadow-lg">X</button>
                                            </div>
                                            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#D4FF00] text-black text-[6px] font-black uppercase rounded shadow-sm">Start</div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-0.5 opacity-30 group-hover/frame:opacity-60 transition-opacity">
                                            <ImageIcon className="w-3.5 h-3.5 text-lime-400" />
                                            <span className="text-[6px] font-black text-lime-400 uppercase tracking-tighter">Start Slot</span>
                                        </div>
                                    )}
                                </div>

                                {/* END FRAME SLOT */}
                                <div className={cn("shrink-0 w-24 h-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group/frame transition-all",
                                    selections.lastFrame ? "bg-purple-500/10 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]" : "bg-purple-500/5 border-purple-500/20 hover:border-purple-500/40")}>
                                    {selections.lastFrame ? (
                                        <>
                                            <img src={selections.lastFrame} className="absolute inset-0 w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/frame:opacity-100 flex items-center justify-center transition-all">
                                                <button onClick={(e) => { e.stopPropagation(); setSelections(p => ({ ...p, lastFrame: null })) }} className="p-1 px-1.5 bg-red-500 rounded text-white text-[10px] font-black uppercase shadow-lg">X</button>
                                            </div>
                                            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-purple-500 text-white text-[6px] font-black uppercase rounded shadow-sm">End</div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-0.5 opacity-30 group-hover/frame:opacity-60 transition-opacity">
                                            <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                                            <span className="text-[6px] font-black text-purple-400 uppercase tracking-tighter">End Slot</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* VERTICAL DIVIDER & NEW SCENE */}
                                <div className="shrink-0 w-px h-10 bg-white/10 mx-2 self-center" />
                                
                                <div 
                                    onClick={() => {
                                        setSelections(p => ({
                                            ...p,
                                            subjectDescription: '',
                                            actionDescription: '',
                                            contextDescription: '',
                                            firstFrame: null,
                                            lastFrame: null,
                                            timestampSegments: [{ id: Date.now(), start: 0, end: 2, description: '' }]
                                        }));
                                    }}
                                    className="shrink-0 w-20 h-full rounded-lg border-2 border-dashed border-white/10 hover:border-[#D4FF00]/40 flex items-center justify-center cursor-pointer transition-all group"
                                >
                                    <div className="flex flex-col items-center gap-0.5">
                                        <ArrowRight className="w-3 h-3 text-white/20 group-hover:text-[#D4FF00] transition-colors" />
                                        <span className="text-[6px] font-bold text-white/20 uppercase group-hover:text-[#D4FF00]">New Scene</span>
                                    </div>
                                </div>
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
                                return isImageLike ? (frame.type === 'image' || frame.type === 'multishot') : frame.type === mode;
                            }).map(frame => (
                                <div key={frame.id} className={cn("shrink-0 w-20 h-full rounded-lg overflow-hidden cursor-pointer transition-all border-2 relative group/strip", activeFrameId === frame.id ? "border-[#D4FF00] shadow-[0_0_10px_#D4FF00]" : "border-transparent hover:border-white/20")}>
                                    <div onClick={() => setActiveFrameId(frame.id)} className="w-full h-full">
                                        {frame.loading ? <div className="w-full h-full bg-black/40 flex items-center justify-center"><Sparkles className="w-3 h-3 text-[#D4FF00] animate-spin" /></div>
                                            : frame.url ? (frame.type === 'video' ? <video src={frame.url} muted preload="metadata" className="w-full h-full object-cover" /> : <img src={frame.url} loading="lazy" className="w-full h-full object-cover" />)
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
                <div className={cn("shrink-0 surface-glass rounded-2xl p-2 md:pb-4 relative z-30 transition-shadow", mentionSearch !== null && "shadow-[0_0_50px_rgba(0,0,0,0.5)]")} style={{ maxHeight: '40vh' }}>
                    <div className={cn(
                        "pr-2 pb-16 space-y-2 custom-scrollbar overflow-x-visible",
                        mentionSearch !== null ? "overflow-y-visible" : "overflow-y-auto max-h-[calc(40vh-16px)]"
                    )}>
                        <div className="flex gap-2 items-stretch min-h-[84px] relative">
                            {mode === 'video' && (isKling ? <KlingShotBuilder selections={selections} setSelections={setSelections} /> : <TimestampMultiShot selections={selections} setSelections={setSelections} />)}

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
                                />
                            )}

                        <button onClick={generateImage} disabled={isLoading}
                                className={cn("w-48 shrink-0 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all shadow-2xl active:scale-95 h-full",
                                    isLoading ? "bg-white/5 cursor-not-allowed" : "bg-[#D4FF00] hover:bg-white hover:shadow-[0_0_30px_rgba(212,255,0,0.3)]")}>
                                <Zap className={cn("w-6 h-6 text-black", isLoading && "animate-pulse")} />
                                <span className="text-sm font-black text-black uppercase tracking-tighter">
                                    {isLoading ? 'Computing...' : mode === 'video' ? 'Generate Video' : 'Generate Image'}
                                </span>
                                {!isLoading && (() => {
                                    let displayCost = SHORTS_COST.image_nano_banana;
                                    if (mode === 'video') displayCost = selectedModel === 'veo-fast' ? SHORTS_COST.veo_fast : SHORTS_COST.veo_full;
                                    else if (mode === 'multishot' && selections.multishotMode === 'multiple') displayCost = SHORTS_COST.image_grid_multishot;
                                    else {
                                        if (selectedModel === 'nano-banana-pro' || selectedModel === 'gemini-3.0-pro') displayCost = SHORTS_COST.image_nano_banana_pro;
                                        else if (selectedModel === 'nano-banana-2' || selectedModel === 'gemini-3.1-flash') displayCost = SHORTS_COST.image_nano_banana_2;
                                    }
                                    return (
                                        <span className="text-[10px] font-bold text-black/60 flex items-center gap-1 uppercase tracking-widest mt-0.5">
                                            <Film className="w-3 h-3" /> {displayCost} Shorts
                                        </span>
                                    )
                                })()}
                            </button>
                        </div>
                        {mode === 'video' ? (
                            <div className="space-y-1">
                                <div className="flex flex-wrap gap-2">
                                <div className="flex-1 min-w-[110px]">
                                    <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase tracking-wider">Engine</label>
                                    <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white">
                                        {filteredModels.map(m => <option key={m.id} value={m.id} disabled={!m.available}>{m.name}{m.available ? '' : ' — Soon'}</option>)}
                                    </select>
                                </div>
                                {VIDEO_CONTROLS.filter(c => !['audio', 'dialogue'].includes(c.key)).map(ctrl => {
                                    const val = selections[ctrl.key]
                                    if (ctrl.key === 'speedRamp') return (
                                        <div key={ctrl.key} className="relative flex-1 min-w-[110px]">
                                            <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase tracking-wider">{ctrl.label}</label>
                                            <button onClick={() => setShowSpeedPanel(!showSpeedPanel)} className={cn("w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white flex justify-between items-center", showSpeedPanel ? "bg-white/10 border-white/30" : "hover:bg-white/10")}><span>{val}</span><ChevronDown className="w-3 h-3 opacity-30" /></button>
                                            {showSpeedPanel && (
                                                <div className="absolute bottom-full left-0 mb-3 z-[150] bg-[#0d0d0d] border border-white/10 rounded-2xl p-4 w-[320px] grid grid-cols-3 gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                                                    {ctrl.options.map(opt => (
                                                        <div key={opt} onClick={() => { updateVideoSetting('speedRamp', opt); setShowSpeedPanel(false) }} className={cn("p-2 rounded-xl border cursor-pointer text-center", val === opt ? "bg-[#D4FF00]/10 border-[#D4FF00]/40" : "bg-white/5 border-white/5 hover:border-white/20")}>
                                                            <SpeedRampCurve name={opt} active={val === opt} />
                                                            <div className={cn("text-[8px] mt-2 uppercase font-black", val === opt ? "text-[#D4FF00]" : "text-white/30")}>{opt}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                    return (
                                        <div key={ctrl.key} className="flex-1 min-w-[110px]">
                                            <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase tracking-wider">{ctrl.label}</label>
                                            <select value={val} onChange={e => updateVideoSetting(ctrl.key, e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white">
                                                {(ctrl.key === 'duration' && selectedModel === 'kling' ? ['5 Seconds', '10 Seconds'] : ctrl.options).map(o => <option key={o} value={o} className="bg-[#111]">{o}</option>)}
                                            </select>
                                        </div>
                                    )
                                })}
                                {isKling ? <KlingAudioMode /> : <ProLighting selections={selections} setSelections={setSelections} />}

                            </div>

                            {/* EXCLUSIVE AUDIO DIRECTIONS PANEL for Video */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mt-1">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Mic className="w-4 h-4" /> Audio Direction Layer
                                    </label>
                                    <div className="flex items-center gap-2 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                        <span className="text-[8px] font-black text-purple-400 uppercase tracking-tighter">Audio Engine</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { id: 'dialogue', label: 'Dialogue', icon: Mic, placeholder: 'What they say...' },
                                        { id: 'sfx', label: 'SFX', icon: Zap, placeholder: 'Crunch, bang, splash...' },
                                        { id: 'ambient', label: 'Ambient', icon: Sun, placeholder: 'Rain, wind, crowd...' },
                                        { id: 'music', label: 'Music', icon: Music, placeholder: 'Genre, mood, instruments...' }
                                    ].map(item => (
                                        <div key={item.id} className={cn("space-y-2 group transition-all p-2 rounded-xl border", 
                                            selections.audioActive?.[item.id] ? "bg-purple-500/5 border-purple-500/20" : "bg-black/20 border-white/5")}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <item.icon className={cn("w-3.5 h-3.5", selections.audioActive?.[item.id] ? "text-purple-400" : "text-white/20")} />
                                                    <span className={cn("text-[9px] font-black uppercase tracking-wider", selections.audioActive?.[item.id] ? "text-white" : "text-white/20")}>{item.label}</span>
                                                </div>
                                                <button 
                                                    onClick={() => setSelections(p => ({ 
                                                        ...p, 
                                                        audioActive: { ...p.audioActive, [item.id]: !p.audioActive?.[item.id] } 
                                                    }))}
                                                    className={cn("w-5 h-2.5 rounded-full relative transition-colors border", 
                                                        selections.audioActive?.[item.id] ? "bg-purple-500 border-purple-400 shadow-[0_0_5px_rgba(168,85,247,0.5)]" : "bg-white/10 border-white/10")}
                                                >
                                                    <div className={cn("absolute top-px w-1.5 h-1.5 rounded-full bg-white transition-all", selections.audioActive?.[item.id] ? "right-0.5" : "left-0.5")} />
                                                </button>
                                            </div>
                                            <textarea 
                                                value={selections.audioPrompts?.[item.id] || ''}
                                                onChange={(e) => setSelections(p => ({
                                                    ...p,
                                                    audioPrompts: { ...p.audioPrompts, [item.id]: e.target.value }
                                                }))}
                                                disabled={!selections.audioActive?.[item.id]}
                                                placeholder={item.placeholder}
                                                className={cn("w-full bg-black/40 border border-white/5 rounded-lg p-1.5 text-[9px] text-white placeholder:text-white/5 focus:outline-none resize-none h-12 custom-scrollbar transition-opacity", 
                                                    !selections.audioActive?.[item.id] && "opacity-20 pointer-events-none")}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                            <div className="flex w-full gap-2">
                                {['engine', 'camera', 'angle', 'lens', 'composition', 'lighting', 'style', 'aspectRatio', 'quality'].map(key => {
                                    let flexValue = 1;
                                    if (key === 'engine' || key === 'composition') flexValue = 1.5;
                                    if (key === 'lens' || key === 'quality') flexValue = 0.5;

                                    return (
                                        <div key={key} style={{ flex: flexValue }} className="min-w-0">
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
                                                    {key === 'quality' && ['1k', '2k', '4k'].map(q => <option key={q} value={q}>{q}</option>)}
                                                </select>
                                            )}
                                        </div>
                                    )
                                })}
                                {(mode === 'multishot' || mode === 'image') && (
                                    <div style={{ flex: 1 }} className="min-w-0">
                                        <label className="text-[10px] font-bold text-purple-400 mb-1 block uppercase tracking-wider truncate">Variations</label>
                                        <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5">
                                            <button onClick={() => setSelections(p => ({ ...p, multishotMode: 'single' }))}
                                                className={cn("flex-1 py-1 px-2 rounded-md text-[9px] font-black uppercase transition-all truncate",
                                                    selections.multishotMode === 'single' ? "bg-white/10 text-white shadow-inner" : "text-gray-500 hover:text-gray-300")}>
                                                1
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
                            <div className="grid grid-cols-4 gap-4 pt-2 border-t border-white/5">
                                <div>
                                    <label className="text-[10px] font-bold text-yellow-400 mb-2 block uppercase tracking-[0.2em] flex items-center gap-2"><Focus className="w-3 h-3" /> Focus Ctrl</label>
                                    <select value={selections.focusPoint} onChange={e => setSelections(p => ({ ...p, focusPoint: e.target.value }))} className="w-full bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-2.5 text-xs text-white outline-none">
                                        {PRO_FOCUS_CONTROLS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col justify-end">
                                    <button onClick={() => setSelections(p => ({ ...p, searchGrounding: !p.searchGrounding }))} className={cn("w-full py-2.5 rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-all border", selections.searchGrounding ? "bg-blue-500/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-gray-500")}>
                                        <Zap className={cn("w-3 h-3", selections.searchGrounding && "animate-pulse")} /> Live Search
                                    </button>
                                </div>
                                <div className="flex flex-col justify-end">
                                    <button onClick={() => setSelections(p => ({ ...p, quality: p.quality === '4k' ? '2k' : '4k' }))} className={cn("w-full py-2.5 rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-all border", selections.quality === '4k' ? "bg-yellow-400 text-black border-yellow-400" : "bg-white/5 border-white/10 text-gray-500")}>
                                        <Maximize2 className="w-3 h-3" /> 4K Master
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
                    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8">
                        <button onClick={() => setZoomState(p => ({ ...p, isOpen: false }))} className="absolute top-8 right-8 text-white/50 hover:text-white transition"><X className="w-8 h-8" /></button>
                        {activeFrame?.type === 'video' ? <video src={zoomState.url} controls autoPlay loop className="max-w-full max-h-full rounded-2xl" style={{ maxHeight: '80vh' }} /> : <img src={zoomState.url} className="max-w-full max-h-full rounded-2xl" alt="Zoomed" />}
                        <div className="absolute bottom-12 flex gap-4">
                            <button onClick={() => setZoomState(p => ({ ...p, isEditing: true }))} className="bg-[#D4FF00] text-black px-6 py-2 rounded-full font-bold uppercase text-xs flex items-center gap-2 hover:bg-white transition"><PenTool className="w-4 h-4" /> Edit</button>
                            <button onClick={() => downloadImage(zoomState.url)} className="bg-white text-black px-6 py-2 rounded-full font-bold uppercase text-xs flex items-center gap-2 hover:bg-cyan-500 hover:text-white transition"><Download className="w-4 h-4" /> Download</button>
                        </div>
                    </div>
                )
            }

            {
                zoomState.isEditing && zoomState.url && (
                    <ImageEditorModal imageUrl={zoomState.url} onClose={() => setZoomState(p => ({ ...p, isEditing: false }))} onSubmitSuccess={(newUrl) => { if (zoomState.slot) setFrames(prev => prev.map(f => f.id === zoomState.slot ? { ...f, url: newUrl } : f)) }} />
                )
            }

            {/* ─── CAMERA ANGLES MODAL ─────────────────────────────────── */}
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

            {/* ─── REF BOARD MODAL ──────────────────────────────────────── */}
            {
                showRefBoard && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <div onClick={() => { setShowRefBoard(false); setShowLibPicker(false) }} className="absolute inset-0 bg-black/85 backdrop-blur-lg" />
                        <div className="relative w-full max-w-3xl bg-[#0e0e0e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
                            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.03] shrink-0">
                                <div>
                                    <h3 className="text-base font-black text-white flex items-center gap-2"><span className="text-purple-400 text-xl font-black">@</span> Reference Board</h3>
                                    <p className="text-[8px] text-white/25 mt-0.5 uppercase tracking-wider">SESSION ONLY - PICK FROM LIBRARY - USE @NAME IN PROMPT TO TAG</p>
                                </div>
                                <button onClick={() => { setShowRefBoard(false); setShowLibPicker(false) }} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                            </div>

                            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setFaceConsistency(!faceConsistency)}
                                        className={cn("w-10 h-6 rounded-full transition-colors relative", faceConsistency ? "bg-purple-500" : "bg-white/20")}
                                    >
                                        <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-transform", faceConsistency ? "translate-x-5" : "translate-x-1")} />
                                    </button>
                                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", faceConsistency ? "text-white" : "text-white/40")}>MAINTAIN FACE CONSISTENCY</span>
                                </div>
                                <span className="text-[8px] text-white/30 truncate">Adds explicit consistency directives to the prompt</span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-[300px] flex flex-col gap-3">
                                {[
                                    { id: 'characters', label: 'CHARACTERS', desc: 'MULTIPLE ALLOWED', icon: Users, color: 'text-purple-400' },
                                    { id: 'locations', label: 'LOCATION', desc: 'ONE LOCATION', icon: Map, color: 'text-blue-400' },
                                    { id: 'wardrobes', label: 'WARDROBE', desc: 'ONE WARDROBE REF', icon: Smartphone, color: 'text-indigo-400' },
                                    { id: 'props', label: 'PROPS', desc: 'MULTIPLE PROPS', icon: Package, color: 'text-amber-600' },
                                    { id: 'moods', label: 'MOOD/STYLE', desc: 'ONE MOOD REF', icon: Palette, color: 'text-rose-500' }
                                ].map(category => (
                                    <div key={category.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
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
                                            {(!refBoard[category.id] || refBoard[category.id].length === 0) ? (
                                                <p className="text-[9px] text-white/20 italic">Nothing staged yet.</p>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {refBoard[category.id].map(item => (
                                                        <div key={item.id} className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10 group bg-black/20 shrink-0">
                                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                                            <div className="absolute inset-x-0 bottom-0 bg-black/80 px-1 py-0.5 backdrop-blur-sm border-t border-white/5">
                                                                <p className="text-[6px] font-black text-[#D4FF00] uppercase truncate text-center">@{item.name}</p>
                                                            </div>
                                                            <button onClick={() => removeRefItem(item.id)} className="absolute top-0.5 right-0.5 p-0.5 bg-red-500/80 rounded border border-red-400 text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2 h-2" /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-3 border-t border-white/5 bg-black/40 shrink-0 text-center">
                                <span className="text-[9px] text-white/30 tracking-wide">Type <span className="text-purple-400 font-bold">@name</span> in the scene narrative to tag a ref image. Only tagged images are sent to Nano Banana.</span>
                            </div>

                            <input
                                type="file"
                                ref={refUploadInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleRefUpload}
                            />

                            {showLibPicker && (
                                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                                    <div onClick={() => setShowLibPicker(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
                                    <div className="relative w-full max-w-2xl bg-[#0e0e0e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-white uppercase tracking-widest">Select Reference</h4>
                                            <button onClick={() => setShowLibPicker(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                            <AssetsLibrary onSelectReference={(url, item) => {
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
                                    <div className="grid grid-cols-4 gap-3">
                                        {frames.filter(f => f.url && !f.loading).map(frame => (
                                            <div key={frame.id} onClick={() => { setActiveFrameId(frame.id); setShowGallery(false) }}
                                                className={cn("relative aspect-video rounded-xl overflow-hidden cursor-pointer group border-2 transition-all",
                                                    activeFrameId === frame.id ? "border-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.3)]" : "border-white/5 hover:border-white/20")}>
                                                {frame.type === 'video' ? (
                                                    <video src={frame.url} muted preload="metadata" className="w-full h-full object-cover" />
                                                ) : (
                                                    <img src={frame.url} loading="lazy" className="w-full h-full object-cover" />
                                                )}
                                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-[8px] font-bold text-white/80 truncate">{frame.model}</p>
                                                    <div className="flex gap-1 mt-1">
                                                        <button onClick={(e) => { e.stopPropagation(); downloadImage(frame.url) }} className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[7px] text-white font-bold">DL</button>
                                                        <button onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            const url = frame.assetPath || frame.url;
                                                            setSelections(p => ({ ...p, referenceImage: url }));
                                                            addRefItem({ id: crypto.randomUUID(), name: `Ref_${frame.id.slice(-4)}`, category: 'mood', imageUrl: url });
                                                        }} className="px-1.5 py-0.5 bg-purple-500/50 hover:bg-purple-500 rounded text-[7px] text-white font-bold">ADD TO REF</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setLeftPreviewId(frame.id); setShowGallery(false) }} className="px-1.5 py-0.5 bg-[#D4FF00]/50 hover:bg-[#D4FF00] rounded text-[7px] text-black font-bold">L</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setRightPreviewId(frame.id); setShowGallery(false) }} className="px-1.5 py-0.5 bg-purple-500/50 hover:bg-purple-500 rounded text-[7px] text-white font-bold">R</button>
                                                    </div>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); removeFrame(frame.id) }}
                                                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                    title="Delete Frame">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full bg-white/5 rounded-3xl overflow-hidden border border-white/10">
                                        <AssetsLibrary onSelectReference={(url, item) => {
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
                                <button onClick={() => downloadImage(upscaledImage, 'isolated-crop.png')}
                                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all border border-white/10">
                                    <Download className="w-4 h-4" /> Download
                                </button>
                                <button onClick={runAiUpscale} disabled={upscaling}
                                    className="flex-2 py-3 px-8 rounded-xl bg-[#D4FF00] hover:bg-white text-black text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-50 min-w-[200px]">
                                    {upscaling ? <><Sparkles className="w-4 h-4 animate-spin" /> Generating 4K...</> : <><Sparkles className="w-4 h-4" /> Generate 4K Upscale</>}
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
