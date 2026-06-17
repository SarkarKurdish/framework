import { describe, it, expect } from 'vitest'
import { PassThrough } from 'stream'
import { acceptsEventStream, writeSSEEvent } from '../../../src/utils/sse.js'
import type { SourceStreamEvent } from '../../../src/core/types/index.js'

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
    const stream = new PassThrough()
    const chunks: string[] = []

    stream.on('data', (chunk) => chunks.push(chunk.toString()))

    const event: SourceStreamEvent = {
      type: 'start',
      data: { contentType: 'movie', tmdbId: '1' },
    }

    writeSSEEvent(stream, event)

    expect(chunks.join('')).toBe('event: start\ndata: {"contentType":"movie","tmdbId":"1"}\n\n')
  })
})
