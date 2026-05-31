import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../test/test-utils'
import type { TimeseriesBucket } from '../../api/types'

// ---------------------------------------------------------------------------
// T21 TIMESERIES CHART CONTRACT (RED phase)
//
// TimeseriesChart (src/features/services/TimeseriesChart.tsx) renders a recharts
// line chart of the bucketed timeseries for a service.
//
// Public surface this suite pins:
//   - default export: a React component <TimeseriesChart buckets={TimeseriesBucket[]} />
//     * root wrapper carries data-testid="timeseries-chart"
//     * when buckets is empty ([]) it renders data-testid="timeseries-empty"
//       (and NOT "timeseries-chart")
//     * it plots two series sourced from the buckets: up_ratio and
//       latency_p95_ms.
//   - named export: toChartData(buckets: TimeseriesBucket[]) => ChartPoint[]
//       ChartPoint = {
//         bucket_start: string
//         up_ratio: number
//         latency_p95_ms: number | null   // NULL stays null (gap), NEVER 0
//         latency_avg_ms: number | null
//       }
//     toChartData is a pure 1:1 transform (one point per bucket, same order).
//     The CRITICAL invariant: a bucket whose latency_p95_ms is null MUST yield a
//     point whose latency_p95_ms is null (a visual gap), not coerced to 0.
//
// recharts-in-jsdom note: ResponsiveContainer reports 0x0 in jsdom so SVG paths
// would not render. We mock it to a fixed-size box and assert on the wrapper
// testid + the pure helper rather than SVG internals.
// ---------------------------------------------------------------------------

// Mock recharts ResponsiveContainer so children get a real (non-zero) box.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  }
})

import TimeseriesChart, { toChartData } from './TimeseriesChart'

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
    bucket_start: '2026-05-27T00:01:00Z',
    checks_total: 10,
    checks_up: 5,
    up_ratio: 0.5,
    latency_avg_ms: null,
    latency_p95_ms: null,
  },
  {
    bucket_start: '2026-05-27T00:02:00Z',
    checks_total: 10,
    checks_up: 9,
    up_ratio: 0.9,
    latency_avg_ms: 90,
    latency_p95_ms: 150,
  },
]

describe('toChartData', () => {
  it('returns one point per bucket in the same order', () => {
    const data = toChartData(buckets)
    expect(data).toHaveLength(buckets.length)
    expect(data.map((p) => p.bucket_start)).toEqual([
      '2026-05-27T00:00:00Z',
      '2026-05-27T00:01:00Z',
      '2026-05-27T00:02:00Z',
    ])
  })

  it('carries up_ratio and latency_p95_ms through for non-null buckets', () => {
    const data = toChartData(buckets)
    expect(data[0].up_ratio).toBe(1)
    expect(data[0].latency_p95_ms).toBe(200)
    expect(data[2].up_ratio).toBe(0.9)
    expect(data[2].latency_p95_ms).toBe(150)
  })

  it('keeps a null latency_p95_ms as null (gap), NOT coerced to 0', () => {
    const data = toChartData(buckets)
    expect(data[1].latency_p95_ms).toBeNull()
    expect(data[1].latency_p95_ms).not.toBe(0)
  })

  it('returns an empty array for empty input', () => {
    expect(toChartData([])).toEqual([])
  })
})

describe('TimeseriesChart', () => {
  it('renders the chart wrapper when given buckets', () => {
    render(<TimeseriesChart buckets={buckets} />)
    expect(screen.getByTestId('timeseries-chart')).toBeInTheDocument()
  })

  it('renders the empty state and no chart for empty buckets', () => {
    render(<TimeseriesChart buckets={[]} />)
    expect(screen.getByTestId('timeseries-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('timeseries-chart')).not.toBeInTheDocument()
  })
})
