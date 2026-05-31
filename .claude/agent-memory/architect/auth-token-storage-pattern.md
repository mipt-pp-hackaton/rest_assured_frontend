---
name: auth-token-storage-pattern
description: src/auth/tokenStorage.ts wraps localStorage with an in-memory Map fallback; storage keys are module-private. Use the tokenStorage object, never raw localStorage.
metadata:
  type: project
---

Auth tokens are accessed exclusively through the `tokenStorage` object in `src/auth/tokenStorage.ts`.

**Pattern (approved):**
- Keys `auth.accessToken` / `auth.refreshToken` are module-private constants and must NOT be exported or referenced elsewhere.
- Every localStorage call is wrapped in try/catch; an in-memory `Map` is the fallback for Safari private mode / disabled storage / quota errors. Writes go to memory first, then attempt localStorage.
- Public surface: getAccessToken, getRefreshToken, setTokens({access, refresh}), clear. Single responsibility = token persistence only.

**Why:** Centralizing prevents key-string duplication and makes the storage backend swappable; the fallback avoids hard crashes when localStorage is unavailable.
**How to apply:** Any code needing tokens must import `tokenStorage`, never touch `localStorage` directly or hardcode the key strings.
