import fetch from 'node-fetch';

async function testTTS() {
    console.log("Testing Google Cloud TTS Proxy...");
    try {
        const response = await fetch('http://localhost:3001/api/proxy/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: "The future of cinema is here, powered by Google AI Studio.",
                voiceId: "en-US-Journey-F"
            })
        });

        const text = await response.text();
        console.log("Raw Response:", text.substring(0, 500));

        try {
            const data = JSON.parse(text);
            if (data.audioContent) {
                console.log(`SUCCESS: Received audio buffer (${data.audioContent.length} chars base64)`);
            } else {
                console.log("FAIL: No audio content received.");
                console.log(data);
            }
        } catch (parseErr) {
            console.error("JSON Parse Error:", parseErr.message);
        }
    } catch (err) {
        console.error("TTS Test Failed:", err);
    }
}

async function runTests() {
    await testTTS();
}

runTests();
