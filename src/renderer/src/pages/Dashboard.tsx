const STAT_CARDS = [
  { label: 'Connected Accounts', value: '0' },
  { label: 'Jobs Pending', value: '0' },
  { label: 'Uploads Today', value: '0' },
  { label: 'Uploads This Week', value: '0' },
]

export default function Dashboard() {
  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Overview of your content operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((card) => (
          <div key={card.label} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-xs text-gray-400 mb-1">{card.label}</p>
            <p className="text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="text-sm font-medium text-white">Recent Jobs</h2>
          </div>
          <div className="px-4 py-8 text-center text-sm text-gray-500">No jobs yet</div>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="text-sm font-medium text-white">Recent Uploads</h2>
          </div>
          <div className="px-4 py-8 text-center text-sm text-gray-500">No uploads yet</div>
        </div>
      </div>
    </div>
  )
}
