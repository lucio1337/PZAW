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
  'INSERT INTO cards (category_id, tytuł, wykonawca, gatunek, ocena, user_id, spotify_url) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

// ── demo ─────────────────────────────────────────────────────────────────────

insertCard.run('ulubione-albumy', 'Thriller', 'Michael Jackson', 'pop, funk', '10', demoUserId, 'https://open.spotify.com/album/2ANVost0y2y52ema1E9xAZ?si=H13UerhcRqiLlbhha6sq2A');
insertCard.run('ulubione-albumy', 'The Dark Side of the Moon', 'Pink Floyd', 'progressive rock', '9.8', demoUserId, 'https://open.spotify.com/album/4LH4d3cOWNNsVw41Gqt2kv?si=uHSw7QyoR5WFVaTa8gFbzA');
insertCard.run('ulubione-albumy', 'Random Access Memories', 'Daft Punk', 'electronic, disco', '9.5', demoUserId, 'https://open.spotify.com/album/4m2880jivSbbyEGAKfITCa?si=h72K6NdpQ2yCNxJXHd7d0w');
insertCard.run('ulubione-albumy', 'Nevermind', 'Nirvana', 'grunge', '9.1', demoUserId, 'https://open.spotify.com/album/2UJcKiJxNryhL050F5Z1Fk?si=DpbOk_uaSMOjuposQs_rxg');
insertCard.run('ulubione-albumy', 'Abbey Road', 'The Beatles', 'rock', '9.7', demoUserId, 'https://open.spotify.com/album/0ETFjACtuP2ADo6LFhL6HN?si=kbBsOSJ8SruGbDbyQoT9jQ');

insertCard.run('ulubione-utwory', 'Bohemian Rhapsody', 'Queen', 'rock, progressive rock', '10', demoUserId, 'https://open.spotify.com/track/3z8h0TU7ReDPLIbEnYhWZb?si=7c9c33c400fd45bf');
insertCard.run('ulubione-utwory', 'Stairway to Heaven', 'Led Zeppelin', 'rock', '9.8', demoUserId, 'https://open.spotify.com/track/5CQ30WqJwcep0pYcV4AMNc?si=5bceeb633d87476f');
insertCard.run('ulubione-utwory', 'Billie Jean', 'Michael Jackson', 'pop, funk', '9.7', demoUserId, 'https://open.spotify.com/track/7J1uxwnxfQLu4APicE5Rnj?si=132b1ce485444998');
insertCard.run('ulubione-utwory', 'Hotel California', 'Eagles', 'rock', '9.6', demoUserId, 'https://open.spotify.com/track/40riOy7x9W7GXjyGp4pjAv?si=a0519b1829df4446');
insertCard.run('ulubione-utwory', 'Smells Like Teen Spirit', 'Nirvana', 'grunge', '9.5', demoUserId, 'https://open.spotify.com/track/4CeeEOM32jQcH3eN9Q2dGj?si=9fdaad8eb8ff4795');
insertCard.run('ulubione-utwory', 'Yesterday', 'The Beatles', 'pop, rock', '9.3', demoUserId, 'https://open.spotify.com/track/3BQHpFgAp4l80e1XslIjNI?si=0c1a543cde654cba');

insertCard.run('ulubieni-artysci', null, 'The Beatles', null, '9.9', demoUserId, 'https://open.spotify.com/artist/3WrFJ7ztbogyGnTHbHJFl2?si=9c8a1d1e9c0e4f8b');
insertCard.run('ulubieni-artysci', null, 'Queen', null, '9.8', demoUserId, 'https://open.spotify.com/artist/1dfeR4HaWDbWqFHLkxsg1d?si=8c9a1e1e9c0e4f8b');
insertCard.run('ulubieni-artysci', null, 'Pink Floyd', null, '9.6', demoUserId, 'https://open.spotify.com/artist/0k17h0D3J5VfsdmQ1iZtE9?si=_F0ute6BSBi8-HFKV2jmWw');
insertCard.run('ulubieni-artysci', null, 'Michael Jackson', null, '9.7', demoUserId, 'https://open.spotify.com/artist/3fMbdgg4jU18AjLCKBhRSm?si=3rC81xPbRU2PgzDqJVeRkg');
insertCard.run('ulubieni-artysci', null, 'Led Zeppelin', null, '9.5', demoUserId, 'https://open.spotify.com/artist/36QJpDe2go2KgaRleHCDTp?si=bC1Mby4bSNmwk59sXYYLtA');

// ── anna ──────────────────────────────────────────────────────────────────────

