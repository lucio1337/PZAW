const favourite_album_or_song = {
  "ulubione-albumy": {
    title: "ulubione albumy",
    requiredFields: ["tytuł", "wykonawca", "gatunek", "ocena"],
    cards: [
      { tytuł: "Dawn FM", wykonawca: "The Weeknd", gatunek: "synthpop, dance-pop", ocena: "9" },
    ],
  },
  "ulubione-utwory": {
    title: "ulubione utwory",
    requiredFields: ["tytuł", "wykonawca", "gatunek", "ocena"],
    cards: [
      { tytuł: "Paranoid", wykonawca: "Black Sabbath", gatunek: "heavy metal", ocena: "8.5" },
      { tytuł: "Początek", wykonawca: "Męskie Granie Orkiestra, Dawid Podsiadło, Kortez, Krzysztof Zalewski", gatunek: "pop", ocena: "10" },
    ],
  },
  "ulubieni-artysci": {
    title: "ulubieni artyści",
    requiredFields: ["wykonawca", "ocena"],
    cards: [
      { wykonawca: "Michael Jackson", ocena: "9.7" },
      { wykonawca: "Metallica", ocena: "8.4" },
    ],
  },
};

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
  if (hasCategory(categoryId)) favourite_album_or_song[categoryId].cards.push(card);
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
    cards.splice(index, 1);
    return true;
  }
  return false;
}

let playlists = [];

export function addPlaylist(name, songs) {
  playlists.push({ name, songs });
}

export function getPlaylists() {
  return playlists;
}

export function deletePlaylist(idx) {
  if (idx >= 0 && idx < playlists.length) {
    playlists.splice(idx, 1);
  }
}


export function updatePlaylist(idx, name, songs) {
  if (idx >= 0 && idx < playlists.length) {
    playlists[idx].name = name;
    playlists[idx].songs = songs;
  }
}

export function deleteCard(categoryId, idx) {
  if (hasCategory(categoryId)) {
    favourite_album_or_song[categoryId].cards.splice(idx, 1);
  }
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