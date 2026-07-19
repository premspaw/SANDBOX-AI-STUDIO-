import React, { useState } from 'react';
import { 
  Upload, X, Plus, MapPin, Home, Camera, 
  Film, Loader2, ChevronDown, Play,
  Building, Trees, Sofa, UtensilsCrossed,
  Bath, BedDouble, Car, Maximize,
  ChevronLeft, ChevronRight, FileText, Sparkles, RefreshCw
} from 'lucide-react';
import { useUGC } from '../context/UGCContext';
import GalleryGrid from './GalleryGrid';
import { useShorts } from '../../../hooks/useShorts';
import { fileToBase64, resizeImage } from '../utils/imageUtils';
import { uploadToSupabase } from '../utils/storageUtils';
import { getApiUrl, resolveUrl } from '../../../config/apiConfig';
import { GoogleGenAI } from '@google/genai';
import { motion } from 'motion/react';

// ── Room slot definition ─────────────────────────────────────
interface RoomSlot {
  id: string;
  label: string;
  icon: any;
  images: { url: string; file: File }[];
  script: string;       // AI generated per room
  prompt: string;       // Veo prompt per room
  generatedVideo: string | null;
  duration: number;     // seconds for this room shot
}

// ── Default room slots ────────────────────────────────────────
const DEFAULT_ROOMS: Omit<RoomSlot, 'images' | 'script' | 'prompt' | 'generatedVideo'>[] = [
  { id: 'front',    label: 'Front Elevation', icon: Building, duration: 5 },
  { id: 'living',   label: 'Living Room',     icon: Sofa,     duration: 5 },
  { id: 'kitchen',  label: 'Kitchen',         icon: UtensilsCrossed, duration: 5 },
  { id: 'bedroom1', label: 'Bedroom 1',       icon: BedDouble, duration: 5 },
  { id: 'bedroom2', label: 'Bedroom 2',       icon: BedDouble, duration: 5 },
  { id: 'bathroom', label: 'Bathroom',        icon: Bath,      duration: 5 },
  { id: 'lawn',     label: 'Lawn / Garden',   icon: Trees,     duration: 5 },
  { id: 'parking',  label: 'Parking / Garage',icon: Car,       duration: 5 },
];

// ── Prompt builder per room ───────────────────────────────────
const buildRoomTourPrompt = (params: {
  roomLabel: string;
  roomScript: string;
  hasRealtor: boolean;
  propertyName: string;
  shotIndex: number;
  totalRooms: number;
  tourStyle: string;
}): string => {
  const { roomLabel, roomScript, hasRealtor, propertyName, shotIndex, totalRooms, tourStyle } = params;

  const isFirst = shotIndex === 0;
  const isLast = shotIndex === totalRooms - 1;

  const positionNote = isFirst
    ? 'Opening shot — establish the property, confident welcoming energy.'
    : isLast
    ? 'Closing shot — warm sign-off, inviting the viewer to inquire.'
    : `Room ${shotIndex + 1} of ${totalRooms} — smooth continuation of the tour.`;

  const styleMap: Record<string, string> = {
    luxury:    'Premium cinematic walkthrough, slow confident movement, aspirational lighting, high-end real estate aesthetic',
    friendly:  'Warm friendly walkthrough, natural light, approachable agent energy, authentic UGC style',
    energetic: 'Dynamic fast-paced walkthrough, enthusiastic agent, handheld energy, engaging direct-to-camera',
    minimal:   'Clean minimal aesthetic, slow steady movement, architecture-focused, natural light',
  };

  return `
8-second real estate home tour video clip.
Property: ${propertyName || 'Luxury Property'}
Room: ${roomLabel}
Position: ${positionNote}

${hasRealtor
  ? `REALTOR WALKTHROUGH: The realtor/agent enters the ${roomLabel} from the doorway, 
turns to face the camera with a welcoming expression, gestures around the room 
highlighting key features, and speaks: "${roomScript}"`
  : `PROPERTY SHOWCASE: Smooth cinematic pan through the ${roomLabel}, 
highlighting key architectural features, natural lighting, and spatial quality. 
Voice-over style: "${roomScript}"`
}

CAMERA MOVEMENT: 
- Start: Wide establishing shot of the full ${roomLabel}
- Middle: Slow pan or push-in showing room details  
- End: Return to realtor/agent facing camera if present

STYLE: ${styleMap[tourStyle] || styleMap.friendly}
UGC real estate aesthetic — shot on iPhone or high-end phone camera.
Natural lighting where possible. Show the space at its best.
NO jump cuts. Smooth continuous motion. 8 seconds total.
`.trim();
};

// ── Script builder per room ───────────────────────────────────
const buildRoomScript = (params: {
  roomLabel: string;
  propertyDetails: string;
  tourTone: string;
  isFirst: boolean;
  isLast: boolean;
}): string => {
  const { roomLabel, propertyDetails, tourTone, isFirst, isLast } = params;

  if (isFirst) {
    return `Welcome to this stunning property. Let me take you on a tour — starting right here at the ${roomLabel}.`;
  }
  if (isLast) {
    return `And that's the full tour! This property is truly special. If you'd like to schedule a visit, reach out today.`;
  }

  const roomScripts: Record<string, Record<string, string>> = {
    friendly: {
      'Living Room':    "And this is the living room — so much natural light, perfect for the whole family.",
      'Kitchen':        "Look at this kitchen! Fully modular, great counter space, and that view from the window.",
      'Bedroom 1':      "The master bedroom — spacious, great ventilation, fits a king bed easily.",
      'Bedroom 2':      "Second bedroom here — perfect for kids or a home office, nice and airy.",
      'Bathroom':       "The bathroom is really well done — clean tiles, good fittings, excellent water pressure.",
      'Lawn / Garden':  "Step outside — this lawn area is gorgeous. Perfect for morning chai or family evenings.",
      'Parking / Garage': "And the parking — covered, secure, easily fits two cars.",
    },
    luxury: {
      'Living Room':    "The grand living space — floor to ceiling windows, premium finishes, designed for entertaining.",
      'Kitchen':        "A chef's kitchen — Italian modular cabinets, quartz countertops, top-of-line appliances.",
      'Bedroom 1':      "The master suite — a sanctuary. Walk-in wardrobe, en-suite bath, city views.",
      'Bedroom 2':      "Second bedroom — equally appointed, built-in storage, abundant natural light.",
      'Bathroom':       "The en-suite — spa-like finishes, rain shower, heated flooring.",
      'Lawn / Garden':  "The private garden — landscaped, intimate, your own outdoor retreat.",
      'Parking / Garage': "Secured basement parking for two vehicles with direct lift access.",
    },
  };

  const toneScripts = roomScripts[tourTone] || roomScripts.friendly;
  return toneScripts[roomLabel] || `Here's the ${roomLabel} — beautifully designed and full of natural light.`;
};

