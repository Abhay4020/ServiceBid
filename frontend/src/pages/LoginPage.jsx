import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.message)
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />

      <div className="login-container">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="login-title">ServiceBid</h1>
            <p className="login-subtitle">Sign in to post requirements & place quotes</p>
          </div>

          {error && (
            <div className="login-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-email">Email Address</label>
              <div className="login-input-wrap">
                <svg className="login-input-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/>
                </svg>
                <input
                  type="email" id="login-email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email" required autoFocus autoComplete="email"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <svg className="login-input-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input
                  type="password" id="login-password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password" required autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" className="login-submit" disabled={loading} id="login-submit-btn">
              {loading ? <span className="login-spinner" /> : 'Sign In'}
            </button>
          </form>

          <div className="login-register-link">
            <p>Don't have an account? <Link to="/register">Register here</Link></p>
          </div>

          <div className="login-hints">
            <h2 className="login-hints-title">Default Credentials</h2>
            <div className="login-hint-cards">
              <div className="login-hint-card" onClick={() => { setEmail('admin@servicebid.com'); setPassword('admin123') }}>
                <span className="hint-role admin-role">Admin</span>
                <span className="hint-email">admin@servicebid.com</span>
                <span className="hint-desc">Password: admin123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
