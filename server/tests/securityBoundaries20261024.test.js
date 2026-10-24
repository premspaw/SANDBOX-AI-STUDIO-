import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import {resolveMcpUser} from '../mcp/auth/mcpAuthMiddleware.js';
import {generateAccessToken,verifyAccessToken,handleAuthorizeGet,handleAuthorizePost,handleTokenPost,handleClientRegistration} from '../mcp/auth/oauthHandler.js';
import {renderWidgetHtml} from '../mcp/ui/widgetRenderer.js';
import {executeCheckGeneration} from '../mcp/tools/statusTools.js';
import {executeSearch,executeFetch} from '../mcp/tools/searchTools.js';
import createMotionRouter from '../routes/motionStudioRoutes.js';
import createAdsRouter from '../routes/adsStudioRoutes.js';
import createMcpRouter from '../routes/mcpRoutes.js';
import createCreditsRouter from '../routes/creditsRoutes.js';
import {requireAppUser} from '../auth/requireAppUser.js';

const names=['ZEROLENS_MCP_SECRET','MCP_REDIRECT_URIS','OPENAI_APP_CLIENT_ID','OPENAI_APP_CLIENT_SECRET'];
const old=Object.fromEntries(names.map(n=>[n,process.env[n]]));
before(()=>{process.env.ZEROLENS_MCP_SECRET='fixture-secret-at-least-32-bytes-tests-only';
 process.env.MCP_REDIRECT_URIS='https://chatgpt.com/aip/fixture/oauth/callback';process.env.OPENAI_APP_CLIENT_ID='fixture-client';delete process.env.OPENAI_APP_CLIENT_SECRET;});
