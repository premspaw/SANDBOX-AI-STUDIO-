# Reels workflow review and implementation

Reviewed base commit 92788bf. This branch updates the existing Reels Editor, not the earlier standalone prototype.

## Confirmed issues corrected
- aiEditor previously returned canned “viral” overlays when provider calls failed. Failures now leave the revision unchanged and configured providers are shown explicitly.
- Chat previously replaced all overlays without sending existing layers to the model. The model now receives layer IDs, text and timing; returned IDs and timing are validated. It can still make a bad editorial choice: inspect the preview.
- AI had no source-audio input. When a transcript is omitted, compressed mono audio is extracted and transcribed using the selected provider. Temporary audio is always removed. It is not word-timed or visual scene analysis.
- AI results previously overwrote changes made while an API request was running. Save now requires the original revision.
- Concurrent debounced saves could race; saves are serialized and flushed before AI/export. Project rename uses the saved mutation path.
- Additional uploads did not refresh the mounted editor. Workspace now remounts on returned upload revision.
- Upload now runs queued silence detection, applies reversible gap removal, enables light denoise and loudness normalization, then opens the styling workspace. No-audio sources skip acoustic work. Silence is not a reliable detector of filler words or unwanted sounds.
- The palette is saved with the project. Text/surface/font/animation apply to text layers. Background/accent/secondary are reserved tokens, clearly labelled in the UI.
- Export previously forced portrait dimensions. Canvas now supports even dimensions up to 3840; source dimensions and presets are selectable. Preview respects aspect ratio. Export remains MP4/H.264/AAC at 30 fps, not original container, codec, HDR, or variable frame rate.

## Run and configure
Existing application setup and Supabase authentication remain in place. Install with `npm ci`, then `npm run dev` and `npm run server`.

Server variables (never VITE-prefixed secrets):
- OPENAI_API_KEY, REELS_OPENAI_MODEL, REELS_TRANSCRIBE_MODEL for OpenAI.
- GEMINI_API_KEY (or GOOGLE_API_KEY), REELS_GEMINI_MODEL for Gemini Developer API. This adapter is not Vertex credential routing.
- REELS_DATA_DIR on a persistent volume; REELS_MEDIA_SECRET must be a private random secret.
- REELS_FFMPEG_PATH and REELS_FFPROBE_PATH if using system binaries.
- REELS_WORKER_CONCURRENCY defaults to 1, capped at 2. Use one application/worker process with the current JSON store. Do not deploy multiple replicas against it.

Rendering/analysis stays server-side; a browser or ChatGPT plugin is not a background local worker. Browser-local FFmpeg, worker isolation, per-account byte quotas, and shared database queue locking remain production work. Current bounds: 250 MB/source, 120 seconds/source, 8 sources/project, 60 second output, up to 20 pending jobs globally / 2 per owner, one AI analysis per process, and upload rejection below 2 GiB free space. Job temp directories are cleaned by the existing worker. Finished export files expire after REELS_EXPORT_RETENTION_DAYS (default 7 days); source files persist until deleted; operate storage monitoring and a retention policy before public scale.

## Not complete / not claimed
- Exact reference-video animation template has not been ported. The UI exposes only the existing headline template; it must not be presented as the supplied reference style.
- No sound-effect track editor or arbitrary diagrams/full-screen compositions.
- No word-aligned captions, semantic filler-word cuts, visual frame understanding, automatic HDR tone mapping, or original-container export.
- No local ChatGPT plugin processing, per-account storage billing, billing integration, or production multi-worker durability.
- AI network calls need configured credentials and were not live-tested here.

Verification commands: `node --test tests/reels*.test.mjs`, `npm run build`. Changes are isolated on codex/reels-workflow; deploying main is not part of this change.

Validation: 14 tests passed; production Vite build passed; scripts/reels-smoke.mjs rendered and probed an actual 5-second landscape MP4 with text animation, original audio, denoise and normalization. No live provider or signed-in browser test was run.
