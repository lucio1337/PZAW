import Database from 'better-sqlite3';
import crypto from "crypto";
import fs from "fs";
import { hash as argon2hash } from "@node-rs/argon2";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeDatabase } from "./database.js";

initializeDatabase();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

const pepperPath = join(__dirname, "auth_pepper.txt");
let PEPPER = "";
if (fs.existsSync(pepperPath)) {
  PEPPER = fs.readFileSync(pepperPath, "utf-8").trim();
} else {
  PEPPER = crypto.randomBytes(32).toString("base64");
  fs.writeFileSync(pepperPath, PEPPER);
}

async function getOrCreateUser(username, password, isAdmin = 0) {
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) return existing.id;
  const hash = await argon2hash(password + PEPPER);
  const result = db.prepare("INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)")
    .run(username, hash, isAdmin);
  return result.lastInsertRowid;
}

const demoUserId = await getOrCreateUser("demo", "demo");
const user2Id = await getOrCreateUser("anna", "anna123");
const user3Id = await getOrCreateUser("marek", "marek123");
await getOrCreateUser("admin", "admin123", 1);

const insertCard = db.prepare(
  'INSERT INTO cards (category_id, tytuł, wykonawca, gatunek, ocena, user_id) VALUES (?, ?, ?, ?, ?, ?)'
);

// ── demo ─────────────────────────────────────────────────────────────────────

insertCard.run('ulubione-albumy', 'Thriller', 'Michael Jackson', 'pop, funk', '10', demoUserId);
insertCard.run('ulubione-albumy', 'The Dark Side of the Moon', 'Pink Floyd', 'progressive rock', '9.8', demoUserId);
insertCard.run('ulubione-albumy', 'Random Access Memories', 'Daft Punk', 'electronic, disco', '9.5', demoUserId);
insertCard.run('ulubione-albumy', 'Nevermind', 'Nirvana', 'grunge', '9.1', demoUserId);
insertCard.run('ulubione-albumy', 'Abbey Road', 'The Beatles', 'rock', '9.7', demoUserId);

insertCard.run('ulubione-utwory', 'Bohemian Rhapsody', 'Queen', 'rock, progressive rock', '10', demoUserId);
insertCard.run('ulubione-utwory', 'Stairway to Heaven', 'Led Zeppelin', 'rock', '9.8', demoUserId);
insertCard.run('ulubione-utwory', 'Billie Jean', 'Michael Jackson', 'pop, funk', '9.7', demoUserId);
insertCard.run('ulubione-utwory', 'Hotel California', 'Eagles', 'rock', '9.6', demoUserId);
insertCard.run('ulubione-utwory', 'Smells Like Teen Spirit', 'Nirvana', 'grunge', '9.5', demoUserId);
insertCard.run('ulubione-utwory', 'Yesterday', 'The Beatles', 'pop, rock', '9.3', demoUserId);

insertCard.run('ulubieni-artysci', null, 'The Beatles', null, '9.9', demoUserId);
insertCard.run('ulubieni-artysci', null, 'Queen', null, '9.8', demoUserId);
insertCard.run('ulubieni-artysci', null, 'Pink Floyd', null, '9.6', demoUserId);
insertCard.run('ulubieni-artysci', null, 'Michael Jackson', null, '9.7', demoUserId);
insertCard.run('ulubieni-artysci', null, 'Led Zeppelin', null, '9.5', demoUserId);

// ── anna ──────────────────────────────────────────────────────────────────────

insertCard.run('ulubione-albumy', 'Thriller', 'Michael Jackson', 'pop', '9.5', user2Id);           // powtórka
insertCard.run('ulubione-albumy', 'The Dark Side of the Moon', 'Pink Floyd', 'art rock', '9.5', user2Id); // powtórka
insertCard.run('ulubione-albumy', 'Random Access Memories', 'Daft Punk', 'dance, pop', '8.8', user2Id);  // powtórka
insertCard.run('ulubione-albumy', 'Midnights', 'Taylor Swift', 'pop, synth-pop', '9.0', user2Id);
insertCard.run('ulubione-albumy', 'Future Nostalgia', 'Dua Lipa', 'pop, disco', '9.2', user2Id);

insertCard.run('ulubione-utwory', 'Bohemian Rhapsody', 'Queen', 'opera rock', '9.8', user2Id);     // powtórka
insertCard.run('ulubione-utwory', 'Stairway to Heaven', 'Led Zeppelin', 'folk rock', '9.5', user2Id); // powtórka
insertCard.run('ulubione-utwory', 'Billie Jean', 'Michael Jackson', 'pop', '9.4', user2Id);        // powtórka
insertCard.run('ulubione-utwory', 'Anti-Hero', 'Taylor Swift', 'pop, synth-pop', '9.2', user2Id);
insertCard.run('ulubione-utwory', 'Levitating', 'Dua Lipa', 'pop, disco', '8.9', user2Id);
insertCard.run('ulubione-utwory', 'Easy On Me', 'Adele', 'pop, soul', '9.3', user2Id);

