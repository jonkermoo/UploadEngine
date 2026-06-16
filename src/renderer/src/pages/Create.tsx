const STEPS = [
  'Platform & Account',
  'Layout & Format',
  'Content Template',
  'Media Assets',
  'Editing Options',
  'Metadata',
  'Render & Upload',
]

export default function Create() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Create</h1>
        <p className="text-sm text-gray-400 mt-0.5">Generate and upload a new video</p>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <ol className="flex items-center gap-0 mb-8">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center text-xs text-gray-400">
                  {i + 1}
                </div>
                <span className="text-xs text-gray-500 mt-1 whitespace-nowrap hidden lg:block">{step}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-8 h-px bg-gray-700 mx-1 mb-4 lg:mb-0" />
              )}
            </li>
          ))}
        </ol>

        <div className="text-center py-8 text-sm text-gray-500">
          Create workflow coming in Phase 6.
        </div>
      </div>
    </div>
  )
}
