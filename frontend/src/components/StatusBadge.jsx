import './StatusBadge.css'

function StatusBadge({ status }) {
  const statusClass = status?.toLowerCase().replace(' ', '-') || 'unknown'

  return (
    <span className={`status-badge status-${statusClass}`}>
      <span className="status-dot" />
      {status}
    </span>
  )
}

export default StatusBadge
