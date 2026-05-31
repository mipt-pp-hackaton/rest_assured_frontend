import type { ServiceMetricsResponse } from '../../api/types'
import { formatUptime, formatSlaPct } from '../../utils/format'

export interface MetricsPanelProps {
  metrics: ServiceMetricsResponse
}

/**
 * Renders the headline numbers for a single service: current uptime and SLA.
 * Values are formatted via the shared `formatUptime` / `formatSlaPct` helpers
 * so the panel stays consistent with the rest of the app.
 */
export default function MetricsPanel({ metrics }: MetricsPanelProps) {
  return (
    <div data-testid="metrics-panel" className="stat-row">
      <div className="stat">
        <span className="stat__label">Uptime</span>
        <span className="stat__value" data-testid="metrics-uptime">
          {formatUptime(metrics.current_uptime_seconds)}
        </span>
      </div>
      <div className="stat">
        <span className="stat__label">SLA</span>
        <span className="stat__value" data-testid="metrics-sla">
          {formatSlaPct(metrics.sla_pct)}
        </span>
      </div>
    </div>
  )
}
