import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import type { ServiceRead } from '../../api/types'

// ---------------------------------------------------------------------------
// T19 SERVICE TABLE CONTRACT (component)
//
// ServiceTable (src/features/services/ServiceTable.tsx — to be implemented) is
// a PRESENTATIONAL component that renders a row per ServiceRead and exposes a
// per-row Delete affordance. It does NOT fetch on its own; the parent page owns
// the react-query lifecycle. The contract:
//
//   props:
//     services: ServiceRead[]            // rows to render (already loaded)
//     onDelete: (id: number) => void     // called once, with the row id, when
//                                         // a row's delete is CONFIRMED.
//
//   Per row (data-testid="service-row-{id}") it MUST show:
//     - name              (plain text)
//     - url               (plain text)
//     - http_method       (plain text, e.g. "GET")
//     - interval          rendered from interval_ms as text containing the raw
//                          interval_ms number (e.g. "60000"); a human suffix
//                          such as "60000 ms" / "60 s" is allowed as long as the
//                          numeric value is present in the row text.
//     - active flag       data-testid="service-active-{id}" whose text is
//                          "Active" when is_active === true and "Inactive"
//                          otherwise.
//
//   Delete flow (two-step confirm, NO window.confirm):
//     - Each row has a delete trigger: data-testid="service-delete-{id}",
//       role button, accessible name /delete/i.
//     - Clicking it reveals an in-row confirmation with:
//         confirm button: data-testid="service-delete-confirm-{id}"
//         cancel  button: data-testid="service-delete-cancel-{id}"
//     - Clicking confirm calls onDelete(id) exactly once with that row's id.
//     - Clicking cancel calls onDelete 0 times and hides the confirmation.
// ---------------------------------------------------------------------------

// Imported here so the test FAILS at module resolution until the component
// exists (RED). Named export `ServiceTable` expected.
import { ServiceTable } from './ServiceTable'

const services: ServiceRead[] = [
  {
    id: 1,
    url: 'https://example.com/health',
    name: 'Example API',
    http_method: 'GET',
    interval_ms: 60000,
    expected_status: 200,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    url: 'https://second.test/ping',
    name: 'Second Service',
    http_method: 'POST',
    interval_ms: 30000,
    expected_status: null,
    is_active: false,
    created_at: '2026-02-02T00:00:00Z',
  },
]

describe('ServiceTable', () => {
  let onDelete: ReturnType<typeof vi.fn<(id: number) => void>>

  beforeEach(() => {
    onDelete = vi.fn<(id: number) => void>()
  })

  it('renders a row per service with name, url, http_method, interval and active flag', () => {
    render(<ServiceTable services={services} onDelete={onDelete} />)

    const row1 = screen.getByTestId('service-row-1')
    expect(within(row1).getByText('Example API')).toBeInTheDocument()
    expect(within(row1).getByText('https://example.com/health')).toBeInTheDocument()
    expect(within(row1).getByText('GET')).toBeInTheDocument()
    // interval_ms numeric value present in the row text.
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

  it('confirm delete calls onDelete(id) exactly once with the row id', async () => {
    const user = userEvent.setup()
    render(<ServiceTable services={services} onDelete={onDelete} />)

    // Confirmation is not shown until the delete trigger is clicked.
    expect(
      screen.queryByTestId('service-delete-confirm-1'),
    ).not.toBeInTheDocument()

    await user.click(screen.getByTestId('service-delete-1'))
    await user.click(await screen.findByTestId('service-delete-confirm-1'))

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith(1)
  })

  it('cancel delete does NOT call onDelete and hides the confirmation', async () => {
    const user = userEvent.setup()
    render(<ServiceTable services={services} onDelete={onDelete} />)

    await user.click(screen.getByTestId('service-delete-2'))
    const cancel = await screen.findByTestId('service-delete-cancel-2')
    await user.click(cancel)

    expect(onDelete).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(
        screen.queryByTestId('service-delete-confirm-2'),
      ).not.toBeInTheDocument()
    })
  })
})
