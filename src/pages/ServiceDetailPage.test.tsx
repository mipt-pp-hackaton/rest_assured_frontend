import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor, within } from '../test/test-utils'
import userEvent from '@testing-library/user-event'
import { server } from '../test/server'
import { tokenStorage } from '../auth/tokenStorage'
import type {
  ServiceMetricsResponse,
  TimeseriesBucket,
} from '../api/types'

// ---------------------------------------------------------------------------
// T21 SERVICE DETAIL PAGE CONTRACT (RED phase)
//
// ServiceDetailPage (src/pages/ServiceDetailPage.tsx) MUST:
//   - keep data-testid="service-detail-page" (router wiring identifies the
//     route by it — see src/router.test.tsx).
//   - read :id from useParams() (route is "/services/:id").
//   - useQuery -> GET http://api.test/api/services/{id}/metrics and render
//       current_uptime_seconds via formatUptime  (data-testid="metrics-uptime")
//       sla_pct via formatSlaPct                  (data-testid="metrics-sla")
//     inside the MetricsPanel (data-testid="metrics-panel").
//   - useQuery -> GET http://api.test/api/services/{id}/timeseries?from=&to=&bucket_seconds=
//     and render TimeseriesChart (data-testid="timeseries-chart") with series
//     for up_ratio and latency_p95_ms. Null latency_p95_ms must remain a gap.
//
// RANGE / BUCKET SELECTOR (documented contract):
//   - Range preset selector: data-testid="range-select" (a <select>), with
//     option values "1h" | "24h" | "7d". Default selected value = "24h".
//       1h  -> bucket_seconds=60     (from = to - 1h)
//       24h -> bucket_seconds=300    (from = to - 24h)
//       7d  -> bucket_seconds=3600   (from = to - 7d)
//     `to` is "now" (ISO 8601) and `from` is `to` minus the preset window, both
//     ISO strings. Changing the range refetches timeseries with updated
//     from/to/bucket_seconds query params.
//   - Bucket override selector: data-testid="bucket-select" (a <select>) whose
//     option values are bucket_seconds in seconds as strings (e.g. "60",
//     "300", "3600"). Changing it refetches with the new bucket_seconds while
//     keeping the current from/to window.
//
// STATE TESTIDS (per query):
//   metrics:    loading data-testid="metrics-loading"
//               error   data-testid="metrics-error" + retry "metrics-retry"
//   timeseries: loading data-testid="timeseries-loading"
//               error   data-testid="timeseries-error" + retry "timeseries-retry"
//               empty   data-testid="timeseries-empty"
//
// Base URL (VITE_API_BASE_URL=http://api.test):
//   GET http://api.test/api/services/{id}/metrics
//   GET http://api.test/api/services/{id}/timeseries
// ---------------------------------------------------------------------------

// recharts ResponsiveContainer reports 0x0 in jsdom; give it a real box so the
// chart renders for the integration assertions.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  }
})

