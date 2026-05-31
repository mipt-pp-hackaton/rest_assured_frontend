import { ApiError } from './errors'

/** Cap server-supplied messages before they reach the UI. */
const MAX_DETAIL = 160

function truncate(msg: string): string {
  return msg.length > MAX_DETAIL ? `${msg.slice(0, MAX_DETAIL)}…` : msg
}

/**
 * Convert any thrown value into a concise, user-facing message, so non-2xx
 * responses (422 / 500 / etc.) are surfaced rather than swallowed. Keeps the
 * wording friendly and never leaks raw server internals beyond a 422's
 * validation `detail` (which is meant for the user).
 */
export function describeApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) {
      return 'Network error — please check your connection and try again.'
    }
    const { status, detail } = err
    if (status === 401) {
      return 'Your session has expired. Please sign in again.'
    }
    if (status === 403) {
      return 'You don’t have permission to perform this action.'
    }
    if (status === 404) {
      return 'The requested resource was not found (404).'
    }
    if (status === 422) {
      const first = detail?.[0]?.msg
      return first
        ? `Validation error: ${truncate(first)}`
        : 'Some of the submitted data was invalid (422). Please review and try again.'
    }
    if (status >= 500) {
      return `Server error (${status}). Please try again in a moment.`
    }
    if (status >= 400) {
      return `Request failed (${status}). Please try again.`
    }
    return 'Something went wrong. Please try again.'
  }
  return 'An unexpected error occurred. Please try again.'
}
