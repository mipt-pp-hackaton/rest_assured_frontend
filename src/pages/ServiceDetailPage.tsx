import { useMemo, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getServiceMetrics, getTimeseries } from '../api/metricsApi'
import MetricsPanel from '../features/services/MetricsPanel'
import TimeseriesChart from '../features/services/TimeseriesChart'
import QueryStates from '../components/QueryStates'

type RangePreset = '1h' | '24h' | '7d'

/** Window length (seconds) and default bucket for each range preset. */
const RANGE_PRESETS: Record<
  RangePreset,
  { windowSeconds: number; bucketSeconds: number }
> = {
  '1h': { windowSeconds: 60 * 60, bucketSeconds: 60 },
  '24h': { windowSeconds: 24 * 60 * 60, bucketSeconds: 300 },
  '7d': { windowSeconds: 7 * 24 * 60 * 60, bucketSeconds: 3600 },
}

const BUCKET_OPTIONS = ['60', '300', '3600'] as const

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { pathname } = useLocation()
  // Prefer the route param; fall back to parsing the path so the page works
  // when mounted directly (e.g. in tests) without a matching <Route>.
  const rawId = id ?? pathname.match(/\/services\/(\d+)/)?.[1]
  const serviceId = Number(rawId)

  const [range, setRange] = useState<RangePreset>('24h')
  // Bucket override: when null we follow the preset's default bucket.
  const [bucketOverride, setBucketOverride] = useState<number | null>(null)

  const preset = RANGE_PRESETS[range]
  const bucketSeconds = bucketOverride ?? preset.bucketSeconds

  // `to` is "now" and `from` is `to` minus the preset window. Computed once per
  // range change so the query key stays stable across unrelated re-renders.
  const { from, to } = useMemo(() => {
    const now = new Date()
    const fromDate = new Date(now.getTime() - preset.windowSeconds * 1000)
    return { from: fromDate.toISOString(), to: now.toISOString() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, preset.windowSeconds])

  const metricsQuery = useQuery({
    queryKey: ['service-metrics', serviceId],
    queryFn: () => getServiceMetrics(serviceId),
  })

  const timeseriesQuery = useQuery({
    queryKey: ['service-timeseries', serviceId, from, to, bucketSeconds],
    queryFn: () => getTimeseries(serviceId, { from, to, bucketSeconds }),
  })

  return (
    <div data-testid="service-detail-page">
      <section>
        <QueryStates
          testIdPrefix="metrics"
          isPending={metricsQuery.isPending}
          isError={metricsQuery.isError}
          isEmpty={false}
          onRetry={() => void metricsQuery.refetch()}
          retryTestId="metrics-retry"
          errorText="Failed to load metrics."
        >
          {!metricsQuery.isPending && !metricsQuery.isError ? (
            <MetricsPanel metrics={metricsQuery.data} />
          ) : null}
        </QueryStates>
      </section>

      <section>
        <label>
          Range
          <select
            data-testid="range-select"
            value={range}
            onChange={(e) => {
              setRange(e.target.value as RangePreset)
              // Switching presets returns to that preset's default bucket.
              setBucketOverride(null)
            }}
          >
            <option value="1h">Last hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
        </label>
        <label>
          Bucket
          <select
            data-testid="bucket-select"
            value={String(bucketSeconds)}
            onChange={(e) => setBucketOverride(Number(e.target.value))}
          >
            {BUCKET_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}s
              </option>
            ))}
          </select>
        </label>

        <QueryStates
          testIdPrefix="timeseries"
          isPending={timeseriesQuery.isPending}
          isError={timeseriesQuery.isError}
          isEmpty={false}
          onRetry={() => void timeseriesQuery.refetch()}
          retryTestId="timeseries-retry"
          errorText="Failed to load timeseries."
        >
          {!timeseriesQuery.isPending && !timeseriesQuery.isError ? (
            <TimeseriesChart buckets={timeseriesQuery.data} />
          ) : null}
        </QueryStates>
      </section>
    </div>
  )
}
