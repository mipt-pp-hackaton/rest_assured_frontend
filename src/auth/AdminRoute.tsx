import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

/**
 * Layout route guard for superuser-only routes (e.g. /users/new).
 *
 * Sits inside the authenticated area but defends in depth:
 *   - status 'loading'                   -> loading indicator, no redirect.
 *   - status 'unauthenticated'           -> redirect to /login.
 *   - authenticated, NOT is_superuser     -> redirect to "/" (back to dashboard).
 *   - authenticated AND is_superuser      -> render nested routes via <Outlet />.
 *
 * This is UI gating only; the backend remains the source of truth for who may
 * actually create users.
 */
export function AdminRoute() {
  const { status, user } = useAuth()

  if (status === 'loading') {
    return <div data-testid="auth-loading" />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  if (!user?.is_superuser) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
