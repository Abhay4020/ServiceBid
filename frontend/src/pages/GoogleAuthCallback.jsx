import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * GoogleAuthCallback
 *
 * This page handles the redirect after Google OAuth completes.
 * The backend redirects here with:
 *   /auth/callback?token=<JWT>&user=<JSON-encoded-user>
 *
 * We parse the query params, persist auth state, and redirect to home.
 */
function GoogleAuthCallback() {
  const navigate  = useNavigate()
  const { saveAuth } = useAuth()
  const handled   = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const params = new URLSearchParams(window.location.search)
    const token  = params.get('token')
    const userRaw = params.get('user')

    if (token && userRaw) {
      try {
        const user = JSON.parse(decodeURIComponent(userRaw))
        // saveAuth updates BOTH localStorage AND React state (setUser/setToken)
        // so ProtectedRoute sees the user immediately on navigation
        saveAuth(token, user)
        navigate('/', { replace: true })
      } catch {
        navigate('/login?error=google_parse', { replace: true })
      }
    } else {
      navigate('/login?error=google_failed', { replace: true })
    }
  }, [navigate])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', flexDirection: 'column', gap: '1rem',
      background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f8fafc)'
    }}>
      <div style={{ width: 40, height: 40, border: '4px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p>Signing you in with Google…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default GoogleAuthCallback
