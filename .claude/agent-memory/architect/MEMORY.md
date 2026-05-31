# Architect Memory Index

- [API schema patterns](api-schema-patterns.md) — Zod v4 schemas are the single source of truth; types.ts only re-exports z.infer. Conventions for nullable/optional/default.
- [Token storage pattern](auth-token-storage-pattern.md) — localStorage with in-memory fallback; storage keys must stay private to the module.
- [Lint underscore-unused convention](lint-unused-underscore.md) — ESLint config does not yet ignore `_`-prefixed unused vars; either configure it or use a different idiom.
- [request T|undefined cast](request-undefined-cast.md) — httpClient request<T> returns T|undefined; authApi casts `as T` which is safe only for required-body endpoints.
- [Form/page split pattern](form-page-split-pattern.md) — presentational ServiceForm + page-owned mutation + shared serviceFormErrors 422->field mapper; edit mode diffs to changed keys.
- [QueryStates ladder pattern](querystates-ladder-pattern.md) — shared loading/error+retry/empty/children wrapper; re-check isPending/isError before rendering children.
- [Test API base URL](test-env-base-url.md) — VITE_API_BASE_URL must be a committed absolute http URL in vite.config test.env, scoped to test only; .env.test alone is not the contract.
