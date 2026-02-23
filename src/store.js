import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';

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

    // React Flow State
    nodes: [],
    edges: [],
    activeNodeId: null,
    viewMode: 'ORBIT', // ORBIT | FOCUS
    focusedNodeId: null,

    // Neural Universe Bible (Long-Context Management)
    universeBible: {
        characters: {}, // Map of characterId -> full profile
        locations: {},  // Map of locationId -> descriptions
        rules: [],      // Global narrative/visual constraints
        history: []     // Recent generation chronological log
    },

    // Actions
    updateUniverseBible: (update) => {
        set((state) => ({
            universeBible: { ...state.universeBible, ...update }
        }));
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
            const { upscaleImage } = await import('../geminiService');
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
    },

    addDialogueNode: (position = { x: 100, y: 100 }) => {
        const id = `dialogue-${Date.now()}`;
        const newNode = {
            id,
            type: 'dialogue',
            position,
            data: {
                script: 'Enter dialogue script...',
                label: 'VOICE_TRACK',
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addInfluencerNode: (position = { x: 200, y: 200 }) => {
        const id = `influencer-${Date.now()}`;
        const { activeCharacter, anchorImage } = get();
        const newNode = {
            id,
            type: 'influencer',
            position,
            data: {
                label: activeCharacter?.name || 'AGENT_CORE',
                image: anchorImage,
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addVideoNode: (videoUrl, label, aspectRatio, position = { x: 300, y: 300 }) => {
        const id = `video-${Date.now()}`;
        const newNode = {
            id,
            type: 'video',
            position,
            data: {
                videoUrl,
                label,
                aspectRatio,
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    setActiveCharacter: (character) => {
        const anchorImage = character.identity_kit?.anchor || character.image || character.photo || null;
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

    updateNodeData: (nodeId, newData) => {
        set((state) => ({
            nodes: state.nodes.map((node) =>
                node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
            ),
        }));
    },

    addCameraNode: (position = { x: 300, y: 300 }) => {
        const id = `camera-${Date.now()}`;
        const newNode = {
            id,
            type: 'camera',
            position,
            data: {
                label: 'CAMERA_UNIT',
                movement: 'PHASE_SHIFT',
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addLightingNode: (position = { x: 400, y: 400 }) => {
        const id = `lighting-${Date.now()}`;
        const newNode = {
            id,
            type: 'lighting',
            position,
            data: {
                label: 'ATMOSPHERE_FX',
                lighting: 'NEURAL_GLOW',
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addSFXNode: (position = { x: 500, y: 500 }) => {
        const id = `sfx-${Date.now()}`;
        const newNode = {
            id,
            type: 'sfx',
            position,
            data: {
                label: 'SFX_TRIGGER',
                effect: 'CINEMATIC_BOOM',
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addAmbientNode: (position = { x: 600, y: 600 }) => {
        const id = `ambient-${Date.now()}`;
        const newNode = {
            id,
            type: 'ambient',
            position,
            data: {
                label: 'AMBIENT_LAYER',
                atmosphere: 'CYBERPUNK_CITY',
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addMusicNode: (position = { x: 700, y: 700 }) => {
        const id = `music-${Date.now()}`;
        const newNode = {
            id,
            type: 'music',
            position,
            data: {
                label: 'MUSIC_CORE',
                style: 'SYNTHWAVE_DRIVE',
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addUGCPipelineNode: (position = { x: 400, y: 400 }) => {
        const id = `ugc-${Date.now()}`;
        const newNode = {
            id,
            type: 'ugcPipeline',
            position,
            data: {
                label: 'UGC_PIPELINE',
                hookScript: '',
                hookStyle: 'PATTERN_INTERRUPT',
                avatarStyle: 'TALKING_HEAD',
                captionStyle: 'KINETIC_BOLD',
                niche: 'lifestyle',
                pipelineComplete: false,
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addWardrobeNode: (position = { x: 100, y: 500 }) => {
        const id = `wardrobe-${Date.now()}`;
        const newNode = {
            id,
            type: 'wardrobe',
            position,
            data: {
                label: 'WARDROBE_LOCK',
                outfitDescription: '',
                primaryColor: null,
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addProductNode: (position = { x: 200, y: 500 }) => {
        const id = `product-${Date.now()}`;
        const newNode = {
            id,
            type: 'product',
            position,
            data: {
                label: 'PRODUCT_SCAN',
                productImage: null,
                productLabels: [],
                productDescription: '',
                productColors: [],
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addAutoStoryboardNode: (position = { x: 400, y: 200 }) => {
        const id = `storyboard-${Date.now()}`;
        const newNode = {
            id,
            type: 'autoStoryboard',
            position,
            data: {
                label: 'AUTO_STORYBOARD',
                scenes: [],
                storyboardPrompt: '',
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    addVeoI2VNode: (position = { x: 600, y: 500 }) => {
        const id = `veo-i2v-${Date.now()}`;
        const newNode = {
            id,
            type: 'veoI2V',
            position,
            data: {
                label: 'VEO_I2V_ENGINE',
                inputImage: null,
                videoUrl: null,
                motionPrompt: '',
                onDelete: (id) => get().deleteNode(id)
            }
        };
        set({ nodes: [...get().nodes, newNode], activeNodeId: id });
        return id;
    },

    spawnSequence: (sequenceNodes) => {
        const { addDialogueNode, addInfluencerNode, addVideoNode, addCameraNode, addLightingNode, addSFXNode, addAmbientNode, addMusicNode, addUGCPipelineNode, addWardrobeNode, addProductNode, addAutoStoryboardNode, addVeoI2VNode, edges } = get();
        const basePos = { x: 100, y: 100 };
        const newEdges = [...edges];
        const createdMap = {};

        // Horizontal spacing for logical flow
        const X_OFFSET = 350;
        const Y_OFFSET = 80;

        sequenceNodes.forEach((nodeDef, index) => {
            const position = {
                x: basePos.x + (index * X_OFFSET),
                y: basePos.y + (index * Y_OFFSET)
            };
            let newNodeId;

            if (nodeDef.type === 'influencer' || nodeDef.type === 'identity') {
                newNodeId = addInfluencerNode(position);
            } else if (nodeDef.type === 'dialogue') {
                newNodeId = addDialogueNode(position);
                get().updateNodeData(newNodeId, {
                    label: nodeDef.label,
                    script: nodeDef.script || nodeDef.text
                });
            } else if (nodeDef.type === 'video') {
                newNodeId = addVideoNode(null, nodeDef.label || 'PRODUCTION_OUTLET', position);
            } else if (nodeDef.type === 'camera') {
                newNodeId = addCameraNode(position);
                get().updateNodeData(newNodeId, {
                    label: nodeDef.label,
                    movement: nodeDef.movement
                });
            } else if (nodeDef.type === 'lighting') {
                newNodeId = addLightingNode(position);
                get().updateNodeData(newNodeId, {
                    label: nodeDef.label,
                    lighting: nodeDef.atmosphere || nodeDef.lighting
                });
            } else if (nodeDef.type === 'sfx') {
                newNodeId = addSFXNode(position);
                get().updateNodeData(newNodeId, {
                    label: nodeDef.label,
                    effect: nodeDef.effect
                });
            } else if (nodeDef.type === 'ambient') {
                newNodeId = addAmbientNode(position);
                get().updateNodeData(newNodeId, {
                    label: nodeDef.label,
                    atmosphere: nodeDef.atmosphere
                });
            } else if (nodeDef.type === 'music') {
                newNodeId = addMusicNode(position);
                get().updateNodeData(newNodeId, {
                    label: nodeDef.label,
                    style: nodeDef.style
                });
            } else if (nodeDef.type === 'ugcPipeline') {
                newNodeId = addUGCPipelineNode(position);
            } else if (nodeDef.type === 'wardrobe') {
                newNodeId = addWardrobeNode(position);
            } else if (nodeDef.type === 'product') {
                newNodeId = addProductNode(position);
            } else if (nodeDef.type === 'autoStoryboard') {
                newNodeId = addAutoStoryboardNode(position);
            } else if (nodeDef.type === 'veoI2V') {
                newNodeId = addVeoI2VNode(position);
                get().updateNodeData(newNodeId, {
                    label: nodeDef.label,
                    hookScript: nodeDef.hookScript || '',
                    niche: nodeDef.niche
                });
            }

            if (newNodeId) {
                createdMap[nodeDef.id] = newNodeId;
                get().updateNodeData(newNodeId, { label: nodeDef.label });

                // Handle semantic connections if specified in the definition
                if (nodeDef.connectTo && createdMap[nodeDef.connectTo]) {
                    newEdges.push({
                        id: `e-${createdMap[nodeDef.connectTo]}-${newNodeId}`,
                        source: createdMap[nodeDef.connectTo],
                        target: newNodeId,
                        type: 'waveform',
                        animated: true,
                        style: { stroke: '#bef264', strokeWidth: 2 }
                    });
                } else if (index > 0) {
                    // Fallback: Connect to the previous node in the sequence to ensure a chain
                    const prevNodeDef = sequenceNodes[index - 1];
                    const prevInternalId = createdMap[prevNodeDef.id];
                    if (prevInternalId) {
                        newEdges.push({
                            id: `auto-e-${prevInternalId}-${newNodeId}`,
                            source: prevInternalId,
                            target: newNodeId,
                            type: 'waveform',
                            animated: true,
                            style: { stroke: '#bef264', strokeWidth: 2 }
                        });
                    }
                }
            }
        });

        set({ edges: newEdges });
    },
}));
