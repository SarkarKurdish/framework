import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryCacheService } from '../../../src/core/cache.js'

describe('MemoryCacheService', () => {
  let cache: MemoryCacheService

  beforeEach(() => {
    cache = new MemoryCacheService()
  })

  afterEach(() => {
    cache.destroy()
  })

  it('returns null for a missing key', async () => {
    expect(await cache.get('missing')).toBeNull()
  })

  it('stores and retrieves a value', async () => {
    await cache.set('key', { foo: 'bar' })
    expect(await cache.get('key')).toEqual({ foo: 'bar' })
  })

  it('overwrites an existing value', async () => {
    await cache.set('key', 'first')
    await cache.set('key', 'second')
    expect(await cache.get('key')).toBe('second')
  })

  it('deletes a value', async () => {
    await cache.set('key', 42)
    await cache.delete('key')
    expect(await cache.get('key')).toBeNull()
  })

  it('clears all values', async () => {
    await cache.set('a', 1)
    await cache.set('b', 2)
    await cache.clear()
    expect(await cache.get('a')).toBeNull()
    expect(await cache.get('b')).toBeNull()
  })

  it('expires entries after the given ttl (ms precision)', async () => {
    vi.useFakeTimers()
    await cache.set('expiring', 'value', 1) // 1 second TTL
    vi.advanceTimersByTime(999)
    expect(await cache.get('expiring')).toBe('value')
    vi.advanceTimersByTime(2) // now past 1 s
    expect(await cache.get('expiring')).toBeNull()
    vi.useRealTimers()
  })

  it('does not return a value after expiry without explicit delete', async () => {
    vi.useFakeTimers()
    await cache.set('x', 'y', 2)
    vi.advanceTimersByTime(3000)
    expect(await cache.get('x')).toBeNull()
    vi.useRealTimers()
  })
})
