import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {runProcess,FFMPEG,probeMedia} from '../server/reels/media.js';
import {createEmptyProject,addSource,addTextOverlay} from '../src/features/ReelsEditor/core/editPlan.js';
import {buildRenderPlan} from '../server/reels/renderPlan.js';
const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'reels-smoke-'));
try{
 const input=path.join(dir,'input.mp4');
 await runProcess(FFMPEG,['-y','-v','error','-f','lavfi','-i','color=c=blue:s=320x180:r=30:d=5','-f','lavfi','-i','sine=frequency=440:duration=5','-c:v','libx264','-threads','2','-c:a','aac',input]);
 let p=createEmptyProject({id:'smoke',ownerId:'test'});p.canvas.width=640;p.canvas.height=360;
 p=addSource(p,{id:'s1',checksum:'a'.repeat(64),filename:'input.mp4',bytes:1000,meta:{durationSec:5,width:320,height:180,rotation:0,fpsNum:30,fpsDen:1,variableFrameRate:false,hasAudio:true,videoCodec:'h264',audioCodec:'aac'}});
 p=addTextOverlay(p,15,{text:'Original voice + motion'});p.overlays[0].style.fontSize=28;
 p.audio.denoise.enabled=true;p.audio.normalize.enabled=true;
 const plan=buildRenderPlan(p,{sourcePaths:new Map([['s1',input]])});
 await fsp.writeFile(path.join(dir,'graph.txt'),plan.filterScript);
 for(const t of plan.textFiles)await fsp.writeFile(path.join(dir,t.name),t.content);
 for(const f of plan.fonts)await fsp.copyFile(path.resolve('server/reels/assets/fonts',f),path.join(dir,f));
 await runProcess(FFMPEG,plan.args,{cwd:dir});
 const meta=await probeMedia(path.join(dir,'out.mp4'));assert.equal(meta.width,640);assert.equal(meta.height,360);assert.equal(meta.hasAudio,true);assert.ok(Math.abs(meta.durationSec-5)<.1);
 console.log('PASS: real landscape MP4, animation, denoise, normalization, audio and 5s duration');
}catch(e){console.error(e.stderr||e);process.exitCode=1;}finally{await fsp.rm(dir,{recursive:true,force:true});}
