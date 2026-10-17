import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import express from 'express';
import createStorageRouter from '../routes/storageRoutes.js';
import createRemixRouter from '../routes/remixRoutes.js';
import { createGoogleProviderFetch, isGoogleKeyDestination } from '../utils/providerFetch.js';
import { createExportTempDirectory, validateExportInput } from '../utils/exportTemp.js';
import { fetchAllowedProxyResponse, fetchAllowedProxyResource, isPrivateIp, validateProxyUrl, createProxyByteLimit } from '../utils/safeProxy.js';
import { storageSegment, assertSafeMediaContentType } from '../utils/storageInput.js';

const publicLookup = async () => [{ address: '8.8.8.8', family: 4 }];
const unauthorized = async () => { throw Object.assign(new Error('Authentication required'), { status: 401 }); };
const owner = { id: '11111111-1111-4111-8111-111111111111' };
async function withApp(router, fn) {
  const app = express(); app.use(express.json()); app.use('/api', router);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  try { await fn(`http://127.0.0.1:${server.address().port}/api`); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const post = (url, data) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

test('provider keys are limited to approved HTTPS API origins', async () => {
  const calls=[]; const wrapped=createGoogleProviderFetch(async (url,opts)=>{calls.push({url,opts});return {};}, {apiKey:'INERT_DUMMY',appOrigin:'https://app.invalid'});
  for (const url of ['https://attacker.invalid/?googleapis.com', 'https://googleapis.com.attacker.invalid/a', 'https://storage.googleapis.com/user-bucket/googleapis.com', 'http://generativelanguage.googleapis.com/v1', 'https://user:pass@generativelanguage.googleapis.com/v1', 'https://generativelanguage.googleapis.com:8443/v1']) {
    assert.equal(isGoogleKeyDestination(url),false); await wrapped(url,{}); assert.equal(calls.at(-1).opts.headers,undefined);
  }
  await wrapped('https://generativelanguage.googleapis.com/v1',{});
  assert.equal(calls.at(-1).opts.headers.get('X-Goog-Api-Key'),'INERT_DUMMY');
  assert.equal(calls.at(-1).opts.redirect,'error');
  await wrapped('https://us-central1-aiplatform.googleapis.com/v1',{headers:{Authorization:'Bearer DUMMY'}});
  assert.equal(calls.at(-1).opts.headers.has('X-Goog-Api-Key'),false);
});

test('export directory is random and cleanup preserves its parent and siblings', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zerolens-export-test-'));
  try { fs.writeFileSync(path.join(root,'sentinel'),'safe'); const t=createExportTempDirectory(root); fs.writeFileSync(path.join(t.directory,'temp'),'ok'); t.cleanup(); assert.equal(fs.existsSync(t.directory),false); assert.equal(fs.readFileSync(path.join(root,'sentinel'),'utf8'),'safe'); }
  finally { fs.rmSync(root,{recursive:true,force:true}); }
});
test('export rejects traversal node IDs and local file input', () => {
  const input={script:{hook:'test'},sceneVideos:['https://cdn.zerolens.in/video.mp4']};
  for (const nodeId of ['x/../../../victim','..','x\\..\\..','',{},'a'.repeat(129)]) assert.throws(()=>validateExportInput({...input,nodeId}),{status:400});
  assert.throws(()=>validateExportInput({...input,bgMusicPath:'/etc/passwd'}),{status:400});
  assert.doesNotThrow(()=>validateExportInput({...input,nodeId:'node-123'}));
});
test('actual compiler cleanup remains contained even with malicious direct task ID and TTS failure', async () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zerolens-compiler-test-')); const services=path.join(root,'services'); fs.mkdirSync(services); const sentinel=path.join(root,'sentinel'); fs.writeFileSync(sentinel,'safe');
  const code=fs.readFileSync(new URL('../../services/masterExportService.js',import.meta.url),'utf8');
  const context={fs,path,__dirname:services,createExportTempDirectory,validateExportInput,audioService:{synthesizeSpeech:async()=>({success:false,error:'synthetic failure'})},console:{log(){},error(){}}};
  vm.runInNewContext(code.slice(code.indexOf('export const compileUGCAd')).replace('export const compileUGCAd','globalThis.compileUGCAd'),context);
  try { await assert.rejects(context.compileUGCAd('ugc-export-x/../../../sentinel',{hook:'test'},['https://example.invalid/a'],null)); assert.equal(fs.readFileSync(sentinel,'utf8'),'safe'); assert.deepEqual(fs.readdirSync(path.join(services,'temp')),[]); }
  finally { fs.rmSync(root,{recursive:true,force:true}); }
});

