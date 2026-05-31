import { describe, it, expect, vi } from 'vitest'
import { render, screen, userEvent } from '../../test/test-utils'
// RED: this module does not exist yet.
import IncidentFilters from './IncidentFilters'
import type { IncidentFilters as Filters } from '../../api/incidentsApi'

/**
 * T22 CONTRACT — IncidentFilters (src/features/incidents/IncidentFilters.tsx)
 *
 * Props:
 *   {
 *     value: IncidentFilters,                  // current filter state
 *     onChange: (next: IncidentFilters) => void  // called with the FULL next state
 *   }
 *
 * IncidentFilters (from src/api/incidentsApi.ts):
 *   { serviceId?: number; open?: boolean; slaBreach?: boolean; limit?: number }
 *
 * UI controls (exact testids + accessible labels):
 *   - "Open only" toggle      -> checkbox, data-testid="incident-filter-open",
 *                                accessible name /open only/i.
 *                                Checked  => onChange sets open: true.
 *                                Unchecked (from checked) => open: false.
 *   - "SLA breach only" toggle-> checkbox, data-testid="incident-filter-sla-breach",
 *                                accessible name /sla breach/i.
 *                                Checked => onChange sets slaBreach: true.
 *   - "Service ID" input      -> number input, data-testid="incident-filter-service-id",
 *                                accessible name /service id/i.
 *                                onChange sets serviceId to the parsed number.
 *   - "Limit" input           -> number input, data-testid="incident-filter-limit",
 *                                accessible name /limit/i.
 *                                onChange sets limit to the parsed number.
 *
 * Each control change calls onChange with the merged next filter object so the
 * parent (IncidentsPage) can re-key its useQuery and refetch.
 */

const empty: Filters = {}

describe('IncidentFilters', () => {
  it('renders the four filter controls with their testids', () => {
    render(<IncidentFilters value={empty} onChange={vi.fn()} />)
    expect(screen.getByTestId('incident-filter-open')).toBeInTheDocument()
    expect(screen.getByTestId('incident-filter-sla-breach')).toBeInTheDocument()
    expect(screen.getByTestId('incident-filter-service-id')).toBeInTheDocument()
    expect(screen.getByTestId('incident-filter-limit')).toBeInTheDocument()
  })

  it('toggling "open only" calls onChange with open: true', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IncidentFilters value={empty} onChange={onChange} />)

    await user.click(screen.getByTestId('incident-filter-open'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ open: true }),
    )
  })

  it('toggling "SLA breach only" calls onChange with slaBreach: true', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IncidentFilters value={empty} onChange={onChange} />)

    await user.click(screen.getByTestId('incident-filter-sla-breach'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ slaBreach: true }),
    )
  })

  it('typing a Service ID calls onChange with the parsed serviceId', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IncidentFilters value={empty} onChange={onChange} />)

    await user.type(screen.getByTestId('incident-filter-service-id'), '42')

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ serviceId: 42 }),
    )
  })

  it('typing a Limit calls onChange with the parsed limit', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IncidentFilters value={empty} onChange={onChange} />)

    await user.type(screen.getByTestId('incident-filter-limit'), '25')

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 25 }),
    )
  })

  it('reflects the controlled value (checked toggles, filled inputs)', () => {
    render(
      <IncidentFilters
        value={{ open: true, slaBreach: true, serviceId: 7, limit: 50 }}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByTestId('incident-filter-open')).toBeChecked()
    expect(screen.getByTestId('incident-filter-sla-breach')).toBeChecked()
    expect(screen.getByTestId('incident-filter-service-id')).toHaveValue(7)
    expect(screen.getByTestId('incident-filter-limit')).toHaveValue(50)
  })
})
