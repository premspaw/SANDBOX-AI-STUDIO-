# ZeroLens AI Reels Editor — IDE implementation prompt

Copy the prompt below into the IDE opened on the actual ZeroLens repository. This is an implementation brief, not a claim that the repository or installed skills have already been audited. This final brief incorporates Pasted text.txt and the clarified product direction: editable raw-footage processing first, then reusable sentence-matched animations created with different skills. Upload this file into the IDE and ask it to follow the implementation sequence against the actual repository.

---

Act as a senior full-stack developer and video-processing engineer. Extend my existing ZeroLens product with a working AI-assisted short-video editor for customers. Inspect the real repository before choosing tools or editing code. Preserve working features and reuse existing authentication, billing, storage, database and deployment conventions where appropriate.

## 1. Product direction and limits

Build an AI-assisted video editor with three connected layers:

1. Core editing engine: turns raw footage into a non-destructive, editable video project with cuts, audio cleanup, speed changes, portrait framing and captions.
2. Story-aware planner: proposes a coherent short from the transcript, available visual analysis and the user's goal; explains proposed cuts, ordering and emphasis.
3. Extensible animation library: inserts reusable templates at relevant sentences or visual moments. Different skills can author different templates and style packs over time.

The core editor must work without an extra animation pack or a paid planning call. Users can manually edit and export. AI proposes structured changes to the same editable project; it must not flatten the video after each command. Templates enhance that project rather than replace the editing engine.

Primary journey: raw footage → media/transcript analysis → proposed story and cleanup edits → user-adjustable timeline → sentence-matched template suggestions → editable preview → export.

Users import footage, enter or speak a command, choose a visual style and editable templates, preview edits, revise them and export an MP4. Prioritize Instagram Reels and YouTube Shorts workflows. Initial output duration: 5–60 seconds, commonly 15 or 30 seconds. Default export: 1080 × 1920, 9:16, 30 fps, H.264 video with AAC audio when an audio track exists. These are product defaults, not claims about platform limits. Preserve original voice unless the user requests otherwise.

Keep the website responsive while uploads, analysis and rendering run. Users must not need an IDE, CLI or locally installed skills to use the hosted product.

Initial proposed upload cap: 250 MB per file and 120 seconds per source clip, configurable on the server. Enforce limits from measured media metadata as well as upload bytes. Offer a 60-second segment selector for longer valid footage. Do not silently truncate. This cap does not guarantee low resource use: resolution, frame rate, decoded frames, layers and concurrent jobs also matter.

First complete release: raw-footage editing with original audio, split/trim/reorder, adjustable gap removal, noise reduction and volume controls, constant speed changes, portrait framing, editable captions, story suggestions, five approved sentence-driven templates, lightweight previews and real export. Build this in small increments; the first working slice is deliberately smaller than the full release. Start with one source clip but support multiple editable segments and overlay/audio layers in project data. Full-footage generative stylization, voice cloning, stock-media search and advanced speed ramps are later extensions. Automated person cutouts require an actual segmentation integration and their own milestone, as specified below.

## 2. Audit first, then implement

Inspect repository guidance, package manifests, lockfiles, routes, authentication, tenant ownership, database, storage, upload logic, deployment configuration, media tooling and tests. Read installed skill instructions and their referenced templates or scripts. Determine the actual capabilities, licenses, preview method, deterministic seeking, render requirements and dependencies of the existing animation engine.

Report what exists, what is missing and the smallest implementation plan, then continue with reversible implementation. Do not claim to have inspected files that are absent. Do not install competing animation engines simply because they appear in this brief. Do not rewrite existing working infrastructure unnecessarily. Document deployment changes; do not publish, migrate production destructively or incur paid services merely to demonstrate a feature.

## 3. Architecture: hosted editor with separate rendering

Use these responsibilities; adapt names and technology to the existing codebase:

- Browser editor: upload selection, source playback, transcript editing, style/template gallery, timeline controls, undo/redo, preview, export request and job status.
- Application API: authentication, tenant authorization, projects, validated edit plans, AI planning, signed storage access and job submission. Never perform a full video render inside a normal HTTP request.
- Durable project database: ownership, source references, transcript, edit-plan revisions, pinned template versions and job/output references. Do not store media blobs or frame sequences in database rows.
- Private object storage: sources, proxy videos, thumbnails, approved template assets and finished exports. Use short-lived authorized URLs and direct resumable or multipart uploads where supported. Do not route the whole file through the application process unnecessarily.
- Durable queue and isolated render worker: inspection, proxies, supported media analysis, composition rendering, encoding and output validation. Use native FFmpeg/ffprobe where appropriate and the audited compatible composition engine.

