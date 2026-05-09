import fetch from 'node-fetch';

const testKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;

async function testImageGen() {
    console.log("--- Testing Image Generation with New Key ---");
    const modelName = "models/gemini-2.5-flash-image";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${testKey}`;
    
    const requestBody = {
        contents: [{
            role: 'user',
            parts: [{ text: "A tiny simple colored dot" }]
        }],
        generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: {
                aspectRatio: "1:1",
                imageSize: "1K"
            }
        }
    };

    try {
        const resp = await fetch(apiUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Referer': 'http://localhost:5173/' // Many Gemini keys are restricted by referer
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await resp.json();
        if (resp.ok) {
            console.log("✅ Image Generation Success!");
            const outputPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (outputPart) {
                console.log("Image Data Size:", Math.round(outputPart.inlineData.data.length / 1024), "KB");
            } else {
                console.log("⚠️ No image in response. Safety filter?");
            }
        } else {
            console.log("❌ Image Generation Failed:", data.error?.message || JSON.stringify(data));
        }
    } catch (e) {
        console.log("❌ Network Error:", e.message);
    }
}

testImageGen();
