import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function Layout({ user, children, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const serverId = location.pathname.split('/')[2]

  const handleLogout = async () => {
    try {
      await axios.get(`${API_URL}/auth/logout`, { withCredentials: true })
      onLogout()
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-discord-bg">
      {/* Header */}
      <header className="bg-discord-bg-light shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">GFC Bot</h1>
              {serverId && (
                <nav className="flex space-x-4 ml-8">
                  <Link
                    to={`/embeds/${serverId}`}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname.includes('/embeds')
                        ? 'bg-discord-blue text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Embed Manager
                  </Link>
                  <Link
                    to={`/urls/${serverId}`}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname.includes('/urls')
                        ? 'bg-discord-blue text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    URL History
                  </Link>
                  <Link
                    to={`/audit/${serverId}`}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname.includes('/audit')
                        ? 'bg-discord-blue text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Audit Logs
                  </Link>
                  <Link
                    to={`/settings/${serverId}`}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname.includes('/settings')
                        ? 'bg-discord-blue text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Settings
                  </Link>
                </nav>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">{user.username}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-discord-red text-white rounded-md hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
