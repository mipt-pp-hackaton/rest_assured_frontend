import { describe, it, expect, vi } from 'vitest'
import { ApiError } from './errors'
import { describeApiError } from './errorMessage'
// Not-yet-existing module so this suite FAILS in the RED phase.
import { createAppQueryClient } from './queryClient'

/**
 * createAppQueryClient(onError: (message: string) => void): QueryClient
 *
 * Wires the React Query caches so non-2xx responses inform the user:
 *   - MutationCache.onError -> always reports (mutations have no inline error UI
 *     beyond field-level 422 mapping). Uses meta.errorMessage when provided,
 *     else describeApiError(error).
 *   - QueryCache.onError -> reports ONLY when the query already had data (a
 *     background refetch failed); first-load failures are shown inline by the
 *     pages' QueryStates, so reporting them too would double-message.
 */
describe('createAppQueryClient', () => {
  it('reports a query refetch failure but NOT a first-load failure', async () => {
    const onError = vi.fn()
    const client = createAppQueryClient(onError)
    const err = new ApiError('boom', { status: 500 })

    // First load fails -> NOT reported (the page shows an inline error state).
    await client
      .fetchQuery({ queryKey: ['first'], queryFn: async () => { throw err }, retry: false })
      .catch(() => {})
    expect(onError).not.toHaveBeenCalled()

    // Seed data, then a refetch fails -> reported (otherwise silent).
    await client.fetchQuery({ queryKey: ['ref'], queryFn: async () => 'ok', retry: false })
    await client
      .fetchQuery({ queryKey: ['ref'], queryFn: async () => { throw err }, retry: false, staleTime: 0 })
      .catch(() => {})

    expect(onError).toHaveBeenCalledWith(describeApiError(err))
  })

  it('reports a mutation failure via the derived message', async () => {
    const onError = vi.fn()
    const client = createAppQueryClient(onError)
    const err = new ApiError('boom', { status: 500 })

    const mutation = client
      .getMutationCache()
      .build(client, { mutationFn: async () => { throw err } })
    await mutation.execute(undefined).catch(() => {})

    expect(onError).toHaveBeenCalledWith(describeApiError(err))
  })

  it('prefers meta.errorMessage for a mutation when provided', async () => {
    const onError = vi.fn()
    const client = createAppQueryClient(onError)

    const mutation = client.getMutationCache().build(client, {
      mutationFn: async () => { throw new ApiError('boom', { status: 422 }) },
      meta: { errorMessage: 'Could not save the service.' },
    })
    await mutation.execute(undefined).catch(() => {})

    expect(onError).toHaveBeenCalledWith('Could not save the service.')
  })
})
