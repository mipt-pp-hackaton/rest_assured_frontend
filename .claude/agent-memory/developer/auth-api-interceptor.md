---
name: auth-api-interceptor
description: Conventions for src/api/authApi.ts and src/api/authInterceptor.ts (auth endpoints + 401 refresh wrapper)
metadata:
  type: project
---

Two auth modules sit on top of `request<T>` (see [[httpclient-conventions]]).

**`src/api/authApi.ts`** — bare endpoint wrappers: `login`, `register`, `refresh`, `me`.
- `request<T>` returns `T | undefined`, but these wrappers promise a concrete `T`, so they cast: `(await request<T>(...)) as T`.
- `login(username, password)` posts a `URLSearchParams` body (urlencoded) — never JSON-stringify it; fetch sets the urlencoded header and httpClient leaves it alone.
- `register`/`refresh` post `JSON.stringify(...)`; httpClient auto-adds `application/json`.

**`src/api/authInterceptor.ts`** — `authedRequest<T>(path, options?)`:
- Attaches `Authorization: Bearer <access>` from `tokenStorage` only when the token is truthy (treat `''`/`null` as absent).
- On `ApiError` with `status === 401` AND a truthy refresh token: refresh, `tokenStorage.setTokens(...)`, retry the original request ONCE with the new token.
- **Single-flight:** a module-level `pendingRefresh: Promise<TokenPair> | null` coalesces concurrent 401s into one `/api/auth/refresh` call; reset to `null` in `.finally()` so the next 401 refreshes again.
- On refresh failure: `tokenStorage.clear()` then rethrow the ORIGINAL 401 ApiError (not the refresh error). No retry.
- No refresh token: rethrow the 401 without calling refresh.
