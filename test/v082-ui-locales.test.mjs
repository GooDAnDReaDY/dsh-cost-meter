import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('v0.8.2: client module registers canonical en and zh locales and excludes internal ru', () => {
  let loadedModule = null
  let registeredLocales = null
  const mockWindow = {
    __ModuleLoader__: {
      load: ({ id, factory }) => {
        if (id === '@goodandready/dsh-cost-meter') {
          const mockReact = {
            createElement: (type, props, ...children) => ({ type, props, children }),
            useState: (init) => [init, () => {}],
            useEffect: () => {},
            useMemo: (fn) => fn(),
            useCallback: (fn) => fn,
            useRef: (init) => ({ current: init }),
            useSyncExternalStore: () => ({ status: 'ready', value: {} }),
            Fragment: 'Fragment',
            Component: class MockComponent {
              constructor(props) { this.props = props; this.state = {} }
              setState(next) { this.state = Object.assign(this.state, typeof next === 'function' ? next(this.state) : next) }
            },
          }
          loadedModule = factory((pkg) => (pkg === 'react' ? mockReact : {}))
        }
      },
    },
  }

  const clientCode = fs.readFileSync(path.resolve('lib/client.js'), 'utf8')
  const fn = new Function('window', clientCode)
  fn(mockWindow)

  assert.ok(loadedModule, 'Client module must be loaded')

  // Mock ctx to test locale registration
  const mockCtx = {
    locale: {
      register: (ns, dicts) => {
        registeredLocales = { ns, dicts }
      },
    },
    slots: { inject: () => {} },
  }

  loadedModule.apply(mockCtx)
  assert.ok(registeredLocales, 'ctx.locale.register must be called')
  assert.equal(registeredLocales.ns, 'dsh-cost-meter')
  assert.ok(registeredLocales.dicts.en, 'English locale dictionary must be present')
  assert.ok(registeredLocales.dicts.zh, 'Chinese locale dictionary must be present')
  assert.equal(registeredLocales.dicts.ru, undefined, 'Russian dictionary must NOT be hardcoded inside plugin')

  // Verify key parity between en and zh
  const enKeys = Object.keys(registeredLocales.dicts.en).sort()
  const zhKeys = Object.keys(registeredLocales.dicts.zh).sort()
  assert.deepEqual(enKeys, zhKeys, 'en and zh dictionaries must contain the exact same keys')

  // Verify specific new v0.8.2 keys exist
  assert.ok(enKeys.includes('savings.cache_saved'))
  assert.ok(enKeys.includes('models.show_more'))
  assert.ok(enKeys.includes('models.show_less'))
})

test('v0.8.2: client CSS contains dot status indicator classes', () => {
  const clientCode = fs.readFileSync(path.resolve('lib/client.js'), 'utf8')
  assert.ok(clientCode.includes('.dcm-dot-ok'), 'CSS must define .dcm-dot-ok')
  assert.ok(clientCode.includes('.dcm-dot-warn'), 'CSS must define .dcm-dot-warn')
  assert.ok(clientCode.includes('.dcm-dot-err'), 'CSS must define .dcm-dot-err')
  assert.ok(clientCode.includes('.dcm-chip-timer'), 'CSS must define .dcm-chip-timer')
  assert.ok(clientCode.includes('.dcm-cache-box'), 'CSS must define .dcm-cache-box')
})
