#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { runProviderDebugger } from './debugger.js'
import type { BaseProvider } from '../providers/base-provider.js'
import type { ProviderDebugOptions } from './types.js'

const RED = '\x1b[31m'
const GRAY = '\x1b[90m'
const RESET = '\x1b[0m'

async function main(): Promise<void> {
  const arg = process.argv[2]

  if (!arg) {
    console.error(`${RED}Usage: npx @omss/framework/test <path-to-provider>${RESET}`)
    console.error(`${GRAY}  Example: npx @omss/framework/test ./src/providers/my-provider.ts${RESET}`)
    process.exit(1)
  }

  // Resolve absolute path → file URL (required for ESM dynamic import)
  const absPath = resolve(process.cwd(), arg)
  const fileUrl = pathToFileURL(absPath).href

  let mod: Record<string, unknown>
  try {
    mod = await import(fileUrl)
  } catch (err: any) {
    console.error(`${RED}Failed to import provider from: ${absPath}${RESET}`)
    console.error(err?.message ?? err)
    process.exit(1)
  }

  // Find the first class that looks like a BaseProvider (has getMovieSources)
  let ProviderClass: (new () => BaseProvider) | undefined
  let optionsExport: ProviderDebugOptions | undefined

  for (const key of Object.keys(mod)) {
    const val = mod[key]
    if (typeof val === 'function' && val.prototype?.getMovieSources) {
      ProviderClass ??= val as new () => BaseProvider
    }
    // Consumer can export `debugOptions` to customise media objects
    if (key === 'debugOptions' && typeof val === 'object' && val !== null) {
      optionsExport = val as ProviderDebugOptions
    }
  }

  if (!ProviderClass) {
    console.error(`${RED}No BaseProvider subclass found in: ${absPath}${RESET}`)
    console.error(`${GRAY}Make sure you export a class that extends BaseProvider.${RESET}`)
    process.exit(1)
  }

  const provider = new ProviderClass()
  await runProviderDebugger(provider, optionsExport ?? {})
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})