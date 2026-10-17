// Service-role database callers must authorize the existing record, not just
// the user_id supplied by the request. Inserts never overwrite a racing ID.
export async function saveOwnedRecord(client, table, record, user, requireAdmin) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw Object.assign(new Error('Invalid record'), { status: 400 });
    const payload = { ...record, user_id: record.user_id || user.id };
    let existing = null;
    if (payload.id) {
        const result = await client.from(table).select('id,user_id').eq('id', payload.id).maybeSingle();
        if (result.error) throw result.error;
        existing = result.data;
    }
    if (payload.user_id !== user.id || (existing && existing.user_id !== user.id)) await requireAdmin();
    if (!existing) return client.from(table).insert([payload]).select();
    let query = client.from(table).update(payload).eq('id', existing.id);
    query = existing.user_id == null ? query.is('user_id', null) : query.eq('user_id', existing.user_id);
    const result = await query.select();
    if (!result.error && (!result.data || result.data.length !== 1)) throw Object.assign(new Error('Record changed; reload and retry'), { status: 409 });
    return result;
}
