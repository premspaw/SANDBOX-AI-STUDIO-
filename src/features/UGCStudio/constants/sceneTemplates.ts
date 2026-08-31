// ─── SCENE TEMPLATES, LANGUAGES & VOICES ──────────────────────────────────────
// Extracted from UGC.tsx — pure constants, no React dependency.

export const LANGUAGES = [
  'English',
  'Hindi',
  'Telugu',
  'Tamil',
  'Malayalam',
  'Kannada',
];

export const VOICES = [
  'Achernar', 'Achird', 'Algenib', 'Algieba', 'Alnilam', 'Aoede', 'Autonoe',
  'Callirrhoe', 'Charon', 'Despina', 'Enceladus', 'Erinome', 'Fenrir',
  'Gacrux', 'Iapetus', 'Kore', 'Laomedeia', 'Leda', 'Orus', 'Puck',
  'Pulcherrima', 'Rasalgethi', 'Sadachbia', 'Sadaltager', 'Schedar',
  'Sulafat', 'Umbriel', 'Vindemiatrix', 'Zephyr', 'Zubenelgenubi',
];

export interface SceneTemplate {
  id: number;
  title: string;
  sceneContext: string;
  prompt: string;
  img: string;
}

export const SCENE_TEMPLATES: SceneTemplate[] = [
  {
    id: 1,
    title: 'Park Walk',
    sceneContext: 'A lush park',
    prompt:
      'A casual vlog-style video of a creator walking through a bright, lush park. The camera bobs slightly to simulate walking. Natural sunlight illuminating the face, a gentle breeze in the air.',
    img: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 2,
    title: 'Kitchen Review',
    sceneContext: 'A modern kitchen',
    prompt:
      'Creator standing in a brightly lit modern kitchen with marble countertops. They are holding a product up to the camera with an excited expression. Warm indoor lighting.',
    img: 'https://images.unsplash.com/photo-1556910103-1c02745ae239?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 3,
    title: 'Car Vlog',
    sceneContext: 'Inside a moving car',
    prompt:
      'Close-up shot of a creator sitting in the driver seat of a car, talking directly into the camera attached to the dashboard. Natural light coming through the windshield, soft background blur.',
    img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 4,
    title: 'Bedroom Chat',
    sceneContext: 'A cozy bedroom',
    prompt:
      'Creator sitting cross-legged on a bed in a cozy bedroom with warm string lights. They are casually chatting with the camera. Intimate, relaxed vibe.',
    img: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f1425?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 5,
    title: 'Street Style',
    sceneContext: 'A bustling street',
    prompt:
      'Dynamic tracking shot of a creator walking down a bustling city street at golden hour. Trendy outfit, confident walk, talking directly to the viewer.',
    img: 'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 6,
    title: 'Makeup Session',
    sceneContext: 'A vanity mirror',
    prompt:
      'Close-up of a creator sitting at a vanity mirror, applying makeup while giving tips to the camera. Soft ring light reflects in their eyes. High-detail skin textures.',
    img: 'https://images.unsplash.com/photo-1522335719551-bb2f15e3850d?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 7,
    title: 'Quiet Study',
    sceneContext: 'A library/study',
    prompt:
      'Creator sitting at a wooden desk in a quiet library surrounded by books. They are whispering into the camera about their favorite reads. Moody, academic aesthetic.',
    img: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 8,
    title: 'Hair Styling',
    sceneContext: 'A bathroom mirror',
    prompt:
      'A medium shot of a man in front of a bathroom mirror, running his hands through his damp hair with the Elegance Hair Cream. He styles it effortlessly, achieving a natural, textured look. Bright, clean bathroom lighting, realistic UGC style, shot on iPhone, authentic home environment, 4k.',
    img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&q=80&w=150',
  },
];

export interface TalkingHeadTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  prompt: string;
  cameraAngles: string[];
  suggestedMotion: string;
  img: string;
}

