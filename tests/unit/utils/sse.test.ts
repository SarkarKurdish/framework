import { describe, it, expect, vi } from 'vitest'
import { acceptsEventStream, writeSSEEvent, beginSSE, endSSE } from '../../../src/utils/sse.js'
import type { SourceStreamEvent } from '../../../src/core/types/index.js'

function makeReply() {
  const writes: string[] = []
  const reply: any = {
    raw: {
      writeHead: vi.fn(),
      write: vi.fn((chunk: string) => {
        writes.push(chunk)
      }),
      end: vi.fn(),
    },
    hijack: vi.fn(),
    getHeaders: vi.fn().mockReturnValue({}),
  }
  reply._writes = writes
  return reply
}

describe('acceptsEventStream', () => {
  it('returns true when Accept includes text/event-stream', () => {
    expect(acceptsEventStream({ headers: { accept: 'text/event-stream' } } as any)).toBe(true)
  })

  it('returns true for mixed Accept values', () => {
    expect(acceptsEventStream({ headers: { accept: 'text/event-stream, application/json' } } as any)).toBe(true)
  })

  it('returns false when Accept is application/json only', () => {
    expect(acceptsEventStream({ headers: { accept: 'application/json' } } as any)).toBe(false)
  })

  it('returns false when Accept header is missing', () => {
    expect(acceptsEventStream({ headers: {} } as any)).toBe(false)
  })
})

describe('writeSSEEvent', () => {
  it('writes event and data in SSE format', () => {
    const reply = makeReply()
    const event: SourceStreamEvent = {
      type: 'start',
      data: { contentType: 'movie', tmdbId: '1' },
    }

    writeSSEEvent(reply, event)

    expect(reply.raw.write).toHaveBeenCalledTimes(2)
    expect(reply._writes.join('')).toBe('event: start\ndata: {"contentType":"movie","tmdbId":"1"}\n\n')
  })
})

describe('beginSSE / endSSE', () => {
  it('hijacks the reply and sets SSE headers', () => {
    const reply = makeReply()

    beginSSE(reply)

    expect(reply.hijack).toHaveBeenCalled()
    expect(reply.raw.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'Content-Type': 'text/event-stream' }))
  })

  it('preserves existing reply headers such as CORS', () => {
    const reply = makeReply()
    reply.getHeaders = vi.fn().mockReturnValue({
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'Content-Type',
      vary: 'Origin',
    })

    beginSSE(reply)

    expect(reply.raw.writeHead).toHaveBeenCalledWith(200, {
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'Content-Type',
      vary: 'Origin',
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
  })

  it('ends the raw response', () => {
    const reply = makeReply()

    endSSE(reply)

    expect(reply.raw.end).toHaveBeenCalled()
  })
})
