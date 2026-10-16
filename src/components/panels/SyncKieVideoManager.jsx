import React, { useState } from 'react';
import { getApiUrl } from '../../config/apiConfig';
import { supabase } from '../../lib/supabase';
import { Video, Zap, CheckCircle2, AlertCircle, Loader2, Copy, ExternalLink, RefreshCw } from 'lucide-react';

export const SyncKieVideoManager = ({ setStatus }) => {
    const [userEmail, setUserEmail] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [prompt, setPrompt] = useState('');
    const [engine, setEngine] = useState('Seedance 2.0 Pro');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [deductCredits, setDeductCredits] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [copied, setCopied] = useState(false);

    const handleSync = async (e) => {
        e?.preventDefault();
        setErrorMsg('');
        setSyncResult(null);

        if (!userEmail.trim()) {
            setErrorMsg('Please enter a user email or user ID.');
            return;
        }
        if (!videoUrl.trim() || !videoUrl.startsWith('http')) {
            setErrorMsg('Please enter a valid remote video URL (e.g. from KIE or tempfile).');
            return;
        }

        setIsLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = {
                'Content-Type': 'application/json'
            };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const res = await fetch(getApiUrl('/api/admin/sync-kie-video'), {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    email: userEmail.trim(),
                    videoUrl: videoUrl.trim(),
                    prompt: prompt.trim() || 'Seedance 2.0 Cinematic Video',
                    engine,
                    aspectRatio,
                    deductCredits: Number(deductCredits) || 0
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to sync video.');
            }

            setSyncResult(data);
            if (setStatus) {
                setStatus({ type: 'success', message: `✅ Successfully synced video to ${data.user?.email || userEmail}!` });
            }
        } catch (err) {
            console.error('[SyncKieVideoManager] Error:', err);
            setErrorMsg(err.message || 'An error occurred while syncing video.');
            if (setStatus) {
                setStatus({ type: 'error', message: err.message || 'Failed to sync video.' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-3xl space-y-6 text-left">
            <div className="bg-[#12131a] border border-[#c8f135]/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#c8f135]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-[#c8f135]/15 border border-[#c8f135]/30 flex items-center justify-center text-[#c8f135]">
                        <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white tracking-wide">Sync KIE Video to User Gallery</h3>
                        <p className="text-xs text-gray-400">
                            Import any generated video from KIE.ai into a user's gallery with permanent CDN hosting.
                        </p>
                    </div>
                </div>

                {errorMsg && (
                    <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSync} className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                User Email or UUID <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={userEmail}
                                onChange={(e) => setUserEmail(e.target.value)}
                                placeholder="e.g. user@gmail.com"
                                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#c8f135] transition-colors"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                AI Engine
                            </label>
                            <select
                                value={engine}
                                onChange={(e) => setEngine(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#c8f135] transition-colors cursor-pointer"
                            >
                                <option value="Seedance 2.0 Pro">Seedance 2.0 Pro</option>
                                <option value="Seedance 2.5">Seedance 2.5 Pro</option>
                                <option value="Seedance Fast">Seedance Fast</option>
                                <option value="Google Veo 3.1">Google Veo 3.1</option>
                                <option value="Omni Flash 1.1">Omni Flash 1.1</option>
                                <option value="Kling V3 Turbo">Kling V3 Turbo</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                            KIE Video URL (or tempfile URL) <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://tempfile.aiquickdraw.com/seedance/... or any .mp4 link"
                            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#c8f135] transition-colors font-mono"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                Prompt / Description (Optional)
                            </label>
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g. Cinematic shot of neon street"
                                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#c8f135] transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                    Aspect Ratio
                                </label>
                                <select
                                    value={aspectRatio}
                                    onChange={(e) => setAspectRatio(e.target.value)}
                                    className="w-full px-3 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#c8f135] transition-colors cursor-pointer"
                                >
                                    <option value="16:9">16:9 (Landscape)</option>
                                    <option value="9:16">9:16 (Portrait / Reel)</option>
                                    <option value="1:1">1:1 (Square)</option>
                                    <option value="4:3">4:3</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                    Deduct Credits
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="200"
                                    value={deductCredits}
                                    onChange={(e) => setDeductCredits(Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full px-3 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#c8f135] transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 px-6 rounded-2xl bg-[#c8f135] hover:bg-[#b5dc28] active:scale-[0.99] text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg shadow-[#c8f135]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Downloading & Uploading to CDN...</span>
                                </>
                            ) : (
                                <>
                                    <Zap size={16} />
                                    <span>Sync Video to User Gallery</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {syncResult && (
                    <div className="mt-6 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-white space-y-4 animate-in fade-in">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                            <CheckCircle2 size={16} />
                            <span>{syncResult.message}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                                <p className="text-gray-400 text-[10px] uppercase font-bold">User</p>
                                <p className="font-semibold text-white">{syncResult.user?.email || syncResult.user?.id}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-[10px] uppercase font-bold">Credits Debited</p>
                                <p className="font-semibold text-white">{syncResult.creditsDebited || 0} ⚡</p>
                            </div>
                        </div>

                        <div>
                            <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Permanent CDN URL</p>
                            <div className="flex items-center gap-2 bg-black/50 p-2.5 rounded-xl border border-white/10">
                                <span className="font-mono text-[11px] text-[#c8f135] truncate flex-1">{syncResult.permanentUrl}</span>
                                <button
                                    onClick={() => handleCopy(syncResult.permanentUrl)}
                                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                                    title="Copy URL"
                                >
                                    <Copy size={13} />
                                </button>
                                <a
                                    href={syncResult.permanentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    title="Open video"
                                >
                                    <ExternalLink size={13} />
                                </a>
                            </div>
                            {copied && <p className="text-[10px] text-emerald-400 mt-1">Copied to clipboard!</p>}
                        </div>

                        {syncResult.permanentUrl && (
                            <div className="mt-3">
                                <video
                                    src={syncResult.permanentUrl}
                                    controls
                                    className="w-full max-h-60 rounded-xl bg-black object-contain border border-white/10"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
