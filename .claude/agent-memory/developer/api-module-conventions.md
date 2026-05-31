---
name: api-module-conventions
description: Novel conventions for CRUD endpoint modules in src/api (PATCH partial-update payload building) + pre-existing AuthContext lint error
metadata:
  type: project
---

CRUD endpoint modules (e.g. `src/api/servicesApi.ts`) build on the patterns in
[[auth-api-interceptor]] and [[api-layer]] (use `authedRequest<T>`, cast non-void
results `as T`, `JSON.stringify` JSON bodies, void/204 just `await`).

**Novel detail — partial-update (PATCH) endpoints:**
For `update*(id, patch: *Update)`, the `*Update` Zod schemas mark every field
`.nullable().optional()`. Build the request payload from only the *defined* keys
(iterate `Object.entries(patch)`, skip `value === undefined`) so no `undefined`
fields leak into the JSON body.
- **Why:** Tests assert the exact serialized key set (e.g. `Object.keys(body)` must equal exactly the keys passed in the patch).
- **How to apply:** Never `JSON.stringify(patch)` directly for partial updates; filter first.

**Query-string (GET) endpoints:**
For endpoints with query params (e.g. `getTimeseries` in `src/api/metricsApi.ts`),
build the string with `URLSearchParams` and append `?${query.toString()}` to the
path. Convert numbers with `String(n)` and apply defaults inline
(e.g. `bucket_seconds: String(params.bucketSeconds ?? 60)`). Tests assert the
exact `searchParams.get(...)` values including stringified defaults.

**(Resolved) former AuthContext lint error:**
`src/auth/AuthContext.tsx` previously reported `react-refresh/only-export-components`.
This was fixed in T11 by splitting the context object/types into a component-free
module — see [[react-refresh-context-split]]. Full `npm run lint` is now clean.
