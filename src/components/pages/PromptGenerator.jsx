import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Copy, Sparkles, Video, Aperture, Sun, Palette, Camera, Focus,
    Smartphone, Film, Upload, X, Image as ImageIcon, Type, Layers,
    ArrowRight, Edit, ImagePlus, MonitorPlay, Mic, Clock,
    ChevronDown, ChevronUp, Settings, Zap, Maximize2, Download
} from 'lucide-react'
import { cn } from '../lib/utils'
import { AssetsLibrary } from './AssetsLibrary'

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
]

const CAMERA_MODELS = [
    {
        id: 'arri', label: 'ARRI Alexa 35', type: 'Cinema', icon: Film,
        lenses: ['18mm', '24mm', '35mm', '50mm', '85mm', '135mm ANA'],
        desc: 'The Hollywood gold standard. High dynamic range, organic color.',
        // Gemini narrative descriptors for this camera
        narrative: 'captured on an ARRI Alexa 35 cinema camera, rendering organic filmic grain, wide dynamic range, and a natural color science with deep shadow detail'
    },
    {
        id: 'sony', label: 'Sony Venice 2', type: 'Cinema', icon: Video,
        lenses: ['24mm', '35mm', '50mm', '85mm', '100mm Macro'],
        desc: 'Full-frame digital cinema, dual base ISO. Clean & sharp.',
        narrative: 'shot on a Sony Venice 2 full-frame cinema camera, producing pristine digital clarity, wide color gamut, and ultra-clean highlights'
    },
    {
        id: 'red', label: 'RED V-Raptor', type: 'Cinema', icon: Video,
        lenses: ['16mm', '24mm', '35mm', '50mm', '85mm'],
        desc: '8K Vista Vision. Ultra-high resolution and raw detail.',
        narrative: 'photographed with a RED V-Raptor 8K Vista Vision camera, delivering razor-sharp micro-detail, rich texture, and hyper-real resolution'
    },
    {
        id: 'imax', label: 'IMAX 70mm', type: 'Film', icon: Film,
        lenses: ['40mm', '50mm', '80mm', '150mm'],
        desc: 'Massive format film. Unparalleled depth and resolution.',
        narrative: 'captured on IMAX 70mm large-format film, with unmatched tonal depth, immersive sharpness, and the iconic cinematic grandeur of the format'
    },
    {
        id: 'iphone', label: 'iPhone 15 Pro', type: 'Mobile', icon: Smartphone,
        lenses: ['13mm (Ultra Wide)', '24mm (Main)', '120mm (5x Tele)'],
        desc: 'Modern mobile look. Deep depth of field, digital sharpening.',
        narrative: 'taken on an iPhone 15 Pro, with characteristic mobile sharpness, computational photography processing, and digital depth-of-field rendering'
    },
    {
        id: 'gopro', label: 'GoPro Hero 12', type: 'Action', icon: Camera,
        lenses: ['12mm (HyperView)', '16mm (SuperView)', '19mm (Wide)', '24mm (Linear)'],
        desc: 'Action cam fisheye. High distortion, infinite focus.',
        narrative: 'shot on a GoPro Hero 12 action camera, with signature wide fisheye distortion, infinite depth of field, and high-contrast vivid colors'
    },
    {
        id: 'vhs', label: 'Vintage Camcorder', type: 'Retro', icon: Video,
        lenses: ['Auto Zoom'],
        desc: '1990s home video tape. Noisy, chromatic aberration.',
        narrative: 'recorded on a 1990s VHS camcorder, with magnetic tape grain, chromatic color bleeding, interlace scan lines, and the warm nostalgic decay of analog video'
    },
    {
        id: 'dslr', label: 'Canon R5', type: 'Hybrid', icon: Camera,
        lenses: ['24mm', '35mm', '50mm', '85mm', '70-200mm'],
        desc: 'Modern mirrorless photography/video hybrid.',
        narrative: 'photographed with a Canon R5 mirrorless camera, combining clinical digital sharpness with beautiful optical rendering and accurate, natural color reproduction'
    },
]

