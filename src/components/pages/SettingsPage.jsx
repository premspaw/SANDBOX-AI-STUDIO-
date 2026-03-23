import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, CreditCard, Shield, Bell, LogOut, Save, Loader2, Coins, CheckSquare, Square, Zap } from 'lucide-react';
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
                            <div className="space-y-6">
                                {/* Greeting Section */}
                                <div className="bg-gradient-to-r from-[#bef264]/20 to-transparent border border-[#bef264]/10 rounded-2xl p-8">
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tight italic flex items-center gap-3">
                                        Hey {fullName.split(' ')[0] || 'there'}, <span className="text-[#bef264]">Welcome to ZeroLines!</span>
                                    </h2>
                                    <p className="text-white/60 text-sm mt-2 font-medium">
                                        You're all set to create some amazing things. Your cinematic journey starts here.
                                    </p>
                                </div>


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

                                    <div className="mt-8 pt-8 border-t border-[#bef264]/10 flex gap-4">
                                        <button 
                                            onClick={() => window.location.href = '/pricing'}
                                            className="flex-1 py-3 bg-[#bef264] text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-[#a3d951] transition-all hover:scale-[1.02]"
                                        >
                                            Upgrade Plan
                                        </button>
                                        <button className="flex-1 py-3 bg-white/5 border border-white/10 text-white hover:bg-white/10 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">
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
                                                <div key={bill.id} className="flex items-center justify-between py-4 px-4 bg-black/20 rounded-xl border border-white/5">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">{bill.plan_name}</span>
                                                        <span className="text-xs text-white font-mono mt-1">
                                                            {new Date(bill.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end">
                                                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${bill.status === 'SUCCESS' ? 'text-[#bef264]' : 'text-red-400'}`}>
                                                            {bill.status}
                                                        </div>
                                                        <div className="text-[9px] text-white/20 font-mono">
                                                            ID: {bill.transaction_id || 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-white font-black tracking-tighter">₹{bill.amount}</div>
                                                        <button className="text-[9px] text-white/30 uppercase tracking-widest font-black hover:text-[#bef264] transition-colors mt-1">RECIPE</button>
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
