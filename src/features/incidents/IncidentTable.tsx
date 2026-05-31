import type { IncidentRead } from '../../api/types'
import { formatDateTime, formatUptime, incidentStatus } from '../../utils/format'

interface IncidentTableProps {
  incidents: IncidentRead[]
}

const DASH = '—'

function IncidentRow({ incident }: { incident: IncidentRead }) {
  const status = incidentStatus(incident)
  return (
    <tr data-testid={`incident-row-${incident.id}`}>
      {/* Row header doubles as the per-row count hook (data-testid incident-row). */}
      <th scope="row" data-testid="incident-row">
        {incident.service_name}
      </th>
      <td className="table__num">{formatDateTime(incident.opened_at)}</td>
      <td className="table__num">
        {incident.closed_at === null ? DASH : formatDateTime(incident.closed_at)}
      </td>
      <td>
        <span className="cell-badges">
          <span className={`badge ${status === 'open' ? 'badge--down' : 'badge--up'}`}>
            {status}
          </span>
          {incident.sla_breach === true ? (
            <span className="badge badge--down" data-testid="incident-sla-badge">
              SLA breach
            </span>
          ) : null}
        </span>
      </td>
      <td className="table__num">
        {incident.duration_seconds === null
          ? DASH
          : formatUptime(incident.duration_seconds)}
      </td>
    </tr>
  )
}

export default function IncidentTable({ incidents }: IncidentTableProps) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">Opened</th>
            <th scope="col">Closed</th>
            <th scope="col">Status</th>
            <th scope="col">Duration</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <IncidentRow key={incident.id} incident={incident} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
