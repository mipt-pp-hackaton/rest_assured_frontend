import { authedRequest } from './authInterceptor'
import type {
  ServiceSummaryItem,
  ServiceMetricsResponse,
  TimeseriesBucket,
} from './types'

/**
 * Metrics endpoints for the rest-assured backend.
 *
 * All requests go through `authedRequest`, which attaches the bearer token and
 * transparently refreshes/retries on 401.
 */

/** Asserts `id` is a positive integer before it is interpolated into a URL. */
function assertId(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid service id: ${id} (expected a positive integer)`)
  }
}

/** GET /api/services/summary — per-service uptime/SLA summary rows. */
export async function getSummary(): Promise<ServiceSummaryItem[]> {
  return (await authedRequest<ServiceSummaryItem[]>(
    '/api/services/summary',
  )) as ServiceSummaryItem[]
}

/** GET /api/services/{id}/metrics — current metrics for a single service. */
export async function getServiceMetrics(
  id: number,
): Promise<ServiceMetricsResponse> {
  assertId(id)
  return (await authedRequest<ServiceMetricsResponse>(
    `/api/services/${id}/metrics`,
  )) as ServiceMetricsResponse
}

/**
 * GET /api/services/{id}/timeseries — bucketed metrics over a time range.
 *
 * `bucket_seconds` defaults to 60 when `bucketSeconds` is omitted.
 */
export async function getTimeseries(
  id: number,
  params: { from: string; to: string; bucketSeconds?: number },
): Promise<TimeseriesBucket[]> {
  assertId(id)
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    bucket_seconds: String(params.bucketSeconds ?? 60),
  })
  return (await authedRequest<TimeseriesBucket[]>(
    `/api/services/${id}/timeseries?${query.toString()}`,
  )) as TimeseriesBucket[]
}
