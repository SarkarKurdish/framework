import { describe, it, expect } from 'vitest'
import { OMSSError, OMSSErrors } from '../../../src/core/errors.js'

describe('OMSSError', () => {
  it('sets name to OMSSError', () => {
    const err = new OMSSError('INTERNAL_ERROR', 'oops', 500)
    expect(err.name).toBe('OMSSError')
    expect(err).toBeInstanceOf(Error)
  })

  it('stores code, message, and statusCode', () => {
    const err = new OMSSError('INVALID_TMDB_ID', 'bad id', 400, { foo: 'bar' })
    expect(err.code).toBe('INVALID_TMDB_ID')
    expect(err.message).toBe('bad id')
    expect(err.statusCode).toBe(400)
    expect(err.details).toEqual({ foo: 'bar' })
  })

  it('generates a traceId by default', () => {
    const err = new OMSSError('INTERNAL_ERROR', 'oops', 500)
    expect(err.traceId).toBeTruthy()
    expect(typeof err.traceId).toBe('string')
  })

  it('accepts a custom traceId', () => {
    const err = new OMSSError('INTERNAL_ERROR', 'oops', 500, {}, 'custom-trace')
    expect(err.traceId).toBe('custom-trace')
  })

  it('serialises to JSON correctly', () => {
    const err = new OMSSError('INTERNAL_ERROR', 'oops', 500, { detail: 1 })
    const json = err.toJSON()
    expect(json.error.code).toBe('INTERNAL_ERROR')
    expect(json.error.message).toBe('oops')
    expect(json.error.details).toEqual({ detail: 1 })
    expect(json.traceId).toBeTruthy()
  })
})

describe('OMSSErrors factories', () => {
  it('invalidTmdbId has statusCode 400 and INVALID_TMDB_ID code', () => {
    const err = OMSSErrors.invalidTmdbId('abc')
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('INVALID_TMDB_ID')
    expect(err.details?.value).toBe('abc')
  })

  it('noSourcesAvailable has statusCode 404', () => {
    const err = OMSSErrors.noSourcesAvailable('12345', 3)
    expect(err.statusCode).toBe(404)
    expect(err.code).toBe('NO_SOURCES_AVAILABLE')
    expect(err.details?.providersChecked).toBe(3)
  })

  it('invalidSeason has statusCode 400', () => {
    const err = OMSSErrors.invalidSeason(100, 10)
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('INVALID_SEASON')
    expect(err.details?.maxSeason).toBe(10)
  })

  it('invalidEpisode includes season in details', () => {
    const err = OMSSErrors.invalidEpisode(99, 2, 10)
    expect(err.statusCode).toBe(400)
    expect(err.details?.season).toBe(2)
  })

  it('invalidResponseId has code INVALID_RESPONSE_ID', () => {
    const err = OMSSErrors.invalidResponseId('bad-id')
    expect(err.code).toBe('INVALID_RESPONSE_ID')
    expect(err.statusCode).toBe(400)
  })

  it('responseIdNotFound has statusCode 404', () => {
    const err = OMSSErrors.responseIdNotFound('some-id')
    expect(err.statusCode).toBe(404)
    expect(err.code).toBe('RESPONSE_ID_NOT_FOUND')
  })

  it('internalError has statusCode 500', () => {
    const err = OMSSErrors.internalError('something broke')
    expect(err.statusCode).toBe(500)
    expect(err.code).toBe('INTERNAL_ERROR')
  })
})
