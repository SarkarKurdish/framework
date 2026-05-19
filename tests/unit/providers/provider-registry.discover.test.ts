import { describe, it, expect } from 'vitest'
import { ProviderRegistry } from '../../../src/providers/provider-registry.js'
import { BaseProvider } from '../../../src/providers/base-provider.js'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

class FakeProvider extends BaseProvider {
  readonly id = 'fake-discovered'
  readonly name = 'Fake Discovered'
  readonly enabled = true
  readonly BASE_URL = ''
  readonly HEADERS = {}
  readonly capabilities = { supportedContentTypes: ['movies' as const] }
  async getMovieSources(): Promise<any> { return { sources: [], subtitles: [], diagnostics: [] } }
  async getTVSources(): Promise<any> { return { sources: [], subtitles: [], diagnostics: [] } }
}

describe('ProviderRegistry.discoverProviders', () => {
  it('does nothing when directory does not exist', async () => {
    const registry = new ProviderRegistry()
    await expect(registry.discoverProviders('/nonexistent/path/xyz')).resolves.toBeUndefined()
    expect(registry.count).toBe(0)
  })

  it('skips .test. and .spec. files', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omss-test-'))
    try {
      await fs.writeFile(path.join(tmpDir, 'foo.test.ts'), '// skip me')
      await fs.writeFile(path.join(tmpDir, 'bar.spec.ts'), '// skip me too')
      const registry = new ProviderRegistry()
      await registry.discoverProviders(tmpDir)
      expect(registry.count).toBe(0)
    } finally {
      await fs.rm(tmpDir, { recursive: true })
    }
  })

  it('skips .d.ts files', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omss-test-'))
    try {
      await fs.writeFile(path.join(tmpDir, 'provider.d.ts'), '// types only')
      const registry = new ProviderRegistry()
      await registry.discoverProviders(tmpDir)
      expect(registry.count).toBe(0)
    } finally {
      await fs.rm(tmpDir, { recursive: true })
    }
  })
})