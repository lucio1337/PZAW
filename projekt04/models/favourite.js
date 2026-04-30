import db, { initializeDatabase } from '../database.js';

initializeDatabase();

const favourite_album_or_song = {};

function loadCategories() {
  const rows = db.prepare('SELECT id, title, required_fields FROM categories').all();

  rows.forEach(row => {
    favourite_album_or_song[row.id] = {
      title: row.title,
      requiredFields: JSON.parse(row.required_fields),
    };
  });
}

loadCategories();

function getCardsForCategoryAndUser(categoryId, userId) {
  if (!userId) return [];
  const rows = db.prepare(
    'SELECT id, tytuł, wykonawca, gatunek, ocena FROM cards WHERE category_id = ? AND user_id = ? ORDER BY id'
  ).all(categoryId, userId);
  return rows.map(row => toCard(row));
}

function getCardsForCategoryAll(categoryId) {
  const rows = db.prepare(`
    SELECT c.id, c.tytuł, c.wykonawca, c.gatunek, c.ocena, u.username AS ownerName
    FROM cards c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.category_id = ?
    ORDER BY c.id
  `).all(categoryId);
  return rows.map(row => {
    const card = toCard(row);
    if (row.ownerName) card.ownerName = row.ownerName;
    return card;
  });
}

function toCard(row) {
  const card = { ocena: row.ocena };
  if (row.id != null) card.id = row.id;
  if (row.tytuł) card.tytuł = row.tytuł;
  if (row.wykonawca) card.wykonawca = row.wykonawca;
  if (row.gatunek) card.gatunek = row.gatunek;
  return card;
}

export function isDuplicateCard(categoryId, newCard, userId) {
  if (!hasCategory(categoryId) || !userId) return false;
  const cards = getCardsForCategoryAndUser(categoryId, userId);

  const uniqueFieldsByCategory = {
    'ulubione-utwory': ['tytuł', 'wykonawca'],
    'ulubione-albumy': ['tytuł', 'wykonawca'],
    'ulubieni-artysci': ['wykonawca'],
  };

  const requiredFields = favourite_album_or_song[categoryId].requiredFields || [];
  const uniqueFields = uniqueFieldsByCategory[categoryId] || requiredFields;

  const norm = (v) => String(v ?? '').trim().toLowerCase();

  return cards.some((card) => {
    return uniqueFields.every((field) => {
      return norm(card[field]) === norm(newCard[field]);
    });
  });
}

export function getCategorySummaries() {
  return Object.entries(favourite_album_or_song).map(([id, category]) => ({
    id,
    title: category.title,
  }));
}

export function hasCategory(categoryId) {
  return favourite_album_or_song.hasOwnProperty(categoryId);
}

export function getCategory(categoryId, userId, isAdmin) {
  if (!hasCategory(categoryId)) return null;
  const cards = isAdmin ? getCardsForCategoryAll(categoryId) : getCardsForCategoryAndUser(categoryId, userId);
  return {
    id: categoryId,
    ...favourite_album_or_song[categoryId],
    cards,
  };
}

