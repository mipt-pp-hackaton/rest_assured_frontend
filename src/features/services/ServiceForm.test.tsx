import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import type { ServiceRead } from '../../api/types'

// ---------------------------------------------------------------------------
// T20 SERVICE FORM CONTRACT (component)
//
// ServiceForm (src/features/services/ServiceForm.tsx — to be implemented) is a
// PRESENTATIONAL/controlled form shared by the create and edit pages. It does
// NOT fetch or mutate on its own; the parent page owns the network lifecycle
// and passes a submit callback. The contract:
//
//   props:
//     mode: 'create' | 'edit'
//     initialValues?: Partial<ServiceFormValues>  // used to pre-populate edit
//     onSubmit: (values: ServiceFormValues) => void | Promise<void>
//         - In CREATE mode `values` is a full ServiceCreate-shaped object.
//         - In EDIT mode `values` contains ONLY the changed keys (a partial
//           ServiceUpdate), computed by diffing against initialValues. When
//           nothing changed it is called with an empty object {} (page may
//           still navigate without a network call — page test owns that).
//     submitLabel?: string  // optional override for the submit button text.
//
//   Fields (accessible labels via getByLabelText, plus stable data-testids):
//     - name           label /name/i, required text input,
//                       data-testid="service-name".
//     - url            label /url/i, required text input,
//                       data-testid="service-url".
//     - http_method    label /method/i, a <select> (role "combobox") whose
//                       options are EXACTLY the 7 HttpMethod enum values
//                       (GET, POST, HEAD, PUT, DELETE, PATCH, OPTIONS); defaults
//                       to "GET"; data-testid="service-http-method".
//     - interval_ms    label /interval/i, number input, default 60000,
//                       data-testid="service-interval-ms".
//     - expected_status label /expected status/i, OPTIONAL number input that may
//                       be left blank; data-testid="service-expected-status".
//     - is_active      label /active/i, a checkbox (role "checkbox") checked by
//                       default; data-testid="service-is-active".
//     - submit         role "button", type="submit", data-testid="service-submit".
//
//   Client validation (blocks submit; onSubmit NOT called):
//     - empty name -> inline error text "Name is required"
//                     (data-testid="service-name-error").
//     - empty url  -> inline error text "URL is required"
//                     (data-testid="service-url-error").
//     - non-http(s) url (e.g. "ftp://x" / "not-a-url") -> inline error text
//                     "URL must be a valid http(s) URL"
//                     (data-testid="service-url-error").
//
//   Server (422) error injection: the parent passes errors down via an
//   `errors` prop shaped { name?: string; url?: string; http_method?: string;
//   interval_ms?: string; expected_status?: string; is_active?: string } and
//   the form renders each message in the matching field's *-error testid. (The
//   page tests below assert the end-to-end 422 -> field mapping; this component
//   test pins the prop wiring.)
// ---------------------------------------------------------------------------

import { ServiceForm, type ServiceFormValues } from './ServiceForm'

const HTTP_METHODS = [
  'GET',
  'POST',
  'HEAD',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS',
] as const

