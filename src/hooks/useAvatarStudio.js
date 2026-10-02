import { useState, useEffect, useCallback } from 'react';
import { getApiUrl, resolveUrl } from '../config/apiConfig';
import { supabase } from '../lib/supabase';
import { useShorts } from './useShorts';
import { useAppStore } from '../store';
import { consumeFreeImage } from '../utils/freeTierTracker';

export function useAvatarStudio(userId = 'anon') {
    const { refresh: refreshShorts } = useShorts() || { refresh: () => {} };

    // --- PHOTO STATE ---
    const [refImageUrl, setRefImageUrl] = useState('');
    const [refPreview, setRefPreview] = useState('');
    const [uploadingRef, setUploadingRef] = useState(false);

    const [leftProfileRefUrl, setLeftProfileRefUrl] = useState('');
    const [leftProfileRefPreview, setLeftProfileRefPreview] = useState('');
    const [uploadingLeftProfile, setUploadingLeftProfile] = useState(false);

    const [rightProfileRefUrl, setRightProfileRefUrl] = useState('');
    const [rightProfileRefPreview, setRightProfileRefPreview] = useState('');
    const [uploadingRightProfile, setUploadingRightProfile] = useState(false);

    const [wardrobeRefUrl, setWardrobeRefUrl] = useState('');
    const [wardrobeRefPreview, setWardrobeRefPreview] = useState('');
    const [uploadingWardrobe, setUploadingWardrobe] = useState(false);

    const [propRefUrl, setPropRefUrl] = useState('');
    const [propRefPreview, setPropRefPreview] = useState('');
    const [uploadingProp, setUploadingProp] = useState(false);

    // --- BOARD SELECTION STATE ---
    const [activeBoard, setActiveBoard] = useState('CHARACTER');
    const [additionalContext, setAdditionalContext] = useState('');

    // --- BOARD-SPECIFIC METADATA (name, age, etc. per board type) ---
    const [boardMeta, setBoardMeta] = useState({});
    const setBoardMetaField = (key, value) => setBoardMeta(prev => ({ ...prev, [key]: value }));

    // Reset boardMeta whenever board type changes
    const handleSetActiveBoard = (id) => {
        setActiveBoard(id);
        setBoardMeta({});
    };

    // --- GENERATION ENGINE SELECTION ---
    const [activeModel, setActiveModel] = useState('gpt2'); // 'gpt2' or 'banana'

    // --- ASPECT RATIO SELECTION ---
    const [aspectRatio, setAspectRatio] = useState('16:9'); // '9:16', '16:9', '1:1'

    // --- GENERATION ENGINE STATE ---
    const [generating, setGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState('');
    const [activePrompt, setActivePrompt] = useState('');
    const [error, setError] = useState('');

    // --- GALLERY / HISTORY STATE ---
    const [gallery, setGallery] = useState([]);

    // --- LOAD GALLERY FROM DB ON MOUNT ---
    const fetchGallery = useCallback(async () => {
        if (!supabase || userId === 'anon') return;
        try {
            console.log(`[Avatar Studio] Loading history for user ${userId}...`);
            const { data, error: err } = await supabase
                .from('avatar_generations')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (err) throw err;
            if (data) setGallery(data);
        } catch (err) {
            console.warn('[Avatar Studio] Failed to fetch gallery history:', err.message);
        }
    }, [userId]);

    useEffect(() => {
        fetchGallery();
    }, [fetchGallery]);

    // --- PHOTO UPLOAD UTILITY ---
    const uploadRef = async (file, type = 'character') => {
        let setPreview = setRefPreview;
        let setUrl = setRefImageUrl;
        let setUploading = setUploadingRef;

        if (type === 'wardrobe') {
            setPreview = setWardrobeRefPreview;
            setUrl = setWardrobeRefUrl;
            setUploading = setUploadingWardrobe;
        } else if (type === 'prop') {
            setPreview = setPropRefPreview;
            setUrl = setPropRefUrl;
            setUploading = setUploadingProp;
        } else if (type === 'left_profile') {
            setPreview = setLeftProfileRefPreview;
            setUrl = setLeftProfileRefUrl;
            setUploading = setUploadingLeftProfile;
        } else if (type === 'right_profile') {
            setPreview = setRightProfileRefPreview;
            setUrl = setRightProfileRefUrl;
            setUploading = setUploadingRightProfile;
        }

        if (!file) {
            setUrl('');
            setPreview('');
            return;
        }
        setUploading(true);
        setError('');
        
        // Show immediate local preview
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result;
            setPreview(base64);

            try {
                const resp = await fetch(getApiUrl('/api/avatar/upload-ref'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64, userId })
                });

                const result = await resp.json();
                if (!resp.ok) throw new Error(result.error || 'Failed to upload photo.');
                
                if (result.url) {
                    setUrl(result.url);
                    console.log(`[Avatar Studio] R2 ${type} photo saved:`, result.url);
                } else {
                    setUrl(base64);
                }
            } catch (err) {
                console.warn(`[Avatar upload-ref fallback to base64 for ${type}]:`, err);
                setUrl(base64);
            } finally {
                setUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // --- GENERATE BOARD ---
    const generateBoard = async (overrideOptions = {}) => {
        setGenerating(true);
        setError('');
        setGeneratedImage('');
        setActivePrompt('');

        const targetBoard = overrideOptions.boardType || activeBoard;
        const targetModel = overrideOptions.model || activeModel;
        const targetAspect = overrideOptions.aspectRatio || aspectRatio;
        const targetContext = overrideOptions.additionalContext !== undefined ? overrideOptions.additionalContext : additionalContext;
        const targetMeta = overrideOptions.boardMeta || boardMeta;
        const targetRefUrl = overrideOptions.refImageUrl !== undefined ? overrideOptions.refImageUrl : refImageUrl;
        const targetLeftProfile = overrideOptions.leftProfileRefUrl !== undefined ? overrideOptions.leftProfileRefUrl : leftProfileRefUrl;
        const targetRightProfile = overrideOptions.rightProfileRefUrl !== undefined ? overrideOptions.rightProfileRefUrl : rightProfileRefUrl;
        const targetWardrobe = overrideOptions.wardrobeRefUrl !== undefined ? overrideOptions.wardrobeRefUrl : wardrobeRefUrl;
        const targetProp = overrideOptions.propRefUrl !== undefined ? overrideOptions.propRefUrl : propRefUrl;

        try {
            console.log(`[Avatar Studio] Generating ${targetBoard} BOARD using model: ${targetModel}...`);
            const resp = await fetch(getApiUrl('/api/avatar/generate-board'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    refImageUrl: targetRefUrl,
                    leftProfileRefUrl: targetLeftProfile,
                    rightProfileRefUrl: targetRightProfile,
                    wardrobeRefUrl: targetWardrobe,
                    propRefUrl: targetProp,
                    boardType: targetBoard,
                    boardMeta: targetMeta,
                    additionalContext: targetContext,
                    userId,
                    model: targetModel,
                    aspectRatio: targetAspect,
                    isFreeTier: !!overrideOptions.isFreeTier
                })
            });

            const result = await resp.json();
            if (!resp.ok) throw new Error(result.error || 'Failed to generate reference board.');

            if (result.outputUrl) {
                if (overrideOptions.isFreeTier) {
                    consumeFreeImage(userId);
                    console.log('[Avatar Studio] 🎁 Consumed 1 free Nano Banana 2 image credit');
                }
                setGeneratedImage(result.outputUrl);
                setActivePrompt(result.prompt);
                console.log('[Avatar Studio] Success! R2 URL:', result.outputUrl);
                
                // Auto-sync into Universal Project Box for active project
                try {
                    const catMap = {
                        CHARACTER: 'character',
                        POSE: 'character',
                        CREATURE: 'character',
                        LOCATION: 'location',
                        SHOT: 'location',
                        OBJECT: 'prop',
                        PROP: 'prop'
                    };
                    const targetCategory = catMap[targetBoard] || 'character';
                    const sheetName = (targetMeta.name || '').trim() || (
                        targetBoard === 'CHARACTER' ? 'Character Turnaround' :
                        targetBoard === 'LOCATION' ? 'Cinematic Location' :
                        (targetBoard === 'OBJECT' || targetBoard === 'PROP') ? 'Studio Prop' : `${targetBoard} Board`
                    );

                    useAppStore.getState().addProjectAsset({
                        type: 'image',
                        category: targetCategory,
                        url: result.outputUrl,
                        name: sheetName,
                        prompt: result.prompt,
                        boardType: targetBoard,
                        metadata: {
                            boardType: targetBoard,
                            boardMeta: targetMeta
                        }
                    });

                    // Sync to Unified Gallery
                    useAppStore.getState().addUnifiedAsset({
                        url: result.outputUrl,
                        ts: Date.now(),
                        aspect: targetAspect,
                        type: 'image',
                        folder: 'avatar',
                        prompt: result.prompt,
                        name: sheetName
                    });
                } catch (syncErr) {
                    console.debug('[Avatar Studio] Project Box auto-save fallback:', syncErr);
                }

                // Refresh credits balance in UI and sync gallery
                refreshShorts();
                fetchGallery();
                useAppStore.getState().fetchUnifiedGallery(userId);
            }
        } catch (err) {
            console.error('[Avatar generate-board failed]:', err);
            setError(err.message || 'Generation failed. Check console.');
        } finally {
            setGenerating(false);
        }
    };

    // --- ACTION UTILITIES ---
    const [saving, setSaving] = useState(false);
    const [savedOk, setSavedOk] = useState(false);

    const saveToGallery = async () => {
        if (!generatedImage || saving) return;

        // Validation for all boards
        const name = (boardMeta.name || '').toString().trim();
        if (!name) {
            const labelMap = {
                CHARACTER: 'Character Name',
                POSE: 'Character Name',
                SHOT: 'Scene Name',
                LOCATION: 'Location Name',
                OBJECT: 'Product / Object Name',
                CREATURE: 'Creature Name'
            };
            const label = labelMap[activeBoard] || 'Name';
            setError(`${label} is required to save.`);
            return;
        }

        const isCharBoard = activeBoard === 'CHARACTER';
        if (isCharBoard) {
            const age = (boardMeta.age || '').toString().trim();
            if (!age) {
                setError('Age is required to save character.');
                return;
            }
        }

        setSaving(true);
        setSavedOk(false);
        setError('');
        try {
            const assetType = isCharBoard ? 'character' : 'image';
            const age = (boardMeta.age || '').toString().trim();
            const assetName = isCharBoard
                ? `NAME: ${name.toUpperCase()}, AGE: ${age}`
                : `${name.toUpperCase()} — ${activeBoard} Board`;

            if (supabase) {
                const { error: dbErr } = await supabase
                    .from('assets')
                    .insert({
                        user_id: userId === 'anon' ? null : userId,
                        type: assetType,
                        url: generatedImage,
                        name: assetName,
                        metadata: {
                            boardType: activeBoard,
                            boardMeta,
                            model: activeModel,
                            aspectRatio,
                            prompt: activePrompt,
                            source: 'avatar_studio'
                        }
                    });
                if (dbErr) {
                    console.warn('[AvatarStudio] assets insert warning:', dbErr.message);
                    // Still show success to user — image exists in avatar_generations
                }
            }

            // Sync to Project Box as well
            try {
                useAppStore.getState().addProjectAsset({
                    type: isCharBoard ? 'character' : 'image',
                    category: isCharBoard ? 'character' : (activeBoard === 'LOCATION' ? 'location' : (activeBoard === 'OBJECT' ? 'prop' : 'character')),
                    url: generatedImage,
                    name: assetName,
                    prompt: activePrompt,
                    metadata: {
                        boardType: activeBoard,
                        boardMeta
                    }
                });
            } catch (boxErr) {
                console.debug('[AvatarStudio] Project Box sync fallback:', boxErr);
            }

            fetchGallery();
            setSavedOk(true);
            setTimeout(() => setSavedOk(false), 3000);
        } catch (err) {
            console.error('[AvatarStudio] saveToGallery error:', err);
            setError(err.message || 'Saving to assets failed.');
        } finally {
            setSaving(false);
        }
    };

    const downloadImage = async () => {
        if (!generatedImage) return;
        const nameClean = (boardMeta.name || activeBoard).toLowerCase().replace(/\s+/g, '-');
        const timestamp = Date.now();
        const filename = `zerolens-${nameClean}-board-${timestamp}.png`;
        
        try {
            // For base64 or blob URLs, download directly in the client browser
            if (generatedImage.startsWith('data:') || generatedImage.startsWith('blob:')) {
                const a = document.createElement('a');
                a.href = generatedImage;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                return;
            }

            // For external URLs, route through backend proxy with 'download' query parameter to force download immediately to PC
            const downloadUrl = getApiUrl(`/api/proxy-image?url=${encodeURIComponent(generatedImage)}&download=${encodeURIComponent(filename)}`);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) {
            console.warn('[AvatarStudio] Proxy download failed, falling back to direct link:', err);
            const a = document.createElement('a');
            a.href = generatedImage;
            a.download = filename;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    return {
        // photo
        refImageUrl,
        refPreview,
        uploadRef,
        uploadingRef,
        
        // left profile
        leftProfileRefUrl,
        leftProfileRefPreview,
        uploadingLeftProfile,
        setLeftProfileRefUrl,
        setLeftProfileRefPreview,

        // right profile
        rightProfileRefUrl,
        rightProfileRefPreview,
        uploadingRightProfile,
        setRightProfileRefUrl,
        setRightProfileRefPreview,

        // wardrobe
        wardrobeRefUrl,
        wardrobeRefPreview,
        uploadingWardrobe,

        // prop
        propRefUrl,
        propRefPreview,
        uploadingProp,

        // setters for history/gallery restoration
        setRefImageUrl,
        setRefPreview,
        setWardrobeRefUrl,
        setWardrobeRefPreview,
        setPropRefUrl,
        setPropRefPreview,
        
        // board
        activeBoard,
        setActiveBoard: handleSetActiveBoard,
        additionalContext, setAdditionalContext,
        boardMeta, setBoardMetaField,
        
        // model selection
        activeModel, setActiveModel,
        
        // aspect ratio
        aspectRatio, setAspectRatio,
        
        // generation engine
        generating,
        generatedImage, setGeneratedImage,
        activePrompt, setActivePrompt,
        error,
        generateBoard,
        
        // gallery
        gallery,
        saveToGallery,
        saving,
        savedOk,
        downloadImage,
        fetchGallery
    };
}
