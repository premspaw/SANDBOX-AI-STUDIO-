import { useState, useEffect } from 'react';
import { getApiUrl } from '../config/apiConfig';
import { supabase } from '../lib/supabase';
import { useShorts } from './useShorts';

export function useAvatarStudio(userId = 'anon') {
    const { refresh: refreshShorts } = useShorts() || { refresh: () => {} };

    // --- PHOTO STATE ---
    const [refImageUrl, setRefImageUrl] = useState('');
    const [refPreview, setRefPreview] = useState('');
    const [uploadingRef, setUploadingRef] = useState(false);

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
    const [aspectRatio, setAspectRatio] = useState('9:16'); // '9:16', '16:9', '1:1'

    // --- GENERATION ENGINE STATE ---
    const [generating, setGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState('');
    const [activePrompt, setActivePrompt] = useState('');
    const [error, setError] = useState('');

    // --- GALLERY / HISTORY STATE ---
    const [gallery, setGallery] = useState([]);

    // --- LOAD GALLERY FROM DB ON MOUNT ---
    const fetchGallery = async () => {
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
    };

    useEffect(() => {
        fetchGallery();
    }, [userId]);

    // --- PHOTO UPLOAD UTILITY ---
    const uploadRef = async (file, type = 'character') => {
        const setPreview = type === 'wardrobe' ? setWardrobeRefPreview : (type === 'prop' ? setPropRefPreview : setRefPreview);
        const setUrl = type === 'wardrobe' ? setWardrobeRefUrl : (type === 'prop' ? setPropRefUrl : setRefImageUrl);
        const setUploading = type === 'wardrobe' ? setUploadingWardrobe : (type === 'prop' ? setUploadingProp : setUploadingRef);

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
                }
            } catch (err) {
                console.error(`[Avatar upload-ref failed for ${type}]:`, err);
                setError(`Upload failed: ${err.message}`);
                setPreview('');
            } finally {
                setUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // --- GENERATE BOARD ---
    const generateBoard = async () => {
        if (!refImageUrl && !wardrobeRefUrl && !propRefUrl) {
            setError('Please upload at least one reference image first.');
            return;
        }

        setGenerating(true);
        setError('');
        setGeneratedImage('');
        setActivePrompt('');

        try {
            console.log(`[Avatar Studio] Generating ${activeBoard} BOARD using model: ${activeModel}...`);
            const resp = await fetch(getApiUrl('/api/avatar/generate-board'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    refImageUrl,
                    wardrobeRefUrl,
                    propRefUrl,
                    boardType: activeBoard,
                    boardMeta,
                    additionalContext,
                    userId,
                    model: activeModel,
                    aspectRatio
                })
            });

            const result = await resp.json();
            if (!resp.ok) throw new Error(result.error || 'Failed to generate reference board.');

            if (result.outputUrl) {
                setGeneratedImage(result.outputUrl);
                setActivePrompt(result.prompt);
                console.log('[Avatar Studio] Success! R2 URL:', result.outputUrl);
                
                // Refresh credits balance in UI and sync gallery
                refreshShorts();
                fetchGallery();
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
            if (supabase) {
                const assetType = isCharBoard ? 'character' : 'image';

                // Format the name nicely
                let assetName = '';
                if (isCharBoard) {
                    const age = (boardMeta.age || '').toString().trim();
                    assetName = `NAME: ${name.toUpperCase()}, AGE: ${age}`;
                } else {
                    assetName = `${name.toUpperCase()} — ${activeBoard} Board`;
                }

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
            const resp = await fetch(generatedImage);
            if (!resp.ok) throw new Error('Response was not OK');
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.warn('[AvatarStudio] Blob download failed, falling back to direct link:', err);
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
