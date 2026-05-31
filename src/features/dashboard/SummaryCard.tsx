import { Link } from 'react-router-dom'
import type { ServiceSummaryItem } from '../../api/types'
import { formatSlaPct, formatUptime } from '../../utils/format'

interface SummaryCardProps {
  item: ServiceSummaryItem
}

function StatusBadge({ isUp }: { isUp: boolean | null }) {
  if (isUp === true) {
    return (
      <span className="badge badge--up" data-testid="status-up" role="status" aria-label="Status: up">
        Up
      </span>
    )
  }
  if (isUp === false) {
    return (
      <span className="badge badge--down" data-testid="status-down" role="status" aria-label="Status: down">
        Down
      </span>
    )
  }
  return (
    <span
      className="badge badge--unknown"
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
      <Link
        to={`/services/${item.service_id}`}
        data-testid="summary-card"
        className="card service-card card--link"
        aria-label={`View ${item.name} metrics and chart`}
      >
        <div className="service-card__head">
          <h3>{item.name}</h3>
          <StatusBadge isUp={item.last_check_is_up} />
        </div>
        <dl>
          <dt>SLA</dt>
          <dd>{formatSlaPct(item.sla_pct)}</dd>
          <dt>Uptime</dt>
          <dd>{formatUptime(item.current_uptime_seconds)}</dd>
        </dl>
      </Link>
    </div>
  )
}
