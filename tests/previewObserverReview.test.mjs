import test from 'node:test';
import assert from 'node:assert/strict';
import { observePreviewSlot } from '../src/lib/previewBudget.js';

test('observer integration limits players, pauses hidden pages, and releases listeners/timers/frames',()=>{
 const original={document:globalThis.document,window:globalThis.window,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval};
 const events=new Map(), frames=new Map(), timers=new Set();let next=0;
 const target=(prefix,values={})=>Object.assign(values,{addEventListener:(type,fn)=>events.set(prefix+type,fn),removeEventListener:(type,fn)=>{assert.equal(events.get(prefix+type),fn);events.delete(prefix+type);}});
 globalThis.document=target('doc:',{hidden:false});globalThis.window=target('win:',{innerWidth:1200,innerHeight:800});
 globalThis.requestAnimationFrame=fn=>{const id=++next;frames.set(id,fn);return id};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 globalThis.setInterval=fn=>{const id=++next;timers.add(id);return id};globalThis.clearInterval=id=>timers.delete(id);
 try{
  const active=new Set(), cleanups=[];const flush=()=>{const fns=[...frames.values()];frames.clear();fns.forEach(fn=>fn());};
  for(let i=0;i<6;i++) cleanups.push(observePreviewSlot({group:'test',source:`source-${i%4}`,eligible:true,element:{getBoundingClientRect:()=>({left:100+i*100,right:200+i*100,top:250,bottom:450})},onChange:yes=>{if(yes)active.add(i);else active.delete(i);assert.ok(active.size<=3)}}));
  assert.equal(active.size,3);assert.equal(events.size,2);assert.equal(timers.size,1);
  window.innerWidth=600;events.get('win:resize')();events.get('win:resize')();assert.equal(frames.size,1);flush();assert.equal(active.size,1);
  document.hidden=true;events.get('doc:scroll')();flush();assert.equal(active.size,0);
  document.hidden=false;events.get('doc:scroll')();flush();assert.equal(active.size,1);
  events.get('doc:scroll')();assert.equal(frames.size,1);cleanups.forEach(fn=>fn());assert.equal(active.size,0);assert.equal(events.size,0);assert.equal(timers.size,0);assert.equal(frames.size,0);
 } finally {Object.assign(globalThis,original);}
});
