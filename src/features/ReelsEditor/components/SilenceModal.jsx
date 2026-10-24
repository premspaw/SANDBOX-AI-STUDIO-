import React, { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { reelsApi } from '../services/reelsApi.js';

export function SilenceModal({
  isOpen,
  onClose,
  projectId,
  sources,
  onApplyGaps,
}) {
  const [selectedSourceId, setSelectedSourceId] = useState(sources[0]?.id || '');
  const [noiseDb, setNoiseDb] = useState(-35);
  const [minSilenceSec, setMinSilenceSec] = useState(0.6);
  const [paddingSec, setPaddingSec] = useState(0.15);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [detectedGaps, setDetectedGaps] = useState(null);
  const [selectedGapIds, setSelectedGapIds] = useState(new Set());

  if (!isOpen) return null;

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    setDetectedGaps(null);
    try {
      const job = await reelsApi.detectSilence(projectId, {
        sourceId: selectedSourceId,
        noiseDb,
        minSilenceSec,
        paddingSec,
      });

      // Poll job status until done
      const poll = async () => {
        const status = await reelsApi.getJobStatus(job.id);
        if (status.status === 'succeeded') {
          const gaps = status.result?.gaps || [];
          setDetectedGaps(gaps);
          setSelectedGapIds(new Set(gaps.map((g) => g.id)));
          setIsAnalyzing(false);
        } else if (status.status === 'failed') {
          setError(status.error || 'Silence analysis failed');
          setIsAnalyzing(false);
        } else {
          setTimeout(poll, 1000);
        }
      };
      poll();
    } catch (err) {
      setError(err.message || 'Failed to start analysis');
      setIsAnalyzing(false);
    }
  };

  const toggleGap = (id) => {
    const next = new Set(selectedGapIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedGapIds(next);
  };

  const handleApply = () => {
    if (!detectedGaps) return;
    const accepted = detectedGaps.filter((g) => selectedGapIds.has(g.id));
    onApplyGaps(accepted);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-white text-base">Silence & Gap Removal</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Acoustic Silence Disclaimer */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0 text-purple-400 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Acoustic Silence Detection: </span>
              Finds quiet pauses using audio levels. It keeps breathing buffers on each boundary to protect speech and natural dramatic pauses.
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-zinc-400 font-medium">Source Clip</label>
              <select
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-white outline-none cursor-pointer"
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id} className="bg-zinc-900">
                    {s.filename} ({s.meta.durationSec.toFixed(1)}s)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="space-y-1">
                <label className="text-zinc-400">Threshold (dB)</label>
                <input
                  type="number"
                  min="-60"
                  max="-15"
                  value={noiseDb}
                  onChange={(e) => setNoiseDb(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-white font-mono text-center outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Min Gap (s)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.3"
                  max="3"
                  value={minSilenceSec}
                  onChange={(e) => setMinSilenceSec(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-white font-mono text-center outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Padding (s)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="0.4"
                  value={paddingSec}
                  onChange={(e) => setPaddingSec(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-white font-mono text-center outline-none"
                />
              </div>
            </div>

            {!detectedGaps && !isAnalyzing && (
              <button
                onClick={handleStartAnalysis}
                className="w-full mt-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-600/20 active:scale-98"
              >
                Scan for Silences
              </button>
            )}

            {isAnalyzing && (
              <div className="flex items-center justify-center gap-2 py-6 text-purple-400 font-mono text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing audio waveforms on worker...</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Detected Gaps List */}
            {detectedGaps && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">
                    Found {detectedGaps.length} candidate gaps
                  </span>
                  <div className="space-x-2 text-[10px] text-zinc-400">
                    <button
                      onClick={() => setSelectedGapIds(new Set(detectedGaps.map((g) => g.id)))}
                      className="hover:text-white"
                    >
                      Select All
                    </button>
                    <span>|</span>
                    <button onClick={() => setSelectedGapIds(new Set())} className="hover:text-white">
                      Clear
                    </button>
                  </div>
                </div>

                {detectedGaps.length === 0 ? (
                  <p className="text-zinc-500 text-center py-4 text-xs font-mono">
                    No acoustic silences found with these settings.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {detectedGaps.map((g) => {
                      const isChecked = selectedGapIds.has(g.id);
                      const dur = (g.endSec - g.startSec).toFixed(2);
                      return (
                        <div
                          key={g.id}
                          onClick={() => toggleGap(g.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-purple-950/40 border-purple-500/50 text-white'
                              : 'bg-zinc-900 border-white/5 text-zinc-500'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="accent-purple-400 cursor-pointer"
                            />
                            <span className="font-mono text-[11px]">
                              {g.startSec.toFixed(2)}s — {g.endSec.toFixed(2)}s
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-zinc-400">-{dur}s</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {detectedGaps && detectedGaps.length > 0 && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10 bg-zinc-900/40">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selectedGapIds.size === 0}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30"
            >
              Apply Removals ({selectedGapIds.size})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
