import { request } from './httpClient'
import { ApiError } from './errors'
import { tokenStorage } from '../auth/tokenStorage'
import { refresh } from './authApi'
import type { TokenPair } from './types'

/**
 * Authenticated request wrapper around httpClient.
 *
 * Attaches `Authorization: Bearer <access>` from tokenStorage, and on a 401
 * transparently refreshes the token pair and retries the original request once.
 *
 * Single-flight: concurrent 401s share a single in-flight refresh promise so
 * the backend only sees one /api/auth/refresh call. The promise is reset once
 * it settles, so the next 401 starts a fresh refresh.
 */

// Process-wide singleton: this single-flight latch is only safe because every
// caller reads the same singleton `tokenStorage`. In a single-user SPA there is
// exactly one active token pair, so collapsing concurrent refreshes onto one
// shared promise can never mix credentials across users.
let pendingRefresh: Promise<TokenPair> | null = null

function refreshOnce(refreshToken: string): Promise<TokenPair> {
  if (pendingRefresh === null) {
    pendingRefresh = refresh(refreshToken).finally(() => {
      pendingRefresh = null
    })
  }
  return pendingRefresh
}

function withAuthHeader(
  options: RequestInit,
  accessToken: string | null,
): RequestInit {
  const headers = new Headers(options.headers)
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  return { ...options, headers }
}

export async function authedRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T | undefined> {
  const accessToken = tokenStorage.getAccessToken()

  try {
    return await request<T>(path, withAuthHeader(options, accessToken))
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) {
      throw err
    }

    const refreshToken = tokenStorage.getRefreshToken()
    if (!refreshToken) {
      throw err
    }

    let tokens: TokenPair
    try {
      tokens = await refreshOnce(refreshToken)
    } catch {
      // Refresh failed — wipe tokens and surface the original 401.
      tokenStorage.clear()
      throw err
    }

    tokenStorage.setTokens({
      access: tokens.access_token,
      refresh: tokens.refresh_token,
    })

    return await request<T>(path, withAuthHeader(options, tokens.access_token))
  }
}
