import { config, higgsfield } from '@higgsfield/client/v2';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.HF_CREDENTIALS) {
  console.error('Error: HF_CREDENTIALS not found in environment or .env.local');
  process.exit(1);
}

config({
  credentials: process.env.HF_CREDENTIALS,
});

async function main() {
  console.log('Submitting generation request to bytedance/seedance-2.5/text-to-video...');

  try {
    const result = await higgsfield.subscribe(
      'bytedance/seedance-2.5/text-to-video',
      {
        input: {
          prompt: 'A cinematic scene at sunset',
          duration: 5,
          resolution: '720p',
          aspect_ratio: '16:9',
        },
        withPolling: true,
      }
    );

    console.log(`Request finished with status: ${result.status}`);

    if (result.status === 'completed') {
      const videoUrl =
        result.video?.url ||
        result.images?.[0]?.url ||
        (result as any).videos?.[0]?.url ||
        (result as any).output?.url ||
        (result as any).url;

      if (!videoUrl) {
        console.error('Generation completed but no video URL was found in the response payload.');
        process.exit(1);
      }

      console.log(`Generated Video URL: ${videoUrl}`);
      return videoUrl;
    } else if (result.status === 'failed') {
      console.error('Generation failed on the server.');
      process.exit(1);
    } else if ((result.status as string) === 'canceled') {
      console.warn('Generation request was canceled.');
      process.exit(1);
    } else if (result.status === 'nsfw' || (result.status as string) === 'moderated') {
      console.warn('Generation request was rejected by content moderation.');
      process.exit(1);
    } else {
      console.error(`Unexpected request status: ${result.status}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Error executing Higgsfield API generation:', error?.message || error);
    process.exit(1);
  }
}

main();
