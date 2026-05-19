/**
 * Integration: Health endpoint
 * Covers: GET /, GET /v1, GET /v1/, GET /v1/health
 * Spec ref: OMSS v1.0 §4.1
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildTestApp } from '../helper'

describe('Health endpoints', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  const healthPaths = ['/', '/v1', '/v1/', '/v1/health']

  for (const path of healthPaths) {
    it(`GET ${path} returns 200`, async () => {
      const res = await app.inject({ method: 'GET', url: path })
      expect(res.statusCode).toBe(200)
    })

    it(`GET ${path} returns spec: "omss"`, async () => {
      const res = await app.inject({ method: 'GET', url: path })
      expect(res.json().spec).toBe('omss')
    })

    it(`GET ${path} has required fields (name, version, status, endpoints, spec)`, async () => {
      const body = (await app.inject({ method: 'GET', url: path })).json()
      expect(body).toHaveProperty('name')
      expect(body).toHaveProperty('version')
      expect(body).toHaveProperty('status')
      expect(body).toHaveProperty('endpoints')
      expect(body).toHaveProperty('spec')
    })

    it(`GET ${path} endpoints contains movie, tv, proxy placeholders`, async () => {
      const { endpoints } = (await app.inject({ method: 'GET', url: path })).json()
      expect(endpoints.movie).toMatch(/\{id\}/)
      expect(endpoints.tv).toMatch(/\{id\}/)
      expect(endpoints.tv).toMatch(/\{s\}/)
      expect(endpoints.tv).toMatch(/\{e\}/)
      expect(endpoints.proxy).toMatch(/\{encoded_data\}|data/)
    })

    it(`GET ${path} status is one of operational|degraded|maintenance|offline`, async () => {
      const { status } = (await app.inject({ method: 'GET', url: path })).json()
      expect(['operational', 'degraded', 'maintenance', 'offline']).toContain(status)
    })
  }

  it('returns operational when providers are registered', async () => {
    const { status } = (await app.inject({ method: 'GET', url: '/v1/health' })).json()
    expect(status).toBe('operational')
  })

  it('returns degraded when no providers registered', async () => {
    const emptyApp = await buildTestApp({ providers: [] })
    const { status } = (await emptyApp.inject({ method: 'GET', url: '/v1/health' })).json()
    expect(status).toBe('degraded')
    await emptyApp.close()
  })

  it('Content-Type is application/json', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' })
    expect(res.headers['content-type']).toMatch(/application\/json/)
  })
})
