import { authedRequest } from './authInterceptor'
import type { UserCreate, UserRead } from './types'

/**
 * Admin user management.
 *
 * The backend exposes no dedicated admin user endpoint, so creating a user
 * reuses POST /api/auth/register. This differs from the PUBLIC self-service
 * `register()` in `authApi` in two deliberate ways:
 *   1. It goes through `authedRequest`, attaching the admin's bearer token —
 *      this is an authenticated admin action, gated by AdminRoute in the UI.
 *   2. It forwards `is_superuser`, so an admin may create another admin. The
 *      public register path still strips that field (no self-promotion).
 */

/** POST /api/auth/register (admin) — create a user, optionally as a superuser. */
export async function createUser(input: UserCreate): Promise<UserRead> {
  return (await authedRequest<UserRead>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      is_superuser: input.is_superuser,
    }),
  })) as UserRead
}
