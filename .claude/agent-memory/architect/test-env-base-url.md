---
name: test-env-base-url
description: VITE_API_BASE_URL for tests must be a committed absolute http URL in vite.config test.env, not only the gitignored .env.test
metadata:
  type: project
---

The test base URL `VITE_API_BASE_URL` is the single source of truth for both the API client (`src/api/httpClient.ts` builds `${import.meta.env.VITE_API_BASE_URL}${path}`) and the URL-asserting tests (`src/api/httpClient.test.ts` reads the SAME env var to build expected URLs and also asserts `seenUrl` matches `/^https?:\/\//`). See [[api-schema-patterns]] and [[request-undefined-cast]] for the surrounding API-layer conventions.

It is committed in `vite.config.ts` under `test.env.VITE_API_BASE_URL = 'http://api.test'`, scoped to the `test:` block only. Production/dev builds use a separate channel: Dockerfile `ARG/ENV VITE_API_BASE_URL` fed from `FRONTEND_API_BASE_URL` in docker-compose; the `test.env` value does not leak into builds.

**Why:** `.gitignore` ignores `.env.*` (keeping only `.env.example`), so relying solely on a local `.env.test` left the var undefined on fresh clones / CI, producing `/undefined/...` URLs and 6 failing tests (httpClient, metricsApi x3, DashboardPage, ServiceDetailPage). A code-side `''` fallback is insufficient because the test asserts an absolute http(s) URL.

**How to apply:** Keep the test base URL defined in `vite.config.ts` `test.env`, not in a gitignored env file alone. A local `.env.test` (same value) still overrides it but is not the durable contract. New API modules whose tests assert full URLs should expect `http://api.test` as the base. Do not duplicate this literal into source — read it from the env var.
