/**
 * Integration: Cross-cutting error and edge-case behaviour
 * Spec ref: OMSS v1.0 §7, §3.6, §3.7
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildTestApp } from '../helper'

describe('404 — unknown routes', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  it('returns 404 for an unknown path', async () => {
    const res = await app.inject({ method: 'GET', url: '/does-not-exist' })
    expect(res.statusCode).toBe(404)
  })

  it('404 body has ENDPOINT_NOT_FOUND code', async () => {
    const body = (await app.inject({ method: 'GET', url: '/does-not-exist' })).json()
    expect(body.error.code).toBe('ENDPOINT_NOT_FOUND')
    expect(body).toHaveProperty('traceId')
  })
})

describe('Content negotiation (§3.6)', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  it('accepts application/json', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: { accept: 'application/json' },
    })
    expect(res.statusCode).toBe(200)
  })

  it('accepts */* (wildcard)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: { accept: '*/*' },
    })
    expect(res.statusCode).toBe(200)
  })

  it('rejects application/xml with 406', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: { accept: 'application/xml' },
    })
    expect(res.statusCode).toBe(406)
    expect(res.json().error.code).toBe('UNSUPPORTED_MEDIA_TYPE')
  })
})

describe('CORS headers (§3.7)', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  it('OPTIONS preflight returns 204', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/v1/movies/155',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'GET',
      },
    })
    expect([200, 204]).toContain(res.statusCode)
  })

  it('GET /v1/health includes Access-Control-Allow-Origin header', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: { origin: 'http://localhost:5173' },
    })
    expect(res.headers['access-control-allow-origin']).toBeTruthy()
  })
})

describe('Error response structure invariants', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  const errorCases = [
    { url: '/v1/movies/abc', expectedStatus: 400 },
    { url: '/v1/tv/abc/seasons/1/episodes/1', expectedStatus: 400 },
    { url: '/v1/tv/1396/seasons/100/episodes/1', expectedStatus: 400 },
    { url: '/v1/tv/1396/seasons/1/episodes/0', expectedStatus: 400 },
    { url: '/v1/refresh/!!!invalid!!!', expectedStatus: 400 },
    { url: '/v1/refresh/00000000-0000-0000-0000-nonexistent', expectedStatus: 404 },
    { url: '/not-a-real-path', expectedStatus: 404 },
  ]

  for (const { url, expectedStatus } of errorCases) {
    it(`${url} → ${expectedStatus} with error envelope`, async () => {
      const res = await app.inject({ method: 'GET', url })
      expect(res.statusCode).toBe(expectedStatus)
      const body = res.json()
      // All non-2xx responses MUST have error.code, error.message, traceId
      expect(body).toHaveProperty('error')
      expect(body.error).toHaveProperty('code')
      expect(typeof body.error.code).toBe('string')
      expect(body.error).toHaveProperty('message')
      expect(typeof body.error.message).toBe('string')
      expect(body).toHaveProperty('traceId')
      expect(typeof body.traceId).toBe('string')
    })
  }
})
