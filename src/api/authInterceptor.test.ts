import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { tokenStorage } from '../auth/tokenStorage'
import { authedRequest } from './authInterceptor'
import { ApiError } from './errors'
import type { TokenPair } from './types'

/**
 * Contract under test (RED phase) for src/api/authInterceptor.ts:
 *
 *   authedRequest<T>(path: string, options?: RequestInit): Promise<T | undefined>
 *     - Wraps httpClient.request, attaching `Authorization: Bearer <access>`
 *       from tokenStorage.getAccessToken() when an access token exists.
 *     - On a 401 response AND a refresh token present, POSTs to
 *       `/api/auth/refresh`, stores the returned TokenPair via
 *       tokenStorage.setTokens, and retries the ORIGINAL request ONCE with the
 *       new access token; resolves with the retried response.
 *     - SINGLE-FLIGHT: concurrent 401s trigger exactly ONE /api/auth/refresh
 *       call; all queued requests retry with the refreshed access token.
 *     - If refresh itself fails (401), tokenStorage.clear() is called and the
 *       ORIGINAL ApiError (status 401) is propagated.
 */

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`

beforeEach(() => {
  tokenStorage.clear()
})

describe('authedRequest() — Authorization header', () => {
  it('attaches Authorization: Bearer <access> when a token exists', async () => {
    tokenStorage.setTokens({ access: 'access-abc', refresh: 'refresh-xyz' })

    let seenAuth: string | null = null
    server.use(
      http.get(url('/api/services'), ({ request: req }) => {
        seenAuth = req.headers.get('Authorization')
        return HttpResponse.json([{ id: 1 }], { status: 200 })
      })
    )

    const result = await authedRequest<{ id: number }[]>('/api/services')

    expect(seenAuth).toBe('Bearer access-abc')
    expect(result).toEqual([{ id: 1 }])
  })

  it('does not attach an Authorization header when no token is stored', async () => {
    let seenAuth: string | null = 'sentinel'
    server.use(
      http.get(url('/api/public'), ({ request: req }) => {
        seenAuth = req.headers.get('Authorization')
        return HttpResponse.json({ ok: true }, { status: 200 })
      })
    )

    await authedRequest('/api/public')
    expect(seenAuth).toBeNull()
  })
})

describe('authedRequest() — 401 refresh + single retry', () => {
  it('on 401 refreshes once, stores the new tokens, and retries with the new bearer token', async () => {
    tokenStorage.setTokens({ access: 'old-access', refresh: 'good-refresh' })

    const newTokens: TokenPair = {
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      token_type: 'bearer',
    }

    let refreshCalls = 0
    const seenAuthHeaders: (string | null)[] = []

    server.use(
      http.get(url('/api/protected'), ({ request: req }) => {
        const auth = req.headers.get('Authorization')
        seenAuthHeaders.push(auth)
        if (auth === 'Bearer old-access') {
          return new HttpResponse(null, { status: 401 })
        }
        return HttpResponse.json({ secret: 'data' }, { status: 200 })
      }),
      http.post(url('/api/auth/refresh'), () => {
        refreshCalls += 1
        return HttpResponse.json(newTokens, { status: 200 })
      })
    )

    const result = await authedRequest<{ secret: string }>('/api/protected')

    expect(refreshCalls).toBe(1)
    expect(result).toEqual({ secret: 'data' })
    // First attempt with the old token, retry with the refreshed token.
    expect(seenAuthHeaders).toEqual(['Bearer old-access', 'Bearer new-access'])
    // New tokens persisted.
    expect(tokenStorage.getAccessToken()).toBe('new-access')
    expect(tokenStorage.getRefreshToken()).toBe('new-refresh')
  })

  it('coalesces concurrent 401s into exactly ONE refresh call (single-flight)', async () => {
    tokenStorage.setTokens({ access: 'old-access', refresh: 'good-refresh' })

    const newTokens: TokenPair = {
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      token_type: 'bearer',
    }

    let refreshCalls = 0

    server.use(
      http.get(url('/api/a'), ({ request: req }) => {
        const auth = req.headers.get('Authorization')
        if (auth === 'Bearer new-access') return HttpResponse.json({ r: 'a' }, { status: 200 })
        return new HttpResponse(null, { status: 401 })
      }),
      http.get(url('/api/b'), ({ request: req }) => {
        const auth = req.headers.get('Authorization')
        if (auth === 'Bearer new-access') return HttpResponse.json({ r: 'b' }, { status: 200 })
        return new HttpResponse(null, { status: 401 })
      }),
      http.get(url('/api/c'), ({ request: req }) => {
        const auth = req.headers.get('Authorization')
        if (auth === 'Bearer new-access') return HttpResponse.json({ r: 'c' }, { status: 200 })
        return new HttpResponse(null, { status: 401 })
      }),
      http.post(url('/api/auth/refresh'), async () => {
        refreshCalls += 1
        // Small delay so all three 401s land before the refresh resolves,
        // exercising the single-flight queue.
        await new Promise((resolve) => setTimeout(resolve, 10))
        return HttpResponse.json(newTokens, { status: 200 })
      })
    )

    const [a, b, c] = await Promise.all([
      authedRequest<{ r: string }>('/api/a'),
      authedRequest<{ r: string }>('/api/b'),
      authedRequest<{ r: string }>('/api/c'),
    ])

    expect(refreshCalls).toBe(1)
    expect(a).toEqual({ r: 'a' })
    expect(b).toEqual({ r: 'b' })
    expect(c).toEqual({ r: 'c' })
    expect(tokenStorage.getAccessToken()).toBe('new-access')
  })
})

describe('authedRequest() — refresh failure', () => {
  it('clears tokens and propagates the original ApiError when refresh fails (401)', async () => {
    tokenStorage.setTokens({ access: 'old-access', refresh: 'expired-refresh' })

    let protectedCalls = 0
    server.use(
      http.get(url('/api/protected'), () => {
        protectedCalls += 1
        return new HttpResponse(null, { status: 401 })
      }),
      http.post(url('/api/auth/refresh'), () => new HttpResponse(null, { status: 401 }))
    )

    const err = await authedRequest('/api/protected').then(
      () => {
        throw new Error('expected authedRequest() to reject')
      },
      (e) => e as unknown
    )

    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(401)
    // Tokens wiped on failed refresh.
    expect(tokenStorage.getAccessToken()).toBeNull()
    expect(tokenStorage.getRefreshToken()).toBeNull()
    // Original request was attempted (at least once); not retried after failed refresh.
    expect(protectedCalls).toBeGreaterThanOrEqual(1)
  })

  it('does not attempt a refresh on 401 when no refresh token is present', async () => {
    tokenStorage.setTokens({ access: 'orphan-access', refresh: '' })

    let refreshCalls = 0
    server.use(
      http.get(url('/api/protected'), () => new HttpResponse(null, { status: 401 })),
      http.post(url('/api/auth/refresh'), () => {
        refreshCalls += 1
        return new HttpResponse(null, { status: 200 })
      })
    )

    const err = await authedRequest('/api/protected').then(
      () => {
        throw new Error('expected authedRequest() to reject')
      },
      (e) => e as unknown
    )

    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(401)
    expect(refreshCalls).toBe(0)
  })
})
