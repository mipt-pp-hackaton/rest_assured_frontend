import { useQuery } from '@tanstack/react-query'
import { getSummary } from '../api/metricsApi'
import SummaryCard from '../features/dashboard/SummaryCard'
import QueryStates from '../components/QueryStates'

export default function DashboardPage() {
  const query = useQuery({
    queryKey: ['services-summary'],
    queryFn: getSummary,
  })

  return (
    <div data-testid="dashboard-page">
      <QueryStates
        testIdPrefix="dashboard"
        isPending={query.isPending}
        isError={query.isError}
        isEmpty={!query.isPending && !query.isError && query.data.length === 0}
        onRetry={() => void query.refetch()}
        loadingText="Loading…"
        errorText="Failed to load the service summary."
        emptyText="No services to display."
      >
        {!query.isPending && !query.isError ? (
          <div>
            {query.data.map((item) => (
              <SummaryCard key={item.service_id} item={item} />
            ))}
          </div>
        ) : null}
      </QueryStates>
    </div>
  )
}
