import { describe, it, expect, vi, afterEach } from 'vitest'
import { StremioService } from '../../../src/services/stremio.service.js'
import { ProxyService } from '../../../src/services/proxy.service.js'
import type { ProviderMediaObject } from '../../../src/core/types/index.js'

const media: ProviderMediaObject = {
  type: 'movie',
  tmdbId: '12345',
  releaseYear: '2022',
  imdbId: 'tt0000001',
  title: 'Test Movie',
}

const tvMedia: ProviderMediaObject = {
  type: 'tv',
  tmdbId: '1',
  releaseYear: '2020',
  imdbId: 'tt0000002',
  title: 'Test Show',
  s: 1,
  e: 1,
}

function makeProxy() {
  return new ProxyService()
}

afterEach(() => vi.unstubAllGlobals())

describe('StremioService - hasEnabledAddons', () => {
  it('returns false when no addons', () => {
    const svc = new StremioService([], makeProxy())
    expect(svc.hasEnabledAddons()).toBe(false)
  })

  it('returns false when all addons are disabled', () => {
    const svc = new StremioService([{ id: 'a', url: 'https://a.example', enabled: false }], makeProxy())
    expect(svc.hasEnabledAddons()).toBe(false)
  })

  it('returns true when at least one addon is enabled', () => {
    const svc = new StremioService([{ id: 'a', url: 'https://a.example', enabled: true }], makeProxy())
    expect(svc.hasEnabledAddons()).toBe(true)
  })

  it('treats undefined enabled as enabled', () => {
    const svc = new StremioService([{ id: 'a', url: 'https://a.example' }], makeProxy())
    expect(svc.hasEnabledAddons()).toBe(true)
  })
})

describe('StremioService - no enabled addons', () => {
  it('returns empty result without network call', async () => {
    const svc = new StremioService([], makeProxy())
    const result = await svc.getMovieSources(media)
    expect(result.sources).toHaveLength(0)
  })
})

describe('StremioService - missing imdbId', () => {
  it('returns diagnostic warning when imdbId is empty', async () => {
    const svc = new StremioService([{ id: 'a', url: 'https://addon.example', enabled: true }], makeProxy())
    const result = await svc.getMovieSources({ ...media, imdbId: '' })
    const codes = result.diagnostics.map((d) => d.code)
    expect(codes).toContain('PROVIDER_ERROR')
  })
})

describe('StremioService - successful stream fetch', () => {
  it('maps Stremio streams to OMSS sources', async () => {
    const addonResponse = {
      streams: [
        { url: 'https://cdn.example.com/stream.mp4', title: '1080p' },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => addonResponse,
    }))

    const svc = new StremioService([{ id: 'addon1', url: 'https://addon.example', enabled: true }], makeProxy())
    const result = await svc.getMovieSources(media)
    expect(result.sources.length).toBeGreaterThan(0)
    expect(result.sources[0].provider.id).toBe('stremio:addon')
  })

  it('maps TV streams correctly', async () => {
    const addonResponse = {
      streams: [{ url: 'https://cdn.example.com/episode.mp4' }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => addonResponse,
    }))

    const svc = new StremioService([{ id: 'addon1', url: 'https://addon.example', enabled: true }], makeProxy())
    const result = await svc.getTVSources(tvMedia)
    expect(result.sources.length).toBeGreaterThan(0)
  })
})

describe('StremioService - network failure', () => {
  it('returns a PROVIDER_ERROR diagnostic when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    const svc = new StremioService([{ id: 'addon1', url: 'https://addon.example', enabled: true }], makeProxy())
    const result = await svc.getMovieSources(media)
    const codes = result.diagnostics.map((d) => d.code)
    expect(codes).toContain('PROVIDER_ERROR')
  })
})

function mock(streams: any[]) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ streams }) }))
}

describe('inferSourceType', () => {
  it.each([
    ['https://cdn.example.com/p.m3u8', 'hls'],
    ['https://cdn.example.com/p.mpd', 'dash'],
    ['https://cdn.example.com/v.mp4', 'mp4'],
    ['https://cdn.example.com/v.mkv', 'mkv'],
    ['https://cdn.example.com/v.webm', 'webm'],
  ])('%s → %s', async (url, expected) => {
    mock([{ url }])
    const r = await new StremioService([{ id: 'addon1', url: 'https://addon.example', enabled: true }], new ProxyService()).getMovieSources(media)
    if (r.sources.length) expect(r.sources[0].type).toBe(expected)
  })

  it('description with .mp4 → mp4', async () => {
    mock([{ url: 'https://cdn.example.com/stream.mp4', description: '4.2 GB WEB-DL' }])
    const r = await new StremioService([{ id: 'addon1', url: 'https://addon.example', enabled: true }], new ProxyService()).getMovieSources(media)
    if (r.sources.length) expect(r.sources[0].type).toBe('mp4')
  })
})

