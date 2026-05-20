import type { ProviderMediaObject } from '../core/types/index.js'

export const defaultMovieMedia: ProviderMediaObject = {
    type: 'movie',
    tmdbId: '155',
    title: 'The Dark Knight',
    releaseYear: '2008',
    imdbId: 'tt0468569',
}

export const defaultTVMedia: ProviderMediaObject = {
    type: 'tv',
    tmdbId: '1399',
    title: 'Game of Thrones',
    releaseYear: '2011',
    imdbId: 'tt0944947',
    s: 1,
    e: 1,
}
