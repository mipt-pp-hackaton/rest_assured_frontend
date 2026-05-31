import type { ValidationError } from './types'

/**
 * Error thrown by the HTTP client for both API-level failures (non-2xx
 * responses) and transport-level failures (fetch rejected). The prototype
 * chain is explicitly restored so `instanceof ApiError` survives transpilation
 * to ES5-style class emulation.
 */
export interface ApiErrorOptions {
  status?: number
  detail?: ValidationError[]
  isNetworkError?: boolean
}

export class ApiError extends Error {
  readonly status: number
  readonly detail?: ValidationError[]
  readonly isNetworkError: boolean

  constructor(message: string, opts: ApiErrorOptions = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = opts.status ?? 0
    this.detail = opts.detail
    this.isNetworkError = opts.isNetworkError ?? false

    // Restore prototype chain (needed for instanceof after transpile).
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}
