import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

dotenv.config();

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY is not defined in .env');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });
  console.log('Sending creative ad prompt to GPT 2.5 (gpt-image-2.5-sunburst)...');

  const prompt = `A high-converting, professional commercial advertisement poster and widescreen banner for ZeroLens AI Video Studio.
Dark obsidian glassmorphic theme with glowing electric neon lime green (#D4FF00) and laser gold highlights.
AD DESIGN & CONTENT:
- Prominently feature a glowing neon badge: "30% OFF SEASON SALE"
- Bold, crisp typography headline: "VIRAL UGC ADS AT JUST ₹30"
- Pricing & value callouts:
  • "1 UGC Video: ₹30"
  • "Complete Ready-To-Post Ad: ₹50"
  • "Save 99% vs Traditional Agency Shoots (₹15,000+)"
- Visual showcases: Realistic floating smartphone mockup showcasing an authentic UGC video creator reviewing skincare and fashion products with Reels/TikTok engagement overlays (likes, comments, views).
- Sleek tech aesthetic: Holographic UI elements, glossy 3D glass cards, neon light rays, cinematic dark studio lighting, ultra-clean commercial ad composition with clear readable text.`;

  try {
    const res = await openai.images.generate({
      model: 'gpt-image-2.5-sunburst',
      prompt,
      n: 1,
      size: '1536x1024',
      quality: 'high'
    });

    const b64 = res.data?.[0]?.b64_json;
    if (!b64) {
      console.error('No base64 data returned:', res);
      process.exit(1);
    }

    const buffer = Buffer.from(b64, 'base64');
    const targetPath = path.resolve('public/pricing/season-discount-banner.jpg');
    fs.writeFileSync(targetPath, buffer);
    console.log(`✅ Successfully generated creative ad banner with GPT 2.5! Saved to: ${targetPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error('❌ Failed to generate image:', err);
    process.exit(1);
  }
}

main();
