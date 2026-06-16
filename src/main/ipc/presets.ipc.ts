import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'

export function registerPresetHandlers(): void {
  ipcMain.handle('presets:list', () => {
    return getDatabase().prepare(`SELECT * FROM render_presets ORDER BY id ASC`).all()
  })
}
