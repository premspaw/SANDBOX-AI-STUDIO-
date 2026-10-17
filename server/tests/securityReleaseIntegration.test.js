// Offline release-contract checks: real local HTTP/multipart, fake session verifier,
// in-memory database/storage. Never uses provider credentials or customer records.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import express from 'express';
import createStorageRouter from '../routes/storageRoutes.js';
import createRemixRouter from '../routes/remixRoutes.js';
import { requireAppUser } from '../auth/requireAppUser.js';
import { createAuthenticatedFetch, isTrustedApiRequest } from '../../src/lib/authenticatedFetch.js';
import { validateProxyUrl } from '../utils/safeProxy.js';
const owner = { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.invalid' };
async function fixture(run, role = 'user') {
  const observed = { tokens: [], uploads: [], saved: [], mutations: [], requests: [] };
  const db = {
    auth: { getUser: async token => { observed.tokens.push(token); return token === 'fixture-valid-session' ? { data: { user: owner }, error: null } : { data: { user: null }, error: {} }; } },
    from(table) {
      const state = { table, filters: [], data: [] };
      const q = {
        select() { return q; }, eq(k,v) { state.filters.push([k,v]); return q; }, order() { return q; },
        single: async () => ({ data: { role }, error: null }),
        insert(data) { observed.mutations.push({ table, data }); state.data = data.map((x,i) => ({...x,id:x.id||`fixture-${i}`})); return q; },
        delete() { state.delete = true; observed.mutations.push(state); return q; },
        then(resolve, reject) { return Promise.resolve({ data: state.data, error: null }).then(resolve, reject); }
      };
      return q;
    }
  };
  const deps = {
    requireAuth: req => requireAppUser(req, db), supabaseAdmin: db, BUCKET_NAME: 'fixture-media',
    saveLocalAsset: value => observed.saved.push(value),
    storageService: { uploadToGCS: async (buffer,key,mime) => { observed.uploads.push({buffer,key,mime}); return `https://cdn.zerolens.in/${key}`; } },
    storage: { bucket(name) { assert.equal(name,'fixture-media'); return { file(key) { assert.ok(key.startsWith(`users/${owner.id}/`)); return { exists:async()=>[true],getMetadata:async()=>[{contentType:'image/png'}],createReadStream:()=>Readable.from([Buffer.from('fixture')]) }; } }; } }
  };
  const app = express(); app.use(express.json()); app.use((req,res,next)=>{observed.requests.push({url:req.url,authorization:req.headers.authorization,contentType:req.headers['content-type']});next();});
  app.use('/api',createStorageRouter(deps)); app.use('/api/remix',createRemixRouter(deps));
  const server = app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browserFetch = createAuthenticatedFetch({fetch,getSession:async()=>({data:{session:{access_token:'fixture-valid-session'}}}),origin});
  try { await run({observed,origin,browserFetch}); } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
const jsonPost = body => ({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

test('existing browser JSON upload/save shapes reach verified owner and storage', async()=>fixture(async({observed,origin,browserFetch})=>{
  const upload = await browserFetch(origin+'/api/upload-asset',jsonPost({image:'data:image/png;base64,YQ==',userId:owner.id,type:'image',filename:'fixture.png'}));
  assert.equal(upload.status,200); assert.equal(observed.uploads[0].key,`users/${owner.id}/generated/fixture.png`);
  const save = await browserFetch(origin+'/api/save-asset',jsonPost({imageData:'data:image/png;base64,YQ==',fileName:'save.png',type:'image',userId:owner.id}));
  assert.equal(save.status,200); assert.equal(observed.saved.at(-1).user_id,owner.id);
  assert.ok(observed.requests.every(r=>r.authorization==='Bearer fixture-valid-session'));
  assert.ok(observed.mutations.every(m=>m.data?.every(r=>r.user_id===owner.id)));
}));

test('private media read succeeds for verified owner and denies other paths/buckets',async()=>fixture(async({origin,browserFetch})=>{
  const path=`users/${owner.id}/generated/fixture.png`;
  const allowed=await browserFetch(origin+'/api/proxy/asset?path='+encodeURIComponent(path));
  assert.equal(allowed.status,200);assert.equal(await allowed.text(),'fixture');assert.equal(allowed.headers.get('cache-control'),'private, no-store');
  assert.equal((await browserFetch(origin+'/api/proxy/asset?path='+encodeURIComponent(path)+'&bucket=other')).status,403);
  assert.equal((await browserFetch(origin+'/api/proxy/asset?path=users/other/fixture.png')).status,403);
}));

test('admin browser multipart upload and JSON template create preserve body and authorization',async()=>fixture(async({observed,origin,browserFetch})=>{
  const body=new FormData();body.append('file',new Blob([Buffer.from('fixture-video')],{type:'video/mp4'}),'fixture.mp4');
  const upload=await browserFetch(origin+'/api/remix/templates/upload',{method:'POST',body});
  assert.equal(upload.status,200);assert.equal(observed.uploads[0].buffer.toString(),'fixture-video');assert.equal(observed.uploads[0].mime,'video/mp4');
  assert.match(observed.requests[0].contentType,/^multipart\/form-data; boundary=/);
  const saved=await browserFetch(origin+'/api/remix/templates',jsonPost({id:'tpl_fixture',title:'Fixture',video_url:(await upload.json()).url}));
  assert.equal(saved.status,200);assert.equal((await saved.json()).savedToDb,true);
  assert.equal(observed.saved.at(-1).type,'remix_template');
  assert.ok(observed.requests.every(r=>r.authorization==='Bearer fixture-valid-session'));
},'admin'));

test('ordinary signed-in users cannot mutate templates, while public listing stays public',async()=>fixture(async({observed,origin,browserFetch})=>{
  for(const endpoint of ['/templates','/templates/upload'])assert.equal((await browserFetch(origin+'/api/remix'+endpoint,jsonPost({title:'Fixture',video_url:'https://cdn.zerolens.in/fixture.mp4'}))).status,403);
  assert.equal((await browserFetch(origin+'/api/remix/templates/tpl_fixture',{method:'DELETE'})).status,403);
  assert.equal(observed.uploads.length,0);assert.equal(observed.mutations.length,0);
  assert.equal((await fetch(origin+'/api/remix/templates')).status,200);
}));

test('missing and invalid browser sessions fail closed even in development',async()=>fixture(async({observed,origin})=>{
  for (const endpoint of ['/api/save-asset','/api/upload-asset','/api/remix/templates','/api/remix/templates/upload']) {
    assert.equal((await fetch(origin+endpoint,jsonPost({}))).status,401);
    assert.equal((await fetch(origin+endpoint,{...jsonPost({}),headers:{'Content-Type':'application/json',Authorization:'Bearer fixture-invalid'}})).status,401);
  }
  assert.equal(observed.uploads.length,0);assert.equal(observed.mutations.length,0);
}));

test('configured app API origin is trusted, source storage/CDN domains remain allowed',async()=>{
  const api='https://api.example.invalid';assert.equal(isTrustedApiRequest(api+'/api/upload-asset','https://app.example.invalid',api),true);
  assert.equal(isTrustedApiRequest('https://external.example.invalid/api/upload-asset','https://app.example.invalid',api),false);
  const lookup=async()=>[{address:'8.8.8.8',family:4}];
  for(const url of ['https://cdn.zerolens.in/a.mp4','https://pub-05a4fe33e706492e8d437c36f9a8aa94.r2.dev/a.png','https://storage.googleapis.com/fixture/a.png','https://fixture.supabase.co/storage/v1/object/public/assets/a.png'])assert.equal((await validateProxyUrl(url,{lookup})).href,url);
});

test('template UI checks server save status before advertising local success',()=>{
  const source=fs.readFileSync(new URL('../../src/components/pages/TemplatesPage.jsx',import.meta.url),'utf8');
  assert.ok(source.indexOf('if (!saveRes.ok)')<source.indexOf("localStorage.setItem('custom_remix_templates'"));
  assert.match(source,/throw new Error\(saveError\.error/);
});
