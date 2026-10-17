import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createPreviewBudget, selectPreviewPlayers } from '../src/lib/previewBudget.js';
import { paginateMedia } from '../src/lib/mediaPagination.js';
import { optimizedPricingArtwork } from '../src/config/pricingArtwork.js';
import { LANDING_ASSETS } from '../src/config/landingAssets.js';
import { landingVideoPoster } from '../src/config/landingMedia.js';

test('hero selects three closest distinct videos on desktop, one on mobile', () => {
    const previews = Array.from({length:15}, (_, i) => ({id:i, source:`video-${i % 8}`, eligible:true, distance:Math.abs(7-i)}));
    assert.deepEqual([...selectPreviewPlayers(previews, 3)], [7,6,8]);
    assert.deepEqual([...selectPreviewPlayers(previews, 1)], [7]);
    assert.equal(selectPreviewPlayers(previews.map(p=>({...p,eligible:false})),3).size,0);
    const duplicates = previews.map(p=>({...p,source:'same-video'}));
    assert.equal(selectPreviewPlayers(duplicates,3).size,1);
});

test('budget revokes before grant, shifts nearest players and releases all slots', () => {
    const changes = [];
    let a = 5, b = 10, visible = true, limit = 1;
    const pool = createPreviewBudget(() => limit);
    const unregisterA = pool.register('a', {measure:()=>({source:'a',eligible:visible,distance:a}),onChange:on=>changes.push(['a',on])});
    const unregisterB = pool.register('b', {measure:()=>({source:'b',eligible:visible,distance:b}),onChange:on=>changes.push(['b',on])});
    assert.deepEqual(changes,[['a',true]]);
    changes.length=0; b=1; pool.refresh();
    assert.deepEqual(changes,[['a',false],['b',true]]);
    changes.length=0; limit=2; pool.refresh();
    assert.deepEqual(changes,[['a',true]]);
    changes.length=0; visible=false; pool.refresh();
    assert.deepEqual(changes,[['b',false],['a',false]]);
    unregisterA();unregisterB();assert.equal(pool.size,0);
});

test('pagination caps video DOM candidates, exposes every item and clamps after deletion/filtering', () => {
    const all = Array.from({length:103}, (_,i)=>i);
    assert.equal(paginateMedia(all,1).items.length,48);
    assert.deepEqual(paginateMedia(all,3),{page:3,pageCount:3,items:all.slice(96)});
    assert.deepEqual(paginateMedia(all.slice(0,10),3),{page:1,pageCount:1,items:all.slice(0,10)});
    assert.equal(paginateMedia([],9).page,1);
    assert.deepEqual([1,2,3].flatMap(page=>paginateMedia(all,page).items),all);
});

test('every configured rolling-gallery source has an on-disk poster', () => {
    for (const clip of LANDING_ASSETS.gallery) {
        const poster = landingVideoPoster(clip.src);
        assert.ok(poster,clip.src);
        assert.ok(fs.existsSync(new URL('../public'+poster,import.meta.url)),poster);
    }
});

test('pricing artwork mapping changes only known image paths', () => {
    for(const name of ['influencer','director','enterprise']) {
        const image=optimizedPricingArtwork(`/pricing/${name}.png`);
        assert.equal(image,`/pricing/optimized/${name}-480.webp`);
        assert.ok(fs.existsSync(new URL('../public'+image,import.meta.url)));
    }
    assert.equal(optimizedPricingArtwork('https://example.com/custom.png'),'https://example.com/custom.png');
});
