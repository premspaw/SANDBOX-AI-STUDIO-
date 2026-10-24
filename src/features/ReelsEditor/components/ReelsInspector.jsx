import React from 'react';
import {
  Type,
  Video,
  Volume2,
  Sliders,
  Crop,
  Sparkles,
  Layers,
  Trash2,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  LayoutTemplate,
} from 'lucide-react';
import { FONTS, ANIMATIONS, LIMITS } from '../core/editPlan.js';

export function ReelsInspector({
  project,
  selectedClipId,
  onUpdateClip,
  onDeleteClip,
  selectedOverlayId,
  onUpdateOverlay,
  onDeleteOverlay,
  onOpenTemplates,
  onSetAudioDenoise,
  onSetAudioNormalize,
}) {
  const selectedClip = project.clips.find((c) => c.id === selectedClipId);
  const selectedOverlay = project.overlays.find((o) => o.id === selectedOverlayId);
  const activeSource = selectedClip ? project.sources.find((s) => s.id === selectedClip.sourceId) : null;

  return (
    <div className="w-80 h-full bg-zinc-950/90 border-l border-white/10 flex flex-col overflow-y-auto p-4 text-xs select-none">
      {/* Tab Header / Context Title */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
        <span className="font-mono uppercase tracking-widest text-zinc-400 font-bold">
          {selectedOverlay ? 'Text Inspector' : selectedClip ? 'Clip Inspector' : 'Project Audio & Settings'}
        </span>
      </div>

      {/* ── 1. Text Overlay Inspector ── */}
      {selectedOverlay ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Type className="w-4 h-4 text-amber-400" />
              <span>Overlay Properties</span>
            </span>
            <button
              onClick={() => onDeleteOverlay(selectedOverlay.id)}
              className="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-white/5 transition-colors"
              title="Delete Text Overlay"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Quick template restyle launcher */}
          {onOpenTemplates && (
            <button
              onClick={onOpenTemplates}
              className="w-full py-2 px-3 rounded-xl bg-[#c8f135]/10 hover:bg-[#c8f135]/20 border border-[#c8f135]/30 text-[#c8f135] text-xs font-bold transition-all flex items-center justify-center gap-2 group"
            >
              <LayoutTemplate className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>Restyle with Cinematic Template...</span>
            </button>
          )}

          {selectedOverlay.needsReview && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Footage cut out!</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                The video moment this text was anchored to was trimmed or deleted. Adjust its timing or delete it.
              </p>
            </div>
          )}

          {/* Text Input */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 font-medium">Text Content</label>
            <textarea
              rows={3}
              value={selectedOverlay.text}
              maxLength={LIMITS.maxTextLength}
              onChange={(e) => onUpdateOverlay(selectedOverlay.id, { text: e.target.value })}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-white font-medium outline-none focus:border-[#c8f135] transition-colors resize-none"
            />
          </div>

          {/* Font Selector */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 font-medium">Font Family</label>
            <select
              value={selectedOverlay.style.font}
              onChange={(e) =>
                onUpdateOverlay(selectedOverlay.id, {
                  style: { ...selectedOverlay.style, font: e.target.value },
                })
              }
              className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2 text-white font-medium outline-none focus:border-[#c8f135] cursor-pointer"
            >
              {Object.entries(FONTS).map(([key, f]) => (
                <option key={key} value={key} className="bg-zinc-900">
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Font Size</span>
              <span className="font-mono text-white">{selectedOverlay.style.fontSize}px</span>
            </div>
            <input
              type="range"
              min={24}
              max={140}
              step={2}
              value={selectedOverlay.style.fontSize}
              onChange={(e) =>
                onUpdateOverlay(selectedOverlay.id, {
                  style: { ...selectedOverlay.style, fontSize: Number(e.target.value) },
                })
              }
              className="w-full accent-[#c8f135]"
            />
          </div>

          {/* Text & Box Colors */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-zinc-400 text-[11px]">Text Color</label>
              <div className="flex items-center gap-2 bg-zinc-900 p-1.5 rounded-lg border border-white/10">
                <input
                  type="color"
                  value={selectedOverlay.style.color}
                  onChange={(e) =>
                    onUpdateOverlay(selectedOverlay.id, {
                      style: { ...selectedOverlay.style, color: e.target.value },
                    })
                  }
                  className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                />
                <span className="font-mono text-[10px] text-zinc-300">{selectedOverlay.style.color}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 text-[11px]">Box Color</label>
              <div className="flex items-center gap-2 bg-zinc-900 p-1.5 rounded-lg border border-white/10">
                <input
                  type="color"
                  value={selectedOverlay.style.boxColor}
                  onChange={(e) =>
                    onUpdateOverlay(selectedOverlay.id, {
                      style: { ...selectedOverlay.style, boxColor: e.target.value },
                    })
                  }
                  className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                />
                <span className="font-mono text-[10px] text-zinc-300">{selectedOverlay.style.boxColor}</span>
              </div>
            </div>
          </div>

          {/* Box Opacity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Background Opacity</span>
              <span className="font-mono text-white">
                {Math.round(selectedOverlay.style.boxOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={selectedOverlay.style.boxOpacity}
              onChange={(e) =>
                onUpdateOverlay(selectedOverlay.id, {
                  style: { ...selectedOverlay.style, boxOpacity: Number(e.target.value) },
                })
              }
              className="w-full accent-[#c8f135]"
            />
          </div>

          {/* Animation entrance */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 font-medium">Entrance Animation</label>
            <div className="grid grid-cols-3 gap-1.5">
              {ANIMATIONS.map((anim) => (
                <button
                  key={anim}
                  onClick={() =>
                    onUpdateOverlay(selectedOverlay.id, {
                      animation: { ...selectedOverlay.animation, in: anim },
                    })
                  }
                  className={`py-1.5 rounded-lg capitalize font-medium text-[11px] transition-all border ${
                    selectedOverlay.animation.in === anim
                      ? 'bg-[#c8f135] text-black border-[#c8f135] font-bold'
                      : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                  }`}
                >
                  {anim}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : selectedClip ? (
        /* ── 2. Selected Clip Inspector ── */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Video className="w-4 h-4 text-emerald-400" />
              <span>Clip Settings</span>
            </span>
            <button
              onClick={() => onDeleteClip(selectedClip.id)}
              className="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-white/5 transition-colors"
              title="Delete Clip"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Source clip filename & limits */}
          {activeSource && (
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1 text-zinc-400">
              <p className="font-medium text-white truncate">{activeSource.filename}</p>
              <div className="flex justify-between text-[10px] font-mono">
                <span>{activeSource.meta.width}x{activeSource.meta.height}</span>
                <span>{activeSource.meta.durationSec.toFixed(1)}s source</span>
              </div>
            </div>
          )}

          {/* In / Out trim controls */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-zinc-400">In Point (s)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={selectedClip.inSec}
                onChange={(e) => onUpdateClip(selectedClip.id, { inSec: Number(e.target.value) })}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 font-mono text-white outline-none focus:border-emerald-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-400">Out Point (s)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={selectedClip.outSec}
                onChange={(e) => onUpdateClip(selectedClip.id, { outSec: Number(e.target.value) })}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 font-mono text-white outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Portrait Framing / Crop Mode */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <label className="text-zinc-400 font-medium flex items-center gap-1.5">
              <Crop className="w-3.5 h-3.5 text-cyan-400" />
              <span>Portrait Framing (9:16)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  onUpdateClip(selectedClip.id, { crop: { ...selectedClip.crop, mode: 'fill' } })
                }
                className={`p-2 rounded-xl border text-center transition-all ${
                  selectedClip.crop.mode === 'fill'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                    : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                Fill Canvas
              </button>
              <button
                onClick={() =>
                  onUpdateClip(selectedClip.id, { crop: { ...selectedClip.crop, mode: 'fit' } })
                }
                className={`p-2 rounded-xl border text-center transition-all ${
                  selectedClip.crop.mode === 'fit'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                    : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                Fit (Letterbox)
              </button>
            </div>
          </div>

          {/* Horizontal / Vertical Framing Focus if mode === fill */}
          {selectedClip.crop.mode === 'fill' && (
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400">
                  <span>Horizontal Focus</span>
                  <span className="font-mono text-white">
                    {Math.round(selectedClip.crop.focusX * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedClip.crop.focusX}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, {
                      crop: { ...selectedClip.crop, focusX: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          )}

          {/* Clip Volume */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <div className="flex justify-between text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Clip Volume</span>
              </span>
              <span className="font-mono text-white">
                {selectedClip.muted ? 'Muted' : `${Math.round(selectedClip.volume * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              disabled={selectedClip.muted}
              value={selectedClip.muted ? 0 : selectedClip.volume}
              onChange={(e) => onUpdateClip(selectedClip.id, { volume: Number(e.target.value) })}
              className="w-full accent-emerald-400 disabled:opacity-30"
            />
          </div>
        </div>
      ) : (
        /* ── 3. Global Audio & Project Enhancements ── */
        <div className="space-y-4">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Audio Processing</span>
          </span>

          {/* Denoise (Conservative FFT noise reduction) */}
          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Noise Reduction</p>
                <p className="text-[10px] text-zinc-500">Conservative FFT speech cleanup</p>
              </div>
              <input
                type="checkbox"
                checked={project.audio.denoise.enabled}
                onChange={(e) => onSetAudioDenoise(e.target.checked, project.audio.denoise.strength)}
                className="w-4 h-4 accent-purple-400 cursor-pointer"
              />
            </div>
            {project.audio.denoise.enabled && (
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {['light', 'medium'].map((str) => (
                  <button
                    key={str}
                    onClick={() => onSetAudioDenoise(true, str)}
                    className={`py-1 rounded capitalize text-[10px] border font-medium ${
                      project.audio.denoise.strength === str
                        ? 'bg-purple-500 text-white border-purple-400'
                        : 'bg-zinc-800 text-zinc-400 border-white/5'
                    }`}
                  >
                    {str}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Loudness Normalization */}
          <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Loudness Normalize</p>
                <p className="text-[10px] text-zinc-500">Target: -14 LUFS (Shorts standard)</p>
              </div>
              <input
                type="checkbox"
                checked={project.audio.normalize.enabled}
                onChange={(e) => onSetAudioNormalize(e.target.checked, project.audio.normalize.targetLufs)}
                className="w-4 h-4 accent-purple-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-zinc-500 space-y-1 text-[11px] leading-relaxed">
            <p className="font-bold text-zinc-400">Processing Note</p>
            <p>
              Audio enhancements (denoise & loudness normalization) are processed server-side during video export to preserve speech fidelity without distorting the browser player.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
