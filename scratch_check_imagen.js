import { GoogleAuth } from 'google-auth-library';
import https from 'https';
import path from 'path';

const keyFile = path.resolve('./freeeapi-499012-fd14302639c7.json');
const projectId = 'freeeapi-499012';
const location = 'us-central1';

function makePostRequest(url, headers = {}, body = {}) {
    return new Promise((resolve) => {
        const u = new URL(url);
        const payload = JSON.stringify(body);
        const options = {
            hostname: u.hostname,
            port: u.port || 443,
            path: u.pathname + u.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = [];
            res.on('data', (chunk) => {
                data.push(chunk);
            });
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, body: Buffer.concat(data).toString() });
            });
        });

        req.on('error', (e) => {
            resolve({ error: e.message });
        });

        req.write(payload);
        req.end();
    });
}

async function testImagen() {
    try {
        const auth = new GoogleAuth({
            keyFile,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token || tokenResponse;

        const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-002:predict`;
        console.log(`Calling Vertex AI Imagen: ${url}`);

        const payload = {
            instances: [{
                prompt: "A beautiful sunny beach, realistic photograph, high quality"
            }],
            parameters: {
                sampleCount: 1,
                aspectRatio: "1:1",
                outputMimeType: "image/png"
            }
        };

        const res = await makePostRequest(url, { 'Authorization': `Bearer ${token}` }, payload);
        console.log(`Status code: ${res.statusCode}`);
        console.log(`Response snippet: ${res.body.substring(0, 300)}`);
        
        const data = JSON.parse(res.body);
        if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
            console.log("✅ Success! Image generated successfully via Vertex AI!");
            console.log("Base64 length:", data.predictions[0].bytesBase64Encoded.length);
        } else {
            console.log("❌ Failed to find base64 image in predictions response.");
        }

    } catch (e) {
        console.error(e);
    }
}

testImagen();
