import { applyGapRemoval, validateForExport } from '../core/editPlan.js';

/** One explicit action; never run this from upload or a React effect. */
export async function runOneClickEdit({
  api, project, style, onStage = () => {}, onProject = () => {},
  onJob = () => {}, signal, cleanup = true, userPrompt = '',
  wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
}) {
  const check = () => { if (signal?.aborted) throw new Error('Stopped. Saved changes and original footage are retained.'); };
  const finishJob = async initial => {
    let job = initial;
    onJob(job);
    const deadline = Date.now() + 20 * 60 * 1000;
    while (!['succeeded', 'failed', 'cancelled'].includes(job.status)) {
      check();
      if (Date.now() > deadline) throw new Error('Processing is taking longer than expected. Check the export history before retrying.');
      await wait(1500);
      check();
      job = await api.getJobStatus(job.id);
      onJob(job);
    }
    check();
    if (job.status !== 'succeeded') throw new Error(job.error || 'Processing was cancelled.');
    return job;
  };
  check();
  if (!project.sources.length) throw new Error('Upload a video first.');
  let current = project;
  if (cleanup) {
    onStage('cleanup');
    const gaps = [];
    for (const source of current.sources) {
      if (!source.meta.hasAudio || !current.clips.some(c => c.enabled && c.sourceId === source.id)) continue;
      check();
      const job = await finishJob(await api.detectSilence(current.id, {
        sourceId: source.id, noiseDb: -35, minSilenceSec: 0.7, paddingSec: 0.2,
      }));
      gaps.push(...(job.result?.gaps || []));
    }
    check();
    const cleaned = applyGapRemoval(current, gaps);
    cleaned.audio = {
      ...cleaned.audio,
      denoise: { enabled: true, strength: 'light' },
      normalize: { enabled: true, targetLufs: -16 },
    };
    current = await api.saveRevision(current.id, current.revision, cleaned);
    onProject(current);
  }
  check();
  const validation = validateForExport(current);
  if (!validation.ok) throw new Error(validation.errors.join('; '));
  onStage('design');
  const result = await api.applyAiEdit(current.id, {
    engine: 'openai', style, removeGaps: false, baseRevision: current.revision,
    userPrompt: userPrompt || 'Edit this footage using the selected style. Keep the original speaker and meaning. Use restrained, content-aware visual emphasis.',
  });
  check();
  if (!result.project) throw new Error('The editor returned no saved editing plan.');
  current = result.project;
  onProject(current);
  onStage('render');
  const job = await finishJob(await api.startRender(current.id, {
    profile: 'export', revision: current.revision,
    idempotencyKey: 'one-click-' + current.id + '-' + current.revision,
  }));
  const output = await api.getJobDownloadUrl(job.id);
  check();
  onStage('done');
  return { project: current, output, job, transcript: result.transcript || '', summary: result.paperEditSummary || '' };
}
