import React from 'react';
import { useUGC } from '../../context/UGCContext';
import { X, Zap, Shield, Activity, Layers, CheckCircle } from 'lucide-react';

export default function LiveGuideModal() {
  const { showLiveGuide, setShowLiveGuide } = useUGC();
  if (!showLiveGuide) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in zoom-in-95 duration-300 overflow-y-auto">
      <div className="w-full max-w-2xl bg-gray-900/80 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl ring-1 ring-white/10 backdrop-blur-3xl relative">
        <button onClick={() => setShowLiveGuide(false)} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="flex items-center gap-5 mb-10">
          <div className="p-4 bg-[#c8f135]/10 rounded-2xl border border-[#c8f135]/30 shadow-[0_0_20px_rgba(200,241,53,0.1)]">
            <Zap className="w-8 h-8 text-[#c8f135]" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white">Go-Live Protocol</h2>
            <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-gray-500">Scale: 1000+ Concurrent Users</p>
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-gray-300">
          <section className="space-y-3">
            <h3 className="text-[#c8f135] font-mono text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
              <Shield size={14} /> 1. Error Resilience
            </h3>
            <p>The application is now wrapped in a <strong>Global Error Boundary</strong>. If a specific component crashes, the system will isolate the error and allow the user to restart without losing the entire session.</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-[#c8f135] font-mono text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} /> 2. API Quota Management
            </h3>
            <p>With 1000+ users, you will hit Google Cloud quotas quickly. <strong>Precaution:</strong> Ensure you have requested a quota increase for <code>Gemini 3 Flash</code> and <code>Veo 3.1</code> in your Google Cloud Console. The app now detects quota errors and provides clear guidance to users.</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-[#c8f135] font-mono text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
              <Layers size={14} /> 3. Client-Side Resource Limits
            </h3>
            <p>FFmpeg processing happens in the user's browser. For 1000+ users, this saves server costs but can crash mobile browsers. <strong>Improvement:</strong> We've added memory-safe checks. Advise users to use Desktop Chrome for complex renders.</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-[#c8f135] font-mono text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
              <CheckCircle size={14} /> 4. Stability Checklist
            </h3>
            <ul className="list-disc list-inside space-y-2 text-[12px] text-gray-400">
              <li>Verify Supabase Storage bucket is set to 'Public'</li>
              <li>Enable 'Billing' on Google Cloud Project</li>
              <li>Set up a custom domain to avoid 'run.app' rate limits</li>
              <li>Monitor 'System Status' bar for real-time health</li>
            </ul>
          </section>

          <button
            onClick={() => setShowLiveGuide(false)}
            className="w-full bg-[#c8f135] text-black font-black uppercase tracking-widest py-5 rounded-2xl hover:scale-[1.02] transition-all shadow-[0_20px_40px_rgba(200,241,53,0.2)]"
          >
            Acknowledge & Deploy
          </button>
        </div>
      </div>
    </div>
  );
}
