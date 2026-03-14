import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

// Optional: Fallback to a mock queue if Redis isn't connected so we don't crash
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let connection;
try {
    connection = new IORedis(REDIS_URL, {
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
            // Reconnect after
            return Math.min(times * 50, 2000);
        }
    });

    connection.on('error', (err) => {
        console.warn('[REDIS] Connection error - Ensure Redis is running for Queue features.');
    });
} catch (e) {
    console.warn('[REDIS] Failed to initialize connection.');
}

// ── VEO VIDEO GENERATION QUEUE ──
export const videoGenerationQueue = new Queue('VeoVideoGeneration', { connection });

// ── WORKER SETUP ──
// This is where we safely process queued requests asynchronously 
export const videoWorker = new Worker('VeoVideoGeneration', async job => {
    console.log(`[QUEUE] Processing video job: ${job.id}`);
    
    // In a full implementation, you would move the generateVideos SDK call here
    // Example: await client.models.generateVideos(...)
    
    // Simulate generation time
    await new Promise(r => setTimeout(r, 2000));
    
    console.log(`[QUEUE] Finished video job: ${job.id}`);
    return { status: 'success', jobId: job.id };
}, { connection, concurrency: 5 }); // Process up to 5 videos concurrently

// Handle Worker Events
videoWorker.on('completed', job => {
    console.log(`[QUEUE] Job ${job.id} has completed!`);
});

videoWorker.on('failed', (job, err) => {
    console.error(`[QUEUE] Job ${job.id} has failed with ${err.message}`);
});

export const addVideoJob = async (data) => {
    return videoGenerationQueue.add('generate', data, {
        attempts: 3,  // Retry 3 times
        backoff: {    // Wait 5 seconds between retries
            type: 'fixed',
            delay: 5000
        }
    });
};
