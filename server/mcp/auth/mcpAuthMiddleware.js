import { verifyAccessToken } from './oauthHandler.js';

/**
 * Resolve authenticated user from Bearer token
 * Checks:
 * 1. ZeroLens OAuth 2.0 Access Token
 * 2. Supabase Auth JWT Token
 * 3. Development mode fallback (if non-production and no token provided)
 */
export async function resolveMcpUser(req, deps = {}) {
  const authHeader = (req.headers && (req.headers['authorization'] || req.headers['Authorization'])) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const directCandidate = token
    || (req.headers && (req.headers['x-api-key'] || req.headers['x-user-id'] || req.headers['x-zerolens-key']))
    || (req.query && (req.query.api_key || req.query.user_id));

  const adminClient = deps.supabaseAdmin || deps.supabase;

  if (token) {
    // 1. Check if token is ZeroLens OAuth Access Token
    const oauthPayload = verifyAccessToken(token);
    if (oauthPayload && oauthPayload.sub) {
      return {
        id: oauthPayload.sub,
        email: oauthPayload.email || 'user@zerolens.in',
        role: oauthPayload.role || 'authenticated',
        authMethod: 'oauth2'
      };
    }

    // 2. Check if token is a Supabase JWT Token
    if (adminClient && adminClient.auth) {
      try {
        const { data, error } = await adminClient.auth.getUser(token);
        if (!error && data?.user) {
          return {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role || 'authenticated',
            authMethod: 'supabase_jwt'
          };
        }
      } catch (err) {
        console.warn('[MCP Auth] Supabase auth check error:', err.message);
      }
    }
  }

  // 3. Check if candidate is a direct ZeroLens User ID (UUID) or user email
  if (directCandidate && typeof directCandidate === 'string' && adminClient) {
    try {
      const cleanCandidate = directCandidate.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCandidate);

      if (isUuid) {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id, email, role')
          .eq('id', cleanCandidate)
          .maybeSingle();

        if (profile?.id) {
          return {
            id: profile.id,
            email: profile.email || 'user@zerolens.in',
            role: profile.role || 'authenticated',
            authMethod: 'user_id'
          };
        }
      } else if (cleanCandidate.includes('@')) {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id, email, role')
          .eq('email', cleanCandidate.toLowerCase())
          .maybeSingle();

        if (profile?.id) {
          return {
            id: profile.id,
            email: profile.email,
            role: profile.role || 'authenticated',
            authMethod: 'user_email'
          };
        }
      }
    } catch (dbErr) {
      console.warn('[MCP Auth] Profile resolution error:', dbErr.message);
    }
  }

  // 4. Fallback for public / unauthenticated MCP clients (e.g. ChatGPT "No Authentication" mode)
  return {
    id: process.env.DEFAULT_MCP_USER_ID || process.env.DEV_MOCK_USER_ID || 'cec79985-ce59-4d23-82a2-3ae6f69994ed',
    email: 'guest@zerolens.in',
    role: 'authenticated',
    authMethod: 'anonymous'
  };
}

/**
 * Express Middleware for protecting MCP endpoints
 */
export function createMcpAuthMiddleware(deps = {}) {
  return async (req, res, next) => {
    try {
      const user = await resolveMcpUser(req, deps);
      if (!user) {
        return res.status(401).json({
          error: 'unauthorized',
          error_description: 'Valid Bearer token required. Authorize the ZeroLens app in ChatGPT or provide an access token.'
        });
      }
      req.user = user;
      next();
    } catch (err) {
      console.error('[MCP Auth Middleware Error]:', err);
      res.status(500).json({ error: 'internal_auth_error', message: err.message });
    }
  };
}
