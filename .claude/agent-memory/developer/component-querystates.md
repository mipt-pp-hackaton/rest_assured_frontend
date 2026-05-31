---
name: component-querystates
description: QueryStates shared loading/error/empty/children ladder used by the three list pages, and the per-page retry control shape
metadata:
  type: project
---

`src/components/QueryStates.tsx` is the shared loading / error(+retry) / empty / children ladder for DashboardPage, ServicesPage, IncidentsPage. Parameterized by `testIdPrefix` ("dashboard"|"services"|"incidents"), `isPending`, `isError`, `isEmpty`, `onRetry`, optional `retryTestId`, and text overrides. Produces `${prefix}-loading`, `${prefix}-error`, `${prefix}-empty`, else `children`.

**Why:** Wave-8 REFACTOR deduped three near-identical ladders. The page-root testid (`dashboard-page` etc.) stays on the page component itself (router wiring), always rendered — QueryStates renders only the inner state.

**How to apply:** The three retry controls differ in how tests query them, so QueryStates makes the retry button satisfy all: it ALWAYS sets `aria-label` (default "Retry", matches DashboardPage's `getByRole('button', {name: /retry/i})`) AND sets `data-testid={retryTestId}` when given (ServicesPage passes "services-retry", IncidentsPage passes "incidents-retry"; DashboardPage passes none). All three pages use `void query.refetch()` as `onRetry`. When `isEmpty`/children-gating, pages compute `ready = !isPending && !isError` and only render the list child when ready (data is otherwise possibly undefined under react-query's `isPending`). Related: [[structure-pages-features]].
