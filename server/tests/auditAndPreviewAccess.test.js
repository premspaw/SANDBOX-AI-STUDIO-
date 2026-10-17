import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import createAdminRouter from '../routes/adminRoutes.js';
import createVoiceRouter from '../routes/yourVoiceRoutes.js';
const response=()=>({statusCode:200,status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}});
const route=(router,path,method)=>router.stack.find(layer=>layer.route?.path===path&&layer.route.methods[method]).route.stack.map(layer=>layer.handle);
const client=role=>({from(){return {select(){return {eq(){return {single:async()=>({data:{role}})};}};}};}});
const denied=async()=>{throw Object.assign(new Error('private auth detail'),{status:401});};
for(const [path,method] of [['/admin/sync-audit-logs','get'],['/admin/clear-sync-audit-logs','post']]) {
 test(`${path} denies anonymous and non-admin before disk access`,async t=>{
  let touched=0;t.mock.method(fs,'existsSync',()=>{touched++;return false;});
  for(const deps of [{requireAuth:denied},{requireAuth:async()=>({id:'member'}),supabase:client('user')}]){
   const res=response();await route(createAdminRouter(deps),path,method)[0]({},res);assert([401,403].includes(res.statusCode));assert.equal(touched,0);assert(!JSON.stringify(res.body).includes('private auth detail'));
  }
 });
}
test('verified admin can read and clear mocked audit data',async t=>{
 const privateFixture=[{userId:'fixture-user',prompt:'fixture-prompt'}];let writes=0;
 t.mock.method(fs,'existsSync',()=>true);t.mock.method(fs,'readFileSync',()=>JSON.stringify(privateFixture));t.mock.method(fs,'writeFileSync',(_path,value)=>{assert.equal(value,'[]');writes++;});
 const router=createAdminRouter({requireAuth:async()=>({id:'admin'}),supabase:client('admin')});
 const read=response();await route(router,'/admin/sync-audit-logs','get')[0]({},read);assert.deepEqual(read.body.logs,privateFixture);
 const clear=response();await route(router,'/admin/clear-sync-audit-logs','post')[0]({},clear);assert.equal(clear.statusCode,200);assert.equal(writes,1);
});
test('preview rejects anonymous calls before cached data or provider access',async()=>{
 const res=response();let next=false;const handlers=route(createVoiceRouter({requireAuth:denied}),'/preview-voice','get');await handlers[0]({query:{voiceName:'Kore'}},res,()=>{next=true;});assert.equal(next,false);assert.equal(res.statusCode,401);
});
test('preview rejects unknown/path voice names and preserves ordinary cached UI voice',async()=>{
 const handlers=route(createVoiceRouter({requireAuth:async()=>({id:'owner'})}),'/preview-voice','get');
 for(const voiceName of ['../../victim','__proto__','unlimited-new-voice']){const res=response();await handlers[1]({query:{voiceName},utilityUser:{id:'owner'}},res);assert.equal(res.statusCode,400);}
 const original=global.voicePreviewCache;try{global.voicePreviewCache={Kore:'/assets/fixture.wav'};const res=response();await handlers[1]({query:{voiceName:'Kore'},utilityUser:{id:'owner'}},res);assert.equal(res.statusCode,200);assert.equal(res.body.url,'/assets/fixture.wav');}finally{global.voicePreviewCache=original;}
});
