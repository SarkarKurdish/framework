// there are two ways to test your provider.
// either do:
// npx @omss/framework/debug [path-to-provider]
// or
// you can create a file like below
// provider.debug.ts

import { ExampleProvider } from './my-provider'
import { runProviderDebugger } from '../../src/debugging'
import type { ProviderDebugOptions } from '../../src/debugging'

const provider = new ExampleProvider()

// All of this is optional — omit what you don't need to override
const options: ProviderDebugOptions = {
  movie: {
    type: 'movie',
    tmdbId: '155',
    title: 'The Dark Knight',
    releaseYear: '2008',
    imdbId: 'tt0468569',
  },
  tv: {
    type: 'tv',
    tmdbId: '1399',
    title: 'Game of Thrones',
    releaseYear: '2011',
    imdbId: 'tt0944947',
    s: 1,
    e: 1,
  },
  // only: ['movie'],  // uncomment to skip TV
}

await runProviderDebugger(provider, options)