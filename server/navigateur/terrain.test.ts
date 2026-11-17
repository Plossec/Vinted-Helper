// Parcours 1 (#243) : saisie terrain — sortie, achat seul, lot, essence ; parts recalculées par le serveur.
import { describe, expect, test } from "vitest";
import { preparerParcours } from "./outils.js";

const parcours = preparerParcours();

describe("Terrain", () => {
  test("sortie, achat seul, lot de 3 et essence : parts affichées au centime près", async () => {
    const { page } = parcours;
    await page.goto("/terrain");
    await page.getByRole("combobox", { name: "Lieu *" }).fill("Vide-grenier des tests");
    await page.getByRole("button", { name: "Démarrer la sortie" }).click();
    await expect.poll(() => page.getByText("Vide-grenier des tests").count()).toBeGreaterThan(0);

    // Achat seul, sans photo.
    await page.getByRole("button", { name: "Sans photo" }).click();
    await page.getByLabel("Prix payé (€) *").fill("2,50");
    await page.getByRole("button", { name: "Valider" }).click();
    await page.getByRole("status").filter({ hasText: "Achat enregistré (2,50 €)." }).waitFor();

    // Lot de 3 articles pour 10 € : 3,34 € + 3,33 € + 3,33 €.
    await page.getByRole("button", { name: "Sans photo" }).click();
    await page.getByLabel("Prix payé (€) *").fill("10");
    await page.getByLabel("Nombre d'articles (lot si plus d'un)").fill("3");
    await page.getByRole("button", { name: "Valider" }).click();
    await page.getByRole("status").filter({ hasText: "Lot de 3 articles enregistré (10,00 €)." }).waitFor();

    // Essence : 4 € répartis sur les 4 articles.
    await page.getByLabel(/Essence de la sortie/).fill("4");
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Essence enregistrée : 4,00 €." }).waitFor();

    // Après l'envoi de la file : les 4 articles, avec leurs parts calculées par le serveur.
    const cartes = page.getByRole("link").filter({ hasText: "d'essence" });
    await expect.poll(() => cartes.count(), { timeout: 15_000 }).toBe(4);
    const textes = (await cartes.allInnerTexts()).map((t) => t.replace(/\s+/g, " "));
    expect(textes.filter((t) => t.includes("(part du lot)")).length).toBe(3);
    expect(textes.some((t) => t.includes("2,50 € + 1,00 € d'essence"))).toBe(true);
    expect(textes.some((t) => t.includes("3,34 € (part du lot) + 1,00 € d'essence"))).toBe(true);
    expect(textes.filter((t) => t.includes("3,33 € (part du lot) + 1,00 € d'essence")).length).toBe(2);
    await expect.poll(() => page.getByText(/en attente d'envoi/).count()).toBe(0);
  });
});
