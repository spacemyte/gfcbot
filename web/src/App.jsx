import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EmbedManager from './pages/EmbedManager'
import URLHistory from './pages/URLHistory'
import AuditLogs from './pages/AuditLogs'
import Settings from './pages/Settings'
import Layout from './components/Layout'

// Configure axios defaults
axios.defaults.withCredentials = true

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if we just came back from OAuth redirect
    const isOAuthReturn = window.location.pathname === '/dashboard' && !user && loading
    checkAuth(isOAuthReturn)
  }, [])

  const checkAuth = async (isOAuthReturn = false, attempt = 1) => {
    try {
      console.log(`[Auth Check] Attempt ${attempt}, OAuth return: ${isOAuthReturn}`)
      const response = await axios.get(`${API_URL}/auth/user`, {
        timeout: 10000, // 10 second timeout
      })
      console.log('[Auth Check] Success:', response.data.username)
      setUser(response.data)
      setLoading(false)
    } catch (error) {
      console.log(`[Auth Check] Failed (${error.response?.status || error.message})`)
      
      // If this is an OAuth return and we haven't tried enough times, retry
      if (isOAuthReturn && attempt < 5) {
        const delayMs = Math.min(1000 * Math.pow(1.5, attempt - 1), 5000) // Exponential backoff, max 5s
        console.log(`[Auth Check] Retrying in ${delayMs}ms (attempt ${attempt}/5)`)
        setTimeout(() => {
          checkAuth(isOAuthReturn, attempt + 1)
        }, delayMs)
        return
      }
      
      setUser(null)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-discord-bg">
        <div className="text-xl text-white">Loading...</div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" /> : <Login />}
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <Layout user={user} onLogout={() => setUser(null)}>
                <Dashboard user={user} />
              </Layout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/embeds/:serverId"
          element={
            user ? (
              <Layout user={user} onLogout={() => setUser(null)}>
                <EmbedManager user={user} />
              </Layout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/urls/:serverId"
          element={
            user ? (
              <Layout user={user} onLogout={() => setUser(null)}>
                <URLHistory user={user} />
              </Layout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/audit/:serverId"
          element={
            user ? (
              <Layout user={user} onLogout={() => setUser(null)}>
                <AuditLogs user={user} />
              </Layout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/settings/:serverId"
          element={
            user ? (
              <Layout user={user} onLogout={() => setUser(null)}>
                <Settings user={user} />
              </Layout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </Router>
  )
}

export default App
