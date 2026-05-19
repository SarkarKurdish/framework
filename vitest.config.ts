import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/core/types/**', 'src/**/*.d.ts', 'src/core/server.ts', 'src/controllers/mcp.controller.ts', 'src/controllers/stremio.controller.ts'],
    },
  },
  resolve: {
    alias: [
      {
        find: /^(\.{1,2}\/.+)\.js$/,
        replacement: '$1',
      },
    ],
  },
})
