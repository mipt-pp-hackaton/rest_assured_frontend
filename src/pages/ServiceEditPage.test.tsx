import { describe, expect, it, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../test/server'
import { tokenStorage } from '../auth/tokenStorage'
import type { ServiceRead } from '../api/types'

// ---------------------------------------------------------------------------
// T20 SERVICE EDIT PAGE CONTRACT (page)
//
// ServiceEditPage (src/pages/ServiceEditPage.tsx — to be implemented):
//   - reads the :id route param and fetches getService(id) ->
//     GET /api/services/{id}.
//   - exposes data-testid="service-edit-page".
//   - while loading: data-testid="service-edit-loading".
//   - on load error (non-2xx): data-testid="service-edit-error".
//   - renders ServiceForm in mode="edit" pre-populated from the fetched service.
//   - on submit calls updateService(id, patch) -> PATCH /api/services/{id}
//     with a body containing ONLY the changed keys (diffed by ServiceForm).
//   - on success navigates to "/services/{id}".
//   - on 422 maps detail entries to the matching field errors; no navigation.
//
// Base URL: VITE_API_BASE_URL=http://api.test
//   GET   http://api.test/api/services/{id}
//   PATCH http://api.test/api/services/{id}
// ---------------------------------------------------------------------------

import ServiceEditPage from './ServiceEditPage'

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`

const existing: ServiceRead = {
  id: 5,
  url: 'https://existing.test/ping',
  name: 'Existing Service',
  http_method: 'GET',
  interval_ms: 60000,
  expected_status: 200,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

// Renders the edit page at "/services/5/edit" with a sibling "/services/5"
// route exposing a marker so a successful update navigation is observable.
function renderPage(id = 5) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={[`/services/${id}/edit`]}>
        <Routes>
          <Route path="/services/:id/edit" element={<ServiceEditPage />} />
          <Route
            path="/services/:id"
            element={<div data-testid="service-detail-marker">detail</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  tokenStorage.setTokens({ access: 'test-access', refresh: 'test-refresh' })
})

describe('ServiceEditPage', () => {
  it('fetches GET /api/services/{id} and pre-populates the form', async () => {
    let requestedId: string | null = null
    server.use(
      http.get(url('/api/services/:id'), ({ params }) => {
        requestedId = String(params.id)
        return HttpResponse.json(existing)
      }),
    )

    renderPage(5)

    expect(await screen.findByTestId('service-edit-page')).toBeInTheDocument()
    await waitFor(() => {
      expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe(
        'Existing Service',
      )
    })
    expect((screen.getByLabelText(/url/i) as HTMLInputElement).value).toBe(
      'https://existing.test/ping',
    )
    expect((screen.getByLabelText(/interval/i) as HTMLInputElement).value).toBe(
      '60000',
    )
    expect(requestedId).toBe('5')
  })

  it('shows the loading state while the service request is in flight', async () => {
    let resolveGet: (value: ServiceRead) => void = () => {}
    const pending = new Promise<ServiceRead>((resolve) => {
      resolveGet = resolve
    })
    server.use(
      http.get(url('/api/services/:id'), async () =>
        HttpResponse.json(await pending),
      ),
    )

    renderPage(5)

    expect(
      await screen.findByTestId('service-edit-loading'),
    ).toBeInTheDocument()

    resolveGet(existing)
    await waitFor(() => {
      expect(
        screen.queryByTestId('service-edit-loading'),
      ).not.toBeInTheDocument()
    })
  })

  it('shows the error state when the service request 500s', async () => {
    server.use(
      http.get(
        url('/api/services/:id'),
        () => new HttpResponse(null, { status: 500 }),
      ),
    )

    renderPage(5)

    expect(await screen.findByTestId('service-edit-error')).toBeInTheDocument()
  })

  it('submit PATCHes ONLY the changed fields then navigates to /services/{id}', async () => {
    const user = userEvent.setup()
    let patchBody: Record<string, unknown> | null = null

    server.use(
      http.get(url('/api/services/:id'), () => HttpResponse.json(existing)),
      http.patch(url('/api/services/:id'), async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...existing, name: 'Renamed Service' })
      }),
    )

    renderPage(5)

    // Wait for pre-population, then change only the name.
    const name = await screen.findByLabelText(/name/i)
    await waitFor(() => {
      expect((name as HTMLInputElement).value).toBe('Existing Service')
    })
    await user.clear(name)
    await user.type(name, 'Renamed Service')
    await user.click(screen.getByTestId('service-submit'))

    // Navigates to the detail page on success.
    expect(
      await screen.findByTestId('service-detail-marker'),
    ).toBeInTheDocument()

    expect(patchBody).not.toBeNull()
    // ONLY the changed key is present in the PATCH body.
    expect(patchBody!).toEqual({ name: 'Renamed Service' })
  })

  it('maps a 422 on PATCH to the right field error and does NOT navigate', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(url('/api/services/:id'), () => HttpResponse.json(existing)),
      http.patch(url('/api/services/:id'), () =>
        HttpResponse.json(
          {
            detail: [
              {
                loc: ['body', 'interval_ms'],
                msg: 'interval_ms must be at least 1000',
                type: 'value_error',
              },
            ],
          },
          { status: 422 },
        ),
      ),
    )

    renderPage(5)

    const interval = await screen.findByLabelText(/interval/i)
    await waitFor(() => {
      expect((interval as HTMLInputElement).value).toBe('60000')
    })
    await user.clear(interval)
    await user.type(interval, '5000')
    await user.click(screen.getByTestId('service-submit'))

    expect(
      await screen.findByTestId('service-interval-ms-error'),
    ).toHaveTextContent('interval_ms must be at least 1000')
    await waitFor(() => {
      expect(
        screen.queryByTestId('service-detail-marker'),
      ).not.toBeInTheDocument()
    })
  })
})
