// Tests du programme de publication sur un faux formulaire local (aucune requête vers Vinted).
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { DEMANDE, demarrerFausseApplication, demarrerFauxVinted } from "./faux-vinted.mjs";

const CHROME = process.env.VH_CHROME_TEST ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

async function lancer({ demande, vinted = {} }) {
  const faux = await demarrerFauxVinted(vinted);
  const app = await demarrerFausseApplication(demande);
  const dossier = mkdtempSync(join(tmpdir(), "vh-publication-"));
  writeFileSync(join(dossier, "publication.json"), JSON.stringify({ adresse: app.url, jeton: "jeton-test" }));
  await new Promise((resoudre) =>
    execFile(
      process.execPath,
      ["index.mjs", "--une-fois"],
      {
        cwd: join(import.meta.dirname, ".."),
        env: {
          ...process.env,
          VH_DOSSIER: dossier,
          VH_VINTED_URL: faux.url,
          VH_CHROME: CHROME,
          VH_HEADLESS: "1",
          VH_PAUSE_ESSAI_MS: "100",
          VH_PAUSE_MS: "100",
          VH_ATTENTE_MS: "100",
        },
        timeout: 120_000,
      },
      (erreur, sortie, erreurs) => {
        if (process.env.VH_TRACE) console.log(sortie, erreurs);
        resoudre();
      },
    ),
  );
  faux.fermer();
  app.fermer();
  return { app: app.etat, vinted: faux.etat };
}

test("publication complète : formulaire rempli, contrôlé, « Ajouter » cliqué, lien renvoyé", async () => {
  const { app, vinted } = await lancer({ demande: DEMANDE(false) });
  assert.equal(vinted.clics, 1);
  assert.equal(app.resultats.length, 1);
  assert.equal(app.resultats[0].resultat, "publie");
  assert.match(app.resultats[0].url, /\/items\/987654/);
});

test("mode essai : tout est rempli mais « Ajouter » n'est jamais cliqué", async () => {
  const { app, vinted } = await lancer({ demande: DEMANDE(true) });
  assert.equal(vinted.clics, 0);
  assert.deepEqual(app.resultats, [{ resultat: "essai" }]);
});

test("champ introuvable (marque) : erreur, aucun clic", async () => {
  const { app, vinted } = await lancer({ demande: DEMANDE(false), vinted: { sansChamp: "brand" } });
  assert.equal(vinted.clics, 0);
  assert.equal(app.resultats[0].resultat, "erreur");
  assert.match(app.resultats[0].message, /marque/);
});

test("valeur absente d'une liste (couleur inconnue) : erreur, aucun clic", async () => {
  const demande = DEMANDE(false);
  demande.article.couleurs = ["Fuchsia"];
  const { app, vinted } = await lancer({ demande });
  assert.equal(vinted.clics, 0);
  assert.match(app.resultats[0].message, /Fuchsia/);
});

test("non connecté à Vinted : la demande n'est pas prise", async () => {
  const { app, vinted } = await lancer({ demande: DEMANDE(false), vinted: { deconnecte: true } });
  assert.equal(app.prises, 0);
  assert.equal(app.resultats.length, 0);
  assert.equal(vinted.clics, 0);
});

test("contrôle avant envoi : une valeur modifiée par la page (titre tronqué) bloque la publication", async () => {
  const { app, vinted } = await lancer({ demande: DEMANDE(false), vinted: { titreCourt: true } });
  assert.equal(vinted.clics, 0);
  assert.match(app.resultats[0].message, /Contrôle avant envoi : titre/);
});
