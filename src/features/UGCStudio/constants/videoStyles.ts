// ─── VIDEO STYLES & SCENE STYLES ──────────────────────────────────────────────
// Extracted from UGC.tsx — pure constants, no React dependency.

export interface VideoStyle {
  name: string;
  icon: string;
  description: string;
  modifier: string;
}

export interface SceneStyle {
  name: string;
  group: string;
  description: string;
  promptModifier: string;
}

export const VIDEO_STYLES: Record<string, VideoStyle> = {
  calm: {
    name: 'Calm & Natural',
    icon: '😌',
    description: 'Gentle, conversational',
    modifier:
      'calm and natural delivery, subtle hand gestures, gentle pacing, conversational tone, minimal dramatic movements, soft eye contact',
  },
  energetic: {
    name: 'Energetic',
    icon: '⚡',
    description: 'Fast-paced, expressive',
    modifier:
      'energetic and dynamic performance, fast-paced delivery, expressive hand gestures, animated facial expressions, vibrant energy',
  },
  action: {
    name: 'Action-Packed',
    icon: '🎬',
    description: 'Dramatic, intense',
    modifier:
      'action-oriented performance, dramatic movements, intense expressions, powerful gestures, high energy, dynamic delivery',
  },
  professional: {
    name: 'Professional',
    icon: '💼',
    description: 'Corporate, confident',
    modifier:
      'professional and polished delivery, confident posture, measured gestures, corporate aesthetic, business-appropriate tone',
  },
  casual: {
    name: 'Casual & Fun',
    icon: '😄',
    description: 'Relaxed, friendly',
    modifier:
      'casual and fun atmosphere, relaxed demeanor, spontaneous gestures, friendly smile, approachable vibe',
  },
  storytelling: {
    name: 'Storytelling',
    icon: '📖',
    description: 'Narrative-driven',
    modifier:
      'narrative storytelling style, expressive delivery with emotional range, thoughtful pauses, varied pacing, engaging eye contact',
  },
};

export const SCENE_STYLES: Record<string, SceneStyle> = {
  // Talking
  normal_talking: {
    name: '🎙️ Normal Talking',
    group: 'Talking',
    description: 'Direct-to-cam, relaxed lip-sync',
    promptModifier:
      'direct-to-camera, relaxed lip-sync, creator talking directly to the camera in a natural environment',
  },
  walk_talk: {
    name: '🚶 Walk & Talk',
    group: 'Talking',
    description: 'Creator walking while speaking, handheld vlog',
    promptModifier:
      'handheld vlog style, creator walking while speaking to camera, natural background movement, slight camera bobbing',
  },
  reaction_shot: {
    name: '😲 Reaction Shot',
    group: 'Talking',
    description: 'Wide-eyed surprise/delight reacting to product',
    promptModifier:
      'wide-eyed surprise and delight reacting to product, expressive positive emotion, dynamic close-up',
  },
  mirror_selfie: {
    name: '🪞 Mirror Selfie',
    group: 'Talking',
    description: 'Creator filming in mirror, tilted phone, casual',
    promptModifier:
      'creator filming a mirror selfie, tilted phone visible, casual natural lighting, authentic home environment',
  },
  // Camera Cuts
  fast_cut: {
    name: '✂️ Fast Cut',
    group: 'Camera Cuts',
    description: 'Rapid angle switches every 1-2 sec, high energy',
    promptModifier:
      'high energy video with fast cuts, rapid angle switches every 1 to 2 seconds, dynamic pacing',
  },
  dramatic_zoom: {
    name: '🔍 Dramatic Zoom',
    group: 'Camera Cuts',
    description: 'Slow cinematic push-in zoom, suspense/hook',
    promptModifier:
      'slow cinematic push-in zoom, dramatic camera push, creating suspense and hook effect, focused framing',
  },
  pov_shot: {
    name: '👆 POV Shot',
    group: 'Camera Cuts',
    description: 'First-person view looking down at product in hand',
    promptModifier:
      'first-person point-of-view POV shot, looking down at product in hands, hands interacting with product naturally',
  },
  // Product Focus
  cinematic_b_roll: {
    name: '🎥 Cinematic B-Roll',
    group: 'Product Focus',
    description: 'Slow-mo glide, bokeh, luxury reveal',
    promptModifier:
      'slow-motion glide, cinematic b-roll, high quality bokeh, luxury product reveal, professional lighting',
  },
  close_up_detail: {
    name: '🔬 Close-Up Detail',
    group: 'Product Focus',
    description: 'Extreme macro of product texture/color',
    promptModifier:
      'extreme macro close-up detail, showing texture and color of product, sharp focus on details, cinematic depth',
  },
  unboxing: {
    name: '📦 Unboxing',
    group: 'Product Focus',
    description: 'Overhead hands-opening reveal, surprise reaction',
    promptModifier:
      'overhead shot of hands-opening reveal, unboxing experience, surprise and delight reaction',
  },
  before_after: {
    name: '🔄 Before & After',
    group: 'Product Focus',
    description: 'Sequential transformation reveal with contrast',
    promptModifier:
      'sequential before and after transformation reveal, clear contrast and transition, split screen or side-by-side style comparison',
  },
  // Educational
  tutorial_step: {
    name: '🎓 Tutorial Step',
    group: 'Educational',
    description: 'Instructional hold-and-point educational framing',
    promptModifier:
      'instructional hold-and-point educational framing, step-by-step tutorial demo, clear actions and explanations',
  },
  dynamic_action: {
    name: '⚡ Dynamic Action',
    group: 'Educational',
    description: 'Handheld physical demo, shaky energy',
    promptModifier:
      'dynamic action, handheld physical demo, shaky high-energy camera movement, active product demonstration',
  },
};
