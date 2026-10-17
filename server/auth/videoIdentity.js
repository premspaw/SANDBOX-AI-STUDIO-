// Provider routing privileges come only from a verified session and stored role.
export async function getVerifiedVideoIdentity(req, requireAuth, db) {
    const user = await requireAuth(req);
    if (!user?.id) throw Object.assign(new Error('Authentication required'), { status: 401 });
    let isAdmin = false;
    if (db) {
        try {
            const { data, error } = await db.from('profiles').select('role').eq('id', user.id).single();
            isAdmin = !error && data?.role === 'admin';
        } catch {
            isAdmin = false;
        }
    }
    return { user, isAdmin };
}
