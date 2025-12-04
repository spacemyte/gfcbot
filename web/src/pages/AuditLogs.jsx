import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

export default function AuditLogs() {
  const { serverId } = useParams()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const limit = 50

  useEffect(() => {
    fetchLogs()
  }, [serverId, page])

  const fetchLogs = async () => {
    try {
      const response = await axios.get(
        `/api/audit-logs/${serverId}?limit=${limit}&offset=${page * limit}`
      )
      setLogs(response.data.data)
      setTotalCount(response.data.count)
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const getActionBadgeColor = (action) => {
    if (action.includes('created')) return 'bg-discord-green'
    if (action.includes('updated')) return 'bg-discord-yellow'
    if (action.includes('deleted')) return 'bg-discord-red'
    return 'bg-gray-600'
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
        <p className="mt-2 text-gray-400">Track all changes and actions in your server</p>
      </div>

      <div className="bg-discord-bg-light rounded-lg overflow-hidden">
        {logs.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-discord-bg">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {log.user_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded ${getActionBadgeColor(log.action)} text-white`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    <div>
                      <span className="text-gray-500 text-xs">{log.target_type}</span>
                      <p className="text-white">{log.target_id}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {log.details && (
                      <pre className="text-xs bg-discord-bg p-2 rounded overflow-x-auto max-w-md">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center text-gray-400 py-12">
            <p>No audit logs recorded yet.</p>
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
