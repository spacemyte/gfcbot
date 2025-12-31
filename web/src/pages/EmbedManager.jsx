import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

// Common Discord reaction emojis
const COMMON_EMOJIS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🔥',
  '👀', '💯', '✅', '❌', '⭐', '🎉', '🙏', '💪',
  '🤝', '✨', '💚', '💙', '💜', '🧡', '🤍', '🤎'
]

export default function EmbedManager() {
  const { serverId } = useParams()
  const [instagramEmbeds, setInstagramEmbeds] = useState([])
  const [twitterEmbeds, setTwitterEmbeds] = useState([])
  const [filteredEmbeds, setFilteredEmbeds] = useState([]) // embeds for current tab/feature
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newPrefix, setNewPrefix] = useState('')
  const [newEmbedType, setNewEmbedType] = useState('prefix') // 'prefix' or 'replacement'
  const [instagramFeatureId, setInstagramFeatureId] = useState(null)
  const [twitterFeatureId, setTwitterFeatureId] = useState(null)
  const [activeTab, setActiveTab] = useState('instagram') // 'instagram' or 'twitter'
  
  // Instagram embed config state
  const [instagramConfig, setInstagramConfig] = useState({
    webhook_repost_enabled: false,
    pruning_enabled: true,
    pruning_max_days: 90,
    reaction_enabled: true,
    reaction_emoji: '🙏'
  })
  
  // Twitter embed config state
  const [twitterConfig, setTwitterConfig] = useState({
    webhook_repost_enabled: false,
    pruning_enabled: true,
    pruning_max_days: 90,
    reaction_enabled: true,
    reaction_emoji: '🙏'
  })
  
  const [configLoading, setConfigLoading] = useState(true)
  const [configSaving, setConfigSaving] = useState(false)
  const [configMessage, setConfigMessage] = useState(null)

  useEffect(() => {
    fetchFeatureIds()
    fetchInstagramConfig()
    fetchTwitterConfig()
  }, [serverId])

  useEffect(() => {
    // Refetch embeds once feature IDs are known
    if (instagramFeatureId || twitterFeatureId) {
      fetchEmbeds()
    }
  }, [serverId, instagramFeatureId, twitterFeatureId])

  useEffect(() => {
    // Update filtered list when tab or per-feature lists change
    if (activeTab === 'instagram') {
      setFilteredEmbeds(instagramFeatureId ? instagramEmbeds : [])
    } else {
      setFilteredEmbeds(twitterFeatureId ? twitterEmbeds : [])
    }
  }, [activeTab, instagramEmbeds, twitterEmbeds, instagramFeatureId, twitterFeatureId])

  const fetchInstagramConfig = async () => {
    setConfigLoading(true)
    try {
      const response = await axios.get(`${API_URL}/api/instagram-embed-config/${serverId}`)
      setInstagramConfig(response.data)
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setInstagramConfig({
          webhook_repost_enabled: false,
          pruning_enabled: true,
          pruning_max_days: 90,
          reaction_enabled: true,
          reaction_emoji: '🙏'
        })
      } else {
        console.error('Error fetching Instagram embed config:', error)
      }
    } finally {
      setConfigLoading(false)
    }
  }

  const fetchTwitterConfig = async () => {
    setConfigLoading(true)
    try {
      const response = await axios.get(`${API_URL}/api/twitter-embed-config/${serverId}`)
      setTwitterConfig(response.data)
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setTwitterConfig({
          webhook_repost_enabled: false,
          pruning_enabled: true,
          pruning_max_days: 90,
          reaction_enabled: true,
          reaction_emoji: '🙏'
        })
      } else {
        console.error('Error fetching Twitter embed config:', error)
      }
    } finally {
      setConfigLoading(false)
    }
  }

  const handleInstagramConfigChange = (field, value) => {
    setInstagramConfig((prev) => ({ ...prev, [field]: value }))
  }

  const handleTwitterConfigChange = (field, value) => {
    setTwitterConfig((prev) => ({ ...prev, [field]: value }))
  }

  const handleConfigSave = async (e) => {
    e.preventDefault()
    setConfigSaving(true)
    setConfigMessage(null)
    try {
      const endpoint = activeTab === 'instagram' 
        ? `/api/instagram-embed-config/${serverId}`
        : `/api/twitter-embed-config/${serverId}`
      const config = activeTab === 'instagram' ? instagramConfig : twitterConfig
      
      await axios.put(`${API_URL}${endpoint}`, config)
      setConfigMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      setConfigMessage({ type: 'error', text: 'Failed to save settings.' })
      console.error('Error saving embed config:', error)
    } finally {
      setConfigSaving(false)
    }
  }

  const fetchFeatureIds = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/features`)
      const instagramFeature = response.data.find(f => f.name === 'instagram_embed')
      const twitterFeature = response.data.find(f => f.name === 'twitter_embed')
      if (instagramFeature) {
        setInstagramFeatureId(instagramFeature.id)
      } else {
        console.warn('Instagram embed feature not found')
      }
      if (twitterFeature) {
        setTwitterFeatureId(twitterFeature.id)
      } else {
        console.warn('Twitter/X embed feature not found')
      }
    } catch (error) {
      console.error('Error fetching features:', error)
    }
  }

  const fetchEmbeds = async () => {
    try {
      // Fetch Instagram embeds
      if (instagramFeatureId) {
        const resIg = await axios.get(`${API_URL}/api/embeds/${serverId}`, {
          params: { featureId: instagramFeatureId }
        })
        setInstagramEmbeds(resIg.data)
      } else {
        setInstagramEmbeds([])
      }

      // Fetch Twitter embeds
      if (twitterFeatureId) {
        const resTw = await axios.get(`${API_URL}/api/embeds/${serverId}`, {
          params: { featureId: twitterFeatureId }
        })
        setTwitterEmbeds(resTw.data)
      } else {
        setTwitterEmbeds([])
      }

    } catch (error) {
      console.error('Error fetching embeds:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (result) => {
    if (!result.destination) return

    const items = Array.from(filteredEmbeds)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Apply new order to filtered list and update global list priorities
    const reorderedIds = items.map(item => item.id)

    // Update backend with only the filtered IDs order
    try {
      await axios.post(`${API_URL}/api/embeds/${serverId}/reorder`, { embedIds: reorderedIds })
      // Update local state only for the active tab
      if (activeTab === 'instagram') {
        setInstagramEmbeds(items.map((e, idx) => ({ ...e, priority: idx })))
      } else {
        setTwitterEmbeds(items.map((e, idx) => ({ ...e, priority: idx })))
      }
    } catch (error) {
      console.error('Error reordering embeds:', error)
      fetchEmbeds() // Revert on error
    }
  }

  const handleAddEmbed = async (e) => {
    e.preventDefault()
    const featureId = activeTab === 'instagram' ? instagramFeatureId : twitterFeatureId
    console.log('Add embed clicked. Feature ID:', featureId, 'New prefix:', newPrefix)
    
    if (!newPrefix.trim()) {
      alert('Please enter a prefix')
      return
    }
    
    if (!featureId) {
      alert('Feature ID not loaded. Please refresh the page.')
      return
    }

    try {
      console.log('Sending add embed request:', {
        prefix: newPrefix.trim(),
        feature_id: featureId,
        embed_type: activeTab === 'twitter' ? newEmbedType : 'prefix',
        active: true,
        priority: filteredEmbeds.length
      })
      const response = await axios.post(`${API_URL}/api/embeds/${serverId}`, {
        prefix: newPrefix.trim(),
        feature_id: featureId,
        embed_type: activeTab === 'twitter' ? newEmbedType : 'prefix',
        active: true,
        priority: filteredEmbeds.length
      })
      console.log('Add embed response:', response.data)
      setNewPrefix('')
      setNewEmbedType('prefix')
      setShowAddModal(false)
      // Update local list for current tab
      if (activeTab === 'instagram') {
        setInstagramEmbeds(prev => [...prev, response.data])
      } else {
        setTwitterEmbeds(prev => [...prev, response.data])
      }
    } catch (error) {
      console.error('Error adding embed:', error.response?.data || error.message)
      alert('Failed to add embed prefix: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleToggleActive = async (embedId, currentActive) => {
    try {
      await axios.put(`${API_URL}/api/embeds/${serverId}/${embedId}`, {
        active: !currentActive
      })
      if (activeTab === 'instagram') {
        setInstagramEmbeds(prev => prev.map(e => e.id === embedId ? { ...e, active: !currentActive } : e))
      } else {
        setTwitterEmbeds(prev => prev.map(e => e.id === embedId ? { ...e, active: !currentActive } : e))
      }
    } catch (error) {
      console.error('Error toggling embed:', error)
    }
  }

  const handleDelete = async (embedId) => {
    if (!confirm('Are you sure you want to delete this embed prefix?')) return

    try {
      await axios.delete(`${API_URL}/api/embeds/${serverId}/${embedId}`)
      if (activeTab === 'instagram') {
        setInstagramEmbeds(prev => prev.filter(e => e.id !== embedId))
      } else {
        setTwitterEmbeds(prev => prev.filter(e => e.id !== embedId))
      }
    } catch (error) {
      console.error('Error deleting embed:', error)
    }
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  const currentConfig = activeTab === 'instagram' ? instagramConfig : twitterConfig
  const platformName = activeTab === 'instagram' ? 'Instagram' : 'Twitter/X'

  return (
    <div className="space-y-6">
      {/* Platform Tabs */}
      <div className="flex space-x-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('instagram')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'instagram'
              ? 'border-b-2 border-discord-blue text-discord-blue'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📸 Instagram
        </button>
        <button
          onClick={() => setActiveTab('twitter')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'twitter'
              ? 'border-b-2 border-discord-blue text-discord-blue'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          𝕏 Twitter/X
        </button>
      </div>

      {/* Embed Config Section */}
      <div className="bg-discord-bg-light p-6 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4">{platformName} Embed Settings</h2>
        {configLoading ? (
          <div className="text-white">Loading settings...</div>
        ) : (
          <form onSubmit={handleConfigSave} className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="webhook-repost-enabled"
                checked={currentConfig.webhook_repost_enabled}
                onChange={e => activeTab === 'instagram' 
                  ? handleInstagramConfigChange('webhook_repost_enabled', e.target.checked)
                  : handleTwitterConfigChange('webhook_repost_enabled', e.target.checked)
                }
                className="w-5 h-5 text-discord-blue bg-discord-bg border-gray-600 rounded focus:ring-discord-blue"
              />
              <label htmlFor="webhook-repost-enabled" className="text-white">
                Use webhook repost mode (delete &amp; repost as user)
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="webhook-reply-notifications"
                checked={currentConfig.webhook_reply_notifications}
                onChange={e => activeTab === 'instagram'
                  ? handleInstagramConfigChange('webhook_reply_notifications', e.target.checked)
                  : handleTwitterConfigChange('webhook_reply_notifications', e.target.checked)
                }
                className="w-5 h-5 text-discord-blue bg-discord-bg border-gray-600 rounded focus:ring-discord-blue"
              />
              <label htmlFor="webhook-reply-notifications" className="text-white">
                Notify original user when someone replies to their bot webhook message
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="suppress-original-embed"
                checked={currentConfig.suppress_original_embed ?? true}
                onChange={e => activeTab === 'instagram'
                  ? handleInstagramConfigChange('suppress_original_embed', e.target.checked)
                  : handleTwitterConfigChange('suppress_original_embed', e.target.checked)
                }
                className="w-5 h-5 text-discord-blue bg-discord-bg border-gray-600 rounded focus:ring-discord-blue"
              />
              <label htmlFor="suppress-original-embed" className="text-white">
                Suppress original message embed preview
              </label>
            </div>

            {/* Reaction Enabled Toggle */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="reaction-enabled"
                checked={currentConfig.reaction_enabled ?? true}
                onChange={e => activeTab === 'instagram'
                  ? handleInstagramConfigChange('reaction_enabled', e.target.checked)
                  : handleTwitterConfigChange('reaction_enabled', e.target.checked)
                }
                className="w-5 h-5 text-discord-blue bg-discord-bg border-gray-600 rounded focus:ring-discord-blue"
              />
              <label htmlFor="reaction-enabled" className="text-white">
                React to already-embedded URLs
              </label>
            </div>
            
            {/* Reaction Emoji Picker */}
            <div>
              <label className="block text-gray-300 mb-2">
                Reaction Emoji (for already-embedded URLs)
              </label>
              <div className="flex items-center space-x-3">
                <div className="text-4xl">{currentConfig.reaction_emoji || '🙏'}</div>
                <div className="flex-1">
                  <div className="grid grid-cols-8 gap-2 p-3 bg-discord-bg rounded">
                    {COMMON_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => activeTab === 'instagram'
                          ? handleInstagramConfigChange('reaction_emoji', emoji)
                          : handleTwitterConfigChange('reaction_emoji', emoji)
                        }
                        disabled={!currentConfig.reaction_enabled}
                        className={`text-2xl p-2 rounded transition ${
                          currentConfig.reaction_emoji === emoji ? 'bg-discord-blue' : 'hover:bg-discord-bg-light'
                        } ${!currentConfig.reaction_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-400">
                    Choose which emoji the bot reacts with when a user posts an already-embedded URL
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="pruning-enabled"
                checked={currentConfig.pruning_enabled}
                onChange={e => activeTab === 'instagram'
                  ? handleInstagramConfigChange('pruning_enabled', e.target.checked)
                  : handleTwitterConfigChange('pruning_enabled', e.target.checked)
                }
                className="w-5 h-5 text-discord-blue bg-discord-bg border-gray-600 rounded focus:ring-discord-blue"
              />
              <label htmlFor="pruning-enabled" className="text-white">
                Enable automatic data pruning
              </label>
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">
                Maximum retention period (days)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={currentConfig.pruning_max_days}
                onChange={e => activeTab === 'instagram'
                  ? handleInstagramConfigChange('pruning_max_days', parseInt(e.target.value))
                  : handleTwitterConfigChange('pruning_max_days', parseInt(e.target.value))
                }
                disabled={!currentConfig.pruning_enabled}
                className={`w-full px-3 py-2 bg-discord-bg text-white rounded focus:outline-none focus:ring-2 focus:ring-discord-blue ${
                  !currentConfig.pruning_enabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
              <p className="mt-2 text-sm text-gray-400">
                Data older than {currentConfig.pruning_max_days} days will be automatically deleted. Maximum: 90 days.
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                type="submit"
                disabled={configSaving}
                className="px-4 py-2 bg-discord-green text-white rounded hover:bg-green-600 transition disabled:opacity-50"
              >
                {configSaving ? 'Saving...' : 'Save Settings'}
              </button>
              {configMessage && (
                <span className={configMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}>
                  {configMessage.text}
                </span>
              )}
            </div>
          </form>
        )}
      </div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">{platformName} Embed Manager</h1>
          <p className="mt-2 text-gray-400">Drag and drop to reorder priority</p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true)
            setNewEmbedType('prefix')
            setNewPrefix('')
          }}
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
              {filteredEmbeds.length > 0 ? (
                filteredEmbeds.map((embed, index) => (
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
                              {activeTab === 'twitter' && embed.embed_type && (
                                <span className={`px-2 py-1 text-xs rounded ${embed.embed_type === 'prefix' ? 'bg-blue-600' : 'bg-purple-600'} text-white`}>
                                  {embed.embed_type === 'prefix' ? 'Prefix' : 'Replace'}
                                </span>
                              )}
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
            <h2 className="text-2xl font-bold text-white mb-4">Add {platformName} Prefix</h2>
            <form onSubmit={handleAddEmbed}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">
                  {activeTab === 'twitter' ? 'Prefix or Replacement' : 'Prefix'} (e.g., {activeTab === 'twitter' ? 'fxtwitter.com or gg' : 'kk'})
                </label>
                <input
                  type="text"
                  value={newPrefix}
                  onChange={(e) => setNewPrefix(e.target.value)}
                  className="w-full px-3 py-2 bg-discord-bg text-white rounded focus:outline-none focus:ring-2 focus:ring-discord-blue"
                  placeholder={activeTab === 'twitter' ? 'fxtwitter.com' : 'kk'}
                  required
                />
              </div>
              
              {activeTab === 'twitter' && (
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">Type</label>
                  <select
                    value={newEmbedType}
                    onChange={(e) => setNewEmbedType(e.target.value)}
                    className="w-full px-3 py-2 bg-discord-bg text-white rounded focus:outline-none focus:ring-2 focus:ring-discord-blue"
                  >
                    <option value="prefix">Prefix (e.g., ggx.com)</option>
                    <option value="replacement">Replace (e.g., fxtwitter.com)</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-400">
                    {newEmbedType === 'prefix' 
                      ? 'Adds your text before the domain (x.com → ggx.com)'
                      : 'Replaces the entire domain (x.com → fxtwitter.com)'}
                  </p>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-discord-green text-white rounded hover:bg-green-600 transition"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewPrefix('')
                    setNewEmbedType('prefix')
                  }}
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
