/**
 * Reels Editor client API service.
 * Communicates with /api/reels/* using the global authenticated fetch.
 */

async function handleResponse(res) {
  if (!res.ok) {
    let errMessage = `HTTP ${res.status}`;
    let errData = null;
    try {
      errData = await res.json();
      errMessage = errData.error || errData.message || errMessage;
    } catch {
      // Non-JSON response
    }
    const err = new Error(errMessage);
    err.status = res.status;
    err.data = errData;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const reelsApi = {
  async getConfig() {
    const res = await fetch('/api/reels/config');
    return handleResponse(res);
  },

  async listProjects() {
    const res = await fetch('/api/reels/projects');
    const data = await handleResponse(res);
    return data.projects || [];
  },

  async createProject(name = 'Untitled reel') {
    const res = await fetch('/api/reels/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await handleResponse(res);
    return data.project;
  },

  async getProject(projectId) {
    const res = await fetch(`/api/reels/projects/${encodeURIComponent(projectId)}`);
    const data = await handleResponse(res);
    return data.project;
  },

  async saveRevision(projectId, baseRevision, project) {
    const res = await fetch(`/api/reels/projects/${encodeURIComponent(projectId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseRevision, project }),
    });
    const data = await handleResponse(res);
    return data.project;
  },

  async deleteProject(projectId) {
    const res = await fetch(`/api/reels/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  async uploadSource(projectId, file, { onProgress } = {}) {
    const formData = new FormData();
    formData.append('file', file);

    // If onProgress is supported via XHR
    if (onProgress && typeof XMLHttpRequest !== 'undefined') {
      let authToken = null;
      try {
        const { supabase } = await import('../../../lib/supabase.js');
        const sessionRes = await supabase?.auth?.getSession?.();
        authToken = sessionRes?.data?.session?.access_token || null;
      } catch (_authErr) {
        // Continue without auth header if session retrieval fails
      }

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/reels/projects/${encodeURIComponent(projectId)}/sources`);
        if (authToken) {
          xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        }
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (err) {
              reject(err);
            }
          } else {
            let msg = `Upload failed (HTTP ${xhr.status})`;
            try {
              const body = JSON.parse(xhr.responseText);
              if (body?.error) msg = body.error;
            } catch (_err) {
              // Ignore non-JSON error response body
            }
            const err = new Error(msg);
            err.status = xhr.status;
            reject(err);
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
      });
    }

    const res = await fetch(`/api/reels/projects/${encodeURIComponent(projectId)}/sources`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  async getSourceMediaUrl(projectId, sourceId) {
    const res = await fetch(`/api/reels/projects/${encodeURIComponent(projectId)}/sources/${encodeURIComponent(sourceId)}/url`);
    const data = await handleResponse(res);
    return data.url;
  },

  async detectSilence(projectId, { sourceId, noiseDb = -35, minSilenceSec = 0.6, paddingSec = 0.15 }) {
    const res = await fetch(`/api/reels/projects/${encodeURIComponent(projectId)}/analyze/silence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, noiseDb, minSilenceSec, paddingSec }),
    });
    const data = await handleResponse(res);
    return data.job;
  },

  async startRender(projectId, { profile = 'export', revision, startFrame, durationSec, idempotencyKey } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;

    const res = await fetch(`/api/reels/projects/${encodeURIComponent(projectId)}/renders`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ profile, revision, startFrame, durationSec }),
    });
    const data = await handleResponse(res);
    return data.job;
  },

  async listRecentExports(projectId) {
    const res = await fetch(`/api/reels/projects/${encodeURIComponent(projectId)}/jobs`);
    const data = await handleResponse(res);
    return data.jobs || [];
  },

  async getJobStatus(jobId) {
    const res = await fetch(`/api/reels/jobs/${encodeURIComponent(jobId)}`);
    const data = await handleResponse(res);
    return data.job;
  },

  async cancelJob(jobId) {
    const res = await fetch(`/api/reels/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: 'POST',
    });
    const data = await handleResponse(res);
    return data.job;
  },

  async getJobDownloadUrl(jobId) {
    const res = await fetch(`/api/reels/jobs/${encodeURIComponent(jobId)}/url`);
    return handleResponse(res);
  },

  async getAiEngines() {
    const res = await fetch('/api/reels/ai-engines');
    const data = await handleResponse(res);
    return data.engines || [];
  },

  async applyAiEdit(
    projectId,
    {
      engine = 'gemini',
      style = 'viral-hook',
      removeGaps = true,
      userPrompt = '',
      scriptText = '',
      referenceNotes = '',
      proofNotes = '',
    } = {}
  ) {
    const res = await fetch(`/api/reels/projects/${encodeURIComponent(projectId)}/ai-edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engine,
        style,
        removeGaps,
        userPrompt,
        scriptText,
        referenceNotes,
        proofNotes,
      }),
    });
    return handleResponse(res);
  },

  async extractScript(projectId, { engine = 'gemini' } = {}) {
    const res = await fetch(`/api/reels/projects/${encodeURIComponent(projectId)}/extract-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engine }),
    });
    return handleResponse(res);
  },

  async analyzeHooks(projectId, { scriptText = '', userPrompt = '', engine = 'gemini' } = {}) {
    const res = await fetch(`/api/reels/projects/${encodeURIComponent(projectId)}/analyze-hooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptText, userPrompt, engine }),
    });
    return handleResponse(res);
  },
};
