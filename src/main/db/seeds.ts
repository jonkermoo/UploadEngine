import type Database from 'better-sqlite3'

export function seedDatabase(db: Database.Database): void {
  // INSERT OR IGNORE silently skips the insert if a row with the same UNIQUE key already exists.
  // This makes seeds safe to run on every app launch — they only insert on first run.

  db.prepare(`INSERT OR IGNORE INTO platforms (name) VALUES ('youtube')`).run()

  // Prepare the statement once and reuse it for each preset — more efficient than
  // calling db.prepare() inside a loop. Named parameters (@name, @aspect_ratio, etc.)
  // are matched to object keys when you call .run(object).
  const insertPreset = db.prepare(`
    INSERT OR IGNORE INTO render_presets (name, aspect_ratio, width, height, fps, video_bitrate, audio_bitrate)
    VALUES (@name, @aspect_ratio, @width, @height, @fps, @video_bitrate, @audio_bitrate)
  `)

  const presets = [
    { name: 'YouTube Landscape 1080p', aspect_ratio: '16:9', width: 1920, height: 1080, fps: 30, video_bitrate: '8000k', audio_bitrate: '192k' },
    { name: 'YouTube Shorts Vertical', aspect_ratio: '9:16', width: 1080, height: 1920, fps: 30, video_bitrate: '8000k', audio_bitrate: '192k' },
    { name: 'Square 1080',             aspect_ratio: '1:1',  width: 1080, height: 1080, fps: 30, video_bitrate: '6000k', audio_bitrate: '192k' },
  ]

  for (const preset of presets) {
    insertPreset.run(preset)
  }

  // Template config is stored as a JSON string because SQLite has no native JSON column type.
  // The renderer and services parse this string back into an object when they need it.
  const ambientLoopConfig = JSON.stringify({
    supports_music: true,
    supports_captions: false,
    supports_tts: false,
    requires_background_video: true,
  })

  db.prepare(`
    INSERT OR IGNORE INTO templates (name, template_type, description, config_json)
    VALUES ('Ambient Loop', 'ambient_loop', 'Loop a background video and add music for a selected duration.', ?)
  `).run(ambientLoopConfig)

  // Seed default app settings as empty strings so the Settings page can always read them,
  // even before the user has configured anything.
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)
  `)

  insertSetting.run('ffmpeg_path', '')
  insertSetting.run('ffprobe_path', '')
  insertSetting.run('auto_delete_after_upload', 'true')
}
