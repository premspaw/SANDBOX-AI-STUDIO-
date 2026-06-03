import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_FILE = path.join(__dirname, '..', 'new-zerolens-api-073f27e79f0c.json');

async function listModels() {
    const auth = new GoogleAuth({
        keyFile: CREDENTIALS_FILE,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const projectId = 'new-zerolens-api';
    const location = 'us-central1';
    
    // We fetch from Vertex AI models endpoint
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publisherModels?filter=publisher%3Dgoogle`;
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token || tokenResponse;
    
    const resp = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await resp.json();
    console.log('HTTP Status:', resp.status);
    if (data.error) {
        console.error('Error:', data.error);
        return;
    }
    
    const models = data.publisherModels || [];
    console.log(`Found ${models.length} publisher models.`);
    
    // Search for model names containing 'veo'
    const veoModels = models.filter(m => m.name.toLowerCase().includes('veo'));
    console.log('\n--- Veo Models on Vertex AI ---');
    console.log(JSON.stringify(veoModels, null, 2));
}

listModels().catch(console.error);
