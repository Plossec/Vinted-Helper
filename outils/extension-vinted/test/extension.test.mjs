// Tests de l'extension sur un faux formulaire local (aucune requête vers Vinted). L'extension est chargée dans
// Chromium, avec une copie du manifeste qui l'autorise aussi sur 127.0.0.1 (faux Vinted et fausse application).
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { chromium } from "playwright-core";
import {
  ACTION,
  DEMANDE,
  demarrerFausseApplication,
  demarrerFauxVinted,
  demarrerFauxVintedGo,
  OFFRE,
} from "./faux-vinted.mjs";

// Fonctions exécutées dans le service worker de l'extension.
/* global chrome, cycle, diagnostic, releverOnglet, releverVintedGoPoint */

const CHROME = process.env.VH_CHROME_TEST ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SOURCE = join(import.meta.dirname, "..");
const LOCAL = "http://127.0.0.1/*";
/** Fausse page Vinted Go (#309) : un autre nom d'hôte, pour n'y charger que le relevé. */
const LOCAL_VINTED_GO = "http://localhost/*";

function copieDeTest() {
  const dossier = mkdtempSync(join(tmpdir(), "vh-extension-"));
  cpSync(SOURCE, dossier, { recursive: true, filter: (f) => !f.includes("node_modules") && !f.includes("/test") });
  const manifeste = JSON.parse(readFileSync(join(dossier, "manifest.json"), "utf8"));
  manifeste.host_permissions.push(LOCAL);
  manifeste.content_scripts[0].matches.push(LOCAL);
  manifeste.host_permissions.push(LOCAL_VINTED_GO);
  manifeste.content_scripts[1].matches.push(LOCAL_VINTED_GO);
  writeFileSync(join(dossier, "manifest.json"), JSON.stringify(manifeste));
  return dossier;
}

/** Lance Chromium avec l'extension, configure-la, et exécute un ou plusieurs passages. */
async function lancer({
  demande,
  actions = [],
  lectureCommandes = false,
  lectureFavoris = false,
  offres = [],
  lectureOffresRecues = false,
  pointVintedGo = null,
  vinted = {},
  passages = 1,
  delaiEtape = 0,
  action = () => cycle(),
}) {
  const faux = await demarrerFauxVinted(vinted);
  const fauxGo = await demarrerFauxVintedGo();
  const app = await demarrerFausseApplication(demande, actions, {
    lectureCommandes,
    lectureFavoris,
    offres,
    lectureOffresRecues,
    pointVintedGo,
  });
  const extension = copieDeTest();
  const contexte = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "vh-profil-")), {
    executablePath: CHROME,
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    const sw = contexte.serviceWorkers()[0] ?? (await contexte.waitForEvent("serviceworker"));
    await sw.evaluate(
      ([adresse, vintedUrl, vintedGoUrl, delai]) =>
        chrome.storage.local.set({
          config: { adresse, jeton: "jeton-test" },
          vinted: vintedUrl,
          vintedGo: vintedGoUrl,
          delaiEtape: delai,
        }),
      [app.url, faux.url, fauxGo.url, delaiEtape],
    );
    const debut = Date.now();
    let reponse;
    for (let i = 0; i < passages; i++) reponse = await sw.evaluate(action);
    const duree = Date.now() - debut;
    const stockage = await sw.evaluate(() => chrome.storage.local.get(["etat", "diagnostic"]));
    return { app: app.etat, vinted: faux.etat, etat: stockage.etat, diagnostic: stockage.diagnostic, duree, reponse };
  } finally {
    await contexte.close();
    faux.fermer();
    fauxGo.fermer();
    app.fermer();
  }
}

test("publication complète : formulaire rempli, contrôlé, « Ajouter » cliqué, lien renvoyé", async () => {
  const { app, vinted, etat } = await lancer({ demande: DEMANDE(false) });
  assert.equal(vinted.clics, 1);
  assert.equal(app.resultats.length, 1);
  assert.equal(app.resultats[0].resultat, "publie");
  assert.match(app.resultats[0].url, /\/items\/987654/);
  // Prochaine publication : 10 minutes plus tard, sans supplément aléatoire (#136).
  assert.ok(etat.prochain >= Date.now() + 9 * 60_000);
  assert.ok(etat.prochain <= Date.now() + 10 * 60_000);
  assert.equal(etat.pause, false);
});

