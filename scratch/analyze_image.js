
import fetch from 'node-fetch';

async function analyzeImage() {
    // Use a public R2 image URL (the one generated in test_openai.js)
    // or any public JPEG/PNG the OpenAI Vision API can fetch
    const publicImageUrl = "https://pub-05a4fe33e706492e8d437c36f9a8aa94.r2.dev/users/cec79985-ce59-4d23-82a2-3ae6f69994ed/marketing/generated/gen_cec79985-ce59-4d23-82a2-3ae6f69994ed_1781430217993.png";
    
    console.log("Sending public URL to analysis endpoint...");
    const resp = await fetch('http://127.0.0.1:3002/api/marketing/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: publicImageUrl })
    });

    const data = await resp.json();
    console.log("Analysis Result:", JSON.stringify(data, null, 2));
}

analyzeImage();
