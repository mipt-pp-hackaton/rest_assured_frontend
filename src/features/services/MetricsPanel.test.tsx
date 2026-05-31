import { describe, it, expect } from 'vitest'
import { render, screen } from '../../test/test-utils'
import type { ServiceMetricsResponse } from '../../api/types'
import { formatUptime, formatSlaPct } from '../../utils/format'

// ---------------------------------------------------------------------------
// T21 METRICS PANEL CONTRACT (RED phase)
//
// MetricsPanel (src/features/services/MetricsPanel.tsx) renders a single
// ServiceMetricsResponse as the headline numbers for a service.
//
// Public surface:
//   - default export: <MetricsPanel metrics={ServiceMetricsResponse} />
//   - root carries data-testid="metrics-panel".
//   - displays current_uptime_seconds via formatUptime(...) inside
//     data-testid="metrics-uptime".
//   - displays sla_pct via formatSlaPct(...) inside data-testid="metrics-sla".
//
// Example: current_uptime_seconds=3661 -> formatUptime => "1h 1m 1s",
//          sla_pct=99.95 -> formatSlaPct => "99.95%".
// ---------------------------------------------------------------------------

import MetricsPanel from './MetricsPanel'

const metrics: ServiceMetricsResponse = {
  service_id: 1,
  current_uptime_seconds: 3661,
  sla_pct: 99.95,
  computed_at: '2026-05-27T12:00:00Z',
}

describe('MetricsPanel', () => {
  it('renders the panel root', () => {
    render(<MetricsPanel metrics={metrics} />)
    expect(screen.getByTestId('metrics-panel')).toBeInTheDocument()
  })

  it('formats current_uptime_seconds via formatUptime', () => {
    render(<MetricsPanel metrics={metrics} />)
    expect(screen.getByTestId('metrics-uptime')).toHaveTextContent(
      formatUptime(3661),
    )
    // sanity: helper output is the human string, not the raw seconds.
    expect(formatUptime(3661)).toBe('1h 1m 1s')
  })

  it('formats sla_pct via formatSlaPct', () => {
    render(<MetricsPanel metrics={metrics} />)
    expect(screen.getByTestId('metrics-sla')).toHaveTextContent(
      formatSlaPct(99.95),
    )
    expect(formatSlaPct(99.95)).toBe('99.95%')
  })
})
