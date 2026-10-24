import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Film,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { reelsApi } from '../services/reelsApi.js';
import { validateForExport } from '../core/editPlan.js';

export function ReelsExportModal({
  isOpen,
  onClose,
  project,
}) {
  const [profile, setProfile] = useState('export'); // 'export' | 'preview'
  const [isStarting, setIsStarting] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [renderError, setRenderError] = useState(null);
  const [downloadInfo, setDownloadInfo] = useState(null);

  const validation = validateForExport(project);

  // Poll active render job
  useEffect(() => {
    if (!activeJob || ['succeeded', 'failed', 'cancelled'].includes(activeJob.status)) return;
    let timer;

    const poll = async () => {
      try {
        const job = await reelsApi.getJobStatus(activeJob.id);
        setActiveJob(job);
        if (job.status === 'succeeded') {
          const info = await reelsApi.getJobDownloadUrl(job.id);
          setDownloadInfo(info);
        } else if (job.status === 'failed') {
          setRenderError(job.error || 'Video rendering failed');
        } else {
          timer = setTimeout(poll, 1200);
        }
      } catch (err) {
        console.warn('Job poll error:', err);
        timer = setTimeout(poll, 2000);
      }
    };

    poll();
    return () => clearTimeout(timer);
  }, [activeJob]);

  if (!isOpen) return null;

  const handleStartRender = async () => {
    setIsStarting(true);
    setRenderError(null);
    setDownloadInfo(null);
    try {
      const job = await reelsApi.startRender(project.id, {
        profile,
        revision: project.revision,
      });
      setActiveJob(job);
    } catch (err) {
      setRenderError(err.message || 'Failed to start export');
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancel = async () => {
    if (!activeJob) return;
    try {
      await reelsApi.cancelJob(activeJob.id);
      setActiveJob((j) => ({ ...j, status: 'cancelled' }));
    } catch (err) {
      console.warn('Cancel error:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c8f135]/20 flex items-center justify-center text-[#c8f135]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Export Reels Video</h3>
              <p className="text-[11px] font-mono text-zinc-400">
                Revision #{project.revision} • 9:16 Portrait MP4
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Pre-flight validation warnings */}
          {!validation.ok && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Cannot Export Yet</span>
              </div>
              <ul className="list-disc list-inside text-xs space-y-1 text-rose-200/90 font-medium">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Active Job Progress View */}
          {activeJob && activeJob.status !== 'failed' && (
            <div className="space-y-4 p-5 rounded-2xl bg-zinc-900/60 border border-white/10">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 uppercase tracking-widest font-bold">
                  Stage: <span className="text-[#c8f135]">{activeJob.stage}</span>
                </span>
                <span className="text-zinc-400">
                  {activeJob.progress !== null
                    ? `${Math.round(activeJob.progress * 100)}%`
                    : activeJob.status === 'succeeded'
                    ? '100%'
                    : 'Processing...'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-[#c8f135] to-emerald-400 transition-all duration-300"
                  style={{
                    width:
                      activeJob.status === 'succeeded'
                        ? '100%'
                        : `${Math.max(5, (activeJob.progress || 0) * 100)}%`,
                  }}
                />
              </div>

              {/* Stage description */}
              <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                {activeJob.status !== 'succeeded' && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c8f135]" />}
                <span>
                  {activeJob.stage === 'queued' && 'Queued for isolated render worker...'}
                  {activeJob.stage === 'compose' && 'Composing frame graph and text layers...'}
                  {activeJob.stage === 'encode' && 'Encoding 1080×1920 H.264 video with AAC audio...'}
                  {activeJob.stage === 'validate' && 'Validating output streams and decoding integrity...'}
                  {activeJob.stage === 'done' && 'Video successfully rendered and verified!'}
                </span>
              </div>

              {/* Success download view */}
              {activeJob.status === 'succeeded' && downloadInfo && (
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="aspect-[9/16] w-36 mx-auto rounded-xl overflow-hidden border border-white/10 shadow-lg">
                    <video
                      src={downloadInfo.playUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <a
                    href={downloadInfo.downloadUrl}
                    download={downloadInfo.fileName}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#c8f135] text-black font-bold text-sm hover:scale-102 active:scale-98 transition-all shadow-lg shadow-[#c8f135]/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download MP4 ({downloadInfo.fileName})</span>
                  </a>
                </div>
              )}

              {/* Cancel button if running */}
              {['queued', 'running'].includes(activeJob.status) && (
                <button
                  onClick={handleCancel}
                  className="text-zinc-500 hover:text-white text-xs underline block mx-auto pt-2"
                >
                  Cancel Render
                </button>
              )}
            </div>
          )}

          {renderError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {renderError}
            </div>
          )}

          {/* Profile Selector (When no job active) */}
          {!activeJob && (
            <div className="space-y-3">
              <label className="text-zinc-400 font-medium text-xs">Render Quality</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setProfile('export')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    profile === 'export'
                      ? 'bg-[#c8f135]/15 border-[#c8f135] text-white ring-1 ring-[#c8f135]'
                      : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-sm">Full HD (1080×1920)</p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    30 fps • H.264 High • Production quality
                  </p>
                </button>

                <button
                  onClick={() => setProfile('preview')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    profile === 'preview'
                      ? 'bg-[#c8f135]/15 border-[#c8f135] text-white ring-1 ring-[#c8f135]'
                      : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-sm">Draft Preview (540×960)</p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Fast encoding • Lightweight preview
                  </p>
                </button>
              </div>

              {/* Export details checklist */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-[11px] text-zinc-400">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <CheckCircle className="w-3.5 h-3.5 text-[#c8f135]" />
                  <span>Cuts & Time Remapping applied</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <CheckCircle className="w-3.5 h-3.5 text-[#c8f135]" />
                  <span>
                    Audio: {project.audio.denoise.enabled ? 'Denoise active' : 'Natural audio'} •{' '}
                    {project.audio.normalize.enabled ? '-14 LUFS Loudnorm' : 'Standard gain'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <CheckCircle className="w-3.5 h-3.5 text-[#c8f135]" />
                  <span>{project.overlays.length} Text Overlays composited</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleStartRender}
                disabled={!validation.ok || isStarting}
                className="w-full py-3.5 rounded-2xl bg-[#c8f135] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm hover:scale-[1.02] active:scale-98 transition-all shadow-xl shadow-[#c8f135]/20 flex items-center justify-center gap-2"
              >
                {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                <span>Render & Export MP4</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
