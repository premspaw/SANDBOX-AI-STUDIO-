import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTrustedApiRequest, createAuthenticatedFetch } from '../../src/lib/authenticatedFetch.js';
import { requireAppUser } from '../../server/auth/requireAppUser.js';

test('API sessions never match an external origin or a misleading path/query', () => {
  for (const input of ['https://evil.example/api/credits', '//evil.example/api/credits', 'https://zerolens.in.evil.example/api/credits', '/public?next=/api/credits', 'javascript:/api/credits', 'https://user:pass@zerolens.in/api/credits']) {
    assert.equal(isTrustedApiRequest(input, 'https://zerolens.in'), false, input);
  }
  assert.equal(isTrustedApiRequest('/api/credits', 'https://zerolens.in'), true);
  assert.equal(isTrustedApiRequest(new URL('https://api.zerolens.in/api/credits'), 'https://zerolens.in', 'https://api.zerolens.in'), true);
});
test('fetch wrapper preserves Request headers, does not mutate init and respects caller authorization', async () => {
  let captured; let lookups = 0;
  const wrapped = createAuthenticatedFetch({ fetch: async (input, init) => { captured = { input, init }; return 'ok'; }, getSession: async () => { lookups++; return { data: { session: { access_token: 'ephemeral-test-token' } } }; }, origin: 'https://zerolens.in' });
  const request = new Request('https://zerolens.in/api/credits', { headers: { 'X-Test': 'preserved' } });
  const init = { method: 'POST' };
  assert.equal(await wrapped(request, init), 'ok');
  assert.equal(captured.init.headers.get('X-Test'), 'preserved');
  assert.equal(captured.init.headers.get('Authorization'), 'Bearer ephemeral-test-token');
  assert.equal(init.headers, undefined);
  await wrapped('/api/credits', { headers: { authorization: 'Bearer caller-token' } });
  assert.equal(lookups, 1);
  await wrapped('https://external.example/api/path');
  assert.equal(lookups, 1);
});
test('app authentication fails closed without configured verifier or valid session', async () => {
  await assert.rejects(requireAppUser({ headers: {} }, null), { status: 401 });
  await assert.rejects(requireAppUser({ headers: { authorization: 'Bearer test' } }, null), { status: 503 });
  await assert.rejects(requireAppUser({ headers: { authorization: 'Bearer test' } }, { auth: { getUser: async () => ({ data: { user: null }, error: {} }) } }), { status: 401 });
  const user = await requireAppUser({ headers: { authorization: 'Bearer test' }, body: { userId: 'another' } }, { auth: { getUser: async () => ({ data: { user: { id: 'verified' } }, error: null }) } });
  assert.equal(user.id, 'verified');
});
