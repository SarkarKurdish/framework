import { Writable } from 'stream'
import { FastifyRequest } from 'fastify'
import { SourceStreamEvent } from '../core/types/index.js'

export const SSE_CONTENT_TYPE = 'text/event-stream'

export function acceptsEventStream(request: FastifyRequest): boolean {
    const accept = request.headers?.accept
    if (!accept) return false
    return accept.includes(SSE_CONTENT_TYPE)
}

export function writeSSEEvent(stream: Writable, event: SourceStreamEvent): void {
    stream.write(`event: ${event.type}\n`)
    stream.write(`data: ${JSON.stringify(event.data)}\n\n`)
}
