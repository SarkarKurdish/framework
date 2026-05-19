import { describe, it, expect, vi, afterEach } from 'vitest'
import { TMDBService } from '../../../src/services/tmdb.service.js'
import { MemoryCacheService } from '../../../src/core/cache.js'

afterEach(() => vi.unstubAllGlobals())

const makeCache = () => new MemoryCacheService()

const movieResponse = (overrides: Record<string, any> = {}) => ({
  id: 123,
  title: 'Test Movie',
  release_date: '2020-01-01',
  status: 'Released',
  adult: false,
  ...overrides,
})

const mockFetch = (body: any, status = 200) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      status,
      ok: status < 400,
      json: async () => body,
    }),
  )
}

describe('TMDBService constructor', () => {
  it('throws when apiKey is empty', () => {
    expect(() => new TMDBService('', makeCache())).toThrow(/TMDB_API_KEY/)
  })

  it('throws when apiKey is the placeholder', () => {
    expect(() => new TMDBService('your_tmdb_api_key_here', makeCache())).toThrow()
  })

  it('constructs successfully with a real key', () => {
    expect(() => new TMDBService('realkey123', makeCache())).not.toThrow()
  })
})

describe('TMDBService - validateMovie', () => {
  it('returns exists:true released:true for a released movie', async () => {
    mockFetch(movieResponse())
    const svc = new TMDBService('key', makeCache())
    const result = await svc.validateMovie('123')
    expect(result.exists).toBe(true)
    expect(result.released).toBe(true)
  })

  it('returns released:false for an unreleased movie', async () => {
    mockFetch(movieResponse({ status: 'In Production', release_date: '2099-01-01' }))
    const svc = new TMDBService('key', makeCache())
    const result = await svc.validateMovie('456')
    expect(result.released).toBe(false)
  })

  it('uses cache on second call', async () => {
    mockFetch(movieResponse())
    const svc = new TMDBService('key', makeCache())
    await svc.validateMovie('123')
    await svc.validateMovie('123')
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce()
  })
})

describe('TMDBService - getMediaObject', () => {
  it('returns a ProviderMediaObject for a movie', async () => {
    mockFetch(movieResponse({ id: 123, title: 'Test', release_date: '2020-05-01' }))
    const svc = new TMDBService('key', makeCache())
    const obj = await svc.getMediaObject('movie', '123')
    expect(obj.type).toBe('movie')
    expect(obj.tmdbId).toBe('123')
    expect(obj.title).toBe('Test')
    expect(obj.releaseYear).toBe('2020')
  })
})

describe('TMDBService - validateTVEpisode', () => {
  it('returns released:true for an aired episode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            id: 1,
            name: 'Show',
            first_air_date: '2018-01-01',
            status: 'Returning Series',
            adult: false,
            number_of_seasons: 3,
            seasons: [],
          }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            id: 1,
            season_number: 1,
            air_date: '2018-01-01',
            episodes: [{ episode_number: 1, air_date: '2018-01-15', name: 'Pilot' }],
          }),
        }),
    )

    const svc = new TMDBService('key', makeCache())
    const result = await svc.validateTVEpisode('1', 1, 1)

    expect(result.exists).toBe(true)
    expect(result.released).toBe(true)
  })

  it('returns released:false when episode has no air_date', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            id: 1,
            name: 'Show',
            first_air_date: '2018-01-01',
            status: 'Returning Series',
            adult: false,
            number_of_seasons: 3,
            seasons: [],
          }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            id: 1,
            season_number: 1,
            air_date: '2018-01-01',
            episodes: [{ episode_number: 1, air_date: null, name: 'TBA' }],
          }),
        }),
    )

    const svc = new TMDBService('key', makeCache())
    const result = await svc.validateTVEpisode('1', 1, 1)

    expect(result.released).toBe(false)
  })

  it('returns exists:false when episode not in season', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            id: 1,
            name: 'Show',
            first_air_date: '2018-01-01',
            status: 'Returning Series',
            adult: false,
            number_of_seasons: 3,
            seasons: [],
          }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            id: 1,
            season_number: 1,
            air_date: '2018-01-01',
            episodes: [],
          }),
        }),
    )

    const svc = new TMDBService('key', makeCache())
    const result = await svc.validateTVEpisode('1', 1, 99)

    expect(result.exists).toBe(false)
  })
})

describe('TMDBService - getImdbId', () => {
  it('returns imdb_id for a movie', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ imdb_id: 'tt0000001' }),
    }))

    const svc = new TMDBService('key', makeCache())
    const id = await svc.getImdbId('123', 'movie')
    expect(id).toBe('tt0000001')
  })

  it('uses cache on second call for getImdbId', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ imdb_id: 'tt9999999' }),
    }))

    const svc = new TMDBService('key', makeCache())
    await svc.getImdbId('123', 'movie')
    await svc.getImdbId('123', 'movie')

    expect(vi.mocked(fetch)).toHaveBeenCalledOnce()
  })
})