test("après « Ajouter », Vinted ouvre le profil : annonce retrouvée sur le profil, publiée avec son lien (#288)", async () => {
  const { app, vinted, diagnostic } = await lancer({ demande: DEMANDE(false), vinted: { apresAjouter: "profil" } });
  assert.equal(vinted.clics, 1);
  assert.equal(app.resultats[0].resultat, "publie");
  assert.match(app.resultats[0].url, /\/items\/987654-jean-levi-s-501$/);
  assert.equal(diagnostic.etape, "apres-ajouter");
  assert.match(diagnostic.adresse, /\/member\/1-vendeur/);
});

test("après « Ajouter », ni page d'annonce ni annonce sur le profil : erreur avec la page vue (#288)", async () => {
  const { app } = await lancer({ demande: DEMANDE(false), vinted: { apresAjouter: "profil-sans-annonce" } });
  assert.equal(app.resultats[0].resultat, "erreur");
  assert.match(app.resultats[0].message, /page vue : http:\/\/127\.0\.0\.1:\d+\/member\/1-vendeur/);
  assert.match(app.resultats[0].message, /aucune annonce « Jean Levi's 501 » parmi les 1 plus récentes/);
});

test("prix affiché mais pas retenu par Vinted : saisi comme au clavier, retenu, publié (#288)", async () => {
  const { app, vinted } = await lancer({ demande: DEMANDE(false), vinted: { prixEtatInterne: "clavier" } });
  assert.equal(app.resultats[0].resultat, "publie", app.resultats[0].message);
  assert.equal(vinted.clics, 1);
});

test("prix jamais retenu par Vinted (« doit être supérieur ou égal à 1.0 ») : erreur, aucun clic (#288)", async () => {
  const { app, vinted } = await lancer({ demande: DEMANDE(false), vinted: { prixEtatInterne: "jamais" } });
  assert.equal(app.resultats[0].resultat, "erreur");
  assert.match(app.resultats[0].message, /refusé par Vinted : « le champ prix doit être supérieur ou égal à 1\.0 »/);
  assert.equal(vinted.clics, 0);
});

test("taille affichée « W32 | FR 42 » pour « W32 » : contrôle réussi, publiée (#290)", async () => {
  const { app } = await lancer({ demande: DEMANDE(false), vinted: { tailleDouble: true } });
  assert.equal(app.resultats[0].resultat, "publie", app.resultats[0].message);
});

test("mode essai : tout est rempli mais « Ajouter » n'est jamais cliqué", async () => {
  const { app, vinted } = await lancer({ demande: DEMANDE(true) });
  assert.equal(vinted.clics, 0);
  assert.deepEqual(app.resultats, [{ resultat: "essai" }]);
});

test("champ introuvable (marque) : erreur, relevé de la page, aucun clic, pas de pause", async () => {
  const {
    app,
    vinted,
    etat,
    diagnostic: d,
  } = await lancer({ demande: DEMANDE(false), vinted: { sansChamp: "brand" } });
  assert.equal(vinted.clics, 0);
  assert.equal(app.resultats[0].resultat, "erreur");
  assert.match(app.resultats[0].message, /marque/);
  assert.equal(etat.pause, false);
  // Rien n'a été publié : pas d'attente de 10 minutes avant la demande suivante (#61).
  assert.equal(etat.prochain, 0);
  // Relevé automatique de la page au moment de l'erreur (#56).
  assert.equal(d.etape, "marque");
  assert.equal(d.selecteursTrouves.categorie, '[data-testid="catalog-select-dropdown-input"]');
});

test("valeur absente d'une liste (couleur inconnue) : erreur, aucun clic", async () => {
  const demande = DEMANDE(false);
  demande.article.couleurs = ["Fuchsia"];
  const { app, vinted } = await lancer({ demande });
  assert.equal(vinted.clics, 0);
  assert.match(app.resultats[0].message, /Fuchsia/);
});

test("contrôle avant envoi : une valeur modifiée par la page (titre tronqué) bloque la publication", async () => {
  const { app, vinted } = await lancer({ demande: DEMANDE(false), vinted: { titreCourt: true } });
  assert.equal(vinted.clics, 0);
  assert.match(app.resultats[0].message, /Contrôle avant envoi : titre/);
});

test("contrôle avant envoi en échec : relevé de la page enregistré (#176)", async () => {
  const { app, diagnostic: d } = await lancer({ demande: DEMANDE(false), vinted: { titreCourt: true } });
  assert.match(app.resultats[0].message, /Contrôle avant envoi : titre/);
  assert.equal(d.etape, "controle");
});

test("prix reformaté par Vinted (« 9,00 » lu « NaN € ») : saisi avec un point, contrôle réussi (#176)", async () => {
  const { app, vinted } = await lancer({ demande: DEMANDE(false), vinted: { prixFormate: true } });
  assert.equal(app.resultats[0].resultat, "publie", app.resultats[0].message);
  assert.equal(vinted.clics, 1);
});

for (const [nom, vinted, raison] of [
  ["non connecté à Vinted", { deconnecte: true }, /Non connecté/],
  ["vérification (captcha)", { captcha: true }, /Vérification Vinted/],
  ["page « session bloquée »", { bloque: true }, /bloqué la session/],
]) {
  test(`${nom} : pause, demande non prise, plus rien n'est chargé ensuite`, async () => {
    const r = await lancer({ demande: DEMANDE(false), vinted, passages: 3 });
    assert.equal(r.app.prises, 0);
    assert.equal(r.app.resultats.length, 0);
    assert.equal(r.vinted.clics, 0);
    assert.equal(r.etat.pause, true);
    assert.match(r.etat.raison, raison);
    // Un seul chargement de la page Vinted : en pause, l'extension ne recharge pas Vinted.
    assert.equal(r.vinted.chargements, 1);
  });
}

test("pause entre chaque étape du remplissage (#57)", async () => {
  const { app, duree } = await lancer({ demande: DEMANDE(true), delaiEtape: 150 });
  assert.deepEqual(app.resultats, [{ resultat: "essai" }]);
  // 10 étapes + le contrôle : 10 pauses de 150 ms au moins.
  assert.ok(duree >= 1500, `durée ${duree} ms`);
});

test("diagnostic (#56) : relevé du formulaire et de la liste des catégories, aucune demande prise", async () => {
  const {
    app,
    vinted,
    diagnostic: d,
    reponse,
  } = await lancer({
    demande: DEMANDE(false),
    action: () => diagnostic(),
  });
  assert.equal(reponse.ok, true);
  assert.equal(app.prises, 0);
  assert.equal(vinted.clics, 0);
  assert.equal(d.champCategorieTrouve, true);
  assert.equal(d.selecteursTrouves.titre, '[data-testid="title--input"]');
  assert.ok(d.apparusApresClicCategorie.some((e) => e.texte === "hommes"));
  assert.ok(d["options « Femmes »"].length >= 1);
});

test("« Relever cet onglet » (#224) : page ouverte relevée telle quelle, boîte de dialogue comprise, aucun clic", async () => {
  const {
    app,
    vinted,
    diagnostic: d,
    reponse,
  } = await lancer({
    demande: DEMANDE(false),
    action: async () => {
      const { vinted: adresse } = await chrome.storage.local.get("vinted");
      const onglet = await chrome.tabs.create({ url: `${adresse}/items/555-confirmation` });
      await new Promise((r) => setTimeout(r, 1500));
      return releverOnglet(onglet.id);
    },
  });
  assert.equal(reponse.ok, true);
  assert.equal(app.prises, 0);
  assert.equal(vinted.clics, 0);
  assert.equal(d.etape, "relevé de l'onglet");
  assert.equal(d.dialogues.length, 1);
  assert.equal(d.dialogues[0].role, "dialog");
  assert.equal(d.dialogues[0].testid, "item-delete-modal");
  assert.ok(
    d.dialogues[0].elements.some((e) => e.testid === "item-delete-confirmation-button" && e.texte === "supprimer"),
  );
  assert.equal(d.boutonsTrouves.supprimer, true);
  // Relevé compact (#253) : aucun champ vide, `visible` seulement quand l'élément est caché.
  const tous = [...d.elements, ...d.dialogues, ...d.dialogues.flatMap((x) => x.elements)];
  assert.ok(tous.length > 0);
  for (const e of tous) {
    assert.ok(!Object.values(e).includes(null), JSON.stringify(e));
    assert.notEqual(e.visible, true, JSON.stringify(e));
  }
});

test("fichier du relevé (#253) : un élément par ligne, le reste indenté, contenu identique", async () => {
  const { readFileSync } = await import("node:fs");
  const vm = await import("node:vm");
  const contexte = {};
  vm.runInNewContext(readFileSync(join(SOURCE, "format-releve.js"), "utf8"), contexte);
  const releve = {
    adresse: "https://www.vinted.fr/items/new",
    selecteursTrouves: { titre: '[data-testid="title--input"]', taille: null },
    elements: [
      { balise: "button", testid: "a", texte: "ok" },
      { balise: "input", name: "title", valeur: "Jean" },
    ],
    dialogues: [{ balise: "div", role: "dialog", elements: [{ balise: "button", texte: "annuler" }] }],
  };
  const texte = contexte.texteDuReleve(releve);
  assert.deepEqual(JSON.parse(texte), releve);
  const lignes = texte.split("\n");
  assert.ok(lignes.includes('    {"balise":"button","testid":"a","texte":"ok"},'));
  assert.ok(lignes.includes('        {"balise":"button","texte":"annuler"}'));
  assert.ok(lignes.includes('  "adresse": "https://www.vinted.fr/items/new",'));
});

test("« Relever cet onglet » accepte une page Vinted Go (fausse page locale, #262, #309)", async () => {
  const { reponse, diagnostic } = await lancer({
    demande: DEMANDE(false),
    action: async () => {
      const { vintedGo } = await chrome.storage.local.get("vintedGo");
      const onglet = await chrome.tabs.create({ url: `${vintedGo}/fr/carrier-locations` });
      // Comme l'utilisateur : le relevé se demande une fois la page chargée.
      for (let i = 0; i < 40 && (await chrome.tabs.get(onglet.id)).status !== "complete"; i++)
        await new Promise((resolve) => setTimeout(resolve, 100));
      return releverOnglet(onglet.id);
    },
  });
  assert.equal(reponse.ok, true);
  assert.equal(diagnostic.etape, "relevé de l'onglet");
  assert.match(diagnostic.adresse, /\/fr\/carrier-locations$/);
});

test("Vinted Go : toute demande autre que le relevé est refusée (#309)", async () => {
  const { reponse } = await lancer({
    demande: DEMANDE(false),
    action: async () => {
      const { vintedGo } = await chrome.storage.local.get("vintedGo");
      const onglet = await chrome.tabs.create({ url: `${vintedGo}/fr/carrier-locations` });
      const reponses = [];
      for (const message of [{ type: "ajouter" }, { type: "etape", nom: "titre" }, { type: "supprimer-annonce" }]) {
        let r = null;
        for (let essai = 0; essai < 20 && r === null; essai++) {
          try {
            r = await chrome.tabs.sendMessage(onglet.id, message);
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        }
        reponses.push(r);
      }
      return reponses;
    },
  });
  assert.equal(reponse.length, 3);
  for (const r of reponse) {
    assert.equal(r.ok, false);
    assert.match(r.message, /Vinted Go/);
  }
});

test("lecture Vinted Go : point, horaires et capacité lus (#262)", async () => {
  const { reponse } = await lancer({
    demande: DEMANDE(false),
    action: async () => {
      const onglet = await chrome.tabs.create({
        url: `${(await chrome.storage.local.get("vintedGo")).vintedGo}/fr/carrier-locations?selected_point=128563`,
      });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return releverVintedGoPoint(onglet.id, {
        id: "128563",
        nom: "Laverie Speed Queen - Sautron",
        adresse: "58 rue de Bretagne, Sautron",
      });
    },
  });
  assert.equal(reponse.ok, true);
  assert.equal(reponse.releve.vintedGoStatut, "pas_de_compartiments");
  assert.equal(reponse.releve.horaires.length, 7);
  // Toutes les plages d'une journée, et « 23:59 » lu comme fin de journée.
  assert.deepEqual(reponse.releve.horaires[0], [
    { debut: "09:00", fin: "12:00" },
    { debut: "14:00", fin: "19:00" },
  ]);
  assert.deepEqual(reponse.releve.horaires[1], [{ debut: "00:00", fin: "24:00" }]);
  // Capacité : « S » n'est plus confondu avec « XS », la mise à jour garde son unité.
  assert.deepEqual(reponse.releve.capacite, {
    miseAJour: "il y a 11 min",
    tailles: [
      { taille: "xs", disponibles: "5+" },
      { taille: "s", disponibles: "3" },
      { taille: "m", disponibles: "0" },
    ],
  });
});

const POINT_VG = (nom) => ({ id: "pr-1", nom, adresse: null, url: null, numero: "128563", vintedGoId: null });

test("passage : point Vinted Go relevé et envoyé à l'application par une route /api/programme (#262)", async () => {
  const { app, etat } = await lancer({
    pointVintedGo: POINT_VG("Laverie Speed Queen - Sautron"),
    vinted: {},
  });
  assert.equal(app.relevesVintedGo.length, 1);
  assert.match(app.relevesVintedGo[0].chemin, /^\/api\/programme\/points-relais\/pr-1\/releve-vinted-go$/);
  assert.equal(app.relevesVintedGo[0].corps.vintedGoId, "128563"); // numéro du point, pas l'identifiant de l'application
  assert.equal(etat.pause, false);
});

test("passage : point Vinted Go introuvable → erreur notée sur le point, rien n'est bloqué (#262)", async () => {
  const { app, etat } = await lancer({ pointVintedGo: POINT_VG("Point inexistant") });
  assert.equal(app.relevesVintedGo.length, 1);
  assert.match(app.relevesVintedGo[0].corps.erreur, /Point Vinted Go introuvable/);
  assert.equal(etat.pause, false);
});

test("« Relever cet onglet » sur une page qui n'est pas Vinted : refusé avec un message", async () => {
  const { reponse } = await lancer({
    demande: DEMANDE(false),
    action: async () => {
      const onglet = await chrome.tabs.create({ url: "about:blank" });
      return releverOnglet(onglet.id);
    },
  });
  assert.equal(reponse.ok, false);
  assert.match(reponse.message, /page Vinted/);
});

test("catégorie déjà remplie par Vinted avec la bonne valeur : on n'y touche pas (#56)", async () => {
  const { app, vinted } = await lancer({ demande: DEMANDE(true), vinted: { categoriePreremplie: "Jeans droits" } });
  assert.deepEqual(app.resultats, [{ resultat: "essai" }]);
  assert.equal(vinted.clicsCategorie, 0);
});

test("catégorie suggérée par Vinted dans le mauvais rayon (Femmes au lieu d'Hommes) : corrigée", async () => {
  const { app, vinted } = await lancer({
    demande: DEMANDE(true),
    vinted: { categoriePreremplie: "Jeans droits", genrePrerempli: "Femmes" },
  });
  assert.deepEqual(app.resultats, [{ resultat: "essai" }]);
  assert.equal(vinted.clicsCategorie, 1);
});

test("nom de catégorie plus long que celui de Vinted : le résultat le plus proche du même rayon est retenu", async () => {
  // Comme « Doudounes et vestes matelassées » (application) → « Doudounes » (Vinted).
  const demande = DEMANDE(true);
  demande.article.categorie = ["Hommes", "Vêtements", "Jeans", "Jeans droits et coupe classique"];
  const { app, vinted } = await lancer({ demande });
  assert.deepEqual(app.resultats, [{ resultat: "essai" }]);
  assert.equal(vinted.clicsCategorie, 1);
});

test("chemin de catégorie différent de celui de Vinted : recherche de la catégorie finale (#56)", async () => {
  const demande = DEMANDE(true);
  demande.article.categorie = ["Hommes", "Vêtements", "Pantalons", "Jeans droits"];
  const { app } = await lancer({ demande });
  assert.deepEqual(app.resultats, [{ resultat: "essai" }]);
});

test("catégorie inexistante sur Vinted : erreur avec les choix proposés, aucun clic sur « Ajouter »", async () => {
  const demande = DEMANDE(false);
  demande.article.categorie = ["Hommes", "Vêtements", "Doudounes"];
  const { app, vinted } = await lancer({ demande });
  assert.equal(vinted.clics, 0);
  assert.match(app.resultats[0].message, /Catégorie « Doudounes » introuvable/);
});

test("« Vérifier maintenant » sans annonce en attente : le journal le dit (#61)", async () => {
  const { etat, app } = await lancer({ demande: null, action: () => cycle(true) });
  assert.equal(app.prises, 0);
  assert.match(etat.journal[0].texte, /Aucune annonce en attente/);
});

test("passage automatique sans annonce : journal silencieux", async () => {
  const { etat } = await lancer({ demande: null });
  assert.deepEqual(etat?.journal ?? [], []);
});

test("taille absente de la liste de Vinted : erreur, aucun clic sur « Ajouter » (une taille « S » ne prend pas « XS »)", async () => {
  const demande = DEMANDE(false);
  demande.article.taille = "S";
  const { app, vinted } = await lancer({ demande });
  assert.equal(vinted.clics, 0);
  assert.match(app.resultats[0].message, /« S » introuvable dans la liste « taille »/);
});

test("nouvelles listes de Vinted (#239) : taille et état choisis par leur bouton, pas par le champ caché", async () => {
  const { app, vinted } = await lancer({ demande: DEMANDE(false), vinted: { listesBloom: true } });
  assert.equal(app.resultats[0].resultat, "publie", app.resultats[0].message);
  assert.equal(vinted.clics, 1);
});

test("liste qui se referme au « click » après s'être ouverte à l'appui : rouverte, valeur choisie (#239)", async () => {
  const { app } = await lancer({
    demande: DEMANDE(false),
    vinted: { listesBloom: true, ouvertureBasculee: true },
  });
  assert.equal(app.resultats[0].resultat, "publie", app.resultats[0].message);
});

test("taille absente (#239) : choix proposés pris dans la liste, pas dans le colis ; relevé liste ouverte", async () => {
  const demande = DEMANDE(false);
  demande.article.taille = "S";
  const { app, vinted, diagnostic: d } = await lancer({ demande, vinted: { listesBloom: true } });
  assert.equal(vinted.clics, 0);
  const message = app.resultats[0].message;
  assert.match(message, /« S » introuvable dans la liste « taille »/);
  assert.match(message, /Choix proposés : M, XS/);
  assert.doesNotMatch(message, /dimensions et indemnisations/);
  // Relevé pris AVANT de refermer la liste : son contenu y figure.
  assert.ok(d.elements.some((e) => e.testid === "category-size-single-grid-content"));
});

// --- Tâches automatiques (#147) : actions en mode essai ---

test("baisse en essai : annonce et « Modifier l'annonce » ouvertes et relevées, prix lu, rien n'est saisi", async () => {
  const { app, vinted, diagnostic: d, etat } = await lancer({ demande: null, actions: [ACTION("baisse")] });
  assert.deepEqual(app.resultatsActions, [{ resultat: "essai" }]);
  assert.equal(vinted.pagesAnnonce, 1);
  assert.equal(vinted.pagesModifier, 1);
  assert.equal(vinted.clics + vinted.clicsValider, 0);
  assert.equal(d.etape, "tâche : baisse");
  assert.deepEqual(d.pages.annonce.boutonsTrouves, { modifier: true, supprimer: true });
  assert.equal(d.pages.modifier.selecteursTrouves.prix, '[data-testid="price-input--input"]');
  assert.equal(etat.actionEnCours, null);
  assert.equal(etat.pause, false);
});

test("baisse en essai, prix introuvable sur « Modifier l'annonce » : erreur et relevé, pas de pause", async () => {
  const {
    app,
    diagnostic: d,
    etat,
  } = await lancer({
    demande: null,
    actions: [ACTION("baisse")],
    vinted: { sansPrixModifier: true },
  });
  assert.equal(app.resultatsActions[0].resultat, "erreur");
  assert.match(app.resultatsActions[0].message, /Prix introuvable/);
  assert.equal(app.resultatsActions[0].releve, true); // signalé à l'application (#233)
  assert.match(d.erreur, /Prix introuvable/);
  assert.equal(etat.pause, false);
});

test("republication en essai : annonce relevée, formulaire « Vendre un article » rempli sans « Ajouter »", async () => {
  const { app, vinted, diagnostic: d } = await lancer({ demande: null, actions: [ACTION("republication")] });
  assert.deepEqual(app.resultatsActions, [{ resultat: "essai" }]);
  assert.equal(vinted.pagesAnnonce, 1);
  assert.equal(vinted.chargements, 1); // « Vendre un article »
  assert.equal(vinted.clics, 0);
  assert.equal(d.pages.annonce.boutonsTrouves.supprimer, true);
});

// --- Mode réel des tâches automatiques (#147, étape 3 ; relevés du 21/10/2026) ---

test("baisse réelle : prix vérifié, nouveau prix saisi, seul « Valider » cliqué, prix relu après coup", async () => {
  const { app, vinted, etat } = await lancer({ demande: null, actions: [ACTION("baisse", false)] });
  assert.deepEqual(app.resultatsActions, [{ resultat: "fait" }]);
  assert.equal(vinted.clicsValider, 1);
  assert.equal(Number(vinted.prix.replace(/[^\d,.]/g, "").replace(",", ".")), 10);
  assert.equal(vinted.clicsPousser + vinted.clicsPhoto + vinted.clicsSupprimerPage + vinted.clics, 0);
  assert.equal(etat.pause, false);
});

test("baisse réelle, prix déjà rempli que Vinted efface s'il est remplacé d'un coup : champ vidé puis saisi", async () => {
  const { app, vinted } = await lancer({
    demande: null,
    actions: [ACTION("baisse", false)],
    vinted: { prixMasque: true },
  });
  assert.deepEqual(app.resultatsActions, [{ resultat: "fait" }]);
  assert.equal(vinted.clicsValider, 1);
  assert.equal(Number(vinted.prix.replace(/[^\d,.]/g, "").replace(",", ".")), 10);
});

test("baisse réelle, prix sur Vinted différent de celui de l'application : rien n'est modifié", async () => {
  const { app, vinted } = await lancer({
    demande: null,
    actions: [ACTION("baisse", false)],
    vinted: { prixVinted: "12,00 €" },
  });
  assert.equal(app.resultatsActions[0].resultat, "erreur");
  assert.match(app.resultatsActions[0].message, /12,00 €.*11,00/);
  assert.equal(vinted.clicsValider, 0);
});

test("baisse réelle, nouveau prix pas enregistré par Vinted : erreur et relevé", async () => {
  const { app, vinted } = await lancer({
    demande: null,
    actions: [ACTION("baisse", false)],
    vinted: { validerSansEffet: true },
  });
  assert.equal(vinted.clicsValider, 1);
  assert.equal(app.resultatsActions[0].resultat, "erreur");
  assert.match(app.resultatsActions[0].message, /Après « Valider »/);
  assert.equal(app.resultatsActions[0].releve, true);
});

test("republication réelle : suppression confirmée dans la fenêtre, annonce disparue, nouvelle annonce publiée", async () => {
  const { app, vinted } = await lancer({ demande: null, actions: [ACTION("republication", false)] });
  assert.equal(vinted.clicsSupprimerPage, 1);
  assert.equal(vinted.clicsConfirmerSuppression, 1);
  assert.equal(vinted.clicsAnnulerSuppression, 0);
  assert.equal(vinted.supprimee, true);
  assert.equal(vinted.clics, 1); // « Ajouter » de la nouvelle annonce
  assert.equal(app.resultatsActions[0].resultat, "fait");
  assert.match(app.resultatsActions[0].url, /\/items\/987654/);
});

test("republication réelle, annonce toujours en ligne après la suppression : rien n'est republié", async () => {
  const { app, vinted } = await lancer({
    demande: null,
    actions: [ACTION("republication", false)],
    vinted: { suppressionSansEffet: true },
  });
  assert.equal(vinted.clicsConfirmerSuppression, 1);
  assert.equal(vinted.chargements + vinted.clics, 0); // « Vendre un article » jamais ouvert
  assert.equal(app.resultatsActions[0].resultat, "erreur");
  assert.equal(app.resultatsActions[0].annonceSupprimee, false);
  assert.match(app.resultatsActions[0].message, /toujours en ligne/);
});

test("republication réelle, nouvelle annonce impossible après la suppression : signalé « annonce supprimée »", async () => {
  const action = ACTION("republication", false);
  action.annonce.taille = "S"; // absente de la liste de Vinted
  const { app, vinted } = await lancer({ demande: null, actions: [action] });
  assert.equal(vinted.supprimee, true);
  assert.equal(vinted.clics, 0);
  assert.equal(app.resultatsActions[0].resultat, "erreur");
  assert.equal(app.resultatsActions[0].annonceSupprimee, true);
  assert.match(app.resultatsActions[0].message, /« S » introuvable/);
});

test("la publication passe avant les tâches automatiques", async () => {
  const { app } = await lancer({ demande: DEMANDE(true), actions: [ACTION("baisse")] });
  assert.deepEqual(app.resultats, [{ resultat: "essai" }]);
  assert.equal(app.actionsPrises, 0);
});

test("action sur une page « session bloquée » : pause", async () => {
  const { app, etat } = await lancer({ demande: null, actions: [ACTION("baisse")], vinted: { bloque: true } });
  assert.equal(app.resultatsActions[0].resultat, "erreur");
  assert.equal(etat.pause, true);
  assert.match(etat.raison, /bloqué la session/);
});

// --- Vérification vente finalisée (#148) : lecture des commandes en essai ---

test("lecture des commandes en essai : « Porte-monnaie » ouvert et relevé, liste vide envoyée", async () => {
  const { app, vinted, diagnostic: d } = await lancer({ demande: null, lectureCommandes: true });
  assert.equal(vinted.pagesVentes, 1);
  assert.deepEqual(app.commandes, [{ essai: true, commandes: [] }]);
  assert.equal(d.etape, "tâche : ventes finalisées");
  assert.equal(d.page, "ventes");
  assert.ok(d.elements.some((e) => e.testid === "order-list"));
});

test("lecture des commandes sur une page « session bloquée » : erreur signalée à l'application (#233), pause", async () => {
  const { app, etat } = await lancer({ demande: null, lectureCommandes: true, vinted: { bloque: true } });
  assert.equal(app.commandes.length, 1);
  assert.equal(app.commandes[0].essai, true);
  assert.deepEqual(app.commandes[0].commandes, []);
  assert.match(app.commandes[0].erreur, /bloqué la session/);
  assert.equal(typeof app.commandes[0].releve, "boolean");
  assert.equal(etat.pause, true);
});

test("ordre : publication, puis lecture des commandes, puis actions ; une seule opération par passage", async () => {
  const { app, vinted } = await lancer({
    demande: DEMANDE(true),
    actions: [ACTION("baisse")],
    lectureCommandes: true,
    passages: 2,
  });
  assert.deepEqual(app.resultats, [{ resultat: "essai" }]); // passage 1 : publication
  assert.equal(vinted.pagesVentes, 1); // passage 2 : lecture des commandes
  assert.equal(app.actionsPrises, 0); // la baisse attend le passage suivant
});

test("offres aux favoris : notifications lues par « Voir tout », empreintes envoyées, jamais les pseudos (#149)", async () => {
  const { app } = await lancer({ lectureFavoris: true });
  assert.equal(app.favoris.length, 1);
  const { favoris } = app.favoris[0];
  assert.equal(favoris.length, 3); // la notification « vendu » est ignorée ; la 3e est chargée en bas de page (#295)
  assert.equal(favoris[2].titre, "Veste noire L");
  assert.equal(favoris[0].titre, "Jean Levi's 501");
  assert.match(favoris[0].personne, /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(app.favoris).includes("acheteur"));
  // « il y a 3 jours » : date du favori environ 3 jours plus tôt.
  const jours = (Date.now() - new Date(favoris[0].depuis).getTime()) / 86_400_000;
  assert.ok(jours > 2.9 && jours < 3.1);
});

test("offre aux favoris en essai : fenêtre ouverte, prix saisi, rien envoyé ; cadre anti-robot caché ignoré (#149)", async () => {
  const { app, vinted, etat } = await lancer({ offres: [OFFRE(true)] });
  assert.deepEqual(app.resultatsOffres, [{ resultat: "essai" }]);
  assert.deepEqual(vinted.offres, []);
  assert.equal(etat.pause, false);
});

test("offre aux favoris réelle : prix saisi et offre envoyée dans la bonne conversation (#149)", async () => {
  const { app, vinted } = await lancer({ offres: [OFFRE(false)] });
  assert.deepEqual(app.resultatsOffres, [{ resultat: "faite" }]);
  assert.deepEqual(vinted.offres, ["9.50"]);
});

test("offre aux favoris : notification de la personne introuvable → erreur, rien envoyé (#149)", async () => {
  const { app, vinted } = await lancer({ offres: [{ ...OFFRE(false), personne: "0".repeat(64) }] });
  assert.equal(app.resultatsOffres[0].resultat, "erreur");
  assert.match(app.resultatsOffres[0].message, /Notification du favori introuvable/);
  assert.deepEqual(vinted.offres, []);
});

test("offre aux favoris : offre moins chère déjà dans la conversation → rien envoyé, « inutile » (#295)", async () => {
  const { app, vinted } = await lancer({ offres: [OFFRE(false)], vinted: { offreExistante: "8,00 €" } });
  assert.equal(app.resultatsOffres[0].resultat, "inutile");
  assert.match(app.resultatsOffres[0].message, /déjà faite dans la conversation à 8,00 € \(≤ 9,50 €\)/);
  assert.deepEqual(vinted.offres, []);
});

test("offre aux favoris : offre plus chère déjà dans la conversation → offre envoyée (#295)", async () => {
  const { app, vinted } = await lancer({ offres: [OFFRE(false)], vinted: { offreExistante: "10,00 €" } });
  assert.deepEqual(app.resultatsOffres, [{ resultat: "faite" }]);
  assert.deepEqual(vinted.offres, ["9.50"]);
});

test("offres reçues (#302) : lues dans la messagerie, envoyées à l'application, rien n'est envoyé à Vinted", async () => {
  const { app, vinted, diagnostic } = await lancer({ demande: null, lectureOffresRecues: true });
  assert.equal(app.offresRecues.length, 1);
  assert.deepEqual(app.offresRecues[0].offres, [
    {
      offreId: "5001",
      articleId: "987654",
      transactionId: "7011",
      offerRequestId: "5001",
      prixOffre: 900,
      depuis: "2026-11-22T09:00:00.000Z",
    },
  ]);
  // Lecture seule : aucune requête d'écriture vers Vinted.
  assert.equal(vinted.ecrituresApi, 0);
  // Relevé pour le calibrage : la forme des réponses, jamais leurs valeurs (aucune donnée personnelle).
  assert.equal(diagnostic.etape, "offres reçues (forme des réponses)");
  assert.deepEqual(diagnostic.inbox.conversations, [{ id: "number" }]);
  assert.ok(!JSON.stringify(diagnostic).includes("toujours dispo"));
  assert.ok(!JSON.stringify(diagnostic).includes("9.00"));
});