describe('ServiceForm', () => {
  let onSubmit: ReturnType<typeof vi.fn<(values: Partial<ServiceFormValues>) => void>>

  beforeEach(() => {
    onSubmit = vi.fn<(values: Partial<ServiceFormValues>) => void>()
  })

  it('renders all inputs with accessible labels and create-mode defaults', () => {
    render(<ServiceForm mode="create" onSubmit={onSubmit} />)

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/url/i)).toBeInTheDocument()

    const method = screen.getByLabelText(/method/i)
    expect(method).toBeInTheDocument()
    // <select> => combobox role.
    expect(method.tagName).toBe('SELECT')
    expect((method as HTMLSelectElement).value).toBe('GET')

    const interval = screen.getByLabelText(/interval/i) as HTMLInputElement
    expect(interval).toHaveAttribute('type', 'number')
    expect(interval.value).toBe('60000')

    const expected = screen.getByLabelText(/expected status/i) as HTMLInputElement
    expect(expected).toHaveAttribute('type', 'number')
    expect(expected.value).toBe('')

    const active = screen.getByLabelText(/active/i) as HTMLInputElement
    expect(active).toHaveAttribute('type', 'checkbox')
    expect(active.checked).toBe(true)

    expect(
      screen.getByRole('button', { name: /create|save|submit/i }),
    ).toBeInTheDocument()
  })

  it('http_method select offers EXACTLY the 7 enum values', () => {
    render(<ServiceForm mode="create" onSubmit={onSubmit} />)
    const select = screen.getByLabelText(/method/i) as HTMLSelectElement
    const optionValues = Array.from(select.options).map((o) => o.value)
    expect(optionValues).toEqual([...HTTP_METHODS])
  })

  it('blocks submit when name and url are empty: onSubmit NOT called, both errors shown', async () => {
    const user = userEvent.setup()
    render(<ServiceForm mode="create" onSubmit={onSubmit} />)

    await user.click(screen.getByTestId('service-submit'))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('URL is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('blocks submit when url is not an http(s) URL', async () => {
    const user = userEvent.setup()
    render(<ServiceForm mode="create" onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/name/i), 'My Service')
    await user.type(screen.getByLabelText(/url/i), 'ftp://example.com')
    await user.click(screen.getByTestId('service-submit'))

    expect(
      await screen.findByText('URL must be a valid http(s) URL'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('valid create submit calls onSubmit with the full entered values', async () => {
    const user = userEvent.setup()
    render(<ServiceForm mode="create" onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/name/i), 'My Service')
    await user.type(screen.getByLabelText(/url/i), 'https://example.com/health')
    await user.selectOptions(screen.getByLabelText(/method/i), 'POST')
    await user.click(screen.getByTestId('service-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    const values = onSubmit.mock.calls[0][0]
    expect(values).toMatchObject({
      name: 'My Service',
      url: 'https://example.com/health',
      http_method: 'POST',
      interval_ms: 60000,
      is_active: true,
    })
    // expected_status blank -> omitted or null (never the empty string / NaN).
    expect(
      values.expected_status === undefined || values.expected_status === null,
    ).toBe(true)
  })

  it('edit mode pre-populates the form from initialValues', () => {
    render(
      <ServiceForm
        mode="edit"
        onSubmit={onSubmit}
        initialValues={{
          name: 'Existing',
          url: 'https://existing.test/ping',
          http_method: 'PUT',
          interval_ms: 30000,
          expected_status: 204,
          is_active: false,
        }}
      />,
    )

    expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe(
      'Existing',
    )
    expect((screen.getByLabelText(/url/i) as HTMLInputElement).value).toBe(
      'https://existing.test/ping',
    )
    expect((screen.getByLabelText(/method/i) as HTMLSelectElement).value).toBe(
      'PUT',
    )
    expect(
      (screen.getByLabelText(/interval/i) as HTMLInputElement).value,
    ).toBe('30000')
    expect(
      (screen.getByLabelText(/expected status/i) as HTMLInputElement).value,
    ).toBe('204')
    expect(
      (screen.getByLabelText(/active/i) as HTMLInputElement).checked,
    ).toBe(false)
  })

  it('edit mode submit reports ONLY the changed fields (diff against initialValues)', async () => {
    const user = userEvent.setup()
    const initial: Partial<ServiceRead> = {
      name: 'Existing',
      url: 'https://existing.test/ping',
      http_method: 'GET',
      interval_ms: 60000,
      expected_status: 200,
      is_active: true,
    }
    render(
      <ServiceForm mode="edit" onSubmit={onSubmit} initialValues={initial} />,
    )

    // Change only the name.
    const name = screen.getByLabelText(/name/i)
    await user.clear(name)
    await user.type(name, 'Renamed')
    await user.click(screen.getByTestId('service-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    expect(onSubmit.mock.calls[0][0]).toEqual({ name: 'Renamed' })
  })

  it('renders server-side field errors passed via the errors prop', () => {
    render(
      <ServiceForm
        mode="create"
        onSubmit={onSubmit}
        errors={{ url: 'URL is already monitored' }}
      />,
    )
    expect(screen.getByTestId('service-url-error')).toHaveTextContent(
      'URL is already monitored',
    )
  })
})
