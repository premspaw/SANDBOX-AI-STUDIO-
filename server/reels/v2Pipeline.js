/**
 * Reels v2 background pipeline.
 *
 * The pipeline owns stage ordering, job state transitions, and safe defaults.
 * It does not own HTTP, FFmpeg, storage, Redis, or provider SDK clients; those
 * are injected adapters.  That keeps failures visible and prevents a worker
 * from silently changing provider, trimming a transcript, or altering a
 * project outside a revision transaction owned by the integration layer.
 */
import crypto from 'node:crypto';
import {
  ReelsV2PlannerError,
  WordAnchorSchema,
  resolveSelectedProvider,
  validatePlannerOutput,
} from './v2AiPlanner.js';

export const REELS_V2_STAGES = Object.freeze([
  'uploaded',
  'probed',
  'transcribed',
  'aligned',
  'cleanup_proposed',
  'cleanup_applied',
  'story_planned',
  'preview_rendered',
  'export_rendered',
  'validated',
]);

export const REELS_V2_PROCESSING_STAGES = Object.freeze(REELS_V2_STAGES.slice(1));
export const REELS_V2_TERMINAL_STATUSES = Object.freeze(['succeeded', 'failed', 'cancelled']);

export const REELS_V2_LIMITS = Object.freeze({
  maxSources: 3,
  maxSourceBytes: 250 * 1024 * 1024,
  maxSourceDurationUs: 120 * 1_000_000,
  maxOutputDurationUs: 60 * 1_000_000,
});

export const CLEANUP_PROFILES = Object.freeze({
  natural: Object.freeze({
    id: 'natural',
    minPauseUs: 600_000,
    retainPauseUs: 250_000,
    phonemeGuardUs: 80_000,
    autoApply: true,
  }),
  tight: Object.freeze({
    id: 'tight',
    minPauseUs: 400_000,
    retainPauseUs: 160_000,
    phonemeGuardUs: 80_000,
    autoApply: true,
  }),
  manual: Object.freeze({
    id: 'manual',
    minPauseUs: 400_000,
    retainPauseUs: 250_000,
    phonemeGuardUs: 80_000,
    autoApply: false,
  }),
});

const SOURCE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const STAGE_PROGRESS = Object.freeze(Object.fromEntries(REELS_V2_STAGES.map((stage, index) => [
  stage,
  index / (REELS_V2_STAGES.length - 1),
])));

export class ReelsV2PipelineError extends Error {
  constructor(message, {
    code = 'REELS_V2_PIPELINE_ERROR',
    status = 500,
    stage = null,
    retriable = false,
    details,
    cause,
  } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ReelsV2PipelineError';
    this.code = code;
    this.status = status;
    this.stage = stage;
    this.retriable = retriable;
    this.details = details;
  }
}

export class ReelsV2AlignmentUnavailableError extends ReelsV2PipelineError {
  constructor() {
    super('Word alignment is not configured. No speech cleanup was applied.', {
      code: 'REELS_V2_ALIGNMENT_UNCONFIGURED',
      status: 503,
      stage: 'aligned',
      retriable: false,
    });
    this.name = 'ReelsV2AlignmentUnavailableError';
  }
}

export function resolveCleanupProfile(profile = 'natural') {
  const resolved = CLEANUP_PROFILES[profile];
  if (!resolved) {
    throw new ReelsV2PipelineError('Cleanup profile must be natural, tight, or manual.', {
      code: 'REELS_V2_CLEANUP_PROFILE_INVALID',
      status: 400,
    });
  }
  return { ...resolved };
}

function nowIso(clock) {
  const value = clock();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function safeId(prefix = 'r2') {
  const random = crypto.randomUUID?.().replaceAll('-', '') || `${Date.now()}${Math.random()}`.replace(/\D/g, '');
  return `${prefix}_${random.slice(0, 28)}`;
}

function sourceDurationUs(source) {
  const direct = Number(source?.durationUs);
  if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
  const seconds = Number(source?.durationSec ?? source?.meta?.durationSec);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1_000_000) : null;
}

