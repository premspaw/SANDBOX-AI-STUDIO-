import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, transformWithEsbuild } from 'vite';
import { chromium } from 'playwright';
import { parse } from '@babel/parser';

// Exercise the real App and Layout against production React and a real Zustand
// store. Only leaf views and services are stubbed: no credentials, backend calls,
// account writes, paid generation, or third-party requests are involved.
const root = fileURLToPath(new URL('..', import.meta.url));
const appPath = path.join(root, 'src/App.jsx');
const layoutPath = path.join(root, 'src/components/pages/Layout.jsx');
const fixturePrefix = '\0auth-suspense-fixture:';

const appSource = await readFile(appPath, 'utf8');
const appAst = parse(appSource, { sourceType: 'module', plugins: ['jsx'] });
function walk(node, visit, ancestors = []) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node, ancestors);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end', 'comments', 'tokens'].includes(key)) continue;
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child === 'object') walk(child, visit, [...ancestors, node]);
    }
  }
}
const insideSuspense = ancestors => ancestors.some(node =>
  node.type === 'JSXElement' && node.openingElement.name.name === 'Suspense');

test('all lazy page mounts are covered by Suspense, including the sign-in modal', () => {
  const lazyNames = new Set();
  walk(appAst, node => {
    if (node.type === 'VariableDeclarator' && node.init?.callee?.name === 'lazyWithRetry') {
      lazyNames.add(node.id.name);
    }
  });
  assert.ok(lazyNames.has('AuthPage'));
  let routeCalls = 0;
  walk(appAst, (node, ancestors) => {
    if (node.type === 'CallExpression' && node.callee.name === 'renderTabContent') {
      routeCalls++;
      assert.ok(insideSuspense(ancestors), 'Tab content needs a Suspense ancestor');
    }
    if (node.type !== 'JSXElement' || !lazyNames.has(node.openingElement.name.name)) return;
    const isTabContent = ancestors.some(parent =>
      parent.type === 'VariableDeclarator' && parent.id.name === 'renderTabContent');
    assert.ok(isTabContent || insideSuspense(ancestors),
      `${node.openingElement.name.name} at line ${node.loc.start.line} has no Suspense ancestor`);
  });
  assert.equal(routeCalls, 1);
});

test('the sign-in modal keeps an accessible close control outside pending content', () => {
  let controls = 0;
  walk(appAst, (node, ancestors) => {
    if (node.type !== 'JSXElement' || node.openingElement.name.name !== 'button') return;
    const label = node.openingElement.attributes.find(attribute => attribute.name?.name === 'aria-label');
    if (label?.value?.value !== 'Close sign in') return;
    controls++;
    assert.equal(insideSuspense(ancestors), false);
    const handler = node.openingElement.attributes.find(attribute => attribute.name?.name === 'onClick');
    const call = handler.value.expression.body;
    assert.equal(call.callee.name, 'setShowingAuthModal');
    assert.equal(call.arguments[0].value, false);
  });
  assert.equal(controls, 1);
});

// Opt in where Chromium can launch:
// RUN_BROWSER_AUTH_SUSPENSE=1 CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node --test tests/authModalSuspense.test.mjs
const browserTest = process.env.RUN_BROWSER_AUTH_SUSPENSE === '1' ? test : test.skip;


