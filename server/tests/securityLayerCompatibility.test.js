// All requests use loopback and inert providers/database records; no live calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import express from 'express';
import multer from 'multer';
import { createRequire } from 'node:module';
import createStorageRouter from '../routes/storageRoutes.js';
import createVoiceRouter from '../routes/yourVoiceRoutes.js';
import { createWelcomeEmailHandler } from '../services/welcomeEmailHandler.js';
import { createUtilityAuth, validateUtilityInput } from '../utils/utilityAuth.js';
import { requireAppUser } from '../auth/requireAppUser.js';
import { createAuthenticatedFetch } from '../../src/lib/authenticatedFetch.js';
const user={id:'fixture-owner',email:'fixture@example.invalid',email_confirmed_at:'2026-10-01',user_metadata:{name:'Fixture'}};
const verifier={auth:{getUser:async token=>({data:{user:token==='fixture-session'?user:null},error:token!=='fixture-session'})}};
const requireAuth=req=>requireAppUser(req,verifier);
async function withApp(app,run){const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const origin=`http://127.0.0.1:${server.address().port}`;const browserFetch=createAuthenticatedFetch({fetch,getSession:async()=>({data:{session:{access_token:'fixture-session'}}}),origin});try{await run({origin,browserFetch});}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
const json=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

test('release fixtures execute the installed patched Multer 2 parser',()=>{
  const [major,minor]=createRequire(import.meta.url)('multer/package.json').version.split('.').map(Number);
  assert.equal(major,2);assert.ok(minor>=5);
});

test('browser bearer JSON utility calls work while anonymous calls do not reach provider',async()=>{
  let work=0;const app=express();app.use(express.json());app.use('/api',createStorageRouter({requireAuth,geminiService:{synthesizeSpeech:async(text,voice)=>{work++;assert.equal(text,'Fixture text');assert.equal(voice,'Kore');return 'fixture-audio';}}}));
  await withApp(app,async({origin,browserFetch})=>{assert.equal((await fetch(origin+'/api/proxy/tts',json({text:'Fixture text',voiceId:'Kore'}))).status,401);assert.equal(work,0);const result=await browserFetch(origin+'/api/proxy/tts',json({text:'Fixture text',voiceId:'Kore'}));assert.equal(result.status,200);assert.equal((await result.json()).audioContent,'fixture-audio');assert.equal(work,1);});
});

test('existing YourVoice GET preview uses browser bearer and every UI voice is supported',async()=>{
  const original=global.voicePreviewCache;global.voicePreviewCache={Kore:'/assets/fixture.wav'};
  try{const app=express();app.use('/api',createVoiceRouter({requireAuth}));await withApp(app,async({origin,browserFetch})=>{const response=await browserFetch(origin+'/api/preview-voice?voiceName=Kore');assert.equal(response.status,200);assert.equal((await response.json()).url,'/assets/fixture.wav');assert.equal((await fetch(origin+'/api/preview-voice?voiceName=Kore')).status,401);});
  const ui=fs.readFileSync(new URL('../../src/components/pages/YourVoice.jsx',import.meta.url),'utf8');const voiceList=ui.slice(ui.indexOf('const VOICES ='),ui.indexOf('const MODELS ='));const route=fs.readFileSync(new URL('../routes/yourVoiceRoutes.js',import.meta.url),'utf8');for(const [,name]of voiceList.matchAll(/name: '([^']+)'/g))assert.ok(route.includes(`'${name}'`),name);
  }finally{global.voicePreviewCache=original;}
});

test('existing welcome JSON payload sends only verified owner profile values',async()=>{
  const sent=[];const db={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{shorts_balance:17},error:null})})})})};const app=express();app.use(express.json());app.post('/api/auth/welcome',createWelcomeEmailHandler({requireAuth,db,sendWelcomeEmail:async value=>{sent.push(value);return {success:true};}}));
  await withApp(app,async({origin,browserFetch})=>{const result=await browserFetch(origin+'/api/auth/welcome',json({email:user.email,name:'client-name',shortsBalance:60}));assert.equal(result.status,200);assert.deepEqual(sent,[{email:user.email,name:'Fixture',shortsBalance:17}]);});
});

test('real multipart voice parsing retains verified identity after body fields are parsed',async()=>{
  // Run the actual route factory with inert import bindings, never SDK clients.
  const source=fs.readFileSync(new URL('../routes/ugcRoutes.js',import.meta.url),'utf8');
  const noop=(_req,_res,next)=>next?.();
  const context={express,createUtilityAuth,console:{log(){},warn(){},error(){}},wardrobeUploadMiddleware:noop,analyzeWardrobeRoute:noop,locationUploadMiddleware:noop,analyzeLocationRoute:noop};
  vm.runInNewContext(source.slice(source.indexOf('export default function createRouter')).replace('export default function createRouter','globalThis.createRouter = function createRouter'),context);
  const owners=[];let generated=0;const router=context.createRouter({requireAuth,upload:multer({storage:multer.memoryStorage(),limits:{fileSize:1024}}),resolveGoogleApiKey:async(_req,id)=>{owners.push(id);return 'fixture';},getGeminiClient:()=>({models:{generateContent:async()=>{generated++;return {candidates:[{content:{parts:[{text:'Fixture transcript'}]}}]};}}})});
  const app=express();app.use(express.json());app.use('/api/ugc',router);
  await withApp(app,async({origin,browserFetch})=>{const body=new FormData();body.append('userId','different-fixture-id');body.append('audio',new Blob(['inert audio fixture'],{type:'audio/wav'}),'fixture.wav');const response=await browserFetch(origin+'/api/ugc/analyze-voice',{method:'POST',body});assert.equal(response.status,200);assert.deepEqual(owners,[user.id]);assert.equal(generated,2);});
});

test('current structured UGC requests and carousel batches remain valid utility input',()=>{
  for(const body of [{parts:[{inlineData:{mimeType:'image/png',data:'YWJj'}},{text:'Analyze this fixture'}],generationConfig:{responseMimeType:'application/json',responseSchema:{type:'OBJECT',properties:{name:{type:'STRING'}}}}},{prompts:Array.from({length:6},(_,i)=>({slideId:`slide-${i}`,prompt:'Draw a fixture'})),model:'gpt-image-2'},{text:'Fixture transcript',voice:'Kore',multiSpeaker:false},{history:[{role:'user',content:'Fixture topic'}],systemPrompt:'Fixture instructions'}])assert.doesNotThrow(()=>validateUtilityInput(body));
});