function assertSources(sources) {
  if (!Array.isArray(sources) || sources.length < 1 || sources.length > REELS_V2_LIMITS.maxSources) {
    throw new ReelsV2PipelineError('A Reel v2 project must contain between one and three source videos.', {
      code: 'REELS_V2_SOURCE_COUNT_INVALID',
      status: 422,
    });
  }
  const ids = new Set();
  return sources.map((source, order) => {
    if (!source || !SOURCE_ID.test(source.id || '') || ids.has(source.id)) {
      throw new ReelsV2PipelineError('Every source video needs a unique valid source ID.', {
        code: 'REELS_V2_SOURCE_INVALID',
        status: 422,
      });
    }
    ids.add(source.id);
    const bytes = source.bytes === undefined ? null : Number(source.bytes);
    if (bytes !== null && (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > REELS_V2_LIMITS.maxSourceBytes)) {
      throw new ReelsV2PipelineError('Each source must be 250 MB or smaller.', {
        code: 'REELS_V2_SOURCE_BYTES_INVALID',
        status: 422,
      });
    }
    const durationUs = sourceDurationUs(source);
    if (durationUs !== null && durationUs > REELS_V2_LIMITS.maxSourceDurationUs) {
      throw new ReelsV2PipelineError('Each source must be 120 seconds or shorter.', {
        code: 'REELS_V2_SOURCE_DURATION_INVALID',
        status: 422,
      });
    }
    return { ...source, order, ...(durationUs ? { durationUs } : {}) };
  });
}

/**
 * Creates a storage-agnostic job record.  The project remains untouched until
 * an integration layer creates a validated immutable revision from its result.
 */
export function createReelsV2Job({
  id = safeId(),
  ownerId,
  projectId,
  projectRevision,
  sources,
  provider,
  model = null,
  cleanupProfile = 'natural',
  cleanupDecisions = [],
  protectedWordIds = [],
  canvasPolicy = 'auto',
  request = {},
  createdAt = new Date().toISOString(),
} = {}) {
  if (!SOURCE_ID.test(id || '') || !String(ownerId || '').trim() || !SOURCE_ID.test(projectId || '')) {
    throw new ReelsV2PipelineError('A valid job, owner, and project ID are required.', {
      code: 'REELS_V2_JOB_INVALID',
      status: 422,
    });
  }
  if (!Number.isInteger(projectRevision) || projectRevision < 0) {
    throw new ReelsV2PipelineError('A non-negative project revision is required.', {
      code: 'REELS_V2_PROJECT_REVISION_INVALID',
      status: 422,
    });
  }
  const profile = resolveCleanupProfile(cleanupProfile);
  const orderedSources = assertSources(sources);
  return {
    id,
    schemaVersion: 2,
    type: 'reels-v2',
    status: 'queued',
    stage: 'uploaded',
    progress: STAGE_PROGRESS.uploaded,
    ownerId: String(ownerId),
    projectId,
    projectRevision,
    sources: orderedSources,
    request: {
      provider,
      model,
      cleanupProfile: profile.id,
      cleanupDecisions: Array.isArray(cleanupDecisions) ? cleanupDecisions : [],
      protectedWordIds: Array.isArray(protectedWordIds) ? protectedWordIds : [],
      canvasPolicy,
      ...request,
    },
    state: {
      uploaded: {
        completedAt: createdAt,
        sourceIds: orderedSources.map((source) => source.id),
        sourceOrder: orderedSources.map((source) => source.id),
      },
    },
    createdAt,
    updatedAt: createdAt,
    cancelRequested: false,
    error: null,
  };
}

function timeToUs(value, secondsValue, label) {
  if (Number.isFinite(Number(value))) return Math.round(Number(value));
  if (Number.isFinite(Number(secondsValue))) return Math.round(Number(secondsValue) * 1_000_000);
  throw new ReelsV2PipelineError(`${label} requires a start and end time.`, {
    code: 'REELS_V2_TIME_INVALID',
    status: 422,
  });
}

function overlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Derive only safe acoustic-pause candidates.  It does not remove repeated
 * words, paraphrases, or content merely because it looks redundant.
 */
