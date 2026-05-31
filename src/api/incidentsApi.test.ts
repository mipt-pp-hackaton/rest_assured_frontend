import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { tokenStorage } from '../auth/tokenStorage'
import { listIncidents } from './incidentsApi'
import type { IncidentRead } from './types'

/**
 * Contracts under test (RED phase) for src/api/incidentsApi.ts:
 *
 *   listIncidents(filters?: {
 *     serviceId?: number
 *     open?: boolean
 *     slaBreach?: boolean
 *     limit?: number
 *   }): Promise<IncidentRead[]>
 *     - GET `${VITE_API_BASE_URL}/api/incidents` via authedRequest.
 *     - Resolves with the IncidentRead[] returned by the server.
 *     - Filter -> backend query param name mapping:
 *         serviceId -> service_id
 *         open      -> open
 *         slaBreach -> sla_breach
 *         limit     -> limit
 *     - Only filters that are actually provided are appended to the query
 *       string. Omitted filters MUST NOT appear at all.
 *     - Boolean filters serialize as the strings "true" / "false".
 *
 *   limit contract (chosen): limit is OPTIONAL and NOT forced. When omitted,
 *   no `limit` param is sent (the backend applies its own default of 100).
 *   When provided, the value is CLAMPED into the inclusive range [1, 500]:
 *     - limit < 1   -> sent as "1"
 *     - limit > 500 -> sent as "500"
 *     - in-range    -> sent verbatim.
 *
 *   Auth: requests carry `Authorization: Bearer <access>` when a token is in
 *   tokenStorage (listIncidents goes through authedRequest).
 */

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`

const sample: IncidentRead[] = [
  {
    id: 1,
    service_id: 10,
    service_name: 'API Gateway',
    opened_at: '2026-05-01T00:00:00Z',
    closed_at: null,
    last_error: 'timeout',
    sla_breach: true,
    duration_seconds: null,
  },
  {
    id: 2,
    service_id: 11,
    service_name: 'Billing',
    opened_at: '2026-05-02T00:00:00Z',
    closed_at: '2026-05-02T01:00:00Z',
    last_error: null,
    sla_breach: false,
    duration_seconds: 3600,
  },
]

/**
 * Registers a one-shot handler for GET /api/incidents and resolves with the
 * captured URLSearchParams (and the Authorization header) once the call lands.
 */
function captureIncidentsRequest(response: IncidentRead[] = sample): {
  params: Promise<URLSearchParams>
  auth: Promise<string | null>
} {
  let resolveParams!: (p: URLSearchParams) => void
  let resolveAuth!: (a: string | null) => void
  const params = new Promise<URLSearchParams>((r) => {
    resolveParams = r
  })
  const auth = new Promise<string | null>((r) => {
    resolveAuth = r
  })

  server.use(
    http.get(url('/api/incidents'), ({ request: req }) => {
      resolveParams(new URL(req.url).searchParams)
      resolveAuth(req.headers.get('Authorization'))
      return HttpResponse.json(response, { status: 200 })
    }),
  )

  return { params, auth }
}

beforeEach(() => {
  tokenStorage.clear()
})

describe('incidentsApi.listIncidents()', () => {
  it('GETs /api/incidents with no query params and returns the array', async () => {
    const { params } = captureIncidentsRequest()

    const result = await listIncidents()

    const search = await params
    expect([...search.keys()]).toEqual([])
    expect(result).toEqual(sample)
  })

  it('appends only provided filters with the correct backend names', async () => {
    const { params } = captureIncidentsRequest()

    await listIncidents({
      serviceId: 10,
      open: true,
      slaBreach: false,
      limit: 50,
    })

    const search = await params
    expect(search.get('service_id')).toBe('10')
    expect(search.get('open')).toBe('true')
    expect(search.get('sla_breach')).toBe('false')
    expect(search.get('limit')).toBe('50')
  })

  it('omits filters that are not provided (no stray params)', async () => {
    const { params } = captureIncidentsRequest()

    await listIncidents({ serviceId: 7 })

    const search = await params
    expect(search.get('service_id')).toBe('7')
    expect(search.has('open')).toBe(false)
    expect(search.has('sla_breach')).toBe(false)
    expect(search.has('limit')).toBe(false)
    expect([...search.keys()]).toEqual(['service_id'])
  })

  it('does not force a limit when limit is omitted', async () => {
    const { params } = captureIncidentsRequest()

    await listIncidents({ open: true })

    const search = await params
    expect(search.has('limit')).toBe(false)
  })

  it('serializes boolean filters as "true" / "false" strings', async () => {
    const { params } = captureIncidentsRequest()

    await listIncidents({ open: false, slaBreach: true })

    const search = await params
    expect(search.get('open')).toBe('false')
    expect(search.get('sla_breach')).toBe('true')
  })

  it('clamps limit below 1 up to 1', async () => {
    const { params } = captureIncidentsRequest()

    await listIncidents({ limit: 0 })

    const search = await params
    expect(search.get('limit')).toBe('1')
  })

  it('clamps limit above 500 down to 500', async () => {
    const { params } = captureIncidentsRequest()

    await listIncidents({ limit: 9999 })

    const search = await params
    expect(search.get('limit')).toBe('500')
  })

  it('passes through an in-range limit verbatim', async () => {
    const { params } = captureIncidentsRequest()

    await listIncidents({ limit: 250 })

    const search = await params
    expect(search.get('limit')).toBe('250')
  })

  it('sends Authorization: Bearer header when a token is stored', async () => {
    tokenStorage.setTokens({ access: 'acc-123', refresh: 'ref-123' })
    const { auth } = captureIncidentsRequest()

    await listIncidents()

    expect(await auth).toBe('Bearer acc-123')
  })
})
