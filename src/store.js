import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';
import { getApiUrl } from './config/apiConfig';
import { supabase } from './lib/supabase';

const _profileCache = {};
const _profileCacheAt = {};
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useAppStore = create((set, get) => ({
    // Character Info
    name: 'UNNAMED_CONSTRUCT',
    age: '',
    origin: '',
    backstory: '',
    personality: '',
    voiceDescription: '',
    catchphrases: [],
    selectedLanguage: 'en-US',
    anchorImage: null,
    imageAnalysis: null,
    detailMatrix: null,
    activeCharacter: null,
    userShorts: 50,
    userProfile: null,
    cachedAssets: null,
    cachedAssetsUserId: null,
    isAssetsLoading: false,
    isShowingAuthModal: false,
    activeTab: 'home',
    isMuted: true,

    setActiveTab: (val) => set({ activeTab: val }),
    setIsMuted: (val) => set({ isMuted: val }),
    setShowingAuthModal: (val) => set({ isShowingAuthModal: val }),

    clearSession: () => {
        set({
            userProfile: null,
            userShorts: 0,
            cachedAssets: null,
            cachedAssetsUserId: null,
            nodes: [],
            edges: [],
            activeNodeId: null,
            focusedNodeId: null,
            anchorImage: null,
            imageAnalysis: null,
            detailMatrix: null,
            activeCharacter: null,
            currentWardrobe: '',
            currentProduct: { image: null, description: '', labels: [], colors: [] },
            currentLocation: null,
            lastGeneratedPrompt: '',
            universeBible: {
                characters: {},
                locations: {},
                rules: [],
                history: [],
                cachedContentName: null
            }
        });
        // Clear local storage surgical traces if any
        localStorage.removeItem('hidden_filmstrip_frames');
        localStorage.removeItem('recent_filmstrip_frames');
        localStorage.removeItem('active_image_frame_id');
    },

    // Director Settings
    actionScript: '',
    wardrobeImage: null,
    poseImage: null,
    mode: 'STILL', // STILL | ORBIT
    isRendering: false,
    isSyncing: false,
    repairSession: { active: false },
    lastGeneratedPrompt: '', // For UI visibility
    camera: {
        lens: '24mm Cinematic',
        lighting: 'Studio Softbox',
        angle: 'Eye Level',
        ratio: '1:1',
        resolution: '1K'
    },

    // UGC Studio State
    currentWardrobe: '',
    currentProduct: { image: null, description: '', labels: [], colors: [] },
    currentLocation: null,

    setCachedAssets: (payload) => {
        if (!payload) return set({ cachedAssets: null, cachedAssetsUserId: null });
        const { userId = null, ...assets } = payload;
        set({ cachedAssets: assets, cachedAssetsUserId: userId });
    },

    // React Flow State
    nodes: [],
    edges: [],
    runtimeMode: 'SERVER', // 'SERVER' | 'STANDALONE'
    apiKey: '',
    activeNodeId: null,
    viewMode: 'ORBIT', // ORBIT | FOCUS
    focusedNodeId: null,

    // Neural Universe Bible (Long-Context Management)
    universeBible: {
        characters: {}, // Map of characterId -> full profile
        locations: {},  // Map of locationId -> descriptions
        rules: [],      // Global narrative/visual constraints
        history: [],    // Recent generation chronological log
        cachedContentName: null // The active Google Gemini Context Cache ID
    },

    // Toast State
    toast: null,
    toastTimeout: null,
    showToast: (message, type = 'error') => {
        set({ toast: { message, type } });
        if (get().toastTimeout) clearTimeout(get().toastTimeout);
        const timeout = setTimeout(() => set({ toast: null }), 4000);
        set({ toastTimeout: timeout });
    },
    hideToast: () => {
        set({ toast: null });
        if (get().toastTimeout) clearTimeout(get().toastTimeout);
    },

    // Actions
    updateUniverseBible: async (update) => {
        set((state) => ({
            universeBible: { ...state.universeBible, ...update }
        }));

        // Background task: Whenever the Universe Bible updates, rebuild the Neural Vault cache
        try {
            const { cacheUniverseBible } = await import('./services/geminiService.js');
            const cacheName = await cacheUniverseBible(get().universeBible);
            if (cacheName) {
                set((state) => ({
                    universeBible: { ...state.universeBible, cachedContentName: cacheName }
                }));
            }
        } catch (e) {
            console.error("Failed to auto-cache Universe Bible", e);
        }
    },
    setAnchorImage: (img) => set({ anchorImage: img }),
    setImageAnalysis: (analysis) => set({ imageAnalysis: analysis }),
    setDetailMatrix: (matrix) => set({ detailMatrix: matrix }),
    setWardrobeImage: (img) => set({ wardrobeImage: img }),
    setPoseImage: (img) => set({ poseImage: img }),
    setMode: (mode) => set({ mode }),
    setRepairSession: (session) => set({ repairSession: session }),
    setCurrentWardrobe: (text) => set({ currentWardrobe: text }),
    setCurrentProduct: (data) => set({ currentProduct: data }),
    setCurrentLocation: (location) => set({ currentLocation: location }),
    clearCurrentLocation: () => set({ currentLocation: null }),
    setIsAssetsLoading: (loading) => set({ isAssetsLoading: loading }),

    // Standalone / API Actions
    setApiKey: (key) => {
        set({ apiKey: key });
        if (typeof window !== 'undefined') {
            window.__VEO_API_KEY__ = key;
        }
    },
    setRuntimeMode: (mode) => set({ runtimeMode: mode }),
    checkRuntimeMode: async () => {
        try {
            const resp = await fetch(getApiUrl('/api/forge/health'));
            if (resp.ok) {
                set({ runtimeMode: 'SERVER' });
            } else {
                set({ runtimeMode: 'STANDALONE' });
            }
        } catch (e) {
            set({ runtimeMode: 'STANDALONE' });
        }
    },

    // Dual-Mode Actions
    setOrbitMode: () => set({ viewMode: 'ORBIT', focusedNodeId: null }),
    setFocusMode: (nodeId) => set({ viewMode: 'FOCUS', focusedNodeId: nodeId }),
    toggleViewMode: () => set((state) => ({
        viewMode: state.viewMode === 'ORBIT' ? 'FOCUS' : 'ORBIT'
    })),

    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },
    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },
    onConnect: (connection) => {
        set({
            edges: addEdge(connection, get().edges),
        });
    },

    addNode: (image, label, isOptimistic = false, position = null) => {
        const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const finalPosition = position || {
            x: 200 + (get().nodes.length * 50) % 800,
            y: 200 + (get().nodes.length * 20) % 400
        };
        const newNode = {
            id,
            type: 'identity',
            position: finalPosition,
            data: {
                image,
                label,
                isOptimistic,
                onDelete: (nodeId) => get().deleteNode(nodeId),
                onFocus: (nodeId) => set({ activeNodeId: nodeId }),
                onUpscale: (nodeId, targetRes) => get().upscaleNodeImage(nodeId, targetRes)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addEdge: (data) => {
        const id = `edge-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newEdge = {
            id,
            transparent: true,
            style: { stroke: '#8b5cf6', strokeWidth: 2, opacity: 0.6 },
            animated: true,
            ...data
        };
        set({ edges: [...get().edges, newEdge] });
        return id;
    },

    updateNodeData: (id, data) => {
        set({
            nodes: get().nodes.map(node =>
                node.id === id ? { ...node, data: { ...node.data, ...data } } : node
            )
        });
    },
    upscaleNodeImage: async (id, targetRes) => {
        const node = get().nodes.find(n => n.id === id);
        if (!node || !node.data.image) return;

        get().updateNodeData(id, { isOptimistic: true, label: `UPSCaling to ${targetRes}...` });

        try {
            const { upscaleImage } = await import('./services/geminiService');
            const highResImage = await upscaleImage(node.data.image, targetRes);
            if (highResImage) {
                get().updateNodeData(id, {
                    image: highResImage,
                    resolution: targetRes,
                    isOptimistic: false,
                    label: node.data.label.replace('UPSCaling...', '')
                });
            }
        } catch (err) {
            console.error('Upscale failed:', err);
            get().updateNodeData(id, { isOptimistic: false });
        }
    },

    deleteNode: (id) => {
        set({
            nodes: get().nodes.filter(node => node.id !== id),
            edges: get().edges.filter(edge => edge.source !== id && edge.target !== id)
        });
    },

    purgeVault: () => {
        set({
            nodes: [],
            edges: [],
            activeNodeId: null,
            actionScript: '',
            wardrobeImage: null,
            poseImage: null,
            lastGeneratedPrompt: ''
        });
    },

    generateStoryboard: async (narrative) => {
        set({ isRendering: true });
        // Mocking storyboard decomposition logic
        console.log("Generating storyboard for:", narrative);
        // This usually calls geminiService.generateStoryboardDescriptions
        set({ isRendering: false });
    },

    syncCurrentSession: async () => {
        set({ isSyncing: true });
        await new Promise(r => setTimeout(r, 1000));
        set({ isSyncing: false });
    },

    setState: (fn) => set(fn),

    saveCharacter: async (character) => {
        console.log("Saving character to store:", character);

        // Normalize character for storage to match Supabase schema
        const normalized = {
            id: character.id,
            name: character.name || character.title || 'UNNAMED_CONSTRUCT',
            visual_style: character.visual_style || character.visualStyle || 'Realistic',
            image: character.image || character.photo || character.anchor_image,
            anchor_image: character.anchor_image || character.image || character.photo,
            identity_kit: character.identity_kit || character.identityKit || {},
            timestamp: character.timestamp || new Date().toISOString(),
            metadata: character.metadata || character
        };

        // --- LOCAL PERSISTENCE MIRROR (Emergency Fallback, per-user scoped) ---
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const vaultKey = `local_vault:${user?.id || 'anonymous'}`;
            const raw = localStorage.getItem(vaultKey);
            let vault = raw ? JSON.parse(raw) : [];

            // Check if already exists to prevent duplicates
            const existingIndex = vault.findIndex(c => c.id === normalized.id);
            if (existingIndex !== -1) {
                vault[existingIndex] = normalized; // Update existing
            } else {
                vault.unshift(normalized); // Add to top
            }

            // Keep only last 20 characters locally to prevent localStorage bloat
            localStorage.setItem(vaultKey, JSON.stringify(vault.slice(0, 20)));
            console.log("[STORE] Character mirrored to localStorage.");
        } catch (e) {
            console.error("[STORE] Local vault sync failed:", e);
        }
    },

    addInfluencerNode: (position = { x: 200, y: 200 }) => {
        const id = `influencer-${Date.now()}`;
        const { activeCharacter, anchorImage } = get();
        const kit = activeCharacter?.identity_kit || activeCharacter?.identityKit || {};
        const kitImages = activeCharacter?.kitImages || activeCharacter?.kit_images || {};
        const merged = { ...kitImages, ...kit };

        const newNode = {
            id,
            type: 'influencer',
            position,
            data: {
                label: activeCharacter?.name || 'Model_01',
                image: anchorImage || activeCharacter?.image || activeCharacter?.photo || merged.anchor,
                identityProfile: {
                    identityLock: !!(anchorImage || merged.anchor),
                    anchors: {
                        side: merged.profile || merged.angle_1 || anchorImage || activeCharacter?.image || '',
                        full: merged.fullBody || merged.full_body || ''
                    },
                    poses: activeCharacter?.poses || [
                        'editorial full body',
                        'side profile',
                        'walking motion',
                        'over shoulder',
                        'hero stance',
                        'relaxed pose'
                    ],
                    defaultExpression: activeCharacter?.defaultExpression || 'confident'
                },
                origin: activeCharacter?.origin || '',
                visualStyle: activeCharacter?.visual_style || activeCharacter?.visualStyle || '',
                rawData: activeCharacter || {},
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addSeedanceNode: (position = { x: 700, y: 400 }) => {
        const id = `seedance-${Date.now()}`;
        const newNode = {
            id,
            type: 'seedance',
            position,
            data: {
                label: 'SEEDANCE_2.0',
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addSeedance15ProNode: (position = { x: 700, y: 400 }) => {
        const id = `seedance15pro-${Date.now()}`;
        const newNode = {
            id,
            type: 'seedance15pro',
            position,
            data: {
                label: 'SEEDANCE_1.5_PRO',
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addNanoBananaNode: (position = { x: 700, y: 400 }) => {
        const id = `banana-${Date.now()}`;
        const newNode = {
            id,
            type: 'nano_banana',
            position,
            data: {
                label: 'NANO_BANANA_2',
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addOutputNode: ({ sourceId, url, model = 'OUTPUT', position }) => {
        const id = `output-${Date.now()}`;
        const newNode = {
            id,
            type: 'generated_output',
            position,
            data: {
                url,
                model,
                onDelete: (id) => get().deleteNode(id)
            }
        };
        
        const newEdge = {
            id: `e-${sourceId}-${id}`,
            source: sourceId,
            target: id,
            type: 'neural'
        };

        set({ 
            nodes: [...get().nodes, newNode], 
            edges: [...get().edges, newEdge],
            activeNodeId: id 
        });
        return id;
    },

    setActiveCharacter: (character) => {
        const anchorImage = character.anchor_image || character.anchorImage || character.image || character.photo || character.identity_kit?.anchor || null;
        set({
            name: character.name || 'UNNAMED_CONSTRUCT',
            origin: character.origin || '',
            backstory: character.backstory || '',
            personality: character.personality || '',
            voiceDescription: character.voice_description || '',
            catchphrases: character.catchphrases ? (typeof character.catchphrases === 'string' ? character.catchphrases.split(',') : character.catchphrases) : [],
            anchorImage,
            imageAnalysis: character.metadata?.imageAnalysis || null,
            detailMatrix: character.identity_kit || null,
            activeCharacter: character
        });

        // Sync to Universe Bible
        const bib = get().universeBible;
        bib.characters[character.id || 'current'] = {
            name: character.name,
            origin: character.origin,
            backstory: character.backstory,
            personality: character.personality,
            appearance: character.identity_kit || character.metadata?.imageAnalysis
        };
        get().updateUniverseBible({ characters: bib.characters });
    },

    setUserShorts: (shorts) => set({ userShorts: shorts }),
    setUserProfile: (profile) => set({ userProfile: profile }),

    fetchUserProfile: async (userId) => {
        try {
            const now = Date.now();
            if (_profileCache[userId] && (now - (_profileCacheAt[userId] || 0)) < PROFILE_CACHE_TTL) {
                set({ userProfile: _profileCache[userId], userShorts: _profileCache[userId].shorts_balance ?? 50 });
                return;
            }

            const { data: authData } = await supabase.auth.getUser();
            const authUser = authData?.user;

            let { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) throw error;

            if (!data && authUser && authUser.id === userId) {
                const payload = {
                    id: authUser.id,
                    email: authUser.email || null,
                    full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
                    marketing_emails: true,
                    security_alerts: true,
                    two_factor_enabled: false,
                    tier: 'FREE',
                    updated_at: new Date().toISOString(),
                };

                const { error: upsertError } = await supabase
                    .from('profiles')
                    .upsert(payload, { onConflict: 'id' });

                if (upsertError) throw upsertError;

                const result = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                data = result.data;
                error = result.error;
                if (error) throw error;
            }

            if (data) {
                _profileCache[userId] = data;
                _profileCacheAt[userId] = Date.now();
                set({ userProfile: data, userShorts: data.shorts_balance ?? 50 });
            }
        } catch (err) {
            console.error('Store: Fetch profile failed', err);
        }
    },

    fetchBalance: async (userId) => {
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            userId = user.id;
        }
        const cached = _profileCache[userId];
        if (cached) {
            set({ userShorts: cached.shorts_balance ?? cached.credits ?? 50 });
            return;
        }
        try {
            const { data } = await supabase
                .from('profiles')
                .select('shorts_balance')
                .eq('id', userId)
                .single();
            if (data) set({ userShorts: data.shorts_balance ?? 50 });
        } catch (err) {
            console.error('Store: Fetch balance failed', err);
        }
    },

    spendShorts: async (userId, amount, reason) => {
        const current = get().userShorts;

        // Optimistic update
        set({ userShorts: current - amount });

        try {
            // Deduct via RPC or direct update if permitted
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ shorts_balance: current - amount })
                .eq('id', userId);

            if (updateError) throw updateError;

            await supabase.from('shorts_transactions').insert({
                user_id: userId,
                amount: -amount,
                action_type: reason,
                created_at: new Date().toISOString()
            });
            return { success: true };
        } catch (err) {
            // Revert on failure
            console.error('Store: Spend failed', err);
            set({ userShorts: current });
            return { success: false, reason: 'transaction_failed' };
        }
    },

    refundShorts: async (userId, amount, reason) => {
        const current = get().userShorts;
        set({ userShorts: current + amount });

        try {
            await supabase
                .from('profiles')
                .update({ shorts_balance: current + amount })
                .eq('id', userId);

            await supabase.from('shorts_transactions').insert({
                user_id: userId,
                amount,
                action_type: `refund_${reason}`,
                created_at: new Date().toISOString()
            });
        } catch (err) {
            console.error('Store: Refund failed', err);
            set({ userShorts: current });
        }
    },
}));

if (typeof window !== 'undefined') {
    window.toast = (message, type = 'error') => useAppStore.getState().showToast(message, type);
}
