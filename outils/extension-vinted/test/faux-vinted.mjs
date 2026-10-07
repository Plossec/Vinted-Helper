// Faux formulaire « Vendre un article » (imitation locale, AUCUNE requête vers Vinted) et fausse application.
import { createServer } from "node:http";

/** Page du faux formulaire. Options : sans un champ, déconnecté, captcha, titre tronqué. */
function pageFormulaire({
  sansChamp = null,
  deconnecte = false,
  titreCourt = false,
  captcha = false,
  categoriePreremplie = "",
  genrePrerempli = "Hommes",
} = {}) {
  const liste = (id, options) =>
    sansChamp === id
      ? ""
      : `<div><input data-testid="${id}-select-dropdown-input" readonly value="">
         <ul class="options" data-pour="${id}" hidden>${options.map((o) => `<li role="option">${o}</li>`).join("")}</ul></div>`;
  // Liste des catégories comme sur Vinted (relevé du 07/10/2026) : cases « role=button » dans « …-dropdown-content ».
  // Une catégorie peut être déjà remplie par Vinted (suggestion automatique). Recherche « Trouver une catégorie ».
  // Résultats de recherche comme sur Vinted (relevé du 07/10/2026) : case « role=radio », nom puis chemin.
  const resultats = [
    ["Jeans droits", "Femmes > Vêtements > Jeans"],
    ["Jeans droits", "Hommes > Vêtements > Jeans"],
    ["Jeans slim", "Hommes > Vêtements > Jeans"],
  ];
  const categories = (options) =>
    `<div><input data-testid="catalog-select-dropdown-input" readonly value="${categoriePreremplie}">
       <div class="options" data-testid="catalog-select-dropdown-content" hidden>
       <input id="catalog-search-input" placeholder="Trouver une catégorie"><ul data-testid="category-list">${options
         .map((o, i) => `<li class="web_ui__Item__item"><div role="button" id="catalog-${i}">${o}</div></li>`)
         .join("")}</ul>
       <ul data-testid="search-results" hidden>${resultats
         .map(
           ([nom, chemin], i) => `<li><div role="radio" id="catalog-search-${i}-result">
             <div class="web_ui__Cell__title">${nom}</div><div class="web_ui__Cell__body">${chemin}</div>
             <input type="radio"${nom === categoriePreremplie && chemin.startsWith(genrePrerempli) ? " checked" : ""}></div></li>`,
         )
         .join("")}</ul></div></div>`;
  return `<!doctype html><html><body>
  ${deconnecte ? '<a data-testid="header--login-button" href="/login">Se connecter</a>' : ""}
  ${captcha ? '<iframe src="/captcha" title="captcha"></iframe>' : ""}
  <nav data-testid="nav-tabs"><ul role="tablist">
    <li role="tab"><a href="/catalog/femmes">Femmes</a></li><li role="tab"><a href="/catalog/hommes">Hommes</a></li>
  </ul></nav>
  <form onsubmit="return false">
    <input type="file" multiple id="fichiers"><div data-testid="media-upload-grid"></div>
    <input data-testid="title--input"${titreCourt ? ' oninput="this.value = this.value.slice(0, 5)"' : ""}><textarea data-testid="description--input"></textarea>
    ${sansChamp === "catalog" ? "" : categories(["Femmes", "Hommes", "Vêtements", "Jeans", "Jeans droits"])}
    ${liste("brand", ["Levi's", "Nike"])}
    ${liste("size", ["W32", "M", "XS"])}
    ${
      sansChamp === "condition"
        ? ""
        : `<div><input data-testid="condition-select-dropdown-input" readonly value="">
           <div class="options" data-testid="category-condition-single-list-content" hidden>${[
             ["Neuf avec étiquette", "Article neuf, jamais porté."],
             ["Très bon état", "Article très peu porté."],
             ["Bon état", "Article porté, quelques signes d'usure."],
           ]
             .map(
               ([titre, corps], i) => `<li><div role="radio" data-testid="condition-${i}">
                 <div class="web_ui__Cell__title">${titre}</div><div class="web_ui__Cell__body">${corps}</div></div></li>`,
             )
             .join("")}</div></div>`
    }
    ${liste("color", ["Bleu", "Noir"])}
    <input data-testid="price-input--input" oninput="this.value = this.value.replace(',', '.')">
    ${["Petit", "Moyen", "Grand"]
      .map(
        (o, i) => `<div data-testid="${i + 1}-package-size--cell" role="button">
          <div data-testid="${i + 1}-package-size--cell--title">${o === "Moyen" ? "<span>Recommandé</span>" : ""}${o}</div>
          <input type="radio" name="package_type_selector_${i + 1}"></div>`,
      )
      .join("")}
    <button data-testid="upload-form-save-button" type="button">Ajouter</button>
  </form>
  <script>
    document.getElementById("fichiers").addEventListener("change", (e) => {
      // Comme Vinted (relevé du 07/10/2026) : une « image-wrapper-N » par photo.
      const grille = document.querySelector('[data-testid="media-upload-grid"]');
      [...e.target.files].forEach((f, i) => {
        const boite = document.createElement("div");
        boite.dataset.testid = "image-wrapper-" + i;
        boite.innerHTML = "<img alt='" + f.name + "'>";
        grille.appendChild(boite);
      });
    });
    document.querySelectorAll('[data-testid$="-select-dropdown-input"]').forEach((champ) => {
      const ul = champ.nextElementSibling;
      champ.addEventListener("click", () => { document.querySelectorAll(".options").forEach((u) => (u.hidden = true)); ul.hidden = false; });
      if (champ.dataset.testid.startsWith("catalog")) return; // liste des catégories : voir plus bas
      ul.querySelectorAll("li").forEach((li) => li.addEventListener("click", () => {
        const texte = (li.querySelector(".web_ui__Cell__title") ?? li).textContent;
        champ.value = champ.dataset.testid.startsWith("color")
          ? (champ.value ? champ.value + ", " : "") + texte
          : texte;
        if (!champ.dataset.testid.startsWith("catalog")) ul.hidden = true;
      }));
    });
    // Catégories : arbre (cases « button ») ou, dès qu'une recherche est tapée, résultats (cases « radio »).
    // Chaque clic sur une catégorie est compté par le serveur factice.
    const champCat = document.querySelector('[data-testid="catalog-select-dropdown-input"]');
    const arbre = document.querySelector('[data-testid="category-list"]');
    const listeResultats = document.querySelector('[data-testid="search-results"]');
    const rechercheCat = document.getElementById("catalog-search-input");
    rechercheCat?.addEventListener("input", () => {
      arbre.hidden = rechercheCat.value !== "";
      listeResultats.hidden = rechercheCat.value === "";
    });
    arbre?.querySelectorAll("li").forEach((li) => li.addEventListener("click", () => {
      champCat.value = li.textContent;
      fetch("/clic-categorie", { method: "POST" });
    }));
    listeResultats?.querySelectorAll("li").forEach((li) => li.addEventListener("click", () => {
      listeResultats.querySelectorAll("input").forEach((r) => (r.checked = false));
      li.querySelector("input").checked = true;
      champCat.value = li.querySelector(".web_ui__Cell__title").textContent;
      champCat.nextElementSibling.hidden = true;
      fetch("/clic-categorie", { method: "POST" });
    }));
    document.querySelectorAll('[data-testid$="-package-size--cell"]').forEach((c) => c.addEventListener("click", () => {
      document.querySelectorAll('[data-testid$="-package-size--cell"] input').forEach((r) => (r.checked = false));
      c.querySelector("input").checked = true;
    }));
    document.querySelector('[data-testid="upload-form-save-button"]').addEventListener("click", () => {
      fetch("/clic", { method: "POST" }).then(() => location.assign("/items/987654-jean-levis"));
    });
  </script></body></html>`;
}

