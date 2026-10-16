import { createContext, useContext, useState } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sb_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState(() => localStorage.getItem('sb_token') || null)

  const saveAuth = (tokenVal, userVal) => {
    localStorage.setItem('sb_token', tokenVal)
    localStorage.setItem('sb_user', JSON.stringify(userVal))
    setToken(tokenVal)
    setUser(userVal)
  }

  const login = async (email, password) => {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password })
      if (!data.success) return { success: false, message: data.message || 'Login failed.' }
      saveAuth(data.token, data.user)
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Invalid email or password.' }
    }
  }

  const register = async (name, email, password) => {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/register`, { name, email, password })
      if (!data.success) return { success: false, message: data.message || 'Registration failed.' }
      saveAuth(data.token, data.user)
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed.' }
    }
  }

  const logout = () => {
    localStorage.removeItem('sb_token')
    localStorage.removeItem('sb_user')
    setToken(null)
    setUser(null)
  }

  const isAdmin = user?.role === 'admin'
  const isUser  = user?.role === 'user'

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, saveAuth, isAdmin, isUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
