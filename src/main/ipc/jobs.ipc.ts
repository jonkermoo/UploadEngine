import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'

export function registerJobHandlers(): void {
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
    const db = getDatabase()
    return db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(id)
  })
}
