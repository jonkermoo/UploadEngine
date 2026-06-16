import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'

export function registerTemplateHandlers(): void {
  ipcMain.handle('templates:list', () => {
    return getDatabase().prepare(`SELECT * FROM templates ORDER BY id ASC`).all()
  })
}
