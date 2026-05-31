import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  NotificationsContext,
  AUTO_DISMISS_MS,
  type AppNotification,
  type NotificationKind,
} from './notificationsContext'

/**
 * Holds the active toast notifications and exposes a stable API to add/dismiss
 * them. Each notification auto-dismisses after a kind-specific timeout; the
 * timers are tracked so they can be cleared on manual dismiss and on unmount.
 *
 * The `notify*` callbacks are referentially stable (useCallback with no deps),
 * which lets App capture `notifyError` once when building the QueryClient.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  // Monotonic id source and per-notification auto-dismiss timers.
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const notify = useCallback(
    (kind: NotificationKind, message: string) => {
      const id = nextId.current++
      setNotifications((prev) => [...prev, { id, kind, message }])
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS[kind])
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  const notifyError = useCallback((message: string) => notify('error', message), [notify])
  const notifySuccess = useCallback(
    (message: string) => notify('success', message),
    [notify],
  )

  // Clear any outstanding timers on unmount.
  useEffect(() => {
    const map = timers.current
    return () => {
      for (const timer of map.values()) clearTimeout(timer)
      map.clear()
    }
  }, [])

  return (
    <NotificationsContext.Provider
      value={{ notifications, notify, notifyError, notifySuccess, dismiss }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}
