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
      --bg: #07090e;
      --card-bg: rgba(15, 18, 26, 0.88);
      --border: rgba(255, 255, 255, 0.08);
      --lime: #c8f135;
      --lime-glow: rgba(200, 241, 53, 0.28);
      --openai: #10a37f;
      --openai-glow: rgba(16, 163, 127, 0.3);
      --text: #f4f5f7;
      --text-muted: #94a3b8;
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(circle at 30% 15%, rgba(200, 241, 53, 0.12), transparent 50%),
        radial-gradient(circle at 70% 15%, rgba(16, 163, 127, 0.15), transparent 50%);
      color: var(--text);
      font-family: var(--font);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border-radius: 24px;
      width: 100%;
      max-width: 460px;
      padding: 40px 34px;
      box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 0, 0, 0.5);
      position: relative;
    }
    .brand-bridge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 18px;
      margin-bottom: 26px;
    }
    .brand-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .logo-container {
      width: 64px;
      height: 64px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .logo-container.zerolens {
      background: radial-gradient(circle at 35% 30%, rgba(200, 241, 53, 0.18), rgba(15, 23, 42, 0.95));
      border: 1.5px solid rgba(200, 241, 53, 0.4);
      box-shadow: 0 0 24px var(--lime-glow);
    }
    .logo-container.chatgpt {
      background: radial-gradient(circle at 35% 30%, rgba(16, 163, 127, 0.25), rgba(13, 27, 24, 0.95));
      border: 1.5px solid rgba(16, 163, 127, 0.45);
      box-shadow: 0 0 24px var(--openai-glow);
    }
    .brand-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #e2e8f0;
    }
    .brand-label.zl { color: var(--lime); }
    .brand-label.gpt { color: #34d399; }

    .connector-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: var(--text-muted);
      margin-bottom: 22px;
      animation: pulseConnect 2.5s infinite ease-in-out;
    }
    @keyframes pulseConnect {
      0%, 100% { transform: scale(1); border-color: rgba(255, 255, 255, 0.12); }
      50% { transform: scale(1.1); border-color: var(--lime); color: var(--lime); }
    }

    h1 {
      font-size: 23px;
      font-weight: 800;
      text-align: center;
      margin-bottom: 8px;
      letter-spacing: -0.4px;
    }
    p.subtitle {
      font-size: 13.5px;
      color: var(--text-muted);
      text-align: center;
      line-height: 1.55;
      margin-bottom: 24px;
    }
    .permissions {
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 16px 18px;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .permission-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 11px;
      color: #cbd5e1;
    }
    .permission-item:last-child { margin-bottom: 0; }
    .check {
      color: var(--lime);
      font-size: 14px;
      font-weight: 900;
      flex-shrink: 0;
    }
    .form-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-muted);
      margin-bottom: 7px;
    }
    input {
      width: 100%;
      padding: 13px 15px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 11px;
      color: #fff;
      font-size: 14px;
      outline: none;
      transition: all 0.2s;
    }
    input:focus {
      border-color: var(--lime);
      box-shadow: 0 0 0 3px var(--lime-glow);
      background: rgba(255, 255, 255, 0.06);
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 24px;
    }
    button.btn-primary {
      background: linear-gradient(135deg, #c8f135, #a3d917);
      border: none;
      color: #0b0f02;
      font-weight: 800;
      padding: 14px;
      border-radius: 11px;
      font-size: 14.5px;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
      letter-spacing: 0.2px;
    }
    button.btn-primary:hover {
      opacity: 0.95;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(200, 241, 53, 0.35);
    }
    a.btn-cancel {
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
      text-decoration: none;
      padding: 8px;
      transition: color 0.2s;
    }
    a.btn-cancel:hover { color: #fff; }
    .footer-note {
      text-align: center;
      font-size: 11.5px;
      color: #64748b;
      margin-top: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand-bridge">
      <!-- ZeroLens Official Aperture Logo -->
      <div class="brand-box">
        <div class="logo-container zerolens" title="ZeroLens AI Studio">
          <svg width="44" height="44" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="zlGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <!-- Outer glowing aperture ring -->
            <circle cx="80" cy="80" r="72" fill="none" stroke="#c8f135" stroke-width="5" filter="url(#zlGlow)"/>
            <!-- 8 blade tick marks -->
            <g stroke="#c8f135" stroke-width="1.6" opacity="0.45">
              <line x1="80" y1="8" x2="80" y2="20"/>
              <line x1="80" y1="140" x2="80" y2="152"/>
              <line x1="8" y1="80" x2="20" y2="80"/>
              <line x1="140" y1="80" x2="152" y2="80"/>
              <line x1="30.7" y1="30.7" x2="39.2" y2="39.2"/>
              <line x1="120.8" y1="120.8" x2="129.3" y2="129.3"/>
              <line x1="129.3" y1="30.7" x2="120.8" y2="39.2"/>
              <line x1="39.2" y1="120.8" x2="30.7" y2="129.3"/>
            </g>
            <!-- Inner aperture ring -->
            <circle cx="80" cy="80" r="56" fill="none" stroke="#c8f135" stroke-width="1.2" opacity="0.3"/>
            <!-- Hexagonal aperture blades -->
            <g fill="none" stroke="#c8f135" stroke-width="1.2" opacity="0.25">
              <path d="M80 24 A56 56 0 0 1 128.5 52"/>
              <path d="M128.5 52 A56 56 0 0 1 128.5 108"/>
              <path d="M128.5 108 A56 56 0 0 1 80 136"/>
              <path d="M80 136 A56 56 0 0 1 31.5 108"/>
              <path d="M31.5 108 A56 56 0 0 1 31.5 52"/>
              <path d="M31.5 52 A56 56 0 0 1 80 24"/>
            </g>
            <!-- Iconic Z letterform -->
            <line x1="50" y1="56" x2="110" y2="56" stroke="#c8f135" stroke-width="8.5" stroke-linecap="round"/>
            <line x1="110" y1="56" x2="50" y2="104" stroke="#c8f135" stroke-width="8.5" stroke-linecap="round"/>
            <line x1="50" y1="104" x2="110" y2="104" stroke="#c8f135" stroke-width="8.5" stroke-linecap="round"/>
            <!-- Recording glint dot -->
            <circle cx="116" cy="54" r="5.5" fill="#ef4444"/>
          </svg>
        </div>
        <span class="brand-label zl">ZeroLens</span>
      </div>

      <!-- Connector icon -->
      <div class="connector-badge" title="Secure OAuth 2.0 Connection">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
        </svg>
      </div>

      <!-- ChatGPT Official Emblem -->
      <div class="brand-box">
        <div class="logo-container chatgpt" title="ChatGPT by OpenAI">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.02-1.1686a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.402-.6812zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.907 9.2297V6.8974a.0662.0662 0 0 1 .0331-.0615L14.7686 4.05a4.4992 4.4992 0 0 1 6.1408 1.6464 4.485 4.485 0 0 1 .5318 3.0315zM7.747 15.6324l-2.02-1.1686a.071.071 0 0 1-.038-.052V8.8292a4.4944 4.4944 0 0 1 7.3709-3.4536l-.142.0805-4.7783 2.7582a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3655l2.6024-1.4998 2.6025 1.4998v2.9997l-2.6025 1.4998-2.6024-1.4998z"/>
          </svg>
        </div>
        <span class="brand-label gpt">ChatGPT</span>
      </div>
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
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    // Built-in Reviewer demo account support for OpenAI Reviewers
    const isReviewAccount = ['support@zerolens.in', 'review@zerolens.in', 'review@gmail.com', 'reviewer@zerolens.in', 'openai-review@zerolens.in', 'reviewer@gmail.com'].includes(cleanEmail);
    const isReviewPass = cleanPassword === 'ZeroLensReview2026!' || cleanPassword === 'ZeroLens@2026' || cleanPassword === 'Review2026!' || cleanPassword === 'ZeroLensSupport2026!';

    if (isReviewAccount && isReviewPass) {
      user = {
        id: process.env.REVIEWER_USER_ID || 'cec79985-ce59-4d23-82a2-3ae6f69994ed',
        email: cleanEmail,
        role: 'authenticated'
      };
      console.log(`[MCP OAuth] Reviewer demo account authenticated: ${cleanEmail}`);
    } else if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password || ''
      });

      if (error || !data?.user) {
        return res.status(401).send(`Authentication failed: ${error?.message || 'Invalid credentials'}. <a href="javascript:history.back()">Try again</a>`);
      }
      user = data.user;
    } else {
      // Dev mode fallback
      user = { id: 'cec79985-ce59-4d23-82a2-3ae6f69994ed', email: cleanEmail || 'dev@zerolens.in', role: 'user' };
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

/**
 * Returns RFC 8414 & OpenID Connect Discovery Metadata
 * Informs ChatGPT that PKCE S256 is supported and provides endpoints
 */
export function getOAuthMetadata(baseUrl = 'https://zerolens.in') {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return {
    issuer: cleanBase,
    authorization_endpoint: `${cleanBase}/api/mcp/auth/authorize`,
    token_endpoint: `${cleanBase}/api/mcp/auth/token`,
    userinfo_endpoint: `${cleanBase}/api/mcp/auth/userinfo`,
    registration_endpoint: `${cleanBase}/api/mcp/auth/register`,
    jwks_uri: `${cleanBase}/api/mcp/auth/jwks.json`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: [
      'openid',
      'email',
      'profile',
      'generate_image',
      'generate_video',
      'check_generation',
      'list_projects',
      'get_usage'
    ]
  };
}

/**
 * Handle RFC 7591 Dynamic Client Registration (DCR)
 */
export async function handleClientRegistration(req, res) {
  const { client_name = 'ChatGPT', redirect_uris = [] } = req.body || {};
  const clientId = `zl_client_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const clientSecret = `zl_secret_${crypto.randomBytes(16).toString('hex')}`;

  return res.status(201).json({
    client_id: clientId,
    client_secret: clientSecret,
    client_name,
    redirect_uris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_post'
  });
}

/**
 * Handle GET /api/mcp/auth/jwks.json
 */
export function handleJwksGet(req, res) {
  res.setHeader('Content-Type', 'application/json');
  return res.json({ keys: [] });
}

