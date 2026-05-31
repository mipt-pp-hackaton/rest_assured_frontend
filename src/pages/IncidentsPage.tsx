import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listIncidents, type IncidentFilters as Filters } from '../api/incidentsApi'
import IncidentFilters from '../features/incidents/IncidentFilters'
import IncidentTable from '../features/incidents/IncidentTable'
import QueryStates from '../components/QueryStates'

export default function IncidentsPage() {
  const [filters, setFilters] = useState<Filters>({})

  const query = useQuery({
    queryKey: ['incidents', filters],
    queryFn: () => listIncidents(filters),
  })

  const ready = !query.isPending && !query.isError

  return (
    <div data-testid="incidents-page">
      <IncidentFilters value={filters} onChange={setFilters} />
      <QueryStates
        testIdPrefix="incidents"
        isPending={query.isPending}
        isError={query.isError}
        isEmpty={ready && query.data.length === 0}
        onRetry={() => void query.refetch()}
        retryTestId="incidents-retry"
        loadingText="Loading…"
        errorText="Failed to load incidents."
        emptyText="No incidents."
      >
        {ready ? <IncidentTable incidents={query.data} /> : null}
      </QueryStates>
    </div>
  )
}
