---
name: auth-clear-on-failure
description: In auth flows, any failure after tokenStorage.setTokens must clear tokens and reset status to avoid partial-auth limbo
metadata:
  type: feedback
---

When a flow stores tokens via `tokenStorage.setTokens(...)` and then performs a
follow-up call (e.g. `authApi.me()`), wrap the follow-up in try/catch. On
failure: `tokenStorage.clear()`, reset auth state to unauthenticated, and
re-throw so the UI can surface the error.

**Why:** Storing tokens before validating them leaves a partial-auth limbo if
the validation call throws — tokens persist but the app isn't truly
authenticated.

**How to apply:** Mirror the bootstrap `useEffect` clear-on-failure pattern in
`src/auth/AuthContext.tsx`. Same pattern exists in `src/api/authInterceptor.ts`
(refresh failure clears tokens). Keep success paths byte-identical so existing
tests stay green.
