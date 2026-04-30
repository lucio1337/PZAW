import express from "express";
import crypto from "crypto";
import fs from "fs";
import { hash as argon2hash, verify as argon2verify } from "@node-rs/argon2";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fav from "./models/favourite.js";
import db from "./database.js";

const port = 8000;
const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const sessions = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pepperPath = join(__dirname, "auth_pepper.txt");

let PEPPER;
if (fs.existsSync(pepperPath)) {
  PEPPER = fs.readFileSync(pepperPath, "utf-8").trim();
} else {
  PEPPER = crypto.randomBytes(32).toString("base64");
  fs.writeFileSync(pepperPath, PEPPER);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach(cookie => {
    const [name, ...rest] = cookie.split("=");
    const value = rest.join("=");
    if (!name) return;
    cookies[name.trim()] = decodeURIComponent(value || "");
  });

  return cookies;
}

function createSession(user) {
  const sessionId = crypto.randomBytes(16).toString("hex");
  sessions.set(sessionId, { id: user.id, username: user.username });
  return sessionId;
}

function setSessionCookie(res, sessionId) {
  res.setHeader("Set-Cookie", `sessionId=${sessionId}; HttpOnly; Path=/`);
}

function isArgon2Hash(stored) {
  return typeof stored === "string" && stored.startsWith("$argon2");
}

async function hashPassword(password) {
  // Keep PEPPER as app-level secret; Argon2 handles per-hash salt internally.
  return await argon2hash(password + PEPPER);
}

function verifyLegacySha256(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const checkHash = crypto
    .createHash("sha256")
    .update(salt + password + PEPPER)
    .digest("hex");
  return checkHash === hash;
}

async function verifyPassword(password, stored) {
  if (isArgon2Hash(stored)) {
    return await argon2verify(stored, password + PEPPER);
  }
  return verifyLegacySha256(password, stored);
}

function findUserByUsername(username) {
  return db
    .prepare("SELECT id, username, password FROM users WHERE username = ?")
    .get(username);
}

async function createUser(username, password) {
  const hashedPassword = await hashPassword(password);
  const info = db
    .prepare("INSERT INTO users (username, password) VALUES (?, ?)")
    .run(username, hashedPassword);

  return { id: info.lastInsertRowid, username };
}

function getUserWithAdmin(sessionUser) {
  if (!sessionUser) return null;
  const row = db.prepare("SELECT id, username, is_admin FROM users WHERE id = ?").get(sessionUser.id);
  if (!row) return null;
  return { id: row.id, username: row.username, isAdmin: !!row.is_admin };
}

app.use((req, res, next) => {
  const cookies = parseCookies(req.headers.cookie || "");
  const sessionId = cookies.sessionId;

  if (sessionId && sessions.has(sessionId)) {
    const sessionUser = sessions.get(sessionId);
    req.user = getUserWithAdmin(sessionUser);
  } else {
    req.user = null;
  }

  res.locals.currentUser = req.user;
  next();
});

function requireLogin(req, res, next) {
  if (!req.user) {
    return res.redirect("/logowanie");
  }
  next();
}

const userId = (req) => req.user ? req.user.id : null;
const isAdmin = (req) => req.user && req.user.isAdmin;

app.get("/", (req, res) => {
  const uid = userId(req);
  const admin = isAdmin(req);
  const categoriesSummaries = fav.getCategorySummaries();
  const categories = [];

  categoriesSummaries.forEach(summary => {
    const originalCategory = fav.getCategory(summary.id, uid, admin);
    const fullCategory = { ...originalCategory, cards: [...originalCategory.cards] };

    if (req.query.category === fullCategory.id) {
      if (req.query.sort === "lowest") {
        fullCategory.cards.sort((a, b) => parseFloat(a.ocena) - parseFloat(b.ocena));
      } else if (req.query.sort === "highest") {
        fullCategory.cards.sort((a, b) => parseFloat(b.ocena) - parseFloat(a.ocena));
      }
    }

    categories.push(fullCategory);
  });

  res.render("index", {
    title: "Moja ulubiona muzyka",
    categories,
    playlists: fav.getPlaylists(uid, admin),
    top: {
      albums: fav.getTopAlbums(5),
      artists: fav.getTopArtists(5),
      songs: fav.getTopSongs(5),
    },
  });
});

app.get("/rejestracja", (req, res) => {
  if (req.user) return res.redirect("/");

  res.render("register", {
    title: "Rejestracja",
    errors: [],
    username: ""
  });
});

