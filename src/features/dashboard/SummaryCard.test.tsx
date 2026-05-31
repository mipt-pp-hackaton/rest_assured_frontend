import { describe, it, expect } from 'vitest'
import { render, screen } from '../../test/test-utils'
import type { ServiceSummaryItem } from '../../api/types'
import SummaryCard from './SummaryCard'

/**
 * T18 SUMMARY CARD CONTRACT (RED phase)
 *
 * SummaryCard (src/features/dashboard/SummaryCard.tsx) renders exactly one
 * ServiceSummaryItem. It MUST display:
 *   - the service `name`
 *   - the SLA percentage via formatSlaPct(sla_pct)  -> e.g. "99.95%"
 *   - the current uptime via formatUptime(current_uptime_seconds) -> e.g. "1h"
 *   - an up/down/unknown status derived from `last_check_is_up`:
 *       true  -> data-testid="status-up"    (text contains "up", case-insensitive)
 *       false -> data-testid="status-down"  (text contains "down")
 *       null  -> data-testid="status-unknown" (text contains "unknown")
 *
 * The card root carries data-testid="summary-card" and a stable per-service hook
 * data-testid="summary-card-{service_id}".
 */

const upItem: ServiceSummaryItem = {
  service_id: 1,
  name: 'API Gateway',
  url: 'https://api.example.com',
  is_active: true,
  current_uptime_seconds: 3600,
  sla_pct: 99.95,
  last_check_at: '2026-05-27T00:00:00Z',
  last_check_is_up: true,
}

describe('SummaryCard', () => {
  it('renders the service name, SLA % and uptime for an up service', () => {
    render(<SummaryCard item={upItem} />)

    const card = screen.getByTestId('summary-card-1')
    expect(card).toBeInTheDocument()
    expect(card).toHaveTextContent('API Gateway')
    // formatSlaPct(99.95) === '99.95%'
    expect(card).toHaveTextContent('99.95%')
    // formatUptime(3600) === '1h'
    expect(card).toHaveTextContent('1h')
  })

  it('shows an "up" status when last_check_is_up is true', () => {
    render(<SummaryCard item={upItem} />)
    const status = screen.getByTestId('status-up')
    expect(status).toBeInTheDocument()
    expect(status).toHaveTextContent(/up/i)
  })

  it('shows a "down" status when last_check_is_up is false', () => {
    render(
      <SummaryCard
        item={{ ...upItem, service_id: 2, last_check_is_up: false }}
      />,
    )
    const status = screen.getByTestId('status-down')
    expect(status).toBeInTheDocument()
    expect(status).toHaveTextContent(/down/i)
  })

  it('shows an "unknown" status when last_check_is_up is null', () => {
    render(
      <SummaryCard
        item={{ ...upItem, service_id: 3, last_check_is_up: null }}
      />,
    )
    const status = screen.getByTestId('status-unknown')
    expect(status).toBeInTheDocument()
    expect(status).toHaveTextContent(/unknown/i)
  })
})
