import { createContext } from 'react'
import type { UserRead } from '../api/types'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  user: UserRead | null
  status: AuthStatus
  login(username: string, password: string): Promise<void>
  logout(): void
}

/**
 * Auth context. `undefined` is the sentinel for "no provider above me", which
 * lets `useAuth` throw a clear error when used outside an `AuthProvider`.
 *
 * Kept in a component-free module so the provider file can satisfy
 * react-refresh's "components only" rule for Fast Refresh.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
