import fetch from 'node-fetch';

const url = 'https://pub-05a4fe33e706492e8d437c36f9a8aa94.r2.dev/landing-assets/Video%20Project%202.mp4';
const test = async () => {
    try {
        const res = await fetch(url);
        console.log('node-fetch:');
        console.log('body exists:', !!res.body);
        console.log('body type:', res.body?.constructor?.name);
        console.log('body.pipe type:', typeof res.body?.pipe);
    } catch (e) {
        console.error('node-fetch error:', e);
    }

    try {
        if (globalThis.fetch) {
            const res2 = await globalThis.fetch(url);
            console.log('native fetch:');
            console.log('body exists:', !!res2.body);
            console.log('body type:', res2.body?.constructor?.name);
            console.log('body.pipe type:', typeof res2.body?.pipe);
        }
    } catch (e) {
        console.error('native fetch error:', e);
    }
};
test();
