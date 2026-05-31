---
name: pitfall-vifn-typecheck
description: QA tests annotating mocks as ReturnType<typeof vi.fn> cause tsc -b errors that app code cannot fix
metadata:
  type: project
---

`npm run typecheck` (`tsc -b --noEmit`) type-checks test files too. When a QA test declares a callback mock as `let onX: ReturnType<typeof vi.fn>` and passes it to a prop typed `(id: number) => void`, tsc reports TS2322 ("Mock<Procedure | Constructable> not assignable") even though the runtime test passes.

**Why:** bare `vi.fn()` is typed `Mock<Procedure | Constructable>`; the `Constructable` arm breaks assignability to a plain call signature. Inline `vi.fn()` or `const x = vi.fn()` (inferred) does NOT trip this — only the explicit `ReturnType<typeof vi.fn>` annotation does (compare `ServiceTable.test.tsx` which fails vs `IncidentFilters.test.tsx` which uses the same prop shape and passes).

**How to apply:** This is a test-file artifact, not an app-code defect. As `developer` you must NOT modify test files, so you cannot fix it from your side — do not widen your prop types to chase it (the contract types are correct). Report it as a pre-existing/test-side typecheck issue and confirm `tsc` reports zero errors in YOUR source files (`grep` the output for your filenames). Also expect unrelated typecheck errors from other not-yet-implemented tasks (e.g. missing `./SummaryCard` module) — scope your judgement to your own files.
