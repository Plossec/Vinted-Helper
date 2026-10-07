// Faux formulaire « Vendre un article » (imitation locale, AUCUNE requête vers Vinted) et fausse application.
import { createServer } from "node:http";

/** Page du faux formulaire. Options : sans un champ, déconnecté, captcha, titre tronqué. */
function pageFormulaire({ sansChamp = null, deconnecte = false, titreCourt = false, captcha = false } = {}) {
  const liste = (id, options) =>
    sansChamp === id
      ? ""
      : `<div><input data-testid="${id}-select-dropdown-input" readonly value="">
         <ul class="options" data-pour="${id}" hidden>${options.map((o) => `<li role="option">${o}</li>`).join("")}</ul></div>`;
  return `<!doctype html><html><body>
  ${deconnecte ? '<a data-testid="header--login-button" href="/login">Se connecter</a>' : ""}
  ${captcha ? '<iframe src="/captcha" title="captcha"></iframe>' : ""}
  <form onsubmit="return false">
    <input type="file" multiple id="fichiers"><div data-testid="image-grid"></div>
    <input data-testid="title--input"${titreCourt ? ' oninput="this.value = this.value.slice(0, 5)"' : ""}><textarea data-testid="description--input"></textarea>
    ${liste("catalog", ["Hommes", "Vêtements", "Jeans", "Jeans droits", "Femmes"])}
    ${liste("brand", ["Levi's", "Nike"])}
    ${liste("size", ["W32", "M"])}
    ${liste("condition", ["Neuf avec étiquette", "Bon état"])}
    ${liste("color", ["Bleu", "Noir"])}
    <input data-testid="price-input--input">
    ${liste("package-size", ["Petit", "Moyen", "Grand"])}
    <button data-testid="upload-form-save-button" type="button">Ajouter</button>
  </form>
  <script>
    document.getElementById("fichiers").addEventListener("change", (e) => {
      const grille = document.querySelector('[data-testid="image-grid"]');
      for (const f of e.target.files) { const img = document.createElement("img"); img.alt = f.name; grille.appendChild(img); }
    });
    document.querySelectorAll('[data-testid$="-select-dropdown-input"]').forEach((champ) => {
      const ul = champ.nextElementSibling;
      champ.addEventListener("click", () => { document.querySelectorAll(".options").forEach((u) => (u.hidden = true)); ul.hidden = false; });
      ul.querySelectorAll("li").forEach((li) => li.addEventListener("click", () => {
        champ.value = champ.dataset.testid.startsWith("catalog") || champ.dataset.testid.startsWith("color")
          ? (champ.dataset.testid.startsWith("color") && champ.value ? champ.value + ", " : "") + li.textContent
          : li.textContent;
        if (!champ.dataset.testid.startsWith("catalog")) ul.hidden = true;
      }));
    });
    document.querySelector('[data-testid="upload-form-save-button"]').addEventListener("click", () => {
      fetch("/clic", { method: "POST" }).then(() => location.assign("/items/987654-jean-levis"));
    });
  </script></body></html>`;
}

/** Page « session bloquée » affichée par Vinted à la place du formulaire. */
const PAGE_BLOCAGE = `<!doctype html><html><body><h1>Ta session a été bloquée</h1>
  <p>Nous avons détecté une activité inhabituelle ou automatisée.</p></body></html>`;

export function demarrerFauxVinted(options = {}) {
  const etat = { clics: 0, chargements: 0 };
  const serveur = createServer((req, res) => {
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
