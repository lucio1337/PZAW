import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      required_fields TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id TEXT NOT NULL,
      tytuł TEXT,
      wykonawca TEXT,
      gatunek TEXT,
      ocena TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id INTEGER NOT NULL,
      song_tytuł TEXT NOT NULL
    )
  `);

  const result = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  
  if (result.count === 0) {
    db.exec(`INSERT INTO categories (id, title, required_fields) VALUES 
      ('ulubione-albumy', 'ulubione albumy', '["tytuł","wykonawca","gatunek","ocena"]'),
      ('ulubione-utwory', 'ulubione utwory', '["tytuł","wykonawca","gatunek","ocena"]'),
      ('ulubieni-artysci', 'ulubieni artyści', '["wykonawca","ocena"]')
    `);
    
    db.exec(`INSERT INTO cards (category_id, tytuł, wykonawca, gatunek, ocena) VALUES
      ('ulubione-albumy', 'Dawn FM', 'The Weeknd', 'synthpop, dance-pop', '9'),
      ('ulubione-utwory', 'Paranoid', 'Black Sabbath', 'heavy metal', '8.5'),
      ('ulubione-utwory', 'Początek', 'Męskie Granie Orkiestra, Dawid Podsiadło, Kortez, Krzysztof Zalewski', 'pop', '10'),
      ('ulubieni-artysci', NULL, 'Michael Jackson', NULL, '9.7'),
      ('ulubieni-artysci', NULL, 'Metallica', NULL, '8.4')
    `);
  }
}

export default db;
