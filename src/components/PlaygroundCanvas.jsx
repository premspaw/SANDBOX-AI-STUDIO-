import React, { useCallback, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Panel,
    addEdge,
    useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';
import IdentityNode from './IdentityNode';
import DialogueNode from './DialogueNode';
import VideoNode from './VideoNode';
import InfluencerNode from './InfluencerNode';
import CameraNode from './CameraNode';
import LightingNode from './LightingNode';
import SFXNode from './SFXNode';
import AmbientNode from './AmbientNode';
import MusicNode from './MusicNode';
import UGCPipelineNode from './UGCPipelineNode';
import UGCEngineNode from './UGCEngineNode';
import WardrobeNode from './WardrobeNode';
import ProductNode from './ProductNode';
import AutoStoryboardNode from './AutoStoryboardNode';
import VeoI2VNode from './VeoI2VNode';
import LocationNode from './LocationNode';
import NeuralEdge from './edges/NeuralEdge';
import DirectorHUD from './DirectorHUD';
import PromptBuilder from './PromptBuilder';
import { SonicDock } from './SonicDock';
import { ViewportToggle } from './ViewportToggle';
import { FocusOverlay } from './FocusOverlay';

const nodeTypes = {
    identity: IdentityNode,
    dialogue: DialogueNode,
    video: VideoNode,
    influencer: InfluencerNode,
    camera: CameraNode,
    lighting: LightingNode,
    sfx: SFXNode,
    ambient: AmbientNode,
    music: MusicNode,
    ugcPipeline: UGCPipelineNode,
    ugcEngine: UGCEngineNode,
    wardrobe: WardrobeNode,
    product: ProductNode,
    autoStoryboard: AutoStoryboardNode,
    veoI2V: VeoI2VNode,
    location: LocationNode,
};

const edgeTypes = {
    neural: NeuralEdge,
    waveform: NeuralEdge, // Keep alias so existing edges still render
};

const defaultEdgeOptions = {
    type: 'neural',
    animated: false, // We handle animation in NeuralEdge ourselves
};

export const PlaygroundCanvas = () => {
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setState } = useAppStore();

    return (
        <div className="w-full h-full relative bg-[#050505] overflow-hidden">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => setState(s => ({ ...s, activeNodeId: node.id }))}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                /* ── Magnetic snap ── */
                snapToGrid={true}
                snapGrid={[15, 15]}
                connectionRadius={60}
                connectionMode="loose"
                connectOnClick={true}
                /* ── Edge elevation so they always render above nodes ── */
                elevateEdgesOnSelect={true}
                elevateNodesOnSelect={false}
                /* ── Built-in keyboard delete for selected edges/nodes ── */
                deleteKeyCode={['Delete', 'Backspace']}
                fitView
                panOnScroll
                selectionOnDrag
            >
                <Background
                    color="#bef264"
                    gap={100}
                    size={1}
                    style={{ opacity: 0.03 }}
                />
                <Controls className="!bg-zinc-900/80 !border-white/10 !rounded-xl !shadow-2xl" />
            </ReactFlow>

            {/* VIEWPORT CONTROLS */}
            <ViewportToggle />

            {/* CINEMATIC FOCUS OVERLAY */}
            <AnimatePresence>
                <FocusOverlay key="focus-overlay" />
            </AnimatePresence>

            {/* SONIC_DOCK: Audio & Identity Controller */}
            <SonicDock />

            {/* PROMPT BUILDER PANEL */}
            <PromptBuilder />

            {/* DIRECTOR HUD PANEL */}
            <DirectorHUD />

            {/* NEURAL STATUS OVERLAY */}
            <div className="absolute top-6 left-6 p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center gap-3 pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-[#bef264] animate-pulse" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Neural_Canvas_Lock_v4</span>
            </div>
        </div>
    );
};
