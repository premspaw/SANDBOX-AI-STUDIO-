import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLEANUP_PROFILES,
  ReelsV2AlignmentUnavailableError,
  createAlignmentAdapter,
  createChunkedTranscriptAdapter,
  createReelsV2Job,
  createReelsV2Pipeline,
} from '../server/reels/v2Pipeline.js';
import {
  planWithSelectedProvider,
  validatePlannerOutput,
} from '../server/reels/v2AiPlanner.js';
import { createReelsV2Queue } from '../server/reels/v2Queue.js';

const source = {
  id: 'source_1',
  bytes: 1_000,
  meta: { durationSec: 10 },
};

const anchors = [
  { wordId: 'word_1', sourceId: 'source_1', startUs: 1_000_000, endUs: 1_200_000, text: 'hello', alignmentQuality: 'exact' },
  { wordId: 'word_2', sourceId: 'source_1', startUs: 4_000_000, endUs: 4_200_000, text: 'world', alignmentQuality: 'exact' },
];

const emptyPlan = {
  schemaVersion: 2,
  summary: null,
  cleanupDecisions: [],
  protectedWordIds: [],
  captions: [],
  scenes: [],
};

test('v2 job limits sources and preserves picker order', () => {
  const job = createReelsV2Job({
    id: 'job_v2_order', ownerId: 'user_1', projectId: 'project_1', projectRevision: 0,
    sources: [{ ...source, id: 'source_b' }, { ...source, id: 'source_a' }],
    provider: 'openai', cleanupProfile: 'natural',
  });
  assert.deepEqual(job.state.uploaded.sourceOrder, ['source_b', 'source_a']);
  assert.equal(job.request.cleanupProfile, 'natural');
  assert.equal(CLEANUP_PROFILES.natural.minPauseUs, 600_000);
  assert.throws(() => createReelsV2Job({
    id: 'job_v2_many', ownerId: 'user_1', projectId: 'project_1', projectRevision: 0,
    sources: [source, { ...source, id: 'source_2' }, { ...source, id: 'source_3' }, { ...source, id: 'source_4' }], provider: 'openai',
  }), /one and three/);
});

test('chunked transcript adapter covers full source and only removes overlap duplicates', async () => {
  const seenChunks = [];
  const adapter = createChunkedTranscriptAdapter({
    chunkUs: 6_000_000,
    overlapUs: 2_000_000,
    async transcribeChunk({ chunk }) {
      seenChunks.push(chunk);
      if (chunk.index === 0) {
        return {
          timing: 'absolute-us',
          words: [
            { wordId: 'word_hello', text: 'hello', startUs: 1_000_000, endUs: 1_200_000 },
            { wordId: 'word_overlap_a', text: 'again', startUs: 5_000_000, endUs: 5_200_000 },
          ],
        };
      }
      return {
        timing: 'absolute-us',
        words: [
          { wordId: 'word_overlap_b', text: 'again', startUs: 5_000_000, endUs: 5_200_000 },
          { wordId: 'word_repeat', text: 'again', startUs: 8_000_000, endUs: 8_200_000 },
        ],
      };
    },
  });
  const transcript = await adapter.transcribeSource({ source });
  assert.deepEqual(seenChunks.map((chunk) => [chunk.startUs, chunk.endUs]), [[0, 6_000_000], [4_000_000, 10_000_000]]);
  assert.deepEqual(transcript.words.map((word) => word.text), ['hello', 'again', 'again']);
  assert.equal(transcript.chunks.length, 2);
  assert.match(transcript.transcript, /again again/);
});

test('alignment is a visible hard failure when no alignment backend is configured', async () => {
  const adapter = createAlignmentAdapter();
  await assert.rejects(
    adapter.align({ source, transcript: { words: anchors } }),
    (error) => error instanceof ReelsV2AlignmentUnavailableError && error.code === 'REELS_V2_ALIGNMENT_UNCONFIGURED',
  );
});

test('selected AI provider never falls back and strict plans reject invalid scene anchors', async () => {
  let geminiCalled = false;
  await assert.rejects(
    planWithSelectedProvider({
      provider: 'openai',
      model: 'selected-model',
      env: { OPENAI_API_KEY: 'test' },
      adapters: {
        openai: async () => { throw new Error('selected provider failed'); },
        gemini: async () => { geminiCalled = true; return emptyPlan; },
      },
      context: { wordAnchors: anchors, cleanupCandidates: [] },
    }),
    (error) => error.code === 'REELS_V2_PROVIDER_REQUEST_FAILED',
  );
  assert.equal(geminiCalled, false);

  assert.throws(() => validatePlannerOutput({
    ...emptyPlan,
    scenes: [{ component: 'speaker_inset', startWordId: 'word_missing', endWordId: 'word_missing', props: {} }],
  }, { wordAnchors: anchors, cleanupCandidates: [] }), /not in this project/);
});

test('pipeline persists every v2 stage and planner provenance without touching a project', async () => {
  const job = createReelsV2Job({
    id: 'job_v2_pipeline', ownerId: 'user_1', projectId: 'project_1', projectRevision: 4,
    sources: [source], provider: 'openai', model: 'selected-model', cleanupProfile: 'natural',
  });
  const jobs = new Map([[job.id, job]]);
  const eventTypes = [];
  const repository = {
    async getJob(id) { return jobs.get(id) || null; },
    async updateJob(id, patch) {
      const next = { ...jobs.get(id), ...patch };
      jobs.set(id, next);
      return next;
    },
    async appendEvent(_id, event) { eventTypes.push(event.type); },
  };
  const stageCalls = [];
  const services = {
    async probeSources() {
      stageCalls.push('probed');
      return { silences: [{ sourceId: 'source_1', startUs: 2_000_000, endUs: 3_000_000 }] };
    },
    async transcribeSources() { stageCalls.push('transcribed'); return { sources: [{ sourceId: 'source_1', words: anchors }], wordAnchors: anchors }; },
    async alignWords() { stageCalls.push('aligned'); return { wordAnchors: anchors }; },
    async renderPreview() { stageCalls.push('preview_rendered'); return { assetId: 'preview_1' }; },
    async renderExport() { stageCalls.push('export_rendered'); return { assetId: 'export_1' }; },
    async validateOutput() { stageCalls.push('validated'); return { valid: true }; },
  };
  const planner = {
    async plan({ provider, model }) {
      stageCalls.push('story_planned');
      return { plan: emptyPlan, provenance: { provider, model, promptVersion: 'test' } };
    },
  };
  const pipeline = createReelsV2Pipeline({ repository, services, planner });
  const completed = await pipeline.run(job.id);
  assert.equal(completed.status, 'succeeded');
  assert.equal(completed.stage, 'validated');
  assert.equal(completed.state.story_planned.provenance.provider, 'openai');
  assert.equal(completed.state.story_planned.provenance.model, 'selected-model');
  assert.equal(completed.state.cleanup_applied.removals.length, 1);
  assert.deepEqual(stageCalls, ['probed', 'transcribed', 'aligned', 'story_planned', 'preview_rendered', 'export_rendered', 'validated']);
  assert.ok(eventTypes.includes('job_succeeded'));
});

test('queue is explicitly disabled without Redis and cannot enqueue authoritatively in memory', async () => {
  const queue = await createReelsV2Queue({ env: {}, logger: { warn() {} } });
  assert.equal(queue.enabled, false);
  await assert.rejects(queue.enqueue('job_v2_queue'), (error) => error.code === 'REELS_V2_QUEUE_UNAVAILABLE');
});
