import { useState } from 'react'
import type { ServiceRead } from '../../api/types'

/**
 * Presentational table of monitored services. It does NOT fetch — the parent
 * page owns the react-query lifecycle. Each row exposes a two-step delete
 * confirmation (no `window.confirm`): clicking the trigger reveals in-row
 * confirm/cancel controls; confirm calls `onDelete(id)` once, cancel hides the
 * controls without calling `onDelete`.
 */
export interface ServiceTableProps {
  services: ServiceRead[]
  onDelete: (id: number) => void
}

export function ServiceTable({ services, onDelete }: ServiceTableProps) {
  // Id of the row whose delete confirmation is currently revealed, or null.
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  return (
    <ul aria-label="Monitored services">
      {services.map((service) => {
        const confirming = confirmingId === service.id
        return (
          <li key={service.id} data-testid={`service-row-${service.id}`}>
            <span>{service.name}</span>
            <span>{service.url}</span>
            <span>{service.http_method}</span>
            <span>{service.interval_ms} ms</span>
            <span data-testid={`service-active-${service.id}`}>
              {service.is_active ? 'Active' : 'Inactive'}
            </span>

            {confirming ? (
              <span>
                <button
                  type="button"
                  data-testid={`service-delete-confirm-${service.id}`}
                  aria-label={`Confirm delete ${service.name}`}
                  onClick={() => {
                    setConfirmingId(null)
                    onDelete(service.id)
                  }}
                >
                  Confirm delete
                </button>
                <button
                  type="button"
                  data-testid={`service-delete-cancel-${service.id}`}
                  aria-label={`Cancel delete ${service.name}`}
                  onClick={() => setConfirmingId(null)}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                data-testid={`service-delete-${service.id}`}
                aria-label={`Delete ${service.name}`}
                onClick={() => setConfirmingId(service.id)}
              >
                Delete
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
