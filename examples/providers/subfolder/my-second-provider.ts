import { BaseProvider } from '../../../src/' // replace this in your own implementation with '@omss/framework'
import type { ProviderCapabilities, ProviderMediaObject, ProviderResult } from '../../../src/' // replace this in your own implementation with '@omss/framework'

export class ExampleProvider extends BaseProvider {
    readonly id = 'example-provider-2'
    readonly name = 'Second Provider'
    readonly enabled = true
    readonly BASE_URL = 'https://example.com'
    readonly HEADERS = {
        Referer: 'https://example.com',
        'User-Agent': 'Mozilla/5.0',
    }

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv'],
    }

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            // Your implementation here
            return {
                sources: [
                    {
                        url: "http://localhost:3000/v1/proxy?data=%7B%22url%22%3A%22https%3A%2F%2Fstrategicgrowthpartners.site%2F8Ybx0oYj1%2Fpl%2FH4sIAAAAAAAAAwXB25KCIAAA0F8Cykb3UUVNw0bjIrwlWK7iZTYnL1._57yA4yDUQAdq4DnGPRnPRchA96UvwL2YHxW_UUNVIIctJ0c.k44vhYCz7L0_httJRBg03F4Z3gLSM5RDPxTWrsXuBU3iQ44_qzlUprs35OD6JVwF9RA9FU_vis8HH_KBVyZ59iqTsJ0aa4eGtp0craRVv2aQnOvQsnukFspLyfG2GVA.BE9VHadYoy0Xw7IyOI8GOMs9thmJza2oMFR4.c1gGzLAdxPlDx23q4HTLkKfMjF_JdAHTfpDQiMzdD5pMZ2NaAN18FvZO11d.QuJ30dhi53gUur.s6nRbvVoTxTNKaPA.wdLCo5FQQEAAA--%2Fmaster.m3u8%22%2C%22headers%22%3A%7B%22User-Agent%22%3A%22%22%2C%22Referer%22%3A%22https%3A%2F%2Fbrightpathsignals.com%2F%22%2C%22Origin%22%3A%22https%3A%2F%2Fbrightpathsignals.com%22%2C%22Accept%22%3A%22*%2F*%22%7D%7D", //this.createProxyUrl('https://example.com/movie/' + media.tmdbId),
                        type: 'hls',
                        quality: '4K',
                        audioTracks: [{ language: 'en', label: 'English SDH' }],
                        provider: {
                            id: this.id,
                            name: this.name,
                        },
                    },
                ],
                subtitles: [],
                diagnostics: [],
            }
        } catch (error) {
            return {
                sources: [],
                subtitles: [],
                diagnostics: [
                    {
                        code: 'PROVIDER_ERROR',
                        message: `${this.name} failed`,
                        field: '',
                        severity: 'error',
                    },
                ],
            }
        }
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        // Your implementation here

        return {
            sources: [],
            subtitles: [],
            diagnostics: [],
        }
    }
}
