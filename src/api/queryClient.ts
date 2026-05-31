import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { describeApiError } from './errorMessage'

/**
 * Builds the app's QueryClient with global error reporting so that NO non-2xx
 * response is swallowed silently.
 *
 * @param onError - called with a user-facing message whenever an error should
 *   be surfaced (wired to the notifications/toast system in App).
 *
 * Reporting policy:
 *   - Mutations: every failure is reported (mutations have no persistent inline
 *     error UI; create/edit only map 422 to fields). A mutation may set
 *     `meta.errorMessage` to override the derived message with friendlier copy.
 *   - Queries: only failures of a refetch that already had data are reported.
 *     A first-load failure is shown inline by the page's QueryStates (with a
 *     retry), so reporting it again would double-message; but a background
 *     refetch failing while stale data is shown would otherwise be invisible.
 */
export function createAppQueryClient(
  onError: (message: string) => void,
): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.state.data !== undefined) {
          onError(describeApiError(error))
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        const override = mutation.options.meta?.errorMessage
        onError(typeof override === 'string' ? override : describeApiError(error))
      },
    }),
  })
}
