import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAppStore } from '../../../../store';

export default function AdminLoginModal() {
  const showAdminLogin = useAppStore(state => state.showAdminLogin);
  const setShowAdminLogin = useAppStore(state => state.setShowAdminLogin);
  const setIsAdmin = useAppStore(state => state.setIsAdmin);
  const setUserShorts = useAppStore(state => state.setUserShorts);

  const [adminPassword, setAdminPassword] = useState('');

  const handleAdminLogin = () => {
    if (adminPassword === 'admin123' || adminPassword === '10000') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
      setUserShorts(10000);
      alert('Admin mode ON — 10,000 credits loaded');
    } else {
      alert('Invalid password');
    }
  };

  if (!showAdminLogin) return null;

  return (
    <div className="fixed inset-0 z-[100005] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in zoom-in-95 duration-300">
      <div className="w-full max-w-sm bg-gray-900/80 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl ring-1 ring-white/10 backdrop-blur-3xl">
        <div className="flex items-center gap-5 mb-10">
          <div className="p-4 bg-[#00ffe0]/10 rounded-2xl border border-[#00ffe0]/30 shadow-[0_0_20px_rgba(0,255,224,0.15)]">
            <ShieldCheck className="w-8 h-8 text-[#00ffe0]" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white">AI Secure</h2>
            <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-gray-500">Protocol:Admin Auth</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-black ml-1">Universal Key</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-5 text-sm font-mono tracking-[0.5em] focus:outline-none focus:border-[#00ffe0]/50 transition-all text-[#00ffe0] shadow-inner"
              placeholder="••••••••"
              autoFocus
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setShowAdminLogin(false)}
              className="flex-1 px-4 py-4 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white/5 transition-all cursor-pointer"
            >
              Exit
            </button>
            <button
              onClick={handleAdminLogin}
              className="flex-1 px-4 py-4 rounded-2xl bg-[#c8f135] text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer shadow-[#c8f135]/20"
            >
              Authorize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