// ── Main Component ────────────────────────────────────────────
export default function HomeTourTab() {
  const { spend, refund } = useShorts();
  const {
    getApiKey,
    fetchImageAsBlob,
    addToGallery,
    updateGalleryItem,
    setTimeline,
    showToast,
    handleApiError,
    currentUserId,
    isAdmin,
    isGlobalAdmin,
    getCurrentCost,
    videoGenMode,
    setVideoGenMode,
    videoResolution,
    aspectRatio,
    includeAudio,
    isGeneratingVideo,
    setIsGeneratingVideo,
    videoProgressMsg,
    setVideoProgressMsg,
    isSidebarOpen,
    setIsSidebarOpen,
    isChatCollapsed,
    setIsChatCollapsed,
    imgEngine,
    setImgEngine,
    getImageCost,
  } = useUGC();

  // ── Local state ──────────────────────────────────────────────
  const [realtorImg, setRealtorImg] = useState<{ url: string; file: File } | null>(null);
  const [startFrameImg, setStartFrameImg] = useState<{ url: string; file: File } | null>(null);
  const [propertyName, setPropertyName] = useState('');
  const [propertyPrice, setPropertyPrice] = useState('');
  const [propertyLocation, setPropertyLocation] = useState('');
  const [tourStyle, setTourStyle] = useState<'friendly' | 'luxury' | 'energetic' | 'minimal'>('friendly');
  const [pathStyle, setPathStyle] = useState<'Walking Path' | 'Camera Path' | 'Reveal Path' | 'Story Path'>('Walking Path');
  const [chatTab, setChatTab] = useState<'script' | 'video'>('script');

  // Continuous Walkthrough States
  const [tourMode, setTourMode] = useState<'individual' | 'continuous'>('individual');
  const [continuousDuration, setContinuousDuration] = useState<10 | 20 | 30>(20);
  const [continuousScript, setContinuousScript] = useState('');
  const [continuousSegments, setContinuousSegments] = useState<{ segmentIndex: number; script: string; prompt: string }[]>([]);
  const [selectedContinuousSegments, setSelectedContinuousSegments] = useState<Set<number>>(new Set());
  const [isGeneratingContinuousScript, setIsGeneratingContinuousScript] = useState(false);
  const [isGeneratingContinuousVideo, setIsGeneratingContinuousVideo] = useState(false);

  // Script and language states
  const [language, setLanguage] = useState('English');
  const [isGeneratingSingleScript, setIsGeneratingSingleScript] = useState(false);

  const [rooms, setRooms] = useState<RoomSlot[]>(
    DEFAULT_ROOMS.map(r => ({
      ...r,
      images: [],
      script: '',
      prompt: '',
      generatedVideo: null,
    }))
  );

  const [isGeneratingScripts, setIsGeneratingScripts] = useState(false);
  const [generatingRoomId, setGeneratingRoomId] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string>('front');

  // ── Upload realtor image ──────────────────────────────────────
  const handleRealtorUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRealtorImg({ url: URL.createObjectURL(file), file });
  };

  const handleStartFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStartFrameImg({ url: URL.createObjectURL(file), file });
  };

  // ── Upload room image ─────────────────────────────────────────
  const handleRoomUpload = (roomId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setRooms(prev => prev.map(r => {
      if (r.id === roomId && r.images.length < 3) {
        return { ...r, images: [...r.images, { url, file }] };
      }
      return r;
    }));
  };

  // ── Remove room image ─────────────────────────────────────────
  const removeRoomImage = (roomId: string, imageIndex: number) => {
    setRooms(prev => prev.map(r => {
      if (r.id === roomId) {
        const newImages = [...r.images];
        newImages.splice(imageIndex, 1);
        return { ...r, images: newImages };
      }
      return r;
    }));
  };

  const updateRoomDuration = (roomId: string, newDuration: number) => {
    setRooms(prev => prev.map(r =>
      r.id === roomId ? { ...r, duration: newDuration } : r
    ));
  };

  // ── Add custom room slot ──────────────────────────────────────
  const addCustomRoom = () => {
    const roomName = window.prompt("Enter the name for the custom room (e.g., Terrace, Basement):");
    if (!roomName || roomName.trim() === '') return;

    const newRoom: RoomSlot = {
      id: `custom-${Date.now()}`,
      label: roomName.trim(),
      icon: Home,
      images: [],
      script: '',
      prompt: '',
      generatedVideo: null,
      duration: 5,
    };
    setRooms(prev => [...prev, newRoom]);
  };

  // ── Remove room slot ──────────────────────────────────────────
  const removeRoom = (roomId: string) => {
    setRooms(prev => prev.filter(r => r.id !== roomId));
  };

  // ── Generate AI scripts for all rooms ────────────────────────
  const generateTourScripts = async () => {
    setIsGeneratingScripts(true);
    try {
      const filledRooms = rooms.filter(r => r.images && r.images.length > 0);
      if (filledRooms.length === 0) {
        showToast('Upload at least one room photo first', 'error');
        return;
      }

      let offset = 0;
      const filledRoomsWithTimes = filledRooms.map((room) => {
        const start = offset;
        const end = offset + room.duration;
        offset = end;

        const fmt = (s: number) => {
          const m = Math.floor(s / 60);
          const sec = s % 60;
          return `${m}:${String(sec).padStart(2, '0')}`;
        };

        return {
          ...room,
          timeRange: `[${fmt(start)} - ${fmt(end)}]`
        };
      });

      const propertyContext = [
        propertyName && `Property: ${propertyName}`,
        propertyPrice && `Price: ${propertyPrice}`,
        propertyLocation && `Location: ${propertyLocation}`,
      ].filter(Boolean).join(', ');

      const tourScriptPrompt = `
You are a professional real estate video copywriter.
Generate a cohesive property tour script and visual video prompts for the following rooms:
${filledRoomsWithTimes.map((r) => `- Room: "${r.label}" (ID: "${r.id}", Duration: ${r.duration} seconds, Timestamp Range: ${r.timeRange})`).join('\n')}

Property Details:
- Context: ${propertyContext || 'Premium Property'}
- Tour Tone/Style: ${tourStyle}
- Language: ${language}
- Has Realtor/Agent: ${realtorImg ? 'Yes' : 'No'}

For each room, generate:
1. "script": A spoken monologue for this room.
   - It MUST be written in ${language} (if Dravidian/Hindi, write in that language's script).
   - The script must fit the duration of the room (target ~3 words per second: e.g., 12-15 words for 4-5s, 18-20 words for 6s, 24-25 words for 8s, 25-30 words for 10s).
   - CRITICAL: Provide ONLY the raw spoken words. Do NOT include ANY timestamps (like [0:00 - 0:05]), room names (like "KITCHEN:"), speaker labels, or stage directions in the script text. Output strictly the monologue.
   - CRITICAL RESTRICTION: You are STRICTLY FORBIDDEN from using the word "Welcome" or any greeting. Do not say "Welcome to this...". Start immediately with a transition or an engaging observation about the space (e.g. "Step into this beautiful...", "Notice the...", "Here we have...").
2. "prompt": A detailed visual motion prompt describing the cinematic video shot for this room. Use this EXACT Universal Prompt Structure:
   - REFERENCE LOCK: "Maintain the exact room layout, furniture placement, colors, materials, proportions, and architectural details from the reference image. Do not redesign, replace, remove, or reposition any furniture or decorative elements." If "Has Realtor" is Yes: "Preserve the realtor's facial identity, hairstyle, clothing, body proportions, and speaking style consistently throughout the entire shot."
   - CHARACTER ACTION (If "Has Realtor" is Yes): Give the realtor specific, purposeful behavior (e.g., "confidently introduces each feature with natural pointing gestures, briefly looking toward the feature before returning her gaze to the camera").
   - CAMERA BEHAVIOR: Make the realtor drive the camera. (e.g., "The camera smoothly follows her movement, revealing each feature only when she gestures toward it.") Use terms like "Smooth handheld gimbal movement with realistic operator motion, subtle acceleration and deceleration, maintaining stable framing."
   - ENVIRONMENT REVEAL: Do NOT force a list of objects. Let the camera discover the room (e.g., "the camera gradually reveals the room's key architectural features and premium furnishings").
   - LIGHTING: Do NOT over-specify lighting. Simply write: "Preserve the lighting exactly as shown in the reference image, enhancing only the natural warmth and depth without altering the room's original mood."
   - CONTINUITY: "One continuous cinematic shot. No cuts. Consistent identity."
   - ENDING: End stronger. (e.g., "The camera settles into a balanced hero composition while the realtor finishes her sentence with a warm smile, holding a relaxed presentation pose before the shot ends.")
   - DIALOGUE INCLUSION: You MUST include the exact spoken dialogue from the "script" inside this "prompt" field so the director knows what is being said. Format it like: "The character says: '[exact dialogue]'. When it cuts to B-roll, voiceover continues: '[exact dialogue]'."

Return a JSON array of objects, each object structured as:
{
  "id": "room ID matching the input room ID exactly",
  "script": "spoken monologue in ${language}",
  "prompt": "visual prompt for video generation"
}
      `.trim();

      const responseSchema = {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING' },
                script: { type: 'STRING' },
                prompt: { type: 'STRING' }
              },
              required: ['id', 'script', 'prompt']
            }
          };

      let responseText: string | undefined;

      // Try server-side first (uses service account with separate billing)
      try {
        const serverResp = await fetch(getApiUrl('/api/ugc/generate-text'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: tourScriptPrompt, model: 'gemini-2.5-flash', responseSchema }),
        });
        if (serverResp.ok) {
          const serverData = await serverResp.json();
          responseText = serverData.text;
        } else {
          console.warn('[TourScripts] Server-side failed, falling back to client-side...');
        }
      } catch (serverErr) {
        console.warn('[TourScripts] Server unreachable, falling back to client-side...', serverErr);
      }

      // Fallback to client-side
      if (!responseText) {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
      let parts: any[] = [{ text: tourScriptPrompt }];
      const imagesFound = [];

      for (const r of filledRoomsWithTimes) {
        if (r.images && r.images.length > 0) {
          try {
            for (const img of r.images) {
              const blob = await fetchImageAsBlob(img.url);
              const base64 = await fileToBase64(blob);
              parts.push({ text: `\n--- Photo of ${r.label} ---` });
              parts.push({
                inlineData: {
                  data: base64,
                  mimeType: blob.type || 'image/jpeg'
                }
              });
            }
            imagesFound.push(r.label);
          } catch (e) {
            console.warn(`Failed to attach image for ${r.label}`, e);
          }
        }
      }

      if (imagesFound.length > 0) {
        parts[0].text = `IMPORTANT VISUAL CONTEXT: I have attached photos for the following rooms: ${imagesFound.join(', ')}. \n\nCRITICAL INSTRUCTION: You MUST visually analyze these photos. Do NOT hallucinate generic room descriptions. Your "script" and "prompt" MUST accurately describe the specific furniture, colors, layout, windows, and architectural details visible in these exact images.\n\n` + parts[0].text;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: parts,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
        }
      });
      responseText = response.text;
      }

      if (!responseText) throw new Error('Empty response from AI');
      const generatedList = JSON.parse(responseText) as { id: string; script: string; prompt: string }[];
      
      const updatedRooms = rooms.map((room) => {
        const generated = generatedList.find(g => g.id === room.id);
        if (generated) {
          const timeData = filledRoomsWithTimes.find(t => t.id === room.id);
          const prefix = timeData ? `${timeData.timeRange} ${room.label.toUpperCase()}: ` : '';
          
          const cleanScript = generated.script
            .replace(/^\[\d+:\d+\s*[-–]\s*\d+:\d+\]\s*[^:]*:\s*/i, '')
            .trim();

          return {
            ...room,
            script: `${prefix}${cleanScript}`,
            prompt: generated.prompt
          };
        }
        return room;
      });

      setRooms(updatedRooms);
      showToast(`Scripts generated for ${filledRooms.length} rooms in ${language}!`, 'success');
    } catch (e) {
      handleApiError(e, 'Tour script generation');
    }
    setIsGeneratingScripts(false);
  };

  // ── Generate AI script for a single room ────────────────────────
  const generateSingleRoomScript = async (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    setIsGeneratingSingleScript(true);
    try {
      const filledRooms = rooms.filter(r => r.images && r.images.length > 0);
      let offset = 0;
      let timeRange = '';
      
      for (const fr of filledRooms) {
        if (fr.id === room.id) {
          const start = offset;
          const end = offset + room.duration;
          const fmt = (s: number) => {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return `${m}:${String(sec).padStart(2, '0')}`;
          };
          timeRange = `[${fmt(start)} - ${fmt(end)}]`;
          break;
        }
        offset += fr.duration;
      }

      const propertyContext = [
        propertyName && `Property: ${propertyName}`,
        propertyPrice && `Price: ${propertyPrice}`,
        propertyLocation && `Location: ${propertyLocation}`,
      ].filter(Boolean).join(', ');

      const isFirstRoom = filledRooms[0]?.id === room.id;

      const ai = new GoogleGenAI({ apiKey: getApiKey() });
      
      const prompt = `
You are a professional real estate video copywriter.
Generate a property tour script and visual video prompt for the following single room:
- Room: "${room.label}" (Duration: ${room.duration} seconds, Timestamp Range: ${timeRange})

Property Details:
- Context: ${propertyContext || 'Premium Property'}
- Tour Tone/Style: ${tourStyle}
- Language: ${language}
- Has Realtor/Agent: ${realtorImg ? 'Yes' : 'No'}

Please generate:
1. "script": A spoken monologue for this room. 
   - It MUST be written in ${language} (if Dravidian/Hindi, write in that language's script, e.g., Telugu script for Telugu, Devanagari script for Hindi).
   - The script must fit the duration of the room (target ~3 words per second: e.g., 12-15 words for 4-5s, 18-20 words for 6s, 24-25 words for 8s, 25-30 words for 10s).
   - CRITICAL: Provide ONLY the raw spoken words. Do NOT include ANY timestamps (like [0:00 - 0:05]), room names (like "KITCHEN:"), speaker labels, or stage directions in the script text. Output strictly the monologue.
   - CRITICAL RESTRICTION: You are STRICTLY FORBIDDEN from using the word "Welcome" or any greeting. Do not say "Welcome to this...". Start immediately with an engaging observation about the space (e.g. "Step into this beautiful...", "Notice the...", "Here we have...").
2. "prompt": A detailed visual motion prompt describing the cinematic video shot for this room. Use this EXACT Universal Prompt Structure:
   - REFERENCE LOCK: "Maintain the exact room layout, furniture placement, colors, materials, proportions, and architectural details from the reference image. Do not redesign, replace, remove, or reposition any furniture or decorative elements." If "Has Realtor" is Yes: "Preserve the realtor's facial identity, hairstyle, clothing, body proportions, and speaking style consistently throughout the entire shot."
   - CHARACTER ACTION (If "Has Realtor" is Yes): Give the realtor specific, purposeful behavior (e.g., "confidently introduces each feature with natural pointing gestures, briefly looking toward the feature before returning her gaze to the camera").
   - CAMERA BEHAVIOR: Make the realtor drive the camera. (e.g., "The camera smoothly follows her movement, revealing each feature only when she gestures toward it.") Use terms like "Smooth handheld gimbal movement with realistic operator motion, subtle acceleration and deceleration, maintaining stable framing."
   - ENVIRONMENT REVEAL: Do NOT force a list of objects. Let the camera discover the room (e.g., "the camera gradually reveals the room's key architectural features and premium furnishings").
   - LIGHTING: Do NOT over-specify lighting. Simply write: "Preserve the lighting exactly as shown in the reference image, enhancing only the natural warmth and depth without altering the room's original mood."
   - CONTINUITY: "One continuous cinematic shot. No cuts. Consistent identity."
   - ENDING: End stronger. (e.g., "The camera settles into a balanced hero composition while the realtor finishes her sentence with a warm smile, holding a relaxed presentation pose before the shot ends.")
   - DIALOGUE INCLUSION: You MUST include the exact spoken dialogue from the "script" inside this "prompt" field so the director knows what is being said. Format it like: "The character says: '[exact dialogue]'. When it cuts to B-roll, voiceover continues: '[exact dialogue]'."

Return a JSON object structured exactly as:
{
  "script": "spoken monologue in ${language}",
  "prompt": "visual prompt for video generation"
}
      `.trim();

      let parts: any[] = [{ text: prompt }];

      if (room.images && room.images.length > 0) {
        try {
          for (const img of room.images) {
            const blob = await fetchImageAsBlob(img.url);
            const base64 = await fileToBase64(blob);
            parts.push({
              inlineData: {
                data: base64,
                mimeType: blob.type || 'image/jpeg'
              }
            });
          }
          parts[0].text = `IMPORTANT VISUAL CONTEXT: I have attached photos of this room.\n\nCRITICAL INSTRUCTION: You MUST visually analyze these photos. Do NOT hallucinate generic room descriptions. Your "script" and "prompt" MUST accurately describe the specific furniture, colors, layout, windows, and architectural details visible in these exact images.\n\n` + parts[0].text;
        } catch (e) {
          console.warn('Failed to attach image for script gen', e);
        }
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: parts,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              script: { type: 'STRING' },
              prompt: { type: 'STRING' }
            },
            required: ['script', 'prompt']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty response from AI");
      
      const generated = JSON.parse(responseText) as { script: string; prompt: string };
      
      const prefix = timeRange ? `${timeRange} ${room.label.toUpperCase()}: ` : '';
      const cleanScript = generated.script
        .replace(/^\[\d+:\d+\s*[-–]\s*\d+:\d+\]\s*[^:]*:\s*/i, '')
        .trim();

      setRooms(prev => prev.map(r =>
        r.id === roomId ? { ...r, script: `${prefix}${cleanScript}`, prompt: generated.prompt } : r
      ));
      showToast(`Script rewritten for ${room.label} in ${language}!`, 'success');
    } catch (e) {
      handleApiError(e, 'Single room script generation');
    } finally {
      setIsGeneratingSingleScript(false);
    }
  };

  // ── Generate AI script for continuous walkthrough ───────────────
  const generateContinuousTourScript = async () => {
    const filledRooms = rooms.filter(r => r.images && r.images.length > 0);
    if (filledRooms.length < 2) {
      showToast('Please upload photos for at least 2 rooms first', 'error');
      return;
    }

    setIsGeneratingContinuousScript(true);
    try {
      const propertyContext = [
        propertyName && `Property: ${propertyName}`,
        propertyPrice && `Price: ${propertyPrice}`,
        propertyLocation && `Location: ${propertyLocation}`,
      ].filter(Boolean).join(', ');

      const numSegments = filledRooms.length - 1;
      const actualDuration = numSegments * 10;
      const activeSequence = filledRooms.slice(0, numSegments + 1);

      const segmentInstructions = [];
      for (let i = 0; i < numSegments; i++) {
        const fromRoom = activeSequence[i]?.label || `Room ${i + 1}`;
        const toRoom = activeSequence[i + 1]?.label || `Room ${i + 2}`;
        
        let pathInstruction = `describe camera pan/dolly walking from ${fromRoom} into ${toRoom}`;
        if (pathStyle === 'Camera Path') pathInstruction = `describe a cinematic, smooth, floating camera transition moving directly from ${fromRoom} into ${toRoom} (focus on pure camera movement)`;
        else if (pathStyle === 'Reveal Path') pathInstruction = `describe a suspenseful reveal transition, starting close on an architectural detail in ${fromRoom} and smoothly opening up to reveal ${toRoom}`;
        else if (pathStyle === 'Story Path') pathInstruction = `describe a narrative-driven transition following a lifestyle flow from ${fromRoom} into ${toRoom}`;

        segmentInstructions.push(`   - For Segment Index ${i}: ${pathInstruction}.`);
      }

      const prompt = `
You are a professional real estate video copywriter.
Generate a single continuous property tour voiceover monologue script and visual scene prompts for a ${actualDuration}-second walkthrough.
The tour transitions through the following rooms in order:
${activeSequence.map((r, i) => `${i + 1}. Room: "${r?.label || 'Room'}"`).join('\n')}

Property Details:
- Context: ${propertyContext || 'Premium Property'}
- Tone: ${tourStyle}
- Language: ${language}
- Has Realtor: ${realtorImg ? 'Yes' : 'No'}

Please generate:
1. "script": A single cohesive spoken monologue for the entire tour (duration: ${continuousDuration} seconds).
   - It MUST be written in ${language} (using native script).
   - Keep it natural, warm, and highly engaging. Do not include labels or timestamps in the spoken script.
2. "segments": An array of exactly ${numSegments} objects. One for each transition segment of 10 seconds.
${segmentInstructions.join('\n')}
   - If realtor is present, describe the realtor standing/gesturing to show the transition.

Return a JSON object structured exactly as:
{
  "script": "full monologue script across all rooms",
  "segments": [
    {
      "segmentIndex": 0,
      "script": "monologue portion for this 10-second segment",
      "prompt": "visual motion prompt for walking from Room A to Room B"
    }
  ]
}
      `.trim();

      const responseSchema = {
        type: 'OBJECT',
        properties: {
          script: { type: 'STRING' },
          segments: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                segmentIndex: { type: 'INTEGER' },
                script: { type: 'STRING' },
                prompt: { type: 'STRING' }
              },
              required: ['segmentIndex', 'script', 'prompt']
            }
          }
        },
        required: ['script', 'segments']
      };

      let responseText: string | undefined;

      // Try server-side first (uses service account with separate billing)
      try {
        const serverResp = await fetch(getApiUrl('/api/ugc/generate-text'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, model: 'gemini-2.5-flash', responseSchema }),
        });
        if (serverResp.ok) {
          const serverData = await serverResp.json();
          responseText = serverData.text;
        } else {
          console.warn('[ContinuousScript] Server-side failed, falling back to client-side...');
        }
      } catch (serverErr) {
        console.warn('[ContinuousScript] Server unreachable, falling back to client-side...', serverErr);
      }

      // Fallback to client-side if server didn't return a result
      if (!responseText) {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema,
          }
        });
        responseText = response.text;
      }

      if (!responseText) throw new Error("Empty response from AI");
      const generated = JSON.parse(responseText) as {
        script: string;
        segments: { segmentIndex: number; script: string; prompt: string }[];
      };

      setContinuousScript(generated.script);
      setContinuousSegments(generated.segments);
      setSelectedContinuousSegments(new Set(generated.segments.map((s: any) => s.segmentIndex)));
      showToast(`Continuous script generated for ${numSegments} transition segments!`, 'success');
    } catch (e) {
      handleApiError(e, 'Continuous script generation');
    } finally {
      setIsGeneratingContinuousScript(false);
    }
  };

  // ── Generate Video for Continuous Walkthrough ───────────────────
  const generateContinuousVideo = async (specificSegmentIndex?: number) => {
    const filledRooms = rooms.filter(r => r.images && r.images.length > 0);
    if (filledRooms.length < 2) {
      showToast('Please upload photos for at least 2 rooms first', 'error');
      return;
    }

    const numSegments = filledRooms.length - 1;
    if (continuousSegments.length === 0) {
      showToast('Please auto-write the script/prompt sequence first', 'error');
      return;
    }

    const isSingle = typeof specificSegmentIndex === 'number';
    let segmentsToGenerateList: number[] = [];
    if (isSingle) {
      segmentsToGenerateList = [specificSegmentIndex!];
    } else {
      segmentsToGenerateList = Array.from(selectedContinuousSegments).sort((a,b) => a-b);
    }

    if (segmentsToGenerateList.length === 0) {
      showToast('Please select at least one segment to generate', 'error');
      return;
    }

    const segmentsToGenerate = segmentsToGenerateList.length;

    const segmentDuration = 10;
    const singleSegmentCost = getCurrentCost(false, segmentDuration);
    const totalCost = singleSegmentCost * segmentsToGenerate;

    if (!isAdmin && !isGlobalAdmin) {
      const spendRes = await spend('veo_fast', totalCost as any);
      if (!spendRes?.success) {
        showToast(`Need ${totalCost} Shorts to generate walkthrough`, 'error');
        return;
      }
    }

    setIsGeneratingContinuousVideo(true);
    setVideoProgressMsg(`Starting continuous walkthrough...`);

    const pendingGalleryIds: string[] = [];
    try {
      const generatedClips: { index: number; url: string; roomId: string; galleryId: string }[] = [];

      for (const i of segmentsToGenerateList) {
        if (i >= filledRooms.length - 1) continue;
        const startRoom = filledRooms[i];
        const endRoom = filledRooms[i + 1];
        const galleryId = `room-vid-${startRoom?.id || i}-${Date.now()}`;
        pendingGalleryIds.push(galleryId);

        const segmentData = continuousSegments.find(s => s.segmentIndex === i) || {
          prompt: `Camera moves from ${startRoom.label} to ${endRoom.label}...`
        };

        addToGallery({
          id: galleryId,
          type: 'video',
          url: '',
          loading: true,
          prompt: segmentData.prompt
        });
      }

      for (const i of segmentsToGenerateList) {
        if (i >= filledRooms.length - 1) continue;
        const startRoom = filledRooms[i];
        const endRoom = filledRooms[i + 1];
        const segmentData = continuousSegments.find(s => s.segmentIndex === i) || {
          script: `Touring from ${startRoom.label} to ${endRoom.label}`,
          prompt: `A continuous camera walkthrough walking from ${startRoom.label} into ${endRoom.label}.`
        };

        setVideoProgressMsg(`Generating Segment ${i + 1}/${numSegments}: ${startRoom.label} → ${endRoom.label}...`);

        let imagePayload: { imageBytes: string; mimeType: string } | undefined;
        
        if (i === 0 && startFrameImg) {
          try {
            const blob = await fetchImageAsBlob(startFrameImg.url || URL.createObjectURL(startFrameImg.file));
            const base64 = await resizeImage(blob);
            imagePayload = { imageBytes: base64, mimeType: 'image/jpeg' };
          } catch(e) {}
        }

        if (!imagePayload && realtorImg) {
          let compositePrompt = `
The FIRST image is the REALTOR/AGENT reference photo.
The SECOND image is the ${startRoom.label} of a property.
TASK: Generate ONE single coherent photo of this realtor standing inside the ${startRoom.label}, facing the camera with a welcoming gesture.
CRITICAL: The face/likeness must match the first reference photo exactly.
          `.trim();

          const refImages = [
            { url: realtorImg.url || URL.createObjectURL(realtorImg.file) },
            { url: startRoom.images[0].url }
          ];

          const compResponse = await fetch(getApiUrl('/api/generate-image'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'nano-banana-2',
              prompt: compositePrompt,
              aspect_ratio: '9:16',
              size: '2K',
              userId: currentUserId,
              folder: 'ugc/generated',
              referenceImages: refImages,
            }),
          });

          if (compResponse.ok) {
            const compData = await compResponse.json();
            let compositeUrl = compData.imageUrl || compData.url;
            if (compData.jobId) {
              let attempts = 0;
              const pollUrl = getApiUrl(`/api/job-status/${compData.jobId}`);
              while (attempts < 30) {
                await new Promise(r => setTimeout(r, 3000));
                attempts++;
                const pollRes = await fetch(pollUrl);
                if (pollRes.ok) {
                  const pollData = await pollRes.json();
                  if (pollData.status === 'done' && pollData.imageUrl) {
                    compositeUrl = pollData.imageUrl;
                    break;
                  }
                }
              }
            }
            if (compositeUrl) {
              const blob = await fetchImageAsBlob(compositeUrl);
              const base64 = await resizeImage(blob);
              imagePayload = { imageBytes: base64, mimeType: 'image/jpeg' };
            }
          }
        }

        if (!imagePayload && startRoom.images && startRoom.images.length > 0) {
          const blob = await fetchImageAsBlob(startRoom.images[0].url);
          const base64 = await resizeImage(blob);
          imagePayload = { imageBytes: base64, mimeType: 'image/jpeg' };
        }

        let finalPrompt = segmentData.prompt;
        finalPrompt += `\n\nSTRICT GEOMETRY PRESERVATION: Do NOT morph, warp, distort, or flip the room layout. Cut to the scene is completely fine, but absolutely NO morphing between objects. The background structure, walls, cabinets, furniture, and geometric details MUST remain 100% stable. No weird transitions. Only smooth, steady forward walkthrough camera motion.`;

        if (realtorImg) {
          finalPrompt += `\n\nCRITICAL FACE LIKENESS LOCK: The realtor/agent in the video MUST have the exact face likeness, bone structure, skin tone, hair, and identity matching the realtor reference photo. Maintain complete facial consistency.`;
        }

        if (includeAudio && segmentData.script) {
          // Clean accidental UI labels like "[0:00 - 0:10] BEDROOM 2:" that AI sometimes hallucinates
          const cleanScript = segmentData.script.replace(/^\[.*?\]\s*(.*?:\s*)?/, '').trim();
          finalPrompt += `\n\nThe person in the video is speaking to the camera. They say exactly: "${cleanScript}"`;
        }

        let imageToSend = '';
        if (imagePayload) {
          imageToSend = `data:${imagePayload.mimeType};base64,${imagePayload.imageBytes}`;
        }

        let refImagesList: any[] = [];
        
        if (startFrameImg) {
          try {
            const blob = await fetchImageAsBlob(startFrameImg.url || URL.createObjectURL(startFrameImg.file));
            const base64 = await resizeImage(blob);
            refImagesList.push({ url: `data:image/jpeg;base64,${base64}` });
          } catch (e) {
            console.warn('[HomeTour-Omni] Failed to attach startFrameImg:', e);
          }
        }

        // Add realtor image as the primary character reference if it exists
        if (realtorImg) {
          try {
            const blob = await fetchImageAsBlob(realtorImg.url || URL.createObjectURL(realtorImg.file));
            const base64 = await resizeImage(blob);
            refImagesList.push({ url: `data:image/jpeg;base64,${base64}` });
          } catch (e) {
            console.warn('[HomeTour-Omni] Failed to attach realtor image as reference:', e);
          }
        }

        // Add startRoom secondary images
        if (startRoom.images && startRoom.images.length > 1) {
          for (let imgIdx = 1; imgIdx < startRoom.images.length; imgIdx++) {
            try {
              const blob = await fetchImageAsBlob(startRoom.images[imgIdx].url);
              const base64 = await resizeImage(blob);
              refImagesList.push({ url: `data:image/jpeg;base64,${base64}` });
            } catch(e) { }
          }
        }

        if (endRoom.images && endRoom.images.length > 0) {
          for (const img of endRoom.images) {
            try {
              const blob = await fetchImageAsBlob(img.url);
              const base64 = await resizeImage(blob);
              refImagesList.push({ url: `data:image/jpeg;base64,${base64}` });
            } catch (e) {
              console.warn('[HomeTour-Omni] Failed to resolve end room reference image:', e);
            }
          }
        }

        // Attach up to 2 other rooms from the sidebar to give the model more context
        const otherRooms = filledRooms.filter(r => r.id !== startRoom.id && r.id !== endRoom.id).slice(0, 2);
        for (const r of otherRooms) {
          if (r.images && r.images.length > 0) {
            try {
              const blob = await fetchImageAsBlob(r.images[0].url);
              const base64 = await resizeImage(blob);
              refImagesList.push({ url: `data:image/jpeg;base64,${base64}` });
            } catch (e) {
              console.warn('[HomeTour-Omni] Failed to resolve other room reference image:', e);
            }
          }
        }

        const resp = await fetch(getApiUrl('/api/omni-i2v'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageToSend || undefined,
            motionPrompt: finalPrompt,
            duration: segmentDuration,
            aspectRatio: aspectRatio === '1:1' ? '9:16' : aspectRatio as any,
            resolution: '720p',
            model: 'gemini-omni-flash-preview',
            userId: currentUserId,
            generateAudio: includeAudio,
            creditReason: 'veo_fast',
            ref_images: refImagesList
          })
        });

        const galleryId = pendingGalleryIds[segmentsToGenerateList.indexOf(i)];
        const data = await resp.json();
        if (!resp.ok || !data.videoUrl) {
          throw new Error(data.error || `Segment ${i+1} generation failed`);
        }

        generatedClips.push({ index: i, url: data.videoUrl, roomId: startRoom.id, galleryId });
      }

      setRooms(prev => prev.map(r => {
        const clip = generatedClips.find(c => c.roomId === r.id);
        if (clip) {
          const segData = continuousSegments.find(s => s.segmentIndex === clip.index);
          const prefix = `[${clip.index * 10}:00 - ${(clip.index + 1) * 10}:00] ${r.label.toUpperCase()}: `;
          return {
            ...r,
            generatedVideo: clip.url,
            script: segData ? `${prefix}${segData.script}` : r.script,
            prompt: segData ? segData.prompt : r.prompt,
            duration: segmentDuration
          };
        }
        return r;
      }));

      generatedClips.forEach(clip => {
        updateGalleryItem(clip.galleryId, {
          loading: false,
          url: clip.url
        });
        setTimeline(prev => [
          ...prev,
          {
            id: clip.galleryId,
            url: clip.url,
            start: 0,
            end: segmentDuration,
            duration: segmentDuration,
            type: 'video'
          }
        ]);
      });

      showToast(`Successfully generated ${numSegments} continuous transition segments!`, 'success');
    } catch (e: any) {
      pendingGalleryIds.forEach(id => {
         updateGalleryItem(id, { loading: false, error: e.message });
      });
      if (!isAdmin && !isGlobalAdmin) {
        refund('veo_fast', totalCost as any);
      }
      handleApiError(e, 'Continuous walkthrough generation');
    } finally {
      setIsGeneratingContinuousVideo(false);
      setVideoProgressMsg('');
    }
  };

  // ── Generate AI image for active room ─────────────────────────
  const generateActiveRoomImage = async () => {
    const room = rooms.find(r => r.id === activeRoomId);
    if (!room) return;

    const imgCost = getImageCost();
    if (!isAdmin && !isGlobalAdmin) {
      const spendRes = await spend('veo_fast', imgCost as any);
      if (!spendRes || !spendRes.success) {
        showToast(`Need ${imgCost} Shorts to generate image`, 'error');
        return;
      }
    }

    setGeneratingRoomId(room.id);
    showToast(`Generating ${room.label} image...`, 'info');

    const galleryId = `room-img-${Date.now()}`;
    addToGallery({ id: galleryId, type: 'image', url: '', loading: true });

    try {
      let prompt = '';
      let refImages: any[] | undefined = undefined;

      const getBase64WithPrefix = async (imgObj: { url?: string; file?: File }) => {
        let blob = imgObj.file;
        if (!blob && imgObj.url) blob = await fetchImageAsBlob(imgObj.url) as any;
        if (!blob) throw new Error("No image data found");
        const b64 = await fileToBase64(blob);
        return `data:${blob.type || 'image/jpeg'};base64,${b64}`;
      };

      if (realtorImg && room.images && room.images.length > 0) {
        prompt = `The FIRST image is the REALTOR/AGENT reference photo.\nThe SECOND image is the ${room.label} of a property.\nTASK: Generate ONE single coherent ultra-realistic photo of this realtor standing inside the ${room.label}, facing the camera with a welcoming gesture.\nCRITICAL: The agent's face, identity, and likeness MUST exactly match the first reference photo.\nThe room background must match the second image exactly.\nUltra-realistic, lifelike texture, cinematic realism. No collage. One unified photo.`;
        refImages = [
          { url: await getBase64WithPrefix({ file: realtorImg.file }) },
          { url: await getBase64WithPrefix(room.images[0]) }
        ];
      } else if (realtorImg && (!room.images || room.images.length === 0)) {
        prompt = `Ultra realistic photo of a real estate agent standing inside a ${room.label}. CRITICAL: The agent's face and likeness MUST exactly match the provided reference photo. Natural lighting, warm and welcoming, lifelike textures, ultra-realistic.`;
        refImages = [{ url: await getBase64WithPrefix({ file: realtorImg.file }) }];
      } else if (!realtorImg && room.images && room.images.length > 0) {
        prompt = `Ultra realistic architectural photography of a ${room.label}. Enhance the provided room photo. Lifelike textures, bright natural lighting, ultra-realistic, 8k resolution.`;
        refImages = [{ url: await getBase64WithPrefix(room.images[0]) }];
      } else {
        prompt = `Ultra realistic architectural photography of a ${room.label}. Lifelike textures, bright natural lighting, ultra-realistic, 8k resolution.`;
        refImages = undefined;
      }

      if (realtorImg) {
        prompt += `\n\nCRITICAL FACE LIKENESS LOCK: Preserve every facial feature of the agent exactly — bone structure, eye shape, skin tone, nose, lips, and natural asymmetry. The face must remain 100% identical to the reference photo without any change in face symmetry.
SKIN REALISM: Enforce ultra-realistic human skin with visible pores, natural skin texture, micro-hair details, and subtle imperfections. Do NOT airbrush, do NOT use beauty filters, and do NOT make the skin look plastic or cartoonish. It must look like an ultra-natural, unedited photo of a real person.`;
      }

      const response = await fetch(getApiUrl('/api/generate-image'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: imgEngine === 'gpt2' ? 'gpt-image-1' : imgEngine === 'nb2-lite' ? 'nano-banana-2-lite' : imgEngine === 'nb2-open' ? 'nano-banana-2-open' : 'nano-banana-2',
          prompt,
          aspect_ratio: '9:16',
          size: '2K',
          userId: currentUserId,
          folder: 'ugc/generated',
          referenceImages: refImages,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let imageUrl = data.imageUrl || data.url;

        if (data.jobId) {
          let attempts = 0;
          const pollUrl = getApiUrl(`/api/job-status/${data.jobId}`);
          while (attempts < 30) {
            await new Promise(r => setTimeout(r, 3000));
            attempts++;
            const pollRes = await fetch(pollUrl);
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              if (pollData.status === 'done' && pollData.imageUrl) {
                imageUrl = pollData.imageUrl;
                break;
              }
            }
          }
        }

        if (imageUrl) {
          const blob = await fetchImageAsBlob(imageUrl);
          const file = new File([blob], `room-${room.id}.jpg`, { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          
          setRooms(prev => prev.map(r => 
            r.id === room.id ? { ...r, images: [{ url, file }] } : r
          ));
          updateGalleryItem(galleryId, { loading: false, url, prompt });
          showToast(`${room.label} image generated!`, 'success');
        } else {
           updateGalleryItem(galleryId, { loading: false });
           showToast('Failed to get image URL', 'error');
        }
      } else {
        const err = await response.json();
        throw new Error(err.error || 'Generation failed');
      }
    } catch (e: any) {
      updateGalleryItem(galleryId, { loading: false });
      if (!isAdmin && !isGlobalAdmin) refund('veo_fast', imgCost as any);
      handleApiError(e, 'Room image generation');
    }
    setGeneratingRoomId(null);
  };

  // ── Generate video for single room ───────────────────────────
  const generateRoomVideo = async (room: RoomSlot) => {
    if (!room.images || room.images.length === 0) {
      showToast('Upload a photo for this room first', 'error');
      return;
    }

     const unitCost = getCurrentCost(false, room.duration);
    if (!isAdmin && !isGlobalAdmin) {
      const spendRes = await spend('veo_fast', unitCost as any);
      if (!spendRes?.success) {
        showToast(`Need ${unitCost} Shorts to generate this room`, 'error');
        return;
      }
    }

    setGeneratingRoomId(room.id);
    setVideoProgressMsg(`Generating ${room.label}...`);

    const galleryId = `room-vid-${Date.now()}`;
    addToGallery({ id: galleryId, type: 'video', url: '', loading: true });

    try {
      const ai = new GoogleGenAI({ apiKey: getApiKey() });

      let imagePayload: { imageBytes: string; mimeType: string } | undefined;

      if (startFrameImg) {
        try {
          const blob = await fetchImageAsBlob(startFrameImg.url || URL.createObjectURL(startFrameImg.file));
          const base64 = await resizeImage(blob);
          imagePayload = { imageBytes: base64, mimeType: 'image/jpeg' };
        } catch(e) {}
      }

      if (!imagePayload && realtorImg && room.images && room.images.length > 0) {
        let compositePrompt = `
The FIRST image is the REALTOR/AGENT reference photo.
The SECOND image is the ${room.label} of a property.
TASK: Generate ONE single coherent ultra-realistic photo of this realtor 
standing inside the ${room.label}, facing the camera 
with a welcoming gesture. 
CRITICAL: The agent's face, identity, and likeness MUST exactly match the first reference photo.
The room background must match the second image exactly.
Ultra-realistic, lifelike textures, cinematic realism. 
No collage. One unified photo.
        `.trim();

        if (realtorImg) {
          compositePrompt += `\n\nCRITICAL FACE LIKENESS LOCK: Preserve every facial feature of the agent exactly — bone structure, eye shape, skin tone, nose, lips, and natural asymmetry. The face must remain 100% identical to the reference photo without any change in face symmetry.
SKIN REALISM: Enforce ultra-realistic human skin with visible pores, natural skin texture, micro-hair details, and subtle imperfections. Do NOT airbrush, do NOT use beauty filters, and do NOT make the skin look plastic or cartoonish. It must look like an ultra-natural, unedited photo of a real person.`;
        }

        const getBase64WithPrefix = async (imgObj: { url?: string; file?: File }) => {
          let blob = imgObj.file;
          if (!blob && imgObj.url) blob = await fetchImageAsBlob(imgObj.url) as any;
          if (!blob) throw new Error("No image data found");
          const b64 = await fileToBase64(blob);
          return `data:${blob.type || 'image/jpeg'};base64,${b64}`;
        };

        const refImages: any[] = [
          { url: await getBase64WithPrefix({ file: realtorImg.file }) },
          { url: await getBase64WithPrefix(room.images[0]) }
        ];

        const response = await fetch(getApiUrl('/api/generate-image'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'nano-banana-2',
            prompt: compositePrompt,
            aspect_ratio: '9:16',
            size: '2K',
            userId: currentUserId,
            folder: 'ugc/generated',
            referenceImages: refImages,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          let compositeUrl = data.imageUrl || data.url;

          // Poll job status if jobId is returned
          if (data.jobId) {
            let attempts = 0;
            const pollUrl = getApiUrl(`/api/job-status/${data.jobId}`);
            while (attempts < 30) {
              await new Promise(r => setTimeout(r, 3000));
              attempts++;
              const pollRes = await fetch(pollUrl);
              if (pollRes.ok) {
                const pollData = await pollRes.json();
                if (pollData.status === 'done' && pollData.imageUrl) {
                  compositeUrl = pollData.imageUrl;
                  break;
                }
              }
            }
          }

          if (compositeUrl) {
            const blob = await fetchImageAsBlob(compositeUrl);
            const base64 = await resizeImage(blob);
            imagePayload = { imageBytes: base64, mimeType: 'image/jpeg' };
          }
        }
      } else if (!imagePayload && room.images && room.images.length > 0) {
        // Just use room image directly
        const blob = await fetchImageAsBlob(room.images[0].url);
        const base64 = await resizeImage(blob);
        imagePayload = { imageBytes: base64, mimeType: 'image/jpeg' };
      }

      let finalPrompt = room.prompt || buildRoomTourPrompt({
        roomLabel: room.label,
        roomScript: room.script || `Welcome to the ${room.label}`,
        hasRealtor: !!realtorImg,
        propertyName: propertyName || 'Realistic Property',
        shotIndex: rooms.filter(r => r.images && r.images.length > 0).findIndex(r => r.id === room.id),
        totalRooms: rooms.filter(r => r.images && r.images.length > 0).length,
        tourStyle,
      });

      // Inject ultra-realistic override for video
      if (!room.prompt) {
        finalPrompt += " -- cinematic ultra-realistic video, lifelike textures, highly realistic lighting, natural human motion. Focus on realism rather than commercial premium aesthetics.";
      }

      if (videoGenMode === 'omni-flash') {
        let imageToSend = '';
        if (imagePayload) {
          imageToSend = `data:${imagePayload.mimeType};base64,${imagePayload.imageBytes}`;
        }

        // Add strict geometry and layout preservation to prevent morphing, transitions, flips or perspective warping
        finalPrompt += `\n\nSTRICT GEOMETRY PRESERVATION: Do NOT morph, warp, distort, or flip the room layout. Cut to the scene is completely fine, but absolutely NO morphing between objects. The background structure, walls, kitchen counters, cabinets, furniture, and geometric details MUST remain 100% stable and identical to the starting frame image. No weird transitions. Only very subtle, slow, steady camera motion (like a slow dolly forward or a subtle pan).`;

        // Add a short face-consistency instruction when a realtor image is present
        if (realtorImg) {
          finalPrompt += `\n\nCRITICAL FACE LIKENESS LOCK: The realtor/agent in the video MUST have the exact face likeness, bone structure, skin tone, hair, and identity matching the realtor reference photo. Maintain complete facial consistency.`;
        }

        if (includeAudio && room.script) {
          // Clean accidental UI labels like "[0:00 - 0:10] BEDROOM 2:" that AI sometimes hallucinates
          const cleanScript = room.script.replace(/^\[.*?\]\s*(.*?:\s*)?/, '').trim();
          finalPrompt += `\n\nThe person in the video is speaking to the camera. They say exactly: "${cleanScript}"`;
        }

        const headers: any = { 'Content-Type': 'application/json' };
        const customKey = getApiKey();
        if (customKey) headers['x-admin-trial-key'] = customKey;

        // Resolve realtor image as a reference image for face identity lock in Omni Flash
        let refImagesList: any[] = [];
        
        if (startFrameImg) {
          try {
            const base64 = await resizeImage(startFrameImg.file);
            refImagesList.push({ url: `data:${startFrameImg.file.type || 'image/jpeg'};base64,${base64}` });
          } catch (e) {
            console.warn('[HomeTour-Omni] Failed to attach startFrameImg:', e);
          }
        }
        
        if (realtorImg) {
          try {
            const base64 = await resizeImage(realtorImg.file);
            refImagesList.push({ url: `data:${realtorImg.file.type || 'image/jpeg'};base64,${base64}` });
          } catch (e) {
            console.warn('[HomeTour-Omni] Failed to resolve realtor reference image:', e);
          }
        }

        // Attach up to 3 other rooms from the sidebar to give the model more context
        const otherRooms = rooms.filter(r => r.images && r.images.length > 0 && r.id !== room.id).slice(0, 3);
        for (const r of otherRooms) {
          if (r.images && r.images.length > 0) {
            try {
              const blob = await fetchImageAsBlob(r.images[0].url);
              const base64 = await resizeImage(blob);
              refImagesList.push({ url: `data:image/jpeg;base64,${base64}` });
            } catch (e) {
              console.warn('[HomeTour-Omni] Failed to resolve other room reference image:', e);
            }
          }
        }

        const resp = await fetch(getApiUrl('/api/omni-i2v'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image: imageToSend || undefined,
            motionPrompt: finalPrompt.substring(0, 2000),
            duration: room.duration,
            aspectRatio: aspectRatio === '1:1' ? '9:16' : aspectRatio as any,
            resolution: '720p',
            model: 'gemini-omni-flash-preview',
            userId: currentUserId,
            generateAudio: includeAudio,
            creditReason: 'veo_fast',
            ref_images: refImagesList
          })
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Omni generation failed.');
        if (!data.videoUrl) throw new Error('Omni returned no video URL.');

        const directUrl = data.videoUrl;
        const timelineId = `room-${room.id}-${Date.now()}`;

        // Update room with generated video instantly using direct URL
        setRooms(prev => prev.map(r =>
          r.id === room.id ? { ...r, generatedVideo: directUrl } : r
        ));

        // Add to gallery + timeline instantly using direct URL
        updateGalleryItem(galleryId, { loading: false, url: directUrl, prompt: finalPrompt });

        // Add to timeline
        setTimeline(prev => [
          ...prev,
          {
            id: timelineId,
            url: directUrl,
            start: 0,
            end: room.duration,
            duration: room.duration,
            type: 'video'
          }
        ]);

        showToast(`${room.label} done ✓`, 'success');
        setGeneratingRoomId(null);
        setVideoProgressMsg('');
        return;
      }

      const veoModel = videoGenMode === 'veo3'
        ? 'veo-3.1-generate-preview'
        : videoGenMode === 'veo_lite'
        ? 'veo-3.1-lite-generate-preview'
        : 'veo-3.1-fast-generate-preview';

      const videoRequest: any = {
        model: veoModel,
        prompt: finalPrompt.substring(0, 1000),
        config: {
          numberOfVideos: 1,
          resolution: videoResolution as any,
          aspectRatio: aspectRatio === '1:1' ? '9:16' : aspectRatio as any,
          durationSeconds: room.duration,
          includeAudio: includeAudio,
        },
      };
      if (imagePayload) videoRequest.image = imagePayload;

      let op = await ai.models.generateVideos(videoRequest);
      const start = Date.now();

      while (!op.done) {
        if (Date.now() - start > 90_000) {
          throw new Error('Video generation timed out after 90 seconds.');
        }
        await new Promise(r => setTimeout(r, 5000));
        op = await ai.operations.getVideosOperation({ operation: op });
        setVideoProgressMsg(
          `${room.label} · ${Math.round((Date.now() - start) / 1000)}s / 90s`
        );
      }

      const link = op.response?.generatedVideos?.[0]?.video?.uri;
      if (link) {
        const apiKey = getApiKey();
        const directUrl = `${link}${link.includes('?') ? '&' : '?'}key=${apiKey}`;
        const timelineId = `room-${room.id}-${Date.now()}`;

        // Update room with generated video instantly using direct URL
        setRooms(prev => prev.map(r =>
          r.id === room.id ? { ...r, generatedVideo: directUrl } : r
        ));

        // Add to gallery + timeline instantly using direct URL
        updateGalleryItem(galleryId, { loading: false, url: directUrl, prompt: finalPrompt });
        setTimeline(prev => [...prev, {
          id: timelineId,
          url: directUrl,
          start: 0,
          end: room.duration,
          duration: room.duration,
          type: 'video' as const,
        }]);

        showToast(`${room.label} done ✓`, 'success');

        // Download and upload to Supabase in the background
        fetch(link, { headers: { 'x-goog-api-key': apiKey } })
          .then(res => {
            if (!res.ok) throw new Error(`Background download failed: ${res.status}`);
            return res.blob();
          })
          .then(blob => {
            return uploadToSupabase(blob, 'video', finalPrompt, currentUserId);
          })
          .then(publicUrl => {
            if (publicUrl) {
              setRooms(prev => prev.map(r =>
                r.id === room.id ? { ...r, generatedVideo: publicUrl } : r
              ));
              updateGalleryItem(galleryId, { url: publicUrl });
              setTimeline(prev => prev.map(t =>
                t.id === timelineId ? { ...t, url: publicUrl } : t
              ));
            }
          })
          .catch(err => {
            console.error('[Background Save] Failed:', err);
          });
      }

    } catch (e: any) {
      const errMsg = e.message || JSON.stringify(e);
      updateGalleryItem(galleryId, { loading: false, error: `Error: ${errMsg}` });
      if (!isAdmin && !isGlobalAdmin) refund('veo_fast', unitCost as any);
      handleApiError(e, 'Room video generation');
    }

    setGeneratingRoomId(null);
    setVideoProgressMsg('');
  };

  // ── Generate ALL rooms sequentially ──────────────────────────
  const generateFullTour = async () => {
    const filledRooms = rooms.filter(r => r.images && r.images.length > 0);
    if (filledRooms.length === 0) {
      showToast('Upload room photos first', 'error');
      return;
    }
    if (!rooms.some(r => r.script)) {
      await generateTourScripts();
    }

    setIsGeneratingVideo(true);

    for (let i = 0; i < filledRooms.length; i++) {
      setVideoProgressMsg(
        `Room ${i + 1}/${filledRooms.length} — ${filledRooms[i].label}`
      );
      await generateRoomVideo(filledRooms[i]);

      if (i < filledRooms.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    setIsGeneratingVideo(false);
    setVideoProgressMsg('');
    showToast(
      `Full tour complete! ${filledRooms.length} clips in timeline — hit Render!`,
      'success'
    );
  };

  // ── Helpers ───────────────────────────────────────────────────
  const filledRoomCount = rooms.filter(r => r.images && r.images.length > 0).length;
  const totalDuration = rooms
    .filter(r => r.images && r.images.length > 0)
    .reduce((acc, r) => acc + r.duration, 0);
  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0];

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-[#050505] relative overflow-hidden">

      {/* ── LEFT: Room Grid ──────────────────────────────────── */}
      <motion.div
        initial={false}
        animate={{ width: isSidebarOpen ? 288 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="absolute md:relative shrink-0 h-full border-r border-[#1e1e24] bg-[#080808] flex flex-col overflow-hidden z-[45]"
      >

        {/* Realtor Upload */}
        <div className="p-4 border-b border-[#1e1e24]">
          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Camera size={10} className="text-[#c8f135]" /> Realtor / Agent
          </p>
          <label className="relative block cursor-pointer group">
            <input
              type="file"
              accept="image/*"
              onChange={handleRealtorUpload}
              className="hidden"
            />
            {realtorImg ? (
              <div className="relative rounded-xl overflow-hidden h-20 border border-[#c8f135]/40">
                <img
                  src={resolveUrl(realtorImg.url)}
                  className="w-full h-full object-cover"
                  alt="Realtor"
                />
                <button
                  onClick={e => { e.preventDefault(); setRealtorImg(null); }}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-none transition-none"
                >
                  <X size={9} className="text-white" />
                </button>
                <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[7px] text-[#c8f135] font-black uppercase">
                  Agent ✓
                </div>
              </div>
            ) : (
              <div className="h-20 border-2 border-dashed border-[#1e1e24] rounded-xl flex flex-col items-center justify-center gap-1 hover:border-[#c8f135]/40 transition-colors">
                <Upload size={14} className="text-white/20 group-hover:text-[#c8f135]/60" />
                <span className="text-[8px] text-white/20 uppercase tracking-widest">Upload Agent Photo</span>
              </div>
            )}
          </label>
          {!realtorImg && (
            <p className="text-[7px] text-white/15 mt-1 text-center">
              Optional — tour works without agent
            </p>
          )}
        </div>

        {/* Start Frame Upload */}
        <div className="p-4 border-b border-[#1e1e24] pt-2">
          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Camera size={10} className="text-[#c8f135]" /> Start Frame / Outfit Lock
          </p>
          <label className="relative block cursor-pointer group">
            <input
              type="file"
              accept="image/*"
              onChange={handleStartFrameUpload}
              className="hidden"
            />
            {startFrameImg ? (
              <div className="relative rounded-xl overflow-hidden h-20 border border-[#c8f135]/40">
                <img
                  src={resolveUrl(startFrameImg.url)}
                  className="w-full h-full object-cover"
                  alt="Start Frame"
                />
                <button
                  onClick={e => { e.preventDefault(); setStartFrameImg(null); }}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-none transition-none"
                >
                  <X size={9} className="text-white" />
                </button>
                <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[7px] text-[#c8f135] font-black uppercase">
                  Start Frame ✓
                </div>
              </div>
            ) : (
              <div className="h-14 border-2 border-dashed border-[#1e1e24] rounded-xl flex flex-col items-center justify-center gap-1 hover:border-[#c8f135]/40 transition-colors">
                <Upload size={12} className="text-white/20" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-white/30">Attach Start Frame</span>
              </div>
            )}
          </label>
        </div>


        {/* Room Slots List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
              Rooms <span className="text-[#c8f135]">{filledRoomCount}</span>/{rooms.length}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setRooms(DEFAULT_ROOMS.map(r => ({
                    ...r,
                    images: [],
                    script: '',
                    prompt: '',
                    generatedVideo: null,
                  })));
                  setActiveRoomId(DEFAULT_ROOMS[0].id);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[7px] font-black uppercase text-red-400 hover:text-red-300 hover:border-red-400/30 transition-all"
                title="Reset to default rooms"
              >
                <RefreshCw size={9} /> Reset
              </button>
              <button
                onClick={addCustomRoom}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[7px] font-black uppercase text-white/40 hover:text-[#c8f135] hover:border-[#c8f135]/30 transition-all"
              >
                <Plus size={9} /> Add Room
              </button>
            </div>
          </div>

          {rooms.map(room => {
            const RoomIcon = room.icon;
            const isActive = room.id === activeRoomId;
            const hasImage = room.images && room.images.length > 0;
            const hasVideo = !!room.generatedVideo;
            const isGenerating = generatingRoomId === room.id;

            return (
              <div
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  isActive
                    ? 'border-[#c8f135]/50 bg-[#c8f135]/5'
                    : 'border-[#1e1e24] hover:border-white/20 bg-black/20'
                }`}
              >
                {/* Room thumbnail or placeholder */}
                <div className="relative shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-white/10">
                  {hasImage ? (
                    <img
                      src={resolveUrl(room.images[0].url)}
                      className="w-full h-full object-cover"
                      alt={room.label}
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <RoomIcon size={14} className="text-white/20" />
                    </div>
                  )}
                  {hasVideo && (
                    <div className="absolute inset-0 bg-[#c8f135]/20 flex items-center justify-center">
                      <Play size={10} className="text-[#c8f135]" fill="currentColor" />
                    </div>
                  )}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 size={10} className="animate-spin text-[#c8f135]" />
                    </div>
                  )}
                </div>

                {/* Room info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[9px] font-black uppercase tracking-wide truncate ${
                    isActive ? 'text-[#c8f135]' : 'text-white/60'
                  }`}>
                    {room.label}
                  </p>
                  <p className="text-[7px] text-white/25 font-mono">
                    {hasVideo ? '✓ Video ready' : hasImage ? 'Photo uploaded' : 'No photo yet'}
                    {' · '}{room.duration}s
                  </p>
                </div>

                {/* Upload trigger */}
                <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  {room.images && room.images.map((img, idx) => (
                    <div key={idx} className="relative w-7 h-7 rounded-lg overflow-hidden border border-[#c8f135]/30">
                      <img src={resolveUrl(img.url)} className="w-full h-full object-cover" alt="" />
                      <button
                        onClick={() => removeRoomImage(room.id, idx)}
                        className="absolute top-0 right-0 w-3 h-3 bg-red-500/80 rounded-bl flex items-center justify-center hover:bg-red-500 transition-colors"
                      >
                        <X size={6} className="text-white" />
                      </button>
                    </div>
                  ))}
                  
                  {(!room.images || room.images.length < 3) && (
                    <label className="shrink-0 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleRoomUpload(room.id, e)}
                      />
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-white/30 hover:border-[#c8f135]/40 hover:text-[#c8f135] transition-all">
                        <Upload size={10} />
                      </div>
                    </label>
                  )}
                </div>

                {/* Remove room */}
                <button
                  onClick={e => { e.stopPropagation(); removeRoom(room.id); }}
                  className="shrink-0 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500 transition-colors"
                >
                  <X size={8} className="text-red-400 hover:text-white" />
                </button>
              </div>
            );
          })}
        </div>

        {/* ── IMAGE GENERATION CONTROLS ── */}
        <div className="p-4 border-t border-[#1e1e24] space-y-3 bg-[#0a0a0c]">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={10} className="text-[#c8f135]" /> Room Generator
            </p>
            <select
              value={imgEngine}
              onChange={e => setImgEngine(e.target.value as any)}
              className="bg-black/40 border border-[#1e1e24] px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase text-white/80 outline-none cursor-pointer hover:border-white/20 transition-colors"
            >
              <option value="nb2" className="bg-[#0a0a0c]">NB2 (1 cr)</option>
              <option value="nb2-open" className="bg-[#0a0a0c]">NB2 GA (1 cr)</option>
              <option value="nb2-lite" className="bg-[#0a0a0c]">NB2 Lite (0.5 cr)</option>
              <option value="gpt2" className="bg-[#0a0a0c]">GT2 (1-3 cr)</option>
            </select>
          </div>
          <button 
            onClick={generateActiveRoomImage}
            disabled={!!generatingRoomId}
            className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              !!generatingRoomId 
                ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                : 'bg-[#c8f135]/10 border border-[#c8f135]/30 text-[#c8f135] hover:bg-[#c8f135]/20 shadow-[0_0_15px_rgba(200,241,53,0.15)]'
            }`}
          >
            {generatingRoomId === activeRoomId ? (
              <><Loader2 size={10} className="animate-spin" /> Generating...</>
            ) : (
              <><Sparkles size={10} /> Generate {activeRoom?.label || 'Room'}</>
            )}
          </button>
        </div>

        {/* Summary bar */}
        <div className="p-3 border-t border-[#1e1e24] bg-black/40">
          <div className="flex items-center justify-between text-[7px] font-mono text-white/30 uppercase tracking-widest">
            <span>{filledRoomCount} rooms</span>
            <span>{totalDuration}s total</span>
            <span>{Math.ceil(totalDuration / 8)} shots</span>
          </div>
        </div>
      </motion.div>

      {/* Drawer toggle button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute z-30 w-10 h-16 md:w-6 md:h-12 flex items-center justify-center rounded-r-xl transition-all shadow-lg
          ${isSidebarOpen
            ? 'bg-[#111113] border border-[#c8f135]/20 text-[#c8f135]/60 hover:text-[#c8f135] hover:border-[#c8f135]/60 hover:bg-[#c8f135]/5 shadow-[0_0_8px_rgba(200,241,53,0.1)] hover:shadow-[0_0_12px_rgba(200,241,53,0.35)]'
            : 'bg-[#c8f135] border border-[#c8f135] text-black hover:bg-[#d4f545] animate-pulse shadow-[0_0_12px_rgba(200,241,53,0.7)]'
          }`}
        style={{
          left: isSidebarOpen ? '288px' : '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          transition: 'left 0.25s ease-in-out'
        }}
        title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
      >
        {isSidebarOpen ? (
          <ChevronLeft className="w-5 h-5 md:w-3 md:h-3" />
        ) : (
          <ChevronRight className="w-5 h-5 md:w-3 md:h-3" />
        )}
      </button>

      {/* ── CENTER COLUMN ────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        
        {/* Gallery Content */}
        <GalleryGrid />

        {/* ── ACTIVE ROOM CONTROLS DOCKED PANEL ── */}
        {activeRoom && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 px-4 pb-4 w-full max-w-4xl">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-[#0e0e10]/95 backdrop-blur-2xl border border-[#1e1e24] rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.6)] overflow-visible"
            >
              {/* Header Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#1e1e24] px-4 py-2.5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#c8f135] animate-pulse" />
                    <p className="text-[10px] font-black text-white uppercase tracking-[0.15em]">
                      {tourMode === 'continuous' ? 'Continuous Walkthrough' : `Room Editor: ${activeRoom.label}`}
                    </p>
                  </div>
                  
                  {/* Mode Selector Switcher */}
                  <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                    <button
                      onClick={() => setTourMode('individual')}
                      className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider transition-all ${
                        tourMode === 'individual'
                          ? 'bg-[#c8f135]/20 text-[#c8f135] border border-[#c8f135]/30'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      Individual
                    </button>
                    <button
                      onClick={() => setTourMode('continuous')}
                      className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider transition-all ${
                        tourMode === 'continuous'
                          ? 'bg-[#c8f135]/20 text-[#c8f135] border border-[#c8f135]/30'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      Continuous
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Tour Style Dropdown */}
                  <div className="relative group py-1">
                    <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black uppercase text-white/60 hover:text-[#c8f135] hover:border-[#c8f135]/40 transition-all font-mono">
                      <Sparkles size={9} className="text-[#c8f135]" />
                      <span>Style: {tourStyle}</span>
                      <ChevronDown size={8} />
                    </button>
                    <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-[#0e0e10] border border-[#1e1e24] rounded-xl py-1 min-w-[100px] shadow-xl z-50">
                      {(['friendly', 'luxury', 'energetic', 'minimal'] as const).map(style => (
                        <button
                          key={style}
                          onClick={() => setTourStyle(style)}
                          className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase text-white/50 hover:text-[#c8f135] hover:bg-white/5 transition-all"
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Path Style Dropdown */}
                  <div className="relative group py-1">
                    <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black uppercase text-white/60 hover:text-[#c8f135] hover:border-[#c8f135]/40 transition-all font-mono">
                      <Sparkles size={9} className="text-[#c8f135]" />
                      <span>Path: {pathStyle.split(' ')[0]}</span>
                      <ChevronDown size={8} />
                    </button>
                    <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-[#0e0e10] border border-[#1e1e24] rounded-xl py-1 min-w-[120px] shadow-xl z-50">
                      {(['Walking Path', 'Camera Path', 'Reveal Path', 'Story Path'] as const).map(style => (
                        <button
                          key={style}
                          onClick={() => setPathStyle(style)}
                          className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase text-white/50 hover:text-[#c8f135] hover:bg-white/5 transition-all"
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language Dropdown */}
                  <div className="relative group py-1">
                    <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black uppercase text-white/60 hover:text-[#c8f135] hover:border-[#c8f135]/40 transition-all font-mono">
                      <Sparkles size={9} className="text-[#c8f135]" />
                      <span>Lang: {language}</span>
                      <ChevronDown size={8} />
                    </button>
                    <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-[#0e0e10] border border-[#1e1e24] rounded-xl py-1 min-w-[100px] shadow-xl z-50">
                      {['English', 'Hindi', 'Telugu', 'Tamil', 'Malayalam', 'Kannada'].map(lang => (
                        <button
                          key={lang}
                          onClick={() => setLanguage(lang)}
                          className="w-full text-left px-3 py-1.5 text-[8px] font-black uppercase text-white/50 hover:text-[#c8f135] hover:bg-white/5 transition-all"
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Collapse / Expand Toggle */}
                  <button
                    onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                    title={isChatCollapsed ? 'Expand panel' : 'Collapse panel'}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-[#c8f135] hover:border-[#c8f135]/40 transition-all animate-none"
                  >
                    <motion.div animate={{ rotate: isChatCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={11} />
                    </motion.div>
                  </button>
                </div>
              </div>

              {/* Panel Content (Collapsible) */}
              <motion.div
                animate={{ height: isChatCollapsed ? 0 : 'auto', opacity: isChatCollapsed ? 0 : 1 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="max-h-[50vh] md:max-h-none overflow-y-auto custom-scrollbar"
                style={{ overflowX: 'hidden' }}
              >
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                  
                  {tourMode === 'individual' ? (
                    <>
                      {/* Column 1: Voiceover Script */}
                      <div className="flex flex-col space-y-2 bg-white/5 border border-white/10 p-3 rounded-xl relative overflow-hidden font-sans">
                        {(isGeneratingScripts || isGeneratingSingleScript) && (
                          <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-2">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <div
                                  key={i}
                                  className="w-1.5 h-1.5 bg-[#c8f135] rounded-full animate-bounce"
                                  style={{ animationDelay: `${i * 0.15}s` }}
                                />
                              ))}
                            </div>
                            <p className="text-[9px] font-mono text-[#c8f135] uppercase tracking-widest animate-pulse">
                              Writing script...
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                            Voiceover Monologue
                          </p>
                          <button
                            onClick={() => generateSingleRoomScript(activeRoom.id)}
                            disabled={isGeneratingScripts || isGeneratingSingleScript}
                            className="text-[8px] font-black text-[#c8f135] uppercase tracking-widest hover:underline flex items-center gap-1 font-mono"
                          >
                            <Sparkles size={8} /> Auto Write
                          </button>
                        </div>
                        <textarea
                          value={activeRoom.script}
                          onChange={e => setRooms(prev => prev.map(r =>
                            r.id === activeRoom.id ? { ...r, script: e.target.value } : r
                          ))}
                          placeholder={`Monologue script written in ${language}...`}
                          rows={5}
                          className="w-full bg-black/40 border border-[#1e1e24] rounded-xl px-3 py-2 text-[10px] text-white/80 focus:outline-none focus:border-[#c8f135]/40 resize-none leading-relaxed flex-1 font-sans"
                        />
                      </div>

                      {/* Column 2: Visual scene/Veo Prompt */}
                      <div className="flex flex-col space-y-2 bg-white/5 border border-white/10 p-3 rounded-xl relative overflow-hidden font-mono">
                        {(isGeneratingScripts || isGeneratingSingleScript) && (
                          <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-2">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <div
                                  key={i}
                                  className="w-1.5 h-1.5 bg-[#c8f135] rounded-full animate-bounce"
                                  style={{ animationDelay: `${i * 0.15}s` }}
                                />
                              ))}
                            </div>
                            <p className="text-[9px] font-mono text-[#c8f135] uppercase tracking-widest animate-pulse">
                              Writing prompt...
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                            Visual Motion Prompt
                          </p>
                        </div>
                        <textarea
                          value={activeRoom.prompt}
                          onChange={e => setRooms(prev => prev.map(r =>
                            r.id === activeRoom.id ? { ...r, prompt: e.target.value } : r
                          ))}
                          placeholder="Veo video prompt — auto-generated from property context and style..."
                          rows={5}
                          className="w-full bg-black/40 border border-[#1e1e24] rounded-xl px-3 py-2 text-[10px] text-white/50 font-mono focus:outline-none focus:border-[#c8f135]/40 resize-none leading-relaxed flex-1"
                        />
                      </div>

                      {/* Column 3: Generator and Specs */}
                      <div className="flex flex-col justify-between p-3 bg-white/5 border border-white/10 rounded-xl space-y-3 font-mono">
                        
                        {/* Specs info */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[8px] font-mono text-white/55">
                            <span className="uppercase text-white/30">Engine</span>
                            <span className="text-[#c8f135] font-black">OMNI FLASH ⚡</span>
                          </div>
                          
                          {/* Shot Duration selector */}
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-mono uppercase text-white/30">Duration</span>
                            <div className="flex items-center gap-1">
                              {([4, 6, 8, 10] as const).map(d => (
                                <button
                                  key={d}
                                  onClick={() => setRooms(prev => prev.map(r =>
                                    r.id === activeRoom.id ? { ...r, duration: d } : r
                                  ))}
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-black border transition-all ${
                                    activeRoom.duration === d
                                      ? 'bg-[#c8f135] text-black border-[#c8f135]'
                                      : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                                  }`}
                                >
                                  {d}s
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[8px] font-mono text-white/55 border-t border-white/5 pt-1.5">
                            <span className="uppercase text-white/30">Specs</span>
                            <span>{filledRoomCount} rooms · {totalDuration}s total</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="space-y-1.5">
                          {(activeRoom.images && activeRoom.images.length > 0) ? (
                            <button
                              onClick={() => generateRoomVideo(activeRoom)}
                              disabled={!!generatingRoomId || isGeneratingVideo}
                              className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                                generatingRoomId === activeRoom.id
                                  ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                                  : 'bg-[#c8f135]/10 border border-[#c8f135]/30 text-[#c8f135] hover:bg-[#c8f135]/20'
                              }`}
                            >
                              {generatingRoomId === activeRoom.id ? (
                                <><Loader2 size={10} className="animate-spin" />{videoProgressMsg}</>
                              ) : (
                                <><Film size={10} /> Generate {activeRoom.label} Video (⚡ {getCurrentCost(false, activeRoom.duration)})</>
                              )}
                            </button>
                          ) : (
                            <div className="text-[9px] text-white/30 text-center py-2 border border-dashed border-white/10 rounded-xl">
                              Upload photo to generate video
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={generateTourScripts}
                              disabled={isGeneratingScripts || filledRoomCount === 0}
                              className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                                isGeneratingScripts || filledRoomCount === 0
                                  ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                              }`}
                            >
                              {isGeneratingScripts ? (
                                <><Loader2 size={8} className="animate-spin" /> Writing...</>
                              ) : (
                                <><Sparkles size={8} /> Auto All Scripts</>
                              )}
                            </button>

                            <button
                              onClick={generateFullTour}
                              disabled={isGeneratingVideo || filledRoomCount === 0}
                              className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                                isGeneratingVideo || filledRoomCount === 0
                                  ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                                  : 'bg-[#c8f135] text-black hover:bg-[#d4ff3a] border border-[#c8f135]'
                              }`}
                            >
                              {isGeneratingVideo ? (
                                <><Loader2 size={8} className="animate-spin" /> Running...</>
                              ) : (
                                <><MapPin size={8} /> Gen All Video</>
                              )}
                            </button>
                          </div>
                        </div>

                      </div>
                    </>
                  ) : (
                    <>
                      {/* Continuous Mode Column 1: Voiceover Monologue */}
                      <div className="flex flex-col space-y-2 bg-white/5 border border-white/10 p-3 rounded-xl relative overflow-hidden font-sans">
                        {isGeneratingContinuousScript && (
                          <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-2">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <div
                                  key={i}
                                  className="w-1.5 h-1.5 bg-[#c8f135] rounded-full animate-bounce"
                                  style={{ animationDelay: `${i * 0.15}s` }}
                                />
                              ))}
                            </div>
                            <p className="text-[9px] font-mono text-[#c8f135] uppercase tracking-widest animate-pulse">
                              Writing script...
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                            Full Tour Monologue
                          </p>
                          <button
                            onClick={generateContinuousTourScript}
                            disabled={isGeneratingContinuousScript || filledRoomCount < 2}
                            className="text-[8px] font-black text-[#c8f135] uppercase tracking-widest hover:underline flex items-center gap-1 font-mono"
                          >
                            <Sparkles size={8} /> Auto Write
                          </button>
                        </div>
                        <textarea
                          value={continuousScript}
                          onChange={e => setContinuousScript(e.target.value)}
                          placeholder={`Full walkthrough tour voiceover script for ${Math.max(0, filledRoomCount - 1) * 10} seconds...`}
                          rows={5}
                          className="w-full bg-black/40 border border-[#1e1e24] rounded-xl px-3 py-2 text-[10px] text-white/80 focus:outline-none focus:border-[#c8f135]/40 resize-none leading-relaxed flex-1 font-sans"
                        />
                      </div>

                      {/* Continuous Mode Column 2: Transition Prompts Preview */}
                      <div className="flex flex-col space-y-2 bg-white/5 border border-white/10 p-3 rounded-xl relative overflow-hidden font-mono">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                            Walkthrough Prompts
                          </p>
                        </div>
                        {continuousSegments.length > 0 ? (
                          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar flex-1">
                            {continuousSegments.map(seg => (
                              <div key={seg.segmentIndex} className="p-1.5 rounded bg-black/30 border border-white/5 space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <input 
                                      type="checkbox"
                                      checked={selectedContinuousSegments.has(seg.segmentIndex)}
                                      onChange={() => {
                                        const newSet = new Set(selectedContinuousSegments);
                                        if (newSet.has(seg.segmentIndex)) newSet.delete(seg.segmentIndex);
                                        else newSet.add(seg.segmentIndex);
                                        setSelectedContinuousSegments(newSet);
                                      }}
                                      className="w-3 h-3 rounded bg-black/40 border border-white/20 accent-[#c8f135]"
                                    />
                                    <p className="text-[7px] font-black uppercase text-[#c8f135]/80">Segment {seg.segmentIndex + 1} (10s)</p>
                                  </div>
                                  <button
                                    onClick={() => generateContinuousVideo(seg.segmentIndex)}
                                    disabled={isGeneratingContinuousVideo}
                                    className="px-1.5 py-0.5 rounded bg-[#c8f135]/10 hover:bg-[#c8f135]/20 text-[#c8f135] text-[7px] font-black uppercase tracking-wider transition-all"
                                  >
                                    Gen
                                  </button>
                                </div>
                                <p className="text-[8px] font-mono text-white/55 leading-relaxed">{seg.prompt}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center flex-1 text-center p-4 border border-dashed border-white/10 rounded-xl">
                            <p className="text-[9px] text-white/20 uppercase tracking-wider font-mono">
                              Press "Auto Write" to generate transitions
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Continuous Mode Column 3: Walkthrough Actions */}
                      <div className="flex flex-col justify-between p-3 bg-white/5 border border-white/10 rounded-xl space-y-3 font-mono">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[8px] font-mono text-white/55">
                            <span className="uppercase text-white/30">Engine</span>
                            <span className="text-[#c8f135] font-black">OMNI FLASH ⚡</span>
                          </div>
                          
                          {/* Duration Display */}
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-mono uppercase text-white/30">Total Duration</span>
                            <span className="text-[8px] font-black text-[#c8f135]">
                              {Math.max(0, filledRoomCount - 1) * 10}s
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[8px] font-mono text-white/55 border-t border-white/5 pt-1.5">
                            <span className="uppercase text-white/30">Specs</span>
                            <span>{filledRoomCount} rooms · {Math.max(0, filledRoomCount - 1) * 10}s walkthrough</span>
                          </div>
                        </div>

                        {/* Action trigger */}
                        <div className="space-y-1.5">
                          {filledRoomCount >= 2 ? (
                            <button
                              onClick={() => generateContinuousVideo()}
                              disabled={isGeneratingContinuousVideo || continuousSegments.length === 0}
                              className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                                isGeneratingContinuousVideo || continuousSegments.length === 0
                                  ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                                  : 'bg-[#c8f135] text-black hover:bg-[#d4ff3a] border border-[#c8f135] shadow-[0_0_15px_rgba(200,241,53,0.2)]'
                              }`}
                            >
                              {isGeneratingContinuousVideo ? (
                                <><Loader2 size={10} className="animate-spin" />{videoProgressMsg}</>
                              ) : (
                                <><Film size={10} /> Gen Walkthrough (⚡ {getCurrentCost(false, 10) * Math.max(0, filledRoomCount - 1)})</>
                              )}
                            </button>
                          ) : (
                            <div className="text-[9px] text-white/30 text-center py-2.5 border border-dashed border-white/10 rounded-xl">
                              Upload at least 2 photos
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </div>

    </div>
  );
}
