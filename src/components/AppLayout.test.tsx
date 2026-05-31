import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { UserRead } from '../api/types'

// ---------------------------------------------------------------------------
// T17 AppLayout CONTRACT
//
// src/components/AppLayout.tsx — default export, no props.
//   - Renders <NavBar /> (the shared authenticated navigation).
//   - Renders an <Outlet /> so child routes render INSIDE the layout.
//   - Designed to be a layout route nested under <ProtectedRoute /> in
//     src/router.tsx (see ROUTER WIRING note in the QA report). When used as a
//     layout route, the dashboard/services/incidents pages render through its
//     Outlet, sharing the NavBar.
//
// AUTH STRATEGY: NavBar (rendered by AppLayout) calls useAuth(); we mock it so
// no AuthProvider / network is needed. This keeps the layout test focused on
// the NavBar-plus-Outlet composition and is safe under
// onUnhandledRequest:'error'.
// ---------------------------------------------------------------------------

const mockUser: UserRead = {
  id: 7,
  email: 'layout@example.com',
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
    logout: vi.fn(),
  }),
}))

// Import AFTER the mock is registered.
import AppLayout from './AppLayout'

function renderLayoutAt(initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <div data-testid="child-home" /> },
          {
            path: 'services',
            element: <div data-testid="child-services" />,
          },
        ],
      },
      { path: '/login', element: <div data-testid="login-marker" /> },
    ],
    { initialEntries: [initialPath] },
  )
  return render(<RouterProvider router={router} />)
}

describe('AppLayout', () => {
  it('renders the NavBar (shared navigation) for child routes', () => {
    renderLayoutAt('/')
    // NavBar identity proven via its nav links + user email.
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /services/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /incidents/i })).toBeInTheDocument()
    expect(screen.getByText('layout@example.com')).toBeInTheDocument()
  })

  it('renders the index child route content inside its <Outlet />', () => {
    renderLayoutAt('/')
    expect(screen.getByTestId('child-home')).toBeInTheDocument()
  })

  it('renders a nested child route content inside its <Outlet />', () => {
    renderLayoutAt('/services')
    expect(screen.getByTestId('child-services')).toBeInTheDocument()
    // NavBar still present alongside the routed child -> shared shell.
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  })
})
