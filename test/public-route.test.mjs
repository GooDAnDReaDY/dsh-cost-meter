import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
const client = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
const sourceFiles = [
  'README.md',
  'AGENTS.md',
  'index.md',
  'docs/design/DESIGN.md',
  'docs/testing/public-route.md',
  'docs/deployment/public-release.md',
]

test('public package identity is aligned across package, patch, and browser loader', () => {
  const name = '@goodandready/dsh-cost-meter'
  assert.equal(pkg.name, name)
  assert.match(patch, new RegExp(`name: ['"]${name.replace('/', '\\/')}['"]`))
  assert.match(client, new RegExp(`id: ['"]${name.replace('/', '\\/')}['"]`))
  assert.equal(pkg.publishConfig.access, 'public')
})

test('published docs do not prescribe local installs or machine-specific paths', async () => {
  const forbidden = [/file:/i, /link:/i, /(?:\/home\/|\/mnt\/|[A-Z]:\\)/, /192\.168\./, /codex_[^\s/]+/i, /goodandready-private/i]
  for (const relative of sourceFiles) {
    const text = await readFile(new URL(`../${relative}`, import.meta.url), 'utf8')
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, relative)
  }
  const indexSource = await readFile(new URL('../lib/index.js', import.meta.url), 'utf8')
  assert.doesNotMatch(indexSource, /\/home\/vadim|192\.168\.|codex_migrate|file:/i)
  assert.match(indexSource, /homedir\(\)/)
  assert.ok(
    root.endsWith('dsh-cost-meter/') || root.includes('/dsh-cost-meter/.worktrees/'),
    'package must live in the canonical dsh-cost-meter directory or its worktree'
  )
})

test('tarball metadata keeps only the public package name', () => {
  assert.equal(pkg.files.includes('lib'), true)
  assert.equal(pkg.files.includes('cordis.patch.yml'), true)
  assert.equal(pkg.files.includes('docs'), true)
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

