import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function Layout({ user, children, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const serverId = location.pathname.split('/')[2]
  const [serverDropdownOpen, setServerDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Filter manageable guilds
  const manageableGuilds = user.guilds ? user.guilds.filter(guild => {
    const hasManageGuild = (guild.permissions & 0x20) === 0x20
    const isAdmin = (guild.permissions & 0x8) === 0x8
    return hasManageGuild || isAdmin
  }) : []

  // Find current server name
  const currentServer = serverId ? manageableGuilds.find(g => g.id === serverId) : null

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setServerDropdownOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await axios.get(`${API_URL}/auth/logout`, { withCredentials: true })
      onLogout()
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleServerChange = (newServerId) => {
    setServerDropdownOpen(false)
    // Navigate to embeds page of new server
    navigate(`/embeds/${newServerId}`)
  }

  return (
    <div className="min-h-screen bg-discord-bg">
      {/* Header */}
      <header className="bg-discord-bg-light shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">GFC Bot</h1>
              <nav className="flex space-x-4 ml-8">
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/dashboard'
                      ? 'bg-discord-blue text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Dashboard
                </Link>
                {serverId && (
                  <>
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
                  </>
                )}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              {/* Server Selector Dropdown */}
              {manageableGuilds.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setServerDropdownOpen(!serverDropdownOpen)}
                    className="flex items-center space-x-2 px-3 py-2 bg-discord-bg rounded-md text-gray-300 hover:bg-gray-700 transition"
                  >
                    {currentServer ? (
                      <>
                        {currentServer.icon ? (
                          <img
                            src={`https://cdn.discordapp.com/icons/${currentServer.id}/${currentServer.icon}.png`}
                            alt={currentServer.name}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-discord-blue flex items-center justify-center text-xs font-bold">
                            {currentServer.name.charAt(0)}
                          </div>
                        )}
                        <span className="max-w-32 truncate">{currentServer.name}</span>
                      </>
                    ) : (
                      <span>Select Server</span>
                    )}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {serverDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-discord-bg-light rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                      {manageableGuilds.map((guild) => (
                        <button
                          key={guild.id}
                          onClick={() => handleServerChange(guild.id)}
                          className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 transition ${
                            serverId === guild.id ? 'bg-discord-blue' : ''
                          }`}
                        >
                          {guild.icon ? (
                            <img
                              src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                              alt={guild.name}
                              className="w-8 h-8 rounded-full flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-discord-blue flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {guild.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-white text-left truncate">{guild.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
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
