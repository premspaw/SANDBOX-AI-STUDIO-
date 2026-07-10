import { GoogleAuth } from 'google-auth-library';
import https from 'https';
import path from 'path';

const keyFile = path.resolve('./freeeapi-499012-fd14302639c7.json');
const projectId = 'freeeapi-499012';
const location = 'us-central1';

async function testModel(token, modelName, method = 'predictLongRunning') {
    const payload = JSON.stringify({
        instances: [{
            prompt: "A beautiful sunset in the mountains, cinematic lighting, 4k",
        }],
        parameters: {
            sampleCount: 1,
            aspectRatio: "9:16"
        }
    });

    const urlPath = `/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelName}:${method}`;

    return new Promise((resolve) => {
        const options = {
            hostname: `${location}-aiplatform.googleapis.com`,
            port: 443,
            path: urlPath,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({ modelName, statusCode: res.statusCode, body: data });
            });
        });

        req.on('error', (e) => {
            resolve({ modelName, error: e.message });
        });

        req.write(payload);
        req.end();
    });
}

async function testServiceAccount() {
    console.log(`Loading service account credentials from: ${keyFile}`);
    try {
        const auth = new GoogleAuth({
            keyFile,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });

        const client = await auth.getClient();
        console.log("Acquiring access token...");
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token || tokenResponse;
        console.log("Access token acquired successfully!");

        const modelsToTest = [
            'veo-3.1-fast-generate-001',
            'veo-3.1-generate-001'
        ];

        for (const model of modelsToTest) {
            console.log(`Testing Vertex model ID: ${model} via predictLongRunning...`);
            const res = await testModel(token, model);
            console.log(`Status: ${res.statusCode}`);
            console.log(`Response: ${res.body}`);
            if (res.statusCode === 200 || res.body.includes("name")) {
                console.log(`\n=== SUCCESS: Veo Model ${model} is fully working via predictLongRunning! ===`);
                return;
            }
        }
    } catch (err) {
        console.error("Authentication/Setup Error:", err);
    }
}

testServiceAccount();
