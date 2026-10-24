import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  Scissors,
  Plus,
  Trash2,
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Gauge,
  ArrowLeftRight,
  MoveLeft,
  MoveRight,
  AlertTriangle,
  LayoutTemplate,
} from 'lucide-react';
import { clipOutputFrames } from '../core/editPlan.js';

export function ReelsTimeline({
  project,
  timeline,
  currentFrame,
  onSeek,
  selectedClipId,
  onSelectClip,
  selectedOverlayId,
  onSelectOverlay,
  onSplit,
  onUpdateClip,
  onMoveClip,
  onDeleteClip,
  onAddText,
  onOpenTemplates,
  onOpenSilenceModal,
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1); // 1x to 4x horizontal scale

  const fps = timeline.fps || 30;
  const totalFrames = Math.max(1, timeline.totalFrames);
  const durationSec = timeline.durationSec;

  // Pixels per frame based on container width and zoom
  const pxPerFrame = (3.5 * zoom);
  const timelineWidth = Math.max(800, totalFrames * pxPerFrame);

  // Playhead scrubber drag
  const handleTimelineScrub = useCallback(
    (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft;
      const offsetX = e.clientX - rect.left + scrollLeft;
      const frame = Math.max(0, Math.min(totalFrames - 1, Math.round(offsetX / pxPerFrame)));
      onSeek(frame);
    },
    [totalFrames, pxPerFrame, onSeek]
  );

  const handlePointerDown = (e) => {
    handleTimelineScrub(e);
    const onMove = (moveEvt) => handleTimelineScrub(moveEvt);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Generate ruler markers every 1 second
  const markers = useMemo(() => {
    const list = [];
    const secCount = Math.ceil(durationSec) + 1;
    for (let s = 0; s <= secCount; s++) {
      list.push({
        sec: s,
        frame: s * fps,
        leftPx: s * fps * pxPerFrame,
      });
    }
    return list;
  }, [durationSec, fps, pxPerFrame]);

  const selectedClip = project.clips.find((c) => c.id === selectedClipId);

  return (
    <div className="flex flex-col w-full bg-zinc-950/80 border-t border-white/10 select-none">
      {/* Timeline Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-zinc-900/60">
        <div className="flex items-center gap-2">
          {/* Split at playhead */}
          <button
            onClick={onSplit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            title="Split Clip at Playhead"
          >
            <Scissors className="w-3.5 h-3.5 text-[#c8f135]" />
            <span>Split (Cut)</span>
          </button>

          {/* Templates Library Launcher */}
          <button
            onClick={onOpenTemplates}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#c8f135]/20 to-emerald-500/20 hover:from-[#c8f135]/30 hover:to-emerald-500/30 border border-[#c8f135]/40 text-[#c8f135] text-xs font-bold transition-all shadow-sm shadow-[#c8f135]/10"
            title="Open Cinematic Reel Templates"
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span>Templates</span>
          </button>

          {/* Add Text overlay */}
          <button
            onClick={() => onAddText()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white text-xs font-medium transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Text</span>
          </button>

          {/* Clean Silence / Gap Removal */}
          <button
            onClick={onOpenSilenceModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-medium transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Silence Cleanup</span>
          </button>
        </div>

        {/* Selected Clip Quick Controls */}
        {selectedClip && (
          <div className="flex items-center gap-2 text-xs">
            {/* Speed change */}
            <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-md border border-white/5 text-zinc-400">
              <Gauge className="w-3.5 h-3.5 text-[#c8f135]" />
              <select
                value={selectedClip.speed}
                onChange={(e) => onUpdateClip(selectedClip.id, { speed: Number(e.target.value) })}
                className="bg-transparent text-white font-mono outline-none text-xs cursor-pointer"
              >
                <option value={0.5} className="bg-zinc-900">0.5x</option>
                <option value={0.75} className="bg-zinc-900">0.75x</option>
                <option value={1} className="bg-zinc-900">1.0x</option>
                <option value={1.25} className="bg-zinc-900">1.25x</option>
                <option value={1.5} className="bg-zinc-900">1.5x</option>
                <option value={2} className="bg-zinc-900">2.0x</option>
              </select>
            </div>

            {/* Mute toggle */}
            <button
              onClick={() => onUpdateClip(selectedClip.id, { muted: !selectedClip.muted })}
              className={`p-1.5 rounded-md border transition-colors ${
                selectedClip.muted
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
              title={selectedClip.muted ? 'Unmute' : 'Mute'}
            >
              {selectedClip.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Delete clip */}
            <button
              onClick={() => onDeleteClip(selectedClip.id)}
              className="p-1.5 rounded-md bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-white/10 transition-colors"
              title="Delete Clip"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Timeline Zoom */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.25))}
            className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center font-mono font-bold"
          >
            -
          </button>
          <span className="font-mono text-[10px] w-8 text-center">{zoom.toFixed(1)}x</span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center font-mono font-bold"
          >
            +
          </button>
        </div>
      </div>

      {/* Scrollable Tracks Area */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        className="relative w-full overflow-x-auto overflow-y-hidden cursor-crosshair h-44 bg-zinc-950 p-2"
        style={{ scrollBehavior: 'auto' }}
      >
        <div className="relative h-full" style={{ width: `${timelineWidth}px` }}>
          {/* Time Ruler */}
          <div className="relative h-6 border-b border-white/10 flex">
            {markers.map((m) => (
              <div
                key={m.sec}
                style={{ left: `${m.leftPx}px` }}
                className="absolute top-0 bottom-0 flex flex-col items-start pointer-events-none"
              >
                <div className="h-2 w-px bg-white/30" />
                <span className="text-[9px] font-mono text-zinc-500 pl-1 -mt-0.5">
                  {m.sec}s
                </span>
              </div>
            ))}
          </div>

          {/* Text Overlays Track */}
          <div className="relative h-10 mt-1 border-b border-white/5 bg-zinc-900/30 rounded flex items-center">
            {project.overlays.map((overlay) => {
              const startPx = overlay.startFrame * pxPerFrame;
              const widthPx = Math.max(24, overlay.durationFrames * pxPerFrame);
              const isSelected = selectedOverlayId === overlay.id;

              return (
                <div
                  key={overlay.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectOverlay(overlay.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${startPx}px`,
                    width: `${widthPx}px`,
                  }}
                  className={`h-7 rounded-md px-2 flex items-center justify-between text-[11px] font-medium cursor-pointer transition-all truncate border ${
                    isSelected
                      ? 'bg-amber-400 text-black border-white shadow-lg ring-2 ring-amber-400/50'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                  }`}
                >
                  <span className="truncate">{overlay.text}</span>
                  {overlay.needsReview && (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 ml-1" title="Overlay lost its footage!" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Video Clips Track */}
          <div className="relative h-20 mt-1 flex items-center">
            {timeline.segments.map((seg, i) => {
              const clip = project.clips[seg.clipIndex];
              const segWidthPx = (seg.endFrame - seg.startFrame) * pxPerFrame;
              const isSelected = selectedClipId === clip.id;

              return (
                <div
                  key={clip.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClip(clip.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${seg.startFrame * pxPerFrame}px`,
                    width: `${segWidthPx}px`,
                  }}
                  className={`h-16 rounded-xl border p-2 flex flex-col justify-between overflow-hidden cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-zinc-800 border-[#c8f135] shadow-lg ring-2 ring-[#c8f135]/40'
                      : 'bg-zinc-900/90 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span className="font-bold text-white">Clip {i + 1}</span>
                    {clip.speed !== 1 && (
                      <span className="bg-[#c8f135]/20 text-[#c8f135] px-1 rounded font-bold">
                        {clip.speed}x
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                    <span>{seg.inSec.toFixed(1)}s - {seg.outSec.toFixed(1)}s</span>
                    <span>{((seg.endFrame - seg.startFrame) / fps).toFixed(1)}s</span>
                  </div>
                </div>
              );
            })}

            {/* Render Disabled Gap Clips (Preserved for restoration) */}
            {project.clips
              .filter((c) => !c.enabled && c.origin === 'gap-removal')
              .map((gapClip) => {
                const src = project.sources.find((s) => s.id === gapClip.sourceId);
                return (
                  <div
                    key={gapClip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateClip(gapClip.id, { enabled: true });
                    }}
                    className="absolute h-14 border border-dashed border-purple-500/50 bg-purple-950/20 text-purple-300 rounded-lg px-2 flex items-center justify-center text-[10px] cursor-pointer hover:bg-purple-900/40 transition-colors"
                    title="Click to Restore this deleted silence gap"
                    style={{
                      left: `${gapClip.inSec * fps * pxPerFrame}px`,
                      width: `${(gapClip.outSec - gapClip.inSec) * fps * pxPerFrame}px`,
                      top: '4px',
                    }}
                  >
                    <RotateCcw className="w-3 h-3 mr-1 text-purple-400" />
                    <span>Restore Gap</span>
                  </div>
                );
              })}
          </div>

          {/* Interactive Playhead Needle */}
          <div
            style={{ left: `${currentFrame * pxPerFrame}px` }}
            className="absolute top-0 bottom-0 w-px bg-[#c8f135] shadow-[0_0_8px_rgba(200,241,53,0.8)] pointer-events-none z-30"
          >
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#c8f135] rounded-full shadow-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
