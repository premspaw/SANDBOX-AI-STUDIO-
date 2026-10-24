import { verifyAccessToken,oauthChallenge,OAUTH_SCOPES } from './oauthHandler.js';

/** Authenticate credentials; user ids, email addresses and query strings are never credentials. */
export async function resolveMcpUser(req, deps = {}) {
  const header=req.headers?.authorization || req.headers?.Authorization;
  if(typeof header!=='string' || !/^Bearer /i.test(header))return null;
  const token=header.slice(7).trim();
  if(!token || token.length>16384)return null;
  const payload=verifyAccessToken(token);
  if(payload)return {id:payload.sub,email:payload.email,role:'authenticated',authMethod:'oauth2',scopes:String(payload.scope||'').split(' ')};
  const client=deps.supabaseAdmin||deps.supabase;
  try {
    const {data,error}=await client?.auth?.getUser(token)||{};
    if(!error && data?.user?.id)return {...data.user,authMethod:'supabase_jwt',scopes:OAUTH_SCOPES};
  } catch { /* Invalid or unavailable authentication fails closed. */ }
  return null;
}
export function createMcpAuthMiddleware(deps = {}) {
  return async (req,res,next)=>{
    const user=await resolveMcpUser(req,deps);
    if(!user)return res.setHeader('WWW-Authenticate',oauthChallenge()),res.status(401).json({error:'unauthorized',error_description:'Valid Bearer token required.'});
    req.user=user;return next();
  };
}
