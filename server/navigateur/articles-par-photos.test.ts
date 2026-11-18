// Parcours 6 (#276) : nouveaux articles par photos — choix des photos, groupes proposés par l'IA (simulée), photo
// déplacée, création des brouillons, puis « À faire » signale ce qui manque.
import { writeFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { photoDeTest, preparerParcours } from "./outils.js";

const parcours = preparerParcours();

describe("Nouveaux articles par photos", () => {
  test("3 photos → 2 articles proposés, une photo déplacée → 3 brouillons à compléter", async () => {
    const { page, serveur } = parcours;
    // L'IA (simulée) regroupe les deux premières photos.
    serveur.ia.repondre('{"groupes": [[0, 1], [2]]}');
    await page.goto("/articles/photos");
    const photo = await photoDeTest();
    await page
      .getByLabel(/Photos \(60 au plus\)/)
      .setInputFiles([1, 2, 3].map((i) => ({ name: `p${i}.jpg`, mimeType: "image/jpeg", buffer: photo })));
    await page.getByLabel("Lieu d'achat").selectOption({ index: 1 });
    await page.getByLabel(/Prix d'achat total/).fill("9");
    await page.getByRole("button", { name: "Envoyer et regrouper" }).click();

    await page.getByRole("heading", { name: "Vérifier les articles" }).waitFor();
    await expect.poll(() => page.getByRole("heading", { name: /^Article \d/ }).count()).toBe(2);
    if (process.env.VH_CAPTURE) writeFileSync(process.env.VH_CAPTURE, await page.screenshot({ fullPage: true }));
    // La 2e photo de l'article 1 part dans un nouvel article.
    await page.getByLabel("Article").nth(1).selectOption({ label: "Nouvel article" });
    await expect.poll(() => page.getByRole("heading", { name: /^Article \d/ }).count()).toBe(3);
    await page.getByRole("button", { name: "Créer 3 brouillon(s)" }).click();
    await page.getByRole("status").filter({ hasText: "3 brouillon(s) créé(s)" }).waitFor();

    // À faire : les 3 brouillons, analyse par l'IA en attente (l'analyse en arrière-plan est coupée en test).
    await page.getByRole("link", { name: "Voir « À faire »" }).click();
    await expect
      .poll(() => page.getByText(/Créé par photos — il manque : analyse par l'IA \(en attente\)/).count())
      .toBe(3);
  });
});
