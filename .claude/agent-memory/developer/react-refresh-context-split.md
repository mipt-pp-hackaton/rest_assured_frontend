---
name: react-refresh-context-split
description: ESLint react-refresh forbids non-component exports from .tsx files in app code; put React.createContext in its own module
metadata:
  type: feedback
---

In this repo, `eslint.config.js` enables `reactRefresh.configs.vite`, and `react-refresh/only-export-components` is only disabled for test files (`src/test/**`, `**/*.test.{ts,tsx}`). So an app `.tsx` file that exports both a component AND a `createContext(...)` / type / constant fails lint.

**Why:** Fast Refresh requires component files to export only components. The rule stays ON for non-test app code by design.

**How to apply:** When building a context provider, split into two files: e.g. `authContextValue.ts` (exports the `createContext` object + value types, no JSX) and `AuthContext.tsx` (exports only the `AuthProvider` component). Hooks like `useAuth` import the context object from the plain `.ts` module. This satisfies the import contract (tests still import `AuthProvider` from `AuthContext.tsx`) while keeping lint green. Type-only re-exports also trip the rule, so keep types in the `.ts` module too.
