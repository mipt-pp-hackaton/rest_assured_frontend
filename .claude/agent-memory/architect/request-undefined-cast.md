---
name: request-undefined-cast
description: httpClient request<T> returns T|undefined (empty/204/non-JSON 2xx -> undefined). The API layer casts the result `as T`, which launders undefined past the type system.
metadata:
  type: project
---

`request<T>(path, opts)` in `src/api/httpClient.ts` returns `Promise<T | undefined>` — it resolves to `undefined` on 204/205, empty body, or unparseable 2xx body.

**Established pattern (as observed, with a caveat):**
- Wrappers in `src/api/authApi.ts` (login/register/refresh/me) cast `(await request<X>(...)) as X` to present a non-optional return type to callers.
- `src/api/authInterceptor.ts#authedRequest<T>` instead honestly propagates `Promise<T | undefined>`.

**Caveat / risk:** The `as X` cast in authApi hides the `undefined` case. If such an endpoint ever returns an empty 2xx body, the value is typed non-null but is actually `undefined`; downstream `tokens.access_token`-style access throws a raw TypeError instead of a clean failure. For endpoints whose 200 contract guarantees a JSON body (login/refresh/register/me) this is contractually safe but not type-guaranteed.

**Why:** Keeps caller ergonomics clean for endpoints that always return a body.
**How to apply:** Accept `as X` only where the OpenAPI 2xx response is a required non-empty schema. For any endpoint that can legitimately 204/empty, return `T | undefined` and let the caller handle it rather than casting. Prefer this over adding a runtime null-check inside every wrapper.

Related: [[api-schema-patterns]], [[auth-token-storage-pattern]]
