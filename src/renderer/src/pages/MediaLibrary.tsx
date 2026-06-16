import { Upload } from 'lucide-react'

const TABS = ['All', 'Video', 'Audio', 'Captions', 'Thumbnails']

export default function MediaLibrary() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Media Library</h1>
          <p className="text-sm text-gray-400 mt-0.5">Import and manage your local media assets</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition-colors">
          <Upload size={14} />
          Import Media
        </button>
      </div>

      <div className="flex gap-1 mb-4">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              i === 0
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 py-16 text-center">
        <p className="text-sm text-gray-500">No assets imported yet.</p>
        <p className="text-xs text-gray-600 mt-1">Click &ldquo;Import Media&rdquo; to add video, audio, or caption files.</p>
      </div>
    </div>
  )
}
