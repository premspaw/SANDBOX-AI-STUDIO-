import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Flame,
  LayoutTemplate,
  Type,
  Check,
  Zap,
  Layers,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { REEL_TEMPLATES as ALL_TEMPLATES, TEMPLATE_CATEGORIES } from '../core/templates.js';

const REEL_TEMPLATES = ALL_TEMPLATES.filter(t => t.id === 'viral-hook');
export function TemplateLibraryModal({
  isOpen,
  onClose,
  onApplyTemplate,
  selectedOverlay,
}) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTemplateId, setActiveTemplateId] = useState(REEL_TEMPLATES[0].id);
  const [customText, setCustomText] = useState('');

  if (!isOpen) return null;

  const filteredTemplates =
    selectedCategory === 'All'
      ? REEL_TEMPLATES
      : REEL_TEMPLATES.filter((t) => t.category === selectedCategory);

  const activeTemplate =
    REEL_TEMPLATES.find((t) => t.id === activeTemplateId) || REEL_TEMPLATES[0];

  const handleApply = (template, textToUse) => {
    onApplyTemplate(template, {
      textOverride: textToUse || (customText.trim() ? customText : undefined),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl overflow-hidden text-white">
        {/* Background glow decoration */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#c8f135]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* ── Modal Header ── */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#c8f135] to-emerald-500 flex items-center justify-center shadow-lg shadow-[#c8f135]/20">
              <LayoutTemplate className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight uppercase italic">
                  Cinematic Reel Templates
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#c8f135]/15 border border-[#c8f135]/30 text-[#c8f135]">
                  HYPERFRAMES READY
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Studio-grade viral motion graphic presets optimized for 9:16 portrait retention.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Category Tabs ── */}
        <div className="px-6 py-3 border-b border-white/5 bg-zinc-900/40 flex items-center gap-2 overflow-x-auto z-10 shrink-0 scrollbar-none">
          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Body: Template Grid + Preview Sidebar ── */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden z-10">
          {/* Template Grid */}
          <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredTemplates.map((tmpl) => {
              const isSelected = activeTemplateId === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    setActiveTemplateId(tmpl.id);
                    setCustomText(tmpl.defaultText);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? 'border-[#c8f135] bg-[#c8f135]/5 ring-1 ring-[#c8f135]/50'
                      : 'border-white/10 bg-zinc-900/40 hover:border-white/20 hover:bg-zinc-900/80'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tmpl.badgeColor}`}
                      >
                        {tmpl.tag}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {tmpl.suggestedDurationSec}s
                      </span>
                    </div>

                    {/* Mini Visual Simulation Box */}
                    <div className="h-24 rounded-xl bg-black/90 border border-white/5 flex items-center justify-center p-3 text-center overflow-hidden relative group-hover:border-white/20 transition-colors">
                      <div
                        style={{
                          color: tmpl.style.color,
                          backgroundColor:
                            tmpl.style.boxOpacity > 0
                              ? `${tmpl.style.boxColor}${Math.round(
                                  tmpl.style.boxOpacity * 255
                                )
                                  .toString(16)
                                  .padStart(2, '0')}`
                              : 'transparent',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '800',
                          lineHeight: '1.2',
                        }}
                        className="truncate max-w-full"
                      >
                        {tmpl.defaultText}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-[#c8f135] transition-colors">
                        {tmpl.name}
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                        {tmpl.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      {tmpl.animation.in} entrance
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApply(tmpl);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#c8f135] hover:text-black font-semibold text-[11px] transition-all flex items-center gap-1"
                    >
                      <span>{selectedOverlay ? 'Restyle' : 'Apply'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Preview & Customizer Column */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/10 bg-zinc-950 p-6 flex flex-col justify-between shrink-0">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <Eye className="w-3.5 h-3.5 text-[#c8f135]" />
                <span>Live Canvas Simulation</span>
              </div>

              {/* 9:16 Mini Preview Phone Viewport */}
              <div className="aspect-[9/16] max-h-56 w-auto mx-auto bg-black rounded-2xl border border-white/10 p-3 relative flex items-center justify-center overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/30 to-black/80 pointer-events-none" />
                <div
                  style={{
                    color: activeTemplate.style.color,
                    backgroundColor:
                      activeTemplate.style.boxOpacity > 0
                        ? `${activeTemplate.style.boxColor}${Math.round(
                            activeTemplate.style.boxOpacity * 255
                          )
                            .toString(16)
                            .padStart(2, '0')}`
                        : 'transparent',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '800',
                    lineHeight: '1.25',
                    textAlign: 'center',
                    whiteSpace: 'pre-wrap',
                  }}
                  className="z-10 shadow-lg animate-in zoom-in-95 duration-200"
                >
                  {customText || activeTemplate.defaultText}
                </div>
              </div>

              {/* Edit text copy input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Custom Text Copy</span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {(customText || activeTemplate.defaultText).length}/280
                  </span>
                </label>
                <textarea
                  value={customText || activeTemplate.defaultText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-900 border border-white/10 focus:border-[#c8f135] rounded-xl p-2.5 text-xs text-white font-medium outline-none resize-none transition-colors"
                  placeholder="Enter your hook or message..."
                />
              </div>

              {selectedOverlay && (
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />
                  <span>Will restyle currently selected text overlay.</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2">
              <button
                onClick={() => handleApply(activeTemplate, customText)}
                className="w-full py-2.5 rounded-xl bg-[#c8f135] text-black font-black text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#c8f135]/20 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>
                  {selectedOverlay ? 'Update Selected Overlay' : 'Insert at Playhead'}
                </span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
