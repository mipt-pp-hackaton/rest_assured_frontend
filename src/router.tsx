import type { RouteObject } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AdminRoute } from './auth/AdminRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ServicesPage from './pages/ServicesPage'
import ServiceCreatePage from './pages/ServiceCreatePage'
import ServiceDetailPage from './pages/ServiceDetailPage'
import ServiceEditPage from './pages/ServiceEditPage'
import IncidentsPage from './pages/IncidentsPage'
import CreateUserPage from './pages/CreateUserPage'
import NotFound from './pages/NotFound'

export const routes: RouteObject[] = [
  { path: 'login', element: <LoginPage /> },
  { path: 'register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'services', element: <ServicesPage /> },
          { path: 'services/new', element: <ServiceCreatePage /> },
          { path: 'services/:id', element: <ServiceDetailPage /> },
          { path: 'services/:id/edit', element: <ServiceEditPage /> },
          { path: 'incidents', element: <IncidentsPage /> },
          {
            // Superuser-only area (defends in depth; nav link is also gated).
            element: <AdminRoute />,
            children: [{ path: 'users/new', element: <CreateUserPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]
