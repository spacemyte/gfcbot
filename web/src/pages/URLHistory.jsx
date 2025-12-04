import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function URLHistory() {
  const { serverId } = useParams()
  const [messages, setMessages] = useState([])
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const limit = 50

  useEffect(() => {
    fetchMessages()
    fetchStats()
  }, [serverId, filter, page])

  const fetchMessages = async () => {
    try {
      const statusParam = filter !== 'all' ? `&status=${filter}` : ''
      const response = await axios.get(
        `${API_URL}/api/messages/${serverId}?limit=${limit}&offset=${page * limit}${statusParam}`
      )
      setMessages(response.data.data)
      setTotalCount(response.data.count)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/messages/${serverId}/stats`)
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">URL History</h1>
        <p className="mt-2 text-gray-400">Track all Instagram URL transformations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-discord-bg-light rounded-lg">
          <p className="text-gray-400 text-sm">Total URLs</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="p-4 bg-discord-bg-light rounded-lg">
          <p className="text-gray-400 text-sm">Successful Embeds</p>
          <p className="text-3xl font-bold text-discord-green">{stats.success}</p>
        </div>
        <div className="p-4 bg-discord-bg-light rounded-lg">
          <p className="text-gray-400 text-sm">Failed Embeds</p>
          <p className="text-3xl font-bold text-discord-red">{stats.failed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-2">
        <button
          onClick={() => { setFilter('all'); setPage(0); }}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-discord-blue' : 'bg-discord-bg-light'} text-white transition`}
        >
          All
        </button>
        <button
          onClick={() => { setFilter('success'); setPage(0); }}
          className={`px-4 py-2 rounded ${filter === 'success' ? 'bg-discord-blue' : 'bg-discord-bg-light'} text-white transition`}
        >
          Success
        </button>
        <button
          onClick={() => { setFilter('failed'); setPage(0); }}
          className={`px-4 py-2 rounded ${filter === 'failed' ? 'bg-discord-blue' : 'bg-discord-bg-light'} text-white transition`}
        >
          Failed
        </button>
      </div>

      {/* Messages List */}
      <div className="bg-discord-bg-light rounded-lg overflow-hidden">
        {messages.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-discord-bg">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Original URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Embedded URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Prefix
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {messages.map((msg) => (
                <tr key={msg.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatDate(msg.created_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    <a
                      href={msg.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-discord-blue hover:underline"
                    >
                      {msg.original_url.substring(0, 50)}...
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {msg.embedded_url ? (
                      <a
                        href={msg.embedded_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-discord-green hover:underline"
                      >
                        {msg.embedded_url.substring(0, 50)}...
                      </a>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        msg.validation_status === 'success'
                          ? 'bg-discord-green'
                          : 'bg-discord-red'
                      } text-white`}
                    >
                      {msg.validation_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {msg.embed_prefix_used || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center text-gray-400 py-12">
            <p>No URL transformations recorded yet.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-4 py-2 bg-discord-bg-light text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-white">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 bg-discord-bg-light text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
