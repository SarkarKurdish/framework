import type { BaseProvider } from '../providers/base-provider.js'
import type { ProviderMediaObject, ProviderResult } from '../core/types/index.js'
import type { ProviderDebugOptions } from './types.js'
import { defaultMovieMedia, defaultTVMedia } from './defaults.js'

const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    gray: '\x1b[90m',
    white: '\x1b[97m',
    bgGreen: '\x1b[42m',
    bgRed: '\x1b[41m',
    bgYellow: '\x1b[43m',
}

function box(title: string, color: string = c.cyan): void {
    const line = '─'.repeat(60)
    console.log(`\n${color}${c.bold}┌${line}┐${c.reset}`)
    console.log(`${color}${c.bold}│  ${title.padEnd(58)}│${c.reset}`)
    console.log(`${color}${c.bold}└${line}┘${c.reset}\n`)
}

function section(label: string): void {
    console.log(`${c.gray}${'─'.repeat(40)}${c.reset}`)
    console.log(`${c.bold}${c.white}  ${label}${c.reset}`)
    console.log(`${c.gray}${'─'.repeat(40)}${c.reset}`)
}

function badge(text: string, ok: boolean): string {
    const bg = ok ? c.bgGreen : c.bgRed
    return `${bg}${c.bold} ${text} ${c.reset}`
}

function renderResult(result: ProviderResult, media: ProviderMediaObject): void {
    const { sources, subtitles, diagnostics } = result

    section(`Sources  ${badge(String(sources.length), sources.length > 0)}`)
    if (sources.length === 0) {
        console.log(`  ${c.yellow}⚠  No sources returned${c.reset}`)
    } else {
        sources.forEach((src, i) => {
            console.log(`\n  ${c.cyan}${c.bold}[${i + 1}]${c.reset} ${c.white}${src.url}${c.reset}`)
            console.log(`      ${c.gray}type${c.reset}     ${c.green}${src.type}${c.reset}`)
            console.log(`      ${c.gray}quality${c.reset}  ${c.green}${src.quality}${c.reset}`)
            console.log(`      ${c.gray}provider${c.reset} ${src.provider.name} (${c.dim}${src.provider.id}${c.reset})`)
            if (src.audioTracks?.length) {
                const tracks = src.audioTracks.map((t) => `${t.label} [${t.language}]`).join(', ')
                console.log(`      ${c.gray}audio${c.reset}    ${tracks}`)
            }
        })
    }

    console.log()
    section(`Subtitles  ${badge(String(subtitles.length), true)}`)
    if (subtitles.length === 0) {
        console.log(`  ${c.dim}none${c.reset}`)
    } else {
        subtitles.forEach((sub, i) => {
            console.log(`  ${c.cyan}[${i + 1}]${c.reset} ${sub.label} ${c.dim}(${sub.format})${c.reset}`)
            console.log(`       ${c.gray}${sub.url}${c.reset}`)
        })
    }

    if (diagnostics.length > 0) {
        console.log()
        section('Diagnostics')
        diagnostics.forEach((d) => {
            const icon = d.severity === 'error' ? c.red + '✖' : d.severity === 'warning' ? c.yellow + '⚠' : c.cyan + 'ℹ'
            console.log(`  ${icon}${c.reset} ${c.bold}[${d.code}]${c.reset} ${d.message}${d.field ? ` ${c.dim}(${d.field})${c.reset}` : ''}`)
        })
    }

    console.log()
}

async function runOne(provider: BaseProvider, media: ProviderMediaObject, label: string): Promise<void> {
    box(`${provider.name}  ›  ${label}  ›  ${media.title} (${media.tmdbId})`)

    console.log(`${c.gray}  type:   ${c.reset}${media.type}`)
    if (media.type === 'tv') {
        console.log(`${c.gray}  season: ${c.reset}${media.s}   ${c.gray}episode: ${c.reset}${media.e}`)
    }
    console.log(`${c.gray}  imdbId: ${c.reset}${media.imdbId}`)
    console.log(`${c.gray}  year:   ${c.reset}${media.releaseYear}`)
    console.log()

    const t0 = performance.now()
    let result: ProviderResult

    try {
        console.log("PROVIDER IS RUNNING NOW. LOGGING BELOW:")
        result = media.type === 'movie' ? await provider.getMovieSources(media) : await provider.getTVSources(media)
    } catch (err: any) {
        console.log(`${c.red}${c.bold}  ✖ Provider threw an unhandled exception:${c.reset}`)
        console.error(err)
        return
    } finally {
        console.log("PROVIDER FINISHED. LOGGING DONE\n")
    }

    const elapsed = (performance.now() - t0).toFixed(0)
    console.log(`${c.gray}  ⏱  ${elapsed}ms${c.reset}\n`)

    renderResult(result, media)
}

/**
 * Run the provider debugger for one provider instance.
 * Automatically detects supported content types from provider.capabilities
 * and runs only those, unless `options.only` restricts further.
 */
export async function runProviderDebugger(provider: BaseProvider, options: ProviderDebugOptions = {}): Promise<void> {
    const supported = provider.capabilities.supportedContentTypes
    const only = options.only ?? ['movie', 'tv']

    const shouldRunMovie = only.includes('movie') && supported.includes('movies')
    const shouldRunTV = only.includes('tv') && supported.includes('tv')

    console.clear()
    console.log(`\n${c.magenta}${c.bold}  OMSS Provider Debugger${c.reset}`)
    console.log(`${c.gray}  Provider: ${c.reset}${c.bold}${provider.name}${c.reset} ${c.gray}(${provider.id})${c.reset}`)
    console.log(`${c.gray}  Enabled:  ${c.reset}${provider.enabled ? c.green + 'yes' : c.red + 'no'}${c.reset}`)
    console.log(`${c.gray}  Supports: ${c.reset}${supported.join(', ')}`)
    console.log()

    if (!shouldRunMovie && !shouldRunTV) {
        console.log(`${c.yellow}  Nothing to run. Check your provider's supportedContentTypes and options.only.${c.reset}\n`)
        return
    }

    if (shouldRunMovie) {
        const media = options.movie ?? defaultMovieMedia
        await runOne(provider, media, 'movie')
    }

    if (shouldRunTV) {
        const media = options.tv ?? defaultTVMedia
        await runOne(provider, media, 'tv')
    }

    console.log(`${c.green}${c.bold}  ✔ Debugger finished. Note that you should also test the proxy links. To do that, you have to run the OMSS Server.${c.reset}\n`)
}
