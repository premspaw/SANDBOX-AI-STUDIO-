import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/apiConfig';
import { supabase } from '../../lib/supabase';
import { 
    Video, 
    Zap, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    Copy, 
    ExternalLink, 
    RefreshCw, 
    ShieldCheck, 
    Search, 
    Layers, 
    FileText, 
    ArrowRightLeft, 
    Calendar, 
    Check, 
    Trash2 
} from 'lucide-react';

const PROVIDER_OPTIONS = [
    { id: 'Auto-Detect', label: '⚡ Auto-Detect Provider' },
    { id: 'KIE.ai (Seedance)', label: 'KIE.ai (Seedance 2.0 / 2.5 / Mini)', defaultEngine: 'Seedance 2.0 Pro', cost: 20 },
    { id: 'Higgsfield AI (Remix)', label: 'Higgsfield AI (Motion Transfer / Swap)', defaultEngine: 'Higgsfield Motion Transfer', cost: 20 },
    { id: 'Kling AI', label: 'Kling AI (v1.5 / v3 Turbo)', defaultEngine: 'Kling V3 Turbo', cost: 30 },
    { id: 'Google Veo', label: 'Google Veo (Veo 2 / 3.1)', defaultEngine: 'Google Veo 3.1', cost: 50 },
    { id: 'Runway Gen-3', label: 'Runway (Gen-3 Alpha)', defaultEngine: 'Runway Gen-3', cost: 25 },
    { id: 'Luma Dream Machine', label: 'Luma Dream Machine', defaultEngine: 'Luma Dream Machine', cost: 25 },
    { id: 'Pika Labs', label: 'Pika Labs (v2.0)', defaultEngine: 'Pika 2.0', cost: 20 },
    { id: 'Third-Party AI Video', label: 'Direct MP4 Link / Other Provider', defaultEngine: 'AI Video Engine', cost: 20 },
];