These services may initially share one machine, but worker CPU/RAM/process limits and concurrency must be separate from the web process. This separation prevents a render from consuming unrestricted web resources; it does not create extra capacity. Start with one render at a time per worker and benchmark before raising it. Reuse a durable queue already present; otherwise select the smallest reliable solution after auditing dependencies.

Use one planner/orchestrator with deterministic tools. Separate agents per style are unnecessary for this release. Select style-specific instructions and templates by registry ID. Do not run an LLM in a frame loop or call it when a user changes a color or text position.

## 4. Distinguish skills, styles and templates

- Skill: instructions for planning and tool use; it does not itself supply a video renderer or runtime permission.
- Style pack: approved palette, fonts, artwork, visual examples and rules for combining templates.
- Template: versioned executable composition with validated editable parameters, timing constraints and actual preview media.
- Asset: licensed font, illustration, texture, audio or video used by a template.
- Renderer adapter: trusted code that validates and renders compatible compositions.

Use a registry that links these concepts explicitly. Keep skill instructions on the server/development side and approved browser preview components in lazy-loaded bundles. Loading a style should not download every other style or a full skill archive.

Support an open set of visual categories rather than building around one named style. Examples include kinetic typography, motion graphics, minimal business, comic or illustrated, painting-inspired, product demos, educational diagrams and data visualization. New compatible packs must not require redesigning the editor. Record visual category separately from the animation library or rendering engine.

### Admin template-authoring lifecycle

I will supply different skill packages gradually. Use those skills during development or a controlled admin authoring workflow to create reusable templates. The lifecycle is: inspect skill → identify useful capability → build a parameterized composition → validate inputs → test seeking/rendering → generate real thumbnail/demo → publish a version in the registry. Keep drafts separate from published templates, and preserve old versions for saved projects.

For normal customer editing, instantiate tested templates with parameters. Do not generate fresh executable animation code for every sentence or every export. Store source-skill provenance, dependencies and license alongside each published template. If a pack needs a new rendering capability, flag and implement/test that adapter before offering it to customers.

## 5. Core editing and story-aware experience

Implement import → inspect → analyze → propose edit → adjust timeline → recommend animations → preview → revise → export → download. Show source and edited views with an editable segment list or lightweight timeline. A polished general-purpose desktop editor is unnecessary, but every operation below needs a real user control and a saved project representation.

### 5.1 Raw-footage editing requirements

- Split, trim, remove, restore and reorder segments without modifying the source. Let users edit through timeline controls and, when available, transcript selection.
- Detect candidate silence/long gaps using configurable thresholds, minimum duration and preserved padding. Show the proposed removals and let users accept individually, reject or restore them. Protect quiet speech, breaths, dramatic pauses and word boundaries. Treat acoustic silence and semantically unnecessary repetition as different analyses.
- Separate audio controls: clip volume/mute/fades, conservative background-noise reduction and loudness normalization. Supply before/after preview and a reset control. Do not claim that lowering all audio is noise removal. Preserve speech intelligibility and avoid clipping; apply processing only when enabled.
- Constant slow/fast motion on selected segments, with supported speed bounds and an explicit audio policy: preserve pitch where available, mute or keep natural pitch as selected. Explain source-frame-rate limits in the control. Smooth frame interpolation is a separate optional processing mode, not an automatic property of slowed footage.
- Preserve accurate caption/overlay synchronization after trims, reordered clips and speed changes. Define whether an annotation is attached to source speech/content or to an absolute output frame. Remap or flag it for review rather than silently placing it on unrelated footage.
- Crop/position for portrait, caption editing and basic fades/cuts. Future speed ramps or hyperlapse effects must be explicit supported operations, never inferred from an ambiguous command. Ask a focused in-app clarification when an edit request has materially different interpretations.

### 5.2 Story-aware planning

Ask for or infer a simple objective such as educational reel, product explanation or testimonial. Use a timestamped transcript as the main speech evidence. Use sampled frames, scene changes or a configured vision service only when available and relevant; do not claim visual understanding from audio alone. For footage without speech, offer manual organization and supported visual analysis.

