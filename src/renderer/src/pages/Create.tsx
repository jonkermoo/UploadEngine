import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ChevronRight, Play } from 'lucide-react'
import { api } from '../api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Account      { id: number; account_name: string; external_account_id: string; platform_name: string }
interface RenderPreset { id: number; name: string; aspect_ratio: string; width: number; height: number; fps: number; video_bitrate: string; audio_bitrate: string }
interface Template     { id: number; name: string; template_type: string; description: string }
interface Asset        { id: number; name: string; type: string; duration_seconds: number | null }

// Everything the user has configured across all 7 steps.
// This gets serialised into the projects table when saved.
interface ProjectDraft {
  accountId:         number | null
  renderPresetId:    number | null
  templateId:        number | null
  backgroundVideoId: number | null
  audioId:           number | null
  // Editing options — defaults match the Ambient Loop FFmpeg pipeline in Phase 7
  durationMinutes:   number   // stored as minutes for readability; converted to seconds on save
  musicVolume:       number   // 0–100, converted to 0.0–1.0 on save
  fadeInSeconds:     number
  fadeOutSeconds:    number
  // YouTube metadata
  title:             string
  description:       string
  tags:              string   // comma-separated, split into array on save
  privacyStatus:     'private' | 'unlisted' | 'public'
  scheduledFor:      string   // ISO datetime string or empty
}

const INITIAL_DRAFT: ProjectDraft = {
  accountId: null, renderPresetId: null, templateId: null,
  backgroundVideoId: null, audioId: null,
  durationMinutes: 60, musicVolume: 80, fadeInSeconds: 3, fadeOutSeconds: 5,
  privacyStatus: 'private', title: '', description: '', tags: '', scheduledFor: '',
}

// ─── Step metadata ─────────────────────────────────────────────────────────────

const STEP_LABELS = [
  'Account',
  'Layout',
  'Template',
  'Background Video',
  'Music',
  'Editing',
  'Metadata',
]

// Controls whether the Next button is enabled for each step.
// Step index maps directly to STEP_LABELS above.
function canAdvance(step: number, draft: ProjectDraft): boolean {
  switch (step) {
    case 0: return true                           // account is optional (can upload later)
    case 1: return draft.renderPresetId !== null  // must pick a layout
    case 2: return draft.templateId !== null      // must pick a template
    case 3: return draft.backgroundVideoId !== null // Ambient Loop requires a background video
    case 4: return true                           // music is optional
    case 5: return true                           // editing options always have valid defaults
    case 6: return draft.title.trim().length > 0  // YouTube title is required
    default: return true
  }
}

// ─── Shared UI primitives ──────────────────────────────────────────────────────

// A selectable card — highlighted when active, otherwise shows a subtle hover.
function SelectCard({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`relative text-left w-full p-4 rounded-lg border transition-colors ${
        active
          ? 'border-blue-500 bg-blue-900/20'
          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
      }`}
    >
      {/* Checkmark overlay on the selected card */}
      {active && (
        <CheckCircle size={16} className="absolute top-3 right-3 text-blue-400" />
      )}
      {children}
    </button>
  )
}

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  )
}

function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="border border-dashed border-gray-700 rounded-lg py-10 text-center">
      <p className="text-sm text-gray-500">{message}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs text-gray-400 mb-1">{children}</label>
}

// ─── Step components ───────────────────────────────────────────────────────────

// Step 1 — pick the YouTube account to upload to.
// Account connection happens in Phase 8; until then this step will always show empty state.
function AccountStep({ draft, setDraft }: { draft: ProjectDraft; setDraft: React.Dispatch<React.SetStateAction<ProjectDraft>> }) {
  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => api.accounts.list() as Promise<Account[]>,
  })

  if (isLoading) return <p className="text-sm text-gray-500">Loading accounts…</p>

  return (
    <div>
      <StepHeading title="Select Account" subtitle="Choose the YouTube channel to upload to." />
      {accounts.length === 0 ? (
        <EmptyState
          message="No accounts connected yet."
          sub="Go to Accounts → Connect Account first, then come back here."
        />
      ) : (
        <div className="space-y-2">
          {accounts.map((a) => (
            <SelectCard
              key={a.id}
              active={draft.accountId === a.id}
              onClick={() => setDraft((d) => ({ ...d, accountId: a.id }))}
            >
              <p className="text-sm font-medium text-white">{a.account_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {a.platform_name} · {a.external_account_id}
              </p>
            </SelectCard>
          ))}
        </div>
      )}
    </div>
  )
}

