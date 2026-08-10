import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyRFQs } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import './MyRequirementsPage.css'

function MyRequirementsPage() {
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getMyRFQs()
        setRequirements(res.data || [])
      } catch {
        setError('Failed to load your requirements.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const fmt  = (d) => d ? new Date(d).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'
  const fmtC = (a) => a != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(a) : '—'

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>My Requirements</h1>
          <p className="page-subtitle">Requirements you have posted</p>
        </div>
        <Link to="/post" className="btn-primary" id="post-new-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Post New
        </Link>
      </div>

      {loading && <div className="skeleton-grid">{[1,2,3].map(i => <div key={i} className="skeleton-card skeleton" />)}</div>}
      {error   && <div className="error-banner">{error}</div>}

      {!loading && !error && requirements.length === 0 && (
        <div className="empty-state">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <h3>No requirements yet</h3>
          <p>Post your first service requirement to start receiving quotes.</p>
          <Link to="/post" className="btn-primary">Post Requirement</Link>
        </div>
      )}

      {!loading && requirements.length > 0 && (
        <div className="my-req-list">
          {requirements.map((req) => (
            <Link to={`/requirement/${req.id}`} key={req.id} className="my-req-card" id={`my-req-${req.id}`}>
              <div className="my-req-left">
                <span className="req-id-small">REQ-{String(req.id).padStart(4, '0')}</span>
                <h3 className="my-req-name">{req.name}</h3>
                <div className="my-req-meta">
                  <span>Closes: {fmt(req.bid_close_time)}</span>
                  {req.service_date && <span>Service: {new Date(req.service_date).toLocaleDateString('en-IN')}</span>}
                </div>
              </div>
              <div className="my-req-right">
                <StatusBadge status={req.status} />
                <div className="my-req-stats">
                  <div className="my-stat">
                    <span className="my-stat-label">Quotes</span>
                    <span className="my-stat-value">{req.total_bids}</span>
                  </div>
                  <div className="my-stat">
                    <span className="my-stat-label">Lowest</span>
                    <span className="my-stat-value green">{fmtC(req.current_lowest_bid)}</span>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--text-muted)'}}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyRequirementsPage
