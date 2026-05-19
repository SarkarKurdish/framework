import { describe, it, expect, vi } from 'vitest'
import { errorHandler } from '../../../src/middleware/error-handler.js'
import { OMSSError } from '../../../src/core/errors.js'

function makeReply() {
  const reply: any = { _code: 0, _body: null }
  reply.code = vi.fn((c: number) => { reply._code = c; return reply })
  reply.send = vi.fn((b: any) => { reply._body = b; return reply })
  return reply
}

function makeRequest(overrides: Record<string, any> = {}) {
  return { url: '/test', method: 'GET', id: 'trace-123', ...overrides } as any
}

describe('errorHandler', () => {
  it('returns OMSSError JSON with correct status code', async () => {
    const reply = makeReply()
    const err = new OMSSError('INVALID_TMDB_ID', 'bad id', 400, {}, 'trace-abc')
    await errorHandler(err as any, makeRequest(), reply)
    expect(reply._code).toBe(400)
    expect(reply._body.error.code).toBe('INVALID_TMDB_ID')
    expect(reply._body.traceId).toBe('trace-abc')
  })

  it('returns 400 for Fastify validation errors', async () => {
    const reply = makeReply()
    const err: any = { message: 'schema error', validation: [{ message: 'required' }] }
    await errorHandler(err, makeRequest(), reply)
    expect(reply._code).toBe(400)
    expect(reply._body.error.code).toBe('INVALID_PARAMETER')
    expect(reply._body.error.details).toEqual([{ message: 'required' }])
  })

  it('returns 404 with ENDPOINT_NOT_FOUND for 404 statusCode errors', async () => {
    const reply = makeReply()
    const err: any = { message: 'not found', statusCode: 404 }
    await errorHandler(err, makeRequest({ url: '/missing' }), reply)
    expect(reply._code).toBe(404)
    expect(reply._body.error.code).toBe('ENDPOINT_NOT_FOUND')
    expect(reply._body.error.details.path).toBe('/missing')
  })

  it('returns 500 for unknown errors', async () => {
    const reply = makeReply()
    const err: any = { message: 'boom' }
    await errorHandler(err, makeRequest(), reply)
    expect(reply._code).toBe(500)
    expect(reply._body.error.code).toBe('INTERNAL_ERROR')
    expect(reply._body.traceId).toBe('trace-123')
  })

  it('uses the error statusCode when provided for non-404 generic errors', async () => {
    const reply = makeReply()
    const err: any = { message: 'conflict', statusCode: 409 }
    await errorHandler(err, makeRequest(), reply)
    expect(reply._code).toBe(409)
  })

  it('hides error details in production', async () => {
    const orig = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const reply = makeReply()
    const err: any = { message: 'secret', stack: 'stack trace' }
    await errorHandler(err, makeRequest(), reply)
    expect(reply._body.error.message).toBe('An unexpected error occurred')
    expect(reply._body.error.details).toBeUndefined()
    process.env.NODE_ENV = orig
  })
})
