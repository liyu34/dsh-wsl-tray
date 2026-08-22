/**
 * The plugin's loopback HTTP API, consumed by the settings card. The fence is
 * the same DNS-rebinding defense as the /api gateway: Host-header loopback and
 * same-origin browser markers only. It is not authentication.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { TrayService, type TrayStatus } from './service.ts'

export const TRAY_ROUTE_PREFIX = '/dsh-wsl-tray'

/** Header lookup that accepts both node's string and string[] shapes. */
function header(headers: IncomingMessage['headers'], name: string): string | undefined {
  const value = headers[name]
  return typeof value === 'string' ? value : undefined
}

/** Host-header loopback check (localhost, [::1], or any 127.x.y.z). */
function isLoopbackHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  const parts = hostname.split('.')
  return parts.length === 4
    && parts[0] === '127'
    && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

/** Whether the request may reach plugin routes. */
export function isTrustedRequest(req: IncomingMessage): boolean {
  const host = header(req.headers, 'host')
  if (host === undefined) return false
  let hostUrl: URL
  try {
    hostUrl = new URL(`http://${host}`)
  } catch {
    return false
  }
  if (!isLoopbackHostname(hostUrl.hostname)) return false
  if (header(req.headers, 'sec-fetch-site') === 'cross-site') return false
  const origin = header(req.headers, 'origin')
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

function writeJson(res: ServerResponse, status: number, body: TrayStatus): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

/** The webserver register face used by this plugin. */
export interface WebServerLike {
  register(route: {
    kind: 'prefix'
    path: string
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
  }): () => void
}

/**
 * Mount the /dsh-wsl-tray prefix route.
 * @param server - the host webserver service.
 * @param service - the generated-artifact service answering each method.
 * @returns the route disposer.
 */
export function registerTrayRoutes(server: WebServerLike, service: TrayService): () => void {
  return server.register({
    kind: 'prefix',
    path: TRAY_ROUTE_PREFIX,
    handler: async (req, res): Promise<void> => {
      if (!isTrustedRequest(req)) {
        writeJson(res, 403, { ...await service.status(), ok: false, lastError: 'forbidden' })
        return
      }
      const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname
      if (pathname === `${TRAY_ROUTE_PREFIX}/status` && (req.method === 'GET' || req.method === 'HEAD')) {
        writeJson(res, 200, await service.status())
        return
      }
      if (pathname === `${TRAY_ROUTE_PREFIX}/regenerate` && req.method === 'POST') {
        const body = await service.regenerate()
        writeJson(res, body.ok ? 200 : 500, body)
        return
      }
      writeJson(res, 404, { ...await service.status(), ok: false, lastError: 'not found' })
    },
  })
}
