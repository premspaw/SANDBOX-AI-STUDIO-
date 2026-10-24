# Reels editor workflow and verified limits

This updates the existing Reels Editor in the application. It preserves the uploaded source clips and edits a versioned timeline.

## What now happens

1. Upload footage. The queued worker detects acoustic silence, creates reversible gap cuts, and enables light denoise and loudness normalization. No-audio clips skip acoustic analysis.
2. Choose OpenAI or Gemini using the configured server-side provider. When no transcript is supplied, the selected provider receives compressed mono speech audio; temporary audio is removed afterward.
3. Choose a palette, font, animation mode and template. Palette/font changes restyle existing text layers. Selecting a template restyles their layout while preserving copy, timing and source anchors. Applying a library template inserts or restyles the selected layer.
4. Refine text and timing through chat or timeline controls. AI receives existing layer IDs and context; invalid results fail without silently replacing the project with canned text. Saves are serialized and flushed before AI/export, and AI updates require the original revision.
5. Export an MP4 at the selected canvas dimensions. Source dimensions and portrait/landscape/square presets are available.

The six available presets are headline, centered emphasis caption, three-point full-screen card, spotlight callout, before/after text card, and creator lower-third. The two full-screen cards cover footage only during their layer interval; original audio continues and the raw picture resumes afterward. They are built-in presets, not a recreation of an unavailable reference video.

## Brand controls and rendering

| Control | Actual output |
| --- | --- |
| Background | Full-screen card background and fit-video margins |
| Surface | Card fill and text boxes |
| Text | Text glyph color |
| Accent / secondary | Template strips |
| Font | Bundled Poppins Bold or Noto Sans Kannada |
| Animation | None, fade, or slide-up text entrance/exit |
| Template | Layer layout and matching panel geometry |

Preview and export share panel geometry and frame-based animation rules. Panels appear for the layer interval; the text animates. The preview is an editor approximation of browser text rendering; the encoded preview/export remains the rendering authority. Browser audio preview does not apply the server denoise/normalization filters.

## Run locally

After pulling main, run `npm ci`, then `npm run start` (or run `npm run dev` and `npm run server` in separate terminals). GitHub pushes do not update an already running localhost checkout.

Server configuration:

- `OPENAI_API_KEY`, `REELS_OPENAI_MODEL`, `REELS_TRANSCRIBE_MODEL` for OpenAI.
- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) and `REELS_GEMINI_MODEL` for Gemini.
- `REELS_DATA_DIR` on a persistent private volume.
- `REELS_MEDIA_SECRET`: a private random value of at least 32 bytes, stable across restarts.
- `REELS_FFMPEG_PATH` / `REELS_FFPROBE_PATH` when using system binaries with drawtext support.
- Existing Supabase authentication configuration.

Never put provider or admin secrets in `VITE_*` variables. See [security review](SECURITY_REVIEW_2026-10-24.md) for OAuth configuration and the database migration.

Use one application process with the current JSON store and in-memory OAuth grants. `start:prod` now uses one PM2 instance. Shared database locking, persistent OAuth grants and a distributed queue are prerequisites for multiple replicas.

## Resource limits

250 MB/source; 120 seconds/source; maximum 4K input dimensions; eight sources/project; 60-second output; twenty pending jobs globally and two per owner; one AI operation per process. Reels worker concurrency defaults to one and is capped at two. Uploads are rejected below 2 GiB free disk space. Finished exports expire after `REELS_EXPORT_RETENTION_DAYS` (default seven days). Source clips persist until deleted.

These controls reduce load; they are not per-account storage quotas or a guarantee against disk exhaustion. Rendering is server-side. Browser/local-plugin processing is not implemented.

## Validation and remaining capabilities

CI runs security/unit tests, the production build, a disposable PostgreSQL policy test, and real FFmpeg exports. The video tests inspect encoded pixels for all six templates, palette changes, font changes and animation, verify dimensions/duration/audio, and confirm the raw picture resumes after a full-screen card. Run `npm run test:reels`, `npm run test:security`, and `npm run smoke:reels`.

Exports are MP4/H.264/AAC at 30 fps. Original container/codec/frame-rate/HDR preservation, word-aligned captions, semantic filler-word removal, visual frame understanding, arbitrary motion-graphics compositions and sound-effect tracks are not implemented. Transcript timing is approximate. Live provider requests and a signed-in production browser session have not been tested with deployment credentials.
