import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {once} from 'node:events';
import {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {getOperationUser} from '../billing/ledger.js';

const CHUNK=1024*1024;
const root=path.resolve(process.env.PRIVATE_MEDIA_DIR||'server/data/private-media');
const idPattern=/^[a-f0-9]{32}$/;
const keyHash=s=>crypto.createHash('sha256').update(s).digest();
const fault=(message,status)=>Object.assign(new Error(message),{status});
let key;
function secret(){
 if(key)return key;
 const configured=process.env.PRIVATE_MEDIA_SECRET;
 if(configured){if(Buffer.byteLength(configured)<32)throw fault('PRIVATE_MEDIA_SECRET must be at least 32 bytes',503);key=keyHash(configured);return key;}
 fs.mkdirSync(root,{recursive:true,mode:0o700});const filename=path.join(root,'encryption.key');
 try{fs.writeFileSync(filename,crypto.randomBytes(32),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
 key=fs.readFileSync(filename);if(key.length!==32)throw fault('Invalid private media key',503);return key;
}
const metaFile=id=>{if(!idPattern.test(id))throw fault('Invalid media ID',400);return path.join(root,id+'.json');};
const dataFile=id=>path.join(root,id+'.bin');
const owner=()=>{const id=getOperationUser()?.id;if(!id)throw fault('Authenticated media owner required',401);return id;};
const bucket=process.env.PRIVATE_R2_BUCKET_NAME;
const r2=bucket&&process.env.R2_ACCOUNT_ID&&process.env.R2_ACCESS_KEY_ID&&process.env.R2_SECRET_ACCESS_KEY?new S3Client({region:'auto',endpoint:process.env.R2_ENDPOINT||`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY}}):null;
const iv=(nonce,index)=>{const b=Buffer.alloc(12);Buffer.from(nonce,'hex').copy(b);b.writeUInt32BE(index,8);return b;};
function encrypt(buffer,nonce){const out=[];for(let off=0,index=0;off<buffer.length;off+=CHUNK,index++){
 const cipher=crypto.createCipheriv('aes-256-gcm',secret(),iv(nonce,index));out.push(cipher.update(buffer.subarray(off,off+CHUNK)),cipher.final(),cipher.getAuthTag());
}return Buffer.concat(out);}
function decrypt(buffer,meta,index){const cipher=crypto.createDecipheriv('aes-256-gcm',secret(),iv(meta.nonce,index));cipher.setAuthTag(buffer.subarray(-16));return Buffer.concat([cipher.update(buffer.subarray(0,-16)),cipher.final()]);}
export async function readMediaMetadata(id){try{return JSON.parse(await fsp.readFile(metaFile(id),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
export async function listPrivateMedia(userId=owner()){
 let names=[];try{names=await fsp.readdir(root);}catch(e){if(e.code!=='ENOENT')throw e;}
 const out=[];for(const n of names)if(/^[a-f0-9]{32}\.json$/.test(n)){const m=await readMediaMetadata(n.slice(0,-5));if(m&&(!userId||m.ownerId===userId))out.push(m);}return out;
}
let uploadQueue=Promise.resolve();
let pending=0;
export async function savePrivateMedia(data,name,contentType='image/png'){
 const ownerId=owner();
 if(!Buffer.isBuffer(data)||!data.length)throw fault('Media bytes are required',400);
 if(!/^(image\/(png|jpeg|webp|gif|avif)|video\/(mp4|webm|quicktime)|audio\/(wav|x-wav|mpeg|mp4|ogg|webm)|application\/octet-stream)$/.test(contentType.split(';')[0]))throw fault('Unsupported media type',415);
 if(data.length>250*1024*1024)throw fault('Media exceeds 250 MB',413);
 if(pending>=4)throw fault('Media storage is busy; retry shortly',429);
 pending++;
 const run=async()=>{
  await fsp.mkdir(root,{recursive:true,mode:0o700});
  const all=await listPrivateMedia(null),mine=all.filter(m=>m.ownerId===ownerId);
  const ownLimit=Number(process.env.PRIVATE_MEDIA_OWNER_BYTES)||2*1024**3;
  const globalLimit=Number(process.env.PRIVATE_MEDIA_TOTAL_BYTES)||20*1024**3;
  if(mine.length>=1000||all.length>=10000||mine.reduce((n,m)=>n+m.size,0)+data.length>ownLimit||all.reduce((n,m)=>n+m.size,0)+data.length>globalLimit)throw fault('Media storage quota reached. Delete unused assets.',507);
  const disk=await fsp.statfs(root);if(disk.bavail*disk.bsize<2*1024**3+data.length*2)throw fault('Media storage is nearly full',507);
  const id=crypto.randomBytes(16).toString('hex'),nonce=crypto.randomBytes(8).toString('hex');
  const encrypted=encrypt(data,nonce),objectKey='encrypted/'+id;
  const meta={id,ownerId,name:String(name).slice(0,512),contentType:contentType.split(';')[0],size:data.length,nonce,backend:r2?'r2':'local',objectKey,createdAt:new Date().toISOString()};
  if(r2)await r2.send(new PutObjectCommand({Bucket:bucket,Key:objectKey,Body:encrypted,ContentType:'application/octet-stream',CacheControl:'private, no-store'}));
  else await fsp.writeFile(dataFile(id),encrypted,{flag:'wx',mode:0o600});
  try{await fsp.writeFile(metaFile(id),JSON.stringify(meta),{flag:'wx',mode:0o600});}
  catch(e){if(r2)await r2.send(new DeleteObjectCommand({Bucket:bucket,Key:objectKey})).catch(()=>{});else await fsp.rm(dataFile(id),{force:true});throw e;}
  return privateMediaUrl(meta);
 };
 const next=uploadQueue.then(run,run);uploadQueue=next.catch(()=>{});return next.finally(()=>pending--);
}
export function privateMediaUrl(meta){
 const expires=Math.floor(Date.now()/1000)+3600;
 const signature=crypto.createHmac('sha256',secret()).update(meta.id+'.'+expires).digest('base64url');
 const base=(process.env.PUBLIC_APP_URL||'').replace(/\/+$/,'');
 return `${base}/api/private-media/${meta.id}?expires=${expires}&signature=${signature}`;
}
function permittedSignature(id,q){
 const expires=Number(q.expires);if(!Number.isSafeInteger(expires)||expires<=Date.now()/1000||expires>Date.now()/1000+3605||typeof q.signature!=='string')return false;
 const expected=crypto.createHmac('sha256',secret()).update(id+'.'+expires).digest();
 try{const actual=Buffer.from(q.signature,'base64url');return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);}catch{return false;}
}
export function privateMediaId(value){
 if(typeof value!=='string')return null;
 try{const origin=process.env.PUBLIC_APP_URL||'http://localhost';const u=new URL(value,origin);if(u.origin!==new URL(origin).origin)return null;return /^\/api\/private-media\/([a-f0-9]{32})$/.exec(u.pathname)?.[1]||null;}catch{return null;}
}
export async function refreshPrivateMediaUrls(value,userId){
 if(!userId)return value;
 if(typeof value==='string'){const id=privateMediaId(value);if(!id)return value;const m=await readMediaMetadata(id);return m?.ownerId===userId?privateMediaUrl(m):null;}
 if(Array.isArray(value))return Promise.all(value.map(v=>refreshPrivateMediaUrls(v,userId)));
 if(value&&typeof value==='object'&&!Buffer.isBuffer(value)){const result={};for(const [k,v] of Object.entries(value))result[k]=await refreshPrivateMediaUrls(v,userId);return result;}
 return value;
}
async function encryptedChunk(meta,index){
 const start=index*(CHUNK+16),size=Math.min(CHUNK,meta.size-index*CHUNK)+16;
 if(meta.backend==='r2'){
  if(!r2)throw fault('Private storage is unavailable',503);
  const result=await r2.send(new GetObjectCommand({Bucket:bucket,Key:meta.objectKey,Range:`bytes=${start}-${start+size-1}`}));
  return Buffer.from(await result.Body.transformToByteArray());
 }
 const file=await fsp.open(dataFile(meta.id),'r');try{const b=Buffer.alloc(size);const {bytesRead}=await file.read(b,0,size,start);if(bytesRead!==size)throw new Error('Incomplete private media');return b;}finally{await file.close();}
}
export async function readPrivateMedia(value,userId=owner()){
 const id=privateMediaId(value);if(!id)return null;const meta=await readMediaMetadata(id);
 if(!meta||meta.ownerId!==userId)throw fault('Media not found',404);
 const out=[];for(let i=0;i<Math.ceil(meta.size/CHUNK);i++)out.push(decrypt(await encryptedChunk(meta,i),meta,i));
 return {buffer:Buffer.concat(out),contentType:meta.contentType};
}
export async function removePrivateMedia(value,userId=owner()){
 const id=privateMediaId(value)||(/^[a-f0-9]{32}$/.test(value)?value:null);
 let meta=id?await readMediaMetadata(id):(await listPrivateMedia(userId)).find(m=>m.name===value);
 if(!meta||meta.ownerId!==userId)return false;
 if(meta.backend==='r2'){if(!r2)throw fault('Private storage is unavailable',503);await r2.send(new DeleteObjectCommand({Bucket:bucket,Key:meta.objectKey}));}
 else await fsp.rm(dataFile(meta.id),{force:true});
 await fsp.rm(metaFile(meta.id),{force:true});return true;
}
let readers=0;
export function privateMediaHandler(){return async(req,res)=>{
 let started=false;
 try{
  const meta=await readMediaMetadata(req.params.id);
  if(!meta||!permittedSignature(meta.id,req.query))return res.status(404).end();
  if(readers>=8)return res.status(429).end();readers++;started=true;
  let start=0,end=meta.size-1;
  if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!m||(!m[1]&&!m[2]))return res.status(416).set('Content-Range',`bytes */${meta.size}`).end();
   if(!m[1])start=Math.max(0,meta.size-Number(m[2]));else {start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=meta.size)return res.status(416).set('Content-Range',`bytes */${meta.size}`).end();
   res.status(206).set('Content-Range',`bytes ${start}-${end}/${meta.size}`);
  }
  res.set({'Content-Type':meta.contentType,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; sandbox"});
  if(req.method==='HEAD')return res.end();
  for(let i=Math.floor(start/CHUNK);i<=Math.floor(end/CHUNK);i++){
   if(res.destroyed)return;
   const plain=decrypt(await encryptedChunk(meta,i),meta,i);
   const piece=plain.subarray(Math.max(0,start-i*CHUNK),Math.min(plain.length,end-i*CHUNK+1));
   if(!res.write(piece))await Promise.race([once(res,'drain'),once(res,'close')]);
  }
  res.end();
 }catch(e){if(res.headersSent)res.destroy();else res.status(e.status||500).end();}finally{if(started)readers--;}
};}
