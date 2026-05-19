import { describe, it, expect, vi, afterEach } from 'vitest'
import { requestLogger } from '../../../src/middleware/logger.js'

function makeRequest(overrides: Record<string, any> = {}) {
  return { method: 'GET', url: '/test', ...overrides } as any
}

function makeReply(statusCode = 200) {
  const listeners: Record<string, Function> = {}
  const raw = {
    on: vi.fn((event: string, cb: Function) => { listeners[event] = cb }),
  }
  const reply = { raw, statusCode } as any
  return { reply, listeners, raw }
}

describe('requestLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls done() immediately', () => {
    const { reply } = makeReply()
    const done = vi.fn()
    requestLogger(makeRequest(), reply, done)
    expect(done).toHaveBeenCalledOnce()
  })

  it('registers a finish listener on reply.raw', () => {
    const { reply, raw } = makeReply()
    requestLogger(makeRequest(), reply, vi.fn())
    expect(raw.on).toHaveBeenCalledWith('finish', expect.any(Function))
  })

  it('logs to console when finish fires', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { reply, listeners } = makeReply(200)
    requestLogger(makeRequest(), reply, vi.fn())
    listeners['finish']()
    expect(consoleSpy).toHaveBeenCalledOnce()
    const logged: string = consoleSpy.mock.calls[0][0]
    expect(logged).toContain('GET')
    expect(logged).toContain('/test')
    expect(logged).toContain('200')
  })

  it('includes duration in the log line', () => {
    vi.useFakeTimers()
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { reply, listeners } = makeReply(200)
    requestLogger(makeRequest(), reply, vi.fn())
    vi.advanceTimersByTime(123)
    listeners['finish']()
    const logged: string = consoleSpy.mock.calls[0][0]
    expect(logged).toContain('123ms')
    vi.useRealTimers()
  })
})

afterEach(() => vi.restoreAllMocks())

describe('requestLogger - status color branches', () => {
  it.each([
    [200, '\x1b[32m'], // green
    [301, '\x1b[34m'], // blue
    [404, '\x1b[33m'], // yellow
    [500, '\x1b[31m'], // red
    [100, '\x1b[0m'],  // reset (default branch)
  ])('status %i uses correct ANSI color code', (code, colorCode) => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { reply, listeners } = makeReply(code)
    requestLogger({ method: 'GET', url: '/' } as any, reply, vi.fn())
    listeners['finish']()
    const logged: string = consoleSpy.mock.calls[0][0]
    expect(logged).toContain(colorCode)
  })
})
