import { ApiError } from './errors'
import type { HTTPValidationError } from './types'

/**
 * Bodies that the browser/fetch serializes with their own Content-Type. For
 * these we must NOT force `application/json`, or fetch's auto-set header
 * (e.g. `application/x-www-form-urlencoded` for URLSearchParams, or the
 * multipart boundary for FormData) gets clobbered and the request is corrupted.
 */
function bodyManagesOwnContentType(body: BodyInit | null | undefined): boolean {
  return (
    body instanceof URLSearchParams ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ReadableStream
  )
}

/**
 * Thin fetch wrapper around the REST API.
 *
 * - Targets `${VITE_API_BASE_URL}${path}`.
 * - Sets `Content-Type: application/json` when a JSON-serializable body is
 *   sent, unless the caller already provided a Content-Type or the body type
 *   manages its own (URLSearchParams/FormData/Blob/ReadableStream — e.g. login
 *   uses urlencoded).
 * - 2xx with a JSON body -> parsed JSON typed as `T`.
 * - 2xx with no/empty/non-JSON body (204, 205, empty) -> `undefined`.
 * - non-2xx          -> throws `ApiError` carrying the status; on 422 the
 *   HTTPValidationError `detail` array is parsed onto the error.
 * - transport failure -> throws `ApiError` with `isNetworkError: true`.
 */
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T | undefined> {
  const url = `${import.meta.env.VITE_API_BASE_URL}${path}`

  const headers = new Headers(options.headers)
  if (
    options.body !== undefined &&
    options.body !== null &&
    !headers.has('Content-Type') &&
    !bodyManagesOwnContentType(options.body)
  ) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(url, { ...options, headers })
  } catch {
    throw new ApiError('Network request failed', { isNetworkError: true })
  }

  if (!response.ok) {
    let detail: HTTPValidationError['detail'] | undefined
    if (response.status === 422) {
      try {
        const body = (await response.json()) as HTTPValidationError
        detail = body.detail
      } catch {
        detail = undefined
      }
    }
    throw new ApiError(`Request failed with status ${response.status}`, {
      status: response.status,
      detail,
    })
  }

  // Any 2xx with no content (204/205, empty body, or a non-JSON content type)
  // resolves to `undefined` rather than attempting to parse JSON.
  if (response.status === 204 || response.status === 205) {
    return undefined
  }

  const text = await response.text()
  if (text === '') {
    return undefined
  }

  try {
    return JSON.parse(text) as T
  } catch {
    // A 2xx with a non-JSON / unparseable body is treated as no content rather
    // than surfacing a raw SyntaxError to callers.
    return undefined
  }
}
