import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { AuthContextValue, AuthStatus } from './authContextValue'
import type { UserRead } from '../api/types'

/**
 * ---------------------------------------------------------------------------
 * ADMIN ROUTE GUARD CONTRACT (RED phase) for src/auth/AdminRoute.tsx
 * ---------------------------------------------------------------------------
 * AdminRoute is a LAYOUT route element used to gate superuser-only routes. It
 * is mounted INSIDE the authenticated area, but defends in depth on its own:
 *   - status 'loading'                  -> loading indicator (data-testid
 *                                          "auth-loading"); does NOT redirect.
 *   - status 'unauthenticated'          -> <Navigate to="/login">.
 *   - authenticated but NOT is_superuser -> <Navigate to="/"> (bounce non-admins
 *                                          back to the dashboard).
 *   - authenticated AND is_superuser     -> renders nested routes via <Outlet />.
 *
 * useAuth is mocked for deterministic auth state (no network / AuthProvider).
 * ---------------------------------------------------------------------------
 */

let mockStatus: AuthStatus = 'authenticated'
let mockUser: UserRead | null = null

vi.mock('./useAuth', () => ({
  useAuth: (): AuthContextValue => ({
    user: mockUser,
    status: mockStatus,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

// Imported AFTER vi.mock so the component picks up the mocked useAuth.
import { AdminRoute } from './AdminRoute'

const adminUser: UserRead = {
  id: 1,
  email: 'admin@example.com',
  is_active: true,
  is_superuser: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}
const normalUser: UserRead = { ...adminUser, id: 2, email: 'user@example.com', is_superuser: false }

function renderGuard() {
  const router = createMemoryRouter(
    [
      {
        element: <AdminRoute />,
        children: [
          { path: '/admin', element: <div data-testid="admin-child">secret admin</div> },
        ],
      },
      { path: '/', element: <div data-testid="home-marker">home</div> },
      { path: '/login', element: <div data-testid="login-marker">login</div> },
    ],
    { initialEntries: ['/admin'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('AdminRoute', () => {
  beforeEach(() => {
    mockStatus = 'authenticated'
    mockUser = null
  })

  it('renders the nested admin route for an authenticated superuser', async () => {
    mockStatus = 'authenticated'
    mockUser = adminUser
    renderGuard()
    expect(await screen.findByTestId('admin-child')).toBeInTheDocument()
    expect(screen.queryByTestId('home-marker')).not.toBeInTheDocument()
    expect(screen.queryByTestId('login-marker')).not.toBeInTheDocument()
  })

  it('redirects an authenticated NON-admin to the dashboard "/"', async () => {
    mockStatus = 'authenticated'
    mockUser = normalUser
    renderGuard()
    expect(await screen.findByTestId('home-marker')).toBeInTheDocument()
    expect(screen.queryByTestId('admin-child')).not.toBeInTheDocument()
  })

  it('redirects an unauthenticated visitor to /login', async () => {
    mockStatus = 'unauthenticated'
    mockUser = null
    renderGuard()
    expect(await screen.findByTestId('login-marker')).toBeInTheDocument()
    expect(screen.queryByTestId('admin-child')).not.toBeInTheDocument()
  })

  it('shows a loading indicator and does NOT redirect while loading', async () => {
    mockStatus = 'loading'
    mockUser = null
    renderGuard()
    expect(await screen.findByTestId('auth-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('admin-child')).not.toBeInTheDocument()
    expect(screen.queryByTestId('home-marker')).not.toBeInTheDocument()
    expect(screen.queryByTestId('login-marker')).not.toBeInTheDocument()
  })
})
