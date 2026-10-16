import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRFQ, getCategories } from '../services/api'
import './PostRequirementPage.css'

const TRIGGER_OPTIONS = [
  { value: 'ANY_BID',        label: 'Any Bid',        desc: 'Extension triggered by any incoming bid' },
  { value: 'ANY_RANK_CHANGE', label: 'Any Rank Change', desc: 'Extension triggered when rankings change' },
  { value: 'L1_CHANGE',      label: 'L1 Change',       desc: 'Extension triggered only when the lowest bid changes' },
]

function toLocalDatetimeValue(date) {
  // Returns "YYYY-MM-DDTHH:MM" for datetime-local input
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function PostRequirementPage() {
  const navigate = useNavigate()
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [categories, setCategories] = useState([])

  // Default times: start = now, close = now+10min, forced = now+20min
  const now = new Date()
  const defaultStart  = toLocalDatetimeValue(new Date(now.getTime() + 0))
  const defaultClose  = toLocalDatetimeValue(new Date(now.getTime() + 10 * 60000))
  const defaultForced = toLocalDatetimeValue(new Date(now.getTime() + 20 * 60000))

  const [form, setForm] = useState({
    name:              '',
    category_id:       '',
    description:       '',
    service_date:      '',
    bid_start_time:    defaultStart,
    bid_close_time:    defaultClose,
    forced_close_time: defaultForced,
    trigger_window:    5,
    extension_duration: 5,
    trigger_type:      'ANY_BID',
  })

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data || []))
      .catch(() => setCategories([]))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    const numericFields = ['trigger_window', 'extension_duration']
    setForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }))
  }

  // Derived preview info
  const startDate  = form.bid_start_time  ? new Date(form.bid_start_time)  : null
  const closeDate  = form.bid_close_time  ? new Date(form.bid_close_time)  : null
  const forcedDate = form.forced_close_time ? new Date(form.forced_close_time) : null

  const fmt = (d) =>
    d
      ? d.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
      : '—'

  const triggerLabel = TRIGGER_OPTIONS.find((t) => t.value === form.trigger_type)?.label || form.trigger_type

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) { setError('Service Request Title is required.'); return }

    const start  = new Date(form.bid_start_time)
    const close  = new Date(form.bid_close_time)
    const forced = new Date(form.forced_close_time)

    if (isNaN(start.getTime()) || isNaN(close.getTime()) || isNaN(forced.getTime())) {
      setError('Please fill in all timing fields.')
      return
    }
    if (close <= start)  { setError('Bid Close must be after Bid Start.'); return }
    if (forced <= close) { setError('Forced Close must be after Bid Close.'); return }
    if (form.trigger_window < 1)     { setError('Trigger Window must be ≥ 1 minute.'); return }
    if (form.extension_duration < 1) { setError('Extension Duration must be ≥ 1 minute.'); return }

    try {
      setLoading(true)
      const res = await createRFQ({
        name:               form.name.trim(),
        description:        form.description || undefined,
        service_date:       form.service_date || undefined,
        category_id:        form.category_id  || undefined,
        bid_start_time:     start.toISOString(),
        bid_close_time:     close.toISOString(),
        forced_close_time:  forced.toISOString(),
        trigger_window:     form.trigger_window,
        extension_duration: form.extension_duration,
        trigger_type:       form.trigger_type,
      })
      if (res.success) navigate(`/requirement/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create requirement.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="create-page">
        <div className="create-header">
          <h1>Post New Service Request</h1>
          <p className="create-subtitle">
            Describe your service need and let providers submit competitive quotes.
          </p>
        </div>

        <div className="create-layout">
          <form onSubmit={handleSubmit} className="create-form" id="post-requirement-form">
            {error && (
              <div className="form-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* ── Section 1: Basic Info ───────────────────────────────────── */}
            <div className="form-section">
              <h2 className="section-title">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Service Details
              </h2>

              <div className="form-group">
                <label htmlFor="name">Service Request Title <span className="required">*</span></label>
                <input
                  type="text" id="name" name="name" value={form.name} onChange={handleChange}
                  placeholder="e.g., Need kitchen plumbing repair" required
                />
              </div>

              <div className="form-group">
                <label htmlFor="category_id">Category</label>
                <select id="category_id" name="category_id" value={form.category_id} onChange={handleChange}>
                  <option value="">— Select a category —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="description">Detailed Description</label>
                <textarea
                  id="description" name="description" value={form.description} onChange={handleChange}
                  placeholder="Describe exactly what service you need, any special requirements, location details, etc."
                  rows="5"
                />
              </div>

              <div className="form-group">
                <label htmlFor="service_date">Preferred Service Date (optional)</label>
                <input type="date" id="service_date" name="service_date" value={form.service_date} onChange={handleChange} />
              </div>
            </div>

            {/* ── Section 2: Auction Timing ──────────────────────────────── */}
            <div className="form-section">
              <h2 className="section-title">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Auction Timing
              </h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="bid_start_time">Bid Start <span className="required">*</span></label>
                  <input
                    type="datetime-local" id="bid_start_time" name="bid_start_time"
                    value={form.bid_start_time} onChange={handleChange} required
                  />
                  <span className="form-hint">When bidding opens</span>
                </div>

                <div className="form-group">
                  <label htmlFor="bid_close_time">Bid Close <span className="required">*</span></label>
                  <input
                    type="datetime-local" id="bid_close_time" name="bid_close_time"
                    value={form.bid_close_time} onChange={handleChange} required
                  />
                  <span className="form-hint">Normal close (can be extended)</span>
                </div>

                <div className="form-group">
                  <label htmlFor="forced_close_time">Forced Close <span className="required">*</span></label>
                  <input
                    type="datetime-local" id="forced_close_time" name="forced_close_time"
                    value={form.forced_close_time} onChange={handleChange} required
                  />
                  <span className="form-hint">Hard deadline — no extensions past this</span>
                </div>
              </div>
            </div>

            {/* ── Section 3: Extension Config ────────────────────────────── */}
            <div className="form-section">
              <h2 className="section-title">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Bidding Extension Configuration
              </h2>
              <p className="section-desc">
                Automatically extend the bid window when activity occurs near closing time.
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="trigger_window">Trigger Window (minutes)</label>
                  <input
                    type="number" id="trigger_window" name="trigger_window"
                    value={form.trigger_window} onChange={handleChange} min="1" step="1"
                  />
                  <span className="form-hint">How close to close-time triggers extension</span>
                </div>

                <div className="form-group">
                  <label htmlFor="extension_duration">Extension Duration (minutes)</label>
                  <input
                    type="number" id="extension_duration" name="extension_duration"
                    value={form.extension_duration} onChange={handleChange} min="1" step="1"
                  />
                  <span className="form-hint">How many minutes are added</span>
                </div>
              </div>

              <div className="form-group">
                <label>Extension Trigger</label>
                <div className="trigger-cards">
                  {TRIGGER_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`trigger-card ${form.trigger_type === opt.value ? 'trigger-card--active' : ''}`}
                    >
                      <input
                        type="radio" name="trigger_type" value={opt.value}
                        checked={form.trigger_type === opt.value} onChange={handleChange}
                      />
                      <div>
                        <strong>{opt.label}</strong>
                        <p>{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading} id="submit-requirement-btn">
              {loading ? (
                <><span className="spinner" /> Posting...</>
              ) : (
                <><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Post Service Request</>
              )}
            </button>
          </form>

          {/* ── Live Config Preview ─────────────────────────────────────── */}
          <aside className="config-preview">
            <h3 className="preview-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Configuration Preview
            </h3>

            <div className="preview-section">
              <div className="preview-label">Service Request</div>
              <div className="preview-value">{form.name || '—'}</div>
            </div>

            {form.category_id && (
              <div className="preview-section">
                <div className="preview-label">Category</div>
                <div className="preview-value">
                  {categories.find((c) => String(c.id) === String(form.category_id))?.name || '—'}
                </div>
              </div>
            )}

            <div className="preview-divider" />

            <div className="preview-section">
              <div className="preview-label">🟢 Bid Start</div>
              <div className="preview-value">{fmt(startDate)}</div>
            </div>
            <div className="preview-section">
              <div className="preview-label">🟠 Bid Close</div>
              <div className="preview-value">{fmt(closeDate)}</div>
            </div>
            <div className="preview-section">
              <div className="preview-label">🔴 Forced Close</div>
              <div className="preview-value">{fmt(forcedDate)}</div>
            </div>

            <div className="preview-divider" />

            <div className="preview-section">
              <div className="preview-label">Trigger Window</div>
              <div className="preview-value">{form.trigger_window} min before close</div>
            </div>
            <div className="preview-section">
              <div className="preview-label">Extension</div>
              <div className="preview-value">+{form.extension_duration} min</div>
            </div>
            <div className="preview-section">
              <div className="preview-label">Trigger</div>
              <div className="preview-value preview-trigger">{triggerLabel}</div>
            </div>

            <div className="preview-note">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Extensions are capped at the Forced Close time.
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default PostRequirementPage
