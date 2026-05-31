---
name: auth-form-conventions
description: Conventions for auth forms (LoginForm/RegisterForm), useAuth hook, ApiError handling, and form-field testid naming
metadata:
  type: project
---

Auth feature forms live in `src/features/auth/`; thin page wrappers in `src/pages/` keep a `data-testid="<name>-page"` marker that `src/router.test.tsx` uses to identify the active route, and render the form inside.

- `LoginForm` uses `useAuth()` from `src/auth/useAuth.ts` ({ user, status, login(username,password), logout }); the login identity field is labeled "Email" but its value is passed as the OAuth2 `username` argument. `RegisterForm` is DIFFERENT: it is self-contained — it calls `register()` from `src/api/authApi.ts` directly (NOT useAuth) and uses `useNavigate()` from react-router-dom, navigating to `/login` on a 201.
- `ApiError` (`src/api/errors.ts`) carries `.status` and optional `.detail` (ValidationError[]). Forms branch on `err instanceof ApiError && err.status === 401` for "Invalid credentials"; register forms map `err.detail[].loc` last segment to per-field errors.
- Field testid pattern: `<form>-email`, `<form>-password`, `<form>-submit`, and error nodes `<form>-email-error`, `<form>-password-error`, plus a form-level `<form>-error`.
- Validation runs BEFORE any network call; when invalid, `login`/`register` is NOT called.

**Why:** Tests mock `useAuth` and assert exact inline error strings ("Email is required", "Password is required", "Invalid credentials") and testids.
**How to apply:** Follow these exact strings/testids; use `useId()` for label-input association so `getByLabelText` works.

RegisterForm security contract: the POST body must be `{ email, password }` only — `is_superuser` must be OMITTED entirely (a normal user cannot self-grant superuser). Resolved in T16 by typing `register()` against `UserCreateInput` (`z.input`) so the defaulted `is_superuser` key is optional and never serialized. See [[zod-default-input-output]].
