import { describe, it, expect, vi } from 'vitest'
import { SourceService } from '../../../src/services/source.service.js'
import { ProviderRegistry } from '../../../src/providers/provider-registry.js'
import { BaseProvider } from '../../../src/providers/base-provider.js'
import type { ProviderCapabilities, ProviderMediaObject, ProviderResult } from '../../../src/core/types/index.js'
import { MemoryCacheService } from '../../../src/core/cache.js'

function makeFakeSource(url = 'https://cdn.example.com/stream.mp4') {
  const proxyUrl = `/v1/proxy?data=${encodeURIComponent(JSON.stringify({ url }))}`
  return {
    url: proxyUrl,
    type: 'mp4' as const,
    quality: '1080p',
    audioTracks: [],
    provider: { id: 'fake', name: 'Fake' },
  }
}

class FakeProvider extends BaseProvider {
  public callCount = 0

  constructor(
    public readonly id: string,
    public readonly enabled: boolean,
    private result: ProviderResult = {
      sources: [makeFakeSource()],
      subtitles: [],
      diagnostics: [],
    }
  ) {
    super()
  }

  readonly name = 'Fake'
  readonly BASE_URL = ''
  readonly HEADERS = {}
  readonly capabilities: ProviderCapabilities = {
    supportedContentTypes: ['movies', 'tv'],
  }

  async getMovieSources(_: ProviderMediaObject): Promise<ProviderResult> {
    this.callCount++
    return this.result
  }

  async getTVSources(_: ProviderMediaObject): Promise<ProviderResult> {
    this.callCount++
    return this.result
  }
}

function makeTmdbService(overrides: Partial<Record<string, any>> = {}) {
  return {
    validateMovie: vi.fn().mockResolvedValue({ exists: true, released: true }),
    validateTVEpisode: vi.fn().mockResolvedValue({ exists: true, released: true }),
    getMediaObject: vi.fn().mockResolvedValue({
      type: 'movie',
      tmdbId: '12345',
      releaseYear: '2022',
      imdbId: 'tt0000001',
      title: 'Test Movie',
    }),
    getImdbId: vi.fn().mockResolvedValue('tt0000001'),
    ...overrides,
  } as any
}

function makeStremioService(hasAddons = false) {
  return {
    hasEnabledAddons: vi.fn().mockReturnValue(hasAddons),
    getMovieSources: vi.fn().mockResolvedValue({
      sources: [],
      subtitles: [],
      diagnostics: [],
    }),
    getTVSources: vi.fn().mockResolvedValue({
      sources: [],
      subtitles: [],
      diagnostics: [],
    }),
  } as any
}

function buildService(providerResult?: ProviderResult) {
  const registry = new ProviderRegistry()

  const provider = new FakeProvider(
    'fake',
    true,
    providerResult ?? {
      sources: [makeFakeSource()],
      subtitles: [],
      diagnostics: [],
    }
  )

  registry.register(provider)

  const cache = new MemoryCacheService()
  const tmdb = makeTmdbService()
  const stremio = makeStremioService()

  const svc = new SourceService(registry, cache, tmdb, stremio)

  return { svc, cache, tmdb, stremio, provider, registry }
}

describe('SourceService - getMovieSources', () => {
  it('returns a SourceResponse with sources from the provider', async () => {
    const { svc } = buildService()

    const result = await svc.getMovieSources('12345')

    expect(result.sources).toHaveLength(1)
    expect(result.responseId).toBeTruthy()
    expect(result.expiresAt).toBeTruthy()
  })

  it('uses cache on second call (provider not re-called)', async () => {
    const { svc, provider } = buildService()

    await svc.getMovieSources('12345')
    await svc.getMovieSources('12345')

    expect(provider.callCount).toBe(1)
  })

  it('deduplicates sources with the same upstream URL', async () => {
    const source = makeFakeSource('https://cdn.example.com/same.mp4')

    const { svc } = buildService({
      sources: [source, source],
      subtitles: [],
      diagnostics: [],
    })

    const result = await svc.getMovieSources('99999')

    expect(result.sources).toHaveLength(1)
  })

  it('throws NO_SOURCES_AVAILABLE when no providers return results', async () => {
    const { svc } = buildService({
      sources: [],
      subtitles: [],
      diagnostics: [],
    })

    await expect(svc.getMovieSources('99999')).rejects.toMatchObject({
      code: 'NO_SOURCES_AVAILABLE',
    })
  })
})

