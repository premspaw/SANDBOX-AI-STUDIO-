import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, CreditCard, Shield, Bell, LogOut, Save, Loader2, Coins, CheckSquare, Square, Zap, ChevronRight } from 'lucide-react';
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

    // Form states
    const [fullName, setFullName] = useState('');
    const [marketingEmails, setMarketingEmails] = useState(true);
    const [securityAlerts, setSecurityAlerts] = useState(true);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [billingHistory, setBillingHistory] = useState([]);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setMarketingEmails(profile.marketing_emails ?? true);
            setSecurityAlerts(profile.security_alerts ?? true);
            setTwoFactorEnabled(profile.two_factor_enabled ?? false);

            // Fetch billing history if active tab is billing
            if (activeTab === 'billing') {
                const fetchBillingHistory = async (userId) => {
                    try {
                        const { data, error } = await supabase
                            .from('billing_history')
                            .select('*')
                            .eq('user_id', userId)
                            .order('created_at', { ascending: false })
                            .limit(10);
                        
                        if (error) throw error;
                        setBillingHistory(data || []);
                    } catch (err) {
                        console.error('Error fetching billing history:', err);
                    }
                };
                fetchBillingHistory(profile.id);
            }
        } else {
            setLoading(true);
            const checkUser = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) await fetchUserProfile(user.id);
                setLoading(false);
            };
            checkUser();
        }
    }, [profile, activeTab]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const { data: { user } } = await supabase.auth.getUser();
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
            setMessage({ type: 'success', text: 'Settings updated successfully!' });
            await fetchUserProfile(user.id);
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#bef264] animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-6 md:py-12 px-4 md:px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 md:space-y-8"
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
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-[#bef264]/10 border border-[#bef264]/20 flex items-center justify-center shrink-0">
                            <User className="w-6 h-6 md:w-8 md:h-8 text-[#bef264]" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-3xl font-black tracking-tight text-white uppercase italic">Account Settings</h1>
                            <p className="text-white/40 text-[10px] md:text-sm font-mono mt-1 uppercase tracking-widest leading-none">Manage your ZEROLENS profile</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-start gap-4 bg-white/5 border border-white/10 px-4 py-3 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Coins className="w-4 h-4 text-[#bef264]" />
                            <div>
                                <p className="text-[9px] text-white/40 font-black uppercase tracking-widest leading-none">Shorts Balance</p>
                                <p className="text-sm font-black text-[#bef264] mt-1">{profile?.shorts_balance || 0} SHORTS</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => window.location.href = '/pricing#top-up'}
                            className="bg-[#bef264] text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#a3d951] transition-all ml-4"
                        >
                            TOP UP
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Navigation - Horizontal on mobile, Sidebar on desktop */}
                    <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible no-scrollbar pb-2 lg:pb-0 gap-2">
                        {[
                            { id: 'profile', label: 'Profile', icon: User },
                            { id: 'billing', label: 'Billing', icon: CreditCard },
                            { id: 'security', label: 'Security', icon: Shield },
                            { id: 'notifications', label: 'Alerts', icon: Bell },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all whitespace-nowrap min-w-fit lg:w-full ${activeTab === item.id ? 'bg-[#bef264] text-black font-black shadow-[0_0_15px_rgba(190,242,100,0.2)]' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                            >
                                <item.icon size={16} className="shrink-0" />
                                <span className="text-[10px] lg:text-xs uppercase tracking-widest">{item.label}</span>
                            </button>
                        ))}
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="flex items-center gap-3 px-5 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all whitespace-nowrap min-w-fit lg:w-full lg:mt-8"
                        >
                            <LogOut size={16} className="shrink-0" />
                            <span className="text-[10px] lg:text-xs uppercase tracking-widest font-black">Sign Out</span>
                        </button>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* PROFILE VIEW */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                {/* Greeting Section */}
                                <div className="bg-gradient-to-r from-[#bef264]/20 to-transparent border border-[#bef264]/10 rounded-2xl p-6 md:p-8">
                                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight italic flex items-center gap-3">
                                        Hey {fullName.split(' ')[0] || 'there'}, <span className="text-[#bef264]">Welcome to ZEROLENS!</span>
                                    </h2>
                                    <p className="text-white/60 text-[11px] md:text-sm mt-3 font-medium leading-relaxed">
                                        You're all set to create some amazing things. Your cinematic journey starts here.
                                    </p>
                                </div>

                                {/* Profile Form Section */}
                                <form onSubmit={handleUpdateProfile} className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
                                    <h3 className="text-lg font-black text-white uppercase tracking-wider italic flex items-center gap-2">
                                        Personal Information
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bef264]/40" />
                                                <input 
                                                    type="text"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    placeholder="Enter your full name"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-xs font-bold text-white focus:border-[#bef264]/40 focus:outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10" />
                                                <input 
                                                    type="email"
                                                    value={profile?.email || ''}
                                                    readOnly
                                                    className="w-full bg-white/5 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-xs font-bold text-white/20 cursor-not-allowed focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="w-full sm:w-auto px-12 py-3.5 bg-[#bef264] text-black font-black uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#bef264]/10 disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                            Update Profile
                                        </button>
                                    </div>

                                    {message.text && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`p-4 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${message.type === 'success' ? 'bg-[#bef264]/10 border-[#bef264]/20 text-[#bef264]' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}
                                        >
                                            {message.text}
                                        </motion.div>
                                    )}
                                </form>
                            </div>
                        )}

                        {/* BILLING VIEW */}
                        {activeTab === 'billing' && (
                            <div className="space-y-6">
                                <div className="bg-gradient-to-br from-[#bef264]/10 to-transparent border border-[#bef264]/20 rounded-2xl p-8 relative overflow-hidden">
                                     {/* Background Decor */}
                                     {profile?.tier !== 'FREE' && (
                                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#bef264]/10 blur-3xl rounded-full" />
                                     )}

                                    <div className="flex items-start justify-between relative z-10">
                                        <div>
                                            <h2 className="text-lg font-black text-white uppercase tracking-wider italic">Membership Status</h2>
                                            <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mt-1">
                                                Plan Active Since: {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '---'}
                                            </p>
                                        </div>
                                        <div className="px-4 py-1.5 bg-[#bef264] text-black rounded-full border border-[#bef264]/50 shadow-[0_0_20px_rgba(190,242,100,0.4)]">
                                            <span className="text-[11px] font-black uppercase tracking-widest leading-none">
                                                {profile?.tier || 'FREE'} PLAN
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-8 grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                                            <div className="text-[10px] text-white/40 font-black uppercase tracking-widest flex items-center gap-2 mb-1">
                                                <Coins size={10} className="text-[#bef264]" /> Monthly Allowance
                                            </div>
                                            <div className="text-lg font-black text-white">
                                                {profile?.tier === 'STARTER' ? '250 Credits' : 
                                                 profile?.tier === 'INFLUENCER' ? '600 Credits' : 
                                                 profile?.tier === 'DIRECTOR' ? '2000 Credits' :
                                                 profile?.tier === 'ENTERPRISE' ? '5000 Credits' : '50 Free Credits'}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                                            <div className="text-[10px] text-white/40 font-black uppercase tracking-widest flex items-center gap-2 mb-1">
                                                <Zap size={10} className="text-[#bef264]" /> Productivity Perk
                                            </div>
                                            <div className="text-[11px] font-bold text-white uppercase">
                                                {profile?.tier === 'STARTER' ? '2 Concurrent Jobs' : 
                                                 profile?.tier === 'INFLUENCER' ? '4 Concurrent Jobs' : 
                                                 profile?.tier === 'DIRECTOR' ? '8 Concurrent Jobs' :
                                                 profile?.tier === 'ENTERPRISE' ? '16 Concurrent Jobs' : '1 Concurrent Job'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-8 border-t border-[#bef264]/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <button 
                                            onClick={() => window.location.href = '/pricing'}
                                            className="w-full py-3 bg-[#bef264] text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-[#a3d951] transition-all hover:scale-[1.02]"
                                        >
                                            Upgrade Plan
                                        </button>
                                        <button 
                                            onClick={() => window.location.href = '/pricing#top-up'}
                                            className="w-full py-3 bg-white/5 border border-[#bef264]/30 text-[#bef264] hover:bg-[#bef264]/10 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all"
                                        >
                                            Top-Up Credits
                                        </button>
                                        <button className="w-full py-3 bg-white/5 border border-white/10 text-white hover:bg-white/10 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">
                                            Billing Dashboard
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                                    <h3 className="text-white font-black uppercase tracking-wider italic flex items-center gap-2">
                                        Recent Transactions
                                    </h3>
                                    <div className="mt-6 space-y-3">
                                        {billingHistory.length > 0 ? (
                                            billingHistory.map((bill) => (
                                                <div key={bill.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 px-4 bg-black/20 rounded-xl border border-white/5 gap-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">{bill.plan_name}</span>
                                                        <span className="text-xs text-white font-mono mt-1">
                                                            {new Date(bill.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                                                        <div className="text-left sm:text-right flex flex-col sm:items-end">
                                                            <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${bill.status === 'SUCCESS' ? 'text-[#bef264]' : 'text-red-400'}`}>
                                                                {bill.status}
                                                            </div>
                                                            <div className="text-[9px] text-white/20 font-mono">
                                                                ID: {bill.transaction_id || 'N/A'}
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex flex-col items-end">
                                                            <div className="text-xs text-white font-black tracking-tighter">₹{bill.amount}</div>
                                                            <button className="text-[9px] text-white/30 uppercase tracking-widest font-black hover:text-[#bef264] transition-colors mt-1 underline decoration-white/10">RECEIPT</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))

                                        ) : (
                                            <div className="text-center py-8 text-white/20 text-[10px] font-black uppercase tracking-[0.2em]">No transactions recorded.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECURITY VIEW */}
                        {activeTab === 'security' && (
                            <form onSubmit={handleUpdateProfile} className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
                                <h2 className="text-lg font-black text-white uppercase tracking-wider italic">Security Settings</h2>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                                        <div>
                                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Two-Factor Authentication</h4>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Add an extra layer of security to your account</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                                            className="text-[#bef264]"
                                        >
                                            {twoFactorEnabled ? <CheckSquare size={24} /> : <Square size={24} className="text-white/20" />}
                                        </button>
                                    </div>

                                    <div className="pt-6 border-t border-white/5">
                                        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Change Password</h4>
                                        <button type="button" className="px-6 py-3 bg-white/5 border border-white/10 text-white hover:bg-white/10 font-black uppercase text-[10px] tracking-widest rounded-xl transition-colors">
                                            Send Reset Email
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full mt-6 py-4 bg-[#bef264] text-black font-black uppercase text-xs tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#bef264]/10 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Save Security Info
                                </button>
                            </form>
                        )}

                        {/* NOTIFICATIONS VIEW */}
                        {activeTab === 'notifications' && (
                            <form onSubmit={handleUpdateProfile} className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
                                <h2 className="text-lg font-black text-white uppercase tracking-wider italic">Notification Preferences</h2>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:bg-black/30 transition-colors" onClick={() => setSecurityAlerts(!securityAlerts)}>
                                        <div>
                                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Security Alerts</h4>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Get notified of suspicious logins and activity</p>
                                        </div>
                                        <div className="text-[#bef264]">
                                            {securityAlerts ? <CheckSquare size={24} /> : <Square size={24} className="text-white/20" />}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:bg-black/30 transition-colors" onClick={() => setMarketingEmails(!marketingEmails)}>
                                        <div>
                                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Marketing & Updates</h4>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Receive news about new AI models and features</p>
                                        </div>
                                        <div className="text-[#bef264]">
                                            {marketingEmails ? <CheckSquare size={24} /> : <Square size={24} className="text-white/20" />}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full mt-6 py-4 bg-[#bef264] text-black font-black uppercase text-xs tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#bef264]/10 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Save Preferences
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
