import React from 'react';
import { motion } from 'framer-motion';
import {
    Plus,
    Box
} from 'lucide-react';
import { useAppStore } from '../store';

const API = 'http://localhost:3001';

const CATEGORIES = [
    { id: 'all', label: 'ALL' },
    { id: 'characters', label: 'MY CHARACTERS' },
    { id: 'cinematic', label: 'CINEMATIC REELS' },
    { id: 'lifestyle', label: 'LIFESTYLE SHOTS' },
    { id: 'commercial', label: 'COMMERCIALS' }
];

export function Home({ setActiveTab }) {


    return (
        <div className="min-h-screen bg-slate-950 text-white pb-20 font-mono selection:bg-[#bef264] selection:text-black">
            {/* HERO ACTION HEADER */}
            <header className="pt-20 pb-12 px-6 lg:px-12 relative overflow-hidden">
                {/* Background Glows (Anti-Gravity) */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#bef264]/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00f2ff]/5 blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-end justify-between gap-8 relative z-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#bef264] shadow-[0_0_20px_#bef264]" />
                            <h2 className="text-[10px] font-black tracking-[0.5em] text-[#bef264] uppercase animate-pulse">Neural_Global_Archive // v3.1</h2>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter leading-[0.85] uppercase">
                            Global <br /> <span className="text-transparent border-t-2 border-b-2 border-white/5 px-4 bg-clip-text bg-gradient-to-r from-white via-white/40 to-white/10">Archive</span>
                        </h1>
                    </div>

                    <div className="flex flex-col items-end gap-6">
                        <button
                            onClick={() => setActiveTab('creator')}
                            className="group relative px-12 py-7 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_80px_rgba(255,255,255,0.15)] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-[#bef264] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            <div className="relative flex items-center gap-4">
                                <Plus size={24} strokeWidth={4} className="group-hover:rotate-90 transition-transform duration-500" />
                                <span className="text-xs font-black uppercase tracking-[0.25em] relative block">
                                    [ INITIALIZE NEW CONSTRUCT ]
                                </span>
                            </div>
                        </button>
                    </div>
                </div>
            </header>


            {/* MASONRY MEDIA GRID */}
            <main className="max-w-screen-2xl mx-auto px-6 lg:px-12 pb-32">
            </main>

            {/* CUSTON NANO SCROLLBAR STYLES */}
            <style>{`
                ::-webkit-scrollbar {
                  width: 2px;
                }
                ::-webkit-scrollbar-track {
                  background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                  background: #bef26430;
                  border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                  background: #bef26460;
                }
            `}</style>
        </div>
    );
}

