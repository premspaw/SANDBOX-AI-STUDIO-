import crypto from 'crypto';

// In-memory store for authorization codes and refresh tokens (in production, backed by DB or Redis)
const authCodes = new Map();
const refreshTokens = new Map();

// Helper to get or generate the OAuth JWT signing secret
export function getOAuthSecret() {
  return process.env.ZEROLENS_MCP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'zerolens-mcp-default-secret-key-32chars!';
}

// Configured OAuth Client Credentials (optional: can be restricted via env vars)
export function getOAuthClientCredentials() {
  return {
    clientId: process.env.OPENAI_APP_CLIENT_ID || 'zerolens-chatgpt-app',
    clientSecret: process.env.OPENAI_APP_CLIENT_SECRET || 'zerolens-chatgpt-secret'
  };
}

/**
 * Sign an access token with HMAC-SHA256
 */
export function generateAccessToken(payload, expiresInSeconds = 86400 * 30) { // 30 days default
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000), iss: 'zerolens-mcp' };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${encode(header)}.${encode(fullPayload)}`;
  const signature = crypto
    .createHmac('sha256', getOAuthSecret())
    .update(unsignedToken)
    .digest('base64url');

  return `${unsignedToken}.${signature}`;
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;
  const unsignedToken = `${headerB64}.${payloadB64}`;
  const expectedSignature = crypto
    .createHmac('sha256', getOAuthSecret())
    .update(unsignedToken)
    .digest('base64url');

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Handle GET /api/mcp/auth/authorize
 * Renders the ZeroLens OAuth authorization consent page
 */
export async function handleAuthorizeGet(req, res, deps) {
  const {
    client_id,
    redirect_uri,
    state,
    response_type = 'code',
    code_challenge,
    code_challenge_method = 'S256',
    scope = 'generate_image generate_video check_generation list_projects get_usage'
  } = req.query;

  if (!redirect_uri) {
    return res.status(400).send('Missing redirect_uri parameter.');
  }

  // Render a sleek, premium ZeroLens OAuth consent page
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize ZeroLens for ChatGPT</title>
  <style>
    :root {
      --bg: #090a0f;
      --card-bg: rgba(20, 24, 35, 0.85);
      --border: rgba(255, 255, 255, 0.1);
      --accent: #f59e0b;
      --accent-glow: rgba(245, 158, 11, 0.25);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      background-image: radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.15), transparent 60%);
      color: var(--text);
      font-family: var(--font);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      width: 100%;
      max-width: 440px;
      padding: 36px 32px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px var(--accent-glow);
    }
    .logo-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .logo-badge {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      border: 1px solid rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 800;
      color: var(--accent);
    }
    .link-icon {
      font-size: 18px;
      color: var(--text-muted);
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      text-align: center;
      margin-bottom: 8px;
    }
    p.subtitle {
      font-size: 14px;
      color: var(--text-muted);
      text-align: center;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .permissions {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .permission-item {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .permission-item:last-child { margin-bottom: 0; }
    .check {
      color: #10b981;
      font-weight: bold;
    }
    .form-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    input {
      width: 100%;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      color: #fff;
      font-size: 14px;
      outline: none;
      transition: all 0.2s;
    }
    input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 24px;
    }
    button.btn-primary {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border: none;
      color: #000;
      font-weight: 700;
      padding: 14px;
      border-radius: 10px;
      font-size: 14px;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
    }
    button.btn-primary:hover {
      opacity: 0.95;
      transform: translateY(-1px);
    }
    a.btn-cancel {
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
      text-decoration: none;
      padding: 8px;
    }
    a.btn-cancel:hover { color: #fff; }
    .footer-note {
      text-align: center;
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-row">
      <div class="logo-badge">ZL</div>
      <span class="link-icon">⇄</span>
      <div class="logo-badge" style="background: linear-gradient(135deg, #10a37f, #0d8264); color: #fff;">GPT</div>
    </div>
    <h1>Connect to ChatGPT</h1>
    <p class="subtitle">Allow ChatGPT to access your ZeroLens account to generate AI images, create videos, and check project renders.</p>

    <div class="permissions">
      <div class="permission-item">
        <span class="check">✓</span>
        <span>Generate AI images & cinematic videos using your Shorts balance</span>
      </div>
      <div class="permission-item">
        <span class="check">✓</span>
        <span>Check render progress and retrieve completed assets</span>
      </div>
      <div class="permission-item">
        <span class="check">✓</span>
        <span>View your projects and credit balance</span>
      </div>
    </div>

    <form method="POST" action="/api/mcp/auth/authorize">
      <input type="hidden" name="client_id" value="${client_id || ''}">
      <input type="hidden" name="redirect_uri" value="${redirect_uri || ''}">
      <input type="hidden" name="state" value="${state || ''}">
      <input type="hidden" name="code_challenge" value="${code_challenge || ''}">
      <input type="hidden" name="code_challenge_method" value="${code_challenge_method || ''}">
      <input type="hidden" name="scope" value="${scope || ''}">

      <div class="form-group">
        <label for="email">ZeroLens Email</label>
        <input type="email" id="email" name="email" placeholder="you@example.com" required autofocus>
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" placeholder="••••••••" required>
      </div>

      <div class="actions">
        <button type="submit" class="btn-primary">Authorize Access</button>
        <a href="${redirect_uri}?error=access_denied&state=${encodeURIComponent(state || '')}" class="btn-cancel">Cancel and Return</a>
      </div>
    </form>

    <div class="footer-note">
      ZeroLens AI Studio • Secure OAuth 2.0 Gateway
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

/**
 * Handle POST /api/mcp/auth/authorize
 * Authenticates the user against Supabase and redirects with an authorization code
 */
export async function handleAuthorizePost(req, res, deps) {
  const {
    client_id,
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method = 'S256',
    email,
    password
  } = req.body;

  if (!redirect_uri) {
    return res.status(400).send('Missing redirect_uri.');
  }

  const { supabase, supabaseAdmin } = deps;
  const client = supabaseAdmin || supabase;

  try {
    let user = null;

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: (email || '').trim(),
        password: password || ''
      });

      if (error || !data?.user) {
        return res.status(401).send(`Authentication failed: ${error?.message || 'Invalid credentials'}. <a href="javascript:history.back()">Try again</a>`);
      }
      user = data.user;
    } else {
      // Dev mode fallback
      user = { id: 'cec79985-ce59-4d23-82a2-3ae6f69994ed', email: email || 'dev@zerolens.in', role: 'user' };
    }

    // Generate a secure 32-byte authorization code
    const code = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    authCodes.set(code, {
      userId: user.id,
      email: user.email,
      role: user.role || 'authenticated',
      clientId: client_id,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      expiresAt
    });

    // Cleanup expired codes
    setTimeout(() => authCodes.delete(code), 11 * 60 * 1000);

    const targetUrl = new URL(redirect_uri);
    targetUrl.searchParams.set('code', code);
    if (state) targetUrl.searchParams.set('state', state);

    console.log(`[MCP OAuth] User ${user.email} (${user.id}) authorized ChatGPT app. Redirecting to ${redirect_uri}`);
    return res.redirect(targetUrl.toString());

  } catch (err) {
    console.error('[MCP OAuth Authorize Error]:', err);
    return res.status(500).send(`Server error: ${err.message}. <a href="javascript:history.back()">Go back</a>`);
  }
}

/**
 * Handle POST /api/mcp/auth/token
 * Exchanges authorization code or refresh token for an access token
 */
export async function handleTokenPost(req, res, deps) {
  const {
    grant_type,
    code,
    redirect_uri,
    client_id,
    client_secret,
    code_verifier,
    refresh_token
  } = req.body;

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');

  // Authorization Code Grant
  if (grant_type === 'authorization_code') {
    if (!code) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Missing code parameter' });
    }

    const authData = authCodes.get(code);
    if (!authData) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired authorization code' });
    }

    // Single use: delete immediately
    authCodes.delete(code);

    if (authData.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code has expired' });
    }

    // PKCE verification if code_challenge was provided
    if (authData.codeChallenge) {
      if (!code_verifier) {
        return res.status(400).json({ error: 'invalid_request', error_description: 'code_verifier required for PKCE' });
      }

      let calculatedChallenge = code_verifier;
      if (authData.codeChallengeMethod === 'S256') {
        calculatedChallenge = crypto.createHash('sha256').update(code_verifier).digest('base64url');
      }

      if (calculatedChallenge !== authData.codeChallenge) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE challenge verification failed' });
      }
    }

    const payload = {
      sub: authData.userId,
      email: authData.email,
      role: authData.role
    };

    const accessToken = generateAccessToken(payload, 86400 * 30); // 30 days
    const newRefreshToken = crypto.randomBytes(32).toString('hex');

    refreshTokens.set(newRefreshToken, {
      userId: authData.userId,
      email: authData.email,
      role: authData.role,
      expiresAt: Date.now() + 90 * 86400 * 1000 // 90 days
    });

    console.log(`[MCP OAuth] Issued access token for user: ${authData.email} (${authData.userId})`);

    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 86400 * 30,
      refresh_token: newRefreshToken,
      scope: 'generate_image generate_video check_generation list_projects get_usage'
    });
  }

  // Refresh Token Grant
  if (grant_type === 'refresh_token') {
    if (!refresh_token) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Missing refresh_token parameter' });
    }

    const tokenData = refreshTokens.get(refresh_token);
    if (!tokenData || tokenData.expiresAt < Date.now()) {
      refreshTokens.delete(refresh_token);
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired refresh token' });
    }

    const payload = {
      sub: tokenData.userId,
      email: tokenData.email,
      role: tokenData.role
    };

    const accessToken = generateAccessToken(payload, 86400 * 30);
    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 86400 * 30,
      refresh_token,
      scope: 'generate_image generate_video check_generation list_projects get_usage'
    });
  }

  return res.status(400).json({
    error: 'unsupported_grant_type',
    error_description: `Grant type '${grant_type}' is not supported. Use 'authorization_code' or 'refresh_token'.`
  });
}

/**
 * Handle GET /api/mcp/auth/userinfo
 * Returns authenticated user details from token
 */
export async function handleUserInfoGet(req, res, user) {
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.json({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.email ? user.email.split('@')[0] : 'ZeroLens Creator'
  });
}
