import { Plus } from 'lucide-react'

export default function Accounts() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Accounts</h1>
          <p className="text-sm text-gray-400 mt-0.5">Connect and manage your YouTube channels</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition-colors">
          <Plus size={14} />
          Connect Account
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-medium text-white">Connected Accounts</h2>
        </div>
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-gray-500">No accounts connected yet.</p>
          <p className="text-xs text-gray-600 mt-1">Click &ldquo;Connect Account&rdquo; to link a YouTube channel.</p>
        </div>
      </div>
    </div>
  )
}
