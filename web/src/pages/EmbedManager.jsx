import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function EmbedManager() {
  const { serverId } = useParams()
  const [embeds, setEmbeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newPrefix, setNewPrefix] = useState('')
  const [featureId, setFeatureId] = useState(null)

  useEffect(() => {
    fetchEmbeds()
    fetchFeatureId()
  }, [serverId])

  const fetchFeatureId = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/features`)
      const instagramFeature = response.data.find(f => f.name === 'instagram_embed')
      if (instagramFeature) {
        setFeatureId(instagramFeature.id)
      }
    } catch (error) {
      console.error('Error fetching features:', error)
    }
  }

  const fetchEmbeds = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/embeds/${serverId}`)
      setEmbeds(response.data)
    } catch (error) {
      console.error('Error fetching embeds:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (result) => {
    if (!result.destination) return

    const items = Array.from(embeds)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setEmbeds(items)

    // Update priority order in backend
    try {
      const embedIds = items.map(item => item.id)
      await axios.post(`${API_URL}/api/embeds/${serverId}/reorder`, { embedIds })
    } catch (error) {
      console.error('Error reordering embeds:', error)
      fetchEmbeds() // Revert on error
    }
  }

  const handleAddEmbed = async (e) => {
    e.preventDefault()
    if (!newPrefix.trim() || !featureId) return

    try {
      await axios.post(`${API_URL}/api/embeds/${serverId}`, {
        prefix: newPrefix.trim(),
        feature_id: featureId,
        active: true,
        priority: embeds.length
      })
      setNewPrefix('')
      setShowAddModal(false)
      fetchEmbeds()
    } catch (error) {
      console.error('Error adding embed:', error)
      alert('Failed to add embed prefix')
    }
  }

  const handleToggleActive = async (embedId, currentActive) => {
    try {
      await axios.put(`${API_URL}/api/embeds/${serverId}/${embedId}`, {
        active: !currentActive
      })
      fetchEmbeds()
    } catch (error) {
      console.error('Error toggling embed:', error)
    }
  }

  const handleDelete = async (embedId) => {
    if (!confirm('Are you sure you want to delete this embed prefix?')) return

    try {
      await axios.delete(`${API_URL}/api/embeds/${serverId}/${embedId}`)
      fetchEmbeds()
    } catch (error) {
      console.error('Error deleting embed:', error)
    }
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Instagram Embed Manager</h1>
          <p className="mt-2 text-gray-400">Drag and drop to reorder priority</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-discord-green text-white rounded-md hover:bg-green-600 transition"
        >
          Add Prefix
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="embeds">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3"
            >
              {embeds.length > 0 ? (
                embeds.map((embed, index) => (
                  <Draggable key={embed.id} draggableId={embed.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="p-4 bg-discord-bg-light rounded-lg shadow flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="text-gray-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-semibold text-white">{embed.prefix}</span>
                              <span className={`px-2 py-1 text-xs rounded ${embed.active ? 'bg-discord-green' : 'bg-gray-600'} text-white`}>
                                {embed.active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400">Priority: {index + 1}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleToggleActive(embed.id, embed.active)}
                            className={`px-3 py-1 rounded ${embed.active ? 'bg-gray-600 hover:bg-gray-700' : 'bg-discord-green hover:bg-green-600'} text-white transition`}
                          >
                            {embed.active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDelete(embed.id)}
                            className="px-3 py-1 bg-discord-red hover:bg-red-600 text-white rounded transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))
              ) : (
                <div className="text-center text-gray-400 py-12 bg-discord-bg-light rounded-lg">
                  <p>No embed prefixes configured. Add one to get started!</p>
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-discord-bg-light p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Add Embed Prefix</h2>
            <form onSubmit={handleAddEmbed}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Prefix (e.g., kk, dd, vv)</label>
                <input
                  type="text"
                  value={newPrefix}
                  onChange={(e) => setNewPrefix(e.target.value)}
                  className="w-full px-3 py-2 bg-discord-bg text-white rounded focus:outline-none focus:ring-2 focus:ring-discord-blue"
                  placeholder="kk"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-discord-green text-white rounded hover:bg-green-600 transition"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