export const TALKING_HEAD_TEMPLATES: TalkingHeadTemplate[] = [
  {
    id: 'fast_pace',
    title: '⚡ Multi-Shot Fast Pace',
    category: 'Fast Pace',
    description: 'High energy quick cuts between close-ups and dynamic medium shots while talking directly to camera.',
    prompt: 'A fast-paced multi-shot creator video. Rapid cut transitions between eye-level close-up talking head and dynamic medium shots. High energy facial expressions, expressive hand gestures, articulate speech pacing.',
    cameraAngles: ['Close-Up (Eye Level)', 'Medium Shot (3/4 Angle)', 'Low Angle Push-In'],
    suggestedMotion: 'Quick whip pans, snappy zooms on key words, rapid angle cuts every 2-3 seconds.',
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 'slow_pace',
    title: '☕ Slow Pace / Casual',
    category: 'Casual & Relaxed',
    description: 'Intimate, calm conversation in a warm setting with smooth, steady camera framing.',
    prompt: 'A calm, relaxed talking head clip. Creator sitting comfortably on a soft sofa in a warm, lit living room. Gentle head tilts, soft authentic blinking, natural micro-smiles while speaking casually into the camera.',
    cameraAngles: ['Eye-Level Medium Close-Up', 'Soft Side Profile Angle'],
    suggestedMotion: 'Slow static drift, minimal camera movement, subtle push-in.',
    img: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f1425?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 'walk_talk',
    title: '🚶 Walk & Talk Vlog',
    category: 'Outdoor Vlog',
    description: 'Selfie handheld camera movement as creator walks outside and talks naturally.',
    prompt: 'Handheld smartphone vlog perspective. Creator walking through a vibrant outdoor setting, holding camera selfie-style. Dynamic background parallax, natural sunlight, organic hand bounce while talking.',
    cameraAngles: ['Selfie Wide-Angle Handheld', 'Over-The-Shoulder Turn'],
    suggestedMotion: 'Handheld walking stabilizer effect, smooth tracking backward as creator walks forward.',
    img: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 'desk_work',
    title: '💻 Desk Work & Talking',
    category: 'Workplace / Tech',
    description: 'Creator working on laptop/desk, looking up to explain ideas directly to the camera.',
    prompt: 'Modern aesthetic office/desk setting. Creator seated at a sleek wooden desk with a laptop open. Alternate between typing/reading and turning to speak passionately directly to the lens.',
    cameraAngles: ['Medium Desk Shot', 'Over-the-Keyboard Close-Up', 'Side Angle Desk Cut'],
    suggestedMotion: 'Slow slider track left to right, subtle rack focus between laptop and face.',
    img: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 'grwm_makeup',
    title: '💄 GRWM / Makeup & Styling',
    category: 'GRWM & Beauty',
    description: 'Getting ready in front of a mirror while sharing stories or commentary directly with audience.',
    prompt: 'Creator sitting at a vanity mirror under soft ring lighting. Applying makeup or styling hair naturally while making constant eye contact in mirror reflection and directly into camera lens.',
    cameraAngles: ['Vanity Mirror Cut', 'Macro Face Close-Up', 'High Angle Top-Down'],
    suggestedMotion: 'Smooth vertical tilt up, slow zoom into eye level during story climax.',
    img: 'https://images.unsplash.com/photo-1522335719551-bb2f15e3850d?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 'daily_activity',
    title: '🍳 Daily Activity & Chat',
    category: 'Lifestyle Activity',
    description: 'Preparing coffee, cooking, or sorting items while having a natural conversation.',
    prompt: 'Casual home environment. Creator engaging in a routine task (pouring coffee/folding clothes/tidying up) while casually chatting to camera. Authentic multi-tasking body movement and natural eye contact cuts.',
    cameraAngles: ['Countertop Eye Level', 'Action Overhead Cut', 'Medium Wide Room Shot'],
    suggestedMotion: 'Gentle handheld sway, organic tracking with hand movement.',
    img: 'https://images.unsplash.com/photo-1556910103-1c02745ae239?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 'explainer',
    title: '💬 Informational / Explainer',
    category: 'Educational',
    description: 'Clear, structured educational speech with emphasis gestures and multi-shot framing.',
    prompt: 'Clean minimalist studio backdrop. Creator presenting key insights directly to camera with clear articulation, deliberate hand emphasis, confident posture, and multi-shot perspective shifts.',
    cameraAngles: ['Straight-On Medium Shot', '45-Degree Secondary Angle', 'Tight Face Emphasis Cut'],
    suggestedMotion: 'Polished motorized push-in, seamless angle jump cuts between points.',
    img: 'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?auto=format&fit=crop&q=80&w=150',
  },
];

