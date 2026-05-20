import type { ProviderMediaObject } from '../core/types/index.js'

export interface ProviderDebugOptions {
    /** Override the default movie media object */
    movie?: ProviderMediaObject
    /** Override the default TV media object */
    tv?: ProviderMediaObject
    /** Only run specific content types. Defaults to all supported by the provider. */
    only?: Array<'movie' | 'tv'>
}
