/**
 * Integration: Multiple providers — aggregation, capability filtering,
 *              partial failures, disabled providers
 */

import { describe, it, expect } from 'vitest'
import { buildTestApp, makeStubProvider } from '../helper'

describe('Disabled provider is excluded', () => {
  it('disabled provider sources are not returned', async () => {
    const app = await buildTestApp({
      providers: [
        makeStubProvider({ id: 'enabled', enabled: true }),
        makeStubProvider({ id: 'disabled', enabled: false }),
      ],
    })
    const { sources } = (await app.inject({ method: 'GET', url: '/v1/movies/155' })).json()
    const ids = sources.map((s: any) => s.provider.id)
    expect(ids).toContain('enabled')
    expect(ids).not.toContain('disabled')
    await app.close()
  })
})

describe('Partial provider failure', () => {
  it('still returns 200 when at least one provider succeeds', async () => {
    const app = await buildTestApp({
      providers: [
        makeStubProvider({ id: 'fail', throwOnMovie: true }),
        makeStubProvider({ id: 'ok' }),
      ],
    })
    const res = await app.inject({ method: 'GET', url: '/v1/movies/155' })
    expect(res.statusCode).toBe(200)
    await app.close()
  })

  it('diagnostics include PROVIDER_ERROR for the failing provider', async () => {
    const app = await buildTestApp({
      providers: [
        makeStubProvider({ id: 'fail', throwOnMovie: true }),
        makeStubProvider({ id: 'ok' }),
      ],
    })
    const { diagnostics } = (await app.inject({ method: 'GET', url: '/v1/movies/155' })).json()
    const err = diagnostics.find((d: any) => d.code === 'PROVIDER_ERROR')
    expect(err).toBeDefined()
    expect(err.severity).toBe('error')
    await app.close()
  })

  it('returns 404 when ALL providers fail', async () => {
    const app = await buildTestApp({
      providers: [
        makeStubProvider({ id: 'f1', throwOnMovie: true }),
        makeStubProvider({ id: 'f2', throwOnMovie: true }),
      ],
    })
    const res = await app.inject({ method: 'GET', url: '/v1/movies/155' })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})

describe('Capability-based filtering', () => {
  it('movie-only provider is excluded from TV requests', async () => {
    const app = await buildTestApp({
      providers: [
        makeStubProvider({
          id: 'movies-only',
          capabilities: { supportedContentTypes: ['movies'] },
        }),
      ],
    })
    const res = await app.inject({
      method: 'GET',
      url: '/v1/tv/1396/seasons/1/episodes/1',
    })
    expect(res.statusCode).toBe(404) // filtered out → no sources
    await app.close()
  })

  it('tv-only provider is excluded from movie requests', async () => {
    const app = await buildTestApp({
      providers: [
        makeStubProvider({
          id: 'tv-only',
          capabilities: { supportedContentTypes: ['tv'] },
        }),
      ],
    })
    const res = await app.inject({ method: 'GET', url: '/v1/movies/155' })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})