describe('inferQuality', () => {
  it('extracts NNNp', async () => {
    mock([{ url: 'https://cdn.example.com/v.mp4', name: '1080p BluRay' }])
    const r = await new StremioService([{ id: 'addon1', url: 'https://addon.example', enabled: true }], new ProxyService()).getMovieSources(media)
    expect(r.sources[0]?.quality).toBe('1080p')
  })

  it('extracts Nk', async () => {
    mock([{ url: 'https://cdn.example.com/v.mp4', name: '4k UHD' }])
    const r = await new StremioService([{ id: 'addon1', url: 'https://addon.example', enabled: true }], new ProxyService()).getMovieSources(media)
    expect(r.sources[0]?.quality).toBe('4k')
  })

  it('returns Auto when no match', async () => {
    mock([{ url: 'https://cdn.example.com/v.mp4', name: 'no quality' }])
    const r = await new StremioService([{ id: 'addon1', url: 'https://addon.example', enabled: true }], new ProxyService()).getMovieSources(media)
    expect(r.sources[0]?.quality).toBe('Auto')
  })
})

describe('non-HTTPS filtering', () => {
  it('skips http:// streams', async () => {
    mock([{ url: 'http://bad.example.com/v.mp4' }, { url: 'https://good.example.com/v.mp4' }])
    const r = await new StremioService([{ id: 'addon1', url: 'https://addon.example', enabled: true }], new ProxyService()).getMovieSources(media)
    expect(r.sources).toHaveLength(1)
  })
})

describe('behaviorHints proxyHeaders', () => {
  it('includes custom headers in proxy URL', async () => {
    mock([{ url: 'https://cdn.example.com/v.mp4', behaviorHints: { proxyHeaders: { request: { 'X-Token': 'secret' } } } }])
    const r = await new StremioService([{ id: 'addon1', url: 'https://addon.example', enabled: true }], new ProxyService()).getMovieSources(media)
    const decoded = JSON.parse(decodeURIComponent(r.sources[0].url.split('data=')[1]))
    expect(decoded.headers?.['X-Token']).toBe('secret')
  })
})

describe('addon HTTP error', () => {
  it('produces PROVIDER_ERROR when addon returns non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }))
    const r = await new StremioService([{ id: 'addon1', url: 'https://addon.example', enabled: true }], new ProxyService()).getMovieSources(media)
    expect(r.diagnostics.some(d => d.code === 'PROVIDER_ERROR')).toBe(true)
  })
})

describe('TV series id format', () => {
  it('uses :sN:eN suffix in the fetch URL', async () => {
    let url = ''
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (u: string) => { url = u; return { ok: true, json: async () => ({ streams: [] }) } }))
    await new StremioService([{ id: 'addon1', url: 'https://addon.example', enabled: true }], new ProxyService()).getTVSources(tvMedia)
    const expected = encodeURIComponent(`:s${tvMedia.s}:e${tvMedia.e}`)
    expect(url).toContain(expected)
  })

  it('prefixes tt when missing from imdbId', async () => {
    let url = ''
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (u: string) => { url = u; return { ok: true, json: async () => ({ streams: [] }) } }))
    await new StremioService([{ id: 'addon1', url: 'https://addon.example', enabled: true }], new ProxyService()).getTVSources({ ...tvMedia, imdbId: '0000002' })
    expect(url).toContain('tt0000002')
  })
})

describe('addon timeout', () => {
  it('adds PROVIDER_ERROR on abort', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise((_, r) => setTimeout(() => r(new DOMException('aborted', 'AbortError')), 50))))
    const svc = new StremioService([{ id: 'slow', url: 'https://slow.example', enabled: true, timeoutMs: 10 }], new ProxyService())
    const r = await svc.getMovieSources(media)
    expect(r.diagnostics.some(d => d.code === 'PROVIDER_ERROR')).toBe(true)
  })
})
