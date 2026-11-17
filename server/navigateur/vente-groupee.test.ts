// Parcours 3 (#243) : vente groupée de deux articles, envoi du colis puis finalisation ; prix vendus et emballage
// répartis par le serveur (§8 : 9 € et 6 € vendus ensemble 12 € → 7,20 € et 4,80 €).
import { describe, expect, test } from "vitest";
import { creerAchat, mettreEnLigne, preparerParcours } from "./outils.js";

const parcours = preparerParcours();

describe("Vente groupée", () => {
  test("deux articles vendus ensemble, envoyés puis finalisés", async () => {
    const { page } = parcours;
    const [a, b] = await creerAchat(page, { prixTotal: 400, nombre: 2 });
    if (!a || !b) throw new Error("Achat incomplet.");
    await mettreEnLigne(page, a, 900);
    await mettreEnLigne(page, b, 600);

    // Vendu : depuis la fiche du premier, le second coché dans le colis.
    await page.goto(`/articles/${a}`);
    await page.getByRole("heading", { name: "#0001" }).waitFor();
    await page.getByRole("button", { name: /Vendu/ }).first().click();
    await page.getByRole("textbox", { name: /Montant crédité/ }).fill("12");
    await page.getByRole("textbox", { name: "Emballage (€)" }).fill("0,08");
    await page.getByRole("checkbox", { name: /#0002/ }).check();
    await page.getByRole("button", { name: "Confirmer" }).click();
    await page.getByText("À expédier", { exact: true }).first().waitFor();

    // Envoi puis finalisation : appliqués à tout le colis.
    await page.getByRole("button", { name: /envoy/i }).first().click();
    await page.getByRole("button", { name: "Confirmer" }).click();
    await page.getByText("Envoyé", { exact: true }).first().waitFor();
    await page
      .getByRole("button", { name: /finalis/i })
      .first()
      .click();
    await page.getByRole("button", { name: "Confirmer" }).click();
    await page.getByText("Finalisé", { exact: true }).first().waitFor();

    // Parts recalculées par le serveur, affichées sur chaque fiche : prix vendu, puis bénéfice
    // (prix vendu − 2,00 € d'achat − 0,04 € d'emballage).
    const montants = page.getByRole("group").filter({ has: page.getByRole("heading", { name: "Montants" }) });
    const texte = async () => (await montants.innerText()).replace(/\s+/g, " ");
    await expect.poll(texte).toContain("7,20 €");
    expect(await texte()).toContain("5,16 €");
    await page.goto(`/articles/${b}`);
    await page.getByRole("heading", { name: "#0002" }).waitFor();
    await page.getByText("Finalisé", { exact: true }).first().waitFor();
    await expect.poll(texte).toContain("4,80 €");
    expect(await texte()).toContain("2,76 €");
  });
});
