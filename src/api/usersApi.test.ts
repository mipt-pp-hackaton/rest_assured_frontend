import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { tokenStorage } from '../auth/tokenStorage'
import type { UserRead } from './types'
// Import the not-yet-existing module so this suite FAILS in the RED phase.
import { createUser } from './usersApi'

/**
 * ---------------------------------------------------------------------------
 * ADMIN USER-CREATION CONTRACT (RED phase) for src/api/usersApi.ts
 * ---------------------------------------------------------------------------
 * The backend exposes no dedicated admin user endpoint, so admin user creation
 * reuses POST /api/auth/register. Unlike the PUBLIC self-service `register()`
 * (which strips is_superuser and sends no token), `createUser`:
 *
 *   createUser(input: { email, password, is_superuser }): Promise<UserRead>
 *     - POST `${VITE_API_BASE_URL}/api/auth/register`, JSON body.
 *     - Body carries email, password AND is_superuser verbatim (so an admin can
 *       create another admin).
 *     - Goes through `authedRequest`, so the caller's bearer token is attached
 *       (admin action). Resolves with the created UserRead.
 * ---------------------------------------------------------------------------
 */

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`

const CREATED: UserRead = {
  id: 200,
  email: 'created@example.com',
  is_active: true,
  is_superuser: false,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
}

beforeEach(() => {
  tokenStorage.clear()
})
afterEach(() => {
  tokenStorage.clear()
})

describe('usersApi.createUser()', () => {
  it('POSTs JSON {email,password,is_superuser} to /api/auth/register and returns the UserRead', async () => {
    let seenContentType: string | null = null
    let seenBody: Record<string, unknown> | undefined

    server.use(
      http.post(url('/api/auth/register'), async ({ request: req }) => {
        seenContentType = req.headers.get('Content-Type')
        seenBody = (await req.json()) as Record<string, unknown>
        return HttpResponse.json(CREATED, { status: 201 })
      }),
    )

    const result = await createUser({
      email: 'created@example.com',
      password: 'super-secret-pw',
      is_superuser: false,
    })

    expect(seenContentType).toMatch(/application\/json/)
    expect(seenBody).toMatchObject({
      email: 'created@example.com',
      password: 'super-secret-pw',
      is_superuser: false,
    })
    expect(result).toEqual(CREATED)
  })

  it('forwards is_superuser:true so an admin can create another admin', async () => {
    let seenBody: Record<string, unknown> | undefined
    server.use(
      http.post(url('/api/auth/register'), async ({ request: req }) => {
        seenBody = (await req.json()) as Record<string, unknown>
        return HttpResponse.json({ ...CREATED, is_superuser: true }, { status: 201 })
      }),
    )

    await createUser({
      email: 'admin2@example.com',
      password: 'super-secret-pw',
      is_superuser: true,
    })

    expect(seenBody?.is_superuser).toBe(true)
  })

  it('attaches the stored bearer token (authenticated admin action)', async () => {
    tokenStorage.setTokens({ access: 'admin-access', refresh: 'admin-refresh' })
    let seenAuth: string | null = null
    server.use(
      http.post(url('/api/auth/register'), ({ request: req }) => {
        seenAuth = req.headers.get('Authorization')
        return HttpResponse.json(CREATED, { status: 201 })
      }),
    )

    await createUser({
      email: 'created@example.com',
      password: 'super-secret-pw',
      is_superuser: false,
    })

    expect(seenAuth).toBe('Bearer admin-access')
  })
})
