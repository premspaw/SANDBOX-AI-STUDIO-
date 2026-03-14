import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const API_KEY = process.env.GOOGLE_API_KEY || process.env.API_KEY;

/**
 * Fetch and parse a Google Doc script
 * @param {string} docId - The ID of the Google Doc
 */
export const parseGoogleDocScript = async (docId) => {
    try {
        console.log(`[WORKSPACE] Fetching Google Doc: ${docId}...`);

        // Fetch document content via REST API
        // Note: For private docs, this requires OAuth2. For demo/public docs, API_KEY might suffice if shared.
        const response = await fetch(`https://docs.googleapis.com/v1/documents/${docId}?key=${API_KEY}`);
        const data = await response.json();

        if (data.error) {
            console.error("[WORKSPACE] Docs API Error:", JSON.stringify(data.error));
            throw new Error(data.error.message);
        }

        // Simple parsing: Extract all text from structural elements
        let fullText = "";
        data.body?.content?.forEach(element => {
            if (element.paragraph) {
                element.paragraph.elements?.forEach(e => {
                    if (e.textRun?.content) {
                        fullText += e.textRun.content;
                    }
                });
            }
        });

        console.log(`[WORKSPACE] Successfully parsed ${fullText.length} characters from Doc.`);
        return {
            title: data.title,
            content: fullText.trim()
        };
    } catch (err) {
        console.error("[WORKSPACE] Docs Parsing Failed:", err);
        return null;
    }
};
