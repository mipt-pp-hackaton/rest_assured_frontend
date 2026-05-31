import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from './test/server'
import { AuthProvider } from './auth/AuthContext'
import { tokenStorage } from './auth/tokenStorage'

// ---------------------------------------------------------------------------
// T14 GATED ROUTE WIRING CONTRACT
//
// These tests assert that the app router (src/router.tsx) wires each path to a
// page component AND that the protected routes sit behind the ProtectedRoute
// guard. They do NOT assert full page content — placeholder pages expose stable
// data-testid markers so this suite can identify the active route.
//
// REQUIRED data-testid markers per route:
//   "/login"           -> data-testid="login-page"      (PUBLIC)
//   "/register"        -> data-testid="register-page"   (PUBLIC)
//   "/"                -> data-testid="dashboard-page"   (PROTECTED, index)
//   "/services"        -> data-testid="services-page"    (PROTECTED)
//   "/services/:id"    -> data-testid="service-detail-page" (PROTECTED)
//   "/incidents"       -> data-testid="incidents-page"   (PROTECTED)
//   unknown path        -> data-testid="not-found"        (PUBLIC catch-all)
//
// PROTECTED paths require an authenticated context: a stored access token plus
// an MSW GET /api/auth/me handler returning a user, wrapped in AuthProvider so
// the ProtectedRoute guard sees status === 'authenticated'.
//
// The router module MUST export `routes`: an array of react-router-dom v7
// RouteObject definitions in which the protected paths are nested under a
// layout route whose element is <ProtectedRoute />.
// ---------------------------------------------------------------------------

import { routes } from './router'

const API_BASE = import.meta.env.VITE_API_BASE_URL

const fakeUser = {
  id: 1,
  email: 'user@example.com',
  is_active: true,
  is_superuser: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

// Renders the REAL route table at `initialPath`, wrapped in AuthProvider so the
// gate can read auth status. Routing is owned by RouterProvider (createMemory-
// Router controls the initial path), so we use the raw Testing Library render.
function renderAt(initialPath: string) {
  const router = createMemoryRouter(routes, {
    initialEntries: [initialPath],
  })
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

// Make the next render authenticated: store a token AND mock /api/auth/me.
function authenticate() {
  tokenStorage.setTokens({ access: 'test-access', refresh: 'test-refresh' })
  server.use(
    http.get(`${API_BASE}/api/auth/me`, () => HttpResponse.json(fakeUser)),
  )
}

describe('app router wiring', () => {
  beforeEach(() => {
    tokenStorage.clear()
  })

  // -- PUBLIC routes (no auth needed) ---------------------------------------

  it('routes "/login" to the login page', async () => {
    renderAt('/login')
    expect(await screen.findByTestId('login-page')).toBeInTheDocument()
  })

  it('routes "/register" to the register page', async () => {
    renderAt('/register')
    expect(await screen.findByTestId('register-page')).toBeInTheDocument()
  })

  it('routes an unknown path to the not-found page', async () => {
    renderAt('/nope')
    expect(await screen.findByTestId('not-found')).toBeInTheDocument()
  })

  // -- PROTECTED routes (authenticated context) -----------------------------

  it('routes "/" to the dashboard/home page when authenticated', async () => {
    authenticate()
    renderAt('/')
    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument()
  })

  it('routes "/services" to the services list page when authenticated', async () => {
    authenticate()
    renderAt('/services')
    expect(await screen.findByTestId('services-page')).toBeInTheDocument()
  })

  it('routes "/services/:id" to the service detail page when authenticated', async () => {
    authenticate()
    renderAt('/services/1')
    expect(await screen.findByTestId('service-detail-page')).toBeInTheDocument()
  })

  it('routes "/incidents" to the incidents page when authenticated', async () => {
    authenticate()
    renderAt('/incidents')
    expect(await screen.findByTestId('incidents-page')).toBeInTheDocument()
  })

  // -- Gate behavior --------------------------------------------------------

  it('redirects an unauthenticated user from a protected path "/" to login', async () => {
    // No token stored, no /me handler -> AuthProvider starts unauthenticated.
    renderAt('/')
    expect(await screen.findByTestId('login-page')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument()
  })
})
