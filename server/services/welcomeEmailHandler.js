export function createWelcomeEmailHandler({ requireAuth, db, sendWelcomeEmail, now = Date.now }) {
    const recent = new Map();
    const windowMs = 24 * 60 * 60 * 1000;
    return async (req, res) => {
        try {
            const user = await requireAuth(req);
            if (!user.email || !user.email_confirmed_at) return res.status(403).json({ error: 'Verify your email before requesting a welcome email' });
            const requested = req.body?.email;
            if (requested && (typeof requested !== 'string' || requested.trim().toLowerCase() !== user.email.toLowerCase())) return res.status(403).json({ error: 'Welcome emails can only be sent to your account email' });
            const current = now();
            for (const [id, timestamp] of recent) if (current - timestamp >= windowMs) recent.delete(id);
            if (recent.has(user.id)) return res.json({ success: true, alreadyRequested: true });
            if (!db) return res.status(503).json({ error: 'Account data unavailable' });
            const { data: profile, error } = await db.from('profiles').select('shorts_balance').eq('id', user.id).maybeSingle();
            if (error || !profile) return res.status(503).json({ error: 'Account data unavailable' });
            // Serialize attempts for each verified account, including in-flight sends.
            if (recent.has(user.id)) return res.json({ success: true, alreadyRequested: true });
            if (recent.size >= 10000) recent.delete(recent.keys().next().value);
            recent.set(user.id, current);
            const metadata = user.user_metadata || {};
            const name = typeof metadata.full_name === 'string' ? metadata.full_name : (typeof metadata.name === 'string' ? metadata.name : '');
            const result = await sendWelcomeEmail({ email: user.email, name: name.slice(0, 200), shortsBalance: Number(profile.shorts_balance) || 0 });
            if (!result?.success) return res.status(503).json({ error: 'Welcome email is temporarily unavailable' });
            return res.json({ success: true });
        } catch (error) {
            const status = error.status || 500;
            res.status(status).json({ error: status === 401 ? 'Authentication required' : 'Welcome email is temporarily unavailable' });
        }
    };
}
