import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'reels-speech-test-'));
process.env.REELS_DATA_DIR = dir;
process.env.OPENAI_API_KEY = 'fixture-not-a-real-key';
process.env.REELS_TRANSCRIBE_MODEL = 'fixture-transcription';
const store = await import('../server/reels/store.js');
const { FFMPEG, runProcess, probeMedia } = await import('../server/reels/media.js');
const { speechContext } = await import('../server/reels/speech.js');
const { createEmptyProject, addSource, applyGapRemoval } = await import('../src/features/ReelsEditor/core/editPlan.js');
let received = 0;
const app = express();
app.post('/v1/audio/transcriptions', multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }).single('file'), async (req, res) => {
  try {
    received++;
    const audio = path.join(dir, 'received.mp3');
    await fs.writeFile(audio, req.file.buffer);
    const metadata = await probeMedia(audio);
    assert.ok(Math.abs(metadata.durationSec - 6) < 0.2, 'Only the retained six seconds should reach transcription');
    assert.equal(req.body.model, 'fixture-transcription');
    res.json({ text: 'Retained speech only.' });
  } catch (e) { res.status(500).json({ error: { message: e.message } }); }
});
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
process.env.OPENAI_BASE_URL = 'http://127.0.0.1:' + server.address().port + '/v1';
try {
  await store.ensureDirs();
  const source = { id: 's_fixture', checksum: 'c'.repeat(64), filename: 'speech.wav', bytes: 100,
    meta: { durationSec: 10, width: 576, height: 1024, rotation: 0, fpsNum: 30, fpsDen: 1,
      variableFrameRate: false, hasAudio: true, videoCodec: 'h264', audioCodec: 'pcm_s16le' } };
  const media = store.paths.media('fixture-owner', source.id);
  await fs.mkdir(path.dirname(media), { recursive: true });
  await runProcess(FFMPEG, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=10', '-c:a', 'pcm_s16le', '-f', 'wav', media]);
  const project = applyGapRemoval(addSource(createEmptyProject({ id: 'p_fixture', ownerId: 'fixture-owner' }), source),
    [{ sourceId: source.id, startSec: 2, endSec: 6 }]);
  assert.equal(await speechContext(project, 'fixture-owner', 'openai'), 'Retained speech only.');
  assert.equal(received, 1);
  console.log('PASS real FFmpeg retained-timeline extraction and transcription upload');
} finally {
  await new Promise(resolve => server.close(resolve));
  await fs.rm(dir, { recursive: true, force: true });
}
