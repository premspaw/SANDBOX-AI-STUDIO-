import express from 'express';

export default function createRouter(deps) {
    const router = express.Router();
    const { requireAuth, supabaseAdmin, supabase } = deps;

    /**
     * POST /api/credits/spend
     * Body: { amount: number, reason: string }
     * Header: Authorization: Bearer <supabase_access_token>
     * Deducts credits from the authenticated user's balance server-side.
     */
    router.post('/credits/spend', async (req, res) => {
        try {
            const user = await requireAuth(req);
            const { amount, reason } = req.body;

            if (!amount || typeof amount !== 'number' || amount <= 0) {
                return res.status(400).json({ error: 'Invalid amount. Must be a positive number.' });
            }
            if (!reason || typeof reason !== 'string') {
                return res.status(400).json({ error: 'reason is required.' });
            }

            const client = supabaseAdmin || supabase;

            // 1. Fetch current balance (server-side, bypasses RLS intentionally)
            const { data: profile, error: fetchErr } = await client
                .from('profiles')
                .select('shorts_balance')
                .eq('id', user.id)
                .single();

            if (fetchErr) throw fetchErr;

            const currentBalance = profile?.shorts_balance ?? 0;
            if (currentBalance < amount) {
                return res.status(402).json({ error: 'Insufficient credits.', balance: currentBalance });
            }

            const newBalance = currentBalance - amount;

            // 2. Deduct balance
            const { error: updateErr } = await client
                .from('profiles')
                .update({ shorts_balance: newBalance })
                .eq('id', user.id);

            if (updateErr) throw updateErr;

            // 3. Audit log
            await client.from('shorts_transactions').insert({
                user_id: user.id,
                amount: -amount,
                action_type: reason,
                created_at: new Date().toISOString()
            });

            console.log(`[CREDITS] ✅ Spent ${amount} credits for user ${user.id} (${reason}). New balance: ${newBalance}`);
            res.json({ success: true, newBalance });

        } catch (err) {
            console.error('[CREDITS_SPEND_ERROR]:', err);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    /**
     * POST /api/credits/refund
     * Body: { amount: number, reason: string }
     * Header: Authorization: Bearer <supabase_access_token>
     * Refunds credits to the authenticated user's balance server-side.
     */
    router.post('/credits/refund', async (req, res) => {
        try {
            const user = await requireAuth(req);
            const { amount, reason } = req.body;

            if (!amount || typeof amount !== 'number' || amount <= 0) {
                return res.status(400).json({ error: 'Invalid amount. Must be a positive number.' });
            }
            if (!reason || typeof reason !== 'string') {
                return res.status(400).json({ error: 'reason is required.' });
            }

            const client = supabaseAdmin || supabase;

            // 1. Fetch current balance
            const { data: profile, error: fetchErr } = await client
                .from('profiles')
                .select('shorts_balance')
                .eq('id', user.id)
                .single();

            if (fetchErr) throw fetchErr;

            // 2. Security validation: Verify user has a matching spend transaction in the last 15 minutes
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            
            const { data: recentSpends, error: spendErr } = await client
                .from('shorts_transactions')
                .select('*')
                .eq('user_id', user.id)
                .eq('amount', -amount)
                .eq('action_type', reason)
                .gte('created_at', fifteenMinutesAgo);

            if (spendErr) {
                console.error('[REFUND_SECURITY_ERROR] Spend check failed:', spendErr);
                return res.status(500).json({ error: 'Failed to verify transaction history.' });
            }

            if (!recentSpends || recentSpends.length === 0) {
                return res.status(403).json({ error: 'Forbidden: No matching recent generation found to refund.' });
            }

            // Check if we already refunded this transaction
            const { data: recentRefunds, error: refundErr } = await client
                .from('shorts_transactions')
                .select('*')
                .eq('user_id', user.id)
                .eq('amount', amount)
                .eq('action_type', `refund_${reason}`)
                .gte('created_at', fifteenMinutesAgo);

            if (refundErr) {
                console.error('[REFUND_SECURITY_ERROR] Refund check failed:', refundErr);
                return res.status(500).json({ error: 'Failed to verify refund history.' });
            }

            if (recentRefunds && recentRefunds.length >= recentSpends.length) {
                return res.status(403).json({ error: 'Forbidden: This transaction has already been refunded.' });
            }

            const currentBalance = profile?.shorts_balance ?? 0;
            const newBalance = currentBalance + amount;

            // 3. Refund balance
            const { error: updateErr } = await client
                .from('profiles')
                .update({ shorts_balance: newBalance })
                .eq('id', user.id);

            if (updateErr) throw updateErr;

            // 4. Audit log
            await client.from('shorts_transactions').insert({
                user_id: user.id,
                amount: amount,
                action_type: `refund_${reason}`,
                created_at: new Date().toISOString()
            });

            console.log(`[CREDITS] ✅ Refunded ${amount} credits for user ${user.id} (${reason}). New balance: ${newBalance}`);
            res.json({ success: true, newBalance });

        } catch (err) {
            console.error('[CREDITS_REFUND_ERROR]:', err);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    /**
     * POST /api/pricing/purchase
     * Body: { userId, planId }
     * Simulates purchase/tier upgrade.
     */
    router.post('/pricing/purchase', async (req, res) => {
        try {
            if (process.env.NODE_ENV === 'production') {
                return res.status(403).json({ error: "Purchase simulation is disabled in production." });
            }

            const { userId, planId } = req.body;

            if (!supabase) {
                return res.status(503).json({ error: "Supabase connection not initialized" });
            }

            if (!userId || !planId) {
                return res.status(400).json({ error: "Missing userId or planId" });
            }

            let creditsToAdd = 0;
            let newTier = 'FREE';

            switch (planId.toLowerCase()) {
                case 'influencer':
                    creditsToAdd = 150;
                    newTier = 'INFLUENCER';
                    break;
                case 'director':
                    creditsToAdd = 600;
                    newTier = 'DIRECTOR';
                    break;
                case 'business':
                    creditsToAdd = 1200;
                    newTier = 'BUSINESS';
                    break;
                default:
                    return res.status(400).json({ error: "Invalid plan ID" });
            }

            const { data: profile, error: err1 } = await supabase
                .from('profiles')
                .select('shorts_balance')
                .eq('id', userId)
                .single();

            if (err1 || !profile) {
                console.error("[SERVER] Pricing Update Error (Fetch):", err1);
                return res.status(500).json({ error: "Could not fetch user profile" });
            }

            const newBalance = profile.shorts_balance + creditsToAdd;

            const { error: err2 } = await supabase
                .from('profiles')
                .update({
                    shorts_balance: newBalance,
                    tier: newTier
                })
                .eq('id', userId);

            if (err2) {
                console.error("[SERVER] Pricing Update Error (Update):", err2);
                return res.status(500).json({ error: "Failed to update profile" });
            }

            try {
                await supabase.from('shorts_transactions').insert({
                    user_id: userId,
                    amount: creditsToAdd,
                    action_type: `PURCHASE_${newTier}`
                });
            } catch (txErr) {
                console.warn("[SERVER] Failed to record transaction log:", txErr);
            }

            console.log(`[PRICING] User ${userId} purchased ${planId}. New Balance: ${newBalance}`);
            res.json({ success: true, newBalance, newTier });

        } catch (error) {
            console.error('Pricing Purchase Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
