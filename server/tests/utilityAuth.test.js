import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createUtilityAuth } from '../utils/utilityAuth.js';
const response=()=>({statusCode:200,status(c){this.statusCode=c;return this;},json(body){this.body=body;return this;}});
test('utility guard stops anonymous work and distinguishes auth outage',async()=>{for(const status of [401,503]){let called=false;const guard=createUtilityAuth(async()=>{throw Object.assign(new Error('private detail'),{status});});const res=response();await guard({body:{}},res,()=>{called=true;});assert.equal(called,false);assert.equal(res.statusCode,status);assert(!res.body.error.includes('private detail'));}});
test('utility guard binds all user identity fields to verified account',async()=>{const req={body:{userId:'victim',user_id:'victim',prompt:'keep'}};let called=false;await createUtilityAuth(async()=>({id:'owner'}))(req,response(),()=>{called=true;});assert.equal(called,true);assert.deepEqual(req.body,{userId:'owner',user_id:'owner',prompt:'keep'});});
test('utility guards are per-route and precede multipart parsing',()=>{
  const ugc=fs.readFileSync(new URL('../routes/ugcRoutes.js',import.meta.url),'utf8');
  assert.match(ugc,/router\.post\('\/analyze-voice', utilityAuth, upload\.single/);
  assert.match(ugc,/router\.post\('\/wardrobe\/analyze', utilityAuth, wardrobeUploadMiddleware/);
  assert.match(ugc,/router\.post\('\/preview-scene', utilityAuth,/);
  const forge=fs.readFileSync(new URL('../routes/forgeRoutes.js',import.meta.url),'utf8');
  const posts=[...forge.matchAll(/router\.post\('[^']+', ([^\n]+)/g)];assert(posts.length>=10);assert(posts.every(m=>m[1].startsWith('utilityAuth,')));
  for(const name of ['forgeRoutes','carouselRoutes','imageRoutes','storageRoutes','ugcRoutes','adminRoutes','videoRoutes','avatar']) {
    const source=fs.readFileSync(new URL(`../routes/${name}.js`,import.meta.url),'utf8');assert(!source.includes('router.use(utilityAuth'));assert(source.includes('createUtilityAuth(deps.requireAuth)'));
  }
});
test('utility input bounds reject amplified or malformed work before provider calls',async()=>{
  const bad=[{prompts:Array(21).fill({prompt:'x'})},{prompts:[{prompt:{}}]},{history:Array(101).fill({})},{images:[null]},{parts:[null]},{text:'a'.repeat(100001)},{generationConfig:{candidateCount:2}},{generationConfig:{maxOutputTokens:1e9}},{generationConfig:{maxOutputTokens:-1}},[]];
  for(const body of bad){let called=false;const res=response();await createUtilityAuth(async()=>({id:'owner'}))({body},res,()=>{called=true;});assert.equal(called,false);assert.equal(res.statusCode,400);}
});
test('utility bounds retain ordinary image batches, long context, and structured output',async()=>{
  const body={prompts:Array(6).fill({prompt:'draw a landscape'}),bibleContext:'a'.repeat(200000),parts:[{text:'describe this'},{inlineData:{mimeType:'image/png',data:'YWJj'}}],generationConfig:{maxOutputTokens:8192,responseSchema:{type:'object'}}};
  let called=false;await createUtilityAuth(async()=>({id:'owner'}))({body},response(),()=>{called=true;});assert.equal(called,true);
});
