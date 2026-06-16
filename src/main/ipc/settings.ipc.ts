import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:getAll', () => {
    const db = getDatabase()
    const rows = db.prepare(`SELECT key, value FROM app_settings`).all() as { key: string; value: string }[]
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  })

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    const db = getDatabase()
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value)
    return { success: true }
  })
}