Return a proposed hook → development → payoff/CTA where appropriate, with source ranges, proposed output order, reasons and uncertainty. Suggest removal of repetition and off-topic sections without changing the speaker's factual meaning or removing important qualifications. Chronological order is the default; proposed reordering must be visible and reversible. For a target duration, suggest which ranges to keep rather than silently speeding up the entire speaker.

AI story suggestions require configured, tested planning capabilities. When unavailable, keep manual editing, acoustic analysis and export working and label semantic story planning unavailable. Never substitute silence detection for storyline understanding. Users can accept, reject or revise suggestions before adding templates.

### 5.3 Basic animation, pop-ups and cutouts

Provide editable title/text entrances, pop-up callouts, emphasis/highlight effects, shape/image overlays, simple transitions and placement/timing controls as ordinary editor capabilities. Use reviewed reusable components rather than another LLM call for every tweak.

Support uploaded transparent PNG/WebP cutout assets where the renderer can preserve alpha. Automatic person/object cutouts from footage require an actual segmentation/background-removal model or service. If unavailable, label that specific capability unavailable while allowing uploaded cutout assets. Build automatic cutouts in a separate milestone: maintain alpha masks, source timing and editable placement; benchmark temporal stability, edge quality and resource use. Do not call a rectangular crop a background-removed cutout.

### 5.4 Sentence-to-template matching

Start with five real, visually distinct templates: bold hook title, highlighted captions, sequential three-point list, product callout and before/after comparison. Make basic overlays available even with no external style pack installed. Each published template must have a real preview produced from its actual version.

Store template metadata including ID/version, purpose, semantic tags, supported languages/aspect ratios, duration limits, typed input schema, required asset slots, visual example, renderer compatibility, supported edit controls and authoring provenance. Add future chart/diagram/illustration templates using the same contract.

Examples of matching behavior:

| Speech intent | Candidate template | Required validated input |
| --- | --- | --- |
| “There are three reasons…” | Three-point list | Three real points from the content or user |
| “Our sales doubled.” | Rising chart, when installed | Supplied data, labels and units; no invented figures |
| “Stop making this mistake.” | Emphasis pop-up | Exact or user-approved wording |
| “Before and after…” | Comparison layout | Actual before/after media and labels |
| “Here is how it works.” | Step diagram, when installed | Supported steps from the content |

Match semantic meaning, intended emphasis, available assets, spoken duration and visual space; do not rely only on exact keywords. Produce structured suggestions containing source evidence/range, output timing, template ID/version, filled parameters, asset references, reason and confidence. Unsupported or missing parameters must trigger a request for those inputs or a simpler valid suggestion. A template ID in an example is not proof that its implementation exists.

Let users apply, replace, remove, disable or retime each suggestion. A user can choose a specific template even if the planner recommends another. Avoid automatically decorating every sentence: apply a configurable density/cooldown policy and prevent collisions with captions and other overlays. If nothing fits, keep the sentence clean.

After the user's selection, instantiate the template using validated parameters. Text, numbers, colors, font, scale, position, duration and asset slots remain editable when supported. Preserve selection and parameters across reloads and template version updates. Separate hook wording from visual hook style. Never invent prices, claims or testimonials.

### 5.5 Transcript, language and project editing

Transcription must support configured languages and be tested for Kannada, English and code-switching when a suitable provider is available. Bundle or serve properly licensed fonts that support the chosen script; verify shaping and line breaks. Report approximate timestamps honestly. Manual transcript/caption input must allow editing without a paid AI call. Voice commands are a separate transcription task; implement them after text commands work and show the recognized command before applying ambiguous edits.

Use configurable caption-safe margins with portrait preview guides. Do not claim fixed guides cover every platform's interface. Cap line length and word density; handle overflow rather than shrinking text indefinitely. Keep captions separate from decorative text layers.

An exported MP4 is flattened. The saved project must retain source references, clip order, cuts, speed, audio settings, transcript, captions and independent animation layers so users can return and edit them. A new export uses the selected project revision. Do not present a final MP4 as an editable timeline file.

## 6. Canonical edit plan and non-destructive revisions

Make one versioned, validated JSON project representation the source of truth for preview and export. Define its schema before connecting AI. Include:

