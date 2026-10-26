import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import OpenAI from 'openai';
import {GoogleGenAI} from '@google/genai';
import {FFMPEG, runProcess, LOCAL_MEDIA_INPUT} from './media.js';
import * as store from './store.js';

/**
 * Small mono speech files only; originals never leave the editor except for
 * the selected transcription provider.  Word anchors are kept with the
 * transcript so an edit can be tied to spoken evidence instead of guessed
 * positions on the timeline.
 */
export async function speechEvidence(project, ownerId, engine) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'reels-speech-'));
  try {
    const lines = [];
    const words = [];
    for (const source of project.sources) {
      if (!source.meta?.hasAudio) continue;
      const audio = path.join(dir, `${source.id}.mp3`);
      try {
        await runProcess(FFMPEG, [
          '-y',
          '-v',
          'error',
          '-threads',
          '1',
          ...LOCAL_MEDIA_INPUT,
          '-i',
          store.paths.media(ownerId, source.id),
          '-vn',
          '-ac',
          '1',
          '-ar',
          '16000',
          '-b:a',
          '32k',
          audio,
        ]);
      } catch (audioErr) {
        console.warn(`[REELS-SPEECH] Audio extract warning for ${source.id}:`, audioErr.message);
        continue;
      }

      let text;
      let timedWords = [];
      // Try Gemini 4 Argon on Vertex AI (location: global)
      if (engine !== 'openai') {
        const credPath = path.resolve('new-zerolens-api.json');
        if (fs.existsSync(credPath)) {
          process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
        }
        try {
          const ai = new GoogleGenAI({
            vertexai: true,
            project: process.env.GOOGLE_PROJECT_ID || 'new-zerolens-api',
            location: 'global',
          });
          const audioData = (await fsp.readFile(audio)).toString('base64');
          const r = await ai.models.generateContent({
            model: 'gemini-4-argon',
            contents: [
              {
                text: 'Transcribe this speech faithfully in its original language. Return only the spoken transcript.',
              },
              { inlineData: { mimeType: 'audio/mp3', data: audioData } },
            ],
          });
          text = r.text;
          console.log(`[REELS-SPEECH] Transcribed with Gemini 4 Argon: ${text?.slice(0, 60)}`);
        } catch (speechErr) {
          console.warn('[REELS-SPEECH] Gemini 4 Argon transcription warning:', speechErr.message);
        }
      }

      // If Gemini failed (e.g. 402 prepayment depleted or 403) or engine is openai, use Whisper
      if (!text && process.env.OPENAI_API_KEY) {
        try {
          const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90000, maxRetries: 1 });
          // whisper-1 is intentionally used here: it is the OpenAI
          // transcription model that returns word/segment timestamps in
          // verbose_json, which the edit planner needs for video timing.
          const r = await client.audio.transcriptions.create({
            file: fs.createReadStream(audio),
            model: process.env.REELS_TRANSCRIBE_MODEL || 'whisper-1',
            response_format: 'verbose_json',
            timestamp_granularities: ['word', 'segment'],
          });
          text = r.text;
          timedWords = Array.isArray(r.words) ? r.words.map((word, index) => ({
            sourceId: source.id,
            wordId: `${source.id}-${index}`,
            text: String(word.word || '').trim(),
            startSec: Number(word.start),
            endSec: Number(word.end),
          })).filter((word) => word.text && Number.isFinite(word.startSec) && Number.isFinite(word.endSec)) : [];
          console.log(`[REELS-SPEECH] Transcribed with Whisper for ${source.id}: ${text?.slice(0, 60)}`);
        } catch (whisperErr) {
          console.warn('[REELS-SPEECH] OpenAI Whisper transcription warning:', whisperErr.message);
        }
      }

      if (text) lines.push(text.trim());
      words.push(...timedWords);
    }
    // Project limits bound source duration. Never silently truncate spoken
    // evidence before the editor makes a decision.
    return { text: lines.join(' '), words };
  } finally {
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Compatibility helper for callers that only need the spoken text. */
export async function speechContext(project, ownerId, engine) {
  const evidence = await speechEvidence(project, ownerId, engine);
  return evidence.text;
}
