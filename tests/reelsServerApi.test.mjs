import test from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'fs/promises';
import path from 'path';
import * as store from '../server/reels/store.js';
import { createEmptyProject, newId, addSource, updateClip } from '../src/features/ReelsEditor/core/editPlan.js';

test('server store: project lifecycle with revisions and optimistic concurrency', async () => {
  const testOwner = 'test_owner_' + Date.now();
  const projectId = newId('p');
  const initial = createEmptyProject({ id: projectId, ownerId: testOwner, name: 'Reels Concurrency Test' });

  // 1. Create project
  const created = await store.createProject(testOwner, initial);
  assert.equal(created.id, projectId);
  assert.equal(created.revision, 0);

  // 2. Fetch project
  const fetched = await store.getProject(testOwner, projectId);
  assert.equal(fetched.name, 'Reels Concurrency Test');

  // 3. Save new revision with matching baseRevision
  const updated1 = await store.saveRevision(testOwner, projectId, {
    baseRevision: 0,
    incoming: { ...fetched, name: 'Revision 1 Name' },
  });
  assert.equal(updated1.revision, 1);
  assert.equal(updated1.name, 'Revision 1 Name');

  // 4. Attempt save with stale baseRevision (0 when current is 1) -> must throw 409
  await assert.rejects(
    async () => {
      await store.saveRevision(testOwner, projectId, {
        baseRevision: 0,
        incoming: { ...fetched, name: 'Stale Edit' },
      });
    },
    (err) => err.status === 409
  );

  // 5. Revision history is preserved
  const rev0 = await store.getRevision(testOwner, projectId, 0);
  assert.equal(rev0.name, 'Reels Concurrency Test');
  const rev1 = await store.getRevision(testOwner, projectId, 1);
  assert.equal(rev1.name, 'Revision 1 Name');

  // 6. Cleanup
  await store.deleteProject(testOwner, projectId);
  const deleted = await store.getProject(testOwner, projectId);
  assert.equal(deleted, null);
});
