import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: 'test' });
console.log("Methods on ai:", Object.keys(ai));
if (ai.models) console.log("Methods on ai.models:", Object.keys(ai.models));
console.log("Is getGenerativeModel a function?", typeof ai.getGenerativeModel === 'function');