function fixtures() {
  return {
    name: 'auth-modal-suspense-regression',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === 'auth-suspense-entry') return fixturePrefix + 'entry';
      if (source === 'lucide-react') return fixturePrefix + 'icons';
      if (/\/store$/.test(source)) return fixturePrefix + 'store';
      if (importer === appPath) {
        if (source.endsWith('/Layout')) return layoutPath;
        if (source.endsWith('/supabase')) return fixturePrefix + 'supabase';
        if (source.endsWith('/favicon')) return fixturePrefix + 'favicon';
        if (source.startsWith('./')) return fixturePrefix + path.basename(source) + '.jsx';
      }
      if (importer === layoutPath && source.startsWith('.')) {
        return fixturePrefix + path.basename(source) + '.jsx';
      }
    },
    async transform(code, id) {
      if (id.startsWith(fixturePrefix) && id.endsWith('.jsx')) {
        return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'transform' });
      }
    },
    load(id) {
      if (!id.startsWith(fixturePrefix)) return;
      const name = id.slice(fixturePrefix.length);
      if (name === 'entry') return `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import App from ${JSON.stringify(appPath)};
        createRoot(document.getElementById('root')).render(React.createElement(App));
      `;
      if (name === 'store') return `
        import { create } from 'zustand';
        export const useAppStore = create(set => ({
          activeTab: 'home', userProfile: null, isAdmin: false,
          isShowingAuthModal: false,
          setActiveTab: activeTab => set({ activeTab }),
          setShowingAuthModal: isShowingAuthModal => set({ isShowingAuthModal }),
          fetchUserProfile() {}, clearSession() {}, setIsAdmin() {}, setShowAdminLogin() {}
        }));
      `;
      if (name === 'supabase') return `
        export const supabase = { auth: {
          getSession: () => new URLSearchParams(location.search).has('pending-session')
            ? new Promise(() => {}) : Promise.resolve({ data: { session: null } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
        }};
      `;
      if (name === 'favicon') return 'export function initFaviconAnimation() {}';
      if (name === 'icons') return 'export const X = () => null; export const Bot = () => null;';
      if (name === 'Sidebar.jsx') return `
        import React from 'react';
        import { useAppStore } from './store';
        export function Sidebar({ setActiveTab }) {
          return <nav data-testid="navigation">
            <button onClick={() => useAppStore.getState().setShowingAuthModal(true)}>Open sign in</button>
            {['home', 'auth', 'pricing', 'studio'].map(tab =>
              <button key={tab} onClick={() => setActiveTab(tab)}>Go {tab}</button>)}
          </nav>;
        }
      `;
      if (name === 'MobileNav.jsx') return 'export const MobileNav = () => null;';
      if (name === 'AuthPage.jsx') return `
        import React from 'react';
        export default function AuthPage({ isModal, onAuthSuccess }) {
          return <section data-testid={isModal ? 'auth-modal' : 'auth-page'}>
            <p>Sign in ready</p>
            <button onClick={() => onAuthSuccess({ id: 'test-only-user' })}>Finish mock sign in</button>
          </section>;
        }
      `;
      if (name === 'Toast.jsx') return 'export const Toast = () => null;';
      if (['ClaimFreeCreditsModal.jsx', 'AdminLoginModal.jsx', 'ProjectVaultModal.jsx'].includes(name)) {
        return 'export default () => null;';
      }
      const view = name.replace(/\.jsx$/, '');
      return `
        import React from 'react';
        function Page() { return <section data-testid=${JSON.stringify(view)}>${view}</section>; }
        export default Page;
        export { Page as ${view} };
      `;
    }
  };
}

async function startFixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'zerolens-auth-suspense-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await build({
    root, configFile: false, envFile: false, logLevel: 'error',
    plugins: [fixtures()],
    build: {
      outDir: directory, emptyOutDir: true,
      rollupOptions: {
        input: 'auth-suspense-entry',
        onwarn(warning, warn) { if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning); },
        output: { entryFileNames: 'entry.js', chunkFileNames: '[name]-[hash].js' }
      }
    }
  });
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (!pathname.endsWith('.js')) {
      response.setHeader('Content-Type', 'text/html');
      response.end('<div id="root"></div><script type="module" src="/entry.js"></script>');
      return;
    }
    try {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(await readFile(path.join(directory, path.basename(pathname))));
    } catch {
      response.statusCode = 404;
      response.end('Not found');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || chromium.executablePath(), args: ['--no-sandbox'] });
  t.after(() => browser.close());
  return { browser, url: `http://127.0.0.1:${server.address().port}` };
}

