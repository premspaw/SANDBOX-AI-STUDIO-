import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import { useAppStore } from '../../store'

export function Toast() {
    const toast = useAppStore(state => state.toast)
    const hideToast = useAppStore(state => state.hideToast)

    return (
        <AnimatePresence>
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#0a0a0a] border shadow-2xl min-w-[320px] max-w-xl shadow-black/80"
                    style={{
                        borderColor: toast.type === 'error' ? 'rgba(239, 68, 68, 0.4)' :
                            toast.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(190, 242, 100, 0.4)'
                    }}
                >
                    {/* Glowing effect underneath based on type */}
                    <div className="absolute inset-0 rounded-2xl opacity-10 blur-xl pointer-events-none"
                        style={{
                            backgroundColor: toast.type === 'error' ? '#ef4444' :
                                toast.type === 'success' ? '#22c55e' : '#bef264'
                        }}
                    />

                    {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 shrink-0 relative z-10" />}
                    {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 shrink-0 relative z-10" />}
                    {toast.type === 'info' && <Info className="w-5 h-5 text-[#bef264] shrink-0 relative z-10" />}

                    <p className="text-[13px] font-medium text-white/90 leading-snug relative z-10 flex-1">
                        {toast.message}
                    </p>

                    <button
                        onClick={hideToast}
                        className="p-1.5 rounded-full hover:bg-white/10 transition-colors relative z-10 bg-white/5 active:scale-95"
                    >
                        <X className="w-4 h-4 text-white/50 hover:text-white" />
                    </button>

                    {toast.type === 'error' && (
                        <div className="absolute inset-0 rounded-2xl bg-red-500/5 pointer-events-none" />
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    )
}
