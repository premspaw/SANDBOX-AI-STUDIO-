/**
 * ⚡ Vertex AI Remote MCP Service
 * Bridges ZeroLens Studio & Cinema Studio to Google Cloud Vertex AI
 * Gemini Enterprise Agent Platform Remote Model Context Protocol (MCP) Server.
 * Endpoint: https://aiplatform.googleapis.com/mcp/generate
 */

import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MCP_ENDPOINT = 'https://aiplatform.googleapis.com/mcp/generate';

// Helper to resolve service account key
function resolveServiceAccountKey() {
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'project-c0b5ea74-5ba2-4e68-8ab.json'),
    path.join(__dirname, '..', '..', 'freeeapi-499012-fd14302639c7.json'),
    path.join(process.cwd(), 'project-c0b5ea74-5ba2-4e68-8ab.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

let _authClient = null;
let _cachedToken = { token: null, expiry: 0 };
let _cachedProjectId = null;

async function getMcpAccessToken() {
  const now = Date.now();
  if (_cachedToken.token && _cachedToken.expiry > now + 60_000) {
    return { token: _cachedToken.token, projectId: _cachedProjectId };
  }

  const keyPath = resolveServiceAccountKey();
  const auth = new GoogleAuth({
    ...(keyPath ? { keyFile: keyPath } : {}),
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/aiplatform'
    ]
  });

  _authClient = await auth.getClient();
  const tokenResponse = await _authClient.getAccessToken();
  const token = tokenResponse.token || tokenResponse;

  if (keyPath) {
    try {
      const parsed = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      _cachedProjectId = parsed.project_id || process.env.NEW_GOOGLE_PROJECT_ID || process.env.GOOGLE_PROJECT_ID;
    } catch (_) {}
  }
  if (!_cachedProjectId) {
    _cachedProjectId = process.env.NEW_GOOGLE_PROJECT_ID || process.env.GOOGLE_PROJECT_ID || 'project-c0b5ea74-5ba2-4e68-8ab';
  }

  _cachedToken = { token, expiry: now + 50 * 60 * 1000 };
  return { token, projectId: _cachedProjectId };
}

/**
 * Execute a low-level JSON-RPC 2.0 call to Vertex AI MCP Server
 */
export async function callVertexMcp(method, params = {}, id = Date.now()) {
  const { token } = await getMcpAccessToken();

  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Vertex AI MCP error (${response.status} ${response.statusText}): ${errText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }

  return data.result;
}

/**
 * Lists all tools available on the Vertex AI MCP Server
 */
export async function listVertexMcpTools() {
  const result = await callVertexMcp('tools/list', {});
  return result?.tools || [];
}

/**
 * Generates content via Vertex AI MCP generate_content tool
 */
export async function vertexMcpGenerateContent({
  prompt,
  systemInstruction,
  model = 'gemini-2.5-flash',
  temperature = 0.7,
  location = 'us-central1'
}) {
  const { projectId } = await getMcpAccessToken();
  const modelResource = `projects/${projectId}/locations/${location}/publishers/google/models/${model}`;

  const payload = {
    name: 'generate_content',
    arguments: {
      model: modelResource,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature
      }
    }
  };

  if (systemInstruction) {
    payload.arguments.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const result = await callVertexMcp('tools/call', payload);

  // Extract text from MCP result structure
  if (result?.structuredContent?.candidates?.[0]?.content?.parts?.[0]?.text) {
    return result.structuredContent.candidates[0].content.parts[0].text;
  }

  if (result?.content?.[0]?.text) {
    try {
      const parsed = JSON.parse(result.content[0].text);
      if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
        return parsed.candidates[0].content.parts[0].text;
      }
    } catch (_) {
      return result.content[0].text;
    }
  }

  return JSON.stringify(result);
}

/**
 * Enhances a user prompt into a high-grade cinematic prompt for Seedance 2.0 / Imagen 3
 */
