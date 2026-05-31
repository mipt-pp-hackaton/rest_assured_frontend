import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { tokenStorage } from '../auth/tokenStorage'
import { login, register, refresh, me } from './authApi'
import type { TokenPair, UserCreate, UserRead } from './types'

/**
 * Contracts under test (RED phase) for src/api/authApi.ts:
 *
 *   login(username: string, password: string): Promise<TokenPair>
 *     - POST `${VITE_API_BASE_URL}/api/auth/login`
 *     - Body is application/x-www-form-urlencoded with `username` & `password`.
 *     - Resolves with the TokenPair returned by the server.
 *
 *   register(body: UserCreate): Promise<UserRead>
 *     - POST `${VITE_API_BASE_URL}/api/auth/register`
 *     - Body is JSON (application/json) of the UserCreate payload.
 *     - Resolves with the UserRead returned by the server.
 *
 *   refresh(refreshToken: string): Promise<TokenPair>
 *     - POST `${VITE_API_BASE_URL}/api/auth/refresh`
 *     - Body is JSON `{ refresh_token: <refreshToken> }`.
 *     - Resolves with the new TokenPair.
 *
 *   me(): Promise<UserRead>
 *     - GET `${VITE_API_BASE_URL}/api/auth/me`
 *     - Resolves with the UserRead returned by the server.
 */

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`

beforeEach(() => {
  tokenStorage.clear()
})

describe('authApi.login()', () => {
  it('POSTs urlencoded username/password and returns the TokenPair', async () => {
    let seenContentType: string | null = null
    let seenBody: string | undefined
    const tokens: TokenPair = {
      access_token: 'acc-1',
      refresh_token: 'ref-1',
      token_type: 'bearer',
    }

    server.use(
      http.post(url('/api/auth/login'), async ({ request: req }) => {
        seenContentType = req.headers.get('Content-Type')
        seenBody = await req.text()
        return HttpResponse.json(tokens, { status: 200 })
      })
    )

    const result = await login('alice@example.com', 'super-secret')

    expect(seenContentType).toMatch(/application\/x-www-form-urlencoded/)
    expect(seenContentType).not.toMatch(/application\/json/)

    const parsed = new URLSearchParams(seenBody)
    expect(parsed.get('username')).toBe('alice@example.com')
    expect(parsed.get('password')).toBe('super-secret')

    expect(result).toEqual(tokens)
  })
})

describe('authApi.register()', () => {
  it('POSTs JSON UserCreate and returns the UserRead', async () => {
    let seenContentType: string | null = null
    let seenJson: unknown
    const body: UserCreate = {
      email: 'bob@example.com',
      password: 'password123',
      is_superuser: false,
    }
    const created: UserRead = {
      id: 42,
      email: 'bob@example.com',
      is_active: true,
      is_superuser: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    server.use(
      http.post(url('/api/auth/register'), async ({ request: req }) => {
        seenContentType = req.headers.get('Content-Type')
        seenJson = await req.json()
        return HttpResponse.json(created, { status: 201 })
      })
    )

    const result = await register(body)

    expect(seenContentType).toMatch(/application\/json/)
    expect(seenJson).toMatchObject({
      email: 'bob@example.com',
      password: 'password123',
    })
    expect(result).toEqual(created)
  })
})

describe('authApi.refresh()', () => {
  it('POSTs JSON { refresh_token } and returns a new TokenPair', async () => {
    let seenJson: unknown
    const newTokens: TokenPair = {
      access_token: 'acc-2',
      refresh_token: 'ref-2',
      token_type: 'bearer',
    }

    server.use(
      http.post(url('/api/auth/refresh'), async ({ request: req }) => {
        seenJson = await req.json()
        return HttpResponse.json(newTokens, { status: 200 })
      })
    )

    const result = await refresh('ref-1')

    expect(seenJson).toEqual({ refresh_token: 'ref-1' })
    expect(result).toEqual(newTokens)
  })
})

describe('authApi.me()', () => {
  it('GETs /api/auth/me and returns the UserRead', async () => {
    const user: UserRead = {
      id: 7,
      email: 'me@example.com',
      is_active: true,
      is_superuser: true,
      created_at: '2026-02-02T00:00:00Z',
      updated_at: '2026-02-02T00:00:00Z',
    }

    server.use(
      http.get(url('/api/auth/me'), () => HttpResponse.json(user, { status: 200 }))
    )

    const result = await me()
    expect(result).toEqual(user)
  })

  // Regression: me() is an authenticated endpoint, so it must route through
  // authedRequest and attach the stored bearer token. Previously it used the
  // bare `request` and sent no Authorization header, so the post-login /me call
  // 401'd and the UI reported "Invalid credentials".
  it('sends the stored bearer token in the Authorization header', async () => {
    tokenStorage.setTokens({ access: 'acc-xyz', refresh: 'ref-xyz' })
    let seenAuth: string | null = null
    const user: UserRead = {
      id: 7,
      email: 'me@example.com',
      is_active: true,
      is_superuser: true,
      created_at: '2026-02-02T00:00:00Z',
      updated_at: '2026-02-02T00:00:00Z',
    }

    server.use(
      http.get(url('/api/auth/me'), ({ request: req }) => {
        seenAuth = req.headers.get('Authorization')
        return HttpResponse.json(user, { status: 200 })
      })
    )

    const result = await me()

    expect(seenAuth).toBe('Bearer acc-xyz')
    expect(result).toEqual(user)
  })
})
