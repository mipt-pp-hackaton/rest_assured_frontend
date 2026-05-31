import { useNotifications } from '../notifications/useNotifications'

/**
 * Renders the active notifications as stacked toasts in a fixed overlay.
 * Error toasts use role="alert" (assertive) so screen readers announce them;
 * success/info use role="status" (polite). Each toast has a Dismiss control.
 */
export default function Toaster() {
  const { notifications, dismiss } = useNotifications()

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="toaster" aria-live="polite">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`toast toast--${n.kind}`}
          role={n.kind === 'error' ? 'alert' : 'status'}
          data-testid={`toast-${n.kind}`}
        >
          <span className="toast__message">{n.message}</span>
          <button
            type="button"
            className="toast__dismiss"
            aria-label="Dismiss notification"
            onClick={() => dismiss(n.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
