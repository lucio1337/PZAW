import express from "express";
import crypto from "crypto";
import fs from "fs";
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

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .createHash("sha256")
    .update(salt + password + PEPPER)
    .digest("hex");

  return `${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const parts = stored.split("$");
  if (parts.length !== 2) return false;

  const [salt, hash] = parts;
  const checkHash = crypto
    .createHash("sha256")
    .update(salt + password + PEPPER)
    .digest("hex");
    

  return checkHash === hash;
}

function findUserByUsername(username) {
  return db
    .prepare("SELECT id, username, password FROM users WHERE username = ?")
    .get(username);
}

function createUser(username, password) {
  const hashedPassword = hashPassword(password);
  const info = db
    .prepare("INSERT INTO users (username, password) VALUES (?, ?)")
    .run(username, hashedPassword);

  return { id: info.lastInsertRowid, username };
}

app.use((req, res, next) => {
  const cookies = parseCookies(req.headers.cookie || "");
  const sessionId = cookies.sessionId;

  if (sessionId && sessions.has(sessionId)) {
    req.user = sessions.get(sessionId);
  } else {
    req.user = null;
  }

  res.locals.currentUser = req.user;
  next();
});


app.get("/", (req, res) => {
  const categoriesSummaries = fav.getCategorySummaries();
  const categories = [];

  categoriesSummaries.forEach(summary => {
    const originalCategory = fav.getCategory(summary.id);
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
    playlists: fav.getPlaylists()
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

  const user = createUser(username, password);
  const sessionId = createSession(user);
  setSessionCookie(res, sessionId);

  res.redirect("/");
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

  if (errors.length === 0) {
    const row = findUserByUsername(username);
    if (!row || !verifyPassword(password, row.password)) {
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

  const sessionId = createSession(user);
  setSessionCookie(res, sessionId);

  res.redirect("/");
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

  const category = fav.getCategory(category_id);
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


app.post("/moje_polubione/:category_id/new", (req, res) => {
  const category_id = req.params.category_id;
  if (!fav.hasCategory(category_id)) return res.sendStatus(404);

  const category = fav.getCategory(category_id);
  const card_data = {};

  category.requiredFields.forEach(field => {
    card_data[field] = req.body[field] || "";
  });

  const errors = fav.validateCardData(category_id, card_data);
  if (errors.length === 0 && fav.isDuplicateCard(category_id, card_data)) {
    errors.push("Taki wpis już istnieje w tej kategorii");
  }

  if (errors.length === 0) {
    fav.addCard(category_id, card_data);
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
  const utworyCategory = fav.getCategory("ulubione-utwory");
  let utwory = utworyCategory ? utworyCategory.cards : [];

  res.render("playlista", {
    title: "Tworzenie nowej playlisty",
    utwory,
    playlists: fav.getPlaylists(),
    errors: [],
    name: "",
    selected: []
  });
});


app.post("/playlista", (req, res) => {
  const name = req.body.name;
  const utwory = req.body.utwory;
  const errors = [];

  if (!name || name.trim() === "") errors.push("Podaj nazwę playlisty");
  if (!utwory) errors.push("Wybierz przynajmniej jeden utwór");

  const utworyCategory = fav.getCategory("ulubione-utwory");
  let allSongs = utworyCategory ? utworyCategory.cards : [];

  let selectedSongs = [];
  if (utwory) selectedSongs = Array.isArray(utwory) ? utwory : [utwory];

  const songs = allSongs.filter(song => selectedSongs.includes(song.tytuł));

  if (errors.length === 0) {
    fav.addPlaylist(name, songs);
    res.redirect("/playlista");
  } else {
    res.status(400).render("playlista", {
      title: "Tworzenie nowej playlisty",
      utwory: allSongs,
      playlists: fav.getPlaylists(),
      errors,
      name,
      selected: selectedSongs
    });
  }
});

app.post("/playlista/delete/:idx", (req, res) => {
  const index = parseInt(req.params.idx);
  const playlists = fav.getPlaylists();

  if (isNaN(index) || index < 0 || index >= playlists.length) {
    return res.sendStatus(400);
  }

  fav.deletePlaylist(index);
  res.redirect("/playlista");
});


app.get("/playlista/edit/:idx", (req, res) => {
  const index = parseInt(req.params.idx);
  const playlists = fav.getPlaylists();

  if (isNaN(index) || index < 0 || index >= playlists.length) {
    return res.sendStatus(404);
  }

  const playlist = playlists[index];
  const utworyCategory = fav.getCategory("ulubione-utwory");
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


app.post("/playlista/edit/:idx", (req, res) => {
  const index = parseInt(req.params.idx);
  const playlists = fav.getPlaylists();

  if (isNaN(index) || index < 0 || index >= playlists.length) {
    return res.sendStatus(404);
  }

  const name = req.body.name;
  const utwory = req.body.utwory;
  const errors = [];

  if (!name || name.trim() === "") errors.push("Podaj nazwę playlisty");
  if (!utwory) errors.push("Wybierz przynajmniej jeden utwór");

  const utworyCategory = fav.getCategory("ulubione-utwory");
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

  fav.updatePlaylist(index, name, songs);
  res.redirect("/playlista");
});


app.post("/moje_polubione/:category_id/delete/:idx", (req, res) => {
  const category_id = req.params.category_id;
  const index = parseInt(req.params.idx);

  if (!fav.hasCategory(category_id)) return res.sendStatus(404);

  const category = fav.getCategory(category_id);
  if (isNaN(index) || index < 0 || index >= category.cards.length) return res.sendStatus(400);

  fav.deleteCard(category_id, index);
  res.redirect(`/moje_polubione/${category_id}`);
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});