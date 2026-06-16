import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'

export function registerAssetHandlers(): void {
  ipcMain.handle('assets:list', (_e, type?: string) => {
    const db = getDatabase()
    if (type) {
      return db.prepare(`SELECT * FROM assets WHERE type = ? ORDER BY created_at DESC`).all(type)
    }
    return db.prepare(`SELECT * FROM assets ORDER BY created_at DESC`).all()
  })

  ipcMain.handle('assets:create', (_e, asset: {
    type: string
    name: string
    local_path: string
    source_type?: string
    duration_seconds?: number
    width?: number
    height?: number
    fps?: number
    checksum?: string
    tags_json?: string
  }) => {
    const db = getDatabase()
    const result = db.prepare(`
      INSERT INTO assets (type, name, local_path, source_type, duration_seconds, width, height, fps, checksum, tags_json)
      VALUES (@type, @name, @local_path, @source_type, @duration_seconds, @width, @height, @fps, @checksum, @tags_json)
    `).run({ source_type: 'imported_local', ...asset })
    return db.prepare(`SELECT * FROM assets WHERE id = ?`).get(result.lastInsertRowid)
  })

  ipcMain.handle('assets:delete', (_e, id: number) => {
    const db = getDatabase()
    db.prepare(`DELETE FROM assets WHERE id = ?`).run(id)
    return { success: true }
  })
}
