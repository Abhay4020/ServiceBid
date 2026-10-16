import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getRFQs, getCategories } from '../services/api'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import './HomePage.css'

const PAGE_SIZE = 10

function HomePage() {
  const { user } = useAuth()

  const [requirements, setRequirements] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [filter, setFilter]         = useState('All')
  const [search, setSearch]         = useState('')
  const [searchInput, setSearchInput] = useState('')

  const [categories, setCategories]     = useState([])
  const [categoryFilter, setCategoryFilter] = useState('')

  // Pagination from backend
  const [page, setPage]               = useState(1)
  const [pagination, setPagination]   = useState(null)

  // Load categories once
  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data || []))
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: PAGE_SIZE }
      if (search)         params.search      = search
      if (categoryFilter) params.category_id = categoryFilter

      const res = await getRFQs(params)
      setRequirements(res.data || [])
      setPagination(res.pagination || null)
      setError(null)
    } catch {
      setError('Failed to load requirements. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [page, search, categoryFilter])

  useEffect(() => { fetchData() }, [fetchData])

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // Client-side status filter (data is already paginated server-side by search/category)
  const filtered = filter === 'All'
    ? requirements
    : requirements.filter((r) => r.status === filter)

  const countFor = (s) => s === 'All' ? requirements.length : requirements.filter((r) => r.status === s).length

  const fmt  = (d) => d ? new Date(d).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'
  const fmtC = (a) => a != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(a) : '—'

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Requirements</h1>
          {pagination && (
            <p className="page-subtitle">
              {pagination.total} requirement{pagination.total !== 1 ? 's' : ''} total
              {filter !== 'All' && ` · ${filtered.length} shown`}
            </p>
          )}
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

      {/* ── Search + Category filter ── */}
      <div className="controls-row">
        <div className="search-wrap">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text" className="search-control"
            placeholder="Search requirements..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {categories.length > 0 && (
          <select
            className="category-filter-select"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Status tabs (client-side on current page) ── */}
      <div className="filter-tabs">
        {['All', 'Active', 'Upcoming', 'Closed', 'Force Closed'].map((s) => (
          <button
            key={s}
            className={`filter-tab ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}
            id={`filter-${s.toLowerCase().replace(' ', '-')}`}
          >
            {s} <span className="filter-count">{countFor(s)}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton-grid">{[1,2,3,4].map(i => <div key={i} className="skeleton-card skeleton" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <h3>No requirements found</h3>
          <p>{filter !== 'All' || search || categoryFilter ? 'Try changing your filters.' : 'Be the first to post a requirement.'}</p>
          {filter === 'All' && !search && !categoryFilter && <Link to="/post" className="btn-primary">Post Requirement</Link>}
        </div>
      ) : (
        <div className="req-grid">
          {filtered.map((req) => (
            <Link to={`/requirement/${req.id}`} key={req.id} className="req-card" id={`req-card-${req.id}`}>
              <div className="card-top">
                <span className="req-id">REQ-{String(req.id).padStart(4, '0')}</span>
                <StatusBadge status={req.status} />
              </div>
              {req.category_name && (
                <span className="req-category">{req.category_name}</span>
              )}
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

      {/* ── Pagination Controls ── */}
      {pagination && pagination.total_pages > 1 && (
        <div className="pagination-bar">
          <button
            className="pg-btn"
            disabled={!pagination.has_prev || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>

          <div className="pg-pages">
            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === pagination.total_pages || Math.abs(p - page) <= 2)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="pg-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    className={`pg-num ${p === page ? 'pg-active' : ''}`}
                    onClick={() => setPage(p)}
                    disabled={loading}
                  >
                    {p}
                  </button>
                )
              )}
          </div>

          <button
            className="pg-btn"
            disabled={!pagination.has_next || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>

          <span className="pg-info">
            Page {pagination.page} of {pagination.total_pages}
          </span>
        </div>
      )}
    </div>
  )
}

export default HomePage
