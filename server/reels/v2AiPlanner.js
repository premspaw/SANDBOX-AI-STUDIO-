/**
 * Reels v2 AI planning contract.
 *
 * This module intentionally does not create SDK clients or choose a backup
 * provider.  The caller supplies the adapter for the provider selected by the
 * user, which keeps provider choice, model provenance, and failure handling
 * explicit and testable.
 */
import { z } from 'zod';

export const REELS_V2_PLAN_SCHEMA_VERSION = 2;

export const SUPPORTED_SCENE_COMPONENTS = Object.freeze([
  'emphasis_text',
  'ordered_cards',
  'process_arrows',
  'comparison',
  'concept_diagram',
  'speaker_inset',
]);

const Id = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, 'Invalid identifier');
const NullableText = z.string().trim().max(2_000).nullable();

export const WordAnchorSchema = z.strictObject({
  wordId: Id,
  sourceId: Id,
  startUs: z.number().int().nonnegative(),
  endUs: z.number().int().positive(),
  text: z.string().trim().min(1).max(200),
  alignmentQuality: z.enum(['exact', 'high', 'medium', 'low']),
});

const WordRangeSchema = z.strictObject({
  startWordId: Id,
  endWordId: Id,
});

const CleanupDecisionSchema = z.strictObject({
  candidateId: Id,
  decision: z.enum(['remove', 'keep']),
  rationale: NullableText,
});

const CaptionSchema = z.strictObject({
  id: Id.optional(),
  text: z.string().trim().min(1).max(240),
  ...WordRangeSchema.shape,
});

const SceneSchema = z.strictObject({
  id: Id.optional(),
  component: z.enum(SUPPORTED_SCENE_COMPONENTS),
  ...WordRangeSchema.shape,
  /** Renderer-specific, JSON-only properties.  Their meaning is owned by the scene registry. */
  props: z.record(z.string().max(80), z.unknown()).default({}),
});

/**
 * Structured output accepted from an AI planner.  There are deliberately no
 * generic visual defaults here: an empty captions/scenes list is valid.
 */
export const ReelsV2PlannerOutputSchema = z.strictObject({
  schemaVersion: z.literal(REELS_V2_PLAN_SCHEMA_VERSION),
  summary: NullableText,
  cleanupDecisions: z.array(CleanupDecisionSchema).max(1_000),
  protectedWordIds: z.array(Id).max(2_000),
  captions: z.array(CaptionSchema).max(2_000),
  scenes: z.array(SceneSchema).max(300),
});

