import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyBids } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import './MyQuotesPage.css'

function MyQuotesPage() {
  const [quotes, setQuotes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getMyBids()
        setQuotes(res.data || [])
      } catch {
        setError('Failed to load your quotes.')
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
          <h1>My Quotes</h1>
          <p className="page-subtitle">Quotes you have submitted on requirements</p>
        </div>
      </div>

      {loading && <div className="skeleton-grid">{[1,2,3].map(i => <div key={i} className="skeleton-card skeleton" />)}</div>}
      {error   && <div className="error-banner">{error}</div>}

      {!loading && !error && quotes.length === 0 && (
        <div className="empty-state">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <h3>No quotes yet</h3>
          <p>Browse requirements and submit a quote to get started.</p>
          <Link to="/" className="btn-primary">Browse Requirements</Link>
        </div>
      )}

      {!loading && quotes.length > 0 && (
        <div className="quotes-list">
          {quotes.map((q) => (
            <Link to={`/requirement/${q.rfq_id}`} key={q.id} className="quote-card" id={`my-quote-${q.id}`}>
              <div className="quote-left">
                <span className="req-id-small">REQ-{String(q.rfq_id).padStart(4, '0')}</span>
                <h3 className="quote-req-name">{q.requirement_name}</h3>
                <div className="quote-meta">
                  <span>Quoted: {fmt(q.created_at)}</span>
                  {q.validity && <span>Validity: {q.validity}</span>}
                </div>
              </div>
              <div className="quote-right">
                <StatusBadge status={q.requirement_status} />
                <div className="quote-stats">
                  <div className="q-stat">
                    <span className="q-stat-label">My Quote</span>
                    <span className="q-stat-value">{fmtC(q.bid_amount)}</span>
                  </div>
                  <div className="q-stat">
                    <span className="q-stat-label">My Rank</span>
                    <span className={`q-stat-value rank-${q.rank}`}>{q.rank}</span>
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

export default MyQuotesPage