export function proposePauseCleanup({ silences = [], wordAnchors = [], profile = 'natural', sourceId = null } = {}) {
  const settings = typeof profile === 'string' ? resolveCleanupProfile(profile) : resolveCleanupProfile(profile?.id);
  const anchors = wordAnchors.map((anchor) => {
    const parsed = WordAnchorSchema.safeParse(anchor);
    if (!parsed.success) throw new ReelsV2PipelineError('Cannot propose cleanup from invalid word anchors.', {
      code: 'REELS_V2_WORD_ANCHOR_INVALID', status: 422, details: parsed.error.flatten(),
    });
    return parsed.data;
  });
  const candidates = [];
  for (const [index, silence] of silences.entries()) {
    const candidateSourceId = silence?.sourceId || sourceId;
    if (!SOURCE_ID.test(candidateSourceId || '')) continue;
    const startUs = Math.max(0, timeToUs(silence?.startUs, silence?.startSec, 'Silence'));
    const endUs = Math.max(startUs, timeToUs(silence?.endUs, silence?.endSec, 'Silence'));
    if (endUs - startUs <= settings.minPauseUs) continue;
    const before = anchors.filter((word) => word.sourceId === candidateSourceId && word.endUs <= startUs).at(-1) || null;
    const after = anchors.find((word) => word.sourceId === candidateSourceId && word.startUs >= endUs) || null;
    const halfRetained = Math.floor(settings.retainPauseUs / 2);
    const removeStartUs = Math.max(startUs + halfRetained, before ? before.endUs + settings.phonemeGuardUs : 0);
    const removeEndUs = Math.min(endUs - (settings.retainPauseUs - halfRetained), after ? after.startUs - settings.phonemeGuardUs : endUs);
    if (removeEndUs <= removeStartUs) continue;
    // If acoustic evidence unexpectedly intersects a word, leave it alone.
    if (anchors.some((word) => word.sourceId === candidateSourceId && overlap(word.startUs, word.endUs, removeStartUs, removeEndUs))) continue;
    candidates.push({
      id: `gap_${candidateSourceId.slice(0, 80)}_${index}`,
      kind: 'pause',
      sourceId: candidateSourceId,
      startUs,
      endUs,
      removeStartUs,
      removeEndUs,
      durationUs: endUs - startUs,
      autoEligible: settings.autoApply,
      boundaryWordIds: [before?.wordId, after?.wordId].filter(Boolean),
    });
  }
  return { profile: settings.id, candidates };
}

/** Merge only overlapping spans from the same source; source boundaries never merge. */
export function unionRemovalSpans(spans = []) {
  const sorted = spans
    .filter((span) => SOURCE_ID.test(span?.sourceId || '') && Number.isInteger(span.startUs) && Number.isInteger(span.endUs) && span.endUs > span.startUs)
    .map((span) => ({ ...span, candidateIds: [...new Set(span.candidateIds || (span.candidateId ? [span.candidateId] : []))] }))
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId) || a.startUs - b.startUs || a.endUs - b.endUs);
  const out = [];
  for (const span of sorted) {
    const previous = out.at(-1);
    if (previous && previous.sourceId === span.sourceId && span.startUs <= previous.endUs) {
      previous.endUs = Math.max(previous.endUs, span.endUs);
      previous.candidateIds = [...new Set([...previous.candidateIds, ...span.candidateIds])];
    } else {
      out.push(span);
    }
  }
  return out;
}

/**
 * Turns accepted pause candidates into source spans.  Protected words are
 * checked against the actual removal span, not merely its neighbouring words.
 */
export function applyCleanupDecisions({
  candidates = [],
  decisions = [],
  protectedWordIds = [],
  wordAnchors = [],
  profile = 'natural',
} = {}) {
  const settings = typeof profile === 'string' ? resolveCleanupProfile(profile) : resolveCleanupProfile(profile?.id);
  const candidateById = new Map(candidates.map((candidate) => [candidate?.id, candidate]));
  const decisionByCandidate = new Map();
  for (const decision of decisions) {
    if (!candidateById.has(decision?.candidateId) || !['remove', 'keep'].includes(decision?.decision)) {
      throw new ReelsV2PipelineError('Cleanup decision references an invalid candidate.', {
        code: 'REELS_V2_CLEANUP_DECISION_INVALID', status: 422,
      });
    }
    if (decisionByCandidate.has(decision.candidateId)) {
      throw new ReelsV2PipelineError('Cleanup candidate was decided more than once.', {
        code: 'REELS_V2_CLEANUP_DECISION_DUPLICATE', status: 422,
      });
    }
    decisionByCandidate.set(decision.candidateId, decision.decision);
  }
  const protectedSet = new Set(protectedWordIds);
  const parsedWords = wordAnchors.map((word) => WordAnchorSchema.parse(word));
  const rejected = [];
  const spans = [];
  for (const candidate of candidates) {
    const selected = decisionByCandidate.get(candidate.id) || (settings.autoApply && candidate.autoEligible ? 'remove' : 'keep');
    if (selected !== 'remove') continue;
    const intersectsProtected = parsedWords.some((word) => protectedSet.has(word.wordId)
      && word.sourceId === candidate.sourceId
      && overlap(word.startUs, word.endUs, candidate.removeStartUs, candidate.removeEndUs));
    if (intersectsProtected) {
      rejected.push({ candidateId: candidate.id, reason: 'protected-word-overlap' });
      continue;
    }
    spans.push({
      sourceId: candidate.sourceId,
      startUs: candidate.removeStartUs,
      endUs: candidate.removeEndUs,
      candidateId: candidate.id,
    });
  }
  return {
    profile: settings.id,
    removals: unionRemovalSpans(spans),
    rejected,
  };
}

