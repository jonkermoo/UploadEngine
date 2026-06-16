import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, Trash2, Film, Music, Captions, Image, FileQuestion } from 'lucide-react'
import { api } from '../api'

interface Asset {
  id: number
  type: string
  name: string
  local_path: string
  duration_seconds: number | null
  width: number | null
  height: number | null
  fps: number | null
  created_at: string
}

// `as const` makes TABS a readonly tuple of literal types rather than a plain string[].
// This lets us derive the `Tab` union type from it directly below.
const TABS = ['All', 'Video', 'Audio', 'Captions', 'Thumbnails'] as const
type Tab = typeof TABS[number] // = 'All' | 'Video' | 'Audio' | 'Captions' | 'Thumbnails'

// Maps each tab label to the `type` value stored in the assets table.
// null means "no filter" — the query returns all asset types.
const TAB_TYPE_MAP: Record<Tab, string | null> = {
  All:        null,
  Video:      'video_background',
  Audio:      'audio_music',
  Captions:   'caption_file',
  Thumbnails: 'thumbnail',
}

const TYPE_LABELS: Record<string, string> = {
  video_background: 'Video',
  audio_music:      'Audio',
  caption_file:     'Caption',
  thumbnail:        'Thumbnail',
  other:            'Other',
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  video_background: Film,
  audio_music:      Music,
  caption_file:     Captions,
  thumbnail:        Image,
  other:            FileQuestion,
}

