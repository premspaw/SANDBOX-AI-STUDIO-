// Reports locations and categories only; never prints credentials.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const paths=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const findings=[],routeFiles=[];
let scanned=0;
for(const file of paths){
 if(!/\.(js|jsx|mjs|ts|tsx|html|json|md|sql|yml|yaml|env)$/.test(file)||file==='scripts/security-inventory.mjs')continue;
 const stat=fs.statSync(file);if(!stat.isFile()||stat.size>2*1024*1024)continue;
 const text=fs.readFileSync(file,'utf8');if(text.includes('\0'))continue;scanned++;
 const at=index=>text.slice(0,index).split('\n').length;
 for(const [kind,re] of [
  ['provider-key',/\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{30,}|AIza[\w-]{30,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16})\b/g],
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['legacy-admin-password',/["']admin\d{2,}["']/g],
 ]){
  for(const m of text.matchAll(re))findings.push({file,line:at(m.index),kind});
 }
 for(const m of text.matchAll(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)){
  try{const payload=JSON.parse(Buffer.from(m[0].split('.')[1],'base64url'));
   if(payload.role!=='anon')findings.push({file,line:at(m.index),kind:payload.role==='service_role'?'service-role-token':'signed-token',expires:payload.exp||null});
  }catch{}
 }
 if(file.startsWith('src/'))for(const m of text.matchAll(/import\.meta\.env\.(VITE_[A-Z_]*(?:KEY|SECRET|TOKEN))/g)){
  if(m[1]!=='VITE_SUPABASE_ANON_KEY')findings.push({file,line:at(m.index),kind:'browser-environment-key',variable:m[1]});
 }
 if(file.startsWith('server/routes/')||file==='server.js'){
  const routes=[...text.matchAll(/\b(?:router|app)\.(get|post|put|patch|delete)\(/g)];
  routeFiles.push({file,routes:routes.length});
 }
}
console.log('SECURITY_INVENTORY:'+JSON.stringify({scanned,findings,routeFiles}));
if(findings.some(f=>['provider-key','private-key','service-role-token','legacy-admin-password','browser-environment-key'].includes(f.kind)))process.exitCode=1;
