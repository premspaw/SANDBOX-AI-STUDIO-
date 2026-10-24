import {spawnSync} from 'node:child_process';

export function supportsReelsText(binary) {
  try {
    const result=spawnSync(binary,['-hide_banner','-h','filter=drawtext'],{
      encoding:'utf8',timeout:5000,maxBuffer:1024*1024,windowsHide:true,
    });
    const help=String(result.stdout||'')+String(result.stderr||'');
    return !result.error && result.status===0 && /\btextfile\b/.test(help) && /\btext_align\b/.test(help);
  } catch { return false; }
}

/** Explicit paths fail closed; otherwise prefer a capable bundle, then PATH. */
export function resolveReelsFfmpeg({configured,bundled,probe=supportsReelsText}={}) {
  const candidates=[...new Set((configured?[configured]:[bundled,'ffmpeg']).filter(Boolean))];
  for(const binary of candidates)if(probe(binary))return {binary,available:true,error:null};
  return {
    binary:null,available:false,
    error:'Reels needs FFmpeg 6.1 or newer with drawtext support. Install a full FFmpeg build and set REELS_FFMPEG_PATH, then restart the server.',
  };
}
