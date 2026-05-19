import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProxyController } from '../../../src/controllers/proxy.controller.js'
import { Readable } from 'stream'

function makeProxyService(overrides: Partial<Record<string, any>> = {}) {
  return {
    proxyRequest: vi.fn().mockResolvedValue({ data: Buffer.from('ok'), contentType: 'application/json', statusCode: 200 }),
    ...overrides,
  } as any
}

function makeReply() {
  const r: any = {}
  r.code = vi.fn().mockReturnValue(r)
  r.send = vi.fn().mockReturnValue(r)
  r.type = vi.fn().mockReturnValue(r)
  r.headers = vi.fn().mockReturnValue(r)
  return r
}

const validData = encodeURIComponent(JSON.stringify({ url: 'https://example.com/stream.m3u8' }))

describe('ProxyController', () => {
  let svc: ReturnType<typeof makeProxyService>
  let ctrl: ProxyController

  beforeEach(() => {
    svc = makeProxyService()
    ctrl = new ProxyController(svc)
  })

  it('returns 400 if data param is missing', async () => {
    const reply = makeReply()
    await ctrl.proxy({ query: {}, headers: {}, id: 't' } as any, reply)
    expect(reply.code).toHaveBeenCalledWith(400)
    const body = reply.send.mock.calls[0][0]
    expect(body.error.code).toBe('MISSING_PARAMETER')
  })

  it('returns 400 if data param is invalid JSON', async () => {
    const reply = makeReply()
    await ctrl.proxy({ query: { data: 'not-valid-%ZZ' }, headers: {}, id: 't' } as any, reply)
    expect(reply.code).toHaveBeenCalledWith(400)
    const body = reply.send.mock.calls[0][0]
    expect(body.error.code).toBe('INVALID_PARAMETER')
  })

  it('passes valid encoded data to proxyService', async () => {
    const reply = makeReply()
    await ctrl.proxy({ query: { data: validData }, headers: {}, id: 't' } as any, reply)
    expect(svc.proxyRequest).toHaveBeenCalledOnce()
  })

  it('responds with buffered data for non-streaming response', async () => {
    const buf = Buffer.from('hello')
    svc.proxyRequest.mockResolvedValue({ data: buf, contentType: 'text/plain', statusCode: 200, headers: {} })
    const reply = makeReply()
    await ctrl.proxy({ query: { data: validData }, headers: {}, id: 't' } as any, reply)
    expect(reply.code).toHaveBeenCalledWith(200)
    expect(reply.send).toHaveBeenCalledWith(buf)
  })

  it('responds with a stream for streaming response', async () => {
    const stream = new Readable({ read() {} })
    svc.proxyRequest.mockResolvedValue({ stream, contentType: 'video/mp4', statusCode: 200, headers: { 'Content-Length': '100' } })
    const reply = makeReply()
    await ctrl.proxy({ query: { data: validData }, headers: {}, id: 't' } as any, reply)
    expect(reply.send).toHaveBeenCalledWith(stream)
  })

  it('forwards Range header from client into proxy data', async () => {
    const reply = makeReply()
    await ctrl.proxy({ query: { data: validData }, headers: { range: 'bytes=0-999' }, id: 't' } as any, reply)
    const calledWith: string = svc.proxyRequest.mock.calls[0][0]
    const decoded = JSON.parse(decodeURIComponent(calledWith))
    expect(decoded.headers?.range).toBe('bytes=0-999')
  })
})
