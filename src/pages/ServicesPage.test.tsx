import { describe, expect, it, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor, within } from '../test/test-utils'
import userEvent from '@testing-library/user-event'
import { server } from '../test/server'
import { tokenStorage } from '../auth/tokenStorage'
import type { ServiceRead } from '../api/types'

// ---------------------------------------------------------------------------
// T19 SERVICES PAGE CONTRACT (page)
//
// ServicesPage (src/pages/ServicesPage.tsx) MUST:
//   - keep data-testid="services-page" (router wiring identifies the route by
//     it — see src/router.test.tsx).
//   - use react-query useQuery(listServices) to GET /api/services/.
//   - render ServiceTable with the loaded rows (see ServiceTable.test.tsx for
//     the per-row contract: data-testid="service-row-{id}", name/url/method/
//     interval text, data-testid="service-active-{id}" => "Active"/"Inactive").
//   - delete: confirming a row's delete calls DELETE /api/services/{id}, then
//     invalidates/refetches the list; the removed row disappears.
//
// State testids (mutually exclusive):
//   - loading:     data-testid="services-loading"
//   - error (any non-2xx, e.g. 500): data-testid="services-error" PLUS a retry
//                  control data-testid="services-retry" (role button) that, on
//                  click, refetches the list (success -> rows shown).
//   - empty ([]):  data-testid="services-empty"
//
// Optional nav: a "New service" link (data-testid="services-new-link") whose
//   href targets "/services/new". Asserted only for presence + href so this
//   suite does not hard-couple to T20 (which adds the route).
//
// Base URL + endpoints (VITE_API_BASE_URL=http://api.test):
//   GET    http://api.test/api/services/
//   DELETE http://api.test/api/services/{id}
// ---------------------------------------------------------------------------