import ServiceDetailPage from './ServiceDetailPage'

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`

const metrics: ServiceMetricsResponse = {
  service_id: 1,
  current_uptime_seconds: 3661,
  sla_pct: 99.95,
  computed_at: '2026-05-27T12:00:00Z',
}

const buckets: TimeseriesBucket[] = [
  {
    bucket_start: '2026-05-27T00:00:00Z',
    checks_total: 10,
    checks_up: 10,
    up_ratio: 1,
    latency_avg_ms: 120,
    latency_p95_ms: 200,
  },
  {
    bucket_start: '2026-05-27T00:05:00Z',
    checks_total: 10,
    checks_up: 5,
    up_ratio: 0.5,
    latency_avg_ms: null,
    latency_p95_ms: null,
  },
]

/** Registers happy-path handlers for both queries. */
function happyHandlers() {
  return [
    http.get(url('/api/services/1/metrics'), () => HttpResponse.json(metrics)),
    http.get(url('/api/services/1/timeseries'), () =>
      HttpResponse.json(buckets),
    ),
  ]
}

/** Render at /services/1 so useParams() sees id=1. */
function renderDetail(id = '1') {
  return render(<ServiceDetailPage />, {
    routerProps: { initialEntries: [`/services/${id}`] },
  })
}

beforeEach(() => {
  tokenStorage.setTokens({ access: 'test-access', refresh: 'test-refresh' })
})

describe('ServiceDetailPage', () => {
  it('keeps the service-detail-page marker for router wiring', async () => {
    server.use(...happyHandlers())
    renderDetail()
    expect(
      await screen.findByTestId('service-detail-page'),
    ).toBeInTheDocument()
  })

  it('fetches metrics for the :id from useParams and renders uptime + SLA', async () => {
    let requestedPath = ''
    server.use(
      http.get(url('/api/services/1/metrics'), ({ request }) => {
        requestedPath = new URL(request.url).pathname
        return HttpResponse.json(metrics)
      }),
      http.get(url('/api/services/1/timeseries'), () =>
        HttpResponse.json(buckets),
      ),
    )

    renderDetail('1')

    const panel = await screen.findByTestId('metrics-panel')
    // formatUptime(3661) === '1h 1m 1s'
    expect(within(panel).getByTestId('metrics-uptime')).toHaveTextContent(
      '1h 1m 1s',
    )
    // formatSlaPct(99.95) === '99.95%'
    expect(within(panel).getByTestId('metrics-sla')).toHaveTextContent(
      '99.95%',
    )
    expect(requestedPath).toBe('/api/services/1/metrics')
  })

  it('fetches timeseries with from/to/bucket_seconds and renders the chart', async () => {
    let q: URLSearchParams | null = null
    server.use(
      http.get(url('/api/services/1/metrics'), () =>
        HttpResponse.json(metrics),
      ),
      http.get(url('/api/services/1/timeseries'), ({ request }) => {
        q = new URL(request.url).searchParams
        return HttpResponse.json(buckets)
      }),
    )

    renderDetail('1')

    expect(await screen.findByTestId('timeseries-chart')).toBeInTheDocument()
    await waitFor(() => expect(q).not.toBeNull())
    const params = q as unknown as URLSearchParams
    expect(params.get('from')).toBeTruthy()
    expect(params.get('to')).toBeTruthy()
    // Default range "24h" -> bucket_seconds=300.
    expect(params.get('bucket_seconds')).toBe('300')
    // from/to are ISO 8601 timestamps and from < to.
    const from = new Date(params.get('from') as string)
    const to = new Date(params.get('to') as string)
    expect(Number.isNaN(from.getTime())).toBe(false)
    expect(Number.isNaN(to.getTime())).toBe(false)
    expect(from.getTime()).toBeLessThan(to.getTime())
  })

  it('shows the timeseries empty state when the range has no buckets', async () => {
    server.use(
      http.get(url('/api/services/1/metrics'), () =>
        HttpResponse.json(metrics),
      ),
      http.get(url('/api/services/1/timeseries'), () => HttpResponse.json([])),
    )

    renderDetail('1')

    expect(await screen.findByTestId('timeseries-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('timeseries-chart')).not.toBeInTheDocument()
  })

  it('shows loading testids while both queries are in flight', async () => {
    let resolveMetrics: (v: ServiceMetricsResponse) => void = () => {}
    let resolveTs: (v: TimeseriesBucket[]) => void = () => {}
    const pendingMetrics = new Promise<ServiceMetricsResponse>((r) => {
      resolveMetrics = r
    })
    const pendingTs = new Promise<TimeseriesBucket[]>((r) => {
      resolveTs = r
    })
    server.use(
      http.get(url('/api/services/1/metrics'), async () =>
        HttpResponse.json(await pendingMetrics),
      ),
      http.get(url('/api/services/1/timeseries'), async () =>
        HttpResponse.json(await pendingTs),
      ),
    )

    renderDetail('1')

    expect(await screen.findByTestId('metrics-loading')).toBeInTheDocument()
    expect(screen.getByTestId('timeseries-loading')).toBeInTheDocument()

    resolveMetrics(metrics)
    resolveTs(buckets)
    await waitFor(() => {
      expect(screen.queryByTestId('metrics-loading')).not.toBeInTheDocument()
    })
  })

  it('shows the metrics error state with retry on a 500', async () => {
    server.use(
      http.get(
        url('/api/services/1/metrics'),
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.get(url('/api/services/1/timeseries'), () =>
        HttpResponse.json(buckets),
      ),
    )

    renderDetail('1')

    expect(await screen.findByTestId('metrics-error')).toBeInTheDocument()
    expect(screen.getByTestId('metrics-retry')).toBeInTheDocument()
  })

  it('metrics retry refetches and renders the panel after a recovered 500', async () => {
    const user = userEvent.setup()
    let calls = 0
    server.use(
      http.get(url('/api/services/1/metrics'), () => {
        calls += 1
        if (calls === 1) return new HttpResponse(null, { status: 500 })
        return HttpResponse.json(metrics)
      }),
      http.get(url('/api/services/1/timeseries'), () =>
        HttpResponse.json(buckets),
      ),
    )

    renderDetail('1')

    await user.click(await screen.findByTestId('metrics-retry'))
    expect(await screen.findByTestId('metrics-panel')).toBeInTheDocument()
    expect(screen.queryByTestId('metrics-error')).not.toBeInTheDocument()
  })

  it('shows the timeseries error state with retry on a 500', async () => {
    server.use(
      http.get(url('/api/services/1/metrics'), () =>
        HttpResponse.json(metrics),
      ),
      http.get(
        url('/api/services/1/timeseries'),
        () => new HttpResponse(null, { status: 500 }),
      ),
    )

    renderDetail('1')

    expect(await screen.findByTestId('timeseries-error')).toBeInTheDocument()
    expect(screen.getByTestId('timeseries-retry')).toBeInTheDocument()
  })

  it('changing the range preset refetches timeseries with updated from/to/bucket_seconds', async () => {
    const user = userEvent.setup()
    const seen: Array<{
      from: string | null
      to: string | null
      bucket: string | null
    }> = []
    server.use(
      http.get(url('/api/services/1/metrics'), () =>
        HttpResponse.json(metrics),
      ),
      http.get(url('/api/services/1/timeseries'), ({ request }) => {
        const sp = new URL(request.url).searchParams
        seen.push({
          from: sp.get('from'),
          to: sp.get('to'),
          bucket: sp.get('bucket_seconds'),
        })
        return HttpResponse.json(buckets)
      }),
    )

    renderDetail('1')

    // Wait for the initial (24h -> 300) request.
    await waitFor(() => expect(seen.length).toBeGreaterThanOrEqual(1))
    expect(seen[0].bucket).toBe('300')

    // Switch to the 1h preset -> bucket_seconds=60, shorter window.
    await user.selectOptions(screen.getByTestId('range-select'), '1h')

    await waitFor(() => {
      const last = seen[seen.length - 1]
      expect(last.bucket).toBe('60')
    })
    const initial = seen[0]
    const after = seen[seen.length - 1]
    // The from boundary moved (window shrank) -> query string changed.
    expect(after.from).not.toBe(initial.from)
  })

  it('changing the bucket selector refetches timeseries with the new bucket_seconds', async () => {
    const user = userEvent.setup()
    const buckets_seen: string[] = []
    server.use(
      http.get(url('/api/services/1/metrics'), () =>
        HttpResponse.json(metrics),
      ),
      http.get(url('/api/services/1/timeseries'), ({ request }) => {
        const sp = new URL(request.url).searchParams
        buckets_seen.push(sp.get('bucket_seconds') ?? '')
        return HttpResponse.json(buckets)
      }),
    )

    renderDetail('1')

    await waitFor(() => expect(buckets_seen.length).toBeGreaterThanOrEqual(1))
    expect(buckets_seen[0]).toBe('300')

    // Override the bucket to 3600.
    await user.selectOptions(screen.getByTestId('bucket-select'), '3600')

    await waitFor(() => {
      expect(buckets_seen[buckets_seen.length - 1]).toBe('3600')
    })
  })

  it('null latency_p95_ms in a bucket stays a gap (chart still renders)', async () => {
    // The middle/edge bucket has latency_p95_ms=null. The chart must render
    // without coercing it to 0. The null-vs-0 invariant is unit-tested directly
    // against toChartData in TimeseriesChart.test.tsx; here we assert the page
    // renders the chart when such a bucket is present.
    server.use(...happyHandlers())
    renderDetail('1')
    expect(await screen.findByTestId('timeseries-chart')).toBeInTheDocument()
  })
})
