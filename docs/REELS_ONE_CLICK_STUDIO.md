# One-click Reels Studio

The Reels Editor now uses Upload → Select template → Edit Video. Upload does not call AI. The main action runs acoustic cleanup, enables light denoise and -16 LUFS normalization, submits the retained speech to OpenAI, applies the selected supported layout rules, and renders an MP4. Processing is displayed separately from the optional refinement composer.

## Interface
- Multi-file upload, source list and clip reorder.
- Visual template cards and a Story-led edit profile.
- Palette, custom colors, bundled Poppins/Kannada fonts, motion and canvas size.
- Draft and encoded-result views with an earlier-render indicator.
- Optional chat refinement, transcript reference, expandable timeline and restoration of removed gaps.
- Export recovery for existing queued/running jobs and completed current-revision exports.
- Responsive stacked layout on mobile, horizontal template cards and touch-sized actions.

## Runtime
Set OPENAI_API_KEY on the server. REELS_OPENAI_MODEL defaults to gpt-6-astra; it remains configurable. Reasoning-capable GPT-5/6 requests use medium effort, low verbosity, a 6000 output-token cap and no SDK retries. REELS_TRANSCRIBE_MODEL defaults to gpt-transcribe. Existing FFmpeg, private media and Supabase requirements still apply.

Speech transcription now follows the retained timeline including trims, order, speed and mute. It is not word aligned. Provider failures stop the workflow, with no canned visual fallback. Selected style IDs are validated and brand colors are not changed by the model. AI saves reject stale revisions.

## Scope and limits
Story-led edit translates reference-inspired composition rules into the renderer's existing animated text and card primitives. It is not a complete implementation of arbitrary reference-video motion graphics. No image-generation tool is exposed; no image charges are possible through this flow. Asset uploads, generated images, sound-effect tracks, semantic repeated-word removal and word alignment remain future integrations.

Silence cuts are acoustic, padded and reversible. Overlapping gap proposals are merged and short retained speech fragments are preserved. The existing server limits remain: eight sources, 250 MB/source, 120 seconds/source, 60-second output, MP4/H.264/AAC at 30 fps.

The browser coordinates the initial cleanup/planning sequence. Keep the page open until rendering starts. If it closes, saved revisions survive and an already-enqueued render continues, but unfinished planning is not automatically replayed. The export panel reconnects to saved render jobs.

Chat refinements currently request a revised visual layer plan; surgical word-restoration is available through the Media gap controls, not an autonomous speech-patch API. Arbitrary user-requested changes cannot be guaranteed by the existing renderer.

## Verification
Run node --test tests/reels*.mjs and the repository's existing security/build/render checks. The new tests cover ordering, OpenAI/style selection, revision binding, failure stopping, refinement behavior, abort, schema strictness, overlapping gaps and speech-fragment preservation.

This change was authored through the GitHub connector while the local workspace was unavailable. GitHub Actions results are the executable verification record. A signed-in browser session and live paid provider requests still require deployment validation.
