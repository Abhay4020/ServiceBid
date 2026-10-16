import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getRFQById, placeBid, deleteRFQ, forceCloseRFQ } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useRFQSocket } from '../hooks/useRFQSocket'
import StatusBadge from '../components/StatusBadge'
import './RequirementDetailPage.css'

function RequirementDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()

  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [activeTab, setActiveTab] = useState('quotes')
  const [liveFlash, setLiveFlash] = useState(false)   // brief highlight on real-time update

  const [bidAmount, setBidAmount]   = useState('')
  const [validity, setValidity]     = useState('')
  const [bidLoading, setBidLoading] = useState(false)
  const [bidResult, setBidResult]   = useState(null)
  const [bidError, setBidError]     = useState(null)

  // ── Fetch data from REST API ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await getRFQById(id)
      setData(res.data)
      setError(null)
    } catch {
      setError('Failed to load requirement details.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Real-time Socket.IO updates ──────────────────────────────────────────
  useRFQSocket(id, {
    onBidUpdate: (payload) => {
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          rfq: {
            ...prev.rfq,
            bid_close_time: payload.bid_close_time || prev.rfq.bid_close_time,
          },
          rankings: payload.rankings,
        }
      })
      // Flash the quotes panel
      setLiveFlash(true)
      setTimeout(() => setLiveFlash(false), 1200)
    },
    onForceClosed: () => {
      fetchData() // re-fetch to get updated status
    },
  })

  // ── Admin actions ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('Permanently delete this requirement?')) return
    try {
      await deleteRFQ(id)
      navigate('/')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete.')
    }
  }

  const handleForceClose = async () => {
    if (!window.confirm('Force-close this requirement? No more quotes will be accepted.')) return
    try {
      await forceCloseRFQ(id)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to force-close.')
    }
  }

  // ── Place bid ─────────────────────────────────────────────────────────────
  const handlePlaceBid = async (e) => {
    e.preventDefault()
    setBidError(null); setBidResult(null)
    const amount = parseFloat(bidAmount)
    if (isNaN(amount) || amount <= 0) { setBidError('Enter a valid quote amount.'); return }
    try {
      setBidLoading(true)
      const res = await placeBid({ rfq_id: parseInt(id), bid_amount: amount, validity })
      setBidResult(res)
      setBidAmount(''); setValidity('')
      // Note: socket will update rankings automatically; fetchData() is a safety fallback
    } catch (err) {
      setBidError(err.response?.data?.message || 'Failed to place quote.')
    } finally {
      setBidLoading(false)
    }
  }

  const fmt  = (d) => d ? new Date(d).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '—'
  const fmtC = (a) => a != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(a) : '—'

  if (loading) return <div className="container"><div className="skeleton" style={{ height: 400, marginTop: 24 }} /></div>
  if (error || !data) return (
    <div className="container">
      <div className="error-page">
        <h2>Error</h2><p>{error || 'Not found'}</p>
        <Link to="/">← Back to Requirements</Link>
      </div>
    </div>
  )

  const { rfq, rankings, activity_log } = data
  const isOwn    = user?.id === rfq.created_by || user?.id === rfq.posted_by_id
  const isActive = rfq.status === 'Active'
  const isClosed = rfq.status === 'Closed' || rfq.status === 'Force Closed'

  return (
    <div className="container">
      <div className="breadcrumb">
        <Link to="/">Requirements</Link>
        <span className="bc-sep">›</span>
        <span>REQ-{String(rfq.id).padStart(4, '0')}</span>
      </div>

      <div className="detail-header">
        <div className="detail-header-main">
          <div className="detail-id-row">
            <span className="detail-rfq-id">REQ-{String(rfq.id).padStart(4, '0')}</span>
            <StatusBadge status={rfq.status} />
            {rfq.category_name && <span className="category-tag">{rfq.category_name}</span>}
            {/* Live indicator dot */}
            {isActive && (
              <span className="live-dot" title="Live — updates in real time">
                <span className="live-pulse" />
                LIVE
              </span>
            )}
          </div>
          <h1 className="detail-name">{rfq.name}</h1>
          <div className="detail-poster-row">
            <span>Posted by: <strong>{rfq.posted_by_name || 'Unknown'}</strong></span>
            {isOwn && <span className="own-badge">Your Listing</span>}
          </div>
        </div>
        {isAdmin && (
          <div className="admin-actions">
            {!isClosed && (
              <button onClick={handleForceClose} className="btn-force-close" title="Force-close this requirement">
                Force Close
              </button>
            )}
            <button onClick={handleDelete} className="btn-delete" title="Delete this requirement">
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="stats-bar">
        <div className="stats-item">
          <span className="stats-label">Lowest Quote</span>
          <span className="stats-value green">{rankings.length > 0 ? fmtC(rankings[0].bid_amount) : '—'}</span>
        </div>
        <div className="stats-divider" />
        <div className="stats-item">
          <span className="stats-label">Total Quotes</span>
          <span className="stats-value">{rankings.length}</span>
        </div>
        <div className="stats-divider" />
        <div className="stats-item">
          <span className="stats-label">Close Time</span>
          <span className="stats-value">{fmt(rfq.bid_close_time)}</span>
        </div>
        <div className="stats-divider" />
        <div className="stats-item">
          <span className="stats-label">Hard Deadline</span>
          <span className="stats-value">{fmt(rfq.forced_close_time)}</span>
        </div>
        {rfq.service_date && (
          <>
            <div className="stats-divider" />
            <div className="stats-item">
              <span className="stats-label">Service Date</span>
              <span className="stats-value">{new Date(rfq.service_date).toLocaleDateString('en-IN')}</span>
            </div>
          </>
        )}
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          {rfq.description && (
            <div className="detail-desc-box">
              <h3>Description</h3>
              <p>{rfq.description}</p>
            </div>
          )}

          <div className="detail-tabs">
            {['quotes', 'activity'].map((t) => (
              <button key={t} className={`detail-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                {t === 'quotes' ? `Quotes (${rankings.length})` : `Activity (${activity_log?.length || 0})`}
              </button>
            ))}
          </div>

          {activeTab === 'quotes' && (
            <div className={`tab-content ${liveFlash ? 'live-flash' : ''}`}>
              {rankings.length === 0 ? (
                <div className="empty-tab"><p>No quotes yet. Be the first to quote!</p></div>
              ) : (
                <div className="rankings-list">
                  {rankings.map((r, i) => (
                    <div key={r.bid_id} className={`ranking-card ${i === 0 ? 'l1-card' : ''}`}>
                      <span className={`rank-badge ${i < 3 ? `rank-l${i + 1}` : ''}`}>{r.rank}</span>
                      <div className="ranking-info">
                        <span className="ranking-bidder">{r.bidder_name || 'Anonymous'}</span>
                        {r.carrier_name && <span className="ranking-validity">Carrier: {r.carrier_name}</span>}
                        {r.validity && <span className="ranking-validity">Valid: {r.validity}</span>}
                        {r.transit_time && <span className="ranking-validity">Transit: {r.transit_time}</span>}
                        <span className="ranking-time">{fmt(r.placed_at)}</span>
                      </div>
                      <div className="ranking-right">
                        <span className="ranking-amount">{fmtC(r.bid_amount)}</span>
                        {r.freight_charges != null && (
                          <span className="ranking-freight">+₹{r.freight_charges.toLocaleString('en-IN')} freight</span>
                        )}
                      </div>
                      {r.user_id === user?.id && <span className="your-bid-tag">You</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="tab-content">
              {(!activity_log || activity_log.length === 0) ? (
                <div className="empty-tab"><p>No activity yet.</p></div>
              ) : (
                <div className="activity-list">
                  {activity_log.map((log, i) => (
                    <div key={i} className="activity-item">
                      <div className="activity-dot" />
                      <div className="activity-content">
                        <div className="activity-action">{log.action}</div>
                        {log.old_close_time && (
                          <div className="activity-times">
                            <span>{fmt(log.old_close_time)}</span> → <span className="new-time">{fmt(log.new_close_time)}</span>
                          </div>
                        )}
                        <span className="activity-when">{fmt(log.changed_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="detail-sidebar">
          <div className="bid-card">
            <h3 className="bid-card-title">{isAdmin ? 'Monitor Quotes' : 'Submit Your Quote'}</h3>
            {isAdmin ? (
              <div className="bid-notice info">
                <p>Admin view — monitoring only. Only users can submit quotes.</p>
              </div>
            ) : isOwn ? (
              <div className="bid-notice warning">
                <p>This is your requirement. You cannot quote on your own listing.</p>
              </div>
            ) : !isActive ? (
              <div className="bid-closed">Quoting is <strong>{rfq.status?.toLowerCase()}</strong>.</div>
            ) : (
              <form onSubmit={handlePlaceBid} className="bid-form">
                <div className="bid-field">
                  <label>Quote Amount (₹) *</label>
                  <input type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="e.g., 5000" min="1" step="any" required className="bid-input" id="bid-amount-input" />
                </div>
                <div className="bid-field">
                  <label>Quote Validity (optional)</label>
                  <input type="text" value={validity} onChange={(e) => setValidity(e.target.value)}
                    placeholder="e.g., 7 days" className="bid-input" />
                </div>
                {rankings.length > 0 && (
                  <p className="bid-hint">Current L1 (lowest): {fmtC(rankings[0].bid_amount)} by {rankings[0].bidder_name}</p>
                )}
                <button type="submit" className="bid-submit" disabled={bidLoading} id="place-bid-btn">
                  {bidLoading ? 'Submitting...' : 'Submit Quote'}
                </button>
              </form>
            )}
            {bidResult && (
              <div className={`bid-result ${bidResult.data?.extension?.extended ? 'bid-extended' : 'bid-success'}`}>
                <strong>{bidResult.message}</strong>
                {bidResult.data?.bid && <div>Your rank: <strong>{bidResult.data.bid.rank}</strong> {bidResult.data.bid.is_l1 && '🏆 L1'}</div>}
              </div>
            )}
            {bidError && <div className="bid-error-msg">{bidError}</div>}
          </div>

          {/* Extension config info card */}
          <div className="ext-info-card">
            <div className="ext-info-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Extension Config
            </div>
            <div className="ext-info-row">
              <span>Trigger</span>
              <strong>{rfq.trigger_type || 'ANY_BID'}</strong>
            </div>
            <div className="ext-info-row">
              <span>Window</span>
              <strong>{rfq.trigger_window || 5} min</strong>
            </div>
            <div className="ext-info-row">
              <span>Duration</span>
              <strong>+{rfq.extension_duration || 5} min</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RequirementDetailPage
