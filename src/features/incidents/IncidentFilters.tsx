import { useState } from 'react'
import type { IncidentFilters as Filters } from '../../api/incidentsApi'

interface IncidentFiltersProps {
  value: Filters
  onChange: (next: Filters) => void
}

/**
 * Parse a raw number-input string into a filter value. Empty input clears the
 * filter (undefined). Non-finite (NaN, Infinity) and non-integer values are
 * rejected — incident filters (serviceId) are integer ids, so a fractional or
 * malformed value should not be forwarded to the query.
 */
function parseNumber(raw: string): number | undefined {
  if (raw === '') return undefined
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return undefined
  return parsed
}

function toInputValue(n: number | undefined): string {
  return n === undefined ? '' : String(n)
}

export default function IncidentFilters({
  value,
  onChange,
}: IncidentFiltersProps) {
  // The number inputs keep a local string buffer so they stay fully controlled
  // (no defaultValue/uncontrolled drift) while still accumulating intermediate
  // keystrokes — the parent only ever sees the parsed value via onChange. The
  // buffer is re-seeded during render (React's "adjust state when a prop
  // changes" pattern) whenever the controlled prop changes, avoiding a sync
  // effect.
  const [serviceIdText, setServiceIdText] = useState(
    toInputValue(value.serviceId),
  )
  const [limitText, setLimitText] = useState(toInputValue(value.limit))

  const [prevServiceId, setPrevServiceId] = useState(value.serviceId)
  if (prevServiceId !== value.serviceId) {
    setPrevServiceId(value.serviceId)
    if (parseNumber(serviceIdText) !== value.serviceId) {
      setServiceIdText(toInputValue(value.serviceId))
    }
  }

  const [prevLimit, setPrevLimit] = useState(value.limit)
  if (prevLimit !== value.limit) {
    setPrevLimit(value.limit)
    if (parseNumber(limitText) !== value.limit) {
      setLimitText(toInputValue(value.limit))
    }
  }

  return (
    <div>
      <label>
        Open only
        <input
          type="checkbox"
          data-testid="incident-filter-open"
          checked={value.open ?? false}
          onChange={(e) => onChange({ ...value, open: e.target.checked })}
        />
      </label>
      <label>
        SLA breach only
        <input
          type="checkbox"
          data-testid="incident-filter-sla-breach"
          checked={value.slaBreach ?? false}
          onChange={(e) => onChange({ ...value, slaBreach: e.target.checked })}
        />
      </label>
      <label>
        Service ID
        <input
          type="number"
          data-testid="incident-filter-service-id"
          value={serviceIdText}
          onChange={(e) => {
            setServiceIdText(e.target.value)
            onChange({ ...value, serviceId: parseNumber(e.target.value) })
          }}
        />
      </label>
      <label>
        Limit
        <input
          type="number"
          data-testid="incident-filter-limit"
          value={limitText}
          onChange={(e) => {
            setLimitText(e.target.value)
            onChange({ ...value, limit: parseNumber(e.target.value) })
          }}
        />
      </label>
    </div>
  )
}