export async function enhancePromptWithMcp({
  prompt,
  style = 'cinematic',
  engine = 'seedance',
  aspectRatio = '16:9'
}) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt is required for enhancement.');
  }

  const systemInstruction = `You are the Lead Cinematographer and AI Visual Director at ZeroLens Studio.
Your task is to take raw user ideas and expand them into photorealistic, production-ready prompts tailored for ${engine.toUpperCase()} and Imagen 3.
Rules:
1. Specify camera movement (e.g. dynamic pan, smooth dolly-in, orbit shot, low-angle tracking).
2. Describe volumetric lighting (e.g. golden hour rim light, diffused anamorphic lens flare, cyberpunk neon).
3. Detail subject materials, facial expression, wardrobe textures, and depth of field.
4. Keep the output focused, dense, and visual (80-140 words).
5. Output ONLY the enhanced prompt without introductory filler or markdown quotes.`;

  const userQuery = `Original Idea: "${prompt}"
Target Style: ${style}
Aspect Ratio: ${aspectRatio}
Target Engine: ${engine}

Generate the enhanced cinematic prompt:`;

  const enhancedText = await vertexMcpGenerateContent({
    prompt: userQuery,
    systemInstruction,
    model: 'gemini-2.5-flash',
    temperature: 0.6
  });

  return enhancedText.trim().replace(/^["']|["']$/g, '');
}

/**
 * Breaks down an idea into a structured multi-scene storyboard/shotlist
 */
export async function generateShotlistWithMcp({
  idea,
  sceneCount = 4,
  aspectRatio = '16:9',
  style = 'cinematic'
}) {
  if (!idea) throw new Error('Idea or script synopsis is required.');

  const systemInstruction = `You are an award-winning Film Director and Commercial Storyboard Artist.
Create a structured ${sceneCount}-scene shotlist JSON based on the user's idea.
Output strictly valid JSON with this schema:
{
  "title": "Project Title",
  "synopsis": "Short overview",
  "scenes": [
    {
      "scene_number": 1,
      "duration_sec": 5,
      "camera_motion": "e.g. Slow push-in tracking shot",
      "visual_prompt": "Detailed text prompt for Seedance/Imagen generation",
      "dialogue_or_narration": "Optional voiceover or dialogue text",
      "sound_fx": "Sound design cues"
    }
  ]
}`;

  const prompt = `Idea: "${idea}"
Number of scenes: ${sceneCount}
Visual Style: ${style}
Aspect Ratio: ${aspectRatio}

Respond ONLY with valid JSON.`;

  const rawJson = await vertexMcpGenerateContent({
    prompt,
    systemInstruction,
    model: 'gemini-2.5-flash',
    temperature: 0.5
  });

  const cleanJson = rawJson.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleanJson);
  } catch (err) {
    return {
      title: 'Storyboard Sequence',
      synopsis: idea,
      rawOutput: rawJson,
      scenes: []
    };
  }
}

/**
 * Counts token usage for pre-flight estimation via Vertex AI MCP
 */
export async function countTokensWithMcp(text, model = 'gemini-2.5-flash') {
  const { projectId } = await getMcpAccessToken();
  const modelResource = `projects/${projectId}/locations/us-central1/publishers/google/models/${model}`;

  const payload = {
    name: 'count_tokens',
    arguments: {
      endpoint: modelResource,
      model: modelResource,
      contents: [
        {
          role: 'user',
          parts: [{ text: text || '' }]
        }
      ]
    }
  };

  const result = await callVertexMcp('tools/call', payload);
  let totalTokens = 0;

  if (result?.structuredContent?.totalTokens) {
    totalTokens = result.structuredContent.totalTokens;
  } else if (result?.content?.[0]?.text) {
    try {
      const parsed = JSON.parse(result.content[0].text);
      totalTokens = parsed.totalTokens || parsed.totalBillableCharacters || 0;
    } catch (_) {}
  }

  return {
    totalTokens,
    estimatedCredits: Math.max(1, Math.ceil(totalTokens / 500)),
    model
  };
}