insertCard.run('ulubieni-artysci', null, 'The Beatles', null, '9.5', user2Id);                     // powtórka
insertCard.run('ulubieni-artysci', null, 'Queen', null, '9.7', user2Id);                           // powtórka
insertCard.run('ulubieni-artysci', null, 'Michael Jackson', null, '9.0', user2Id);                 // powtórka
insertCard.run('ulubieni-artysci', null, 'Taylor Swift', null, '9.5', user2Id);
insertCard.run('ulubieni-artysci', null, 'Dua Lipa', null, '8.8', user2Id);

// ── marek ─────────────────────────────────────────────────────────────────────

insertCard.run('ulubione-albumy', 'Thriller', 'Michael Jackson', 'funk, pop', '8.8', user3Id);     // powtórka
insertCard.run('ulubione-albumy', 'Nevermind', 'Nirvana', 'grunge, punk', '9.5', user3Id);        // powtórka
insertCard.run('ulubione-albumy', 'Random Access Memories', 'Daft Punk', 'electronic', '9.0', user3Id); // powtórka
insertCard.run('ulubione-albumy', 'Master of Puppets', 'Metallica', 'heavy metal', '9.8', user3Id);
insertCard.run('ulubione-albumy', 'Paranoid', 'Black Sabbath', 'heavy metal', '9.6', user3Id);
insertCard.run('ulubione-albumy', 'The Number of the Beast', 'Iron Maiden', 'heavy metal', '9.4', user3Id);

insertCard.run('ulubione-utwory', 'Bohemian Rhapsody', 'Queen', 'hard rock, prog', '10', user3Id); // powtórka
insertCard.run('ulubione-utwory', 'Stairway to Heaven', 'Led Zeppelin', 'hard rock', '10', user3Id); // powtórka
insertCard.run('ulubione-utwory', 'Billie Jean', 'Michael Jackson', 'R&B, funk', '9.0', user3Id); // powtórka
insertCard.run('ulubione-utwory', 'Master of Puppets', 'Metallica', 'heavy metal', '10', user3Id);
insertCard.run('ulubione-utwory', 'One', 'Metallica', 'heavy metal', '9.9', user3Id);
insertCard.run('ulubione-utwory', 'Iron Man', 'Black Sabbath', 'heavy metal', '9.5', user3Id);

insertCard.run('ulubieni-artysci', null, 'The Beatles', null, '9.2', user3Id);                     // powtórka
insertCard.run('ulubieni-artysci', null, 'Queen', null, '9.3', user3Id);                           // powtórka
insertCard.run('ulubieni-artysci', null, 'Michael Jackson', null, '8.7', user3Id);                 // powtórka
insertCard.run('ulubieni-artysci', null, 'Metallica', null, '10', user3Id);
insertCard.run('ulubieni-artysci', null, 'Iron Maiden', null, '9.5', user3Id);
insertCard.run('ulubieni-artysci', null, 'Black Sabbath', null, '9.4', user3Id);

// ── playlisty ─────────────────────────────────────────────────────────────────

const p1 = db.prepare('INSERT INTO playlists (name, user_id) VALUES (?, ?)').run('Rock Classics', demoUserId);
const p2 = db.prepare('INSERT INTO playlists (name, user_id) VALUES (?, ?)').run('Best of All Time', demoUserId);
const p3 = db.prepare('INSERT INTO playlists (name, user_id) VALUES (?, ?)').run('Pop Hits', user2Id);
const p4 = db.prepare('INSERT INTO playlists (name, user_id) VALUES (?, ?)').run('Metal Legends', user3Id);

const addSong = db.prepare('INSERT INTO playlist_songs (playlist_id, song_tytuł) VALUES (?, ?)');

addSong.run(p1.lastInsertRowid, 'Bohemian Rhapsody');
addSong.run(p1.lastInsertRowid, 'Stairway to Heaven');
addSong.run(p1.lastInsertRowid, 'Hotel California');
addSong.run(p1.lastInsertRowid, 'Yesterday');

addSong.run(p2.lastInsertRowid, 'Bohemian Rhapsody');
addSong.run(p2.lastInsertRowid, 'Billie Jean');
addSong.run(p2.lastInsertRowid, 'Stairway to Heaven');
addSong.run(p2.lastInsertRowid, 'Smells Like Teen Spirit');

addSong.run(p3.lastInsertRowid, 'Anti-Hero');
addSong.run(p3.lastInsertRowid, 'Levitating');
addSong.run(p3.lastInsertRowid, 'Easy On Me');

addSong.run(p4.lastInsertRowid, 'Master of Puppets');
addSong.run(p4.lastInsertRowid, 'One');
addSong.run(p4.lastInsertRowid, 'Iron Man');

db.close();