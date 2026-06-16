import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { createSchema } from './schema'
import { seedDatabase } from './seeds'

// Module-level singleton — one shared connection for the entire main process lifetime.
// SQLite supports multiple readers but only one writer at a time, so one connection is correct.
let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    // app.getPath('userData') returns the OS-appropriate app data folder:
    //   macOS:   ~/Library/Application Support/upload-engine/
    //   Windows: C:\Users\<user>\AppData\Roaming\upload-engine\
    //   Linux:   ~/.config/upload-engine/
    const dbPath = join(app.getPath('userData'), 'uploadengine.sqlite')
    db = new Database(dbPath)

    // WAL (Write-Ahead Logging) mode: writes go to a separate log file first, then
    // get checkpointed into the main database. This allows reads and writes to happen
    // concurrently without blocking each other — better performance than the default
    // DELETE journal mode which locks the entire file on every write.
    db.pragma('journal_mode = WAL')

    // SQLite does NOT enforce foreign keys by default — this must be enabled per connection.
    // Without this, you could delete a platform row that accounts still reference, silently
    // leaving orphaned account rows with invalid platform_ids.
    db.pragma('foreign_keys = ON')

    // createSchema uses CREATE TABLE IF NOT EXISTS, so it's safe to call on every open.
    createSchema(db)
    // seedDatabase uses INSERT OR IGNORE, so it only inserts rows that don't already exist.
    seedDatabase(db)
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
