import { describe, it, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'
import { useMutation, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '../api/errors'
import { createAppQueryClient } from '../api/queryClient'
// Not-yet-existing modules so this suite FAILS in the RED phase.
import { NotificationsProvider } from './NotificationsProvider'
import { useNotifications } from './useNotifications'
import Toaster from '../components/Toaster'

/**
 * Notifications system contract (RED phase):
 *   - useNotifications() throws outside a <NotificationsProvider>.
 *   - notifyError(message) makes <Toaster /> render an assertive alert with the
 *     message; it can be dismissed.
 *   - Errors from a QueryClient built by createAppQueryClient(notifyError) reach
 *     the toaster — proving the global wiring end to end.
 */

afterEach(() => {
  vi.useRealTimers()
})

describe('useNotifications', () => {
  it('throws when used outside a NotificationsProvider', () => {
    expect(() => renderHook(() => useNotifications())).toThrow()
  })
})

function Trigger() {
  const { notifyError } = useNotifications()
  return (
    <button type="button" onClick={() => notifyError('Something failed')}>
      fail
    </button>
  )
}

describe('NotificationsProvider + Toaster', () => {
  it('shows and dismisses an error toast', async () => {
    const user = userEvent.setup()
    render(
      <NotificationsProvider>
        <Trigger />
        <Toaster />
      </NotificationsProvider>,
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /fail/i }))

    const toast = await screen.findByRole('alert')
    expect(toast).toHaveTextContent('Something failed')

    await user.click(screen.getByRole('button', { name: /dismiss/i }))
    await waitFor(() =>
      expect(screen.queryByText('Something failed')).not.toBeInTheDocument(),
    )
  })

  it('auto-dismisses a toast after its timeout', async () => {
    vi.useFakeTimers()
    try {
      render(
        <NotificationsProvider>
          <Trigger />
          <Toaster />
        </NotificationsProvider>,
      )
      // fireEvent-style click without userEvent (which needs real timers).
      act(() => {
        screen.getByRole('button', { name: /fail/i }).click()
      })
      expect(screen.getByText('Something failed')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(10000)
      })
      expect(screen.queryByText('Something failed')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})

function BoomButton({ meta }: { meta?: Record<string, unknown> }) {
  const mutation = useMutation({
    mutationFn: async () => {
      throw new ApiError('x', { status: 500 })
    },
    meta,
  })
  return (
    <button type="button" onClick={() => mutation.mutate()}>
      mutate
    </button>
  )
}

// Mirrors the real App composition: the QueryClient's cache onError is wired to
// the notifications context, and a <Toaster /> renders the result.
function Wired({ meta }: { meta?: Record<string, unknown> }) {
  const { notifyError } = useNotifications()
  const [client] = useState(() => createAppQueryClient(notifyError))
  return (
    <QueryClientProvider client={client}>
      <BoomButton meta={meta} />
    </QueryClientProvider>
  )
}

describe('global mutation errors reach the toaster', () => {
  it('shows a derived message for an unhandled mutation 500', async () => {
    const user = userEvent.setup()
    render(
      <NotificationsProvider>
        <Wired />
        <Toaster />
      </NotificationsProvider>,
    )

    await user.click(screen.getByRole('button', { name: /mutate/i }))

    const toast = await screen.findByRole('alert')
    expect(toast).toHaveTextContent(/server error/i)
  })

  it('shows the mutation meta.errorMessage when provided', async () => {
    const user = userEvent.setup()
    render(
      <NotificationsProvider>
        <Wired meta={{ errorMessage: 'Could not delete the service.' }} />
        <Toaster />
      </NotificationsProvider>,
    )

    await user.click(screen.getByRole('button', { name: /mutate/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not delete the service.',
    )
  })
})
