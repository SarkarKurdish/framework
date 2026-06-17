import { PassThrough } from 'stream'
import { FastifyRequest, FastifyReply } from 'fastify'
import { SourceService } from '../services/source.service.js'
import { OMSSError } from '../core/errors.js'
import { SourceEventEmitter, SourceStreamEvent } from '../core/types/index.js'
import { acceptsEventStream, writeSSEEvent } from '../utils/sse.js'

interface MovieParams {
    id: string
}

interface TVParams {
    id: string
    s: string
    e: string
}

interface RefreshParams {
    responseId: string
}

export class ContentController {
    constructor(private sourceService: SourceService) {}

    /**
     * GET /v1/movies/:id
     */
    async getMovie(request: FastifyRequest<{ Params: MovieParams }>, reply: FastifyReply) {
        const { id } = request.params

        if (acceptsEventStream(request)) {
            return this.streamSources((emit) => this.sourceService.getMovieSources(id, emit), request, reply)
        }

        const response = await this.sourceService.getMovieSources(id)
        return reply.code(200).send(response)
    }

    /**
     * GET /v1/tv/:id/seasons/:s/episodes/:e
     */
    async getTVEpisode(request: FastifyRequest<{ Params: TVParams }>, reply: FastifyReply) {
        const { id, s, e } = request.params
        const season = parseInt(s, 10)
        const episode = parseInt(e, 10)

        if (acceptsEventStream(request)) {
            return this.streamSources((emit) => this.sourceService.getTVSources(id, season, episode, emit), request, reply)
        }

        const response = await this.sourceService.getTVSources(id, season, episode)
        return reply.code(200).send(response)
    }

    /**
     * GET /v1/refresh/:responseId
     */
    async refreshSource(request: FastifyRequest<{ Params: RefreshParams }>, reply: FastifyReply) {
        const { responseId } = request.params
        await this.sourceService.refreshSource(responseId)
        return reply.code(200).send({ status: 'OK' })
    }

    private streamSources(fetch: (emit: SourceEventEmitter) => Promise<unknown>, request: FastifyRequest, reply: FastifyReply) {
        const stream = new PassThrough()
        const emit = (event: SourceStreamEvent) => writeSSEEvent(stream, event)

        void (async () => {
            try {
                await fetch(emit)
            } catch (error) {
                this.writeStreamError(error, request, emit)
            } finally {
                stream.end()
            }
        })()

        return reply.code(200).header('Cache-Control', 'no-cache').header('Connection', 'keep-alive').type('text/event-stream').send(stream)
    }

    private writeStreamError(error: unknown, request: FastifyRequest, emit: (event: SourceStreamEvent) => void) {
        if (error instanceof OMSSError) {
            emit({ type: 'error', data: error.toJSON() as Record<string, unknown> })
            return
        }

        emit({
            type: 'error',
            data: {
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'An unexpected error occurred',
                },
                traceId: request.id,
            },
        })
    }
}
