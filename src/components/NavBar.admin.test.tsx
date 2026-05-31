import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, Outlet } from 'react-router-dom'
import type { UserRead } from '../api/types'

/**
 * ---------------------------------------------------------------------------
 * NavBar ADMIN LINK CONTRACT (RED phase)
 * ---------------------------------------------------------------------------
 * NavBar must expose a superuser-only navigation entry to the admin create-user
 * page:
 *   - When useAuth().user.is_superuser === true  -> a link (role 'link') with
 *     accessible name /(new user|users)/i pointing to href "/users/new".
 *   - When is_superuser === false -> that link is ABSENT (normal users never
 *     see admin entry points).
 * The base links (Dashboard/Services/Incidents) and Logout remain regardless.
 * ---------------------------------------------------------------------------
 */

let mockUser: UserRead = {
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
    logout: vi.fn(),
  }),
}))

import NavBar from './NavBar'

function renderNavBar() {
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
          { path: 'users/new', element: <div data-testid="create-user-marker" /> },
        ],
      },
    ],
    { initialEntries: ['/'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('NavBar — admin create-user link', () => {
  beforeEach(() => {
    mockUser = { ...mockUser, is_superuser: false }
  })

  it('shows a link to /users/new for a superuser', () => {
    mockUser = { ...mockUser, is_superuser: true }
    renderNavBar()
    const link = screen.getByRole('link', { name: /(new user|users)/i })
    expect(link).toHaveAttribute('href', '/users/new')
  })

  it('hides the admin link for a non-superuser', () => {
    mockUser = { ...mockUser, is_superuser: false }
    renderNavBar()
    expect(
      screen.queryByRole('link', { name: /(new user|users)/i }),
    ).not.toBeInTheDocument()
    // Base navigation is still present.
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  })
})
