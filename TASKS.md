# TASKS — Rest Assured Frontend

Stack confirmed from `package.json`: React 19 + TypeScript + Vite (rolldown-vite) with React Compiler and the new flat ESLint config. No test runner, router, state, or HTTP layer present yet — these are introduced below.

Conventions:
- `[CODE]` = testable application logic (components, hooks, API client, stores, utils, routing).
- `[INFRA]` = container/build/CI/tooling/env (no behavioral tests; smoke criteria only).
- Backend base URL is read from `import.meta.env.VITE_API_BASE_URL`.
- All `[CODE]` tests run under the test runner added in T2 (Vitest + Testing Library + MSW).

---

## Tooling & Infrastructure foundation

- [ ] T1 [INFRA] Add core runtime dependencies and align `package.json`
  - Add `react-router-dom`, `@tanstack/react-query`, `zod`, a charting lib (`recharts`).
  - Add scripts: `test`, `test:watch`, `typecheck`.
  - Acceptance (smoke): `npm install` succeeds; `npm run typecheck` (`tsc -b --noEmit`) exits 0; `npm run lint` exits 0; new deps present in `package.json` + lockfile.

- [ ] T2 [INFRA] Set up the test harness (Vitest + jsdom + Testing Library + MSW) (deps: T1)
  - Add `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `msw`.
  - Files: `vitest.config.ts` (or merge into `vite.config.ts`), `src/test/setup.ts` (jest-dom matchers, MSW server lifecycle), `src/test/server.ts` (MSW server export), `src/test/test-utils.tsx` (render wrapper with QueryClient + MemoryRouter).
  - Acceptance (smoke): a trivial sample test runs green via `npm test`; MSW intercepts a fetch in that sample test; `vitest` runs headless and exits 0.

- [ ] T3 [INFRA] Environment variable handling (deps: T1)
  - Files: `.env.example` (`VITE_API_BASE_URL`), `src/env.d.ts` (typed `ImportMetaEnv`).
  - Acceptance (smoke): `npm run typecheck` resolves `import.meta.env.VITE_API_BASE_URL` with no `any`; `.env.example` documents all `VITE_` vars.

---

## Domain types & API client core (foundational [CODE])

- [ ] T4 [CODE] Define API domain types & Zod schemas from the OpenAPI spec (deps: T2)
  - Files: `src/api/types.ts`, `src/api/schemas.ts`.
  - Model: `TokenPair`, `UserCreate`, `UserRead`, `RefreshRequest`, `ServiceCreate`, `ServiceUpdate`, `ServiceRead`, `ServiceSummaryItem`, `ServiceMetricsResponse`, `TimeseriesBucket`, `IncidentRead`, `HTTPValidationError`, `HttpMethod` enum (`GET|POST|HEAD|PUT|DELETE|PATCH|OPTIONS`).
  - TDD acceptance:
    - GIVEN a valid `ServiceRead` JSON object WHEN parsed by the schema THEN it succeeds and types are inferred (nullable `expected_status` allowed).
    - GIVEN a `ServiceCreate` missing required `url`/`name` WHEN parsed THEN it fails with an issue on the missing field.
    - GIVEN `UserCreate` with password length < 8 or > 72 THEN parse fails; length 8–72 passes.
    - GIVEN `http_method` not in the enum THEN parse fails.

- [ ] T5 [CODE] HTTP client with base URL, JSON handling, and typed error mapping (deps: T4)
  - Files: `src/api/httpClient.ts` (low-level `request()` wrapper over `fetch`), `src/api/errors.ts` (`ApiError` with status + parsed `HTTPValidationError` detail).
  - TDD acceptance (MSW-backed):
    - GIVEN a 200 JSON response THEN `request()` resolves with the parsed body.
    - GIVEN a 422 with `HTTPValidationError` body THEN it rejects with `ApiError` exposing `status===422` and field-level `detail`.
    - GIVEN a 204 No Content THEN it resolves with `undefined` and does not attempt JSON parse.
    - GIVEN a 500/network failure THEN it rejects with `ApiError` carrying the status (or a network flag).
    - Requests target `${VITE_API_BASE_URL}` + path.

- [ ] T6 [CODE] Token storage abstraction (deps: T2)
  - Files: `src/auth/tokenStorage.ts` (get/set/clear access+refresh; `localStorage`-backed with in-memory fallback).
  - TDD acceptance:
    - GIVEN tokens set THEN `getAccessToken`/`getRefreshToken` return them; persisted across new instances reading the same store.
    - GIVEN `clear()` THEN both tokens return `null`.
    - GIVEN no tokens stored THEN getters return `null` (no throw).

- [ ] T7 [CODE] Auth interceptor: attach Bearer + refresh-on-401 with single-flight (deps: T5, T6)
  - Files: `src/api/authInterceptor.ts` (wraps `httpClient.request`), `src/api/authApi.ts` (`login`, `register`, `refresh`, `me`).
  - TDD acceptance (MSW-backed):
    - GIVEN an access token THEN outgoing requests carry `Authorization: Bearer <token>`.
    - `login()` POSTs `application/x-www-form-urlencoded` with `username`/`password` to `/api/auth/login` and returns `TokenPair`.
    - `register()` POSTs JSON `UserCreate` to `/api/auth/register` and returns `UserRead`.
    - GIVEN a 401 on a protected call AND a valid refresh token THEN the interceptor calls `/api/auth/refresh`, stores the new `TokenPair`, and retries the original request once.
    - GIVEN concurrent 401s THEN only ONE refresh call is made (single-flight) and all queued requests retry with the new token.
    - GIVEN refresh itself fails (401) THEN tokens are cleared and the original error propagates.

---

## Service-specific API modules ([CODE])

- [ ] T8 [CODE] Services API module (deps: T7)
  - Files: `src/api/servicesApi.ts` (`listServices`, `getService`, `createService`, `updateService`, `deleteService`).
  - TDD acceptance (MSW-backed):
    - `listServices()` GETs `/api/services/` → `ServiceRead[]`.
    - `createService(body)` POSTs `/api/services/` → 201 `ServiceRead`; `getService(id)` GETs `/api/services/{id}`.
    - `updateService(id, patch)` PATCHes `/api/services/{id}` sending only provided fields.
    - `deleteService(id)` DELETEs `/api/services/{id}` and resolves on 204.

- [ ] T9 [CODE] Metrics API module (deps: T7)
  - Files: `src/api/metricsApi.ts` (`getSummary`, `getServiceMetrics`, `getTimeseries`).
  - TDD acceptance (MSW-backed):
    - `getSummary()` GETs `/api/services/summary` → `ServiceSummaryItem[]`.
    - `getServiceMetrics(id)` GETs `/api/services/{id}/metrics` → `ServiceMetricsResponse`.
    - `getTimeseries(id, {from, to, bucketSeconds})` GETs `/api/services/{id}/timeseries` with `from`/`to` as ISO date-time and `bucket_seconds` query param; defaults `bucket_seconds=60` when omitted.

- [ ] T10 [CODE] Incidents API module (deps: T7)
  - Files: `src/api/incidentsApi.ts` (`listIncidents`).
  - TDD acceptance (MSW-backed):
    - `listIncidents()` GETs `/api/incidents` → `IncidentRead[]`.
    - GIVEN filters `{serviceId, open, slaBreach, limit}` THEN only provided params are appended to the query string with correct names (`service_id`, `open`, `sla_breach`, `limit`).
    - `limit` defaults to 100 and is clamped/validated to 1–500.

---

## Auth state, routing, formatting utilities ([CODE])

- [ ] T11 [CODE] Auth context/store and `useAuth` hook (deps: T7)
  - Files: `src/auth/AuthContext.tsx`, `src/auth/useAuth.ts`.
  - TDD acceptance:
    - On mount with a stored access token THEN it fetches `/api/auth/me` and exposes `user` + `status: 'authenticated'`.
    - `login(username, password)` stores tokens, loads the user, sets `authenticated`.
    - `logout()` clears tokens and resets to `unauthenticated`.
    - GIVEN no token THEN status is `unauthenticated` and `user` is `null` (no `/me` call).

- [ ] T12 [CODE] Formatting & domain utilities (deps: T2)
  - Files: `src/utils/format.ts` (`formatUptime(seconds)`, `formatSlaPct(n)`, `formatDateTime(iso)`, `formatLatency(ms|null)`, `incidentStatus(incident)`).
  - TDD acceptance:
    - `formatUptime(3661)` → `"1h 1m 1s"`; `0` → `"0s"`.
    - `formatSlaPct(99.954)` → `"99.95%"` (2-dp, no rounding surprises documented).
    - `formatLatency(null)` → `"—"`; `formatLatency(12.3)` → `"12.3 ms"`.
    - `incidentStatus({closed_at:null})` → `"open"`; non-null → `"resolved"`.
    - `formatDateTime` returns a stable, locale-independent string for a fixed ISO input.

- [ ] T13 [CODE] App router with route table and lazy pages (deps: T1)
  - Files: `src/router.tsx`, `src/App.tsx` (wire `RouterProvider`, `QueryClientProvider`, `AuthProvider`).
  - TDD acceptance:
    - Navigating to `/login` renders the login page; `/register` renders register.
    - `/`, `/services`, `/services/:id`, `/incidents` resolve to their respective pages.
    - Unknown path renders a NotFound view.

- [ ] T14 [CODE] `ProtectedRoute` guard (deps: T11, T13)
  - Files: `src/auth/ProtectedRoute.tsx`.
  - TDD acceptance:
    - GIVEN unauthenticated THEN visiting a protected route redirects to `/login`.
    - GIVEN authenticated THEN the protected child renders.
    - GIVEN auth status `loading` THEN a loading indicator renders (no premature redirect).

---

## Pages & feature components ([CODE])

- [ ] T15 [CODE] Login page + form (deps: T11, T13)
  - Files: `src/pages/LoginPage.tsx`, `src/features/auth/LoginForm.tsx`.
  - TDD acceptance:
    - Submitting valid credentials calls `auth.login` and navigates to `/`.
    - Empty username/password shows inline validation; submit is blocked.
    - GIVEN a 401 from login THEN an error message ("Invalid credentials") is shown and no navigation occurs.

- [ ] T16 [CODE] Register page + form (deps: T7, T13)
  - Files: `src/pages/RegisterPage.tsx`, `src/features/auth/RegisterForm.tsx`.
  - TDD acceptance:
    - Email format validated client-side; password enforced 8–72 chars before submit.
    - Successful register shows a success state / redirects to `/login`.
    - GIVEN a 422 (e.g., duplicate email) THEN field/global error from `HTTPValidationError.detail` is displayed.

- [ ] T17 [CODE] App layout/shell with nav + logout (deps: T11, T13)
  - Files: `src/components/AppLayout.tsx`, `src/components/NavBar.tsx`.
  - TDD acceptance:
    - Renders nav links to Dashboard / Services / Incidents and the current user email.
    - Clicking Logout calls `auth.logout` and redirects to `/login`.

- [ ] T18 [CODE] Dashboard page (services summary) (deps: T9, T14, T17)
  - Files: `src/pages/DashboardPage.tsx`, `src/features/dashboard/SummaryCard.tsx`.
  - TDD acceptance (MSW-backed):
    - Fetches `/api/services/summary` and renders one card per `ServiceSummaryItem` with name, SLA %, uptime, and up/down status from `last_check_is_up`.
    - GIVEN an empty array THEN an empty-state message renders.
    - GIVEN the request errors THEN an error state with a retry affordance renders.
    - Loading state renders skeletons/spinner before data resolves.

- [ ] T19 [CODE] Services list page with delete (deps: T8, T14, T17)
  - Files: `src/pages/ServicesPage.tsx`, `src/features/services/ServiceTable.tsx`.
  - TDD acceptance (MSW-backed):
    - Renders a row per `ServiceRead` (name, url, http_method, interval, active flag).
    - Delete triggers confirmation; on confirm calls `deleteService(id)` and the row is removed (query invalidated/refetched).
    - Empty + error + loading states render appropriately.

- [ ] T20 [CODE] Service create/edit form (deps: T8, T19)
  - Files: `src/features/services/ServiceForm.tsx`, `src/pages/ServiceCreatePage.tsx`, `src/pages/ServiceEditPage.tsx`.
  - TDD acceptance (MSW-backed):
    - Required `url` and `name` enforced; `http_method` select limited to the enum; `interval_ms` defaults to 60000; `expected_status` optional/nullable.
    - Create submits `ServiceCreate` then navigates to the list/detail.
    - Edit pre-populates from `getService(id)` and PATCHes only changed fields.
    - GIVEN a 422 THEN field errors from `detail` map to the right inputs.

- [ ] T21 [CODE] Service detail page: metrics + timeseries chart (deps: T9, T14, T17, T12)
  - Files: `src/pages/ServiceDetailPage.tsx`, `src/features/services/MetricsPanel.tsx`, `src/features/services/TimeseriesChart.tsx`.
  - TDD acceptance (MSW-backed):
    - Fetches `/api/services/{id}/metrics` and renders `current_uptime_seconds` (via `formatUptime`) and `sla_pct` (via `formatSlaPct`).
    - Fetches `/api/services/{id}/timeseries` for the selected range and renders chart series for `up_ratio` and `latency_p95_ms`; null latencies are gap-handled, not rendered as 0.
    - Range/bucket selector changes refetch with updated `from`/`to`/`bucket_seconds`.
    - Empty/error/loading states render.

- [ ] T22 [CODE] Incidents page with filters (deps: T10, T14, T17, T12)
  - Files: `src/pages/IncidentsPage.tsx`, `src/features/incidents/IncidentFilters.tsx`, `src/features/incidents/IncidentTable.tsx`.
  - TDD acceptance (MSW-backed):
    - Renders a row per `IncidentRead` with service name, opened/closed times, status (`open`/`resolved`), SLA-breach badge, duration.
    - Toggling `open` / `sla_breach` filters and setting `service_id`/`limit` refetch with the matching query params.
    - Empty/error/loading states render.

---

## Deployment & CI ([INFRA])

- [ ] T23 [INFRA] Multi-stage Dockerfile (build with Node 20-alpine, serve via nginx, non-root) (deps: T1)
  - Files: `Dockerfile`, `.dockerignore`.
  - Acceptance (smoke): `docker build .` produces an image that serves the built SPA on port 80; `hadolint Dockerfile` passes; final stage runs as a non-root user.

- [ ] T24 [INFRA] nginx config for SPA history fallback + API reverse proxy (deps: T23)
  - Files: `nginx/default.conf`.
  - Acceptance (smoke): `nginx -t -c` validates the config; deep links (e.g., `/services/1`) fall back to `index.html`; `/api/` proxies to the backend upstream (`ghcr.io/mipt-pp-hackaton/rest_assured:latest`).

- [ ] T25 [INFRA] docker-compose for frontend + backend image (deps: T24, T3)
  - Files: `docker-compose.yml`.
  - Acceptance (smoke): `docker compose config` is valid; frontend service builds from the Dockerfile, backend uses `ghcr.io/mipt-pp-hackaton/rest_assured:latest`, and `VITE_API_BASE_URL`/proxy wiring is consistent with T24.

- [ ] T26 [INFRA] CI workflow: install, lint, typecheck, test, build (deps: T2)
  - Files: `.github/workflows/ci.yml`.
  - Acceptance (smoke): workflow lints clean (`actionlint`); on PR it runs `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; fails if any step fails.

- [ ] T27 [INFRA] CI workflow: build & push Docker image (deps: T23, T26)
  - Files: `.github/workflows/docker-publish.yml`.
  - Acceptance (smoke): `actionlint` passes; on push to `main` it builds the image and pushes to GHCR using repo credentials; no-op on PRs from forks.

---

## Execution waves (dependency DAG)

- Wave 1 (parallel): T1
- Wave 2 (parallel): T2, T3, T23 (after T1)
- Wave 3 (parallel): T4, T6, T12, T13, T26 (after T2); T24 (after T23)
- Wave 4 (parallel): T5 (after T4); T25 (after T24, T3); T27 (after T23, T26)
- Wave 5 (parallel): T7 (after T5, T6)
- Wave 6 (parallel): T8, T9, T10, T11 (after T7)
- Wave 7 (parallel): T14 (after T11, T13); T15, T16, T17 (auth/shell pages)
- Wave 8 (parallel): T18, T19, T22 (after their API + guard + shell deps)
- Wave 9 (parallel): T20 (after T19), T21 (after T9, T14, T17, T12)