insertCard.run('ulubione-albumy', 'Thriller', 'Michael Jackson', 'pop', '9.5', user2Id, 'https://open.spotify.com/album/2ANVost0y2y52ema1E9xAZ?si=H13UerhcRqiLlbhha6sq2A');           // powtórka
insertCard.run('ulubione-albumy', 'The Dark Side of the Moon', 'Pink Floyd', 'art rock', '9.5', user2Id, 'https://open.spotify.com/album/4LH4d3cOWNNsVw41Gqt2kv?si=uHSw7QyoR5WFVaTa8gFbzA'); // powtórka
insertCard.run('ulubione-albumy', 'Random Access Memories', 'Daft Punk', 'dance, pop', '8.8', user2Id, 'https://open.spotify.com/album/4m2880jivSbbyEGAKfITCa?si=h72K6NdpQ2yCNxJXHd7d0w');  // powtórka
insertCard.run('ulubione-albumy', 'Midnights', 'Taylor Swift', 'pop, synth-pop', '9.0', user2Id, 'https://open.spotify.com/album/151w1FgRZfnKZA9FEcg9Z3?si=3a0bb2ea1f424529');
insertCard.run('ulubione-albumy', 'Future Nostalgia', 'Dua Lipa', 'pop, disco', '9.2', user2Id, 'https://open.spotify.com/album/7fJJK56U9fHixgO0HQkhtI?si=b8pQ3E3iS-CP7e68HjhHWg');

insertCard.run('ulubione-utwory', 'Bohemian Rhapsody', 'Queen', 'opera rock', '9.8', user2Id, 'https://open.spotify.com/track/3z8h0TU7ReDPLIbEnYhWZb?si=7c9c33c400fd45bf');     // powtórka
insertCard.run('ulubione-utwory', 'Stairway to Heaven', 'Led Zeppelin', 'folk rock', '9.5', user2Id, 'https://open.spotify.com/track/5CQ30WqJwcep0pYcV4AMNc?si=5bceeb633d87476f'); // powtórka
insertCard.run('ulubione-utwory', 'Billie Jean', 'Michael Jackson', 'pop', '9.4', user2Id, 'https://open.spotify.com/track/7J1uxwnxfQLu4APicE5Rnj?si=132b1ce485444998');        // powtórka
insertCard.run('ulubione-utwory', 'Anti-Hero', 'Taylor Swift', 'pop, synth-pop', '9.2', user2Id, 'https://open.spotify.com/track/0V3wPSX9ygBnCm8psDIegu?si=3fa22675f5a2442d');
insertCard.run('ulubione-utwory', 'Levitating', 'Dua Lipa', 'pop, disco', '8.9', user2Id, 'https://open.spotify.com/track/39LLxExYz6ewLAcYrzQQyP?si=1b1c40e56c334aa8');
insertCard.run('ulubione-utwory', 'Easy On Me', 'Adele', 'pop, soul', '9.3', user2Id, 'https://open.spotify.com/album/224jZ4sUX7OhAuMwaxp86S?si=wNugIhG1QlO0LX7B_OBQPA');

insertCard.run('ulubieni-artysci', null, 'The Beatles', null, '9.5', user2Id, 'https://open.spotify.com/artist/3WrFJ7ztbogyGnTHbHJFl2?si=9c8a1d1e9c0e4f8b');                     // powtórka
insertCard.run('ulubieni-artysci', null, 'Queen', null, '9.7', user2Id, 'https://open.spotify.com/artist/1dfeR4HaWDbWqFHLkxsg1d?si=8c9a1e1e9c0e4f8b');                           // powtórka
insertCard.run('ulubieni-artysci', null, 'Michael Jackson', null, '9.0', user2Id, 'https://open.spotify.com/artist/3fMbdgg4jU18AjLCKBhRSm?si=3rC81xPbRU2PgzDqJVeRkg');                 // powtórka
insertCard.run('ulubieni-artysci', null, 'Taylor Swift', null, '9.5', user2Id, 'https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02?si=2utW-eZPSYmE5AWJGtihQw');
insertCard.run('ulubieni-artysci', null, 'Dua Lipa', null, '8.8', user2Id, 'https://open.spotify.com/artist/6M2wZ9GZgrQXHCFfjv46we?si=8us8GCqxSSahPHdT7XmIUg');

// ── marek ─────────────────────────────────────────────────────────────────────

