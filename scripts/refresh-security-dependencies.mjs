// Maintainer tool: resolve compatible patches and print a lockfile delta for review.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const before=read('package-lock.json');
const result=spawnSync('npm',['audit','fix','--ignore-scripts','--no-fund'],{encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024});
if(result.error)throw result.error;
if(result.status!==0&&result.status!==1)throw new Error('Dependency refresh failed');
const after=read('package-lock.json'),manifest=read('package.json');
const auditResult=spawnSync('npm',['audit','--omit=dev','--json'],{encoding:'utf8',timeout:90000,maxBuffer:8*1024*1024});
if(auditResult.error)throw auditResult.error;
const audit=JSON.parse(auditResult.stdout);
if(!audit.metadata)throw new Error('Dependency audit did not return a report');
const packageChanges=[...new Set([...Object.keys(before.packages),...Object.keys(after.packages)])]
 .filter(k=>JSON.stringify(before.packages[k])!==JSON.stringify(after.packages[k])).map(k=>[k,after.packages[k]||null]);
const {packages,...lockHeader}=after;
console.log('DEPENDENCY_UPDATE:'+JSON.stringify({manifest,lockHeader,packageChanges}));
console.log('DEPENDENCY_AUDIT:'+JSON.stringify({metadata:audit.metadata,vulnerabilities:audit.vulnerabilities}));
