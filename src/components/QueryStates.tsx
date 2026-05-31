import type { ReactNode } from 'react'

/**
 * Shared loading / error(+retry) / empty / children ladder for the list pages
 * (DashboardPage, ServicesPage, IncidentsPage). Each page passes a stable
 * `testIdPrefix` so the produced markers match that page's contract exactly:
 *   - `${testIdPrefix}-loading`
 *   - `${testIdPrefix}-error` (with a retry control)
 *   - `${testIdPrefix}-empty`
 *   - otherwise: `children`
 *
 * Retry control: the three pages historically used different hooks. To satisfy
 * every test without changing them, the retry button ALWAYS exposes an
 * accessible name matching /retry/i (DashboardPage queries by role+name) and,
 * when `retryTestId` is provided, also carries that data-testid
 * (ServicesPage -> "services-retry", IncidentsPage -> "incidents-retry").
 */
export interface QueryStatesProps {
  testIdPrefix: string
  isPending: boolean
  isError: boolean
  isEmpty: boolean
  onRetry: () => void
  children: ReactNode
  /** Optional explicit data-testid for the retry control. */
  retryTestId?: string
  loadingText?: string
  errorText?: string
  emptyText?: string
  retryLabel?: string
}

export default function QueryStates({
  testIdPrefix,
  isPending,
  isError,
  isEmpty,
  onRetry,
  children,
  retryTestId,
  loadingText = 'Loading…',
  errorText = 'Something went wrong.',
  emptyText = 'Nothing to display.',
  retryLabel = 'Retry',
}: QueryStatesProps) {
  if (isPending) {
    return <div data-testid={`${testIdPrefix}-loading`}>{loadingText}</div>
  }

  if (isError) {
    return (
      <div data-testid={`${testIdPrefix}-error`}>
        <p>{errorText}</p>
        <button
          type="button"
          data-testid={retryTestId}
          aria-label={retryLabel}
          onClick={() => onRetry()}
        >
          {retryLabel}
        </button>
      </div>
    )
  }

  if (isEmpty) {
    return <div data-testid={`${testIdPrefix}-empty`}>{emptyText}</div>
  }

  return <>{children}</>
}
