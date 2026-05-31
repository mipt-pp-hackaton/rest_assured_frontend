---
name: api-schema-patterns
description: Zod v4 schemas in src/api/schemas.ts are the single source of truth for API types; src/api/types.ts only re-exports z.infer. Conventions for nullable/optional/default.
metadata:
  type: project
---

The API layer models the rest-assured backend OpenAPI 3.1 spec ("openapi (1).json") as Zod v4 schemas.

**Pattern (established and approved):**
- `src/api/schemas.ts` holds all `z.object` schemas (the runtime source of truth).
- `src/api/types.ts` contains ONLY `export type X = z.infer<typeof XSchema>` re-exports, type-only imports, emits nothing at runtime. Do not hand-write types that duplicate schema shapes.
- Spec fields that are `anyOf [T, null]` and NOT in `required` -> `.nullable().optional()`.
- Spec fields that are `anyOf [T, null]` and ARE in `required` (e.g. IncidentRead.closed_at, ServiceSummaryItem.last_check_at) -> `.nullable()` only (required but may be null).
- Spec `default` values are carried through with `.default(...)` (e.g. token_type 'bearer', interval_ms 60000, is_active true).
- `http_method` is a shared `HttpMethodSchema` enum; note ServiceRead.http_method is plain `z.string()` deliberately (spec types the response as free string while ServiceCreate/Update use the enum).

**Why:** Keeps validation and TS types from drifting apart and matches the backend contract exactly.
**How to apply:** When adding/changing an endpoint type, edit schemas.ts and add the inferred re-export in types.ts; verify against the OpenAPI spec's required/anyOf/default for each field.

Related: [[lint-unused-underscore]]
