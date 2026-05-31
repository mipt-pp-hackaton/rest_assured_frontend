import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { Routes, Route } from 'react-router-dom'
import { server } from '../../test/server'
import { render, screen, waitFor, userEvent } from '../../test/test-utils'
import type { UserRead, HTTPValidationError } from '../../api/types'
// Import the not-yet-existing component so this suite FAILS in the RED phase.
import RegisterForm from './RegisterForm'

/**
 * ---------------------------------------------------------------------------
 * T16 REGISTER FORM CONTRACT (RED phase)
 * ---------------------------------------------------------------------------
 * Component under test: src/features/auth/RegisterForm.tsx
 *   `export default function RegisterForm(): JSX.Element`
 *   (no required props; self-contained — owns its form state, validation,
 *   the register mutation, and post-success navigation).
 *
 * ACCESSIBLE QUERIES / LABELS
 *   - Email input:    role="textbox", accessible name matching /email/i.
 *   - Password input: <input type="password">, accessible name /^password$/i
 *     (queried by label text "Password").
 *   - Confirm password input (OPTIONAL — present in this contract): accessible
 *     name /confirm password/i. If the implementation omits confirm-password,
 *     remove the dedicated describe block; all other contracts still hold.
 *   - Submit button:  role="button", accessible name matching
 *     /(register|sign ?up|create account)/i.
 *
 * VALIDATION (CLIENT-SIDE, before any network call)
 *   - Invalid email format -> inline error with text matching
 *     /valid email/i, associated with the email field; submit is BLOCKED
 *     (NO POST /api/auth/register is sent).
 *   - Password length < 8 OR > 72 -> inline error with text matching
 *     /(8|72|characters)/i; submit is BLOCKED.
 *   - Confirm password != password -> inline error matching /match/i;
 *     submit is BLOCKED.
 *   - A valid email + valid password (8..72 chars) + matching confirm allows
 *     submit (exactly one POST is fired).
 *
 * REQUEST PAYLOAD (SECURITY)
 *   - POST `${VITE_API_BASE_URL}/api/auth/register`, JSON body.
 *   - Body MUST contain { email, password } with the typed values.
 *   - Body MUST NOT contain is_superuser:true. Preferred: the key
 *     `is_superuser` is OMITTED entirely. (A normal user cannot self-grant
 *     superuser.) This suite fails the build if `is_superuser === true`.
 *
 * SUCCESS (201 UserRead)  [chosen behavior: NAVIGATE to "/login"]
 *   - On a 201 response the form navigates to "/login". The test renders the
 *     form inside a <Routes> with a "/login" route exposing
 *     data-testid="login-route-marker"; the marker must appear after success.
 *
 * ERROR (422 HTTPValidationError — e.g. duplicate email)
 *   - The server returns { detail: [{ loc, msg, type }, ...] }.
 *   - The UI surfaces detail[].msg. This suite asserts the exact `msg` string
 *     from the 422 body is rendered somewhere in the form (mapped to the field
 *     and/or shown as a global error). Submit button returns to an enabled,
 *     non-pending state so the user can retry.
 * ---------------------------------------------------------------------------
 */

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`

const CREATED_USER: UserRead = {
  id: 101,
  email: 'new.user@example.com',
  is_active: true,
  is_superuser: false,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
}

const VALID_EMAIL = 'new.user@example.com'
const VALID_PASSWORD = 'super-secret-pw'

// Renders RegisterForm with a sibling "/login" route so navigation is observable.
function renderForm() {
  return render(
    <Routes>
      <Route path="/" element={<RegisterForm />} />
      <Route
        path="/login"
        element={<div data-testid="login-route-marker">login route</div>}
      />
    </Routes>,
    { routerProps: { initialEntries: ['/'] } },
  )
}

// Field accessors via accessible queries.
const getEmail = () => screen.getByRole('textbox', { name: /email/i })
const getPassword = () => screen.getByLabelText(/^password$/i)
const queryConfirm = () => screen.queryByLabelText(/confirm password/i)
const getSubmit = () =>
  screen.getByRole('button', { name: /(register|sign ?up|create account)/i })

// Fills the form with valid values, including confirm-password if present.
async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.clear(getEmail())
  await user.type(getEmail(), VALID_EMAIL)
  await user.clear(getPassword())
  await user.type(getPassword(), VALID_PASSWORD)
  const confirm = queryConfirm()
  if (confirm) {
    await user.clear(confirm)
    await user.type(confirm, VALID_PASSWORD)
  }
}

beforeEach(() => {
  // Each test that expects a request registers its own handler; the global
  // setup uses onUnhandledRequest:'error', so a blocked submit (no POST) is
  // implicitly asserted by the absence of any unhandled request.
})

describe('RegisterForm — rendering', () => {
  it('renders email, password, and submit controls via accessible queries', () => {
    renderForm()
    expect(getEmail()).toBeInTheDocument()
    expect(getPassword()).toBeInTheDocument()
    expect(getSubmit()).toBeInTheDocument()
  })
})

describe('RegisterForm — client-side validation', () => {
  it('blocks submit and shows an inline error for an invalid email', async () => {
    let posted = false
    server.use(
      http.post(url('/api/auth/register'), () => {
        posted = true
        return HttpResponse.json(CREATED_USER, { status: 201 })
      }),
    )

    const user = userEvent.setup()
    renderForm()

    await user.type(getEmail(), 'not-an-email')
    await user.type(getPassword(), VALID_PASSWORD)
    const confirm = queryConfirm()
    if (confirm) await user.type(confirm, VALID_PASSWORD)
    await user.click(getSubmit())

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    // No navigation, no request.
    expect(screen.queryByTestId('login-route-marker')).not.toBeInTheDocument()
    expect(posted).toBe(false)
  })

  it('blocks submit and shows an inline error for a password shorter than 8', async () => {
    let posted = false
    server.use(
      http.post(url('/api/auth/register'), () => {
        posted = true
        return HttpResponse.json(CREATED_USER, { status: 201 })
      }),
    )

    const user = userEvent.setup()
    renderForm()

    await user.type(getEmail(), VALID_EMAIL)
    await user.type(getPassword(), 'short') // 5 chars < 8
    const confirm = queryConfirm()
    if (confirm) await user.type(confirm, 'short')
    await user.click(getSubmit())

    expect(
      await screen.findByText(/(8|72|characters)/i),
    ).toBeInTheDocument()
    expect(posted).toBe(false)
  })

  it('blocks submit and shows an inline error for a password longer than 72', async () => {
    let posted = false
    server.use(
      http.post(url('/api/auth/register'), () => {
        posted = true
        return HttpResponse.json(CREATED_USER, { status: 201 })
      }),
    )

    const user = userEvent.setup()
    renderForm()

    const tooLong = 'a'.repeat(73)
    await user.type(getEmail(), VALID_EMAIL)
    await user.type(getPassword(), tooLong)
    const confirm = queryConfirm()
    if (confirm) await user.type(confirm, tooLong)
    await user.click(getSubmit())

    expect(
      await screen.findByText(/(8|72|characters)/i),
    ).toBeInTheDocument()
    expect(posted).toBe(false)
  })
})

describe('RegisterForm — confirm-password (optional field)', () => {
  it('blocks submit when confirm-password does not match (only if the field exists)', async () => {
    const user = userEvent.setup()
    renderForm()

    const confirm = queryConfirm()
    if (!confirm) {
      // Implementation chose to omit confirm-password; contract satisfied.
      expect(confirm).toBeNull()
      return
    }

    let posted = false
    server.use(
      http.post(url('/api/auth/register'), () => {
        posted = true
        return HttpResponse.json(CREATED_USER, { status: 201 })
      }),
    )

    await user.type(getEmail(), VALID_EMAIL)
    await user.type(getPassword(), VALID_PASSWORD)
    await user.type(confirm, 'different-password')
    await user.click(getSubmit())

    expect(await screen.findByText(/match/i)).toBeInTheDocument()
    expect(posted).toBe(false)
  })
})

describe('RegisterForm — successful registration', () => {
  it('sends email+password WITHOUT is_superuser:true and navigates to /login', async () => {
    let seenBody: Record<string, unknown> | undefined
    let seenContentType: string | null = null

    server.use(
      http.post(url('/api/auth/register'), async ({ request: req }) => {
        seenContentType = req.headers.get('Content-Type')
        seenBody = (await req.json()) as Record<string, unknown>
        return HttpResponse.json(CREATED_USER, { status: 201 })
      }),
    )

    const user = userEvent.setup()
    renderForm()

    await fillValid(user)
    await user.click(getSubmit())

    // Navigation to /login is the chosen success behavior.
    expect(
      await screen.findByTestId('login-route-marker'),
    ).toBeInTheDocument()

    // Request shape + security assertions.
    expect(seenContentType).toMatch(/application\/json/)
    expect(seenBody).toMatchObject({
      email: VALID_EMAIL,
      password: VALID_PASSWORD,
    })
    // SECURITY: a normal user must not self-grant superuser.
    expect(seenBody?.is_superuser).not.toBe(true)
    // Preferred: the key is omitted entirely.
    expect(seenBody && 'is_superuser' in seenBody).toBe(false)
  })

  it('fires exactly one POST for a valid submission', async () => {
    let calls = 0
    server.use(
      http.post(url('/api/auth/register'), () => {
        calls += 1
        return HttpResponse.json(CREATED_USER, { status: 201 })
      }),
    )

    const user = userEvent.setup()
    renderForm()

    await fillValid(user)
    await user.click(getSubmit())

    await screen.findByTestId('login-route-marker')
    expect(calls).toBe(1)
  })
})

describe('RegisterForm — 422 HTTPValidationError', () => {
  it('renders the detail[].msg from the server and does not navigate', async () => {
    const errorBody: HTTPValidationError = {
      detail: [
        {
          loc: ['body', 'email'],
          msg: 'REGISTER_USER_ALREADY_EXISTS',
          type: 'value_error',
        },
      ],
    }

    server.use(
      http.post(url('/api/auth/register'), () =>
        HttpResponse.json(errorBody, { status: 422 }),
      ),
    )

    const user = userEvent.setup()
    renderForm()

    await fillValid(user)
    await user.click(getSubmit())

    // The exact msg string from the 422 body must be surfaced in the UI.
    expect(
      await screen.findByText(/REGISTER_USER_ALREADY_EXISTS/),
    ).toBeInTheDocument()

    // Still on the form (no navigation), and the submit control is usable again.
    expect(screen.queryByTestId('login-route-marker')).not.toBeInTheDocument()
    await waitFor(() => expect(getSubmit()).toBeEnabled())
  })
})
