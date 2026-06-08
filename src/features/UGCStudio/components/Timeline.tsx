import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  ZoomIn, 
  ZoomOut, 
  Trash2, 
  GripVertical, 
  Video, 
  Volume2, 
  Loader2,
  Film
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { useUGC, TimelineItem } from '../context/UGCContext';
import { resolveUrl } from '../../../config/apiConfig';

interface SortableTimelineItemProps {
  item: TimelineItem;
  index: number;
  isSelected: boolean;
  zoomLevel: number;
  currentTime: number;
  accumulatedStartTime: number;
  onSelect: (id: string) => void;
  onTrimStart: (id: string, start: number) => void;
  onTrimEnd: (id: string, end: number) => void;
  onRemove: (id: string) => void;
}

const SortableTimelineItem = ({ 
  item, 
  index, 
  isSelected, 
  zoomLevel, 
  currentTime, 
  accumulatedStartTime, 
  onSelect, 
  onTrimStart, 
  onTrimEnd, 
  onRemove 
}: SortableTimelineItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: Math.max(60, (item.end - item.start) * zoomLevel) + 'px',
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const videoRef = useRef<HTMLVideoElement>(null);

  const handleTrimStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialStart = item.start;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = (moveEvent.clientX - startX) / zoomLevel;
      const newStart = Math.max(0, Math.min(initialStart + delta, item.end - 0.5));
      onTrimStart(item.id, newStart);
      if (videoRef.current) {
        videoRef.current.currentTime = newStart;
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleTrimEnd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initialEnd = item.end;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = (moveEvent.clientX - startX) / zoomLevel;
      const newEnd = Math.min(item.duration, Math.max(initialEnd + delta, item.start + 0.5));
      onTrimEnd(item.id, newEnd);
      if (videoRef.current) {
        videoRef.current.currentTime = newEnd;
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(item.id)}
      className={`relative h-full flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all group ${isSelected ? 'border-[#c8f135] shadow-[0_0_20px_rgba(212,255,0,0.4)]' : 'border-[#222] hover:border-white/20'}`}
    >
      {/* Drag Handle */}
      <div {...attributes} {...listeners} className="absolute top-1 left-1/2 -translate-x-1/2 z-40 p-1.5 bg-black/80 rounded-full cursor-grab active:cursor-grabbing text-[#c8f135] border border-[#c8f135]/30 shadow-lg group-hover:scale-110 transition-transform">
        <GripVertical size={12} />
      </div>

      {/* Trimming Handles */}
      <div
        onMouseDown={handleTrimStart}
        className="absolute left-0 inset-y-0 w-4 bg-[#c8f135]/10 hover:bg-[#c8f135]/40 z-50 cursor-ew-resize transition-all flex items-center justify-center group/handle"
      >
        <div className="w-1 h-8 bg-[#c8f135] rounded-full shadow-[0_0_10px_rgba(212,255,0,0.5)] group-hover/handle:scale-y-110 transition-transform" />
      </div>
      <div
        onMouseDown={handleTrimEnd}
        className="absolute right-0 inset-y-0 w-4 bg-[#c8f135]/10 hover:bg-[#c8f135]/40 z-50 cursor-ew-resize transition-all flex items-center justify-center group/handle"
      >
        <div className="w-1 h-8 bg-[#c8f135] rounded-full shadow-[0_0_10px_rgba(212,255,0,0.5)] group-hover/handle:scale-y-110 transition-transform" />
      </div>

      {/* Remove Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        className="absolute top-1.5 left-1.5 z-50 p-1.5 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-red-500/30 backdrop-blur-md"
      >
        <Trash2 size={10} />
      </button>

      {item.type === 'video' ? (
        <video ref={videoRef} src={resolveUrl(item.url)} className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#c8f135]/5">
          <Volume2 size={32} className="text-[#c8f135] opacity-20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-0.5 items-center h-8">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-[#c8f135]/40 rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 60}%`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent h-1/2" />

      <div className="absolute bottom-1.5 left-3 text-white font-mono text-[8px] font-bold drop-shadow-md flex items-center gap-1.5">
        {item.type === 'audio' ? <Volume2 size={10} className="text-[#c8f135]" /> : <Video size={10} className="text-gray-400" />}
        {index + 1}
      </div>

      <div className="absolute top-1.5 right-3 text-[#c8f135] font-mono text-[8px] bg-black/60 px-1.5 py-0.5 rounded border border-white/10">
        {(item.end - item.start).toFixed(1)}s
      </div>

      {isSelected && (
        <div className="absolute inset-0 border border-[#c8f135]/40 pointer-events-none animate-pulse" />
      )}

      {/* Progress Overlay */}
      <div 
        className="absolute inset-y-0 left-0 bg-[#c8f135]/20 pointer-events-none border-r border-[#c8f135]/50 z-10"
        style={{ 
          width: `${Math.min(100, Math.max(0, (currentTime - accumulatedStartTime) / (item.end - item.start) * 100))}%`,
          opacity: currentTime >= accumulatedStartTime ? 1 : 0
        }}
      />
    </div>
  );
};

