import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './server'

// Establish API mocking before all tests. `error` surfaces any request that
// is not handled by a registered MSW handler so missing mocks fail loudly.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

// Reset request handlers and the DOM between tests so they stay isolated.
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// Clean up once the suite is done.
afterAll(() => {
  server.close()
})
