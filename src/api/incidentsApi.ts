import { authedRequest } from './authInterceptor'
import type { IncidentRead } from './types'

/**
 * Incidents API client.
 *
 * Wraps the backend `/api/incidents` endpoint through `authedRequest`, which
 * attaches the bearer token and handles transparent token refresh.
 */

export interface IncidentFilters {
  serviceId?: number
  open?: boolean
  slaBreach?: boolean
  limit?: number
}

const LIMIT_MIN = 1
const LIMIT_MAX = 500

function clampLimit(limit: number): number {
  return Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, limit))
}

/**
 * GET /api/incidents.
 *
 * Only filters that are explicitly provided are sent as query params; omitted
 * filters are left off entirely (the backend applies its own defaults, e.g.
 * limit = 100). When `limit` is provided it is clamped into [1, 500].
 */
export async function listIncidents(
  filters: IncidentFilters = {},
): Promise<IncidentRead[]> {
  const params = new URLSearchParams()

  if (filters.serviceId !== undefined) {
    params.set('service_id', String(filters.serviceId))
  }
  if (filters.open !== undefined) {
    params.set('open', String(filters.open))
  }
  if (filters.slaBreach !== undefined) {
    params.set('sla_breach', String(filters.slaBreach))
  }
  if (filters.limit !== undefined) {
    params.set('limit', String(clampLimit(filters.limit)))
  }

  const query = params.toString()
  const path = query ? `/api/incidents?${query}` : '/api/incidents'

  const result = await authedRequest<IncidentRead[]>(path)
  return result ?? []
}
