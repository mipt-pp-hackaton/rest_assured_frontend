import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { tokenStorage } from '../auth/tokenStorage'
import { getSummary, getServiceMetrics, getTimeseries } from './metricsApi'
import type {
  ServiceSummaryItem,
  ServiceMetricsResponse,
  TimeseriesBucket,
} from './types'

/**
 * Contracts under test (RED phase) for src/api/metricsApi.ts:
 *
 *   getSummary(): Promise<ServiceSummaryItem[]>
 *     - GET `${VITE_API_BASE_URL}/api/services/summary`
 *     - Resolves with the ServiceSummaryItem[] returned by the server.
 *
 *   getServiceMetrics(id: number): Promise<ServiceMetricsResponse>
 *     - GET `${VITE_API_BASE_URL}/api/services/{id}/metrics`
 *     - Resolves with the ServiceMetricsResponse returned by the server.
 *
 *   getTimeseries(
 *     id: number,
 *     params: { from: string; to: string; bucketSeconds?: number },
 *   ): Promise<TimeseriesBucket[]>
 *     - GET `${VITE_API_BASE_URL}/api/services/{id}/timeseries`
 *     - Query params: `from`, `to` (ISO date-time), `bucket_seconds`.
 *     - `bucket_seconds` defaults to 60 when `bucketSeconds` is omitted;
 *       uses the provided value otherwise.
 *     - Resolves with the TimeseriesBucket[] returned by the server.
 *
 * All requests go through authedRequest(), so an Authorization: Bearer header
 * must be attached when a token is present in tokenStorage.
 */

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`

beforeEach(() => {
  tokenStorage.clear()
})

describe('metricsApi.getSummary()', () => {
  it('GETs /api/services/summary and returns the ServiceSummaryItem[]', async () => {
    const summary: ServiceSummaryItem[] = [
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
        last_check_is_up: null,
      },
    ]

    let calledPath: string | null = null
    server.use(
      http.get(url('/api/services/summary'), ({ request: req }) => {
        calledPath = new URL(req.url).pathname
        return HttpResponse.json(summary, { status: 200 })
      })
    )

    const result = await getSummary()

    expect(calledPath).toBe('/api/services/summary')
    expect(result).toEqual(summary)
  })

  it('attaches Authorization: Bearer header when a token is stored', async () => {
    tokenStorage.setTokens({ access: 'access-token-1', refresh: 'refresh-1' })

    let seenAuth: string | null = null
    server.use(
      http.get(url('/api/services/summary'), ({ request: req }) => {
        seenAuth = req.headers.get('Authorization')
        return HttpResponse.json([], { status: 200 })
      })
    )

    await getSummary()

    expect(seenAuth).toBe('Bearer access-token-1')
  })
})

describe('metricsApi.getServiceMetrics()', () => {
  it('GETs /api/services/{id}/metrics and returns the ServiceMetricsResponse', async () => {
    const metrics: ServiceMetricsResponse = {
      service_id: 42,
      current_uptime_seconds: 7200,
      sla_pct: 99.99,
      computed_at: '2026-05-27T12:00:00Z',
    }

    let calledPath: string | null = null
    server.use(
      http.get(url('/api/services/42/metrics'), ({ request: req }) => {
        calledPath = new URL(req.url).pathname
        return HttpResponse.json(metrics, { status: 200 })
      })
    )

    const result = await getServiceMetrics(42)

    expect(calledPath).toBe('/api/services/42/metrics')
    expect(result).toEqual(metrics)
  })

  it('uses the provided numeric id in the path', async () => {
    const metrics: ServiceMetricsResponse = {
      service_id: 7,
      current_uptime_seconds: 100,
      sla_pct: 50,
      computed_at: '2026-05-27T00:00:00Z',
    }

    server.use(
      http.get(url('/api/services/7/metrics'), () =>
        HttpResponse.json(metrics, { status: 200 })
      )
    )

    const result = await getServiceMetrics(7)
    expect(result).toEqual(metrics)
  })
})

describe('metricsApi.getTimeseries()', () => {
  const FROM = '2026-05-26T00:00:00Z'
  const TO = '2026-05-27T00:00:00Z'

  const buckets: TimeseriesBucket[] = [
    {
      bucket_start: '2026-05-26T00:00:00Z',
      checks_total: 60,
      checks_up: 59,
      up_ratio: 0.9833,
      latency_avg_ms: 120.5,
      latency_p95_ms: 240,
    },
    {
      bucket_start: '2026-05-26T00:01:00Z',
      checks_total: 60,
      checks_up: 60,
      up_ratio: 1,
      latency_avg_ms: null,
      latency_p95_ms: null,
    },
  ]

  it('GETs /api/services/{id}/timeseries with from, to and the provided bucket_seconds', async () => {
    let calledPath: string | null = null
    const seen: Record<string, string | null> = {}

    server.use(
      http.get(url('/api/services/5/timeseries'), ({ request: req }) => {
        const u = new URL(req.url)
        calledPath = u.pathname
        seen.from = u.searchParams.get('from')
        seen.to = u.searchParams.get('to')
        seen.bucket_seconds = u.searchParams.get('bucket_seconds')
        return HttpResponse.json(buckets, { status: 200 })
      })
    )

    const result = await getTimeseries(5, {
      from: FROM,
      to: TO,
      bucketSeconds: 300,
    })

    expect(calledPath).toBe('/api/services/5/timeseries')
    expect(seen.from).toBe(FROM)
    expect(seen.to).toBe(TO)
    expect(seen.bucket_seconds).toBe('300')
    expect(result).toEqual(buckets)
  })

  it('defaults bucket_seconds to 60 when bucketSeconds is omitted', async () => {
    let seenBucketSeconds: string | null = null

    server.use(
      http.get(url('/api/services/5/timeseries'), ({ request: req }) => {
        const u = new URL(req.url)
        seenBucketSeconds = u.searchParams.get('bucket_seconds')
        return HttpResponse.json(buckets, { status: 200 })
      })
    )

    const result = await getTimeseries(5, { from: FROM, to: TO })

    expect(seenBucketSeconds).toBe('60')
    expect(result).toEqual(buckets)
  })

  it('attaches Authorization: Bearer header when a token is stored', async () => {
    tokenStorage.setTokens({ access: 'ts-access', refresh: 'ts-refresh' })

    let seenAuth: string | null = null
    server.use(
      http.get(url('/api/services/9/timeseries'), ({ request: req }) => {
        seenAuth = req.headers.get('Authorization')
        return HttpResponse.json([], { status: 200 })
      })
    )

    await getTimeseries(9, { from: FROM, to: TO })

    expect(seenAuth).toBe('Bearer ts-access')
  })
})
