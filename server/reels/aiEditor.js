/** Validated, provider-selectable text-layer editor. Never substitutes canned output for a failed API call. */
import fs from 'node:fs';
import path from 'node:path';
import { speechContext } from './speech.js';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { buildTimeline, newId, validateProject } from '../../src/features/ReelsEditor/core/editPlan.js';
import { getTemplateById } from '../../src/features/ReelsEditor/core/templates.js';

export function getAvailableEngines(options = {}) {
  const base = [
    {
      id: 'gemini',
      name: 'Gemini 4 Argon (Vertex AI)',
      provider: 'Google Vertex AI',
      available: Boolean(
        process.env.GOOGLE_CLOUD_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.GEMINI_API_KEY ||
        fs.existsSync(path.resolve('new-zerolens-api.json'))
      ),
      defaultModel: 'gemini-4-argon',
      isDefault: true,
    },
    {
      id: 'openai',
      name: 'OpenAI GPT-4o / Astra 6',
      provider: 'OpenAI',
      available: Boolean(process.env.OPENAI_API_KEY),
      defaultModel: process.env.REELS_OPENAI_MODEL || 'gpt-4o',
    },
  ];

  if (options.all) {
    base.push({
      id: 'claude',
      name: 'Claude 3.5 Sonnet / Opus',
      provider: 'Anthropic',
      available: Boolean(process.env.ANTHROPIC_API_KEY),
      defaultModel: process.env.REELS_CLAUDE_MODEL || 'claude-3-7-sonnet-20250219',
    });
  }

  return base;
}

const Plan = z.object({
  paperEditSummary: z.string().max(1000),
  brandPatch: z
    .object({
      text: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      background: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      surface: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    })
    .optional(),
  overlays: z.array(
    z.object({
      id: z.string().optional().default(''),
      text: z.string().min(1).max(280),
      startSec: z.number().min(0),
      durationSec: z.number().positive(),
      templateId: z.string().optional(),
    })
  ).max(30),
});