import ServicesPage from './ServicesPage'

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`

const serviceA: ServiceRead = {
  id: 1,
  url: 'https://example.com/health',
  name: 'Example API',
  http_method: 'GET',
  interval_ms: 60000,
  expected_status: 200,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

const serviceB: ServiceRead = {
  id: 2,
  url: 'https://second.test/ping',
  name: 'Second Service',
  http_method: 'POST',
  interval_ms: 30000,
  expected_status: null,
  is_active: false,
  created_at: '2026-02-02T00:00:00Z',
}

beforeEach(() => {
  // The page calls listServices through authedRequest, which attaches the
  // bearer token from tokenStorage. Seed a token so no 401/refresh kicks in.
  tokenStorage.setTokens({ access: 'test-access', refresh: 'test-refresh' })
})

describe('ServicesPage', () => {
  it('keeps the services-page marker for router wiring', async () => {
    server.use(http.get(url('/api/services/'), () => HttpResponse.json([])))
    render(<ServicesPage />)
    expect(await screen.findByTestId('services-page')).toBeInTheDocument()
  })

  it('shows the loading state while the list request is in flight', async () => {
    let resolveList: (value: ServiceRead[]) => void = () => {}
    const pending = new Promise<ServiceRead[]>((resolve) => {
      resolveList = resolve
    })
    server.use(
      http.get(url('/api/services/'), async () => {
        return HttpResponse.json(await pending)
      }),
    )

    render(<ServicesPage />)

    expect(await screen.findByTestId('services-loading')).toBeInTheDocument()

    // Let the request settle so the test does not leave a dangling promise.
    resolveList([])
    await waitFor(() => {
      expect(screen.queryByTestId('services-loading')).not.toBeInTheDocument()
    })
  })

  it('renders one row per ServiceRead for a 2-item fixture', async () => {
    server.use(
      http.get(url('/api/services/'), () =>
        HttpResponse.json([serviceA, serviceB]),
      ),
    )

    render(<ServicesPage />)

    const row1 = await screen.findByTestId('service-row-1')
    expect(within(row1).getByText('Example API')).toBeInTheDocument()
    expect(within(row1).getByText('https://example.com/health')).toBeInTheDocument()
    expect(within(row1).getByText('GET')).toBeInTheDocument()
    expect(within(row1).getByText(/60000/)).toBeInTheDocument()
    expect(within(row1).getByTestId('service-active-1')).toHaveTextContent(
      'Active',
    )

    const row2 = screen.getByTestId('service-row-2')
    expect(within(row2).getByText('Second Service')).toBeInTheDocument()
    expect(within(row2).getByText('https://second.test/ping')).toBeInTheDocument()
    expect(within(row2).getByText('POST')).toBeInTheDocument()
    expect(within(row2).getByText(/30000/)).toBeInTheDocument()
    expect(within(row2).getByTestId('service-active-2')).toHaveTextContent(
      'Inactive',
    )
  })

  it('shows the empty state when the list is an empty array', async () => {
    server.use(http.get(url('/api/services/'), () => HttpResponse.json([])))

    render(<ServicesPage />)

    expect(await screen.findByTestId('services-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('service-row-1')).not.toBeInTheDocument()
  })

  it('shows the error state with a retry control when the list request 500s', async () => {
    server.use(
      http.get(url('/api/services/'), () => new HttpResponse(null, { status: 500 })),
    )

    render(<ServicesPage />)

    expect(await screen.findByTestId('services-error')).toBeInTheDocument()
    expect(screen.getByTestId('services-retry')).toBeInTheDocument()
  })

  it('retry refetches the list and shows rows after a recovered 500', async () => {
    const user = userEvent.setup()
    let calls = 0
    server.use(
      http.get(url('/api/services/'), () => {
        calls += 1
        if (calls === 1) return new HttpResponse(null, { status: 500 })
        return HttpResponse.json([serviceA])
      }),
    )

    render(<ServicesPage />)

    await user.click(await screen.findByTestId('services-retry'))

    expect(await screen.findByTestId('service-row-1')).toBeInTheDocument()
    expect(screen.queryByTestId('services-error')).not.toBeInTheDocument()
  })

  it('confirming a row delete calls DELETE /api/services/{id} and removes the row after refetch', async () => {
    const user = userEvent.setup()
    let deletedId: number | null = null
    let listCalls = 0

    server.use(
      http.get(url('/api/services/'), () => {
        listCalls += 1
        // First load: both rows. After the delete refetch: only the survivor.
        if (listCalls === 1) return HttpResponse.json([serviceA, serviceB])
        return HttpResponse.json([serviceB])
      }),
      http.delete(url('/api/services/:id'), ({ params }) => {
        deletedId = Number(params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )

    render(<ServicesPage />)

    // Both rows present initially.
    expect(await screen.findByTestId('service-row-1')).toBeInTheDocument()
    expect(screen.getByTestId('service-row-2')).toBeInTheDocument()

    // Open + confirm delete for row 1.
    await user.click(screen.getByTestId('service-delete-1'))
    await user.click(await screen.findByTestId('service-delete-confirm-1'))

    // DELETE hit the right id and the row disappears after the refetch.
    await waitFor(() => {
      expect(deletedId).toBe(1)
    })
    await waitFor(() => {
      expect(screen.queryByTestId('service-row-1')).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('service-row-2')).toBeInTheDocument()
  })

  it('cancelling a row delete sends NO DELETE request and keeps the row', async () => {
    const user = userEvent.setup()
    let deleteCalls = 0

    server.use(
      http.get(url('/api/services/'), () =>
        HttpResponse.json([serviceA, serviceB]),
      ),
      http.delete(url('/api/services/:id'), () => {
        deleteCalls += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )

    render(<ServicesPage />)

    await user.click(await screen.findByTestId('service-delete-1'))
    await user.click(await screen.findByTestId('service-delete-cancel-1'))

    expect(deleteCalls).toBe(0)
    expect(screen.getByTestId('service-row-1')).toBeInTheDocument()
  })

  it('renders a "New service" link pointing at /services/new', async () => {
    server.use(http.get(url('/api/services/'), () => HttpResponse.json([])))

    render(<ServicesPage />)

    const link = await screen.findByTestId('services-new-link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/services/new')
  })
})