const LIGHTING_STYLES = [
    {
        id: 'cinematic', label: 'Cinematic',
        narrative: 'dramatically lit with high contrast chiaroscuro, deep shadows, and carefully controlled single-source key lighting that sculpts the subject in cinematic darkness'
    },
    {
        id: 'natural', label: 'Natural',
        narrative: 'bathed in soft, diffused natural daylight with gentle fill from environmental bounce, creating an honest and true-to-life luminosity'
    },
    {
        id: 'neon', label: 'Neon Cyberpunk',
        narrative: 'soaked in vibrant neon light from multiple colored sources — electric magenta, deep cyan, and acid violet — casting hard colored shadows and atmospheric rim lighting'
    },
    {
        id: 'golden', label: 'Golden Hour',
        narrative: 'illuminated by the warm, low-angle golden hour sun casting long amber shadows, with rich orange fill light and a glowing atmospheric haze on the horizon'
    },
    {
        id: 'studio', label: 'Studio',
        narrative: 'lit with a professional three-point studio setup — soft key light at 45°, a balanced fill, and a separation rim light from behind — creating clean, controlled exposure'
    },
]

const ART_STYLES = [
    {
        id: 'realistic', label: 'Hyper Realistic',
        narrative: 'photorealistic',
        quality: 'ultra-detailed, photorealistic rendering, 8K resolution, true-to-life textures and materials'
    },
    {
        id: 'anime', label: 'Anime / Manga',
        narrative: 'in the style of Japanese anime',
        quality: 'clean vector-like line art, cel shading, vibrant flat colors, expressive character design, Studio Ghibli-level polish'
    },
    {
        id: '3d', label: '3D Render',
        narrative: 'as a high-end 3D rendered scene',
        quality: 'Pixar/Disney-quality 3D CGI, global illumination, subsurface scattering, procedural textures, octane render quality'
    },
    {
        id: 'vintage', label: 'Vintage Film',
        narrative: 'in a vintage analog film aesthetic',
        quality: 'heavy 35mm film grain, faded Kodachrome color palette, light leaks, soft halation around bright areas, authentic 1970s-80s photographic character'
    },
]

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
}

// Maps mood/atmosphere based on lighting + style combo
const MOOD_MAP = {
    'cinematic_realistic': 'brooding, tense, and cinematic',
    'cinematic_anime': 'dramatic and emotionally charged',
    'cinematic_3d': 'epic and otherworldly',
    'cinematic_vintage': 'dark, nostalgic, and melancholic',
    'natural_realistic': 'serene, honest, and grounded',
    'natural_anime': 'gentle, warm, and slice-of-life',
    'natural_3d': 'bright, optimistic, and lush',
    'natural_vintage': 'soft, hazy, and warmly nostalgic',
    'neon_realistic': 'electric, dystopian, and hypnotic',
    'neon_anime': 'hyper-stylized and futuristic',
    'neon_3d': 'vibrant, glossy, and synthwave',
    'neon_vintage': 'retro-futuristic and otherworldly',
    'golden_realistic': 'warm, romantic, and beautifully melancholic',
    'golden_anime': 'dreamy, emotional, and golden-hour tender',
    'golden_3d': 'magical, radiant, and optimistic',
    'golden_vintage': 'deeply nostalgic and warmly cinematic',
    'studio_realistic': 'clean, authoritative, and precise',
    'studio_anime': 'crisp, polished, and professional',
    'studio_3d': 'pristine, commercial, and highly crafted',
    'studio_vintage': 'retro-studio glamour with analog warmth',
}

// f-stop narrative phrases
const FSTOP_NARRATIVES = {
    '1.4': 'a wide open f/1.4 aperture creating a razor-thin plane of focus with luxuriously blurred bokeh behind the subject',
    '2.8': 'an f/2.8 aperture with soft, creamy background separation',
    '5.6': 'an f/5.6 standard aperture balancing sharp subject detail against a slightly softened environment',
    '8.0': 'a stopped-down f/8 aperture keeping the entire scene in crisp, sharp focus',
    '16': 'an f/16 deep-focus aperture rendering every plane — foreground to horizon — with absolute sharpness',
}

