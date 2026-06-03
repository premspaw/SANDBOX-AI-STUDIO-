import React from 'react';
import ReactFlow, {
    Background,
    Controls,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store';
import IdentityNode from '../nodes/IdentityNode';
import InfluencerNode from '../nodes/InfluencerNode';
import SeedanceNode from '../nodes/SeedanceNode';
import Seedance15ProNode from '../nodes/Seedance15ProNode';
import NanoBananaNode from '../nodes/NanoBananaNode';
import OutputNode from '../nodes/OutputNode';
import NeuralEdge from '../edges/NeuralEdge';
import DirectorHUD from '../panels/DirectorHUD';
import { SonicDock } from '../panels/SonicDock';
import { ViewportToggle } from './ViewportToggle';
import { FocusOverlay } from './FocusOverlay';

const nodeTypes = {
    identity: IdentityNode,
    influencer: InfluencerNode,
    seedance: SeedanceNode,
    seedance15pro: Seedance15ProNode,
    nano_banana: NanoBananaNode,
    generated_output: OutputNode,
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
                <Controls 
                    position="bottom-right"
                    className="!bg-zinc-900/80 !border-white/10 !rounded-none !m-0 !shadow-2xl" 
                />
            </ReactFlow>

            {/* VIEWPORT CONTROLS */}
            <ViewportToggle />

            {/* CINEMATIC FOCUS OVERLAY */}
            <AnimatePresence>
                <FocusOverlay key="focus-overlay" />
            </AnimatePresence>

            {/* SONIC_DOCK: Audio & Identity Controller */}
            <SonicDock />

            {/* DIRECTOR HUD PANEL */}
            <DirectorHUD />
        </div>
    );
};
