import { RefreshCw } from 'lucide-react'

export default function Analytics() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Performance stats for your uploaded videos</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors">
          <RefreshCw size={13} />
          Sync Analytics
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {['Total Views', 'Total Likes', 'Videos Tracked'].map((label) => (
          <div key={label} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-2xl font-semibold text-white">—</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-medium text-white">Uploads Over Time</h2>
        </div>
        <div className="px-4 py-16 text-center text-sm text-gray-500">
          Chart will appear here once you have uploads (Phase 13)
        </div>
      </div>
    </div>
  )
}
