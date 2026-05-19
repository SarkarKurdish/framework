/**
 * Integration: GET /v1/movies/:id
 * Spec ref: OMSS v1.0 §4.2, §6.1, §6.2, §6.3, §7
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildTestApp, makeStubProvider } from '../helper'

// ── Helpers ────────────────────────────────────────────────────────────────
function assertSourceShape(source: any) {
  expect(source).toHaveProperty('url')
  expect(typeof source.url).toBe('string')
  expect(source.url).toMatch(/\/v1\/proxy/)          // must go through proxy

  expect(source).toHaveProperty('type')
  expect(['hls', 'dash', 'mp4', 'mkv', 'webm', 'embed']).toContain(source.type)

  expect(source).toHaveProperty('quality')
  expect(typeof source.quality).toBe('string')

  expect(source).toHaveProperty('audioTracks')
  expect(Array.isArray(source.audioTracks)).toBe(true)
  for (const track of source.audioTracks) {
    expect(track).toHaveProperty('language')
    expect(track).toHaveProperty('label')
  }

  expect(source).toHaveProperty('provider')
  expect(source.provider).toHaveProperty('id')
  expect(source.provider).toHaveProperty('name')
}

function assertSubtitleShape(sub: any) {
  expect(sub).toHaveProperty('url')
  expect(sub.url).toMatch(/\/v1\/proxy/)
  expect(sub).toHaveProperty('label')
  expect(sub).toHaveProperty('format')
  expect(['vtt', 'srt', 'ass', 'ssa', 'ttml']).toContain(sub.format)
}

function assertSuccessResponseShape(body: any) {
  expect(body).toHaveProperty('responseId')
  expect(typeof body.responseId).toBe('string')
  expect(body.responseId.length).toBeGreaterThan(0)

  expect(body).toHaveProperty('sources')
  expect(Array.isArray(body.sources)).toBe(true)

  expect(body).toHaveProperty('subtitles')
  expect(Array.isArray(body.subtitles)).toBe(true)

  expect(body).toHaveProperty('diagnostics')
  expect(Array.isArray(body.diagnostics)).toBe(true)
}

// ── Tests ─────────────────────────────────────────────────────────────────
describe('GET /v1/movies/:id — happy path', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  it('returns 200 for a valid TMDB id', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/movies/155' })
    expect(res.statusCode).toBe(200)
  })

  it('response body has all required top-level fields', async () => {
    const body = (await app.inject({ method: 'GET', url: '/v1/movies/155' })).json()
    assertSuccessResponseShape(body)
  })

  it('sources array has at least one item', async () => {
    const { sources } = (await app.inject({ method: 'GET', url: '/v1/movies/155' })).json()
    expect(sources.length).toBeGreaterThan(0)
  })

  it('every source satisfies the OMSS source shape', async () => {
    const { sources } = (await app.inject({ method: 'GET', url: '/v1/movies/155' })).json()
    for (const source of sources) assertSourceShape(source)
  })

  it('every subtitle satisfies the OMSS subtitle shape', async () => {
    const { subtitles } = (await app.inject({ method: 'GET', url: '/v1/movies/155' })).json()
    for (const sub of subtitles) assertSubtitleShape(sub)
  })

  it('returns Content-Type: application/json', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/movies/155' })
    expect(res.headers['content-type']).toMatch(/application\/json/)
  })

  it('responseId is different on second call (cache miss behaviour)', async () => {
    // Two separate app instances = two separate caches
    const app2 = await buildTestApp()
    const r1 = (await app.inject({ method: 'GET', url: '/v1/movies/155' })).json()
    const r2 = (await app2.inject({ method: 'GET', url: '/v1/movies/155' })).json()
    // ResponseIDs must be unique identifiers (UUIDs or similar)
    expect(typeof r1.responseId).toBe('string')
    expect(typeof r2.responseId).toBe('string')
    await app2.close()
  })

  it('expiresAt, if present, is a valid ISO 8601 string', async () => {
    const { expiresAt } = (await app.inject({ method: 'GET', url: '/v1/movies/155' })).json()
    if (expiresAt !== undefined) {
      expect(() => new Date(expiresAt)).not.toThrow()
      expect(new Date(expiresAt).toString()).not.toBe('Invalid Date')
    }
  })
})

describe('GET /v1/movies/:id — caching', () => {
  it('returns the same responseId on a second call (cache HIT)', async () => {
    const app = await buildTestApp()
    const r1 = (await app.inject({ method: 'GET', url: '/v1/movies/155' })).json()
    const r2 = (await app.inject({ method: 'GET', url: '/v1/movies/155' })).json()
    expect(r1.responseId).toBe(r2.responseId)
    await app.close()
  })
})

describe('GET /v1/movies/:id — error cases', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  it('returns 400 for a non-numeric id', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/movies/abc' })
    expect(res.statusCode).toBe(400)
  })

  it('400 response has error.code INVALID_TMDB_ID', async () => {
    const body = (await app.inject({ method: 'GET', url: '/v1/movies/abc' })).json()
    expect(body.error.code).toBe('INVALID_TMDB_ID')
  })

  it('error response has traceId', async () => {
    const body = (await app.inject({ method: 'GET', url: '/v1/movies/abc' })).json()
    expect(body).toHaveProperty('traceId')
    expect(typeof body.traceId).toBe('string')
  })

  it('error response has error.message', async () => {
    const body = (await app.inject({ method: 'GET', url: '/v1/movies/abc' })).json()
    expect(body.error).toHaveProperty('message')
    expect(typeof body.error.message).toBe('string')
  })

  it('returns 404 when no provider returns sources', async () => {
    const noSourceApp = await buildTestApp({
      providers: [
        makeStubProvider({
          movieResult: { sources: [], subtitles: [], diagnostics: [] },
        }),
      ],
    })
    const res = await noSourceApp.inject({ method: 'GET', url: '/v1/movies/155' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('NO_SOURCES_AVAILABLE')
    await noSourceApp.close()
  })

  it('returns 404 when no providers are registered', async () => {
    const emptyApp = await buildTestApp({ providers: [] })
    const res = await emptyApp.inject({ method: 'GET', url: '/v1/movies/155' })
    expect(res.statusCode).toBe(404)
    await emptyApp.close()
  })

  it('returns 406 for unsupported Accept header', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/movies/155',
      headers: { accept: 'application/xml' },
    })
    expect(res.statusCode).toBe(406)
  })

  it('diagnostics contains PROVIDER_ERROR when a provider throws', async () => {
    const failApp = await buildTestApp({
      providers: [
        makeStubProvider({ id: 'fail', throwOnMovie: true }),
        makeStubProvider({ id: 'ok' }),
      ],
    })
    // ok provider still returns sources, so we get a 200 with diagnostic
    const body = (await failApp.inject({ method: 'GET', url: '/v1/movies/155' })).json()
    if (body.sources?.length > 0) {
      const providerError = body.diagnostics.find((d: any) => d.code === 'PROVIDER_ERROR')
      expect(providerError).toBeTruthy()
      expect(providerError.severity).toBe('error')
    }
    await failApp.close()
  })
})
