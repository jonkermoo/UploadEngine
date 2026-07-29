import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'
import { createRenderJob, startRender, cancelRender, deleteTempFile } from '../services/ffmpeg.service'

export function registerJobHandlers(): void {

  // List all jobs, optionally filtered by status.
  // Returns jobs joined with their project title so the UI can show context.
  ipcMain.handle('jobs:list', (_e, status?: string) => {
    const db = getDatabase()
    if (status) {
      return db.prepare(`
        SELECT j.*, p.title as project_title
        FROM jobs j
        JOIN projects p ON j.project_id = p.id
        WHERE j.status = ?
        ORDER BY j.created_at DESC
      `).all(status)
    }
    return db.prepare(`
      SELECT j.*, p.title as project_title
      FROM jobs j
      JOIN projects p ON j.project_id = p.id
      ORDER BY j.created_at DESC
    `).all()
  })

  ipcMain.handle('jobs:get', (_e, id: number) => {
    return getDatabase().prepare(`SELECT * FROM jobs WHERE id = ?`).get(id)
  })

  // Create a render job for the given project and immediately start FFmpeg.
  // Returns the new job record so the renderer can navigate to it on the Jobs page.
  ipcMain.handle('jobs:createRender', (_e, projectId: number) => {
    const db = getDatabase()

    // Guard: don't queue a new render if one is already running for this project.
    const running = db
      .prepare(`SELECT id FROM jobs WHERE project_id = ? AND status IN ('pending','running')`)
      .get(projectId)
    if (running) {
      throw new Error('A render job for this project is already running')
    }

    const jobId = createRenderJob(projectId)

    // Start FFmpeg asynchronously — this returns immediately while the render runs
    // in the background. Progress is written back to SQLite by the FFmpeg service.
    startRender(jobId)

    // Return the full job row so the renderer can show it immediately.
    return db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(jobId)
  })

  // Retry a failed/cancelled render job by creating a fresh job for the same project.
  ipcMain.handle('jobs:retry', (_e, jobId: number) => {
    const db = getDatabase()
    const original = db
      .prepare(`SELECT project_id FROM jobs WHERE id = ?`)
      .get(jobId) as { project_id: number } | undefined

    if (!original) throw new Error(`Job ${jobId} not found`)

    const newJobId = createRenderJob(original.project_id)
    startRender(newJobId)

    return db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(newJobId)
  })

  // Send SIGTERM to a running render and mark the job cancelled.
  ipcMain.handle('jobs:cancel', (_e, jobId: number) => {
    cancelRender(jobId)
    return { success: true }
  })

  // Delete the temporary rendered MP4 file.
  // Safe to call even if the file is already gone — the service checks existence first.
  ipcMain.handle('jobs:deleteTemp', (_e, jobId: number) => {
    deleteTempFile(jobId)
    return { success: true }
  })
}