/** Page « session bloquée » affichée par Vinted à la place du formulaire. */
const PAGE_BLOCAGE = `<!doctype html><html><body><h1>Ta session a été bloquée</h1>
  <p>Nous avons détecté une activité inhabituelle ou automatisée.</p></body></html>`;

export function demarrerFauxVinted(options = {}) {
  const etat = { clics: 0, chargements: 0, clicsCategorie: 0 };
  const serveur = createServer((req, res) => {
    if (req.url === "/clic-categorie") {
      etat.clicsCategorie++;
      res.end("ok");
      return;
    }
    if (req.url === "/clic") {
      etat.clics++;
      res.end("ok");
      return;
    }
    if (req.url?.startsWith("/items/new")) {
      etat.chargements++;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(options.bloque ? PAGE_BLOCAGE : pageFormulaire(options));
      return;
    }
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end("<html><body>Annonce</body></html>");
  });
  return new Promise((r) =>
    serveur.listen(0, "127.0.0.1", () =>
      r({ url: `http://127.0.0.1:${serveur.address().port}`, etat, fermer: () => serveur.close() }),
    ),
  );
}

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

/** Fausse application : une demande en file, résultats enregistrés. */
export function demarrerFausseApplication(demande) {
  const etat = { resultats: [], prises: 0 };
  let enFile = demande ? [demande] : [];
  const serveur = createServer((req, res) => {
    if (req.headers.authorization !== "Bearer jeton-test") {
      res.statusCode = 401;
      res.end();
      return;
    }
    res.setHeader("content-type", "application/json");
    if (req.url === "/api/programme/attente") return res.end(JSON.stringify({ nombre: enFile.length }));
    if (req.url === "/api/programme/suivante") {
      etat.prises++;
      const d = enFile.shift() ?? null;
      return res.end(JSON.stringify({ publication: d }));
    }
    if (req.url?.startsWith("/api/photos/")) {
      res.setHeader("content-type", "image/png");
      return res.end(PNG);
    }
    if (req.url?.endsWith("/resultat")) {
      let corps = "";
      req.on("data", (c) => (corps += c));
      req.on("end", () => {
        etat.resultats.push(JSON.parse(corps));
        res.end("{}");
      });
      return;
    }
    res.statusCode = 404;
    res.end("{}");
  });
  return new Promise((r) =>
    serveur.listen(0, "127.0.0.1", () =>
      r({ url: `http://127.0.0.1:${serveur.address().port}`, etat, fermer: () => serveur.close() }),
    ),
  );
}

export const DEMANDE = (essai) => ({
  id: "p1",
  essai,
  article: {
    reference: 12,
    titre: "Jean Levi's 501",
    description: "Beau jean.\n\nRéf. 12",
    prix: "12,50",
    categorie: ["Hommes", "Vêtements", "Jeans", "Jeans droits"],
    marque: "Levi's",
    etat: "Bon état",
    taille: "W32",
    couleurs: ["Bleu"],
    formatColis: "moyen",
    photos: ["/api/photos/a", "/api/photos/b"],
  },
});