export function addCard(categoryId, card, userId) {
  if (!hasCategory(categoryId) || !userId) return;
  db.prepare(`
    INSERT INTO cards (category_id, tytuł, wykonawca, gatunek, ocena, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    categoryId,
    card.tytuł || null,
    card.wykonawca || null,
    card.gatunek || null,
    card.ocena,
    userId
  );
}

export function validateCardData(categoryId, card) {
  const errors = [];

  if (!hasCategory(categoryId)) {
    errors.push('Kategoria nie istnieje');
    return errors;
  }

  const requiredFields = favourite_album_or_song[categoryId].requiredFields || [];

  for (let field of requiredFields) {
    if (!card.hasOwnProperty(field)) {
      errors.push(`Brakuje pola '${field}'`);
    } else {
      if (field !== 'ocena') {
        if (typeof card[field] !== 'string') {
          errors.push(`Pole '${field}' powinno być tekstem`);
        } else if (card[field].length < 1 || card[field].length > 500) {
          errors.push(`Pole '${field}' powinno mieć długość 1-500`);
        }
      }
    }
  }

  if (card.ocena) {
    const r = parseFloat(card.ocena);
    if (isNaN(r) || r < 1 || r > 10) {
      errors.push("'ocena' musi być liczbą od 1 do 10 (może zawierać części dziesiętne)");
    }
  }

  return errors;
}

function getCardIdsForCategoryAndUser(categoryId, userId) {
  if (!userId) return [];
  return db.prepare('SELECT id FROM cards WHERE category_id = ? AND user_id = ? ORDER BY id').all(categoryId, userId);
}

function getCardIdsForCategoryAll(categoryId) {
  return db.prepare('SELECT id FROM cards WHERE category_id = ? ORDER BY id').all(categoryId);
}

export function removeCard(categoryId, index, userId) {
  if (!hasCategory(categoryId) || !userId) return false;
  const rows = getCardIdsForCategoryAndUser(categoryId, userId);
  if (index < 0 || index >= rows.length) return false;
  db.prepare('DELETE FROM cards WHERE id = ?').run(rows[index].id);
  return true;
}

export function getCardIdAtCategoryIndex(categoryId, index, isAdmin) {
  const rows = isAdmin ? getCardIdsForCategoryAll(categoryId) : null;
  if (isAdmin && rows && index >= 0 && index < rows.length) return rows[index].id;
  return null;
}

export function deleteCardById(cardId) {
  db.prepare('DELETE FROM cards WHERE id = ?').run(cardId);
}

export function getPlaylists(userId, isAdmin) {
  if (!userId && !isAdmin) return [];
  const playlistRows = isAdmin
    ? db.prepare(`
        SELECT p.id, p.name, p.user_id AS ownerId, u.username AS ownerName
        FROM playlists p
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.id
      `).all()
    : db.prepare('SELECT id, name FROM playlists WHERE user_id = ? ORDER BY id').all(userId);
  return playlistRows.map(playlist => {
    const ownerId = playlist.ownerId != null ? playlist.ownerId : userId;
    const songs = db.prepare(`
      SELECT c.tytuł, c.wykonawca, c.gatunek, c.ocena
      FROM playlist_songs ps
      JOIN cards c ON ps.song_tytuł = c.tytuł AND c.category_id = 'ulubione-utwory' AND c.user_id = ?
      WHERE ps.playlist_id = ?
    `).all(ownerId, playlist.id);
    const result = {
      name: playlist.name,
      songs: songs.map(row => ({
        tytuł: row.tytuł,
        wykonawca: row.wykonawca,
        gatunek: row.gatunek,
        ocena: row.ocena,
      })),
    };
    if (playlist.id != null) result.id = playlist.id;
    if (playlist.ownerId != null) result.ownerId = playlist.ownerId;
    if (playlist.ownerName) result.ownerName = playlist.ownerName;
    return result;
  });
}

export function addPlaylist(name, songs, userId) {
  if (!userId) return;
  const result = db.prepare('INSERT INTO playlists (name, user_id) VALUES (?, ?)').run(name, userId);
  const playlistId = result.lastInsertRowid;
  const insertSong = db.prepare('INSERT INTO playlist_songs (playlist_id, song_tytuł) VALUES (?, ?)');
  songs.forEach(song => {
    insertSong.run(playlistId, song.tytuł);
  });
}

function getPlaylistIdsForUser(userId) {
  if (!userId) return [];
  return db.prepare('SELECT id FROM playlists WHERE user_id = ? ORDER BY id').all(userId);
}

function getPlaylistIdsAll() {
  return db.prepare('SELECT id FROM playlists ORDER BY id').all();
}

export function deletePlaylist(idx, userId, isAdmin) {
  if (!userId && !isAdmin) return;
  const rows = isAdmin ? getPlaylistIdsAll() : getPlaylistIdsForUser(userId);
  if (idx < 0 || idx >= rows.length) return;
  db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ?').run(rows[idx].id);
  db.prepare('DELETE FROM playlists WHERE id = ?').run(rows[idx].id);
}

export function deletePlaylistById(playlistId) {
  db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ?').run(playlistId);
  db.prepare('DELETE FROM playlists WHERE id = ?').run(playlistId);
}

export function updatePlaylist(idx, name, songs, userId, isAdmin) {
  if (!userId && !isAdmin) return;
  const rows = isAdmin ? getPlaylistIdsAll() : getPlaylistIdsForUser(userId);
  if (idx < 0 || idx >= rows.length) return;
  const playlistId = rows[idx].id;
  db.prepare('UPDATE playlists SET name = ? WHERE id = ?').run(name, playlistId);
  db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ?').run(playlistId);
  const insertSong = db.prepare('INSERT INTO playlist_songs (playlist_id, song_tytuł) VALUES (?, ?)');
  songs.forEach(song => {
    insertSong.run(playlistId, song.tytuł);
  });
}

export function deleteCard(categoryId, idx, userId) {
  return removeCard(categoryId, idx, userId);
}

function assertAllowedField(fieldName) {
  if (fieldName !== 'tytuł' && fieldName !== 'wykonawca') {
    throw new Error(`Unsupported field for top stats: ${fieldName}`);
  }
}

function topByCaseInsensitiveFields(categoryId, fieldNames, limit = 5) {
  const fields = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
  if (fields.length < 1 || fields.length > 2) {
    throw new Error('topByCaseInsensitiveFields supports 1 or 2 fields only');
  }
  fields.forEach(assertAllowedField);

  const whereNotEmpty = fields
    .map(f => `c.${f} IS NOT NULL AND trim(c.${f}) <> ''`)
    .join(' AND ');

  if (fields.length === 1) {
    const f = fields[0];
    const sql = `
      SELECT
        (SELECT ${f} FROM cards WHERE id = g.minId) AS ${f},
        g.count AS count
      FROM (
        SELECT lower(c.${f}) AS k, COUNT(*) AS count, MIN(c.id) AS minId
        FROM cards c
        WHERE c.category_id = ?
          AND ${whereNotEmpty}
        GROUP BY k
        ORDER BY count DESC
        LIMIT ?
      ) g
      ORDER BY g.count DESC, ${f} COLLATE NOCASE ASC
    `;

    return db.prepare(sql).all(categoryId, limit).map(r => ({
      ...r,
      name: r[f],
      count: r.count,
    }));
  }

  const [f1, f2] = fields;
  const sql = `
    SELECT
      (SELECT ${f1} FROM cards WHERE id = g.minId) AS ${f1},
      (SELECT ${f2} FROM cards WHERE id = g.minId) AS ${f2},
      g.count AS count
    FROM (
      SELECT lower(c.${f1}) AS k1, lower(c.${f2}) AS k2, COUNT(*) AS count, MIN(c.id) AS minId
      FROM cards c
      WHERE c.category_id = ?
        AND ${whereNotEmpty}
      GROUP BY k1, k2
      ORDER BY count DESC
      LIMIT ?
    ) g
    ORDER BY g.count DESC, ${f1} COLLATE NOCASE ASC, ${f2} COLLATE NOCASE ASC
  `;

  return db.prepare(sql).all(categoryId, limit).map(r => ({
    ...r,
    name: `${r[f1]} - ${r[f2]}`,
    count: r.count,
  }));
}

export function getTopAlbums(limit = 5) {
  // Album is uniquely identified by (title + artist), case-insensitive.
  return topByCaseInsensitiveFields('ulubione-albumy', ['tytuł', 'wykonawca'], limit);
}

export function getTopArtists(limit = 5) {
  return topByCaseInsensitiveFields('ulubieni-artysci', 'wykonawca', limit);
}

export function getTopSongs(limit = 5) {
  // Song is uniquely identified by (title + artist), case-insensitive.
  return topByCaseInsensitiveFields('ulubione-utwory', ['tytuł', 'wykonawca'], limit);
}

export default {
  getCategorySummaries,
  hasCategory,
  getCategory,
  addCard,
  validateCardData,
  isDuplicateCard,
  removeCard,
  getCardIdAtCategoryIndex,
  deleteCardById,
  getPlaylists,
  addPlaylist,
  deletePlaylist,
  deletePlaylistById,
  updatePlaylist,
  deleteCard,
  getTopAlbums,
  getTopArtists,
  getTopSongs,
};
