import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

/**
 * Layout route guard for protected routes.
 *
 * - status 'loading'         -> render a loading indicator, do NOT redirect.
 * - status 'unauthenticated' -> redirect to /login.
 * - status 'authenticated'   -> render the nested routes via <Outlet />.
 */
export function ProtectedRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return <div data-testid="auth-loading" />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
