import db, { initializeDatabase } from '../database.js';

initializeDatabase();

const favourite_album_or_song = {};

function loadCategories() {
  const rows = db.prepare('SELECT id, title, required_fields FROM categories').all();
  
  rows.forEach(row => {
    favourite_album_or_song[row.id] = {
      title: row.title,
      requiredFields: JSON.parse(row.required_fields),
      cards: []
    };
  });
}

function loadCards() {
  Object.keys(favourite_album_or_song).forEach(id => {
    favourite_album_or_song[id].cards = [];
  });
  
  const rows = db.prepare('SELECT category_id, tytuł, wykonawca, gatunek, ocena FROM cards ORDER BY id').all();
  
  rows.forEach(row => {
    const card = {};
    if (row.tytuł) card.tytuł = row.tytuł;
    if (row.wykonawca) card.wykonawca = row.wykonawca;
    if (row.gatunek) card.gatunek = row.gatunek;
    card.ocena = row.ocena;
    
    if (favourite_album_or_song[row.category_id]) {
      favourite_album_or_song[row.category_id].cards.push(card);
    }
  });
}

function loadCardsForCategory(categoryId) {
  favourite_album_or_song[categoryId].cards = [];
  
  const rows = db.prepare('SELECT tytuł, wykonawca, gatunek, ocena FROM cards WHERE category_id = ? ORDER BY id').all(categoryId);
  
  rows.forEach(row => {
    const card = {};
    if (row.tytuł) card.tytuł = row.tytuł;
    if (row.wykonawca) card.wykonawca = row.wykonawca;
    if (row.gatunek) card.gatunek = row.gatunek;
    card.ocena = row.ocena;
    favourite_album_or_song[categoryId].cards.push(card);
  });
}

loadCategories();
loadCards();

let playlists = [];

function loadPlaylists() {
  const playlistRows = db.prepare('SELECT id, name FROM playlists ORDER BY id').all();
  
  playlists = playlistRows.map(playlist => {
    const songs = db.prepare(`
      SELECT c.tytuł, c.wykonawca, c.gatunek, c.ocena
      FROM playlist_songs ps
      JOIN cards c ON ps.song_tytuł = c.tytuł AND c.category_id = 'ulubione-utwory'
      WHERE ps.playlist_id = ?
    `).all(playlist.id);
    
    return {
      name: playlist.name,
      songs: songs.map(row => ({
        tytuł: row.tytuł,
        wykonawca: row.wykonawca,
        gatunek: row.gatunek,
        ocena: row.ocena
      }))
    };
  });
}

loadPlaylists();

export function isDuplicateCard(categoryId, newCard) {
  if (!hasCategory(categoryId)) return false;

  const cards = favourite_album_or_song[categoryId].cards;
  const requiredFields = favourite_album_or_song[categoryId].requiredFields;

  return cards.some((card) => {
    return requiredFields.every((field) => {
      if (field === "ocena") {
        return parseFloat(card[field]) === parseFloat(newCard[field]);
      }
      return card[field] === newCard[field];
    });
  });
}

export function getCategorySummaries() {
  return Object.entries(favourite_album_or_song).map(([id, category]) => {
    return { id, title: category.title };
  });
}

export function hasCategory(categoryId) {
  return favourite_album_or_song.hasOwnProperty(categoryId);
}

export function getCategory(categoryId) {
  if (hasCategory(categoryId))
    return { id: categoryId, ...favourite_album_or_song[categoryId] };
  return null;
}

export function addCard(categoryId, card) {
  if (hasCategory(categoryId)) {
    db.prepare(`
      INSERT INTO cards (category_id, tytuł, wykonawca, gatunek, ocena)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      categoryId,
      card.tytuł || null,
      card.wykonawca || null,
      card.gatunek || null,
      card.ocena
    );
    
    loadCardsForCategory(categoryId);
  }
}

export function validateCardData(categoryId, card) {
  const errors = [];

  if (!hasCategory(categoryId)) {
    errors.push("Kategoria nie istnieje");
    return errors;
  }

  const requiredFields = favourite_album_or_song[categoryId].requiredFields || [];

  for (let field of requiredFields) {
    if (!card.hasOwnProperty(field)) {
      errors.push(`Brakuje pola '${field}'`);
    } else {
      if (field !== "ocena") {
        if (typeof card[field] !== "string") {
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

export function removeCard(categoryId, index) {
  if (!hasCategory(categoryId)) return false;

  const cards = favourite_album_or_song[categoryId].cards;
  if (index >= 0 && index < cards.length) {
    const rows = db.prepare('SELECT id FROM cards WHERE category_id = ? ORDER BY id').all(categoryId);
    
    if (index < rows.length) {
      db.prepare('DELETE FROM cards WHERE id = ?').run(rows[index].id);
      
      loadCardsForCategory(categoryId);
      return true;
    }
  }
  return false;
}

export function addPlaylist(name, songs) {
  const result = db.prepare('INSERT INTO playlists (name) VALUES (?)').run(name);
  const playlistId = result.lastInsertRowid;
  
  const insertSong = db.prepare('INSERT INTO playlist_songs (playlist_id, song_tytuł) VALUES (?, ?)');
  songs.forEach(song => {
    insertSong.run(playlistId, song.tytuł);
  });
  
  playlists = [];
  loadPlaylists();
}

export function getPlaylists() {
  return playlists;
}

export function deletePlaylist(idx) {
  if (idx >= 0 && idx < playlists.length) {
    const row = db.prepare('SELECT id FROM playlists ORDER BY id LIMIT 1 OFFSET ?').get(idx);
    
    if (row) {
      db.prepare('DELETE FROM playlists WHERE id = ?').run(row.id);
    }
    
    playlists = [];
    loadPlaylists();
  }
}

export function updatePlaylist(idx, name, songs) {
  if (idx >= 0 && idx < playlists.length) {
    const row = db.prepare('SELECT id FROM playlists ORDER BY id LIMIT 1 OFFSET ?').get(idx);
    
    if (row) {
      db.prepare('UPDATE playlists SET name = ? WHERE id = ?').run(name, row.id);
      
      db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ?').run(row.id);
      
      const insertSong = db.prepare('INSERT INTO playlist_songs (playlist_id, song_tytuł) VALUES (?, ?)');
      songs.forEach(song => {
        insertSong.run(row.id, song.tytuł);
      });
    }
    
    playlists = [];
    loadPlaylists();
  }
}

export function deleteCard(categoryId, idx) {
  removeCard(categoryId, idx);
}

export default {
  getCategorySummaries,
  hasCategory,
  getCategory,
  addCard,
  validateCardData,
  isDuplicateCard,
  removeCard,
  getPlaylists,
  addPlaylist,
  deletePlaylist,
  updatePlaylist,
  deleteCard
};
