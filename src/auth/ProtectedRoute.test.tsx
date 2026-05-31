import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { AuthContextValue, AuthStatus } from './authContextValue'

// ---------------------------------------------------------------------------
// T14 PROTECTED ROUTE GUARD CONTRACT (unit)
//
// ProtectedRoute (src/auth/ProtectedRoute.tsx — to be implemented) is a route
// guard used as a LAYOUT route element. It consumes useAuth() and:
//   - status 'loading'         -> renders a loading indicator
//                                  (data-testid="auth-loading"); does NOT
//                                  redirect.
//   - status 'unauthenticated' -> redirects to /login via <Navigate to="/login">.
//   - status 'authenticated'   -> renders its protected children, i.e. the
//                                  nested route's <Outlet />.
//
// We mock useAuth so the auth status is fully deterministic and no network /
// AuthProvider is needed (robust against MSW onUnhandledRequest:'error').
// ---------------------------------------------------------------------------

// Controllable auth status for the mocked useAuth.
let mockStatus: AuthStatus = 'unauthenticated'

vi.mock('./useAuth', () => ({
  useAuth: (): AuthContextValue => ({
    user: null,
    status: mockStatus,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

// Imported AFTER vi.mock so the component picks up the mocked useAuth.
import { ProtectedRoute } from './ProtectedRoute'

function renderGuardAt(initialPath: string) {
  // ProtectedRoute is mounted as a layout route; its protected child renders
  // an Outlet-driven marker. A sibling /login route lets us assert redirects.
  const router = createMemoryRouter(
    [
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/', element: <div data-testid="protected-child">secret</div> },
        ],
      },
      { path: '/login', element: <div data-testid="login-page">login</div> },
    ],
    { initialEntries: [initialPath] },
  )
  return render(<RouterProvider router={router} />)
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockStatus = 'unauthenticated'
  })

  it('renders the protected child when authenticated', async () => {
    mockStatus = 'authenticated'
    renderGuardAt('/')
    expect(await screen.findByTestId('protected-child')).toBeInTheDocument()
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })

  it('redirects to /login when unauthenticated', async () => {
    mockStatus = 'unauthenticated'
    renderGuardAt('/')
    expect(await screen.findByTestId('login-page')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-child')).not.toBeInTheDocument()
  })

  it('shows a loading indicator and does NOT redirect while loading', async () => {
    mockStatus = 'loading'
    renderGuardAt('/')
    expect(await screen.findByTestId('auth-loading')).toBeInTheDocument()
    // Must not redirect away to login nor leak the protected child.
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
    expect(screen.queryByTestId('protected-child')).not.toBeInTheDocument()
  })
})
