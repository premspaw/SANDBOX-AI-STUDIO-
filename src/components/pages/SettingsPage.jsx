import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, CreditCard, Shield, Bell, LogOut, Save, Loader2, Coins, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';

export default function SettingsPage() {
    const profile = useAppStore(state => state.userProfile);
    const fetchUserProfile = useAppStore(state => state.fetchUserProfile);

    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Form states
    const [fullName, setFullName] = useState('');
    const [marketingEmails, setMarketingEmails] = useState(true);
    const [securityAlerts, setSecurityAlerts] = useState(true);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setMarketingEmails(profile.marketing_emails ?? true);
            setSecurityAlerts(profile.security_alerts ?? true);
            setTwoFactorEnabled(profile.two_factor_enabled ?? false);
        } else {
            setLoading(true);
            const checkUser = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) await fetchUserProfile(user.id);
                setLoading(false);
            };
            checkUser();
        }
    }, [profile]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    marketing_emails: marketingEmails,
                    security_alerts: securityAlerts,
                    two_factor_enabled: twoFactorEnabled,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;
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
        <div className="max-w-4xl mx-auto py-12 px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-[#bef264]/10 border border-[#bef264]/20 flex items-center justify-center">
                            <User className="w-8 h-8 text-[#bef264]" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Account Settings</h1>
                            <p className="text-white/40 text-sm font-mono mt-1 uppercase tracking-widest">Manage your ZEROLENS profile</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                        <Coins className="w-4 h-4 text-[#bef264]" />
                        <div>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest leading-none">Shorts Balance</p>
                            <p className="text-sm font-black text-[#bef264] mt-0.5">{profile?.shorts_balance || 0} SHORTS</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Navigation Sidebar */}
                    <div className="space-y-2">
                        {[
                            { id: 'profile', label: 'Profile', icon: User },
                            { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
                            { id: 'security', label: 'Security', icon: Shield },
                            { id: 'notifications', label: 'Notifications', icon: Bell },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-[#bef264] text-black font-black shadow-[0_0_15px_rgba(190,242,100,0.2)]' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                            >
                                <item.icon size={18} />
                                <span className="text-xs uppercase tracking-widest">{item.label}</span>
                            </button>
                        ))}
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all mt-8"
                        >
                            <LogOut size={18} />
                            <span className="text-xs uppercase tracking-widest font-bold">Sign Out</span>
                        </button>
                    </div>

                    {/* Main Content Area */}
                    <div className="md:col-span-2 space-y-6">

                        {/* PROFILE VIEW */}
                        {activeTab === 'profile' && (
                            <form onSubmit={handleUpdateProfile} className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
                                <h2 className="text-lg font-black text-white uppercase tracking-wider italic">Personal Information</h2>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest ml-1">Email Address</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                            <input
                                                type="email"
                                                value={profile?.email || ''}
                                                disabled
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white/40 font-medium cursor-not-allowed"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest ml-1">Full Name</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[#bef264] transition-colors" />
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Your Name"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:border-[#bef264]/50 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {message.text && (
                                    <div className={`p-4 rounded-xl text-xs font-bold uppercase tracking-widest ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {message.text}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full py-4 bg-[#bef264] text-black font-black uppercase text-xs tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#bef264]/10 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Save Profile
                                </button>
                            </form>
                        )}

                        {/* BILLING VIEW */}
                        {activeTab === 'billing' && (
                            <div className="space-y-6">
                                <div className="bg-gradient-to-br from-[#bef264]/10 to-transparent border border-[#bef264]/20 rounded-2xl p-8">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-lg font-black text-white uppercase tracking-wider italic">Membership Tier</h2>
                                            <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mt-1">Manage your active subscription</p>
                                        </div>
                                        <div className="px-3 py-1 bg-[#bef264] text-black rounded-full border border-[#bef264]/50 shadow-[0_0_15px_rgba(190,242,100,0.3)]">
                                            <span className="text-[10px] font-black uppercase tracking-widest">{profile?.tier || 'FREE'} PLAN</span>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-8 border-t border-[#bef264]/20 flex gap-4">
                                        <button className="flex-1 py-3 bg-[#bef264] text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-[#a3d951] transition-colors">
                                            Change Plan
                                        </button>
                                        <button className="flex-1 py-3 bg-white/5 border border-white/10 text-white hover:bg-white/10 font-black uppercase text-[10px] tracking-widest rounded-xl transition-colors">
                                            Payment Methods
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                                    <h3 className="text-white font-black uppercase tracking-wider italic">Billing History</h3>
                                    <div className="mt-6 space-y-3">
                                        <div className="flex items-center justify-between py-3 border-b border-white/5">
                                            <div className="text-xs text-white/60 font-mono">Oct 24, 2026</div>
                                            <div className="text-xs text-white font-bold tracking-wider">₹1,999.00</div>
                                            <button className="text-[10px] text-[#bef264] uppercase tracking-widest font-bold hover:underline">Download</button>
                                        </div>
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
