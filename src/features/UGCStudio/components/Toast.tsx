import React from 'react';
import { useUGC } from '../context/UGCContext';
import { AlertCircle, CheckCircle, Sparkles, X } from 'lucide-react';

export default function Toast() {
  const { toast, setToast } = useUGC();
  if (!toast) return null;
  return (
    <div className={`fixed top-12 right-4 z-[1000] flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-500 animate-in slide-in-from-top-4 ${
      toast.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
      toast.type === 'success' ? 'bg-[#c8f135]/10 border-[#c8f135]/30 text-[#c8f135]' :
      'bg-blue-500/10 border-blue-500/30 text-blue-400'
    }`}>
      {toast.type === 'error' ? (
        <AlertCircle size={18} />
      ) : toast.type === 'success' ? (
        <CheckCircle size={18} />
      ) : (
        <Sparkles size={18} />
      )}
      <span className="text-[11px] font-bold tracking-wide">{toast.message}</span>
      <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
        <X size={14} />
      </button>
    </div>
  );
}
