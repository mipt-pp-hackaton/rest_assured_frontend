import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse, delay } from 'msw'
import { render, screen, waitFor, within, userEvent } from '../test/test-utils'
import { server } from '../test/server'
import { tokenStorage } from '../auth/tokenStorage'
import type { ServiceSummaryItem } from '../api/types'
import DashboardPage from './DashboardPage'

/**
 * T18 DASHBOARD PAGE CONTRACT (RED phase)
 *
 * DashboardPage (src/pages/DashboardPage.tsx) loads the per-service summary via
 * react-query useQuery(getSummary) -> GET /api/services/summary and renders one
 * SummaryCard per item.
 *
 * REQUIRED testids:
 *   - data-testid="dashboard-page"     (root marker; preserved for router wiring)
 *   - data-testid="dashboard-loading"  (skeleton/spinner while the query is pending)
 *   - data-testid="dashboard-empty"    (shown when the summary array is empty)
 *   - data-testid="dashboard-error"    (shown when the request fails)
 *   - a retry control: role="button" name matching /retry/i that refetches
 *   - data-testid="summary-card-{service_id}" for each rendered card
 *
 * Per-card rendered text (see SummaryCard):
 *   - service name
 *   - formatSlaPct(sla_pct)              e.g. 99.95 -> "99.95%"
 *   - formatUptime(current_uptime_seconds) e.g. 3600 -> "1h", 0 -> "0s"
 *   - up/down/unknown status from last_check_is_up
 *       true  -> data-testid="status-up"
 *       false -> data-testid="status-down"
 *       null  -> data-testid="status-unknown"
 *
 * react-query retries are disabled in the test QueryClient, so a 500 surfaces
 * as an error immediately (no backoff).
 */

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`
const SUMMARY = '/api/services/summary'

const TWO_ITEMS: ServiceSummaryItem[] = [
  {
    service_id: 1,
    name: 'API Gateway',
    url: 'https://api.example.com',
    is_active: true,
    current_uptime_seconds: 3600,
    sla_pct: 99.95,
    last_check_at: '2026-05-27T00:00:00Z',
    last_check_is_up: true,
  },
  {
    service_id: 2,
    name: 'Worker',
    url: 'https://worker.example.com',
    is_active: false,
    current_uptime_seconds: 0,
    sla_pct: 0,
    last_check_at: null,
    last_check_is_up: false,
  },
]

beforeEach(() => {
  // Provide an access token so authedRequest attaches a bearer and no refresh
  // (401) path triggers. No refresh token is needed because we never 401.
  tokenStorage.setTokens({ access: 'access-token-1', refresh: 'refresh-1' })
})

describe('DashboardPage', () => {
  it('keeps the dashboard-page marker for router wiring', async () => {
    server.use(http.get(url(SUMMARY), () => HttpResponse.json([], { status: 200 })))
    render(<DashboardPage />)
    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument()
  })

  it('shows a loading state before the request resolves', async () => {
    server.use(
      http.get(url(SUMMARY), async () => {
        await delay(50)
        return HttpResponse.json([], { status: 200 })
      }),
    )

    render(<DashboardPage />)

    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument()
    })
  })

  it('fetches the summary and renders one card per item with name, SLA %, uptime and status', async () => {
    let calledPath: string | null = null
    server.use(
      http.get(url(SUMMARY), ({ request: req }) => {
        calledPath = new URL(req.url).pathname
        return HttpResponse.json(TWO_ITEMS, { status: 200 })
      }),
    )

    render(<DashboardPage />)

    const card1 = await screen.findByTestId('summary-card-1')
    const card2 = await screen.findByTestId('summary-card-2')

    expect(calledPath).toBe(SUMMARY)

    // Card 1: API Gateway, up, 99.95% SLA, 1h uptime.
    expect(card1).toHaveTextContent('API Gateway')
    expect(card1).toHaveTextContent('99.95%')
    expect(card1).toHaveTextContent('1h')
    expect(within(card1).getByTestId('status-up')).toBeInTheDocument()

    // Card 2: Worker, down, 0.00% SLA, 0s uptime.
    expect(card2).toHaveTextContent('Worker')
    expect(card2).toHaveTextContent('0.00%')
    expect(card2).toHaveTextContent('0s')
    expect(within(card2).getByTestId('status-down')).toBeInTheDocument()

    // No empty / error states while data is present.
    expect(screen.queryByTestId('dashboard-empty')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-error')).not.toBeInTheDocument()
  })

  it('renders an unknown status when last_check_is_up is null', async () => {
    server.use(
      http.get(url(SUMMARY), () =>
        HttpResponse.json(
          [{ ...TWO_ITEMS[0], service_id: 9, last_check_is_up: null }],
          { status: 200 },
        ),
      ),
    )

    render(<DashboardPage />)

    const card = await screen.findByTestId('summary-card-9')
    expect(within(card).getByTestId('status-unknown')).toBeInTheDocument()
  })

  it('shows an empty state when the summary array is empty', async () => {
    server.use(http.get(url(SUMMARY), () => HttpResponse.json([], { status: 200 })))

    render(<DashboardPage />)

    expect(await screen.findByTestId('dashboard-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('summary-card-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-error')).not.toBeInTheDocument()
  })

  it('shows an error state with a retry button on a 500 response', async () => {
    server.use(
      http.get(url(SUMMARY), () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )

    render(<DashboardPage />)

    expect(await screen.findByTestId('dashboard-error')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /retry/i }),
    ).toBeInTheDocument()
  })

  it('refetches and recovers when retry is clicked after an error', async () => {
    let attempt = 0
    server.use(
      http.get(url(SUMMARY), () => {
        attempt += 1
        if (attempt === 1) {
          return HttpResponse.json({ detail: 'boom' }, { status: 500 })
        }
        return HttpResponse.json(TWO_ITEMS, { status: 200 })
      }),
    )

    render(<DashboardPage />)

    await screen.findByTestId('dashboard-error')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByTestId('summary-card-1')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-error')).not.toBeInTheDocument()
    expect(attempt).toBeGreaterThanOrEqual(2)
  })
})
