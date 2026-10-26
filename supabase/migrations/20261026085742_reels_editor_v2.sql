-- ZeroLens Reels Editor v2
--
-- This migration deliberately leaves the legacy reels_* tables intact so a
-- verified importer can move projects over without deleting source footage.
-- All v2 data is private, tenant-scoped, and written by the application
-- server/worker using its service-role key.

-- ---------------------------------------------------------------------------
-- Canonical project state and immutable revision history
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reels_v2_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  legacy_project_id text UNIQUE,
  name text NOT NULL DEFAULT 'Untitled reel'
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'processing', 'ready', 'failed', 'archived')),
  current_revision integer NOT NULL DEFAULT 0 CHECK (current_revision >= 0),
  project_spec jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(project_spec) = 'object'),
  canvas_policy jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(canvas_policy) = 'object'),
  brand_spec jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(brand_spec) = 'object'),
  template_locks jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(template_locks) = 'object'),
  provider_config jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(provider_config) = 'object'),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(settings) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.reels_v2_project_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.reels_v2_projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision >= 0),
  parent_revision integer CHECK (parent_revision IS NULL OR parent_revision >= 0),
  operation text NOT NULL CHECK (operation IN (
    'create', 'auto_edit', 'restore_span', 'cleanup_decision', 'caption_update',
    'scene_update', 'style_update', 'source_update', 'import', 'system'
  )),
  patch jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(patch) = 'object'),
  project_spec jsonb NOT NULL CHECK (jsonb_typeof(project_spec) = 'object'),
  canvas_policy jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(canvas_policy) = 'object'),
  brand_spec jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(brand_spec) = 'object'),
  template_locks jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(template_locks) = 'object'),
  provider_config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(provider_config) = 'object'),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings) = 'object'),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_kind text NOT NULL DEFAULT 'user' CHECK (actor_kind IN ('user', 'worker', 'system', 'import')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, revision)
);

-- ---------------------------------------------------------------------------
-- Original source metadata, transcript evidence, and edit decisions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reels_v2_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.reels_v2_projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_order smallint NOT NULL CHECK (source_order BETWEEN 0 AND 2),
  storage_bucket text NOT NULL DEFAULT 'reels-v2-originals'
    CHECK (storage_bucket = 'reels-v2-originals'),
  object_path text NOT NULL CHECK (
    char_length(object_path) BETWEEN 1 AND 1024
    AND object_path !~ '^/'
    AND object_path !~ '(^|/)\\.\\.(/|$)'
  ),
  original_filename text NOT NULL CHECK (char_length(original_filename) BETWEEN 1 AND 255),
  content_type text NOT NULL DEFAULT 'video/mp4',
  byte_size bigint NOT NULL CHECK (byte_size >= 0 AND byte_size <= 262144000),
  sha256 text NOT NULL CHECK (sha256 ~ '^[A-Fa-f0-9]{64}$'),
  duration_us bigint NOT NULL CHECK (duration_us > 0 AND duration_us <= 120000000),
  display_width integer NOT NULL CHECK (display_width BETWEEN 1 AND 7680),
  display_height integer NOT NULL CHECK (display_height BETWEEN 1 AND 7680),
  rotation smallint NOT NULL DEFAULT 0 CHECK (rotation IN (0, 90, 180, 270)),
  timebase_num integer NOT NULL DEFAULT 1 CHECK (timebase_num > 0),
  timebase_den integer NOT NULL DEFAULT 1000000 CHECK (timebase_den > 0),
  fps_num integer CHECK (fps_num IS NULL OR fps_num > 0),
  fps_den integer CHECK (fps_den IS NULL OR fps_den > 0),
  has_audio boolean NOT NULL DEFAULT false,
  variable_frame_rate boolean NOT NULL DEFAULT false,
  media_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(media_metadata) = 'object'),
  probe_status text NOT NULL DEFAULT 'pending' CHECK (probe_status IN ('pending', 'probed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz,
  UNIQUE (project_id, source_order),
  UNIQUE (storage_bucket, object_path)
);

CREATE TABLE IF NOT EXISTS public.reels_v2_word_anchors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.reels_v2_projects(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.reels_v2_sources(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_revision integer NOT NULL DEFAULT 0 CHECK (source_revision >= 0),
  word_index integer NOT NULL CHECK (word_index >= 0),
  text text NOT NULL CHECK (char_length(btrim(text)) BETWEEN 1 AND 300),
  start_us bigint NOT NULL CHECK (start_us >= 0),
  end_us bigint NOT NULL CHECK (end_us > start_us),
  output_start_us bigint CHECK (output_start_us IS NULL OR output_start_us >= 0),
  output_end_us bigint CHECK (output_end_us IS NULL OR output_end_us > COALESCE(output_start_us, -1)),
  confidence double precision CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  alignment_quality text NOT NULL DEFAULT 'estimated'
    CHECK (alignment_quality IN ('exact', 'aligned', 'estimated', 'low')),
  transcript_chunk integer CHECK (transcript_chunk IS NULL OR transcript_chunk >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, source_revision, word_index)
);

CREATE TABLE IF NOT EXISTS public.reels_v2_cleanup_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.reels_v2_projects(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.reels_v2_sources(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision >= 0),
  candidate_kind text NOT NULL CHECK (candidate_kind IN ('pause', 'repetition', 'filler', 'off_topic', 'manual')),
  start_us bigint NOT NULL CHECK (start_us >= 0),
  end_us bigint NOT NULL CHECK (end_us > start_us),
  decision text NOT NULL DEFAULT 'proposed'
    CHECK (decision IN ('proposed', 'accepted', 'rejected', 'protected')),
  confidence double precision CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  protected_word_ids uuid[] NOT NULL DEFAULT '{}',
  rationale jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(rationale) = 'object'),
  source_mapping jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(source_mapping) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, revision, source_id, start_us, end_us, candidate_kind)
);

