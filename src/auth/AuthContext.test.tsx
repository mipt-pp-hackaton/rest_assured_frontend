import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { render, screen, waitFor, userEvent } from '../test/test-utils'
import { tokenStorage } from './tokenStorage'
import type { UserRead } from '../api/types'
// Import from the not-yet-existing modules so these tests fail (RED).
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'

/**
 * Contracts under test (RED phase):
 *
 *   <AuthProvider>{children}</AuthProvider>
 *     - React provider component that manages auth state and exposes it via
 *       context. Only prop asserted is `children: ReactNode`.
 *
 *   useAuth(): {
 *     user: UserRead | null
 *     status: 'loading' | 'authenticated' | 'unauthenticated'
 *     login(username: string, password: string): Promise<void>
 *     logout(): void
 *   }
 */

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`

const USER: UserRead = {
  id: 7,
  email: 'me@example.com',
  is_active: true,
  is_superuser: false,
  created_at: '2026-02-02T00:00:00Z',
  updated_at: '2026-02-02T00:00:00Z',
}

const TOKENS = {
  access_token: 'acc-1',
  refresh_token: 'ref-1',
  token_type: 'bearer',
}

// Small consumer that surfaces the hook's state and exposes login/logout buttons.
function Consumer() {
  const { user, status, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <button onClick={() => void login('me@example.com', 'super-secret')}>
        login
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

function renderConsumer() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>
  )
}

beforeEach(() => {
  tokenStorage.clear()
})

describe('AuthProvider + useAuth', () => {
  it('on mount WITH a stored access token: fetches /me and becomes authenticated', async () => {
    tokenStorage.setTokens({ access: 'acc-1', refresh: 'ref-1' })

    let meCalls = 0
    server.use(
      http.get(url('/api/auth/me'), () => {
        meCalls += 1
        return HttpResponse.json(USER, { status: 200 })
      })
    )

    renderConsumer()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    )
    expect(screen.getByTestId('email')).toHaveTextContent('me@example.com')
    expect(meCalls).toBe(1)
  })

  it('on mount WITHOUT a token: unauthenticated, user null, no /me call', async () => {
    let meCalls = 0
    server.use(
      http.get(url('/api/auth/me'), () => {
        meCalls += 1
        return HttpResponse.json(USER, { status: 200 })
      })
    )

    renderConsumer()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    )
    expect(screen.getByTestId('email')).toHaveTextContent('none')
    expect(meCalls).toBe(0)
  })

  it('login(): stores tokens, loads the user via /me, becomes authenticated', async () => {
    server.use(
      http.post(url('/api/auth/login'), () =>
        HttpResponse.json(TOKENS, { status: 200 })
      ),
      http.get(url('/api/auth/me'), () => HttpResponse.json(USER, { status: 200 }))
    )

    const user = userEvent.setup()
    renderConsumer()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    )

    await user.click(screen.getByRole('button', { name: 'login' }))

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    )
    expect(screen.getByTestId('email')).toHaveTextContent('me@example.com')
    expect(tokenStorage.getAccessToken()).toBe('acc-1')
    expect(tokenStorage.getRefreshToken()).toBe('ref-1')
  })

  it('logout(): clears tokenStorage and resets to unauthenticated/user null', async () => {
    tokenStorage.setTokens({ access: 'acc-1', refresh: 'ref-1' })

    server.use(
      http.get(url('/api/auth/me'), () => HttpResponse.json(USER, { status: 200 }))
    )

    const user = userEvent.setup()
    renderConsumer()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    )

    await user.click(screen.getByRole('button', { name: 'logout' }))

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    )
    expect(screen.getByTestId('email')).toHaveTextContent('none')
    expect(tokenStorage.getAccessToken()).toBeNull()
    expect(tokenStorage.getRefreshToken()).toBeNull()
  })

  it('exposes a loading status while /me is in flight on mount', async () => {
    tokenStorage.setTokens({ access: 'acc-1', refresh: 'ref-1' })

    let resolveMe: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      resolveMe = resolve
    })

    server.use(
      http.get(url('/api/auth/me'), async () => {
        await gate
        return HttpResponse.json(USER, { status: 200 })
      })
    )

    renderConsumer()

    // While /me is in flight, status should be 'loading'.
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('loading')
    )

    resolveMe?.()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    )
  })
})
