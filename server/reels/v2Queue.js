/**
 * Optional BullMQ transport for Reels v2 jobs.
 *
 * Job records remain the source of truth in the repository.  Redis only
 * transports a small `{ jobId }` message to a dedicated worker process.  No
 * Redis connection is made at module import time, and a missing/unavailable
 * Redis configuration produces an explicit disabled transport rather than an
 * in-process fallback.
 */
export const REELS_V2_QUEUE_NAME = 'reels-v2';
export const REELS_V2_QUEUE_JOB_NAME = 'process-reels-v2';

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const QUEUE_RE = /^[A-Za-z0-9:_-]{1,128}$/;

export class ReelsV2QueueError extends Error {
  constructor(message, { code = 'REELS_V2_QUEUE_UNAVAILABLE', status = 503, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ReelsV2QueueError';
    this.code = code;
    this.status = status;
  }
}

export function getReelsV2RedisUrl(env = process.env) {
  const value = env?.REELS_REDIS_URL || env?.REDIS_URL || '';
  return String(value).trim() || null;
}

/** Build an ioredis-compatible connection object without exposing credentials. */
export function createRedisConnection(redisUrl) {
  let url;
  try {
    url = new URL(redisUrl);
  } catch (cause) {
    throw new ReelsV2QueueError('REELS_REDIS_URL is not a valid Redis URL.', {
      code: 'REELS_V2_REDIS_URL_INVALID', status: 500, cause,
    });
  }
  if (!['redis:', 'rediss:'].includes(url.protocol) || !url.hostname) {
    throw new ReelsV2QueueError('REELS_REDIS_URL must use redis:// or rediss://.', {
      code: 'REELS_V2_REDIS_URL_INVALID', status: 500,
    });
  }
  const db = url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) : 0;
  if (!Number.isInteger(db) || db < 0) {
    throw new ReelsV2QueueError('REELS_REDIS_URL has an invalid Redis database number.', {
      code: 'REELS_V2_REDIS_URL_INVALID', status: 500,
    });
  }
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    db,
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    // BullMQ workers require this to be null; it is harmless for producers.
    maxRetriesPerRequest: null,
  };
}

function disabledQueue(reason) {
  return Object.freeze({
    enabled: false,
    queue: null,
    reason,
    async enqueue() {
      throw new ReelsV2QueueError(reason);
    },
    async close() {},
  });
}

function assertJobId(jobId) {
  if (!ID_RE.test(String(jobId || ''))) {
    throw new ReelsV2QueueError('Invalid Reels v2 job ID.', { code: 'REELS_V2_QUEUE_JOB_INVALID', status: 422 });
  }
  return String(jobId);
}

function attachErrorLogger(emitter, logger, label) {
  emitter?.on?.('error', (error) => logger?.warn?.(`[REELS-V2] ${label}: ${error?.message || error}`));
}

async function loadBullMq(injected) {
  if (injected) return injected;
  return import('bullmq');
}

/**
 * Lazily create a producer.  It returns a disabled object when Redis is not
 * configured or BullMQ cannot be initialised, so importing a web route cannot
 * crash development, Android builds, or a workerless deployment.
 */
export async function createReelsV2Queue({
  env = process.env,
  redisUrl = getReelsV2RedisUrl(env),
  queueName = REELS_V2_QUEUE_NAME,
  bullmq,
  logger = console,
} = {}) {
  if (!redisUrl) return disabledQueue('Reels v2 queue is unavailable: configure REELS_REDIS_URL.');
  if (!QUEUE_RE.test(queueName)) return disabledQueue('Reels v2 queue is unavailable: invalid queue name.');
  try {
    const lib = await loadBullMq(bullmq);
    if (typeof lib?.Queue !== 'function') throw new Error('BullMQ Queue export is unavailable.');
    const connection = createRedisConnection(redisUrl);
    const queue = new lib.Queue(queueName, {
      connection,
      defaultJobOptions: {
        attempts: Math.max(1, Number(env?.REELS_V2_QUEUE_ATTEMPTS) || 2),
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: { age: 86_400, count: 1_000 },
        removeOnFail: { age: 7 * 86_400, count: 5_000 },
      },
    });
    attachErrorLogger(queue, logger, 'queue connection error');
    return Object.freeze({
      enabled: true,
      queueName,
      queue,
      async enqueue(jobId, options = {}) {
        const id = assertJobId(jobId);
        return queue.add(REELS_V2_QUEUE_JOB_NAME, { jobId: id }, {
          jobId: id,
          ...options,
        });
      },
      async close() {
        await queue.close?.();
      },
    });
  } catch (error) {
    logger?.warn?.(`[REELS-V2] queue disabled: ${error?.message || error}`);
    return disabledQueue('Reels v2 queue is unavailable. Check REELS_REDIS_URL and Redis connectivity.');
  }
}

/** Enqueue only a persisted job ID; source URLs, credentials, and plans never enter Redis payloads. */
export async function enqueueReelsV2Job(queueTransport, jobId, options) {
  if (!queueTransport?.enabled) {
    throw new ReelsV2QueueError(queueTransport?.reason || 'Reels v2 queue is unavailable.');
  }
  return queueTransport.enqueue(jobId, options);
}

/**
 * Create the separate process worker.  Start this from a dedicated worker
 * entrypoint, not from the Express/web server.  `pipeline.run` is injected to
 * keep database and media details out of this transport module.
 */
export async function createReelsV2Worker({
  pipeline,
  processJob,
  env = process.env,
  redisUrl = getReelsV2RedisUrl(env),
  queueName = REELS_V2_QUEUE_NAME,
  bullmq,
  logger = console,
  concurrency = Math.max(1, Number(env?.REELS_V2_WORKER_CONCURRENCY) || 1),
} = {}) {
  if (!redisUrl) return disabledQueue('Reels v2 worker is disabled: configure REELS_REDIS_URL.');
  if (!QUEUE_RE.test(queueName)) return disabledQueue('Reels v2 worker is disabled: invalid queue name.');
  const runner = processJob || (pipeline?.run ? ((jobId) => pipeline.run(jobId)) : null);
  if (typeof runner !== 'function') {
    return disabledQueue('Reels v2 worker is disabled: provide pipeline.run or processJob.');
  }
  try {
    const lib = await loadBullMq(bullmq);
    if (typeof lib?.Worker !== 'function') throw new Error('BullMQ Worker export is unavailable.');
    const worker = new lib.Worker(queueName, async (bullJob) => {
      const jobId = assertJobId(bullJob?.data?.jobId);
      const result = await runner(jobId, { bullJob });
      return { jobId, status: result?.status || 'succeeded' };
    }, {
      connection: createRedisConnection(redisUrl),
      concurrency: Math.max(1, Math.floor(Number(concurrency) || 1)),
    });
    attachErrorLogger(worker, logger, 'worker connection error');
    return Object.freeze({
      enabled: true,
      queueName,
      worker,
      async close() {
        await worker.close?.();
      },
    });
  } catch (error) {
    logger?.warn?.(`[REELS-V2] worker disabled: ${error?.message || error}`);
    return disabledQueue('Reels v2 worker is unavailable. Check REELS_REDIS_URL and Redis connectivity.');
  }
}
