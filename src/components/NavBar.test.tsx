import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createMemoryRouter,
  RouterProvider,
  Outlet,
} from 'react-router-dom'
import type { UserRead } from '../api/types'

// ---------------------------------------------------------------------------
// T17 NavBar CONTRACT
//
// src/components/NavBar.tsx — default export, no props.
//   - Renders <nav> with three navigation links (role 'link'):
//       Dashboard -> href "/"
//       Services  -> href "/services"
//       Incidents -> href "/incidents"
//   - Reads the authenticated user via useAuth() and renders the current
//     user's email (useAuth().user.email) somewhere in the bar.
//   - Renders a Logout button (role 'button', accessible name /logout/i)
//     that calls auth.logout() when clicked.
//
// AUTH STRATEGY: we mock '../auth/useAuth' so the component receives a
// deterministic authenticated user plus a logout spy. This keeps the suite
// independent of AuthProvider bootstrap timing and avoids any network call,
// which matters under MSW onUnhandledRequest:'error'.
//
// LOGOUT ASSERTION: we render NavBar inside a router that ALSO has a "/login"
// marker route. The real <AuthProvider> logout() flips status to
// 'unauthenticated' and a real ProtectedRoute would <Navigate> to /login; here
// useAuth is mocked, so we assert BOTH that the logout spy was called and that
// the app navigates to /login. NavBar itself is responsible for navigating to
// "/login" after logout (e.g. via useNavigate) so an authenticated shell does
// not get stuck. We assert the "/login" marker appears.
// ---------------------------------------------------------------------------

const logoutSpy = vi.fn()

const mockUser: UserRead = {
  id: 1,
  email: 'navuser@example.com',
  is_active: true,
  is_superuser: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    status: 'authenticated' as const,
    login: vi.fn(),
    logout: logoutSpy,
  }),
}))

// Import AFTER the mock is registered.
import NavBar from './NavBar'

function renderNavBar(initialPath = '/') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <>
            <NavBar />
            <Outlet />
          </>
        ),
        children: [
          { index: true, element: <div data-testid="home-marker" /> },
          { path: 'services', element: <div data-testid="services-marker" /> },
          {
            path: 'incidents',
            element: <div data-testid="incidents-marker" />,
          },
        ],
      },
      { path: '/login', element: <div data-testid="login-marker" /> },
    ],
    { initialEntries: [initialPath] },
  )
  return render(<RouterProvider router={router} />)
}

describe('NavBar', () => {
  beforeEach(() => {
    logoutSpy.mockClear()
  })

  it('renders a Dashboard link pointing to "/"', () => {
    renderNavBar()
    const link = screen.getByRole('link', { name: /dashboard/i })
    expect(link).toHaveAttribute('href', '/')
  })

  it('renders a Services link pointing to "/services"', () => {
    renderNavBar()
    const link = screen.getByRole('link', { name: /services/i })
    expect(link).toHaveAttribute('href', '/services')
  })

  it('renders an Incidents link pointing to "/incidents"', () => {
    renderNavBar()
    const link = screen.getByRole('link', { name: /incidents/i })
    expect(link).toHaveAttribute('href', '/incidents')
  })

  it('shows the current user email from useAuth().user.email', () => {
    renderNavBar()
    expect(screen.getByText('navuser@example.com')).toBeInTheDocument()
  })

  it('renders a Logout button', () => {
    renderNavBar()
    expect(
      screen.getByRole('button', { name: /logout/i }),
    ).toBeInTheDocument()
  })

  it('calls auth.logout() and navigates to /login when Logout is clicked', async () => {
    const user = userEvent.setup()
    renderNavBar('/')

    await user.click(screen.getByRole('button', { name: /logout/i }))

    expect(logoutSpy).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.getByTestId('login-marker')).toBeInTheDocument()
    })
  })
})
