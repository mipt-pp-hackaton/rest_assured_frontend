---
name: routing-conventions
description: How routing is structured — routes table, App wiring, page component locations
metadata:
  type: project
---

Routing uses react-router-dom v7 data routers.

- `src/router.tsx` exports `routes: RouteObject[]` (plain route objects, NOT JSX `<Route>` elements). Paths are relative (no leading slash) so the same table mounts under `createMemoryRouter` (tests) and `createBrowserRouter` (App).
- `src/App.tsx` consumes `routes` via `createBrowserRouter(routes)` + `RouterProvider`. Provider nesting (as of T14): `QueryClientProvider > AuthProvider (from ./auth/AuthContext) > RouterProvider`.
- Page components live in `src/pages/*.tsx` as default exports: LoginPage, RegisterPage, DashboardPage, ServicesPage, ServiceDetailPage, IncidentsPage, NotFound.
- Each page/route carries a stable `data-testid` marker (e.g. `login-page`, `service-detail-page`, `not-found`) that route-wiring tests assert on.

**Protected routes (T14):** Gating is done via a single LAYOUT route, not per-page guards. PUBLIC paths (`login`, `register`, catch-all `*`) stay at the top level of `routes`; PROTECTED paths nest under `{ element: <ProtectedRoute />, children: [ index DashboardPage, services, services/:id, incidents ] }`. `src/auth/ProtectedRoute.tsx` (named export, consumes `useAuth()`): status 'loading' -> `<div data-testid="auth-loading" />` (NO redirect), 'unauthenticated' -> `<Navigate to="/login" replace />`, 'authenticated' -> `<Outlet />`. Unit-test the guard by mocking `./useAuth` (MSW is `onUnhandledRequest:'error'`).

**Why:** Tests mount the real route table at arbitrary paths via createMemoryRouter without a global BrowserRouter; data-router objects make this possible.
**How to apply:** When adding a route, add a RouteObject to `routes` and a real page file under src/pages/ — do not introduce a separate JSX `<Routes>` tree.
