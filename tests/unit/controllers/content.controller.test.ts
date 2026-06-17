import { describe, it, expect, vi, beforeEach } from 'vitest'
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

function makeSSEReply(capturedEvents: any[] = []) {
  let pendingEvent = 'message'
  const reply: any = {
    raw: {
      writeHead: vi.fn(),
      write: vi.fn((chunk: string) => {
        if (chunk.startsWith('event: ')) {
          pendingEvent = chunk.slice(7).trim()
        } else if (chunk.startsWith('data: ')) {
          capturedEvents.push({ type: pendingEvent, data: JSON.parse(chunk.slice(6)) })
        }
      }),
      end: vi.fn(),
    },
    hijack: vi.fn(),
  }
  return reply
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

    it('streams SSE events when Accept is text/event-stream', async () => {
      const events: any[] = []
      const result = { sources: [{ url: 'http://x.m3u8' }], responseId: 'abc' }
      svc.getMovieSources.mockImplementation(async (_id: string, emit?: (e: any) => void) => {
        emit?.({ type: 'start', data: { contentType: 'movie', tmdbId: '1' } })
        emit?.({ type: 'complete', data: { response: result } })
        return result
      })

      const reply = makeSSEReply(events)
      await ctrl.getMovie({ params: { id: '1' }, headers: { accept: 'text/event-stream' } } as any, reply)

      expect(svc.getMovieSources).toHaveBeenCalledWith('1', expect.any(Function))
      expect(reply.hijack).toHaveBeenCalled()
      expect(events.some((e) => e.type === 'start')).toBe(true)
      expect(events.some((e) => e.type === 'complete')).toBe(true)
      expect(reply.raw.end).toHaveBeenCalled()
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