export function buildTranscriptChunks({ durationUs, chunkUs = 30_000_000, overlapUs = 2_000_000 } = {}) {
  const total = Math.round(Number(durationUs));
  const size = Math.round(Number(chunkUs));
  const overlapSize = Math.round(Number(overlapUs));
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(size) || size <= 0 || overlapSize < 0 || overlapSize >= size) {
    throw new ReelsV2PipelineError('Invalid transcript chunk configuration.', {
      code: 'REELS_V2_TRANSCRIPT_CHUNK_INVALID', status: 422,
    });
  }
  const chunks = [];
  for (let startUs = 0, index = 0; startUs < total; index += 1) {
    const endUs = Math.min(total, startUs + size);
    chunks.push({ id: `chunk_${index}`, index, startUs, endUs });
    if (endUs === total) break;
    startUs = endUs - overlapSize;
  }
  return chunks;
}

function assertChunkCoverage(chunks, durationUs) {
  const sorted = [...chunks].sort((a, b) => a.startUs - b.startUs || a.endUs - b.endUs);
  let coveredUntil = 0;
  for (const chunk of sorted) {
    if (!Number.isInteger(chunk.startUs) || !Number.isInteger(chunk.endUs) || chunk.startUs < 0 || chunk.endUs <= chunk.startUs || chunk.startUs > coveredUntil) {
      throw new ReelsV2PipelineError('Transcript chunks do not cover the entire source.', {
        code: 'REELS_V2_TRANSCRIPT_COVERAGE_INVALID', status: 422,
      });
    }
    coveredUntil = Math.max(coveredUntil, chunk.endUs);
  }
  if (coveredUntil < durationUs) {
    throw new ReelsV2PipelineError('Transcript chunks ended before the source video ended.', {
      code: 'REELS_V2_TRANSCRIPT_TRUNCATED', status: 422,
    });
  }
}

function wordTimestampUs(word, key, chunk, relative) {
  const us = word?.[`${key}Us`];
  const seconds = word?.[`${key}Sec`];
  const value = Number.isFinite(Number(us)) ? Math.round(Number(us)) : Math.round(Number(seconds) * 1_000_000);
  if (!Number.isFinite(value) || value < 0) {
    throw new ReelsV2PipelineError('A transcript word is missing a timestamp.', {
      code: 'REELS_V2_TRANSCRIPT_WORD_INVALID', status: 422,
    });
  }
  return relative ? chunk.startUs + value : value;
}

function normaliseChunkWords({ words, sourceId, chunk, chunkIndex, timing = 'relative-us' }) {
  if (!Array.isArray(words)) {
    throw new ReelsV2PipelineError('Every transcript chunk must provide word-level evidence.', {
      code: 'REELS_V2_TRANSCRIPT_WORDS_REQUIRED', status: 422,
    });
  }
  const relative = timing !== 'absolute-us';
  return words.map((word, wordIndex) => {
    const startUs = wordTimestampUs(word, 'start', chunk, relative);
    const endUs = wordTimestampUs(word, 'end', chunk, relative);
    const text = String(word?.text || word?.word || '').trim();
    if (!text || endUs <= startUs) {
      throw new ReelsV2PipelineError('Transcript word boundaries are invalid.', {
        code: 'REELS_V2_TRANSCRIPT_WORD_INVALID', status: 422,
      });
    }
    return {
      wordId: word?.wordId || `w_${sourceId}_${chunkIndex}_${wordIndex}`,
      sourceId,
      startUs,
      endUs,
      text,
      alignmentQuality: ['exact', 'high', 'medium', 'low'].includes(word?.alignmentQuality) ? word.alignmentQuality : 'low',
      _chunkIndex: chunkIndex,
      _chunkStartUs: chunk.startUs,
      _chunkEndUs: chunk.endUs,
    };
  });
}

