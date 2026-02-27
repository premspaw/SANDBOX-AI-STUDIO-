import { generateDirectorSequence } from './geminiService.js';
import dotenv from 'dotenv';
dotenv.config();

async function testSequence() {
    console.log("Testing generateDirectorSequence with Gemini 1.5 Pro...");
    const narrative = "A cybernetic assassin stalks a target through a high-tech laboratory, leading to an intense confrontation.";
    try {
        const result = await generateDirectorSequence(narrative);
        console.log("SUCCESS! Sequence generated:");
        console.log(JSON.stringify(result, null, 2));

        if (result.nodes && result.nodes.length > 0) {
            console.log("PASS: Nodes found.");
            const types = result.nodes.map(n => n.type);
            console.log("Node types found:", Array.from(new Set(types)));
        } else {
            console.log("FAIL: No nodes generated.");
        }
    } catch (err) {
        console.error("CRITICAL TEST FAILURE:", err);
    }
}

testSequence();
