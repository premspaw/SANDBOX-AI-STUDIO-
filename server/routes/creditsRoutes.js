import express from 'express';
import fs from 'fs';
import { sendWelcomeEmail } from '../services/emailService.js';

export default function createRouter(deps) {
    const router = express.Router();
    const { requireAuth, supabaseAdmin, supabase, LOCAL_ASSETS_FILE } = deps;

    // Helper to ensure requesting user is authorized as administrator
    async function requireAdmin(req) {
        const user = await requireAuth(req);
        const client = supabaseAdmin || supabase;
        if (!client) {
            if (process.env.NODE_ENV !== 'production' || user.email === 'premspaw@gmail.com') return user;
            throw Object.assign(new Error('Database not configured'), { status: 503 });
        }
        const { data: profile } = await client
            .from('profiles')
            .select('role, email')
            .eq('id', user.id)
            .maybeSingle();

        if (user.email === 'premspaw@gmail.com') {
            return user;
        }
        throw Object.assign(new Error('Forbidden: Admin access restricted to premspaw@gmail.com'), { status: 403 });
    }

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
            if (!client) {
                if (process.env.NODE_ENV !== 'production') {
                    return res.json({ success: true, newBalance: Math.max(0, 15000 - amount) });
                }
                return res.status(503).json({ error: 'Database client unavailable.' });
            }

            // 1. Fetch current balance (server-side, bypasses RLS intentionally)
            let { data: profile, error: fetchErr } = await client
                .from('profiles')
                .select('shorts_balance, brand_voice')
                .eq('id', user.id)
                .maybeSingle();

            if (!profile) {
                const initialBal = user.email === 'premspaw@gmail.com' ? 15000 : 50;
                await client.from('profiles').upsert({
                    id: user.id,
                    email: user.email || null,
                    role: user.email === 'premspaw@gmail.com' ? 'admin' : 'user',
                    tier: user.email === 'premspaw@gmail.com' ? 'ADMIN_ENTERPRISE' : 'FREE',
                    shorts_balance: initialBal
                });
                profile = { shorts_balance: initialBal, brand_voice: {} };
                if (user.email) {
                    sendWelcomeEmail({
                        email: user.email,
                        name: user.user_metadata?.full_name || '',
                        shortsBalance: initialBal
                    }).catch(err => console.error('[CREDITS_WELCOME_EMAIL] Error:', err));
                }
            }

            const brandVoice = profile?.brand_voice || {};
            const fractionalShorts = brandVoice.fractional_shorts || 0;
            let currentBalance = (profile?.shorts_balance ?? 0) + fractionalShorts;

            if (currentBalance < amount) {
                if (user.email === 'premspaw@gmail.com') {
                    // Refill admin/dev balance for testing
                    currentBalance = Math.max(15000, amount);
                } else {
                    return res.status(402).json({ error: 'Insufficient credits.', balance: currentBalance });
                }
            }

            const newTotalBalance = currentBalance - amount;
            const newIntBalance = Math.floor(newTotalBalance);
            const newFractBalance = Number((newTotalBalance - newIntBalance).toFixed(4));

            // 2. Deduct balance
            const { error: updateErr } = await client
                .from('profiles')
                .update({ 
                    shorts_balance: newIntBalance,
                    brand_voice: { ...brandVoice, fractional_shorts: newFractBalance }
                })
                .eq('id', user.id);

            if (updateErr) throw updateErr;

            // 3. Audit log
            await client.from('shorts_transactions').insert({
                user_id: user.id,
                amount: -Math.round(amount),
                action_type: reason,
                created_at: new Date().toISOString()
            });

            console.log(`[CREDITS] ✅ Spent ${amount} credits for user ${user.id} (${reason}). New balance: ${newTotalBalance}`);
            res.json({ success: true, newBalance: newTotalBalance });

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
                .select('shorts_balance, brand_voice')
                .eq('id', user.id)
                .single();

            if (fetchErr) throw fetchErr;

            // 2. Security validation: Verify user has a matching spend transaction in the last 15 minutes
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            const roundedAmount = Math.round(amount);
            
            const { data: recentSpends, error: spendErr } = await client
                .from('shorts_transactions')
                .select('*')
                .eq('user_id', user.id)
                .eq('amount', -roundedAmount)
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
                .eq('amount', roundedAmount)
                .eq('action_type', `refund_${reason}`)
                .gte('created_at', fifteenMinutesAgo);

            if (refundErr) {
                console.error('[REFUND_SECURITY_ERROR] Refund check failed:', refundErr);
                return res.status(500).json({ error: 'Failed to verify refund history.' });
            }

            if (recentRefunds && recentRefunds.length >= recentSpends.length) {
                return res.status(403).json({ error: 'Forbidden: This transaction has already been refunded.' });
            }

            const brandVoice = profile?.brand_voice || {};
            const fractionalShorts = brandVoice.fractional_shorts || 0;
            const currentBalance = (profile?.shorts_balance ?? 0) + fractionalShorts;
            const newTotalBalance = currentBalance + amount;

            const newIntBalance = Math.floor(newTotalBalance);
            const newFractBalance = Number((newTotalBalance - newIntBalance).toFixed(4));

            // 3. Refund balance
            const { error: updateErr } = await client
                .from('profiles')
                .update({ 
                    shorts_balance: newIntBalance,
                    brand_voice: { ...brandVoice, fractional_shorts: newFractBalance }
                })
                .eq('id', user.id);

            if (updateErr) throw updateErr;

            // 4. Audit log
            await client.from('shorts_transactions').insert({
                user_id: user.id,
                amount: roundedAmount,
                action_type: `refund_${reason}`,
                created_at: new Date().toISOString()
            });

            console.log(`[CREDITS] ✅ Refunded ${amount} credits for user ${user.id} (${reason}). New balance: ${newTotalBalance}`);
            res.json({ success: true, newBalance: newTotalBalance });

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
            let newTier = null;
            let priceAmount = 0;
            let planName = 'TOP-UP';

            switch (planId.toLowerCase()) {
                case 'starter':
                case 'starter-fuel':
                case 'pack_starter':
                case 'topup-starter':
                case '299':
                case '300':
                case '399':
                    creditsToAdd = 250;
                    newTier = 'STARTER';
                    priceAmount = 299;
                    planName = 'Starter Fuel';
                    break;
                case 'creator':
                case 'creator-pro':
                case 'pack_creator':
                case 'topup-1000':
                case '1000':
                case '999':
                    creditsToAdd = 1000;
                    newTier = null;
                    priceAmount = 999;
                    planName = 'Creator Pro';
                    break;
                case 'influencer':
                case 'studio':
                case 'studio-master':
                case 'pack_studio':
                case 'topup-2600':
                case '2600':
                case 'topup-2500':
                case '2500':
                case '2499':
                case '1999':
                    creditsToAdd = 2600;
                    newTier = 'INFLUENCER';
                    priceAmount = 2499;
                    planName = 'Studio Master';
                    break;
                case 'director':
                case 'enterprise-bulk':
                case 'pack_enterprise':
                case 'topup-5500':
                case '5000':
                case '4999':
                case '3999':
                    creditsToAdd = 5500;
                    newTier = 'DIRECTOR';
                    priceAmount = 4999;
                    planName = 'Enterprise Bulk';
                    break;
                case 'enterprise':
                case 'business':
                case 'agency':
                case 'agency-max':
                case 'pack_agency':
                case 'topup-11000':
                case '10000':
                case '9999':
                case '7999':
                    creditsToAdd = 11000;
                    newTier = 'ENTERPRISE';
                    priceAmount = 9999;
                    planName = 'Agency Max';
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

            const profileUpdate = { shorts_balance: newBalance };
            if (newTier) {
                profileUpdate.tier = newTier;
            }

            const { error: err2 } = await supabase
                .from('profiles')
                .update(profileUpdate)
                .eq('id', userId);

            if (err2) {
                console.error("[SERVER] Pricing Update Error (Update):", err2);
                return res.status(500).json({ error: "Failed to update profile" });
            }

            try {
                await supabase.from('shorts_transactions').insert({
                    user_id: userId,
                    amount: creditsToAdd,
                    action_type: newTier ? `PURCHASE_${newTier}` : 'TOPUP_PURCHASE',
                    reason: newTier ? `Purchase Plan: ${newTier}` : `Purchase Top-up Pack`
                });

                await supabase.from('billing_history').insert({
                    user_id: userId,
                    plan_name: planName,
                    amount: priceAmount,
                    status: 'SUCCESS',
                    transaction_id: 'SIMULATED_PURCHASE_' + Math.random().toString(36).substr(2, 9).toUpperCase()
                });
            } catch (txErr) {
                console.warn("[SERVER] Failed to record transaction/billing log:", txErr);
            }

            console.log(`[PRICING] User ${userId} purchased ${planId}. New Balance: ${newBalance}`);
            res.json({ success: true, newBalance, newTier });

        } catch (error) {
            console.error('Pricing Purchase Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/credits/history
     * Header: Authorization: Bearer <token>
     * Returns the authenticated user's own credit debit/refund transaction log.
     */
    router.get('/credits/history', async (req, res) => {
        try {
            const user = await requireAuth(req);
            const client = supabaseAdmin || supabase;
            if (!client) {
                return res.json({ success: true, transactions: [] });
            }

            const { data: txs, error } = await client
                .from('shorts_transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(60);

            if (error) {
                console.warn('[CREDITS_HISTORY_WARN]:', error.message);
                return res.json({ success: true, transactions: [] });
            }

            return res.json({ success: true, transactions: txs || [] });
        } catch (err) {
            console.error('[CREDITS_HISTORY_ERROR]:', err);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    /**
     * GET /api/admin/users
     * Header: Authorization: Bearer <token>
     * Admin endpoint: Returns all users, their emails, roles, and current Shorts balances.
     */
    router.get('/admin/users', async (req, res) => {
        try {
            const admin = await requireAdmin(req);
            const client = supabaseAdmin || supabase;
            if (!client) {
                return res.json({
                    success: true,
                    users: [
                        { id: admin.id, email: admin.email || 'premspaw@gmail.com', role: 'admin', tier: 'ENTERPRISE', shorts_balance: 15000, updated_at: new Date().toISOString() }
                    ]
                });
            }

            const { data: users, error } = await client
                .from('profiles')
                .select('id, email, role, tier, shorts_balance, updated_at')
                .order('updated_at', { ascending: false })
                .limit(100);

            if (error) {
                const { data: basicUsers, error: basicErr } = await client
                    .from('profiles')
                    .select('id, shorts_balance')
                    .limit(100);
                if (basicErr) throw basicErr;
                return res.json({ success: true, users: basicUsers || [] });
            }

            return res.json({ success: true, users: users || [] });
        } catch (err) {
            console.error('[ADMIN_USERS_ERROR]:', err);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    /**
     * GET /api/admin/user-audit
     * Query: ?userId=... or ?email=...
     * Admin endpoint: Returns user profile, transaction ledger, and generated assets.
     */
    router.get('/admin/user-audit', async (req, res) => {
        try {
            await requireAdmin(req);
            const { userId, email } = req.query;
            if (!userId && !email) {
                return res.status(400).json({ error: 'userId or email is required' });
            }

            const client = supabaseAdmin || supabase;
            if (!client) {
                return res.json({
                    success: true,
                    profile: { id: userId || 'dev_user', email: email || 'user@example.com', shorts_balance: 100, tier: 'CREATOR' },
                    transactions: [],
                    assets: []
                });
            }

            let profileQuery = client.from('profiles').select('*');
            if (userId) {
                profileQuery = profileQuery.eq('id', userId);
            } else {
                profileQuery = profileQuery.eq('email', email);
            }

            const { data: profile } = await profileQuery.maybeSingle();
            const targetUserId = profile?.id || userId;

            // Fetch transactions for this user
            let transactions = [];
            if (targetUserId) {
                const { data: txs } = await client
                    .from('shorts_transactions')
                    .select('*')
                    .eq('user_id', targetUserId)
                    .order('created_at', { ascending: false })
                    .limit(100);
                transactions = txs || [];
            }

            // Fetch generated assets for this user (Supabase or local JSON)
            let assets = [];
            if (targetUserId) {
                try {
                    const { data: dbAssets } = await client
                        .from('assets')
                        .select('*')
                        .eq('user_id', targetUserId)
                        .order('created_at', { ascending: false })
                        .limit(50);
                    if (Array.isArray(dbAssets) && dbAssets.length > 0) {
                        assets = dbAssets;
                    }
                } catch (_) {}

                try {
                    const localPath = LOCAL_ASSETS_FILE;
                    if (localPath && fs.existsSync(localPath)) {
                        const localJson = JSON.parse(fs.readFileSync(localPath, 'utf8'));
                        const matched = localJson.filter(a => a.user_id === targetUserId);
                        assets = [...assets, ...matched];
                    }
                } catch (_) {}
            }

            return res.json({
                success: true,
                profile: profile || { id: targetUserId, email: email || null, shorts_balance: 0 },
                transactions,
                assets
            });
        } catch (err) {
            console.error('[ADMIN_USER_AUDIT_ERROR]:', err);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    /**
     * POST /api/admin/adjust-balance
     * Body: { userId, amount, reason, actionType }
     * Admin endpoint: Adds or deducts credits with a mandatory audit record.
     */
    router.post('/admin/adjust-balance', async (req, res) => {
        try {
            const admin = await requireAdmin(req);
            const { userId, amount, reason, actionType, exactBalance } = req.body;

            if (!userId) return res.status(400).json({ error: 'userId is required' });

            const client = supabaseAdmin || supabase;
            if (!client) {
                return res.json({ success: true, newBalance: exactBalance !== undefined ? exactBalance : (100 + (amount || 0)), message: 'Simulated admin adjustment' });
            }

            // 1. Fetch current profile
            const { data: profile } = await client
                .from('profiles')
                .select('shorts_balance, brand_voice, email')
                .eq('id', userId)
                .maybeSingle();

            const currentBal = profile?.shorts_balance ?? 50;
            let newBal;
            let deltaAmount;

            if (typeof exactBalance === 'number') {
                newBal = Math.max(0, exactBalance);
                deltaAmount = newBal - currentBal;
            } else {
                if (typeof amount !== 'number' || isNaN(amount) || amount === 0) {
                    return res.status(400).json({ error: 'Valid non-zero amount or exactBalance is required' });
                }
                newBal = Math.max(0, currentBal + amount);
                deltaAmount = Math.round(amount);
            }

            // 2. Update profile
            const { error: updateErr } = await client
                .from('profiles')
                .upsert({
                    id: userId,
                    shorts_balance: Math.round(newBal),
                    updated_at: new Date().toISOString()
                });

            if (updateErr) throw updateErr;

            // 3. Insert audit log into shorts_transactions
            const txPayload = {
                user_id: userId,
                amount: Math.round(deltaAmount),
                action_type: actionType || (deltaAmount >= 0 ? 'admin_grant' : 'admin_deduction'),
                reason: reason ? `[Admin: ${admin.email || 'support'}] ${reason}` : `Manual Admin Adjustment by ${admin.email || 'support'}`,
                created_at: new Date().toISOString()
            };

            const { data: newTx } = await client
                .from('shorts_transactions')
                .insert(txPayload)
                .select()
                .maybeSingle();

            console.log(`[ADMIN_CREDIT_ADJUSTMENT] Admin ${admin.email} adjusted user ${userId} balance by delta ${deltaAmount}. New balance: ${newBal}. Reason: ${reason}`);

            return res.json({
                success: true,
                newBalance: newBal,
                transaction: newTx || txPayload
            });
        } catch (err) {
            console.error('[ADMIN_ADJUST_BALANCE_ERROR]:', err);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    return router;
}
