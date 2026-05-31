import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse, delay } from 'msw'
import { render, screen, waitFor, userEvent } from '../test/test-utils'
import { server } from '../test/server'
import { tokenStorage } from '../auth/tokenStorage'
import type { IncidentRead } from '../api/types'
import { formatDateTime, formatUptime } from '../utils/format'
// RED: IncidentsPage is currently a placeholder; this exercises the real impl.
import IncidentsPage from './IncidentsPage'

/**
 * T22 CONTRACT — IncidentsPage (src/pages/IncidentsPage.tsx)
 *
 * - MUST keep data-testid="incidents-page" (router wiring identifies the route).
 * - Uses react-query useQuery keyed on the current filter object, calling
 *   listIncidents(filters). Changing any filter re-keys the query and refetches.
 * - Renders <IncidentFilters> + <IncidentTable>.
 *
 * State testids:
 *   - Loading:     data-testid="incidents-loading"
 *   - Empty (200, []): data-testid="incidents-empty"
 *   - Error (500): data-testid="incidents-error" + a retry button
 *                  data-testid="incidents-retry" that refetches.
 *
 * Each table row: data-testid="incident-row" / "incident-row-<id>".
 * SLA badge in a breached row: data-testid="incident-sla-badge".
 *
 * Filter -> query param mapping verified against the outgoing GET /api/incidents:
 *   open only        -> open=true
 *   sla breach only  -> sla_breach=true
 *   service id       -> service_id=<n>
 *   limit            -> limit=<n>
 */

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`
const DASH = '—'

const fixture: IncidentRead[] = [
  {
    id: 1,
    service_id: 10,
    service_name: 'API Gateway',
    opened_at: '2026-05-01T08:30:00Z',
    closed_at: null,
    last_error: 'timeout',
    sla_breach: true,
    duration_seconds: null,
  },
  {
    id: 2,
    service_id: 11,
    service_name: 'Billing',
    opened_at: '2026-05-02T09:15:00Z',
    closed_at: '2026-05-02T10:15:00Z',
    last_error: null,
    sla_breach: false,
    duration_seconds: 3600,
  },
]

beforeEach(() => {
  tokenStorage.setTokens({ access: 'acc-123', refresh: 'ref-123' })
})

describe('IncidentsPage', () => {
  it('keeps the incidents-page marker for router wiring', async () => {
    server.use(
      http.get(url('/api/incidents'), () => HttpResponse.json(fixture)),
    )
    render(<IncidentsPage />)
    expect(await screen.findByTestId('incidents-page')).toBeInTheDocument()
  })

  it('shows the loading state while the request is in flight', async () => {
    server.use(
      http.get(url('/api/incidents'), async () => {
        await delay(50)
        return HttpResponse.json(fixture)
      }),
    )
    render(<IncidentsPage />)
    expect(await screen.findByTestId('incidents-loading')).toBeInTheDocument()
  })

  it('renders a row per incident with the full column contract', async () => {
    server.use(
      http.get(url('/api/incidents'), () => HttpResponse.json(fixture)),
    )
    render(<IncidentsPage />)

    expect(await screen.findByTestId('incident-row-1')).toBeInTheDocument()
    expect(screen.getAllByTestId('incident-row')).toHaveLength(2)

    // Open + SLA-breached incident
    expect(screen.getByText('API Gateway')).toBeInTheDocument()
    expect(
      screen.getByText(formatDateTime(fixture[0].opened_at)),
    ).toBeInTheDocument()
    expect(screen.getByText('open')).toBeInTheDocument()
    expect(screen.getByTestId('incident-sla-badge')).toBeInTheDocument()

    // Resolved + non-breached incident
    expect(screen.getByText('Billing')).toBeInTheDocument()
    expect(
      screen.getByText(formatDateTime(fixture[1].closed_at as string)),
    ).toBeInTheDocument()
    expect(screen.getByText('resolved')).toBeInTheDocument()
    expect(screen.getByText(formatUptime(3600))).toBeInTheDocument()

    // null handling: closed_at + duration_seconds of the open incident -> "—"
    expect(screen.getAllByText(DASH).length).toBeGreaterThanOrEqual(2)
  })

  it('shows the empty state when the API returns no incidents', async () => {
    server.use(
      http.get(url('/api/incidents'), () => HttpResponse.json([])),
    )
    render(<IncidentsPage />)
    expect(await screen.findByTestId('incidents-empty')).toBeInTheDocument()
    expect(screen.queryAllByTestId('incident-row')).toHaveLength(0)
  })

  it('shows an error state with a retry button on 500, and retry refetches', async () => {
    let calls = 0
    server.use(
      http.get(url('/api/incidents'), () => {
        calls += 1
        if (calls === 1) {
          return HttpResponse.json({ detail: 'boom' }, { status: 500 })
        }
        return HttpResponse.json(fixture)
      }),
    )
    render(<IncidentsPage />)

    expect(await screen.findByTestId('incidents-error')).toBeInTheDocument()
    const retry = screen.getByTestId('incidents-retry')
    expect(retry).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(retry)

    expect(await screen.findByTestId('incident-row-1')).toBeInTheDocument()
    expect(calls).toBeGreaterThanOrEqual(2)
  })

  it('refetches with open=true when "open only" is toggled', async () => {
    const queries: URLSearchParams[] = []
    server.use(
      http.get(url('/api/incidents'), ({ request }) => {
        queries.push(new URL(request.url).searchParams)
        return HttpResponse.json(fixture)
      }),
    )
    render(<IncidentsPage />)
    await screen.findByTestId('incident-row-1')

    const user = userEvent.setup()
    await user.click(screen.getByTestId('incident-filter-open'))

    await waitFor(() => {
      expect(
        queries.some((q) => q.get('open') === 'true'),
      ).toBe(true)
    })
  })

  it('refetches with sla_breach=true when "SLA breach only" is toggled', async () => {
    const queries: URLSearchParams[] = []
    server.use(
      http.get(url('/api/incidents'), ({ request }) => {
        queries.push(new URL(request.url).searchParams)
        return HttpResponse.json(fixture)
      }),
    )
    render(<IncidentsPage />)
    await screen.findByTestId('incident-row-1')

    const user = userEvent.setup()
    await user.click(screen.getByTestId('incident-filter-sla-breach'))

    await waitFor(() => {
      expect(
        queries.some((q) => q.get('sla_breach') === 'true'),
      ).toBe(true)
    })
  })

  it('refetches with service_id and limit when those filters are set', async () => {
    const queries: URLSearchParams[] = []
    server.use(
      http.get(url('/api/incidents'), ({ request }) => {
        queries.push(new URL(request.url).searchParams)
        return HttpResponse.json(fixture)
      }),
    )
    render(<IncidentsPage />)
    await screen.findByTestId('incident-row-1')

    const user = userEvent.setup()
    await user.type(screen.getByTestId('incident-filter-service-id'), '10')
    await user.type(screen.getByTestId('incident-filter-limit'), '25')

    await waitFor(() => {
      expect(
        queries.some((q) => q.get('service_id') === '10'),
      ).toBe(true)
    })
    await waitFor(() => {
      expect(queries.some((q) => q.get('limit') === '25')).toBe(true)
    })
  })
})
