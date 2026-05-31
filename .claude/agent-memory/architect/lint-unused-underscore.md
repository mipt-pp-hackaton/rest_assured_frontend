---
name: lint-unused-underscore
description: ESLint config (eslint.config.js) uses only recommended presets and does NOT ignore underscore-prefixed unused vars, so the _omit destructure idiom fails lint.
metadata:
  type: project
---

`eslint.config.js` extends only the recommended tseslint/js presets with no custom `@typescript-eslint/no-unused-vars` options.

**Consequence:** The common "destructure-to-omit" idiom `const { x: _omit, ...rest } = obj` triggers `no-unused-vars` even with the underscore prefix (seen in src/api/schemas.test.ts). `react-refresh/only-export-components` also fires on test-utils.tsx because it mixes component and non-component exports.

**Why:** No `argsIgnorePattern`/`varsIgnorePattern: '^_'` is configured.
**How to apply:** Either add `'@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }]` to the config, or avoid the omit-destructure idiom (e.g. build the partial object without the key). Test-utils render helpers should live in a file separate from any component exports, or the file should be exempted from react-refresh rules.