function duplicateAcrossOverlappingChunks(previous, next) {
  if (previous.sourceId !== next.sourceId || previous._chunkIndex === next._chunkIndex) return false;
  const sameText = previous.text.toLocaleLowerCase() === next.text.toLocaleLowerCase();
  const chunksOverlap = previous._chunkStartUs < next._chunkEndUs && next._chunkStartUs < previous._chunkEndUs;
  const sameMoment = Math.abs(previous.startUs - next.startUs) <= 100_000
    && Math.abs(previous.endUs - next.endUs) <= 100_000;
  return sameText && chunksOverlap && sameMoment;
}

function dedupeOverlappingWords(words) {
  const sorted = [...words].sort((a, b) => a.startUs - b.startUs || a.endUs - b.endUs || a._chunkIndex - b._chunkIndex);
  const kept = [];
  const usedIds = new Set();
  for (const word of sorted) {
    if (kept.some((previous) => duplicateAcrossOverlappingChunks(previous, word))) continue;
    let wordId = word.wordId;
    let suffix = 1;
    while (usedIds.has(wordId)) wordId = `${word.wordId}_${suffix++}`;
    usedIds.add(wordId);
    kept.push({ ...word, wordId });
  }
  return kept.map((word) => {
    const { _chunkIndex, _chunkStartUs, _chunkEndUs, ...clean } = word;
    return clean;
  });
}

/**
 * Builds a no-truncation transcript adapter.  `transcribeChunk` is the only
 * network/media boundary; it may extract the requested source range with
 * FFmpeg, call a provider, or use a local recogniser.
 */
export function createChunkedTranscriptAdapter({
  transcribeChunk,
  chunkUs = 30_000_000,
  overlapUs = 2_000_000,
  makeChunks,
} = {}) {
  if (typeof transcribeChunk !== 'function') {
    throw new ReelsV2PipelineError('A transcript chunk adapter is required.', {
      code: 'REELS_V2_TRANSCRIBER_UNCONFIGURED', status: 503, stage: 'transcribed',
    });
  }
  return Object.freeze({
    async transcribeSource({ source, signal, onProgress } = {}) {
      const durationUs = sourceDurationUs(source);
      if (!durationUs) {
        throw new ReelsV2PipelineError('Source duration is required before transcription.', {
          code: 'REELS_V2_TRANSCRIPT_DURATION_UNKNOWN', status: 422, stage: 'transcribed',
        });
      }
      const chunks = await (makeChunks
        ? makeChunks({ source, durationUs, chunkUs, overlapUs, signal })
        : buildTranscriptChunks({ durationUs, chunkUs, overlapUs }));
      assertChunkCoverage(chunks, durationUs);
      const allWords = [];
      const chunkResults = [];
      for (const [chunkIndex, chunk] of chunks.entries()) {
        if (signal?.aborted) throw Object.assign(new Error('Cancelled'), { code: 'ECANCELLED' });
        let result;
        try {
          result = await transcribeChunk({ source, chunk, signal });
        } catch (cause) {
          throw new ReelsV2PipelineError(`Transcription failed for ${chunk.id}: ${cause?.message || 'unknown error'}`, {
            code: 'REELS_V2_TRANSCRIPT_CHUNK_FAILED', status: 502, stage: 'transcribed', cause,
          });
        }
        const words = normaliseChunkWords({
          words: result?.words,
          sourceId: source.id,
          chunk,
          chunkIndex,
          timing: result?.timing || 'relative-us',
        });
        allWords.push(...words);
        chunkResults.push({
          id: chunk.id,
          startUs: chunk.startUs,
          endUs: chunk.endUs,
          wordCount: words.length,
          providerRequestId: result?.providerRequestId || null,
        });
        onProgress?.((chunkIndex + 1) / chunks.length);
      }
      const words = dedupeOverlappingWords(allWords);
      return {
        sourceId: source.id,
        durationUs,
        chunks: chunkResults,
        words,
        transcript: words.map((word) => word.text).join(' '),
      };
    },
  });
}

/**
 * Alignment is intentionally a separate adapter.  If it is absent, the job
 * fails at the `aligned` stage and does not continue to speech cleanup.
 */
