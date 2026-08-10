import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRFQ } from '../services/api'
import './PostRequirementPage.css'

function PostRequirementPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    service_date: '',
    start_minutes_from_now: 0,
    close_minutes_from_now: 10,
    forced_close_minutes_from_now: 20,
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: ['name', 'description', 'service_date'].includes(name) ? value : Number(value),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim())                                { setError('Requirement title is required.'); return }
    if (form.close_minutes_from_now <= form.start_minutes_from_now) { setError('Close time must be after start time.'); return }
    if (form.forced_close_minutes_from_now <= form.close_minutes_from_now) { setError('Forced close time must be after close time.'); return }

    try {
      setLoading(true)
      const res = await createRFQ({
        name:                          form.name.trim(),
        description:                   form.description || undefined,
        service_date:                  form.service_date || undefined,
        start_minutes_from_now:        form.start_minutes_from_now,
        close_minutes_from_now:        form.close_minutes_from_now,
        forced_close_minutes_from_now: form.forced_close_minutes_from_now,
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
          <h1>Post New Requirement</h1>
          <p className="create-subtitle">Describe your service need and let providers submit quotes.</p>
        </div>

        <form onSubmit={handleSubmit} className="create-form" id="post-requirement-form">
          {error && (
            <div className="form-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="form-section">
            <h2 className="section-title">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Basic Information
            </h2>

            <div className="form-group">
              <label htmlFor="name">Requirement Title <span className="required">*</span></label>
              <input type="text" id="name" name="name" value={form.name} onChange={handleChange}
                placeholder="e.g., Need kitchen plumbing repair" required />
            </div>

            <div className="form-group">
              <label htmlFor="description">Detailed Description</label>
              <textarea id="description" name="description" value={form.description} onChange={handleChange}
                placeholder="Describe what service you need in detail..." rows="4" />
            </div>

            <div className="form-group">
              <label htmlFor="service_date">Preferred Service Date (optional)</label>
              <input type="date" id="service_date" name="service_date" value={form.service_date} onChange={handleChange} />
            </div>
          </div>

          {/* Timing */}
          <div className="form-section">
            <h2 className="section-title">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Quoting Window (minutes from now)
            </h2>
            <p className="section-desc">Set how long the quoting window stays open. All times are relative to right now.</p>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_minutes_from_now">Start (min from now)</label>
                <input type="number" id="start_minutes_from_now" name="start_minutes_from_now"
                  value={form.start_minutes_from_now} onChange={handleChange} min="0" step="1" required />
                <span className="form-hint">0 = opens immediately</span>
              </div>
              <div className="form-group">
                <label htmlFor="close_minutes_from_now">Normal Close (min from now)</label>
                <input type="number" id="close_minutes_from_now" name="close_minutes_from_now"
                  value={form.close_minutes_from_now} onChange={handleChange} min="1" step="1" required />
                <span className="form-hint">When quoting normally closes</span>
              </div>
              <div className="form-group">
                <label htmlFor="forced_close_minutes_from_now">Hard Deadline (min from now)</label>
                <input type="number" id="forced_close_minutes_from_now" name="forced_close_minutes_from_now"
                  value={form.forced_close_minutes_from_now} onChange={handleChange} min="2" step="1" required />
                <span className="form-hint">No extensions past this point</span>
              </div>
            </div>

            <div className="timing-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              If a quote arrives within the last <strong>5 minutes</strong> before close, the deadline automatically extends by <strong>5 minutes</strong> (up to the hard deadline).
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading} id="submit-requirement-btn">
            {loading ? (
              <><span className="spinner" /> Posting...</>
            ) : (
              <><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Post Requirement</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PostRequirementPage
