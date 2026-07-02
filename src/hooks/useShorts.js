import { useAppStore } from '../store'
import { supabase } from '../lib/supabase'
import { SHORTS_COST } from '../config/shortsConfig'

export const useShorts = () => {
    const { userShorts, spendShorts, refundShorts, fetchBalance, isAdmin } = useAppStore()
    const userProfile = useAppStore(s => s.userProfile)

    const spend = async (costKey, overrideAmount = null) => {
        if (userProfile?.role === 'admin') return { success: true }
        const amount = overrideAmount !== null ? overrideAmount : SHORTS_COST[costKey]
        if (!amount) return { success: false, reason: 'unknown_cost' }
        if (!userProfile?.id) return { success: false, reason: 'unauthenticated' }
        if (userShorts < amount) return { success: false, reason: 'insufficient_funds' }
        if (isAdmin) {
            useAppStore.setState({ userShorts: userShorts - amount });
            return { success: true };
        }
        return await spendShorts(userProfile.id, amount, costKey)
    }

    const refund = async (costKey, overrideAmount = null) => {
        if (userProfile?.role === 'admin') return
        const amount = overrideAmount !== null ? overrideAmount : SHORTS_COST[costKey]
        if (!amount) return
        if (!userProfile?.id) return
        if (isAdmin) {
            useAppStore.setState({ userShorts: userShorts + amount });
            return;
        }
        await refundShorts(userProfile.id, amount, costKey)
    }

    const canAfford = (costKey, overrideAmount = null) => {
        if (userProfile?.role === 'admin') return true
        const amount = overrideAmount !== null ? overrideAmount : (SHORTS_COST[costKey] || 0)
        return userShorts >= amount
    }

    return { shorts: userShorts, spend, refund, canAfford, refresh: () => userProfile?.id ? fetchBalance(userProfile.id) : null }
}
