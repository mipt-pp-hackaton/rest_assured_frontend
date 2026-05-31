---
name: zod-default-input-output
description: Zod schema fields with .default() are required in z.infer (output) but optional in z.input — pick the right one for request payload types
metadata:
  type: feedback
---

In `src/api/schemas.ts`, some schema fields use `.default(...)` (e.g. `UserCreateSchema.is_superuser = z.boolean().default(false)`). The `z.infer<>` (output) type marks such fields as REQUIRED, but `z.input<>` marks them OPTIONAL.

**Why:** When a form/API caller must be able to OMIT a field entirely (e.g. T16 RegisterForm security contract: a normal user must not send `is_superuser` at all, asserted by `'is_superuser' in body === false`), the function signature must accept the input type. Using the `z.infer` output type forces callers to include the defaulted key, breaking the "omit entirely" requirement.

**How to apply:** For request-body parameter types where a defaulted field should be omittable, export and use a `z.input<typeof XSchema>` alias (e.g. `UserCreateInput` in `src/api/types.ts`) rather than the `z.infer` type. `JSON.stringify({ email, password })` then naturally omits the absent key. Keep `z.infer` types for response/parsed data where defaults have been applied.
