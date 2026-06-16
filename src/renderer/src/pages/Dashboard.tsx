import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { AlertTriangle, Users, Clock, Upload, TrendingUp } from 'lucide-react'
import { api } from '../api'

// `Awaited<ReturnType<...>>` extracts the resolved type of a Promise-returning function.
// This keeps the type in sync with the API automatically — no manual duplication.
type Summary   = Awaited<ReturnType<typeof api.dashboard.getSummary>>
type Job       = { id: number; project_title: string; job_type: string; status: string; created_at: string }
type UploadRow = { id: number; project_title: string; account_name: string; privacy_status: string; uploaded_at: string }

// Tailwind classes for each job status badge. The `??` fallback handles any unexpected statuses.
const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-900/40 text-yellow-400',
  running:   'bg-blue-900/40 text-blue-400',
  completed: 'bg-green-900/40 text-green-400',
  failed:    'bg-red-900/40 text-red-400',
  cancelled: 'bg-gray-700 text-gray-400',
}

function StatCard({ label, value, icon: Icon, accent }: {
  label: string; value: number; icon: React.ElementType; accent: string
}) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex items-start gap-3">
      <div className={`p-2 rounded-md ${accent}`}>
        <Icon size={15} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-2xl font-semibold text-white mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status] ?? 'bg-gray-700 text-gray-400'}`}>
      {status}
    </span>
  )
}

function formatDate(iso: string) {
  // `undefined` as the locale uses the user's system locale automatically.
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Builds an array of { date, uploads } for each of the last 7 days.
// Loops from 6 days ago to today and counts how many uploads fall on each date.
// The uploaded_at column is stored as an ISO string ("2025-06-01T14:23:00"), so
// slicing the first 10 characters gives "2025-06-01" for a simple date comparison.
function buildChartData(uploads: UploadRow[]) {
  const days: { date: string; uploads: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const label   = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const dateStr = d.toISOString().slice(0, 10) // "YYYY-MM-DD"
    const count   = uploads.filter((u) => u.uploaded_at.startsWith(dateStr)).length
    days.push({ date: label, uploads: count })
  }
  return days
}

export default function Dashboard() {
  // useQuery fetches data asynchronously and caches it under the key 'dashboard:summary'.
  // If the same key is already in the cache and still fresh, no network/IPC call is made.
  const { data, isLoading, isError } = useQuery<Summary>({
    queryKey: ['dashboard:summary'],
    queryFn: () => api.dashboard.getSummary(),
  })

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">Loading dashboard…</div>
  }

  if (isError || !data) {
    return <div className="p-6 text-sm text-red-400">Failed to load dashboard data.</div>
  }

  // Cast from `unknown[]` to concrete types — the IPC layer returns untyped data.
  const jobs      = data.recentJobs    as Job[]
  const uploads   = data.recentUploads as UploadRow[]
  const chartData = buildChartData(uploads)

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Overview of your content operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Connected Accounts" value={data.accountCount} icon={Users}      accent="bg-blue-900/50 text-blue-400" />
        <StatCard label="Jobs Pending"        value={data.pendingJobs}  icon={Clock}      accent="bg-yellow-900/50 text-yellow-400" />
        <StatCard label="Uploads Today"       value={data.uploadsToday} icon={Upload}     accent="bg-green-900/50 text-green-400" />
        <StatCard label="Uploads This Week"   value={data.uploadsWeek}  icon={TrendingUp} accent="bg-purple-900/50 text-purple-400" />
      </div>

      {/* Only render the alert banner when there are actually failed jobs. */}
      {data.failedJobs > 0 && (
        <div className="flex items-center gap-3 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
          <AlertTriangle size={15} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            {data.failedJobs} job{data.failedJobs > 1 ? 's' : ''} failed.{' '}
            {/* href="#/jobs" works with HashRouter — the # keeps it client-side. */}
            <a href="#/jobs" className="underline hover:text-red-200">View in Jobs</a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="text-sm font-medium text-white">Recent Jobs</h2>
          </div>
          {jobs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No jobs yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-700">
                  <th className="px-4 py-2 text-left font-medium">Project</th>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-gray-700/50 last:border-0">
                    <td className="px-4 py-2.5 text-gray-300 truncate max-w-[140px]">{job.project_title}</td>
                    <td className="px-4 py-2.5 text-gray-400 capitalize">{job.job_type}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={job.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="text-sm font-medium text-white">Recent Uploads</h2>
          </div>
          {uploads.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No uploads yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-700">
                  <th className="px-4 py-2 text-left font-medium">Title</th>
                  <th className="px-4 py-2 text-left font-medium">Account</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => (
                  <tr key={u.id} className="border-b border-gray-700/50 last:border-0">
                    <td className="px-4 py-2.5 text-gray-300 truncate max-w-[140px]">{u.project_title}</td>
                    <td className="px-4 py-2.5 text-gray-400">{u.account_name}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{formatDate(u.uploaded_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-medium text-white">Uploads — Last 7 Days</h2>
        </div>
        <div className="px-4 py-4 h-48">
          {/* ResponsiveContainer makes the chart fill its parent's width automatically. */}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              {/* allowDecimals={false} prevents the Y axis from showing 0.5, 1.5, etc. for upload counts. */}
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={24} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 12 }}
                labelStyle={{ color: '#e5e7eb' }}
                itemStyle={{ color: '#60a5fa' }}
              />
              {/* radius={[3,3,0,0]} rounds the top corners of each bar only. */}
              <Bar dataKey="uploads" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
