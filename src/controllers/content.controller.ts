import { FastifyRequest, FastifyReply } from 'fastify'
import { SourceService } from '../services/source.service.js'
import { OMSSError } from '../core/errors.js'
import { SourceStreamEvent } from '../core/types/index.js'
import { acceptsEventStream, beginSSE, endSSE, writeSSEEvent } from '../utils/sse.js'

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
            return this.streamMovie(id, request, reply)
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
            return this.streamTVEpisode(id, season, episode, request, reply)
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

    private async streamMovie(tmdbId: string, request: FastifyRequest, reply: FastifyReply) {
        beginSSE(reply)

        const emit = (event: SourceStreamEvent) => writeSSEEvent(reply, event)

        try {
            await this.sourceService.getMovieSources(tmdbId, emit)
        } catch (error) {
            this.writeStreamError(error, request, emit)
        } finally {
            endSSE(reply)
        }
    }

    private async streamTVEpisode(tmdbId: string, season: number, episode: number, request: FastifyRequest, reply: FastifyReply) {
        beginSSE(reply)

        const emit = (event: SourceStreamEvent) => writeSSEEvent(reply, event)

        try {
            await this.sourceService.getTVSources(tmdbId, season, episode, emit)
        } catch (error) {
            this.writeStreamError(error, request, emit)
        } finally {
            endSSE(reply)
        }
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
