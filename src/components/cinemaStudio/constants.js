import { Film, Video, Smartphone, Camera, Sparkles, Zap, FastForward, MonitorPlay, Plus, Users, Map, Package, Sun, ImagePlus, Music } from 'lucide-react';

export const CAMERA_ANGLES = [
    { id: 'extreme_wide', label: 'Extreme Wide', desc: 'Vast landscape', img: '/assets/angle_extreme_wide.jpeg' },
    { id: 'wide', label: 'Wide Shot', desc: 'Full scene', img: '/assets/angle_wide.jpeg' },
    { id: 'medium', label: 'Medium Shot', desc: 'Waist up', img: '/assets/angle_medium.png' },
    { id: 'cowboy', label: 'Cowboy Shot', desc: 'Mid-thigh up', img: '/assets/Cowboy_Shot.jpeg' },
    { id: 'closeup', label: 'Close Up', desc: 'Face details', img: '/assets/angle_closeup.jpeg' },
    { id: 'extreme_closeup', label: 'Extreme Close', desc: 'Eye/Detail', img: '/assets/angle_extreme_closeup.jpeg' },
    { id: 'low_angle', label: 'Low Angle', desc: 'Looking up', img: '/assets/angle_low.jpeg' },
    { id: 'high_angle', label: 'High Angle', desc: 'Looking down', img: '/assets/High_Angle.png' },
    { id: 'drone', label: 'Drone View', desc: 'Aerial', img: '/assets/angle_drone.jpeg' },
    { id: 'pov', label: 'POV', desc: 'First person', img: '/assets/angle_pov.jpeg' },
    { id: 'dutch', label: 'Dutch Angle', desc: 'Tilted', img: '/assets/Dutch_Angle.jpeg' },
    { id: 'ots', label: 'Over Shoulder', desc: 'Behind subject', img: '/assets/Over_Shoulder.jpeg' },
    { id: 'eagle_pov', label: 'Eagle POV', desc: 'Extreme top-down', img: '/assets/Eagle_POV.png' },
];

