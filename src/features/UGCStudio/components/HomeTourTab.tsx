import React, { useState } from 'react';
import { 
  Upload, X, Plus, MapPin, Home, Camera, 
  Film, Loader2, ChevronDown, Play,
  Building, Trees, Sofa, UtensilsCrossed,
  Bath, BedDouble, Car, Maximize,
  ChevronLeft, ChevronRight, FileText, Sparkles
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
  image: { url: string; file: File } | null;
  script: string;       // AI generated per room
  prompt: string;       // Veo prompt per room
  generatedVideo: string | null;
  duration: number;     // seconds for this room shot
}

// ── Default room slots ────────────────────────────────────────
const DEFAULT_ROOMS: Omit<RoomSlot, 'image' | 'script' | 'prompt' | 'generatedVideo'>[] = [
  { id: 'front',    label: 'Front Elevation', icon: Building, duration: 8 },
  { id: 'living',   label: 'Living Room',     icon: Sofa,     duration: 8 },
  { id: 'kitchen',  label: 'Kitchen',         icon: UtensilsCrossed, duration: 8 },
  { id: 'bedroom1', label: 'Bedroom 1',       icon: BedDouble, duration: 8 },
  { id: 'bedroom2', label: 'Bedroom 2',       icon: BedDouble, duration: 8 },
  { id: 'bathroom', label: 'Bathroom',        icon: Bath,      duration: 6 },
  { id: 'lawn',     label: 'Lawn / Garden',   icon: Trees,     duration: 8 },
  { id: 'parking',  label: 'Parking / Garage',icon: Car,       duration: 6 },
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
  const [propertyName, setPropertyName] = useState('');
  const [propertyPrice, setPropertyPrice] = useState('');
  const [propertyLocation, setPropertyLocation] = useState('');
  const [tourStyle, setTourStyle] = useState<'friendly' | 'luxury' | 'energetic' | 'minimal'>('friendly');
  const [chatTab, setChatTab] = useState<'script' | 'video'>('script');

  const [rooms, setRooms] = useState<RoomSlot[]>(
    DEFAULT_ROOMS.map(r => ({
      ...r,
      image: null,
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

  // ── Upload room image ─────────────────────────────────────────
  const handleRoomUpload = (roomId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setRooms(prev => prev.map(r =>
      r.id === roomId ? { ...r, image: { url, file } } : r
    ));
  };

  // ── Remove room image ─────────────────────────────────────────
  const removeRoomImage = (roomId: string) => {
    setRooms(prev => prev.map(r =>
      r.id === roomId ? { ...r, image: null } : r
    ));
  };

  // ── Add custom room slot ──────────────────────────────────────
  const addCustomRoom = () => {
    const newRoom: RoomSlot = {
      id: `custom-${Date.now()}`,
      label: 'Custom Room',
      icon: Home,
      image: null,
      script: '',
      prompt: '',
      generatedVideo: null,
      duration: 8,
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
      const filledRooms = rooms.filter(r => r.image !== null);
      if (filledRooms.length === 0) {
        showToast('Upload at least one room photo first', 'error');
        return;
      }

      const propertyContext = [
        propertyName && `Property: ${propertyName}`,
        propertyPrice && `Price: ${propertyPrice}`,
        propertyLocation && `Location: ${propertyLocation}`,
      ].filter(Boolean).join(', ');

      const updatedRooms = rooms.map((room, idx) => {
        if (!room.image) return room;

        const script = buildRoomScript({
          roomLabel: room.label,
          propertyDetails: propertyContext,
          tourTone: tourStyle,
          isFirst: idx === 0 && room.id === filledRooms[0].id,
          isLast: room.id === filledRooms[filledRooms.length - 1].id,
        });

        const prompt = buildRoomTourPrompt({
          roomLabel: room.label,
          roomScript: script,
          hasRealtor: !!realtorImg,
          propertyName: propertyName || 'Premium Property',
          shotIndex: filledRooms.findIndex(r => r.id === room.id),
          totalRooms: filledRooms.length,
          tourStyle,
        });

        return { ...room, script, prompt };
      });

      setRooms(updatedRooms);
      showToast(`Scripts generated for ${filledRooms.length} rooms!`, 'success');
    } catch (e) {
      handleApiError(e, 'Tour script generation');
    }
    setIsGeneratingScripts(false);
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
      let refImages: string[] | undefined = undefined;

      const getBase64WithPrefix = async (imgObj: { url?: string; file?: File }) => {
        let blob = imgObj.file;
        if (!blob && imgObj.url) blob = await fetchImageAsBlob(imgObj.url) as any;
        if (!blob) throw new Error("No image data found");
        const b64 = await fileToBase64(blob);
        return `data:${blob.type || 'image/jpeg'};base64,${b64}`;
      };

      if (realtorImg && room.image) {
        prompt = `The FIRST image is the REALTOR/AGENT reference photo.\nThe SECOND image is the ${room.label} of a property.\nTASK: Generate ONE single coherent ultra-realistic photo of this realtor standing inside the ${room.label}, facing the camera with a welcoming gesture.\nCRITICAL: The agent's face, identity, and likeness MUST exactly match the first reference photo.\nThe room background must match the second image exactly.\nUltra-realistic, lifelike texture, cinematic realism. No collage. One unified photo.`;
        refImages = [
          await getBase64WithPrefix({ file: realtorImg.file }),
          await getBase64WithPrefix(room.image)
        ];
      } else if (realtorImg && !room.image) {
        prompt = `Ultra realistic photo of a real estate agent standing inside a ${room.label}. CRITICAL: The agent's face and likeness MUST exactly match the provided reference photo. Natural lighting, warm and welcoming, lifelike textures, ultra-realistic.`;
        refImages = [await getBase64WithPrefix({ file: realtorImg.file })];
      } else if (!realtorImg && room.image) {
        prompt = `Ultra realistic architectural photography of a ${room.label}. Enhance the provided room photo. Lifelike textures, bright natural lighting, ultra-realistic, 8k resolution.`;
        refImages = [await getBase64WithPrefix(room.image)];
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
          model: imgEngine === 'gpt2' ? 'gpt-image-1' : 'nano-banana-2',
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
            r.id === room.id ? { ...r, image: { url, file } } : r
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
    if (!room.image) {
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

      // Build image payload — combine realtor + room image
      let imagePayload: { imageBytes: string; mimeType: string } | undefined;

      if (realtorImg && room.image) {
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

        const refImages: string[] = [
          await getBase64WithPrefix({ file: realtorImg.file }),
          await getBase64WithPrefix(room.image)
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
      } else if (room.image) {
        // Just use room image directly
        const blob = await fetchImageAsBlob(room.image.url);
        const base64 = await resizeImage(blob);
        imagePayload = { imageBytes: base64, mimeType: 'image/jpeg' };
      }

      let finalPrompt = room.prompt || buildRoomTourPrompt({
        roomLabel: room.label,
        roomScript: room.script || `Welcome to the ${room.label}`,
        hasRealtor: !!realtorImg,
        propertyName: propertyName || 'Realistic Property',
        shotIndex: rooms.filter(r => r.image).findIndex(r => r.id === room.id),
        totalRooms: rooms.filter(r => r.image).length,
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

        const headers: any = { 'Content-Type': 'application/json' };
        const customKey = getApiKey();
        if (customKey) headers['x-admin-trial-key'] = customKey;

        const resp = await fetch(getApiUrl('/api/omni-i2v'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image: imageToSend || undefined,
            motionPrompt: finalPrompt.substring(0, 1000),
            duration: room.duration,
            aspectRatio: aspectRatio === '1:1' ? '9:16' : aspectRatio as any,
            resolution: '720p',
            model: 'gemini-omni-flash-preview',
            userId: userId,
            generateAudio: includeAudio,
            creditReason: 'ugc_video_generation'
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
          showToast(`${room.label} timed out`, 'error');
          break;
        }
        await new Promise(r => setTimeout(r, 5000));
        op = await ai.operations.getVideosOperation({ operation: op });
        setVideoProgressMsg(
          `${room.label} · ${Math.round((Date.now() - start) / 1000)}s`
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
      updateGalleryItem(galleryId, { loading: false });
      if (!isAdmin && !isGlobalAdmin) refund('veo_fast', getCurrentCost(false) as any);
      handleApiError(e, 'Room video generation');
    }

    setGeneratingRoomId(null);
    setVideoProgressMsg('');
  };

  // ── Generate ALL rooms sequentially ──────────────────────────
  const generateFullTour = async () => {
    const filledRooms = rooms.filter(r => r.image !== null);
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
  const filledRoomCount = rooms.filter(r => r.image).length;
  const totalDuration = rooms
    .filter(r => r.image)
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



        {/* Room Slots List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
              Rooms <span className="text-[#c8f135]">{filledRoomCount}</span>/{rooms.length}
            </p>
            <button
              onClick={addCustomRoom}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[7px] font-black uppercase text-white/40 hover:text-[#c8f135] hover:border-[#c8f135]/30 transition-all"
            >
              <Plus size={9} /> Add Room
            </button>
          </div>

          {rooms.map(room => {
            const RoomIcon = room.icon;
            const isActive = room.id === activeRoomId;
            const hasImage = !!room.image;
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
                      src={resolveUrl(room.image!.url)}
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
                <label
                  className="shrink-0 cursor-pointer"
                  onClick={e => e.stopPropagation()}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleRoomUpload(room.id, e)}
                  />
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    hasImage
                      ? 'bg-[#c8f135]/10 border border-[#c8f135]/30 text-[#c8f135]'
                      : 'bg-white/5 border border-white/10 text-white/30 hover:border-[#c8f135]/40 hover:text-[#c8f135]'
                  }`}>
                    {hasImage ? <Camera size={10} /> : <Upload size={10} />}
                  </div>
                </label>

                {/* Remove custom room */}
                {room.id.startsWith('custom-') && (
                  <button
                    onClick={e => { e.stopPropagation(); removeRoom(room.id); }}
                    className="shrink-0 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500 transition-colors"
                  >
                    <X size={8} className="text-red-400 hover:text-white" />
                  </button>
                )}
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
            <div className="flex bg-black/40 p-0.5 rounded-md border border-[#1e1e24]">
              <button 
                onClick={() => setImgEngine('nb2')} 
                className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-wider transition-all ${imgEngine === 'nb2' ? 'bg-[#c8f135]/20 text-[#c8f135] border border-[#c8f135]/30' : 'text-white/30 hover:text-white/60'}`}
              >
                NB2
              </button>
              <button 
                onClick={() => setImgEngine('gpt2')} 
                className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-wider transition-all ${imgEngine === 'gpt2' ? 'bg-[#c8f135]/20 text-[#c8f135] border border-[#c8f135]/30' : 'text-white/30 hover:text-white/60'}`}
              >
                GT2
              </button>
            </div>
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
              <><Sparkles size={10} /> Generate {activeRoom.label}</>
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
        className={`absolute z-30 w-6 h-12 flex items-center justify-center rounded-r-xl transition-all shadow-lg
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
        {isSidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      {/* ── CENTER COLUMN ────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        
        {/* Gallery Content */}
        <GalleryGrid />

        {/* ── FLOATING CHAT BOX OVERLAY ── */}
        {activeRoom && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 px-4 pb-4 w-full max-w-4xl">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-[#0e0e10]/95 backdrop-blur-2xl border border-[#1e1e24] rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.6)] overflow-visible"
            >
              {/* Tab switcher: Script | Video */}
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-0 border-b border-[#1e1e24] p-2 md:p-0 relative">
                <div className="flex items-center gap-0 w-full md:w-auto">
                  {(['script', 'video'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setChatTab(tab); setIsChatCollapsed(false); }}
                      className={`flex-grow md:flex-grow-0 flex items-center justify-center gap-1.5 px-4 md:px-5 py-3 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 ${
                        chatTab === tab
                          ? 'border-[#c8f135] text-[#c8f135] bg-[#c8f135]/5'
                          : 'border-transparent text-white/30 hover:text-white/60'
                      }`}
                    >
                      {tab === 'script' ? <FileText size={10} /> : <Film size={10} />}
                      {tab === 'script' ? 'Room Script' : 'Video Generator'}
                    </button>
                  ))}
                </div>

                {/* Tour Style Dropdown */}
                {chatTab === 'script' && (
                  <div className="ml-0 md:ml-auto mr-2 relative group self-start md:self-auto py-1">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase text-white/60 hover:text-[#c8f135] hover:border-[#c8f135]/40 transition-all">
                      <Sparkles size={10} className="text-[#c8f135]" />
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
                )}

                {/* Collapse / Expand Toggle */}
                <button
                  onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                  title={isChatCollapsed ? 'Expand chat' : 'Collapse chat'}
                  className={`absolute right-2 top-2.5 md:relative md:right-0 md:top-0 shrink-0 w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-[#c8f135] hover:border-[#c8f135]/40 transition-all ${chatTab !== 'script' ? 'md:ml-auto md:mr-2' : 'md:mr-2'}`}
                >
                  <motion.div animate={{ rotate: isChatCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={11} />
                  </motion.div>
                </button>
              </div>

              {/* Collapsible body */}
              <motion.div
                animate={{ height: isChatCollapsed ? 0 : 'auto', opacity: isChatCollapsed ? 0 : 1 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="max-h-[50vh] md:max-h-none overflow-y-auto custom-scrollbar"
                style={{ overflowX: 'hidden' }}
              >
                {chatTab === 'script' ? (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Script */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                          Room Script ({activeRoom.label})
                        </p>
                        <button
                          onClick={() => {
                            const script = buildRoomScript({
                              roomLabel: activeRoom.label,
                              propertyDetails: '',
                              tourTone: tourStyle,
                              isFirst: rooms.filter(r => r.image)[0]?.id === activeRoom.id,
                              isLast: rooms.filter(r => r.image).slice(-1)[0]?.id === activeRoom.id,
                            });
                            setRooms(prev => prev.map(r =>
                              r.id === activeRoom.id ? { ...r, script } : r
                            ));
                          }}
                          className="text-[8px] font-black text-[#c8f135] uppercase tracking-widest hover:underline animate-none transition-none"
                        >
                          Auto-Generate
                        </button>
                      </div>
                      <textarea
                        value={activeRoom.script}
                        onChange={e => setRooms(prev => prev.map(r =>
                          r.id === activeRoom.id ? { ...r, script: e.target.value } : r
                        ))}
                        placeholder={`e.g. "Welcome to this stunning property. Let me take you on a tour — starting right here..."`}
                        rows={4}
                        className="w-full bg-black/40 border border-[#1e1e24] rounded-xl px-3 py-2 text-[11px] text-white/80 focus:outline-none focus:border-[#c8f135]/40 resize-none leading-relaxed"
                      />
                    </div>

                    {/* Right: Veo Prompt */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                        Veo Prompt (auto-built from script)
                      </p>
                      <textarea
                        value={activeRoom.prompt}
                        onChange={e => setRooms(prev => prev.map(r =>
                          r.id === activeRoom.id ? { ...r, prompt: e.target.value } : r
                        ))}
                        placeholder="Veo video prompt — auto-generated when you run Generate Tour Scripts"
                        rows={4}
                        className="w-full bg-black/40 border border-[#1e1e24] rounded-xl px-3 py-2 text-[10px] text-white/50 font-mono focus:outline-none focus:border-[#c8f135]/40 resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                    {/* Column 1: Active Room Shot generation */}
                    <div className="flex flex-col justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                          Clip ({activeRoom.label})
                        </p>
                        {/* Shot Duration selector */}
                        <div className="flex items-center gap-1">
                          <span className="text-[7px] text-white/30 uppercase tracking-widest">Dur</span>
                          {([4, 6, 8] as const).map(d => (
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

                      {/* Engine Selection */}
                      <div className="flex items-center gap-1 mb-2 bg-black/40 p-0.5 rounded-lg border border-[#1e1e24]">
                        {(['veo_lite', 'veo_fast', 'veo3'] as const).map(engine => {
                           const label = engine === 'veo_lite' ? 'Veo Lite' : engine === 'veo_fast' ? 'Veo Fast' : 'Veo Std';
                           return (
                            <button
                              key={engine}
                              onClick={() => setVideoGenMode(engine)}
                              className={`flex-1 py-1 rounded text-[7px] font-black uppercase tracking-wider transition-all ${
                                videoGenMode === engine
                                  ? 'bg-[#c8f135]/20 text-[#c8f135] border border-[#c8f135]/30'
                                  : 'text-white/30 hover:text-white/60'
                              }`}
                            >
                              {label}
                            </button>
                           )
                        })}
                      </div>

                      {activeRoom.image ? (
                        <button
                          onClick={() => generateRoomVideo(activeRoom)}
                          disabled={!!generatingRoomId || isGeneratingVideo}
                          className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                            generatingRoomId === activeRoom.id
                              ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                              : 'bg-[#c8f135]/10 border border-[#c8f135]/30 text-[#c8f135] hover:bg-[#c8f135]/20'
                          }`}
                        >
                          {generatingRoomId === activeRoom.id ? (
                            <><Loader2 size={10} className="animate-spin" />{videoProgressMsg}</>
                          ) : (
                            <><Film size={10} /> Generate {activeRoom.label} Shot (⚡ {getCurrentCost(false, activeRoom.duration)})</>
                          )}
                        </button>
                      ) : (
                        <div className="text-[9px] text-white/30 text-center py-4">
                          Upload room photo to generate shot
                        </div>
                      )}
                    </div>

                    {/* Column 2: Stats Display */}
                    <div className="p-3 bg-black/40 border border-[#1e1e24] rounded-xl flex flex-col justify-between">
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-widest border-b border-white/5 pb-1.5 mb-1">
                        Tour Status & Specs
                      </p>
                      <div className="grid grid-cols-2 gap-y-1 text-[9px] font-mono text-white/60">
                        <span className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${filledRoomCount > 0 ? 'bg-[#c8f135]' : 'bg-white/20'}`} />
                          {filledRoomCount} rooms ready
                        </span>
                        <span className="text-right">{totalDuration}s total tour</span>
                        <span>{Math.ceil(totalDuration / 8)} Veo calls</span>
                        {realtorImg ? <span className="text-right text-[#c8f135]">Agent: ✓</span> : <span className="text-right text-white/20">No Agent</span>}
                      </div>
                    </div>

                    {/* Column 3: Global Actions */}
                    <div className="flex flex-col gap-2 justify-center">
                      <button
                        onClick={generateTourScripts}
                        disabled={isGeneratingScripts || filledRoomCount === 0}
                        className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                          isGeneratingScripts || filledRoomCount === 0
                            ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                            : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {isGeneratingScripts ? (
                          <><Loader2 size={10} className="animate-spin" /> Generating Scripts…</>
                        ) : (
                          <><Film size={10} /> Generate Tour Scripts</>
                        )}
                      </button>

                      <button
                        onClick={generateFullTour}
                        disabled={isGeneratingVideo || filledRoomCount === 0}
                        className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                          isGeneratingVideo || filledRoomCount === 0
                            ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                            : 'bg-[#c8f135] text-black hover:bg-[#d4ff3a] shadow-[0_4px_20px_rgba(200,241,53,0.25)] border border-[#c8f135]'
                        }`}
                      >
                        {isGeneratingVideo ? (
                          <><Loader2 size={12} className="animate-spin" />{videoProgressMsg}</>
                        ) : (
                          <>
                            <MapPin size={12} />
                            Generate Full Tour
                            <span className="opacity-50 ml-1">· {filledRoomCount} shots · {totalDuration}s · ⚡ {rooms.filter(r => r.image).reduce((acc, r) => acc + getCurrentCost(false, r.duration), 0)}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </div>
        )}
      </div>

    </div>
  );
}