test('network guard rejects local, mapped IPv6, reserved and failed DNS', async () => {
  for (const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','100.64.0.1','0.1.2.3','::1','::ffff:127.0.0.1','fc00::1','2001:db8::1']) assert.equal(isPrivateIp(ip),true,ip);
  assert.equal(isPrivateIp('8.8.8.8'),false); assert.equal(isPrivateIp('2001:4860:4860::8888'),false);
  await assert.rejects(validateProxyUrl('https://storage.googleapis.com/a',{lookup:async()=>{throw new Error('DNS unavailable');}}),{status:502});
});
test('proxy checks every redirect and pins the validated DNS address', async () => {
  let called=0; let lookupCalls=0; const options={lookup:async()=>{lookupCalls++;return publicLookup();},fetchImpl:async (_url,opts)=>{
    called++; const resolved=await new Promise((resolve,reject)=>opts.agent.options.lookup('storage.googleapis.com',{},(err,address,family)=>err?reject(err):resolve({address,family})));
    assert.deepEqual(resolved,{address:'8.8.8.8',family:4}); return new Response(null,{status:302,headers:{Location:'http://127.0.0.1/private'}});
  }};
  await assert.rejects(fetchAllowedProxyResponse('https://storage.googleapis.com/redirect',options),{status:403}); assert.equal(called,1); assert.equal(lookupCalls,1);
});
test('proxy bounds chunked bodies before concatenation', async () => {
  let produced=0;
  await assert.rejects(fetchAllowedProxyResource('https://cdn.zerolens.in/large',{maxBytes:3,lookup:publicLookup,fetchImpl:async()=>({ok:true,status:200,headers:new Headers(),body:(async function*(){produced++;yield Buffer.from('ab');produced++;yield Buffer.from('cd');produced++;yield Buffer.from('ef');})()})}),{status:413});
  assert.equal(produced,2);
});

test('anonymous storage writes and privileged object reads are rejected before I/O', async () => {
  let io=0; const router=createStorageRouter({requireAuth:unauthorized,storageService:{uploadToGCS(){io++;}},storage:{bucket(){io++;}}});
  await withApp(router,async base=>{
    for (const route of ['/save-asset','/upload-asset']) assert.equal((await post(base+route,{data:'YQ=='})).status,401);
    assert.equal((await fetch(base+'/proxy/asset?bucket=private&path=secret')).status,401); assert.equal(io,0);
  });
});
test('upload binds owner and rejects traversal filename/folder', async () => {
  const paths=[]; const router=createStorageRouter({requireAuth:async()=>owner,BUCKET_NAME:'media',saveLocalAsset(){},storageService:{uploadToGCS:async(_b,p)=>{paths.push(p);return 'https://cdn.zerolens.in/test.png';}}});
  await withApp(router,async base=>{
    const data={data:'data:image/png;base64,YQ==',filename:'ref.png'};
    assert.equal((await post(base+'/upload-asset',{...data,userId:'victim'})).status,403);
    assert.equal((await post(base+'/upload-asset',{...data,filename:'../victim.png'})).status,400);
    assert.equal((await post(base+'/upload-asset',{...data,folder:'../../other'})).status,400);
    assert.equal((await post(base+'/upload-asset',{...data,userId:'anon'})).status,200);
    assert.deepEqual(paths,[`users/${owner.id}/generated/ref.png`]);
  });
});
test('private proxy rejects other buckets and another user path', async () => {
  let io=0;const router=createStorageRouter({requireAuth:async()=>owner,BUCKET_NAME:'media',storage:{bucket(){io++;}}});
  await withApp(router,async base=>{for(const query of ['bucket=private&path=secret','path=users/victim/generated/a.png',`path=users/${owner.id}/../secret`]) assert.equal((await fetch(base+'/proxy/asset?'+query)).status,403);assert.equal(io,0);});
});
test('active content cannot be served by media proxy or uploaded with active extension', () => {
  for(const type of ['text/html','image/svg+xml','application/javascript']) assert.throws(()=>assertSafeMediaContentType(type),{status:400});
  assert.throws(()=>storageSegment('page.html','filename',{filename:true}),{status:400});
  assert.doesNotThrow(()=>assertSafeMediaContentType('video/mp4'));
});

test('template writes require admin while read route stays public', async () => {
  let dbCalls=0; const router=createRemixRouter({requireAuth:unauthorized,supabaseAdmin:{from(){dbCalls++;throw new Error('unexpected');}}});
  await withApp(router,async base=>{
    assert.equal((await post(base+'/templates',{})).status,401);
    assert.equal((await post(base+'/templates/upload',{})).status,401);
    assert.equal((await fetch(base+'/templates/victim',{method:'DELETE'})).status,401);
    assert.equal(dbCalls,0);
  });
  assert.equal(router.stack.find(x=>x.route?.path==='/templates'&&x.route.methods.get).route.stack.length,1);
});
test('non-admin cannot mutate templates and admin delete filters assets type', async () => {
  let role='user';const mutations=[];const client={from(table){if(table==='profiles') return {select(){return {eq(){return {single:async()=>({data:{role}})};}};}};return {delete(){const filters=[];mutations.push({table,filters});return {eq(k,v){filters.push([k,v]);return this;},then(resolve){resolve({});}};}};}};
  const router=createRemixRouter({requireAuth:async()=>owner,supabaseAdmin:client});
  await withApp(router,async base=>{
    assert.equal((await fetch(base+'/templates/victim',{method:'DELETE'})).status,403); assert.equal(mutations.length,0);role='admin';
    assert.equal((await fetch(base+'/templates/victim',{method:'DELETE'})).status,200);
    assert.deepEqual(mutations.find(x=>x.table==='assets').filters,[['id','victim'],['type','remix_template']]);
  });
});

test('streaming proxy counts actual chunks without trusting Content-Length', async () => {
  let received = 0;
  await assert.rejects(pipeline(Readable.from([Buffer.from('ab'),Buffer.from('cd'),Buffer.from('ef')]), createProxyByteLimit(3), new Writable({write(chunk, _encoding, callback){received += chunk.length;callback();}})), {status:413});
  assert.equal(received, 2);
});
test('save-asset accepts trusted local fallback URLs but rejects local path traversal', async () => {
  const saved=[];const router=createStorageRouter({requireAuth:async()=>owner,saveLocalAsset:x=>saved.push(x)});
  await withApp(router,async base=>{
    assert.equal((await post(base+'/save-asset',{url:'/assets/abc123.png',fileName:'ref.png',type:'image'})).status,200);
    assert.equal(saved[0].url,'/assets/abc123.png');
    assert.equal((await post(base+'/save-asset',{url:'/assets/../private.png'})).status,400);
    assert.equal((await post(base+'/save-asset',{url:'/assets/%2e%2e%2fprivate.png'})).status,400);
  });
});


test('save-asset records provider completion references without DNS or download allowlist restrictions', async () => {
  const saved=[]; const router=createStorageRouter({requireAuth:async()=>owner,saveLocalAsset:x=>saved.push(x)});
  await withApp(router,async base=>{
    const url='https://provider-cdn.example.invalid/completed/remix.mp4';
    const response=await post(base+'/save-asset',{url,type:'video',userId:owner.id});
    assert.equal(response.status,200);assert.equal(saved[0].url,url);assert.equal(saved[0].user_id,owner.id);
    for(const badUrl of ['https://user:secret@provider-cdn.example.invalid/a.mp4','https://[invalid/a.mp4','javascript:alert(1)','file:///private/a.mp4']) {
      assert.equal((await post(base+'/save-asset',{url:badUrl,type:'video'})).status,400);
    }
    assert.equal(saved.length,1);
  });
});
