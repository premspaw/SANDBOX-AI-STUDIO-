import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    const apiKey = process.env.VITE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        console.error("No API key found!");
        return;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("AVAILABLE MODELS:");
            data.models.forEach(m => {
                const supportsGenerate = m.supportedGenerationMethods?.includes('generateContent');
                const supportsPredict = m.supportedGenerationMethods?.includes('predict');
                console.log(`- ${m.name} [Methods: ${m.supportedGenerationMethods?.join(', ')}]`);
            });
        } else {
            console.log("No models returned:", data);
        }
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}

listModels();
