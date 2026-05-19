import { describe, it, expect } from 'vitest'
import { safeId } from '../../../src/utils/string.js'

describe('safeId', () => {
  it('lowercases the input', () => {
    expect(safeId('Hello')).toBe('hello')
  })

  it('replaces spaces with dots', () => {
    expect(safeId('my provider')).toBe('my.provider')
  })

  it('collapses multiple spaces into a single dot', () => {
    expect(safeId('my   provider')).toBe('my.provider')
  })

  it('strips non-alpha characters', () => {
    expect(safeId('my-provider_2!')).toBe('myprovider')
  })

  it('trims leading and trailing whitespace', () => {
    expect(safeId('  hello  ')).toBe('hello')
  })

  it('handles a fully numeric string', () => {
    expect(safeId('12345')).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(safeId('')).toBe('')
  })
})
