import type { IncidentRead } from '../../api/types'
import { formatDateTime, formatUptime, incidentStatus } from '../../utils/format'

interface IncidentTableProps {
  incidents: IncidentRead[]
}

const DASH = '—'

function IncidentRow({ incident }: { incident: IncidentRead }) {
  return (
    <li data-testid={`incident-row-${incident.id}`}>
      <div data-testid="incident-row">
        <span>{incident.service_name}</span>
        <span>{formatDateTime(incident.opened_at)}</span>
        <span>
          {incident.closed_at === null
            ? DASH
            : formatDateTime(incident.closed_at)}
        </span>
        <span>{incidentStatus(incident)}</span>
        {incident.sla_breach === true ? (
          <span data-testid="incident-sla-badge">SLA breach</span>
        ) : null}
        <span>
          {incident.duration_seconds === null
            ? DASH
            : formatUptime(incident.duration_seconds)}
        </span>
      </div>
    </li>
  )
}

export default function IncidentTable({ incidents }: IncidentTableProps) {
  return (
    <ul>
      {incidents.map((incident) => (
        <IncidentRow key={incident.id} incident={incident} />
      ))}
    </ul>
  )
}
