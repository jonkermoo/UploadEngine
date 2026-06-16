const TABS = ['All', 'Pending', 'Running', 'Completed', 'Failed']

export default function Jobs() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Jobs</h1>
        <p className="text-sm text-gray-400 mt-0.5">Render and upload job queue</p>
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

      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="grid grid-cols-5 px-4 py-2 border-b border-gray-700 text-xs text-gray-500 font-medium">
          <span className="col-span-2">Project</span>
          <span>Type</span>
          <span>Status</span>
          <span>Created</span>
        </div>
        <div className="px-4 py-10 text-center text-sm text-gray-500">No jobs yet</div>
      </div>
    </div>
  )
}