CREATE TABLE IF NOT EXISTS public.reels_v2_cleanup_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.reels_v2_projects(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.reels_v2_cleanup_candidates(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision >= 0),
  decision text NOT NULL CHECK (decision IN ('accepted', 'rejected', 'protected', 'restored')),
  playhead_us bigint CHECK (playhead_us IS NULL OR playhead_us >= 0),
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, revision, candidate_id)
);

-- ---------------------------------------------------------------------------
-- Deterministic visual plan and render artifacts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reels_v2_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.reels_v2_projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision >= 0),
  scene_order integer NOT NULL CHECK (scene_order >= 0),
  scene_type text NOT NULL CHECK (scene_type IN (
    'emphasis_text', 'ordered_cards', 'process_arrows', 'comparison',
    'concept_diagram', 'speaker_inset'
  )),
  start_us bigint NOT NULL CHECK (start_us >= 0),
  end_us bigint NOT NULL CHECK (end_us > start_us),
  anchor_ids uuid[] NOT NULL DEFAULT '{}',
  spec jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(spec) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, revision, scene_order)
);

CREATE TABLE IF NOT EXISTS public.reels_v2_captions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.reels_v2_projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision >= 0),
  caption_order integer NOT NULL CHECK (caption_order >= 0),
  start_us bigint NOT NULL CHECK (start_us >= 0),
  end_us bigint NOT NULL CHECK (end_us > start_us),
  text text NOT NULL CHECK (char_length(btrim(text)) BETWEEN 1 AND 1000),
  anchor_ids uuid[] NOT NULL DEFAULT '{}',
  spec jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(spec) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, revision, caption_order)
);

CREATE TABLE IF NOT EXISTS public.reels_v2_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.reels_v2_projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision >= 0),
  effect_order integer NOT NULL CHECK (effect_order >= 0),
  effect_type text NOT NULL CHECK (effect_type IN ('sound_effect', 'transition', 'audio_mix', 'motion')),
  start_us bigint NOT NULL CHECK (start_us >= 0),
  end_us bigint NOT NULL CHECK (end_us >= start_us),
  spec jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(spec) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, revision, effect_order)
);

