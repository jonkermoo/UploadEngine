import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, X, Trash2, RotateCcw, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import { api } from '../api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Job {
  id:            number
  project_id:    number
  project_title: string
  job_type:      string
  status:        'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress:      number    // 0.0–1.0
  output_path:   string | null
  error_message: string | null
  logs:          string | null
  retry_count:   number
  started_at:    string | null
  finished_at:   string | null
  created_at:    string
}

// ─── Status badge ──────────────────────────────────────────────────────────────

// Maps job status to a colored pill. These colours mirror the Dashboard StatusBadge.
const STATUS_STYLES: Record<Job['status'], string> = {
  pending:   'bg-yellow-900/40 text-yellow-400',
  running:   'bg-blue-900/40   text-blue-400',
  completed: 'bg-green-900/40  text-green-400',
  failed:    'bg-red-900/40    text-red-400',
  cancelled: 'bg-gray-700      text-gray-400',
}

function StatusBadge({ status }: { status: Job['status'] }) {
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}

// ─── Progress bar ──────────────────────────────────────────────────────────────

// Only rendered for running jobs. progress is a 0.0–1.0 fraction from FFmpeg stderr.
function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.round(progress * 100)
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">Rendering…</span>
        <span className="text-xs text-blue-400 font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Job row ───────────────────────────────────────────────────────────────────

function JobRow({ job, onAction }: { job: Job; onAction: () => void }) {
  const [logsOpen, setLogsOpen] = useState(false)

  // Determine which action buttons are relevant for this job's current state.
  // We only show buttons that make sense: cancel only when running, retry only when
  // failed/cancelled, delete-temp only when a rendered file still exists on disk.
  const canCancel    = job.status === 'running' || job.status === 'pending'
  const canRetry     = job.status === 'failed' || job.status === 'cancelled'
  const canDeleteTemp = (job.status === 'completed' || job.status === 'failed') && !!job.output_path

  async function handleCancel() {
    await api.jobs.cancel(job.id)
    onAction()
  }

  async function handleRetry() {
    await api.jobs.retry(job.id)
    onAction()
  }

  async function handleDeleteTemp() {
    await api.jobs.deleteTemp(job.id)
    onAction()
  }

  const createdDate = new Date(job.created_at).toLocaleString()

  return (
    <div className="border-b border-gray-700 last:border-0">
      <div className="px-4 py-3">
        {/* Main row */}
        <div className="flex items-center gap-3">
          {/* Expand/collapse logs toggle */}
          <button
            onClick={() => setLogsOpen((o) => !o)}
            className="text-gray-500 hover:text-gray-300 shrink-0"
            title="Show logs"
          >
            {logsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Project title + metadata */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{job.project_title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{job.job_type} · created {createdDate}</p>
          </div>

          {/* Status */}
          <div className="shrink-0">
            <StatusBadge status={job.status} />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {canCancel && (
              <button
                onClick={handleCancel}
                title="Cancel render"
                className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
              >
                <X size={14} />
              </button>
            )}
            {canRetry && (
              <button
                onClick={handleRetry}
                title="Retry render"
                className="p-1.5 rounded text-gray-400 hover:text-blue-400 hover:bg-gray-700 transition-colors"
              >
                <RotateCcw size={14} />
              </button>
            )}
            {canDeleteTemp && (
              <button
                onClick={handleDeleteTemp}
                title="Delete temp file"
                className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar — only visible while the job is running */}
        {job.status === 'running' && <ProgressBar progress={job.progress} />}

        {/* Error summary inline — full logs are in the expanded panel */}
        {job.status === 'failed' && job.error_message && (
          <div className="flex items-start gap-2 mt-2 text-xs text-red-400">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span className="break-all">{job.error_message}</span>
          </div>
        )}
      </div>

      {/* Expandable logs panel — shows raw FFmpeg stderr output */}
      {logsOpen && (
        <div className="px-4 pb-3">
          <div className="bg-gray-900 rounded border border-gray-700 p-3 max-h-48 overflow-y-auto">
            {job.logs ? (
              <pre className="text-xs text-gray-400 whitespace-pre-wrap break-all font-mono">
                {job.logs}
              </pre>
            ) : (
              <p className="text-xs text-gray-600 italic">No logs yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Jobs page ────────────────────────────────────────────────────────────

const TABS = ['All', 'Pending', 'Running', 'Completed', 'Failed', 'Cancelled'] as const
type Tab = typeof TABS[number]

// Map tab label to the status string expected by the IPC handler.
// 'All' passes undefined so the handler returns all rows.
const TAB_STATUS: Record<Tab, string | undefined> = {
  All:       undefined,
  Pending:   'pending',
  Running:   'running',
  Completed: 'completed',
  Failed:    'failed',
  Cancelled: 'cancelled',
}

export default function Jobs() {
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const queryClient = useQueryClient()

  // Poll every 2 seconds while the page is focused so running job progress updates
  // appear in near-real-time without requiring a WebSocket or push channel.
  // TanStack Query pauses refetching when the window is hidden, so there's no
  // background polling overhead when the user switches apps.
  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ['jobs', activeTab],
    queryFn: () => api.jobs.list(TAB_STATUS[activeTab]) as Promise<Job[]>,
    refetchInterval: 2000,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['jobs'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard:summary'] })
  }

  const runningCount = jobs.filter((j) => j.status === 'running').length

  return (
    <div className="p-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-white">Jobs</h1>
          <p className="text-sm text-gray-400 mt-0.5">Render and upload job queue</p>
        </div>
        {/* Live indicator — pulsing dot while any job is running */}
        {runningCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
            {runningCount} rendering
          </div>
        )}
      </div>

      {/* Tab filter */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              activeTab === tab
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
        {/* Manual refresh — useful if the user wants an immediate update */}
        <button
          onClick={invalidate}
          className="ml-auto p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Job list */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        {isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500">Loading…</div>
        ) : jobs.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-gray-500">No jobs found.</p>
            <p className="text-xs text-gray-600 mt-1">
              Create a project in the Create page, then click Start Render.
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <JobRow key={job.id} job={job} onAction={invalidate} />
          ))
        )}
      </div>

    </div>
  )
}
