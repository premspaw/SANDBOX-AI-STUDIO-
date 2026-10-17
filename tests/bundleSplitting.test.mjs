import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../vite.config.js';

const chunkFor = config.build.rollupOptions.output.manualChunks;
test('AI SDK and drag/drop dependencies do not share the eagerly loaded general vendor chunk', () => {
    assert.equal(chunkFor('/node_modules/@google/genai/dist/web/index.mjs'), 'vendor-generative-ai');
    assert.equal(chunkFor('/node_modules/@google/generative-ai/dist/index.mjs'), 'vendor-generative-ai');
    assert.equal(chunkFor('/node_modules/@dnd-kit/core/dist/core.esm.js'), 'vendor-dnd');
    assert.equal(chunkFor('/node_modules/@reactflow/core/dist/esm/index.mjs'), 'vendor-canvas');
    assert.equal(chunkFor('/node_modules/clsx/dist/clsx.mjs'), 'vendor-others');
});