- project schema version, project ID, owner and revision;
- canvas width/height, rational frame rate and integer total duration in frames;
- immutable source IDs, checksums and inspected metadata;
- ordered clips with source in/out, playback rate and output placement;
- explicit source-time-to-output-time mapping after trims or speed changes;
- caption cues and overlays on the output timeline;
- template ID plus pinned version, style ID plus version, typed parameters and asset IDs;
- audio gain, mute, fades, denoise and normalization settings; speed/audio policy and supported transitions;
- story-plan proposals and accepted/rejected decisions; source-anchored versus output-anchored annotations;
- cutout asset/mask references and segmentation tool/model versions when used;
- random seed where relevant and renderer configuration/version.

Use a documented policy to normalize variable frame rate and source timestamps. Never place source transcript timestamps directly on a cut output without remapping them. Recompute downstream timing after cuts and invalidate previews that depend on changed revisions.

Validate duration, ranges, overlap rules, font/asset availability, template constraints, tenant ownership and allowed parameters before saving or rendering. Invalid AI output must be rejected with a useful error, never interpreted as arbitrary JavaScript, shell or file paths.

Save undo/redo revisions. The Export button is explicit authorization to render the selected revision; an additional approval modal is optional. Snapshot its revision so later edits cannot alter a running export. Download must identify which revision produced it.

## 7. Preview and rendering correctness

Audit the installed renderer and implement one narrow adapter for the initial templates. If it lacks deterministic seeking or a deployable export path, document the gap and implement only the minimum required bridge, or recommend a specific replacement with reasons. Do not silently substitute engines.

Suggested internal operations: capabilities(), validate(project), preview(project, range, profile), render(project, profile), cancel(job), inspectOutput(path). Implement actual supported equivalents, not fake methods over unavailable tools.

Template visuals must be a function of output time/frame and validated inputs. Freeze random seeds, fonts, assets and versions; wait for media and fonts before capture. Avoid wall-clock animation and uncontrolled network dependencies. Scrubbing backward must produce the same frame. Preview and export use the same composition logic and project snapshot. Verify differences caused by lower preview resolution, media decoding or renderer constraints; do not promise pixel identity without testing it.

Use browser playback of a low-resolution proxy with approved overlays where reliable. For unsupported browser effects, render a short low-resolution preview on the worker. Prefer a requested 2–5 second range over rerendering an entire video for every parameter change. Final output uses original media when possible.

FFmpeg performs appropriate trims, framing, audio operations and encoding; the composition engine handles authored animation layers as needed. Select the pipeline based on actual capabilities rather than rebuilding a video renderer. Preserve A/V sync, rotation, aspect ratio and color metadata deliberately. Define a documented SDR output policy for HDR inputs.

## 8. Performance and costs

Keep large media outside application RAM and JSON. Use streaming reads/writes, object URLs, bounded decode buffers and cleanup on component disposal. Revoke object URLs and dispose players. Use Web Workers for suitable browser processing, but do not assume workers reduce total resource use or eliminate phone limitations. Avoid requiring ffmpeg.wasm or full-resolution in-browser export in version one.

Load the selected style/templates on demand; paginate the gallery and use static thumbnails until users open a preview. Reuse assets by content hash. Cache analysis by source checksum plus tool/model/settings version. Cache preview/export by authorized project content hash including templates, assets, fonts, seed and renderer version. Keep cached artifacts tenant-scoped unless intentionally public.

Debounce updates, cancel superseded preview requests and allow only bounded preview jobs per project. Do not pre-render every template for every upload. Reuse prebuilt template demonstration previews.

Record real processing time, peak RAM, input/output bytes, CPU profile, queue time, error rate and external usage per job. Model unit economics as compute + storage duration + egress + transcription/model usage + applicable tool licenses. A 30-second video does not imply a 30-second render. Do not promise a VPS capacity, unlimited exports or a fixed per-video price before benchmarking representative templates.

Set configurable initial constraints: 60-second output, 1080 × 1920 at 30 fps, 5 simultaneous overlay layers, 1 active export per user and 1 export per worker. These are initial guardrails, not measured hardware capacity. Require export quotas and upload limits before a paid public launch. Verify current commercial licensing of all renderers, fonts, codecs, assets and dependencies before adopting them.

## 9. Reliable, secure jobs

Persist states: queued, running, succeeded, failed and cancelled; track real stages such as inspect, proxy, compose, encode and validate. Show stage progress only when measurable; otherwise show an honest indeterminate stage. Add job leases/heartbeats, bounded retries for transient errors, idempotency keys and recovery after worker restarts. Do not blindly retry deterministic template failures.

