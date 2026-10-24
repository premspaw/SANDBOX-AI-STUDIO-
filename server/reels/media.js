/**
 * Media inspection and analysis helpers for the Reels editor.
 * All subprocesses use argument arrays (never a shell) and bounded timeouts.
 */
import { spawn } from 'child_process';
import { createReadStream } from 'fs';
import crypto from 'crypto';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

export const FFMPEG = process.env.REELS_FFMPEG_PATH || ffmpegPath;
export const FFPROBE = process.env.REELS_FFPROBE_PATH || ffprobeStatic.path;

/** Run a binary with an argument array, collecting bounded stdout/stderr. */
export function runProcess(bin, args, { cwd, timeoutMs = 120000, signal, onStdout, onSpawn, maxBuffer = 8 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    if (child.pid) onSpawn?.(child.pid);
    let stdout = '';
    let stderr = '';
    let killedReason = null;
    const kill = (reason) => {
      if (killedReason) return;
      killedReason = reason;
      child.kill('SIGKILL');
    };
    const timer = setTimeout(() => kill('timeout'), timeoutMs);
    const onAbort = () => kill('cancelled');
    signal?.addEventListener('abort', onAbort, { once: true });
    child.stdout.on('data', (d) => {
      const s = d.toString();
      if (onStdout) onStdout(s);
      if (stdout.length < maxBuffer) stdout += s;
    });
    child.stderr.on('data', (d) => {
      // Keep the tail of stderr — FFmpeg prints its real error last.
      stderr = (stderr + d.toString()).slice(-maxBuffer);
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      err.transient = err.code === 'EAGAIN' || err.code === 'EMFILE';
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (killedReason) {
        const err = new Error(killedReason === 'timeout' ? 'Processing timed out' : 'Cancelled');
        err.code = killedReason === 'timeout' ? 'ETIMEDOUT' : 'ECANCELLED';
        return reject(err);
      }
      if (code !== 0) {
        const err = new Error(`${bin.split(/[\\/]/).pop()} exited with code ${code}`);
        err.stderr = stderr.slice(-4000);
        return reject(err);
      }
      resolve({ stdout, stderr, pid: child.pid });
    });
  });
}

export function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    createReadStream(filePath)
      .on('data', (d) => hash.update(d))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')));
  });
}

const parseRate = (r) => {
  const [n, d] = String(r || '0/1').split('/').map(Number);
  return { num: Number.isFinite(n) ? n : 0, den: Number.isFinite(d) && d > 0 ? d : 1 };
};

/** Inspect a media file with ffprobe. Returns null when no video stream is present. */
export async function probeMedia(filePath) {
  const { stdout } = await runProcess(FFPROBE, [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath,
  ], { timeoutMs: 30000 });
  const info = JSON.parse(stdout);
  const v = info.streams?.find((s) => s.codec_type === 'video' && !s.disposition?.attached_pic);
  if (!v) return { hasVideo: false, raw: info };
  const a = info.streams.find((s) => s.codec_type === 'audio');
  let rotation = 0;
  const sd = v.side_data_list?.find((x) => x.rotation !== undefined);
  if (sd) rotation = Math.round(Number(sd.rotation));
  else if (v.tags?.rotate) rotation = Math.round(Number(v.tags.rotate));
  rotation = ((rotation % 360) + 360) % 360;
  const swap = rotation === 90 || rotation === 270;
  const avg = parseRate(v.avg_frame_rate);
  const real = parseRate(v.r_frame_rate);
  const fpsOk = avg.num > 0 ? avg : real;
  const avgFps = avg.num / avg.den;
  const realFps = real.num / real.den;
  const durationSec = Number(info.format?.duration || v.duration || 0);
  return {
    hasVideo: true,
    durationSec,
    width: swap ? v.height : v.width,
    height: swap ? v.width : v.height,
    rotation,
    fpsNum: fpsOk.num || 30,
    fpsDen: fpsOk.den || 1,
    variableFrameRate: avg.num > 0 && real.num > 0 && Math.abs(avgFps - realFps) > 0.5,
    hasAudio: Boolean(a),
    videoCodec: String(v.codec_name || 'unknown').slice(0, 40),
    audioCodec: a ? String(a.codec_name || 'unknown').slice(0, 40) : null,
    colorTransfer: v.color_transfer || null,
    isHdr: ['smpte2084', 'arib-std-b67'].includes(v.color_transfer),
    sizeBytes: Number(info.format?.size || 0),
    raw: info,
  };
}

/**
 * Acoustic silence detection. This finds quiet audio only — it is NOT a
 * semantic analysis of repetition or story relevance.
 */
export async function detectSilence(filePath, { noiseDb = -35, minSilenceSec = 0.6, durationSec, signal } = {}) {
  const nd = Math.max(-70, Math.min(-10, Number(noiseDb)));
  const md = Math.max(0.2, Math.min(5, Number(minSilenceSec)));
  const { stderr } = await runProcess(FFMPEG, [
    '-hide_banner', '-nostats', '-i', filePath, '-map', '0:a:0',
    '-af', `silencedetect=noise=${nd}dB:d=${md}`, '-f', 'null', '-',
  ], { timeoutMs: 120000, signal, maxBuffer: 2 * 1024 * 1024 });
  const silences = [];
  let start = null;
  for (const line of stderr.split(/\r?\n/)) {
    const s = line.match(/silence_start:\s*(-?[\d.]+)/);
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (s) start = Math.max(0, Number(s[1]));
    if (e && start !== null) { silences.push({ startSec: start, endSec: Number(e[1]) }); start = null; }
  }
  if (start !== null && durationSec) silences.push({ startSec: start, endSec: durationSec });
  return silences;
}
