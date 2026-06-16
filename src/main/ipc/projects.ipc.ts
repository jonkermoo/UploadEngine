import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'

export function registerProjectHandlers(): void {
  ipcMain.handle('projects:list', () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT p.*, t.name as template_name, rp.name as preset_name, a.account_name
      FROM projects p
      JOIN templates t ON p.template_id = t.id
      JOIN render_presets rp ON p.render_preset_id = rp.id
      LEFT JOIN accounts a ON p.account_id = a.id
      ORDER BY p.created_at DESC
    `).all()
  })

  ipcMain.handle('projects:get', (_e, id: number) => {
    const db = getDatabase()
    return db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id)
  })

  ipcMain.handle('projects:create', (_e, project: {
    template_id: number
    account_id?: number
    render_preset_id: number
    title: string
    description?: string
    tags_json?: string
    privacy_status?: string
    scheduled_for?: string
    config_json: string
  }) => {
    const db = getDatabase()
    const result = db.prepare(`
      INSERT INTO projects (template_id, account_id, render_preset_id, title, description, tags_json, privacy_status, scheduled_for, status, config_json)
      VALUES (@template_id, @account_id, @render_preset_id, @title, @description, @tags_json, @privacy_status, @scheduled_for, 'draft', @config_json)
    `).run(project)
    return db.prepare(`SELECT * FROM projects WHERE id = ?`).get(result.lastInsertRowid)
  })

  ipcMain.handle('projects:delete', (_e, id: number) => {
    const db = getDatabase()
    db.prepare(`DELETE FROM projects WHERE id = ?`).run(id)
    return { success: true }
  })
}
