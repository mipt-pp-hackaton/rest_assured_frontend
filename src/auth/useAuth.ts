import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './authContextValue'

/**
 * Access the auth state and actions provided by `AuthProvider`.
 * Throws if called outside of an `AuthProvider`.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
