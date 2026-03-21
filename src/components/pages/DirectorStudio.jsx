import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import {
    Upload, Film, Sparkles, Loader2, Key, AlertCircle,
    Image as ImageIcon, Plus, Video, PlaySquare, ArrowLeft,
    Lightbulb, FileVideo, Layers, Copy, ArrowRight,
    Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store';
 
import { saveGeneratedAsset } from "../../services/supabaseService.js";

const CINEMATIC_PRESETS = [
    { name: "Orbit Reveal", prompt: "A cinematic eye-level full 360-degree orbit clockwise around the subject with soft backlighting and organic handheld camera shake. Motion is continuous and fluid." },
    { name: "Power Walk", prompt: "Dynamic tracking shot moving backwards leading the subject's assertive linear forwards pace. Subtle camera bob and slight cinematic lens distortion." },
    { name: "Candid Drift", prompt: "Lateral medium shot sliding left-to-right smoothly on tracks with shallow Depth-of-Field to amplify background bokeh drift and subject connection." },
    { name: "Sit to Stand", prompt: "Dramatic low-angle worm-eye rise catching the imposing physical upward motion of getting up from structured posture element with high contrast shadow bias." },
    { name: "Push-In Stare", prompt: "An extremely tight slow-gliding push-in centering subject's centered composition with ambient glint drift over eye lenses and hyper-realistic facial hold." },
    { name: "Spin Reveal", prompt: "Dynamic whipping full rotation pivoting tight past extreme closeness points to frame a frozen posture hold amidst neon bokeh highlights." },
    { name: "Wind Frame Orbit", prompt: "Static pose view orbiting circularly around subject as structural layout or garments billows softly with layered wind-machine vectors holding ambient momentum." },
    { name: "Macro Surface Glide", prompt: "Macro view glide of textures rising upward linearly tracking to capture edge profile hold and composed eye connection to frame." },
    { name: "Lower Jib Rise", prompt: "Camera starts grounded low and floats to eye level elevating cinematic depth with fluid axis hold detailing the upwards pacing momentum." },
    { name: "The Runway Tracking", prompt: "Steadicam centering track pushing continuous depth scale with centered dynamic glide maintaining linear frame alignment." },
    { name: "Over-The-Shoulder Drift", prompt: "Soft shallow lens panning softly off a shoulder depth layout as subject turns with ambient look hold directly addressing the frame angle." },
    { name: "Golden-Hour Whip", prompt: "Glimmering lens flare bursts from sunlight break as a sharp rapid whip-pan frames subject holding cinematic posture amidst organic drift vectors." }
];

const CAMERA_SHOTS = [
    "Cinematic wide establishing shot",
    "Medium shot, eye level",
    "Extreme close-up macro shot",
    "Fast-moving drone shot",
    "Low angle heroic shot",
    "High angle tracking shot",
    "Handheld documentary style",
    "Slow motion, 120fps"
];

const PROMPT_SUGGESTIONS = [
    {
        label: "Highlight Outfit (Fashion)",
        prompt: "The character strikes a confident pose, the camera slowly panning up to reveal the intricate details and texture of the outfit. Soft, dramatic lighting highlights the fabric."
    },
    {
        label: "Action / Movement",
        prompt: "The character is running quickly through the location, looking over their shoulder. The outfit flows dynamically with their movement."
    },
    {
        label: "Emotional Close-up",
        prompt: "The character looks directly into the lens with intense emotion. The wind gently blows their hair and the collar of their outfit."
    },
    {
        label: "Environment Interaction",
        prompt: "The character walks slowly through the location, reaching out to touch the surroundings. The lighting of the environment reflects off their outfit."
    },
    {
        label: "Highlight Product Features",
        prompt: "The camera slowly pans around the product, highlighting its sleek design and premium materials. Dynamic lighting emphasizes its unique features and textures."
    },
    {
        label: "Product in Use (Lifestyle)",
        prompt: "The product is shown being used naturally in a modern home environment. The camera captures the seamless interaction and the user's satisfaction."
    },
    {
        label: "Demonstrate Durability",
        prompt: "The product is subjected to extreme conditions, demonstrating its rugged durability and high-quality construction. The camera captures the impact in slow motion."
    }
];

const loadingMessages = [
    "Preparing set & equipment...",
    "Stylist doing final touch-ups...",
    "Rehearsing blockings & camera paths...",
    "Roll Camera! Shooting started...",
    "Action! Simulating dimensions...",
    "Capturing frames (Retaking perfect syncs)..."
];
export default function DirectorStudio() {
    const { apiKey: storeApiKey, addVideoNode } = useAppStore();
    const [hasKey, setHasKey] = useState(true);
    const [activeMode, setActiveMode] = useState('director');
    const [mediaType, setMediaType] = useState('video'); // 'video' | 'image'

    // Director Inputs
    const [characterImg, setCharacterImg] = useState(() => localStorage.getItem('director_character') || null);
    const [outfitImg, setOutfitImg] = useState(() => localStorage.getItem('director_outfit') || null);
    const [locationImg, setLocationImg] = useState(() => localStorage.getItem('director_location') || null);
    const [firstFrameImg, setFirstFrameImg] = useState(() => localStorage.getItem('director_first_frame') || null);
    const [cameraShot, setCameraShot] = useState(CAMERA_SHOTS[0]);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [includeAudio, setIncludeAudio] = useState(false);
    const [prompt, setPrompt] = useState('An ultra-detailed cinematic shot of the Person wearing the Outfit, standing full-body posing in the Stage. Soft studio rim-lighting, highly realistic texture finish, 8k Resolution UHD.');
    const [extendPrompt, setExtendPrompt] = useState('The scene continues naturally.');
    // --- Persist Reference Images on Refresh ---
    useEffect(() => {
        if (!characterImg) localStorage.removeItem('director_character');
        else if (typeof characterImg === 'string') localStorage.setItem('director_character', characterImg);
        else { compressImage(characterImg).then(b64 => localStorage.setItem('director_character', b64)).catch(() => {}); }
    }, [characterImg]);

    useEffect(() => {
        if (!outfitImg) localStorage.removeItem('director_outfit');
        else if (typeof outfitImg === 'string') localStorage.setItem('director_outfit', outfitImg);
        else { compressImage(outfitImg).then(b64 => localStorage.setItem('director_outfit', b64)).catch(() => {}); }
    }, [outfitImg]);

    useEffect(() => {
        if (!locationImg) localStorage.removeItem('director_location');
        else if (typeof locationImg === 'string') localStorage.setItem('director_location', locationImg);
        else { compressImage(locationImg).then(b64 => localStorage.setItem('director_location', b64)).catch(() => {}); }
    }, [locationImg]);

    useEffect(() => {
        if (!firstFrameImg) localStorage.removeItem('director_first_frame');
        else if (typeof firstFrameImg === 'string') localStorage.setItem('director_first_frame', firstFrameImg);
        else { compressImage(firstFrameImg).then(b64 => localStorage.setItem('director_first_frame', b64)).catch(() => {}); }
    }, [firstFrameImg]);


    // Replicator Inputs
    const [sourceVideo, setSourceVideo] = useState(null);
    const [sourceVideoUrl, setSourceVideoUrl] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [isVideoDragging, setIsVideoDragging] = useState(false);
    const videoInputRef = useRef(null);

    // Shared Outputs & State
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState(() => localStorage.getItem('director_generated_url') || '');

    const [rawVideoObj, setRawVideoObj] = useState(null);
    const [playgroundVideos, setPlaygroundVideos] = useState(() => {
        const saved = localStorage.getItem('director_tray');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('director_tray', JSON.stringify(playgroundVideos));
    }, [playgroundVideos]);
    const [error, setError] = useState('');
    const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
    const [isSuggesting, setIsSuggesting] = useState(false);
const [videoModel, setVideoModel] = useState('veo'); // 'veo' | 'kling'
const [duration, setDuration] = useState('8');

// Auto-set duration when model changes
useEffect(() => {
    if (videoModel === 'kling') {
        setDuration('5');  // Kling default
    } else {
        setDuration('8');  // Veo default
    }
}, [videoModel]);
    // --- Persist Generated Output on Refresh ---
    useEffect(() => {
        if (!generatedVideoUrl) localStorage.removeItem('director_generated_url');
        else localStorage.setItem('director_generated_url', generatedVideoUrl);
    }, [generatedVideoUrl]);
 // in seconds
const [resolution, setResolution] = useState('1080p');
    const [veoProvider, setVeoProvider] = useState("google"); // default set to Vertex AI (via handleGoogle)

    const [customLoadingMsg, setCustomLoadingMsg] = useState('');

    const [step, setStep] = useState(() => localStorage.getItem('director_generated_url') ? 'done' : 'idle');

    // Economy
    const [coins, setCoins] = useState(100);

    // Use either the store key or the window hook
    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio?.hasSelectedApiKey) {
                const has = await window.aistudio.hasSelectedApiKey();
                setHasKey(has);
            } else if (storeApiKey) {
                setHasKey(true);
            }
        };
        checkKey();
    }, [storeApiKey]);

    useEffect(() => {
        let interval;
        if (step === 'generating' || step === 'extending') {
            interval = setInterval(() => {
                setLoadingMsgIdx((prev) => (prev + 1) % loadingMessages.length);
            }, 15000);
        }
        return () => clearInterval(interval);
    }, [step]);

    const getEffectiveApiKey = () => {
        return storeApiKey ||
            window.__VEO_API_KEY__ ||
            (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_API_KEY) ||
            (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
            (typeof process !== 'undefined' && process.env?.GOOGLE_API_KEY) ||
            '';
    };
    const getGenerationCost = () => { if (videoModel === "kling") return 10; const isAudio = includeAudio; const dur = parseInt(duration) || 4; if (videoModel === "veo3_fast") { if (dur <= 4) return isAudio ? 65 : 43; if (dur <= 6) return isAudio ? 98 : 65; return isAudio ? 130 : 87; } else { if (dur <= 4) return isAudio ? 174 : 87; if (dur <= 6) return isAudio ? 260 : 130; return isAudio ? 347 : 174; } };
    const handleSelectKey = async () => {
        if (window.aistudio?.openSelectKey) {
            await window.aistudio.openSelectKey();
            setHasKey(true);
        } else {
            window.toast("Please set your API key in the System Config sidebar.");
        }
    };

    const switchMode = (mode) => {
        if (step === 'generating' || step === 'extending' || step === 'analyzing') return;
        setActiveMode(mode);
        setStep('idle');
        setGeneratedVideoUrl('');
        setError('');
        setRawVideoObj(null);
        setAnalysis('');
    };

    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            if (!(file instanceof Blob || file instanceof File)) return resolve(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_DIM = 1024;
                    let { width, height } = img;
                    if (width > height && width > MAX_DIM) {
                        height = (height * MAX_DIM) / width;
                        width = MAX_DIM;
                    } else if (height > MAX_DIM) {
                        width = (width * MAX_DIM) / height;
                        height = MAX_DIM;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const b64 = canvas.toDataURL('image/jpeg', 0.8);
                    console.log(`[COMPRESS] Resized ${file.name} to ${width}x${height} (B64 Length: ${b64.length})`);
                    resolve(b64);
                };
                img.onerror = reject;
                img.src = e.target?.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const formatError = (err) => {
        const msg = err.message || JSON.stringify(err);
        if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
            return "Quota Exceeded (429): You've reached your Gemini/Veo limits. Please wait a few minutes or switch to a different API key.";
        }
        if (msg.includes("Requested entity was not found")) {
            return "API Key error: The model or key was not found. Please refresh your key settings.";
        }
        return msg || "An unexpected error occurred.";
    };

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            if (!(file instanceof Blob || file instanceof File)) return resolve(file);
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result;
                const base64 = result.split(',')[1];
                console.log(`[FILE_TO_B64] Converted ${file.name} to B64 (Length: ${base64.length})`);
                resolve(result);
            };
            reader.onerror = error => reject(error);
        });
    };

    const dataURLtoFile = (dataurl, filename) => {
        let arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]),
            n = bstr.length,
            u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    const fetchVideoBlob = async (uri) => {
        const apiKeyToUse = getEffectiveApiKey();
        const response = await fetch(uri, {
            method: 'GET',
            headers: { 'x-goog-api-key': apiKeyToUse },
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to fetch video blob:", response.status, errorText);
            throw new Error(`Failed to download video (Status ${response.status}). The video may still be processing or the link expired.`);
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    };

    // --- DIRECTOR MODE HANDLER ---
    const handleGenerateDirector = async () => {
        if (coins < 20) {
            setError("Insufficient coins! Video generation requires 20 coins.");
            return;
        }

        if (!prompt.trim()) {
            setError("Please enter an action/location prompt.");
            return;
        }

        try {
            setCoins(prev => prev - 20);
            setError('');
            setStep('generating');
            setLoadingMsgIdx(0);
            setCustomLoadingMsg('');
            setGeneratedVideoUrl('');
            setRawVideoObj(null);

            if (videoModel === 'kling') {
                let sourceImg = firstFrameImg || locationImg || characterImg || outfitImg;
                let base64Data = null;

                setStep('generating');
                setLoadingMsgIdx(0);

                if (!sourceImg) {
                    setCustomLoadingMsg("Nano Banana 2 is drawing your scene image first...");
                    const imgResponse = await fetch('http://localhost:3002/api/generate-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: "nano-banana-2",
                            prompt: prompt,
                            aspect_ratio: aspectRatio,
                            userId: "director-canvas"
                        })
                    });
                    const imgData = await imgResponse.json();
                    if (!imgData.url) throw new Error(imgData.error || "Failed to generate initial image with Nano Banana 2.");
                    
                    base64Data = imgData.url; 
                    setCustomLoadingMsg("Kling 2.6 is animating dimensions...");
                } else {
                    base64Data = await compressImage(sourceImg);
                }

                // 2. Call local backend proxy (carrying KLING_API_KEY)
                const response = await fetch('http://localhost:3002/api/generate-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: "kling-2.6/video",
                        prompt: cameraShot ? `${cameraShot}. ${prompt}` : prompt,
                        firstFrame: base64Data,
                        duration: duration,
                        includeAudio: includeAudio,
                        userId: "director-canvas"
                    })
                });
                const data = await response.json();

                if (data.url || data.videoUrl) {
                    const downloadLink = data.url || data.videoUrl;
                    setGeneratedVideoUrl(downloadLink);
                    if (typeof addVideoNode === "function") { addVideoNode(downloadLink, prompt, aspectRatio || "16:9"); }
                    if (typeof setPlaygroundVideos === "function") { setPlaygroundVideos(prev => [{ url: downloadLink, prompt, id: Date.now() }, ...prev]); }
                    setStep('done');
                    setCustomLoadingMsg('');
                } else {
                    throw new Error(data.error || data.message || "Failed to generate video from Kling engine.");
                }
                return; // Halt Veo standard logic below
            }

            const refImagesPayload = [];
            if (characterImg) refImagesPayload.push(await compressImage(characterImg));
            if (outfitImg) refImagesPayload.push(await compressImage(outfitImg));
            if (locationImg) refImagesPayload.push(await compressImage(locationImg));

            const finalPrompt = cameraShot ? `${cameraShot}. ${prompt}` : prompt;

            // Pipe request to backend proxy (bypasses direct Browser Referer filters on Key)
            const response = await fetch('http://localhost:3002/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: videoModel,
                    prompt: finalPrompt,
                    aspect_ratio: aspectRatio,
                    duration: duration,
                    resolution: resolution,
                    referenceImages: refImagesPayload,
                    userId: "director-canvas",
                    includeAudio: includeAudio,
                    provider: veoProvider
                })
            });
            const data = await response.json();
            if (data.url || data.videoUrl) {
                const downloadLink = data.url || data.videoUrl;
                setGeneratedVideoUrl(downloadLink);
                if (typeof addVideoNode === "function") { addVideoNode(downloadLink, prompt, aspectRatio || "16:9"); }
                if (typeof setPlaygroundVideos === "function") { setPlaygroundVideos(prev => [{ url: downloadLink, prompt, id: Date.now() }, ...prev]); }
                setStep('done');
            } else if (data.jobId) {
                let completed = false;
                while (!completed) {
                    await new Promise(r => setTimeout(r, 8000));
                    const statusResp = await fetch(`http://localhost:3002/api/job-status/${data.jobId}`);
                    const statusData = await statusResp.json();
                    
                    if (statusData.status === 'success' && statusData.url) {
                         const downloadLink = statusData.url;
                         setGeneratedVideoUrl(downloadLink);
                         if (typeof addVideoNode === "function") { addVideoNode(downloadLink, prompt, aspectRatio || "16:9"); }
                         if (typeof setPlaygroundVideos === "function") { setPlaygroundVideos(prev => [{ url: downloadLink, prompt, id: Date.now() }, ...prev]); }
                         setStep('done');
                         completed = true;
                    } else if (statusData.status === 'error') {
                         throw new Error(statusData.error || "Async Status Error");
                    }
                }
            } else {
                throw new Error(data.error || data.message || "Failed to generate video.");
            }

        } catch (err) {
            console.error(err);
            const formatted = formatError(err);
            if (formatted.includes("API Key error")) setHasKey(false);
            setError(formatted);
            setStep('idle');
        }
    };

    const handleGenerateImageDirector = async () => {
        if (coins < 2) {
            setError("Insufficient coins! Image generation requires 2 coins.");
            return;
        }

        if (!prompt.trim()) {
            setError("Please enter a prompt for the storyboard.");
            return;
        }

        try {
            setCoins(prev => prev - 2);
            setError('');
            setStep('generating');
            setLoadingMsgIdx(0);
            setGeneratedVideoUrl('');
            setRawVideoObj(null);

            const refImagesPayload = [];
            if (characterImg) refImagesPayload.push(await compressImage(characterImg));
            if (outfitImg) refImagesPayload.push(await compressImage(outfitImg));
            if (locationImg) refImagesPayload.push(await compressImage(locationImg));

            const finalPrompt = `Storyboard shot, highly detailed, ${cameraShot}. ${prompt}`.trim();

            const response = await fetch('http://localhost:3002/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "nano-banana-2",
                    prompt: finalPrompt,
                    aspect_ratio: aspectRatio,
                    referenceImages: refImagesPayload,
                    images: refImagesPayload, // Extra fallbacks to guarantee ingestion
                    references: refImagesPayload,
                    identity_images: refImagesPayload,
                    userId: "director-canvas",
                    quality: resolution
                })
            });
            const imgData = await response.json();
            if (!imgData.url) throw new Error(imgData.error || "Failed to generate image from Nano Banana 2.");

            setGeneratedVideoUrl(imgData.url);
            setStep('done');

        } catch (err) {
            console.error(err);
            const formatted = formatError(err);
            if (formatted.includes("API Key error")) setHasKey(false);
            setError(formatted);
            setStep('idle');
        }
    };

        const handleAnimateWithKling = async () => {
        if (!generatedVideoUrl) return;
        if (coins < 10) {
            setError("Insufficient coins! Kling Video requires 10 coins.");
            return;
        }

        try {
            setCoins(prev => prev - 10);
            setError('');
            setStep('generating');
            setLoadingMsgIdx(0);
            setCustomLoadingMsg("Kling 2.6 is animating your image...");
            
            const imageToAnimate = generatedVideoUrl;
            setGeneratedVideoUrl('');

            const response = await fetch('http://localhost:3002/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "kling-2.6/video",
                    prompt: cameraShot ? `${cameraShot}. ${prompt}` : prompt,
                    firstFrame: imageToAnimate,
                    duration: duration,
                    includeAudio: includeAudio,
                    userId: "director-canvas"
                })
            });
            const data = await response.json();

            if (data.url || data.videoUrl) {
                const downloadLink = data.url || data.videoUrl;
                if (typeof saveGeneratedAsset === 'function') saveGeneratedAsset(downloadLink, 'video', `kling_${Date.now()}.mp4`);
                setPlaygroundVideos(prev => [{ url: downloadLink }, ...prev]);
                setGeneratedVideoUrl(downloadLink);
                if (typeof addVideoNode === "function") { addVideoNode(downloadLink, prompt, aspectRatio || "16:9"); }
                    if (typeof saveGeneratedAsset === 'function') saveGeneratedAsset(downloadLink, 'video', `director_${Date.now()}.mp4`);
                    setStep('done');
                setCustomLoadingMsg('');
            } else {
                throw new Error(data.error || data.message || "Failed to generate video from Kling engine.");
            }

        } catch (err) {
            console.error(err);
            setError(formatError(err));
            setStep('idle');
            setCustomLoadingMsg('');
        }
    };

    const handleAutoSuggest = async () => {
        try {
            setIsSuggesting(true);
            setError('');
            const contents = [];

            if (characterImg) contents.push({ inlineData: { mimeType: 'image/jpeg', data: (await compressImage(characterImg)).split(',')[1] } });
            if (outfitImg) contents.push({ inlineData: { mimeType: 'image/jpeg', data: (await compressImage(outfitImg)).split(',')[1] } });
            if (locationImg) contents.push({ inlineData: { mimeType: 'image/jpeg', data: (await compressImage(locationImg)).split(',')[1] } });

            if (contents.length > 0) {
                // Stage 1: Detailed Analytical JSON parsing
                contents.push({ text: `Analyze the provided images to assist a Fashion Director:
1) Person's appearance, features, and expression.
2) Outfit/Clothing textures, fabric flow, details, and style.
3) Scene/Stage mood, lighting ambiance, architecture, and environment.
Provide a clean description for each point. Return your answer ONLY as a valid JSON object with keys: "person", "outfit", "scene".` });

                const response = await fetch('http://localhost:3002/api/auto-suggest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: contents }] })
                });

                const data = await response.json();
                if (data.error) throw new Error(data.error);
                if (!data.text) throw new Error("Failed to get analysis response from Gemini.");

                let imgAnalysis = { person: '', outfit: '', scene: '' };
                try {
                    const jsonText = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
                    imgAnalysis = JSON.parse(jsonText);
                } catch (err) {
                    console.error("Failed to parse analysis JSON:", data.text);
                    imgAnalysis = { person: data.text, outfit: 'listed in text', scene: 'listed in text' };
                }

                // Stage 2: 100-word Epic Cinematic Prompt Generation
                const style = cameraShot || "Cinematic";
                const promptGeneratorText = `Act as an Elite Cine Director for a Fashion Shoot themed around ${style}.
Based on this Analysis:
Person: ${imgAnalysis.person}
Outfit: ${imgAnalysis.outfit}
Scene: ${imgAnalysis.scene}

Write a highly descriptive, cinematic 100-word prompt for a video generation model like Veo/Kling.
Order of description: Camera movement + Lighting -> character striking a pose -> clothing flow detail and scene interaction.
Provide only the output prompt ready for generation, with NO preamble or markdown tags.`;

                const promptResponse = await fetch('http://localhost:3002/api/auto-suggest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptGeneratorText }] }] })
                });

                const promptData = await promptResponse.json();
                if (promptData.error) throw new Error(promptData.error);
                
                if (promptData.text) {
                    setPrompt(promptData.text.trim());
                }
            } else {
                 const apiKey = getEffectiveApiKey(); const ai = new GoogleGenAI({ apiKey });
                 const response = await ai.models.generateContent({
                     model: "gemini-2.5-flash",
                     contents: [{ text: "Suggest a creative cinematic video prompt. If no images are provided, suggest a random high-quality cinematic scene. Provide only the prompt text, keep it concise but descriptive." }]
                 });

                 if (response.text) {
                     setPrompt(response.text.trim());
                 }
            }
        } catch (err) {
            console.error(err);
            setError(formatError(err));
        } finally {
            setIsSuggesting(false);
        }
    };

    // --- REPLICATOR MODE HANDLERS ---
    const handleVideoChange = (e) => {
        const selected = e.target.files?.[0];
        if (selected) {
            if (selected.size > MAX_FILE_SIZE) {
                setError("File is too large. Please select a video under 20MB.");
                return;
            }
            setSourceVideo(selected);
            setSourceVideoUrl(URL.createObjectURL(selected));
            setError('');
            setStep('idle');
            setGeneratedVideoUrl('');
            setAnalysis('');
        }
    };

    const handleGenerateReplicator = async () => {
        if (!sourceVideo) return;
        if (coins < 20) {
            setError("Insufficient coins! Video replication requires 20 coins.");
            return;
        }

        try {
            setCoins(prev => prev - 20);
            setError('');
            setStep('analyzing');
            setAnalysis('');
            setGeneratedVideoUrl('');
            setRawVideoObj(null);

            const apiKeyToUse = getEffectiveApiKey();
            if (!apiKeyToUse) throw new Error("No API key found.");

            let aiConfig = { apiKey: apiKeyToUse };

            const ai = new GoogleGenAI(aiConfig);
            const base64Data = await fileToBase64(sourceVideo);

            // 1. Analyze Video with Gemini 2.5 Flash
            const isImage = sourceVideo.type.startsWith('image/');
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                    {
                        parts: [
                            { inlineData: { mimeType: sourceVideo.type, data: base64Data } },
                            { text: `Analyze this ${isImage ? 'image' : 'video'} in extreme detail. Describe the subject, the environment, the lighting, the camera angle, the motion, and the overall style. The goal is to use this description as a prompt for a video generation model to recreate a similar video. Provide only the prompt text.` }
                        ]
                    }
                ]
            });

            const generatedPrompt = response.text || "A visually stunning video.";
            setAnalysis(generatedPrompt);

            // 2. Build Reference Images Payload
            const refImagesPayload = [];
            if (characterImg) {
                console.log("[REPLICATOR] Packaging character image...");
                refImagesPayload.push({
                    image: { imageBytes: await compressImage(characterImg), mimeType: 'image/jpeg' },
                    referenceType: 'ASSET',
                    reference_type: 'asset'
                });
            }
            if (outfitImg) {
                console.log("[REPLICATOR] Packaging outfit image...");
                refImagesPayload.push({
                    image: { imageBytes: await compressImage(outfitImg), mimeType: 'image/jpeg' },
                    referenceType: 'ASSET',
                    reference_type: 'asset'
                });
            }
            if (locationImg) {
                console.log("[REPLICATOR] Packaging location image...");
                refImagesPayload.push({
                    image: { imageBytes: await compressImage(locationImg), mimeType: 'image/jpeg' },
                    referenceType: 'ASSET',
                    reference_type: 'asset'
                });
            }

            // 3. Generate Video with Veo
            setStep('generating');
            setLoadingMsgIdx(0);

            const modelToUse = refImagesPayload.length > 0 ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';

            const payload = {
                model: modelToUse,
                prompt: generatedPrompt,
                referenceImages: refImagesPayload.length > 0 ? refImagesPayload : undefined,
                config: {
                    numberOfVideos: 1,
                    aspectRatio: aspectRatio,
                    ...(refImagesPayload.length > 0 && {
                        referenceImages: refImagesPayload,
                        reference_images: refImagesPayload
                    })
                }
            };

            console.log("[VEO_REPLICATOR_PAYLOAD] Full Payload:", payload);
            console.log("[VEO_REPLICATOR_PAYLOAD] Summary:", {
                prompt: payload.prompt,
                refCount: payload.config.referenceImages?.length || 0,
                model: payload.model
            });

            let operation = await ai.models.generateVideos(payload);

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            if (operation.error) {
                console.error("Replicator Operation error:", operation.error);
                throw new Error(`API Error: ${operation.error.message || JSON.stringify(operation.error)}`);
            }

            const rawVideo = operation.response?.generatedVideos?.[0]?.video;
            const downloadLink = rawVideo?.uri;

            if (downloadLink && rawVideo) {
                const videoUrl = await fetchVideoBlob(downloadLink);
                setGeneratedVideoUrl(videoUrl);
                setRawVideoObj(rawVideo);
                setStep('done');
            } else {
                console.error("Replicator Operation response:", operation.response);
                const responseStr = operation.response ? JSON.stringify(operation.response) : "No response object";
                throw new Error(`Failed to get video download link. API Response: ${responseStr}`);
            }

        } catch (err) {
            console.error(err);
            const formatted = formatError(err);
            if (formatted.includes("API Key error")) setHasKey(false);
            setError(formatted);
            setStep('idle');
        }
    };

    const handleGenerateImageReplicator = async () => {
        if (!sourceVideo) return;
        if (coins < 2) {
            setError("Insufficient coins! Image replication requires 2 coins.");
            return;
        }

        try {
            setCoins(prev => prev - 2);
            setError('');
            setStep('analyzing');
            setAnalysis('');
            setGeneratedVideoUrl('');
            setRawVideoObj(null);

            const apiKeyToUse = getEffectiveApiKey();
            if (!apiKeyToUse) throw new Error("No API key found.");

            let aiConfig = { apiKey: apiKeyToUse };

            const ai = new GoogleGenAI(aiConfig);
            const base64Data = await fileToBase64(sourceVideo);

            // 1. Analyze Media with Gemini 2.5 Flash
            const isImage = sourceVideo.type.startsWith('image/');
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                    {
                        parts: [
                            { inlineData: { mimeType: sourceVideo.type, data: base64Data } },
                            { text: `Analyze this ${isImage ? 'image' : 'video'} in extreme detail. Describe the subject, the environment, the lighting, the camera angle, and the overall style. The goal is to use this description as a prompt for an image generation model to recreate a similar image. Provide only the prompt text.` }
                        ]
                    }
                ]
            });

            const generatedPrompt = response.text || "A visually stunning image.";
            setAnalysis(generatedPrompt);

            // 2. Generate Image with Imagen 3
            setStep('generating');
            setLoadingMsgIdx(0);

            let finalPrompt = generatedPrompt;
            if (cameraShot) finalPrompt = `${cameraShot}. ${finalPrompt}`;

            const refImagesPayload = [];
            if (characterImg) refImagesPayload.push(await fileToBase64(characterImg));
            if (outfitImg) refImagesPayload.push(await fileToBase64(outfitImg));
            if (locationImg) refImagesPayload.push(await fileToBase64(locationImg));

            const imgResponse = await fetch('http://localhost:3002/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'nano-banana-2',
                    prompt: finalPrompt,
                    aspect_ratio: aspectRatio,
                    referenceImages: refImagesPayload,
                    images: refImagesPayload,
                    references: refImagesPayload,
                    identity_images: refImagesPayload,
                    userId: "replicator-canvas",
                    quality: resolution
                })
            });

            const imgData = await imgResponse.json();
            if (!imgData.url) throw new Error(imgData.error || imgData.message || "Failed to generate image.");

            setGeneratedVideoUrl(imgData.url);
            setStep('done');

        } catch (err) {
            console.error(err);
            const formatted = formatError(err);
            if (formatted.includes("API Key error")) setHasKey(false);
            setError(formatted);
            setStep('idle');
        }
    };

    // --- EXTEND HANDLER ---
    const handleExtend = async () => {
        if (!rawVideoObj) return;
        if (coins < 10) {
            setError("Insufficient coins! Extending video requires 10 coins.");
            return;
        }

        try {
            setCoins(prev => prev - 10);
            setError('');
            setStep('extending');
            setLoadingMsgIdx(0);

            const apiKeyToUse = getEffectiveApiKey();
            if (!apiKeyToUse) throw new Error("No API key found.");

            let aiConfig = { apiKey: apiKeyToUse };

            const ai = new GoogleGenAI(aiConfig);

            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-generate-preview',
                prompt: extendPrompt || 'The scene continues naturally.',
                video: rawVideoObj,
                config: {
                    numberOfVideos: 1,
                    aspectRatio: aspectRatio
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                ]
            });

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            if (operation.error) {
                console.error("Extend Operation error:", operation.error);
                throw new Error(`API Error: ${operation.error.message || JSON.stringify(operation.error)}`);
            }

            const extendedRawVideo = operation.response?.generatedVideos?.[0]?.video;
            const downloadLink = extendedRawVideo?.uri;

            if (downloadLink && extendedRawVideo) {
                const videoUrl = await fetchVideoBlob(downloadLink);
                setGeneratedVideoUrl(videoUrl);
                setRawVideoObj(extendedRawVideo);
                setStep('done');
            } else {
                console.error("Extend Operation response:", operation.response);
                throw new Error("Failed to get extended video download link.");
            }

        } catch (err) {
            console.error(err);
            const formatted = formatError(err);
            if (formatted.includes("API Key error")) setHasKey(false);
            setError(formatted);
            setStep('done');
        }
    };

    if (!hasKey) {
        return (
            <div className="h-full bg-[#0a0a0a] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-[#141414] border border-[#1e1e24] rounded-2xl p-8 text-center"
                >
                    <div className="w-16 h-16 bg-[#AADD00]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Key className="w-8 h-8 text-[#AADD00]" />
                    </div>
                    <h1 className="text-2xl font-semibold mb-3">API Key Required</h1>
                    <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                        To generate high-quality videos with Veo, you need to provide a Google Cloud / AI Studio API key.
                    </p>
                    <button
                        onClick={handleSelectKey}
                        className="w-full bg-white text-black font-medium py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                    >
                        <Key className="w-4 h-4" />
                        Set API Key
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="h-full text-[#d0d0dd] flex flex-col font-sans overflow-hidden" style={{ "--bg-panel": "#0a0a0a", "--bg-field": "#111113", "--border": "#1e1e24", "--border-hover": "#2a2a35", "--border-active": "#AADD00", "--text-primary": "#d0d0dd", "--text-label": "#3a3a4a", "--text-muted": "#2a2a35", "--lime": "#AADD00", "--lime-bg": "#0d1400", "--lime-border": "#1a2a00", backgroundColor: "var(--bg-panel)" }}>
            {/* Header */}


            {/* Main Content Split */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#050505]">
                {/* Left Panel - Controls */}
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="w-full md:w-[380px] h-1/2 md:h-full border-b md:border-b-0 md:border-r border-[#1e1e24] bg-[#080808]/80 backdrop-blur-xl flex flex-col shrink-0"
                >
                    {/* Fixed Panel Header */}
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                        {activeMode === 'director' ? (
                            <div className="space-y-8">
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] flex items-center gap-2">
                                            <ImageIcon size={12} className="text-[#AADD00]" />
                                            Reference Assets
                                        </h2>
                                        <span className="text-[8px] font-bold text-white/10 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">Optional</span>
                                    </div>
                                    <div className={`grid ${mediaType === 'video' && videoModel === 'kling' ? 'grid-cols-4' : 'grid-cols-3'} gap-3`}>
                                        <ImageUploadBox label="Person" file={characterImg} setFile={setCharacterImg} />
                                        <ImageUploadBox label="Outfit" file={outfitImg} setFile={setOutfitImg} />
                                        <ImageUploadBox label="Stage" file={locationImg} setFile={setLocationImg} />
                                        {mediaType === 'video' && videoModel === 'kling' && (
                                             <ImageUploadBox label="First Frame" file={firstFrameImg} setFile={setFirstFrameImg} />
                                        )}
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Video size={12} className="text-[#AADD00]" />
                                            <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em]">{mediaType === 'video' ? 'Cinema Direction' : 'Storyboard Direction'}</h2>
                                        </div>
                                        <div className="flex bg-white/5 p-1 rounded-xl border border-[#1e1e24]">
                                            <button
                                                onClick={() => setMediaType('video')}
                                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all gap-1.5 flex items-center ${mediaType === 'video' ? 'bg-[#AADD00]/20 text-[#AADD00] border border-[#AADD00]/30' : 'text-[#3a3a4a] hover:text-white'}`}
                                            >
                                                <Film className="w-3 h-3" />
                                                Video
                                            </button>
                                            <button
                                                onClick={() => setMediaType('image')}
                                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all gap-1.5 flex items-center ${mediaType === 'image' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'text-[#3a3a4a] hover:text-white'}`}
                                            >
                                                <ImageIcon className="w-3 h-3" />
                                                Image
                                            </button>
                                        </div>
                                    </div>

                                    <div />




































<div className="grid grid-cols-2 gap-3 mt-4">
<div className="space-y-2">
<label className="text-[9px] font-bold text-[#3a3a4a] uppercase tracking-widest pl-1">Camera Rig</label>
<select
value={cameraShot}
onChange={(e) => setCameraShot(e.target.value)}
className="w-full bg-[#111113] border border-[#1e1e24] rounded-xl px-2 py-3 text-xs text-[#d0d0dd] focus:outline-none focus:border-[#AADD00] transition-all font-mono hover:border-[#2a2a35]"
>
{CAMERA_SHOTS.map(shot => (
<option key={shot} value={shot} className="bg-[#0a0a0a] text-white">{shot}</option>
))}
</select>
</div>
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    










</div>

<div className="space-y-3">
<div className="flex items-center justify-between">
<div className="flex items-center gap-2">
<Video size={12} className="text-[#AADD00]" />
<select
onChange={(e) => {
const preset = CINEMATIC_PRESETS.find(p => p.name === e.target.value);
if (preset) setPrompt(preset.prompt);
                                                }}
                                                className="bg-transparent border-0 text-[10px] text-white/50 focus:outline-none focus:ring-0 font-black tracking-widest cursor-pointer uppercase hover:text-white transition-all pl-0"
                                                defaultValue=""
                                            >
                                                <option value="" disabled className="bg-[#0a0a0a] text-[#3a3a4a]">Direction Preset</option>
                                                {CINEMATIC_PRESETS.map(p => (
                                                    <option key={p.name} value={p.name} className="bg-[#0a0a0a] text-white">{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleAutoSuggest}
                                            disabled={isSuggesting}
                                            className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 text-[#AADD00] hover:text-[#AADD00] disabled:text-white/10 disabled:cursor-not-allowed transition-all"
                                        >
                                            {isSuggesting ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                            Neural Suggest
                                        </button>
                                    </div>
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder="Define the scene DNA..."
                                            className="w-full bg-[#111113] border border-[#1e1e24] rounded-2xl px-4 py-4 text-xs text-white placeholder:text-white/10 h-32 resize-none focus:outline-none focus:border-[#AADD00] transition-all leading-relaxed shadow-inner hover:bg-white/[0.04]"
                                        />

                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {PROMPT_SUGGESTIONS.slice(0, 3).map((suggestion, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setPrompt(suggestion.prompt)}
                                                    className="text-[8px] font-bold bg-white/5 hover:bg-white/10 border border-[#1e1e24] rounded-full px-3 py-1.5 transition-all text-[#3a3a4a] hover:text-white uppercase tracking-tighter"
                                                >
                                                    {suggestion.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </section>


                            </div>
                        ) : (
                            <div className="space-y-8">
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-widest flex items-center gap-2">
                                            <Video size={12} className="text-[#AADD00]" />
                                            Source Ingestion
                                        </h2>
                                        <div className="flex bg-white/5 p-1 rounded-xl border border-[#1e1e24]">
                                            <button
                                                onClick={() => setMediaType('video')}
                                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all gap-1.5 flex items-center ${mediaType === 'video' ? 'bg-[#AADD00]/20 text-[#AADD00] border border-[#AADD00]/30' : 'text-[#3a3a4a] hover:text-white'}`}
                                            >
                                                <Film className="w-3 h-3" />
                                                Video Output
                                            </button>
                                            <button
                                                onClick={() => setMediaType('image')}
                                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all gap-1.5 flex items-center ${mediaType === 'image' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'text-[#3a3a4a] hover:text-white'}`}
                                            >
                                                <ImageIcon className="w-3 h-3" />
                                                Image Output
                                            </button>
                                        </div>
                                    </div>
                                    {!sourceVideoUrl ? (
                                        <div
                                            onClick={() => videoInputRef.current?.click()}
                                            onDragOver={(e) => { e.preventDefault(); setIsVideoDragging(true); }}
                                            onDragLeave={(e) => { e.preventDefault(); setIsVideoDragging(false); }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setIsVideoDragging(false);
                                                if (e.dataTransfer.files?.[0]) {
                                                    handleVideoChange({ target: { files: e.dataTransfer.files } });
                                                }
                                            }}
                                            className={`aspect-video border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all ${isVideoDragging ? 'border-[#AADD00] bg-[#AADD00]/10' : 'border-[#1e1e24] hover:border-white/20 bg-[#111113]'
                                                }`}
                                        >
                                            <Upload className={`w-8 h-8 mb-4 ${isVideoDragging ? 'text-[#AADD00]' : 'text-white/10'}`} />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[#3a3a4a]">Drop Source Media</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-[#1e1e24] group shadow-2xl">
                                                {sourceVideo?.type?.startsWith('image/') ? (
                                                    <img src={sourceVideoUrl} alt="Source" className="w-full h-full object-contain" />
                                                ) : (
                                                    <video src={sourceVideoUrl} controls className="w-full h-full object-contain" />
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                    <button className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/20 pointer-events-auto" onClick={() => videoInputRef.current?.click()}>
                                                        Swap Source
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <input type="file" accept="video/*,image/*" className="hidden" ref={videoInputRef} onChange={handleVideoChange} />
                                </section>

                                <section className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-widest italic">Neural Overrides</h2>
                                        <span className="text-[8px] font-bold text-white/10 uppercase tracking-widest">Optional</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <ImageUploadBox label="Person" file={characterImg} setFile={setCharacterImg} />
                                        <ImageUploadBox label="Outfit" file={outfitImg} setFile={setOutfitImg} />
                                        <ImageUploadBox label="Stage" file={locationImg} setFile={setLocationImg} />
                                    </div>
                                </section>


                            </div>
                        )}
                    </div> {/* End Scrollable Container */}

                    <div className="p-3 border-t border-[#1e1e24] bg-[#0a0a0a]/90 backdrop-blur-md">
                        <div className={`grid ${mediaType === 'video' ? 'grid-cols-6' : 'grid-cols-2'} gap-1.5 mt-1`}>
                            {/* 1. Engine */}
                            {mediaType === 'video' ? (
                                <div className="flex flex-col gap-1.5 bg-[#111113] border border-[#1e1e24] p-2 rounded-xl">
                                    <span className="text-[8px] font-black tracking-[0.12em] text-[#3a3a4a] uppercase pl-1">Engine</span> 
                                    <select value={videoModel} onChange={(e) => setVideoModel(e.target.value)} className="w-full rounded-xl bg-[#111113] border border-[#1e1e24] p-2 pr-4 text-[11px] cursor-pointer focus:border-[#AADD00] text-[#d0d0dd] font-sans"> 
                                        <option value="veo3_fast" className="bg-[#0a0a0a] text-white">Veo Fast</option> 
                                        <option value="veo3" className="bg-[#0a0a0a] text-white">Veo Quality</option> 
                                        <option value="kling" className="bg-[#0a0a0a] text-white">Kling 2.6</option> 
                                    </select>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1.5 bg-[#111113] border border-[#1e1e24] p-2 rounded-xl">
                                    <span className="text-[8px] font-black tracking-[0.12em] text-[#3a3a4a] uppercase pl-1">Engine</span> 
                                    <select value="nano-banana-2" disabled className="w-full rounded-xl bg-[#111113] border border-[#1e1e24] p-2 pr-4 text-[11px] cursor-pointer focus:border-[#AADD00] text-[#d0d0dd] font-sans"> 
                                        <option value="nano-banana-2" className="bg-[#0a0a0a] text-white">Nano Banana 2</option> 
                                    </select>
                                </div>
                            )}

                            {/* 2. Provider (Conditional) */}
                            {mediaType === 'video' && (

                                <div className="flex flex-col gap-1.5 bg-[#111113] border border-[#1e1e24] p-2 rounded-xl">
                                    <span className="text-[8px] font-black tracking-[0.12em] text-[#3a3a4a] uppercase pl-1">Provider</span> 
                                    <select value={veoProvider} onChange={(e) => setVeoProvider(e.target.value)} className="w-full rounded-xl bg-[#111113] border border-[#1e1e24] p-2 pr-4 text-[11px] cursor-pointer focus:border-[#AADD00] text-[#d0d0dd] font-sans"> 
                                        <option value="kie" className="bg-[#0a0a0a] text-white">KIE AI</option> 
                                        <option value="google" className="bg-[#0a0a0a] text-white">Vertex AI</option> 
                                    </select>
                                </div>
                            )}

 
 
 
 
 
 
 
 
 
 

                            {/* 3. Aspect Ratio */}
                            <div className="flex flex-col gap-1.5 bg-[#111113] border border-[#1e1e24] p-2 rounded-xl">
                                <span className="text-[8px] font-black tracking-[0.12em] text-[#3a3a4a] uppercase pl-1">Bias</span>
                                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="bg-transparent border-0 text-[10px] text-[#d0d0dd] focus:outline-none focus:ring-0 font-mono cursor-pointer p-0">
                                    <option value="16:9" className="bg-[#0a0a0a] text-white">16:9</option>
                                    <option value="9:16" className="bg-[#0a0a0a] text-white">9:16</option>
                                    {mediaType === 'image' && <option value="1:1" className="bg-[#0a0a0a] text-white">1:1</option>}
                                </select>
                            </div>

                            {mediaType === 'video' ? (
                                <>
                                    {/* 4. Duration */}
                                    <div className="flex flex-col gap-1.5 bg-[#111113] border border-[#1e1e24] p-2 rounded-xl">
                                        <span className="text-[8px] font-black tracking-[0.12em] text-[#3a3a4a] uppercase pl-1">Duration</span>
                                        <select value={duration} onChange={(e) => setDuration(e.target.value)} className="bg-transparent border-0 text-[10px] text-[#d0d0dd] focus:outline-none focus:ring-0 font-mono cursor-pointer p-0">
                                            {videoModel.startsWith('veo') ? (
                                                <>
                                                    <option value="4" className="bg-[#0a0a0a] text-white">4s</option>
                                                    <option value="6" className="bg-[#0a0a0a] text-white">6s</option>
                                                    <option value="8" className="bg-[#0a0a0a] text-white">8s</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="5" className="bg-[#0a0a0a] text-white">5s</option>
                                                    <option value="10" className="bg-[#0a0a0a] text-white">10s</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    {/* 5. Resolution */}
                                    <div className="flex flex-col gap-1.5 bg-[#111113] border border-[#1e1e24] p-2 rounded-xl">
                                        <span className="text-[8px] font-black tracking-[0.12em] text-[#3a3a4a] uppercase pl-1">Res</span>
                                        <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="bg-transparent border-0 text-[10px] text-[#d0d0dd] focus:outline-none focus:ring-0 font-mono cursor-pointer p-0">
                                            <option value="720p" className="bg-[#0a0a0a] text-white">720p</option>
                                            <option value="1080p" className="bg-[#0a0a0a] text-white">1080p</option>
                                        </select>
                                    </div>
                                    {/* 6. Audio Toggle */}
                                    <div className="flex flex-col gap-1.5 bg-[#111113] border border-[#1e1e24] p-2 rounded-xl">
                                        <span className="text-[8px] font-black tracking-[0.12em] text-[#3a3a4a] uppercase pl-1">Audio</span>
                                        <button type="button" onClick={() => setIncludeAudio(!includeAudio)} className={`text-left text-[9px] font-bold mt-0.5 focus:outline-none ${includeAudio ? 'text-[#AADD00]' : 'text-[#3a3a4a]'}`}>
                                            {includeAudio ? '🔊 ON' : '🔇 OFF'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Image Upscale / Res (1k, 2k, 4k) */}
                                    <div className="flex flex-col gap-1.5 bg-[#111113] border border-[#1e1e24] p-2 rounded-xl">
                                        <span className="text-[8px] font-black tracking-[0.12em] text-[#3a3a4a] uppercase pl-1">Upscale (Res)</span>
                                        <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="bg-transparent border-0 text-[10px] text-[#d0d0dd] focus:outline-none focus:ring-0 font-mono cursor-pointer p-0">
                                            <option value="1k" className="bg-[#0a0a0a] text-white">1K</option>
                                            <option value="2k" className="bg-[#0a0a0a] text-white">2K Supreme</option>
                                            <option value="4k" className="bg-[#0a0a0a] text-white">4K Ultra</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                                    

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start gap-3 text-xs leading-relaxed"
                            >
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <p className="font-medium tracking-tight">{error}</p>
                            </motion.div>
                        )}

                        {activeMode === 'director' ? (
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={mediaType === 'video' ? handleGenerateDirector : handleGenerateImageDirector}
                                disabled={step === 'generating' || !prompt.trim()}
                                className="w-full relative group overflow-hidden bg-gradient-to-r from-[#AADD00] to-green-600 !text-black disabled:from-white/5 disabled:to-white/5 text-white font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-[#AADD00]/20 disabled:text-white/20 uppercase text-[10px] tracking-[0.2em]"
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 opacity-100 group-hover:bg-white/10 transition-opacity" />
                                {step === 'generating' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {step === "generating" ? "Engaging Neural Engine..." : mediaType === "video" ? `Generate Video (${getGenerationCost()}cr)` : "Generate Image (2cr)"}
                            </motion.button>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={mediaType === 'video' ? handleGenerateReplicator : handleGenerateImageReplicator}
                                disabled={step !== 'idle' || !sourceVideoUrl}
                                className="w-full relative group overflow-hidden bg-gradient-to-r from-[#AADD00] to-green-600 !text-black disabled:from-white/5 disabled:to-white/5 text-white font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/20 disabled:text-white/20 uppercase text-[10px] tracking-[0.2em]"
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                {step === 'analyzing' || step === 'generating' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {step === "analyzing" ? "Understanding Motifs..." : step === "generating" ? "Replicating DNA..." : mediaType === "video" ? `Replicate Video (${getGenerationCost()}cr)` : "Replicate Image (2cr)"}
                            </motion.button>
                        )}
                    </div>
                </motion.div>

                {/* Right Panel - Video Output */}
                                    
                <div className="flex-1 bg-[#101010] relative flex flex-col items-center justify-center p-12 overflow-y-auto custom-scrollbar">
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#141414]/95 border border-[#1e1e24] backdrop-blur-md p-1 rounded-2xl flex items-center z-40 shadow-2xl"> <button onClick={() => switchMode(`director`)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeMode === `director` ? `bg-white/10 text-white shadow-sm shadow-[0_0_15px_rgba(170,221,0,0.4)] text-[#AADD00]` : `text-[#3a3a4a] hover:text-white`}`} > <Layers className="w-3 h-3" /> Creative </button> <button onClick={() => switchMode(`replicator`)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeMode === `replicator` ? `bg-white/10 text-white shadow-sm shadow-[0_0_15px_rgba(170,221,0,0.4)] text-[#AADD00]` : `text-[#3a3a4a] hover:text-white`}`} > <FileVideo className="w-3 h-3" /> Replicate </button> </div>

                    {/* Background Decor */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#AADD00]/5 rounded-full blur-[120px] pointer-events-none" />

                    <AnimatePresence mode="wait">
                        {step === 'idle' && !generatedVideoUrl ? (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                className="text-center space-y-6 relative z-10"
                            >
                                <div className="w-24 h-24 bg-[#111113] border border-[#1e1e24] rounded-full flex items-center justify-center mx-auto shadow-2xl backdrop-blur-sm">
                                    <PlaySquare size={32} className="text-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold tracking-tight text-[#d0d0dd]">
                                        {activeMode === 'director' ? 'Awaiting Direction' : 'Awaiting Source'}
                                    </h3>
                                    <p className="text-xs text-[#3a3a4a] max-w-sm mx-auto leading-relaxed uppercase tracking-widest font-bold">
                                        Configure your cinematic parameters in the neural panel to begin.
                                    </p>
                                </div>
                            </motion.div>
                        ) : (step === 'analyzing' || step === 'generating' || step === 'extending') ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center space-y-10 relative z-10"
                            >
                                <div className="relative inline-block">
                                    <div className="absolute inset-0 bg-[#AADD00]/20 blur-[60px] rounded-full animate-pulse" />
                                    <div className="relative w-20 h-20 bg-[#0a0a0a] border border-[#1e1e24] rounded-full flex items-center justify-center">
                                        <Loader2 size={32} className="text-[#AADD00] animate-spin" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white/90">
                                        {step === "analyzing" ? "Decoding DNA" : step === "generating" ? "Lights, Camera, Action!" : "Expanding Horizon"}
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 animate-pulse">
                                        {step === 'analyzing' ? 'Gemini 1.5 Pro is processing temporal vectors...' : (customLoadingMsg || loadingMessages[loadingMsgIdx])}
                                    </p>
                                </div>
                            </motion.div>
                        ) : step === 'done' && generatedVideoUrl ? (
                            <motion.div
                                key="output"
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="w-full max-w-xl relative z-10 space-y-4 mx-auto"
                            >
                                <div className="group relative rounded-[2rem] overflow-hidden bg-black aspect-video border border-[#1e1e24] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] transition-transform duration-700 hover:scale-[1.01]">
                                     {generatedVideoUrl?.startsWith('data:image/') || generatedVideoUrl?.match(/\.(jpeg|jpg|png|webp|gif)($|\?)/i) ? (
                                        <img
                                            src={generatedVideoUrl}
                                            alt="Storyboard Output"
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <video
                                            src={generatedVideoUrl}
                                            controls
                                            autoPlay
                                            muted
                                            playsInline
                                            loop
                                            className="w-full h-full object-contain"
                                        />
                                    )}
                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#1e1e24] flex items-center gap-3"> <button onClick={() => { setGeneratedVideoUrl(``); setStep(`idle`); }} className="text-[9px] font-black uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-1"> New </button> <div className="w-1 h-1 bg-white/20 rounded-full" /> <a href={generatedVideoUrl} download="output.mp4" className="text-[9px] font-black uppercase tracking-widest text-[#AADD00] hover:underline flex items-center gap-1"> Download </a>
                                             { (generatedVideoUrl?.startsWith('data:image/') || generatedVideoUrl?.match(/\.(jpeg|jpg|png|webp|gif)($|\?)/i)) && (
                                                 <>
                                                      <div className="w-1 h-1 bg-white/20 rounded-full" /> 
                                                      <button onClick={handleAnimateWithKling} className="text-[9px] font-black uppercase tracking-widest text-[#FFaa00] hover:text-[#ffca44] flex items-center gap-1"> 🎬 Animate </button>
                                                 </>
                                             )} <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Verified</span> </div>
                                    </div>
                                    </div>
 
                                {playgroundVideos.length > 0 && (
                                    <div className="space-y-3 mt-4">
                                        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] pl-1">Session Timeline</h3>
                                        <div className="grid grid-cols-5 gap-2">
                                            {playgroundVideos.map((vid, i) => {
                                                const isImg = vid.url?.startsWith('data:image/') || vid.url?.match(/\.(jpeg|jpg|png|webp|gif)($|\?)/i);
                                                return (
                                                    <div 
                                                        key={i} 
                                                        className={`relative rounded-xl overflow-hidden bg-[#111113] border border-[#1e1e24] aspect-video group cursor-pointer transition-all ${generatedVideoUrl === vid.url ? 'ring-2 ring-[#AADD00] border-[#AADD00]' : 'hover:border-white/20'}`}
                                                        onClick={() => { setGeneratedVideoUrl(vid.url); setStep('done'); }}
                                                    >
                                                        {isImg ? (
                                                            <img src={vid.url} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <video src={vid.url} className="w-full h-full object-cover" muted playsInline />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <PlaySquare className="w-4 h-4 text-white" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
 

                                {(generatedVideoUrl?.startsWith('data:image/') || generatedVideoUrl?.match(/\.(jpeg|jpg|png|webp|gif)($|\?)/i)) && activeMode === 'director' ? (
                                    <div className="flex gap-4">
                                         <div className="flex-1 bg-[#111113] border border-[#1e1e24] rounded-2xl p-6 backdrop-blur-sm flex items-center justify-between shadow-xl">
                                             <div className="space-y-1">
                                                 <h3 className="text-[10px] font-black text-[#AADD00] uppercase tracking-[0.2em] flex items-center gap-1.5"><Sparkles size={12} /> Storyboard Frame Active</h3>
                                                 <p className="text-xs text-[#3a3a4a]">Assign to reference matrix, or Animate with Kling instantly.</p>
                                             </div>
                                             <div className="flex items-center gap-2">
                                                 <button
                                                     onClick={() => {
                                                         setLocationImg(generatedVideoUrl);
                                                         setMediaType('video');
                                                     }}
                                                     className="bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest py-2 px-3 rounded-xl transition-all border border-[#1e1e24]"
                                                 >
                                                     Add Stage
                                                 </button>
                                                 <button
                                                     onClick={() => {
                                                         setCharacterImg(generatedVideoUrl);
                                                         setMediaType('video');
                                                     }}
                                                     className="bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest py-2 px-3 rounded-xl transition-all border border-[#1e1e24]"
                                                 >
                                                     Add Person
                                                 </button>
                                                 <button
                                                     onClick={handleAnimateWithKling}
                                                     className="bg-[#FFaa00] hover:bg-[#ffba22] text-black text-[10px] font-black uppercase tracking-widest py-2.5 px-5 rounded-xl transition-all shadow-lg ml-2 flex items-center gap-1.5 animate-pulse"
                                                 >
                                                     🎬 Animate
                                                 </button>
                                             </div>
                                         </div>
                                     </div>
                                 ) : (
                                    <div className="flex gap-4">
                                        <div className="flex-1 bg-[#111113] border border-[#1e1e24] rounded-2xl p-6 backdrop-blur-sm flex items-end gap-4 shadow-xl">
                                            <div className="flex-1 space-y-2">
                                                <label className="text-[9px] font-black text-[#3a3a4a] uppercase tracking-[0.2em] pl-1">Temporal Extension</label>
                                                <input
                                                    type="text"
                                                    value={extendPrompt}
                                                    onChange={(e) => setExtendPrompt(e.target.value)}
                                                    placeholder="Next sequence description..."
                                                    className="w-full bg-[#0a0a0a]/50 border border-[#1e1e24] rounded-xl px-5 py-3.5 text-xs text-white placeholder:text-white/10 focus:outline-none focus:border-[#AADD00]/40 transition-all font-mono"
                                                />
                                            </div>
                                            <button
                                                onClick={handleExtend}
                                                className="bg-white text-black hover:bg-white/90 text-[10px] font-black uppercase tracking-widest py-4 px-8 rounded-xl transition-all flex items-center gap-2 shadow-2xl active:scale-95"
                                            >
                                                <Plus size={14} />
                                                Extend Sequence
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeMode === 'replicator' && analysis && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="bg-[#111113] border border-[#1e1e24] rounded-2xl p-8 backdrop-blur-sm space-y-6"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[10px] font-black text-[#3a3a4a] uppercase tracking-[0.2em]">Temporal Blueprint</h3>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(analysis)}
                                                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#3a3a4a] hover:text-white transition-all bg-white/5 px-4 py-2 rounded-lg border border-[#1e1e24]"
                                                >
                                                    <Copy size={12} />
                                                    Copy DNA
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setPrompt(analysis);
                                                        switchMode('director');
                                                    }}
                                                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#AADD00] hover:text-[#AADD00] transition-all bg-[#AADD00]/10 px-4 py-2 rounded-lg border border-[#AADD00]/20"
                                                >
                                                    Sync to Studio
                                                    <ArrowRight size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// Helper Component for Image Upload
function ImageUploadBox({ label, file, setFile }) {
    const inputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');

    useEffect(() => {
        if (file && typeof file !== 'string') {
            const reader = new FileReader();
            reader.onloadend = () => setPreviewUrl(reader.result);
            reader.readAsDataURL(file);
        } else if (typeof file === 'string' && file !== 'null' && file !== 'undefined' && file !== '') {
            setPreviewUrl(file);
        } else {
            setPreviewUrl('');
        }
    }, [file]);


    const handleChange = (e) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type.startsWith('image/')) {
                setFile(droppedFile);
            }
        }
    };
    return (
        <div className="space-y-1.5 flex flex-col items-center">
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full aspect-square bg-white/5 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group transition-all ${isDragging ? 'border-[#AADD00] bg-[#AADD00]/10 shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'border-[#1e1e24] hover:border-[#1e1e24] hover:bg-white/[0.07]'
                    }`}
            >
                {file ? (
                    <>
                        <img src={previewUrl || ""} alt={label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                            <span className="text-[9px] font-black uppercase tracking-widest border border-white/20 px-3 py-1 rounded-full text-white">Replace</span>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <ImageIcon className={`w-5 h-5 ${isDragging ? 'text-[#AADD00]' : 'text-white/10'}`} strokeWidth={1.5} />
                    </div>
                )}
            </div>
            <label className="text-[8px] font-black text-white/20 uppercase tracking-widest">{label}</label>
            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={inputRef}
                onChange={handleChange}
            />
        </div>
    );
}