export const CAMERA_MODELS = [
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
            'low_angle': { lenses: ['16mm Anamorphic', '24mm'], default: '24mm' },
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
        invalidAngles: ['drone', 'pov', 'dutch'],
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
        invalidAngles: ['closeup', 'extreme_closeup'],
        lensMap: {
            'extreme_wide': { lenses: ['12mm SuperView'], default: '12mm SuperView' },
            'wide': { lenses: ['14mm Wide'], default: '14mm Wide' },
            'medium': { lenses: ['14mm Wide'], default: '14mm Wide' },
            'cowboy': { lenses: ['14mm Wide'], default: '14mm Wide' },
            'low_angle': { lenses: ['14mm Wide'], default: '14mm Wide' },
            'high_angle': { lenses: ['14mm Wide'], default: '14mm Wide' },
            'drone': { lenses: ['12mm SuperView'], default: '12mm SuperView' },
            'pov': { lenses: ['12mm SuperView'], default: '12mm' },
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
        invalidAngles: ['drone', 'pov'],
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
];

export const LIGHTING_STYLES = [
    { id: 'none', label: 'Default', narrative: 'natural, balanced lighting' },
    { id: 'cinematic', label: 'Cinematic', narrative: 'professional 3-point lighting with deep, atmospheric shadows' },
    { id: 'natural', label: 'Natural Daylight', narrative: 'soft, diffused overcast light with gentle, realistic shadows' },
    { id: 'neon', label: 'Neon Cyberpunk', narrative: 'high-contrast pink and cyan neon glows with cinematic reflections' },
    { id: 'golden', label: 'Golden Hour', narrative: 'warm, long-shadowed amber glow of a setting sun' },
    { id: 'studio', label: 'Studio Pro', narrative: 'clean, controlled softbox lighting for absolute clarity' },
    { id: 'chiaroscuro', label: 'Chiaroscuro', narrative: 'dramatic Chiaroscuro with harsh high-contrast shadows' },
];

export const ART_STYLES = [
    { id: 'none', label: 'None (Neutral)', narrative: 'natural photography', quality: 'clean textures, natural materials' },
    { id: 'realistic', label: 'Hyper Realistic', narrative: 'photorealistic', quality: '8K photographic fidelity, micro-textured surfaces' },
    { id: 'anime', label: 'Celestial Anime', narrative: 'high-end Japanese anime style', quality: 'clean line-art, vibrant cel-shading, Ghibli-level polish' },
    { id: 'hyper_realistic', label: 'Film Stills', narrative: 'masterful cinematic style', quality: 'flawless technical resolution, professional color grade' },
    { id: '3d', label: '3D CGI Render', narrative: 'octane-rendered 3D scene', quality: 'global illumination, industry-standard CGI finish' },
    { id: 'vintage', label: 'Vintage 35mm', narrative: 'analog 35mm film', quality: 'authentic film grain, soft lens halation' },
    { id: 'cyberpunk', label: 'Cyberpunk Noir', narrative: 'gritty cyberpunk aesthetic', quality: 'ray-traced reflections, high-tech textures' },
    { id: 'oil_painting', label: 'Old Master Oil', narrative: 'classical oil painting', quality: 'visible impasto strokes, rich pigment depth' },
    { id: 'architecture', label: 'ArchViz Brutalist', narrative: 'architectural visualization', quality: 'structural precision, realistic concrete textures' },
    { id: 'product', label: 'Product Hero', narrative: 'commercial studio photography', quality: 'perfect surface reflections, macro-detail sharpness' }
];

export const COMPOSITION_OPTIONS = [
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
];

export const COMPOSITION_PROMPTS = {
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
};

export const ASPECT_RATIOS = [
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
];

export const ANGLE_NARRATIVES = {
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
};

export const MOOD_MAP = {
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
};

export const FSTOP_NARRATIVES = {
    '1.4': 'with a wide f/1.4 aperture, creating a dreamy, blurred background (bokeh) that isolates the subject perfectly',
    '2.8': 'with a wide f/2.8 aperture, creating a creamy, blurred background (bokeh) that isolates the subject perfectly',
    '5.6': 'with an f/5.6 aperture, balancing sharp subject detail against a naturally softened environment',
    '8.0': 'with a deep depth of field (f/8.0), ensuring every detail from foreground to background is in sharp focus',
    '16': 'with a deep depth of field (f/11), ensuring every detail from foreground to background is in sharp focus',
};

export const REF_CATEGORIES = [
    { id: 'characters', label: 'Characters', desc: 'Multiple Allowed', icon: Users, color: 'text-blue-400' },
    { id: 'locations', label: 'Location', desc: 'One Location', icon: Map, color: 'text-green-400' },
    { id: 'wardrobes', label: 'Wardrobe', desc: 'One Wardrobe Ref', icon: Package, color: 'text-orange-400' },
    { id: 'props', label: 'Props', desc: 'Multiple Props', icon: Plus, color: 'text-yellow-400' },
    { id: 'moods', label: 'Mood/Style', desc: 'One Mood Ref', icon: Sparkles, color: 'text-purple-400' }
];

export const SEEDANCE_REF_CATEGORIES = [
    { id: 'ref_images', label: 'Reference Images', desc: 'Up to 9 images', icon: ImagePlus, color: 'text-cyan-400', accept: 'image/*', maxItems: 9 },
    { id: 'ref_videos', label: 'Reference Videos', desc: 'Up to 3 videos (2–15s)', icon: Video, color: 'text-rose-400', accept: 'video/mp4,video/quicktime', maxItems: 3 },
    { id: 'ref_audios', label: 'Reference Audio', desc: 'Up to 3 audio (2–15s)', icon: Music, color: 'text-amber-400', accept: 'audio/mpeg,audio/wav', maxItems: 3 },
];

export const PRO_LIGHTING_TRANSFORMS = [
    { id: 'none', label: 'No Transform', category: 'Basic' },
    { id: 'cinematic', label: 'Cinematic', category: 'Basic' },
    { id: 'morning_sun', label: 'Morning Sun', category: 'Natural', narrative: 'soft morning sunlight streaming through a window.' },
    { id: 'overcast', label: 'Overcast', category: 'Natural', narrative: 'diffused overcast daylight with soft, even shadows.' },
    { id: 'moonlight', label: 'Moonlight', category: 'Natural', narrative: 'pale, ethereal moonlight casting soft silvery glows and deep shadows.' },
    { id: 'fireplace', label: 'Fireplace', category: 'Artificial', narrative: 'warm, flickering glow from a fireplace casting orange highlights.' },
    { id: 'candlelight', label: 'Candlelight', category: 'Artificial', narrative: 'intimate, flickering candlelight with warm, dancing shadows.' },
    { id: 'fluorescent', label: 'Fluorescent', category: 'Artificial', narrative: 'harsh, cold fluorescent office lighting with clinical clarity.' },
    { id: 'neon_pulsating', label: 'Neon Pulsating', category: 'Artificial', narrative: 'vibrant, pulsating neon sign lighting in electric colors.' },
    { id: 'rembrandt', label: 'Rembrandt', category: 'Cinematic', narrative: 'classic Rembrandt lighting with a small triangle of light on the cheek.' },
    { id: 'film_noir', label: 'Film Noir', category: 'Cinematic', narrative: 'film noir aesthetic with deep, high-contrast shadows and stark highlights.' },
    { id: 'high_key', label: 'High-Key', category: 'Cinematic', narrative: 'bright, cheerful high-key lighting for an upbeat, optimistic mood.' },
    { id: 'low_key', label: 'Low-Key', category: 'Cinematic', narrative: 'dark, mysterious low-key lighting with moody shadows.' },
    { id: 'volumetric', label: 'Volumetric', category: 'Effects', narrative: 'volumetric lighting creating visible, atmospheric light rays.' },
    { id: 'silhouette', label: 'Silhouette', category: 'Effects', narrative: 'backlit lighting to create a sharp, dramatic silhouette.' },
    { id: 'golden_hour', label: 'Golden Hour', category: 'Effects', narrative: 'warm, rich golden hour glow with long, soft shadows.' },
    { id: 'side_lighting', label: 'Side Light', category: 'Effects', narrative: 'dramatic side lighting that emphasizes texture and form.' },
    { id: 'day_to_night', label: 'Day ➔ Night', category: 'Transforms', narrative: 'Transform this daytime scene into a deep nighttime environment with moonlight or artificial urban lighting.' },
    { id: 'night_to_day', label: 'Night ➔ Day', category: 'Transforms', narrative: 'Transform this nighttime scene into a bright, sunlit daytime environment.' },
    { id: 'sunrise', label: 'Cold Sunrise', category: 'Transforms', narrative: 'Apply a cold, blue-hour sunrise light with high-contrast morning shadows.' },
    { id: 'sunset', label: 'Deep Sunset', category: 'Transforms', narrative: 'Apply a rich, fiery sunset palette with long silhouettes and glowing highlights.' },
];

export const PRO_FOCUS_CONTROLS = [
    { id: 'none', label: 'Standard Focus' },
    { id: 'subject', label: 'Focus on Subject', narrative: 'Ensure the main subject is perfectly sharp, blurring all other layers.' },
    { id: 'background', label: 'Focus on Background', narrative: 'Shift focus to the distant background, blurring the foreground elements.' },
    { id: 'foreground', label: 'Focus on Foreground', narrative: 'Prioritize sharpness in the immediate foreground elements.' },
];

export const AI_MODELS = [
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
];

export const CAMERA_MOVEMENT = [
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
];

export const SPEED_RAMP_CURVES = {
    "Linear (Standard)": [[0, 50], [50, 50], [100, 50]],
    "Impact": [[0, 60], [20, 10], [40, 10], [70, 50], [100, 60]],
    "Cinematic": [[0, 50], [50, 50], [100, 50]],
    "Ramp In": [[0, 60], [40, 60], [80, 20], [100, 10]],
    "Ramp Out": [[0, 10], [20, 20], [60, 60], [100, 60]],
    "Snap": [[0, 60], [10, 10], [40, 10], [60, 60], [80, 10], [100, 10]],
    "Viral": [[0, 10], [30, 60], [50, 10], [70, 60], [100, 10]],
};

export const VIDEO_CONTROLS = [
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
            "Neutral", "Happy / Joyful", "Sad / Melancholy", "Suspenseful / Tense", "Peaceful / Serene",
            "Epic / Grandiose", "Futuristic / Sci-Fi", "Vintage / Retro", "Romantic", "Horror"
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
            "Default", "Wide-Angle Lens", "Telephoto Lens", "Shallow Depth of Field", "Deep Depth of Field",
            "Lens Flare", "Rack Focus", "Fisheye Lens", "Vertigo Effect"
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
            "Photorealistic", "Cinematic Film", "Japanese Anime", "Classic Disney Animation",
            "Pixar 3D Animation", "Claymation", "Stop-Motion", "Cel-Shaded Animation", "Van Gogh Style",
            "Surrealist Painting", "Impressionistic", "Art Deco", "Bauhaus Aesthetic", "Graphic Novel",
            "Watercolor Painting", "Charcoal Sketch", "Blueprint Schematic"
        ],
        default: "Photorealistic"
    },
    {
        key: "audio", label: "AUDIO",
        options: ["On", "Off"],
        default: "On",
        toggle: true
    },
];

