export default function Uploads() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Uploads</h1>
        <p className="text-sm text-gray-400 mt-0.5">Videos successfully uploaded to YouTube</p>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="grid grid-cols-5 px-4 py-2 border-b border-gray-700 text-xs text-gray-500 font-medium">
          <span className="col-span-2">Title</span>
          <span>Account</span>
          <span>Privacy</span>
          <span>Date</span>
        </div>
        <div className="px-4 py-10 text-center text-sm text-gray-500">No uploads yet</div>
      </div>
    </div>
  )
}
