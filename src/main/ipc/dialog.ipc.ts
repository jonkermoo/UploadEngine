import { ipcMain, dialog } from 'electron'
import { extname, basename } from 'path'
import { getDatabase } from '../db/database'
import { inspectFile } from '../services/ffprobe.service'

// File type filters shown in the native OS file picker.
const FILTERS = [
  { name: 'Media Files', extensions: ['mp4', 'mov', 'mkv', 'avi', 'webm', 'mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg', 'srt', 'ass', 'vtt', 'jpg', 'jpeg', 'png', 'webp'] },
  { name: 'Video',       extensions: ['mp4', 'mov', 'mkv', 'avi', 'webm'] },
  { name: 'Audio',       extensions: ['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg'] },
  { name: 'Captions',    extensions: ['srt', 'ass', 'vtt'] },
  { name: 'Thumbnails',  extensions: ['jpg', 'jpeg', 'png', 'webp'] },
]

// Maps a file's extension to the asset type value stored in SQLite.
function detectType(filePath: string): string {
  // extname returns the extension with the dot (e.g. ".mp4"), so we strip it.
  const ext = extname(filePath).toLowerCase().replace('.', '')
  if (['mp4', 'mov', 'mkv', 'avi', 'webm'].includes(ext))        return 'video_background'
  if (['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg'].includes(ext)) return 'audio_music'
  if (['srt', 'ass', 'vtt'].includes(ext))                        return 'caption_file'
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext))               return 'thumbnail'
  return 'other'
}

export function registerDialogHandlers(): void {
  // Opens a native OS file picker and returns an array of absolute file paths.
  // Returns an empty array if the user cancels.
  ipcMain.handle('dialog:openFiles', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: FILTERS,
    })
    return result.filePaths
  })

  // Takes an array of file paths, detects each file's type, optionally reads metadata
  // via FFprobe, and saves a record for each file into the SQLite assets table.
  // The original files are never moved or copied — only their paths are stored.
  ipcMain.handle('assets:import', async (_e, filePaths: string[]) => {
    const db = getDatabase()

    // Read the ffprobe path from settings. The ?. and ?? '' safely handle the case
    // where the setting row doesn't exist yet, returning an empty string instead of throwing.
    const ffprobePath = (db.prepare(`SELECT value FROM app_settings WHERE key = 'ffprobe_path'`).get() as { value: string } | undefined)?.value ?? ''

    const created: unknown[] = []

    for (const filePath of filePaths) {
      const type = detectType(filePath)
      const name = basename(filePath) // e.g. "/Users/foo/video.mp4" → "video.mp4"

      let meta = { duration_seconds: null as number | null, width: null as number | null, height: null as number | null, fps: null as number | null }
      // Only attempt FFprobe if the user has configured a binary path in Settings.
      if (ffprobePath) {
        const result = await inspectFile(ffprobePath, filePath)
        if (result) meta = result
      }

      const row = db.prepare(`
        INSERT INTO assets (type, name, local_path, source_type, duration_seconds, width, height, fps)
        VALUES (@type, @name, @local_path, 'imported_local', @duration_seconds, @width, @height, @fps)
      `).run({ type, name, local_path: filePath, ...meta })

      // .run() returns an object with lastInsertRowid — the id of the row just created.
      // We fetch the full row back so the renderer gets the complete asset object including
      // the auto-assigned id and created_at timestamp.
      created.push(db.prepare(`SELECT * FROM assets WHERE id = ?`).get(row.lastInsertRowid))
    }

    return created
  })

  // Shows a native warning dialog with Cancel/Delete buttons.
  // Returns true if the user clicked Delete (button index 1), false otherwise.
  ipcMain.handle('dialog:confirm', async (_e, message: string) => {
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Cancel', 'Delete'], // index 0 = Cancel, index 1 = Delete
      defaultId: 0,  // pre-selects Cancel so accidental Enter doesn't delete
      cancelId: 0,
      message,
    })
    return response === 1
  })
}
