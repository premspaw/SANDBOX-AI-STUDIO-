import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react'
import { useAppStore } from '../../store'

export function Toast() {
    const toast = useAppStore(state => state.toast)
    const hideToast = useAppStore(state => state.hideToast)

    const isPolicyOrWarning = toast?.type === 'warning' || toast?.type === 'policy';
    const isError = toast?.type === 'error';
    const isSuccess = toast?.type === 'success';

    return (
        <AnimatePresence>
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } }}
                    className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-2.5 p-4 rounded-2xl bg-[#09090d]/95 border shadow-[0_20px_50px_rgba(0,0,0,0.8)] min-w-[320px] max-w-md backdrop-blur-xl pointer-events-auto"
                    style={{
                        borderColor: isError ? 'rgba(239, 68, 68, 0.4)' :
                            isPolicyOrWarning ? 'rgba(245, 158, 11, 0.6)' :
                            isSuccess ? 'rgba(34, 197, 94, 0.4)' : 'rgba(190, 242, 100, 0.4)'
                    }}
                >
                    {/* Glowing effect underneath based on type */}
                    <div className="absolute inset-0 rounded-2xl opacity-[0.05] blur-2xl pointer-events-none"
                        style={{
                            backgroundColor: isError ? '#ef4444' :
                                isPolicyOrWarning ? '#f59e0b' :
                                isSuccess ? '#22c55e' : '#bef264'
                        }}
                    />

                    {/* Header Row */}
                    <div className="flex items-center justify-between w-full relative z-10">
                        <div className="flex items-center gap-2">
                            {isError && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                            {isPolicyOrWarning && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                            {isSuccess && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                            {!isError && !isPolicyOrWarning && !isSuccess && <Info className="w-4 h-4 text-[#bef264] shrink-0" />}
                            
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]"
                                style={{
                                    color: isError ? '#ef4444' :
                                        isPolicyOrWarning ? '#f59e0b' :
                                        isSuccess ? '#22c55e' : '#bef264'
                                }}
                            >
                                {isError ? 'System Alert' :
                                 isPolicyOrWarning ? 'Google Policy Restriction' :
                                 isSuccess ? 'Task Completed' : 'Notice'}
                            </span>
                        </div>
                        <button
                            onClick={hideToast}
                            className="p-1 rounded-lg hover:bg-white/10 transition-colors bg-white/5 active:scale-95 shrink-0"
                        >
                            <X className="w-3.5 h-3.5 text-white/40 hover:text-white" />
                        </button>
                    </div>

                    {/* Message Body */}
                    <div className="text-[12px] font-semibold text-white/90 leading-relaxed relative z-10 px-0.5">
                        {toast.message}
                    </div>

                    {/* Action Button Row */}
                    {toast.action && (
                        <div className="flex justify-end pt-1 relative z-10">
                            <button
                                type="button"
                                onClick={() => {
                                    hideToast();
                                    if (typeof toast.action.onClick === 'function') {
                                        toast.action.onClick();
                                    }
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-[#c8f135] text-black text-[9px] font-black uppercase tracking-wider hover:bg-white transition-all shadow-lg shadow-[#c8f135]/20 active:scale-95 cursor-pointer font-sans"
                            >
                                {toast.action.label || 'Top Up / Upgrade'}
                            </button>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    )
}
