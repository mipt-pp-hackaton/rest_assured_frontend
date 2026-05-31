import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import type { AuthContextValue } from '../../auth/authContextValue'
import { ApiError } from '../../api/errors'

// ---------------------------------------------------------------------------
// T15 LOGIN FORM CONTRACT (component)
//
// LoginForm (src/features/auth/LoginForm.tsx — to be implemented) renders the
// credential form, drives auth.login() via useAuth(), and on success navigates
// to "/". useAuth is MOCKED so login is a controllable spy and NO network is
// touched (robust under MSW onUnhandledRequest:'error'). Navigation is asserted
// with a real react-router MemoryRouter exposing a "/" marker.
//
// FIELD SEMANTICS: the backend OAuth2 login takes `username` (which IS the
// user's email) + `password`. The form exposes a SINGLE identity field labeled
// "Email" whose entered value is passed as the `username` argument to login().
//
// REQUIRED CONTRACT the developer must satisfy:
//   - Email input:    accessible name "Email"    (getByLabelText(/email/i)),
//                      type="email", data-testid="login-email".
//   - Password input: accessible name "Password" (getByLabelText(/password/i)),
//                      type="password", data-testid="login-password".
//   - Submit button:  role "button", accessible name /sign in|log ?in/i,
//                      data-testid="login-submit", type="submit".
//   - On submit with both fields filled: calls login(email, password) exactly
//     once with the entered values; on resolve, navigates to "/".
//   - Empty email and/or password blocks submit: login NOT called, inline
//     validation messages shown:
//        email missing    -> text "Email is required"
//                            (data-testid="login-email-error")
//        password missing -> text "Password is required"
//                            (data-testid="login-password-error")
//   - login() rejecting with ApiError(status 401): shows error text
//     "Invalid credentials" (data-testid="login-error"); does NOT navigate.
// ---------------------------------------------------------------------------

// Controllable login spy for the mocked useAuth.
const mockLogin =
  vi.fn<(username: string, password: string) => Promise<void>>()

vi.mock('../../auth/useAuth', () => ({
  useAuth: (): AuthContextValue => ({
    user: null,
    status: 'unauthenticated',
    login: mockLogin,
    logout: vi.fn(),
  }),
}))

// Imported AFTER vi.mock so the component picks up the mocked useAuth.
import { LoginForm } from './LoginForm'

// Renders the form at "/login" with a sibling "/" route exposing a marker so a
// successful login (which navigates to "/") is observable in the DOM.
function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/" element={<div data-testid="home-marker">home</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginForm', () => {
  beforeEach(() => {
    mockLogin.mockReset()
  })

  it('renders email + password inputs and a submit button', () => {
    renderForm()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /sign ?in|log ?in/i }),
    ).toBeInTheDocument()
  })

  it('submits valid credentials -> calls login(email, password) and navigates to "/"', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValueOnce(undefined)
    renderForm()

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/password/i), 's3cret-pass')
    await user.click(
      screen.getByRole('button', { name: /sign ?in|log ?in/i }),
    )

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1)
    })
    expect(mockLogin).toHaveBeenCalledWith('user@example.com', 's3cret-pass')

    // On success the form navigates to "/" -> the home marker appears.
    expect(await screen.findByTestId('home-marker')).toBeInTheDocument()
  })

  it('blocks submit when BOTH fields are empty: login NOT called, both validation messages shown', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(
      screen.getByRole('button', { name: /sign ?in|log ?in/i }),
    )

    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
    // No navigation occurred.
    expect(screen.queryByTestId('home-marker')).not.toBeInTheDocument()
  })

  it('blocks submit when password is empty: login NOT called, password validation shown', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.click(
      screen.getByRole('button', { name: /sign ?in|log ?in/i }),
    )

    expect(await screen.findByText('Password is required')).toBeInTheDocument()
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('blocks submit when email is empty: login NOT called, email validation shown', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/password/i), 's3cret-pass')
    await user.click(
      screen.getByRole('button', { name: /sign ?in|log ?in/i }),
    )

    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.queryByText('Password is required')).not.toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('shows "Invalid credentials" and does NOT navigate when login rejects with ApiError 401', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValueOnce(
      new ApiError('Request failed with status 401', { status: 401 }),
    )
    renderForm()

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong-pass')
    await user.click(
      screen.getByRole('button', { name: /sign ?in|log ?in/i }),
    )

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
    expect(mockLogin).toHaveBeenCalledTimes(1)
    // Still on the login form: navigation to "/" must NOT have happened.
    expect(screen.queryByTestId('home-marker')).not.toBeInTheDocument()
  })
})
