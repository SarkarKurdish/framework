/**
 * Integration: SSE streaming for movie and TV source endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildTestApp } from '../helper.js'

function parseSSE(body: string) {
  const events: Array<{ event: string; data: Record<string, unknown> }> = []

  for (const block of body.split('\n\n').filter(Boolean)) {
    let event = 'message'
    let data = ''

    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7)
      if (line.startsWith('data: ')) data = line.slice(6)
    }

    if (data) {
      events.push({ event, data: JSON.parse(data) })
    }
  }

  return events
}

describe('SSE source streaming', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /v1/movies/:id with Accept: text/event-stream returns SSE', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/movies/155',
      headers: { accept: 'text/event-stream' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')

    const events = parseSSE(res.body)
    expect(events.some((e) => e.event === 'start')).toBe(true)
    expect(events.some((e) => e.event === 'complete')).toBe(true)

    const complete = events.find((e) => e.event === 'complete')
    expect(complete?.data.response).toBeDefined()
  })

  it('GET /v1/tv/:id/seasons/:s/episodes/:e with Accept: text/event-stream returns SSE', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/tv/1396/seasons/1/episodes/1',
      headers: { accept: 'text/event-stream' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')

    const events = parseSSE(res.body)
    expect(events.some((e) => e.event === 'start')).toBe(true)
    expect(events.some((e) => e.event === 'complete')).toBe(true)
  })

  it('includes Access-Control-Allow-Origin for SSE responses', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/movies/155',
      headers: {
        accept: 'text/event-stream',
        origin: 'http://localhost:5173',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBeTruthy()
  })

  it('emits error event when no sources are available', async () => {
    const appNoProviders = await buildTestApp({ providers: [] })

    const res = await appNoProviders.inject({
      method: 'GET',
      url: '/v1/movies/155',
      headers: { accept: 'text/event-stream' },
    })

    expect(res.statusCode).toBe(200)

    const events = parseSSE(res.body)
    expect(events.some((e) => e.event === 'error')).toBe(true)

    await appNoProviders.close()
  })
})
