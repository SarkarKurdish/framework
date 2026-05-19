/**
 * Integration: GET /v1/refresh/:responseId
 * Spec ref: OMSS v1.0 §4.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildTestApp } from '../helper'

describe('GET /v1/refresh/:responseId', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  async function getResponseId(): Promise<string> {
    const body = (await app.inject({ method: 'GET', url: '/v1/movies/155' })).json()
    return body.responseId
  }

  it('returns 200 { status: "OK" } for a valid responseId', async () => {
    const responseId = await getResponseId()
    const res = await app.inject({ method: 'GET', url: `/v1/refresh/${responseId}` })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'OK' })
  })

  it('after refresh, a second call returns a NEW responseId (cache busted)', async () => {
    const first = await getResponseId()
    await app.inject({ method: 'GET', url: `/v1/refresh/${first}` })
    const second = await getResponseId()
    expect(second).not.toBe(first)
  })

  it('returns 404 for an unknown responseId', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/refresh/00000000-0000-0000-0000-000000000000' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('RESPONSE_ID_NOT_FOUND')
  })

  it('returns 400 for an invalid responseId format', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/refresh/invalid id with spaces!' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('INVALID_RESPONSE_ID')
  })

  it('error response has traceId', async () => {
    const body = (await app.inject({ method: 'GET', url: '/v1/refresh/unknown-id' })).json()
    expect(body).toHaveProperty('traceId')
  })

  it('returns 404 when the same responseId is used twice (already consumed)', async () => {
    const responseId = await getResponseId()
    await app.inject({ method: 'GET', url: `/v1/refresh/${responseId}` })
    // second refresh of the same ID should 404 since mapping is deleted
    const res = await app.inject({ method: 'GET', url: `/v1/refresh/${responseId}` })
    expect(res.statusCode).toBe(404)
  })
})
