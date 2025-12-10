import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

db.exec('DELETE FROM playlist_songs');
db.exec('DELETE FROM playlists');
db.exec('DELETE FROM cards');
db.exec('DELETE FROM categories');

db.exec(`INSERT INTO categories (id, title, required_fields) VALUES 
  ('ulubione-albumy', 'ulubione albumy', '["tytuł","wykonawca","gatunek","ocena"]'),
  ('ulubione-utwory', 'ulubione utwory', '["tytuł","wykonawca","gatunek","ocena"]'),
  ('ulubieni-artysci', 'ulubieni artyści', '["wykonawca","ocena"]')
`);

db.exec(`INSERT INTO cards (category_id, tytuł, wykonawca, gatunek, ocena) VALUES
  ('ulubione-albumy', 'Dawn FM', 'The Weeknd', 'synthpop, dance-pop', '9'),
  ('ulubione-albumy', 'Random Access Memories', 'Daft Punk', 'electronic, disco', '9.5'),
  ('ulubione-utwory', 'Paranoid', 'Black Sabbath', 'heavy metal', '8.5'),
  ('ulubione-utwory', 'Początek', 'Męskie Granie Orkiestra, Dawid Podsiadło, Kortez, Krzysztof Zalewski', 'pop', '10'),
  ('ulubione-utwory', 'Bohemian Rhapsody', 'Queen', 'rock, progressive rock', '10'),
  ('ulubione-utwory', 'Stairway to Heaven', 'Led Zeppelin', 'rock', '9.8'),
  ('ulubieni-artysci', NULL, 'Michael Jackson', NULL, '9.7'),
  ('ulubieni-artysci', NULL, 'Metallica', NULL, '8.4'),
  ('ulubieni-artysci', NULL, 'The Beatles', NULL, '9.9')
`);

const playlist1 = db.prepare('INSERT INTO playlists (name) VALUES (?)').run('Rock Classics');
const playlist2 = db.prepare('INSERT INTO playlists (name) VALUES (?)').run('Best of All Time');

const addSong = db.prepare('INSERT INTO playlist_songs (playlist_id, song_tytuł) VALUES (?, ?)');

addSong.run(playlist1.lastInsertRowid, 'Paranoid');
addSong.run(playlist1.lastInsertRowid, 'Bohemian Rhapsody');
addSong.run(playlist1.lastInsertRowid, 'Stairway to Heaven');

addSong.run(playlist2.lastInsertRowid, 'Bohemian Rhapsody');
addSong.run(playlist2.lastInsertRowid, 'Początek');
addSong.run(playlist2.lastInsertRowid, 'Stairway to Heaven');

db.close();
