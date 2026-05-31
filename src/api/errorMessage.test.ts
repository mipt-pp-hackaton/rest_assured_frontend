import { describe, it, expect } from 'vitest'
import { ApiError } from './errors'
// Not-yet-existing module so this suite FAILS in the RED phase.
import { describeApiError } from './errorMessage'

/**
 * describeApiError(err: unknown): string
 *
 * Converts any thrown value (ApiError or otherwise) into a concise, user-facing
 * message so non-2xx responses are never swallowed silently. Status-aware:
 *   - transport failure (isNetworkError) -> network message
 *   - 401 -> session/sign-in message
 *   - 403 -> permission message
 *   - 404 -> not-found message (mentions 404)
 *   - 422 -> validation message; includes the first detail.msg when present
 *   - 5xx -> server-error message (mentions the status)
 *   - other 4xx -> generic request-failed message (mentions the status)
 *   - non-ApiError -> generic unexpected-error message
 */
describe('describeApiError', () => {
  it('describes a transport/network failure', () => {
    const msg = describeApiError(new ApiError('x', { isNetworkError: true }))
    expect(msg).toMatch(/network/i)
  })

  it('describes a 401 as a session problem', () => {
    expect(describeApiError(new ApiError('x', { status: 401 }))).toMatch(
      /session|sign in/i,
    )
  })

  it('describes a 403 as a permission problem', () => {
    expect(describeApiError(new ApiError('x', { status: 403 }))).toMatch(
      /permission/i,
    )
  })

  it('describes a 404 and mentions the code', () => {
    const msg = describeApiError(new ApiError('x', { status: 404 }))
    expect(msg).toMatch(/not found/i)
    expect(msg).toContain('404')
  })

  it('describes a 422 and surfaces the first detail message', () => {
    const msg = describeApiError(
      new ApiError('x', {
        status: 422,
        detail: [{ loc: ['body', 'email'], msg: 'value is not a valid email', type: 'value_error' }],
      }),
    )
    expect(msg).toMatch(/value is not a valid email/i)
  })

  it('describes a 422 without detail as a validation error', () => {
    const msg = describeApiError(new ApiError('x', { status: 422 }))
    expect(msg).toMatch(/valid|422/i)
  })

  it('describes a 500 as a server error mentioning the status', () => {
    const msg = describeApiError(new ApiError('x', { status: 500 }))
    expect(msg).toMatch(/server error/i)
    expect(msg).toContain('500')
  })

  it('describes a 503 as a server error mentioning the status', () => {
    const msg = describeApiError(new ApiError('x', { status: 503 }))
    expect(msg).toMatch(/server error/i)
    expect(msg).toContain('503')
  })

  it('describes another 4xx generically and mentions the status', () => {
    const msg = describeApiError(new ApiError('x', { status: 418 }))
    expect(msg).toContain('418')
  })

  it('describes a non-ApiError value generically', () => {
    expect(describeApiError(new Error('boom'))).toMatch(/unexpected|wrong/i)
    expect(describeApiError('weird')).toMatch(/unexpected|wrong/i)
  })

  it('caps an oversized 422 detail message', () => {
    const huge = 'a'.repeat(1000)
    const msg = describeApiError(new ApiError('x', { status: 422, detail: [{ loc: [], msg: huge, type: 't' }] }))
    expect(msg.length).toBeLessThan(300)
  })
})
