import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { render, screen, waitFor, userEvent } from '../../test/test-utils'
import { tokenStorage } from '../../auth/tokenStorage'
import type { UserRead, HTTPValidationError } from '../../api/types'
// Import the not-yet-existing component so this suite FAILS in the RED phase.
import CreateUserForm from './CreateUserForm'

/**
 * ---------------------------------------------------------------------------
 * ADMIN CREATE-USER FORM CONTRACT (RED phase)
 * ---------------------------------------------------------------------------
 * Component: src/features/users/CreateUserForm.tsx — default export, no props.
 * Self-contained: owns field state, client-side validation, the createUser
 * mutation, and the post-success UX. Rendered only inside an admin-gated route.
 *
 * CONTROLS (accessible queries)
 *   - Email input            : role 'textbox', name /email/i.
 *   - Password input         : <input type=password>, label /^password$/i.
 *   - Confirm Password input : label /confirm password/i.
 *   - Admin toggle           : role 'checkbox', name /(admin|superuser)/i,
 *                              UNCHECKED by default.
 *   - Submit button          : role 'button', name /create user/i.
 *
 * CLIENT-SIDE VALIDATION (before any network call; submit BLOCKED, no POST)
 *   - Invalid email   -> inline error /valid email/i.
 *   - Password <8/>72 -> inline error /(8|72|characters)/i.
 *   - Confirm != pw   -> inline error /match/i.
 *
 * SUCCESS (201 UserRead) — admin stays on the page
 *   - POST `${BASE}/api/auth/register` JSON {email,password,is_superuser}.
 *   - is_superuser mirrors the Admin toggle (false when unchecked).
 *   - Shows a success message naming the created user; does NOT navigate away.
 *   - Resets the fields so the admin can create another user.
 *
 * ERROR (422 HTTPValidationError, e.g. duplicate email)
 *   - Surfaces detail[].msg; no success message; submit becomes usable again.
 * ---------------------------------------------------------------------------
 */

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`

const VALID_EMAIL = 'new.admin@example.com'
const VALID_PASSWORD = 'super-secret-pw'

const created = (overrides: Partial<UserRead> = {}): UserRead => ({
  id: 300,
  email: VALID_EMAIL,
  is_active: true,
  is_superuser: false,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  ...overrides,
})

const getEmail = () => screen.getByRole('textbox', { name: /email/i })
const getPassword = () => screen.getByLabelText(/^password$/i)
const getConfirm = () => screen.getByLabelText(/confirm password/i)
const getAdminToggle = () =>
  screen.getByRole('checkbox', { name: /(admin|superuser)/i })
const getSubmit = () => screen.getByRole('button', { name: /create user/i })

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.clear(getEmail())
  await user.type(getEmail(), VALID_EMAIL)
  await user.clear(getPassword())
  await user.type(getPassword(), VALID_PASSWORD)
  await user.clear(getConfirm())
  await user.type(getConfirm(), VALID_PASSWORD)
}

beforeEach(() => {
  // An admin is logged in when this form is reachable.
  tokenStorage.setTokens({ access: 'admin-access', refresh: 'admin-refresh' })
})
afterEach(() => {
  tokenStorage.clear()
})

describe('CreateUserForm — rendering', () => {
  it('renders email, password, confirm, an unchecked Admin toggle, and submit', () => {
    render(<CreateUserForm />)
    expect(getEmail()).toBeInTheDocument()
    expect(getPassword()).toBeInTheDocument()
    expect(getConfirm()).toBeInTheDocument()
    expect(getAdminToggle()).toBeInTheDocument()
    expect(getAdminToggle()).not.toBeChecked()
    expect(getSubmit()).toBeInTheDocument()
  })
})

describe('CreateUserForm — client-side validation', () => {
  it('blocks submit and shows an error for an invalid email', async () => {
    let posted = false
    server.use(
      http.post(url('/api/auth/register'), () => {
        posted = true
        return HttpResponse.json(created(), { status: 201 })
      }),
    )
    const user = userEvent.setup()
    render(<CreateUserForm />)

    await user.type(getEmail(), 'not-an-email')
    await user.type(getPassword(), VALID_PASSWORD)
    await user.type(getConfirm(), VALID_PASSWORD)
    await user.click(getSubmit())

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(posted).toBe(false)
  })

  it('blocks submit and shows an error for a too-short password', async () => {
    let posted = false
    server.use(
      http.post(url('/api/auth/register'), () => {
        posted = true
        return HttpResponse.json(created(), { status: 201 })
      }),
    )
    const user = userEvent.setup()
    render(<CreateUserForm />)

    await user.type(getEmail(), VALID_EMAIL)
    await user.type(getPassword(), 'short')
    await user.type(getConfirm(), 'short')
    await user.click(getSubmit())

    expect(await screen.findByText(/(8|72|characters)/i)).toBeInTheDocument()
    expect(posted).toBe(false)
  })

  it('blocks submit and shows an error when confirm does not match', async () => {
    let posted = false
    server.use(
      http.post(url('/api/auth/register'), () => {
        posted = true
        return HttpResponse.json(created(), { status: 201 })
      }),
    )
    const user = userEvent.setup()
    render(<CreateUserForm />)

    await user.type(getEmail(), VALID_EMAIL)
    await user.type(getPassword(), VALID_PASSWORD)
    await user.type(getConfirm(), 'different-password')
    await user.click(getSubmit())

    expect(await screen.findByText(/match/i)).toBeInTheDocument()
    expect(posted).toBe(false)
  })
})

describe('CreateUserForm — successful creation', () => {
  it('POSTs is_superuser:false by default, shows success, and resets the form', async () => {
    let seenBody: Record<string, unknown> | undefined
    let calls = 0
    server.use(
      http.post(url('/api/auth/register'), async ({ request: req }) => {
        calls += 1
        seenBody = (await req.json()) as Record<string, unknown>
        return HttpResponse.json(created(), { status: 201 })
      }),
    )
    const user = userEvent.setup()
    render(<CreateUserForm />)

    await fillValid(user)
    await user.click(getSubmit())

    // Success surfaced, naming the created user; admin stays (no marker route).
    expect(await screen.findByText(new RegExp(VALID_EMAIL.replace('.', '\\.'))))
      .toBeInTheDocument()

    expect(calls).toBe(1)
    expect(seenBody).toMatchObject({
      email: VALID_EMAIL,
      password: VALID_PASSWORD,
      is_superuser: false,
    })

    // Fields reset so another user can be created.
    await waitFor(() => expect(getEmail()).toHaveValue(''))
    expect(getAdminToggle()).not.toBeChecked()
  })

  it('POSTs is_superuser:true when the Admin toggle is checked', async () => {
    let seenBody: Record<string, unknown> | undefined
    server.use(
      http.post(url('/api/auth/register'), async ({ request: req }) => {
        seenBody = (await req.json()) as Record<string, unknown>
        return HttpResponse.json(created({ is_superuser: true }), { status: 201 })
      }),
    )
    const user = userEvent.setup()
    render(<CreateUserForm />)

    await fillValid(user)
    await user.click(getAdminToggle())
    expect(getAdminToggle()).toBeChecked()
    await user.click(getSubmit())

    await screen.findByText(new RegExp(VALID_EMAIL.replace('.', '\\.')))
    expect(seenBody?.is_superuser).toBe(true)
  })
})

describe('CreateUserForm — 422 HTTPValidationError', () => {
  it('renders detail[].msg and keeps the submit usable', async () => {
    const errorBody: HTTPValidationError = {
      detail: [
        { loc: ['body', 'email'], msg: 'REGISTER_USER_ALREADY_EXISTS', type: 'value_error' },
      ],
    }
    server.use(
      http.post(url('/api/auth/register'), () =>
        HttpResponse.json(errorBody, { status: 422 }),
      ),
    )
    const user = userEvent.setup()
    render(<CreateUserForm />)

    await fillValid(user)
    await user.click(getSubmit())

    expect(
      await screen.findByText(/REGISTER_USER_ALREADY_EXISTS/),
    ).toBeInTheDocument()
    await waitFor(() => expect(getSubmit()).toBeEnabled())
  })
})