-- ---------------------------------------------------------------------------
-- Durable worker queue state, audit events, output records, and usage
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reels_v2_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.reels_v2_projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision >= 0),
  job_type text NOT NULL CHECK (job_type IN (
    'auto_edit', 'probe', 'transcribe', 'align', 'cleanup', 'story_plan', 'preview_render', 'export_render'
  )),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'leased', 'running', 'succeeded', 'failed', 'cancelled')),
  stage text NOT NULL DEFAULT 'uploaded' CHECK (stage IN (
    'uploaded', 'probed', 'transcribed', 'aligned', 'cleanup_proposed', 'cleanup_applied',
    'story_planned', 'preview_rendered', 'export_rendered', 'validated', 'failed', 'cancelled'
  )),
  priority smallint NOT NULL DEFAULT 0 CHECK (priority BETWEEN -100 AND 100),
  progress double precision NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 1),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(snapshot) = 'object'),
  result jsonb CHECK (result IS NULL OR jsonb_typeof(result) = 'object'),
  error_code text,
  error_message text,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 20),
  run_after timestamptz NOT NULL DEFAULT now(),
  worker_id text,
  lease_token uuid,
  lease_expires_at timestamptz,
  cancel_requested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  CHECK (
    (status IN ('leased', 'running') AND worker_id IS NOT NULL AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR status NOT IN ('leased', 'running')
  )
);

