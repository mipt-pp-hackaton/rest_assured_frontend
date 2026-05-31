import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { request } from './httpClient'
import { ApiError } from './errors'
import type { HTTPValidationError } from './types'

/**
 * Contract under test (RED phase):
 *
 *   request<T>(path: string, options?: RequestInit): Promise<T | undefined>
 *     - Targets `${import.meta.env.VITE_API_BASE_URL}${path}`.
 *     - 2xx with a JSON body  -> resolves with the parsed body (typed as T).
 *     - 204 No Content        -> resolves with `undefined`, never calls .json().
 *     - non-2xx               -> rejects with `ApiError`.
 *     - fetch/network failure -> rejects with `ApiError` (isNetworkError === true).
 *
 *   class ApiError extends Error {
 *     status: number               // HTTP status (0 for network failures)
 *     detail?: ValidationError[]   // parsed HTTPValidationError.detail (422)
 *     isNetworkError: boolean      // true only for transport-level failures
 *   }
 *
 * The base URL is read from import.meta.env.VITE_API_BASE_URL (configured via
 * .env.test) so assertions stay in lockstep with the client's own resolution.
 */

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`

describe('request()', () => {
  it('resolves with the parsed body for a 200 JSON response', async () => {
    const body = { id: 7, name: 'svc', nested: { ok: true } }
    server.use(
      http.get(url('/things/7'), () => HttpResponse.json(body, { status: 200 }))
    )

    const result = await request<typeof body>('/things/7')
    expect(result).toEqual(body)
  })

  it('targets VITE_API_BASE_URL + path (intercepted request URL)', async () => {
    let seenUrl: string | undefined
    server.use(
      http.get(url('/echo/url'), ({ request: req }) => {
        seenUrl = req.url
        return HttpResponse.json({ ok: true })
      })
    )

    await request('/echo/url')
    expect(seenUrl).toBe(url('/echo/url'))
    expect(seenUrl).toMatch(/^https?:\/\//)
  })

  it('rejects with ApiError (status 422, parsed detail array) for an HTTPValidationError body', async () => {
    const validationBody: HTTPValidationError = {
      detail: [
        { loc: ['body', 'email'], msg: 'value is not a valid email address', type: 'value_error' },
        { loc: ['body', 'password'], msg: 'too short', type: 'string_too_short' },
      ],
    }
    server.use(
      http.post(url('/users'), () => HttpResponse.json(validationBody, { status: 422 }))
    )

    const err = await request('/users', { method: 'POST' }).then(
      () => {
        throw new Error('expected request() to reject')
      },
      (e) => e as unknown
    )

    expect(err).toBeInstanceOf(ApiError)
    const apiErr = err as ApiError
    expect(apiErr.status).toBe(422)
    expect(apiErr.isNetworkError).toBe(false)
    expect(Array.isArray(apiErr.detail)).toBe(true)
    expect(apiErr.detail).toEqual(validationBody.detail)
    expect(apiErr.detail?.[0]).toEqual({
      loc: ['body', 'email'],
      msg: 'value is not a valid email address',
      type: 'value_error',
    })
  })

  it('resolves with undefined for 204 No Content and does NOT parse JSON', async () => {
    server.use(
      http.delete(url('/things/9'), () => new HttpResponse(null, { status: 204 }))
    )

    const result = await request('/things/9', { method: 'DELETE' })
    expect(result).toBeUndefined()
  })

  it('rejects with ApiError carrying status 500 on a server error', async () => {
    server.use(
      http.get(url('/boom'), () => HttpResponse.json({ detail: 'nope' }, { status: 500 }))
    )

    const err = await request('/boom').then(
      () => {
        throw new Error('expected request() to reject')
      },
      (e) => e as unknown
    )

    expect(err).toBeInstanceOf(ApiError)
    const apiErr = err as ApiError
    expect(apiErr.status).toBe(500)
    expect(apiErr.isNetworkError).toBe(false)
  })

  it('rejects with ApiError carrying isNetworkError on a transport failure', async () => {
    server.use(
      http.get(url('/offline'), () => HttpResponse.error())
    )

    const err = await request('/offline').then(
      () => {
        throw new Error('expected request() to reject')
      },
      (e) => e as unknown
    )

    expect(err).toBeInstanceOf(ApiError)
    const apiErr = err as ApiError
    expect(apiErr.isNetworkError).toBe(true)
  })

  it('does NOT force application/json for a URLSearchParams body (keeps urlencoded)', async () => {
    let seenContentType: string | null = null
    let seenBody: string | undefined
    server.use(
      http.post(url('/login'), async ({ request: req }) => {
        seenContentType = req.headers.get('Content-Type')
        seenBody = await req.text()
        return HttpResponse.json({ ok: true }, { status: 200 })
      })
    )

    const form = new URLSearchParams({ username: 'a@b.c', password: 'pw' })
    await request('/login', { method: 'POST', body: form })

    expect(seenContentType).toMatch(/application\/x-www-form-urlencoded/)
    expect(seenContentType).not.toMatch(/application\/json/)
    expect(seenBody).toBe('username=a%40b.c&password=pw')
  })

  it('resolves with undefined for a 200 with an empty body (does not throw)', async () => {
    server.use(
      http.get(url('/empty'), () => new HttpResponse(null, { status: 200 }))
    )

    const result = await request('/empty')
    expect(result).toBeUndefined()
  })
})
