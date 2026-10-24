/**
 * Renderer adapter: canonical project → FFmpeg filter graph.
 *
 * Pure function (no I/O) so it can be unit-tested. FFmpeg handles trims,
 * speed, framing, audio processing, text layers and encoding. Text overlays use
 * drawtext with frame-indexed (`n`) expressions that mirror overlayStateAt() in
 * the shared edit plan, so preview and export use the same timing formulas.
 *
 * User text never enters the filter graph: it is written to per-layer text
 * files read with expansion=none.
 */
import { buildTimeline, FONTS, SLIDE_DISTANCE, RENDERER } from '../../src/features/ReelsEditor/core/editPlan.js';

export const PROFILES = Object.freeze({
  export: { width: 1080, height: 1920, crf: 20, preset: 'veryfast', audioBitrate: '160k' },
  preview: { width: 540, height: 960, crf: 30, preset: 'ultrafast', audioBitrate: '96k' },
});

const f6 = (n) => Number(n).toFixed(6);

function atempoChain(speed) {
  const parts = [];
  let s = speed;
  while (s > 2) { parts.push(2); s /= 2; }
  while (s < 0.5) { parts.push(0.5); s /= 0.5; }
  parts.push(s);
  return parts.filter((v) => Math.abs(v - 1) > 1e-6).map((v) => `atempo=${f6(v)}`);
}

