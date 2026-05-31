---
name: structure-pages-features
description: How list pages and their presentational table components are split in rest_assured_frontend
metadata:
  type: project
---

Pages in `src/pages/*` own the react-query lifecycle; presentational components in `src/features/<domain>/*` just render props.

**How to apply:**
- List page pattern (see `ServicesPage.tsx`, `IncidentsPage.tsx`): `useQuery({ queryKey: ['x'], queryFn })`, mutually exclusive states via `query.isPending` / `query.isError` / `data.length === 0` / success. Each state has its own `data-testid` (e.g. `services-loading|error|empty`). Error state includes a retry button calling `query.refetch()`. Root testid (e.g. `services-page`) is ALWAYS present and wraps every state — the router identifies routes by it.
- Mutations: `useMutation` + `useQueryClient().invalidateQueries({ queryKey })` in `onSuccess` to refetch after delete/update.
- Presentational components (e.g. `ServiceTable`, `IncidentTable`, `IncidentFilters`) take typed props, own only local UI state (e.g. two-step delete confirm via `useState`), and never fetch. Two-step delete uses an in-row confirm/cancel reveal, NOT `window.confirm`.
- Tests render through `src/test/test-utils.tsx` which wraps in `QueryClientProvider` (retries disabled) + `MemoryRouter`. MSW server at `src/test/server.ts`; base URL is `import.meta.env.VITE_API_BASE_URL`. API helpers live in `src/api/<domain>Api.ts` and go through `authedRequest` (needs a token seeded via `tokenStorage.setTokens(...)` in `beforeEach`).
