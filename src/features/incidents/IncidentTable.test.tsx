import { describe, it, expect } from 'vitest'
import { render, screen, within } from '../../test/test-utils'
import type { IncidentRead } from '../../api/types'
import { formatDateTime, formatUptime, incidentStatus } from '../../utils/format'
// RED: this module does not exist yet.
import IncidentTable from './IncidentTable'

/**
 * T22 CONTRACT — IncidentTable (src/features/incidents/IncidentTable.tsx)
 *
 * Props: { incidents: IncidentRead[] }
 *
 * Renders one row per incident. Each row carries:
 *   - data-testid="incident-row" (every row) AND
 *   - data-testid={`incident-row-${incident.id}`} (addressable per id)
 *
 * Columns / cell content per row:
 *   - service_name        -> incident.service_name verbatim
 *   - opened (column)      -> formatDateTime(incident.opened_at)
 *   - closed (column)      -> incident.closed_at === null
 *                               ? "—"
 *                               : formatDateTime(incident.closed_at)
 *   - status (column)      -> incidentStatus(incident) === "open" -> text "open"
 *                             incidentStatus(incident) === "resolved" -> text "resolved"
 *   - SLA badge            -> when incident.sla_breach === true, a badge with
 *                             data-testid="incident-sla-badge" is present in the
 *                             row; when false, NO incident-sla-badge in that row.
 *   - duration (column)    -> incident.duration_seconds === null
 *                               ? "—"
 *                               : formatUptime(incident.duration_seconds)
 *
 * The em dash for null is the U+2014 character "—".
 */

const DASH = '—'

const openWithBreach: IncidentRead = {
  id: 1,
  service_id: 10,
  service_name: 'API Gateway',
  opened_at: '2026-05-01T08:30:00Z',
  closed_at: null,
  last_error: 'timeout',
  sla_breach: true,
  duration_seconds: null,
}

const resolvedNoBreach: IncidentRead = {
  id: 2,
  service_id: 11,
  service_name: 'Billing',
  opened_at: '2026-05-02T09:15:00Z',
  closed_at: '2026-05-02T10:15:00Z',
  last_error: null,
  sla_breach: false,
  duration_seconds: 3600,
}

describe('IncidentTable', () => {
  it('renders one row per incident', () => {
    render(<IncidentTable incidents={[openWithBreach, resolvedNoBreach]} />)
    expect(screen.getAllByTestId('incident-row')).toHaveLength(2)
    expect(screen.getByTestId('incident-row-1')).toBeInTheDocument()
    expect(screen.getByTestId('incident-row-2')).toBeInTheDocument()
  })

  it('renders an accessible table with labelled column headers', () => {
    render(<IncidentTable incidents={[openWithBreach, resolvedNoBreach]} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    for (const name of ['Service', 'Opened', 'Closed', 'Status', 'Duration']) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument()
    }
    // One body row per incident.
    expect(screen.getAllByRole('row')).toHaveLength(3) // header + 2 incidents
  })

  it('renders the open + SLA-breached row: name, opened time, closed "—", status "open", SLA badge, duration "—"', () => {
    render(<IncidentTable incidents={[openWithBreach, resolvedNoBreach]} />)
    const row = within(screen.getByTestId('incident-row-1'))

    expect(row.getByText('API Gateway')).toBeInTheDocument()
    expect(row.getByText(formatDateTime(openWithBreach.opened_at))).toBeInTheDocument()
    // closed_at is null -> em dash (row has two dashes; check the first)
    expect(row.getAllByText(DASH)[0]).toBeInTheDocument()
    // status
    expect(incidentStatus(openWithBreach)).toBe('open')
    expect(row.getByText('open')).toBeInTheDocument()
    // SLA breach badge present
    expect(row.getByTestId('incident-sla-badge')).toBeInTheDocument()
    // duration_seconds null -> em dash (there are now two em dashes in the row)
    expect(row.getAllByText(DASH).length).toBeGreaterThanOrEqual(2)
  })

  it('renders the resolved + non-breached row: closed time, status "resolved", no SLA badge, formatted duration', () => {
    render(<IncidentTable incidents={[openWithBreach, resolvedNoBreach]} />)
    const row = within(screen.getByTestId('incident-row-2'))

    expect(row.getByText('Billing')).toBeInTheDocument()
    expect(row.getByText(formatDateTime(resolvedNoBreach.opened_at))).toBeInTheDocument()
    expect(
      row.getByText(formatDateTime(resolvedNoBreach.closed_at as string)),
    ).toBeInTheDocument()
    expect(incidentStatus(resolvedNoBreach)).toBe('resolved')
    expect(row.getByText('resolved')).toBeInTheDocument()
    // no SLA badge in a non-breached row
    expect(row.queryByTestId('incident-sla-badge')).not.toBeInTheDocument()
    // duration_seconds 3600 -> formatUptime
    expect(row.getByText(formatUptime(3600))).toBeInTheDocument()
  })
})
