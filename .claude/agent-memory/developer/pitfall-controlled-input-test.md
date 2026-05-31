---
name: pitfall-controlled-input-test
description: Fully-controlled number inputs need a local string buffer to pass typing tests whose mock parent never re-renders
metadata:
  type: feedback
---

When a presentational input component is "fully controlled" (`value` bound to a prop) but a test renders it with a STATIC `value` and a `vi.fn()` onChange, `user.type('42')` will NOT accumulate: each keystroke fires onChange but the prop never updates, so React forces the input back to its prop value and the last call sees a single char (`2`), not `42`.

See `src/features/incidents/IncidentFilters.tsx` (IncidentFilters.test.tsx).

**Why:** The RED tests assert `toHaveBeenLastCalledWith({ serviceId: 42 })` while passing `value={{}}` and a no-op onChange. A separate test asserts `toHaveValue(7)` when a value IS provided, so `defaultValue` alone is not enough either (and the original `defaultValue` was the controlled/uncontrolled bug we were told to fix).

**How to apply:** For number/text inputs that must (a) reflect a controlled prop AND (b) accumulate typed chars under a non-updating parent, keep a local `useState` string buffer as the input's `value`, push parsed values up via onChange, and re-seed the buffer from the prop using React's "adjust state during render" pattern (track `prevProp` in state, compare in render body) — NOT a `useEffect`+setState (ESLint `react-hooks/set-state-in-effect` rejects that). Checkboxes have no such tension: bind `checked` directly. See [[component-querystates]] for the sibling refactor in the same wave.
