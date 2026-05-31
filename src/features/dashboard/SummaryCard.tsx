import type { ServiceSummaryItem } from '../../api/types'
import { formatSlaPct, formatUptime } from '../../utils/format'

interface SummaryCardProps {
  item: ServiceSummaryItem
}

function StatusBadge({ isUp }: { isUp: boolean | null }) {
  if (isUp === true) {
    return (
      <span data-testid="status-up" role="status" aria-label="Status: up">
        Up
      </span>
    )
  }
  if (isUp === false) {
    return (
      <span data-testid="status-down" role="status" aria-label="Status: down">
        Down
      </span>
    )
  }
  return (
    <span
      data-testid="status-unknown"
      role="status"
      aria-label="Status: unknown"
    >
      Unknown
    </span>
  )
}

export default function SummaryCard({ item }: SummaryCardProps) {
  return (
    <div data-testid={`summary-card-${item.service_id}`}>
      <div data-testid="summary-card">
        <h3>{item.name}</h3>
        <dl>
          <dt>SLA</dt>
          <dd>{formatSlaPct(item.sla_pct)}</dd>
          <dt>Uptime</dt>
          <dd>{formatUptime(item.current_uptime_seconds)}</dd>
          <dt>Status</dt>
          <dd>
            <StatusBadge isUp={item.last_check_is_up} />
          </dd>
        </dl>
      </div>
    </div>
  )
}
