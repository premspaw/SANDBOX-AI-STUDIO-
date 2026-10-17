import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import express from 'express';
import createVideoRouter from '../routes/videoRoutes.js';
import { getVerifiedVideoIdentity } from '../auth/videoIdentity.js';
const owner = {id:'11111111-1111-4111-8111-111111111111',email:'admin-name@example.invalid',role:'admin'};
const spoofed = {headers:{'x-admin-password':'untrusted-value','x-is-admin':'true'},body:{isAdmin:true,userId:'other'}};
function database(role,error=null) {return {from(table){assert.equal(table,'profiles');return {select(columns){assert.equal(columns,'role');return {eq(field,id){assert.equal(field,'id');assert.equal(id,owner.id);return {single:async()=>({data:{role},error})};}};}};}};}
test('client admin flags, email and user role do not grant admin',async()=>{
 const value=await getVerifiedVideoIdentity(spoofed,async()=>owner,database('user'));
 assert.equal(value.isAdmin,false);assert.equal(value.user.id,owner.id);
});
test('stored admin role with verified identity keeps admin routing',async()=>{
 assert.equal((await getVerifiedVideoIdentity(spoofed,async()=>owner,database('admin'))).isAdmin,true);
});
test('missing database never grants admin',async()=>{
 assert.equal((await getVerifiedVideoIdentity(spoofed,async()=>owner,null)).isAdmin,false);
});
test('role lookup errors never grant admin',async()=>{
 assert.equal((await getVerifiedVideoIdentity(spoofed,async()=>owner,database('admin',{message:'fixture'}))).isAdmin,false);
});
test('thrown role lookup error never grants admin',async()=>{
 assert.equal((await getVerifiedVideoIdentity(spoofed,async()=>owner,{from(){throw Error('fixture');}})).isAdmin,false);
});
test('missing verified identity fails closed',async()=>{
 await assert.rejects(getVerifiedVideoIdentity(spoofed,async()=>null,database('admin')),e=>e.status===401);
});
test('authentication errors propagate without role query',async()=>{
 await assert.rejects(getVerifiedVideoIdentity(spoofed,async()=>{throw Object.assign(Error('down'),{status:503});},{from(){assert.fail('must not query');}}),e=>e.status===503);
});
test('Veo aliases reject missing session before any provider or spend in development',async()=>{
 const saved=process.env.NODE_ENV;process.env.NODE_ENV='development';
 const app=express();app.use(express.json());let paid=0;
 app.use(createVideoRouter({requireAuth:async()=>{throw Error('invalid');},resolveGoogleApiKey:async()=>{paid++;return null;},broadcastProgress(){}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try {for(const route of ['/veo-i2v','/veo/generate-video','/generate-video','/veo/generate','/generate']){
  const response=await fetch(`http://127.0.0.1:${server.address().port}${route}`,{method:'POST',headers:{'content-type':'application/json',...spoofed.headers},body:JSON.stringify({...spoofed.body,prompt:'fixture'})});
  assert.equal(response.status,401);
 }assert.equal(paid,0);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));if(saved===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=saved;}
});
test('Veo source uses verified owner and has no client admin bypass',()=>{
 const source=fs.readFileSync(new URL('../routes/videoRoutes.js',import.meta.url),'utf8');
 const handler=source.slice(source.indexOf('const handleVeoGenerate'),source.indexOf("router.post('/veo-i2v'"));
 assert.ok(handler.includes('req.body.userId = targetUserId'));
 assert.ok(!/x-admin-password|x-is-admin|body\?\.isAdmin|email\.includes|email\.startsWith/.test(handler));
});
