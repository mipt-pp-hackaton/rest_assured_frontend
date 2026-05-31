---
name: querystates-ladder-pattern
description: src/components/QueryStates is the shared loading/error+retry/empty/children ladder used by all query-backed pages; render children only after re-checking isPending/isError. Established convention.
metadata:
  type: project
---

`src/components/QueryStates` is the project-standard wrapper for react-query-backed views (Dashboard, Services, Incidents, ServiceDetail metrics + timeseries sections).

**Pattern (established and approved):**
- Pass `testIdPrefix` to produce `${prefix}-loading|-error|-empty` markers; pass `onRetry` (-> query.refetch) and optional `retryTestId`. Retry control always exposes an accessible name matching /retry/i.
- Callers guard children with `!query.isPending && !query.isError ? <Child .../> : null` because QueryStates renders children when not pending/error/empty, but TS narrowing of `query.data` happens at the call site.
- Empty-state handling is inconsistent by design: list pages pass real `isEmpty`; ServiceDetailPage passes `isEmpty={false}` and lets the leaf component own its own empty marker (TimeseriesChart renders `timeseries-empty` when buckets.length===0). Both are accepted.

**Why:** One ladder keeps loading/error/empty UX and testids consistent across pages without each page reimplementing it.
**How to apply:** New query-backed views should use QueryStates rather than open-coding the ladder. Decide up front whether empty-state lives in QueryStates (`isEmpty`) or in the leaf component, and keep it to one place per view.

Related: [[form-page-split-pattern]]