describe('SourceService - getTVSources', () => {
  it('returns a SourceResponse for a TV episode', async () => {
    const { svc, tmdb } = buildService()

    tmdb.getMediaObject.mockResolvedValue({
      type: 'tv',
      tmdbId: '1',
      s: 1,
      e: 1,
      releaseYear: '2020',
      imdbId: 'tt1',
      title: 'Show',
    })

    const result = await svc.getTVSources('1', 1, 1)

    expect(result.sources).toHaveLength(1)
  })

  it('throws NO_SOURCES_AVAILABLE when providers return nothing', async () => {
    const { svc, tmdb } = buildService({
      sources: [],
      subtitles: [],
      diagnostics: [],
    })

    tmdb.getMediaObject.mockResolvedValue({
      type: 'tv',
      tmdbId: '2',
      s: 1,
      e: 1,
      releaseYear: '2020',
      imdbId: 'tt2',
      title: 'Show',
    })

    await expect(svc.getTVSources('2', 1, 1)).rejects.toMatchObject({
      code: 'NO_SOURCES_AVAILABLE',
    })
  })
})

describe('SourceService - refreshSource', () => {
  it('removes cached result so next call re-fetches', async () => {
    const { svc, tmdb } = buildService()

    const first = await svc.getMovieSources('12345')

    await svc.refreshSource(first.responseId)
    await svc.getMovieSources('12345')

    expect(tmdb.validateMovie).toHaveBeenCalledTimes(2)
  })

  it('throws INVALID_RESPONSE_ID for malformed responseId', async () => {
    const { svc } = buildService()

    await expect(
      svc.refreshSource('!!!invalid!!!')
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE_ID' })
  })

  it('throws RESPONSE_ID_NOT_FOUND for unknown responseId', async () => {
    const { svc } = buildService()

    await expect(
      svc.refreshSource('unknown-valid-id')
    ).rejects.toMatchObject({ code: 'RESPONSE_ID_NOT_FOUND' })
  })
})

describe('SourceService - diagnostic PARTIAL_SCRAPE', () => {
  it('adds PARTIAL_SCRAPE diagnostic when some providers return empty results', async () => {
    const registry = new ProviderRegistry()

    registry.register(
      new FakeProvider('p1', true, {
        sources: [makeFakeSource()],
        subtitles: [],
        diagnostics: [],
      })
    )

    registry.register(
      new FakeProvider('p2', true, {
        sources: [],
        subtitles: [],
        diagnostics: [],
      })
    )

    const cache = new MemoryCacheService()
    const tmdb = makeTmdbService()
    const stremio = makeStremioService()

    const svc = new SourceService(registry, cache, tmdb, stremio)

    const result = await svc.getMovieSources('99')

    const codes = result.diagnostics.map((d) => d.code)

    expect(codes).toContain('PARTIAL_SCRAPE')
  })
})

describe('SourceService - stream events', () => {
  it('emits start, provider, and complete events for movie fetch', async () => {
    const { svc } = buildService()
    const events: string[] = []

    await svc.getMovieSources('12345', (event) => {
      events.push(event.type)
    })

    expect(events[0]).toBe('start')
    expect(events).toContain('provider_start')
    expect(events).toContain('provider_result')
    expect(events[events.length - 1]).toBe('complete')
  })

  it('emits cache_hit and complete on cache hit', async () => {
    const { svc } = buildService()
    const events: string[] = []

    await svc.getMovieSources('12345')
    await svc.getMovieSources('12345', (event) => {
      events.push(event.type)
    })

    expect(events).toEqual(['start', 'cache_hit', 'complete'])
  })
})

describe('SourceService - getMappingsCount / getMappingInfo', () => {
  it('tracks the mapping after a successful fetch', async () => {
    const { svc } = buildService()

    const result = await svc.getMovieSources('12345')

    expect(svc.getMappingsCount()).toBe(1)
    expect(svc.getMappingInfo(result.responseId)?.tmdbId).toBe('12345')
  })
})