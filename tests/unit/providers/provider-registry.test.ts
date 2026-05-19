import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProviderRegistry } from '../../../src/providers/provider-registry.js'
import { BaseProvider } from '../../../src/providers/base-provider.js'
import type { ProviderCapabilities, ProviderMediaObject, ProviderResult } from '../../../src/core/types/index.js'

class FakeProvider extends BaseProvider {
  readonly id = 'fake'
  readonly name = 'Fake Provider'
  readonly enabled = true
  readonly BASE_URL = 'https://fake.example'
  readonly HEADERS = {}
  readonly capabilities: ProviderCapabilities = {
    supportedContentTypes: ['movies', 'tv'],
  }

  async getMovieSources(_media: ProviderMediaObject): Promise<ProviderResult> {
    return { sources: [], subtitles: [], diagnostics: [] }
  }

  async getTVSources(_media: ProviderMediaObject): Promise<ProviderResult> {
    return { sources: [], subtitles: [], diagnostics: [] }
  }
}

class DisabledProvider extends BaseProvider {
  readonly id = 'disabled'
  readonly name = 'Disabled Provider'
  readonly enabled = false
  readonly BASE_URL = 'https://disabled.example'
  readonly HEADERS = {}
  readonly capabilities: ProviderCapabilities = {
    supportedContentTypes: ['movies'],
  }

  async getMovieSources(_media: ProviderMediaObject): Promise<ProviderResult> {
    return { sources: [], subtitles: [], diagnostics: [] }
  }

  async getTVSources(_media: ProviderMediaObject): Promise<ProviderResult> {
    return { sources: [], subtitles: [], diagnostics: [] }
  }
}

describe('ProviderRegistry - register / unregister', () => {
  let registry: ProviderRegistry

  beforeEach(() => {
    registry = new ProviderRegistry()
  })

  it('registers a provider successfully', () => {
    registry.register(new FakeProvider())
    expect(registry.hasProvider('fake')).toBe(true)
    expect(registry.count).toBe(1)
  })

  it('throws when registering a duplicate id', () => {
    registry.register(new FakeProvider())
    expect(() => registry.register(new FakeProvider())).toThrow(/already registered/i)
  })

  it('unregisters a provider and returns true', () => {
    registry.register(new FakeProvider())
    expect(registry.unregister('fake')).toBe(true)
    expect(registry.hasProvider('fake')).toBe(false)
  })

  it('returns false when unregistering a non-existent provider', () => {
    expect(registry.unregister('ghost')).toBe(false)
  })

  it('clears all providers', () => {
    registry.register(new FakeProvider())
    registry.register(new DisabledProvider())
    registry.clear()
    expect(registry.count).toBe(0)
  })
})

describe('ProviderRegistry - getters', () => {
  let registry: ProviderRegistry

  beforeEach(() => {
    registry = new ProviderRegistry()
    registry.register(new FakeProvider())
    registry.register(new DisabledProvider())
  })

  it('getProviders returns all providers', () => {
    expect(registry.getProviders()).toHaveLength(2)
  })

  it('getProvider returns the correct provider by id', () => {
    expect(registry.getProvider('fake')?.id).toBe('fake')
  })

  it('getProvider returns undefined for unknown id', () => {
    expect(registry.getProvider('unknown')).toBeUndefined()
  })

  it('getEnabledProviders filters out disabled providers', () => {
    const enabled = registry.getEnabledProviders()
    expect(enabled).toHaveLength(1)
    expect(enabled[0].id).toBe('fake')
  })

  it('listProviders returns all provider ids', () => {
    expect(registry.listProviders()).toEqual(expect.arrayContaining(['fake', 'disabled']))
  })
})

describe('ProviderRegistry - healthCheckAll', () => {
  it('returns a map of provider health results', async () => {
    const registry = new ProviderRegistry()
    registry.register(new FakeProvider())
    registry.register(new DisabledProvider())

    const results = await registry.healthCheckAll()

    // enabled = true → healthCheck returns true; disabled = false → returns false
    expect(results.get('fake')).toBe(true)
    expect(results.get('disabled')).toBe(false)
  })

  it('marks a provider as unhealthy if healthCheck throws', async () => {
    const registry = new ProviderRegistry()
    const provider = new FakeProvider()
    vi.spyOn(provider, 'healthCheck').mockRejectedValueOnce(new Error('network error'))
    registry.register(provider)

    const results = await registry.healthCheckAll()
    expect(results.get('fake')).toBe(false)
  })
})