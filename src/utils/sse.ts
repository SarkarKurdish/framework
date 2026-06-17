import { FastifyReply, FastifyRequest } from 'fastify'
import { SourceStreamEvent } from '../core/types/index.js'

export const SSE_CONTENT_TYPE = 'text/event-stream'

export const SSE_HEADERS: Record<string, string> = {
    'Content-Type': SSE_CONTENT_TYPE,
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
}

export function acceptsEventStream(request: FastifyRequest): boolean {
    const accept = request.headers?.accept
    if (!accept) return false
    return accept.includes(SSE_CONTENT_TYPE)
}

export function writeSSEEvent(reply: FastifyReply, event: SourceStreamEvent): void {
    reply.raw.write(`event: ${event.type}\n`)
    reply.raw.write(`data: ${JSON.stringify(event.data)}\n\n`)
}

export function beginSSE(reply: FastifyReply): void {
    reply.hijack()
    reply.raw.writeHead(200, SSE_HEADERS)
}

export function endSSE(reply: FastifyReply): void {
    reply.raw.end()
}
