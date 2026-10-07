// Tests de l'extension sur un faux formulaire local (aucune requête vers Vinted). L'extension est chargée dans
// Chromium, avec une copie du manifeste qui l'autorise aussi sur 127.0.0.1 (faux Vinted et fausse application).
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { chromium } from "playwright-core";
import { DEMANDE, demarrerFausseApplication, demarrerFauxVinted } from "./faux-vinted.mjs";

// Fonctions exécutées dans le service worker de l'extension.
/* global chrome, cycle, diagnostic */

const CHROME = process.env.VH_CHROME_TEST ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SOURCE = join(import.meta.dirname, "..");
const LOCAL = "http://127.0.0.1/*";

function copieDeTest() {
  const dossier = mkdtempSync(join(tmpdir(), "vh-extension-"));
  cpSync(SOURCE, dossier, { recursive: true, filter: (f) => !f.includes("node_modules") && !f.includes("/test") });
  const manifeste = JSON.parse(readFileSync(join(dossier, "manifest.json"), "utf8"));
  manifeste.host_permissions.push(LOCAL);
  manifeste.content_scripts[0].matches.push(LOCAL);
  writeFileSync(join(dossier, "manifest.json"), JSON.stringify(manifeste));
  return dossier;
}

/** Lance Chromium avec l'extension, configure-la, et exécute un ou plusieurs passages. */
async function lancer({ demande, vinted = {}, passages = 1, delaiEtapes = [0, 0], action = () => cycle() }) {
  const faux = await demarrerFauxVinted(vinted);
  const app = await demarrerFausseApplication(demande);
  const extension = copieDeTest();
  const contexte = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "vh-profil-")), {
    executablePath: CHROME,
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    const sw = contexte.serviceWorkers()[0] ?? (await contexte.waitForEvent("serviceworker"));
    await sw.evaluate(
      ([adresse, vintedUrl, delais]) =>
        chrome.storage.local.set({
          config: { adresse, jeton: "jeton-test" },
          vinted: vintedUrl,
          delaiEtapes: delais,
        }),
      [app.url, faux.url, delaiEtapes],
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
    app.fermer();
  }
}

test("publication complète : formulaire rempli, contrôlé, « Ajouter » cliqué, lien renvoyé", async () => {
  const { app, vinted, etat } = await lancer({ demande: DEMANDE(false) });
  assert.equal(vinted.clics, 1);
  assert.equal(app.resultats.length, 1);
  assert.equal(app.resultats[0].resultat, "publie");
  assert.match(app.resultats[0].url, /\/items\/987654/);
  // Prochaine publication : au moins 10 minutes plus tard.
  assert.ok(etat.prochain >= Date.now() + 9 * 60_000);
  assert.equal(etat.pause, false);
});

test("mode essai : tout est rempli mais « Ajouter » n'est jamais cliqué", async () => {
  const { app, vinted } = await lancer({ demande: DEMANDE(true) });
  assert.equal(vinted.clics, 0);
  assert.deepEqual(app.resultats, [{ resultat: "essai" }]);
});

test("champ introuvable (marque) : erreur, aucun clic, pas de pause", async () => {
  const { app, vinted, etat } = await lancer({ demande: DEMANDE(false), vinted: { sansChamp: "brand" } });
  assert.equal(vinted.clics, 0);
  assert.equal(app.resultats[0].resultat, "erreur");
  assert.match(app.resultats[0].message, /marque/);
  assert.equal(etat.pause, false);
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
  const { app, duree } = await lancer({ demande: DEMANDE(true), delaiEtapes: [150, 150] });
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
