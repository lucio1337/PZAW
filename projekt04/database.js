import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign key enforcement (disabled by default in SQLite)
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      required_fields TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0
    )
  `);

  // user_id now references users(id) with cascading delete
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id TEXT NOT NULL,
      tytuł TEXT,
      wykonawca TEXT,
      gatunek TEXT,
      ocena TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // user_id now references users(id) with cascading delete
  db.exec(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // playlist_id now references playlists(id) with cascading delete
  db.exec(`
    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id INTEGER NOT NULL,
      song_tytuł TEXT NOT NULL,
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
    )
  `);
}

export default db;