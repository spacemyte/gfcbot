import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'
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
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await axios.get('/auth/user')
      setUser(response.data)
    } catch (error) {
      console.log('Not authenticated')
      setUser(null)
    } finally {
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
