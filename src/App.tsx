import { useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { NotificationsProvider } from './notifications/NotificationsProvider'
import { useNotifications } from './notifications/useNotifications'
import Toaster from './components/Toaster'
import { createAppQueryClient } from './api/queryClient'
import { routes } from './router'

const router = createBrowserRouter(routes)

/**
 * Builds the QueryClient wired to the notifications context, so every non-2xx
 * response (failed mutations, failed background refetches) surfaces a toast.
 * `notifyError` is referentially stable, so the client is created exactly once.
 */
function AppQueryProvider({ children }: { children: ReactNode }) {
  const { notifyError } = useNotifications()
  const [queryClient] = useState(() => createAppQueryClient(notifyError))
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function App() {
  return (
    <NotificationsProvider>
      <AppQueryProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </AppQueryProvider>
      <Toaster />
    </NotificationsProvider>
  )
}

export default App
