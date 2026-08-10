import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './RegisterPage.css'

function RegisterPage() {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 6)          { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const result = await register(name, email, password)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.message)
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <div className="register-bg-orb register-bg-orb-1" />
      <div className="register-bg-orb register-bg-orb-2" />

      <div className="register-container">
        <div className="register-card">
          <div className="register-brand">
            <div className="register-logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="register-title">Create Account</h1>
            <p className="register-subtitle">Sign up to post service requirements & place quotes</p>
          </div>

          {error && (
            <div className="register-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form">
            <div className="register-field">
              <label htmlFor="reg-name">Full Name</label>
              <div className="register-input-wrap">
                <svg className="register-input-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input type="text" id="reg-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" required autoFocus />
              </div>
            </div>

            <div className="register-field">
              <label htmlFor="reg-email">Email Address</label>
              <div className="register-input-wrap">
                <svg className="register-input-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/>
                </svg>
                <input type="email" id="reg-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
              </div>
            </div>

            <div className="register-field">
              <label htmlFor="reg-password">Password</label>
              <div className="register-input-wrap">
                <svg className="register-input-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input type="password" id="reg-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required />
              </div>
            </div>

            <div className="register-field">
              <label htmlFor="reg-confirm-password">Confirm Password</label>
              <div className="register-input-wrap">
                <svg className="register-input-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input type="password" id="reg-confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" required />
              </div>
            </div>

            <button type="submit" className="register-submit" disabled={loading}>
              {loading ? <span className="register-spinner" /> : 'Create Account'}
            </button>
          </form>

          <div className="register-login-link">
            <p>Already have an account? <Link to="/login">Sign in here</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
