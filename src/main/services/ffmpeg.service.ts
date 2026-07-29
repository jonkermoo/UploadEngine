import { spawn, ChildProcess } from 'child_process'
import { mkdirSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { getDatabase } from '../db/database'

// ─── Types ────────────────────────────────────────────────────────────────────

// Shape of the config_json column on the projects table for Ambient Loop projects.
// Written by Create.tsx and read here to drive the FFmpeg command.
interface AmbientLoopConfig {
  template_type:       'ambient_loop'
  background_video_id: number
  audio_id:            number | null
  duration_seconds:    number
  music_volume:        number   // 0.0–1.0 (already converted from % in Create.tsx)
  fade_in_seconds:     number
  fade_out_seconds:    number
}

interface RenderPreset {
  width:         number
  height:        number
  fps:           number
  video_bitrate: string   // e.g. "8000k"
  audio_bitrate: string   // e.g. "192k"
}

// ─── In-memory process registry ───────────────────────────────────────────────

// Keeps a reference to every running FFmpeg process so we can SIGTERM it on cancel.
// Keyed by job_id. Cleared when the process exits.
const activeRenders = new Map<number, ChildProcess>()

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Update arbitrary columns on a job row using named parameters.
// Using named params (@key) instead of positional ? because the set of columns
// is dynamic — we don't always update the same fields on every call.
function updateJob(jobId: number, fields: Record<string, unknown>): void {
  const setClauses = Object.keys(fields).map((k) => `${k} = @${k}`).join(', ')
  getDatabase()
    .prepare(`UPDATE jobs SET ${setClauses} WHERE id = @id`)
    .run({ ...fields, id: jobId })
}

// Append a chunk of text to the logs column on a job row.
// Using string concatenation in SQLite rather than loading, modifying, and re-saving
// in Node is faster and avoids a read-modify-write race if two events fire close together.
function appendLog(jobId: number, text: string): void {
  getDatabase()
    .prepare(`UPDATE jobs SET logs = COALESCE(logs, '') || ? WHERE id = ?`)
    .run(text, jobId)
}

// Parse "HH:MM:SS.cc" from an FFmpeg stderr progress line into total seconds.
// We use this to compute how far through the render we are.
function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':')
  if (parts.length !== 3) return 0
  return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2])
}

// ─── FFmpeg args builder ───────────────────────────────────────────────────────