export function createAlignmentAdapter({ alignWords, name = 'external-alignment' } = {}) {
  return Object.freeze({
    name,
    async align({ source, transcript, signal } = {}) {
      if (typeof alignWords !== 'function') throw new ReelsV2AlignmentUnavailableError();
      let result;
      try {
        result = await alignWords({ source, transcript, signal });
      } catch (cause) {
        if (cause instanceof ReelsV2PipelineError) throw cause;
        throw new ReelsV2PipelineError(`Word alignment failed: ${cause?.message || 'unknown error'}`, {
          code: 'REELS_V2_ALIGNMENT_FAILED', status: 502, stage: 'aligned', cause,
        });
      }
      const anchors = result?.wordAnchors || result?.words;
      if (!Array.isArray(anchors)) {
        throw new ReelsV2PipelineError('Word alignment returned no word anchors.', {
          code: 'REELS_V2_ALIGNMENT_INVALID', status: 502, stage: 'aligned',
        });
      }
      const parsed = anchors.map((anchor) => WordAnchorSchema.parse({
        ...anchor,
        sourceId: anchor.sourceId || source?.id,
      }));
      const transcriptIds = new Set((transcript?.words || []).map((word) => word.wordId));
      const alignedIds = new Set(parsed.map((word) => word.wordId));
      if ([...transcriptIds].some((wordId) => !alignedIds.has(wordId))) {
        throw new ReelsV2PipelineError('Word alignment dropped transcript evidence.', {
          code: 'REELS_V2_ALIGNMENT_TRUNCATED', status: 502, stage: 'aligned',
        });
      }
      return { sourceId: source?.id, wordAnchors: parsed, metadata: result?.metadata || null };
    },
  });
}

function makeStageError(stage, error) {
  if (error instanceof ReelsV2PipelineError || error instanceof ReelsV2PlannerError) {
    if (!error.stage) error.stage = stage;
    return error;
  }
  const cancelled = error?.code === 'ECANCELLED' || error?.name === 'AbortError';
  return new ReelsV2PipelineError(cancelled ? 'Job was cancelled.' : (error?.message || 'Reels v2 processing failed.'), {
    code: cancelled ? 'ECANCELLED' : 'REELS_V2_STAGE_FAILED',
    status: cancelled ? 499 : 500,
    stage,
    retriable: Boolean(error?.retriable),
    cause: error,
  });
}

function requireService(services, name, stage) {
  const service = services[name];
  if (typeof service !== 'function') {
    throw new ReelsV2PipelineError(`The ${name} service is not configured.`, {
      code: 'REELS_V2_SERVICE_UNCONFIGURED', status: 503, stage, details: { service: name },
    });
  }
  return service;
}

function sourceList(job) {
  const sources = job.sources || job.snapshot?.sources || [];
  return assertSources(sources);
}

function completeStage(job, stage) {
  return Boolean(job.state?.[stage]?.completedAt);
}

function nextStage(job) {
  return REELS_V2_PROCESSING_STAGES.find((stage) => !completeStage(job, stage)) || null;
}

function allWordAnchors(state) {
  const fromAligned = state?.aligned?.wordAnchors;
  if (Array.isArray(fromAligned)) return fromAligned;
  const fromSources = state?.aligned?.sources || state?.transcribed?.sources || [];
  return fromSources.flatMap((entry) => entry.wordAnchors || entry.words || []);
}

function allSilences(state) {
  return ['probed', 'transcribed', 'aligned']
    .flatMap((stage) => Array.isArray(state?.[stage]?.silences) ? state[stage].silences : []);
}

function safeError(error) {
  return {
    code: error.code || 'REELS_V2_PIPELINE_ERROR',
    message: String(error.message || 'Processing failed.').slice(0, 1_000),
    stage: error.stage || null,
    retriable: Boolean(error.retriable),
    details: error.details || null,
  };
}

function normalisePlannerStageResult(result, context) {
  const plan = validatePlannerOutput(result?.plan ?? result?.output ?? result, context);
  const provenance = result?.provenance;
  if (!provenance || provenance.provider !== context.provider || provenance.model !== context.model) {
    throw new ReelsV2PipelineError('The planner did not retain selected provider/model provenance.', {
      code: 'REELS_V2_PROVENANCE_INVALID', status: 502, stage: 'story_planned',
    });
  }
  return {
    plan,
    provenance: {
      provider: context.provider,
      model: context.model,
      requestId: provenance.requestId ? String(provenance.requestId).slice(0, 200) : null,
      promptVersion: provenance.promptVersion ? String(provenance.promptVersion).slice(0, 80) : 'reels-v2',
      generatedAt: provenance.generatedAt || new Date().toISOString(),
    },
  };
}