describe('TMDBService - getMediaObject for TV', () => {
  it('returns a ProviderMediaObject with s and e for a TV episode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            id: 1,
            name: 'Show',
            first_air_date: '2018-01-01',
            status: 'Returning Series',
            adult: false,
            number_of_seasons: 3,
            seasons: [],
          }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            id: 1,
            season_number: 1,
            air_date: '2018-01-01',
            episodes: [{ episode_number: 1, air_date: '2018-01-15', name: 'Pilot' }],
          }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            results: [{ id: 'tt0000002' }],
          }),
        }),
    )

    const svc = new TMDBService('key', makeCache())
    const obj = await svc.getMediaObject('tv', '1', 1, 1)

    expect(obj.type).toBe('tv')
    expect(obj.s).toBe(1)
    expect(obj.e).toBe(1)
  })
})

describe('createTMDBValidator - validateMovie', () => {
  it('throws INVALID_TMDB_ID when format is bad', async () => {
    const tmdbService = {
      validateMovie: vi.fn(),
      validateTVEpisode: vi.fn(),
    } as any

    const validator = createTMDBValidator(tmdbService)

    await expect(validator.validateMovie('bad!id')).rejects.toMatchObject({
      code: 'INVALID_TMDB_ID',
    })

    expect(tmdbService.validateMovie).not.toHaveBeenCalled()
  })

  it('throws INVALID_TMDB_ID when movie does not exist', async () => {
    const tmdbService = {
      validateMovie: vi.fn().mockResolvedValue({ exists: false, released: false }),
    } as any

    const validator = createTMDBValidator(tmdbService)

    await expect(validator.validateMovie('12345')).rejects.toMatchObject({
      code: 'INVALID_TMDB_ID',
    })
  })

  it('throws INVALID_TMDB_ID when movie not released', async () => {
    const tmdbService = {
      validateMovie: vi.fn().mockResolvedValue({ exists: true, released: false }),
    } as any

    const validator = createTMDBValidator(tmdbService)

    await expect(validator.validateMovie('12345')).rejects.toMatchObject({
      code: 'INVALID_TMDB_ID',
    })
  })

  it('resolves when movie exists and is released', async () => {
    const tmdbService = {
      validateMovie: vi.fn().mockResolvedValue({ exists: true, released: true }),
    } as any

    const validator = createTMDBValidator(tmdbService)

    await expect(validator.validateMovie('12345')).resolves.toBeUndefined()
  })
})

describe('createTMDBValidator - validateTVEpisode', () => {
  it('throws on bad tmdbId format', async () => {
    const tmdbService = { validateTVEpisode: vi.fn() } as any
    const validator = createTMDBValidator(tmdbService)

    await expect(validator.validateTVEpisode('abc', 1, 1)).rejects.toMatchObject({
      code: 'INVALID_TMDB_ID',
    })
  })

  it('throws on bad season', async () => {
    const tmdbService = { validateTVEpisode: vi.fn() } as any
    const validator = createTMDBValidator(tmdbService)

    await expect(validator.validateTVEpisode('12345', -1, 1)).rejects.toMatchObject({
      code: 'INVALID_SEASON',
    })
  })

  it('throws on bad episode', async () => {
    const tmdbService = { validateTVEpisode: vi.fn() } as any
    const validator = createTMDBValidator(tmdbService)

    await expect(validator.validateTVEpisode('12345', 1, 0)).rejects.toMatchObject({
      code: 'INVALID_EPISODE',
    })
  })

  it('throws INVALID_EPISODE when episode does not exist', async () => {
    const tmdbService = {
      validateTVEpisode: vi.fn().mockResolvedValue({ exists: false, released: false }),
    } as any

    const validator = createTMDBValidator(tmdbService)

    await expect(validator.validateTVEpisode('12345', 1, 1)).rejects.toMatchObject({
      code: 'INVALID_EPISODE',
    })
  })

  it('throws INVALID_EPISODE when episode not released', async () => {
    const tmdbService = {
      validateTVEpisode: vi.fn().mockResolvedValue({ exists: true, released: false }),
    } as any

    const validator = createTMDBValidator(tmdbService)

    await expect(validator.validateTVEpisode('12345', 1, 1)).rejects.toMatchObject({
      code: 'INVALID_EPISODE',
    })
  })

  it('resolves when episode exists and has aired', async () => {
    const tmdbService = {
      validateTVEpisode: vi.fn().mockResolvedValue({ exists: true, released: true }),
    } as any

    const validator = createTMDBValidator(tmdbService)

    await expect(validator.validateTVEpisode('12345', 1, 1)).resolves.toBeUndefined()
  })
})

function createTMDBValidator(tmdbService: TMDBService) {
  const isValidTmdbId = (id: string) => /^\d+$/.test(id)

  return {
    validateMovie: async (tmdbId: string) => {
      if (!isValidTmdbId(tmdbId)) throw { code: 'INVALID_TMDB_ID' }

      const result = await tmdbService.validateMovie(tmdbId)

      if (!result.exists || !result.released) {
        throw { code: 'INVALID_TMDB_ID' }
      }
    },

    validateTVEpisode: async (tmdbId: string, season: number, episode: number) => {
      if (!isValidTmdbId(tmdbId)) throw { code: 'INVALID_TMDB_ID' }

      if (season < 1) throw { code: 'INVALID_SEASON' }

      if (episode < 1) throw { code: 'INVALID_EPISODE' }

      const result = await tmdbService.validateTVEpisode(tmdbId, season, episode)

      if (!result.exists || !result.released) {
        throw { code: 'INVALID_EPISODE' }
      }
    },
  }
}