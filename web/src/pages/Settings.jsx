import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function Settings() {
  const { serverId } = useParams()
  const [pruningConfig, setPruningConfig] = useState({
    enabled: true,
    max_days: 90
  })
  const [botStatus, setBotStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    fetchConfig()
    fetchBotStatus()
  }, [serverId])

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pruning/${serverId}`)
      setPruningConfig(response.data)
    } catch (error) {
      console.error('Error fetching pruning config:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBotStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/bot-settings/bot_status`)
      setBotStatus(response.data.value)
    } catch (error) {
      console.error('Error fetching bot status:', error)
      setBotStatus('Currently freeing your Instagram links')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      await axios.put(`${API_URL}/api/pruning/${serverId}`, pruningConfig)
      await axios.put(`${API_URL}/api/bot-settings/bot_status`, { value: botStatus })
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      console.error('Error saving config:', error)
      setMessage({ type: 'error', text: 'Failed to save settings.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Server Settings</h1>
        <p className="mt-2 text-gray-400">Configure data retention and other settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bot Status */}
        <div className="bg-discord-bg-light p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Bot Status</h2>
          
          <div>
            <label className="block text-gray-300 mb-2">
              Bot Status Message
            </label>
            <input
              type="text"
              value={botStatus}
              onChange={(e) => setBotStatus(e.target.value)}
              placeholder="Currently freeing your Instagram links"
              maxLength="128"
              className="w-full px-3 py-2 bg-discord-bg text-white rounded focus:outline-none focus:ring-2 focus:ring-discord-blue"
            />
            <p className="mt-2 text-sm text-gray-400">
              Set what the bot displays as its status (max 128 characters).
            </p>
          </div>
        </div>

        {/* Data Retention */}
        <div className="bg-discord-bg-light p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Data Retention</h2>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="pruning-enabled"
                checked={pruningConfig.enabled}
                onChange={(e) =>
                  setPruningConfig({ ...pruningConfig, enabled: e.target.checked })
                }
                className="w-5 h-5 text-discord-blue bg-discord-bg border-gray-600 rounded focus:ring-discord-blue"
              />
              <label htmlFor="pruning-enabled" className="text-white">
                Enable automatic data pruning
              </label>
            </div>

            {pruningConfig.enabled && (
              <div>
                <label className="block text-gray-300 mb-2">
                  Maximum retention period (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={pruningConfig.max_days}
                  onChange={(e) =>
                    setPruningConfig({
                      ...pruningConfig,
                      max_days: parseInt(e.target.value)
                    })
                  }
                  className="w-full px-3 py-2 bg-discord-bg text-white rounded focus:outline-none focus:ring-2 focus:ring-discord-blue"
                />
                <p className="mt-2 text-sm text-gray-400">
                  Data older than {pruningConfig.max_days} days will be automatically deleted.
                  Maximum: 90 days.
                </p>
              </div>
            )}

            {!pruningConfig.enabled && (
              <div className="p-4 bg-discord-yellow bg-opacity-10 border border-discord-yellow rounded">
                <p className="text-discord-yellow text-sm">
                  ⚠️ Warning: Disabling pruning will keep all data indefinitely. This may affect
                  database performance over time.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center space-x-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-discord-blue text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {message && (
            <div
              className={`px-4 py-2 rounded ${
                message.type === 'success'
                  ? 'bg-discord-green text-white'
                  : 'bg-discord-red text-white'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </form>

      {/* Info Section */}
      <div className="bg-discord-bg-light p-6 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4">About Data Retention</h2>
        <ul className="space-y-2 text-gray-300 text-sm">
          <li className="flex items-start">
            <span className="text-discord-blue mr-2">•</span>
            <span>
              Pruning runs automatically daily at 2:00 AM server time
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-discord-blue mr-2">•</span>
            <span>
              Both message data and audit logs are affected by pruning settings
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-discord-blue mr-2">•</span>
            <span>
              Embed configurations and permissions are never pruned
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-discord-blue mr-2">•</span>
            <span>
              Changes to pruning settings do not affect existing data immediately
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}