Authorize every project/media/job/output request by tenant; never trust a client-provided owner ID or object key. Keep API credentials off the client. Sources are private and read-only. Isolate jobs in per-job directories with restricted network access and CPU/RAM/disk/time limits. Prevent path traversal, arbitrary subprocess execution and SSRF through media URLs. Use argument arrays, but also validate paths, media URLs and filter arguments.

Treat uploads, transcripts and imported skill instructions as untrusted. Admins curate templates; customers choose validated IDs and parameters. No customer-uploaded skill code, arbitrary HTML, remote URLs or shell scripts can execute in production. Render user text as text, never as executable markup. Review and sandbox any trusted template importer before publication.

Define configurable retention and deletion rules for originals, proxies, temporary frames and exports. Show users where their footage is processed. Hosted rendering requires uploading footage; do not describe this as local-only. Uploading to our storage does not automatically authorize disclosure to external AI providers. Request the relevant consent before external audio/frame transmission. Local-only processing would require a separate browser pipeline or installed companion app and is a future option.

## 10. Provider-neutral skill conversion contract

Convert only the actual Claude skill packages supplied in this repository or explicitly made available by me. If missing, implement the importer contract with fixtures and report that real conversion is pending. Never claim a skill was converted just by changing a filename.

For each supplied package, inspect its complete instructions, referenced scripts/assets and license without running untrusted code. Produce an inventory and conversion report. Preserve source provenance and hashes. Flag missing assets, unsupported tools, incompatible renderer requirements and restrictions. Mark compatibility unverified until tested.

Define this provider-neutral package convention for ZeroLens; it is our app contract, not a universal industry standard:

    skills/<skill-id>/
      manifest.json       # identity, schemaVersion, version, description, license,
                          # capabilities, requiredTools, supportedLanguages,
                          # inputSchema/outputSchema references and provenance
      instructions.md     # provider-neutral goals, workflow and failure rules
      input.schema.json
      output.schema.json
      examples/           # valid inputs and expected structured outputs
      tests/              # compatibility/contract fixtures
      references/         # reviewed supporting material

Keep executable template code and large assets in the separate curated template/asset registry. The skill references their pinned IDs. Use ordinary Markdown and JSON Schema, stable relative references and explicit capability names. Include examples of valid output and unsupported-operation responses.

Remove provider-specific assumptions from the common instructions: no hard-coded Claude tool names, implicit filesystem permissions, conversation memory requirements or assumed browser/shell access. Preserve useful source-specific material in provenance/references. Add thin adapters for Claude, Codex/OpenAI and Gemini that translate tool declarations, structured-output requests and errors to each configured API. Implement only APIs actually configured/testable here; label others unverified.

Validate all model outputs against the same canonical edit-plan/action schema and template allowlist. Provider interchangeability requires runtime tool adapters as well as readable instructions. Identical prompts do not guarantee identical model behavior or visuals. Run common fixtures with configured providers and report their actual pass/fail/untested status.

Do not add large skill documents to every request. Retrieve only relevant instructions, registry summaries and selected transcript ranges within a bounded context budget. Keep secrets out of prompts and logs. Development skills help the IDE build the product; production instructions must be intentionally integrated through the backend API rather than relying on an IDE subscription or installed desktop skill.

## 11. Implementation sequence

The full requested product includes core editing, story planning and extensible templates. Deliver working increments in the following order; do not label the smaller first slice as the full release.

1. **Audit and project contract.** Inspect the actual repository and skills, document capabilities/deployment constraints and define canonical project/action schemas.
2. **First working slice.** Import a real 10–30 second clip, save its project, split/trim it, preview and export an MP4 through a background job. Reopen the project and make another edit. Add one real editable text overlay. Establish ownership, bounded jobs and output validation from this stage.
3. **Core editor.** Add segment reorder/restore, configurable gap removal, gain/mute/fades, conservative denoise/normalization, constant speed changes, crop, editable captions, proxies and undo/redo. Test time remapping and audio sync. Core manual editing/export must work independently of AI planning and external packs.
4. **Story planning.** Integrate transcript analysis and configured text-command planning. Show evidence, source ranges, proposed structure and reasons; implement accept/reject/revise. Add supported visual analysis only when configured. Then add voice commands using the working command pipeline.
5. **Sentence-matched templates.** Complete all five initial templates, real gallery previews, editable parameters, semantic matching, missing-input handling, density controls and user overrides. Test sentence alignment after timeline changes.
6. **Additional skills and styles.** Convert supplied skills to the provider-neutral contract, build/publish their tested reusable templates and add new packs one at a time. Keep publication/admin authoring separate from normal user editing. Record pass/fail/untested compatibility.
7. **Automatic cutouts and advanced effects.** Integrate and benchmark an actual segmentation capability when available; preserve the transparent-asset workflow meanwhile. Add speed ramps, interpolation or other advanced effects only through explicit tested capabilities.
8. **Release readiness.** Complete worker recovery, quotas, retention, benchmarks, deployment instructions and representative visual/audio QA. Report implemented/tested/blocked/deferred status for each milestone. If credentials block an integration, continue independent work and document the exact setup required.