after(()=>{for(const n of names)if(old[n]===undefined)delete process.env[n];else process.env[n]=old[n];});
const response=()=>({code:200,headers:{},status(n){this.code=n;return this;},setHeader(k,v){this.headers[k.toLowerCase()]=v;},json(v){this.body=v;return this;},send(v){this.body=v;return this;},redirect(v){this.location=v;return this;}});
const verifier='a'.repeat(43);
const params=()=>({client_id:'fixture-client',redirect_uri:process.env.MCP_REDIRECT_URIS,state:'fixture-state',
 code_challenge:crypto.createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
async function form(p=params()){
 const r=response();await handleAuthorizeGet({query:p},r);assert.equal(r.code,200);
 const cookie=r.headers['set-cookie'].split(';')[0];return {cookie,csrf:cookie.slice(cookie.indexOf('=')+1),params:p};
}
const authDeps={createOAuthAuthClient:()=>({auth:{signInWithPassword:async({password})=>
 ({data:{user:password==='fixture-valid-password'?{id:'alice',email:'alice@example.invalid'}:null},error:password!=='fixture-valid-password'})}})};
async function codeGrant(){
 const f=await form(),r=response();
 await handleAuthorizePost({headers:{cookie:f.cookie},body:{...f.params,csrf:f.csrf,email:'alice@example.invalid',password:'fixture-valid-password'}},r,authDeps);
 assert.equal(r.code,200);assert.ok(r.location);
 return new URL(r.location).searchParams.get('code');
}
test('MCP requires verified bearer tokens and rejects identity headers, query ids and expired tokens',async()=>{
 for(const req of [{headers:{}},{headers:{'x-user-id':'alice'}},{headers:{'x-api-key':'alice@example.invalid'}},{headers:{authorization:'Bearer alice'}},{headers:{},query:{user_id:'alice'}}])
  assert.equal(await resolveMcpUser(req,{}),null);
 const token=generateAccessToken({sub:'alice'});assert.equal((await resolveMcpUser({headers:{authorization:'Bearer '+token}})).id,'alice');
 assert.equal(verifyAccessToken(generateAccessToken({sub:'alice'},-1)),null);
 const previous=process.env.ZEROLENS_MCP_SECRET;delete process.env.ZEROLENS_MCP_SECRET;
 try{assert.equal(verifyAccessToken(token),null);assert.throws(()=>generateAccessToken({sub:'alice'}));}
 finally{process.env.ZEROLENS_MCP_SECRET=previous;}
});
test('OAuth validates redirects, client and S256; escapes form data; rejects missing CSRF',async()=>{
 for(const patch of [{redirect_uri:'https://attacker.invalid/cb'},{redirect_uri:'javascript:alert(1)'},{code_challenge_method:'plain'},{client_id:'unknown'}]){
  const r=response();await handleAuthorizeGet({query:{...params(),...patch}},r);assert.equal(r.code,400);
 }
 const r=response();await handleAuthorizeGet({query:{...params(),state:'"><script>alert(1)</script>'}},r);
 assert.equal(r.code,200);assert.ok(!r.body.includes('<script>'));assert.ok(r.body.includes('&lt;script&gt;'));
 const post=response();await handleAuthorizePost({headers:{},body:{...params(),email:'alice@example.invalid',password:'fixture-valid-password'}},post,authDeps);
 assert.equal(post.code,403);
});
test('OAuth has no reviewer password bypass',async()=>{
 const f=await form(),r=response();
 await handleAuthorizePost({headers:{cookie:f.cookie},body:{...f.params,csrf:f.csrf,email:'reviewer@example.invalid',password:'not-a-valid-password'}},r,authDeps);
 assert.equal(r.code,401);assert.equal(r.location,undefined);
});
test('OAuth grants bind client, redirect and verifier; codes and refresh tokens cannot replay',async()=>{
 const code=await codeGrant(),base={...params(),grant_type:'authorization_code',code,code_verifier:verifier};
 for(const patch of [{redirect_uri:'https://attacker.invalid/cb'},{code_verifier:'b'.repeat(43)},{client_id:'other'}]){
  const r=response();await handleTokenPost({body:{...base,...patch}},r);assert.ok([400,401].includes(r.code));
 }
 const good=response();await handleTokenPost({body:base},good);assert.equal(good.code,200);assert.equal(verifyAccessToken(good.body.access_token).sub,'alice');
 const replay=response();await handleTokenPost({body:base},replay);assert.equal(replay.code,400);
 const refresh={grant_type:'refresh_token',client_id:base.client_id,refresh_token:good.body.refresh_token};
 const renewed=response();await handleTokenPost({body:refresh},renewed);assert.equal(renewed.code,200);assert.notEqual(renewed.body.refresh_token,refresh.refresh_token);
 const again=response();await handleTokenPost({body:refresh},again);assert.equal(again.code,400);
 const dcr=response();await handleClientRegistration({body:{redirect_uris:['https://attacker.invalid/cb']}},dcr);assert.equal(dcr.code,400);
});
test('Widget escapes untrusted markup and rejects active URL schemes',()=>{
 const html=renderWidgetHtml({status:'completed',resultUrl:'javascript:alert(1)',prompt:'<script>alert(1)</script>',error:'"><img src=x onerror=alert(1)>'});
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('src=x'));assert.ok(!html.includes('javascript:'));
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('Content-Security-Policy'));
});
test('Job results remain private to the verified owner',async()=>{
 const job={userId:'bob',state:'completed',url:'https://example.invalid/private.mp4',prompt:'private prompt'};
 const result=await executeCheckGeneration({generation_id:'bob-job'},{id:'alice'},{getJobStatus:async()=>job});
 assert.equal(result.result_url,null);assert.ok(!JSON.stringify(result).includes('private prompt'));
 await assert.rejects(()=>executeCheckGeneration({generation_id:'bob-job'},null,{}),/Unauthorized/);
});
test('Local asset search and fetch enforce ownership',async()=>{
 const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'mcp-owner-'));
 try{
  const file=path.join(dir,'assets.json');await fsp.writeFile(file,JSON.stringify([
   {id:'private',user_id:'bob',prompt:'unique-fixture-search',url:'https://example.invalid/private.png'},
   {id:'own',user_id:'alice',prompt:'unique-fixture-search',url:'https://example.invalid/own.png'}]));
  const deps={LOCAL_ASSETS_FILE:file},user={id:'alice'};
  const result=await executeSearch({query:'unique-fixture-search'},user,deps);
  assert.deepEqual(result.results.map(r=>r.id),['asset_own']);
  await assert.rejects(()=>executeFetch({id:'asset_private'},user,deps),/not found/);
  assert.equal((await executeFetch({id:'asset_own'},user,deps)).id,'asset_own');
 }finally{await fsp.rm(dir,{recursive:true,force:true});}
});
async function withApp(run){
 const user={id:'alice',email:'alice@example.invalid',email_confirmed_at:'2026-01-01'};
 const client={auth:{getUser:async token=>({data:{user:token==='fixture-session'?user:null},error:token!=='fixture-session'})}};
 const deps={requireAuth:req=>requireAppUser(req,client),supabaseAdmin:client};
 const app=express();app.use(express.json());app.use('/motion',createMotionRouter(deps));app.use('/ads',createAdsRouter(deps));
 app.use('/mcp',createMcpRouter(deps));app.use('/api',createCreditsRouter(deps));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 try{await run('http://127.0.0.1:'+server.address().port);}
 finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
test('Paid studio endpoints reject anonymous requests before doing work; motion rejects traversal',async()=>withApp(async base=>{
 for(const route of ['/motion/choreograph','/ads/generate','/ads/upload-asset','/mcp/','/mcp/enhance-prompt','/mcp/action/get_usage']){
  const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(r.status,401,route);
 }
 const headers={'content-type':'application/json',authorization:'Bearer fixture-session'};
 assert.equal((await fetch(base+'/motion/choreograph',{method:'POST',headers,body:JSON.stringify({selectedSkill:'../../server'})})).status,400);
 assert.equal((await fetch(base+'/api/credits/refund',{method:'POST',headers,body:JSON.stringify({amount:999,reason:'video'})})).status,403);
}));
