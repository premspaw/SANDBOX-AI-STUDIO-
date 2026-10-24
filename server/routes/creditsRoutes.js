import crypto from 'node:crypto';
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
            throw Object.assign(new Error('Database not configured'), { status: 503 });
        }
        const { data: profile } = await client
            .from('profiles')
            .select('role, email')
            .eq('id', user.id)
            .maybeSingle();

        if (profile?.role === 'admin') {
            return user;
        }
        throw Object.assign(new Error('Forbidden: Admin access required'), { status: 403 });
    }

    /**
     * POST /api/credits/spend
     * Body: { amount: number, reason: string }
     * Header: Authorization: Bearer <supabase_access_token>
     * Deducts credits from the authenticated user's balance server-side.
     */
    // Compatibility preflight: generation endpoints own the actual debit.
    router.post('/credits/spend', async (req,res)=>{
        try {
            const user=await requireAuth(req);
            const result=await deps.billing.preflight(user.id,req.body?.amount);
            res.json({success:true,...result,charged:false});
        } catch(err){res.status(err.status||503).json({error:err.message});}
    });

    /**
     * POST /api/credits/refund
     * Body: { amount: number, reason: string }
     * Header: Authorization: Bearer <supabase_access_token>
     * Refunds credits to the authenticated user's balance server-side.
     */
    router.post('/credits/refund', async (req,res)=>{
        try{
            await requireAuth(req);
            return res.status(403).json({error:'Refunds are issued by the server after a verified failed generation.'});
        }catch(err){return res.status(err.status===503?503:401).json({error:'Authentication required'});}
    });

    /**
     * POST /api/pricing/purchase
     * Body: { userId, planId }
     * Simulates purchase/tier upgrade.
     */
    router.post('/pricing/purchase', async (req,res)=>{
        try { await requireAdmin(req); return res.status(410).json({error:'Purchase simulation has been removed. Use verified checkout or an audited admin adjustment.'}); }
        catch(err){return res.status(err.status||403).json({error:err.message});}
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

            // Fetch billing / payment history for this user
            let billingHistory = [];
            if (targetUserId) {
                try {
                    const { data: bills } = await client
                        .from('billing_history')
                        .select('*')
                        .eq('user_id', targetUserId)
                        .order('created_at', { ascending: false })
                        .limit(50);
                    billingHistory = bills || [];
                } catch (bErr) {
                    console.warn('[ADMIN_USER_AUDIT] Billing history warning:', bErr.message);
                }
            }

            return res.json({
                success: true,
                profile: profile || { id: targetUserId, email: email || null, shorts_balance: 0 },
                transactions,
                assets,
                billingHistory
            });
        } catch (err) {
            console.error('[ADMIN_USER_AUDIT_ERROR]:', err);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    /**
     * GET /api/admin/billing-history
     * Header: Authorization: Bearer <token>
     * Admin endpoint: Returns recent billing and payment records across all users.
     */
    router.get('/admin/billing-history', async (req, res) => {
        try {
            await requireAdmin(req);
            const client = supabaseAdmin || supabase;
            if (!client) {
                return res.json({ success: true, payments: [] });
            }

            const { data: payments, error } = await client
                .from('billing_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) {
                console.warn('[ADMIN_BILLING_HISTORY_WARN]:', error.message);
                return res.json({ success: true, payments: [] });
            }

            // Enrich with user email if available
            const userIds = [...new Set((payments || []).map(p => p.user_id).filter(Boolean))];
            let userMap = {};
            if (userIds.length > 0) {
                const { data: profiles } = await client
                    .from('profiles')
                    .select('id, email, full_name, tier')
                    .in('id', userIds);
                if (profiles) {
                    profiles.forEach(pr => { userMap[pr.id] = pr; });
                }
            }

            const enriched = (payments || []).map(p => ({
                ...p,
                user_email: userMap[p.user_id]?.email || 'N/A',
                user_name: userMap[p.user_id]?.full_name || 'Creator',
                user_tier: userMap[p.user_id]?.tier || 'STARTER'
            }));

            return res.json({ success: true, payments: enriched });
        } catch (err) {
            console.error('[ADMIN_BILLING_HISTORY_ERROR]:', err);
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

            if(typeof reason!=='string'||!reason.trim())return res.status(400).json({error:'An audit reason is required'});
            if(exactBalance!==undefined&&(!Number.isFinite(exactBalance)||exactBalance<0))return res.status(400).json({error:'Invalid balance'});
            const result=await deps.billing.adjustCredits({p_user_id:userId,
                p_operation_id:'admin:'+admin.id+':'+(req.headers['idempotency-key']||crypto.randomUUID()),
                p_amount:exactBalance!==undefined?0:amount,p_exact_balance:exactBalance??null,
                p_reason:('Admin '+admin.id+': '+reason).slice(0,500),p_tier:null});
            return res.json({success:true,...result});
        } catch (err) {
            console.error('[ADMIN_ADJUST_BALANCE_ERROR]:', err);
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    return router;
}
