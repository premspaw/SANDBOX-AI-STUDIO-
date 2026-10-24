import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  buildTimeline,
  splitAtFrame,
  updateClip,
  moveClip,
  deleteClip,
  applyGapRemoval,
  addTextOverlay,
  updateOverlay,
  removeOverlay,
  outputFrameToSource,
  sourceToOutputFrame,
  validateProject,
  validateForExport,
  LIMITS,
} from '../core/editPlan.js';
import { instantiateTemplate } from '../core/templates.js';
import { brandLayer, DEFAULT_BRAND } from '../core/brand.js';
import { reelsApi } from '../services/reelsApi.js';

export function useReelsEditor(initialProject, onProjectUpdated) {
  const [project, setProject] = useState(initialProject);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [sourceUrls, setSourceUrls] = useState({}); // sourceId -> signed stream url

  // Compute live timeline
  const timeline = useMemo(() => buildTimeline(project), [project]);

  // Keep selected clip in sync
  useEffect(() => {
    if (selectedClipId && !project.clips.some((c) => c.id === selectedClipId)) {
      setSelectedClipId(null);
    }
  }, [project.clips, selectedClipId]);

  // Keep selected overlay in sync
  useEffect(() => {
    if (selectedOverlayId && !project.overlays.some((o) => o.id === selectedOverlayId)) {
      setSelectedOverlayId(null);
    }
  }, [project.overlays, selectedOverlayId]);

  // Preload signed stream URLs for all sources in project
  useEffect(() => {
    if (!project?.id || !project.sources.length) return;
    let active = true;

    async function loadUrls() {
      for (const s of project.sources) {
        try {
          const url = await reelsApi.getSourceMediaUrl(project.id, s.id);
          if (active) {
            setSourceUrls((prev) => (prev[s.id] === url ? prev : { ...prev, [s.id]: url }));
          }
        } catch (err) {
          console.warn(`Failed to resolve stream URL for source ${s.id}:`, err);
        }
      }
    }

    loadUrls();
    return () => { active = false; };
  }, [project.id, project.sources]);

  // Debounced server sync
  const saveTimeoutRef = useRef(null);
  const baseRevisionRef = useRef(project.revision);

  const pendingRef = useRef(null);
  const chainRef = useRef(Promise.resolve());
  const flushSave = useCallback(async () => {
    clearTimeout(saveTimeoutRef.current);
    const work = async () => {
      if (!pendingRef.current) return;
      const next = pendingRef.current; pendingRef.current = null;
      setIsSaving(true); setSaveError(null);
      try {
        const saved = await reelsApi.saveRevision(next.id, baseRevisionRef.current, next);
        baseRevisionRef.current = saved.revision;
        setProject(cur => ({...cur, revision:saved.revision}));
        onProjectUpdated?.(saved);
      } catch(e) { pendingRef.current ||= next; setSaveError(e.message); throw e; }
      finally { setIsSaving(false); }
    };
    chainRef.current = chainRef.current.catch(()=>{}).then(work);
    await chainRef.current;
  }, [onProjectUpdated]);
  const syncToServer = useCallback(next => {
    pendingRef.current = next; setIsSaving(true);
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(()=>flushSave().catch(()=>{}),1200);
  },[flushSave]);
  useEffect(()=>()=>clearTimeout(saveTimeoutRef.current),[]);

  // State mutator with Undo / Redo tracking
  const mutate = useCallback((updater, label = 'edit') => {
    setProject((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return prev;
      setUndoStack((stack) => [...stack.slice(-30), prev]);
      setRedoStack([]);
      syncToServer(next);
      return next;
    });
  }, [syncToServer]);

  const undo = useCallback(() => {
    if (!undoStack.length) return;
    setProject((current) => {
      const previous = undoStack[undoStack.length - 1];
      setUndoStack((s) => s.slice(0, -1));
      setRedoStack((r) => [...r, current]);
      syncToServer(previous);
      return previous;
    });
  }, [undoStack, syncToServer]);

  const redo = useCallback(() => {
    if (!redoStack.length) return;
    setProject((current) => {
      const next = redoStack[redoStack.length - 1];
      setRedoStack((r) => r.slice(0, -1));
      setUndoStack((s) => [...s, current]);
      syncToServer(next);
      return next;
    });
  }, [redoStack, syncToServer]);

  // Timeline operations
  const splitClipAtPlayhead = useCallback(() => {
    mutate((p) => splitAtFrame(p, currentFrame), 'split');
  }, [currentFrame, mutate]);

  const updateClipProps = useCallback((clipId, patch) => {
    mutate((p) => updateClip(p, clipId, patch), 'updateClip');
  }, [mutate]);

  const reorderClip = useCallback((fromIndex, toIndex) => {
    mutate((p) => moveClip(p, fromIndex, toIndex), 'moveClip');
  }, [mutate]);

  const removeClip = useCallback((clipId) => {
    mutate((p) => deleteClip(p, clipId), 'deleteClip');
    if (selectedClipId === clipId) setSelectedClipId(null);
  }, [mutate, selectedClipId]);

  const applyGaps = useCallback((gaps) => {
    mutate((p) => applyGapRemoval(p, gaps), 'applyGaps');
  }, [mutate]);

  const addText = useCallback((patch = {}) => {
    mutate((p) => {
      const next = addTextOverlay(p, currentFrame, patch);
      const added = next.overlays[next.overlays.length - 1];
      if (added) setSelectedOverlayId(added.id);
      return next;
    }, 'addText');
  }, [currentFrame, mutate]);

  const applyTemplate = useCallback((template, { textOverride, targetOverlayId } = {}) => {
    mutate((p) => {
      p={...p,brand:p.brand||{...DEFAULT_BRAND}};
      const targetId = targetOverlayId || selectedOverlayId;
      if (targetId && p.overlays.some((o) => o.id === targetId)) {
        // Restyle existing selected overlay
        const patch = {
          style: { ...template.style, ...(p.brand ? {color:p.brand.text,boxColor:p.brand.surface,font:p.brand.font} : {}) },
          animation: { ...template.animation, ...(p.brand ? {in:p.brand.animation} : {}) },
          templateId: template.id,
          templateVersion: '1.0.0',
        };
        if (textOverride) patch.text = textOverride;
        const branded = brandLayer({...p.overlays.find(o=>o.id===targetId),...patch},p.brand);
        return updateOverlay(p, targetId, {...patch,style:branded.style,animation:branded.animation});
      }
      // Insert new template overlay at playhead
      const fps = p.canvas.fps.num / p.canvas.fps.den;
      const raw = instantiateTemplate(template, currentFrame, fps, textOverride);
      const branded=brandLayer(raw,p.brand);
      const withId = { ...branded, id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` };
      setSelectedOverlayId(withId.id);
      return { ...p, overlays: [...p.overlays, withId] };
    }, 'applyTemplate');
  }, [currentFrame, selectedOverlayId, mutate]);

  const replaceProject = useCallback((newProject) => {
    clearTimeout(saveTimeoutRef.current); pendingRef.current = null;
    baseRevisionRef.current = newProject.revision;
    setProject(newProject);
    setUndoStack([]);
    setRedoStack([]);
    setCurrentFrame(0);
    setSelectedOverlayId(null);
    setSelectedClipId(null);
  }, []);

  const updateText = useCallback((overlayId, patch) => {
    mutate((p) => updateOverlay(p, overlayId, patch), 'updateText');
  }, [mutate]);

  const removeText = useCallback((overlayId) => {
    mutate((p) => removeOverlay(p, overlayId), 'removeText');
    if (selectedOverlayId === overlayId) setSelectedOverlayId(null);
  }, [mutate, selectedOverlayId]);

  const setAudioDenoise = useCallback((enabled, strength = 'light') => {
    mutate((p) => ({
      ...p,
      audio: { ...p.audio, denoise: { enabled, strength } },
    }), 'setDenoise');
  }, [mutate]);

  const setAudioNormalize = useCallback((enabled, targetLufs = -14) => {
    mutate((p) => ({
      ...p,
      audio: { ...p.audio, normalize: { enabled, targetLufs } },
    }), 'setNormalize');
  }, [mutate]);

  // Playhead scrubbing and clamp
  const seekToFrame = useCallback((frame) => {
    const clamped = Math.max(0, Math.min(timeline.totalFrames - 1, Math.round(frame)));
    setCurrentFrame(clamped);
  }, [timeline.totalFrames]);

  const seekToTime = useCallback((timeSec) => {
    seekToFrame(timeSec * timeline.fps);
  }, [seekToFrame, timeline.fps]);

  return {
    project,
    mutate,
    flushSave,
    setProject,
    timeline,
    currentFrame,
    setCurrentFrame,
    seekToFrame,
    seekToTime,
    isPlaying,
    setIsPlaying,
    selectedClipId,
    setSelectedClipId,
    selectedOverlayId,
    setSelectedOverlayId,
    sourceUrls,
    isSaving,
    saveError,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undo,
    redo,
    // Actions
    splitClipAtPlayhead,
    updateClipProps,
    reorderClip,
    removeClip,
    applyGaps,
    addText,
    applyTemplate,
    replaceProject,
    updateText,
    removeText,
    setAudioDenoise,
    setAudioNormalize,
    exportValidation: validateForExport(project),
  };
}
