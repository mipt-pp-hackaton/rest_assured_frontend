import { request } from './httpClient'
import type { TokenPair, UserCreateInput, UserRead } from './types'

/**
 * Auth endpoints for the rest-assured backend.
 *
 * `login` sends an `application/x-www-form-urlencoded` body (OAuth2 password
 * flow); the URLSearchParams body lets fetch set that Content-Type itself, so
 * httpClient leaves it untouched. The other endpoints exchange JSON.
 */

/** POST /api/auth/login — OAuth2 password grant (urlencoded). */
export async function login(
  username: string,
  password: string,
): Promise<TokenPair> {
  const body = new URLSearchParams()
  body.set('username', username)
  body.set('password', password)
  return (await request<TokenPair>('/api/auth/login', {
    method: 'POST',
    body,
  })) as TokenPair
}

/** POST /api/auth/register — create a user (JSON). */
export async function register(body: UserCreateInput): Promise<UserRead> {
  return (await request<UserRead>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })) as UserRead
}

/** POST /api/auth/refresh — exchange a refresh token for a new TokenPair. */
export async function refresh(refreshToken: string): Promise<TokenPair> {
  return (await request<TokenPair>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })) as TokenPair
}

/** GET /api/auth/me — the currently authenticated user. */
export async function me(): Promise<UserRead> {
  return (await request<UserRead>('/api/auth/me')) as UserRead
}
