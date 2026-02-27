import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import {
    Upload, Film, Sparkles, Loader2, Key, AlertCircle,
    Image as ImageIcon, Plus, Video, PlaySquare,
    Lightbulb, FileVideo, Layers, Copy, ArrowRight,
    Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

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
    "Analyzing inputs...",
    "Setting up the camera angle...",
    "Generating frames (this takes a few minutes)...",
    "Applying lighting and textures...",
    "Finalizing video..."
];

export default function DirectorStudio() {
    const { apiKey: storeApiKey } = useAppStore();
    const [hasKey, setHasKey] = useState(true);
    const [activeMode, setActiveMode] = useState('director');
    const [mediaType, setMediaType] = useState('video'); // 'video' | 'image'

    // Director Inputs
    const [characterImg, setCharacterImg] = useState(null);
    const [outfitImg, setOutfitImg] = useState(null);
    const [locationImg, setLocationImg] = useState(null);
    const [cameraShot, setCameraShot] = useState(CAMERA_SHOTS[0]);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [prompt, setPrompt] = useState('');
    const [extendPrompt, setExtendPrompt] = useState('The scene continues naturally.');

    // Replicator Inputs
    const [sourceVideo, setSourceVideo] = useState(null);
    const [sourceVideoUrl, setSourceVideoUrl] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [isVideoDragging, setIsVideoDragging] = useState(false);
    const videoInputRef = useRef(null);

    // Shared Outputs & State
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState('');
    const [rawVideoObj, setRawVideoObj] = useState(null); // Store for extension
    const [step, setStep] = useState('idle');
    const [error, setError] = useState('');
    const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
    const [isSuggesting, setIsSuggesting] = useState(false);

    // Vertex AI Config
    const [useVertex, setUseVertex] = useState(false);
    const [projectId, setProjectId] = useState('');
    const [location, setLocation] = useState('us-central1');

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

    const handleSelectKey = async () => {
        if (window.aistudio?.openSelectKey) {
            await window.aistudio.openSelectKey();
            setHasKey(true);
        } else {
            alert("Please set your API key in the System Config sidebar.");
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
                    const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
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
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result;
                const base64 = result.split(',')[1];
                console.log(`[FILE_TO_B64] Converted ${file.name} to B64 (Length: ${base64.length})`);
                resolve(base64);
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
            setGeneratedVideoUrl('');
            setRawVideoObj(null);

            const apiKeyToUse = getEffectiveApiKey();
            let aiConfig = { apiKey: apiKeyToUse };
            if (useVertex && projectId) {
                aiConfig = { vertexai: { project: projectId, location: location } };
            }
            const ai = new GoogleGenAI(aiConfig);

            console.log(`[KEY_DIAG] Using Key: ${apiKeyToUse.substring(0, 4)}...${apiKeyToUse.slice(-4)}`);

            const refImagesPayload = [];
            if (characterImg) {
                console.log("[DIRECTOR] Packaging character image...");
                refImagesPayload.push({
                    image: { imageBytes: await compressImage(characterImg), mimeType: 'image/jpeg' },
                    referenceType: 'ASSET',
                    reference_type: 'asset'
                });
            }
            if (outfitImg) {
                console.log("[DIRECTOR] Packaging outfit image...");
                refImagesPayload.push({
                    image: { imageBytes: await compressImage(outfitImg), mimeType: 'image/jpeg' },
                    referenceType: 'ASSET',
                    reference_type: 'asset'
                });
            }
            if (locationImg) {
                console.log("[DIRECTOR] Packaging location image...");
                refImagesPayload.push({
                    image: { imageBytes: await compressImage(locationImg), mimeType: 'image/jpeg' },
                    referenceType: 'ASSET',
                    reference_type: 'asset'
                });
            }

            const finalPrompt = `${cameraShot}. ${prompt}`.trim();

            const payload = {
                model: 'veo-3.1-generate-preview',
                prompt: finalPrompt,
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

            console.log("[VEO_DIRECTOR_PAYLOAD] Full Stringified:", JSON.stringify(payload, (k, v) => k === 'imageBytes' ? '(base64data)' : v, 2));
            console.log("[VEO_DIRECTOR_PAYLOAD] Summary:", {
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
                console.error("Director Operation error:", operation.error);
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
                console.error("Director Operation response:", operation.response);
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

            const apiKeyToUse = getEffectiveApiKey();
            let aiConfig = { apiKey: apiKeyToUse };
            if (useVertex && projectId) {
                aiConfig = { vertexai: { project: projectId, location: location } };
            }
            const ai = new GoogleGenAI(aiConfig);

            const finalPrompt = `Storyboard shot, highly detailed, ${cameraShot}. ${prompt}`.trim();

            const response = await ai.models.generateImages({
                model: 'imagen-3.0-generate-001',
                prompt: finalPrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: aspectRatio.replace(':', '') // specific to imagen config e.g., '169'
                }
            });

            const base64Image = response.generatedImages[0].image.imageBytes;
            setGeneratedVideoUrl(`data:image/jpeg;base64,${base64Image}`);
            setStep('done');

        } catch (err) {
            console.error(err);
            const formatted = formatError(err);
            if (formatted.includes("API Key error")) setHasKey(false);
            setError(formatted);
            setStep('idle');
        }
    };

    const handleAutoSuggest = async () => {
        try {
            setIsSuggesting(true);
            setError('');
            const apiKeyToUse = getEffectiveApiKey();
            if (!apiKeyToUse && !useVertex) throw new Error("No API key found.");

            let aiConfig = { apiKey: apiKeyToUse };
            if (useVertex && projectId) {
                aiConfig = { vertexai: { project: projectId, location: location } };
            }
            const ai = new GoogleGenAI(aiConfig);
            const contents = [];

            if (characterImg) contents.push({ inlineData: { mimeType: 'image/jpeg', data: await compressImage(characterImg) } });
            if (outfitImg) contents.push({ inlineData: { mimeType: 'image/jpeg', data: await compressImage(outfitImg) } });
            if (locationImg) contents.push({ inlineData: { mimeType: 'image/jpeg', data: await compressImage(locationImg) } });

            contents.push({ text: "Based on these images (Person, Outfit, Location), suggest a creative cinematic prompt for a video generation model. If no images are provided, suggest a random high-quality cinematic scene. Provide only the prompt text, keep it concise but descriptive." });

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ parts: contents }]
            });

            if (response.text) {
                setPrompt(response.text.trim());
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
            if (!apiKeyToUse && !useVertex) throw new Error("No API key found. Please set your Gemini API key or enable Enterprise Mode.");

            let aiConfig = { apiKey: apiKeyToUse };
            if (useVertex && projectId) {
                aiConfig = { vertexai: { project: projectId, location: location } };
            }
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
            if (!apiKeyToUse && !useVertex) throw new Error("No API key found. Please set your Gemini API key or enable Enterprise Mode.");

            let aiConfig = { apiKey: apiKeyToUse };
            if (useVertex && projectId) {
                aiConfig = { vertexai: { project: projectId, location: location } };
            }
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

            const imgResponse = await ai.models.generateImages({
                model: 'imagen-3.0-generate-001',
                prompt: finalPrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: aspectRatio.replace(':', '')
                }
            });

            const base64Image = imgResponse.generatedImages[0].image.imageBytes;
            setGeneratedVideoUrl(`data:image/jpeg;base64,${base64Image}`);
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
            if (!apiKeyToUse && !useVertex) throw new Error("No API key found. Please set your Gemini API key or enable Enterprise Mode.");

            let aiConfig = { apiKey: apiKeyToUse };
            if (useVertex && projectId) {
                aiConfig = { vertexai: { project: projectId, location: location } };
            }
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
                    className="max-w-md w-full bg-[#141414] border border-white/10 rounded-2xl p-8 text-center"
                >
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Key className="w-8 h-8 text-blue-400" />
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
        <div className="h-full bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-[#0a0a0a] z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Film className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-lg font-black tracking-tighter uppercase italic text-metallic">AI Director Studio</h1>
                </div>

                {/* Mode Switcher */}
                <div className="flex items-center gap-4">
                    {/* Coin display */}
                    <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-lg text-yellow-500" title="Credits available for generation">
                        <Coins className="w-4 h-4" />
                        <span className="text-sm font-bold">{coins}</span>
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => switchMode('director')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeMode === 'director' ? 'bg-white/10 text-white shadow-sm glow-text-blue' : 'text-white/40 hover:text-white'}`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            Director Cut
                        </button>
                        <button
                            onClick={() => switchMode('replicator')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeMode === 'replicator' ? 'bg-white/10 text-white shadow-sm glow-text-blue' : 'text-white/40 hover:text-white'}`}
                        >
                            <FileVideo className="w-3.5 h-3.5" />
                            Replicator
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Split */}
            <div className="flex-1 flex overflow-hidden bg-[#050505]">
                {/* Left Panel - Controls */}
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="w-[380px] border-r border-white/5 bg-[#080808]/80 backdrop-blur-xl overflow-y-auto custom-scrollbar flex flex-col shrink-0"
                >
                    <div className="p-6 space-y-8">
                        {activeMode === 'director' ? (
                            <div className="space-y-8">
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <ImageIcon size={12} className="text-blue-500" />
                                            Reference Assets
                                        </h2>
                                        <span className="text-[8px] font-bold text-white/10 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">Optional</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <ImageUploadBox label="Person" file={characterImg} setFile={setCharacterImg} />
                                        <ImageUploadBox label="Outfit" file={outfitImg} setFile={setOutfitImg} />
                                        <ImageUploadBox label="Stage" file={locationImg} setFile={setLocationImg} />
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Video size={12} className="text-blue-500" />
                                            <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{mediaType === 'video' ? 'Cinema Direction' : 'Storyboard Direction'}</h2>
                                        </div>
                                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                            <button
                                                onClick={() => setMediaType('video')}
                                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all gap-1.5 flex items-center ${mediaType === 'video' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-white/40 hover:text-white'}`}
                                            >
                                                <Film className="w-3 h-3" />
                                                Video
                                            </button>
                                            <button
                                                onClick={() => setMediaType('image')}
                                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all gap-1.5 flex items-center ${mediaType === 'image' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'text-white/40 hover:text-white'}`}
                                            >
                                                <ImageIcon className="w-3 h-3" />
                                                Image
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest pl-1">Camera Rig</label>
                                            <select
                                                value={cameraShot}
                                                onChange={(e) => setCameraShot(e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-3 text-xs text-white/80 focus:outline-none focus:border-blue-500/50 transition-all font-mono hover:bg-white/[0.05]"
                                            >
                                                {CAMERA_SHOTS.map(shot => (
                                                    <option key={shot} value={shot} className="bg-[#0a0a0a] text-white">{shot}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest pl-1">Frame Bias</label>
                                            <select
                                                value={aspectRatio}
                                                onChange={(e) => setAspectRatio(e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-3 text-xs text-white/80 focus:outline-none focus:border-blue-500/50 transition-all font-mono hover:bg-white/[0.05]"
                                            >
                                                <option value="16:9" className="bg-[#0a0a0a] text-white">16:9</option>
                                                <option value="9:16" className="bg-[#0a0a0a] text-white">9:16</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Vertex Config Toggle */}
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <label className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Enterprise Mode</label>
                                                <p className="text-[8px] text-red-400">Vertex AI (GCP) requires Server Proxy</p>
                                            </div>
                                            <button
                                                onClick={() => setUseVertex(!useVertex)}
                                                className={`w-10 h-5 rounded-full transition-all relative ${useVertex ? 'bg-blue-600' : 'bg-white/10'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${useVertex ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {useVertex && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                className="space-y-3 pt-2"
                                            >
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] pl-1">Project ID</label>
                                                    <input
                                                        type="text"
                                                        placeholder="my-gcp-project"
                                                        value={projectId}
                                                        onChange={(e) => setProjectId(e.target.value)}
                                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white/80 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] pl-1">Location</label>
                                                    <input
                                                        type="text"
                                                        placeholder="us-central1"
                                                        value={location}
                                                        onChange={(e) => setLocation(e.target.value)}
                                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white/80 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between pl-1">
                                            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest italic">Core Narrative</label>
                                            <button
                                                onClick={handleAutoSuggest}
                                                disabled={isSuggesting}
                                                className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 text-blue-400 hover:text-blue-300 disabled:text-white/10 disabled:cursor-not-allowed transition-all"
                                            >
                                                {isSuggesting ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                                Neural Suggest
                                            </button>
                                        </div>
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder="Define the scene DNA..."
                                            className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-4 text-xs text-white placeholder:text-white/10 h-32 resize-none focus:outline-none focus:border-blue-500/50 transition-all leading-relaxed shadow-inner hover:bg-white/[0.04]"
                                        />

                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {PROMPT_SUGGESTIONS.slice(0, 3).map((suggestion, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setPrompt(suggestion.prompt)}
                                                    className="text-[8px] font-bold bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-3 py-1.5 transition-all text-white/40 hover:text-white uppercase tracking-tighter"
                                                >
                                                    {suggestion.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={mediaType === 'video' ? handleGenerateDirector : handleGenerateImageDirector}
                                    disabled={step === 'generating' || !prompt.trim()}
                                    className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-700 to-indigo-600 disabled:from-white/5 disabled:to-white/5 text-white font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/20 disabled:text-white/20 uppercase text-[10px] tracking-[0.2em]"
                                >
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    {step === 'generating' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    {step === 'generating' ? 'Engaging Neural Engine...' : mediaType === 'video' ? 'Initiate Video Gen' : 'Initiate Image Gen'}
                                </motion.button>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                                            <Video size={12} className="text-blue-500" />
                                            Source Ingestion
                                        </h2>
                                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                            <button
                                                onClick={() => setMediaType('video')}
                                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all gap-1.5 flex items-center ${mediaType === 'video' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-white/40 hover:text-white'}`}
                                            >
                                                <Film className="w-3 h-3" />
                                                Video Output
                                            </button>
                                            <button
                                                onClick={() => setMediaType('image')}
                                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all gap-1.5 flex items-center ${mediaType === 'image' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'text-white/40 hover:text-white'}`}
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
                                            className={`aspect-video border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all ${isVideoDragging ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 hover:border-white/20 bg-white/[0.02]'
                                                }`}
                                        >
                                            <Upload className={`w-8 h-8 mb-4 ${isVideoDragging ? 'text-blue-400' : 'text-white/10'}`} />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Drop Source Media</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-white/5 group shadow-2xl">
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
                                        <h2 className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Neural Overrides</h2>
                                        <span className="text-[8px] font-bold text-white/10 uppercase tracking-widest">Optional</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <ImageUploadBox label="Person" file={characterImg} setFile={setCharacterImg} />
                                        <ImageUploadBox label="Outfit" file={outfitImg} setFile={setOutfitImg} />
                                        <ImageUploadBox label="Stage" file={locationImg} setFile={setLocationImg} />
                                    </div>
                                </section>

                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={mediaType === 'video' ? handleGenerateReplicator : handleGenerateImageReplicator}
                                    disabled={step !== 'idle' || !sourceVideoUrl}
                                    className="w-full relative group overflow-hidden bg-gradient-to-r from-indigo-700 to-purple-600 disabled:from-white/5 disabled:to-white/5 text-white font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/20 disabled:text-white/20 uppercase text-[10px] tracking-[0.2em]"
                                >
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    {step === 'analyzing' || step === 'generating' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    {step === 'analyzing' ? 'Understanding Motifs...' : step === 'generating' ? 'Replicating DNA...' : mediaType === 'video' ? 'Replicate to Video' : 'Replicate to Image'}
                                </motion.button>
                            </div>
                        )}

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
                    </div>
                </motion.div>

                {/* Right Panel - Video Output */}
                <div className="flex-1 bg-[#101010] relative flex flex-col items-center justify-center p-12 overflow-y-auto custom-scrollbar">

                    {/* Background Decor */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

                    <AnimatePresence mode="wait">
                        {step === 'idle' && !generatedVideoUrl ? (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                className="text-center space-y-6 relative z-10"
                            >
                                <div className="w-24 h-24 bg-white/[0.02] border border-white/5 rounded-full flex items-center justify-center mx-auto shadow-2xl backdrop-blur-sm">
                                    <PlaySquare size={32} className="text-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold tracking-tight text-white/80">
                                        {activeMode === 'director' ? 'Awaiting Direction' : 'Awaiting Source'}
                                    </h3>
                                    <p className="text-xs text-white/30 max-w-sm mx-auto leading-relaxed uppercase tracking-widest font-bold">
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
                                    <div className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-full animate-pulse" />
                                    <div className="relative w-20 h-20 bg-[#0a0a0a] border border-white/10 rounded-full flex items-center justify-center">
                                        <Loader2 size={32} className="text-blue-500 animate-spin" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white/90">
                                        {step === 'analyzing' ? 'Decoding DNA' : step === 'generating' ? 'Synthesizing Reality' : 'Expanding Horizon'}
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 animate-pulse">
                                        {step === 'analyzing' ? 'Gemini 1.5 Pro is processing temporal vectors...' : loadingMessages[loadingMsgIdx]}
                                    </p>
                                </div>
                            </motion.div>
                        ) : step === 'done' && generatedVideoUrl ? (
                            <motion.div
                                key="output"
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="w-full max-w-6xl relative z-10 space-y-8"
                            >
                                <div className="group relative rounded-[2rem] overflow-hidden bg-black aspect-video border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] transition-transform duration-700 hover:scale-[1.01]">
                                    {generatedVideoUrl?.startsWith('data:image/') ? (
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
                                            loop
                                            className="w-full h-full object-contain"
                                        />
                                    )}
                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Neural Output Verified</span>
                                        </div>
                                    </div>
                                </div>

                                {generatedVideoUrl?.startsWith('data:image/') && activeMode === 'director' ? (
                                    <div className="flex gap-4">
                                        <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-sm flex items-center justify-between shadow-xl">
                                            <div className="space-y-1">
                                                <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Storyboard Shot Generated</h3>
                                                <p className="text-xs text-white/30">Transfer this image into a Video Reference slot.</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setLocationImg(dataURLtoFile(generatedVideoUrl, 'stage_ref.jpg'));
                                                        setMediaType('video');
                                                    }}
                                                    className="bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-widest py-2 px-4 rounded-lg transition-all border border-white/10"
                                                >
                                                    Use as Stage
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setCharacterImg(dataURLtoFile(generatedVideoUrl, 'character_ref.jpg'));
                                                        setMediaType('video');
                                                    }}
                                                    className="bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-widest py-2 px-4 rounded-lg transition-all border border-white/10"
                                                >
                                                    Use as Person
                                                </button>
                                                <button
                                                    onClick={() => setMediaType('video')}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest py-2 px-5 rounded-xl transition-all shadow-lg ml-2"
                                                >
                                                    Video Mode
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-4">
                                        <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-sm flex items-end gap-4 shadow-xl">
                                            <div className="flex-1 space-y-2">
                                                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] pl-1">Temporal Extension</label>
                                                <input
                                                    type="text"
                                                    value={extendPrompt}
                                                    onChange={(e) => setExtendPrompt(e.target.value)}
                                                    placeholder="Next sequence description..."
                                                    className="w-full bg-[#0a0a0a]/50 border border-white/5 rounded-xl px-5 py-3.5 text-xs text-white placeholder:text-white/10 focus:outline-none focus:border-blue-500/40 transition-all font-mono"
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
                                        className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 backdrop-blur-sm space-y-6"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Temporal Blueprint</h3>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(analysis)}
                                                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all bg-white/5 px-4 py-2 rounded-lg border border-white/5"
                                                >
                                                    <Copy size={12} />
                                                    Copy DNA
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setPrompt(analysis);
                                                        switchMode('director');
                                                    }}
                                                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-all bg-blue-500/10 px-4 py-2 rounded-lg border border-blue-500/20"
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
                className={`w-full aspect-square bg-white/5 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group transition-all ${isDragging ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'border-white/5 hover:border-white/10 hover:bg-white/[0.07]'
                    }`}
            >
                {file ? (
                    <>
                        <img src={URL.createObjectURL(file)} alt={label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                            <span className="text-[9px] font-black uppercase tracking-widest border border-white/20 px-3 py-1 rounded-full text-white">Replace</span>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <ImageIcon className={`w-5 h-5 ${isDragging ? 'text-blue-400' : 'text-white/10'}`} strokeWidth={1.5} />
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