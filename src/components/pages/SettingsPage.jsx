import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, CreditCard, Shield, Bell, LogOut, Save, Loader2, Coins, CheckSquare,
    Square, Zap, ChevronRight, Key, Sparkles, TrendingUp, Clock, Gem, Fingerprint,
    ShieldCheck, BellRing, KeyRound, Copy, Check, Sliders, Cpu, ArrowUpRight,
    ExternalLink, RefreshCw, Layers, Film, Volume2, Wand2, Eye, EyeOff, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import { cn } from '../../lib/utils';

export default function SettingsPage() {
    const profile = useAppStore(state => state.userProfile);
    const fetchUserProfile = useAppStore(state => state.fetchUserProfile);
    const setUserProfile = useAppStore(state => state.setUserProfile);
    const setActiveTabGlobal = useAppStore(state => state.setActiveTab);
    const showToast = useAppStore(state => state.showToast);

    const [activeTab, setActiveTab] = useState('credits'); // Default to credits & subscription
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [authUser, setAuthUser] = useState(null);
    const [copiedId, setCopiedId] = useState(false);

    // Profile form states
    const [fullName, setFullName] = useState('');
    const [marketingEmails, setMarketingEmails] = useState(true);
    const [securityAlerts, setSecurityAlerts] = useState(true);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [billingHistory, setBillingHistory] = useState([]);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [sendingReset, setSendingReset] = useState(false);

    // Studio Preferences
    const [defaultEngine, setDefaultEngine] = useState(() => localStorage.getItem('pref_default_engine') || 'gemini-omni-1.1-flash-preview');
    const [defaultAspect, setDefaultAspect] = useState(() => localStorage.getItem('pref_default_aspect') || '16:9');
    const [defaultRes, setDefaultRes] = useState(() => localStorage.getItem('pref_default_res') || '720p');
    const [autoAudio, setAutoAudio] = useState(() => localStorage.getItem('pref_auto_audio') !== 'false');
    const [autoMcpEnhance, setAutoMcpEnhance] = useState(() => localStorage.getItem('pref_auto_mcp') === 'true');

    // Admin Trial API settings
    const isAdmin = profile?.role === 'admin';
    const [useAdminTrialKey, setUseAdminTrialKey] = useState(false);
    const [adminTrialKey, setAdminTrialKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);

    // Top-up packs specification
    const creditPacks = [
        {
            id: 'pack_starter',
            name: 'Starter Fuel',
            credits: 50,
            price: '₹299',
            perCredit: '₹5.98 / cr',
            popular: false,
            badge: 'Quick Boost',
            description: 'Ideal for 5–7 high-fidelity video renders or 50 rapid image concepts.',
            color: 'from-blue-500/20 to-transparent',
            borderColor: 'border-blue-500/30',
            buttonClass: 'bg-white/10 hover:bg-white/20 text-white'
        },
        {
            id: 'pack_creator',
            name: 'Creator Pro',
            credits: 250,
            price: '₹999',
            perCredit: '₹3.99 / cr',
            popular: true,
            badge: 'MOST POPULAR',
            description: 'Best for creators producing daily UGC, Cinema 4K shots & motion drivers.',
            color: 'from-[#c8f135]/20 via-[#c8f135]/10 to-transparent',
            borderColor: 'border-[#c8f135]/60',
            buttonClass: 'bg-[#c8f135] hover:bg-[#d8ff43] text-black shadow-[0_0_20px_rgba(200,241,53,0.3)]'
        },
        {
            id: 'pack_studio',
            name: 'Studio Master',
            credits: 1000,
            price: '₹2,499',
            perCredit: '₹2.49 / cr',
            popular: false,
            badge: 'BEST VALUE',
            description: 'Massive capacity for production studios, commercial campaigns & agency workflows.',
            color: 'from-purple-500/20 via-fuchsia-500/10 to-transparent',
            borderColor: 'border-purple-500/40',
            buttonClass: 'bg-purple-500 hover:bg-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
        },
        {
            id: 'pack_enterprise',
            name: 'Enterprise Bulk',
            credits: 5000,
            price: '₹7,999',
            perCredit: '₹1.59 / cr',
            popular: false,
            badge: 'MAX VOLUME',
            description: 'Dedicated multi-seat capacity with high-speed GPU queues and VIP rendering.',
            color: 'from-cyan-500/20 via-blue-500/10 to-transparent',
            borderColor: 'border-cyan-500/40',
            buttonClass: 'bg-cyan-400 hover:cyan-300 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]'
        }
    ];

    // Load auth user on mount
    useEffect(() => {
        setUseAdminTrialKey(localStorage.getItem('useAdminTrialApiKey') === 'true');
        setAdminTrialKey(localStorage.getItem('adminTrialApiKey') || '');
        const loadUser = async () => {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user || null;

                if (user) {
                    setAuthUser(user);
                    const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
                    setFullName(metaName);
                    await fetchUserProfile(user.id);
                } else {
                    const { data: { user: netUser } } = await supabase.auth.getUser();
                    if (netUser) {
                        setAuthUser(netUser);
                        const metaName = netUser.user_metadata?.full_name || netUser.user_metadata?.name || '';
                        setFullName(metaName);
                        await fetchUserProfile(netUser.id);
                    }
                }
            } catch (err) {
                console.error('Failed to load auth user:', err);
            }
            setLoading(false);
        };
        loadUser();
    }, [fetchUserProfile]);

    // Sync profile data into form when it loads
    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || profile.name || authUser?.user_metadata?.full_name || '');
            setMarketingEmails(profile.marketing_emails ?? true);
            setSecurityAlerts(profile.security_alerts ?? true);
            setTwoFactorEnabled(profile.two_factor_enabled ?? false);
        }
    }, [profile, authUser?.user_metadata?.full_name]);

    // Load billing history when tab changes
    useEffect(() => {
        if (activeTab === 'credits' && (profile?.id || authUser?.id)) {
            const userId = profile?.id || authUser?.id;
            const fetchBillingHistory = async () => {
                try {
                    const { data } = await supabase
                        .from('billing_history')
                        .select('*')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false })
                        .limit(10);
                    setBillingHistory(data || []);
                } catch (err) {
                    console.error('Error fetching billing history:', err);
                }
            };
            fetchBillingHistory();
        }
    }, [activeTab, profile, authUser]);

    const handleUpdateProfile = async (e) => {
        e?.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const user = authUser;
            if (!user) throw new Error('You are not logged in.');

            const payload = {
                id: user.id,
                email: user.email || null,
                full_name: fullName,
                marketing_emails: marketingEmails,
                security_alerts: securityAlerts,
                two_factor_enabled: twoFactorEnabled,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('profiles')
                .upsert(payload, { onConflict: 'id' })
                .select('*')
                .single();

            if (error) throw error;
            if (data) {
                setUserProfile(data);
                setFullName(data.full_name || '');
            }
            if (showToast) showToast('Profile details updated successfully!', 'success');
            setMessage({ type: 'success', text: '✓ Profile updated successfully!' });
        } catch (err) {
            if (err.message?.includes('column') || err.message?.includes('schema')) {
                setMessage({ type: 'error', text: 'Schema updated on local storage session.' });
            } else {
                setMessage({ type: 'error', text: err.message });
            }
            if (showToast) showToast('Could not sync profile to cloud.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSavePreferences = () => {
        localStorage.setItem('pref_default_engine', defaultEngine);
        localStorage.setItem('pref_default_aspect', defaultAspect);
        localStorage.setItem('pref_default_res', defaultRes);
        localStorage.setItem('pref_auto_audio', String(autoAudio));
        localStorage.setItem('pref_auto_mcp', String(autoMcpEnhance));
        if (showToast) showToast('Studio AI preferences saved!', 'success');
    };

    const handleSaveAdminKeys = () => {
        localStorage.setItem('useAdminTrialApiKey', String(useAdminTrialKey));
        localStorage.setItem('adminTrialApiKey', adminTrialKey);
        if (showToast) showToast('API configuration saved successfully!', 'success');
    };

    const handleSendResetEmail = async () => {
        setSendingReset(true);
        try {
            const email = authUser?.email || profile?.email;
            if (!email) throw new Error('No email found.');
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });
            if (error) throw error;
            setResetEmailSent(true);
            if (showToast) showToast('Password reset link sent to your email!', 'success');
            setTimeout(() => setResetEmailSent(false), 10000);
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
            if (showToast) showToast(err.message, 'error');
        } finally {
            setSendingReset(false);
        }
    };

    const handleCopyUserId = () => {
        const id = profile?.id || authUser?.id || '';
        if (id) {
            navigator.clipboard.writeText(id);
            setCopiedId(true);
            if (showToast) showToast('User ID copied to clipboard!', 'info');
            setTimeout(() => setCopiedId(false), 2000);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    const displayName = fullName || profile?.full_name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || '';
    const displayEmail = authUser?.email || profile?.email || '';
    const firstWord = displayName.split(' ')[0] || displayEmail.split('@')[0] || 'Creator';
    const userCredits = profile?.shorts_balance ?? 100;
    const currentTier = profile?.tier || 'PRO';

    const tabs = [
        { id: 'credits', label: 'Shorts & Subscription', icon: Coins, badge: `${userCredits}⚡` },
        { id: 'profile', label: 'Account & Identity', icon: User },
        { id: 'preferences', label: 'Studio & AI Preferences', icon: Sliders },
        { id: 'security', label: 'Security & API Keys', icon: ShieldCheck },
        { id: 'notifications', label: 'Alerts & Webhooks', icon: Bell }
    ];

    if (loading) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-[#07070b]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-[#c8f135] animate-spin" />
                    <p className="text-zinc-500 text-xs font-mono font-bold uppercase tracking-widest">Loading Account Settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full overflow-y-auto custom-scrollbar bg-[#050508] text-white relative select-none font-sans">
            {/* Ambient Background Neon Glows */}
            <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-gradient-to-b from-[#c8f135]/10 via-emerald-500/5 to-transparent blur-[140px] pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-600/10 blur-[130px] pointer-events-none" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 relative z-10 space-y-6">
                
                {/* 1. TOP HERO PROFILE & CREDIT STATUS BANNER */}
                <div className="relative rounded-3xl bg-gradient-to-br from-white/[0.05] via-[#0b0b12] to-black border border-white/10 p-5 sm:p-6 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#c8f135]/10 to-transparent pointer-events-none" />
                    
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                        {/* User Identity Info */}
                        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                            <div className="relative shrink-0">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#c8f135] via-emerald-500 to-teal-600 p-[2px] shadow-[0_0_25px_rgba(200,241,53,0.3)]">
                                    <div className="w-full h-full rounded-[14px] bg-[#0c0c14] flex items-center justify-center overflow-hidden">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl sm:text-3xl font-black text-[#c8f135] uppercase">
                                                {firstWord.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#c8f135] border-2 border-black animate-pulse" />
                            </div>

                            <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase truncate">
                                        {displayName || 'ZeroLens Creator'}
                                    </h1>
                                    <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-[#c8f135]/15 text-[#c8f135] border border-[#c8f135]/30">
                                        {currentTier} PLAN
                                    </span>
                                    {isAdmin && (
                                        <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                                            ADMIN
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-zinc-400 font-mono truncate">{displayEmail}</p>
                                
                                <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-500 font-mono">
                                    <span>ID: {(profile?.id || authUser?.id || '').slice(0, 8)}...</span>
                                    <button
                                        type="button"
                                        onClick={handleCopyUserId}
                                        className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                        {copiedId ? <Check size={12} className="text-[#c8f135]" /> : <Copy size={12} />}
                                        <span>{copiedId ? 'Copied' : 'Copy'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* High-Energy Shorts Wallet & Plan Action */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-black/60 border border-white/10 p-3.5 sm:p-4 rounded-2xl backdrop-blur-xl shadow-inner shrink-0">
                            <div className="flex items-center gap-3 px-2">
                                <div className="w-10 h-10 rounded-xl bg-[#c8f135]/15 border border-[#c8f135]/40 flex items-center justify-center text-[#c8f135] shadow-[0_0_15px_rgba(200,241,53,0.25)]">
                                    <Coins className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                                        Shorts Balance
                                    </span>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-2xl font-black text-[#c8f135] tracking-tight">{userCredits}</span>
                                        <span className="text-[10px] font-mono font-bold text-zinc-400">⚡ Available</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 sm:pt-0 sm:border-l sm:border-white/10 sm:pl-3">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('credits')}
                                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#c8f135] hover:bg-[#d8ff43] text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(200,241,53,0.3)] active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    <Zap size={14} className="fill-black" />
                                    <span>Top Up / Renew</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTabGlobal('pricing')}
                                    className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider border border-white/10 transition-all cursor-pointer"
                                    title="View All Studio Plans"
                                >
                                    <ExternalLink size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. NAVIGATION SEGMENTED TABS */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory p-1.5 bg-[#0a0a12]/90 border border-white/[0.08] rounded-2xl backdrop-blur-xl shrink-0">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isSelected = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap select-none snap-start active:scale-95 shrink-0",
                                    isSelected
                                        ? "bg-[#c8f135] text-black shadow-[0_0_20px_rgba(200,241,53,0.3)] font-black"
                                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <Icon size={14} className={isSelected ? "text-black" : "text-zinc-400"} />
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span className={cn(
                                        "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md",
                                        isSelected ? "bg-black/20 text-black font-extrabold" : "bg-white/10 text-[#c8f135]"
                                    )}>
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* 3. ACTIVE TAB CONTENT VIEW */}
                <div className="space-y-6">

                    {/* ═════════ TAB 1: SHORTS & SUBSCRIPTION PACKS ═════════ */}
                    {activeTab === 'credits' && (
                        <div className="space-y-6">
                            
                            {/* Current Subscription Card */}
                            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-white/[0.03] to-[#0a0a12] border border-white/[0.08] backdrop-blur-xl space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                                    <div>
                                        <span className="text-[10px] font-mono text-[#c8f135] font-extrabold uppercase tracking-widest block mb-0.5">
                                            ACTIVE MEMBERSHIP
                                        </span>
                                        <h3 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight flex items-center gap-2">
                                            <span>{currentTier} Creator Tier</span>
                                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                                                Active · No Recurring Bill
                                            </span>
                                        </h3>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTabGlobal('pricing')}
                                            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-black uppercase tracking-wider border border-white/15 transition-all cursor-pointer flex items-center gap-1.5"
                                        >
                                            <Sparkles size={13} className="text-[#c8f135]" />
                                            <span>Upgrade Plan</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Model Costs Breakdown Matrix */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                                        Current Production Rates per Generation
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                                            <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                                <Zap size={11} className="text-[#c8f135]" /> Omni Flash Video
                                            </span>
                                            <p className="text-xs font-black text-white font-mono">5 cr / sec (4s = 20⚡)</p>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                                            <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                                <Film size={11} className="text-cyan-400" /> Kling Motion Driver
                                            </span>
                                            <p className="text-xs font-black text-white font-mono">7 cr / sec (5s = 35⚡)</p>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                                            <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                                <Layers size={11} className="text-purple-400" /> 4K AI Upscaler
                                            </span>
                                            <p className="text-xs font-black text-white font-mono">2 cr / upscale</p>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                                            <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                                <Volume2 size={11} className="text-emerald-400" /> Neural Speech
                                            </span>
                                            <p className="text-xs font-black text-white font-mono">Included Free</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Credit Top-Up Pack Showcase */}
                            <div className="space-y-3">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                                        <Coins className="w-4 h-4 text-[#c8f135]" />
                                        <span>Instant Credit Top-Up Packs (One-Time)</span>
                                    </h3>
                                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                                        Top up credits instantly without recurring monthly lock-ins. Credits never expire.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {creditPacks.map((pack) => (
                                        <div
                                            key={pack.id}
                                            className={cn(
                                                "relative rounded-3xl p-5 border flex flex-col justify-between transition-all bg-gradient-to-b shadow-xl overflow-hidden group hover:scale-[1.02]",
                                                pack.color,
                                                pack.borderColor
                                            )}
                                        >
                                            {pack.popular && (
                                                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-[#c8f135] text-black text-[8px] font-black uppercase tracking-widest shadow-md">
                                                    {pack.badge}
                                                </div>
                                            )}
                                            {!pack.popular && (
                                                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/10 text-white text-[8px] font-mono font-bold uppercase tracking-wider border border-white/10">
                                                    {pack.badge}
                                                </div>
                                            )}

                                            <div className="space-y-2 pt-2">
                                                <span className="text-xs font-bold text-zinc-300 block">{pack.name}</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-3xl font-black text-white">{pack.credits}</span>
                                                    <span className="text-xs font-black text-[#c8f135]">⚡ Shorts</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs font-mono border-b border-white/10 pb-2 text-zinc-400">
                                                    <span className="text-base font-black text-white">{pack.price}</span>
                                                    <span className="text-[10px]">{pack.perCredit}</span>
                                                </div>
                                                <p className="text-[11px] text-zinc-400 leading-relaxed min-h-[44px]">
                                                    {pack.description}
                                                </p>
                                            </div>

                                            <div className="pt-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTabGlobal('pricing')}
                                                    className={cn(
                                                        "w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95",
                                                        pack.buttonClass
                                                    )}
                                                >
                                                    <Zap size={13} className="fill-current" />
                                                    <span>Get {pack.credits}⚡</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Billing & Transaction Records */}
                            <div className="p-5 rounded-3xl bg-black/40 border border-white/[0.08] backdrop-blur-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                                        <CreditCard size={14} className="text-[#c8f135]" />
                                        <span>Recent Billing & Credit Receipts</span>
                                    </h4>
                                    <span className="text-[10px] font-mono text-zinc-500">Secure Razorpay / Supabase Sync</span>
                                </div>

                                {billingHistory.length === 0 ? (
                                    <div className="py-6 text-center text-xs text-zinc-500 font-mono bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                                        No recent billing charges recorded for this session.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-white/10 text-zinc-400 font-mono text-[10px] uppercase">
                                                    <th className="pb-2">Date</th>
                                                    <th className="pb-2">Description</th>
                                                    <th className="pb-2">Amount</th>
                                                    <th className="pb-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 font-mono">
                                                {billingHistory.map((item, i) => (
                                                    <tr key={i} className="hover:bg-white/[0.02]">
                                                        <td className="py-2.5 text-zinc-400">{new Date(item.created_at).toLocaleDateString()}</td>
                                                        <td className="py-2.5 font-semibold text-white">{item.description || 'Credits Top-Up'}</td>
                                                        <td className="py-2.5 text-[#c8f135] font-black">{item.amount || '₹999'}</td>
                                                        <td className="py-2.5">
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                                                                Paid
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═════════ TAB 2: ACCOUNT & IDENTITY ═════════ */}
                    {activeTab === 'profile' && (
                        <div className="p-5 sm:p-6 rounded-3xl bg-black/40 border border-white/[0.08] backdrop-blur-xl space-y-6">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-white">Account Profile</h3>
                                <p className="text-xs text-zinc-400 font-mono mt-0.5">Manage your display name and public creator identity.</p>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                                        Full Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Enter your name"
                                        className="w-full bg-[#0a0a10] border border-white/15 focus:border-[#c8f135] rounded-xl p-3 text-xs text-white outline-none transition-all shadow-inner font-medium"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-300 flex items-center justify-between">
                                        <span>Registered Email Address</span>
                                        <span className="text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                                            <Check size={10} /> Verified
                                        </span>
                                    </label>
                                    <input
                                        type="email"
                                        value={displayEmail}
                                        disabled
                                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-zinc-400 cursor-not-allowed font-mono"
                                    />
                                </div>

                                {message.text && (
                                    <div className={cn(
                                        "p-3 rounded-xl text-xs font-mono font-medium border",
                                        message.type === 'success' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"
                                    )}>
                                        {message.text}
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-6 py-2.5 rounded-xl bg-[#c8f135] hover:bg-[#d8ff43] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(200,241,53,0.3)] transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        <span>Save Profile Changes</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* ═════════ TAB 3: STUDIO & AI ENGINE PREFERENCES ═════════ */}
                    {activeTab === 'preferences' && (
                        <div className="p-5 sm:p-6 rounded-3xl bg-black/40 border border-white/[0.08] backdrop-blur-xl space-y-6">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                                    <Sliders className="w-4 h-4 text-[#c8f135]" />
                                    <span>Studio AI Engine & Render Defaults</span>
                                </h3>
                                <p className="text-xs text-zinc-400 font-mono mt-0.5">Customize your preferred defaults for the Studio generator.</p>
                            </div>

                            <div className="space-y-4 max-w-xl">
                                {/* Default Engine */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                                        Default Video Model
                                    </label>
                                    <select
                                        value={defaultEngine}
                                        onChange={(e) => setDefaultEngine(e.target.value)}
                                        className="w-full bg-[#0a0a10] border border-white/15 focus:border-[#c8f135] rounded-xl p-3 text-xs text-white outline-none font-medium cursor-pointer"
                                    >
                                        <option value="gemini-omni-1.1-flash-preview">Google Gemini Omni 1.1 Flash (Multimodal Keyframes)</option>
                                        <option value="kling-motion">Kling 3.0 Motion Control (Subject Image + Motion Driver)</option>
                                        <option value="veo-3.1-preview">Veo 3.1 Cinema Engine (High-Fidelity)</option>
                                    </select>
                                </div>

                                {/* Default Aspect Ratio */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                                        Default Framing & Aspect Ratio
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: '16:9 Widescreen', val: '16:9' },
                                            { label: '9:16 Portrait Reel', val: '9:16' },
                                            { label: '1:1 Square Post', val: '1:1' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.val}
                                                type="button"
                                                onClick={() => setDefaultAspect(opt.val)}
                                                className={cn(
                                                    "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none",
                                                    defaultAspect === opt.val
                                                        ? "bg-[#c8f135]/15 border-[#c8f135]/60 text-[#c8f135] shadow-[0_0_15px_rgba(200,241,53,0.15)] font-black"
                                                        : "bg-black/50 border-white/10 text-zinc-400 hover:text-white"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Auto Prompt Enhancer */}
                                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                            <Wand2 size={13} className="text-[#c8f135]" /> Auto-Enhance Prompts with Vertex AI MCP
                                        </span>
                                        <p className="text-[11px] text-zinc-400">
                                            Expands prompts with cinematic camera direction and lighting keywords.
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={autoMcpEnhance}
                                        onChange={(e) => setAutoMcpEnhance(e.target.checked)}
                                        className="w-4 h-4 accent-[#c8f135] cursor-pointer"
                                    />
                                </div>

                                {/* Audio Auto-Gen */}
                                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                            <Volume2 size={13} className="text-cyan-400" /> Default Synchronized Sound Audio Track
                                        </span>
                                        <p className="text-[11px] text-zinc-400">
                                            Automatically produces native sound design for generated video clips.
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={autoAudio}
                                        onChange={(e) => setAutoAudio(e.target.checked)}
                                        className="w-4 h-4 accent-[#c8f135] cursor-pointer"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={handleSavePreferences}
                                        className="px-6 py-2.5 rounded-xl bg-[#c8f135] hover:bg-[#d8ff43] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(200,241,53,0.3)] transition-all cursor-pointer active:scale-95"
                                    >
                                        Save Studio Preferences
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═════════ TAB 4: SECURITY & API KEYS ═════════ */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            {/* Password & Authentication */}
                            <div className="p-5 sm:p-6 rounded-3xl bg-black/40 border border-white/[0.08] backdrop-blur-xl space-y-4">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                                        <KeyRound className="w-4 h-4 text-[#c8f135]" />
                                        <span>Password & Session Security</span>
                                    </h3>
                                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                                        Secure your login credentials or request a magic password reset link.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <div>
                                        <span className="text-xs font-bold text-white block">Reset Account Password</span>
                                        <p className="text-[11px] text-zinc-400">
                                            We will send a secure password reset link to <span className="text-white font-mono">{displayEmail}</span>.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSendResetEmail}
                                        disabled={sendingReset || resetEmailSent}
                                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/10 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                                    >
                                        {sendingReset ? 'Sending...' : resetEmailSent ? 'Link Sent ✓' : 'Send Reset Link'}
                                    </button>
                                </div>

                                <div className="pt-2 flex items-center justify-between border-t border-white/5">
                                    <span className="text-xs text-zinc-400 font-mono">Sign out of all devices and active sessions</span>
                                    <button
                                        type="button"
                                        onClick={handleSignOut}
                                        className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                                    >
                                        <LogOut size={13} />
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            </div>

                            {/* Developer & Admin API Configuration */}
                            <div className="p-5 sm:p-6 rounded-3xl bg-black/40 border border-white/[0.08] backdrop-blur-xl space-y-4">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                                        <Cpu className="w-4 h-4 text-cyan-400" />
                                        <span>Vertex AI MCP & Developer API Overrides</span>
                                    </h3>
                                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                                        Optionally override with custom Google Cloud Vertex AI Service Account keys.
                                    </p>
                                </div>

                                <div className="space-y-3 max-w-xl">
                                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                                        <div className="space-y-0.5">
                                            <span className="text-xs font-bold text-white block">Use Custom Admin API Trial Key</span>
                                            <p className="text-[11px] text-zinc-400">Routes calls through your custom API quota.</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={useAdminTrialKey}
                                            onChange={(e) => setUseAdminTrialKey(e.target.checked)}
                                            className="w-4 h-4 accent-[#c8f135] cursor-pointer"
                                        />
                                    </div>

                                    {useAdminTrialKey && (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                                                Admin Trial Key / Bearer Token
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showApiKey ? 'text' : 'password'}
                                                    value={adminTrialKey}
                                                    onChange={(e) => setAdminTrialKey(e.target.value)}
                                                    placeholder="AIzaSy..."
                                                    className="w-full bg-[#0a0a10] border border-white/15 focus:border-cyan-400 rounded-xl p-3 pr-10 text-xs text-white outline-none font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowApiKey(!showApiKey)}
                                                    className="absolute top-1/2 -translate-y-1/2 right-3 text-zinc-400 hover:text-white"
                                                >
                                                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <button
                                            type="button"
                                            onClick={handleSaveAdminKeys}
                                            className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95"
                                        >
                                            Save API Configuration
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═════════ TAB 5: ALERTS & NOTIFICATIONS ═════════ */}
                    {activeTab === 'notifications' && (
                        <div className="p-5 sm:p-6 rounded-3xl bg-black/40 border border-white/[0.08] backdrop-blur-xl space-y-6">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-[#c8f135]" />
                                    <span>Notifications & Alerts</span>
                                </h3>
                                <p className="text-xs text-zinc-400 font-mono mt-0.5">Control how ZeroLens notifies you of generation completions and security events.</p>
                            </div>

                            <div className="space-y-3 max-w-xl">
                                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-bold text-white block">Security & Authentication Alerts</span>
                                        <p className="text-[11px] text-zinc-400">Instant notification when a new device signs in.</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={securityAlerts}
                                        onChange={(e) => setSecurityAlerts(e.target.checked)}
                                        className="w-4 h-4 accent-[#c8f135] cursor-pointer"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-bold text-white block">Low Shorts Balance Warning</span>
                                        <p className="text-[11px] text-zinc-400">Alerts you when your balance drops below 20⚡.</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={true}
                                        disabled
                                        className="w-4 h-4 accent-[#c8f135] opacity-60"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-bold text-white block">Product Updates & Model Releases</span>
                                        <p className="text-[11px] text-zinc-400">Be first to test new Omni & Veo checkpoints.</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={marketingEmails}
                                        onChange={(e) => setMarketingEmails(e.target.checked)}
                                        className="w-4 h-4 accent-[#c8f135] cursor-pointer"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={handleUpdateProfile}
                                        className="px-6 py-2.5 rounded-xl bg-[#c8f135] hover:bg-[#d8ff43] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(200,241,53,0.3)] transition-all cursor-pointer active:scale-95"
                                    >
                                        Save Notification Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
