---
name: form-page-split-pattern
description: Service create/edit follow a presentational-form + page-owns-mutation split, with a shared serviceFormErrors helper mapping 422 detail to per-field errors. The established convention for form features.
metadata:
  type: project
---

The services feature establishes the project convention for create/edit forms (src/features/services/ServiceForm.tsx + src/pages/ServiceCreatePage.tsx + ServiceEditPage.tsx + src/pages/serviceFormErrors.ts).

**Pattern (established and approved):**
- The form component is purely presentational: owns local controlled field state and client-side validation, does NO network calls. Parent passes `onSubmit` and owns the react-query `useMutation` lifecycle.
- One form, two modes (`create` | `edit`). Create mode submits a full object; edit mode diffs each field against `initialValues` and submits ONLY changed keys (a partial), `{}` when nothing changed.
- Server (422) field errors are injected back via an `errors` prop; server errors take precedence over stale client errors in the render (`errors?.[field] ?? clientErrors[field]`).
- 422 -> field mapping is centralized in `mapDetailToFieldErrors` (serviceFormErrors.ts): last segment of each ValidationError `loc` is the field key, filtered against a KNOWN_FIELDS allowlist, msg truncated to 200 chars. Pages do not hand-roll this mapping — reuse the helper.
- Pages catch `err instanceof ApiError && err.detail` in `onError` to feed the mapper.

**Why:** Keeps the form reusable across create/edit, keeps mutation/navigation concerns in the page, and keeps 422 handling DRY and consistent.
**How to apply:** New forms should follow this split and reuse a shared detail->field mapper rather than inlining 422 parsing. If a second resource gets a form, consider generalizing serviceFormErrors rather than copy-pasting.

Related: [[api-schema-patterns]], [[querystates-ladder-pattern]]
