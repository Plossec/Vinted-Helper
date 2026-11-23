// Faux formulaire « Vendre un article » (imitation locale, AUCUNE requête vers Vinted) et fausse application.
import { createHash } from "node:crypto";
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
  listesBloom = false,
  ouvertureBasculee = false,
  apresAjouter = null,
  prixEtatInterne = null,
  tailleDouble = false,
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
  const etats = [
    ["Neuf avec étiquette", "Article neuf, jamais porté."],
    ["Très bon état", "Article très peu porté."],
    ["Bon état", "Article porté, quelques signes d'usure."],
  ]
    .map(
      ([titre, corps], i) => `<li><div role="radio" data-testid="condition-${i}">
        <div class="web_ui__Cell__title">${titre}</div><div class="web_ui__Cell__body">${corps}</div></div></li>`,
    )
    .join("");
  // Relevé du 29/10/2026 (#239) et capture : grille des tailles, « Suggestions » puis « Tailles hommes », en boutons.
  const grilleTailles = `<div>Choisis la taille qui correspond à l'étiquette de l'article.</div>
    <div>Suggestions</div><button type="button">M</button>
    <div>Tailles hommes</div><a href="/guide">Guide des tailles</a>
    ${["XS", "M", "L", "W32"].map((t) => `<button type="button">${t}</button>`).join("")}`;
  // Nouvelles listes de Vinted (relevé du 29/10/2026, #239) : bouton « select-root » (`…-input`, aria-expanded) dont
  // le texte est la valeur, suivi d'un champ caché « select-proxy » (name="size"…) qui n'ouvre rien quand on le clique.
  const listeBloom = (id, nom, contenu) =>
    sansChamp === nom
      ? ""
      : `<div><button type="button" class="select-root" data-testid="${id}-input" aria-expanded="false">
           <span data-testid="${id}-input--value">Sélectionne</span></button>
         <input class="select-proxy" name="${nom}" style="width:1px;height:1px">
         <div class="options bloom" data-testid="${id}-content" hidden>${contenu}</div></div>`;
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
    ${
      listesBloom
        ? listeBloom("category-size-single-grid", "size", grilleTailles)
        : // Journal du 21/11/2026 (#290) : Vinted affiche la taille d'un jean avec son équivalent (« W32 | FR 42 »).
          liste("size", [tailleDouble ? "W32 | FR 42" : "W32", "M", "XS"])
    }
    ${
      sansChamp === "condition"
        ? ""
        : listesBloom
          ? listeBloom("category-condition-single-list", "condition", etats)
          : `<div><input data-testid="condition-select-dropdown-input" readonly value="">
           <div class="options" data-testid="category-condition-single-list-content" hidden>${etats}</div></div>`
    }
    ${liste("color", ["Bleu", "Noir"])}
    ${
      prixEtatInterne
        ? // Capture du 21/11/2026 (#288) : le champ affiche le prix, mais Vinted ne retient que la saisie au clavier
          // (« insertText ») ; sinon « Le champ prix doit être supérieur ou égal à 1.0 » apparaît sous le champ.
          `<div><input data-testid="price-input--input" data-retenu="0"
             oninput="if (event.inputType === 'insertText' && '${prixEtatInterne}' !== 'jamais') this.dataset.retenu = this.value;"
             onblur="this.nextElementSibling.hidden = Number(this.dataset.retenu) >= 1;">
           <span hidden>Le champ prix doit être supérieur ou égal à 1.0</span></div>`
        : prixFormate
          ? // Relevé du 14/10/2026 (#176) : Vinted reformate le prix en « 9.00 € » et ne lit pas la virgule (« NaN € »).
            `<input data-testid="price-input--input" placeholder="0,00 €" onchange="this.value = Number(this.value.replace(' €', '')).toFixed(2) + ' €'">`
          : `<input data-testid="price-input--input" oninput="this.value = this.value.replace(',', '.')">`
    }
    ${["Petit", "Moyen", "Grand"]
      .map(
        (o, i) => `<div data-testid="${i + 1}-package-size--cell" role="button">
          <div data-testid="${i + 1}-package-size--cell--title">${o === "Moyen" ? "<span>Recommandé</span>" : ""}${o}</div>
          <div data-testid="${i + 1}-package-size--cell--content">Convient pour un article…
            <button type="button">Voir les détails des dimensions et indemnisations</button></div>
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
    // Listes « bloom » (#239) : le bouton ouvre ou ferme la liste ; un choix remplit la valeur et ferme la liste.
    // Option « ouvertureBasculee » (comportement supposé) : la liste s'ouvre à l'appui (pointerdown) et le « click »
    // qui suit la referme ; un « click » seul l'ouvre.
    document.querySelectorAll(".select-root").forEach((bouton) => {
      const contenu = bouton.parentElement.querySelector(".bloom");
      const basculer = (ouvrir) => {
        document.querySelectorAll(".options").forEach((u) => (u.hidden = true));
        contenu.hidden = !ouvrir;
        bouton.setAttribute("aria-expanded", String(ouvrir));
      };
      if (${ouvertureBasculee}) bouton.addEventListener("pointerdown", () => basculer(true));
      bouton.addEventListener("click", () => basculer(contenu.hidden));
      contenu.querySelectorAll('button, [role="radio"]').forEach((o) => o.addEventListener("click", () => {
        bouton.firstElementChild.textContent = (o.querySelector(".web_ui__Cell__title") ?? o).textContent;
        basculer(false);
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
      // #288 (structure supposée, pas encore relevée) : Vinted peut ouvrir le profil au lieu de l'annonce.
      fetch("/clic", { method: "POST" }).then(() =>
        location.assign(${JSON.stringify(apresAjouter ? "/member/1-vendeur" : "/items/987654-jean-levis")}),
      );
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

/**
 * Offres aux favoris (#149), d'après les relevés de l'utilisateur du 22/11/2026 (pseudos et titres fictifs) : en-tête
 * avec la cloche, menu « Voir tout », page des notifications, conversation avec la fenêtre « Faire une offre » ouverte
 * et un cadre anti-robot caché (pas de vérification affichée).
 */
const PAGE_ACCUEIL = `<!doctype html><html><body><header>
  <a data-testid="header-notification-button" aria-label="Notifications" href="#"
     onclick="event.preventDefault(); document.getElementById('menu').hidden = false;"><span>cloche</span></a>
  <div id="menu" data-testid="header-notification-dropdown" hidden>
    <a data-testid="header-notification-see-all-button" href="/notifications">Voir tout</a></div>
</header><h1>Accueil</h1></body></html>`;

const notification = (pseudo, titre, quand, lien) => `<div data-testid="inbox-notification-intersection-wrapper">
  <a data-testid="user-notification-item" class="web_ui__Cell__cell" href="${lien}">
    <div data-testid="user-notification-item--prefix"><img role="img" alt=""></div>
    <div data-testid="user-notification-item--content">${pseudo} a marqué ton article ${titre} comme favori Fais-lui une proposition.
      <span>${quand}</span></div></a></div>`;

const PAGE_NOTIFICATIONS = `<!doctype html><html><body><h1>Notifications</h1>
  ${notification("acheteur1", "Jean Levi's 501", "il y a 3 jours", "/inbox/1?offer_request=true")}
  ${notification("acheteur2", "Pull bleu M", "il y a 2 heures", "/inbox/2?offer_request=true")}
  <div data-testid="inbox-notification-intersection-wrapper"><a data-testid="user-notification-item" href="/inbox/3">
    <div data-testid="user-notification-item--content">Ton article a été vendu.</div></a></div>
  <div id="suite" style="height: 3000px"></div>
  <script>
    // #295 : les notifications suivantes ne sont chargées qu'en bas de la page.
    addEventListener("scroll", () => {
      if (window.scrollY < 1000 || document.getElementById("chargee")) return;
      const div = document.createElement("div");
      div.id = "chargee";
      div.innerHTML = ${JSON.stringify(notification("acheteur3", "Veste noire L", "il y a 2 semaines", "/inbox/4?offer_request=true"))};
      document.getElementById("suite").before(div);
    });
  </script>
</body></html>`;

const pageConversation = (titre, offreExistante = null) => `<!doctype html><html><body>
  <iframe title="captcha" src="about:blank" style="display:none"></iframe>
  <div>${titre} 11,00 € <button type="button" data-testid="make-offer-button">Faire une offre</button></div>
  ${
    offreExistante
      ? // Relevé du 22/11/2026 (#295) : offre déjà faite dans la conversation.
        `<div data-testid="conversation-content"><span data-testid="offer-request-current-price-label">${offreExistante}</span>
         <span data-testid="offer-request-original-price-label">11,00 €</span>
         <span data-testid="offer-status-title">- offre acceptée</span></div>`
      : ""
  }
  <div role="dialog" data-testid="offer-modal" class="ReactModal__Content">
    <div data-testid="offer-modal-navigation">Faire une offre
      <button type="button" data-testid="offer-modal-navigation-close-button"
        onclick="document.querySelector('[data-testid=offer-modal]').remove()">x</button></div>
    <div role="presentation">${titre}prix de l'article: 11,00 €</div>
    <h3 data-testid="offer-price-field-title">Faire une offre</h3>
    <div data-testid="offer-price-field"><input data-testid="offer-price-field--input" id="offer" name="offer" type="number" placeholder="11,00 €"></div>
    <div role="alert">12,50 € frais Vinted inclus</div>
    <button type="submit" data-testid="offer-submit-button" onclick="fetch('/clic-offre', { method: 'POST', body:
      document.getElementById('offer').value }).then(() => document.querySelector('[data-testid=offer-modal]').remove())">Faire une offre</button>
  </div></body></html>`;

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
    /** Offres envoyées (#149) : prix saisi dans la fenêtre. */
    offres: [],
    clicsPhoto: 0,
    clicsSupprimerPage: 0,
    clicsConfirmerSuppression: 0,
    clicsAnnulerSuppression: 0,
    /** Offres reçues (#302) : requêtes d'écriture vers les adresses internes (doit rester à 0 : lecture seule). */
    ecrituresApi: 0,
  };
  const serveur = createServer((req, res) => {
    // Offres reçues (#302) : boîte de réception et conversations (adresses internes), données fictives.
    if (req.url?.startsWith("/api/v2/") && req.method !== "GET") etat.ecrituresApi++;
    if (req.url === "/inbox") {
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.end(PAGE_ACCUEIL);
    }
    if (req.url?.startsWith("/api/v2/inbox")) {
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify({ conversations: [{ id: 11 }, { id: 12 }], pagination: { total_entries: 2 } }));
    }
    if (req.url?.startsWith("/api/v2/conversations/")) {
      res.setHeader("content-type", "application/json");
      const id = Number(req.url.split("/")[4]);
      const messages =
        id === 11
          ? [
              { entity_type: "message", entity: { body: "Bonjour, il est toujours dispo ?" } },
              {
                entity_type: "offer_request_message",
                entity: { id: 5001, price: { amount: "9.00", currency_code: "EUR" } },
                created_at_ts: "2026-11-22T10:00:00+01:00",
              },
            ]
          : [{ entity_type: "message", entity: { body: "Merci !" } }];
      return res.end(
        JSON.stringify({ conversation: { id, transaction: { id: 7000 + id, item: { id: 987654 } }, messages } }),
      );
    }
    if (req.url === "/" || req.url === "/notifications" || req.url?.startsWith("/inbox/")) {
      res.setHeader("content-type", "text/html; charset=utf-8");
      if (options.bloque) return res.end(PAGE_BLOCAGE);
      if (req.url === "/") return res.end(PAGE_ACCUEIL);
      if (req.url === "/notifications") return res.end(PAGE_NOTIFICATIONS);
      return res.end(
        pageConversation(
          req.url.startsWith("/inbox/1") ? "Jean Levi's 501" : "Pull bleu M",
          req.url.startsWith("/inbox/1") ? (options.offreExistante ?? null) : null,
        ),
      );
    }
    if (req.url === "/clic-offre") {
      let corps = "";
      req.on("data", (c) => (corps += c));
      req.on("end", () => {
        etat.offres.push(corps);
        res.end("ok");
      });
      return;
    }
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
    // Annonces du profil (#288), les plus récentes d'abord : l'annonce publiée n'y est pas si « profil-sans-annonce ».
    if (req.url?.startsWith("/api/v2/wardrobe/1/items")) {
      res.setHeader("content-type", "application/json");
      const annonces = [{ id: 111, title: "Bonnet noir", url: "https://www.vinted.fr/items/111-bonnet-noir" }];
      if (options.apresAjouter === "profil")
        annonces.unshift({ id: 987654, title: "Jean Levi's 501", url: "/items/987654-jean-levi-s-501" });
      res.end(JSON.stringify({ items: annonces }));
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
export function demarrerFausseApplication(
  demande,
  actions = [],
  {
    lectureCommandes = false,
    lectureFavoris = false,
    offres = [],
    lectureOffresRecues = false,
    pointVintedGo = null,
    /** Actions des dormants en attente mais pas prêtes (pause, plafond) : comptées, jamais confiées (#314). */
    actionsNonPretes = 0,
  } = {},
) {
  const etat = {
    resultats: [],
    prises: 0,
    resultatsActions: [],
    actionsPrises: 0,
    commandes: [],
    favoris: [],
    resultatsOffres: [],
    /** Offres reçues envoyées par l'extension (#302). */
    offresRecues: [],
    /** Relevés Vinted Go reçus (#262) : chemin et corps. */
    relevesVintedGo: [],
  };
  let lectureOR = lectureOffresRecues;
  let pointVG = pointVintedGo;
  let lecture = lectureCommandes;
  let lectureF = lectureFavoris;
  const offresEnFile = [...offres];
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
        JSON.stringify({
          nombre: enFile.length,
          actions: actionsEnFile.length + actionsNonPretes,
          lectureCommandes: lecture,
          lectureFavoris: lectureF,
          offres: offresEnFile.length,
          lectureOffresRecues: lectureOR,
        }),
      );
    if (req.url === "/api/programme/offres-recues") {
      let corps = "";
      req.on("data", (c) => (corps += c));
      req.on("end", () => {
        const recu = JSON.parse(corps);
        etat.offresRecues.push(recu);
        lectureOR = false;
        res.end(JSON.stringify({ nouvelles: recu.offres.length, ignores: [] }));
      });
      return;
    }
    if (req.url === "/api/programme/favoris") {
      let corps = "";
      req.on("data", (c) => (corps += c));
      req.on("end", () => {
        etat.favoris.push(JSON.parse(corps));
        lectureF = false;
        res.end(JSON.stringify({ lus: 0, nouvelles: 0, ignores: [] }));
      });
      return;
    }
    if (req.url === "/api/programme/vinted-go") return res.end(JSON.stringify({ point: pointVG }));
    if (req.url?.startsWith("/api/programme/points-relais/")) {
      let corps = "";
      req.on("data", (c) => (corps += c));
      req.on("end", () => {
        etat.relevesVintedGo.push({ chemin: req.url, corps: JSON.parse(corps) });
        pointVG = null;
        res.end("{}");
      });
      return;
    }
    if (req.url === "/api/programme/offre-suivante")
      return res.end(JSON.stringify({ offre: offresEnFile.shift() ?? null }));
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
        (req.url?.startsWith("/api/programme/actions/")
          ? etat.resultatsActions
          : req.url?.startsWith("/api/programme/offres/")
            ? etat.resultatsOffres
            : etat.resultats
        ).push(JSON.parse(corps));
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

/** Offre aux favoris (#149) confiée à l'extension : empreinte SHA-256 du pseudo fictif « acheteur1 ». */
export const OFFRE = (essai = true) => ({
  id: "offre-1",
  essai,
  reference: 12,
  titre: "Jean Levi's 501",
  personne: createHash("sha256").update("acheteur1").digest("hex"),
  prix: "9,50",
  prixAvant: "11,00",
});

/**
 * Fausse page publique Vinted Go (#262, #309) : carte des points relais, sans aucune donnée réelle. Servie sur
 * « localhost » (et non 127.0.0.1) pour que la copie de test du manifeste n'y charge que le script de relevé.
 */
/** Page des points Vinted Go (#262, structure de la PR #308) : point « Pas de compartiments », horaires, capacité. */
const PAGE_POINTS_VINTED_GO = `<!doctype html><main>
        <button class="PointListItem_pointItemButton__Rd5K4">Laverie Speed Queen - Sautron58 rue de Bretagne, Sautron, FRPas de compartiments</button>
        <button class="Accordion_accordionTrigger__25qD0" aria-expanded="false">Heures d'ouverture</button>
        <div role="region" class="PointDetails_accordionContent__H3i6G" hidden>
          <li class="PointDetails_workingHoursItem__ejJGJ">lundi09:00-12:00 14:00-19:00</li>
          <li class="PointDetails_workingHoursItem__ejJGJ">mardi00:00-23:59</li>
          <li class="PointDetails_workingHoursItem__ejJGJ">mercredi00:00-23:59</li>
          <li class="PointDetails_workingHoursItem__ejJGJ">jeudi00:00-23:59</li>
          <li class="PointDetails_workingHoursItem__ejJGJ">vendredi00:00-23:59</li>
          <li class="PointDetails_workingHoursItem__ejJGJ">samedi00:00-23:59</li>
          <li class="PointDetails_workingHoursItem__ejJGJ">dimanche00:00-23:59</li>
        </div>
        <button class="Accordion_accordionTrigger__25qD0" aria-expanded="false">Capacité du compartiment</button>
        <div role="region" class="PointDetails_accordionContent__H3i6G" hidden>Mis à jour il y a 11 minXS: 5+S: 3M: 0</div>
        <script>
          document.querySelectorAll(".Accordion_accordionTrigger__25qD0").forEach((b) => b.addEventListener("click", () => {
            b.setAttribute("aria-expanded", "true");
            b.nextElementSibling.hidden = false;
          }));
        </script>
      </main>`;

/**
 * Point « Capacité faible » avec le texte exact de la capacité relevé le 22/11/2026 (#313) : la description des
 * casiers suit la valeur de « M » sans séparateur. Nom et adresse fictifs.
 */
const PAGE_CAPACITE_FAIBLE = `<!doctype html><main>
        <button class="PointListItem_pointItemButton__Rd5K4">Tabac Exemple - Nantes1 place Fictive, Nantes, FRCapacité faible</button>
        <button class="Accordion_accordionTrigger__25qD0" aria-expanded="false">Capacité du compartiment</button>
        <div role="region" class="PointDetails_accordionContent__H3i6G" hidden>Mis à jour il y a 11 min XS: 5+ S: 5+ M: 5+ XS (max 0.5 kg; 38×18×8.5 cm); S (max 10 kg; 38×64×8 cm); M (max 20 kg; 38×64×19 cm)</div>
        <script>
          document.querySelectorAll(".Accordion_accordionTrigger__25qD0").forEach((b) => b.addEventListener("click", () => {
            b.setAttribute("aria-expanded", "true");
            b.nextElementSibling.hidden = false;
          }));
        </script>
      </main>`;

export function demarrerFauxVintedGo() {
  const serveur = createServer((req, res) => {
    res.setHeader("content-type", "text/html; charset=utf-8");
    if (req.url?.includes("/carrier-locations-capacite-faible")) return res.end(PAGE_CAPACITE_FAIBLE);
    if (req.url?.includes("/carrier-locations")) return res.end(PAGE_POINTS_VINTED_GO);
    res.end(
      "<html><body><h1>Points relais</h1><ul><li><button>Point A — ouvert</button></li>" +
        "<li><button>Casier B — plein</button></li></ul></body></html>",
    );
  });
  return new Promise((r) =>
    serveur.listen(0, "localhost", () =>
      r({ url: `http://localhost:${serveur.address().port}`, fermer: () => serveur.close() }),
    ),
  );
}
