import { describe, it, vi, expect } from 'vitest'
import { MemoryCacheService } from '../../../src/core/cache.js'

// Tests for RedisCacheService are skipped in unit tests (require a real Redis).
// These additional MemoryCache tests cover the remaining uncovered branches.

describe('MemoryCacheService - additional branch coverage', () => {
  it('delete on non-existent key does not throw', async () => {
    const cache = new MemoryCacheService()
    await expect(cache.delete('ghost')).resolves.toBeUndefined()
    cache.destroy()
  })

  it('set then clear removes all entries including different types', async () => {
    const cache = new MemoryCacheService()
    await cache.set('str', 'hello')
    await cache.set('num', 42)
    await cache.set('obj', { a: 1 })
    await cache.clear()
    expect(await cache.get('str')).toBeNull()
    expect(await cache.get('num')).toBeNull()
    expect(await cache.get('obj')).toBeNull()
    cache.destroy()
  })

  it('defaults ttl to 7200 seconds when not provided', async () => {
    vi.useFakeTimers()
    const cache = new MemoryCacheService()
    await cache.set('key', 'value') // no TTL arg → 7200s default
    vi.advanceTimersByTime(7199 * 1000)
    expect(await cache.get('key')).toBe('value')
    vi.advanceTimersByTime(2000)
    expect(await cache.get('key')).toBeNull()
    vi.useRealTimers()
    cache.destroy()
  })
})