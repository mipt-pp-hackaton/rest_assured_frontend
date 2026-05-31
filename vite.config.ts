/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Absolute http base URL for the API client under test. Committed here (not
    // only in the gitignored `.env.test`) so the test contract is reproducible
    // on a fresh clone / CI. The httpClient and the test helpers both read
    // `import.meta.env.VITE_API_BASE_URL`, so any absolute http(s) URL works as
    // long as they agree; a local `.env.test`, if present, still overrides it.
    env: {
      VITE_API_BASE_URL: 'http://api.test',
    },
  },
})