async function createPage(t, browser, url, { pendingSession = false } = {}) {
  const context = await browser.newContext();
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let requested;
  const chunkRequested = new Promise(resolve => { requested = resolve; });
  await page.route('**/*AuthPage-*.js', async route => {
    requested();
    await gate;
    await route.continue().catch(() => {});
  });
  // Accidental calls outside the local fixture are test failures.
  const externalRequests = [];
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === url) return route.fallback();
    externalRequests.push(route.request().url());
    return route.abort();
  });
  t.after(() => {
    release();
    assert.deepEqual(pageErrors, [], 'No uncaught React errors: ' + pageErrors.join('; '));
    assert.deepEqual(externalRequests, [], 'No external requests');
  });
  await page.goto(url + (pendingSession ? '/?pending-session' : '/'));
  await page.getByTestId('LandingPage').waitFor();
  return { page, release, chunkRequested, pageErrors };
}

async function waitForModalLoader(page) {
  await page.getByRole('button', { name: 'Close sign in' }).waitFor();
  await page.getByText('Loading Studio', { exact: true }).waitFor();
  assert.equal(await page.getByTestId('LandingPage').isVisible(), true);
  assert.equal(await page.getByTestId('navigation').isVisible(), true);
}

browserTest('cold sign-in modal suspends safely, supports dismissal/reopening, and completes', { timeout: 30000 }, async t => {
  const { browser, url } = await startFixture(t);
  const { page, release, chunkRequested } = await createPage(t, browser, url);
  await page.getByRole('button', { name: 'Open sign in', exact: true }).click();
  await chunkRequested;
  await waitForModalLoader(page);
  await page.getByRole('button', { name: 'Close sign in' }).click();
  assert.equal(await page.getByText('Loading Studio', { exact: true }).count(), 0);
  assert.equal(await page.getByTestId('LandingPage').isVisible(), true);
  // Reopening while the same lazy import is still pending must remain safe.
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Open sign in', exact: true }).click();
    await waitForModalLoader(page);
    await page.getByRole('button', { name: 'Close sign in' }).click();
  }
  await page.getByRole('button', { name: 'Open sign in', exact: true }).click();
  release();
  await page.getByTestId('auth-modal').waitFor();
  await page.getByRole('button', { name: 'Close sign in' }).click();
  await page.getByRole('button', { name: 'Open sign in', exact: true }).click();
  await page.getByTestId('auth-modal').waitFor();
  await page.getByRole('button', { name: 'Finish mock sign in' }).click();
  assert.equal(await page.getByTestId('auth-modal').count(), 0);
  assert.equal(await page.getByTestId('LandingPage').isVisible(), true);
});

browserTest('cold auth tab keeps its existing fallback and respects newer navigation and history', { timeout: 30000 }, async t => {
  const { browser, url } = await startFixture(t);
  const { page, release, chunkRequested } = await createPage(t, browser, url);
  await page.getByRole('button', { name: 'Go auth', exact: true }).click();
  await chunkRequested;
  await page.getByText('Loading Studio', { exact: true }).waitFor();
  assert.equal(await page.getByTestId('navigation').isVisible(), true);
  await page.getByRole('button', { name: 'Go pricing', exact: true }).click();
  await page.getByTestId('PricingPage').waitFor();
  release();
  assert.equal(await page.getByTestId('auth-page').count(), 0);
  await page.goBack();
  await page.getByTestId('auth-page').waitFor();
  await page.goForward();
  await page.getByTestId('PricingPage').waitFor();
});

browserTest('a pending session lookup does not make cold modal loading crash the app', { timeout: 30000 }, async t => {
  const { browser, url } = await startFixture(t);
  const { page, release, chunkRequested } = await createPage(t, browser, url, { pendingSession: true });
  await page.getByRole('button', { name: 'Open sign in', exact: true }).click();
  await chunkRequested;
  await waitForModalLoader(page);
  release();
  await page.getByTestId('auth-modal').waitFor();
  assert.equal(await page.getByTestId('LandingPage').isVisible(), true);
});