app.post("/rejestracja", (req, res) => {
  const { username, password } = req.body;
  const errors = [];

  if (!username || username.trim() === "") {
    errors.push("Podaj nazwę użytkownika");
  }

  if (!password || password.trim() === "") {
    errors.push("Podaj hasło");
  }

  if (errors.length === 0) {
    const existing = findUserByUsername(username);
    if (existing) {
      errors.push("Użytkownik o takiej nazwie już istnieje");
    }
  }

  if (errors.length > 0) {
    return res.status(400).render("register", {
      title: "Rejestracja",
      errors,
      username: username || ""
    });
  }

  (async () => {
    const user = await createUser(username, password);
    const sessionId = createSession(user);
    setSessionCookie(res, sessionId);
    res.redirect("/");
  })().catch(err => {
    console.error(err);
    res.sendStatus(500);
  });
});

app.get("/logowanie", (req, res) => {
  if (req.user) return res.redirect("/");

  res.render("login", {
    title: "Logowanie",
    errors: [],
    username: ""
  });
});

app.post("/logowanie", (req, res) => {
  const { username, password } = req.body;
  const errors = [];

  if (!username || username.trim() === "") {
    errors.push("Podaj nazwę użytkownika");
  }

  if (!password || password.trim() === "") {
    errors.push("Podaj hasło");
  }

  let user = null;

  (async () => {
    if (errors.length === 0) {
      const row = findUserByUsername(username);
      if (!row || !(await verifyPassword(password, row.password))) {
        errors.push("Nieprawidłowa nazwa użytkownika lub hasło");
      } else {
        user = row;
      }
    }

    if (errors.length > 0) {
      return res.status(400).render("login", {
        title: "Logowanie",
        errors,
        username: username || ""
      });
    }

    // Automatic upgrade: if a user logs in with legacy SHA-256 hash, re-hash with Argon2.
    if (user && !isArgon2Hash(user.password) && verifyLegacySha256(password, user.password)) {
      const newHash = await hashPassword(password);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(newHash, user.id);
    }

    const sessionId = createSession(user);
    setSessionCookie(res, sessionId);
    res.redirect("/");
  })().catch(err => {
    console.error(err);
    res.sendStatus(500);
  });
});

app.post("/logout", (req, res) => {
  const cookies = parseCookies(req.headers.cookie || "");
  const sessionId = cookies.sessionId;

  if (sessionId && sessions.has(sessionId)) {
    sessions.delete(sessionId);
  }

  res.setHeader(
    "Set-Cookie",
    "sessionId=; HttpOnly; Path=/; Max-Age=0"
  );

  res.redirect("/");
});


app.get("/moje_polubione/:category_id", (req, res) => {
  const category_id = req.params.category_id;
  if (!fav.hasCategory(category_id)) return res.sendStatus(404);

  const category = fav.getCategory(category_id, userId(req), isAdmin(req));
  let cards = [...category.cards];

  if (req.query.sort === "lowest") {
    cards.sort((a, b) => parseFloat(a.ocena) - parseFloat(b.ocena));
  } else if (req.query.sort === "highest") {
    cards.sort((a, b) => parseFloat(b.ocena) - parseFloat(a.ocena));
  }

  res.render("category", {
    title: category.title,
    category: { ...category, cards }
  });
});

app.post("/moje_polubione/:category_id/new", requireLogin, (req, res) => {
  const category_id = req.params.category_id;
  if (!fav.hasCategory(category_id)) return res.sendStatus(404);

  const uid = req.user.id;
  const category = fav.getCategory(category_id, uid);
  const card_data = {};

  category.requiredFields.forEach(field => {
    card_data[field] = req.body[field] || "";
  });

  const errors = fav.validateCardData(category_id, card_data);
  if (errors.length === 0 && fav.isDuplicateCard(category_id, card_data, uid)) {
    errors.push("Taki wpis już istnieje w tej kategorii");
  }

  if (errors.length === 0) {
    fav.addCard(category_id, card_data, uid);
    res.redirect(`/moje_polubione/${category_id}`);
  } else {
    res.status(400).render("nowe_polubienie", {
      errors,
      title: "Dodaj nowe polubienie",
      category,
      ...card_data
    });
  }
});


app.get("/playlista", (req, res) => {
  const uid = userId(req);
  const admin = isAdmin(req);
  const utworyCategory = fav.getCategory("ulubione-utwory", uid, false);
  const utwory = utworyCategory ? utworyCategory.cards : [];

  res.render("playlista", {
    title: "Tworzenie nowej playlisty",
    utwory,
    playlists: fav.getPlaylists(uid, admin),
    errors: [],
    name: "",
    selected: []
  });
});

