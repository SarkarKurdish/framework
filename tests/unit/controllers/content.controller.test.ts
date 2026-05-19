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
      await ctrl.getMovie({ params: { id: '12345' } } as any, reply)
      expect(svc.getMovieSources).toHaveBeenCalledWith('12345')
    })

    it('responds with 200 and the service result', async () => {
      const result = { sources: [{ url: 'http://x.m3u8' }], responseId: 'abc' }
      svc.getMovieSources.mockResolvedValue(result)
      const reply = makeReply()
      await ctrl.getMovie({ params: { id: '1' } } as any, reply)
      expect(reply.code).toHaveBeenCalledWith(200)
      expect(reply.send).toHaveBeenCalledWith(result)
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
