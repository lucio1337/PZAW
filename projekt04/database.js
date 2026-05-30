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
  CREATE TABLE IF NOT EXISTS admin_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    target_user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    seen INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

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
      spotify_url TEXT,
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

  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (id, title, required_fields)
    VALUES (?, ?, ?)
  `);

  insertCategory.run(
    'ulubione-utwory',
    'Ulubione utwory',
    JSON.stringify(['tytuł', 'wykonawca', 'gatunek', 'ocena'])
  );
  insertCategory.run(
    'ulubione-albumy',
    'Ulubione albumy',
    JSON.stringify(['tytuł', 'wykonawca', 'gatunek', 'ocena'])
  );
  insertCategory.run(
    'ulubieni-artysci',
    'Ulubieni artyści',
    JSON.stringify(['wykonawca', 'ocena'])
  );
}

export default db;