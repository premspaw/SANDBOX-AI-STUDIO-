import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const modelName = 'models/gemini-2.0-flash-exp-image-generation'; 
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;

async function test() {
    const postData = JSON.stringify({
        contents: [{
            parts: [{ text: "Hello" }]
        }]
    });

    const urlObj = new URL(apiUrl);
    const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Referer': 'http://localhost:5173/',
            'Origin': 'http://localhost:5173',
            'X-Goog-Api-Key': apiKey
        }
    };

    console.log("Testing with https.request to:", apiUrl);
    
    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (d) => data += d);
        res.on('end', () => {
            console.log("Status:", res.statusCode);
            console.log("Response:", data.substring(0, 500));
        });
    });

    req.on('error', (e) => console.error(e));
    req.write(postData);
    req.end();
}

test();