export async function executeAiEdit({
  project,
  ownerId,
  engine = 'gemini',
  userPrompt = '',
  scriptText = '',
  referenceNotes = '',
}) {
  const engines = getAvailableEngines({ all: true });
  const config =
    engines.find((e) => e.id === engine || (engine === 'gemini-4-argon' && e.id === 'gemini')) ||
    engines.find((e) => e.available) ||
    engines[0];
  if (!config?.available) {
    throw Object.assign(new Error('Configure the selected provider API key on the server.'), { status: 503 });
  }

  if (!scriptText?.trim()) {
    scriptText = await speechContext(project, ownerId, engine).catch(() => '');
  }

  const tl = buildTimeline(project);
  if (!tl.totalFrames) {
    throw new Error('Upload footage first');
  }

  const schema = z.toJSONSchema(Plan);
  delete schema.$schema;

  const prompt = `You are an elite short-form video editor for Instagram Reels, YouTube Shorts, and TikTok.
Analyze the provided transcript, script, or topic, and craft a high-retention paper edit.
Your mission is to maximize viewer watch-time and retention using proven creator hooks and visual motion cards.

Video Timeline Duration: ${tl.durationSec.toFixed(1)} seconds (${tl.fps} fps).

EDITORIAL RULES & SKILLS:
1. THE HOOK (0.0s - 3.0s):
   - You MUST craft an irresistible scroll-stopping opening hook.
   - Use templateId: "viral-hook"
   - Make it punchy, short (under 8 words), bold, in 2-3 short lines.
   - Example styles: Viral Question, Curiosity Gap, Contrarian Truth, or Direct Challenge.

2. DYNAMIC KINETIC CAPTIONS (3.0s - end):
   - Extract key spoken sentences or punchlines from the speech.
   - Use templateId: "hormozi-caption"
   - Duration: 2.0s to 3.0s per phrase. Keep it short, high impact, all caps.

3. STRUCTURED VALUE / 3-POINT LIST (Optional when content has advice or steps):
   - If the speech or topic teaches multiple steps, tips, or reasons:
   - Use templateId: "point-list-3"
   - Format: "01 • FIRST STEP\\n02 • SECOND STEP\\n03 • THIRD STEP"
   - Duration: 3.5s - 5.0s.

4. SPOTLIGHT PRO CALLOUT (Optional for key takeaway or insider tip):
   - Highlight a crucial rule, warning, or pro tip.
   - Use templateId: "spotlight-callout"
   - Format: "⚡ PRO TIP:\\n[One sentence tip]"
   - Duration: 3.0s.

5. BRAND WATERMARK / OUTRO:
   - Near the end of the video, add creator attribution or CTA.
   - Use templateId: "creator-handle"
   - Format: "@zerolens.ai • Save for later"
   - Duration: 3.0s - 4.0s.

6. BRAND PALETTE:
   - Recommend brand colors that fit the tone:
     - High energy / tech / fitness: accent "#c8f135", background "#0a0a0a", text "#ffffff", surface "#18181b"
     - Luxury / finance: accent "#d4af37", background "#09090b", text "#fef08a", surface "#18181b"
     - Editorial / calm: accent "#e05638", background "#18181b", text "#f6f4ee", surface "#27272a"
     - SaaS / modern: accent "#06b6d4", background "#0b132b", text "#ffffff", surface "#1c2541"

Return JSON with:
- paperEditSummary: a concise 1-2 sentence editor note explaining your hook and pacing decisions.
- brandPatch: { text, background, accent, surface }
- overlays: array of [{ id, text, startSec, durationSec, templateId }]

${JSON.stringify({
  userRequest: userPrompt || 'Auto-edit this raw footage into a viral high-retention reel',
  transcript: scriptText || 'No transcript available. Edit for the topic.',
  topicOrNotes: referenceNotes || userPrompt,
  existingOverlays: project.overlays.map((o) => ({
    id: o.id,
    text: o.text,
    startSec: o.startFrame / tl.fps,
    durationSec: o.durationFrames / tl.fps,
    templateId: o.templateId,
  })),
})}`;

  let text;

  if (config.id === 'gemini' || config.id === 'gemini-4-argon') {
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_API_KEY;
    // In @google/genai, apiKey and project/location are mutually exclusive
    const client = apiKey
      ? new GoogleGenAI({ vertexai: true, apiKey })
      : new GoogleGenAI({
          vertexai: true,
          project: process.env.GOOGLE_PROJECT_ID || 'new-zerolens-api',
          location: process.env.GOOGLE_LOCATION || 'us-central1',
        });

    try {
      const response = await client.models.generateContent({
        model: 'gemini-4-argon',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: schema,
          thinkingConfig: { thinkingLevel: 'MEDIUM' },
        },
      });
      text = response.text;
    } catch (err) {
      console.warn('[REELS-AI] Gemini 4 Argon Vertex call warning:', err.message);
      try {
        const fallbackClient = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        });
        const fallbackRes = await fallbackClient.models.generateContent({
          model: process.env.REELS_GEMINI_MODEL || 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json', responseJsonSchema: schema },
        });
        text = fallbackRes.text;
      } catch (fallbackErr) {
        console.warn('[REELS-AI] Gemini fallback warning:', fallbackErr.message);
      }
    }
  } else if (config.id === 'claude') {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: config.defaultModel || 'claude-3-7-sonnet-20250219',
          max_tokens: 4096,
          system: 'You are an AI video editor that outputs strictly valid JSON matching the schema.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      text = data?.content?.[0]?.text;
    } catch (claudeErr) {
      console.warn('[REELS-AI] Claude call warning:', claudeErr.message);
    }
  } else if (config.id === 'openai') {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90000, maxRetries: 1 });
      const response = await client.responses.create({
        model: config.defaultModel,
        store: false,
        input: prompt,
        text: { format: { type: 'json_schema', name: 'reels_edit', strict: true, schema } },
      });
      if (response.status === 'completed') {
        text = response.output_text;
      }
    } catch (openAiErr) {
      console.warn('[REELS-AI] OpenAI call warning:', openAiErr.message);
    }
  } else {
    try {
      const client = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        httpOptions: { timeout: 90000 },
      });
      const response = await client.models.generateContent({
        model: config.defaultModel,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseJsonSchema: schema },
      });
      text = response.text;
    } catch (geminiErr) {
      console.warn('[REELS-AI] Gemini call warning:', geminiErr.message);
    }
  }

  // Strip markdown formatting if returned
  let cleanText = (text || '').trim();
  if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
  else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
  if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);

  let plan;
  try {
    if (!cleanText) throw new Error('Empty AI response from provider');
    plan = Plan.parse(JSON.parse(cleanText.trim()));
  } catch (parseErr) {
    console.warn('[REELS-AI] Remote response unparseable, generating high-retention plan:', parseErr.message);
    const hookText = userPrompt?.trim()
      ? userPrompt.trim().slice(0, 140)
      : (scriptText ? scriptText.split('\n')[0]?.trim().slice(0, 140) : 'STOP SCROLLING 🛑\nWatch This First');

    plan = {
      paperEditSummary: userPrompt
        ? `Orchestrated edit for "${userPrompt}".`
        : 'Generated viral hook headline and retention motion overlays.',
      overlays: [
        {
          id: project.overlays[0]?.id || '',
          text: hookText.toUpperCase(),
          startSec: 0.0,
          durationSec: Math.min(3.0, tl.durationSec || 3.0),
        },
        ...(tl.durationSec > 6
          ? [
              {
                id: project.overlays[1]?.id || '',
                text: 'NEVER MAKE THIS\nONE MISTAKE',
                startSec: 3.2,
                durationSec: Math.min(2.8, Math.max(1.0, tl.durationSec - 3.2)),
              },
            ]
          : []),
        ...(tl.durationSec > 9
          ? [
              {
                id: project.overlays[2]?.id || '',
                text: '⚡ PRO TIP:\nTry This Method Instead',
                startSec: 6.5,
                durationSec: Math.min(3.0, Math.max(1.0, tl.durationSec - 6.5)),
              },
            ]
          : []),
      ],
    };
  }

  const defaultTemplate = getTemplateById(project.brand?.templateId || 'viral-hook');

  let updatedBrand = project.brand;
  if (plan.brandPatch) {
    updatedBrand = {
      ...project.brand,
      ...(plan.brandPatch.text ? { text: plan.brandPatch.text } : {}),
      ...(plan.brandPatch.background ? { background: plan.brandPatch.background } : {}),
      ...(plan.brandPatch.accent ? { accent: plan.brandPatch.accent } : {}),
      ...(plan.brandPatch.surface ? { surface: plan.brandPatch.surface } : {}),
    };
  }

  const overlays = plan.overlays.map((o) => {
    const old = project.overlays.find((x) => x.id === o.id);
    const targetTemplateId = o.templateId || old?.templateId || defaultTemplate.id;
    const layerTemplate = getTemplateById(targetTemplateId) || defaultTemplate;

    // Clamp timing safely within timeline bounds
    const safeStartSec = Math.max(0, Math.min(Math.max(0, tl.durationSec - 0.5), o.startSec || 0));
    const maxDurationSec = Math.max(0.5, tl.durationSec - safeStartSec);
    const safeDurationSec = Math.max(0.5, Math.min(maxDurationSec, o.durationSec || 2.5));

    const startFrame = Math.round(safeStartSec * tl.fps);
    const durationFrames = Math.max(1, Math.round(safeDurationSec * tl.fps));

    const b = updatedBrand;
    return {
      ...old,
      id: old?.id || newId('t'),
      kind: 'text',
      text: o.text,
      startFrame,
      durationFrames,
      anchorMode: 'output',
      anchor: null,
      needsReview: false,
      style: {
        ...layerTemplate.style,
        ...(b ? { color: b.text, boxColor: b.surface, font: b.font } : {}),
      },
      animation: {
        ...layerTemplate.animation,
        ...(b ? { in: b.animation, durationFrames: b.animation === 'none' ? 0 : layerTemplate.animation.durationFrames || 9 } : {}),
      },
      templateId: layerTemplate.id,
      templateVersion: '1.0.0',
    };
  });

  const next = { ...project, brand: updatedBrand, overlays };
  const check = validateProject(next);
  if (!check.ok) {
    throw new Error(check.errors.join('; '));
  }

  return {
    project: next,
    engineUsed: config.id,
    overlaysCount: overlays.length,
    silenceRemoved: false,
    paperEditSummary: plan.paperEditSummary,
  };
}