/**
 * Build a resumable v2 orchestrator.
 *
 * Repository contract:
 * - getJob(jobId) -> record | null
 * - updateJob(jobId, patch) -> updated record (optional return is tolerated)
 * - appendEvent(jobId, event) (optional, telemetry only)
 */
export function createReelsV2Pipeline({ repository, services = {}, planner = null, clock = () => new Date() } = {}) {
  if (!repository || typeof repository.getJob !== 'function' || typeof repository.updateJob !== 'function') {
    throw new ReelsV2PipelineError('Reels v2 requires getJob and updateJob repository methods.', {
      code: 'REELS_V2_REPOSITORY_INVALID', status: 500,
    });
  }

  const persist = async (job, patch) => {
    const result = await repository.updateJob(job.id, patch);
    return result || { ...job, ...patch };
  };
  const event = async (job, type, data = {}) => {
    if (typeof repository.appendEvent !== 'function') return;
    try {
      await repository.appendEvent(job.id, { type, at: nowIso(clock), stage: job.stage, ...data });
    } catch {
      // Event telemetry must not hide a media/editing result.
    }
  };
  const checkCancelled = async (job, signal) => {
    if (signal?.aborted) throw Object.assign(new Error('Cancelled'), { code: 'ECANCELLED' });
    const latest = await repository.getJob(job.id);
    if (latest?.cancelRequested) throw Object.assign(new Error('Cancelled'), { code: 'ECANCELLED' });
    return latest || job;
  };

  const runStage = async (stage, context) => {
    const { job, state, signal, updateProgress } = context;
    const profile = resolveCleanupProfile(job.request?.cleanupProfile || 'natural');
    if (stage === 'probed') return requireService(services, 'probeSources', stage)(context);

    if (stage === 'transcribed') {
      if (typeof services.transcribeSources === 'function') return services.transcribeSources(context);
      const adapter = services.transcriptAdapter;
      const transcribeSource = typeof adapter === 'function' ? adapter : adapter?.transcribeSource;
      if (typeof transcribeSource !== 'function') return requireService(services, 'transcribeSources', stage)(context);
      const sources = [];
      for (const source of sourceList(job)) {
        const result = await transcribeSource({ source, signal, onProgress: updateProgress });
        sources.push(result);
      }
      return { sources, wordAnchors: sources.flatMap((result) => result.words || []) };
    }

    if (stage === 'aligned') {
      if (typeof services.alignWords === 'function') return services.alignWords(context);
      const adapter = services.alignmentAdapter;
      const align = typeof adapter === 'function' ? adapter : adapter?.align;
      if (typeof align !== 'function') throw new ReelsV2AlignmentUnavailableError();
      const transcribed = state.transcribed?.sources || [];
      const bySource = new Map(transcribed.map((entry) => [entry.sourceId, entry]));
      const sources = [];
      for (const source of sourceList(job)) {
        const transcript = bySource.get(source.id);
        if (!transcript) {
          throw new ReelsV2PipelineError(`Source ${source.id} has no transcript to align.`, {
            code: 'REELS_V2_TRANSCRIPT_MISSING', status: 422, stage,
          });
        }
        sources.push(await align({ source, transcript, signal }));
      }
      return { sources, wordAnchors: sources.flatMap((result) => result.wordAnchors || result.words || []) };
    }

    if (stage === 'cleanup_proposed') {
      if (typeof services.proposeCleanup === 'function') return services.proposeCleanup({ ...context, cleanupProfile: profile });
      return proposePauseCleanup({
        silences: allSilences(state),
        wordAnchors: allWordAnchors(state),
        profile,
      });
    }

    if (stage === 'cleanup_applied') {
      if (typeof services.applyCleanup === 'function') return services.applyCleanup({ ...context, cleanupProfile: profile });
      return applyCleanupDecisions({
        candidates: state.cleanup_proposed?.candidates || [],
        decisions: job.request?.cleanupDecisions || [],
        protectedWordIds: job.request?.protectedWordIds || [],
        wordAnchors: allWordAnchors(state),
        profile,
      });
    }

    if (stage === 'story_planned') {
      const plannerContext = {
        wordAnchors: allWordAnchors(state),
        cleanupCandidates: state.cleanup_proposed?.candidates || [],
        sources: sourceList(job),
      };
      const selectedProvider = resolveSelectedProvider({
        provider: job.request?.provider,
        model: job.request?.model,
      });
      const plannerInput = {
        ...context,
        context: plannerContext,
        provider: selectedProvider.provider,
        model: selectedProvider.model,
        request: job.request || {},
      };
      const result = typeof services.planStory === 'function'
        ? await services.planStory(plannerInput)
        : await (planner?.plan ? planner.plan(plannerInput) : Promise.reject(new ReelsV2PipelineError('The selected AI planner is not configured.', {
          code: 'REELS_V2_PROVIDER_ADAPTER_MISSING', status: 503, stage,
        })));
      return normalisePlannerStageResult(result, plannerInput);
    }

    if (stage === 'preview_rendered') return requireService(services, 'renderPreview', stage)(context);
    if (stage === 'export_rendered') return requireService(services, 'renderExport', stage)(context);
    if (stage === 'validated') return requireService(services, 'validateOutput', stage)(context);
    throw new ReelsV2PipelineError(`Unknown Reels v2 stage: ${stage}`, { code: 'REELS_V2_STAGE_INVALID', status: 500, stage });
  };

  return Object.freeze({
    stages: REELS_V2_STAGES,
    async run(jobId, { signal, resume = true } = {}) {
      let job = await repository.getJob(jobId);
      if (!job) throw new ReelsV2PipelineError('Reels v2 job not found.', { code: 'REELS_V2_JOB_NOT_FOUND', status: 404 });
      if (job.status === 'succeeded' || job.status === 'cancelled') return job;
      if (job.status === 'failed' && !resume) {
        throw new ReelsV2PipelineError('This Reels v2 job failed and must be explicitly resumed.', {
          code: 'REELS_V2_JOB_FAILED', status: 409, stage: job.stage,
        });
      }

      job = await persist(job, { status: 'running', error: null, updatedAt: nowIso(clock) });
      await event(job, 'job_started');
      let currentStage = nextStage(job);
      try {
        while (currentStage) {
          await checkCancelled(job, signal);
          job = await persist(job, {
            status: 'running',
            stage: currentStage,
            progress: STAGE_PROGRESS[currentStage],
            updatedAt: nowIso(clock),
          });
          await event(job, 'stage_started', { stage: currentStage });
          const state = job.state || {};
          const stageStart = STAGE_PROGRESS[currentStage];
          const stageEnd = currentStage === 'validated' ? 1 : STAGE_PROGRESS[REELS_V2_STAGES[REELS_V2_STAGES.indexOf(currentStage) + 1]];
          const updateProgress = async (fraction) => {
            const safeFraction = Math.max(0, Math.min(1, Number(fraction) || 0));
            job = await persist(job, {
              progress: stageStart + (stageEnd - stageStart) * safeFraction,
              updatedAt: nowIso(clock),
            });
          };
          const result = await runStage(currentStage, {
            job,
            state,
            signal,
            cleanupProfile: resolveCleanupProfile(job.request?.cleanupProfile || 'natural'),
            updateProgress,
            checkCancelled: () => checkCancelled(job, signal),
          });
          await checkCancelled(job, signal);
          const nextState = {
            ...state,
            [currentStage]: { ...result, completedAt: nowIso(clock) },
          };
          job = await persist(job, {
            state: nextState,
            stage: currentStage,
            progress: stageEnd,
            updatedAt: nowIso(clock),
          });
          await event(job, 'stage_completed', { stage: currentStage });
          currentStage = nextStage(job);
        }
        job = await persist(job, {
          status: 'succeeded',
          stage: 'validated',
          progress: 1,
          error: null,
          finishedAt: nowIso(clock),
          updatedAt: nowIso(clock),
        });
        await event(job, 'job_succeeded');
        return job;
      } catch (cause) {
        const error = makeStageError(currentStage || job.stage, cause);
        const cancelled = error.code === 'ECANCELLED';
        job = await persist(job, {
          status: cancelled ? 'cancelled' : 'failed',
          stage: error.stage || currentStage || job.stage,
          error: cancelled ? null : safeError(error),
          finishedAt: nowIso(clock),
          updatedAt: nowIso(clock),
        });
        await event(job, cancelled ? 'job_cancelled' : 'job_failed', { error: cancelled ? null : safeError(error) });
        throw error;
      }
    },
  });
}
