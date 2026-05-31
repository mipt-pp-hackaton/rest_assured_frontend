import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as authApi from '../api/authApi'
import type { UserRead } from '../api/types'
import { tokenStorage } from './tokenStorage'
import { AuthContext, type AuthStatus } from './authContextValue'

export function AuthProvider({ children }: { children: ReactNode }) {
  const hasToken = tokenStorage.getAccessToken() != null
  const [user, setUser] = useState<UserRead | null>(null)
  const [status, setStatus] = useState<AuthStatus>(
    hasToken ? 'loading' : 'unauthenticated',
  )

  // Guards against double-invocation of the mount effect (React 18 StrictMode)
  // triggering a second /me request.
  const bootstrapped = useRef(false)

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true

    if (tokenStorage.getAccessToken() == null) return

    let active = true
    void (async () => {
      try {
        const me = await authApi.me()
        if (!active) return
        setUser(me)
        setStatus('authenticated')
      } catch {
        if (!active) return
        tokenStorage.clear()
        setUser(null)
        setStatus('unauthenticated')
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const tokens = await authApi.login(username, password)
    tokenStorage.setTokens({
      access: tokens.access_token,
      refresh: tokens.refresh_token,
    })
    try {
      const me = await authApi.me()
      setUser(me)
      setStatus('authenticated')
    } catch (err) {
      // me() failed after tokens were stored — don't leave partial-auth
      // limbo. Mirror the bootstrap effect's clear-on-failure pattern and
      // re-throw so the login form can surface the error.
      tokenStorage.clear()
      setUser(null)
      setStatus('unauthenticated')
      throw err
    }
  }, [])

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
