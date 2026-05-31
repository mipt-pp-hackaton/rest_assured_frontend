import { useState, type FormEvent } from 'react'
import type { HttpMethod } from '../../api/types'

/**
 * Presentational, controlled service form shared by the create and edit pages.
 *
 * It owns local field state and runs client-side validation, but performs NO
 * network calls of its own — the parent page passes an `onSubmit` callback and
 * owns the mutation lifecycle. Server-side (422) field errors are injected back
 * down via the `errors` prop and rendered into the matching `*-error` testids.
 *
 * In `create` mode `onSubmit` receives a full ServiceCreate-shaped object. In
 * `edit` mode it receives ONLY the keys that differ from `initialValues` (a
 * partial ServiceUpdate), computed by diffing — when nothing changed it is
 * called with `{}`.
 */

export interface ServiceFormValues {
  name: string
  url: string
  http_method: HttpMethod
  interval_ms: number
  expected_status?: number | null
  is_active: boolean
  owner_emails?: string[]
}

/**
 * Shape accepted for `initialValues`. `http_method` is widened to `string` (not
 * the narrow `HttpMethod` enum) so a raw `ServiceRead` — whose `http_method` is
 * typed `string` — can be spread straight in without a cast. Unknown methods
 * fall back to "GET" at render time.
 */
export type ServiceFormInitialValues = Partial<
  Omit<ServiceFormValues, 'http_method'>
> & {
  http_method?: string
}

export interface ServiceFormErrors {
  name?: string
  url?: string
  http_method?: string
  interval_ms?: string
  expected_status?: string
  is_active?: string
  owner_emails?: string
}

export interface ServiceFormProps {
  mode: 'create' | 'edit'
  initialValues?: ServiceFormInitialValues
  onSubmit: (values: Partial<ServiceFormValues>) => void | Promise<void>
  errors?: ServiceFormErrors
  submitLabel?: string
}

const HTTP_METHOD_SET: ReadonlySet<string> = new Set([
  'GET',
  'POST',
  'HEAD',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS',
])

function coerceMethod(value: string | undefined): HttpMethod {
  return value && HTTP_METHOD_SET.has(value) ? (value as HttpMethod) : 'GET'
}

const HTTP_METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'HEAD',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS',
]

const DEFAULT_INTERVAL_MS = 60000

// Accepts only http(s) URLs; anything else (ftp://, bare strings) is rejected.
function isValidHttpUrl(value: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return false
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:'
}

// The expected_status field is a string in the DOM; normalize a blank field to
// `null` and a filled field to a number. Returned to the submit coercion logic.
function parseExpectedStatus(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return null
  }
  const n = Number(trimmed)
  return Number.isNaN(n) ? null : n
}

// Pragmatic email shape check, matching the auth forms.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// owner_emails is entered as free text; split on commas/whitespace and drop
// blanks so "a@x.com, b@y.com\n" -> ["a@x.com", "b@y.com"].
function parseEmails(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
}

// Compare two email arrays by value (order-sensitive) so an unchanged list does
// not show up in the edit diff (which compares against initialValues).
function emailsEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

