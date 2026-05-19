import { describe, it, expect, beforeEach } from 'vitest'
import { HealthService } from '../../../src/services/health.service.js'
import { ProviderRegistry } from '../../../src/providers/provider-registry.js'
import { BaseProvider } from '../../../src/providers/base-provider.js'
import type { OMSSConfig, ProviderCapabilities, ProviderMediaObject, ProviderResult } from '../../../src/core/types/index.js'

class FakeProvider extends BaseProvider {
  constructor(public readonly id: string, public readonly enabled: boolean) { super() }
  readonly name = 'Fake'
  readonly BASE_URL = ''
  readonly HEADERS = {}
  readonly capabilities: ProviderCapabilities = { supportedContentTypes: ['movies'] }
  async getMovieSources(_: ProviderMediaObject): Promise<ProviderResult> { return { sources: [], subtitles: [], diagnostics: [] } }
  async getTVSources(_: ProviderMediaObject): Promise<ProviderResult> { return { sources: [], subtitles: [], diagnostics: [] } }
}

const config: OMSSConfig = {
  name: 'Test OMSS',
  version: '1.0.0',
}

describe('HealthService', () => {
  let registry: ProviderRegistry

  beforeEach(() => {
    registry = new ProviderRegistry()
  })

  it('returns spec: omss', () => {
    const svc = new HealthService(config, registry)
    expect(svc.getHealth().spec).toBe('omss')
  })

  it('reflects config name and version', () => {
    const svc = new HealthService(config, registry)
    const health = svc.getHealth()
    expect(health.name).toBe('Test OMSS')
    expect(health.version).toBe('1.0.0')
  })

  it('returns degraded status when no providers registered', () => {
    const svc = new HealthService(config, registry)
    expect(svc.getHealth().status).toBe('degraded')
  })

  it('returns operational when at least one provider registered', () => {
    registry.register(new FakeProvider('p1', true))
    const svc = new HealthService(config, registry)
    expect(svc.getHealth().status).toBe('operational')
  })

  it('returns the custom note when set in config', () => {
    const svc = new HealthService({ ...config, note: 'custom note' }, registry)
    expect(svc.getHealth().note).toBe('custom note')
  })

  it('includes enabled provider names in auto-generated note', () => {
    registry.register(new FakeProvider('p1', true))
    const svc = new HealthService(config, registry)
    expect(svc.getHealth().note).toContain('Fake')
  })

  it('includes all required endpoint keys', () => {
    const svc = new HealthService(config, registry)
    const { endpoints } = svc.getHealth()
    expect(endpoints).toHaveProperty('movie')
    expect(endpoints).toHaveProperty('tv')
    expect(endpoints).toHaveProperty('proxy')
    expect(endpoints).toHaveProperty('refresh')
  })
})