export const LENS_FOCUS = [
    { id: 'shallow_dof', label: 'Shallow Depth of Field', desc: 'Blurred background, subject sharp' },
    { id: 'deep_focus', label: 'Deep Focus', desc: 'Everything in sharp focus' },
    { id: 'soft_focus', label: 'Soft Focus', desc: 'Dreamy, diffused look' },
    { id: 'rack_focus', label: 'Rack Focus', desc: 'Focus shifts during shot' },
    { id: 'wide_angle', label: 'Wide-Angle Lens', desc: 'Expansive, slight distortion' },
    { id: 'telephoto', label: 'Telephoto Lens', desc: 'Compressed perspective' },
    { id: 'macro', label: 'Macro Lens', desc: 'Extreme close detail' },
    { id: 'anamorphic', label: 'Anamorphic', desc: 'Cinematic lens flares, wide format' }
];

export const REFERENCE_USAGE = [
    { id: 'first_frame', label: 'First Frame', desc: 'Video starts from this image' },
    { id: 'last_frame', label: 'Last Frame', desc: 'Video ends at this image' },
    { id: 'style', label: 'Style Reference', desc: 'Maintain visual style/aesthetic' },
    { id: 'subject', label: 'Subject/Character', desc: 'Keep subject consistent' }
];

export const EMOTION_OPTIONS = [
    { id: 'neutral', label: 'Neutral', desc: 'Balanced expression' },
    { id: 'happy', label: 'Happy', desc: 'Joyful, smiling' },
    { id: 'sad', label: 'Sad', desc: 'Melancholic, somber' },
    { id: 'angry', label: 'Angry', desc: 'Intense, aggressive' },
    { id: 'surprised', label: 'Surprised', desc: 'Shocked, wide-eyed' },
    { id: 'fearful', label: 'Fearful', desc: 'Scared, anxious' },
    { id: 'disgusted', label: 'Disgusted', desc: 'Repulsed expression' },
    { id: 'stoic', label: 'Stoic', desc: 'Unemotional, firm' },
    { id: 'ethereal', label: 'Ethereal', desc: 'Dreamy, otherworldly gaze' }
];

export const SPEED_RAMP_OPTIONS = [
    { id: 'none', label: 'Normal (1x)', desc: 'Standard playback' },
    { id: 'slow_mo', label: 'Slow Motion', desc: 'Cinematic slow-down' },
    { id: 'fast_mo', label: 'Fast Motion', desc: 'Time-compressed' },
    { id: 'ramp_in', label: 'Ramp In', desc: 'Slow start → Fast finish' },
    { id: 'ramp_out', label: 'Ramp Out', desc: 'Fast start → Slow finish' },
    { id: 'freeze_frame', label: 'Freeze Frame', desc: 'Momentary pause' }
];
