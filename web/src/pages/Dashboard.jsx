import { Link } from 'react-router-dom'

export default function Dashboard({ user }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Welcome, {user.username}!</h1>
        <p className="mt-2 text-gray-400">Select a server to manage:</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {user.guilds && user.guilds.length > 0 ? (
          user.guilds.map((guild) => (
            <Link
              key={guild.id}
              to={`/embeds/${guild.id}`}
              className="block p-6 bg-discord-bg-light rounded-lg shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              <div className="flex items-center space-x-4">
                {guild.icon ? (
                  <img
                    src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                    alt={guild.name}
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-discord-blue flex items-center justify-center text-2xl font-bold">
                    {guild.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-white">{guild.name}</h3>
                  <p className="text-sm text-gray-400">Click to manage</p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-400 py-12">
            <p>No servers found. Make sure the bot is added to your server.</p>
          </div>
        )}
      </div>

      <div className="mt-12 p-6 bg-discord-bg-light rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Features</h2>
        <ul className="space-y-2 text-gray-300">
          <li className="flex items-center">
            <span className="text-discord-green mr-2">✓</span>
            Instagram URL Embedding with priority-based fallback
          </li>
          <li className="flex items-center">
            <span className="text-discord-green mr-2">✓</span>
            URL validation before message modification
          </li>
          <li className="flex items-center">
            <span className="text-discord-green mr-2">✓</span>
            Comprehensive audit logging
          </li>
          <li className="flex items-center">
            <span className="text-discord-green mr-2">✓</span>
            Configurable data retention
          </li>
        </ul>
      </div>
    </div>
  )
}
