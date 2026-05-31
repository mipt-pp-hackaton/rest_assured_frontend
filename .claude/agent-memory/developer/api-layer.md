---
name: api-layer
description: Conventions for the src/api layer (types, errors, httpClient) and how it is tested
metadata:
  type: project
---

The `src/api/` layer in rest_assured_frontend follows these conventions.

**Why:** Keeps the API client consistent and the test harness (vitest + msw) working uniformly.

**How to apply:**
- Domain types live in `src/api/types.ts` as `z.infer<typeof XxxSchema>` from `src/api/schemas.ts` (Zod). Type-only module, emits nothing at runtime. Use `ValidationError` / `HTTPValidationError` for FastAPI-style 422 bodies (`{ detail: ValidationError[] }`).
- `ApiError` (src/api/errors.ts) extends `Error`; must call `Object.setPrototypeOf(this, ApiError.prototype)` so `instanceof` survives transpile. Fields: `status` (default 0), `detail?: ValidationError[]`, `isNetworkError` (default false). Constructor `(message, opts?)`.
- `request<T>(path, options?)` in src/api/httpClient.ts targets `${import.meta.env.VITE_API_BASE_URL}${path}`. Sets `Content-Type: application/json` only when a body is present AND caller has not set it (login uses urlencoded). 204 -> undefined without reading body; non-2xx -> throw ApiError (parse 422 detail); fetch throw -> ApiError isNetworkError.
- Tests use MSW: `server` from `src/test/server.ts`, register per-test handlers with `server.use(http.get(url, ...))`. Base URL comes from `.env.test` (`VITE_API_BASE_URL=http://api.test`). Lifecycle managed in `src/test/setup.ts`.
- Commands: `npm test` (vitest run), `npm run lint` (eslint), `npm run typecheck` (tsc -b --noEmit).