insertCard.run('ulubione-albumy', 'Thriller', 'Michael Jackson', 'funk, pop', '8.8', user3Id, 'https://open.spotify.com/album/2ANVost0y2y52ema1E9xAZ?si=H13UerhcRqiLlbhha6sq2A');     // powtórka
insertCard.run('ulubione-albumy', 'Nevermind', 'Nirvana', 'grunge, punk', '9.5', user3Id, 'https://open.spotify.com/album/2UJcKiJxNryhL050F5Z1Fk?si=DpbOk_uaSMOjuposQs_rxg');        // powtórka
insertCard.run('ulubione-albumy', 'Random Access Memories', 'Daft Punk', 'electronic', '9.0', user3Id, 'https://open.spotify.com/album/4m2880jivSbbyEGAKfITCa?si=h72K6NdpQ2yCNxJXHd7d0w'); // powtórka
insertCard.run('ulubione-albumy', 'Master of Puppets', 'Metallica', 'heavy metal', '9.8', user3Id, 'https://open.spotify.com/album/2Lq2qX3hYhiuPckC8Flj21?si=gX5EXDdWTV6SEJwPBUG8ww');
insertCard.run('ulubione-albumy', 'Paranoid', 'Black Sabbath', 'heavy metal', '9.6', user3Id, 'https://open.spotify.com/album/7LGVdC9fFwgWYaIrZwsSv6?si=QBizW7l1TGqxN0OXBKUV-Q');
insertCard.run('ulubione-albumy', 'The Number of the Beast', 'Iron Maiden', 'heavy metal', '9.4', user3Id, 'https://open.spotify.com/album/5S3gls8Kjn8KVmqlIDEBbO?si=lCZxtd-VQuCnt0wAoKZvKQ');

insertCard.run('ulubione-utwory', 'Bohemian Rhapsody', 'Queen', 'hard rock, prog', '10', user3Id, 'https://open.spotify.com/track/3z8h0TU7ReDPLIbEnYhWZb?si=7c9c33c400fd45bf'); // powtórka
insertCard.run('ulubione-utwory', 'Stairway to Heaven', 'Led Zeppelin', 'hard rock', '10', user3Id, 'https://open.spotify.com/track/5CQ30WqJwcep0pYcV4AMNc?si=5bceeb633d87476f'); // powtórka
insertCard.run('ulubione-utwory', 'Billie Jean', 'Michael Jackson', 'R&B, funk', '9.0', user3Id, 'https://open.spotify.com/track/7J1uxwnxfQLu4APicE5Rnj?si=132b1ce485444998'); // powtórka
insertCard.run('ulubione-utwory', 'Master of Puppets', 'Metallica', 'heavy metal', '10', user3Id, 'https://open.spotify.com/track/2MuWTIM3b0YEAskbeeFE1i?si=39d8b0fbb41b405b');
insertCard.run('ulubione-utwory', 'One', 'Metallica', 'heavy metal', '9.9', user3Id, 'https://open.spotify.com/track/02xhLoVqpGmOqvolgrwM8w?si=2f5769741fa24930');
insertCard.run('ulubione-utwory', 'Iron Man', 'Black Sabbath', 'heavy metal', '9.5', user3Id, 'https://open.spotify.com/track/0vJYFKg9z1IvZiQUyX19cD?si=68cb74ec9ab54333');

insertCard.run('ulubieni-artysci', null, 'The Beatles', null, '9.2', user3Id, 'https://open.spotify.com/artist/3WrFJ7ztbogyGnTHbHJFl2?si=9c8a1d1e9c0e4f8b');                     // powtórka
insertCard.run('ulubieni-artysci', null, 'Queen', null, '9.3', user3Id, 'https://open.spotify.com/artist/1dfeR4HaWDbWqFHLkxsg1d?si=8c9a1e1e9c0e4f8b');                           // powtórka
insertCard.run('ulubieni-artysci', null, 'Michael Jackson', null, '8.7', user3Id, 'https://open.spotify.com/artist/3fMbdgg4jU18AjLCKBhRSm?si=3rC81xPbRU2PgzDqJVeRkg');                 // powtórka
insertCard.run('ulubieni-artysci', null, 'Metallica', null, '10', user3Id, 'https://open.spotify.com/artist/2ye2Wgw4gimLv2eAKyk1NB?si=CNv3Fp-NSZKscPlFcltg-w');
insertCard.run('ulubieni-artysci', null, 'Iron Maiden', null, '9.5', user3Id, 'https://open.spotify.com/artist/6mdiAmATAx73kdxrNrnlao?si=QxxDMNk6T6qqkB_PLMISlw');
insertCard.run('ulubieni-artysci', null, 'Black Sabbath', null, '9.4', user3Id, 'https://open.spotify.com/artist/5M52tdBnJaKSvOpJGz8mfZ?si=aQoEGWj-Q_ungpgB5dkjCA');

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