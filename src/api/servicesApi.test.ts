import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { tokenStorage } from '../auth/tokenStorage'
import type { ServiceCreate, ServiceRead, ServiceUpdate } from './types'
import {
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
} from './servicesApi'

/**
 * Contract under test (RED phase) for src/api/servicesApi.ts:
 *
 *   listServices(): Promise<ServiceRead[]>
 *     - GET /api/services/  -> returns the array.
 *   getService(id: number): Promise<ServiceRead>
 *     - GET /api/services/{id}
 *   createService(body: ServiceCreate): Promise<ServiceRead>
 *     - POST /api/services/ with the JSON body -> 201 ServiceRead.
 *   updateService(id: number, patch: ServiceUpdate): Promise<ServiceRead>
 *     - PATCH /api/services/{id} sending ONLY the provided fields in the body.
 *   deleteService(id: number): Promise<void>
 *     - DELETE /api/services/{id} -> resolves on 204.
 *
 * All calls must go through authedRequest so the Authorization: Bearer <token>
 * header is attached when an access token is present in tokenStorage.
 */

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`

const sampleService: ServiceRead = {
  id: 1,
  url: 'https://example.com/health',
  name: 'Example',
  http_method: 'GET',
  interval_ms: 60000,
  expected_status: 200,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  tokenStorage.clear()
})

describe('listServices()', () => {
  it('GETs /api/services/ and returns the array of ServiceRead', async () => {
    const services: ServiceRead[] = [
      sampleService,
      { ...sampleService, id: 2, name: 'Second' },
    ]

    let seenMethod: string | null = null
    server.use(
      http.get(url('/api/services/'), ({ request: req }) => {
        seenMethod = req.method
        return HttpResponse.json(services, { status: 200 })
      })
    )

    const result = await listServices()

    expect(seenMethod).toBe('GET')
    expect(result).toEqual(services)
  })
})

describe('getService()', () => {
  it('GETs /api/services/{id} and returns the ServiceRead', async () => {
    let seenMethod: string | null = null
    server.use(
      http.get(url('/api/services/42'), ({ request: req }) => {
        seenMethod = req.method
        return HttpResponse.json({ ...sampleService, id: 42 }, { status: 200 })
      })
    )

    const result = await getService(42)

    expect(seenMethod).toBe('GET')
    expect(result).toEqual({ ...sampleService, id: 42 })
  })
})

describe('createService()', () => {
  it('POSTs the body to /api/services/ and returns the 201 ServiceRead', async () => {
    const body: ServiceCreate = {
      url: 'https://new.example.com',
      name: 'New service',
      http_method: 'GET',
      interval_ms: 30000,
      expected_status: 200,
      is_active: true,
    }

    let seenMethod: string | null = null
    let seenBody: unknown = null
    server.use(
      http.post(url('/api/services/'), async ({ request: req }) => {
        seenMethod = req.method
        seenBody = await req.json()
        return HttpResponse.json(
          { ...sampleService, id: 7, ...body },
          { status: 201 }
        )
      })
    )

    const result = await createService(body)

    expect(seenMethod).toBe('POST')
    expect(seenBody).toEqual(body)
    expect(result).toEqual({ ...sampleService, id: 7, ...body })
  })
})

describe('updateService()', () => {
  it('PATCHes /api/services/{id} with ONLY the provided fields in the JSON body', async () => {
    const patch: ServiceUpdate = { name: 'Renamed', is_active: false }

    let seenMethod: string | null = null
    let seenBody: unknown = null
    server.use(
      http.patch(url('/api/services/9'), async ({ request: req }) => {
        seenMethod = req.method
        seenBody = await req.json()
        return HttpResponse.json(
          { ...sampleService, id: 9, name: 'Renamed', is_active: false },
          { status: 200 }
        )
      })
    )

    const result = await updateService(9, patch)

    expect(seenMethod).toBe('PATCH')
    // Only the keys provided in the patch are serialized — no extra fields.
    expect(seenBody).toEqual({ name: 'Renamed', is_active: false })
    expect(Object.keys(seenBody as object).sort()).toEqual([
      'is_active',
      'name',
    ])
    expect(result).toEqual({
      ...sampleService,
      id: 9,
      name: 'Renamed',
      is_active: false,
    })
  })
})

describe('deleteService()', () => {
  it('DELETEs /api/services/{id} and resolves (void) on 204', async () => {
    let seenMethod: string | null = null
    server.use(
      http.delete(url('/api/services/5'), ({ request: req }) => {
        seenMethod = req.method
        return new HttpResponse(null, { status: 204 })
      })
    )

    const result = await deleteService(5)

    expect(seenMethod).toBe('DELETE')
    expect(result).toBeUndefined()
  })
})

describe('servicesApi — goes through authedRequest', () => {
  it('attaches Authorization: Bearer <token> when an access token is set', async () => {
    tokenStorage.setTokens({ access: 'access-abc', refresh: 'refresh-xyz' })

    const seenAuthHeaders: (string | null)[] = []

    server.use(
      http.get(url('/api/services/'), ({ request: req }) => {
        seenAuthHeaders.push(req.headers.get('Authorization'))
        return HttpResponse.json([sampleService], { status: 200 })
      }),
      http.post(url('/api/services/'), ({ request: req }) => {
        seenAuthHeaders.push(req.headers.get('Authorization'))
        return HttpResponse.json(sampleService, { status: 201 })
      })
    )

    await listServices()
    await createService({
      url: 'https://x.example.com',
      name: 'X',
      http_method: 'GET',
      interval_ms: 60000,
      is_active: true,
    })

    expect(seenAuthHeaders).toEqual([
      'Bearer access-abc',
      'Bearer access-abc',
    ])
  })
})
