import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'

export function registerDashboardHandlers(): void {
  ipcMain.handle('dashboard:getSummary', () => {
    const db = getDatabase()

    const accountCount = (db.prepare(`SELECT COUNT(*) as count FROM accounts`).get() as { count: number }).count
    const pendingJobs  = (db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE status = 'pending'`).get() as { count: number }).count
    const runningJobs  = (db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE status = 'running'`).get() as { count: number }).count
    const failedJobs   = (db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE status = 'failed'`).get() as { count: number }).count

    const today = new Date().toISOString().slice(0, 10)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const uploadsToday = (db.prepare(`SELECT COUNT(*) as count FROM uploads WHERE uploaded_at >= ?`).get(today) as { count: number }).count
    const uploadsWeek  = (db.prepare(`SELECT COUNT(*) as count FROM uploads WHERE uploaded_at >= ?`).get(weekAgo) as { count: number }).count

    const recentJobs    = db.prepare(`
      SELECT j.*, p.title as project_title FROM jobs j
      JOIN projects p ON j.project_id = p.id
      ORDER BY j.created_at DESC LIMIT 5
    `).all()

    const recentUploads = db.prepare(`
      SELECT u.*, a.account_name, p.title as project_title FROM uploads u
      JOIN accounts a ON u.account_id = a.id
      JOIN projects p ON u.project_id = p.id
      ORDER BY u.uploaded_at DESC LIMIT 5
    `).all()

    return { accountCount, pendingJobs, runningJobs, failedJobs, uploadsToday, uploadsWeek, recentJobs, recentUploads }
  })
}
