// Parcours 7 (#282) : Réglages en sommaire — chaque rubrique ouvre sa page, « ← Réglages » ramène au sommaire.
import { writeFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { preparerParcours } from "./outils.js";

const parcours = preparerParcours();

describe("Réglages", () => {
  test("sommaire → Tâches automatiques → retour ; Compte : mot de passe et déconnexion", async () => {
    const { page } = parcours;
    await page.goto("/reglages");
    await page.getByRole("heading", { name: "Réglages", level: 1 }).waitFor();
    for (const groupe of ["Automatisation", "IA et calculs", "Données", "Application"])
      await page.getByRole("heading", { name: groupe, level: 2 }).waitFor();
    if (process.env.VH_CAPTURE) writeFileSync(process.env.VH_CAPTURE, await page.screenshot({ fullPage: true }));
    // Aucun défilement horizontal à 360 px.
    expect(await page.locator("html").evaluate((html) => html.scrollWidth)).toBeLessThanOrEqual(360);

    await page.getByRole("link", { name: /^Tâches automatiques/ }).click();
    await page.getByRole("heading", { name: "Tâches automatiques", level: 1 }).waitFor();
    await page.getByRole("heading", { name: "Journal de toutes les tâches" }).waitFor();
    await page.locator(".lien-retour").click();
    await page.getByRole("heading", { name: "Réglages", level: 1 }).waitFor();

    await page.getByRole("link", { name: /^Compte/ }).click();
    await page.getByLabel("Mot de passe actuel").waitFor();
    await page.getByRole("button", { name: "Se déconnecter" }).waitFor();
  });
});
