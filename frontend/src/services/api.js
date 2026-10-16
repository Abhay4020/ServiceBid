import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({ baseURL: API_BASE_URL })

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sb_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 — token expired/invalid
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register')
      if (!isAuthCall) {
        localStorage.removeItem('sb_token')
        localStorage.removeItem('sb_user')
        window.location.reload()
      }
    }
    return Promise.reject(error)
  }
)

// ── Categories ────────────────────────────────────────────────────────────────
export const getCategories = async () => (await api.get('/api/categories')).data

// ── Requirements (RFQ) ────────────────────────────────────────────────────────
// params: { page, limit, search, category_id }
export const getRFQs       = async (params = {}) => (await api.get('/api/rfqs', { params })).data
export const getMyRFQs     = async ()             => (await api.get('/api/rfqs/mine')).data
export const getRFQById    = async (id)            => (await api.get(`/api/rfq/${id}`)).data
export const createRFQ     = async (data)          => (await api.post('/api/rfq', data)).data
export const deleteRFQ     = async (id)            => (await api.delete(`/api/rfq/${id}`)).data
export const forceCloseRFQ = async (id)            => (await api.put(`/api/rfq/${id}/force-close`)).data

// ── Quotes (Bids) ─────────────────────────────────────────────────────────────
export const placeBid   = async (data) => (await api.post('/api/bid', data)).data
export const getMyBids  = async ()     => (await api.get('/api/bids/mine')).data

// ── User management (admin) ───────────────────────────────────────────────────
export const getUsers   = async ()         => (await api.get('/api/users')).data
export const createUser = async (data)     => (await api.post('/api/users', data)).data
export const updateUser = async (id, data) => (await api.put(`/api/users/${id}`, data)).data
export const deleteUser = async (id)       => (await api.delete(`/api/users/${id}`)).data

// ── Admin stats ───────────────────────────────────────────────────────────────
export const getAdminStats = async () => (await api.get('/api/admin/stats')).data

export default api
