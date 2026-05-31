---
name: project-test-setup
description: How tests and typecheck run in rest_assured_frontend (vitest, jsdom, single-file runs, shared typecheck noise)
metadata:
  type: project
---

Test stack is vitest 4 with a jsdom environment (so `localStorage`, `Storage.prototype` etc. are available in tests). `zod` is the validation lib; `@tanstack/react-query`, `react-router-dom` v7, `recharts` are present.

Commands:
- `npm test` → `vitest run` (all tests, single pass)
- `npm test -- <path>` → run one test file
- `npm run typecheck` → `tsc -b --noEmit` (whole project, build-mode references)

**Why:** TDD pipeline runs many `[CODE]` tasks; `qa` lands failing test files for tasks that aren't implemented yet.

**How to apply:** `npm run typecheck` is project-wide and may report TS2307 "Cannot find module" errors for OTHER tasks' not-yet-implemented modules (seen: `../api/types`, `./router`). Those are not regressions from your change. To verify only your file is clean, isolate it (e.g. `npx tsc --noEmit --strict --skipLibCheck <yourfile>`). Only your task's test file going green + no new errors attributable to your file is the bar.
