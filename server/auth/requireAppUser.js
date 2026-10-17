/** Verify every browser/API session through Supabase. Never trust a body ID. */
export async function requireAppUser(req, client) {
  const authorization = req.headers?.authorization ?? req.headers?.Authorization;
  if (typeof authorization !== 'string' || !/^Bearer [^\s]+$/i.test(authorization)) {
    throw Object.assign(new Error('Sign in required'), { status: 401 });
  }
  if (!client?.auth?.getUser) throw Object.assign(new Error('Authentication unavailable'), { status: 503 });
  let result;
  try { result = await client.auth.getUser(authorization.slice(7)); }
  catch { throw Object.assign(new Error('Authentication unavailable'), { status: 503 }); }
  if (result.error || !result.data?.user?.id) throw Object.assign(new Error('Invalid session'), { status: 401 });
  return result.data.user;
}
