/*
 * The T21 contract pins `toChartData` as a NAMED export from this file
 * alongside the default chart component, so the react-refresh rule (which wants
 * components-only modules) is intentionally relaxed here.
 */
/* eslint-disable react-refresh/only-export-components */
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { TimeseriesBucket } from '../../api/types'

export interface ChartPoint {
  bucket_start: string
  up_ratio: number
  latency_p95_ms: number | null
  latency_avg_ms: number | null
}

/**
 * Pure 1:1 transform of timeseries buckets into chart points.
 *
 * CRITICAL: a bucket with a null latency MUST keep that null so recharts draws
 * a gap. Never coerce null latency to 0 — that would paint a phantom dip.
 */
export function toChartData(buckets: TimeseriesBucket[]): ChartPoint[] {
  return buckets.map((b) => ({
    bucket_start: b.bucket_start,
    up_ratio: b.up_ratio,
    latency_p95_ms: b.latency_p95_ms,
    latency_avg_ms: b.latency_avg_ms,
  }))
}

export interface TimeseriesChartProps {
  buckets: TimeseriesBucket[]
}

/**
 * Renders a recharts line chart of up_ratio and latency_p95_ms over time.
 * With no buckets it renders an empty-state marker instead of an empty chart.
 */
export default function TimeseriesChart({ buckets }: TimeseriesChartProps) {
  if (buckets.length === 0) {
    return <div data-testid="timeseries-empty">No data for this range.</div>
  }

  const data = toChartData(buckets)

  return (
    <div data-testid="timeseries-chart">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bucket_start" />
          <YAxis yAxisId="up" domain={[0, 1]} />
          <YAxis yAxisId="latency" orientation="right" />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="up"
            type="monotone"
            dataKey="up_ratio"
            name="Up ratio"
            stroke="#16a34a"
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="latency"
            type="monotone"
            dataKey="latency_p95_ms"
            name="Latency p95 (ms)"
            stroke="#2563eb"
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
