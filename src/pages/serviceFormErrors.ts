import type { ValidationError } from '../api/types'
import type { ServiceFormErrors } from '../features/services/ServiceForm'

/**
 * Maps a backend HTTPValidationError `detail` array onto the ServiceForm's
 * per-field error shape. The last segment of each entry's `loc` is treated as
 * the field key (e.g. ["body","url"] -> url) and its `msg` is the message.
 * Unknown fields are ignored so a stray detail entry cannot crash the form.
 */

const KNOWN_FIELDS: ReadonlySet<keyof ServiceFormErrors> = new Set([
  'name',
  'url',
  'http_method',
  'interval_ms',
  'expected_status',
  'is_active',
  'owner_emails',
])

const MAX_SERVER_MSG = 200

export function mapDetailToFieldErrors(
  detail: ValidationError[],
): ServiceFormErrors {
  const errors: ServiceFormErrors = {}
  for (const item of detail) {
    let last = item.loc[item.loc.length - 1]
    // Array fields (e.g. ["body","owner_emails",0]) end in an index; fall back
    // to the segment before it so the error maps to the field, not the index.
    if (typeof last === 'number' && item.loc.length >= 2) {
      last = item.loc[item.loc.length - 2]
    }
    const field = String(last) as keyof ServiceFormErrors
    if (KNOWN_FIELDS.has(field)) {
      const msg =
        item.msg.length > MAX_SERVER_MSG
          ? item.msg.slice(0, MAX_SERVER_MSG)
          : item.msg
      errors[field] = msg
    }
  }
  return errors
}
