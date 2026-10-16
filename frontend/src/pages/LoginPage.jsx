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
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-email">Email Address</label>
              <div className="login-input-wrap">
                <svg className="login-input-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 4L12 13 2 4" />
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
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
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

          {/* ── Divider ── */}
          <div className="login-divider">
            <span className="login-divider-line" />
            <span className="login-divider-text">or</span>
            <span className="login-divider-line" />
          </div>

          {/* ── Google Sign-In (activate by filling in .env Google credentials) ── */}
          <a
            href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google`}
            className="google-signin-btn"
            id="google-signin-btn"
            title="Configure GOOGLE_CLIENT_ID in .env to enable"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </a>

          <div className="login-register-link">
            <p>Don't have an account? <Link to="/register">Register here</Link></p>
          </div>

          <div className="login-hints">
            <h2 className="login-hints-title">Demo Credentials</h2>

            <div className="login-hint-cards">
              <div
                className="login-hint-card"
                onClick={() => {
                  setEmail('demo@servicebid.com');
                  setPassword('demo123');
                }}
              >
                <span className="hint-role">Demo User</span>
                <span className="hint-email">demo@servicebid.com</span>
                <span className="hint-desc">Click to fill demo credentials</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
