/**
 * Validates whether a string is a valid UUID v4.
 * Used to guard Supabase queries/inserts where the assets.user_id column
 * is of UUID type — passing non-UUID strings like "local_user" or "anon"
 * causes a Postgres type error.
 *
 * @param {string} id - The string to validate
 * @returns {boolean} true if the string is a valid UUID
 */
export function isValidUuid(id) {
    if (!id || typeof id !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
