import { describe, expect, it, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../test/server'
import { tokenStorage } from '../auth/tokenStorage'

// ---------------------------------------------------------------------------
// T20 SERVICE CREATE PAGE CONTRACT (page)
//
// ServiceCreatePage (src/pages/ServiceCreatePage.tsx — to be implemented):
//   - renders ServiceForm in mode="create".
//   - exposes data-testid="service-create-page".
//   - on a valid submit, calls createService(body) which POSTs to
//     POST /api/services/ with a ServiceCreate JSON body carrying exactly the
//     entered fields. expected_status is OMITTED (or null) when left blank.
//   - on success (201) navigates to "/services".
//   - on a 422 HTTPValidationError, maps each detail entry to the matching
//     form field's *-error and does NOT navigate. The detail `loc` last segment
//     is the field key (e.g. ["body","url"] -> url error), `msg` is displayed.
//
// Base URL: VITE_API_BASE_URL=http://api.test
//   POST http://api.test/api/services/
// ---------------------------------------------------------------------------

import ServiceCreatePage from './ServiceCreatePage'

const BASE = import.meta.env.VITE_API_BASE_URL
const url = (path: string) => `${BASE}${path}`

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

// Renders the create page at "/services/new" with a sibling "/services" route
// exposing a marker so a successful create (which navigates there) is observable.
function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/services/new']}>
        <Routes>
          <Route path="/services/new" element={<ServiceCreatePage />} />
          <Route
            path="/services"
            element={<div data-testid="services-list-marker">list</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  tokenStorage.setTokens({ access: 'test-access', refresh: 'test-refresh' })
})

describe('ServiceCreatePage', () => {
  it('renders the create page marker and the form', () => {
    renderPage()
    expect(screen.getByTestId('service-create-page')).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/url/i)).toBeInTheDocument()
  })

  it('valid submit POSTs a ServiceCreate body with the entered fields and navigates to /services', async () => {
    const user = userEvent.setup()
    let receivedBody: Record<string, unknown> | null = null

    server.use(
      http.post(url('/api/services/'), async ({ request }) => {
        receivedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            id: 7,
            url: receivedBody.url,
            name: receivedBody.name,
            http_method: receivedBody.http_method ?? 'GET',
            interval_ms: receivedBody.interval_ms ?? 60000,
            expected_status: receivedBody.expected_status ?? null,
            is_active: receivedBody.is_active ?? true,
            created_at: '2026-05-27T00:00:00Z',
          },
          { status: 201 },
        )
      }),
    )

    renderPage()

    await user.type(screen.getByLabelText(/name/i), 'My Service')
    await user.type(screen.getByLabelText(/url/i), 'https://example.com/health')
    await user.selectOptions(screen.getByLabelText(/method/i), 'POST')
    await user.click(screen.getByTestId('service-submit'))

    // Navigates to the list on success.
    expect(await screen.findByTestId('services-list-marker')).toBeInTheDocument()

    expect(receivedBody).not.toBeNull()
    expect(receivedBody!).toMatchObject({
      name: 'My Service',
      url: 'https://example.com/health',
      http_method: 'POST',
      interval_ms: 60000,
      is_active: true,
    })
    // expected_status left blank -> omitted or explicitly null, never "" / NaN.
    const es = receivedBody!.expected_status
    expect(es === undefined || es === null).toBe(true)
    expect(receivedBody!).not.toHaveProperty('expected_status', '')
  })

  it('does NOT POST and shows client validation when required fields are empty', async () => {
    const user = userEvent.setup()
    let posted = false
    server.use(
      http.post(url('/api/services/'), () => {
        posted = true
        return new HttpResponse(null, { status: 201 })
      }),
    )

    renderPage()

    await user.click(screen.getByTestId('service-submit'))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('URL is required')).toBeInTheDocument()
    expect(posted).toBe(false)
    expect(screen.queryByTestId('services-list-marker')).not.toBeInTheDocument()
  })

  it('maps a 422 HTTPValidationError detail to the right field and does NOT navigate', async () => {
    const user = userEvent.setup()
    server.use(
      http.post(url('/api/services/'), () =>
        HttpResponse.json(
          {
            detail: [
              {
                loc: ['body', 'url'],
                msg: 'URL is already monitored',
                type: 'value_error',
              },
            ],
          },
          { status: 422 },
        ),
      ),
    )

    renderPage()

    await user.type(screen.getByLabelText(/name/i), 'My Service')
    await user.type(screen.getByLabelText(/url/i), 'https://example.com/health')
    await user.click(screen.getByTestId('service-submit'))

    expect(
      await screen.findByTestId('service-url-error'),
    ).toHaveTextContent('URL is already monitored')
    // Stayed on the create page.
    await waitFor(() => {
      expect(
        screen.queryByTestId('services-list-marker'),
      ).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('service-create-page')).toBeInTheDocument()
  })
})
