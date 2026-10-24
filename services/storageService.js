import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {savePrivateMedia,listPrivateMedia,privateMediaUrl,readPrivateMedia,removePrivateMedia} from '../server/storage/privateMedia.js';
import {getOperationUser} from '../server/billing/ledger.js';
import {fetchAllowedProxyResource} from '../server/utils/safeProxy.js';

export const MARKETING_BUCKET=process.env.PRIVATE_R2_BUCKET_NAME||'private-media';
export const MARKETING_FOLDER='marketing';
export async function uploadToGCS(data,fileName,contentType='image/png'){
 let buffer=data;
 if(typeof data==='string'){
  if(data.startsWith('data:'))buffer=Buffer.from(data.split(',')[1]||'','base64');
  else if(/^https?:|^\/api\/private-media\//.test(data)){
   const result=await readPrivateMedia(data)||await fetchAllowedProxyResource(data,{maxBytes:250*1024*1024});buffer=result.buffer;
  }else buffer=Buffer.from(data,'base64');
 }
 return savePrivateMedia(buffer,fileName,contentType);
}
export const getPublicUrl=async fileName=>{const m=(await listPrivateMedia()).find(m=>m.name===fileName||m.id===fileName);return m?privateMediaUrl(m):null;};
export const listAssetsGCS=async(prefix='')=>(await listPrivateMedia()).filter(m=>m.name.startsWith(prefix)).map(m=>({id:m.id,name:m.name,url:privateMediaUrl(m),size:(m.size/1024/1024).toFixed(2)+' MB',date:m.createdAt.split('T')[0]}));
export const deleteAssetFromStorage=removePrivateMedia;
// Small private account documents use a separate, non-public directory.
function documentPath(name){const user=getOperationUser()?.id;if(!user)throw Object.assign(new Error('Sign in required'),{status:401});
 const root=path.resolve(process.env.PRIVATE_MEDIA_DIR||'server/data/private-media');
 return path.join(root,'documents',crypto.createHash('sha256').update(user+':'+name).digest('hex')+'.json');}
export const readFromR2=async name=>fsp.readFile(documentPath(name),'utf8');
export const writeToR2=async(name,content)=>{
 const file=documentPath(name);if(typeof content!=='string'||Buffer.byteLength(content)>2*1024*1024)throw new Error('Document exceeds 2 MB');
 await fsp.mkdir(path.dirname(file),{recursive:true,mode:0o700});
 const tmp=file+'.'+crypto.randomUUID()+'.tmp';await fsp.writeFile(tmp,content,{mode:0o600});await fsp.rename(tmp,file);
};
