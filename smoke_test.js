
import nodeFetch from 'node-fetch';

async function test() {
    try {
        console.log("🎬 Initiating Veo-3.1 generation (approx 4-6 mins) via Service Account...");
        const payload = {
            model: "veo-3.1-fast-generate-preview",
            prompt: "A peaceful cinematic drone shot of a misty mountain waterfall at sunrise.",
            aspect_ratio: "16:9",
            duration: 4,
            userId: "agent-smoke-test-final"
        };

        const resp = await nodeFetch('http://localhost:3009/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await resp.json();
        console.log("📡 Backend Response:", JSON.stringify(data, null, 2));

        if (data.url || data.videoUrl) {
           console.log("✅ SMOKE TEST PASSED!");
           console.log("📹 Video URL:", data.url || data.videoUrl);
        } else {
           console.error("❌ FAILED: No video URL in response.");
           process.exit(1);
        }
    } catch (e) {
        console.error("❌ ERROR:", e.message);
        process.exit(1);
    }
}
test();
