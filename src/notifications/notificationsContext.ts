import { createContext } from 'react'

export type NotificationKind = 'error' | 'success' | 'info'

export interface AppNotification {
  id: number
  kind: NotificationKind
  message: string
}

export interface NotificationsContextValue {
  notifications: AppNotification[]
  /** Add a notification of the given kind. */
  notify(kind: NotificationKind, message: string): void
  /** Convenience: add an error notification. */
  notifyError(message: string): void
  /** Convenience: add a success notification. */
  notifySuccess(message: string): void
  /** Remove a notification by id. */
  dismiss(id: number): void
}

/**
 * `undefined` sentinel means "no provider above me", so `useNotifications` can
 * throw a clear error. Kept component-free for Fast Refresh.
 */
export const NotificationsContext = createContext<
  NotificationsContextValue | undefined
>(undefined)

/** How long (ms) a toast stays before auto-dismiss, by kind. */
export const AUTO_DISMISS_MS: Record<NotificationKind, number> = {
  error: 8000,
  success: 4000,
  info: 5000,
}