CREATE TABLE IF NOT EXISTS public.reels_v2_job_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.reels_v2_jobs(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.reels_v2_projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created', 'leased', 'started', 'progress', 'stage', 'retry', 'succeeded', 'failed', 'cancelled', 'validation')),
  stage text,
  progress double precision CHECK (progress IS NULL OR progress BETWEEN 0 AND 1),
  message text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reels_v2_render_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.reels_v2_projects(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.reels_v2_jobs(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision >= 0),
  artifact_kind text NOT NULL CHECK (artifact_kind IN ('proxy', 'waveform', 'thumbnail', 'preview', 'export', 'validation_report')),
  storage_bucket text NOT NULL DEFAULT 'reels-v2-renders'
    CHECK (storage_bucket = 'reels-v2-renders'),
  object_path text NOT NULL CHECK (
    char_length(object_path) BETWEEN 1 AND 1024
    AND object_path !~ '^/'
    AND object_path !~ '(^|/)\\.\\.(/|$)'
  ),
  content_type text NOT NULL,
  byte_size bigint CHECK (byte_size IS NULL OR byte_size >= 0),
  sha256 text CHECK (sha256 IS NULL OR sha256 ~ '^[A-Fa-f0-9]{64}$'),
  duration_us bigint CHECK (duration_us IS NULL OR duration_us >= 0),
  renderer_version text,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(validation) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (storage_bucket, object_path)
);

CREATE TABLE IF NOT EXISTS public.reels_v2_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.reels_v2_projects(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.reels_v2_jobs(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_kind text NOT NULL CHECK (usage_kind IN ('analysis', 'transcription', 'alignment', 'preview_render', 'export_render', 'storage')),
  state text NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved', 'consumed', 'released', 'failed')),
  units numeric(14, 4) NOT NULL DEFAULT 0 CHECK (units >= 0),
  credit_delta integer NOT NULL DEFAULT 0,
  provider text,
  model text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.reels_v2_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.reels_v2_projects(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision >= 0),
  job_id uuid REFERENCES public.reels_v2_jobs(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  model text NOT NULL,
  capability text NOT NULL CHECK (capability IN ('transcription', 'alignment', 'semantic_cleanup', 'story_plan', 'scene_plan', 'render')),
  skill_version text,
  request_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Every FK and the worker's query shape has an index. The partial queue index
-- keeps terminal job history out of the hot claim path.
CREATE INDEX IF NOT EXISTS reels_v2_projects_owner_updated_idx
  ON public.reels_v2_projects (owner_id, updated_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS reels_v2_project_revisions_project_revision_idx
  ON public.reels_v2_project_revisions (project_id, revision DESC);
CREATE INDEX IF NOT EXISTS reels_v2_project_revisions_owner_created_idx
  ON public.reels_v2_project_revisions (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reels_v2_sources_project_order_idx
  ON public.reels_v2_sources (project_id, source_order);
CREATE INDEX IF NOT EXISTS reels_v2_sources_owner_project_idx
  ON public.reels_v2_sources (owner_id, project_id);
CREATE INDEX IF NOT EXISTS reels_v2_word_anchors_source_position_idx
  ON public.reels_v2_word_anchors (source_id, source_revision, start_us, end_us);
CREATE INDEX IF NOT EXISTS reels_v2_word_anchors_project_output_idx
  ON public.reels_v2_word_anchors (project_id, output_start_us, output_end_us);
CREATE INDEX IF NOT EXISTS reels_v2_cleanup_candidates_project_revision_idx
  ON public.reels_v2_cleanup_candidates (project_id, revision, source_id, start_us);
CREATE INDEX IF NOT EXISTS reels_v2_cleanup_decisions_candidate_idx
  ON public.reels_v2_cleanup_decisions (candidate_id);
CREATE INDEX IF NOT EXISTS reels_v2_cleanup_decisions_project_revision_idx
  ON public.reels_v2_cleanup_decisions (project_id, revision, created_at);
CREATE INDEX IF NOT EXISTS reels_v2_scenes_project_revision_idx
  ON public.reels_v2_scenes (project_id, revision, scene_order);
CREATE INDEX IF NOT EXISTS reels_v2_captions_project_revision_idx
  ON public.reels_v2_captions (project_id, revision, caption_order);
CREATE INDEX IF NOT EXISTS reels_v2_effects_project_revision_idx
  ON public.reels_v2_effects (project_id, revision, effect_order);
CREATE INDEX IF NOT EXISTS reels_v2_jobs_project_created_idx
  ON public.reels_v2_jobs (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reels_v2_jobs_owner_created_idx
  ON public.reels_v2_jobs (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reels_v2_jobs_claim_idx
  ON public.reels_v2_jobs (priority DESC, run_after, created_at)
  WHERE status IN ('queued', 'leased', 'running');
CREATE INDEX IF NOT EXISTS reels_v2_jobs_lease_idx
  ON public.reels_v2_jobs (lease_expires_at)
  WHERE status IN ('leased', 'running');
CREATE INDEX IF NOT EXISTS reels_v2_job_events_job_created_idx
  ON public.reels_v2_job_events (job_id, created_at, id);
CREATE INDEX IF NOT EXISTS reels_v2_job_events_project_created_idx
  ON public.reels_v2_job_events (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reels_v2_render_artifacts_project_revision_idx
  ON public.reels_v2_render_artifacts (project_id, revision, created_at DESC);
CREATE INDEX IF NOT EXISTS reels_v2_render_artifacts_job_idx
  ON public.reels_v2_render_artifacts (job_id);
CREATE INDEX IF NOT EXISTS reels_v2_usage_owner_created_idx
  ON public.reels_v2_usage (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reels_v2_usage_project_idx
  ON public.reels_v2_usage (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reels_v2_provenance_project_revision_idx
  ON public.reels_v2_provenance (project_id, revision, created_at);

-- ---------------------------------------------------------------------------
-- Transactional server-only operations. SECURITY INVOKER keeps RLS in force
-- for non-service callers; only service_role receives EXECUTE below.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reels_v2_create_project(
  p_owner_id uuid,
  p_name text,
  p_project_spec jsonb DEFAULT '{}'::jsonb,
  p_canvas_policy jsonb DEFAULT '{}'::jsonb,
  p_brand_spec jsonb DEFAULT '{}'::jsonb,
  p_template_locks jsonb DEFAULT '{}'::jsonb,
  p_provider_config jsonb DEFAULT '{}'::jsonb,
  p_settings jsonb DEFAULT '{}'::jsonb,
  p_legacy_project_id text DEFAULT NULL
)
RETURNS public.reels_v2_projects
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_project public.reels_v2_projects;
BEGIN
  IF jsonb_typeof(p_project_spec) <> 'object'
    OR jsonb_typeof(p_canvas_policy) <> 'object'
    OR jsonb_typeof(p_brand_spec) <> 'object'
    OR jsonb_typeof(p_template_locks) <> 'object'
    OR jsonb_typeof(p_provider_config) <> 'object'
    OR jsonb_typeof(p_settings) <> 'object' THEN
    RAISE EXCEPTION 'reels_v2_invalid_project_spec' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.reels_v2_projects (
    owner_id, legacy_project_id, name, project_spec, canvas_policy, brand_spec,
    template_locks, provider_config, settings
  ) VALUES (
    p_owner_id, p_legacy_project_id, btrim(p_name), p_project_spec, p_canvas_policy, p_brand_spec,
    p_template_locks, p_provider_config, p_settings
  ) RETURNING * INTO v_project;

  INSERT INTO public.reels_v2_project_revisions (
    project_id, owner_id, revision, parent_revision, operation, patch, project_spec,
    canvas_policy, brand_spec, template_locks, provider_config, settings, actor_id, actor_kind
  ) VALUES (
    v_project.id, p_owner_id, 0, NULL, 'create', '{}'::jsonb, p_project_spec,
    p_canvas_policy, p_brand_spec, p_template_locks, p_provider_config, p_settings, p_owner_id, 'user'
  );

  RETURN v_project;
END;
$$;

CREATE OR REPLACE FUNCTION public.reels_v2_apply_revision(
  p_owner_id uuid,
  p_project_id uuid,
  p_expected_revision integer,
  p_operation text,
  p_patch jsonb,
  p_project_spec jsonb,
  p_canvas_policy jsonb DEFAULT NULL,
  p_brand_spec jsonb DEFAULT NULL,
  p_template_locks jsonb DEFAULT NULL,
  p_provider_config jsonb DEFAULT NULL,
  p_settings jsonb DEFAULT NULL,
  p_actor_kind text DEFAULT 'user'
)
RETURNS public.reels_v2_projects
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current public.reels_v2_projects;
  v_project public.reels_v2_projects;
BEGIN
  IF p_expected_revision < 0 OR jsonb_typeof(p_patch) <> 'object' OR jsonb_typeof(p_project_spec) <> 'object' THEN
    RAISE EXCEPTION 'reels_v2_invalid_revision_payload' USING ERRCODE = '22023';
  END IF;
  IF p_operation NOT IN ('auto_edit', 'restore_span', 'cleanup_decision', 'caption_update', 'scene_update', 'style_update', 'source_update', 'import', 'system') THEN
    RAISE EXCEPTION 'reels_v2_invalid_revision_operation' USING ERRCODE = '22023';
  END IF;
  IF p_actor_kind NOT IN ('user', 'worker', 'system', 'import') THEN
    RAISE EXCEPTION 'reels_v2_invalid_actor_kind' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_current
  FROM public.reels_v2_projects
  WHERE id = p_project_id AND owner_id = p_owner_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reels_v2_project_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_current.current_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'reels_v2_revision_conflict' USING ERRCODE = '40001';
  END IF;
  IF (p_canvas_policy IS NOT NULL AND jsonb_typeof(p_canvas_policy) <> 'object')
    OR (p_brand_spec IS NOT NULL AND jsonb_typeof(p_brand_spec) <> 'object')
    OR (p_template_locks IS NOT NULL AND jsonb_typeof(p_template_locks) <> 'object')
    OR (p_provider_config IS NOT NULL AND jsonb_typeof(p_provider_config) <> 'object')
    OR (p_settings IS NOT NULL AND jsonb_typeof(p_settings) <> 'object') THEN
    RAISE EXCEPTION 'reels_v2_invalid_project_spec' USING ERRCODE = '22023';
  END IF;

  UPDATE public.reels_v2_projects
  SET
    current_revision = v_current.current_revision + 1,
    project_spec = p_project_spec,
    canvas_policy = COALESCE(p_canvas_policy, v_current.canvas_policy),
    brand_spec = COALESCE(p_brand_spec, v_current.brand_spec),
    template_locks = COALESCE(p_template_locks, v_current.template_locks),
    provider_config = COALESCE(p_provider_config, v_current.provider_config),
    settings = COALESCE(p_settings, v_current.settings),
    updated_at = now()
  WHERE id = v_current.id
  RETURNING * INTO v_project;

  INSERT INTO public.reels_v2_project_revisions (
    project_id, owner_id, revision, parent_revision, operation, patch, project_spec,
    canvas_policy, brand_spec, template_locks, provider_config, settings, actor_id, actor_kind
  ) VALUES (
    v_project.id, p_owner_id, v_project.current_revision, v_current.current_revision,
    p_operation, p_patch, v_project.project_spec, v_project.canvas_policy, v_project.brand_spec,
    v_project.template_locks, v_project.provider_config, v_project.settings, p_owner_id, p_actor_kind
  );

  RETURN v_project;
END;
$$;

CREATE OR REPLACE FUNCTION public.reels_v2_claim_job(
  p_worker_id text,
  p_lease_seconds integer DEFAULT 300
)
RETURNS SETOF public.reels_v2_jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job public.reels_v2_jobs;
  v_lease_seconds integer := LEAST(GREATEST(COALESCE(p_lease_seconds, 300), 30), 3600);
BEGIN
  IF char_length(btrim(COALESCE(p_worker_id, ''))) NOT BETWEEN 1 AND 160 THEN
    RAISE EXCEPTION 'reels_v2_invalid_worker_id' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_job
  FROM public.reels_v2_jobs
  WHERE cancel_requested_at IS NULL
    AND (
      (status = 'queued' AND run_after <= now())
      OR (status IN ('leased', 'running') AND lease_expires_at < now())
    )
  ORDER BY priority DESC, run_after, created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.reels_v2_jobs
  SET
    status = 'leased',
    worker_id = btrim(p_worker_id),
    lease_token = gen_random_uuid(),
    lease_expires_at = now() + make_interval(secs => v_lease_seconds),
    attempt_count = v_job.attempt_count + 1,
    started_at = COALESCE(v_job.started_at, now())
  WHERE id = v_job.id
  RETURNING * INTO v_job;

  INSERT INTO public.reels_v2_job_events (job_id, project_id, owner_id, event_type, stage, progress, message)
  VALUES (v_job.id, v_job.project_id, v_job.owner_id, 'leased', v_job.stage, v_job.progress, 'Job leased to worker');

  RETURN NEXT v_job;
END;
$$;

CREATE OR REPLACE FUNCTION public.reels_v2_renew_job_lease(
  p_job_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_lease_seconds integer DEFAULT 300
)
RETURNS public.reels_v2_jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job public.reels_v2_jobs;
  v_lease_seconds integer := LEAST(GREATEST(COALESCE(p_lease_seconds, 300), 30), 3600);
BEGIN
  UPDATE public.reels_v2_jobs
  SET lease_expires_at = now() + make_interval(secs => v_lease_seconds)
  WHERE id = p_job_id
    AND worker_id = p_worker_id
    AND lease_token = p_lease_token
    AND status IN ('leased', 'running')
    AND cancel_requested_at IS NULL
  RETURNING * INTO v_job;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reels_v2_job_lease_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_job;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reels_v2_create_project(uuid, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reels_v2_apply_revision(uuid, uuid, integer, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reels_v2_claim_job(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reels_v2_renew_job_lease(uuid, text, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reels_v2_create_project(uuid, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reels_v2_apply_revision(uuid, uuid, integer, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reels_v2_claim_job(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reels_v2_renew_job_lease(uuid, text, uuid, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- Row-level security and explicit Data API grants
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  table_name text;
  reels_tables text[] := ARRAY[
    'reels_v2_projects', 'reels_v2_project_revisions', 'reels_v2_sources',
    'reels_v2_word_anchors', 'reels_v2_cleanup_candidates', 'reels_v2_cleanup_decisions',
    'reels_v2_scenes', 'reels_v2_captions', 'reels_v2_effects', 'reels_v2_jobs',
    'reels_v2_job_events', 'reels_v2_render_artifacts', 'reels_v2_usage', 'reels_v2_provenance'
  ];
BEGIN
  FOREACH table_name IN ARRAY reels_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS reels_v2_owner_select ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS reels_v2_owner_insert ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS reels_v2_owner_update ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY reels_v2_owner_select ON public.%I FOR SELECT TO authenticated USING ((select auth.uid()) = owner_id)',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY reels_v2_owner_insert ON public.%I FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = owner_id)',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY reels_v2_owner_update ON public.%I FOR UPDATE TO authenticated USING ((select auth.uid()) = owner_id) WITH CHECK ((select auth.uid()) = owner_id)',
      table_name
    );
  END LOOP;
END;
$$;

REVOKE ALL ON TABLE
  public.reels_v2_projects,
  public.reels_v2_project_revisions,
  public.reels_v2_sources,
  public.reels_v2_word_anchors,
  public.reels_v2_cleanup_candidates,
  public.reels_v2_cleanup_decisions,
  public.reels_v2_scenes,
  public.reels_v2_captions,
  public.reels_v2_effects,
  public.reels_v2_jobs,
  public.reels_v2_job_events,
  public.reels_v2_render_artifacts,
  public.reels_v2_usage,
  public.reels_v2_provenance
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.reels_v2_projects,
  public.reels_v2_project_revisions,
  public.reels_v2_sources,
  public.reels_v2_word_anchors,
  public.reels_v2_cleanup_candidates,
  public.reels_v2_cleanup_decisions,
  public.reels_v2_scenes,
  public.reels_v2_captions,
  public.reels_v2_effects,
  public.reels_v2_jobs,
  public.reels_v2_job_events,
  public.reels_v2_render_artifacts,
  public.reels_v2_usage,
  public.reels_v2_provenance
TO authenticated;

-- The normal browser can create its own project record and record a personal
-- cleanup decision. All source finalization, revisions, worker jobs, render
-- outputs, and usage are server/worker-only operations.
GRANT INSERT, UPDATE ON TABLE public.reels_v2_projects, public.reels_v2_cleanup_decisions TO authenticated;
GRANT ALL PRIVILEGES ON TABLE
  public.reels_v2_projects,
  public.reels_v2_project_revisions,
  public.reels_v2_sources,
  public.reels_v2_word_anchors,
  public.reels_v2_cleanup_candidates,
  public.reels_v2_cleanup_decisions,
  public.reels_v2_scenes,
  public.reels_v2_captions,
  public.reels_v2_effects,
  public.reels_v2_jobs,
  public.reels_v2_job_events,
  public.reels_v2_render_artifacts,
  public.reels_v2_usage,
  public.reels_v2_provenance
TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.reels_v2_job_events_id_seq TO service_role;

-- ---------------------------------------------------------------------------
-- Private Supabase Storage buckets. We create bucket metadata and RLS policies
-- only; no storage schema is altered and objects are always written through
-- the Storage API.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('reels-v2-originals', 'reels-v2-originals', false, 262144000,
    ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska', 'video/x-msvideo', 'application/octet-stream']::text[]),
  ('reels-v2-renders', 'reels-v2-renders', false, 262144000,
    ARRAY['video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'image/jpeg', 'image/png', 'application/json']::text[])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS reels_v2_storage_read_own ON storage.objects;
DROP POLICY IF EXISTS reels_v2_storage_upload_own_originals ON storage.objects;
DROP POLICY IF EXISTS reels_v2_storage_update_own_originals ON storage.objects;

CREATE POLICY reels_v2_storage_read_own
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('reels-v2-originals', 'reels-v2-renders')
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

CREATE POLICY reels_v2_storage_upload_own_originals
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'reels-v2-originals'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

CREATE POLICY reels_v2_storage_update_own_originals
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'reels-v2-originals'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'reels-v2-originals'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);
