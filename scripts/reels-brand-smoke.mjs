import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {runProcess,FFMPEG,probeMedia} from '../server/reels/media.js';
import {createEmptyProject,addSource,addTextOverlay,validateProject} from '../src/features/ReelsEditor/core/editPlan.js';
import {REEL_TEMPLATES,instantiateTemplate} from '../src/features/ReelsEditor/core/templates.js';
import {DEFAULT_BRAND,applyBrand,templatePanels} from '../src/features/ReelsEditor/core/brand.js';
import {buildRenderPlan} from '../server/reels/renderPlan.js';

const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'reels-brand-'));
const W=640,H=360;
const digest=b=>createHash('sha256').update(b).digest('hex');
const near=(frame,x,y,hex,label)=>{
  const expected=hex.match(/[a-f0-9]{2}/ig).map(v=>parseInt(v,16));
  const actual=[...frame.subarray((y*W+x)*3,(y*W+x)*3+3)];
  assert.ok(actual.every((v,i)=>Math.abs(v-expected[i])<24),label+': '+actual+' vs '+expected);
};
try {
  const input=path.join(dir,'input.mp4');
  await runProcess(FFMPEG,['-y','-v','error','-f','lavfi','-i','color=c=blue:s=320x180:r=30:d=5',
    '-f','lavfi','-i','sine=frequency=440:duration=5','-c:v','libx264','-threads','2','-c:a','aac',input]);
  let base=createEmptyProject({id:'brandSmoke',ownerId:'test'});
  base.canvas.width=W;base.canvas.height=H;
  base=addSource(base,{id:'s1',checksum:'a'.repeat(64),filename:'input.mp4',bytes:1000,
    meta:{durationSec:5,width:320,height:180,rotation:0,fpsNum:30,fpsDen:1,variableFrameRate:false,hasAudio:true,videoCodec:'h264',audioCodec:'aac'}});
  base=applyBrand(base,{...DEFAULT_BRAND,animation:'none'});
  const snapshot=async (project,time=1)=>{
    assert.equal(validateProject(project).ok,true);
    const plan=buildRenderPlan(project,{sourcePaths:new Map([['s1',input]])});
    await fsp.writeFile(path.join(dir,'graph.txt'),plan.filterScript);
    for(const t of plan.textFiles)await fsp.writeFile(path.join(dir,t.name),t.content);
    for(const font of plan.fonts)await fsp.copyFile(path.resolve('server/reels/assets/fonts',font),path.join(dir,font));
    await runProcess(FFMPEG,plan.args,{cwd:dir});
    const meta=await probeMedia(path.join(dir,'out.mp4'));
    assert.equal(meta.width,W);assert.equal(meta.height,H);assert.equal(meta.hasAudio,true);
    assert.ok(Math.abs(meta.durationSec-5)<.1);
    await runProcess(FFMPEG,['-y','-v','error','-ss',String(time),'-i',path.join(dir,'out.mp4'),'-frames:v','1',
      '-pix_fmt','rgb24','-f','rawvideo',path.join(dir,'frame.rgb')]);
    const result=await fsp.readFile(path.join(dir,'frame.rgb'));
    assert.equal(result.length,W*H*3);return result;
  };
  let card,cardFrame;
  for(const t of REEL_TEMPLATES){
    let p=addTextOverlay(base,15,{...instantiateTemplate(t,15,30,'Small habits\nBig results'),durationFrames:60});
    p.overlays[0].style.fontSize=28;
    const frame=await snapshot(p);
    for(const [i,r] of templatePanels(p.overlays[0],p.brand,W,H).entries()){
      // Avoid text and later panels while sampling the two accent strips.
      if(i>=templatePanels(p.overlays[0],p.brand,W,H).length-2)
        near(frame,r.x+Math.floor(r.width/2),r.y+Math.floor(r.height/2),r.color,t.id+' accent '+i);
    }
    if(t.id==='point-list-3'){
      card=p;cardFrame=frame;
      near(frame,2,2,p.brand.background,'card background');
      near(frame,50,180,p.brand.surface,'card surface');
    }
    console.log('PASS: real '+t.id+' export; palette strips, dimensions, duration and audio');
  }
  const recolored=applyBrand(card,{background:'#F4EEE2',surface:'#1D433B',text:'#FFCC00',accent:'#FF6600',secondary:'#00DDFF'});
  const recoloredFrame=await snapshot(recolored);
  near(recoloredFrame,2,2,recolored.brand.background,'changed background');
  near(recoloredFrame,50,180,recolored.brand.surface,'changed surface');
  let textPixels=0;
  for(let i=0;i<recoloredFrame.length;i+=3)if(recoloredFrame[i]>210 && recoloredFrame[i+1]>160 && recoloredFrame[i+2]<60)textPixels++;
  assert.ok(textPixels>40,'export contains the selected text color');
  assert.notEqual(digest(cardFrame),digest(await snapshot(applyBrand(card,{font:'noto-kannada'}))),'font changes encoded pixels');
  const moving=applyBrand(card,{animation:'slide-up'});
  assert.notEqual(digest(await snapshot(moving,.5)),digest(await snapshot(moving,1)),'entrance changes encoded pixels');
  near(await snapshot(card,3),2,2,'#0000FF','raw footage resumes after card');
  const fit=structuredClone(base);fit.canvas.height=640;fit.clips[0].crop.mode='fit';
  assert.match(buildRenderPlan(fit,{sourcePaths:new Map([['s1',input]])}).filterScript,/pad=640:640:.*color=0x101525/);
  console.log('PASS: changed text/background/surface/font/animation affect pixels; raw clip survives cards');
} finally {await fsp.rm(dir,{recursive:true,force:true});}
