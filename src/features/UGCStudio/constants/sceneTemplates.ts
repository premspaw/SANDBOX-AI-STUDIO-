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
