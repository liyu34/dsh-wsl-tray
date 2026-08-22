import { describe, expect, it } from 'vitest'
import { isTrustedRequest } from '../src/routes.ts'
import type { IncomingMessage } from 'node:http'

function request(host: string, extra: Record<string, string | undefined> = {}): IncomingMessage {
  return { headers: { host, ...extra } } as unknown as IncomingMessage
}

describe('route trust fence', () => {
  it('accepts loopback with no origin', () => {
    expect(isTrustedRequest(request('127.0.0.1:3080'))).toBe(true)
    expect(isTrustedRequest(request('localhost:3080'))).toBe(true)
  })

  it('rejects non-loopback and cross-site browsers', () => {
    expect(isTrustedRequest(request('192.168.1.5:3080'))).toBe(false)
    expect(isTrustedRequest(request('127.0.0.1:3080', { 'sec-fetch-site': 'cross-site' }))).toBe(false)
    expect(isTrustedRequest(request('127.0.0.1:3080', { origin: 'https://evil.example' }))).toBe(false)
  })

  it('accepts a same-origin browser request', () => {
    expect(isTrustedRequest(request('127.0.0.1:3080', { origin: 'http://127.0.0.1:3080' }))).toBe(true)
  })
})
