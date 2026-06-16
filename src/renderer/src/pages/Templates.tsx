import { Plus } from 'lucide-react'

export default function Templates() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Templates</h1>
          <p className="text-sm text-gray-400 mt-0.5">Content templates used to generate videos</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors">
          <Plus size={14} />
          New Template
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Ambient Loop</span>
            <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">MVP</span>
          </div>
          <p className="text-xs text-gray-400">
            Loop a background video with music for a set duration. Supports fade in/out and text overlays.
          </p>
        </div>
      </div>
    </div>
  )
}
