// Parcours 2 (#243) : fiche d'un article acheté jusqu'à « À publier » — refus tant qu'il est incomplet (#196),
// fiche, photo d'annonce, annonce rédigée par l'IA (simulée), puis passage À publier.
import { describe, expect, test } from "vitest";
import { choisirDansListe, creerAchat, preparerParcours, photoDeTest } from "./outils.js";

const parcours = preparerParcours();

describe("Fiche article", () => {
  test("de Brouillon à « À publier » : refus tant qu'il manque quelque chose, puis passage", async () => {
    const { page, serveur } = parcours;
    const [id] = await creerAchat(page, { prixTotal: 300 });
    await page.goto(`/articles/${id}`);
    await page.getByRole("heading", { name: "#0001" }).waitFor();

    // Incomplet : le serveur refuse et l'écran dit ce qui manque.
    await page.getByRole("button", { name: "Marquer « À publier »" }).click();
    await page.getByRole("button", { name: "Confirmer" }).click();
    await page.getByRole("alert").filter({ hasText: "il manque" }).waitFor();
    expect(await page.getByRole("alert").filter({ hasText: "il manque" }).innerText()).toContain("photos d'annonce");
    await page.getByRole("button", { name: "Annuler", exact: true }).click();

    // Fiche.
    await page.getByRole("textbox", { name: "Nom *" }).fill("T-shirt rayé");
    await choisirDansListe(page, "Catégorie *", "T-shirts");
    await choisirDansListe(page, "État *", "Très bon état");
    await page.getByRole("combobox", { name: "Marque *" }).fill("Marque des tests");
    await page.getByRole("textbox", { name: "Prix affiché sur Vinted (€)" }).fill("12");
    await page.getByRole("combobox", { name: "Couleur", exact: true }).selectOption({ label: "Bleu" });
    await page.getByRole("button", { name: "Enregistrer la fiche" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: /enregistr/i })
      .first()
      .waitFor();

    // Photo d'annonce, depuis la galerie.
    const choix = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Galerie" }).click();
    await (await choix).setFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: await photoDeTest() });
    await page.getByRole("button", { name: "Supprimer la photo 1" }).waitFor();

    // Annonce rédigée par l'IA simulée (aucun appel à Gemini).
    await page.getByRole("button", { name: "Générer l'annonce" }).click();
    await expect.poll(() => page.getByRole("textbox", { name: /^Titre/ }).inputValue()).toBe("Titre simulé");
    expect(serveur.ia.appels.length).toBe(1);
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: /enregistr/i })
      .first()
      .waitFor();

    // Complet : passage À publier.
    await page.getByRole("button", { name: "Marquer « À publier »" }).click();
    await page.getByRole("button", { name: "Confirmer" }).click();
    await expect.poll(() => page.getByText("À publier", { exact: true }).count()).toBeGreaterThan(0);
    const article = await (await page.request.get(`/api/articles/${id}`)).json();
    expect(article.statut).toBe("a_publier");
  });
});
