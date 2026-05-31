---
name: test-env-base-url
description: VITE_API_BASE_URL for the test run must be an absolute http URL set in vite.config test.env, not only .env.test
metadata:
  type: project
---

The API client reads `import.meta.env.VITE_API_BASE_URL` (see [[api-layer]] / [[httpclient-conventions]]) and several tests build their expected URLs from the SAME env var (e.g. `src/api/httpClient.test.ts` does `const BASE = import.meta.env.VITE_API_BASE_URL`). So a code-side fallback to `''` is NOT enough — `httpClient.test.ts` also asserts `seenUrl` matches `/^https?:\/\//`. The env var must be DEFINED as an absolute http(s) URL for tests (`http://api.test`).

It is set in `vite.config.ts` under `test.env.VITE_API_BASE_URL`, committed so the contract is reproducible on a fresh clone / CI.

**Why:** A `.env.test` file also exists locally with the same value, but `.gitignore` ignores `.env.*` (keeping only `.env.example`). Relying solely on `.env.test` means the base URL is undefined on any fresh checkout, so `${VITE_API_BASE_URL}${path}` becomes `/undefined/...` and the URL-asserting tests fail (httpClient, metricsApi getSummary/getServiceMetrics/getTimeseries, DashboardPage, ServiceDetailPage — 6 tests).

**How to apply:** Keep `VITE_API_BASE_URL` defined for tests via `vite.config.ts` `test.env`. Do not move it into a gitignored env file only. If you add API modules whose tests assert on full URLs, expect `http://api.test` as the base. A local `.env.test`, if present, still overrides `test.env`, but the committed value is the durable source of truth.
