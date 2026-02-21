import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI({ apiKey });

try {
    const models = await ai.models.list();
    console.log(JSON.stringify(models, null, 2));
} catch (err) {
    console.error(err);
}
