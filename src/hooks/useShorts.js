import { useAppStore } from '../store'
import { supabase } from '../lib/supabase'
import { SHORTS_COST } from '../config/shortsConfig'

export const useShorts = () => {
    const { userShorts, spendShorts, refundShorts, fetchBalance, isAdmin } = useAppStore()
    const userProfile = useAppStore(s => s.userProfile)

    const spend = async (costKey, overrideAmount = null) => {
        const amount = overrideAmount !== null ? overrideAmount : SHORTS_COST[costKey]
        if (!amount) return { success: false, reason: 'unknown_cost' }
        const targetUserId = userProfile?.id || (isAdmin ? 'admin-user' : null)
        if (!targetUserId) return { success: false, reason: 'unauthenticated' }
        
        const isUserAdmin = userProfile?.role === 'admin' || isAdmin

        if (userShorts >= amount) {
            return await spendShorts(userProfile?.id || 'admin', amount, costKey)
        }

        // If admin with low balance, deduct available and allow generation to proceed
        if (isUserAdmin) {
            if (userShorts > 0) {
                await spendShorts(userProfile?.id || 'admin', userShorts, costKey)
            }
            return { success: true };
        }

        return { success: false, reason: 'insufficient_funds' }
    }

    const refund = async (costKey, overrideAmount = null) => {
        const amount = overrideAmount !== null ? overrideAmount : SHORTS_COST[costKey]
        if (!amount) return
        const targetUserId = userProfile?.id || (isAdmin ? 'admin-user' : null)
        if (!targetUserId) return
        await refundShorts(userProfile?.id || 'admin', amount, costKey)
    }

    const canAfford = (costKey, overrideAmount = null) => {
        if (userProfile?.role === 'admin' || isAdmin) return true
        const amount = overrideAmount !== null ? overrideAmount : (SHORTS_COST[costKey] || 0)
        return userShorts >= amount
    }

    return { shorts: userShorts, spend, refund, canAfford, refresh: () => userProfile?.id ? fetchBalance(userProfile.id) : null }
}
