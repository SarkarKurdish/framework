/**
 * Integration test helpers
 * ------------------------------------------------------------------
 * Builds a minimal in-process OMSSServer backed by:
 *   - MemoryCacheService (no Redis)
 *   - A configurable stub provider (no real network calls)
 *   - A mocked TMDBService (no TMDB API key required)
 *
 * Uses Fastify's inject() so no port is ever bound.
 */

import { vi } from 'vitest'
import type { ProviderCapabilities, ProviderMediaObject, ProviderResult, OMSSConfig } from '../../src/core/types/index.js'
import { BaseProvider } from '../../src/providers/base-provider.js'
import { ProviderRegistry } from '../../src/providers/provider-registry.js'
import { MemoryCacheService } from '../../src/core/cache.js'
import { SourceService } from '../../src/services/source.service.js'
import { HealthService } from '../../src/services/health.service.js'
import { ProxyService } from '../../src/services/proxy.service.js'
import { StremioService } from '../../src/services/stremio.service.js'
import { TMDBService } from '../../src/services/tmdb.service.js'
import { ContentController } from '../../src/controllers/content.controller.js'
import { HealthController } from '../../src/controllers/health.controller.js'
import { ProxyController } from '../../src/controllers/proxy.controller.js'
import { errorHandler } from '../../src/middleware/error-handler.js'
import { validateContentType } from '../../src/middleware/validation.js'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'

// ── Stub Provider ──────────────────────────────────────────────────────────
export interface StubProviderOptions {
  id?: string
  name?: string
  enabled?: boolean
  capabilities?: ProviderCapabilities
  movieResult?: ProviderResult
  tvResult?: ProviderResult
  throwOnMovie?: boolean
  throwOnTV?: boolean
}

export function makeStubProvider(opts: StubProviderOptions = {}): BaseProvider {
  const proxyBase = 'http://localhost:3000'

  class StubProvider extends BaseProvider {
    readonly id = opts.id ?? 'stub'
    readonly name = opts.name ?? 'Stub Provider'
    readonly enabled = opts.enabled ?? true
    readonly BASE_URL = 'https://stub.example'
    readonly HEADERS = {}
    readonly capabilities: ProviderCapabilities = opts.capabilities ?? {
      supportedContentTypes: ['movies', 'tv'],
    }

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
      if (opts.throwOnMovie) throw new Error('stub movie error')
      return (
        opts.movieResult ?? {
          sources: [
            {
              url: `${proxyBase}/v1/proxy?data=${encodeURIComponent(JSON.stringify({ url: 'https://cdn.example.com/movie.m3u8' }))}`,
              type: 'hls',
              quality: '1080p',
              audioTracks: [{ language: 'en', label: 'English' }],
              provider: { id: this.id, name: this.name },
            },
          ],
          subtitles: [
            {
              url: `${proxyBase}/v1/proxy?data=${encodeURIComponent(JSON.stringify({ url: 'https://cdn.example.com/sub.vtt' }))}`,
              label: 'English',
              format: 'vtt',
            },
          ],
          diagnostics: [],
        }
      )
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
      if (opts.throwOnTV) throw new Error('stub tv error')
      return (
        opts.tvResult ?? {
          sources: [
            {
              url: `${proxyBase}/v1/proxy?data=${encodeURIComponent(JSON.stringify({ url: 'https://cdn.example.com/episode.m3u8' }))}`,
              type: 'hls',
              quality: '720p',
              audioTracks: [{ language: 'en', label: 'English' }],
              provider: { id: this.id, name: this.name },
            },
          ],
          subtitles: [],
          diagnostics: [],
        }
      )
    }
  }

  return new StubProvider()
}

// ── Mock TMDBService ───────────────────────────────────────────────────────
export function makeMockTmdbService(): TMDBService {
  const svc = new TMDBService('fake-key', new MemoryCacheService(), 0)

  vi.spyOn(svc, 'validateMovie').mockResolvedValue({ exists: true, released: true })
  vi.spyOn(svc, 'validateTVEpisode').mockResolvedValue({ exists: true, released: true })
  vi.spyOn(svc, 'getMediaObject').mockResolvedValue({
    type: 'movie',
    tmdbId: '155',
    releaseYear: '2008',
    imdbId: 'tt0468569',
    title: 'The Dark Knight',
  })
  vi.spyOn(svc, 'getImdbId').mockResolvedValue('tt0468569')

  return svc
}

// ── Build test Fastify app without starting a real server ──────────────────
export interface TestAppOptions {
  providers?: BaseProvider[]
  config?: Partial<OMSSConfig>
}

export async function buildTestApp(opts: TestAppOptions = {}): Promise<FastifyInstance> {
  const config: OMSSConfig = {
    name: 'Test OMSS',
    version: '0.0.1',
    port: 3000,
    host: 'localhost',
    ...(opts.config ?? {}),
  }

  const registry = new ProviderRegistry({ proxyBaseUrl: 'http://localhost:3000' })
  const providers = opts.providers ?? [makeStubProvider()]
  for (const p of providers) registry.register(p)

  const cache = new MemoryCacheService()
  const tmdb = makeMockTmdbService()
  const proxy = new ProxyService()
  const stremio = new StremioService([], proxy)
  const sourceService = new SourceService(registry, cache, tmdb, stremio)
  const healthService = new HealthService(config, registry)

  const contentController = new ContentController(sourceService)
  const healthController = new HealthController(healthService)
  const proxyController = new ProxyController(proxy)

  const app = Fastify({ logger: false, genReqId: () => crypto.randomUUID() })

  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept'],
    exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Range', 'Accept-Ranges'],
  })
  app.addHook('preHandler', validateContentType)
  app.setErrorHandler(errorHandler)

  // Health
  app.get('/', healthController.getHealth.bind(healthController))
  app.get('/v1', healthController.getHealth.bind(healthController))
  app.get('/v1/', healthController.getHealth.bind(healthController))
  app.get('/v1/health', healthController.getHealth.bind(healthController))

  // Content
  app.get('/v1/movies/:id', contentController.getMovie.bind(contentController))
  app.get('/v1/tv/:id/seasons/:s/episodes/:e', contentController.getTVEpisode.bind(contentController))
  app.get('/v1/refresh/:responseId', contentController.refreshSource.bind(contentController))

  // Proxy
  app.get('/v1/proxy', proxyController.proxy.bind(proxyController))

  // 404
  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({
      error: { code: 'ENDPOINT_NOT_FOUND', message: 'Not found', details: { path: req.url } },
      traceId: req.id,
    })
  })

  await app.ready()
  return app
}
