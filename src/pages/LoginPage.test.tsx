import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { AuthContextValue } from '../auth/authContextValue'

// ---------------------------------------------------------------------------
// T15 LOGIN PAGE CONTRACT
//
// LoginPage (src/pages/LoginPage.tsx) MUST:
//   - keep the data-testid="login-page" marker (the router wiring suite in
//     src/router.test.tsx identifies the active route by it).
//   - render the LoginForm, so its email + password fields are present.
//
// useAuth is mocked so the embedded LoginForm needs no network / AuthProvider.
// ---------------------------------------------------------------------------

vi.mock('../auth/useAuth', () => ({
  useAuth: (): AuthContextValue => ({
    user: null,
    status: 'unauthenticated',
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
  }),
}))

import LoginPage from './LoginPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('keeps the login-page marker for router wiring', () => {
    renderPage()
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('renders the login form (email + password fields)', () => {
    renderPage()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })
})