function framing(crop, W, H) {
  if (crop.mode === 'fit') {
    return [
      `scale=${W}:${H}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
      `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black`,
    ];
  }
  const zw = Math.round((W * crop.zoom) / 2) * 2;
  const zh = Math.round((H * crop.zoom) / 2) * 2;
  return [
    `scale=${zw}:${zh}:force_original_aspect_ratio=increase:force_divisible_by=2`,
    `crop=${W}:${H}:(iw-${W})*${f6(crop.focusX)}:(ih-${H})*${f6(crop.focusY)}`,
  ];
}

/** Padding around boxed text, shared with the browser preview. */
export const boxPadding = (fontSize) => Math.round(fontSize * 0.28);

function drawtext(overlay, textFile, W, H) {
  const s = overlay.style;
  const S = overlay.startFrame;
  const E = overlay.startFrame + overlay.durationFrames;
  const D = overlay.animation.durationFrames;
  const anim = D > 0 ? overlay.animation.in : 'none';
  const pIn = `clip((n-${S})/${D},0,1)`;
  const pOut = `clip((${E}-n)/${D},0,1)`;
  const alpha = anim === 'none' ? '1' : `min(${pIn},${pOut})`;
  const slide = anim === 'slide-up' ? `+${SLIDE_DISTANCE}*pow(1-${pIn},2)` : '';
  const opts = [
    `fontfile=${FONTS[s.font].file}`,
    `textfile=${textFile}`,
    'expansion=none',
    `fontsize=${s.fontSize}`,
    `fontcolor=0x${s.color.slice(1)}`,
    'text_align=C',
    `line_spacing=${Math.round(s.fontSize * 0.12)}`,
    `x='${W}*${f6(s.x)}-text_w/2'`,
    `y='${H}*${f6(s.y)}-text_h/2${slide}'`,
    `alpha='${alpha}'`,
    `enable='between(n,${S},${E - 1})'`,
  ];
  if (s.boxOpacity > 0) {
    opts.push('box=1', `boxcolor=0x${s.boxColor.slice(1)}@${s.boxOpacity.toFixed(3)}`, `boxborderw=${boxPadding(s.fontSize)}`);
  }
  return `drawtext=${opts.join(':')}`;
}

/**
 * @param project   validated canonical project (snapshot)
 * @param options.sourcePaths Map<sourceId, absolutePath>
 * @param options.profile 'export' | 'preview'
 * @param options.range optional { startFrame, endFrame } for short previews
 */
export function buildRenderPlan(project, { sourcePaths, profile = 'export', range = null }) {
  let prof = PROFILES[profile];
  if (!prof) throw new Error(`Unknown profile ${profile}`);
  const W = project.canvas.width;
  const H = project.canvas.height;
  const scale = profile === 'preview' ? Math.min(1, 960 / Math.max(W, H)) : 1;
  prof = {...prof, width: Math.round(W * scale / 2) * 2, height: Math.round(H * scale / 2) * 2};
  const tl = buildTimeline(project);
  if (!tl.segments.length) throw new Error('Nothing to render');
  const fps = tl.fps;
  const sources = new Map(project.sources.map((s) => [s.id, s]));

  const inputOrder = [...new Set(tl.segments.map((s) => s.sourceId))];
  const inputIndex = new Map(inputOrder.map((id, i) => [id, i]));
  const inputs = inputOrder.map((id) => {
    const p = sourcePaths.get(id);
    if (!p) throw new Error(`Missing source file for ${id}`);
    return p;
  });
  const hasAudio = tl.segments.some((s) => sources.get(s.sourceId).meta.hasAudio);

  const chains = [];
  const concatInputs = [];
  tl.segments.forEach((seg, i) => {
    const clip = project.clips[seg.clipIndex];
    const src = sources.get(seg.sourceId);
    const k = inputIndex.get(seg.sourceId);
    const frames = seg.endFrame - seg.startFrame;
    const D = frames / fps;
    const fadeIn = Math.min(clip.fadeInSec, D / 2);
    const fadeOut = Math.min(clip.fadeOutSec, D / 2);

    const v = [
      `trim=start=${f6(seg.inSec)}:end=${f6(seg.outSec)}`,
      `setpts=(PTS-STARTPTS)/${f6(seg.speed)}`,
      `fps=${fps}`,
      ...framing(clip.crop, W, H),
      'setsar=1',
      'format=yuv420p',
      // Clone the last frame if rounding left us short, then cut to the exact frame count.
      'tpad=stop_mode=clone:stop_duration=0.5',
      `trim=end_frame=${frames}`,
      'setpts=PTS-STARTPTS',
    ];
    if (fadeIn > 0) v.push(`fade=t=in:st=0:d=${f6(fadeIn)}`);
    if (fadeOut > 0) v.push(`fade=t=out:st=${f6(D - fadeOut)}:d=${f6(fadeOut)}`);
    chains.push(`[${k}:v]${v.join(',')}[v${i}]`);
    concatInputs.push(`[v${i}]`);

    if (hasAudio) {
      let a;
      if (src.meta.hasAudio && clip.audioPolicy !== 'mute') {
        a = [
          `atrim=start=${f6(seg.inSec)}:end=${f6(seg.outSec)}`,
          'asetpts=PTS-STARTPTS',
          ...atempoChain(seg.speed),
          'aresample=48000',
          'aformat=sample_fmts=fltp:channel_layouts=stereo',
          `volume=${clip.muted ? 0 : f6(clip.volume)}`,
        ];
        if (fadeIn > 0) a.push(`afade=t=in:st=0:d=${f6(fadeIn)}`);
        if (fadeOut > 0) a.push(`afade=t=out:st=${f6(D - fadeOut)}:d=${f6(fadeOut)}`);
        a.push('apad', `atrim=duration=${f6(D)}`, 'asetpts=PTS-STARTPTS');
        chains.push(`[${k}:a]${a.join(',')}[a${i}]`);
      } else {
        chains.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${f6(D)},aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`);
      }
      concatInputs.push(`[a${i}]`);
    }
  });

  const n = tl.segments.length;
  chains.push(`${concatInputs.join('')}concat=n=${n}:v=1:a=${hasAudio ? 1 : 0}[vc]${hasAudio ? '[ac]' : ''}`);

  // Text layers on the 1080×1920 composition, before any preview downscale.
  const textFiles = [];
  const fonts = new Set();
  const post = [];
  project.overlays
    .filter((o) => !o.needsReview && o.startFrame < tl.totalFrames)
    .forEach((o, j) => {
      const name = `layer${j}.txt`;
      textFiles.push({ name, content: o.text });
      fonts.add(FONTS[o.style.font].file);
      post.push(drawtext(o, name, W, H));
    });
  if (range) post.push(`trim=start_frame=${range.startFrame}:end_frame=${range.endFrame}`, 'setpts=PTS-STARTPTS');
  if (prof.width !== W) post.push(`scale=${prof.width}:${prof.height}:flags=bicubic`);
  post.push('format=yuv420p');
  chains.push(`[vc]${post.join(',')}[vout]`);

  if (hasAudio) {
    const a = [];
    if (project.audio.denoise.enabled) {
      // Conservative FFT denoise; stronger values start to smear speech.
      a.push(`afftdn=nr=${project.audio.denoise.strength === 'medium' ? 18 : 10}:nf=-40`);
    }
    if (project.audio.normalize.enabled) {
      a.push(`loudnorm=I=${project.audio.normalize.targetLufs}:TP=-1.5:LRA=11`);
    }
    if (range) a.push(`atrim=start=${f6(range.startFrame / fps)}:end=${f6(range.endFrame / fps)}`, 'asetpts=PTS-STARTPTS');
    a.push('aresample=48000');
    chains.push(`[ac]${a.join(',')}[aout]`);
  }

  const durationSec = range ? (range.endFrame - range.startFrame) / fps : tl.durationSec;
  const threads = String(Math.max(1, Number(process.env.REELS_FFMPEG_THREADS) || 2));
  const args = [
    '-hide_banner', '-nostdin', '-y',
    ...inputs.flatMap((p) => ['-i', p]),
    '-filter_complex_threads', '1',
    '-filter_complex_script', 'graph.txt',
    '-map', '[vout]',
    ...(hasAudio ? ['-map', '[aout]'] : []),
    '-c:v', 'libx264', '-preset', prof.preset, '-crf', String(prof.crf),
    '-pix_fmt', 'yuv420p', '-r', String(fps), '-fps_mode', 'cfr',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    ...(hasAudio ? ['-c:a', 'aac', '-b:a', prof.audioBitrate, '-ar', '48000'] : []),
    '-t', f6(durationSec),
    '-threads', threads,
    '-movflags', '+faststart',
    '-metadata', `comment=zerolens ${RENDERER.name}@${RENDERER.version} project=${project.id} rev=${project.revision}`,
    '-progress', 'pipe:1', '-nostats',
    'out.mp4',
  ];

  return {
    args,
    filterScript: chains.join(';\n'),
    textFiles,
    fonts: [...fonts],
    durationSec,
    hasAudio,
    width: prof.width,
    height: prof.height,
    fps,
  };
}
