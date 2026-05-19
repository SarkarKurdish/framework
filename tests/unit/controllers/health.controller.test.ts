import { describe, it, expect, vi } from 'vitest'
import { HealthController } from '../../../src/controllers/health.controller.js'

function makeReply() {
  const r: any = {}
  r.code = vi.fn().mockReturnValue(r)
  r.send = vi.fn().mockReturnValue(r)
  return r
}

describe('HealthController', () => {
  it('calls getHealth on the service', async () => {
    const health = { name: 'test', status: 'operational', spec: 'omss' }
    const svc = { getHealth: vi.fn().mockReturnValue(health) } as any
    const ctrl = new HealthController(svc)
    const reply = makeReply()
    await ctrl.getHealth({} as any, reply)
    expect(svc.getHealth).toHaveBeenCalledOnce()
  })

  it('responds with 200 and the service result', async () => {
    const health = { name: 'test', status: 'operational', spec: 'omss' }
    const svc = { getHealth: vi.fn().mockReturnValue(health) } as any
    const ctrl = new HealthController(svc)
    const reply = makeReply()
    await ctrl.getHealth({} as any, reply)
    expect(reply.code).toHaveBeenCalledWith(200)
    expect(reply.send).toHaveBeenCalledWith(health)
  })
})
