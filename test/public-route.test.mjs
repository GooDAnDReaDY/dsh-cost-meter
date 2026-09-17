import path from 'node:path'
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { isTrustedCaller, isLoopback, name as serverName } from '../lib/index.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
const client = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
const sourceFiles = [
  'README.md',
  'README.ru.md',
  'README.zh.md',
  'docs/design/DESIGN.md',
]

test('public package identity is aligned across package, patch, and browser loader and server half', () => {
  const name = '@goodandready/dsh-cost-meter'
  assert.equal(pkg.name, name, 'package.json name matches')
  assert.match(patch, new RegExp(`name: ['"]${name.replace('/', '\\/')}['"]`), 'cordis.patch.yml matches')
  assert.match(client, new RegExp(`id: ['"]${name.replace('/', '\\/')}['"]`), 'client loader matches')
  assert.equal(serverName, name, 'lib/index.js export const name matches')
  assert.equal(pkg.publishConfig.access, 'public')
})

test('published docs do not prescribe local installs or machine-specific paths', async () => {
  const forbidden = [/file:/i, /link:/i, /(?:\/home\/|\/mnt\/|[A-Z]:\\)/, /192\.168\./, /codex_[^\s/]+/i, /goodandready-private/i]
  for (const relative of sourceFiles) {
    if (fs.existsSync(new URL(`../${relative}`, import.meta.url))) {
      const text = await readFile(new URL(`../${relative}`, import.meta.url), 'utf8')
      for (const pattern of forbidden) assert.doesNotMatch(text, pattern, relative)
    }
  }
  const indexSource = await readFile(new URL('../lib/index.js', import.meta.url), 'utf8')
  assert.doesNotMatch(indexSource, /\/home\/vadim|192\.168\.|codex_migrate|file:/i)
  assert.match(indexSource, /homedir\(\)/)
  assert.ok(
    root.endsWith('dsh-cost-meter/') || root.includes('/dsh-cost-meter/.worktrees/'),
    'package must live in the canonical dsh-cost-meter directory or its worktree'
  )
})

test('isTrustedCaller guards write routes against cross-origin and untrusted callers', () => {
  // Loopback socket allows
  assert.equal(isTrustedCaller({ socket: { remoteAddress: '127.0.0.1' }, headers: {} }), true)
  assert.equal(isTrustedCaller({ socket: { remoteAddress: '::1' }, headers: {} }), true)
  assert.equal(isTrustedCaller({ socket: { remoteAddress: '::ffff:127.0.0.1' }, headers: {} }), true)

  // Non-loopback remote address
  const remoteReq = { socket: { remoteAddress: '192.168.1.50' } }

  // Same-origin sec-fetch-site allows
  assert.equal(isTrustedCaller({ ...remoteReq, headers: { 'sec-fetch-site': 'same-origin' } }), true)
  assert.equal(isTrustedCaller({ ...remoteReq, headers: { 'sec-fetch-site': 'same-site' } }), true)

  // Cross-site sec-fetch-site rejects
  assert.equal(isTrustedCaller({ ...remoteReq, headers: { 'sec-fetch-site': 'cross-site' } }), false)

  // Matching origin and host allows
  assert.equal(isTrustedCaller({ ...remoteReq, headers: { host: '192.168.1.111:3080', origin: 'http://192.168.1.111:3080' } }), true)

  // Mismatched origin and host rejects
  assert.equal(isTrustedCaller({ ...remoteReq, headers: { host: '192.168.1.111:3080', origin: 'http://evil.com' } }), false)

  // No headers and non-loopback rejects
  assert.equal(isTrustedCaller({ ...remoteReq, headers: {} }), false)
  assert.equal(isTrustedCaller(null), false)
})

test('tarball metadata keeps only the public package name and canonical files', () => {
  const hasLib = pkg.files.includes('lib') || pkg.files.includes('lib/')
  assert.equal(hasLib, true, 'files includes lib')
  assert.equal(pkg.files.includes('cordis.patch.yml'), true, 'files includes cordis.patch.yml')
  assert.equal(pkg.files.includes('README.md'), true, 'files includes README.md')
  assert.equal(pkg.files.includes('README.ru.md'), true, 'files includes README.ru.md')
  assert.equal(pkg.files.includes('README.zh.md'), true, 'files includes README.zh.md')
  assert.equal(pkg.files.includes('docs'), false, 'files excludes whole docs folder')
  assert.equal(pkg.name.startsWith('@goodandready/'), true)
  assert.equal(pkg.name.includes('-private'), false)
})