export const Timeline: React.FC = () => {
  const {
    timeline,
    setTimeline,
    zoomLevel,
    setZoomLevel,
    selectedTimelineId,
    setSelectedTimelineId,
    isProcessingTimeline,
    processTimeline
  } = useUGC();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const totalTimelineDuration = timeline.reduce((acc, t) => acc + (t.end - t.start), 0);

  const getCurrentClip = (time: number) => {
    let accumulatedTime = 0;
    for (const item of timeline) {
      const itemDuration = item.end - item.start;
      if (time >= accumulatedTime && time <= accumulatedTime + itemDuration) {
        return item;
      }
      accumulatedTime += itemDuration;
    }
    return null;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(x / zoomLevel, totalTimelineDuration));
    setCurrentTime(newTime);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTimeline(arrayMove(timeline, timeline.findIndex(item => item.id === active.id), timeline.findIndex(item => item.id === over.id)));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsPlaying(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalTimelineDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.05;
        });
      }, 50);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isPlaying, totalTimelineDuration]);

  const handleTrimStart = (id: string, newStart: number) => {
    setTimeline(
      timeline.map(t => t.id === id ? { ...t, start: newStart } : t)
    );
  };

  const handleTrimEnd = (id: string, newEnd: number) => {
    setTimeline(
      timeline.map(t => t.id === id ? { ...t, end: newEnd } : t)
    );
  };

  const handleRemove = (id: string) => {
    setTimeline(timeline.filter(t => t.id !== id));
    if (selectedTimelineId === id) setSelectedTimelineId(null);
  };

  let accumulatedTime = 0;

  if (timeline.length === 0) {
    return (
      <div className="p-6 border border-white/10 bg-black/20 rounded-2xl text-center">
        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
          Timeline is empty. Add generated clips or synthesized audio.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-4 space-y-4 shadow-2xl">
      {/* Controls Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-xl border transition-all ${isPlaying ? 'bg-[#c8f135] text-black border-[#c8f135]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>
          
          <div className="text-[10px] font-mono text-gray-400">
            <span className="text-white font-bold">{currentTime.toFixed(2)}s</span>
            <span className="opacity-40"> / </span>
            <span>{totalTimelineDuration.toFixed(2)}s</span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel(Math.max(10, zoomLevel - 10))}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
            title="Zoom Out"
          >
            <ZoomOut size={12} />
          </button>
          <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">Zoom</span>
          <button
            onClick={() => setZoomLevel(Math.min(100, zoomLevel + 10))}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
            title="Zoom In"
          >
            <ZoomIn size={12} />
          </button>
        </div>

        {/* Render Button */}
        <button
          onClick={processTimeline}
          disabled={isProcessingTimeline || timeline.length === 0}
          className="px-4 py-2 bg-[#c8f135] hover:bg-[#d4ff3a] disabled:bg-white/5 disabled:text-white/20 text-black font-black uppercase text-[9px] tracking-widest rounded-xl transition-all shadow-lg shadow-[#c8f135]/15 flex items-center gap-1.5"
        >
          {isProcessingTimeline ? (
            <>
              <Loader2 size={11} className="animate-spin" />
              <span>Rendering...</span>
            </>
          ) : (
            <>
              <Film size={11} />
              <span>Render Video</span>
            </>
          )}
        </button>
      </div>

      {/* Tracks Container */}
      <div className="relative border border-white/5 rounded-xl bg-black/40 overflow-hidden min-h-[120px]">
        {/* Playhead indicator */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none shadow-[0_0_10px_red]"
          style={{ left: `${currentTime * zoomLevel}px` }}
        />

        <div 
          className="overflow-x-auto p-3 relative h-full min-w-full cursor-pointer select-none"
          onClick={handleTimelineClick}
          style={{ width: `${Math.max(200, totalTimelineDuration * zoomLevel + 40)}px` }}
        >
          {/* Tick marks ruler */}
          <div className="absolute top-0 left-3 right-3 h-2 border-b border-white/5 flex pointer-events-none">
            {[...Array(Math.ceil(totalTimelineDuration) + 1)].map((_, i) => (
              <div 
                key={i} 
                className="absolute h-1.5 border-l border-white/10 text-[6px] font-mono text-white/20 pl-0.5"
                style={{ left: `${i * zoomLevel}px` }}
              >
                {i}s
              </div>
            ))}
          </div>

          {/* Timeline Items Track */}
          <div className="pt-4 h-[80px] flex items-stretch gap-1 relative z-10">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToHorizontalAxis]}
            >
              <SortableContext 
                items={timeline.map(t => t.id)}
                strategy={horizontalListSortingStrategy}
              >
                {timeline.map((item, idx) => {
                  const currentAccumulatedStart = accumulatedTime;
                  accumulatedTime += (item.end - item.start);
                  return (
                    <SortableTimelineItem
                      key={item.id}
                      item={item}
                      index={idx}
                      isSelected={selectedTimelineId === item.id}
                      zoomLevel={zoomLevel}
                      currentTime={currentTime}
                      accumulatedStartTime={currentAccumulatedStart}
                      onSelect={setSelectedTimelineId}
                      onTrimStart={handleTrimStart}
                      onTrimEnd={handleTrimEnd}
                      onRemove={handleRemove}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
};
