import { authedRequest } from './authInterceptor'
import type { ServiceCreate, ServiceRead, ServiceUpdate } from './types'

/**
 * Monitored-service CRUD endpoints for the rest-assured backend.
 *
 * Every call goes through `authedRequest` so the `Authorization: Bearer
 * <access>` header is attached and the transparent 401-refresh-retry applies.
 * JSON bodies are stringified; `updateService` serializes only the keys that
 * are actually present on the patch so no `undefined` fields leak into the
 * request payload.
 */

/** Builds the `/api/services/{id}` base path, rejecting non-positive-integer ids. */
function serviceIdPath(id: number): string {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid service id: ${id} (expected a positive integer)`)
  }
  return `/api/services/${id}`
}

/** GET /api/services/ — list all services. */
export async function listServices(): Promise<ServiceRead[]> {
  return (await authedRequest<ServiceRead[]>('/api/services/')) as ServiceRead[]
}

/** GET /api/services/{id} — fetch a single service. */
export async function getService(id: number): Promise<ServiceRead> {
  return (await authedRequest<ServiceRead>(serviceIdPath(id))) as ServiceRead
}

/** POST /api/services/ — create a service (JSON, 201). */
export async function createService(body: ServiceCreate): Promise<ServiceRead> {
  return (await authedRequest<ServiceRead>('/api/services/', {
    method: 'POST',
    body: JSON.stringify(body),
  })) as ServiceRead
}

/** PATCH /api/services/{id} — update only the provided fields (JSON). */
export async function updateService(
  id: number,
  patch: ServiceUpdate,
): Promise<ServiceRead> {
  const payload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      payload[key] = value
    }
  }
  return (await authedRequest<ServiceRead>(serviceIdPath(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })) as ServiceRead
}

/** DELETE /api/services/{id} — remove a service (204 -> undefined). */
export async function deleteService(id: number): Promise<void> {
  await authedRequest<void>(serviceIdPath(id), { method: 'DELETE' })
}
