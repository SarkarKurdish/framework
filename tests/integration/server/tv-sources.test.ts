/**
 * Integration: GET /v1/tv/:id/seasons/:s/episodes/:e
 * Spec ref: OMSS v1.0 §4.3, §6.1, §7
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildTestApp, makeStubProvider } from '../helper'

const TV_URL = '/v1/tv/1396/seasons/1/episodes/1'

describe('GET /v1/tv/:id/seasons/:s/episodes/:e — happy path', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  it('returns 200 for valid params', async () => {
    const res = await app.inject({ method: 'GET', url: TV_URL })
    expect(res.statusCode).toBe(200)
  })

  it('response has required top-level fields', async () => {
    const body = (await app.inject({ method: 'GET', url: TV_URL })).json()
    expect(body).toHaveProperty('responseId')
    expect(body).toHaveProperty('sources')
    expect(body).toHaveProperty('subtitles')
    expect(body).toHaveProperty('diagnostics')
  })

  it('sources array is non-empty', async () => {
    const { sources } = (await app.inject({ method: 'GET', url: TV_URL })).json()
    expect(sources.length).toBeGreaterThan(0)
  })

  it('every source url goes through the proxy', async () => {
    const { sources } = (await app.inject({ method: 'GET', url: TV_URL })).json()
    for (const s of sources) expect(s.url).toMatch(/\/v1\/proxy/)
  })

  it('season 0 (specials) is accepted', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/tv/1396/seasons/0/episodes/1' })
    expect(res.statusCode).toBe(200)
  })

  it('returns same responseId on second call (cache HIT)', async () => {
    const r1 = (await app.inject({ method: 'GET', url: TV_URL })).json()
    const r2 = (await app.inject({ method: 'GET', url: TV_URL })).json()
    expect(r1.responseId).toBe(r2.responseId)
  })
})

describe('GET /v1/tv/:id/seasons/:s/episodes/:e — error cases', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  it('returns 400 for non-numeric show id', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/tv/abc/seasons/1/episodes/1' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('INVALID_TMDB_ID')
  })

  it('returns 400 for season out of range (>99)', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/tv/1396/seasons/100/episodes/1' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('INVALID_SEASON')
  })

  it('returns 400 for episode 0', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/tv/1396/seasons/1/episodes/0' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('INVALID_EPISODE')
  })

  it('returns 400 for negative season', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/tv/1396/seasons/-1/episodes/1' })
    // Fastify parses -1 as -1 which our validator should reject
    expect([400, 404]).toContain(res.statusCode)
  })

  it('every error response has traceId and error.code', async () => {
    const body = (await app.inject({ method: 'GET', url: '/v1/tv/abc/seasons/1/episodes/1' })).json()
    expect(body).toHaveProperty('traceId')
    expect(body.error).toHaveProperty('code')
    expect(body.error).toHaveProperty('message')
  })

  it('returns 404 when no sources found', async () => {
    const emptyApp = await buildTestApp({
      providers: [makeStubProvider({ tvResult: { sources: [], subtitles: [], diagnostics: [] } })],
    })
    const res = await emptyApp.inject({ method: 'GET', url: TV_URL })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('NO_SOURCES_AVAILABLE')
    await emptyApp.close()
  })

  it('providers without TV capability are filtered out', async () => {
    const movieOnlyApp = await buildTestApp({
      providers: [
        makeStubProvider({
          capabilities: { supportedContentTypes: ['movies'] },
        }),
      ],
    })
    const res = await movieOnlyApp.inject({ method: 'GET', url: TV_URL })
    // No provider handles TV → 404
    expect(res.statusCode).toBe(404)
    await movieOnlyApp.close()
  })
})
