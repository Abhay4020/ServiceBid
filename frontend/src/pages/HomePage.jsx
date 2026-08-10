import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getRFQs } from '../services/api'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import './HomePage.css'

function HomePage() {
  const { user } = useAuth()
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getRFQs()
        setRequirements(res.data || [])
        setError(null)
      } catch {
        setError('Failed to load requirements. Is the backend running?')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filtered = requirements.filter((r) => {
    if (filter !== 'All' && r.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.name.toLowerCase().includes(q) && !r.description?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const countFor = (s) => requirements.filter((r) => s === 'All' ? true : r.status === s).length

  const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'
  const fmtC = (a) => a != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(a) : '—'

  if (loading) return (
    <div className="container">
      <div className="page-header"><h1>Requirements</h1></div>
      <div className="skeleton-grid">{[1,2,3,4].map(i => <div key={i} className="skeleton-card skeleton" />)}</div>
    </div>
  )

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Requirements</h1>
          <p className="page-subtitle">{filtered.length} requirement{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/post" className="btn-primary" id="post-requirement-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Post Requirement
        </Link>
      </div>

      {error && (
        <div className="error-banner">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      <div className="controls-row">
        <div className="search-wrap">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" className="search-control" placeholder="Search requirements..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="filter-tabs">
        {['All', 'Active', 'Upcoming', 'Closed', 'Force Closed'].map((s) => (
          <button key={s} className={`filter-tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)} id={`filter-${s.toLowerCase().replace(' ', '-')}`}>
            {s} <span className="filter-count">{countFor(s)}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <h3>No requirements found</h3>
          <p>{filter !== 'All' || search ? 'Try changing your filters.' : 'Be the first to post a requirement.'}</p>
          {filter === 'All' && !search && <Link to="/post" className="btn-primary">Post Requirement</Link>}
        </div>
      ) : (
        <div className="req-grid">
          {filtered.map((req) => (
            <Link to={`/requirement/${req.id}`} key={req.id} className="req-card" id={`req-card-${req.id}`}>
              <div className="card-top">
                <span className="req-id">REQ-{String(req.id).padStart(4, '0')}</span>
                <StatusBadge status={req.status} />
              </div>
              <h3 className="req-name">{req.name}</h3>
              {req.description && (
                <p className="req-desc">{req.description.length > 90 ? `${req.description.substring(0, 90)}...` : req.description}</p>
              )}
              <div className="card-meta">
                Posted by: <strong>{req.posted_by_name || 'Unknown'}</strong>
                {req.created_by === user?.id && <span className="own-tag">You</span>}
              </div>
              <div className="card-stats">
                <div className="stat">
                  <span className="stat-label">Lowest Quote</span>
                  <span className="stat-value highlight">{fmtC(req.current_lowest_bid)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Total Quotes</span>
                  <span className="stat-value">{req.total_bids}</span>
                </div>
              </div>
              <div className="card-times">
                <span className="time-label">Closes</span>
                <span className="time-value">{fmt(req.bid_close_time)}</span>
              </div>
              <div className="card-footer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="arrow-icon">
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

export default HomePage
