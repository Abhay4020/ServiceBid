import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import RequirementDetailPage from './pages/RequirementDetailPage'
import PostRequirementPage from './pages/PostRequirementPage'
import AdminPage from './pages/AdminPage'
import MyRequirementsPage from './pages/MyRequirementsPage'
import MyQuotesPage from './pages/MyQuotesPage'
import './App.css'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

function App() {
  const { user } = useAuth()

  return (
    <>
      {user && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/login"    element={user ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

          <Route path="/"                  element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/requirement/:id"   element={<ProtectedRoute><RequirementDetailPage /></ProtectedRoute>} />
          <Route path="/post"              element={<ProtectedRoute><PostRequirementPage /></ProtectedRoute>} />
          <Route path="/my-requirements"   element={<ProtectedRoute><MyRequirementsPage /></ProtectedRoute>} />
          <Route path="/my-quotes"         element={<ProtectedRoute><MyQuotesPage /></ProtectedRoute>} />
          <Route path="/admin"             element={<AdminRoute><AdminPage /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}

export default App