Do not build an extensive gallery before one complete edit-to-export path works. Do not mark an unconnected UI, mock job, hard-coded plan or fake preview complete. Avoid broad infrastructure rewrites or unnecessary agents. Build meaningful tests for media timing, validation, ownership and job recovery rather than tests that merely mirror UI markup.

## 12. Acceptance checks

- A real 30-second source becomes a playable portrait export with visible selected animation, editable captions if configured and original voice preserved.
- A project reopens with editable segment order/cuts, speed, audio settings, captions, crop and independent template layers. Removing extra animation packs does not disable core manual editing or export for projects without those packs.
- Gap-removal thresholds and boundary padding are adjustable; restoring a removed range updates downstream timing correctly. Quiet speech and intentional pauses can be retained.
- Denoise and gain/normalization are independently controlled and audible in before/after previews. Constant speed changes preserve the selected audio policy and keep captions aligned.
- Story suggestions show actual source evidence and reversible ordering decisions; unavailable semantic/visual analysis is labeled accurately. No transcript-only analysis is presented as visual understanding.
- Sentence-matched suggestions choose implemented compatible templates, preserve actual meaning/data and support replace/remove/retime. Missing comparison assets and chart data cannot produce fabricated results.
- Transparent cutout assets composite correctly. Automatic footage cutouts are marked complete only after real segmentation, temporal/edge-quality review and timing tests.
- Each of the five initial templates has a real preview and renders from saved editable parameters. Switching visual style preserves the underlying clip edits.
- Frame seeking and rendered sample frames agree at representative times using a defined visual tolerance; compare the actual decoded export too. Verify audio sync across a cut.
- Kannada/English rendering, missing fonts, long text and mixed-language wrapping are checked with real assets.
- Test exactly 60 seconds, oversized files, invalid media, rotated footage, missing audio, variable frame rate and malformed or out-of-range AI output.
- Cross-tenant access to projects, jobs and storage references is denied; uploaded content cannot request tool execution.
- A render runs without blocking the web request. Concurrency limits, cancellation, idempotency and worker restart recovery are exercised.
- Failed jobs leave no published successful output. Successful outputs pass ffprobe checks for duration within documented tolerance, dimensions, streams/codecs, and decode checks, plus visual review of template timing and text.
- Report measured resource use and elapsed time on the tested machine. Clearly separate implemented, tested, blocked and deferred features.

Begin with the repository audit and then implement the smallest working slice. Ask only for decisions or credentials that genuinely block the next step; continue independent work when possible.

---

## Reference notes for the product owner

This final brief defines a hosted 5–60 second editor: raw-footage cleanup and story planning form the foundation; different skills author reusable animation templates that can be matched to sentences and edited by users. Core editing does not depend on selecting extra animation packs. The phased sequence distinguishes a working first slice from the complete requested product.

No actual ZeroLens repository or Claude skill archive was supplied with this request, so neither is represented as audited or converted. The conversion section tells the IDE how to inspect and convert supplied packages without inventing compatibility.

Technical references checked on 23 October 2026:

- Anime.js documentation: https://animejs.com/documentation/ — JavaScript animation tooling; not an anime video generator.
- FFmpeg filters: https://ffmpeg.org/ffmpeg-filters.html — media filters and build-dependent capabilities.
- MDN Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API — separate execution threads for suitable browser tasks.
- Remotion license/pricing: https://www.remotion.dev/docs/license/pricing — check eligibility and current commercial requirements if choosing this renderer; do not assume it is cost-free for a hosted editor.
