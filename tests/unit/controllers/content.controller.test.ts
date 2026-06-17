import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PassThrough } from 'stream'
import { ContentController } from '../../../src/controllers/content.controller.js'

function makeSourceService(overrides: Partial<Record<string, any>> = {}) {
  return {
    getMovieSources: vi.fn().mockResolvedValue({ sources: [], responseId: 'abc' }),
    getTVSources: vi.fn().mockResolvedValue({ sources: [], responseId: 'xyz' }),
    refreshSource: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any
}

function makeReply() {
  const r: any = {}
  r.code = vi.fn().mockReturnValue(r)
  r.send = vi.fn().mockReturnValue(r)
  return r
}

function makeSSEReply() {
  const reply: any = {}
  reply.code = vi.fn().mockReturnValue(reply)
  reply.header = vi.fn().mockReturnValue(reply)
  reply.type = vi.fn().mockReturnValue(reply)
  reply.send = vi.fn().mockReturnValue(reply)
  return reply
}

function parseSSEChunks(chunks: string[]) {
  const events: Array<{ type: string; data: Record<string, unknown> }> = []

  for (const block of chunks.join('').split('\n\n').filter(Boolean)) {
    let type = 'message'
    let data = ''

    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) type = line.slice(7)
      if (line.startsWith('data: ')) data = line.slice(6)
    }

    if (data) events.push({ type, data: JSON.parse(data) })
  }

  return events
}

describe('ContentController', () => {
  let svc: ReturnType<typeof makeSourceService>
  let ctrl: ContentController

  beforeEach(() => {
    svc = makeSourceService()
    ctrl = new ContentController(svc)
  })

  describe('getMovie', () => {
    it('calls getMovieSources with the route param id', async () => {
      const reply = makeReply()
      await ctrl.getMovie({ params: { id: '12345' }, headers: { accept: 'application/json' } } as any, reply)
      expect(svc.getMovieSources).toHaveBeenCalledWith('12345')
    })

    it('responds with 200 and the service result', async () => {
      const result = { sources: [{ url: 'http://x.m3u8' }], responseId: 'abc' }
      svc.getMovieSources.mockResolvedValue(result)
      const reply = makeReply()
      await ctrl.getMovie({ params: { id: '1' }, headers: { accept: 'application/json' } } as any, reply)
      expect(reply.code).toHaveBeenCalledWith(200)
      expect(reply.send).toHaveBeenCalledWith(result)
    })

    it('streams SSE via reply.send without hijacking', async () => {
      const result = { sources: [{ url: 'http://x.m3u8' }], responseId: 'abc' }
      svc.getMovieSources.mockImplementation(async (_id: string, emit?: (e: any) => void) => {
        emit?.({ type: 'start', data: { contentType: 'movie', tmdbId: '1' } })
        emit?.({ type: 'complete', data: { response: result } })
        return result
      })

      const reply = makeSSEReply()
      const chunks: string[] = []

      reply.send.mockImplementation((stream: PassThrough) => {
        stream.on('data', (chunk) => chunks.push(chunk.toString()))
        return reply
      })

      await ctrl.getMovie({ params: { id: '1' }, headers: { accept: 'text/event-stream' } } as any, reply)
      await new Promise((resolve) => setImmediate(resolve))

      const events = parseSSEChunks(chunks)

      expect(svc.getMovieSources).toHaveBeenCalledWith('1', expect.any(Function))
      expect(reply.code).toHaveBeenCalledWith(200)
      expect(reply.type).toHaveBeenCalledWith('text/event-stream')
      expect(reply.send).toHaveBeenCalledWith(expect.any(PassThrough))
      expect(events.some((e) => e.type === 'start')).toBe(true)
      expect(events.some((e) => e.type === 'complete')).toBe(true)
    })
  })

  describe('getTVEpisode', () => {
    it('parses season and episode as integers and calls getTVSources', async () => {
      const reply = makeReply()
      await ctrl.getTVEpisode({ params: { id: '99', s: '2', e: '5' } } as any, reply)
      expect(svc.getTVSources).toHaveBeenCalledWith('99', 2, 5)
    })

    it('responds with 200', async () => {
      const reply = makeReply()
      await ctrl.getTVEpisode({ params: { id: '1', s: '1', e: '1' } } as any, reply)
      expect(reply.code).toHaveBeenCalledWith(200)
    })
  })

  describe('refreshSource', () => {
    it('calls refreshSource with the responseId param', async () => {
      const reply = makeReply()
      await ctrl.refreshSource({ params: { responseId: 'resp-abc' } } as any, reply)
      expect(svc.refreshSource).toHaveBeenCalledWith('resp-abc')
    })

    it('responds 200 with { status: OK }', async () => {
      const reply = makeReply()
      await ctrl.refreshSource({ params: { responseId: 'r1' } } as any, reply)
      expect(reply.code).toHaveBeenCalledWith(200)
      expect(reply.send).toHaveBeenCalledWith({ status: 'OK' })
    })
  })
})