// Step 2 — pick the output resolution/format.
// The selected preset drives the FFmpeg scale/crop filters in Phase 7.
function PresetStep({ draft, setDraft }: { draft: ProjectDraft; setDraft: React.Dispatch<React.SetStateAction<ProjectDraft>> }) {
  const { data: presets = [], isLoading } = useQuery<RenderPreset[]>({
    queryKey: ['presets'],
    queryFn: () => api.presets.list() as Promise<RenderPreset[]>,
  })

  if (isLoading) return <p className="text-sm text-gray-500">Loading presets…</p>

  return (
    <div>
      <StepHeading title="Layout & Format" subtitle="Choose the output resolution for your video." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {presets.map((p) => (
          <SelectCard
            key={p.id}
            active={draft.renderPresetId === p.id}
            onClick={() => setDraft((d) => ({ ...d, renderPresetId: p.id }))}
          >
            <p className="text-sm font-medium text-white">{p.name}</p>
            <p className="text-xs text-gray-400 mt-1">{p.width}×{p.height}</p>
            <p className="text-xs text-gray-500">{p.aspect_ratio} · {p.fps}fps</p>
          </SelectCard>
        ))}
      </div>
    </div>
  )
}

// Step 3 — pick the content template.
// Only Ambient Loop is available for the MVP; more templates are added in Phase 12.
function TemplateStep({ draft, setDraft }: { draft: ProjectDraft; setDraft: React.Dispatch<React.SetStateAction<ProjectDraft>> }) {
  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => api.templates.list() as Promise<Template[]>,
  })

  if (isLoading) return <p className="text-sm text-gray-500">Loading templates…</p>

  return (
    <div>
      <StepHeading title="Content Template" subtitle="Choose the type of video you want to generate." />
      <div className="space-y-2">
        {templates.map((t) => (
          <SelectCard
            key={t.id}
            active={draft.templateId === t.id}
            onClick={() => setDraft((d) => ({ ...d, templateId: t.id }))}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{t.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
              </div>
              <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded shrink-0">MVP</span>
            </div>
          </SelectCard>
        ))}
      </div>
    </div>
  )
}

// Step 4 — pick the background video from the media library.
// The file path is read from SQLite; Phase 7 passes it directly to FFmpeg as -i input.
function VideoStep({ draft, setDraft }: { draft: ProjectDraft; setDraft: React.Dispatch<React.SetStateAction<ProjectDraft>> }) {
  const { data: videos = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['assets', 'video_background'],
    queryFn: () => api.assets.list('video_background') as Promise<Asset[]>,
  })

  if (isLoading) return <p className="text-sm text-gray-500">Loading videos…</p>

  return (
    <div>
      <StepHeading title="Background Video" subtitle="Select the video to loop as the background." />
      {videos.length === 0 ? (
        <EmptyState
          message="No video files in your library."
          sub="Go to Media Library → Import Media and add a video first."
        />
      ) : (
        <div className="space-y-2">
          {videos.map((v) => (
            <SelectCard
              key={v.id}
              active={draft.backgroundVideoId === v.id}
              onClick={() => setDraft((d) => ({ ...d, backgroundVideoId: v.id }))}
            >
              <p className="text-sm font-medium text-white">{v.name}</p>
              {v.duration_seconds && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {Math.floor(v.duration_seconds / 60)}m {Math.floor(v.duration_seconds % 60)}s
                </p>
              )}
            </SelectCard>
          ))}
        </div>
      )}
    </div>
  )
}

// Step 5 — optionally pick background music.
// Music is mixed into the final render by FFmpeg's amix filter in Phase 7.
function AudioStep({ draft, setDraft }: { draft: ProjectDraft; setDraft: React.Dispatch<React.SetStateAction<ProjectDraft>> }) {
  const { data: tracks = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['assets', 'audio_music'],
    queryFn: () => api.assets.list('audio_music') as Promise<Asset[]>,
  })

  if (isLoading) return <p className="text-sm text-gray-500">Loading audio…</p>

  return (
    <div>
      <StepHeading title="Music & Audio" subtitle="Optionally select background music. You can skip this step." />
      {tracks.length === 0 ? (
        <EmptyState
          message="No audio files in your library."
          sub="Go to Media Library → Import Media to add audio, or skip this step."
        />
      ) : (
        <div className="space-y-2">
          {/* "None" option so the user can explicitly deselect music */}
          <SelectCard
            active={draft.audioId === null}
            onClick={() => setDraft((d) => ({ ...d, audioId: null }))}
          >
            <p className="text-sm font-medium text-gray-300">No music</p>
            <p className="text-xs text-gray-500 mt-0.5">Video only, no audio track</p>
          </SelectCard>
          {tracks.map((t) => (
            <SelectCard
              key={t.id}
              active={draft.audioId === t.id}
              onClick={() => setDraft((d) => ({ ...d, audioId: t.id }))}
            >
              <p className="text-sm font-medium text-white">{t.name}</p>
              {t.duration_seconds && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {Math.floor(t.duration_seconds / 60)}m {Math.floor(t.duration_seconds % 60)}s
                </p>
              )}
            </SelectCard>
          ))}
        </div>
      )}
    </div>
  )
}