app.post("/playlista", requireLogin, (req, res) => {
  const uid = req.user.id;
  const name = req.body.name;
  const utwory = req.body.utwory;
  const errors = [];

  if (!name || name.trim() === "") errors.push("Podaj nazwę playlisty");
  if (!utwory) errors.push("Wybierz przynajmniej jeden utwór");

  const utworyCategory = fav.getCategory("ulubione-utwory", uid);
  const allSongs = utworyCategory ? utworyCategory.cards : [];

  let selectedSongs = [];
  if (utwory) selectedSongs = Array.isArray(utwory) ? utwory : [utwory];

  const songs = allSongs.filter(song => selectedSongs.includes(song.tytuł));

  if (errors.length === 0) {
    fav.addPlaylist(name, songs, uid);
    res.redirect("/playlista");
  } else {
    res.status(400).render("playlista", {
      title: "Tworzenie nowej playlisty",
      utwory: allSongs,
      playlists: fav.getPlaylists(uid),
      errors,
      name,
      selected: selectedSongs
    });
  }
});

app.post("/playlista/delete/:idx", requireLogin, (req, res) => {
  const index = parseInt(req.params.idx);
  const uid = req.user.id;
  const admin = isAdmin(req);
  const playlists = fav.getPlaylists(uid, admin);

  if (isNaN(index) || index < 0 || index >= playlists.length) {
    return res.sendStatus(400);
  }

  fav.deletePlaylist(index, uid, admin);
  res.redirect("/playlista");
});

app.get("/playlista/edit/:idx", requireLogin, (req, res) => {
  const index = parseInt(req.params.idx);
  const uid = req.user.id;
  const admin = isAdmin(req);
  const playlists = fav.getPlaylists(uid, admin);

  if (isNaN(index) || index < 0 || index >= playlists.length) {
    return res.sendStatus(404);
  }

  const playlist = playlists[index];
  const ownerId = playlist.ownerId != null ? playlist.ownerId : uid;
  const utworyCategory = fav.getCategory("ulubione-utwory", ownerId, false);
  const allSongs = utworyCategory ? utworyCategory.cards : [];

  res.render("edit_playlist", {
    title: "Edytuj playlistę",
    playlist,
    idx: index,
    utwory: allSongs,
    selected: playlist.songs.map(s => s.tytuł),
    errors: []
  });
});

app.post("/playlista/edit/:idx", requireLogin, (req, res) => {
  const index = parseInt(req.params.idx);
  const uid = req.user.id;
  const admin = isAdmin(req);
  const playlists = fav.getPlaylists(uid, admin);

  if (isNaN(index) || index < 0 || index >= playlists.length) {
    return res.sendStatus(404);
  }

  const name = req.body.name;
  const utwory = req.body.utwory;
  const errors = [];

  if (!name || name.trim() === "") errors.push("Podaj nazwę playlisty");
  if (!utwory) errors.push("Wybierz przynajmniej jeden utwór");

  const playlist = playlists[index];
  const ownerId = playlist.ownerId != null ? playlist.ownerId : uid;
  const utworyCategory = fav.getCategory("ulubione-utwory", ownerId, false);
  const allSongs = utworyCategory ? utworyCategory.cards : [];

  let selectedSongs = [];
  if (utwory) selectedSongs = Array.isArray(utwory) ? utwory : [utwory];

  const songs = allSongs.filter(song => selectedSongs.includes(song.tytuł));

  if (errors.length > 0) {
    return res.status(400).render("edit_playlist", {
      title: "Edytuj playlistę",
      playlist: playlists[index],
      idx: index,
      utwory: allSongs,
      errors,
      selected: selectedSongs
    });
  }

  fav.updatePlaylist(index, name, songs, uid, admin);
  res.redirect("/playlista");
});

app.post("/moje_polubione/:category_id/delete/:idx", requireLogin, (req, res) => {
  const category_id = req.params.category_id;
  const index = parseInt(req.params.idx);
  const uid = req.user.id;
  const admin = isAdmin(req);

  if (!fav.hasCategory(category_id)) return res.sendStatus(404);

  const category = fav.getCategory(category_id, uid, admin);
  if (isNaN(index) || index < 0 || index >= category.cards.length) return res.sendStatus(400);

  if (admin) {
    const cardId = fav.getCardIdAtCategoryIndex(category_id, index, true);
    if (cardId != null) fav.deleteCardById(cardId);
  } else {
    fav.deleteCard(category_id, index, uid);
  }
  const referer = req.get("Referer") || "";
  if (referer.includes("/moje_polubione/")) {
    res.redirect(`/moje_polubione/${category_id}`);
  } else {
    res.redirect("/");
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});