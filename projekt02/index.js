import express from "express";
import fav from "./models/favourite.js";

const port = 8000;
const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded());

app.get("/", (req, res) => {
  const categoriesSummaries = fav.getCategorySummaries();
  const categories = [];

  categoriesSummaries.forEach(summary => {
    const fullCategory = fav.getCategory(summary.id);

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
    categories: categories,
    playlists: fav.getPlaylists()
  });
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
  let utwory = [];
  if (utworyCategory) utwory = utworyCategory.cards;

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

  let selectedSongs = [];
  if (utwory) selectedSongs = Array.isArray(utwory) ? utwory : [utwory];

  const utworyCategory = fav.getCategory("ulubione-utwory");
  let allSongs = [];
  if (utworyCategory) allSongs = utworyCategory.cards;

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


app.post("/moje_polubione/:category_id/delete/:idx", (req, res) => {
  const category_id = req.params.category_id;
  const index = parseInt(req.params.idx);

  if (!fav.hasCategory(category_id)) return res.sendStatus(404);

  const category = fav.getCategory(category_id);
  if (isNaN(index) || index < 0 || index >= category.cards.length) return res.sendStatus(400);

  category.cards.splice(index, 1);
  res.redirect(`/moje_polubione/${category_id}`);
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
