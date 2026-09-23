import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

/** One bundle registration, as the web shell's module loader receives it. */
interface LoadedEntry {
  id: string
  factory: (require: (id: string) => unknown) => Record<string, unknown>
}

const requireFromRepo = createRequire(import.meta.url)

/**
 * Materialize the built client bundle exactly as the web shell does: run the
 * file for its `window.__ModuleLoader__.load` registration, then call the
 * factory with the loader's module table.
 * @returns the bundle's exports.
 */
function loadBundle(): Record<string, unknown> {
  const source = readFileSync(new URL('../client/client.js', import.meta.url), 'utf8')
  const entries: LoadedEntry[] = []
  const window = { __ModuleLoader__: { load: (entry: LoadedEntry) => { entries.push(entry) } } }
  new Function('window', source)(window)
  expect(entries).toHaveLength(1)
  const table = new Map<string, unknown>([
    ['react', requireFromRepo('react')],
    ['react/jsx-runtime', requireFromRepo('react/jsx-runtime')],
    ['@deepseek-ai/dsh-client-ui-primitives', { Button: ({ children }: { children?: unknown }) => children ?? null }],
  ])
  return entries[0].factory((id) => {
    if (!table.has(id)) throw new Error(`unexpected module request: ${id}`)
    return table.get(id)
  })
}

describe('built client bundle', () => {
  it('registers under the package id and contributes the dsh-wsl-tray settings section', () => {
    const bundle = loadBundle()

    expect(bundle.name).toBe('dsh-wsl-tray')
    expect(bundle.inject).toEqual(['slots', 'locale'])

    const registered: Array<Record<string, unknown>> = []
    const ctx = {
      effect(callback: () => unknown) { callback() },
      locale: { register: () => {}, bind: () => (key: string) => key },
      slots: {
        inject: (_slot: string, register: () => unknown) => { register() },
        register: (meta: Record<string, unknown>) => { registered.push(meta); return () => {} },
      },
    }
    ;(bundle.apply as (context: unknown) => void)(ctx)

    expect(registered).toHaveLength(1)
    expect(registered[0]).toMatchObject({ name: 'settings.section', id: 'dsh-wsl-tray', order: 100 })
  })
})