export class ReelsV2PlannerError extends Error {
  constructor(message, { code = 'REELS_V2_PLANNER_ERROR', status = 422, details, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ReelsV2PlannerError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ReelsV2ProviderError extends ReelsV2PlannerError {
  constructor(message, options = {}) {
    super(message, { code: 'REELS_V2_PROVIDER_UNAVAILABLE', status: 503, ...options });
    this.name = 'ReelsV2ProviderError';
  }
}

const PROVIDER_DEFAULT_MODELS = Object.freeze({
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-flash',
});

const PROVIDER_ENV_KEYS = Object.freeze({
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
});

export function isSupportedProvider(provider) {
  return Object.hasOwn(PROVIDER_DEFAULT_MODELS, provider);
}

/**
 * Resolve exactly one explicitly requested provider.  This function never
 * searches for another configured provider, which prevents silent fallbacks.
 */
export function resolveSelectedProvider({ provider, model, env = process.env } = {}) {
  if (!isSupportedProvider(provider)) {
    throw new ReelsV2PlannerError('Select either the OpenAI or Gemini provider.', {
      code: 'REELS_V2_PROVIDER_INVALID',
      status: 400,
    });
  }

  const envModel = provider === 'openai' ? env.REELS_OPENAI_MODEL : env.REELS_GEMINI_MODEL;
  const selectedModel = String(model || envModel || PROVIDER_DEFAULT_MODELS[provider]).trim();
  if (!selectedModel || selectedModel.length > 160) {
    throw new ReelsV2PlannerError('The selected AI model is invalid.', {
      code: 'REELS_V2_MODEL_INVALID',
      status: 400,
    });
  }

  const credentialKey = PROVIDER_ENV_KEYS[provider];
  return Object.freeze({
    provider,
    model: selectedModel,
    credentialKey,
    configured: Boolean(env[credentialKey]),
  });
}

function parsePlannerOutput(raw) {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (cause) {
      throw new ReelsV2PlannerError('The AI provider returned invalid JSON.', {
        code: 'REELS_V2_PLAN_JSON_INVALID',
        status: 422,
        cause,
      });
    }
  }
  return raw;
}

function anchorMap(wordAnchors = []) {
  const map = new Map();
  const ordered = [];
  for (const rawAnchor of wordAnchors) {
    const parsed = WordAnchorSchema.safeParse(rawAnchor);
    if (!parsed.success) {
      throw new ReelsV2PlannerError('The transcript contains an invalid word anchor.', {
        code: 'REELS_V2_WORD_ANCHOR_INVALID',
        details: parsed.error.flatten(),
      });
    }
    const anchor = parsed.data;
    if (anchor.endUs <= anchor.startUs || map.has(anchor.wordId)) {
      throw new ReelsV2PlannerError('The transcript contains duplicate or reversed word anchors.', {
        code: 'REELS_V2_WORD_ANCHOR_INVALID',
      });
    }
    map.set(anchor.wordId, anchor);
    ordered.push(anchor.wordId);
  }
  return { map, index: new Map(ordered.map((id, position) => [id, position])) };
}

function assertWordRange(range, anchors, label) {
  const start = anchors.map.get(range.startWordId);
  const end = anchors.map.get(range.endWordId);
  if (!start || !end) {
    throw new ReelsV2PlannerError(`${label} references a word that is not in this project.`, {
      code: 'REELS_V2_PLAN_ANCHOR_UNKNOWN',
      details: { startWordId: range.startWordId, endWordId: range.endWordId },
    });
  }
  if (anchors.index.get(range.startWordId) > anchors.index.get(range.endWordId)) {
    throw new ReelsV2PlannerError(`${label} ends before it starts.`, {
      code: 'REELS_V2_PLAN_ANCHOR_ORDER',
    });
  }
  if (start.sourceId !== end.sourceId) {
    throw new ReelsV2PlannerError(`${label} cannot cross source videos.`, {
      code: 'REELS_V2_PLAN_ANCHOR_SOURCE',
    });
  }
}

/**
 * Parse and validate a plan against server-owned transcript/candidate IDs.
 * It rejects unknown scene types, unknown anchors, duplicate decisions, and
 * malformed output before anything can create a project revision.
 */
export function validatePlannerOutput(raw, { wordAnchors = [], cleanupCandidates = [] } = {}) {
  const parsed = ReelsV2PlannerOutputSchema.safeParse(parsePlannerOutput(raw));
  if (!parsed.success) {
    throw new ReelsV2PlannerError('The AI plan does not match the Reels v2 contract.', {
      code: 'REELS_V2_PLAN_SCHEMA_INVALID',
      details: parsed.error.flatten(),
    });
  }

  const plan = parsed.data;
  const anchors = anchorMap(wordAnchors);
  const candidateIds = new Set(cleanupCandidates.map((candidate) => candidate?.id).filter(Boolean));
  const seenDecisions = new Set();

  for (const decision of plan.cleanupDecisions) {
    if (!candidateIds.has(decision.candidateId)) {
      throw new ReelsV2PlannerError('The AI plan referenced an unknown cleanup candidate.', {
        code: 'REELS_V2_CLEANUP_CANDIDATE_UNKNOWN',
        details: { candidateId: decision.candidateId },
      });
    }
    if (seenDecisions.has(decision.candidateId)) {
      throw new ReelsV2PlannerError('The AI plan decided the same cleanup candidate more than once.', {
        code: 'REELS_V2_CLEANUP_DECISION_DUPLICATE',
        details: { candidateId: decision.candidateId },
      });
    }
    seenDecisions.add(decision.candidateId);
  }

  for (const wordId of plan.protectedWordIds) {
    if (!anchors.map.has(wordId)) {
      throw new ReelsV2PlannerError('The AI plan protected a word that is not in this project.', {
        code: 'REELS_V2_PLAN_ANCHOR_UNKNOWN',
        details: { wordId },
      });
    }
  }
  for (const caption of plan.captions) assertWordRange(caption, anchors, 'Caption');
  for (const scene of plan.scenes) assertWordRange(scene, anchors, 'Scene');

  return plan;
}

function validateProvenance(provenance, selected) {
  if (!provenance || provenance.provider !== selected.provider || provenance.model !== selected.model) {
    throw new ReelsV2PlannerError('The AI adapter did not report the selected provider and model.', {
      code: 'REELS_V2_PROVENANCE_INVALID',
      status: 502,
    });
  }
  return Object.freeze({
    provider: selected.provider,
    model: selected.model,
    requestId: provenance.requestId ? String(provenance.requestId).slice(0, 200) : null,
    promptVersion: provenance.promptVersion ? String(provenance.promptVersion).slice(0, 80) : 'reels-v2',
    generatedAt: provenance.generatedAt || new Date().toISOString(),
  });
}

/**
 * Invoke the selected adapter exactly once.  An adapter receives only text
 * evidence/frame references supplied by the caller; raw footage is not
 * implicitly read or uploaded by this module.
 */
export async function planWithSelectedProvider({
  provider,
  model,
  adapters = {},
  context = {},
  request = {},
  env = process.env,
  now = () => new Date().toISOString(),
} = {}) {
  const selected = resolveSelectedProvider({ provider, model, env });
  const adapter = adapters[selected.provider];
  const invoke = typeof adapter === 'function' ? adapter : adapter?.plan;

  // A supplied adapter is the test/deployment injection boundary.  Without
  // one, do not pretend another provider can handle the request.
  if (!selected.configured && !adapter) {
    throw new ReelsV2ProviderError(`Configure ${selected.credentialKey} for the selected ${selected.provider} provider.`, {
      details: { provider: selected.provider, model: selected.model },
    });
  }
  if (typeof invoke !== 'function') {
    throw new ReelsV2ProviderError(`The selected ${selected.provider} planner is not configured.`, {
      code: 'REELS_V2_PROVIDER_ADAPTER_MISSING',
      details: { provider: selected.provider, model: selected.model },
    });
  }

  let result;
  try {
    result = await invoke({
      provider: selected.provider,
      model: selected.model,
      context,
      request,
    });
  } catch (cause) {
    throw new ReelsV2ProviderError(`The selected ${selected.provider} planner failed: ${cause?.message || 'unknown error'}`, {
      code: 'REELS_V2_PROVIDER_REQUEST_FAILED',
      cause,
      details: { provider: selected.provider, model: selected.model },
    });
  }

  const rawPlan = result?.plan ?? result?.output ?? result;
  const plan = validatePlannerOutput(rawPlan, context);
  const provenance = validateProvenance(result?.provenance || {
    provider: selected.provider,
    model: selected.model,
    generatedAt: now(),
  }, selected);
  return { plan, provenance };
}

/** A small adapter wrapper useful for dependency injection into the pipeline. */
export function createSelectedPlanner(options = {}) {
  return Object.freeze({
    plan: (input) => planWithSelectedProvider({ ...options, ...input }),
  });
}