// AI MODEL CONFIGURATION
const AI_MODELS = [
    {
        id: 'openai', name: 'GPT Image 1.5', provider: 'OpenAI', type: 'image',
        description: 'Elite native image generation with superior reasoning & 4K support',
        credits: 2, available: true, icon: Sparkles
    },
    {
        id: 'replicate', name: 'Flux Pro', provider: 'Replicate', type: 'image',
        description: 'Professional image generation via Replicate',
        credits: 2, available: true, icon: Zap
    },
    {
        id: 'nano-banana', name: 'Nano Banana', provider: 'Google', type: 'image',
        description: 'Gemini 2.5 Flash Image — blazing fast native multimodal generation',
        credits: 1, available: true, icon: Sparkles,
        modelId: 'gemini-2.5-flash-image'
    },
    {
        id: 'nano-banana-pro', name: 'Nano Banana Pro', provider: 'Google', type: 'image',
        description: 'Gemini 3 Pro Image — advanced reasoning, 4K, complex instructions',
        credits: 3, available: true, icon: Sparkles,
        modelId: 'gemini-3-pro-image-preview'
    },
    {
        id: 'veo', name: 'Google Veo 3.1', provider: 'Google', type: 'video',
        description: 'Ultra-high definition video generation (Preview)',
        credits: 5, available: true, icon: Video
    },
    {
        id: 'kling', name: 'Kling AI', provider: 'Kling', type: 'video',
        description: 'Advanced video generation platform (Coming Soon)',
        credits: 5, available: false, icon: Video
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
    { id: 'tilt_up', label: 'Tilt Up', desc: 'Camera rotates upwards' },
    { id: 'tilt_down', label: 'Tilt Down', desc: 'Camera rotates downwards' },
    { id: 'zoom_in', label: 'Zoom In', desc: 'Lens zooms into subject' },
    { id: 'zoom_out', label: 'Zoom Out', desc: 'Lens zooms away from subject' },
    { id: 'dolly', label: 'Dolly Shot', desc: 'Camera moves on rails toward/away' },
    { id: 'tracking', label: 'Tracking Shot', desc: 'Camera follows subject movement' },
    { id: 'crane', label: 'Crane Shot', desc: 'Vertical sweeping movement' },
    { id: 'aerial', label: 'Aerial View', desc: 'High angle drone-like shot' },
    { id: 'pov', label: 'POV Shot', desc: 'First-person perspective' },
    { id: 'arc', label: 'Arc Shot', desc: '180° orbit around subject' },
    { id: 'handheld', label: 'Handheld', desc: 'Organic, subtle shake' },
    { id: 'timelapse', label: 'Timelapse', desc: 'Fast-forward time' },
    { id: 'hyperlapse', label: 'Hyperlapse', desc: 'Moving timelapse' },
    { id: 'slow_mo', label: 'Slow Motion', desc: 'High frame rate, fluid motion' },
    { id: 'speed_ramp', label: 'Speed Ramp', desc: 'Alternates fast/slow motion' },
    { id: 'fpv', label: 'FPV Drone', desc: 'Fast, agile aerial flight' },
    { id: 'whip_pan', label: 'Whip Pan', desc: 'Fast blur pan transition' }
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

// ─────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────

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
    const mood = MOOD_MAP[`${selections.lighting}_${selections.style}`] || 'cinematic and evocative'

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

    // Subject — fall back to a neutral descriptor
    const subject = selections.subject?.trim() || 'the subject'

    // Reference image instruction
    const refPrefix = selections.referenceImage
        ? 'Using the provided reference image for compositional and stylistic guidance, '
        : ''

    // Build the narrative paragraph
    const parts = []

    // 1. Shot type + subject
    parts.push(`${shotType} of ${subject}`)

    // 2. Environment / context (infer from subject if no explicit context)
    // We embed this in the subject description naturally — Gemini handles it
    // 3. Lighting narrative
    parts.push(`The scene is ${lighting?.narrative || 'illuminated with cinematic lighting'}`)

    // 4. Mood
    parts.push(`creating a ${mood} atmosphere`)

    // 5. Camera + optics (cinematic language Gemini responds to)
    if (cam.id !== 'vhs') {
        parts.push(`${cam.narrative}, with ${lensDesc}, and ${fstopDesc}`)
    } else {
        parts.push(cam.narrative)
    }

    // 6. Style quality
    parts.push(artStyle?.quality || 'highly detailed, professional quality')

    // 7. Aspect ratio — Gemini responds to explicit AR instructions
    parts.push(`The final image should be composed for a ${selections.aspectRatio} aspect ratio`)

    const narrative = parts.join('. ') + '.'

    return `${refPrefix}${narrative}`
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
    const subject = selections.subject?.trim() || 'the main subject'
    const refContext = selections.referenceImage
        ? 'Following the composition and style of the attached reference image, '
        : ''

    return `${refContext}${artStyle} style image of ${subject}. Shot on ${cam.label} with ${selections.lens} lens at ${selections.focalLength}mm (${getFStop(selections.aperture)}). ${angle} shot. ${lighting} lighting. Ultra-detailed, 4K, cinematic. --ar ${selections.aspectRatio}`
}

/**
 * Video prompt builder for Veo.
 * Gemini Veo also benefits from narrative language.
 */
const buildVideoPrompt = (selections) => {
    const composition = CAMERA_ANGLES.find(a => a.id === selections.angle)?.label || 'Medium Shot'
    const movement = CAMERA_MOVEMENT.find(m => m.id === selections.cameraMovement)?.label || ''
    const lens = LENS_FOCUS.find(l => l.id === selections.lensFocus)?.label || ''
    const artStyle = ART_STYLES.find(s => s.id === selections.style)?.label || ''
    const lighting = LIGHTING_STYLES.find(l => l.id === selections.lighting)?.label || ''
    const subject = selections.subjectDescription || selections.subject || '[SUBJECT]'

    let prompt = `${composition} shot`
    if (movement && movement !== 'Static Shot') prompt += ` with ${movement.toLowerCase()}`
    if (lens) prompt += `, ${lens.toLowerCase()}`
    prompt += `. Subject: ${subject}.`
    if (selections.actionDescription) prompt += ` ${selections.actionDescription}.`
    if (selections.contextDescription) prompt += ` ${selections.contextDescription}.`
    prompt += ` ${artStyle} style. ${lighting} lighting.`
    prompt += ` --ar ${selections.aspectRatio}`
    if (selections.duration) prompt += ` --dur ${selections.duration}s`
    return prompt
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function PromptGenerator({ onUpscale }) {
    const [mode, setMode] = useState('image')
    const [previewTab, setPreviewTab] = useState('image')
    const [selectedModel, setSelectedModel] = useState('nano-banana')
    const [showCinematography, setShowCinematography] = useState(true)
    const [selections, setSelections] = useState({
        // IMAGE SETTINGS
        camera: 'arri',
        angle: 'wide',
        lighting: 'cinematic',
        style: 'realistic',
        lens: '35mm',
        focalLength: 35,
        aperture: 45,
        aspectRatio: '16:9',
        subject: '',
        referenceImage: null,
        quality: 'low',

        // VIDEO SETTINGS
        videoInputMode: 'text',
        referenceUsage: 'first_frame',
        referenceImageEnd: null,
        editInstruction: '',
        timestampSegments: [{ start: 0, end: 2, description: '' }],
        cameraMovement: 'static',
        lensFocus: 'deep_focus',
        cinematographyDescription: '',
        subjectDescription: '',
        actionDescription: '',
        contextDescription: '',
        audioActive: { dialogue: false, sfx: false, ambient: true, music: false },
        audioPrompts: { dialogue: '', sfx: '', ambient: '', music: '' },
        duration: 4,
    })

    const [outputs, setOutputs] = useState({
        A: { url: null, model: null, prompt: null, loading: false },
        B: { url: null, model: null, prompt: null, loading: false }
    })
    const [activeSlot, setActiveSlot] = useState('A')
    const [zoomImage, setZoomImage] = useState({ url: null, isOpen: false })
    const [isLoading, setIsLoading] = useState(false)
    const [showAnglesModal, setShowAnglesModal] = useState(false)

    // ── Auto-sync model ↔ mode ──────────────────────────────────────────
    // Prevent mismatch (e.g. image model selected while in video mode)
    useEffect(() => {
        const currentModel = AI_MODELS.find(m => m.id === selectedModel)
        if (currentModel && currentModel.type !== mode) {
            // Switch to default model for the new mode
            const fallback = AI_MODELS.find(m => m.type === mode && m.available)
            if (fallback) setSelectedModel(fallback.id)
        }
    }, [mode])

    // ── f-stop label ────────────────────────────────────────────────────
    const getFStop = (val) => {
        if (selections.camera === 'iphone' || selections.camera === 'gopro') return 'Auto Aperture'
        if (val < 20) return 'f/1.4 (Blurry BG)'
        if (val < 40) return 'f/2.8 (Soft Focus)'
        if (val < 60) return 'f/5.6 (Standard)'
        if (val < 80) return 'f/8.0 (Sharp)'
        return 'f/16 (Everything in Focus)'
    }

    // ── Prompt builder dispatcher ────────────────────────────────────────
    const buildPrompt = () => {
        if (mode === 'video') return buildVideoPrompt(selections)
        const isGemini = selectedModel === 'nano-banana' || selectedModel === 'nano-banana-pro'
        if (isGemini) return buildNanoBananaPrompt(selections)
        return buildStandardPrompt(selections, getFStop)
    }

    const generatedPrompt = buildPrompt()

    // ── Camera / lens sync ───────────────────────────────────────────────
    const currentCamera = CAMERA_MODELS.find(c => c.id === selections.camera) || CAMERA_MODELS[0]

    useEffect(() => {
        if (!currentCamera.lenses.includes(selections.lens)) {
            setSelections(prev => ({ ...prev, lens: currentCamera.lenses[0] }))
        }
    }, [selections.camera])

    useEffect(() => {
        const lensMM = parseInt(selections.lens)
        if (!isNaN(lensMM)) {
            let updates = { focalLength: lensMM }
            if (lensMM <= 24) updates.aperture = 75
            else if (lensMM <= 35) updates.aperture = 45
            else if (lensMM <= 50) updates.aperture = 25
            else updates.aperture = 10
            setSelections(prev => ({ ...prev, ...updates }))
        }
    }, [selections.lens])

    // ── Helpers ──────────────────────────────────────────────────────────
    const copyToClipboard = () => navigator.clipboard.writeText(generatedPrompt)

    const downloadImage = (url, name = 'flare-gen.png') => {
        const link = document.createElement('a')
        link.href = url
        link.download = name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const saveToProject = async (url, slot) => {
        try {
            const fileName = `flare_${slot}_${Date.now()}.png`
            const resp = await fetch('http://localhost:3001/api/save-asset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageData: url, fileName })
            })
            const data = await resp.json()
            return data.path
        } catch (e) {
            console.error('Save Asset Error:', e)
            return null
        }
    }

    // ── Generation ───────────────────────────────────────────────────────
    const generateImage = async () => {
        const currentModel = AI_MODELS.find(m => m.id === selectedModel)
        if (!currentModel?.available) {
            alert(`${currentModel?.name || 'This model'} is coming soon!`)
            return
        }

        const slot = activeSlot
        setOutputs(prev => ({ ...prev, [slot]: { ...prev[slot], loading: true } }))
        setIsLoading(true)

        try {
            const response = await fetch('http://localhost:3001/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    prompt: generatedPrompt,
                    aspect_ratio: selections.aspectRatio,
                    image: selections.referenceImage,
                    quality: selections.quality
                })
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.message || data.error || 'Generation failed')

            if (data.url) {
                const assetPath = await saveToProject(data.url, slot)
                setOutputs(prev => ({
                    ...prev,
                    [slot]: { url: data.url, assetPath, model: selectedModel, prompt: generatedPrompt, loading: false }
                }))
            }
        } catch (error) {
            console.error('Generation error:', error)
            let displayError = error.message
            if (displayError.toLowerCase().includes('safety system')) {
                displayError = "Creative Block: The AI's safety filters flagged this prompt. Try refining your subject or removing potentially sensitive keywords."
            }
            alert(`AI Engine Status: ${displayError}`)
            setOutputs(prev => ({ ...prev, [slot]: { ...prev[slot], loading: false } }))
        } finally {
            setIsLoading(false)
        }
    }

    // ── Which models to show per mode ────────────────────────────────────
    const filteredModels = AI_MODELS.filter(m => m.type === mode)

    // ── Preview Slot ─────────────────────────────────────────────────────
    const PreviewSlot = ({ slot, data }) => (
        <div
            onClick={() => setActiveSlot(slot)}
            className={cn(
                'relative flex-1 aspect-[16/9] rounded-xl overflow-hidden transition-all duration-300 group',
                activeSlot === slot ? 'glow-border bg-white/10' : 'surface-glass',
                !data.url ? 'bg-black/60' : ''
            )}
        >
            <div className={cn(
                'absolute top-3 left-3 z-30 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest',
                activeSlot === slot ? 'bg-[#D4FF00] text-black shadow-[0_0_10px_#D4FF00]' : 'bg-white/10 text-gray-400'
            )}>
                Slot {slot}
            </div>

            {data.loading ? (
                <div className="h-full w-full flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                    <Sparkles className="w-8 h-8 text-[#D4FF00] animate-spin mb-3 glow-text-lime" />
                    <p className="text-[10px] font-bold text-white uppercase animate-pulse">Computing Canvas...</p>
                </div>
            ) : data.url ? (
                <div className="relative h-full w-full">
                    <img src={data.url} alt={`Slot ${slot}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-4">
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); setZoomImage({ url: data.url, isOpen: true }) }}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white" title="Zoom"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); downloadImage(data.url, `flare_${slot}.png`) }}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white" title="Download"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelections(prev => ({ ...prev, referenceImage: data.assetPath || data.url })) }}
                                className="px-3 py-2 bg-[#D4FF00] hover:bg-white rounded-lg text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                            >
                                <ImagePlus className="w-3.5 h-3.5" />
                                Ref
                            </button>
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-[10px] text-white/50 font-bold uppercase tracking-tighter">
                                {AI_MODELS.find(m => m.id === data.model)?.name}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 grayscale opacity-20 group-hover:opacity-40 transition-opacity">
                    <Sparkles className="w-8 h-8 text-white mb-2" />
                    <p className="text-[10px] font-bold text-white uppercase">Waiting for Input</p>
                </div>
            )}
        </div>
    )

    // ── Nano Banana badge ─────────────────────────────────────────────────
    const isNanoBanana = selectedModel === 'nano-banana' || selectedModel === 'nano-banana-pro'

    // ─────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────
    return (
        <div className="h-screen overflow-hidden flex flex-col bg-black px-4 pb-4 pt-0 gap-4">

            {/* MAIN WORKSPACE */}
            <div className="flex-[6] min-h-0 flex gap-4 pt-4">

                {/* LEFT: DUAL PREVIEW */}
                <div className="flex-[7.5] min-w-0 flex flex-col gap-4">
                    <div className="flex items-center justify-between shrink-0">
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#D4FF00] animate-pulse shadow-[0_0_8px_#D4FF00]" />
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Neural Link Active</span>
                            </div>
                            {/* Mode toggle */}
                            <div className="flex gap-1 surface-glass p-1 rounded-xl">
                                {['image', 'video'].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setMode(m)}
                                        className={cn(
                                            'px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all',
                                            mode === m ? 'bg-[#D4FF00] text-black' : 'text-gray-500 hover:text-white'
                                        )}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 items-center">
                            {selections.referenceImage && (
                                <div className="relative group w-12 h-8 rounded-lg overflow-hidden border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                                    <img src={selections.referenceImage} className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setSelections(prev => ({ ...prev, referenceImage: null }))}
                                        className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                                    >
                                        <X className="w-3 h-3 text-white" />
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-1 surface-glass p-1 rounded-xl">
                                <button
                                    onClick={() => setPreviewTab('image')}
                                    className={cn(
                                        'px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all',
                                        previewTab === 'image' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-white'
                                    )}
                                >
                                    Dual View
                                </button>
                                <button
                                    onClick={() => setPreviewTab('gallery')}
                                    className={cn(
                                        'px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all',
                                        previewTab === 'gallery' ? 'bg-white/10 text-[#D4FF00] shadow-lg' : 'text-white/40 hover:text-white'
                                    )}
                                >
                                    Gallery
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0">
                        {previewTab === 'image' ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="w-full grid grid-cols-2 gap-4">
                                    <PreviewSlot slot="A" data={outputs.A} />
                                    <PreviewSlot slot="B" data={outputs.B} />
                                </div>
                            </div>
                        ) : (
                            <div className="h-full surface-glass rounded-2xl overflow-hidden">
                                <AssetsLibrary
                                    compact={true}
                                    onSelectReference={(url) => setSelections(prev => ({ ...prev, referenceImage: url }))}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: PROMPT PANEL */}
                <div className="flex-[2.5] min-w-0 flex flex-col">
                    <div className="flex-1 flex flex-col surface-glass rounded-2xl p-5 gap-4 overflow-hidden relative">

                        {/* Nano Banana indicator */}
                        {isNanoBanana && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-400/10 border border-yellow-400/20 shrink-0">
                                <Sparkles className="w-3 h-3 text-yellow-400" />
                                <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-widest">
                                    Nano Banana Narrative Mode
                                </span>
                            </div>
                        )}

                        <div className="flex-1 flex flex-col min-h-0 min-w-0">
                            <div className="flex items-center justify-between mb-3 shrink-0">
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                                    <Focus className="w-3.5 h-3.5 text-[#D4FF00]" />
                                    <span className="text-metallic">Master Directives</span>
                                </label>
                                <button onClick={copyToClipboard} className="text-[#D4FF00]/60 hover:text-[#D4FF00] text-[10px] font-bold flex items-center gap-1.5 transition uppercase">
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy
                                </button>
                            </div>
                            <div className="flex-1 bg-black/40 border border-white/10 rounded-xl p-4 overflow-y-auto custom-scrollbar shadow-inner">
                                <p className="text-xs font-mono text-white/90 font-medium leading-relaxed italic">
                                    {generatedPrompt}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={generateImage}
                            disabled={isLoading}
                            className={cn(
                                'w-full py-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-2xl overflow-hidden active:scale-95 group',
                                isLoading ? 'bg-white/5 cursor-not-allowed' : 'bg-[#D4FF00] hover:bg-white'
                            )}
                        >
                            <Zap className={cn('w-5 h-5 mb-1 text-black', isLoading && 'animate-pulse')} />
                            <span className="text-sm font-black text-black uppercase tracking-tighter">
                                {isLoading ? `Computing Slot ${activeSlot}...` : `Render to Slot ${activeSlot}`}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* SETTINGS AREA */}
            <div className="flex-[4] min-h-0 overflow-hidden surface-glass rounded-2xl p-4">
                <div className="h-full overflow-y-auto pr-3 space-y-4 custom-scrollbar">

                    {/* Row 1: Engine + Quality + Vision Input */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <label className="text-[10px] font-bold text-gray-500 mb-2 block uppercase tracking-[0.2em]">Processing Engine</label>
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none hover:bg-white/10 transition appearance-none"
                            >
                                {filteredModels.map((model) => (
                                    <option key={model.id} value={model.id} disabled={!model.available}>
                                        {model.name}{!model.available ? ' — Soon' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedModel === 'openai' && (
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-gray-500 mb-2 block uppercase tracking-[0.2em]">Render Quality</label>
                                <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                                    {['low', 'medium', 'high'].map((q) => (
                                        <button
                                            key={q}
                                            onClick={() => setSelections(prev => ({ ...prev, quality: q }))}
                                            className={cn(
                                                'flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all',
                                                selections.quality === q ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'
                                            )}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={cn(selectedModel === 'openai' ? 'col-span-2' : 'col-span-3')}>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <label className="text-[10px] font-bold text-[#D4FF00] uppercase tracking-widest flex items-center gap-2 mb-2">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {isNanoBanana ? 'Scene Narrative' : 'Vision Input'}
                                </label>
                                <textarea
                                    value={selections.subject}
                                    onChange={(e) => setSelections({ ...selections, subject: e.target.value })}
                                    placeholder={
                                        isNanoBanana
                                            ? 'Describe your subject & scene in detail — e.g. "a weathered Japanese ceramicist inspecting a glazed tea bowl in her sunlit workshop"'
                                            : 'Describe your cinematic vision...'
                                    }
                                    className="w-full bg-black/40 border border-purple-500/10 rounded-lg p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none resize-none h-14 custom-scrollbar"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Camera Controls — now includes STYLE */}
                    <div className="grid grid-cols-6 gap-4">
                        {['camera', 'angle', 'lens', 'lighting', 'style', 'aspectRatio'].map(key => (
                            <div key={key}>
                                <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase tracking-wider">
                                    {key === 'lens' ? 'Lens' : key === 'aspectRatio' ? 'Ratio' : key}
                                </label>
                                {key === 'angle' ? (
                                    <button
                                        onClick={() => setShowAnglesModal(true)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white flex justify-between items-center"
                                    >
                                        <span>{CAMERA_ANGLES.find(a => a.id === selections.angle)?.label}</span>
                                        <ChevronUp className="w-3 h-3 opacity-30" />
                                    </button>
                                ) : (
                                    <select
                                        value={selections[key]}
                                        onChange={(e) => setSelections({ ...selections, [key]: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white"
                                    >
                                        {key === 'camera' && CAMERA_MODELS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                        {key === 'lens' && currentCamera.lenses.map(l => <option key={l} value={l}>{l}</option>)}
                                        {key === 'lighting' && LIGHTING_STYLES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                                        {key === 'style' && ART_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                        {key === 'aspectRatio' && ASPECT_RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                    </select>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Row 3: Optics sliders */}
                    <div className="grid grid-cols-2 gap-8 mt-2 pt-2 border-t border-white/5">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Focal Length</label>
                                <span className="text-[10px] font-mono text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded">
                                    {selections.focalLength}mm
                                </span>
                            </div>
                            <input
                                type="range" min="12" max="200"
                                value={selections.focalLength}
                                onChange={(e) => setSelections({ ...selections, focalLength: parseInt(e.target.value) })}
                                className="w-full accent-purple-500 bg-white/5 h-1 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aperture</label>
                                <span className="text-[10px] font-mono text-pink-400 bg-pink-400/10 px-2 py-0.5 rounded">
                                    {getFStop(selections.aperture).split(' ')[0]}
                                </span>
                            </div>
                            <input
                                type="range" min="0" max="100"
                                value={selections.aperture}
                                onChange={(e) => setSelections({ ...selections, aperture: parseInt(e.target.value) })}
                                className="w-full accent-pink-500 bg-white/5 h-1 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* ZOOM MODAL */}
            {zoomImage.isOpen && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8">
                    <button onClick={() => setZoomImage({ ...zoomImage, isOpen: false })} className="absolute top-8 right-8 text-white/50 hover:text-white transition">
                        <X className="w-8 h-8" />
                    </button>
                    <img src={zoomImage.url} className="max-w-full max-h-full rounded-2xl shadow-all transform transition-transform duration-700" alt="Zoomed" />
                    <div className="absolute bottom-12 flex gap-4">
                        <button
                            onClick={() => downloadImage(zoomImage.url)}
                            className="bg-white text-black px-6 py-2 rounded-full font-bold uppercase text-xs flex items-center gap-2 hover:bg-cyan-500 hover:text-white transition"
                        >
                            <Download className="w-4 h-4" />
                            Download High Res
                        </button>
                    </div>
                </div>
            )}

            {/* CAMERA ANGLES MODAL */}
            {showAnglesModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div onClick={() => setShowAnglesModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                    <div className="relative w-full max-w-4xl bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Camera className="w-5 h-5 text-purple-400" />
                                Perspective & Framing
                            </h3>
                            <button onClick={() => setShowAnglesModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar grid grid-cols-4 gap-4">
                            {CAMERA_ANGLES.map((angle) => (
                                <button
                                    key={angle.id}
                                    onClick={() => { setSelections({ ...selections, angle: angle.id }); setShowAnglesModal(false) }}
                                    className={cn(
                                        'group flex flex-col items-center bg-white/5 border rounded-2xl overflow-hidden transition-all duration-300',
                                        selections.angle === angle.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 hover:bg-white/10'
                                    )}
                                >
                                    <div className="w-full aspect-video bg-slate-800 flex items-center justify-center relative">
                                        <Camera className="w-8 h-8 text-white/10" />
                                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[8px] font-bold text-white uppercase italic">{angle.desc}</div>
                                    </div>
                                    <div className="p-3 w-full text-left text-[10px] font-bold text-white uppercase tracking-wider">{angle.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
