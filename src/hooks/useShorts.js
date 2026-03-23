import { useAppStore } from '../store'
import { supabase } from '../lib/supabase'
import { SHORTS_COST } from '../config/shortsConfig'

export const useShorts = () => {
    const { userShorts, spendShorts, refundShorts, fetchBalance } = useAppStore()
    const userProfile = useAppStore(s => s.userProfile)

    const spend = async (costKey) => {
        if (userProfile?.role === 'admin') return { success: true }
        const amount = SHORTS_COST[costKey]
        if (!amount) return { success: false, reason: 'unknown_cost' }
        if (!userProfile?.id) return { success: false, reason: 'unauthenticated' }
        if (userShorts < amount) return { success: false, reason: 'insufficient_funds' }
        return await spendShorts(userProfile.id, amount, costKey)
    }

    const refund = async (costKey) => {
        if (userProfile?.role === 'admin') return
        const amount = SHORTS_COST[costKey]
        if (!amount) return
        if (!userProfile?.id) return
        await refundShorts(userProfile.id, amount, costKey)
    }

    const canAfford = (costKey) => {
        if (userProfile?.role === 'admin') return true
        return userShorts >= (SHORTS_COST[costKey] || 0)
    }

    return { shorts: userShorts, spend, refund, canAfford, refresh: () => userProfile?.id ? fetchBalance(userProfile.id) : null }
}
