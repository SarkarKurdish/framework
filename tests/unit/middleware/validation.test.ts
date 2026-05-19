import { describe, it, expect } from 'vitest'
import {
  validateTmdbIdFormat,
  validateSeasonFormat,
  validateEpisodeFormat,
} from '../../../src/middleware/validation.js'

describe('validateTmdbIdFormat', () => {
  it('passes for a numeric string', () => {
    expect(() => validateTmdbIdFormat('12345')).not.toThrow()
  })

  it('throws OMSSError for alphabetic input', () => {
    expect(() => validateTmdbIdFormat('abc')).toThrow()
  })

  it('throws for an empty string', () => {
    expect(() => validateTmdbIdFormat('')).toThrow()
  })

  it('throws for a string longer than 20 digits', () => {
    expect(() => validateTmdbIdFormat('123456789012345678901')).toThrow()
  })

  it('throws for a string with special characters', () => {
    expect(() => validateTmdbIdFormat('123-456')).toThrow()
  })
})

describe('validateSeasonFormat', () => {
  it('passes for season 0 (specials)', () => {
    expect(() => validateSeasonFormat(0)).not.toThrow()
  })

  it('passes for a valid season', () => {
    expect(() => validateSeasonFormat(5)).not.toThrow()
  })

  it('passes for the boundary value 99', () => {
    expect(() => validateSeasonFormat(99)).not.toThrow()
  })

  it('throws for season 100', () => {
    expect(() => validateSeasonFormat(100)).toThrow()
  })

  it('throws for a negative season', () => {
    expect(() => validateSeasonFormat(-1)).toThrow()
  })
})

describe('validateEpisodeFormat', () => {
  it('passes for episode 1', () => {
    expect(() => validateEpisodeFormat(1, 1)).not.toThrow()
  })

  it('passes for the upper boundary 9999', () => {
    expect(() => validateEpisodeFormat(9999, 1)).not.toThrow()
  })

  it('throws for episode 0', () => {
    expect(() => validateEpisodeFormat(0, 1)).toThrow()
  })

  it('throws for episode 10000', () => {
    expect(() => validateEpisodeFormat(10000, 1)).toThrow()
  })
})