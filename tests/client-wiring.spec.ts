import { describe, expect, it, vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  Button: ({ children }: { children?: unknown }) => children ?? null,
  FishLogo: () => null,
  IconChevronDownOutline14: () => null,
}))

import { renderToStaticMarkup } from 'react-dom/server'
import { createElement as h } from 'react'
import { apply, inject, name } from '../src/client/index.ts'
import { SettingsCard } from '../src/client/SettingsCard.tsx'

describe('client card wiring', () => {
  it('registers the settings.plugin.item card under the dsh-wsl-tray namespace', () => {
    const registered: Array<{ meta: Record<string, unknown>; render: () => unknown }> = []
    const calls: string[] = []
    const ctx = {
      effect(callback: () => unknown, label?: string) {
        calls.push(label ?? '')
        callback()
      },
      locale: {
        register(namespace: string) {
          calls.push(`locale.register:${namespace}`)
        },
        bind(namespace: string) {
          return (key: string) => `${namespace}.${key}`
        },
      },
      slots: {
        inject(slot: string, register: () => unknown) {
          calls.push(`slots.inject:${slot}`)
          register()
        },
        register(meta: Record<string, unknown>, render: () => unknown) {
          registered.push({ meta, render })
          return () => {}
        },
      },
    }

    apply(ctx as never)

    expect(name).toBe('dsh-wsl-tray')
    expect(inject).toEqual(['slots', 'locale'])
    expect(calls).toContain('locale.register:dsh-wsl-tray')
    expect(calls).toContain('slots.inject:settings.plugin.item')
    expect(registered).toHaveLength(1)
    expect(registered[0].meta).toMatchObject({ name: 'settings.plugin.item', key: 'dsh-wsl-tray', locale: 'dsh-wsl-tray' })
  })

  it('renders the settings card without a runtime error', () => {
    const html = renderToStaticMarkup(h(SettingsCard, { t: (key: string) => key }))
    expect(html).toContain('title')
    expect(html).toContain('description')
    expect(html).toContain('dsh-wsl-tray-card')
  })
})
