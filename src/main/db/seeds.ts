import type Database from 'better-sqlite3'

export function seedDatabase(db: Database.Database): void {
  // Platform
  db.prepare(`INSERT OR IGNORE INTO platforms (name) VALUES ('youtube')`).run()

  // Render presets
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

  // MVP template
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

  // Default app settings
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)
  `)

  insertSetting.run('ffmpeg_path', '')
  insertSetting.run('ffprobe_path', '')
  insertSetting.run('auto_delete_after_upload', 'true')
}