// Translates the project settings into an FFmpeg args array.
// We NEVER build a shell string — args are always a typed array passed directly
// to spawn(), so spaces and special characters in file paths cannot break the command
// or inject additional flags.
function buildAmbientLoopArgs(
  outputPath:  string,
  config:      AmbientLoopConfig,
  preset:      RenderPreset,
  bgVideoPath: string,
  musicPath:   string | null,
): string[] {
  const args: string[] = []

  // -stream_loop -1 on an input means FFmpeg loops it indefinitely.
  // We add the actual duration limit with -t below, so the render always stops on time.
  args.push('-stream_loop', '-1', '-i', bgVideoPath)

  if (musicPath) {
    args.push('-stream_loop', '-1', '-i', musicPath)
  }

  // Hard cut — FFmpeg stops encoding after this many seconds regardless of input length.
  // This is what turns the infinite loop into a finite output file.
  args.push('-t', String(config.duration_seconds))

  // Video filter chain:
  //   scale=W:H:force_original_aspect_ratio=increase — scale up until both dimensions
  //     are at least as large as the target. This may overshoot one axis.
  //   crop=W:H — center-crop to the exact target dimensions after scaling.
  //   fps=N — enforce the preset frame rate on the output.
  const vf = [
    `scale=${preset.width}:${preset.height}:force_original_aspect_ratio=increase`,
    `crop=${preset.width}:${preset.height}`,
    `fps=${preset.fps}`,
  ].join(',')
  args.push('-vf', vf)

  if (musicPath) {
    // Audio filter chain:
    //   volume=N — scale audio amplitude (0.0 = silent, 1.0 = original)
    //   afade=t=in:st=0:d=N — linear fade-in from silence over N seconds at the start
    //   afade=t=out:st=X:d=N — linear fade-out to silence starting at X seconds from the start
    //     X = total_duration - fade_out_seconds so the fade ends exactly at the clip boundary
    const fadeOutStart = Math.max(0, config.duration_seconds - config.fade_out_seconds)
    const af = [
      `volume=${config.music_volume}`,
      `afade=t=in:st=0:d=${config.fade_in_seconds}`,
      `afade=t=out:st=${fadeOutStart}:d=${config.fade_out_seconds}`,
    ].join(',')
    args.push('-af', af)
  } else {
    // No audio input at all — tell FFmpeg to omit the audio stream entirely.
    // Without -an, FFmpeg would error because it can't find an audio source to encode.
    args.push('-an')
  }

  // H.264 video codec — universally supported on YouTube and all players.
  args.push('-c:v', 'libx264')

  // medium preset: good balance of encoding speed vs. output file size.
  // For a long ambient render this may take several minutes. Faster presets
  // (fast, ultrafast) encode quicker but produce larger files at the same quality.
  args.push('-preset', 'medium')

  // CRF 23 is x264's default visual quality target.
  // Lower = better quality + larger file. 18–28 is the useful range.
  args.push('-crf', '23')
  args.push('-b:v', preset.video_bitrate)

  if (musicPath) {
    args.push('-c:a', 'aac')
    args.push('-b:a', preset.audio_bitrate)
  }

  // movflags +faststart moves the MP4 moov atom (metadata/index) to the beginning
  // of the file. This is required for progressive streaming — without it, the entire
  // file must be downloaded before a player can start. YouTube expects this.
  args.push('-movflags', '+faststart')

  // -y: overwrite the output file if it already exists. Safe here because we generate
  // unique paths per job ID, so we only ever overwrite a previous failed attempt.
  args.push('-y', outputPath)

  return args
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Create a render job record in SQLite for a project and return the new job ID.
// The job is created with status 'pending'. Call startRender() to actually run it.
export function createRenderJob(projectId: number): number {
  const db = getDatabase()
  const result = db
    .prepare(`
      INSERT INTO jobs (project_id, job_type, status, progress)
      VALUES (?, 'render', 'pending', 0)
    `)
    .run(projectId)
  return result.lastInsertRowid as number
}

// Kick off FFmpeg for a pending render job.
// This function returns immediately — rendering happens in the background via the
// spawned child process. Progress and status are written back to SQLite in real-time.
export function startRender(jobId: number): void {
  const db = getDatabase()

  // Load job + project + render preset in one query to avoid multiple round-trips.
  const row = db
    .prepare(`
      SELECT j.id as job_id, j.project_id,
             p.config_json, p.account_id,
             rp.width, rp.height, rp.fps, rp.video_bitrate, rp.audio_bitrate
      FROM jobs j
      JOIN projects p ON j.project_id = p.id
      JOIN render_presets rp ON p.render_preset_id = rp.id
      WHERE j.id = ?
    `)
    .get(jobId) as {
      job_id:        number
      project_id:    number
      config_json:   string
      width:         number
      height:        number
      fps:           number
      video_bitrate: string
      audio_bitrate: string
    } | undefined

  if (!row) {
    throw new Error(`Job ${jobId} not found`)
  }

  const config = JSON.parse(row.config_json) as AmbientLoopConfig
  const preset: RenderPreset = {
    width:         row.width,
    height:        row.height,
    fps:           row.fps,
    video_bitrate: row.video_bitrate,
    audio_bitrate: row.audio_bitrate,
  }

  // Look up the actual file paths for the selected assets.
  // We store asset IDs in config_json (not paths) so the project stays valid even
  // if the user moves files and re-imports them with a new path.
  const bgVideo = db
    .prepare(`SELECT local_path FROM assets WHERE id = ?`)
    .get(config.background_video_id) as { local_path: string } | undefined

  if (!bgVideo) {
    updateJob(jobId, { status: 'failed', error_message: `Background video asset ${config.background_video_id} not found in library` })
    return
  }

  const music = config.audio_id
    ? (db.prepare(`SELECT local_path FROM assets WHERE id = ?`).get(config.audio_id) as { local_path: string } | undefined)
    : null

  // Read FFmpeg binary path from settings. Empty string means "use system PATH".
  const ffmpegSetting = db
    .prepare(`SELECT value FROM app_settings WHERE key = 'ffmpeg_path'`)
    .get() as { value: string } | undefined
  const ffmpegPath = ffmpegSetting?.value || 'ffmpeg'

  // Create the output directory if it doesn't exist yet.
  // Using recursive: true means this is a no-op if the directory already exists.
  const tempDir = join(app.getPath('userData'), 'temp', 'renders')
  mkdirSync(tempDir, { recursive: true })

  // Unique output filename per job so retries don't overwrite each other until
  // the -y flag explicitly allows it (which only happens for the exact same path).
  const outputPath = join(tempDir, `job_${jobId}.mp4`)

  const args = buildAmbientLoopArgs(
    outputPath,
    config,
    preset,
    bgVideo.local_path,
    music?.local_path ?? null,
  )

  // Transition job to 'running' and record where the output will be written.
  updateJob(jobId, {
    status:     'running',
    started_at: new Date().toISOString(),
    output_path: outputPath,
    progress:   0,
  })

  // Also update the parent project so the Create page / Dashboard can reflect
  // that this project is now being rendered.
  db.prepare(`UPDATE projects SET status = 'rendering' WHERE id = ?`).run(row.project_id)

  const proc = spawn(ffmpegPath, args)
  activeRenders.set(jobId, proc)

  // Throttle SQLite progress writes to once per second.
  // FFmpeg can emit dozens of stderr lines per second; writing each one would
  // create unnecessary DB churn without any perceptible benefit to the UI.
  let lastProgressWrite = 0

  // FFmpeg writes all of its output (progress, warnings, errors) to stderr.
  // stdout is used only for piped output formats (not MP4), so we ignore it.
  proc.stderr.on('data', (chunk: Buffer) => {
    const text = chunk.toString()
    appendLog(jobId, text)

    const now = Date.now()
    const timeMatch = text.match(/time=(\d{2}:\d{2}:\d{2}\.\d+)/)
    if (timeMatch && now - lastProgressWrite >= 1000) {
      lastProgressWrite = now
      const elapsed  = parseTimeToSeconds(timeMatch[1])
      const progress = Math.min(elapsed / config.duration_seconds, 1.0)
      updateJob(jobId, { progress })
    }
  })

  proc.on('error', (err) => {
    // This fires if the binary doesn't exist or can't be launched —
    // distinct from FFmpeg successfully launching but failing mid-render.
    activeRenders.delete(jobId)
    updateJob(jobId, {
      status:        'failed',
      finished_at:   new Date().toISOString(),
      error_message: `Failed to launch FFmpeg: ${err.message}. Check the FFmpeg path in Settings.`,
    })
    db.prepare(`UPDATE projects SET status = 'failed' WHERE id = ?`).run(row.project_id)
  })

  proc.on('close', (code) => {
    activeRenders.delete(jobId)
    const finishedAt = new Date().toISOString()

    if (code === 0) {
      updateJob(jobId, { status: 'completed', progress: 1.0, finished_at: finishedAt })
      db.prepare(`UPDATE projects SET status = 'rendered' WHERE id = ?`).run(row.project_id)
    } else if (code !== null) {
      // null exit code means the process was killed (e.g. by cancelRender) — handled separately.
      updateJob(jobId, {
        status:        'failed',
        finished_at:   finishedAt,
        error_message: `FFmpeg exited with code ${code}`,
      })
      db.prepare(`UPDATE projects SET status = 'failed' WHERE id = ?`).run(row.project_id)
    }
  })
}

// Send SIGTERM to a running render. The close handler above sets status = 'cancelled'
// when the process exits cleanly after the signal. We set it here immediately so
// the UI reflects the cancellation without waiting for the process to die.
export function cancelRender(jobId: number): void {
  const proc = activeRenders.get(jobId)
  if (!proc) return

  proc.kill('SIGTERM')
  activeRenders.delete(jobId)

  updateJob(jobId, {
    status:        'cancelled',
    finished_at:   new Date().toISOString(),
    error_message: 'Cancelled by user',
  })

  // Update project status so it's clear the render didn't finish.
  const db = getDatabase()
  const job = db.prepare(`SELECT project_id FROM jobs WHERE id = ?`).get(jobId) as { project_id: number } | undefined
  if (job) {
    db.prepare(`UPDATE projects SET status = 'draft' WHERE id = ?`).run(job.project_id)
  }
}

// Delete the temporary output MP4 for a job.
// Called after a successful upload (Phase 9) or manually by the user from the Jobs page.
// We check existence first — the file may have already been cleaned up on a previous attempt.
export function deleteTempFile(jobId: number): void {
  const db = getDatabase()
  const job = db
    .prepare(`SELECT output_path FROM jobs WHERE id = ?`)
    .get(jobId) as { output_path: string | null } | undefined

  if (job?.output_path && existsSync(job.output_path)) {
    unlinkSync(job.output_path)
  }

  // Clear the path from the DB so the UI no longer shows a delete button for this job.
  db.prepare(`UPDATE jobs SET output_path = NULL WHERE id = ?`).run(jobId)
}
