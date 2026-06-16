import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'

export function registerAccountHandlers(): void {
  ipcMain.handle('accounts:list', () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT a.*, p.name as platform_name
      FROM accounts a
      JOIN platforms p ON a.platform_id = p.id
      ORDER BY a.created_at DESC
    `).all()
  })

  ipcMain.handle('accounts:delete', (_e, id: number) => {
    const db = getDatabase()
    db.prepare(`DELETE FROM accounts WHERE id = ?`).run(id)
    return { success: true }
  })
}
