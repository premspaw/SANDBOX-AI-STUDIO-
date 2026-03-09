import fs from 'fs';
import path from 'path';
import nodeFetch from 'node-fetch';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { fileURLToPath } from 'url';
import * as audioService from './audioService.js';
import * as storageService from './storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Master Ad Compiler:
 * 1. Generates TTS Voiceover from script.
 * 2. Downloads Veo video clips.
 * 3. Stitches clips, adds voiceover, and mixes background music.
 * 4. Uploads final export to Supabase/GCS.
 */
export const compileUGCAd = async (taskId, script, sceneVideos, bgMusicPath, progressCallback) => {
    const tempDir = path.join(__dirname, 'temp', taskId);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const cleanup = () => {
        try {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                console.log(`[EXPORT] Cleaned up temp directory: ${tempDir}`);
            }
        } catch (e) {
            console.error(`[EXPORT] Cleanup failed:`, e);
        }
    };

    try {
        console.log(`[EXPORT] Starting Ad Compilation for Task: ${taskId}`);
        if (progressCallback) progressCallback(1, 5, 'Synthesizing voiceover...');

        // 1. Voiceover Generation
        const ttsResult = await audioService.synthesizeSpeech(script.fullScript || script.hook);
        if (!ttsResult.success) throw new Error(`TTS Failed: ${ttsResult.error}`);

        const voiceoverPath = path.join(tempDir, 'voiceover.mp3');
        fs.writeFileSync(voiceoverPath, Buffer.from(ttsResult.audioContent, 'base64'));
        console.log(`[EXPORT] Voiceover ready: ${voiceoverPath}`);

        if (progressCallback) progressCallback(2, 5, 'Downloading video sequences...');

        // 2. Asset Collection (Videos)
        const videoPaths = [];
        for (let i = 0; i < sceneVideos.length; i++) {
            const url = sceneVideos[i];
            const localPath = path.join(tempDir, `scene_${i}.mp4`);

            console.log(`[EXPORT] Downloading scene ${i}: ${url}`);
            const res = await nodeFetch(url);
            const buffer = await res.buffer();
            fs.writeFileSync(localPath, buffer);
            videoPaths.push(localPath);
        }

        if (progressCallback) progressCallback(3, 5, 'Assembling cinematic timeline...');

        // 3. FFmpeg Processing
        const finalOutputPath = path.join(tempDir, 'final_ugc_ad.mp4');
        const hasMusic = bgMusicPath && fs.existsSync(bgMusicPath);

        await new Promise((resolve, reject) => {
            let command = ffmpeg();

            // Add Video Inputs
            videoPaths.forEach(p => {
                command = command.input(p);
            });

            // Add Voiceover Input
            command = command.input(voiceoverPath);

            // Add Background Music if provided
            if (hasMusic) {
                command = command.input(bgMusicPath);
            }

            // Complex Filter for Concatenation + Audio Mixing
            // [0:v][1:v][2:v][3:v] concat=n=4:v=1:a=0 [v_out]
            // Ducking: Voiceover is loud, Music is low
            const vInputs = videoPaths.map((_, i) => `[${i}:v]`).join('');
            const voiceIdx = videoPaths.length;
            const musicIdx = voiceIdx + 1;

            const filters = [
                `${vInputs} concat=n=${videoPaths.length}:v=1:a=0 [v_out]`
            ];

            if (hasMusic) {
                filters.push(`[${musicIdx}:a] volume=0.12 [bg_low]`);
                filters.push(`[${voiceIdx}:a][bg_low] amix=inputs=2:duration=first [a_out]`);
            } else {
                filters.push(`[${voiceIdx}:a] volume=1.0 [a_out]`);
            }

            command
                .complexFilter(filters, ['v_out', 'a_out'])
                .outputOptions([
                    '-map [v_out]',
                    '-map [a_out]',
                    '-c:v libx264',
                    '-preset medium',
                    '-crf 20',
                    '-c:a aac',
                    '-b:a 192k',
                    '-pix_fmt yuv420p',
                    '-movflags +faststart'
                ])
                .on('start', (cmd) => console.log('[FFMPEG] Command:', cmd))
                .on('error', (err) => {
                    console.error('[FFMPEG] Error:', err);
                    reject(err);
                })
                .on('end', () => {
                    console.log('[FFMPEG] Render complete');
                    resolve();
                })
                .save(finalOutputPath);
        });

        if (progressCallback) progressCallback(4, 5, 'Vaulting final asset...');

        // 4. Upload to Supabase/GCS
        const finalBuffer = fs.readFileSync(finalOutputPath);
        const fileName = `final_ugc_ad_${Date.now()}.mp4`;
        const uploadUrl = await storageService.uploadToGCS(finalBuffer, fileName, 'video/mp4');

        if (progressCallback) progressCallback(5, 5, 'Ad materialization successful!');

        cleanup();
        return { success: true, url: uploadUrl, filename: fileName };

    } catch (error) {
        console.error(`[EXPORT] Compilation Fatal:`, error);
        cleanup();
        throw error;
    }
};
