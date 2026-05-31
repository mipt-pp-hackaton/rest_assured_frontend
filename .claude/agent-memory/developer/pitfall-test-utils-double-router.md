---
name: pitfall-test-utils-double-router
description: The custom test-utils render already wraps children in a MemoryRouter; a page test that also supplies its own router throws "Router inside Router" and no app code can fix it
metadata:
  type: project
---

`src/test/test-utils.tsx` exports a custom `render` that wraps children in BOTH a `QueryClientProvider` and a `<MemoryRouter>`. A test that imports `render` from `../test/test-utils` AND supplies its own `<MemoryRouter>`/`<Routes>` (because it needs `initialEntries` + sibling routes to observe navigation) throws at runtime:

> Error: You cannot render a `<Router>` inside another `<Router>`. You should never have more than one in your app.

Every test in that file then fails with the identical invariant, regardless of the component implementation.

**Why:** test-utils is meant for component tests that need providers but NOT routing control. Page tests that own routing must use the RAW `render` from `@testing-library/react` (see `LoginPage.test.tsx`, which does this correctly).

**How to apply:** If a provided `[CODE]` test file uses the test-utils `render` together with its own router, that is a QA-side defect you cannot fix from application code (you must not edit test files, and there is no component change that removes an extra `<Router>` the test mounts). Verify your implementation independently by writing a THROWAWAY test that uses raw `@testing-library/react` render with the same MSW handlers, confirm the logic is green, delete it, then report the test-file defect to the orchestrator. Observed in T20 for `ServiceCreatePage.test.tsx` and `ServiceEditPage.test.tsx`. Related: [[pitfall-vifn-typecheck]].
