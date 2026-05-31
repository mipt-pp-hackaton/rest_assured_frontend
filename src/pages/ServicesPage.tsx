import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { deleteService, listServices } from '../api/servicesApi'
import { ServiceTable } from '../features/services/ServiceTable'
import QueryStates from '../components/QueryStates'

/**
 * Services list route. Owns the react-query lifecycle for the `['services']`
 * list and the per-row delete mutation. The root `data-testid="services-page"`
 * is always present (the router identifies the route by it); the loading /
 * error / empty / success states are mutually exclusive children.
 */
export default function ServicesPage() {
  const queryClient = useQueryClient()

  const servicesQuery = useQuery({
    queryKey: ['services'],
    queryFn: listServices,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteService(id),
    // Previously a failed delete was silent; the global toast now reports it.
    meta: { errorMessage: 'Could not delete the service.' },
    onSuccess: () => {
      // Refetch the list so the deleted row disappears.
      return queryClient.invalidateQueries({ queryKey: ['services'] })
    },
  })

  const ready = !servicesQuery.isPending && !servicesQuery.isError

  return (
    <div data-testid="services-page">
      <header className="page__header page__header--actions">
        <div>
          <h1>Services</h1>
          <p className="page__subtitle">Endpoints currently under monitoring.</p>
        </div>
        <Link to="/services/new" className="btn btn--primary" data-testid="services-new-link">
          New service
        </Link>
      </header>

      <QueryStates
        testIdPrefix="services"
        isPending={servicesQuery.isPending}
        isError={servicesQuery.isError}
        isEmpty={ready && servicesQuery.data.length === 0}
        onRetry={() => void servicesQuery.refetch()}
        retryTestId="services-retry"
        loadingText="Loading services…"
        errorText="Could not load services."
        emptyText="No services yet."
      >
        {ready ? (
          <ServiceTable
            services={servicesQuery.data}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ) : null}
      </QueryStates>
    </div>
  )
}
