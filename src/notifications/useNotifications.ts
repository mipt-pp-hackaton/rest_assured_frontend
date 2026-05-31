import { useContext } from 'react'
import {
  NotificationsContext,
  type NotificationsContextValue,
} from './notificationsContext'

/**
 * Access the notifications API provided by `NotificationsProvider`.
 * Throws if called outside of a provider.
 */
export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (ctx === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return ctx
}
