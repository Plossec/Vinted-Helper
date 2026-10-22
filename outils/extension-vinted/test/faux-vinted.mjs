// Faux formulaire « Vendre un article » (imitation locale, AUCUNE requête vers Vinted) et fausse application.
import { createServer } from "node:http";

/** Page du faux formulaire. Options : sans un champ, déconnecté, captcha, titre tronqué, prix reformaté. */
function pageFormulaire({
  sansChamp = null,
  deconnecte = false,
  titreCourt = false,
  captcha = false,
  categoriePreremplie = "",
  genrePrerempli = "Hommes",
  prixFormate = false,
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
    ${
      prixFormate
        ? // Relevé du 14/10/2026 (#176) : Vinted reformate le prix en « 9.00 € » et ne lit pas la virgule (« NaN € »).
          `<input data-testid="price-input--input" placeholder="0,00 €" onchange="this.value = Number(this.value.replace(' €', '')).toFixed(2) + ' €'">`
        : `<input data-testid="price-input--input" oninput="this.value = this.value.replace(',', '.')">`
    }
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

/**
 * Page d'une annonce publiée (#147). Relevé du 21/10/2026 : boutons `item-edit-button`, `item-delete-button` ; la
 * fenêtre de confirmation de suppression (`item-delete-modal`) s'ouvre par-dessus, le bouton de la page reste dessous.
 * Le clic sur « Supprimer » de la fenêtre supprime l'annonce (sauf option) puis quitte la page (destination réelle
 * inconnue). Une annonce supprimée renvoie une page introuvable.
 */
const FENETRE_SUPPRESSION = `<div data-testid="item-delete-modal--overlay">
    <div role="dialog" data-testid="item-delete-modal">
      <div role="presentation">Supprimer l'article ?</div>
      <div role="presentation">En supprimant l'article, tu confirmes que tu ne l'as pas vendu sur Vinted.</div>
      <button type="button" data-testid="item-delete-cancelation-button">Annuler</button>
      <button type="button" data-testid="item-delete-confirmation-button">Supprimer</button>
    </div>
  </div>`;

const PAGE_ANNONCE = `<!doctype html><html><body><h1>Jean Levi's 501</h1>
  <button data-testid="item-edit-button" type="button">Modifier l'annonce</button>
  <button data-testid="item-delete-button" type="button">Supprimer</button>
  <div id="fenetre"></div>
  <script>
    const signaler = (quoi) => fetch("/" + quoi, { method: "POST" });
    document.querySelector('[data-testid="item-delete-button"]').addEventListener("click", () => {
      signaler("clic-supprimer-page");
      document.querySelector("#fenetre").innerHTML = ${JSON.stringify(FENETRE_SUPPRESSION)};
      document.querySelector('[data-testid="item-delete-cancelation-button"]').addEventListener("click", () => {
        signaler("clic-annuler-suppression");
        document.querySelector("#fenetre").innerHTML = "";
      });
      document.querySelector('[data-testid="item-delete-confirmation-button"]').addEventListener("click", () => {
        signaler("clic-confirmer-suppression").then(() => location.assign("/member/1-vendeur"));
      });
    });
  </script></body></html>`;

const PAGE_INTROUVABLE = `<!doctype html><html><body><h1>Page introuvable</h1></body></html>`;

/**
 * « Modifier l'annonce » (#147). Relevé du 21/10/2026 : prix `price-input--input` (« 9,00 € » au chargement), bouton
 * « Valider » (`upload-form-save-button`, comme « Ajouter » de la publication), case « Pousser » (payante) et boutons
 * des photos à ne jamais toucher. « Valider » enregistre le prix saisi (sauf option) puis revient à l'annonce.
 * Option : sans le champ prix.
 */
const pageModifier = (
  { sansPrixModifier = false, prixMasque = false } = {},
  prix = "11,00 €",
) => `<!doctype html><html><body>
  <form onsubmit="return false">
  <input id="title" name="title" data-testid="title--input" type="text" value="Jean Levi's 501">
  <button type="button" data-testid="media-select-grid-delete-button-0" aria-label="Supprimer la photo sélectionnée"></button>
  ${sansPrixModifier ? "" : `<input id="price" name="price" data-testid="price-input--input" type="text" placeholder="0,00 €" value="${prix}">`}
  <button type="button">Modifier les paramètres de réductions</button>
  <input type="checkbox" id="bump" name="bump" data-testid="bump-checkbox--input" value="1">
  <button data-testid="upload-form-save-button" type="button">Valider</button></form>
  <script>
    const signaler = (quoi, corps) => fetch("/" + quoi, { method: "POST", body: corps });
    // Option « prixMasque » (essai réel du 22/10/2026, #147 ; comportement supposé) : un prix déjà rempli, remplacé
    // d'un coup, est effacé par le champ ; vidé d'abord, il accepte la nouvelle valeur.
    const prix = document.querySelector('[data-testid="price-input--input"]');
    let precedent = prix?.value ?? "";
    if (${prixMasque} && prix) prix.addEventListener("input", () => {
      if (precedent !== "" && prix.value !== "") prix.value = "";
      precedent = prix.value;
    });
    document.querySelector("#bump").addEventListener("click", () => signaler("clic-pousser"));
    document.querySelector('[data-testid="media-select-grid-delete-button-0"]').addEventListener("click", () =>
      signaler("clic-photo"),
    );
    document.querySelector('[data-testid="upload-form-save-button"]').addEventListener("click", () => {
      const prix = document.querySelector('[data-testid="price-input--input"]')?.value ?? "";
      signaler("clic-valider", prix).then(() => location.assign("/items/555-jean-levis"));
    });
  </script></body></html>`;

/** Annonce avec la fenêtre de confirmation ouverte (#224) : structure relevée le 21/10/2026. */
const PAGE_CONFIRMATION = PAGE_ANNONCE.replace('<div id="fenetre"></div>', FENETRE_SUPPRESSION);

/** Page « session bloquée » affichée par Vinted à la place du formulaire. */
const PAGE_BLOCAGE = `<!doctype html><html><body><h1>Ta session a été bloquée</h1>
  <p>Nous avons détecté une activité inhabituelle ou automatisée.</p></body></html>`;

export function demarrerFauxVinted(options = {}) {
  const etat = {
    clics: 0,
    chargements: 0,
    clicsCategorie: 0,
    pagesAnnonce: 0,
    pagesModifier: 0,
    pagesVentes: 0,
    // Mode réel des tâches (#147) : prix de l'annonce sur « Modifier », annonce supprimée, clics par bouton.
    prix: options.prixVinted ?? "11,00 €",
    supprimee: false,
    clicsValider: 0,
    clicsPousser: 0,
    clicsPhoto: 0,
    clicsSupprimerPage: 0,
    clicsConfirmerSuppression: 0,
    clicsAnnulerSuppression: 0,
  };
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
    // « Porte-monnaie » (#148, adresse donnée par l'utilisateur) : page rédigée SANS relevé de Vinted (à remplacer par la structure relevée).
    if (req.url?.startsWith("/wallet/balance")) {
      etat.pagesVentes++;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(
        options.bloque
          ? PAGE_BLOCAGE
          : '<!doctype html><html><body><h1>Porte-monnaie</h1><div data-testid="order-list"><a href="/transactions/1">Commande</a></div></body></html>',
      );
      return;
    }
    // Mode réel (#147) : clics notés ; « Valider » enregistre le prix, « Supprimer » (fenêtre) supprime l'annonce.
    const clics = {
      "/clic-supprimer-page": "clicsSupprimerPage",
      "/clic-annuler-suppression": "clicsAnnulerSuppression",
      "/clic-pousser": "clicsPousser",
      "/clic-photo": "clicsPhoto",
    };
    if (req.url && clics[req.url]) {
      etat[clics[req.url]]++;
      res.end("ok");
      return;
    }
    if (req.url === "/clic-confirmer-suppression") {
      etat.clicsConfirmerSuppression++;
      if (!options.suppressionSansEffet) etat.supprimee = true;
      res.end("ok");
      return;
    }
    if (req.url === "/clic-valider") {
      let corps = "";
      req.on("data", (c) => (corps += c));
      req.on("end", () => {
        etat.clicsValider++;
        if (!options.validerSansEffet) etat.prix = corps;
        res.end("ok");
      });
      return;
    }
    if (/^\/member\//.test(req.url ?? "")) {
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end("<!doctype html><html><body><h1>Mes articles</h1></body></html>");
      return;
    }
    if (/^\/items\/\d+\/edit/.test(req.url ?? "")) {
      etat.pagesModifier++;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(options.bloque ? PAGE_BLOCAGE : pageModifier(options, etat.prix));
      return;
    }
    if (req.url === "/items/555-confirmation") {
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(PAGE_CONFIRMATION);
      return;
    }
    if (/^\/items\/555/.test(req.url ?? "")) {
      etat.pagesAnnonce++;
      res.setHeader("content-type", "text/html; charset=utf-8");
      if (etat.supprimee) res.statusCode = 404;
      res.end(options.bloque ? PAGE_BLOCAGE : etat.supprimee ? PAGE_INTROUVABLE : PAGE_ANNONCE);
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

/** Fausse application : une demande en file, des actions de tâches automatiques (#147), résultats enregistrés. */
export function demarrerFausseApplication(demande, actions = [], { lectureCommandes = false } = {}) {
  const etat = { resultats: [], prises: 0, resultatsActions: [], actionsPrises: 0, commandes: [] };
  let lecture = lectureCommandes;
  let enFile = demande ? [demande] : [];
  const actionsEnFile = [...actions];
  const serveur = createServer((req, res) => {
    if (req.headers.authorization !== "Bearer jeton-test") {
      res.statusCode = 401;
      res.end();
      return;
    }
    res.setHeader("content-type", "application/json");
    if (req.url === "/api/programme/attente")
      return res.end(
        JSON.stringify({ nombre: enFile.length, actions: actionsEnFile.length, lectureCommandes: lecture }),
      );
    if (req.url === "/api/programme/commandes") {
      let corps = "";
      req.on("data", (c) => (corps += c));
      req.on("end", () => {
        etat.commandes.push(JSON.parse(corps));
        lecture = false;
        res.end(JSON.stringify({ nouvelles: 0 }));
      });
      return;
    }
    if (req.url === "/api/programme/action-suivante") {
      etat.actionsPrises++;
      return res.end(JSON.stringify({ action: actionsEnFile.shift() ?? null }));
    }
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
        (req.url?.startsWith("/api/programme/actions/") ? etat.resultatsActions : etat.resultats).push(
          JSON.parse(corps),
        );
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

/** Action d'une tâche automatique (#147), telle que l'application la confie à l'extension. */
export const ACTION = (type, essai = true) => ({
  id: `act-${type}`,
  type,
  essai,
  reference: 12,
  titre: "Jean Levi's 501",
  url: "https://www.vinted.fr/items/555-jean-levis",
  prixAvant: "11,00",
  prixApres: type === "baisse" ? "10,00" : null,
  annonce: type === "republication" ? { ...DEMANDE(true).article, prix: "11,00" } : null,
});
