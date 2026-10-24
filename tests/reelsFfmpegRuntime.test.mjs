import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveReelsFfmpeg} from '../server/reels/ffmpegRuntime.js';

test('Reels falls back when the bundled renderer cannot draw text',()=>{
 const tried=[];
 const result=resolveReelsFfmpeg({bundled:'bundle',probe:binary=>{tried.push(binary);return binary==='ffmpeg';}});
 assert.deepEqual(tried,['bundle','ffmpeg']);assert.equal(result.binary,'ffmpeg');assert.equal(result.available,true);
});
test('An explicit incompatible renderer does not silently use another installation',()=>{
 const tried=[];
 const result=resolveReelsFfmpeg({configured:'custom',bundled:'bundle',probe:binary=>{tried.push(binary);return false;}});
 assert.deepEqual(tried,['custom']);assert.equal(result.available,false);assert.equal(result.binary,null);assert.match(result.error,/REELS_FFMPEG_PATH/);
});
test('A capable bundled renderer is used without requiring a system installation',()=>{
 const tried=[];
 const result=resolveReelsFfmpeg({bundled:'bundle',probe:binary=>{tried.push(binary);return true;}});
 assert.equal(result.binary,'bundle');assert.deepEqual(tried,['bundle']);
});
