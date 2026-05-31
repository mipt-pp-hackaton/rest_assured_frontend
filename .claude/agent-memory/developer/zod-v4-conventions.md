---
name: zod-v4-conventions
description: Zod v4 API usage and tsconfig import rules for src/api schemas+types in this repo
metadata:
  type: project
---

This repo uses Zod v4 (`zod` ^4.4) for API schemas under `src/api/`, with a strict schema/type split.

**Why:** Schemas are modeled on the backend OpenAPI spec (`openapi (1).json` at repo root). Runtime validation lives in `schemas.ts`; inferred TS types are re-exported separately from `types.ts`.

**How to apply:**
- Zod v4 moved string-format validators to top-level functions: use `z.email()` not `z.string().email()`. Same family: `z.url()`, `z.uuid()`, `z.iso.datetime()`.
- `z.enum([...])` for fixed unions (e.g. HttpMethod GET|POST|HEAD|PUT|DELETE|PATCH|OPTIONS).
- OpenAPI `anyOf: [{type}, {type: null}]` with the field also in `required` => `.nullable()` (must be present, may be null). If NOT in `required` => `.nullable().optional()`.
- OpenAPI `default` => `.default(...)` so `safeParse` fills it (e.g. TokenPair token_type "bearer", ServiceCreate http_method "GET" / interval_ms 60000 / is_active true, UserCreate is_superuser false).
- `types.ts` re-exports `z.infer<typeof XSchema>`. Because tsconfig.app.json has `verbatimModuleSyntax: true`, split imports: `import { z } from 'zod'` (value) and `import type { XSchema } from './schemas'` (type-only). Mixing value+type in one import without `type` keyword fails compile.
- tsconfig.app.json `include: ["src"]` covers `*.test.ts`, so `expectTypeOf` type-level assertions are checked by `npm run typecheck` (tsc -b --noEmit), not just at runtime.
- Test/typecheck commands: `npm test` (vitest run), `npm run typecheck`.