export const SyncKieVideoManager = ({ setStatus }) => {
    const [activeTab, setActiveTab] = useState('sync'); // 'sync' | 'audit'
    const [userEmail, setUserEmail] = useState('');
    const [rawInput, setRawInput] = useState('');
    const [callingId, setCallingId] = useState('');
    const [provider, setProvider] = useState('Auto-Detect');
    const [prompt, setPrompt] = useState('');
    const [engine, setEngine] = useState('Seedance 2.0 Pro');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [autoDeductCredits, setAutoDeductCredits] = useState(true);
    const [customCredits, setCustomCredits] = useState('');
    const [detectedCost, setDetectedCost] = useState(20);
    const [isLoading, setIsLoading] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [copiedKey, setCopiedKey] = useState('');

    // Audit Log state
    const [auditLogs, setAuditLogs] = useState([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch audit logs
    const fetchAuditLogs = async () => {
        setIsLoadingLogs(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            const res = await fetch(getApiUrl('/api/admin/sync-audit-logs'), { headers });
            const data = await res.json();
            if (data.success && Array.isArray(data.logs)) {
                setAuditLogs(data.logs);
            }
        } catch (err) {
            console.warn('[SyncVideo] Failed to fetch audit logs:', err);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    useEffect(() => {
        fetchAuditLogs();
    }, []);

    // Smart input analysis for URL, task ID, prompt, provider, and credits
    const analyzeInput = (text) => {
        const trimmed = String(text || '').trim();
        let extUrl = '';
        let extPrompt = '';
        let extEngine = '';
        let extTaskId = '';
        let extProvider = '';
        let estimatedCost = 20;

        // 1. JSON parsing
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                const parsed = JSON.parse(trimmed);
                const candidate = parsed.data || parsed;
                extUrl = candidate.video_url || candidate.url || candidate.download_url || candidate.videoUrl || candidate.resultUrl || '';
                extPrompt = candidate.prompt || candidate.text || '';
                extEngine = candidate.model || candidate.engine || '';
                extTaskId = candidate.task_id || candidate.job_id || candidate.requestId || candidate.request_id || candidate.order_id || candidate.id || '';
            } catch (_err) {
                // Non-JSON input, fallback to regex
            }
        }

        // 2. Regex URL extraction
        if (!extUrl) {
            const urlMatch = trimmed.match(/https?:\/\/[^\s"'<>]+\.(?:mp4|mov|webm)[^\s"'<>]*/i) ||
                             trimmed.match(/https?:\/\/(?:tempfile\.aiquickdraw\.com|tempfile\.redpandaai\.co)[^\s"'<>]*/i);
            if (urlMatch) {
                extUrl = urlMatch[0];
            }
        }

        if (!extUrl && trimmed.startsWith('http')) {
            extUrl = trimmed;
        }

        // 3. Fallback Task ID extraction from URL or raw text
        if (!extTaskId && (extUrl || trimmed)) {
            const targetStr = extUrl || trimmed;
            const idMatch = targetStr.match(/(?:seedance|task|job|video|hf|res)[-_/]?([0-9a-zA-Z_-]{8,})/i) ||
                            targetStr.match(/\/([0-9]{10,})/);
            if (idMatch) {
                extTaskId = idMatch[1];
            }
        }

        // 4. Provider & Cost Detection
        const fullContent = `${extUrl} ${trimmed} ${extEngine}`.toLowerCase();
        if (fullContent.includes('aiquickdraw') || fullContent.includes('seedance') || fullContent.includes('redpandaai')) {
            extProvider = 'KIE.ai (Seedance)';
            if (fullContent.includes('2.5') || fullContent.includes('2-5')) {
                extEngine = 'Seedance 2.5 Pro';
                estimatedCost = 25;
            } else if (fullContent.includes('fast') || fullContent.includes('mini')) {
                extEngine = 'Seedance Fast';
                estimatedCost = 10;
            } else {
                extEngine = 'Seedance 2.0 Pro';
                estimatedCost = 20;
            }
        } else if (fullContent.includes('higgsfield') || fullContent.includes('remix') || fullContent.includes('genjutsu')) {
            extProvider = 'Higgsfield AI (Remix)';
            extEngine = 'Higgsfield Motion Transfer';
            estimatedCost = 20;
        } else if (fullContent.includes('kling') || fullContent.includes('kuaishou')) {
            extProvider = 'Kling AI';
            extEngine = 'Kling V3 Turbo';
            estimatedCost = 30;
        } else if (fullContent.includes('veo') || fullContent.includes('google')) {
            extProvider = 'Google Veo';
            extEngine = 'Google Veo 3.1';
            estimatedCost = 50;
        } else if (fullContent.includes('runway')) {
            extProvider = 'Runway Gen-3';
            extEngine = 'Runway Gen-3';
            estimatedCost = 25;
        } else if (fullContent.includes('luma')) {
            extProvider = 'Luma Dream Machine';
            extEngine = 'Luma Dream Machine';
            estimatedCost = 25;
        } else if (extUrl) {
            extProvider = 'Third-Party AI Video';
            estimatedCost = 20;
        }

        if (extTaskId && !callingId) setCallingId(extTaskId);
        if (extPrompt && !prompt) setPrompt(extPrompt);
        if (extEngine) setEngine(extEngine);
        if (extProvider && provider === 'Auto-Detect') setProvider(extProvider);
        setDetectedCost(estimatedCost);

        return { extUrl, extPrompt, extEngine, extTaskId, extProvider, estimatedCost };
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setRawInput(val);
        analyzeInput(val);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result;
            if (typeof content === 'string') {
                setRawInput(content);
                analyzeInput(content);
            }
        };
        reader.readAsText(file);
    };

    const handleProviderChange = (e) => {
        const chosen = e.target.value;
        setProvider(chosen);
        const opt = PROVIDER_OPTIONS.find(p => p.id === chosen);
        if (opt && opt.defaultEngine) {
            setEngine(opt.defaultEngine);
            setDetectedCost(opt.cost);
        }
    };

    const handleSync = async (e) => {
        e?.preventDefault();
        setErrorMsg('');
        setSyncResult(null);

        if (!userEmail.trim()) {
            setErrorMsg('Please enter target user email or user ID.');
            return;
        }

        const analysis = analyzeInput(rawInput);
        const effectiveUrl = analysis.extUrl || rawInput.trim();

        if (!effectiveUrl || !effectiveUrl.startsWith('http')) {
            setErrorMsg('Please enter a valid video URL or paste a response log containing an http/https video link.');
            return;
        }

        setIsLoading(true);

        const debitAmount = autoDeductCredits ? (customCredits !== '' ? Number(customCredits) : detectedCost) : 0;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const res = await fetch(getApiUrl('/api/admin/sync-video'), {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    email: userEmail.trim(),
                    videoUrl: effectiveUrl,
                    logContent: rawInput.trim(),
                    callingId: callingId.trim() || analysis.extTaskId,
                    provider: provider === 'Auto-Detect' ? analysis.extProvider : provider,
                    prompt: prompt.trim() || analysis.extPrompt || `${engine} Cinematic Video`,
                    engine,
                    aspectRatio,
                    deductCredits: debitAmount
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to sync video.');
            }

            setSyncResult(data);
            if (setStatus) {
                setStatus({ 
                    type: 'success', 
                    message: `✅ Video synced! Matched Calling ID: ${data.callingId} ➔ Asset ID: ${data.receivedAssetId}` 
                });
            }
            fetchAuditLogs();
        } catch (err) {
            console.error('[SyncVideoManager] Error:', err);
            setErrorMsg(err.message || 'An error occurred while syncing video.');
            if (setStatus) {
                setStatus({ type: 'error', message: err.message || 'Failed to sync video.' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (text, key) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(''), 2000);
    };

    const filteredLogs = auditLogs.filter(log => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (log.userEmail && log.userEmail.toLowerCase().includes(q)) ||
            (log.callingId && log.callingId.toLowerCase().includes(q)) ||
            (log.receivedAssetId && log.receivedAssetId.toLowerCase().includes(q)) ||
            (log.provider && log.provider.toLowerCase().includes(q)) ||
            (log.engine && log.engine.toLowerCase().includes(q))
        );
    });

    return (
        <div className="max-w-4xl space-y-6 text-left">
            {/* Header with Sub-tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#c8f135]/20 to-purple-500/20 border border-[#c8f135]/30 flex items-center justify-center text-[#c8f135] shadow-lg shadow-[#c8f135]/10">
                        <Layers size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                            Universal Video Sync & Audit
                            <span className="text-[10px] bg-[#c8f135]/15 text-[#c8f135] border border-[#c8f135]/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                                Multi-Provider
                            </span>
                        </h2>
                        <p className="text-xs text-gray-400">
                            Sync generated videos from KIE, Higgsfield, Kling, Veo, or 3rd-party APIs with Calling ID audit tracking.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10 shrink-0">
                    <button
                        onClick={() => setActiveTab('sync')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'sync'
                                ? 'bg-[#c8f135] text-black shadow-md shadow-[#c8f135]/20'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Sync & Import
                    </button>
                    <button
                        onClick={() => { setActiveTab('audit'); fetchAuditLogs(); }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === 'audit'
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <ShieldCheck size={14} />
                        <span>Audit Trail</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-gray-300 font-mono">
                            {auditLogs.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* TAB 1: SYNC & IMPORT */}
            {activeTab === 'sync' && (
                <div className="bg-[#12131a] border border-[#c8f135]/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#c8f135]/10 rounded-full blur-3xl pointer-events-none" />

                    {errorMsg && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSync} className="space-y-5">
                        {/* Target User & Provider */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                    Target User Email or UUID <span className="text-red-400">*</span>
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
                                    Provider / AI Platform
                                </label>
                                <select
                                    value={provider}
                                    onChange={handleProviderChange}
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#c8f135] transition-colors cursor-pointer"
                                >
                                    {PROVIDER_OPTIONS.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Raw Input / URL / Log */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                    Video Link, Raw JSON, or Task Log <span className="text-red-400">*</span>
                                </label>
                                <label className="text-[10px] text-[#c8f135] hover:underline cursor-pointer flex items-center gap-1 font-semibold">
                                    <FileText size={12} />
                                    <span>Upload .log / .json file</span>
                                    <input
                                        type="file"
                                        accept=".log,.json,.txt"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <textarea
                                rows={3}
                                value={rawInput}
                                onChange={handleInputChange}
                                placeholder="Paste KIE / Higgsfield / Kling / Veo link (.mp4) OR paste full task JSON response / terminal output"
                                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#c8f135] transition-colors font-mono resize-y"
                                required
                            />
                        </div>

                        {/* Audit Calling ID & Engine */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                        Calling Task / Job ID <span className="text-purple-400">(Audit Trace)</span>
                                    </label>
                                    {callingId && (
                                        <span className="text-[10px] text-emerald-400 font-mono">Matched from Log</span>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={callingId}
                                    onChange={(e) => setCallingId(e.target.value)}
                                    placeholder="e.g. 1791948214825 or external task ID"
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-purple-500/30 text-white text-xs outline-none focus:border-purple-400 transition-colors font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                    AI Engine / Model Tag
                                </label>
                                <input
                                    type="text"
                                    value={engine}
                                    onChange={(e) => setEngine(e.target.value)}
                                    placeholder="e.g. Seedance 2.0 Pro, Higgsfield Remix"
                                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#c8f135] transition-colors"
                                />
                            </div>
                        </div>

                        {/* Prompt & Credit Control */}
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
                                        Deduct Shorts (⚡)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="500"
                                        value={autoDeductCredits ? (customCredits !== '' ? customCredits : detectedCost) : 0}
                                        onChange={(e) => setCustomCredits(e.target.value)}
                                        disabled={!autoDeductCredits}
                                        className="w-full px-3 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-[#c8f135] transition-colors disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Auto-Deduct Toggle */}
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/30 border border-white/5">
                            <div className="flex items-center gap-2">
                                <Zap size={15} className="text-[#c8f135]" />
                                <span className="text-xs text-gray-300 font-semibold">Automatic Shorts Deduction</span>
                                <span className="text-[10px] text-gray-500">
                                    (Standard rate for {engine}: <strong className="text-white">{detectedCost}⚡</strong>)
                                </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoDeductCredits}
                                    onChange={(e) => setAutoDeductCredits(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c8f135]"></div>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#c8f135] to-[#a0dd20] hover:brightness-110 active:scale-[0.99] text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xl shadow-[#c8f135]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Downloading, Uploading to CDN & Matching Audit...</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap size={18} />
                                        <span>Sync Video & Verify Audit Matching</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Matched Audit Result Card */}
                    {syncResult && (
                        <div className="mt-8 p-6 rounded-3xl bg-black/60 border border-emerald-500/40 text-white space-y-5 animate-in fade-in shadow-2xl relative">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                    <CheckCircle2 size={18} />
                                    <span>Audit Match Verified & Synced Successfully!</span>
                                </div>
                                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono text-[10px] font-bold">
                                    STATUS: MATCHED_AND_VERIFIED
                                </span>
                            </div>

                            {/* Calling ID <-> Received Asset ID Match Block */}
                            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] uppercase font-bold tracking-wider text-purple-400 flex items-center gap-1 mb-1">
                                        <ArrowRightLeft size={11} /> Calling / Task ID (External)
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs text-white bg-black/60 px-2 py-1 rounded-md truncate max-w-full">
                                            {syncResult.callingId || 'N/A'}
                                        </span>
                                        <button
                                            onClick={() => handleCopy(syncResult.callingId, 'calling')}
                                            className="text-gray-400 hover:text-white p-1"
                                            title="Copy Calling ID"
                                        >
                                            {copiedKey === 'calling' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] uppercase font-bold tracking-wider text-[#c8f135] flex items-center gap-1 mb-1">
                                        <Layers size={11} /> Received Asset ID (Internal ZeroLens)
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs text-white bg-black/60 px-2 py-1 rounded-md truncate max-w-full">
                                            {syncResult.receivedAssetId || 'N/A'}
                                        </span>
                                        <button
                                            onClick={() => handleCopy(syncResult.receivedAssetId, 'received')}
                                            className="text-gray-400 hover:text-white p-1"
                                            title="Copy Received Asset ID"
                                        >
                                            {copiedKey === 'received' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Details row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <p className="text-gray-400 text-[10px] uppercase font-bold">Target User</p>
                                    <p className="font-semibold text-white truncate">{syncResult.user?.email || syncResult.user?.id}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-[10px] uppercase font-bold">Provider / Engine</p>
                                    <p className="font-semibold text-white truncate">{syncResult.provider} ({syncResult.engine})</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-[10px] uppercase font-bold">Credits Debited</p>
                                    <p className="font-semibold text-[#c8f135]">{syncResult.creditsDebited || 0} ⚡</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-[10px] uppercase font-bold">User Balance</p>
                                    <p className="font-semibold text-white">
                                        {syncResult.audit?.balanceAfter !== undefined && syncResult.audit?.balanceAfter !== null
                                            ? `${syncResult.audit?.balanceAfter} ⚡`
                                            : 'Preserved'}
                                    </p>
                                </div>
                            </div>

                            {/* Permanent CDN URL */}
                            <div>
                                <p className="text-gray-400 text-[10px] uppercase font-bold mb-1.5">Permanent ZeroLens CDN Link (Cloudflare R2)</p>
                                <div className="flex items-center gap-2 bg-black/80 p-3 rounded-2xl border border-white/10">
                                    <span className="font-mono text-[11px] text-[#c8f135] truncate flex-1 select-all">{syncResult.permanentUrl}</span>
                                    <button
                                        onClick={() => handleCopy(syncResult.permanentUrl, 'cdn')}
                                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                        {copiedKey === 'cdn' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                        <span>Copy Link</span>
                                    </button>
                                    <a
                                        href={syncResult.permanentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                                        title="Open video preview"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>

                            {/* Video Preview */}
                            {syncResult.permanentUrl && (
                                <div className="mt-4">
                                    <video
                                        src={syncResult.permanentUrl}
                                        controls
                                        className="w-full max-h-72 rounded-2xl bg-black object-contain border border-white/10 shadow-lg"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: AUDIT TRAIL HISTORY */}
            {activeTab === 'audit' && (
                <div className="bg-[#12131a] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <ShieldCheck size={18} className="text-purple-400" />
                                <span>Audit Trail & Job Verification</span>
                            </h3>
                            <p className="text-xs text-gray-400">
                                Historical log matching every external Calling ID with the landed ZeroLens Asset ID.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by ID or email..."
                                    className="pl-8 pr-4 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none focus:border-purple-400 w-52 sm:w-64"
                                />
                            </div>
                            <button
                                onClick={fetchAuditLogs}
                                disabled={isLoadingLogs}
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
                                title="Refresh Logs"
                            >
                                <RefreshCw size={14} className={isLoadingLogs ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl text-gray-500 text-xs">
                            {isLoadingLogs ? 'Loading audit records...' : 'No audit records found matching your query.'}
                        </div>
                    ) : (
                        <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/40">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-white/5 text-gray-400 uppercase font-black text-[10px] tracking-wider border-b border-white/10">
                                        <tr>
                                            <th className="p-3.5">Timestamp</th>
                                            <th className="p-3.5">User</th>
                                            <th className="p-3.5">Calling ID (External)</th>
                                            <th className="p-3.5">Received Asset ID</th>
                                            <th className="p-3.5">Provider / Engine</th>
                                            <th className="p-3.5">Cost</th>
                                            <th className="p-3.5">Match Status</th>
                                            <th className="p-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-gray-300">
                                        {filteredLogs.map((entry) => (
                                            <tr key={entry.auditId || entry.timestamp} className="hover:bg-white/[0.02] transition-colors font-mono">
                                                <td className="p-3.5 text-[11px] text-gray-400 whitespace-nowrap">
                                                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                                                </td>
                                                <td className="p-3.5 font-sans font-medium text-white truncate max-w-[140px]" title={entry.userEmail}>
                                                    {entry.userEmail || 'Local'}
                                                </td>
                                                <td className="p-3.5 text-purple-300 truncate max-w-[140px]" title={entry.callingId}>
                                                    <span className="bg-purple-950/40 border border-purple-500/30 px-2 py-0.5 rounded text-[10px]">
                                                        {entry.callingId}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 text-[#c8f135] truncate max-w-[140px]" title={entry.receivedAssetId}>
                                                    <span className="bg-[#c8f135]/10 border border-[#c8f135]/30 px-2 py-0.5 rounded text-[10px]">
                                                        {entry.receivedAssetId}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 font-sans text-gray-300 truncate max-w-[140px]">
                                                    {entry.engine || entry.provider}
                                                </td>
                                                <td className="p-3.5 text-[#c8f135] font-bold">
                                                    {entry.creditsDebited || 0}⚡
                                                </td>
                                                <td className="p-3.5 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                        <Check size={10} /> MATCHED
                                                    </span>
                                                </td>
                                                <td className="p-3.5 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5 font-sans">
                                                        <button
                                                            onClick={() => handleCopy(entry.permanentUrl, entry.auditId)}
                                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white transition-colors"
                                                            title="Copy Permanent CDN Link"
                                                        >
                                                            {copiedKey === entry.auditId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                                        </button>
                                                        <a
                                                            href={entry.permanentUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white transition-colors"
                                                            title="Watch Video"
                                                        >
                                                            <ExternalLink size={12} />
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
