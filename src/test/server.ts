import { setupServer } from 'msw/node'
import type { RequestHandler } from 'msw'

// Default request handlers. Start empty — individual tests can register
// per-test handlers via `server.use(...)`.
export const handlers: RequestHandler[] = []

// The MSW server instance shared across the test suite. Its lifecycle
// (listen / resetHandlers / close) is managed in `src/test/setup.ts`.
export const server = setupServer(...handlers)