// Step 6 — configure FFmpeg options.
// These values are stored in config_json and read by the FFmpeg service in Phase 7.
function EditingStep({ draft, setDraft }: { draft: ProjectDraft; setDraft: React.Dispatch<React.SetStateAction<ProjectDraft>> }) {
  function update<K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  return (
    <div>
      <StepHeading title="Editing Options" subtitle="Configure how FFmpeg will render the video." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div>
          <Label>Duration (minutes)</Label>
          <input
            type="number" min={1} max={720}
            value={draft.durationMinutes}
            onChange={(e) => update('durationMinutes', Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            = {(draft.durationMinutes * 60).toLocaleString()} seconds
          </p>
        </div>

        <div>
          <Label>Music Volume ({draft.musicVolume}%)</Label>
          {/* Range slider — value is 0–100, converted to 0.0–1.0 when building config_json */}
          <input
            type="range" min={0} max={100}
            value={draft.musicVolume}
            onChange={(e) => update('musicVolume', Number(e.target.value))}
            className="w-full mt-2"
          />
        </div>

        <div>
          <Label>Fade In (seconds)</Label>
          <input
            type="number" min={0} max={30}
            value={draft.fadeInSeconds}
            onChange={(e) => update('fadeInSeconds', Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
          />
        </div>

        <div>
          <Label>Fade Out (seconds)</Label>
          <input
            type="number" min={0} max={30}
            value={draft.fadeOutSeconds}
            onChange={(e) => update('fadeOutSeconds', Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
          />
        </div>

      </div>
    </div>
  )
}

// Step 7 — YouTube video metadata entered before upload.
// Stored directly on the projects row; Phase 9 reads these when calling the YouTube API.
function MetadataStep({ draft, setDraft }: { draft: ProjectDraft; setDraft: React.Dispatch<React.SetStateAction<ProjectDraft>> }) {
  function update<K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  return (
    <div>
      <StepHeading title="YouTube Metadata" subtitle="This information is sent to YouTube when the video is uploaded." />
      <div className="space-y-4">

        <div>
          <Label>Title *</Label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Enter video title"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder:text-gray-500"
          />
        </div>

        <div>
          <Label>Description</Label>
          <textarea
            value={draft.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Enter video description"
            rows={4}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder:text-gray-500 resize-none"
          />
        </div>

        <div>
          <Label>Tags (comma-separated)</Label>
          <input
            type="text"
            value={draft.tags}
            onChange={(e) => update('tags', e.target.value)}
            placeholder="lofi, ambient, study music"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder:text-gray-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Privacy Status</Label>
            <select
              value={draft.privacyStatus}
              onChange={(e) => update('privacyStatus', e.target.value as ProjectDraft['privacyStatus'])}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div>
            <Label>Scheduled Publish Time (optional)</Label>
            {/* datetime-local gives a native date+time picker. Value is an ISO-ish string. */}
            <input
              type="datetime-local"
              value={draft.scheduledFor}
              onChange={(e) => update('scheduledFor', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Main Create page ──────────────────────────────────────────────────────────

export default function Create() {
  const [step, setStep]   = useState(0)
  const [draft, setDraft] = useState<ProjectDraft>(INITIAL_DRAFT)
  const [saving, setSaving]     = useState(false)
  const [queueing, setQueueing] = useState(false)
  const [savedId, setSavedId]   = useState<number | null>(null)
  const queryClient = useQueryClient()
  const navigate    = useNavigate()

  const isLastStep = step === STEP_LABELS.length - 1

  // Serialises the wizard state into the shape expected by the projects table.
  // config_json captures everything the FFmpeg service needs in Phase 7.
  async function handleSave() {
    setSaving(true)
    try {
      const config = {
        template_type:      'ambient_loop',
        background_video_id: draft.backgroundVideoId,
        audio_id:            draft.audioId,
        duration_seconds:    draft.durationMinutes * 60,
        // Convert 0–100 percentage to 0.0–1.0 float for FFmpeg's volume filter
        music_volume:        draft.musicVolume / 100,
        fade_in_seconds:     draft.fadeInSeconds,
        fade_out_seconds:    draft.fadeOutSeconds,
      }

      const project = await api.projects.create({
        template_id:      draft.templateId!,
        account_id:       draft.accountId ?? undefined,
        render_preset_id: draft.renderPresetId!,
        title:            draft.title,
        description:      draft.description,
        // Store tags as a JSON array string so the YouTube API can use them directly
        tags_json:        JSON.stringify(draft.tags.split(',').map((t) => t.trim()).filter(Boolean)),
        privacy_status:   draft.privacyStatus,
        scheduled_for:    draft.scheduledFor || undefined,
        config_json:      JSON.stringify(config),
      }) as { id: number }

      // Invalidate the projects query so the Jobs/Dashboard pages show the new project immediately
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      setSavedId(project.id)
    } finally {
      setSaving(false)
    }
  }

  // Show a success screen after saving — the project is now in SQLite ready for rendering.
  if (savedId !== null) {
    async function handleStartRender() {
      setQueueing(true)
      try {
        await api.jobs.createRender(savedId!)
        // Invalidate both queries so Jobs and Dashboard immediately reflect the new job.
        await queryClient.invalidateQueries({ queryKey: ['jobs'] })
        await queryClient.invalidateQueries({ queryKey: ['dashboard:summary'] })
        navigate('/jobs')
      } finally {
        setQueueing(false)
      }
    }

    return (
      <div className="p-6 max-w-lg">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <CheckCircle size={40} className="text-green-400 mx-auto mb-4" />
          <h2 className="text-base font-semibold text-white mb-1">Project saved</h2>
          <p className="text-sm text-gray-400 mb-6">
            Your project is ready. Start rendering now or come back later from the Jobs page.
          </p>
          <div className="flex gap-3 justify-center">
            {/* Primary action: queue the render immediately and navigate to Jobs */}
            <button
              onClick={handleStartRender}
              disabled={queueing}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
            >
              <Play size={14} />
              {queueing ? 'Starting…' : 'Start Render'}
            </button>
            <button
              onClick={() => { setStep(0); setDraft(INITIAL_DRAFT); setSavedId(null) }}
              className="px-4 py-2 text-gray-400 hover:text-white text-sm rounded-md border border-gray-600 hover:border-gray-500 transition-colors"
            >
              Create another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl flex flex-col gap-6">

      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-white">Create</h1>
        <p className="text-sm text-gray-400 mt-0.5">Generate and upload a new video</p>
      </div>

      {/* Step indicator — shows all steps as a horizontal breadcrumb */}
      <div className="flex items-center gap-1 flex-wrap">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
              i === step
                ? 'bg-blue-600 text-white'
                : i < step
                ? 'text-green-400'
                : 'text-gray-500'
            }`}>
              {/* Show a checkmark for completed steps */}
              {i < step && <CheckCircle size={11} />}
              {i === step && <span className="font-medium">{i + 1}.</span>}
              {label}
            </div>
            {i < STEP_LABELS.length - 1 && (
              <ChevronRight size={12} className="text-gray-600 shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Step content panel */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
        {step === 0 && <AccountStep  draft={draft} setDraft={setDraft} />}
        {step === 1 && <PresetStep   draft={draft} setDraft={setDraft} />}
        {step === 2 && <TemplateStep draft={draft} setDraft={setDraft} />}
        {step === 3 && <VideoStep    draft={draft} setDraft={setDraft} />}
        {step === 4 && <AudioStep    draft={draft} setDraft={setDraft} />}
        {step === 5 && <EditingStep  draft={draft} setDraft={setDraft} />}
        {step === 6 && <MetadataStep draft={draft} setDraft={setDraft} />}
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
        >
          ← Back
        </button>

        {isLastStep ? (
          <button
            onClick={handleSave}
            disabled={saving || !canAdvance(step, draft)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
          >
            {saving ? 'Saving…' : 'Save Project'}
          </button>
        ) : (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance(step, draft)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
          >
            Next →
          </button>
        )}
      </div>

    </div>
  )
}
