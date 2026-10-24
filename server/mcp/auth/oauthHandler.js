import crypto from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

// Single-process grants. Restarts revoke grants; use a shared transactional store before scaling.
const authCodes=new Map(), refreshTokens=new Map(), clients=new Map();
const TTL=900, MAX_ENTRIES=1000;
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const random=()=>crypto.randomBytes(32).toString('base64url');
const constantEqual=(a,b)=>{
  if(typeof a!=='string'||typeof b!=='string')return false;
  const x=Buffer.from(a),y=Buffer.from(b);
  return x.length===y.length && crypto.timingSafeEqual(x,y);
};
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const noStore=res=>{res.setHeader('Cache-Control','no-store');res.setHeader('Pragma','no-cache');};
function prune(map){for(const [key,value] of map)if(value.expiresAt<=Date.now())map.delete(key);}
function put(map,key,value){prune(map);if(map.size>=MAX_ENTRIES)throw new Error('OAuth capacity reached');map.set(key,value);}
export function getOAuthSecret(){
  const secret=process.env.ZEROLENS_MCP_SECRET;
  if(!secret || Buffer.byteLength(secret)<32)throw new Error('Configure ZEROLENS_MCP_SECRET with at least 32 random bytes');
  return secret;
}
export function getOAuthClientCredentials(){return {
  clientId:process.env.OPENAI_APP_CLIENT_ID||'zerolens-chatgpt-app',
  clientSecret:process.env.OPENAI_APP_CLIENT_SECRET||null,
};}
const allowedRedirects=()=>new Set((process.env.MCP_REDIRECT_URIS||'').split(',').map(s=>s.trim()).filter(Boolean));
function validRedirect(uri){
  if(typeof uri!=='string'||!allowedRedirects().has(uri))return false;
  try{const u=new URL(uri);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash;}catch{return false;}
}
function getClient(id){
  const configured=getOAuthClientCredentials();
  if(id===configured.clientId)return {...configured,redirects:allowedRedirects()};
  prune(clients);return clients.get(id);
}
function authorizeParams(p){
  const client=getClient(p.client_id);
  return client && validRedirect(p.redirect_uri) && client.redirects.has(p.redirect_uri)
    && (p.response_type===undefined||p.response_type==='code')
    && p.code_challenge_method==='S256'
    && typeof p.code_challenge==='string' && /^[A-Za-z0-9_-]{43}$/.test(p.code_challenge)
    && (p.state===undefined || typeof p.state==='string' && p.state.length<=2048);
}
const encode=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url');
export function generateAccessToken(payload,expiresInSeconds=TTL){
  if(typeof payload.sub!=='string'||!payload.sub)throw new Error('Missing subject');
  const now=Math.floor(Date.now()/1000);
  const unsigned=encode({alg:'HS256',typ:'at+jwt'})+'.'+encode({
    sub:payload.sub,email:payload.email,role:'authenticated',iss:'zerolens-mcp',aud:'zerolens-mcp',
    iat:now,exp:now+Math.min(TTL,expiresInSeconds),
  });
  return unsigned+'.'+crypto.createHmac('sha256',getOAuthSecret()).update(unsigned).digest('base64url');
}
export function verifyAccessToken(token){
  try{
    if(typeof token!=='string'||token.length>16384)return null;
    const parts=token.split('.');if(parts.length!==3)return null;
    const [h,p,s]=parts;
    const signature=crypto.createHmac('sha256',getOAuthSecret()).update(h+'.'+p).digest('base64url');
    if(!constantEqual(s,signature))return null;
    const header=JSON.parse(Buffer.from(h,'base64url')),payload=JSON.parse(Buffer.from(p,'base64url'));
    const now=Math.floor(Date.now()/1000);
    if(header.alg!=='HS256'||header.typ!=='at+jwt'||payload.iss!=='zerolens-mcp'||payload.aud!=='zerolens-mcp'
      ||typeof payload.sub!=='string'||!payload.sub||!Number.isFinite(payload.exp)||payload.exp<=now
      ||!Number.isFinite(payload.iat)||payload.iat>now+30)return null;
    return payload;
  }catch{return null;}
}
function formSignature(p,nonce,expires){
  return crypto.createHmac('sha256',getOAuthSecret()).update(JSON.stringify([
    p.client_id,p.redirect_uri,p.state||'',p.code_challenge,nonce,expires])).digest('base64url');
}
export async function handleAuthorizeGet(req,res){
  noStore(res);
  const p=req.query||{};
  if(!authorizeParams(p))return res.status(400).send('Invalid OAuth client, redirect URI or S256 challenge.');
  try{
    const nonce=random(),expires=Date.now()+600000,csrf=nonce+'.'+expires+'.'+formSignature(p,nonce,expires);
    res.setHeader('Set-Cookie','__Host-zerolens-oauth='+csrf+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    const fields={client_id:p.client_id,redirect_uri:p.redirect_uri,state:p.state||'',
      code_challenge:p.code_challenge,code_challenge_method:'S256',csrf};
    return res.send('<!doctype html><html lang="en"><meta charset="utf-8"><title>Authorize ZeroLens</title>'+
      '<style>body{font:16px system-ui;background:#101525;color:white;max-width:440px;margin:10vh auto;padding:24px}label,input,button{display:block;margin:12px 0}input,button{padding:12px;width:100%;box-sizing:border-box}</style>'+
      '<h1>Connect ZeroLens</h1><p>Allow this client to use your credits, create media, and access your projects.</p>'+
      '<form method="POST" action="/api/mcp/auth/authorize">'+
      Object.entries(fields).map(([k,v])=>'<input type="hidden" name="'+k+'" value="'+escapeHtml(v)+'">').join('')+
      '<label>Email<input name="email" type="email" autocomplete="username" required></label>'+
      '<label>Password<input name="password" type="password" autocomplete="current-password" required></label>'+
      '<button>Authorize access</button></form></html>');
  }catch{return res.status(503).send('OAuth is not configured.');}
}
export async function handleAuthorizePost(req,res,deps={}){
  noStore(res);const p=req.body||{};
  if(!authorizeParams(p))return res.status(400).send('Invalid OAuth request.');
  try{
    const cookie=(req.headers?.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('__Host-zerolens-oauth='))?.slice(22);
    const [nonce,expires,signature]=String(p.csrf||'').split('.');
    if(!constantEqual(cookie,p.csrf)||!nonce||!Number.isFinite(Number(expires))||Number(expires)<Date.now()
      ||!constantEqual(signature,formSignature(p,nonce,Number(expires))))return res.status(403).send('Authorization form expired. Start again.');
    if(typeof p.email!=='string'||p.email.length>254||typeof p.password!=='string'||p.password.length>1024)
      return res.status(400).send('Invalid credentials.');
    const url=process.env.SUPABASE_URL;
    const key=process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_KEY;
    // Do not mutate the shared server Supabase session by signing a user into it.
    const auth=deps.createOAuthAuthClient?.() || (url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null);
    if(!auth)return res.status(503).send('Authentication is not configured.');
    const {data,error}=await auth.auth.signInWithPassword({email:p.email.trim().toLowerCase(),password:p.password});
    if(error||!data?.user?.id)return res.status(401).send('Invalid credentials.');
    const code=random();
    put(authCodes,hash(code),{userId:data.user.id,email:data.user.email,clientId:p.client_id,
      redirectUri:p.redirect_uri,challenge:p.code_challenge,expiresAt:Date.now()+300000});
    const target=new URL(p.redirect_uri);target.searchParams.set('code',code);if(p.state)target.searchParams.set('state',p.state);
    res.setHeader('Set-Cookie','__Host-zerolens-oauth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return res.redirect(target.toString());
  }catch{return res.status(503).send('Authorization unavailable. Please retry.');}
}
function requestClient(req){
  const p=req.body||{};let id=p.client_id,secret=p.client_secret;
  const auth=req.headers?.authorization;
  if(typeof auth==='string'&&auth.startsWith('Basic ')){
    const decoded=Buffer.from(auth.slice(6),'base64').toString('utf8'),sep=decoded.indexOf(':');
    if(sep<0)return null;
    id=decodeURIComponent(decoded.slice(0,sep));secret=decodeURIComponent(decoded.slice(sep+1));
  }
  const client=getClient(id);
  if(!client || client.clientSecret && !constantEqual(secret,client.clientSecret))return null;
  return {...client,clientId:id};
}
function issueTokens(res,data,clientId){
  const refresh=random(),access=generateAccessToken({sub:data.userId,email:data.email});
  put(refreshTokens,hash(refresh),{...data,clientId,expiresAt:Date.now()+30*86400000});
  return res.json({access_token:access,token_type:'Bearer',expires_in:TTL,refresh_token:refresh,
    scope:'generate_image generate_video check_generation list_projects get_usage'});
}
export async function handleTokenPost(req,res){
  noStore(res);const p=req.body||{};
  try{
    getOAuthSecret();
    const client=requestClient(req);
    if(!client)return res.status(401).json({error:'invalid_client'});
    if(p.grant_type==='authorization_code'){
      const key=hash(String(p.code||'')),data=authCodes.get(key);
      const verifier=typeof p.code_verifier==='string'&&/^[A-Za-z0-9._~-]{43,128}$/.test(p.code_verifier);
      if(!data||data.expiresAt<=Date.now()||data.clientId!==client.clientId||data.redirectUri!==p.redirect_uri
        ||!verifier||!constantEqual(crypto.createHash('sha256').update(p.code_verifier).digest('base64url'),data.challenge))
        return res.status(400).json({error:'invalid_grant'});
      authCodes.delete(key);return issueTokens(res,data,client.clientId);
    }
    if(p.grant_type==='refresh_token'){
      const key=hash(String(p.refresh_token||'')),data=refreshTokens.get(key);
      if(!data||data.expiresAt<=Date.now()||data.clientId!==client.clientId)return res.status(400).json({error:'invalid_grant'});
      refreshTokens.delete(key);return issueTokens(res,data,client.clientId);
    }
    return res.status(400).json({error:'unsupported_grant_type'});
  }catch{return res.status(503).json({error:'temporarily_unavailable'});}
}
export async function handleClientRegistration(req,res){
  noStore(res);const {redirect_uris,client_name='ChatGPT'}=req.body||{};
  if(!Array.isArray(redirect_uris)||!redirect_uris.length||redirect_uris.length>5
    ||!redirect_uris.every(validRedirect))return res.status(400).json({error:'invalid_redirect_uri'});
  if(typeof client_name!=='string'||client_name.length>120)return res.status(400).json({error:'invalid_client_metadata'});
  try{
    getOAuthSecret();const clientId='zl_'+random();
    put(clients,clientId,{clientId,clientSecret:null,redirects:new Set(redirect_uris),expiresAt:Date.now()+30*86400000});
    return res.status(201).json({client_id:clientId,client_name,redirect_uris,token_endpoint_auth_method:'none',
      grant_types:['authorization_code','refresh_token'],response_types:['code']});
  }catch{return res.status(503).json({error:'temporarily_unavailable'});}
}
export async function handleUserInfoGet(req,res,user){
  noStore(res);
  if(!user)return res.status(401).json({error:'unauthorized'});
  return res.json({sub:user.id,email:user.email,role:'authenticated'});
}
export function getOAuthMetadata(baseUrl=process.env.PUBLIC_APP_URL||'https://zerolens.in'){
  const base=baseUrl.replace(/\/+$/,'');
  return {issuer:base,authorization_endpoint:base+'/api/mcp/auth/authorize',token_endpoint:base+'/api/mcp/auth/token',
    userinfo_endpoint:base+'/api/mcp/auth/userinfo',registration_endpoint:base+'/api/mcp/auth/register',
    response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],
    token_endpoint_auth_methods_supported:['client_secret_post','client_secret_basic','none'],code_challenge_methods_supported:['S256']};
}
export function handleJwksGet(req,res){noStore(res);return res.json({keys:[]});}
