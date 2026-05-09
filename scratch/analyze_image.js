
import fetch from 'node-fetch';

async function analyzeImage() {
    const imageUrl = "https://storage.googleapis.com/marketing-assets-cinemai/25450a09-29a4-474b-a4b1-e64148144cb4.png";
    
    console.log("Fetching image...");
    const imgResp = await fetch(imageUrl);
    const buffer = await imgResp.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');

    console.log("Sending to analysis endpoint...");
    const resp = await fetch('http://127.0.0.1:3002/api/marketing/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
    });

    const data = await resp.json();
    console.log("Analysis Result:", JSON.stringify(data, null, 2));
}

analyzeImage();
