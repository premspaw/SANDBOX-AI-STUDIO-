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

    // Projects
    projects: (() => {
        try {
            const saved = localStorage.getItem('ugc_projects');
            return saved ? JSON.parse(saved) : [{ id: 'default', name: 'Default Project' }];
        } catch {
            return [{ id: 'default', name: 'Default Project' }];
        }
    })(),
    activeProjectId: localStorage.getItem('ugc_active_project_id') || 'default',
    setProjects: (newProjects) => set((state) => {
        const projects = typeof newProjects === 'function' ? newProjects(state.projects) : newProjects;
        localStorage.setItem('ugc_projects', JSON.stringify(projects));
        return { projects };
    }),
    setActiveProjectId: (id) => set(() => {
        localStorage.setItem('ugc_active_project_id', id);
        return { activeProjectId: id };
    }),
    deleteProject: (id) => set((state) => {
        if (id === 'default') return state;
        const projects = state.projects.filter(p => p.id !== id);
        const activeProjectId = state.activeProjectId === id ? 'default' : state.activeProjectId;
        localStorage.setItem('ugc_projects', JSON.stringify(projects));
        localStorage.setItem('ugc_active_project_id', activeProjectId);
        return { projects, activeProjectId };
    }),

    cachedAssets: null,
    cachedAssetsUserId: null,
    isAssetsLoading: false,
    isShowingAuthModal: false,
    activeTab: 'home',
    isMuted: true,
    isAdmin: false,
    showAdminLogin: false,

    setActiveTab: (val) => set({ activeTab: val }),
    setIsMuted: (val) => set({ isMuted: val }),
    setShowingAuthModal: (val) => set({ isShowingAuthModal: val }),
    setIsAdmin: (val) => set({ isAdmin: val }),
    setShowAdminLogin: (val) => set({ showAdminLogin: val }),

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
    // NOTE: cachedAssets and isAssetsLoading are declared once in the initial state block above.
    // setCachedAssets is defined once below in the actions section.

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
    showToast: (message, type = 'error', action = null) => {
        set({ toast: { message, type, action } });
        if (get().toastTimeout) clearTimeout(get().toastTimeout);
        const duration = action ? 7000 : 4000;
        const timeout = setTimeout(() => set({ toast: null }), duration);
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
    // ✅ setCachedAssets is defined once above in the UGC Studio State block (handles userId extraction)
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

    // ✅ updateNodeData is defined once at the bottom of this store (canonical version).
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
        const activeCharacter = get().activeCharacter;
        if (!activeCharacter) {
            get().showToast("No active character selected for storyboarding.", "error");
            return;
        }

        set({ isRendering: true });
        try {
            // Import services dynamically to avoid circular dependencies
            const { 
                generateStoryboardDescriptions, 
                generateCharacterImage, 
                buildConsistencyRefs, 
                expandPrompt 
            } = await import('./services/geminiService.js');
            const { saveStoryboardItem, saveGeneratedAsset } = await import('./services/supabaseService.js');

            // 1. Decompose narrative into scene prompts (default: 4 scenes)
            const scenePrompts = await generateStoryboardDescriptions(narrative, 4);
            if (!scenePrompts || scenePrompts.length === 0) {
                throw new Error("Failed to decompose narrative into scenes.");
            }

            // 2. Prepare visual references for consistency
            const references = await buildConsistencyRefs({
                kit: activeCharacter.identity_kit || get().detailMatrix,
                anchor: get().anchorImage,
                wardrobe: get().wardrobeImage,
                pose: get().poseImage,
            });

            // 3. Spawns 4 optimistic nodes on the canvas arranged in a line
            const centerNodeId = get().activeNodeId;
            const centerNode = get().nodes.find(n => n.id === centerNodeId);
            const startX = centerNode ? centerNode.position.x : 200;
            const startY = centerNode ? centerNode.position.y + 200 : 400;
            
            const nodeIds = [];
            for (let i = 0; i < scenePrompts.length; i++) {
                const nodeId = get().addNode('', `Rendering Scene ${i + 1}...`, true, {
                    x: startX + i * 250,
                    y: startY
                });
                nodeIds.push(nodeId);

                // Add edges linking the scenes sequentially
                if (i > 0) {
                    get().addEdge({
                        source: nodeIds[i - 1],
                        target: nodeId,
                        type: 'neural'
                    });
                } else if (centerNodeId) {
                    get().addEdge({
                        source: centerNodeId,
                        target: nodeId,
                        type: 'neural'
                    });
                }
            }

            // 4. Generate images for the scenes in parallel
            const renderPromises = nodeIds.map(async (nodeId, i) => {
                try {
                    const scenePrompt = scenePrompts[i];
                    
                    // Expand the prompt to match visual style
                    const compiledPrompt = await expandPrompt({
                        subject: activeCharacter.name,
                        subjectDescription: activeCharacter.metadata?.imageAnalysis?.description || activeCharacter.personality || 'the subject',
                        productDetails: get().currentProduct?.description || 'the scene context',
                        userAction: scenePrompt,
                        visualStyle: activeCharacter.visualStyle,
                        duration: 30
                    });

                    const imageResult = await generateCharacterImage({
                        prompt: compiledPrompt,
                        identity_images: references,
                        product_image: get().currentProduct?.image,
                        aspectRatio: get().camera.ratio,
                        resolution: get().camera.resolution
                    });

                    if (imageResult) {
                        get().updateNodeData(nodeId, {
                            image: imageResult,
                            isOptimistic: false,
                            label: `Scene ${i + 1}: ${scenePrompt.substring(0, 30)}...`,
                            resolution: get().camera.resolution
                        });
                        saveStoryboardItem(activeCharacter.id, imageResult, get().nodes.length + i);
                        saveGeneratedAsset(imageResult, 'image', `storyboard_scene_${i + 1}_${Date.now()}.png`);
                    } else {
                        get().deleteNode(nodeId);
                    }
                } catch (err) {
                    console.error(`Failed to render scene ${i + 1}:`, err);
                    get().deleteNode(nodeId);
                }
            });

            await Promise.all(renderPromises);
            get().syncCurrentSession();
            get().showToast("Storyboard generated successfully!", "success");

        } catch (error) {
            console.error("Storyboard generation failed:", error);
            get().showToast(`Storyboard generation failed: ${error.message}`, "error");
        } finally {
            set({ isRendering: false });
        }
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
                const cached = _profileCache[userId];
                const totalShorts = (cached.shorts_balance ?? 50) + (cached.brand_voice?.fractional_shorts ?? 0);
                set({ userProfile: cached, userShorts: totalShorts });
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
                const totalShorts = (data.shorts_balance ?? 50) + (data.brand_voice?.fractional_shorts ?? 0);
                set({ userProfile: data, userShorts: totalShorts });

                if (data.role === 'admin' || data.email === 'premspaw@gmail.com') {
                    (async () => {
                        try {
                            const sessionToken = (await supabase.auth.getSession())?.data?.session?.access_token;
                            if (sessionToken) {
                                const resp = await fetch(getApiUrl('/api/admin/google-key'), {
                                    headers: { 'Authorization': `Bearer ${sessionToken}` }
                                });
                                if (resp.ok) {
                                    const resData = await resp.json();
                                    if (resData.configured) {
                                        window.__ADMIN_GOOGLE_API_KEY_CONFIGURED__ = true;
                                    }
                                }
                            }
                        } catch (keyErr) {
                            console.warn("Failed to fetch admin API key:", keyErr);
                        }
                    })();
                }
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
            const totalShorts = (cached.shorts_balance ?? 50) + (cached.brand_voice?.fractional_shorts ?? 0);
            set({ userShorts: totalShorts });
            return;
        }
        try {
            const { data } = await supabase
                .from('profiles')
                .select('shorts_balance, brand_voice')
                .eq('id', userId)
                .single();
            if (data) {
                const totalShorts = (data.shorts_balance ?? 50) + (data.brand_voice?.fractional_shorts ?? 0);
                set({ userShorts: totalShorts });
            }
        } catch (err) {
            console.error('Store: Fetch balance failed', err);
        }
    },

    // ✅ S3 FIX: Credits are now mutated SERVER-SIDE only via /api/credits/* endpoints.
    // The server verifies the JWT, checks balance, deducts/refunds, and writes the audit log.
    // The frontend store ONLY does an optimistic UI update and reverts on failure.
    spendShorts: async (userId, amount, reason) => {
        const current = get().userShorts;

        // Optimistic UI update — revert if server call fails
        set({ userShorts: current - amount });

        try {
            // Get the current session token to authenticate the server request
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error('No active session');

            const response = await fetch(getApiUrl('/api/credits/spend'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ amount, reason })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Server returned ${response.status}`);
            }

            // Sync store with server-confirmed balance
            if (typeof data.newBalance === 'number') {
                set({ userShorts: data.newBalance });
            }

            return { success: true };
        } catch (err) {
            // Revert optimistic update on failure
            console.error('Store: Spend failed', err);
            set({ userShorts: current });
            return { success: false, reason: err.message || 'transaction_failed' };
        }
    },

    refundShorts: async (userId, amount, reason) => {
        const current = get().userShorts;
        // Optimistic UI update
        set({ userShorts: current + amount });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error('No active session');

            const response = await fetch(getApiUrl('/api/credits/refund'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ amount, reason })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Server returned ${response.status}`);
            }

            // Sync store with server-confirmed balance
            if (typeof data.newBalance === 'number') {
                set({ userShorts: data.newBalance });
            }
        } catch (err) {
            console.error('Store: Refund failed', err);
            set({ userShorts: current }); // Revert on failure
        }
    },

    updateNodeData: (nodeId, newData) => {
        set((state) => ({
            nodes: state.nodes.map((node) =>
                node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
            ),
        }));
    },
}));

if (typeof window !== 'undefined') {
    window.toast = (message, type = 'error') => useAppStore.getState().showToast(message, type);
}
