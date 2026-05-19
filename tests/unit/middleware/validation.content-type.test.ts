import { describe, it, expect, vi } from 'vitest'
import { validateContentType } from '../../../src/middleware/validation.js'

function makeReply() {
  const r: any = {
    _code: 0,
    _body: null,
  }

  r.code = vi.fn((c: number) => {
    r._code = c
    return r
  })

  r.send = vi.fn((body: any) => {
    r._body = body
    return r
  })

  return r
}

describe('validateContentType middleware', () => {
  it('does not reply when Accept is */*', async () => {
    const req = { headers: { accept: '*/*' }, id: 'trace' } as any
    const reply = makeReply()

    await validateContentType(req, reply)

    expect(reply.code).not.toHaveBeenCalled()
    expect(reply.send).not.toHaveBeenCalled()
  })

  it('does not reply when Accept header is missing', async () => {
    const req = { headers: {}, id: 'trace' } as any
    const reply = makeReply()

    await validateContentType(req, reply)

    expect(reply.code).not.toHaveBeenCalled()
    expect(reply.send).not.toHaveBeenCalled()
  })

  it('replies 406 when Accept is not supported', async () => {
    const req = { headers: { accept: 'text/html' }, id: 'trace' } as any
    const reply = makeReply()

    await validateContentType(req, reply)

    expect(reply.code).toHaveBeenCalledWith(406)
    expect(reply._body).toBeDefined()
  })
})