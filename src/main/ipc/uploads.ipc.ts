import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'

export function registerUploadHandlers(): void {
  ipcMain.handle('uploads:list', () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT u.*, a.account_name, p.title as project_title
      FROM uploads u
      JOIN accounts a ON u.account_id = a.id
      JOIN projects p ON u.project_id = p.id
      ORDER BY u.uploaded_at DESC
    `).all()
  })
}
