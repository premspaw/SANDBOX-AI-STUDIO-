import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyProject,validateProject} from '../src/features/ReelsEditor/core/editPlan.js';
import {executeAiEdit,getAvailableEngines} from '../server/reels/aiEditor.js';
test('brand persists, dimensions are bounded and must be even',()=>{
 const p=createEmptyProject({id:'p',ownerId:'u'});
 p.canvas.width=1920;p.canvas.height=1080;
 p.brand={background:'#101525',surface:'#202B42',text:'#FFFFFF',accent:'#C8F135',secondary:'#9C89FF',font:'noto-kannada',animation:'fade',templateId:'viral-hook'};
 assert.equal(validateProject(p).ok,true);
 p.canvas.width=9999;assert.equal(validateProject(p).ok,false);
 p.canvas.width=1919;assert.equal(validateProject(p).ok,false);
});
test('unconfigured AI refuses without changing or inventing layers',async()=>{
 const old=process.env.REELS_OPENAI_MODEL;delete process.env.REELS_OPENAI_MODEL;
 try{const p=createEmptyProject({id:'p',ownerId:'u'});await assert.rejects(executeAiEdit({project:p,engine:'openai'}),/Configure/);assert.deepEqual(p.overlays,[]);assert.equal(getAvailableEngines().find(e=>e.id==='openai').available,false);}finally{if(old)process.env.REELS_OPENAI_MODEL=old;}
});
