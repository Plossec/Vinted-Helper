// Parcours 5 (#210) : ajout d'un point relais (horaires saisis en texte), puis choix comme point de dépôt d'un colis.
import { expect, describe, test } from "vitest";
import { creerAchat, mettreEnLigne, preparerParcours } from "./outils.js";

const parcours = preparerParcours();

describe("Points relais", () => {
  test("ajout d'un point, horaires relus, choix comme point de dépôt d'un colis À expédier", async () => {
    const { page } = parcours;
    await page.goto("/points-relais");
    await page.getByRole("button", { name: "Ajouter un point relais" }).click();
    await page.getByRole("combobox", { name: "Transporteur *" }).selectOption({ label: "Mondial Relay" });
    await page.getByRole("textbox", { name: "Nom *" }).fill("Tabac des tests");
    await page.getByRole("textbox", { name: "Adresse" }).fill("1 rue des Tests");
    await page.getByRole("textbox", { name: "Lundi" }).fill("9h-12h, 14h-19h");
    await page.getByRole("textbox", { name: "Mardi" }).fill("9h-");
    await page.getByRole("button", { name: "Ajouter le point relais" }).click();
    await page.getByRole("alert").filter({ hasText: "Horaires du mardi illisibles" }).waitFor();
    await page.getByRole("textbox", { name: "Mardi" }).fill("Fermé");
    await page.getByRole("button", { name: "Ajouter le point relais" }).click();
    await page.getByRole("status").filter({ hasText: "Point « Tabac des tests » ajouté." }).waitFor();
    const carte = page.getByRole("listitem").filter({ hasText: "Tabac des tests" });
    expect(await carte.innerText()).toContain("Mondial Relay");
    await expect.poll(() => carte.getByText(/^(Ouvert|Fermé)$/).count()).toBe(1);

    // Horaires relus tels que saisis.
    await carte.getByRole("button", { name: "Modifier le point relais « Tabac des tests »" }).click();
    expect(await page.getByRole("textbox", { name: "Lundi" }).inputValue()).toBe("09:00-12:00, 14:00-19:00");
    expect(await page.getByRole("textbox", { name: "Mardi" }).inputValue()).toBe("");
    await page.getByRole("button", { name: "Annuler", exact: true }).click();

    // Colis À expédier : le point devient son point de dépôt.
    const [id] = await creerAchat(page, { prixTotal: 200 });
    if (!id) throw new Error("Achat incomplet.");
    await mettreEnLigne(page, id, 900);
    const vente = await page.request.post("/api/ventes", { data: { articleIds: [id], montantCredite: 900 } });
    expect(vente.ok()).toBe(true);
    await page.goto(`/articles/${id}`);
    const choix = page.getByRole("combobox", { name: "Point de dépôt du colis" });
    await expect.poll(() => choix.isEnabled()).toBe(true);
    await choix.selectOption({ label: "Tabac des tests — Mondial Relay" });
    await page.getByRole("link", { name: "Itinéraire" }).waitFor();
    const article = await (await page.request.get(`/api/articles/${id}`)).json();
    expect(article.pointsRelais.pointDepotId).not.toBeNull();
  });
});
