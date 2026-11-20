// Parcours 8 (#284) : fusion d'un doublon — recherche de l'article à garder, aperçu, fusion, retour sur l'article gardé.
import { describe, expect, test } from "vitest";
import { creerAchat, preparerParcours } from "./outils.js";

const parcours = preparerParcours();

describe("Fusion de deux articles", () => {
  test("le doublon #0002 est fondu dans #0001 puis part à la corbeille", async () => {
    const { page } = parcours;
    await creerAchat(page, { prixTotal: 300 });
    const [doublon] = await creerAchat(page, { prixTotal: 500 });
    await page.goto(`/articles/${doublon}`);
    await page.getByRole("heading", { name: "#0002" }).waitFor();

    await page.getByRole("button", { name: "Fusionner avec un autre article" }).click();
    await page.getByRole("searchbox", { name: "Article à garder (nom ou référence)" }).fill("0001");
    await page.getByRole("button", { name: /^#0001/ }).click();
    await page.getByText(/^Article gardé :/).waitFor();
    await page.getByRole("button", { name: "Fusionner et mettre ce doublon à la corbeille" }).click();

    await page.getByRole("heading", { name: "#0001" }).waitFor();
    expect(page.url()).not.toContain(doublon);
    const corbeille = await (await page.request.get("/api/corbeille")).json();
    expect((corbeille as { id: string }[]).map((a) => a.id)).toEqual([doublon]);
  });
});