// Converts raw seconds into H:MM:SS or M:SS display format.
function formatDuration(secs: number | null): string {
  if (!secs) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function PreviewPanel({ asset, onClose, onDelete }: {
  asset: Asset
  onClose: () => void
  onDelete: (asset: Asset) => void
}) {
  // Electron can load local files in the renderer using file:// URLs.
  // The path comes from SQLite and is the absolute path the user originally selected.
  const fileUrl = `file://${asset.local_path}`
  const isVideo = asset.type === 'video_background'
  const isAudio = asset.type === 'audio_music'
  const isImage = asset.type === 'thumbnail'

  return (
    <div className="w-72 shrink-0 bg-gray-800 border-l border-gray-700 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <span className="text-sm font-medium text-white truncate">{asset.name}</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none ml-2">×</button>
      </div>

      <div className="p-3 border-b border-gray-700">
        {isVideo && (
          <video src={fileUrl} controls className="w-full rounded bg-black aspect-video" />
        )}
        {isAudio && (
          <div className="bg-gray-900 rounded p-4 flex flex-col items-center gap-3">
            <Music size={32} className="text-gray-500" />
            <audio src={fileUrl} controls className="w-full" />
          </div>
        )}
        {isImage && (
          <img src={fileUrl} alt={asset.name} className="w-full rounded object-contain max-h-40" />
        )}
        {/* Caption files and unsupported types show a generic icon — no preview possible. */}
        {!isVideo && !isAudio && !isImage && (
          <div className="bg-gray-900 rounded p-6 flex items-center justify-center">
            <FileQuestion size={32} className="text-gray-600" />
          </div>
        )}
      </div>

      <div className="px-4 py-3 space-y-2 text-xs flex-1">
        <Row label="Type"     value={TYPE_LABELS[asset.type] ?? asset.type} />
        <Row label="Duration" value={formatDuration(asset.duration_seconds)} />
        {/* Only show resolution if FFprobe was able to extract it. */}
        {asset.width && asset.height && (
          <Row label="Resolution" value={`${asset.width}×${asset.height}`} />
        )}
        {asset.fps && (
          <Row label="FPS" value={String(asset.fps)} />
        )}
        <Row label="Imported" value={formatDate(asset.created_at)} />
        <div>
          <span className="text-gray-500 block mb-0.5">Path</span>
          <span className="text-gray-400 break-all">{asset.local_path}</span>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-gray-700">
        <button
          onClick={() => onDelete(asset)}
          className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          <Trash2 size={13} />
          Remove from library
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 text-right">{value}</span>
    </div>
  )
}

export default function MediaLibrary() {
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [selected, setSelected]   = useState<Asset | null>(null)
  const [importing, setImporting] = useState(false)

  // useQueryClient gives access to the shared cache so we can invalidate stale queries
  // after importing or deleting — telling TanStack Query to refetch the asset list.
  const queryClient = useQueryClient()

  const typeFilter = TAB_TYPE_MAP[activeTab]

  // The query key includes typeFilter so switching tabs triggers a separate cached fetch
  // per tab — TanStack Query treats ['assets', null] and ['assets', 'video_background']
  // as different entries in its cache.
  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['assets', typeFilter],
    queryFn: () => api.assets.list(typeFilter ?? undefined) as Promise<Asset[]>,
  })

  async function handleImport() {
    setImporting(true)
    try {
      const paths = await api.dialog.openFiles() // opens native OS file picker
      if (paths.length === 0) return             // user cancelled
      await api.dialog.importFiles(paths)        // detect type + FFprobe + save to SQLite

      // Invalidate every query whose key starts with 'assets' so all tabs refresh.
      // This is why the query key uses an array — partial key matching works on arrays.
      await queryClient.invalidateQueries({ queryKey: ['assets'] })
    } finally {
      setImporting(false)
    }
  }

  async function handleDelete(asset: Asset) {
    // Show a native OS confirmation dialog before deleting.
    const confirmed = await api.dialog.confirm(
      `Remove "${asset.name}" from the library?\n\nThe original file will not be deleted.`
    )
    if (!confirmed) return

    await api.assets.delete(asset.id)
    await queryClient.invalidateQueries({ queryKey: ['assets'] })

    // Close the preview panel if the deleted asset was the one being previewed.
    if (selected?.id === asset.id) setSelected(null)
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0 p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-white">Media Library</h1>
            <p className="text-sm text-gray-400 mt-0.5">Import and manage your local media assets</p>
          </div>
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
          >
            <Upload size={14} />
            {importing ? 'Importing…' : 'Import Media'}
          </button>
        </div>

        <div className="flex gap-1 mb-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                activeTab === tab ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 flex-1 overflow-hidden flex flex-col">
          {/* grid-cols-[2fr_1fr_1fr_1fr_auto] — Name column is twice as wide as the others,
              and the delete button column is sized to its content. */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] px-4 py-2 border-b border-gray-700 text-xs text-gray-500 font-medium">
            <span>Name</span>
            <span>Type</span>
            <span>Duration</span>
            <span>Imported</span>
            <span />
          </div>

          {isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500">Loading…</div>
          ) : assets.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-gray-500">No assets yet.</p>
              <p className="text-xs text-gray-600 mt-1">Click &ldquo;Import Media&rdquo; to add files.</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {assets.map((asset) => {
                const Icon     = TYPE_ICONS[asset.type] ?? FileQuestion
                const isActive = selected?.id === asset.id
                return (
                  <div
                    key={asset.id}
                    // Toggle: clicking the already-selected row closes the preview panel.
                    onClick={() => setSelected(isActive ? null : asset)}
                    className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center px-4 py-2.5 border-b border-gray-700/50 last:border-0 cursor-pointer transition-colors ${
                      isActive ? 'bg-gray-700' : 'hover:bg-gray-700/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={14} className="text-gray-500 shrink-0" />
                      <span className="text-sm text-gray-200 truncate">{asset.name}</span>
                    </div>
                    <span className="text-sm text-gray-400">{TYPE_LABELS[asset.type] ?? asset.type}</span>
                    <span className="text-sm text-gray-400">{formatDuration(asset.duration_seconds)}</span>
                    <span className="text-xs text-gray-500">{formatDate(asset.created_at)}</span>
                    <button
                      // e.stopPropagation() prevents the row's onClick from firing too,
                      // which would try to toggle the preview of an asset being deleted.
                      onClick={(e) => { e.stopPropagation(); handleDelete(asset) }}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Preview panel only renders when an asset is selected — it's not hidden, it's unmounted. */}
      {selected && (
        <PreviewPanel
          asset={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
