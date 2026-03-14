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
        'Referer': 'http://localhost:5173/',
        'Origin': 'http://localhost:5173'
    }
};

https.get(options, (res) => {
    let data = '';
    res.on('data', (d) => data += d);
    res.on('end', () => {
        console.log("Status:", res.statusCode);
        console.log("Data:", data.substring(0, 1000));
    });
}).on('error', (e) => {
    console.error(e);
});