test('tariff helpers preserve route matching and UTC window parsing', async () => {
  const { hhmmToMinutes, parseWindow, indexCatalog, matchModel, resolveTariff } = await import('../lib/index.js')
  assert.equal(hhmmToMinutes(1000), 600)
  assert.deepEqual(parseWindow('01:00-04:00'), { start: 60, end: 240 })
  assert.equal(parseWindow('not-a-window'), undefined)
  const index = indexCatalog([{ id: 'openai/gpt-5', pricing: { prompt: '0.000001', completion: '0.000002' } }])
  assert.equal(matchModel(index, { provider: 'openai', model: 'gpt-5' }, {}), 'openai/gpt-5')
  const deepseek = resolveTariff({ prices: {}, deepseekPeakPrices: {}, manualOffPeakMultiplier: 1 }, index, { provider: 'deepseek', model: 'deepseek-v4-flash' })
  assert.equal(deepseek.source, 'deepseek')
  assert.equal(deepseek.schedule.windows.length, 2)
})

test("client loader factory executes cleanly without reference errors", async () => {
  const clientPath = path.join(root, "lib", "client.js");
  const code = fs.readFileSync(clientPath, "utf8");

  let loadedDef = null;
  const mockWindow = {
    __ModuleLoader__: {
      load: (def) => {
        loadedDef = def;
      }
    }
  };

  const fn = new Function("window", "require", "module", "exports", code);
  const fakeRequire = (name) => {
    if (name === "react") {
      return {
        createElement: () => ({}),
        useEffect: () => {},
        useState: (init) => [init, () => {}],
        useCallback: (fn) => fn,
        useMemo: (fn) => fn()
      };
    }
    return {};
  };

  fn(mockWindow, fakeRequire, { exports: {} }, {});
  assert.ok(loadedDef, "module definition was registered with window.__ModuleLoader__");
  assert.equal(loadedDef.id, "@goodandready/dsh-cost-meter");
  
  // Execute factory
  const modExports = loadedDef.factory(fakeRequire);
  assert.ok(modExports, "factory executed cleanly");
  assert.equal(typeof modExports.apply, "function");
  assert.ok(Array.isArray(modExports.inject));
});

test("client apply handles ctx.effect, locale undo, and multiple apply cleanly without lanSettings", async () => {
  const clientPath = path.join(root, "lib", "client.js");
  const code = fs.readFileSync(clientPath, "utf8");

  let loadedDef = null;
  const mockWindow = {
    __ModuleLoader__: {
      load: (def) => {
        loadedDef = def;
      }
    }
  };

  const fn = new Function("window", "require", "module", "exports", code);
  const fakeRequire = (name) => {
    if (name === "react") {
      return {
        createElement: () => ({}),
        useEffect: () => {},
        useState: (init) => [init, () => {}],
        useCallback: (fn) => fn,
        useMemo: (fn) => fn()
      };
    }
    return {};
  };

  fn(mockWindow, fakeRequire, { exports: {} }, {});
  const modExports = loadedDef.factory(fakeRequire);

  // Assert package.json client inject contains locale
  assert.deepEqual(pkg.dsh.client.inject, ["@deepseek-ai/dsh-client-locale"]);

  // Verify code does not contain any reference to lanSettings
  assert.doesNotMatch(code, /lanSettings/, "client.js must not reference alien lanSettings");

  // Mock Cordis Context with effects, locale, and settingsScope
  let registeredLocales = null;
  const activeEffects = [];
  let unregisterCount = 0;

  const mockCtx = {
    locale: {
      register: (ns, dicts) => {
        registeredLocales = { ns, dicts };
        return () => { unregisterCount += 1; };
      }
    },
    effect: (fn, label) => {
      activeEffects.push(label);
      return fn();
    },
    settingsScope: {
      bind: () => ({ getSnapshot: () => ({ status: 'ready' }), subscribe: () => () => {} }),
      describe: () => ({
        getSnapshot: () => ({ view: { namespaces: [{ ns: 'dsh-cost-meter' }] } }),
        load: () => {}
      })
    },
    slots: {
      inject: (slot, cb) => cb(),
      register: () => {}
    }
  };

  // Run apply first time
  modExports.apply(mockCtx);
  assert.ok(registeredLocales, "locales registered");
  assert.equal(registeredLocales.ns, "dsh-cost-meter");
  assert.ok(registeredLocales.dicts.en, "en dictionary registered");
  assert.ok(registeredLocales.dicts.zh, "zh dictionary registered");
  assert.ok(activeEffects.includes("dsh-cost-meter: locale dictionaries"), "locale effect mounted");

  // Run apply second time (re-mount / reload simulation)
  assert.doesNotThrow(() => {
    modExports.apply(mockCtx);
  }, "multiple apply runs cleanly without throwing");
});
