import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, CreditCard, Shield, Bell, LogOut, Save, Loader2, Coins, CheckSquare, Square, Zap, ChevronRight, Key, Sparkles, TrendingUp, Clock, Gem, Fingerprint, ShieldCheck, BellRing, KeyRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';

export default function SettingsPage() {
    const profile = useAppStore(state => state.userProfile);
    const fetchUserProfile = useAppStore(state => state.fetchUserProfile);
    const setUserProfile = useAppStore(state => state.setUserProfile);
    const setActiveTabGlobal = useAppStore(state => state.setActiveTab);

    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [authUser, setAuthUser] = useState(null);

    // Form states
    const [fullName, setFullName] = useState('');
    const [marketingEmails, setMarketingEmails] = useState(true);
    const [securityAlerts, setSecurityAlerts] = useState(true);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [billingHistory, setBillingHistory] = useState([]);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [sendingReset, setSendingReset] = useState(false);

    // Admin Trial API settings
    const isAdmin = profile?.role === 'admin';
    const [useAdminTrialKey, setUseAdminTrialKey] = useState(false);
    const [adminTrialKey, setAdminTrialKey] = useState('');

    // Load auth user on mount — use getSession() first (reads from localStorage instantly)
    useEffect(() => {
        setUseAdminTrialKey(localStorage.getItem('useAdminTrialApiKey') === 'true');
        setAdminTrialKey(localStorage.getItem('adminTrialApiKey') || '');
        const loadUser = async () => {
            setLoading(true);
            try {
                // getSession reads from localStorage — works even without network
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user || null;

                if (user) {
                    setAuthUser(user);
                    const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
                    setFullName(metaName);
                    await fetchUserProfile(user.id);
                } else {
                    // Fallback: try network call
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
        if (activeTab === 'billing' && (profile?.id || authUser?.id)) {
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
        e.preventDefault();
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
            setMessage({ type: 'success', text: '✓ Profile updated successfully!' });
        } catch (err) {
            // If column doesn't exist yet, show helpful message
            if (err.message?.includes('column') || err.message?.includes('schema')) {
                setMessage({ type: 'error', text: 'Schema needs updating. Please run the SQL migration in Supabase dashboard.' });
            } else {
                setMessage({ type: 'error', text: err.message });
            }
        } finally {
            setSaving(false);
        }
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
            setTimeout(() => setResetEmailSent(false), 10000);
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSendingReset(false);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    // Display name: prefer saved full_name, then auth metadata, then email prefix
    const displayName = fullName || profile?.full_name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || '';
    const displayEmail = authUser?.email || profile?.email || '';
    const firstWord = displayName.split(' ')[0] || displayEmail.split('@')[0] || 'there';

    const tierColors = {
        'FREE': 'from-white/10 to-white/5 border-white/10 text-white',
        'STARTER': 'from-[#bef264]/20 to-[#bef264]/5 border-[#bef264]/30 text-[#bef264]',
        'INFLUENCER': 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
        'DIRECTOR': 'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-400',
        'ENTERPRISE': 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400',
    };
    const currentTier = profile?.tier || 'FREE';
    const tierStyle = tierColors[currentTier] || tierColors['FREE'];

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-[#bef264] animate-spin" />
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Loading Profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full overflow-y-auto custom-scrollbar relative bg-black">
            <div className="absolute inset-0 bg-gradient-to-br from-[#bef264]/[0.03] to-transparent pointer-events-none" />
            <div className="w-full h-full pt-6 md:pt-8 pb-20 px-6 md:px-10 lg:px-12 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-[1800px] mx-auto space-y-8"
                >
                {/* Mobile Back Button */}
                <button
                    onClick={() => setActiveTabGlobal('home')}
                    className="lg:hidden flex items-center gap-2 text-white/30 hover:text-[#bef264] transition-colors mb-4"
                >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Back to Studio</span>
                </button>

                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-white/10 pb-8 gap-6">
                    <div className="flex items-center gap-4">
                        {/* Avatar with initials */}
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-[#bef264]/30 to-[#bef264]/10 border border-[#bef264]/20 flex items-center justify-center shrink-0">
                            <span className="text-xl md:text-2xl font-black text-[#bef264] uppercase">
                                {firstWord.charAt(0)}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-xl md:text-3xl font-black tracking-tight text-white uppercase italic">
                                {displayName || 'Account Settings'}
                            </h1>
                            <p className="text-white/40 text-[10px] md:text-xs font-mono mt-1 uppercase tracking-widest">{displayEmail}</p>
                        </div>
                    </div>

                    {/* Credits Badge */}
                    <div className="flex items-center justify-between sm:justify-start gap-4 bg-white/5 border border-white/10 px-4 py-3 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Coins className="w-5 h-5 text-[#bef264]" />
                            <div>
                                <p className="text-[9px] text-white/40 font-black uppercase tracking-widest leading-none">Shorts Balance</p>
                                <p className="text-lg font-black text-[#bef264] mt-0.5 leading-none">{profile?.shorts_balance ?? 0}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveTabGlobal('pricing')}
                            className="bg-[#bef264] text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#a3d951] active:scale-95 transition-all ml-4 shadow-lg shadow-[#bef264]/10"
                        >
                            TOP UP
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar Nav */}
                    <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible no-scrollbar pb-2 lg:pb-0 gap-2">
                        {[
                            { id: 'profile', label: 'Profile', icon: User },
                            { id: 'billing', label: 'Billing', icon: CreditCard },
                            { id: 'security', label: 'Security', icon: Shield },
                            { id: 'notifications', label: 'Alerts', icon: Bell },
                            ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Key }] : [])
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => { setActiveTab(item.id); setMessage({ type: '', text: '' }); }}
                                className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all whitespace-nowrap min-w-fit lg:w-full ${activeTab === item.id
                                    ? item.id === 'admin' 
                                        ? 'bg-red-500 text-white font-black shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                                        : 'bg-[#bef264] text-black font-black shadow-[0_0_20px_rgba(190,242,100,0.2)]'
                                    : 'text-white/40 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <item.icon size={16} className="shrink-0" />
                                <span className="text-[10px] lg:text-xs uppercase tracking-widest">{item.label}</span>
                            </button>
                        ))}
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 px-5 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all whitespace-nowrap min-w-fit lg:w-full lg:mt-8 border border-transparent hover:border-red-500/20"
                        >
                            <LogOut size={16} className="shrink-0" />
                            <span className="text-[10px] lg:text-xs uppercase tracking-widest font-black">Sign Out</span>
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* ── PROFILE TAB ── */}
                        <AnimatePresence mode="wait">
                            {activeTab === 'profile' && (
                                <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

                                    {/* Greeting */}
                                    <div className="relative bg-gradient-to-r from-[#bef264]/15 via-[#bef264]/5 to-transparent border border-[#bef264]/15 rounded-2xl p-6 md:p-8 overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#bef264]/5 blur-3xl rounded-full" />
                                        <div className="flex items-start gap-4 relative z-10">
                                            <div className="w-10 h-10 rounded-xl bg-[#bef264]/20 border border-[#bef264]/30 flex items-center justify-center shrink-0 mt-1">
                                                <Sparkles className="w-5 h-5 text-[#bef264]" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight italic">
                                                    Welcome back, <span className="text-[#bef264]">{firstWord}!</span>
                                                </h2>
                                                <p className="text-white/50 text-xs mt-2 leading-relaxed max-w-sm">
                                                    Your cinematic AI studio is ready. Use the tabs to manage billing, security, and alerts.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Account Overview — read-only stats */}
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-5">
                                        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                            <User size={14} className="text-[#bef264]" /> Account Overview
                                        </h3>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Email */}
                                            <div className="flex items-center gap-3 p-4 bg-black/30 rounded-xl border border-white/5">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                                    <Mail size={14} className="text-white/30" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Email</p>
                                                    <p className="text-xs font-bold text-white truncate">{displayEmail || '—'}</p>
                                                </div>
                                            </div>

                                            {/* Plan */}
                                            <div className="flex items-center gap-3 p-4 bg-black/30 rounded-xl border border-white/5">
                                                <div className="w-8 h-8 rounded-lg bg-[#bef264]/10 flex items-center justify-center shrink-0">
                                                    <Zap size={14} className="text-[#bef264]" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Current Plan</p>
                                                    <p className="text-xs font-black text-[#bef264] uppercase">{currentTier}</p>
                                                </div>
                                            </div>

                                            {/* Credits */}
                                            <div className="flex items-center gap-3 p-4 bg-black/30 rounded-xl border border-white/5">
                                                <div className="w-8 h-8 rounded-lg bg-[#bef264]/10 flex items-center justify-center shrink-0">
                                                    <Coins size={14} className="text-[#bef264]" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Shorts Balance</p>
                                                    <p className="text-xs font-black text-white">{profile?.shorts_balance ?? 0} Credits</p>
                                                </div>
                                            </div>

                                            {/* Member Since */}
                                            <div className="flex items-center gap-3 p-4 bg-black/30 rounded-xl border border-white/5">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                                    <Clock size={14} className="text-white/30" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Member Since</p>
                                                    <p className="text-xs font-bold text-white">
                                                        {authUser?.created_at
                                                            ? new Date(authUser.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                            : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="pt-2 flex flex-wrap gap-3">
                                            <button
                                                onClick={() => setActiveTabGlobal('pricing')}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-[#bef264] text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all"
                                            >
                                                <TrendingUp size={12} /> Upgrade Plan
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('security')}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-white hover:bg-white/10 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all active:scale-95"
                                            >
                                                <Shield size={12} /> Security
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── BILLING TAB ── */}
                            {activeTab === 'billing' && (
                                <motion.div key="billing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                                    <div className={`bg-gradient-to-br ${tierStyle} border rounded-2xl p-8 relative overflow-hidden`}>
                                        <div className="absolute -right-8 -top-8 w-40 h-40 bg-current opacity-5 blur-3xl rounded-full" />

                                        <div className="flex items-start justify-between relative z-10">
                                            <div>
                                                <h2 className="text-lg font-black text-white uppercase tracking-wider italic">Membership</h2>
                                                <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mt-1">
                                                    Since: {profile?.updated_at
                                                        ? new Date(profile.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                                                        : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                                                    }
                                                </p>
                                            </div>
                                            <div className="px-4 py-1.5 bg-current/20 border border-current/40 rounded-full backdrop-blur-sm">
                                                <span className="text-[11px] font-black uppercase tracking-widest leading-none">{currentTier} PLAN</span>
                                            </div>
                                        </div>

                                        <div className="mt-8 grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-black/20 border border-white/5 rounded-xl">
                                                <div className="text-[9px] text-white/40 font-black uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                                    <Coins size={9} className="text-[#bef264]" /> Monthly Allowance
                                                </div>
                                                <div className="text-lg font-black text-white">
                                                    {currentTier === 'STARTER' ? '400 Credits' :
                                                     currentTier === 'INFLUENCER' ? '2,500 Credits' :
                                                     currentTier === 'DIRECTOR' ? '5,500 Credits' :
                                                     currentTier === 'ENTERPRISE' ? '11,000 Credits' : '50 Free'}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-black/20 border border-white/5 rounded-xl">
                                                <div className="text-[9px] text-white/40 font-black uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                                    <Zap size={9} className="text-[#bef264]" /> Current Balance
                                                </div>
                                                <div className="text-lg font-black text-[#bef264]">{profile?.shorts_balance ?? 0} Credits</div>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setActiveTabGlobal('pricing')}
                                                className="py-3 bg-[#bef264] text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-[#a3d951] transition-all hover:scale-[1.02] active:scale-95"
                                            >
                                                <TrendingUp size={12} className="inline mr-2" />Upgrade Plan
                                            </button>
                                            <button
                                                onClick={() => setActiveTabGlobal('pricing')}
                                                className="py-3 bg-white/5 border border-[#bef264]/30 text-[#bef264] hover:bg-[#bef264]/10 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all active:scale-95"
                                            >
                                                <Coins size={12} className="inline mr-2" />Top-Up Credits
                                            </button>
                                        </div>
                                    </div>

                                    {/* Transaction History */}
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                                        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                            <Clock size={14} className="text-[#bef264]" /> Recent Transactions
                                        </h3>
                                        <div className="mt-6 space-y-3">
                                            {billingHistory.length > 0 ? (
                                                billingHistory.map((bill) => (
                                                    <div key={bill.id} className="flex items-center justify-between py-4 px-4 bg-black/20 rounded-xl border border-white/5">
                                                        <div>
                                                            <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">{bill.plan_name}</p>
                                                            <p className="text-xs text-white font-mono mt-1">
                                                                {new Date(bill.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${bill.status === 'SUCCESS' ? 'text-[#bef264]' : 'text-red-400'}`}>{bill.status}</span>
                                                            <span className="text-sm font-black text-white">₹{bill.amount}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-12">
                                                    <CreditCard className="w-10 h-10 text-white/10 mx-auto mb-3" />
                                                    <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em]">No transactions yet</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── SECURITY TAB ── */}
                            {activeTab === 'security' && (
                                <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                    <form onSubmit={handleUpdateProfile} className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
                                        <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                            <Shield size={14} className="text-[#bef264]" /> Security Settings
                                        </h2>

                                        <div className="space-y-4">
                                            {/* 2FA Toggle */}
                                            <div
                                                className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:border-[#bef264]/20 transition-colors"
                                                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                                            >
                                                <div>
                                                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Two-Factor Authentication</h4>
                                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Add extra security to your account</p>
                                                </div>
                                                <div className={`text-${twoFactorEnabled ? '[#bef264]' : 'white/20'} transition-colors`}>
                                                    {twoFactorEnabled ? <CheckSquare size={22} className="text-[#bef264]" /> : <Square size={22} className="text-white/20" />}
                                                </div>
                                            </div>

                                            {/* Password Reset */}
                                            <div className="p-5 bg-black/20 rounded-xl border border-white/5">
                                                <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1">Change Password</h4>
                                                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-4">We'll send a reset link to <span className="text-white/60">{displayEmail}</span></p>

                                                <AnimatePresence>
                                                    {resetEmailSent && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="mb-4 p-3 bg-[#bef264]/10 border border-[#bef264]/20 rounded-lg"
                                                        >
                                                            <p className="text-[10px] font-black text-[#bef264] uppercase tracking-wider">✓ Reset email sent! Check your inbox.</p>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <button
                                                    type="button"
                                                    onClick={handleSendResetEmail}
                                                    disabled={sendingReset || resetEmailSent}
                                                    className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {sendingReset ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
                                                    {resetEmailSent ? 'Email Sent!' : sendingReset ? 'Sending...' : 'Send Reset Email'}
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="w-full py-4 bg-[#bef264] text-black font-black uppercase text-xs tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#bef264]/10 disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                            Save Security Settings
                                        </button>

                                        <AnimatePresence>
                                            {message.text && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className={`p-4 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${message.type === 'success' ? 'bg-[#bef264]/10 border-[#bef264]/20 text-[#bef264]' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
                                                >
                                                    {message.text}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </form>
                                </motion.div>
                            )}

                            {/* ── NOTIFICATIONS TAB ── */}
                            {activeTab === 'notifications' && (
                                <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                    <form onSubmit={handleUpdateProfile} className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
                                        <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                            <Bell size={14} className="text-[#bef264]" /> Notification Preferences
                                        </h2>

                                        <div className="space-y-4">
                                            {[
                                                {
                                                    label: 'Security Alerts',
                                                    desc: 'Get notified of suspicious logins and activity',
                                                    value: securityAlerts,
                                                    toggle: () => setSecurityAlerts(!securityAlerts)
                                                },
                                                {
                                                    label: 'Marketing & Updates',
                                                    desc: 'Receive news about new AI models and features',
                                                    value: marketingEmails,
                                                    toggle: () => setMarketingEmails(!marketingEmails)
                                                }
                                            ].map((item) => (
                                                <div
                                                    key={item.label}
                                                    className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:border-white/10 transition-colors"
                                                    onClick={item.toggle}
                                                >
                                                    <div>
                                                        <h4 className="text-xs font-black text-white uppercase tracking-wider">{item.label}</h4>
                                                        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{item.desc}</p>
                                                    </div>
                                                    {item.value
                                                        ? <CheckSquare size={22} className="text-[#bef264] shrink-0" />
                                                        : <Square size={22} className="text-white/20 shrink-0" />
                                                    }
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="w-full py-4 bg-[#bef264] text-black font-black uppercase text-xs tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#bef264]/10 disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                            Save Preferences
                                        </button>

                                        <AnimatePresence>
                                            {message.text && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className={`p-4 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${message.type === 'success' ? 'bg-[#bef264]/10 border-[#bef264]/20 text-[#bef264]' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
                                                >
                                                    {message.text}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </form>
                                </motion.div>
                            )}

                            {/* ── ADMIN TAB ── */}
                            {isAdmin && activeTab === 'admin' && (
                                <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                    <div className="bg-white/5 border border-red-500/20 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full" />
                                        <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 relative z-10">
                                            <Key size={14} className="text-red-500" /> Admin Trial Mode
                                        </h2>
                                        <p className="text-xs text-white/40 mb-6 relative z-10">Use a free-tier Google API key locally for testing without consuming production quotas. This key is saved locally in your browser.</p>

                                        <div className="space-y-4 relative z-10">
                                            <div
                                                className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:border-red-500/20 transition-colors"
                                                onClick={() => {
                                                    const newState = !useAdminTrialKey;
                                                    setUseAdminTrialKey(newState);
                                                    localStorage.setItem('useAdminTrialApiKey', newState ? 'true' : 'false');
                                                }}
                                            >
                                                <div>
                                                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Enable Trial API Mode</h4>
                                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Override production key with trial key</p>
                                                </div>
                                                <div className={`text-${useAdminTrialKey ? 'red-500' : 'white/20'} transition-colors`}>
                                                    {useAdminTrialKey ? <CheckSquare size={22} className="text-red-500" /> : <Square size={22} className="text-white/20" />}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Trial API Key</label>
                                                <input
                                                    type="password"
                                                    value={adminTrialKey}
                                                    onChange={(e) => {
                                                        setAdminTrialKey(e.target.value);
                                                        localStorage.setItem('adminTrialApiKey', e.target.value);
                                                    }}
                                                    placeholder="AIzaSy..."
                                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
            </div>
        </div>
    );
}
