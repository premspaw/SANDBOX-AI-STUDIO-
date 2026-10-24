import {FFMPEG_RUNTIME,FFPROBE,runProcess} from '../server/reels/media.js';
if(!FFMPEG_RUNTIME.available){console.error(FFMPEG_RUNTIME.error);process.exitCode=1;}
else {
 try {
  await runProcess(FFPROBE,['-version'],{timeoutMs:5000});
  console.log('Reels renderer and media probe are available. Run npm run smoke:reels to verify MP4 export.');
 } catch {console.error('FFprobe is unavailable. Set REELS_FFPROBE_PATH to a working media probe.');process.exitCode=1;}
}