export function ServiceForm({
  mode,
  initialValues,
  onSubmit,
  errors,
  submitLabel,
}: ServiceFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [url, setUrl] = useState(initialValues?.url ?? '')
  const [httpMethod, setHttpMethod] = useState<HttpMethod>(
    coerceMethod(initialValues?.http_method),
  )
  const [intervalMs, setIntervalMs] = useState(
    String(initialValues?.interval_ms ?? DEFAULT_INTERVAL_MS),
  )
  const [expectedStatus, setExpectedStatus] = useState(
    initialValues?.expected_status === undefined ||
      initialValues?.expected_status === null
      ? ''
      : String(initialValues.expected_status),
  )
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true)
  const [ownerEmailsText, setOwnerEmailsText] = useState(
    (initialValues?.owner_emails ?? []).join(', '),
  )

  const [clientErrors, setClientErrors] = useState<ServiceFormErrors>({})

  function validate(): ServiceFormErrors {
    const next: ServiceFormErrors = {}
    if (name.trim() === '') {
      next.name = 'Name is required'
    }
    if (url.trim() === '') {
      next.url = 'URL is required'
    } else if (!isValidHttpUrl(url.trim())) {
      next.url = 'URL must be a valid http(s) URL'
    }
    const invalid = parseEmails(ownerEmailsText).filter((e) => !EMAIL_RE.test(e))
    if (invalid.length > 0) {
      next.owner_emails = `Not a valid email: ${invalid.join(', ')}`
    }
    return next
  }

  function buildFullValues(): ServiceFormValues {
    const es = parseExpectedStatus(expectedStatus)
    const values: ServiceFormValues = {
      name,
      url,
      http_method: httpMethod,
      interval_ms: Number(intervalMs),
      is_active: isActive,
      owner_emails: parseEmails(ownerEmailsText),
    }
    if (es !== null) {
      values.expected_status = es
    }
    return values
  }

  // Edit mode: diff each field against initialValues, keeping only the ones
  // that actually changed. expected_status compares the normalized number/null.
  function buildDiff(): Partial<ServiceFormValues> {
    const diff: Partial<ServiceFormValues> = {}
    const init = initialValues ?? {}

    if (name !== (init.name ?? '')) {
      diff.name = name
    }
    if (url !== (init.url ?? '')) {
      diff.url = url
    }
    if (httpMethod !== coerceMethod(init.http_method)) {
      diff.http_method = httpMethod
    }
    const interval = Number(intervalMs)
    if (interval !== (init.interval_ms ?? DEFAULT_INTERVAL_MS)) {
      diff.interval_ms = interval
    }
    const es = parseExpectedStatus(expectedStatus)
    const initEs =
      init.expected_status === undefined ? null : init.expected_status
    if (es !== initEs) {
      diff.expected_status = es
    }
    if (isActive !== (init.is_active ?? true)) {
      diff.is_active = isActive
    }
    const ownerEmails = parseEmails(ownerEmailsText)
    if (!emailsEqual(ownerEmails, init.owner_emails ?? [])) {
      diff.owner_emails = ownerEmails
    }
    return diff
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validation = validate()
    if (Object.keys(validation).length > 0) {
      setClientErrors(validation)
      return
    }
    setClientErrors({})

    const payload = mode === 'edit' ? buildDiff() : buildFullValues()
    await onSubmit(payload)
  }

  // Server errors (passed via prop) take precedence over stale client errors.
  const fieldError = (field: keyof ServiceFormErrors): string | undefined =>
    errors?.[field] ?? clientErrors[field]

  return (
    <form onSubmit={handleSubmit} noValidate className="form" data-testid="service-form">
      <div>
        <label htmlFor="service-name">Name</label>
        <input
          id="service-name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={fieldError('name') ? true : undefined}
          data-testid="service-name"
        />
        {fieldError('name') && (
          <p role="alert" data-testid="service-name-error">
            {fieldError('name')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="service-url">URL</label>
        <input
          id="service-url"
          name="url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-invalid={fieldError('url') ? true : undefined}
          data-testid="service-url"
        />
        {fieldError('url') && (
          <p role="alert" data-testid="service-url-error">
            {fieldError('url')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="service-http-method">Method</label>
        <select
          id="service-http-method"
          name="http_method"
          value={httpMethod}
          onChange={(e) => setHttpMethod(e.target.value as HttpMethod)}
          data-testid="service-http-method"
        >
          {HTTP_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
        {fieldError('http_method') && (
          <p role="alert" data-testid="service-http-method-error">
            {fieldError('http_method')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="service-interval-ms">Interval (ms)</label>
        <input
          id="service-interval-ms"
          name="interval_ms"
          type="number"
          value={intervalMs}
          onChange={(e) => setIntervalMs(e.target.value)}
          aria-invalid={fieldError('interval_ms') ? true : undefined}
          data-testid="service-interval-ms"
        />
        {fieldError('interval_ms') && (
          <p role="alert" data-testid="service-interval-ms-error">
            {fieldError('interval_ms')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="service-expected-status">Expected status</label>
        <input
          id="service-expected-status"
          name="expected_status"
          type="number"
          value={expectedStatus}
          onChange={(e) => setExpectedStatus(e.target.value)}
          aria-invalid={fieldError('expected_status') ? true : undefined}
          data-testid="service-expected-status"
        />
        {fieldError('expected_status') && (
          <p role="alert" data-testid="service-expected-status-error">
            {fieldError('expected_status')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="service-is-active">Active</label>
        <input
          id="service-is-active"
          name="is_active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          data-testid="service-is-active"
        />
        {fieldError('is_active') && (
          <p role="alert" data-testid="service-is-active-error">
            {fieldError('is_active')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="service-owner-emails">Owner emails</label>
        <textarea
          id="service-owner-emails"
          name="owner_emails"
          rows={2}
          value={ownerEmailsText}
          onChange={(e) => setOwnerEmailsText(e.target.value)}
          placeholder="alice@example.com, bob@example.com"
          aria-invalid={fieldError('owner_emails') ? true : undefined}
          data-testid="service-owner-emails"
        />
        <p className="field-hint">
          Comma- or space-separated. Notified about this service’s incidents.
        </p>
        {fieldError('owner_emails') && (
          <p role="alert" data-testid="service-owner-emails-error">
            {fieldError('owner_emails')}
          </p>
        )}
      </div>

      <button type="submit" className="btn btn--primary" data-testid="service-submit">
        {submitLabel ?? (mode === 'edit' ? 'Save' : 'Create')}
      </button>
    </form>
  )
}
