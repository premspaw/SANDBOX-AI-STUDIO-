import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

const urlObj = new URL(apiUrl);
const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: 'GET',
    headers: {
        'Referer': 'http://localhost:5173/'
    }
};

https.get(options, (res) => {
    let data = '';
    res.on('data', (d) => data += d);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.models) {
                const names = parsed.models.map(m => `${m.name} [${m.supportedGenerationMethods.join(', ')}]`);
                console.log(names.join('\n'));
            } else {
                console.log(JSON.stringify(parsed, null, 2));
            }
        } catch (e) {
            console.log(data);
        }
    });
}).on('error', (e) => {
    console.error(e);
});
