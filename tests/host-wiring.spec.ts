import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const ensure = vi.fn(async () => ({ ok: true }))
  const registerTrayRoutes = vi.fn(() => () => {})
  const ctorArgs: unknown[][] = []
  class TrayService {
    constructor(...args: unknown[]) {
      ctorArgs.push(args)
    }

    readonly ensure = ensure
  }
  return { ensure, registerTrayRoutes, ctorArgs, TrayService }
})

vi.mock('../src/service.ts', () => ({ TrayService: mocks.TrayService }))
vi.mock('../src/routes.ts', () => ({ registerTrayRoutes: mocks.registerTrayRoutes }))

import { DEFAULT_SHORTCUT_NAME } from '../src/artifacts.ts'
import { apply, name } from '../src/index.ts'

interface FakeHost {
  ctx: unknown
  effects: string[]
  server: { host: string; port: number; register: ReturnType<typeof vi.fn> }
  logger: { warn: ReturnType<typeof vi.fn> }
}

/** A host context whose effects run immediately and record their labels. */
function fakeHost(): FakeHost {
  const effects: string[] = []
  const server = { host: '127.0.0.1', port: 3080, register: vi.fn() }
  const logger = { warn: vi.fn() }
  const hostCtx = {
    webServer: server,
    logger,
    effect(callback: () => unknown, label?: string) {
      effects.push(label ?? '')
      callback()
    },
  }
  return {
    ctx: { inject: (_services: string[], callback: (scoped: unknown) => void) => { callback(hostCtx) } },
    effects,
    server,
    logger,
  }
}

describe('host wiring', () => {
  beforeEach(() => {
    mocks.ensure.mockClear()
    mocks.registerTrayRoutes.mockClear()
    mocks.ctorArgs.length = 0
  })

  it('mounts the tray routes and repairs the artifacts once on mount', async () => {
    const host = fakeHost()

    apply(host.ctx as never)

    expect(name).toBe('dsh-wsl-tray')
    expect(mocks.ctorArgs[0]).toEqual([{ logger: host.logger }, host.server, DEFAULT_SHORTCUT_NAME])
    expect(mocks.registerTrayRoutes).toHaveBeenCalledTimes(1)
    expect(mocks.registerTrayRoutes).toHaveBeenCalledWith(host.server, expect.anything())
    expect(host.effects).toEqual(['dsh-wsl-tray: http routes', 'dsh-wsl-tray: initial ensure'])
    await Promise.resolve()
    expect(mocks.ensure).toHaveBeenCalledTimes(1)
    expect(host.logger.warn).not.toHaveBeenCalled()
  })

  it('warns instead of throwing when the boot repair fails', async () => {
    mocks.ensure.mockRejectedValueOnce(new Error('boom'))
    const host = fakeHost()

    apply(host.ctx as never)
    await Promise.resolve()
    await Promise.resolve()

    expect(host.logger.warn).toHaveBeenCalledWith('[dsh-wsl-tray] ensure failed: boom')
  })
})
