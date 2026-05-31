import { describe, it, expect } from 'vitest'
import { ApiError } from './errors'
import type { ValidationError } from './types'

/**
 * ApiError shape (RED phase):
 *
 *   new ApiError(message: string, opts?: {
 *     status?: number
 *     detail?: ValidationError[]
 *     isNetworkError?: boolean
 *   })
 *
 *   - extends Error (instanceof Error && instanceof ApiError)
 *   - name === 'ApiError'
 *   - status defaults to 0, isNetworkError defaults to false, detail optional
 */

describe('ApiError', () => {
  it('is an Error subclass with name "ApiError"', () => {
    const err = new ApiError('boom')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.name).toBe('ApiError')
    expect(err.message).toBe('boom')
  })

  it('carries status and a parsed validation detail array', () => {
    const detail: ValidationError[] = [
      { loc: ['body', 'name'], msg: 'field required', type: 'missing' },
    ]
    const err = new ApiError('unprocessable', { status: 422, detail })
    expect(err.status).toBe(422)
    expect(err.detail).toEqual(detail)
    expect(err.isNetworkError).toBe(false)
  })

  it('flags network failures and defaults status to 0', () => {
    const err = new ApiError('network down', { isNetworkError: true })
    expect(err.isNetworkError).toBe(true)
    expect(err.status).toBe(0)
    expect(err.detail).toBeUndefined()
  })

  it('defaults: status 0, isNetworkError false, no detail', () => {
    const err = new ApiError('plain')
    expect(err.status).toBe(0)
    expect(err.isNetworkError).toBe(false)
    expect(err.detail).toBeUndefined()
  })
})
